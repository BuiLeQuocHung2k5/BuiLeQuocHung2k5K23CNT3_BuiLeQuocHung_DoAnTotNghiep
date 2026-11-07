import { LoiHttp } from "../utils/loi-http.js";
import { thucHienThaoTacDanhMuc } from "../utils/truy-van-danh-muc.js";
import { taoThongTinPhanTrang } from "../utils/kiem-tra-danh-muc-ban-sao.js";

export function taoDichVuDanhMuc(moHinh) {
    function yeuCauTonTai(giaTri) {
        if (!giaTri) throw new LoiHttp(404, "CATEGORY_NOT_FOUND", "Không tìm thấy danh mục.");
        return giaTri;
    }
    const lenhGhi = congViec => thucHienThaoTacDanhMuc(congViec, "CATEGORY");
    return {
        async lietKe(truyVan) { const { items: cacMuc, total: tongSo } = await moHinh.lietKe(truyVan); return { items: cacMuc, pagination: taoThongTinPhanTrang(truyVan, tongSo) }; },
        async layTheoMa(ma) { return yeuCauTonTai(await moHinh.layTheoMa(ma)); },
        async taoMoi(duLieu) { return lenhGhi(() => moHinh.taoMoi(duLieu)); },
        async thayThe(ma, duLieu) { return yeuCauTonTai(await lenhGhi(() => moHinh.thayThe(ma, duLieu))); },
        async xoa(ma) { yeuCauTonTai(await lenhGhi(() => moHinh.xoa(ma))); },
    };
}
