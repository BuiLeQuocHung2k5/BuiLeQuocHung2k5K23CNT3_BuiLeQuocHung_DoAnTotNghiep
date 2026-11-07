import { HttpError } from "../utils/http-error.js";
import { pagination } from "../utils/catalog-validation.js";

export function createBorrowService(model) {
    return {
        async list(query) { const result = await model.list(query); return { items: result.items, pagination: pagination(query, result.total) }; },
        async findById(id, ownerId) { const result = await model.findById(id, ownerId); if (!result) throw new HttpError(404, "BORROW_NOT_FOUND", "Không tìm thấy phiếu mượn."); return result; },
        async create(data) { return model.create(data); },
        async returnCopies(id, data) { return model.returnCopies(id, data); },
    };
}
