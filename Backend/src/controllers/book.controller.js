import { validateId, validateBookBody, validateBookQuery } from "../utils/book-validation.js";
import { HttpError } from "../utils/http-error.js";

export function createBookController(service) {
    function body(req) {
        if (!req.is("application/json")) throw new HttpError(415, "UNSUPPORTED_MEDIA_TYPE", "Hãy gửi Content-Type: application/json.");
        return validateBookBody(req.body);
    }
    return {
        async list(req, res) {
            const { books, pagination } = await service.list(validateBookQuery(req.query));
            res.json({ success: true, data: books, pagination });
        },
        async findById(req, res) {
            res.json({ success: true, data: await service.findById(validateId(req.params.id)) });
        },
        async create(req, res) {
            const book = await service.create(body(req));
            res.location(`/api/books/${book.book_id}`).status(201).json({ success: true, data: book });
        },
        async replace(req, res) {
            const id = validateId(req.params.id);
            res.json({ success: true, data: await service.replace(id, body(req)) });
        },
        async remove(req, res) {
            await service.remove(validateId(req.params.id));
            res.json({ success: true, data: null, message: "Đã xóa sách." });
        },
    };
}
