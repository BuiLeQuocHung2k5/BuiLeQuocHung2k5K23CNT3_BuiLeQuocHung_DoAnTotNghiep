import { HttpError } from "./http-error.js";

function conflict(code, message) { throw new HttpError(409, code, message); }
const maxCents = 999999999999n; // DECIMAL(12,2), exact arithmetic; no monetary rate in code.

export function calculateFine(rule, detail, header) {
    if (Number(rule.is_active) !== 1) conflict("FINE_RULE_INACTIVE", "Quy định phạt không hoạt động.");
    if (!["late", "damage"].includes(rule.rule_type) || !["fixed", "per_day"].includes(rule.unit) || rule.rule_type === "damage" && rule.unit !== "fixed") {
        conflict("FINE_RULE_UNSUPPORTED", "Chỉ hỗ trợ phạt trễ fixed/per_day và phạt hỏng fixed; nghiệp vụ khác cần được xác định riêng.");
    }
    if (header.status !== "returned" && header.status !== "partially_returned") conflict("FINE_REQUIRES_RETURN", "Chỉ chốt phạt cho chi tiết đã trả trên phiếu trả toàn bộ hoặc một phần.");
    if (detail.status !== "returned" || detail.returned_at === null) conflict("FINE_REQUIRES_RETURN", "Cần hoàn tất trả bản sao trước khi chốt phạt.");
    if (Number(detail.valid_timeline) !== 1) conflict("FINE_STATE_CONFLICT", "Mốc thời gian mượn/trả không nhất quán; cần kiểm tra riêng.");
    let multiplier = 1n;
    if (rule.rule_type === "late") {
        if (typeof detail.late_seconds !== "string" || !/^\d+$/.test(detail.late_seconds) || BigInt(detail.late_seconds) === 0n) conflict("NOT_LATE", "Chi tiết không có thời gian trả trễ hợp lệ.");
        if (rule.unit === "per_day") multiplier = (BigInt(detail.late_seconds) + 86399n) / 86400n;
    } else if (detail.condition_before !== "good" || detail.condition_after !== "damaged") {
        conflict("DAMAGE_NOT_CONFIRMED", "Chỉ phạt hỏng khi tình trạng trước mượn good và sau trả damaged.");
    }
    const amount = String(rule.amount);
    if (!/^\d{1,10}(\.\d{1,2})?$/.test(amount)) conflict("INVALID_FINE_RULE_AMOUNT", "Mức tiền trong quy định không hợp lệ.");
    const [whole, fraction = ""] = amount.split(".");
    const cents = (BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"))) * multiplier;
    if (cents > maxCents) conflict("FINE_AMOUNT_OUT_OF_RANGE", "Số tiền tính được vượt giới hạn lưu trữ.");
    return `${cents / 100n}.${String(cents % 100n).padStart(2, "0")}`;
}
