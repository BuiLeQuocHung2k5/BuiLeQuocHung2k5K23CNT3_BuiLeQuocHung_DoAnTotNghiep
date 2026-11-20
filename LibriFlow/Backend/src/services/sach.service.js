import { LoiHttp } from "../utils/loi-http.js";

export function taoDichVuSach(moHinh) {
    function yeuCauSachTonTai(sach) {
        if (!sach) throw new LoiHttp(404, "BOOK_NOT_FOUND", "Không tìm thấy sách.");
        return sach;
    }
    return {
        async lietKe(truyVan) {
            const { books: cacSach, total: tongSo } = await moHinh.lietKe(truyVan);
            return { books: cacSach, pagination: { page: truyVan.page, limit: truyVan.limit, total: tongSo, totalPages: Math.ceil(tongSo / truyVan.limit) } };
        },
        async layTheoMa(ma) { return yeuCauSachTonTai(await moHinh.layTheoMa(ma)); },
        async taoMoi(duLieu) { return moHinh.taoMoi(duLieu); },
        async thayThe(ma, duLieu) { return yeuCauSachTonTai(await moHinh.thayThe(ma, duLieu)); },
        async xoa(ma) {
            const ketQua = await moHinh.xoa(ma);
            if (ketQua === "missing") yeuCauSachTonTai(null);
            if (ketQua === "referenced") throw new LoiHttp(409, "BOOK_HAS_COPIES", "Sách có bản sao hoặc dữ liệu liên quan nên không thể xóa.");
        },
    };
}
