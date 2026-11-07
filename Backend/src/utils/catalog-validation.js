import { HttpError } from "./http-error.js";
import { validateId, validateBookQuery } from "./book-validation.js";

export const conditions = ["good", "damaged"];
export const availability = ["available", "borrowed", "lost", "maintenance"];

export function invalid(field, message) {
    throw new HttpError(400, "VALIDATION_ERROR", "Dữ liệu không hợp lệ.", [{ field, message }]);
}

export function varchar(value, field, max, required = false) {
    if (value === undefined || value === null) {
        if (required) invalid(field, "Trường bắt buộc.");
        return null;
    }
    if (typeof value !== "string" || !value.isWellFormed()) invalid(field, "Phải là chuỗi Unicode hợp lệ.");
    value = value.trim();
    if ((required && !value) || [...value].length > max) invalid(field, `Độ dài ${required ? "1–" : "tối đa "}${max} ký tự.`);
    return value;
}

function text(value, field) {
    if (value === undefined || value === null) return null;
    if (typeof value !== "string" || !value.isWellFormed() || Buffer.byteLength(value, "utf8") > 65535) invalid(field, "Tối đa 65535 byte UTF-8, phải là chuỗi Unicode hợp lệ.");
    return value;
}

function object(body, allowed) {
    if (!body || typeof body !== "object" || Array.isArray(body)) invalid("body", "Phải là JSON object.");
    for (const key of Object.keys(body)) if (!allowed.includes(key)) invalid(key, "Trường không được phép ghi.");
}

export function enumValue(value, field, values) {
    if (typeof value !== "string" || !values.includes(value)) invalid(field, `Chỉ nhận: ${values.join(", ")}.`);
    return value;
}

export function validateCategory(body) {
    object(body, ["name", "description"]);
    return { name: varchar(body.name, "name", 100, true), description: text(body.description, "description") };
}

export function validateCopy(body, update = false) {
    object(body, ["book_id", "isbn", "barcode", "condition_status", "availability_status", "note"]);
    const condition = enumValue(body.condition_status === undefined && !update ? "good" : body.condition_status, "condition_status", conditions);
    const status = enumValue(body.availability_status === undefined && !update ? "available" : body.availability_status, "availability_status", availability);
    if (!["available", "maintenance"].includes(status)) throw new HttpError(409, "CIRCULATION_STATE_MANAGED", "Trạng thái borrowed/lost phải được xử lý qua module mượn/trả.");
    const isbn = varchar(body.isbn, "isbn", 20);
    return { book_id: validateId(body.book_id, "book_id"), isbn, barcode: varchar(body.barcode, "barcode", 50, true), condition_status: condition, availability_status: status, note: text(body.note, "note") };
}

export function validateCopyQuery(query, nestedBookId) {
    const allowed = ["page", "limit", "search", "condition_status", "availability_status", ...(nestedBookId === undefined ? ["book_id"] : [])];
    for (const key of Object.keys(query)) if (!allowed.includes(key)) invalid(key, "Tham số không được hỗ trợ.");
    const basic = Object.fromEntries(Object.entries(query).filter(([key]) => ["page", "limit", "search"].includes(key)));
    const result = validateBookQuery(basic);
    if (nestedBookId !== undefined || query.book_id !== undefined) result.book_id = validateId(nestedBookId ?? query.book_id, "book_id");
    if (query.condition_status !== undefined) result.condition_status = enumValue(query.condition_status, "condition_status", conditions);
    if (query.availability_status !== undefined) result.availability_status = enumValue(query.availability_status, "availability_status", availability);
    return result;
}

export function jsonBody(req, validate) {
    if (!req.is("application/json")) throw new HttpError(415, "UNSUPPORTED_MEDIA_TYPE", "Hãy gửi Content-Type: application/json.");
    return validate(req.body);
}

export function pagination(query, total) {
    return { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) };
}
