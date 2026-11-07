import { transaction, paged } from "../utils/catalog-db.js";
import { HttpError } from "../utils/http-error.js";
import { calculateFine } from "../utils/fine-policy.js";

const joins = "FROM Phat f JOIN ChiTietPhieuMuon d ON d.borrow_detail_id = f.borrow_detail_id JOIN PhieuMuon p ON p.borrow_id = d.borrow_id";
const projection = `f.fine_id, f.borrow_detail_id, f.fine_rule_id, f.fine_type, CAST(f.amount AS CHAR) AS amount,
 f.reason, DATE_FORMAT(f.assessed_at, '%Y-%m-%d %H:%i:%s') AS assessed_at, f.payment_status,
 DATE_FORMAT(f.paid_at, '%Y-%m-%d %H:%i:%s') AS paid_at, d.borrow_id, d.copy_id, p.user_id`;
function serialize(row) {
    return { ...row, fine_id: String(row.fine_id), borrow_detail_id: String(row.borrow_detail_id), fine_rule_id: row.fine_rule_id === null ? null : String(row.fine_rule_id), borrow_id: String(row.borrow_id), copy_id: String(row.copy_id), user_id: String(row.user_id), amount: String(row.amount) };
}
function conflict(code, message) { throw new HttpError(409, code, message); }

export function createFineModel(pool) {
    async function findById(id, ownerId = null, connection = pool) {
        const [rows] = await connection.execute(`SELECT ${projection} ${joins} WHERE f.fine_id = ?${ownerId === null ? "" : " AND p.user_id = ?"}`, ownerId === null ? [id] : [id, ownerId]);
        return rows.length ? serialize(rows[0]) : null;
    }
    return {
        findById,
        async list(query) {
            const clauses = [], params = [];
            for (const [key, column] of Object.entries({ user_id: "p.user_id", borrow_id: "p.borrow_id", borrow_detail_id: "f.borrow_detail_id", fine_type: "f.fine_type", payment_status: "f.payment_status" })) {
                if (query[key] !== undefined) { clauses.push(`${column} = ?`); params.push(query[key]); }
            }
            const where = clauses.length ? ` WHERE ${clauses.join(" AND ")}` : "";
            return paged(pool, `SELECT COUNT(*) AS total ${joins}${where}`, `SELECT ${projection} ${joins}${where} ORDER BY f.fine_id DESC LIMIT ? OFFSET ?`, params, query, serialize);
        },
        async create(data) {
            return transaction(pool, async connection => {
                const [initial] = await connection.execute("SELECT borrow_id FROM ChiTietPhieuMuon WHERE borrow_detail_id = ?", [data.borrow_detail_id]);
                if (!initial.length) throw new HttpError(404, "BORROW_DETAIL_NOT_FOUND", "Không tìm thấy chi tiết mượn.");
                // Header -> detail, compatible with return (header -> copies -> details).
                const [headers] = await connection.execute("SELECT borrow_id, status, DATE_FORMAT(due_date, '%Y-%m-%d %H:%i:%s') AS due_date, DATE_FORMAT(borrow_date, '%Y-%m-%d %H:%i:%s') AS borrow_date FROM PhieuMuon WHERE borrow_id = ? FOR SHARE", [String(initial[0].borrow_id)]);
                if (!headers.length) throw new HttpError(404, "BORROW_NOT_FOUND", "Không tìm thấy phiếu mượn.");
                const [details] = await connection.execute(`SELECT borrow_detail_id, borrow_id, status, returned_at, condition_before, condition_after,
                    CAST(TIMESTAMPDIFF(SECOND, CAST(? AS DATETIME), returned_at) AS CHAR) AS late_seconds,
                    (CAST(? AS DATETIME) > CAST(? AS DATETIME) AND returned_at >= CAST(? AS DATETIME) AND returned_at <= UTC_TIMESTAMP()) AS valid_timeline
                    FROM ChiTietPhieuMuon WHERE borrow_detail_id = ? FOR UPDATE`, [headers[0].due_date, headers[0].due_date, headers[0].borrow_date, headers[0].borrow_date, data.borrow_detail_id]);
                if (!details.length || String(details[0].borrow_id) !== String(initial[0].borrow_id)) conflict("FINE_STATE_CONFLICT", "Chi tiết mượn đã thay đổi; hãy kiểm tra lại.");
                const [rules] = await connection.execute("SELECT fine_rule_id, rule_type, CAST(amount AS CHAR) AS amount, unit, is_active FROM QuyDinhPhat WHERE fine_rule_id = ? FOR SHARE", [data.fine_rule_id]);
                if (!rules.length) throw new HttpError(404, "FINE_RULE_NOT_FOUND", "Không tìm thấy quy định phạt; cần cấu hình trước khi sử dụng.");
                const rule = rules[0];
                const amount = calculateFine(rule, details[0], headers[0]);
                // Current locking read sees the latest commit even with REPEATABLE READ.
                // All fine writers must lock this detail first; schema has no UNIQUE(detail,type).
                const [duplicates] = await connection.execute("SELECT fine_id FROM Phat WHERE borrow_detail_id = ? AND fine_type = ? LIMIT 1 FOR UPDATE", [data.borrow_detail_id, rule.rule_type]);
                if (duplicates.length) conflict("DUPLICATE_FINE", "Vi phạm này đã có tiền phạt, kể cả đã thanh toán hoặc được miễn.");
                const [result] = await connection.execute("INSERT INTO Phat (borrow_detail_id, fine_rule_id, fine_type, amount, reason, assessed_at, payment_status) VALUES (?, ?, ?, ?, ?, UTC_TIMESTAMP(), 'unpaid')", [data.borrow_detail_id, data.fine_rule_id, rule.rule_type, amount, data.reason]);
                return findById(String(result.insertId), null, connection);
            });
        },
        async pay(id) {
            return transaction(pool, async connection => {
                const [rows] = await connection.execute("SELECT fine_id, payment_status, paid_at FROM Phat WHERE fine_id = ? FOR UPDATE", [id]);
                if (!rows.length) throw new HttpError(404, "FINE_NOT_FOUND", "Không tìm thấy tiền phạt.");
                if (rows[0].payment_status !== "unpaid" || rows[0].paid_at !== null) conflict("FINE_NOT_PAYABLE", "Tiền phạt đã thanh toán, đã miễn hoặc có dữ liệu thanh toán không nhất quán.");
                await connection.execute("UPDATE Phat SET payment_status = 'paid', paid_at = UTC_TIMESTAMP() WHERE fine_id = ?", [id]);
                return findById(id, null, connection);
            });
        },
    };
}
