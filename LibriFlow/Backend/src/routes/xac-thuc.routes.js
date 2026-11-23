import { raw, Router } from "express";
import { rateLimit } from "express-rate-limit";
import { taoBoDieuKhienXacThuc } from "../controllers/xac-thuc.controller.js";
import { LoiHttp } from "../utils/loi-http.js";
import { GIOI_HAN_AVATAR, MIME_AVATAR } from "../utils/anh-dai-dien.js";

export function taoBoDinhTuyenXacThuc(dichVu, xacThuc, khoAnh) {
    const boDinhTuyen = Router();
    const boDieuKhien = taoBoDieuKhienXacThuc(dichVu);
    const taoBoGioiHan = (gioiHan) => rateLimit({
        windowMs: 15 * 60 * 1000, limit: gioiHan, standardHeaders: "draft-7", legacyHeaders: false,
        handler(req, res, next) { next(new LoiHttp(429, "TOO_MANY_ATTEMPTS", "Quá nhiều yêu cầu. Vui lòng thử lại sau.")); },
    });
    boDinhTuyen.use((req, res, next) => { res.set("Cache-Control", "no-store"); next(); });
    boDinhTuyen.post("/register", taoBoGioiHan(5), boDieuKhien.dangKy);
    boDinhTuyen.post("/login", taoBoGioiHan(10), boDieuKhien.dangNhap);
    boDinhTuyen.get("/me", xacThuc, boDieuKhien.layCuaToi);
    boDinhTuyen.patch("/me", xacThuc, boDieuKhien.capNhatSoDienThoai);
    const docAnh = raw({ type: MIME_AVATAR, limit: GIOI_HAN_AVATAR, inflate: false });
    boDinhTuyen.put("/me/avatar", xacThuc, taoBoGioiHan(20), (req, res, next) => {
        docAnh(req, res, loi => next(loi?.type === "entity.too.large"
            ? new LoiHttp(413, "AVATAR_TOO_LARGE", "Ảnh đại diện tối đa 2 MB.") : loi));
    }, boDieuKhien.capNhatAnhDaiDien);
    boDinhTuyen.get("/avatars/:tenTep", async (req, res, next) => {
        const duongDan = await khoAnh.lay(req.params.tenTep);
        res.set({ "X-Content-Type-Options": "nosniff", "Content-Disposition": "inline" });
        // Ảnh demo nằm dưới .demo-local. Kho ảnh đã giới hạn tệp theo tên UUID.
        res.sendFile(duongDan, { cacheControl: false, dotfiles: "allow" }, loi => {
            if (loi) next(loi.code === "ENOENT" || loi.status === 404
                ? new LoiHttp(404, "AVATAR_NOT_FOUND", "Không tìm thấy ảnh đại diện.") : loi);
        });
    });
    boDinhTuyen.post("/logout", xacThuc, boDieuKhien.dangXuat);
    return boDinhTuyen;
}
