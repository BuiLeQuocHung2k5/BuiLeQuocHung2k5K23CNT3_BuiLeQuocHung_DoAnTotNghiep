import { Router } from "express";
import { taoDichVuQuaHan } from "../services/qua-han.service.js";
import { taoBoDieuKhienQuaHan } from "../controllers/qua-han.controller.js";

export function taoBoDinhTuyenQuaHan(moHinh, xacThuc) {
    const boDinhTuyen = Router(), boDieuKhien = taoBoDieuKhienQuaHan(taoDichVuQuaHan(moHinh));
    boDinhTuyen.get("/overdues", xacThuc, boDieuKhien.lietKe);
    boDinhTuyen.get("/borrows/:id/overdue", xacThuc, boDieuKhien.layTheoPhieuMuon);
    return boDinhTuyen;
}
