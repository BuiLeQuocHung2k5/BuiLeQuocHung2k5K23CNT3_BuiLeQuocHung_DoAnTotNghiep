import { LoiHttp } from "../utils/loi-http.js";

export function xuLyKhongTimThay(req, res, next) {
    next(new LoiHttp(404, "ROUTE_NOT_FOUND", "Endpoint không tồn tại."));
}

export function xuLyLoi(loi, req, res, next) {
    if (res.headersSent) return next(loi);
    let trangThai = 500;
    let maLoi = "INTERNAL_ERROR";
    let thongBao = "Có lỗi hệ thống. Vui lòng thử lại sau.";
    let cacChiTiet;
    if (loi instanceof LoiHttp) {
        ({ status: trangThai, code: maLoi, message: thongBao, details: cacChiTiet } = loi);
    } else if (loi.type === "entity.parse.failed") {
        trangThai = 400; maLoi = "INVALID_JSON"; thongBao = "JSON không hợp lệ.";
    } else if (loi instanceof URIError) {
        trangThai = 400; maLoi = "INVALID_URL"; thongBao = "Đường dẫn không hợp lệ.";
    } else if (loi.type === "entity.too.large") {
        trangThai = 413; maLoi = "PAYLOAD_TOO_LARGE"; thongBao = "Nội dung yêu cầu quá lớn.";
    } else if (loi.status === 415) {
        trangThai = 415; maLoi = "UNSUPPORTED_MEDIA_TYPE"; thongBao = "Định dạng nội dung không được hỗ trợ.";
    } else if (loi.code === "ER_DUP_ENTRY") {
        trangThai = 409; maLoi = "DUPLICATE_VALUE"; thongBao = "Dữ liệu trùng với một giá trị duy nhất đã tồn tại.";
    } else if (["ER_NO_REFERENCED_ROW_2", "ER_NO_REFERENCED_ROW"].includes(loi.code)) {
        trangThai = 400; maLoi = "INVALID_REFERENCE"; thongBao = "Danh mục hoặc bộ sách được tham chiếu không tồn tại.";
    } else if (["ER_ROW_IS_REFERENCED_2", "ER_ROW_IS_REFERENCED"].includes(loi.code)) {
        trangThai = 409; maLoi = "BOOK_IN_USE"; thongBao = "Sách có bản sao hoặc dữ liệu liên quan nên không thể xóa.";
    } else if (["ER_DATA_TOO_LONG", "ER_WARN_DATA_OUT_OF_RANGE", "WARN_DATA_TRUNCATED", "ER_TRUNCATED_WRONG_VALUE", "ER_TRUNCATED_WRONG_VALUE_FOR_FIELD", "ER_BAD_NULL_ERROR", "ER_CHECK_CONSTRAINT_VIOLATED"].includes(loi.code)) {
        trangThai = 400; maLoi = "INVALID_DATA"; thongBao = "Dữ liệu không đáp ứng ràng buộc database.";
    } else if (["ECONNREFUSED", "ECONNRESET", "ETIMEDOUT", "ENOTFOUND", "PROTOCOL_CONNECTION_LOST", "ER_CON_COUNT_ERROR", "ER_ACCESS_DENIED_ERROR", "ER_LOCK_DEADLOCK", "ER_LOCK_WAIT_TIMEOUT"].includes(loi.code)) {
        trangThai = 503; maLoi = "DATABASE_UNAVAILABLE"; thongBao = "Database tạm thời không sẵn sàng. Vui lòng thử lại sau.";
    }
    if (trangThai === 401) res.set("WWW-Authenticate", "Bearer");
    res.status(trangThai).json({ success: false, error: { code: maLoi, message: thongBao, ...(cacChiTiet ? { details: cacChiTiet } : {}) } });
}
