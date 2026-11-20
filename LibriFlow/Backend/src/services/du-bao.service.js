import { LoiHttp } from "../utils/loi-http.js";
import { taoBoCungCapDoPhu } from "../config/do-phu-du-bao.js";
import { duBaoLuotMuonTheoNgay, dichNgayUtc, laNgayUtcHopLe, SO_NGAY_LICH_SU_DU_BAO } from "../utils/thuat-toan-du-bao.js";

export function taoDichVuDuBao(moHinh, { coverageProvider: boCungCapDoPhu = taoBoCungCapDoPhu() } = {}) {
    return {
        async xemTruoc(ma) {
            const nguoiDung = await moHinh.timNguoiDung(ma);
            if (!nguoiDung) throw new LoiHttp(404, "USER_NOT_FOUND", "Không tìm thấy người dùng.");
            const nguCanh = await moHinh.layNguCanh(), ngayCat = nguCanh.observed_at?.slice(0, 10);
            if (!laNgayUtcHopLe(ngayCat)) throw new LoiHttp(503, "FORECAST_CLOCK_UNAVAILABLE", "Chưa xác định được ngày UTC hợp lệ từ database.");
            const doPhu = await boCungCapDoPhu(nguCanh);
            const cacDong = doPhu?.verified === true && nguoiDung.status === "active" ? await moHinh.demTheoNgay(ma, dichNgayUtc(ngayCat, -SO_NGAY_LICH_SU_DU_BAO), ngayCat) : [];
            return { user_id: String(nguoiDung.user_id), cutoff_date: ngayCat, ...duBaoLuotMuonTheoNgay({ cutoff_date: ngayCat, user_created_at: nguoiDung.created_at, user_status: nguoiDung.status, rows: cacDong, coverage: doPhu }), persisted: false };
        },
        async taoDuBao() {
            throw new LoiHttp(503, "FORECAST_GENERATION_NOT_CONFIGURED", "Chưa có quyền tạo/lưu dự báo được phê duyệt. Chỉ hỗ trợ xem baseline, không ghi kết quả.");
        },
    };
}
