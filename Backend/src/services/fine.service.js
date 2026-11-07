import { HttpError } from "../utils/http-error.js";
import { pagination } from "../utils/catalog-validation.js";

async function fineOperation(work) {
    try { return await work(); }
    catch (error) {
        if (["ER_NO_REFERENCED_ROW", "ER_NO_REFERENCED_ROW_2"].includes(error.code)) throw new HttpError(400, "INVALID_FINE_REFERENCE", "Chi tiết mượn hoặc quy định phạt được tham chiếu không tồn tại.");
        throw error;
    }
}

export function createFineService(model) {
    return {
        async list(query) { const result = await model.list(query); return { items: result.items, pagination: pagination(query, result.total) }; },
        async findById(id, ownerId) { const row = await model.findById(id, ownerId); if (!row) throw new HttpError(404, "FINE_NOT_FOUND", "Không tìm thấy tiền phạt."); return row; },
        async create(data) { return fineOperation(() => model.create(data)); },
        async pay(id) { return model.pay(id); },
    };
}
