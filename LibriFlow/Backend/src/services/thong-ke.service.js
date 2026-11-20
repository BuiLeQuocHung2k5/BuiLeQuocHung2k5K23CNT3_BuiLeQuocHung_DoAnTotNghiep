import { taoThongTinPhanTrang } from "../utils/kiem-tra-danh-muc-ban-sao.js";

export function taoDichVuThongKe(moHinh) {
    return {
        async layTongQuan(truyVan) { return moHinh.layTongQuan(truyVan); },
        async thongKePhieuMuon(truyVan) { return moHinh.thongKePhieuMuon(truyVan); },
        async thongKeNguoiDung(truyVan) { const ketQua = await moHinh.thongKeNguoiDung(truyVan); return { items: ketQua.items, pagination: taoThongTinPhanTrang(truyVan, ketQua.total) }; },
    };
}
