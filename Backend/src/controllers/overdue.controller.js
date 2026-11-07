import { validateId } from "../utils/book-validation.js";
import { invalid } from "../utils/catalog-validation.js";
import { validateFinancialQuery, financialReadScope } from "../utils/fine-validation.js";

export function createOverdueController(service) {
    return {
        async list(req, res) { const result = await service.list(validateFinancialQuery(req.query, financialReadScope(req.auth, "borrow_manage"))); res.json({ success: true, data: result.items, pagination: result.pagination, as_of: result.as_of }); },
        async findByBorrow(req, res) {
            const scope = financialReadScope(req.auth, "borrow_manage");
            if (Object.keys(req.query).length) invalid("query", "Endpoint này không nhận query; phạm vi đọc lấy từ JWT.");
            res.json({ success: true, data: await service.findByBorrow(validateId(req.params.id), scope) });
        },
    };
}
