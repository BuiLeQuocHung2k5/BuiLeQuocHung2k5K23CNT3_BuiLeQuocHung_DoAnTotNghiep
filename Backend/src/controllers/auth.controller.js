import { HttpError } from "../utils/http-error.js";
import { validateLogin, validateRegister } from "../utils/auth-validation.js";

export function createAuthController(service) {
    function body(req, validate) {
        if (!req.is("application/json")) throw new HttpError(415, "UNSUPPORTED_MEDIA_TYPE", "Hãy gửi Content-Type: application/json.");
        return validate(req.body);
    }
    return {
        async register(req, res) {
            res.status(201).json({ success: true, data: await service.register(body(req, validateRegister)) });
        },
        async login(req, res) {
            res.json({ success: true, data: await service.login(body(req, validateLogin)) });
        },
        me(req, res) { res.json({ success: true, data: req.auth }); },
        logout(req, res) {
            res.json({ success: true, data: null, message: "Client cần xóa token đã lưu. Token chưa được thu hồi trên server và còn hợp lệ đến khi hết hạn nếu tài khoản vẫn hoạt động." });
        },
    };
}
