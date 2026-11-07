import { kiemTraMa, kiemTraTruyVanSach } from "./kiem-tra-sach.js";
import { baoDuLieuKhongHopLe, kiemTraGiaTriEnum } from "./kiem-tra-danh-muc-ban-sao.js";
import { LoiHttp } from "./loi-http.js";

export const CAC_SU_KIEN_SU_DUNG = ["login", "borrow", "return"];
const SO_MILI_GIAY_MOI_NGAY = 86400000;

function kiemTraNgay(giaTri, tenTruong) {
    if (typeof giaTri !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(giaTri) || giaTri < "1000-01-01" || giaTri > "9999-12-30") baoDuLieuKhongHopLe(tenTruong, "Dùng ngày UTC YYYY-MM-DD trong phạm vi 1000-01-01 đến 9999-12-30.");
    const miliGiay = Date.parse(`${giaTri}T00:00:00Z`);
    if (!Number.isFinite(miliGiay) || new Date(miliGiay).toISOString().slice(0, 10) !== giaTri) baoDuLieuKhongHopLe(tenTruong, "Ngày không tồn tại.");
    return miliGiay;
}

export function taoKhoangNgay(truyVan, thoiGianHienTai = Date.now()) {
    const homNay = new Date(thoiGianHienTai).toISOString().slice(0, 10);
    const ketThuc = truyVan.end_date ?? homNay, mocKetThuc = kiemTraNgay(ketThuc, "end_date");
    const batDau = truyVan.start_date ?? new Date(mocKetThuc - 29 * SO_MILI_GIAY_MOI_NGAY).toISOString().slice(0, 10), mocBatDau = kiemTraNgay(batDau, "start_date");
    const soNgay = (mocKetThuc - mocBatDau) / SO_MILI_GIAY_MOI_NGAY + 1;
    if (soNgay < 1 || soNgay > 366) baoDuLieuKhongHopLe("start_date", "Khoảng ngày phải tăng dần và không vượt 366 ngày (tính cả hai đầu).");
    return { start_date: batDau, end_date: ketThuc, from: `${batDau} 00:00:00`, until: `${new Date(mocKetThuc + SO_MILI_GIAY_MOI_NGAY).toISOString().slice(0, 10)} 00:00:00`, days: soNgay };
}

function kiemTraTruongChoPhep(truyVan, cacTruong) { for (const khoa of Object.keys(truyVan)) if (!cacTruong.includes(khoa)) baoDuLieuKhongHopLe(khoa, "Tham số không được hỗ trợ."); }
function kiemTraPhanTrang(truyVan) { return kiemTraTruyVanSach(Object.fromEntries(Object.entries(truyVan).filter(([khoa]) => ["page", "limit"].includes(khoa)))); }

export function xacDinhPhamViDocLichSu(nguoiDungXacThuc, duLieuCuaToi = false) {
    if (duLieuCuaToi) return nguoiDungXacThuc.user_id;
    if (nguoiDungXacThuc.permissions.includes("report_view")) return null;
    if (nguoiDungXacThuc.roles.includes("reader")) return nguoiDungXacThuc.user_id;
    throw new LoiHttp(403, "FORBIDDEN", "Không có quyền xem lịch sử sử dụng.");
}

export function kiemTraTruyVanLichSu(truyVan, maChuSoHuu) {
    kiemTraTruongChoPhep(truyVan, ["page", "limit", "start_date", "end_date", "action_type", "user_id"]);
    if (maChuSoHuu !== null && truyVan.user_id !== undefined) throw new LoiHttp(403, "FORBIDDEN", "Không được chọn người dùng khi xem lịch sử cá nhân.");
    const ketQua = { ...kiemTraPhanTrang(truyVan), ...taoKhoangNgay(truyVan) };
    if (maChuSoHuu !== null) ketQua.user_id = maChuSoHuu;
    else if (truyVan.user_id !== undefined) ketQua.user_id = kiemTraMa(truyVan.user_id, "user_id");
    if (truyVan.action_type !== undefined) ketQua.action_type = kiemTraGiaTriEnum(truyVan.action_type, "action_type", CAC_SU_KIEN_SU_DUNG);
    return ketQua;
}

export function kiemTraTruyVanThongKe(truyVan, loai) {
    kiemTraTruongChoPhep(truyVan, ["start_date", "end_date", ...(loai === "borrows" ? ["group_by", "user_id"] : []), ...(loai === "users" ? ["page", "limit", "user_id"] : [])]);
    const ketQua = taoKhoangNgay(truyVan);
    if (loai === "borrows") ketQua.group_by = kiemTraGiaTriEnum(truyVan.group_by ?? "day", "group_by", ["day", "week", "month"]);
    if (loai === "users") Object.assign(ketQua, kiemTraPhanTrang(truyVan));
    if (truyVan.user_id !== undefined) ketQua.user_id = kiemTraMa(truyVan.user_id, "user_id");
    return ketQua;
}

export function kiemTraSuKienSuDung(suKien) {
    if (!suKien || typeof suKien !== "object" || Array.isArray(suKien)) baoDuLieuKhongHopLe("event", "Cần sự kiện nội bộ hợp lệ.");
    kiemTraTruongChoPhep(suKien, ["user_id", "copy_id", "action_type", "borrow_id"]);
    const thaoTac = kiemTraGiaTriEnum(suKien.action_type, "action_type", CAC_SU_KIEN_SU_DUNG), nguoiDung = kiemTraMa(suKien.user_id, "user_id");
    if (thaoTac === "login") {
        if (suKien.copy_id != null || suKien.borrow_id !== undefined) baoDuLieuKhongHopLe("event", "Login không gắn bản sao hoặc phiếu mượn.");
        return { user_id: nguoiDung, copy_id: null, action_type: thaoTac, details: JSON.stringify({ source: "libriflow-api", version: 1 }) };
    }
    return { user_id: nguoiDung, copy_id: kiemTraMa(suKien.copy_id, "copy_id"), action_type: thaoTac, details: JSON.stringify({ source: "libriflow-api", version: 1, borrow_id: kiemTraMa(suKien.borrow_id, "borrow_id") }) };
}
