import { kiemTraMa } from "../utils/kiem-tra-sach.js";
import { docJsonYeuCau } from "../utils/kiem-tra-danh-muc-ban-sao.js";
import { kiemTraTienPhat, kiemTraThanhToan, kiemTraTruyVanTienPhat, xacDinhPhamViDocTienPhat } from "../utils/kiem-tra-tien-phat.js";

export function taoBoDieuKhienTienPhat(dichVu) {
    return {
        async lietKe(req, res) { const ketQua = await dichVu.lietKe(kiemTraTruyVanTienPhat(req.query, xacDinhPhamViDocTienPhat(req.auth, "fine_manage"), true)); res.json({ success: true, data: ketQua.items, pagination: ketQua.pagination }); },
        async layTheoMa(req, res) { res.json({ success: true, data: await dichVu.layTheoMa(kiemTraMa(req.params.id), xacDinhPhamViDocTienPhat(req.auth, "fine_manage")) }); },
        async taoMoi(req, res) { const duLieu = await dichVu.taoMoi(docJsonYeuCau(req, kiemTraTienPhat)); res.location(`/api/fines/${duLieu.fine_id}`).status(201).json({ success: true, data: duLieu }); },
        async ghiNhanThanhToan(req, res) { const ma = kiemTraMa(req.params.id); docJsonYeuCau(req, kiemTraThanhToan); res.json({ success: true, data: await dichVu.ghiNhanThanhToan(ma) }); },
    };
}
