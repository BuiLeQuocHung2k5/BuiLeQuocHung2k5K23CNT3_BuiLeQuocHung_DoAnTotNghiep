import { LoiHttp } from "../utils/loi-http.js";
import { kiemTraDangNhap, kiemTraDangKy } from "../utils/kiem-tra-xac-thuc.js";

export function taoBoDieuKhienXacThuc(dichVu) {
    function docNoiDungYeuCau(req, hamKiemTra) {
        if (!req.is("application/json")) throw new LoiHttp(415, "UNSUPPORTED_MEDIA_TYPE", "Hãy gửi Content-Type: application/json.");
        return hamKiemTra(req.body);
    }
    return {
        async dangKy(req, res) {
            res.status(201).json({ success: true, data: await dichVu.dangKy(docNoiDungYeuCau(req, kiemTraDangKy)) });
        },
        async dangNhap(req, res) {
            res.json({ success: true, data: await dichVu.dangNhap(docNoiDungYeuCau(req, kiemTraDangNhap)) });
        },
        layCuaToi(req, res) { res.json({ success: true, data: req.auth }); },
        dangXuat(req, res) {
            res.json({ success: true, data: null, message: "Client cần xóa token đã lưu. Token chưa được thu hồi trên server và còn hợp lệ đến khi hết hạn nếu tài khoản vẫn hoạt động." });
        },
    };
}
