import { xacDinhPhamViDocLichSu, kiemTraTruyVanLichSu } from "../utils/kiem-tra-thong-ke.js";

export function taoBoDieuKhienLichSuSuDung(dichVu) {
    const lietKe = duLieuCuaToi => async (req, res) => {
        const truyVan = kiemTraTruyVanLichSu(req.query, xacDinhPhamViDocLichSu(req.auth, duLieuCuaToi)), ketQua = await dichVu.lietKe(truyVan);
        res.json({ success: true, data: ketQua.items, pagination: ketQua.pagination, period: { start_date: truyVan.start_date, end_date: truyVan.end_date, timezone: "UTC" } });
    };
    return { lietKe: lietKe(false), layCuaToi: lietKe(true) };
}
