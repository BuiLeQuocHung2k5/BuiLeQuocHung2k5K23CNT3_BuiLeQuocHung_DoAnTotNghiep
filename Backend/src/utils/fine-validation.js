import { validateId, validateBookQuery } from "./book-validation.js";
import { invalid, enumValue, varchar } from "./catalog-validation.js";
import { HttpError } from "./http-error.js";

export const fineTypes = ["late", "damage", "lost", "other"];
export const paymentStatuses = ["unpaid", "paid", "waived"];

function object(body, fields) {
    if (!body || typeof body !== "object" || Array.isArray(body)) invalid("body", "Phải là JSON object.");
    for (const key of Object.keys(body)) if (!fields.includes(key)) invalid(key, "Trường không được phép gửi.");
}

export function validateFine(body) {
    object(body, ["borrow_detail_id", "fine_rule_id", "reason"]);
    return { borrow_detail_id: validateId(body.borrow_detail_id, "borrow_detail_id"), fine_rule_id: validateId(body.fine_rule_id, "fine_rule_id"), reason: varchar(body.reason, "reason", 255) };
}

export function validatePayment(body) {
    object(body, ["payment_status"]);
    return { payment_status: enumValue(body.payment_status, "payment_status", ["paid"]) };
}

export function financialReadScope(principal, permission) {
    if (principal.permissions.includes(permission)) return null;
    if (principal.roles.includes("reader")) return principal.user_id;
    throw new HttpError(403, "FORBIDDEN", "Không có quyền xem dữ liệu này.");
}

export function validateFinancialQuery(query, ownerId, fines = false) {
    const fields = ["page", "limit", "user_id", "borrow_id", ...(fines ? ["borrow_detail_id", "fine_type", "payment_status"] : [])];
    for (const key of Object.keys(query)) if (!fields.includes(key)) invalid(key, "Tham số không được hỗ trợ.");
    if (ownerId !== null && query.user_id !== undefined) throw new HttpError(403, "FORBIDDEN", "Reader không được chọn người dùng qua query.");
    const result = validateBookQuery(Object.fromEntries(Object.entries(query).filter(([key]) => ["page", "limit"].includes(key))));
    if (ownerId !== null) result.user_id = ownerId;
    else if (query.user_id !== undefined) result.user_id = validateId(query.user_id, "user_id");
    for (const key of ["borrow_id", ...(fines ? ["borrow_detail_id"] : [])]) if (query[key] !== undefined) result[key] = validateId(query[key], key);
    if (fines && query.fine_type !== undefined) result.fine_type = enumValue(query.fine_type, "fine_type", fineTypes);
    if (fines && query.payment_status !== undefined) result.payment_status = enumValue(query.payment_status, "payment_status", paymentStatuses);
    return result;
}
