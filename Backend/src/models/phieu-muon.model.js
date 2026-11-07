import { thucHienGiaoDich, truyVanPhanTrang } from "../utils/truy-van-danh-muc.js";
import { LoiHttp } from "../utils/loi-http.js";
import { SO_BAN_SAO_TOI_DA_MOI_PHIEU } from "../utils/kiem-tra-phieu-muon.js";
import { taoMoHinhLichSuSuDung } from "./lich-su-su-dung.model.js";
import { taoDichVuLichSuSuDung } from "../services/lich-su-su-dung.service.js";

// Mốc lưu thông mới dùng DATETIME UTC; định dạng trong SQL để tránh driver đổi múi giờ.
const THONG_TIN_PHIEU = `p.borrow_id, p.user_id, DATE_FORMAT(p.borrow_date, '%Y-%m-%d %H:%i:%s') AS borrow_date,
 DATE_FORMAT(p.due_date, '%Y-%m-%d %H:%i:%s') AS due_date, p.status, p.note,
 DATE_FORMAT(p.created_at, '%Y-%m-%d %H:%i:%s') AS created_at`;
const CHI_TIET = "borrow_detail_id, borrow_id, copy_id, returned_at, condition_before, condition_after, status";
const sapXepCacMa = cacMa => [...new Set(cacMa.map(String))].sort((a, b) => BigInt(a) < BigInt(b) ? -1 : BigInt(a) > BigInt(b) ? 1 : 0);
function baoXungDot(maLoi, thongBao) { throw new LoiHttp(409, maLoi, thongBao); }
function chuanHoaPhieuMuon(dongDuLieu) {
    return { borrow_id: String(dongDuLieu.borrow_id), user_id: String(dongDuLieu.user_id), borrow_date: dongDuLieu.borrow_date, due_date: dongDuLieu.due_date, status: dongDuLieu.status, note: dongDuLieu.note, created_at: dongDuLieu.created_at };
}

