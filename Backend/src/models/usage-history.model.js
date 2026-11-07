import { paged } from "../utils/catalog-db.js";

export function createUsageHistoryModel(pool) {
    return {
        async record(event, connection = pool) {
            await connection.execute("INSERT INTO LichSuSuDung (user_id, copy_id, action_type, action_date, details) VALUES (?, ?, ?, UTC_TIMESTAMP(), ?)", [event.user_id, event.copy_id, event.action_type, event.details]);
        },
        async list(query) {
            const clauses = ["l.action_date >= ?", "l.action_date < ?", "l.action_type IN ('login','borrow','return')"], params = [query.from, query.until];
            for (const key of ["user_id", "action_type"]) if (query[key] !== undefined) { clauses.push(`l.${key} = ?`); params.push(query[key]); }
            const where = ` WHERE ${clauses.join(" AND ")}`;
            // Do not SELECT legacy details JSON: it may contain private or unvalidated data.
            return paged(pool, `SELECT COUNT(*) AS total FROM LichSuSuDung l${where}`, `SELECT l.usage_id, l.user_id, l.copy_id, l.action_type,
                DATE_FORMAT(l.action_date, '%Y-%m-%d %H:%i:%s') AS action_date FROM LichSuSuDung l${where}
                ORDER BY l.action_date DESC, l.usage_id DESC LIMIT ? OFFSET ?`, params, query, row => ({
                usage_id: String(row.usage_id), user_id: String(row.user_id), copy_id: row.copy_id === null ? null : String(row.copy_id), action_type: row.action_type, action_date: row.action_date,
            }));
        },
    };
}
