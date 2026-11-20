import { thucHienGiaoDich, truyVanPhanTrang, taoMauTimKiem } from "../utils/truy-van-danh-muc.js";
import { LoiHttp } from "../utils/loi-http.js";

const CAC_COT = "copy_id, book_id, isbn, barcode, condition_status, availability_status, note, created_at, updated_at";
const CAC_COT_CONG_KHAI = "copy_id, book_id, isbn, barcode, condition_status, availability_status, created_at, updated_at";
const CAC_COT_DUOC_GHI = ["book_id", "isbn", "barcode", "condition_status", "availability_status", "note"];
const chuanHoaBanGhi = dongDuLieu => dongDuLieu ? { ...dongDuLieu, copy_id: String(dongDuLieu.copy_id), book_id: String(dongDuLieu.book_id) } : null;

export function taoMoHinhBanSaoSach(boKetNoi) {
    async function layTheoMa(ma, ketNoi = boKetNoi, canKhoa = false, kemGhiChu = false) {
        const [cacDong] = await ketNoi.execute(`SELECT ${kemGhiChu ? CAC_COT : CAC_COT_CONG_KHAI} FROM BanSaoSach WHERE copy_id = ?${canKhoa ? " FOR UPDATE" : ""}`, [ma]);
        return chuanHoaBanGhi(cacDong[0]);
    }
    async function kiemTraChoPhepChinhSua(banSao, ketNoi) {
        if (!["available", "maintenance"].includes(banSao.availability_status)) throw new LoiHttp(409, "COPY_CIRCULATION_LOCKED", "Bản sao borrowed/lost chỉ được xử lý qua module mượn/trả.");
        const [cacPhieuDaMuon] = await ketNoi.execute("SELECT borrow_detail_id FROM ChiTietPhieuMuon WHERE copy_id = ? AND (returned_at IS NULL OR status <> 'returned') LIMIT 1 FOR UPDATE", [banSao.copy_id]);
        if (cacPhieuDaMuon.length) throw new LoiHttp(409, "COPY_CIRCULATION_LOCKED", "Bản sao có lượt mượn chưa hoàn tất; không được sửa hoặc xóa tại đây.");
    }
    return {
        layTheoMa: layTheoMa,
        async sachTonTai(ma) {
            const [cacDong] = await boKetNoi.execute("SELECT book_id FROM Sach WHERE book_id = ?", [ma]);
            return cacDong.length > 0;
        },
        async lietKe(truyVan) {
            const cacDieuKien = [], cacThamSo = [];
            for (const tenTruong of ["book_id", "condition_status", "availability_status"]) {
                if (truyVan[tenTruong] !== undefined) { cacDieuKien.push(`${tenTruong} = ?`); cacThamSo.push(truyVan[tenTruong]); }
            }
            if (truyVan.search) { cacDieuKien.push("(barcode LIKE ? ESCAPE '=' OR isbn LIKE ? ESCAPE '=')"); cacThamSo.push(taoMauTimKiem(truyVan.search), taoMauTimKiem(truyVan.search)); }
            const dieuKienLoc = cacDieuKien.length ? ` WHERE ${cacDieuKien.join(" AND ")}` : "";
            return truyVanPhanTrang(boKetNoi, `SELECT COUNT(*) AS total FROM BanSaoSach${dieuKienLoc}`, `SELECT ${CAC_COT_CONG_KHAI} FROM BanSaoSach${dieuKienLoc} ORDER BY copy_id DESC LIMIT ? OFFSET ?`, cacThamSo, truyVan, chuanHoaBanGhi);
        },
        async taoMoi(duLieu) {
            return thucHienGiaoDich(boKetNoi, async ketNoi => {
                const [cacSach] = await ketNoi.execute("SELECT book_id FROM Sach WHERE book_id = ? FOR SHARE", [duLieu.book_id]);
                if (!cacSach.length) throw new LoiHttp(400, "INVALID_REFERENCE", "Sách được tham chiếu không tồn tại.");
                const [ketQua] = await ketNoi.execute(`INSERT INTO BanSaoSach (${CAC_COT_DUOC_GHI.join(", ")}) VALUES (?, ?, ?, ?, ?, ?)`, CAC_COT_DUOC_GHI.map(khoa => duLieu[khoa]));
                return layTheoMa(String(ketQua.insertId), ketNoi, false, true);
            });
        },
        async thayThe(ma, duLieu) {
            return thucHienGiaoDich(boKetNoi, async ketNoi => {
                const banSao = await layTheoMa(ma, ketNoi, true);
                if (!banSao) return null;
                await kiemTraChoPhepChinhSua(banSao, ketNoi);
                if (duLieu.book_id !== banSao.book_id) throw new LoiHttp(409, "COPY_BOOK_IMMUTABLE", "Không hỗ trợ chuyển bản sao sang sách khác; cần giữ nguyên liên kết lịch sử.");
                await ketNoi.execute("UPDATE BanSaoSach SET isbn = ?, barcode = ?, condition_status = ?, availability_status = ?, note = ? WHERE copy_id = ?", [duLieu.isbn, duLieu.barcode, duLieu.condition_status, duLieu.availability_status, duLieu.note, ma]);
                return layTheoMa(ma, ketNoi, false, true);
            });
        },
        async xoa(ma) {
            return thucHienGiaoDich(boKetNoi, async ketNoi => {
                const banSao = await layTheoMa(ma, ketNoi, true);
                if (!banSao) return false;
                await kiemTraChoPhepChinhSua(banSao, ketNoi);
                const [cacPhieuDaMuon] = await ketNoi.execute("SELECT borrow_detail_id FROM ChiTietPhieuMuon WHERE copy_id = ? LIMIT 1 FOR UPDATE", [ma]);
                if (cacPhieuDaMuon.length) throw new LoiHttp(409, "COPY_HAS_LOAN_HISTORY", "Bản sao đã có lịch sử mượn, không thể xóa.");
                const [lichSuSuDung] = await ketNoi.execute("SELECT usage_id FROM LichSuSuDung WHERE copy_id = ? LIMIT 1 FOR UPDATE", [ma]);
                if (lichSuSuDung.length) throw new LoiHttp(409, "COPY_HAS_USAGE_HISTORY", "Bản sao có lịch sử sử dụng, không thể xóa.");
                await ketNoi.execute("DELETE FROM BanSaoSach WHERE copy_id = ?", [ma]);
                return true;
            });
        },
    };
}
