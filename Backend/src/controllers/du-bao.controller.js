import { kiemTraMa } from "../utils/kiem-tra-sach.js";
import { baoDuLieuKhongHopLe } from "../utils/kiem-tra-danh-muc-ban-sao.js";

function kiemTraKhongCoTruyVan(req) { if (Object.keys(req.query).length) baoDuLieuKhongHopLe("query", "Không nhận ngày cắt, người dùng hoặc độ phủ từ query; thời gian và cấu hình lấy từ server."); }
export function taoBoDieuKhienDuBao(dichVu) {
    return {
        async layCuaToi(req, res) { kiemTraKhongCoTruyVan(req); res.json({ success: true, data: await dichVu.xemTruoc(req.auth.user_id) }); },
        async layTheoNguoiDung(req, res) { kiemTraKhongCoTruyVan(req); res.json({ success: true, data: await dichVu.xemTruoc(kiemTraMa(req.params.id)) }); },
        async taoDuBao(req, res) { kiemTraKhongCoTruyVan(req); kiemTraMa(req.params.id); await dichVu.taoDuBao(); },
    };
}
