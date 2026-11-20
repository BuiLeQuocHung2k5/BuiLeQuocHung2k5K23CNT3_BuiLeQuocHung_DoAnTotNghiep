import { kiemTraMa } from "../utils/kiem-tra-sach.js";
import { docJsonYeuCau, kiemTraBanSaoSach, kiemTraTruyVanBanSaoSach } from "../utils/kiem-tra-danh-muc-ban-sao.js";

// Ghi chú là nội dung nội bộ nên bị loại khỏi phản hồi danh mục công khai.
function locBanSaoCongKhai(banSao) { const { note: ghiChu, ...duLieuCongKhai } = banSao; return duLieuCongKhai; }

export function taoBoDieuKhienBanSaoSach(dichVu) {
    async function lietKe(req, res, laDuongDanLong) {
        const truyVan = kiemTraTruyVanBanSaoSach(req.query, laDuongDanLong ? req.params.id : undefined);
        const ketQua = await dichVu.lietKe(truyVan, laDuongDanLong);
        res.json({ success: true, data: ketQua.items.map(locBanSaoCongKhai), pagination: ketQua.pagination });
    }
    return {
        async lietKe(req, res) { await lietKe(req, res, false); },
        async lietKeTheoSach(req, res) { await lietKe(req, res, true); },
        async layTheoMa(req, res) { res.json({ success: true, data: locBanSaoCongKhai(await dichVu.layTheoMa(kiemTraMa(req.params.id))) }); },
        async taoMoi(req, res) { const duLieu = await dichVu.taoMoi(docJsonYeuCau(req, kiemTraBanSaoSach)); res.location(`/api/book-copies/${duLieu.copy_id}`).status(201).json({ success: true, data: duLieu }); },
        async thayThe(req, res) { res.json({ success: true, data: await dichVu.thayThe(kiemTraMa(req.params.id), docJsonYeuCau(req, noiDung => kiemTraBanSaoSach(noiDung, true))) }); },
        async xoa(req, res) { await dichVu.xoa(kiemTraMa(req.params.id)); res.json({ success: true, data: null, message: "Đã xóa bản sao sách." }); },
    };
}
