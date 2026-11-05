import { HttpError } from "./http-error.js";

function invalid(field, message) {
    throw new HttpError(400, "VALIDATION_ERROR", "Dữ liệu xác thực không hợp lệ.", [{ field, message }]);
}

function object(body, allowed) {
    if (!body || typeof body !== "object" || Array.isArray(body)) invalid("body", "Phải là JSON object.");
    for (const key of Object.keys(body)) if (!allowed.includes(key)) invalid(key, "Trường không được phép gửi.");
}

function text(value, field, max, required = true) {
    if (!required && (value === undefined || value === null)) return null;
    if (typeof value !== "string" || !value.isWellFormed()) invalid(field, "Phải là chuỗi Unicode hợp lệ.");
    value = value.trim();
    if ((required && !value) || [...value].length > max || /[\u0000-\u001f\u007f]/.test(value)) invalid(field, `Chuỗi không rỗng, tối đa ${max} ký tự, không có ký tự điều khiển.`);
    return value;
}

function email(value) {
    value = text(value, "email", 150).toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) invalid("email", "Email không đúng định dạng.");
    return value;
}

function password(value, register) {
    if (typeof value !== "string" || !value.isWellFormed() || [...value].length < (register ? 12 : 1) || Buffer.byteLength(value, "utf8") > 72) {
        invalid("password", register ? "Mật khẩu tối thiểu 12 ký tự, tối đa 72 byte UTF-8." : "Mật khẩu phải có từ 1 đến 72 byte UTF-8.");
    }
    return value; // Never trim passwords or let bcrypt silently truncate them.
}

export function validateRegister(body) {
    object(body, ["name", "email", "password", "phone"]);
    return { name: text(body.name, "name", 100), email: email(body.email), password: password(body.password, true), phone: text(body.phone, "phone", 20, false) };
}

export function validateLogin(body) {
    object(body, ["email", "password"]);
    return { email: email(body.email), password: password(body.password, false) };
}
