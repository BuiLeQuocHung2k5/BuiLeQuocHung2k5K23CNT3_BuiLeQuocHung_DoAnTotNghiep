import { kiemTraTruyVanThongKe } from "../utils/kiem-tra-thong-ke.js";

export function taoBoDieuKhienThongKe(dichVu) {
    const kyThongKe = truyVan => ({ start_date: truyVan.start_date, end_date: truyVan.end_date, timezone: "UTC" });
    return {
        async layTongQuan(req, res) { const truyVan = kiemTraTruyVanThongKe(req.query, "overview"); res.json({ success: true, data: await dichVu.layTongQuan(truyVan), period: kyThongKe(truyVan) }); },
        async thongKePhieuMuon(req, res) { const truyVan = kiemTraTruyVanThongKe(req.query, "borrows"); res.json({ success: true, data: await dichVu.thongKePhieuMuon(truyVan), period: { ...kyThongKe(truyVan), group_by: truyVan.group_by } }); },
        async thongKeNguoiDung(req, res) { const truyVan = kiemTraTruyVanThongKe(req.query, "users"), ketQua = await dichVu.thongKeNguoiDung(truyVan); res.json({ success: true, data: ketQua.items, pagination: ketQua.pagination, period: kyThongKe(truyVan) }); },
    };
}
