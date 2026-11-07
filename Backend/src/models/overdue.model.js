const joins = "FROM PhieuMuon p JOIN ChiTietPhieuMuon d ON d.borrow_id = p.borrow_id";
const openLate = "p.status IN ('borrowed', 'partially_returned', 'overdue') AND d.status = 'borrowed' AND d.returned_at IS NULL AND p.due_date < ?";
const projection = `p.borrow_id, p.user_id, d.borrow_detail_id, d.copy_id,
 DATE_FORMAT(p.due_date, '%Y-%m-%d %H:%i:%s') AS due_date,
 CEIL(TIMESTAMPDIFF(SECOND, p.due_date, ?) / 86400) AS days_overdue`;
function serialize(row) {
    return { ...row, borrow_id: String(row.borrow_id), user_id: String(row.user_id), borrow_detail_id: String(row.borrow_detail_id), copy_id: String(row.copy_id), days_overdue: Number(row.days_overdue) };
}

export function createOverdueModel(pool) {
    async function clock() {
        const [rows] = await pool.query("SELECT DATE_FORMAT(UTC_TIMESTAMP(), '%Y-%m-%d %H:%i:%s') AS as_of");
        return rows[0].as_of;
    }
    return {
        async list(query) {
            const asOf = await clock(), clauses = [openLate], params = [asOf];
            for (const key of ["user_id", "borrow_id"]) if (query[key] !== undefined) { clauses.push(`p.${key} = ?`); params.push(query[key]); }
            const where = ` WHERE ${clauses.join(" AND ")}`;
            // Projection has its own clock parameter, so this list cannot use the shared paged helper.
            const [[counts], [rows]] = await Promise.all([
                pool.execute(`SELECT COUNT(*) AS total ${joins}${where}`, params),
                pool.query(`SELECT ${projection} ${joins}${where} ORDER BY p.due_date, d.borrow_detail_id LIMIT ? OFFSET ?`, [asOf, ...params, query.limit, query.offset]),
            ]);
            const total = Number(counts[0].total);
            if (!Number.isSafeInteger(total)) throw new Error("Unsupported row count");
            return { items: rows.map(serialize), total, as_of: asOf };
        },
        async findByBorrow(id, ownerId = null) {
            const asOf = await clock();
            // Single joined statement keeps header and detail membership in one read snapshot.
            const [rows] = await pool.execute(`SELECT p.borrow_id, DATE_FORMAT(p.due_date, '%Y-%m-%d %H:%i:%s') AS due_date, p.status,
                d.borrow_detail_id, d.copy_id, d.status AS detail_status, d.returned_at,
                CEIL(TIMESTAMPDIFF(SECOND, p.due_date, ?) / 86400) AS days_overdue,
                (p.due_date < ?) AS past_due
                FROM PhieuMuon p LEFT JOIN ChiTietPhieuMuon d ON d.borrow_id = p.borrow_id
                WHERE p.borrow_id = ?${ownerId === null ? "" : " AND p.user_id = ?"} ORDER BY d.borrow_detail_id`, ownerId === null ? [asOf, asOf, id] : [asOf, asOf, id, ownerId]);
            if (!rows.length) return null;
            const active = ["borrowed", "partially_returned", "overdue"].includes(rows[0].status);
            const details = rows.filter(row => active && Number(row.past_due) === 1 && row.borrow_detail_id !== null && row.detail_status === "borrowed" && row.returned_at === null)
                .map(row => ({ borrow_detail_id: String(row.borrow_detail_id), copy_id: String(row.copy_id), days_overdue: Number(row.days_overdue) }));
            return { borrow_id: String(rows[0].borrow_id), due_date: rows[0].due_date, status: rows[0].status, as_of: asOf, is_overdue: details.length > 0, overdue_count: details.length, details };
        },
    };
}
