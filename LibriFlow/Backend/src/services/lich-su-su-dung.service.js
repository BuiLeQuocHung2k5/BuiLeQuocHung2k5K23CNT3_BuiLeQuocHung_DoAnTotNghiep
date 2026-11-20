import { kiemTraSuKienSuDung } from "../utils/kiem-tra-thong-ke.js";
import { taoThongTinPhanTrang } from "../utils/kiem-tra-danh-muc-ban-sao.js";

export function taoDichVuLichSuSuDung(moHinh) {
    return {
        async ghiNhan(suKien, ketNoi) { await moHinh.ghiNhan(kiemTraSuKienSuDung(suKien), ketNoi); },
        async lietKe(truyVan) { const ketQua = await moHinh.lietKe(truyVan); return { items: ketQua.items, pagination: taoThongTinPhanTrang(truyVan, ketQua.total) }; },
    };
}
