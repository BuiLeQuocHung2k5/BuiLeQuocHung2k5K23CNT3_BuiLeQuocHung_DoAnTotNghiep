import { HttpError } from "../utils/http-error.js";

export function createBookService(model) {
    function requireBook(book) {
        if (!book) throw new HttpError(404, "BOOK_NOT_FOUND", "Không tìm thấy sách.");
        return book;
    }
    return {
        async list(query) {
            const { books, total } = await model.list(query);
            return { books, pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) } };
        },
        async findById(id) { return requireBook(await model.findById(id)); },
        async create(data) { return model.create(data); },
        async replace(id, data) { return requireBook(await model.replace(id, data)); },
        async remove(id) {
            const result = await model.remove(id);
            if (result === "missing") requireBook(null);
            if (result === "referenced") throw new HttpError(409, "BOOK_HAS_COPIES", "Sách có bản sao hoặc dữ liệu liên quan nên không thể xóa.");
        },
    };
}