export function taoMoHinhPhieuMuon(boKetNoi) {
    const lichSuSuDung = taoDichVuLichSuSuDung(taoMoHinhLichSuSuDung(boKetNoi));
    async function layTheoMa(ma, maChuSoHuu = null, ketNoi = boKetNoi) {
        const thamSo = [ma];
        if (maChuSoHuu !== null) thamSo.push(maChuSoHuu);
        const [cacDong] = await ketNoi.execute(`SELECT ${THONG_TIN_PHIEU}, d.borrow_detail_id, d.copy_id,
            DATE_FORMAT(d.returned_at, '%Y-%m-%d %H:%i:%s') AS returned_at,
            d.condition_before, d.condition_after, d.status AS detail_status
            FROM PhieuMuon p LEFT JOIN ChiTietPhieuMuon d ON d.borrow_id = p.borrow_id
            WHERE p.borrow_id = ?${maChuSoHuu !== null ? " AND p.user_id = ?" : ""} ORDER BY d.borrow_detail_id`, thamSo);
        if (!cacDong.length) return null;
        return { ...chuanHoaPhieuMuon(cacDong[0]), details: cacDong.filter(dongDuLieu => dongDuLieu.borrow_detail_id !== null).map(dongDuLieu => ({
            borrow_detail_id: String(dongDuLieu.borrow_detail_id), copy_id: String(dongDuLieu.copy_id), returned_at: dongDuLieu.returned_at,
            condition_before: dongDuLieu.condition_before, condition_after: dongDuLieu.condition_after, status: dongDuLieu.detail_status,
        })) };
    }
    async function khoaCacBanSao(ketNoi, cacMa) {
        const cacBanSao = new Map();
        for (const ma of sapXepCacMa(cacMa)) {
            const [cacDong] = await ketNoi.execute("SELECT copy_id, condition_status, availability_status FROM BanSaoSach WHERE copy_id = ? FOR UPDATE", [ma]);
            if (!cacDong.length) throw new LoiHttp(404, "COPY_NOT_FOUND", "Không tìm thấy một bản sao được yêu cầu.");
            cacBanSao.set(ma, cacDong[0]);
        }
        return cacBanSao;
    }
    return {
        layTheoMa: layTheoMa,
        async lietKe(truyVan) {
            const cacDieuKien = [], thamSo = [];
            for (const tenTruong of ["user_id", "status"]) if (truyVan[tenTruong] !== undefined) { cacDieuKien.push(`p.${tenTruong} = ?`); thamSo.push(truyVan[tenTruong]); }
            const dieuKienLoc = cacDieuKien.length ? ` WHERE ${cacDieuKien.join(" AND ")}` : "";
            return truyVanPhanTrang(boKetNoi, `SELECT COUNT(*) AS total FROM PhieuMuon p${dieuKienLoc}`, `SELECT ${THONG_TIN_PHIEU} FROM PhieuMuon p${dieuKienLoc} ORDER BY p.borrow_id DESC LIMIT ? OFFSET ?`, thamSo, truyVan, chuanHoaPhieuMuon);
        },
        async taoMoi(duLieu) {
            return thucHienGiaoDich(boKetNoi, async ketNoi => {
                const [cacNguoiDung] = await ketNoi.execute("SELECT user_id, status FROM NguoiDung WHERE user_id = ? FOR SHARE", [duLieu.user_id]);
                if (!cacNguoiDung.length) throw new LoiHttp(404, "BORROWER_NOT_FOUND", "Không tìm thấy người mượn.");
                if (cacNguoiDung[0].status !== "active") baoXungDot("BORROWER_INACTIVE", "Người mượn không có trạng thái active.");
                const cacBanSao = await khoaCacBanSao(ketNoi, duLieu.copy_ids);
                for (const [ma, banSao] of cacBanSao) {
                    if (banSao.availability_status !== "available" || banSao.condition_status !== "good") baoXungDot("COPY_NOT_BORROWABLE", "Bản sao không sẵn sàng hoặc không ở tình trạng good.");
                    const [cacLuotMo] = await ketNoi.execute("SELECT borrow_detail_id FROM ChiTietPhieuMuon WHERE copy_id = ? AND (returned_at IS NULL OR status <> 'returned') LIMIT 1 FOR UPDATE", [ma]);
                    if (cacLuotMo.length) baoXungDot("COPY_HAS_OPEN_LOAN", "Bản sao có lượt mượn chưa hoàn tất.");
                }
                const [layThoiGianHienTai] = await ketNoi.execute("SELECT (CAST(? AS DATETIME) > UTC_TIMESTAMP()) AS valid_due_date", [duLieu.due_date]);
                if (Number(layThoiGianHienTai[0].valid_due_date) !== 1) throw new LoiHttp(400, "INVALID_DUE_DATE", "Ngày hẹn trả đã hết hiệu lực theo giờ database.");
                const [ketQua] = await ketNoi.execute("INSERT INTO PhieuMuon (user_id, borrow_date, due_date, status, note, created_at) VALUES (?, UTC_TIMESTAMP(), ?, 'borrowed', ?, UTC_TIMESTAMP())", [duLieu.user_id, duLieu.due_date, duLieu.note]);
                const ma = String(ketQua.insertId);
                for (const [maBanSao, banSao] of cacBanSao) {
                    await ketNoi.execute("INSERT INTO ChiTietPhieuMuon (borrow_id, copy_id, condition_before, status) VALUES (?, ?, ?, 'borrowed')", [ma, maBanSao, banSao.condition_status]);
                    await ketNoi.execute("UPDATE BanSaoSach SET availability_status = 'borrowed' WHERE copy_id = ?", [maBanSao]);
                }
                for (const maBanSao of cacBanSao.keys()) await lichSuSuDung.ghiNhan({ user_id: duLieu.user_id, copy_id: maBanSao, action_type: "borrow", borrow_id: ma }, ketNoi);
                return layTheoMa(ma, null, ketNoi);
            });
        },
        async traCacBanSao(ma, duLieu) {
            return thucHienGiaoDich(boKetNoi, async ketNoi => {
                const [cacThongTinPhieu] = await ketNoi.execute("SELECT borrow_id, user_id, status FROM PhieuMuon WHERE borrow_id = ? FOR UPDATE", [ma]);
                if (!cacThongTinPhieu.length) throw new LoiHttp(404, "BORROW_NOT_FOUND", "Không tìm thấy phiếu mượn.");
                if (!["borrowed", "partially_returned", "overdue"].includes(cacThongTinPhieu[0].status)) baoXungDot("BORROW_NOT_RETURNABLE", "Phiếu đã hoàn tất hoặc bị hủy, không thể trả.");
                // Khóa phiếu, bản sao theo thứ tự ID số rồi chi tiết; thống nhất với khóa quản lý bản sao.
                const [banDau] = await ketNoi.execute(`SELECT ${CHI_TIET} FROM ChiTietPhieuMuon WHERE borrow_id = ?`, [ma]);
                if (!banDau.length || banDau.length > SO_BAN_SAO_TOI_DA_MOI_PHIEU || new Set(banDau.map(dongDuLieu => String(dongDuLieu.copy_id))).size !== banDau.length) baoXungDot("BORROW_REQUIRES_REVIEW", "Chi tiết phiếu trống, trùng hoặc vượt giới hạn; cần kiểm tra riêng.");
                const cacBanSao = await khoaCacBanSao(ketNoi, banDau.map(dongDuLieu => String(dongDuLieu.copy_id)));
                const [cacDong] = await ketNoi.execute(`SELECT ${CHI_TIET} FROM ChiTietPhieuMuon WHERE borrow_id = ? ORDER BY copy_id FOR UPDATE`, [ma]);
                const dauVanTay = cacGiaTri => cacGiaTri.map(dongDuLieu => `${dongDuLieu.borrow_detail_id}:${dongDuLieu.copy_id}`).sort().join(",");
                if (dauVanTay(banDau) !== dauVanTay(cacDong)) baoXungDot("BORROW_CHANGED", "Chi tiết phiếu đã thay đổi; hãy tải lại.");
                if (cacDong.some(dongDuLieu => (dongDuLieu.status === "returned") !== (dongDuLieu.returned_at !== null))) baoXungDot("RETURN_STATE_CONFLICT", "Trạng thái chi tiết và thời gian trả không nhất quán; cần kiểm tra riêng.");
                const cacMucYeuCau = duLieu.return_all ? cacDong.filter(dongDuLieu => dongDuLieu.status !== "returned").map(dongDuLieu => ({ copy_id: String(dongDuLieu.copy_id), condition_after: duLieu.condition_after })) : duLieu.items;
                if (!cacMucYeuCau.length) baoXungDot("ALREADY_RETURNED", "Không còn bản sao cần trả.");
                const cacChiTiet = new Map(cacDong.map(dongDuLieu => [String(dongDuLieu.copy_id), dongDuLieu]));
                for (const muc of cacMucYeuCau) {
                    const dongDuLieu = cacChiTiet.get(muc.copy_id);
                    if (!dongDuLieu) throw new LoiHttp(400, "COPY_NOT_IN_BORROW", "Bản sao không thuộc phiếu mượn này.");
                    if (dongDuLieu.status === "returned" || dongDuLieu.returned_at !== null) baoXungDot("ALREADY_RETURNED", "Bản sao đã trả hoặc có dữ liệu trả không nhất quán.");
                    if (dongDuLieu.status !== "borrowed" || cacBanSao.get(muc.copy_id).availability_status !== "borrowed") baoXungDot("RETURN_STATE_CONFLICT", "Trạng thái lưu thông không nhất quán hoặc liên quan bản sao mất; cần kiểm tra riêng.");
                    const [cacLuotMo] = await ketNoi.execute("SELECT borrow_detail_id, borrow_id FROM ChiTietPhieuMuon WHERE copy_id = ? AND (returned_at IS NULL OR status <> 'returned') FOR UPDATE", [muc.copy_id]);
                    if (cacLuotMo.length !== 1 || String(cacLuotMo[0].borrow_detail_id) !== String(dongDuLieu.borrow_detail_id) || String(cacLuotMo[0].borrow_id) !== ma) baoXungDot("RETURN_STATE_CONFLICT", "Bản sao có lịch sử mượn đang mở không nhất quán; cần kiểm tra riêng.");
                }
                // Kiểm tra toàn bộ lô trước lần ghi đầu tiên.
                for (const muc of cacMucYeuCau) {
                    await ketNoi.execute("UPDATE ChiTietPhieuMuon SET returned_at = UTC_TIMESTAMP(), condition_after = ?, status = 'returned' WHERE borrow_detail_id = ?", [muc.condition_after, String(cacChiTiet.get(muc.copy_id).borrow_detail_id)]);
                    await ketNoi.execute("UPDATE BanSaoSach SET condition_status = ?, availability_status = ? WHERE copy_id = ?", [muc.condition_after, muc.condition_after === "damaged" ? "maintenance" : "available", muc.copy_id]);
                }
                const cacMaVuaTra = new Set(cacMucYeuCau.map(muc => muc.copy_id));
                const daHoanTat = cacDong.every(dongDuLieu => cacMaVuaTra.has(String(dongDuLieu.copy_id)) || dongDuLieu.status === "returned" && dongDuLieu.returned_at !== null);
                await ketNoi.execute("UPDATE PhieuMuon SET status = ? WHERE borrow_id = ?", [daHoanTat ? "returned" : "partially_returned", ma]);
                for (const muc of cacMucYeuCau) await lichSuSuDung.ghiNhan({ user_id: String(cacThongTinPhieu[0].user_id), copy_id: muc.copy_id, action_type: "return", borrow_id: ma }, ketNoi);
                return layTheoMa(ma, null, ketNoi);
            });
        },
    };
}
