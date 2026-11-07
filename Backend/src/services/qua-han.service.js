import { LoiHttp } from "../utils/loi-http.js";
import { taoThongTinPhanTrang } from "../utils/kiem-tra-danh-muc-ban-sao.js";

export function taoDichVuQuaHan(moHinh) {
    return {
        async lietKe(truyVan) { const ketQua = await moHinh.lietKe(truyVan); return { ...ketQua, pagination: taoThongTinPhanTrang(truyVan, ketQua.total) }; },
        async layTheoPhieuMuon(ma, maChuSoHuu) { const dongDuLieu = await moHinh.layTheoPhieuMuon(ma, maChuSoHuu); if (!dongDuLieu) throw new LoiHttp(404, "BORROW_NOT_FOUND", "Không tìm thấy phiếu mượn."); return dongDuLieu; },
    };
}
