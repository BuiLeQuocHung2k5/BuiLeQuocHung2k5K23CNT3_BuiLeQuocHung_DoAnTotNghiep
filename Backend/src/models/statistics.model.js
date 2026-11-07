import { paged } from "../utils/catalog-db.js";

// Only structured events emitted by this API version contribute to activity metrics.
const trustedEvents = `l.action_type IN ('login','borrow','return')
 AND JSON_UNQUOTE(JSON_EXTRACT(l.details, '$.source')) = 'libriflow-api'
 AND JSON_EXTRACT(l.details, '$.version') = 1`;
const buckets = {
    day: "DATE_FORMAT(p.borrow_date, '%Y-%m-%d')",
    week: "DATE_FORMAT(DATE_SUB(DATE(p.borrow_date), INTERVAL WEEKDAY(p.borrow_date) DAY), '%Y-%m-%d')",
    month: "DATE_FORMAT(p.borrow_date, '%Y-%m')",
};
function count(value) {
    const number = Number(value);
    if (!Number.isSafeInteger(number) || number < 0) throw new Error("Unsupported aggregate count");
    return number;
}
function counts(row) { return Object.fromEntries(Object.entries(row).map(([key, value]) => [key, count(value)])); }

export function createStatisticsModel(pool) {
    return {
        async overview(query) {
            const [rows] = await pool.execute(`SELECT
                (SELECT COUNT(*) FROM Sach) AS books_total,
                (SELECT COUNT(*) FROM BanSaoSach) AS copies_total,
                (SELECT COUNT(*) FROM NguoiDung) AS users_total,
                (SELECT COUNT(*) FROM PhieuMuon WHERE status <> 'cancelled') AS borrows_total,
                (SELECT COUNT(*) FROM PhieuMuon WHERE status <> 'cancelled' AND borrow_date >= ? AND borrow_date < ?) AS borrows_in_period,
                (SELECT COUNT(*) FROM ChiTietPhieuMuon d JOIN PhieuMuon p ON p.borrow_id = d.borrow_id
                    WHERE p.status <> 'cancelled' AND p.borrow_date >= ? AND p.borrow_date < ?) AS borrowed_copies_in_period,
                (SELECT COUNT(*) FROM ChiTietPhieuMuon WHERE status = 'returned' AND returned_at >= ? AND returned_at < ?) AS returned_copies_in_period`, [query.from, query.until, query.from, query.until, query.from, query.until]);
            return counts(rows[0]);
        },
        async borrows(query) {
            const params = [query.from, query.until];
            if (query.user_id !== undefined) params.push(query.user_id);
            // group_by is mapped to a fixed expression; never interpolate client SQL.
            const [rows] = await pool.execute(`SELECT ${buckets[query.group_by]} AS period_start, COUNT(DISTINCT p.borrow_id) AS borrow_count,
                COUNT(d.borrow_detail_id) AS borrowed_copy_count FROM PhieuMuon p LEFT JOIN ChiTietPhieuMuon d ON d.borrow_id = p.borrow_id
                WHERE p.status <> 'cancelled' AND p.borrow_date >= ? AND p.borrow_date < ?${query.user_id === undefined ? "" : " AND p.user_id = ?"}
                GROUP BY period_start ORDER BY period_start LIMIT 400`, params);
            return rows.map(row => ({ period_start: row.period_start, borrow_count: count(row.borrow_count), borrowed_copy_count: count(row.borrowed_copy_count) }));
        },
        async users(query) {
            const sources = `FROM NguoiDung u
                LEFT JOIN (SELECT user_id, COUNT(*) AS borrow_count FROM PhieuMuon
                    WHERE status <> 'cancelled' AND borrow_date >= ? AND borrow_date < ? GROUP BY user_id) b ON b.user_id = u.user_id
                LEFT JOIN (SELECT l.user_id, COUNT(*) AS usage_event_count, COUNT(DISTINCT DATE(l.action_date)) AS active_days,
                    SUM(l.action_type = 'login') AS login_count, SUM(l.action_type = 'borrow') AS borrow_copy_events,
                    SUM(l.action_type = 'return') AS return_copy_events FROM LichSuSuDung l
                    WHERE l.action_date >= ? AND l.action_date < ? AND ${trustedEvents} GROUP BY l.user_id) a ON a.user_id = u.user_id
                WHERE (b.user_id IS NOT NULL OR a.user_id IS NOT NULL)${query.user_id === undefined ? "" : " AND u.user_id = ?"}`;
            const params = [query.from, query.until, query.from, query.until];
            if (query.user_id !== undefined) params.push(query.user_id);
            return paged(pool, `SELECT COUNT(*) AS total ${sources}`, `SELECT u.user_id, COALESCE(b.borrow_count, 0) AS borrow_count,
                COALESCE(a.usage_event_count, 0) AS usage_event_count, COALESCE(a.active_days, 0) AS active_days,
                COALESCE(a.login_count, 0) AS login_count, COALESCE(a.borrow_copy_events, 0) AS borrow_copy_events,
                COALESCE(a.return_copy_events, 0) AS return_copy_events ${sources}
                ORDER BY borrow_count DESC, u.user_id LIMIT ? OFFSET ?`, params, query, row => {
                const { user_id, ...aggregates } = row;
                return { user_id: String(user_id), ...counts(aggregates) };
            });
        },
    };
}
