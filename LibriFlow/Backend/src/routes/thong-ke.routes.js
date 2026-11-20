import { Router } from "express";
import { yeuCauQuyen } from "../middlewares/xac-thuc.js";
import { taoDichVuThongKe } from "../services/thong-ke.service.js";
import { taoBoDieuKhienThongKe } from "../controllers/thong-ke.controller.js";

export function taoBoDinhTuyenThongKe(moHinh, xacThuc) {
    const boDinhTuyen = Router(), boDieuKhien = taoBoDieuKhienThongKe(taoDichVuThongKe(moHinh));
    boDinhTuyen.use(xacThuc, yeuCauQuyen("report_view"));
    boDinhTuyen.use((req, res, next) => { res.set("Cache-Control", "no-store"); next(); });
    boDinhTuyen.get("/overview", boDieuKhien.layTongQuan);
    boDinhTuyen.get("/borrows", boDieuKhien.thongKePhieuMuon);
    boDinhTuyen.get("/users", boDieuKhien.thongKeNguoiDung);
    return boDinhTuyen;
}
