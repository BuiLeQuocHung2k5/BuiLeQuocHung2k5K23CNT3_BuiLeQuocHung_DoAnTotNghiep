import { validateId } from "../utils/book-validation.js";
import { jsonBody } from "../utils/catalog-validation.js";
import { validateBorrow, validateReturn, borrowReadScope, validateBorrowQuery } from "../utils/borrow-validation.js";

export function createBorrowController(service) {
    return {
        async list(req, res) { const result = await service.list(validateBorrowQuery(req.query, borrowReadScope(req.auth))); res.json({ success: true, data: result.items, pagination: result.pagination }); },
        async findById(req, res) { res.json({ success: true, data: await service.findById(validateId(req.params.id), borrowReadScope(req.auth)) }); },
        async create(req, res) { const data = await service.create(jsonBody(req, validateBorrow)); res.location(`/api/borrows/${data.borrow_id}`).status(201).json({ success: true, data }); },
        async returnCopies(req, res) { res.json({ success: true, data: await service.returnCopies(validateId(req.params.id), jsonBody(req, validateReturn)) }); },
    };
}
