import { Router } from "express";
import { yeuCauQuyen } from "../middlewares/xac-thuc.js";
import { taoDichVuPhieuMuon } from "../services/phieu-muon.service.js";
import { taoBoDieuKhienPhieuMuon } from "../controllers/phieu-muon.controller.js";

export function taoBoDinhTuyenPhieuMuon(moHinh, xacThuc) {
    const boDinhTuyen = Router();
    const boDieuKhien = taoBoDieuKhienPhieuMuon(taoDichVuPhieuMuon(moHinh));
    boDinhTuyen.use(xacThuc);
    boDinhTuyen.get("/", boDieuKhien.lietKe);
    boDinhTuyen.get("/:id", boDieuKhien.layTheoMa);
    boDinhTuyen.post("/", yeuCauQuyen("borrow_manage"), boDieuKhien.taoMoi);
    boDinhTuyen.post("/:id/return", yeuCauQuyen("return_process"), boDieuKhien.traCacBanSao);
    return boDinhTuyen;
}
