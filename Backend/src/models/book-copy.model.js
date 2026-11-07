import { transaction, paged, searchPattern } from "../utils/catalog-db.js";
import { HttpError } from "../utils/http-error.js";

const columns = "copy_id, book_id, isbn, barcode, condition_status, availability_status, note, created_at, updated_at";
const publicColumns = "copy_id, book_id, isbn, barcode, condition_status, availability_status, created_at, updated_at";
const writable = ["book_id", "isbn", "barcode", "condition_status", "availability_status", "note"];
const serialize = row => row ? { ...row, copy_id: String(row.copy_id), book_id: String(row.book_id) } : null;

export function createBookCopyModel(pool) {
    async function findById(id, connection = pool, lock = false, includeNote = false) {
        const [rows] = await connection.execute(`SELECT ${includeNote ? columns : publicColumns} FROM BanSaoSach WHERE copy_id = ?${lock ? " FOR UPDATE" : ""}`, [id]);
        return serialize(rows[0]);
    }
    async function assertEditable(copy, connection) {
        if (!["available", "maintenance"].includes(copy.availability_status)) throw new HttpError(409, "COPY_CIRCULATION_LOCKED", "Bản sao borrowed/lost chỉ được xử lý qua module mượn/trả.");
        const [loans] = await connection.execute("SELECT borrow_detail_id FROM ChiTietPhieuMuon WHERE copy_id = ? AND (returned_at IS NULL OR status <> 'returned') LIMIT 1 FOR UPDATE", [copy.copy_id]);
        if (loans.length) throw new HttpError(409, "COPY_CIRCULATION_LOCKED", "Bản sao có lượt mượn chưa hoàn tất; không được sửa hoặc xóa tại đây.");
    }
    return {
        findById,
        async bookExists(id) {
            const [rows] = await pool.execute("SELECT book_id FROM Sach WHERE book_id = ?", [id]);
            return rows.length > 0;
        },
        async list(query) {
            const clauses = [], parameters = [];
            for (const field of ["book_id", "condition_status", "availability_status"]) {
                if (query[field] !== undefined) { clauses.push(`${field} = ?`); parameters.push(query[field]); }
            }
            if (query.search) { clauses.push("(barcode LIKE ? ESCAPE '=' OR isbn LIKE ? ESCAPE '=')"); parameters.push(searchPattern(query.search), searchPattern(query.search)); }
            const where = clauses.length ? ` WHERE ${clauses.join(" AND ")}` : "";
            return paged(pool, `SELECT COUNT(*) AS total FROM BanSaoSach${where}`, `SELECT ${publicColumns} FROM BanSaoSach${where} ORDER BY copy_id DESC LIMIT ? OFFSET ?`, parameters, query, serialize);
        },
        async create(data) {
            return transaction(pool, async connection => {
                const [books] = await connection.execute("SELECT book_id FROM Sach WHERE book_id = ? FOR SHARE", [data.book_id]);
                if (!books.length) throw new HttpError(400, "INVALID_REFERENCE", "Sách được tham chiếu không tồn tại.");
                const [result] = await connection.execute(`INSERT INTO BanSaoSach (${writable.join(", ")}) VALUES (?, ?, ?, ?, ?, ?)`, writable.map(key => data[key]));
                return findById(String(result.insertId), connection, false, true);
            });
        },
        async replace(id, data) {
            return transaction(pool, async connection => {
                const copy = await findById(id, connection, true);
                if (!copy) return null;
                await assertEditable(copy, connection);
                if (data.book_id !== copy.book_id) throw new HttpError(409, "COPY_BOOK_IMMUTABLE", "Không hỗ trợ chuyển bản sao sang sách khác; cần giữ nguyên liên kết lịch sử.");
                await connection.execute("UPDATE BanSaoSach SET isbn = ?, barcode = ?, condition_status = ?, availability_status = ?, note = ? WHERE copy_id = ?", [data.isbn, data.barcode, data.condition_status, data.availability_status, data.note, id]);
                return findById(id, connection, false, true);
            });
        },
        async remove(id) {
            return transaction(pool, async connection => {
                const copy = await findById(id, connection, true);
                if (!copy) return false;
                await assertEditable(copy, connection);
                const [loans] = await connection.execute("SELECT borrow_detail_id FROM ChiTietPhieuMuon WHERE copy_id = ? LIMIT 1 FOR UPDATE", [id]);
                if (loans.length) throw new HttpError(409, "COPY_HAS_LOAN_HISTORY", "Bản sao đã có lịch sử mượn, không thể xóa.");
                const [usage] = await connection.execute("SELECT usage_id FROM LichSuSuDung WHERE copy_id = ? LIMIT 1 FOR UPDATE", [id]);
                if (usage.length) throw new HttpError(409, "COPY_HAS_USAGE_HISTORY", "Bản sao có lịch sử sử dụng, không thể xóa.");
                await connection.execute("DELETE FROM BanSaoSach WHERE copy_id = ?", [id]);
                return true;
            });
        },
    };
}
