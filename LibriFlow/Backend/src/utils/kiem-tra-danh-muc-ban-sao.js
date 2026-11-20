import { LoiHttp } from "./loi-http.js";
import { kiemTraMa, kiemTraTruyVanSach } from "./kiem-tra-sach.js";

export const CAC_TINH_TRANG = ["good", "damaged"];
export const CAC_TRANG_THAI_SAN_SANG = ["available", "borrowed", "lost", "maintenance"];

export function baoDuLieuKhongHopLe(tenTruong, thongBao) {
    throw new LoiHttp(400, "VALIDATION_ERROR", "Dữ liệu không hợp lệ.", [{ field: tenTruong, message: thongBao }]);
}

export function kiemTraChuoiGioiHan(giaTri, tenTruong, toiDa, batBuoc = false) {
    if (giaTri === undefined || giaTri === null) {
        if (batBuoc) baoDuLieuKhongHopLe(tenTruong, "Trường bắt buộc.");
        return null;
    }
    if (typeof giaTri !== "string" || !giaTri.isWellFormed()) baoDuLieuKhongHopLe(tenTruong, "Phải là chuỗi Unicode hợp lệ.");
    giaTri = giaTri.trim();
    if ((batBuoc && !giaTri) || [...giaTri].length > toiDa) baoDuLieuKhongHopLe(tenTruong, `Độ dài ${batBuoc ? "1–" : "tối đa "}${toiDa} ký tự.`);
    return giaTri;
}

function kiemTraVanBan(giaTri, tenTruong) {
    if (giaTri === undefined || giaTri === null) return null;
    if (typeof giaTri !== "string" || !giaTri.isWellFormed() || Buffer.byteLength(giaTri, "utf8") > 65535) baoDuLieuKhongHopLe(tenTruong, "Tối đa 65535 byte UTF-8, phải là chuỗi Unicode hợp lệ.");
    return giaTri;
}

function kiemTraDoiTuong(noiDung, cacTruongChoPhep) {
    if (!noiDung || typeof noiDung !== "object" || Array.isArray(noiDung)) baoDuLieuKhongHopLe("body", "Phải là JSON object.");
    for (const khoa of Object.keys(noiDung)) if (!cacTruongChoPhep.includes(khoa)) baoDuLieuKhongHopLe(khoa, "Trường không được phép ghi.");
}

export function kiemTraGiaTriEnum(giaTri, tenTruong, cacGiaTri) {
    if (typeof giaTri !== "string" || !cacGiaTri.includes(giaTri)) baoDuLieuKhongHopLe(tenTruong, `Chỉ nhận: ${cacGiaTri.join(", ")}.`);
    return giaTri;
}

export function kiemTraDanhMuc(noiDung) {
    kiemTraDoiTuong(noiDung, ["name", "description"]);
    return { name: kiemTraChuoiGioiHan(noiDung.name, "name", 100, true), description: kiemTraVanBan(noiDung.description, "description") };
}

export function kiemTraBanSaoSach(noiDung, laCapNhat = false) {
    kiemTraDoiTuong(noiDung, ["book_id", "isbn", "barcode", "condition_status", "availability_status", "note"]);
    const tinhTrang = kiemTraGiaTriEnum(noiDung.condition_status === undefined && !laCapNhat ? "good" : noiDung.condition_status, "condition_status", CAC_TINH_TRANG);
    const trangThai = kiemTraGiaTriEnum(noiDung.availability_status === undefined && !laCapNhat ? "available" : noiDung.availability_status, "availability_status", CAC_TRANG_THAI_SAN_SANG);
    if (!["available", "maintenance"].includes(trangThai)) throw new LoiHttp(409, "CIRCULATION_STATE_MANAGED", "Trạng thái borrowed/lost phải được xử lý qua module mượn/trả.");
    const maIsbn = kiemTraChuoiGioiHan(noiDung.isbn, "isbn", 20);
    return { book_id: kiemTraMa(noiDung.book_id, "book_id"), isbn: maIsbn, barcode: kiemTraChuoiGioiHan(noiDung.barcode, "barcode", 50, true), condition_status: tinhTrang, availability_status: trangThai, note: kiemTraVanBan(noiDung.note, "note") };
}

export function kiemTraTruyVanBanSaoSach(truyVan, maSachTrongDuongDan) {
    const cacTruongChoPhep = ["page", "limit", "search", "condition_status", "availability_status", ...(maSachTrongDuongDan === undefined ? ["book_id"] : [])];
    for (const khoa of Object.keys(truyVan)) if (!cacTruongChoPhep.includes(khoa)) baoDuLieuKhongHopLe(khoa, "Tham số không được hỗ trợ.");
    const thamSoCoBan = Object.fromEntries(Object.entries(truyVan).filter(([khoa]) => ["page", "limit", "search"].includes(khoa)));
    const ketQua = kiemTraTruyVanSach(thamSoCoBan);
    if (maSachTrongDuongDan !== undefined || truyVan.book_id !== undefined) ketQua.book_id = kiemTraMa(maSachTrongDuongDan ?? truyVan.book_id, "book_id");
    if (truyVan.condition_status !== undefined) ketQua.condition_status = kiemTraGiaTriEnum(truyVan.condition_status, "condition_status", CAC_TINH_TRANG);
    if (truyVan.availability_status !== undefined) ketQua.availability_status = kiemTraGiaTriEnum(truyVan.availability_status, "availability_status", CAC_TRANG_THAI_SAN_SANG);
    return ketQua;
}

export function docJsonYeuCau(req, hamKiemTra) {
    if (!req.is("application/json")) throw new LoiHttp(415, "UNSUPPORTED_MEDIA_TYPE", "Hãy gửi Content-Type: application/json.");
    return hamKiemTra(req.body);
}

export function taoThongTinPhanTrang(truyVan, tongSo) {
    return { page: truyVan.page, limit: truyVan.limit, total: tongSo, totalPages: Math.ceil(tongSo / truyVan.limit) };
}
