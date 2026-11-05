import { HttpError } from "../utils/http-error.js";

export function notFound(req, res, next) {
    next(new HttpError(404, "ROUTE_NOT_FOUND", "Endpoint không tồn tại."));
}

export function errorHandler(error, req, res, next) {
    if (res.headersSent) return next(error);
    let status = 500;
    let code = "INTERNAL_ERROR";
    let message = "Có lỗi hệ thống. Vui lòng thử lại sau.";
    let details;
    if (error instanceof HttpError) {
        ({ status, code, message, details } = error);
    } else if (error.type === "entity.parse.failed") {
        status = 400; code = "INVALID_JSON"; message = "JSON không hợp lệ.";
    } else if (error instanceof URIError) {
        status = 400; code = "INVALID_URL"; message = "Đường dẫn không hợp lệ.";
    } else if (error.type === "entity.too.large") {
        status = 413; code = "PAYLOAD_TOO_LARGE"; message = "Nội dung yêu cầu quá lớn.";
    } else if (error.status === 415) {
        status = 415; code = "UNSUPPORTED_MEDIA_TYPE"; message = "Định dạng nội dung không được hỗ trợ.";
    } else if (error.code === "ER_DUP_ENTRY") {
        status = 409; code = "DUPLICATE_VALUE"; message = "Dữ liệu trùng với một giá trị duy nhất đã tồn tại.";
    } else if (["ER_NO_REFERENCED_ROW_2", "ER_NO_REFERENCED_ROW"].includes(error.code)) {
        status = 400; code = "INVALID_REFERENCE"; message = "Danh mục hoặc bộ sách được tham chiếu không tồn tại.";
    } else if (["ER_ROW_IS_REFERENCED_2", "ER_ROW_IS_REFERENCED"].includes(error.code)) {
        status = 409; code = "BOOK_IN_USE"; message = "Sách có bản sao hoặc dữ liệu liên quan nên không thể xóa.";
    } else if (["ER_DATA_TOO_LONG", "ER_WARN_DATA_OUT_OF_RANGE", "WARN_DATA_TRUNCATED", "ER_TRUNCATED_WRONG_VALUE", "ER_TRUNCATED_WRONG_VALUE_FOR_FIELD", "ER_BAD_NULL_ERROR", "ER_CHECK_CONSTRAINT_VIOLATED"].includes(error.code)) {
        status = 400; code = "INVALID_DATA"; message = "Dữ liệu không đáp ứng ràng buộc database.";
    } else if (["ECONNREFUSED", "ECONNRESET", "ETIMEDOUT", "ENOTFOUND", "PROTOCOL_CONNECTION_LOST", "ER_CON_COUNT_ERROR", "ER_ACCESS_DENIED_ERROR", "ER_LOCK_DEADLOCK", "ER_LOCK_WAIT_TIMEOUT"].includes(error.code)) {
        status = 503; code = "DATABASE_UNAVAILABLE"; message = "Database tạm thời không sẵn sàng. Vui lòng thử lại sau.";
    }
    if (status === 401) res.set("WWW-Authenticate", "Bearer");
    res.status(status).json({ success: false, error: { code, message, ...(details ? { details } : {}) } });
}
