import { HttpError } from "./http-error.js";

const maxId = 18446744073709551615n;
const fields = new Set(["category_id", "series_id", "title", "author", "publisher", "description", "publication_year"]);

function invalid(field, message) {
    throw new HttpError(400, "VALIDATION_ERROR", "Dữ liệu không hợp lệ.", [{ field, message }]);
}

// Keep BIGINT identifiers as strings to avoid JavaScript rounding them.
export function validateId(value, field = "id") {
    if (typeof value === "number") {
        if (!Number.isSafeInteger(value)) invalid(field, "ID dạng số phải là số nguyên an toàn; dùng chuỗi cho ID lớn.");
        value = String(value);
    }
    if (typeof value !== "string" || !/^[1-9]\d{0,19}$/.test(value) || BigInt(value) > maxId) {
        invalid(field, "ID phải là số nguyên dương trong phạm vi BIGINT UNSIGNED.");
    }
    return value;
}

function varchar(value, field, maximum, required = false) {
    if (value === undefined || value === null) {
        if (required) invalid(field, "Trường bắt buộc.");
        return null;
    }
    if (typeof value !== "string" || !value.isWellFormed()) invalid(field, "Phải là chuỗi Unicode hợp lệ.");
    value = value.trim();
    if ((required && !value) || [...value].length > maximum) {
        invalid(field, `Độ dài ${required ? "từ 1 đến" : "tối đa"} ${maximum} ký tự.`);
    }
    return value;
}

export function validateBookBody(body) {
    if (!body || typeof body !== "object" || Array.isArray(body)) invalid("body", "Phải là một JSON object.");
    for (const field of Object.keys(body)) if (!fields.has(field)) invalid(field, "Trường không được phép ghi.");
    const data = {
        title: varchar(body.title, "title", 255, true),
        author: varchar(body.author, "author", 150, true),
        publisher: varchar(body.publisher, "publisher", 150),
    };
    for (const field of ["category_id", "series_id"]) {
        data[field] = body[field] === undefined || body[field] === null ? null : validateId(body[field], field);
    }
    const description = body.description;
    if (description !== undefined && description !== null &&
        (typeof description !== "string" || !description.isWellFormed() || Buffer.byteLength(description, "utf8") > 65535)) {
        invalid("description", "Phải là chuỗi Unicode không vượt quá 65535 byte UTF-8.");
    }
    data.description = description ?? null;
    const year = body.publication_year;
    if (year !== undefined && year !== null && (!Number.isInteger(year) || year < 0 || year > 65535)) {
        invalid("publication_year", "Phải là số nguyên từ 0 đến 65535 hoặc null (SMALLINT UNSIGNED).");
    }
    data.publication_year = year ?? null;
    return data;
}

export function validateBookQuery(query) {
    for (const field of Object.keys(query)) {
        if (!["page", "limit", "search"].includes(field)) invalid(field, "Tham số không được hỗ trợ.");
    }
    function positive(value, field, fallback, max) {
        if (value === undefined) return fallback;
        if (typeof value !== "string" || !/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(Number(value)) || Number(value) > max) {
            invalid(field, `Phải là số nguyên dương không vượt quá ${max}.`);
        }
        return Number(value);
    }
    const page = positive(query.page, "page", 1, Number.MAX_SAFE_INTEGER);
    const limit = positive(query.limit, "limit", 10, 100);
    const offset = (page - 1) * limit;
    if (!Number.isSafeInteger(offset)) invalid("page", "Vị trí phân trang vượt phạm vi cho phép.");
    const search = varchar(query.search, "search", 255) ?? "";
    return { page, limit, offset, search };
}
