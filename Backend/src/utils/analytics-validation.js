import { validateId, validateBookQuery } from "./book-validation.js";
import { invalid, enumValue } from "./catalog-validation.js";
import { HttpError } from "./http-error.js";

export const usageActions = ["login", "borrow", "return"];
const dayMs = 86400000;

function date(value, field) {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value < "1000-01-01" || value > "9999-12-30") invalid(field, "Dùng ngày UTC YYYY-MM-DD trong phạm vi 1000-01-01 đến 9999-12-30.");
    const ms = Date.parse(`${value}T00:00:00Z`);
    if (!Number.isFinite(ms) || new Date(ms).toISOString().slice(0, 10) !== value) invalid(field, "Ngày không tồn tại.");
    return ms;
}

export function dateRange(query, now = Date.now()) {
    const today = new Date(now).toISOString().slice(0, 10);
    const end = query.end_date ?? today, endMs = date(end, "end_date");
    const start = query.start_date ?? new Date(endMs - 29 * dayMs).toISOString().slice(0, 10), startMs = date(start, "start_date");
    const days = (endMs - startMs) / dayMs + 1;
    if (days < 1 || days > 366) invalid("start_date", "Khoảng ngày phải tăng dần và không vượt 366 ngày (tính cả hai đầu).");
    return { start_date: start, end_date: end, from: `${start} 00:00:00`, until: `${new Date(endMs + dayMs).toISOString().slice(0, 10)} 00:00:00`, days };
}

function allowed(query, fields) { for (const key of Object.keys(query)) if (!fields.includes(key)) invalid(key, "Tham số không được hỗ trợ."); }
function page(query) { return validateBookQuery(Object.fromEntries(Object.entries(query).filter(([key]) => ["page", "limit"].includes(key)))); }

export function usageReadScope(principal, me = false) {
    if (me) return principal.user_id;
    if (principal.permissions.includes("report_view")) return null;
    if (principal.roles.includes("reader")) return principal.user_id;
    throw new HttpError(403, "FORBIDDEN", "Không có quyền xem lịch sử sử dụng.");
}

export function validateUsageQuery(query, ownerId) {
    allowed(query, ["page", "limit", "start_date", "end_date", "action_type", "user_id"]);
    if (ownerId !== null && query.user_id !== undefined) throw new HttpError(403, "FORBIDDEN", "Không được chọn người dùng khi xem lịch sử cá nhân.");
    const result = { ...page(query), ...dateRange(query) };
    if (ownerId !== null) result.user_id = ownerId;
    else if (query.user_id !== undefined) result.user_id = validateId(query.user_id, "user_id");
    if (query.action_type !== undefined) result.action_type = enumValue(query.action_type, "action_type", usageActions);
    return result;
}

export function validateStatisticsQuery(query, kind) {
    allowed(query, ["start_date", "end_date", ...(kind === "borrows" ? ["group_by", "user_id"] : []), ...(kind === "users" ? ["page", "limit", "user_id"] : [])]);
    const result = dateRange(query);
    if (kind === "borrows") result.group_by = enumValue(query.group_by ?? "day", "group_by", ["day", "week", "month"]);
    if (kind === "users") Object.assign(result, page(query));
    if (query.user_id !== undefined) result.user_id = validateId(query.user_id, "user_id");
    return result;
}

export function validateUsageEvent(event) {
    if (!event || typeof event !== "object" || Array.isArray(event)) invalid("event", "Cần sự kiện nội bộ hợp lệ.");
    allowed(event, ["user_id", "copy_id", "action_type", "borrow_id"]);
    const action = enumValue(event.action_type, "action_type", usageActions), user = validateId(event.user_id, "user_id");
    if (action === "login") {
        if (event.copy_id != null || event.borrow_id !== undefined) invalid("event", "Login không gắn bản sao hoặc phiếu mượn.");
        return { user_id: user, copy_id: null, action_type: action, details: JSON.stringify({ source: "libriflow-api", version: 1 }) };
    }
    return { user_id: user, copy_id: validateId(event.copy_id, "copy_id"), action_type: action, details: JSON.stringify({ source: "libriflow-api", version: 1, borrow_id: validateId(event.borrow_id, "borrow_id") }) };
}
