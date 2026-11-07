import { HttpError } from "../utils/http-error.js";
import { catalogOperation } from "../utils/catalog-db.js";
import { pagination } from "../utils/catalog-validation.js";

export function createCategoryService(model) {
    function found(value) {
        if (!value) throw new HttpError(404, "CATEGORY_NOT_FOUND", "Không tìm thấy danh mục.");
        return value;
    }
    const write = work => catalogOperation(work, "CATEGORY");
    return {
        async list(query) { const { items, total } = await model.list(query); return { items, pagination: pagination(query, total) }; },
        async findById(id) { return found(await model.findById(id)); },
        async create(data) { return write(() => model.create(data)); },
        async replace(id, data) { return found(await write(() => model.replace(id, data))); },
        async remove(id) { found(await write(() => model.remove(id))); },
    };
}
