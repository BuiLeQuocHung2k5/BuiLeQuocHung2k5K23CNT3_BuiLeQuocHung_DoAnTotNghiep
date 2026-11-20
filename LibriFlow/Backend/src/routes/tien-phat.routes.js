import { Router } from "express";
import { yeuCauQuyen } from "../middlewares/xac-thuc.js";
import { taoDichVuTienPhat } from "../services/tien-phat.service.js";
import { taoBoDieuKhienTienPhat } from "../controllers/tien-phat.controller.js";

export function taoBoDinhTuyenTienPhat(moHinh, xacThuc) {
    const boDinhTuyen = Router(), boDieuKhien = taoBoDieuKhienTienPhat(taoDichVuTienPhat(moHinh));
    boDinhTuyen.use(xacThuc);
    boDinhTuyen.get("/", boDieuKhien.lietKe);
    boDinhTuyen.get("/:id", boDieuKhien.layTheoMa);
    boDinhTuyen.post("/", yeuCauQuyen("fine_manage"), boDieuKhien.taoMoi);
    boDinhTuyen.patch("/:id/payment", yeuCauQuyen("fine_manage"), boDieuKhien.ghiNhanThanhToan);
    return boDinhTuyen;
}
