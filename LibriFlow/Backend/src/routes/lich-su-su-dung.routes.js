import { Router } from "express";
import { taoDichVuLichSuSuDung } from "../services/lich-su-su-dung.service.js";
import { taoBoDieuKhienLichSuSuDung } from "../controllers/lich-su-su-dung.controller.js";

export function taoBoDinhTuyenLichSuSuDung(moHinh, xacThuc) {
    const boDinhTuyen = Router(), boDieuKhien = taoBoDieuKhienLichSuSuDung(taoDichVuLichSuSuDung(moHinh));
    boDinhTuyen.use(xacThuc);
    boDinhTuyen.use((req, res, next) => { res.set("Cache-Control", "no-store"); next(); });
    boDinhTuyen.get("/", boDieuKhien.lietKe);
    boDinhTuyen.get("/me", boDieuKhien.layCuaToi);
    return boDinhTuyen;
}
