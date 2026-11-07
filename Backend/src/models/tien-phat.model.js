import { thucHienGiaoDich, truyVanPhanTrang } from "../utils/truy-van-danh-muc.js";
import { LoiHttp } from "../utils/loi-http.js";
import { tinhTienPhat } from "../utils/quy-tac-tien-phat.js";

const PHAN_KET_NOI_BANG = "FROM Phat f JOIN ChiTietPhieuMuon d ON d.borrow_detail_id = f.borrow_detail_id JOIN PhieuMuon p ON p.borrow_id = d.borrow_id";
const CAC_COT_HIEN_THI = `f.fine_id, f.borrow_detail_id, f.fine_rule_id, f.fine_type, CAST(f.amount AS CHAR) AS amount,
 f.reason, DATE_FORMAT(f.assessed_at, '%Y-%m-%d %H:%i:%s') AS assessed_at, f.payment_status,
 DATE_FORMAT(f.paid_at, '%Y-%m-%d %H:%i:%s') AS paid_at, d.borrow_id, d.copy_id, p.user_id`;
function chuanHoaBanGhi(dongDuLieu) {
    return { ...dongDuLieu, fine_id: String(dongDuLieu.fine_id), borrow_detail_id: String(dongDuLieu.borrow_detail_id), fine_rule_id: dongDuLieu.fine_rule_id === null ? null : String(dongDuLieu.fine_rule_id), borrow_id: String(dongDuLieu.borrow_id), copy_id: String(dongDuLieu.copy_id), user_id: String(dongDuLieu.user_id), amount: String(dongDuLieu.amount) };
}
function baoXungDot(maLoi, thongBao) { throw new LoiHttp(409, maLoi, thongBao); }

