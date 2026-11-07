import { LoiHttp } from "../utils/loi-http.js";
import { taoThongTinPhanTrang } from "../utils/kiem-tra-danh-muc-ban-sao.js";

export function taoDichVuPhieuMuon(moHinh) {
    return {
        async lietKe(truyVan) { const ketQua = await moHinh.lietKe(truyVan); return { items: ketQua.items, pagination: taoThongTinPhanTrang(truyVan, ketQua.total) }; },
        async layTheoMa(ma, maChuSoHuu) { const ketQua = await moHinh.layTheoMa(ma, maChuSoHuu); if (!ketQua) throw new LoiHttp(404, "BORROW_NOT_FOUND", "Không tìm thấy phiếu mượn."); return ketQua; },
        async taoMoi(duLieu) { return moHinh.taoMoi(duLieu); },
        async traCacBanSao(ma, duLieu) { return moHinh.traCacBanSao(ma, duLieu); },
    };
}
