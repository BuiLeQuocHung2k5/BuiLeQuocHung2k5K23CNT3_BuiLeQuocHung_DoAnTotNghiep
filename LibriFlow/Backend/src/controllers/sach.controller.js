import { kiemTraMa, kiemTraNoiDungSach, kiemTraTruyVanSach } from "../utils/kiem-tra-sach.js";
import { docJsonYeuCau } from "../utils/kiem-tra-danh-muc-ban-sao.js";

export function taoBoDieuKhienSach(dichVu) {
    return {
        async lietKe(req, res) {
            const { books: cacSach, pagination: thongTinPhanTrang } = await dichVu.lietKe(kiemTraTruyVanSach(req.query));
            res.json({ success: true, data: cacSach, pagination: thongTinPhanTrang });
        },
        async layTheoMa(req, res) {
            res.json({ success: true, data: await dichVu.layTheoMa(kiemTraMa(req.params.id)) });
        },
        async taoMoi(req, res) {
            const sach = await dichVu.taoMoi(docJsonYeuCau(req, kiemTraNoiDungSach));
            res.location(`/api/books/${sach.book_id}`).status(201).json({ success: true, data: sach });
        },
        async thayThe(req, res) {
            const ma = kiemTraMa(req.params.id);
            res.json({ success: true, data: await dichVu.thayThe(ma, docJsonYeuCau(req, kiemTraNoiDungSach)) });
        },
        async xoa(req, res) {
            await dichVu.xoa(kiemTraMa(req.params.id));
            res.json({ success: true, data: null, message: "Đã xóa sách." });
        },
    };
}
