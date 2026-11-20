import { LoiHttp } from "./loi-http.js";

function baoDuLieuKhongHopLe(tenTruong, thongBao) {
    throw new LoiHttp(400, "VALIDATION_ERROR", "Dữ liệu xác thực không hợp lệ.", [{ field: tenTruong, message: thongBao }]);
}

function kiemTraDoiTuong(noiDung, cacTruongChoPhep) {
    if (!noiDung || typeof noiDung !== "object" || Array.isArray(noiDung)) baoDuLieuKhongHopLe("body", "Phải là JSON object.");
    for (const khoa of Object.keys(noiDung)) if (!cacTruongChoPhep.includes(khoa)) baoDuLieuKhongHopLe(khoa, "Trường không được phép gửi.");
}

function kiemTraVanBan(giaTri, tenTruong, toiDa, batBuoc = true) {
    if (!batBuoc && (giaTri === undefined || giaTri === null)) return null;
    if (typeof giaTri !== "string" || !giaTri.isWellFormed()) baoDuLieuKhongHopLe(tenTruong, "Phải là chuỗi Unicode hợp lệ.");
    giaTri = giaTri.trim();
    if ((batBuoc && !giaTri) || [...giaTri].length > toiDa || /[\u0000-\u001f\u007f]/.test(giaTri)) baoDuLieuKhongHopLe(tenTruong, `Chuỗi không rỗng, tối đa ${toiDa} ký tự, không có ký tự điều khiển.`);
    return giaTri;
}

function kiemTraEmail(giaTri) {
    giaTri = kiemTraVanBan(giaTri, "email", 150).toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(giaTri)) baoDuLieuKhongHopLe("email", "Email không đúng định dạng.");
    return giaTri;
}

function kiemTraMatKhau(giaTri, ketQuaDangKy) {
    if (typeof giaTri !== "string" || !giaTri.isWellFormed() || [...giaTri].length < (ketQuaDangKy ? 12 : 1) || Buffer.byteLength(giaTri, "utf8") > 72) {
        baoDuLieuKhongHopLe("password", ketQuaDangKy ? "Mật khẩu tối thiểu 12 ký tự, tối đa 72 byte UTF-8." : "Mật khẩu phải có từ 1 đến 72 byte UTF-8.");
    }
    return giaTri; // Không trim mật khẩu hoặc để bcrypt âm thầm cắt ngắn dữ liệu.
}

export function kiemTraDangKy(noiDung) {
    kiemTraDoiTuong(noiDung, ["name", "email", "password", "phone"]);
    return { name: kiemTraVanBan(noiDung.name, "name", 100), email: kiemTraEmail(noiDung.email), password: kiemTraMatKhau(noiDung.password, true), phone: kiemTraVanBan(noiDung.phone, "phone", 20, false) };
}

export function kiemTraDangNhap(noiDung) {
    kiemTraDoiTuong(noiDung, ["email", "password"]);
    return { email: kiemTraEmail(noiDung.email), password: kiemTraMatKhau(noiDung.password, false) };
}
