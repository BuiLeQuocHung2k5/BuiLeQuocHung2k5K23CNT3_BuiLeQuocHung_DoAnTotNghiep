import { HttpError } from "../utils/http-error.js";
import { pagination } from "../utils/catalog-validation.js";

export function createOverdueService(model) {
    return {
        async list(query) { const result = await model.list(query); return { ...result, pagination: pagination(query, result.total) }; },
        async findByBorrow(id, ownerId) { const row = await model.findByBorrow(id, ownerId); if (!row) throw new HttpError(404, "BORROW_NOT_FOUND", "Không tìm thấy phiếu mượn."); return row; },
    };
}
