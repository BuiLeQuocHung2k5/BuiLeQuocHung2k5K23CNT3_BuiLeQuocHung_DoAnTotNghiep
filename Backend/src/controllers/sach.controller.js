import { kiemTraMa, kiemTraNoiDungSach, kiemTraTruyVanSach } from "../utils/kiem-tra-sach.js";
import { LoiHttp } from "../utils/loi-http.js";

export function taoBoDieuKhienSach(dichVu) {
    function docNoiDungYeuCau(req) {
        if (!req.is("application/json")) throw new LoiHttp(415, "UNSUPPORTED_MEDIA_TYPE", "Hãy gửi Content-Type: application/json.");
        return kiemTraNoiDungSach(req.body);
    }
    return {
        async lietKe(req, res) {
            const { books: cacSach, pagination: thongTinPhanTrang } = await dichVu.lietKe(kiemTraTruyVanSach(req.query));
            res.json({ success: true, data: cacSach, pagination: thongTinPhanTrang });
        },
        async layTheoMa(req, res) {
            res.json({ success: true, data: await dichVu.layTheoMa(kiemTraMa(req.params.id)) });
        },
        async taoMoi(req, res) {
            const sach = await dichVu.taoMoi(docNoiDungYeuCau(req));
            res.location(`/api/books/${sach.book_id}`).status(201).json({ success: true, data: sach });
        },
        async thayThe(req, res) {
            const ma = kiemTraMa(req.params.id);
            res.json({ success: true, data: await dichVu.thayThe(ma, docNoiDungYeuCau(req)) });
        },
        async xoa(req, res) {
            await dichVu.xoa(kiemTraMa(req.params.id));
            res.json({ success: true, data: null, message: "Đã xóa sách." });
        },
    };
}
