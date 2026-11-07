import { LoiHttp } from "../utils/loi-http.js";
import { thucHienThaoTacDanhMuc } from "../utils/truy-van-danh-muc.js";
import { taoThongTinPhanTrang } from "../utils/kiem-tra-danh-muc-ban-sao.js";

export function taoDichVuBanSaoSach(moHinh) {
    function yeuCauTonTai(giaTri) {
        if (!giaTri) throw new LoiHttp(404, "COPY_NOT_FOUND", "Không tìm thấy bản sao sách.");
        return giaTri;
    }
    function kiemTraTrangThaiNghiepVu(duLieu) {
        if (!["available", "maintenance"].includes(duLieu.availability_status)) throw new LoiHttp(409, "CIRCULATION_STATE_MANAGED", "Trạng thái borrowed/lost phải do module mượn/trả xử lý.");
    }
    const lenhGhi = congViec => thucHienThaoTacDanhMuc(congViec, "COPY");
    return {
        async lietKe(truyVan, laDuongDanLong = false) {
            if (laDuongDanLong && !await moHinh.sachTonTai(truyVan.book_id)) throw new LoiHttp(404, "BOOK_NOT_FOUND", "Không tìm thấy sách.");
            const { items: cacMuc, total: tongSo } = await moHinh.lietKe(truyVan);
            return { items: cacMuc, pagination: taoThongTinPhanTrang(truyVan, tongSo) };
        },
        async layTheoMa(ma) { return yeuCauTonTai(await moHinh.layTheoMa(ma)); },
        async taoMoi(duLieu) { kiemTraTrangThaiNghiepVu(duLieu); return lenhGhi(() => moHinh.taoMoi(duLieu)); },
        async thayThe(ma, duLieu) { kiemTraTrangThaiNghiepVu(duLieu); return yeuCauTonTai(await lenhGhi(() => moHinh.thayThe(ma, duLieu))); },
        async xoa(ma) { yeuCauTonTai(await lenhGhi(() => moHinh.xoa(ma))); },
    };
}