export function taoMoHinhTienPhat(boKetNoi) {
    async function layTheoMa(ma, maChuSoHuu = null, ketNoi = boKetNoi) {
        const [cacDong] = await ketNoi.execute(`SELECT ${CAC_COT_HIEN_THI} ${PHAN_KET_NOI_BANG} WHERE f.fine_id = ?${maChuSoHuu === null ? "" : " AND p.user_id = ?"}`, maChuSoHuu === null ? [ma] : [ma, maChuSoHuu]);
        return cacDong.length ? chuanHoaBanGhi(cacDong[0]) : null;
    }
    return {
        layTheoMa: layTheoMa,
        async lietKe(truyVan) {
            const cacDieuKien = [], thamSo = [];
            for (const [khoa, cot] of Object.entries({ user_id: "p.user_id", borrow_id: "p.borrow_id", borrow_detail_id: "f.borrow_detail_id", fine_type: "f.fine_type", payment_status: "f.payment_status" })) {
                if (truyVan[khoa] !== undefined) { cacDieuKien.push(`${cot} = ?`); thamSo.push(truyVan[khoa]); }
            }
            const dieuKienLoc = cacDieuKien.length ? ` WHERE ${cacDieuKien.join(" AND ")}` : "";
            return truyVanPhanTrang(boKetNoi, `SELECT COUNT(*) AS total ${PHAN_KET_NOI_BANG}${dieuKienLoc}`, `SELECT ${CAC_COT_HIEN_THI} ${PHAN_KET_NOI_BANG}${dieuKienLoc} ORDER BY f.fine_id DESC LIMIT ? OFFSET ?`, thamSo, truyVan, chuanHoaBanGhi);
        },
        async taoMoi(duLieu) {
            return thucHienGiaoDich(boKetNoi, async ketNoi => {
                const [banDau] = await ketNoi.execute("SELECT borrow_id FROM ChiTietPhieuMuon WHERE borrow_detail_id = ?", [duLieu.borrow_detail_id]);
                if (!banDau.length) throw new LoiHttp(404, "BORROW_DETAIL_NOT_FOUND", "Không tìm thấy chi tiết mượn.");
                // Khóa phiếu rồi chi tiết, tương thích thứ tự khóa phiếu → bản sao → chi tiết khi trả.
                const [cacThongTinPhieu] = await ketNoi.execute("SELECT borrow_id, status, DATE_FORMAT(due_date, '%Y-%m-%d %H:%i:%s') AS due_date, DATE_FORMAT(borrow_date, '%Y-%m-%d %H:%i:%s') AS borrow_date FROM PhieuMuon WHERE borrow_id = ? FOR SHARE", [String(banDau[0].borrow_id)]);
                if (!cacThongTinPhieu.length) throw new LoiHttp(404, "BORROW_NOT_FOUND", "Không tìm thấy phiếu mượn.");
                const [cacChiTiet] = await ketNoi.execute(`SELECT borrow_detail_id, borrow_id, status, returned_at, condition_before, condition_after,
                    CAST(TIMESTAMPDIFF(SECOND, CAST(? AS DATETIME), returned_at) AS CHAR) AS late_seconds,
                    (CAST(? AS DATETIME) > CAST(? AS DATETIME) AND returned_at >= CAST(? AS DATETIME) AND returned_at <= UTC_TIMESTAMP()) AS valid_timeline
                    FROM ChiTietPhieuMuon WHERE borrow_detail_id = ? FOR UPDATE`, [cacThongTinPhieu[0].due_date, cacThongTinPhieu[0].due_date, cacThongTinPhieu[0].borrow_date, cacThongTinPhieu[0].borrow_date, duLieu.borrow_detail_id]);
                if (!cacChiTiet.length || String(cacChiTiet[0].borrow_id) !== String(banDau[0].borrow_id)) baoXungDot("FINE_STATE_CONFLICT", "Chi tiết mượn đã thay đổi; hãy kiểm tra lại.");
                const [cacQuyDinh] = await ketNoi.execute("SELECT fine_rule_id, rule_type, CAST(amount AS CHAR) AS amount, unit, is_active FROM QuyDinhPhat WHERE fine_rule_id = ? FOR SHARE", [duLieu.fine_rule_id]);
                if (!cacQuyDinh.length) throw new LoiHttp(404, "FINE_RULE_NOT_FOUND", "Không tìm thấy quy định phạt; cần cấu hình trước khi sử dụng.");
                const quyDinh = cacQuyDinh[0];
                const soTien = tinhTienPhat(quyDinh, cacChiTiet[0], cacThongTinPhieu[0]);
                // Đọc có khóa nhìn thấy dữ liệu commit mới nhất, kể cả ở REPEATABLE READ.
                // Mọi nơi ghi phạt phải khóa chi tiết trước; schema chưa có UNIQUE theo chi tiết/loại phạt.
                const [cacBanGhiTrung] = await ketNoi.execute("SELECT fine_id FROM Phat WHERE borrow_detail_id = ? AND fine_type = ? LIMIT 1 FOR UPDATE", [duLieu.borrow_detail_id, quyDinh.rule_type]);
                if (cacBanGhiTrung.length) baoXungDot("DUPLICATE_FINE", "Vi phạm này đã có tiền phạt, kể cả đã thanh toán hoặc được miễn.");
                const [ketQua] = await ketNoi.execute("INSERT INTO Phat (borrow_detail_id, fine_rule_id, fine_type, amount, reason, assessed_at, payment_status) VALUES (?, ?, ?, ?, ?, UTC_TIMESTAMP(), 'unpaid')", [duLieu.borrow_detail_id, duLieu.fine_rule_id, quyDinh.rule_type, soTien, duLieu.reason]);
                return layTheoMa(String(ketQua.insertId), null, ketNoi);
            });
        },
        async ghiNhanThanhToan(ma) {
            return thucHienGiaoDich(boKetNoi, async ketNoi => {
                const [cacDong] = await ketNoi.execute("SELECT fine_id, payment_status, paid_at FROM Phat WHERE fine_id = ? FOR UPDATE", [ma]);
                if (!cacDong.length) throw new LoiHttp(404, "FINE_NOT_FOUND", "Không tìm thấy tiền phạt.");
                if (cacDong[0].payment_status !== "unpaid" || cacDong[0].paid_at !== null) baoXungDot("FINE_NOT_PAYABLE", "Tiền phạt đã thanh toán, đã miễn hoặc có dữ liệu thanh toán không nhất quán.");
                await ketNoi.execute("UPDATE Phat SET payment_status = 'paid', paid_at = UTC_TIMESTAMP() WHERE fine_id = ?", [ma]);
                return layTheoMa(ma, null, ketNoi);
            });
        },
    };
}
