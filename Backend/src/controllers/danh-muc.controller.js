import { kiemTraMa, kiemTraTruyVanSach } from "../utils/kiem-tra-sach.js";
import { docJsonYeuCau, kiemTraDanhMuc } from "../utils/kiem-tra-danh-muc-ban-sao.js";

export function taoBoDieuKhienDanhMuc(dichVu) {
    return {
        async lietKe(req, res) { const ketQua = await dichVu.lietKe(kiemTraTruyVanSach(req.query)); res.json({ success: true, data: ketQua.items, pagination: ketQua.pagination }); },
        async layTheoMa(req, res) { res.json({ success: true, data: await dichVu.layTheoMa(kiemTraMa(req.params.id)) }); },
        async taoMoi(req, res) { const duLieu = await dichVu.taoMoi(docJsonYeuCau(req, kiemTraDanhMuc)); res.location(`/api/categories/${duLieu.category_id}`).status(201).json({ success: true, data: duLieu }); },
        async thayThe(req, res) { res.json({ success: true, data: await dichVu.thayThe(kiemTraMa(req.params.id), docJsonYeuCau(req, kiemTraDanhMuc)) }); },
        async xoa(req, res) { await dichVu.xoa(kiemTraMa(req.params.id)); res.json({ success: true, data: null, message: "Đã xóa danh mục." }); },
    };
}
