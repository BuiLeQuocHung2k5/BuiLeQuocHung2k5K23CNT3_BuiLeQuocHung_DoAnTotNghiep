import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { LoiHttp } from "../utils/loi-http.js";
import { THOI_HAN_TOKEN_GIAY } from "../utils/jwt.js";

let maBamGia;
function layMaBamGia() {
    maBamGia ??= bcrypt.hash(randomBytes(32).toString("hex"), 12);
    return maBamGia;
}

// Danh sách trường cho phép ngăn mật khẩu và mã băm lọt vào phản hồi xác thực.
function locNguoiDungCongKhai(nguoiDung) {
    const { user_id: maNguoiDung, name: ten, email: thuDienTu, phone: soDienThoai, avatar: anhDaiDien, status: trangThai, created_at: ngayTao, updated_at: ngayCapNhat, roles: cacVaiTro, permissions: cacQuyen } = nguoiDung;
    return { user_id: String(maNguoiDung), name: ten, email: thuDienTu, phone: soDienThoai, avatar: anhDaiDien, status: trangThai, created_at: ngayTao, updated_at: ngayCapNhat, roles: cacVaiTro, permissions: cacQuyen };
}

export function taoDichVuXacThuc(moHinh, dichVuToken) {
    return {
        async dangKy(duLieu) {
            dichVuToken.kiemTraDaCauHinh(); // Dừng trước khi băm mật khẩu hoặc ghi database nếu thiếu cấu hình.
            const { password: matKhau, ...hoSo } = duLieu;
            const maBam = await bcrypt.hash(matKhau, 12);
            return locNguoiDungCongKhai(await moHinh.dangKyDocGia(hoSo, maBam));
        },
        async dangNhap(duLieu) {
            dichVuToken.kiemTraDaCauHinh();
            const thongTinDangNhap = await moHinh.layThongTinDangNhap(duLieu.email);
            const maBam = thongTinDangNhap?.password;
            const maBamDuocHoTro = typeof maBam === "string" && /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(maBam);
            let hopLe = false;
            try { hopLe = await bcrypt.compare(duLieu.password, maBamDuocHoTro ? maBam : await layMaBamGia()); } catch { /* Không xác thực bằng mã băm sai định dạng hoặc không được hỗ trợ. */ }
            if (!thongTinDangNhap || !maBamDuocHoTro || !hopLe) throw new LoiHttp(401, "INVALID_CREDENTIALS", "Email hoặc mật khẩu không đúng.");
            if (thongTinDangNhap.status !== "active") throw new LoiHttp(403, "ACCOUNT_INACTIVE", "Tài khoản không còn hoạt động.");
            const tokenTruyCap = dichVuToken.phatHanhToken(thongTinDangNhap.user_id); // Ký token thành công trước khi ghi nhận đăng nhập.
            await moHinh.ghiNhanDangNhap(thongTinDangNhap.user_id); // Từ chối an toàn nếu không lưu được sự kiện; không ghi token/mật khẩu vào log.
            return { accessToken: tokenTruyCap, tokenType: "Bearer", expiresIn: THOI_HAN_TOKEN_GIAY };
        },
        async principal(ma) {
            const nguoiDung = await moHinh.layNguoiDungXacThuc(ma);
            if (!nguoiDung) throw new LoiHttp(401, "INVALID_TOKEN", "Tài khoản của token không còn tồn tại.");
            if (nguoiDung.status !== "active") throw new LoiHttp(403, "ACCOUNT_INACTIVE", "Tài khoản không còn hoạt động.");
            return locNguoiDungCongKhai(nguoiDung);
        },
    };
}
