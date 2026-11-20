import { Router } from "express";
import { yeuCauQuyen } from "../middlewares/xac-thuc.js";
import { taoBoDieuKhienBanSaoSach } from "../controllers/ban-sao-sach.controller.js";
import { taoDichVuBanSaoSach } from "../services/ban-sao-sach.service.js";

export function taoBoDinhTuyenBanSaoSach(moHinh, xacThuc) {
    const boDinhTuyen = Router();
    const boDieuKhien = taoBoDieuKhienBanSaoSach(taoDichVuBanSaoSach(moHinh));
    boDinhTuyen.get("/", boDieuKhien.lietKe);
    boDinhTuyen.get("/:id", boDieuKhien.layTheoMa);
    boDinhTuyen.post("/", xacThuc, yeuCauQuyen("copy_manage"), boDieuKhien.taoMoi);
    boDinhTuyen.put("/:id", xacThuc, yeuCauQuyen("copy_manage"), boDieuKhien.thayThe);
    boDinhTuyen.delete("/:id", xacThuc, yeuCauQuyen("copy_manage"), boDieuKhien.xoa);
    return boDinhTuyen;
}

export function taoBoDinhTuyenBanSaoTheoSach(moHinh) {
    const boDinhTuyen = Router();
    boDinhTuyen.get("/:id/copies", taoBoDieuKhienBanSaoSach(taoDichVuBanSaoSach(moHinh)).lietKeTheoSach);
    return boDinhTuyen;
}
