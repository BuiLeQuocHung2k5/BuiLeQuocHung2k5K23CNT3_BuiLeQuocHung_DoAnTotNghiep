// Fixed identifiers come from sql/schema.sql; values always use placeholders.
const columns = "book_id, category_id, series_id, title, author, publisher, description, publication_year, created_at, updated_at";
const writable = ["category_id", "series_id", "title", "author", "publisher", "description", "publication_year"];

function serialize(row) {
    if (!row) return null;
    const book = { ...row, book_id: String(row.book_id) };
    for (const key of ["category_id", "series_id"]) book[key] = row[key] === null ? null : String(row[key]);
    return book;
}

export function createBookModel(pool) {
    async function findById(id, connection = pool, lock = false) {
        const [rows] = await connection.execute(`SELECT ${columns} FROM Sach WHERE book_id = ?${lock ? " FOR UPDATE" : ""}`, [id]);
        return serialize(rows[0]);
    }

    async function transaction(work) {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();
            const result = await work(connection);
            await connection.commit();
            return result;
        } catch (error) {
            try { await connection.rollback(); } catch { /* Preserve the original failure. */ }
            throw error;
        } finally {
            connection.release();
        }
    }

    return {
        findById,
        async list({ limit, offset, search }) {
            const where = search ? " WHERE (title LIKE ? ESCAPE '=' OR author LIKE ? ESCAPE '=' OR publisher LIKE ? ESCAPE '=')" : "";
            // Search is literal substring matching, including %, _ and =.
            const pattern = `%${search.replace(/[=%_]/g, "=$&")}%`;
            const parameters = search ? [pattern, pattern, pattern] : [];
            const [[counts], [rows]] = await Promise.all([
                pool.execute(`SELECT COUNT(*) AS total FROM Sach${where}`, parameters),
                // mysql2 query safely formats numeric LIMIT/OFFSET placeholders.
                pool.query(`SELECT ${columns} FROM Sach${where} ORDER BY book_id DESC LIMIT ? OFFSET ?`, [...parameters, limit, offset]),
            ]);
            const total = Number(counts[0].total);
            if (!Number.isSafeInteger(total)) throw new Error("Unsupported row count");
            return { books: rows.map(serialize), total };
        },
        async create(data) {
            return transaction(async (connection) => {
                const [result] = await connection.execute(
                    `INSERT INTO Sach (${writable.join(", ")}) VALUES (${writable.map(() => "?").join(", ")})`,
                    writable.map((key) => data[key]),
                );
                return findById(String(result.insertId), connection);
            });
        },
        async replace(id, data) {
            return transaction(async (connection) => {
                if (!await findById(id, connection, true)) return null;
                await connection.execute(`UPDATE Sach SET ${writable.map((key) => `${key} = ?`).join(", ")} WHERE book_id = ?`,
                    [...writable.map((key) => data[key]), id]);
                return findById(id, connection);
            });
        },
        async remove(id) {
            return transaction(async (connection) => {
                if (!await findById(id, connection, true)) return "missing";
                const [copies] = await connection.execute("SELECT copy_id FROM BanSaoSach WHERE book_id = ? LIMIT 1", [id]);
                if (copies.length) return "referenced";
                // RESTRICT remains the final guard against concurrent FK changes.
                await connection.execute("DELETE FROM Sach WHERE book_id = ?", [id]);
                return "deleted";
            });
        },
    };
}
