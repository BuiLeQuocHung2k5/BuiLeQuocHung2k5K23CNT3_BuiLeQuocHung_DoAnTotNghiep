import { validateId, validateBookQuery } from "./book-validation.js";
import { invalid, enumValue, conditions } from "./catalog-validation.js";
import { HttpError } from "./http-error.js";

export const borrowStatuses = ["borrowed", "partially_returned", "returned", "overdue", "cancelled"];
export const maxCopiesPerBorrow = 100;

function object(value, fields) {
    if (!value || typeof value !== "object" || Array.isArray(value)) invalid("body", "Phải là JSON object.");
    for (const field of Object.keys(value)) if (!fields.includes(field)) invalid(field, "Trường không được phép gửi.");
}

function ids(values) {
    if (!Array.isArray(values) || values.length < 1 || values.length > maxCopiesPerBorrow) invalid("copy_ids", "Cần từ 1 đến 100 bản sao.");
    const result = values.map(value => validateId(value, "copy_id"));
    if (new Set(result).size !== result.length) invalid("copy_ids", "Không được trùng bản sao.");
    return result;
}

export function validateBorrow(body, now = Date.now()) {
    object(body, ["user_id", "copy_ids", "due_date", "note"]);
    const due = body.due_date;
    if (typeof due !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(due)) invalid("due_date", "Dùng UTC dạng YYYY-MM-DDTHH:mm:ssZ.");
    const timestamp = Date.parse(due);
    if (!Number.isFinite(timestamp) || new Date(timestamp).toISOString() !== due.replace("Z", ".000Z") || Number(due.slice(0, 4)) < 1000 || timestamp <= now) invalid("due_date", "Ngày hẹn trả phải tồn tại và ở tương lai.");
    if (body.note !== undefined && body.note !== null && (typeof body.note !== "string" || !body.note.isWellFormed() || Buffer.byteLength(body.note, "utf8") > 65535)) invalid("note", "Tối đa 65535 byte UTF-8.");
    return { user_id: validateId(body.user_id, "user_id"), copy_ids: ids(body.copy_ids), due_date: due.replace("T", " ").slice(0, 19), note: body.note ?? null };
}

export function validateReturn(body) {
    object(body, ["items", "return_all", "condition_after"]);
    if (body.return_all === true) {
        if (body.items !== undefined) invalid("items", "Không kết hợp items với return_all.");
        return { return_all: true, condition_after: enumValue(body.condition_after, "condition_after", conditions) };
    }
    if (body.return_all !== undefined || body.condition_after !== undefined) invalid("return_all", "Dùng return_all:true cùng condition_after hoặc danh sách items.");
    if (!Array.isArray(body.items) || body.items.some(item => !item || typeof item !== "object" || Array.isArray(item))) invalid("items", "Cần danh sách bản sao và tình trạng sau trả.");
    ids(body.items.map(item => item.copy_id));
    return { items: body.items.map(item => {
        object(item, ["copy_id", "condition_after"]);
        return { copy_id: validateId(item.copy_id, "copy_id"), condition_after: enumValue(item.condition_after, "condition_after", conditions) };
    }) };
}

export function borrowReadScope(principal) {
    if (principal.permissions.includes("borrow_manage")) return null;
    if (principal.roles.includes("reader")) return principal.user_id;
    throw new HttpError(403, "FORBIDDEN", "Không có quyền xem phiếu mượn.");
}

export function validateBorrowQuery(query, ownerId) {
    for (const field of Object.keys(query)) if (!["page", "limit", "status", "user_id"].includes(field)) invalid(field, "Tham số không được hỗ trợ.");
    if (ownerId !== null && query.user_id !== undefined) throw new HttpError(403, "FORBIDDEN", "Reader không được chọn người mượn qua query.");
    const result = validateBookQuery(Object.fromEntries(Object.entries(query).filter(([key]) => ["page", "limit"].includes(key))));
    if (ownerId !== null) result.user_id = ownerId;
    else if (query.user_id !== undefined) result.user_id = validateId(query.user_id, "user_id");
    if (query.status !== undefined) result.status = enumValue(query.status, "status", borrowStatuses);
    return result;
}
