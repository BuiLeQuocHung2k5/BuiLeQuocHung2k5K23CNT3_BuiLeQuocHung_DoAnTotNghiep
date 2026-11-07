import { kiemTraMa, kiemTraTruyVanSach } from "./kiem-tra-sach.js";
import { baoDuLieuKhongHopLe, kiemTraGiaTriEnum, kiemTraChuoiGioiHan } from "./kiem-tra-danh-muc-ban-sao.js";
import { LoiHttp } from "./loi-http.js";

export const CAC_LOAI_TIEN_PHAT = ["late", "damage", "lost", "other"];
export const CAC_TRANG_THAI_THANH_TOAN = ["unpaid", "paid", "waived"];

function kiemTraDoiTuong(noiDung, cacTruong) {
    if (!noiDung || typeof noiDung !== "object" || Array.isArray(noiDung)) baoDuLieuKhongHopLe("body", "Phải là JSON object.");
    for (const khoa of Object.keys(noiDung)) if (!cacTruong.includes(khoa)) baoDuLieuKhongHopLe(khoa, "Trường không được phép gửi.");
}

export function kiemTraTienPhat(noiDung) {
    kiemTraDoiTuong(noiDung, ["borrow_detail_id", "fine_rule_id", "reason"]);
    return { borrow_detail_id: kiemTraMa(noiDung.borrow_detail_id, "borrow_detail_id"), fine_rule_id: kiemTraMa(noiDung.fine_rule_id, "fine_rule_id"), reason: kiemTraChuoiGioiHan(noiDung.reason, "reason", 255) };
}

export function kiemTraThanhToan(noiDung) {
    kiemTraDoiTuong(noiDung, ["payment_status"]);
    return { payment_status: kiemTraGiaTriEnum(noiDung.payment_status, "payment_status", ["paid"]) };
}

export function xacDinhPhamViDocTienPhat(nguoiDungXacThuc, quyen) {
    if (nguoiDungXacThuc.permissions.includes(quyen)) return null;
    if (nguoiDungXacThuc.roles.includes("reader")) return nguoiDungXacThuc.user_id;
    throw new LoiHttp(403, "FORBIDDEN", "Không có quyền xem dữ liệu này.");
}

export function kiemTraTruyVanTienPhat(truyVan, maChuSoHuu, laTruyVanTienPhat = false) {
    const cacTruong = ["page", "limit", "user_id", "borrow_id", ...(laTruyVanTienPhat ? ["borrow_detail_id", "fine_type", "payment_status"] : [])];
    for (const khoa of Object.keys(truyVan)) if (!cacTruong.includes(khoa)) baoDuLieuKhongHopLe(khoa, "Tham số không được hỗ trợ.");
    if (maChuSoHuu !== null && truyVan.user_id !== undefined) throw new LoiHttp(403, "FORBIDDEN", "Reader không được chọn người dùng qua query.");
    const ketQua = kiemTraTruyVanSach(Object.fromEntries(Object.entries(truyVan).filter(([khoa]) => ["page", "limit"].includes(khoa))));
    if (maChuSoHuu !== null) ketQua.user_id = maChuSoHuu;
    else if (truyVan.user_id !== undefined) ketQua.user_id = kiemTraMa(truyVan.user_id, "user_id");
    for (const khoa of ["borrow_id", ...(laTruyVanTienPhat ? ["borrow_detail_id"] : [])]) if (truyVan[khoa] !== undefined) ketQua[khoa] = kiemTraMa(truyVan[khoa], khoa);
    if (laTruyVanTienPhat && truyVan.fine_type !== undefined) ketQua.fine_type = kiemTraGiaTriEnum(truyVan.fine_type, "fine_type", CAC_LOAI_TIEN_PHAT);
    if (laTruyVanTienPhat && truyVan.payment_status !== undefined) ketQua.payment_status = kiemTraGiaTriEnum(truyVan.payment_status, "payment_status", CAC_TRANG_THAI_THANH_TOAN);
    return ketQua;
}
