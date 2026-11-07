import { HttpError } from "./http-error.js";

export async function transaction(pool, work) {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const result = await work(connection);
        await connection.commit();
        return result;
    } catch (error) {
        try { await connection.rollback(); } catch { /* Preserve original error. */ }
        throw error;
    } finally { connection.release(); }
}

export async function paged(pool, countSql, rowsSql, parameters, query, serialize) {
    const [[counts], [rows]] = await Promise.all([
        pool.execute(countSql, parameters),
        pool.query(rowsSql, [...parameters, query.limit, query.offset]),
    ]);
    const total = Number(counts[0].total);
    if (!Number.isSafeInteger(total)) throw new Error("Unsupported row count");
    return { items: rows.map(serialize), total };
}

export function searchPattern(search) { return `%${search.replace(/[=%_]/g, "=$&")}%`; }

export async function catalogOperation(work, resource) {
    try { return await work(); }
    catch (error) {
        if (error.code === "ER_DUP_ENTRY") throw new HttpError(409, "DUPLICATE_VALUE", resource === "CATEGORY" ? "Tên danh mục đã tồn tại." : "Barcode hoặc ISBN đã tồn tại.");
        if (["ER_NO_REFERENCED_ROW", "ER_NO_REFERENCED_ROW_2"].includes(error.code)) throw new HttpError(400, "INVALID_REFERENCE", "Sách được tham chiếu không tồn tại.");
        if (["ER_ROW_IS_REFERENCED", "ER_ROW_IS_REFERENCED_2"].includes(error.code)) throw new HttpError(409, `${resource}_IN_USE`, "Bản ghi có dữ liệu liên quan nên không thể xóa.");
        throw error;
    }
}
