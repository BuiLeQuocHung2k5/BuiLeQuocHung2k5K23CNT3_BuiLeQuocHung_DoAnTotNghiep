import { HttpError } from "../utils/http-error.js";
import { catalogOperation } from "../utils/catalog-db.js";
import { pagination } from "../utils/catalog-validation.js";

export function createBookCopyService(model) {
    function found(value) {
        if (!value) throw new HttpError(404, "COPY_NOT_FOUND", "Không tìm thấy bản sao sách.");
        return value;
    }
    function managedState(data) {
        if (!["available", "maintenance"].includes(data.availability_status)) throw new HttpError(409, "CIRCULATION_STATE_MANAGED", "Trạng thái borrowed/lost phải do module mượn/trả xử lý.");
    }
    const write = work => catalogOperation(work, "COPY");
    return {
        async list(query, nested = false) {
            if (nested && !await model.bookExists(query.book_id)) throw new HttpError(404, "BOOK_NOT_FOUND", "Không tìm thấy sách.");
            const { items, total } = await model.list(query);
            return { items, pagination: pagination(query, total) };
        },
        async findById(id) { return found(await model.findById(id)); },
        async create(data) { managedState(data); return write(() => model.create(data)); },
        async replace(id, data) { managedState(data); return found(await write(() => model.replace(id, data))); },
        async remove(id) { found(await write(() => model.remove(id))); },
    };
}
