import { kiemTraMa, kiemTraTruyVanSach } from "./kiem-tra-sach.js";
import { baoDuLieuKhongHopLe, kiemTraGiaTriEnum, CAC_TINH_TRANG } from "./kiem-tra-danh-muc-ban-sao.js";
import { LoiHttp } from "./loi-http.js";

export const CAC_TRANG_THAI_PHIEU_MUON = ["borrowed", "partially_returned", "returned", "overdue", "cancelled"];
export const SO_BAN_SAO_TOI_DA_MOI_PHIEU = 100;

function kiemTraDoiTuong(giaTri, cacTruong) {
    if (!giaTri || typeof giaTri !== "object" || Array.isArray(giaTri)) baoDuLieuKhongHopLe("body", "Phải là JSON object.");
    for (const tenTruong of Object.keys(giaTri)) if (!cacTruong.includes(tenTruong)) baoDuLieuKhongHopLe(tenTruong, "Trường không được phép gửi.");
}

function kiemTraDanhSachMa(cacGiaTri) {
    if (!Array.isArray(cacGiaTri) || cacGiaTri.length < 1 || cacGiaTri.length > SO_BAN_SAO_TOI_DA_MOI_PHIEU) baoDuLieuKhongHopLe("copy_ids", "Cần từ 1 đến 100 bản sao.");
    const ketQua = cacGiaTri.map(giaTri => kiemTraMa(giaTri, "copy_id"));
    if (new Set(ketQua).size !== ketQua.length) baoDuLieuKhongHopLe("copy_ids", "Không được trùng bản sao.");
    return ketQua;
}

export function kiemTraPhieuMuon(noiDung, thoiGianHienTai = Date.now()) {
    kiemTraDoiTuong(noiDung, ["user_id", "copy_ids", "due_date", "note"]);
    const hanTra = noiDung.due_date;
    if (typeof hanTra !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(hanTra)) baoDuLieuKhongHopLe("due_date", "Dùng UTC dạng YYYY-MM-DDTHH:mm:ssZ.");
    const mocThoiGian = Date.parse(hanTra);
    if (!Number.isFinite(mocThoiGian) || new Date(mocThoiGian).toISOString() !== hanTra.replace("Z", ".000Z") || Number(hanTra.slice(0, 4)) < 1000 || mocThoiGian <= thoiGianHienTai) baoDuLieuKhongHopLe("due_date", "Ngày hẹn trả phải tồn tại và ở tương lai.");
    if (noiDung.note !== undefined && noiDung.note !== null && (typeof noiDung.note !== "string" || !noiDung.note.isWellFormed() || Buffer.byteLength(noiDung.note, "utf8") > 65535)) baoDuLieuKhongHopLe("note", "Tối đa 65535 byte UTF-8.");
    return { user_id: kiemTraMa(noiDung.user_id, "user_id"), copy_ids: kiemTraDanhSachMa(noiDung.copy_ids), due_date: hanTra.replace("T", " ").slice(0, 19), note: noiDung.note ?? null };
}

export function kiemTraTraSach(noiDung) {
    kiemTraDoiTuong(noiDung, ["items", "return_all", "condition_after"]);
    if (noiDung.return_all === true) {
        if (noiDung.items !== undefined) baoDuLieuKhongHopLe("items", "Không kết hợp items với return_all.");
        return { return_all: true, condition_after: kiemTraGiaTriEnum(noiDung.condition_after, "condition_after", CAC_TINH_TRANG) };
    }
    if (noiDung.return_all !== undefined || noiDung.condition_after !== undefined) baoDuLieuKhongHopLe("return_all", "Dùng return_all:true cùng condition_after hoặc danh sách items.");
    if (!Array.isArray(noiDung.items) || noiDung.items.some(muc => !muc || typeof muc !== "object" || Array.isArray(muc))) baoDuLieuKhongHopLe("items", "Cần danh sách bản sao và tình trạng sau trả.");
    kiemTraDanhSachMa(noiDung.items.map(muc => muc.copy_id));
    return { items: noiDung.items.map(muc => {
        kiemTraDoiTuong(muc, ["copy_id", "condition_after"]);
        return { copy_id: kiemTraMa(muc.copy_id, "copy_id"), condition_after: kiemTraGiaTriEnum(muc.condition_after, "condition_after", CAC_TINH_TRANG) };
    }) };
}

export function xacDinhPhamViDocPhieuMuon(nguoiDungXacThuc) {
    if (nguoiDungXacThuc.permissions.includes("borrow_manage")) return null;
    if (nguoiDungXacThuc.roles.includes("reader")) return nguoiDungXacThuc.user_id;
    throw new LoiHttp(403, "FORBIDDEN", "Không có quyền xem phiếu mượn.");
}

export function kiemTraTruyVanPhieuMuon(truyVan, maChuSoHuu) {
    for (const tenTruong of Object.keys(truyVan)) if (!["page", "limit", "status", "user_id"].includes(tenTruong)) baoDuLieuKhongHopLe(tenTruong, "Tham số không được hỗ trợ.");
    if (maChuSoHuu !== null && truyVan.user_id !== undefined) throw new LoiHttp(403, "FORBIDDEN", "Reader không được chọn người mượn qua query.");
    const ketQua = kiemTraTruyVanSach(Object.fromEntries(Object.entries(truyVan).filter(([khoa]) => ["page", "limit"].includes(khoa))));
    if (maChuSoHuu !== null) ketQua.user_id = maChuSoHuu;
    else if (truyVan.user_id !== undefined) ketQua.user_id = kiemTraMa(truyVan.user_id, "user_id");
    if (truyVan.status !== undefined) ketQua.status = kiemTraGiaTriEnum(truyVan.status, "status", CAC_TRANG_THAI_PHIEU_MUON);
    return ketQua;
}
