import { transaction, paged, searchPattern } from "../utils/catalog-db.js";
import { HttpError } from "../utils/http-error.js";

const columns = "category_id, name, description, created_at";
const serialize = row => row ? { ...row, category_id: String(row.category_id) } : null;

export function createCategoryModel(pool) {
    async function findById(id, connection = pool, lock = false) {
        const [rows] = await connection.execute(`SELECT ${columns} FROM DanhMuc WHERE category_id = ?${lock ? " FOR UPDATE" : ""}`, [id]);
        return serialize(rows[0]);
    }
    return {
        findById,
        async list(query) {
            const where = query.search ? " WHERE (name LIKE ? ESCAPE '=' OR description LIKE ? ESCAPE '=')" : "";
            const params = query.search ? [searchPattern(query.search), searchPattern(query.search)] : [];
            return paged(pool, `SELECT COUNT(*) AS total FROM DanhMuc${where}`, `SELECT ${columns} FROM DanhMuc${where} ORDER BY category_id DESC LIMIT ? OFFSET ?`, params, query, serialize);
        },
        async create(data) {
            return transaction(pool, async connection => {
                const [result] = await connection.execute("INSERT INTO DanhMuc (name, description) VALUES (?, ?)", [data.name, data.description]);
                return findById(String(result.insertId), connection);
            });
        },
        async replace(id, data) {
            return transaction(pool, async connection => {
                if (!await findById(id, connection, true)) return null;
                await connection.execute("UPDATE DanhMuc SET name = ?, description = ? WHERE category_id = ?", [data.name, data.description, id]);
                return findById(id, connection);
            });
        },
        async remove(id) {
            return transaction(pool, async connection => {
                if (!await findById(id, connection, true)) return false;
                // A current locking read + parent lock prevents concurrent FK additions.
                const [books] = await connection.execute("SELECT book_id FROM Sach WHERE category_id = ? LIMIT 1 FOR UPDATE", [id]);
                if (books.length) throw new HttpError(409, "CATEGORY_IN_USE", "Danh mục đang được sách tham chiếu, không thể xóa.");
                // Do not allow ON DELETE SET NULL to detach existing books.
                await connection.execute("DELETE FROM DanhMuc WHERE category_id = ?", [id]);
                return true;
            });
        },
    };
}
