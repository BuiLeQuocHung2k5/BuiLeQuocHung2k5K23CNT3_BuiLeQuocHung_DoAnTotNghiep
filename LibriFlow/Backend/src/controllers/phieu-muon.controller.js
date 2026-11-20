import { kiemTraMa } from "../utils/kiem-tra-sach.js";
import { docJsonYeuCau } from "../utils/kiem-tra-danh-muc-ban-sao.js";
import { kiemTraPhieuMuon, kiemTraTraSach, xacDinhPhamViDocPhieuMuon, kiemTraTruyVanPhieuMuon } from "../utils/kiem-tra-phieu-muon.js";

export function taoBoDieuKhienPhieuMuon(dichVu) {
    return {
        async lietKe(req, res) { const ketQua = await dichVu.lietKe(kiemTraTruyVanPhieuMuon(req.query, xacDinhPhamViDocPhieuMuon(req.auth))); res.json({ success: true, data: ketQua.items, pagination: ketQua.pagination }); },
        async layTheoMa(req, res) { res.json({ success: true, data: await dichVu.layTheoMa(kiemTraMa(req.params.id), xacDinhPhamViDocPhieuMuon(req.auth)) }); },
        async taoMoi(req, res) { const duLieu = await dichVu.taoMoi(docJsonYeuCau(req, kiemTraPhieuMuon)); res.location(`/api/borrows/${duLieu.borrow_id}`).status(201).json({ success: true, data: duLieu }); },
        async traCacBanSao(req, res) { res.json({ success: true, data: await dichVu.traCacBanSao(kiemTraMa(req.params.id), docJsonYeuCau(req, kiemTraTraSach)) }); },
    };
}
