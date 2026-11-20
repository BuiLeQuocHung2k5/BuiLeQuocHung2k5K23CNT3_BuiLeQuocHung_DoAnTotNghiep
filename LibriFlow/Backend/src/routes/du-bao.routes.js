import { Router } from "express";
import { yeuCauQuyen } from "../middlewares/xac-thuc.js";
import { taoDichVuDuBao } from "../services/du-bao.service.js";
import { taoBoDieuKhienDuBao } from "../controllers/du-bao.controller.js";

export function taoBoDinhTuyenDuBao(moHinh, xacThuc, tuyChon) {
    const boDinhTuyen = Router(), boDieuKhien = taoBoDieuKhienDuBao(taoDichVuDuBao(moHinh, tuyChon));
    boDinhTuyen.use(xacThuc);
    boDinhTuyen.use((req, res, next) => { res.set("Cache-Control", "no-store"); next(); });
    boDinhTuyen.get("/me", boDieuKhien.layCuaToi);
    boDinhTuyen.get("/users/:id", yeuCauQuyen("forecast_view"), boDieuKhien.layTheoNguoiDung);
    // forecast_view chỉ cho kiểm tra cổng; chưa có quyền ghi nên không cho lưu dự báo.
    boDinhTuyen.post("/users/:id/generate", yeuCauQuyen("forecast_view"), boDieuKhien.taoDuBao);
    return boDinhTuyen;
}
