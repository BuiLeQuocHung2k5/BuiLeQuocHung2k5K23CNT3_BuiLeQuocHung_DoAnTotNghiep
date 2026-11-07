import { LoiHttp } from "../utils/loi-http.js";
import { taoThongTinPhanTrang } from "../utils/kiem-tra-danh-muc-ban-sao.js";

async function thucHienThaoTacTienPhat(congViec) {
    try { return await congViec(); }
    catch (loi) {
        if (["ER_NO_REFERENCED_ROW", "ER_NO_REFERENCED_ROW_2"].includes(loi.code)) throw new LoiHttp(400, "INVALID_FINE_REFERENCE", "Chi tiết mượn hoặc quy định phạt được tham chiếu không tồn tại.");
        throw loi;
    }
}

export function taoDichVuTienPhat(moHinh) {
    return {
        async lietKe(truyVan) { const ketQua = await moHinh.lietKe(truyVan); return { items: ketQua.items, pagination: taoThongTinPhanTrang(truyVan, ketQua.total) }; },
        async layTheoMa(ma, maChuSoHuu) { const dongDuLieu = await moHinh.layTheoMa(ma, maChuSoHuu); if (!dongDuLieu) throw new LoiHttp(404, "FINE_NOT_FOUND", "Không tìm thấy tiền phạt."); return dongDuLieu; },
        async taoMoi(duLieu) { return thucHienThaoTacTienPhat(() => moHinh.taoMoi(duLieu)); },
        async ghiNhanThanhToan(ma) { return moHinh.ghiNhanThanhToan(ma); },
    };
}
