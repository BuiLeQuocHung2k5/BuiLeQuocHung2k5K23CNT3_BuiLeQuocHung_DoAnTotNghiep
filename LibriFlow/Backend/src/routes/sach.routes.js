import { Router } from "express";
import { taoBoDieuKhienSach } from "../controllers/sach.controller.js";
import { taoDichVuSach } from "../services/sach.service.js";
import { yeuCauQuyen } from "../middlewares/xac-thuc.js";

export function taoBoDinhTuyenSach(moHinh, xacThuc) {
    const boDinhTuyen = Router();
    const boDieuKhien = taoBoDieuKhienSach(taoDichVuSach(moHinh));
    // Express 5 chuyển lỗi từ hàm async sang middleware xử lý lỗi.
    boDinhTuyen.get("/", boDieuKhien.lietKe);
    boDinhTuyen.get("/:id", boDieuKhien.layTheoMa);
    boDinhTuyen.post("/", xacThuc, yeuCauQuyen("book_create"), boDieuKhien.taoMoi);
    boDinhTuyen.put("/:id", xacThuc, yeuCauQuyen("book_update"), boDieuKhien.thayThe);
    boDinhTuyen.delete("/:id", xacThuc, yeuCauQuyen("book_delete"), boDieuKhien.xoa);
    return boDinhTuyen;
}
