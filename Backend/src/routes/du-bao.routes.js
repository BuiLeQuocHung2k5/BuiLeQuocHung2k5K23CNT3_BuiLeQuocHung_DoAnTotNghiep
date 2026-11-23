import { LoiHttp } from '../utils/loi-http.js';
import { kiemTraMa } from '../utils/kiem-tra-sach.js';
import { laNgayUtcHopLe } from '../utils/thuat-toan-du-bao.js';
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
    const quyen = yeuCauQuyen("forecast_view");
    boDinhTuyen.get("/lookup", quyen, async (req,res) => {
        const search = req.query.search;
        if (typeof search !== 'string' || !search.trim() || search.length > 100) throw new LoiHttp(400,'INVALID_SEARCH','Nhập từ khóa từ 1 đến 100 ký tự.');
        res.json({success:true,data:await moHinh.traCuu(search.trim())});
    });
    async function lichSu(req,res) {
        const ma = req.params.id ? kiemTraMa(req.params.id) : req.auth.user_id;
        if (req.params.ngay && !laNgayUtcHopLe(req.params.ngay)) throw new LoiHttp(400,'INVALID_DATE','Ngày không hợp lệ.');
        res.json({ success:true, data:await moHinh.lichSu(ma,req.params.ngay) });
    }
    for (const path of ['/history','/history/:ngay']) {
        boDinhTuyen.get('/me'+path,lichSu);
        boDinhTuyen.get('/users/:id'+path,quyen,lichSu);
    }
    boDinhTuyen.post("/users/:id/generate", quyen, yeuCauQuyen("user_manage"), boDieuKhien.taoDuBao);
    return boDinhTuyen;
}
