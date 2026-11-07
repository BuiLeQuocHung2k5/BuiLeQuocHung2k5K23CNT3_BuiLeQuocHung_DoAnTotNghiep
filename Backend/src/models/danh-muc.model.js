import { thucHienGiaoDich, truyVanPhanTrang, taoMauTimKiem } from "../utils/truy-van-danh-muc.js";
import { LoiHttp } from "../utils/loi-http.js";

const CAC_COT = "category_id, name, description, created_at";
const chuanHoaBanGhi = dongDuLieu => dongDuLieu ? { ...dongDuLieu, category_id: String(dongDuLieu.category_id) } : null;

export function taoMoHinhDanhMuc(boKetNoi) {
    async function layTheoMa(ma, ketNoi = boKetNoi, canKhoa = false) {
        const [cacDong] = await ketNoi.execute(`SELECT ${CAC_COT} FROM DanhMuc WHERE category_id = ?${canKhoa ? " FOR UPDATE" : ""}`, [ma]);
        return chuanHoaBanGhi(cacDong[0]);
    }
    return {
        layTheoMa: layTheoMa,
        async lietKe(truyVan) {
            const dieuKienLoc = truyVan.search ? " WHERE (name LIKE ? ESCAPE '=' OR description LIKE ? ESCAPE '=')" : "";
            const thamSo = truyVan.search ? [taoMauTimKiem(truyVan.search), taoMauTimKiem(truyVan.search)] : [];
            return truyVanPhanTrang(boKetNoi, `SELECT COUNT(*) AS total FROM DanhMuc${dieuKienLoc}`, `SELECT ${CAC_COT} FROM DanhMuc${dieuKienLoc} ORDER BY category_id DESC LIMIT ? OFFSET ?`, thamSo, truyVan, chuanHoaBanGhi);
        },
        async taoMoi(duLieu) {
            return thucHienGiaoDich(boKetNoi, async ketNoi => {
                const [ketQua] = await ketNoi.execute("INSERT INTO DanhMuc (name, description) VALUES (?, ?)", [duLieu.name, duLieu.description]);
                return layTheoMa(String(ketQua.insertId), ketNoi);
            });
        },
        async thayThe(ma, duLieu) {
            return thucHienGiaoDich(boKetNoi, async ketNoi => {
                if (!await layTheoMa(ma, ketNoi, true)) return null;
                await ketNoi.execute("UPDATE DanhMuc SET name = ?, description = ? WHERE category_id = ?", [duLieu.name, duLieu.description, ma]);
                return layTheoMa(ma, ketNoi);
            });
        },
        async xoa(ma) {
            return thucHienGiaoDich(boKetNoi, async ketNoi => {
                if (!await layTheoMa(ma, ketNoi, true)) return false;
                // Đọc có khóa cùng khóa danh mục cha để chặn bổ sung khóa ngoại đồng thời.
                const [cacSach] = await ketNoi.execute("SELECT book_id FROM Sach WHERE category_id = ? LIMIT 1 FOR UPDATE", [ma]);
                if (cacSach.length) throw new LoiHttp(409, "CATEGORY_IN_USE", "Danh mục đang được sách tham chiếu, không thể xóa.");
                // Chặn xóa để ON DELETE SET NULL không làm mất liên kết sách đang có.
                await ketNoi.execute("DELETE FROM DanhMuc WHERE category_id = ?", [ma]);
                return true;
            });
        },
    };
}
