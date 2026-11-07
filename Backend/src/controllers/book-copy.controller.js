import { validateId } from "../utils/book-validation.js";
import { jsonBody, validateCopy, validateCopyQuery } from "../utils/catalog-validation.js";

// Notes are internal free text; public catalog responses deliberately omit them.
function publicCopy(copy) { const { note, ...visible } = copy; return visible; }

export function createBookCopyController(service) {
    async function list(req, res, nested) {
        const query = validateCopyQuery(req.query, nested ? req.params.id : undefined);
        const result = await service.list(query, nested);
        res.json({ success: true, data: result.items.map(publicCopy), pagination: result.pagination });
    }
    return {
        async list(req, res) { await list(req, res, false); },
        async listForBook(req, res) { await list(req, res, true); },
        async findById(req, res) { res.json({ success: true, data: publicCopy(await service.findById(validateId(req.params.id))) }); },
        async create(req, res) { const data = await service.create(jsonBody(req, validateCopy)); res.location(`/api/book-copies/${data.copy_id}`).status(201).json({ success: true, data }); },
        async replace(req, res) { res.json({ success: true, data: await service.replace(validateId(req.params.id), jsonBody(req, body => validateCopy(body, true))) }); },
        async remove(req, res) { await service.remove(validateId(req.params.id)); res.json({ success: true, data: null, message: "Đã xóa bản sao sách." }); },
    };
}
