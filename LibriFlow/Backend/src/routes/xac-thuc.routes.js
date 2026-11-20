import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { taoBoDieuKhienXacThuc } from "../controllers/xac-thuc.controller.js";
import { LoiHttp } from "../utils/loi-http.js";

export function taoBoDinhTuyenXacThuc(dichVu, xacThuc) {
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
    boDinhTuyen.post("/logout", xacThuc, boDieuKhien.dangXuat);
    return boDinhTuyen;
}
