import { validateId } from "../utils/book-validation.js";
import { jsonBody } from "../utils/catalog-validation.js";
import { validateFine, validatePayment, validateFinancialQuery, financialReadScope } from "../utils/fine-validation.js";

export function createFineController(service) {
    return {
        async list(req, res) { const result = await service.list(validateFinancialQuery(req.query, financialReadScope(req.auth, "fine_manage"), true)); res.json({ success: true, data: result.items, pagination: result.pagination }); },
        async findById(req, res) { res.json({ success: true, data: await service.findById(validateId(req.params.id), financialReadScope(req.auth, "fine_manage")) }); },
        async create(req, res) { const data = await service.create(jsonBody(req, validateFine)); res.location(`/api/fines/${data.fine_id}`).status(201).json({ success: true, data }); },
        async pay(req, res) { const id = validateId(req.params.id); jsonBody(req, validatePayment); res.json({ success: true, data: await service.pay(id) }); },
    };
}
