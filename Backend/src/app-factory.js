import { taoTuyenNguoiDung } from './routes/nguoi-dung.routes.js';
import express from "express";
import cors from "cors";
import { taoMoHinhSach } from "./models/sach.model.js";
import { taoBoDinhTuyenSach } from "./routes/sach.routes.js";
import { xuLyKhongTimThay, xuLyLoi } from "./middlewares/xu-ly-loi.js";
import { taoMoHinhXacThuc } from "./models/xac-thuc.model.js";
import { taoDichVuXacThuc } from "./services/xac-thuc.service.js";
import { taoDichVuJwt } from "./utils/jwt.js";
import { taoMiddlewareXacThuc } from "./middlewares/xac-thuc.js";
import { taoBoDinhTuyenXacThuc } from "./routes/xac-thuc.routes.js";
import { taoMoHinhDanhMuc } from "./models/danh-muc.model.js";
import { taoMoHinhBanSaoSach } from "./models/ban-sao-sach.model.js";
import { taoBoDinhTuyenDanhMuc } from "./routes/danh-muc.routes.js";
import { taoBoDinhTuyenBanSaoSach, taoBoDinhTuyenBanSaoTheoSach } from "./routes/ban-sao-sach.routes.js";
import { taoMoHinhPhieuMuon } from "./models/phieu-muon.model.js";
import { taoBoDinhTuyenPhieuMuon } from "./routes/phieu-muon.routes.js";
import { taoMoHinhTienPhat } from "./models/tien-phat.model.js";
import { taoBoDinhTuyenTienPhat } from "./routes/tien-phat.routes.js";
import { taoMoHinhQuaHan } from "./models/qua-han.model.js";
import { taoBoDinhTuyenQuaHan } from "./routes/qua-han.routes.js";
import { taoMoHinhLichSuSuDung } from "./models/lich-su-su-dung.model.js";
import { taoBoDinhTuyenLichSuSuDung } from "./routes/lich-su-su-dung.routes.js";
import { taoMoHinhThongKe } from "./models/thong-ke.model.js";
import { taoBoDinhTuyenThongKe } from "./routes/thong-ke.routes.js";
import { taoMoHinhDuBao } from "./models/du-bao.model.js";
import { taoBoDinhTuyenDuBao } from "./routes/du-bao.routes.js";
import { taoKhoAnhDaiDien } from "./utils/anh-dai-dien.js";

// Không nạp cấu hình DB tại đây; mọi model và truy vấn health dùng kết nối được truyền vào.
// Giữ khóa cấu hình tiêm phụ thuộc; biến sử dụng bên trong được đặt bằng tiếng Việt.
export function dungUngDung({
    database: coSoDuLieu,
    bookModel: moHinhSach = taoMoHinhSach(coSoDuLieu),
    authModel: moHinhXacThuc = taoMoHinhXacThuc(coSoDuLieu),
    tokens: dichVuToken = taoDichVuJwt(),
    categoryModel: moHinhDanhMuc = taoMoHinhDanhMuc(coSoDuLieu),
    bookCopyModel: moHinhBanSaoSach = taoMoHinhBanSaoSach(coSoDuLieu),
    borrowModel: moHinhPhieuMuon = taoMoHinhPhieuMuon(coSoDuLieu),
    fineModel: moHinhTienPhat = taoMoHinhTienPhat(coSoDuLieu),
    overdueModel: moHinhQuaHan = taoMoHinhQuaHan(coSoDuLieu),
    usageHistoryModel: moHinhLichSuSuDung = taoMoHinhLichSuSuDung(coSoDuLieu),
    statisticsModel: moHinhThongKe = taoMoHinhThongKe(coSoDuLieu),
    forecastModel: moHinhDuBao = taoMoHinhDuBao(coSoDuLieu),
    forecastOptions: tuyChonDuBao,
    avatarDirectory: thuMucAvatar,
} = {}) {
    if (!coSoDuLieu || typeof coSoDuLieu.query !== "function") throw new Error("An explicit database dependency is required.");
    const ungDung = express();
    const khoAnh = taoKhoAnhDaiDien(thuMucAvatar);
    const dichVuXacThuc = taoDichVuXacThuc(moHinhXacThuc, dichVuToken, khoAnh);
    const xacThuc = taoMiddlewareXacThuc(dichVuToken, dichVuXacThuc);
    ungDung.use(cors());
    ungDung.use(express.json({ limit: "256kb" }));
    ungDung.get("/api/health", (req, res) => res.status(200).json({ success: true, message: "LibriFlow Backend is running" }));
    ungDung.get("/api/health/db", async (req, res) => {
        try { await coSoDuLieu.query("SELECT 1");res.status(200).json({ success: true, database: "connected" }); }
        catch { res.status(503).json({ success: false, database: "disconnected" }); }
    });
    ungDung.use("/api/admin/users", taoTuyenNguoiDung(coSoDuLieu, xacThuc));
    ungDung.use("/api/auth", taoBoDinhTuyenXacThuc(dichVuXacThuc, xacThuc, khoAnh));
    ungDung.use("/api/usage-history", taoBoDinhTuyenLichSuSuDung(moHinhLichSuSuDung, xacThuc));
    ungDung.use("/api/statistics", taoBoDinhTuyenThongKe(moHinhThongKe, xacThuc));
    ungDung.use("/api/forecasts", taoBoDinhTuyenDuBao(moHinhDuBao, xacThuc, tuyChonDuBao));
    ungDung.use("/api", taoBoDinhTuyenQuaHan(moHinhQuaHan, xacThuc));
    ungDung.use("/api/fines", taoBoDinhTuyenTienPhat(moHinhTienPhat, xacThuc));
    ungDung.use("/api/borrows", taoBoDinhTuyenPhieuMuon(moHinhPhieuMuon, xacThuc));
    ungDung.use("/api/categories", taoBoDinhTuyenDanhMuc(moHinhDanhMuc, xacThuc));
    ungDung.use("/api/book-copies", taoBoDinhTuyenBanSaoSach(moHinhBanSaoSach, xacThuc));
    ungDung.use("/api/books", taoBoDinhTuyenBanSaoTheoSach(moHinhBanSaoSach));
    ungDung.use("/api/books", taoBoDinhTuyenSach(moHinhSach, xacThuc));
    ungDung.use(xuLyKhongTimThay);
    ungDung.use(xuLyLoi);
    return ungDung;
}
