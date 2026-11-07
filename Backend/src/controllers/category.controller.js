import { validateId, validateBookQuery } from "../utils/book-validation.js";
import { jsonBody, validateCategory } from "../utils/catalog-validation.js";

export function createCategoryController(service) {
    return {
        async list(req, res) { const result = await service.list(validateBookQuery(req.query)); res.json({ success: true, data: result.items, pagination: result.pagination }); },
        async findById(req, res) { res.json({ success: true, data: await service.findById(validateId(req.params.id)) }); },
        async create(req, res) { const data = await service.create(jsonBody(req, validateCategory)); res.location(`/api/categories/${data.category_id}`).status(201).json({ success: true, data }); },
        async replace(req, res) { res.json({ success: true, data: await service.replace(validateId(req.params.id), jsonBody(req, validateCategory)) }); },
        async remove(req, res) { await service.remove(validateId(req.params.id)); res.json({ success: true, data: null, message: "Đã xóa danh mục." }); },
    };
}
