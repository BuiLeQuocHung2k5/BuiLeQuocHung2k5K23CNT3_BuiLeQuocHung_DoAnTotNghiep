import { Router } from "express";
import { taoBoDieuKhienDanhMuc } from "../controllers/danh-muc.controller.js";
import { taoDichVuDanhMuc } from "../services/danh-muc.service.js";
import { yeuCauQuyen } from "../middlewares/xac-thuc.js";

export function taoBoDinhTuyenDanhMuc(moHinh, xacThuc) {
    const boDinhTuyen = Router();
    const boDieuKhien = taoBoDieuKhienDanhMuc(taoDichVuDanhMuc(moHinh));
    boDinhTuyen.get("/", boDieuKhien.lietKe);
    boDinhTuyen.get("/:id", boDieuKhien.layTheoMa);
    boDinhTuyen.post("/", xacThuc, yeuCauQuyen("category_manage"), boDieuKhien.taoMoi);
    boDinhTuyen.put("/:id", xacThuc, yeuCauQuyen("category_manage"), boDieuKhien.thayThe);
    boDinhTuyen.delete("/:id", xacThuc, yeuCauQuyen("category_manage"), boDieuKhien.xoa);
    return boDinhTuyen;
}
