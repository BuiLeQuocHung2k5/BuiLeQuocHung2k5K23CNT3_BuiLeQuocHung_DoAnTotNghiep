import { LoiHttp } from "./loi-http.js";

function baoXungDot(maLoi, thongBao) { throw new LoiHttp(409, maLoi, thongBao); }
const GIA_TRI_PHAN_TRAM_TOI_DA = 999999999999n; // Giới hạn DECIMAL(12,2), tính chính xác; không đặt mức tiền phạt trong code.

export function tinhTienPhat(quyDinh, chiTiet, thongTinPhieu) {
    if (Number(quyDinh.is_active) !== 1) baoXungDot("FINE_RULE_INACTIVE", "Quy định phạt không hoạt động.");
    if (!["late", "damage"].includes(quyDinh.rule_type) || !["fixed", "per_day"].includes(quyDinh.unit) || quyDinh.rule_type === "damage" && quyDinh.unit !== "fixed") {
        baoXungDot("FINE_RULE_UNSUPPORTED", "Chỉ hỗ trợ phạt trễ fixed/per_day và phạt hỏng fixed; nghiệp vụ khác cần được xác định riêng.");
    }
    if (thongTinPhieu.status !== "returned" && thongTinPhieu.status !== "partially_returned") baoXungDot("FINE_REQUIRES_RETURN", "Chỉ chốt phạt cho chi tiết đã trả trên phiếu trả toàn bộ hoặc một phần.");
    if (chiTiet.status !== "returned" || chiTiet.returned_at === null) baoXungDot("FINE_REQUIRES_RETURN", "Cần hoàn tất trả bản sao trước khi chốt phạt.");
    if (Number(chiTiet.valid_timeline) !== 1) baoXungDot("FINE_STATE_CONFLICT", "Mốc thời gian mượn/trả không nhất quán; cần kiểm tra riêng.");
    let heSoNhan = 1n;
    if (quyDinh.rule_type === "late") {
        if (typeof chiTiet.late_seconds !== "string" || !/^\d+$/.test(chiTiet.late_seconds) || BigInt(chiTiet.late_seconds) === 0n) baoXungDot("NOT_LATE", "Chi tiết không có thời gian trả trễ hợp lệ.");
        if (quyDinh.unit === "per_day") heSoNhan = (BigInt(chiTiet.late_seconds) + 86399n) / 86400n;
    } else if (chiTiet.condition_before !== "good" || chiTiet.condition_after !== "damaged") {
        baoXungDot("DAMAGE_NOT_CONFIRMED", "Chỉ phạt hỏng khi tình trạng trước mượn good và sau trả damaged.");
    }
    const soTien = String(quyDinh.amount);
    if (!/^\d{1,10}(\.\d{1,2})?$/.test(soTien)) baoXungDot("INVALID_FINE_RULE_AMOUNT", "Mức tiền trong quy định không hợp lệ.");
    const [phanNguyen, phanLe = ""] = soTien.split(".");
    const phanTramGiaTri = (BigInt(phanNguyen) * 100n + BigInt(phanLe.padEnd(2, "0"))) * heSoNhan;
    if (phanTramGiaTri > GIA_TRI_PHAN_TRAM_TOI_DA) baoXungDot("FINE_AMOUNT_OUT_OF_RANGE", "Số tiền tính được vượt giới hạn lưu trữ.");
    return `${phanTramGiaTri / 100n}.${String(phanTramGiaTri % 100n).padStart(2, "0")}`;
}
