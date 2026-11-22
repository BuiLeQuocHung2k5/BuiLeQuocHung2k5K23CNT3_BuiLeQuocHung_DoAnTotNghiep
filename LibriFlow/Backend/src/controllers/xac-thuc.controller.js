import { LoiHttp } from "../utils/loi-http.js";
import { kiemTraDangNhap, kiemTraDangKy, kiemTraCapNhatSoDienThoai } from "../utils/kiem-tra-xac-thuc.js";
import { MIME_AVATAR } from "../utils/anh-dai-dien.js";

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
        async capNhatSoDienThoai(req, res) {
            const phone = docNoiDungYeuCau(req, kiemTraCapNhatSoDienThoai);
            res.json({ success: true, data: await dichVu.capNhatSoDienThoai(req.auth.user_id, phone) });
        },
        async capNhatAnhDaiDien(req, res) {
            const mime = MIME_AVATAR.find(loai => req.is(loai));
            res.json({ success: true, data: await dichVu.capNhatAnhDaiDien(req.auth.user_id, req.body, mime) });
        },
        dangXuat(req, res) {
            res.json({ success: true, data: null, message: "Client cần xóa token đã lưu. Token chưa được thu hồi trên server và còn hợp lệ đến khi hết hạn nếu tài khoản vẫn hoạt động." });
        },
    };
}
