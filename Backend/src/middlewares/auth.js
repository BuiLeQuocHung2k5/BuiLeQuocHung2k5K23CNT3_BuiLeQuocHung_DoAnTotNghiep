import { HttpError } from "../utils/http-error.js";

export function createAuthenticate(tokens, service) {
    return async function authenticate(req, res, next) {
        const header = req.get("authorization");
        const match = typeof header === "string" && /^Bearer ([A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)$/i.exec(header);
        if (!match || header.length > 4096) throw new HttpError(401, "AUTHENTICATION_REQUIRED", "Yêu cầu Bearer token hợp lệ.");
        const id = tokens.verify(match[1]);
        req.auth = await service.principal(id); // Reload status and RBAC from the database on every request.
        next();
    };
}

export function authorize(permission) {
    return function authorizePermission(req, res, next) {
        if (!req.auth) throw new HttpError(401, "AUTHENTICATION_REQUIRED", "Yêu cầu đăng nhập.");
        if (!req.auth.permissions.includes(permission)) throw new HttpError(403, "FORBIDDEN", "Tài khoản không có quyền thực hiện thao tác này.");
        next();
    };
}
