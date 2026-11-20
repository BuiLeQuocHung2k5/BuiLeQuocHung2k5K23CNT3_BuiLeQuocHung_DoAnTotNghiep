import { LoiHttp } from "../utils/loi-http.js";

export function taoMiddlewareXacThuc(dichVuToken, dichVu) {
    return async function authenticate(req, res, next) {
        const thongTinPhieu = req.get("authorization");
        const ketQuaKhop = typeof thongTinPhieu === "string" && /^Bearer ([A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)$/i.exec(thongTinPhieu);
        if (!ketQuaKhop || thongTinPhieu.length > 4096) throw new LoiHttp(401, "AUTHENTICATION_REQUIRED", "Yêu cầu Bearer token hợp lệ.");
        const ma = dichVuToken.xacMinhToken(ketQuaKhop[1]);
        req.auth = await dichVu.principal(ma); // Đọc lại trạng thái tài khoản và RBAC từ MySQL ở mỗi request.
        next();
    };
}

export function yeuCauQuyen(quyen) {
    // Giá trị quyền phải khớp seed/MySQL; chỉ đổi tên biến, không dịch tên quyền RBAC.
    return function authorizePermission(req, res, next) {
        if (!req.auth) throw new LoiHttp(401, "AUTHENTICATION_REQUIRED", "Yêu cầu đăng nhập.");
        if (!req.auth.permissions.includes(quyen)) throw new LoiHttp(403, "FORBIDDEN", "Tài khoản không có quyền thực hiện thao tác này.");
        next();
    };
}
