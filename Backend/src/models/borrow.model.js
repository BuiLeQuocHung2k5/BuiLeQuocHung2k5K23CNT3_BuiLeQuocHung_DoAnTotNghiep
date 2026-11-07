import { transaction, paged } from "../utils/catalog-db.js";
import { HttpError } from "../utils/http-error.js";
import { maxCopiesPerBorrow } from "../utils/borrow-validation.js";
import { createUsageHistoryModel } from "./usage-history.model.js";
import { createUsageHistoryService } from "../services/usage-history.service.js";

// New circulation timestamps are UTC DATETIME. Format in SQL to avoid driver TZ conversion.
const header = `p.borrow_id, p.user_id, DATE_FORMAT(p.borrow_date, '%Y-%m-%d %H:%i:%s') AS borrow_date,
 DATE_FORMAT(p.due_date, '%Y-%m-%d %H:%i:%s') AS due_date, p.status, p.note,
 DATE_FORMAT(p.created_at, '%Y-%m-%d %H:%i:%s') AS created_at`;
const detail = "borrow_detail_id, borrow_id, copy_id, returned_at, condition_before, condition_after, status";
const orderIds = ids => [...new Set(ids.map(String))].sort((a, b) => BigInt(a) < BigInt(b) ? -1 : BigInt(a) > BigInt(b) ? 1 : 0);
function conflict(code, message) { throw new HttpError(409, code, message); }
function serializeHeader(row) {
    return { borrow_id: String(row.borrow_id), user_id: String(row.user_id), borrow_date: row.borrow_date, due_date: row.due_date, status: row.status, note: row.note, created_at: row.created_at };
}

export function createBorrowModel(pool) {
    const usage = createUsageHistoryService(createUsageHistoryModel(pool));
    async function findById(id, ownerId = null, connection = pool) {
        const params = [id];
        if (ownerId !== null) params.push(ownerId);
        const [rows] = await connection.execute(`SELECT ${header}, d.borrow_detail_id, d.copy_id,
            DATE_FORMAT(d.returned_at, '%Y-%m-%d %H:%i:%s') AS returned_at,
            d.condition_before, d.condition_after, d.status AS detail_status
            FROM PhieuMuon p LEFT JOIN ChiTietPhieuMuon d ON d.borrow_id = p.borrow_id
            WHERE p.borrow_id = ?${ownerId !== null ? " AND p.user_id = ?" : ""} ORDER BY d.borrow_detail_id`, params);
        if (!rows.length) return null;
        return { ...serializeHeader(rows[0]), details: rows.filter(row => row.borrow_detail_id !== null).map(row => ({
            borrow_detail_id: String(row.borrow_detail_id), copy_id: String(row.copy_id), returned_at: row.returned_at,
            condition_before: row.condition_before, condition_after: row.condition_after, status: row.detail_status,
        })) };
    }
    async function lockCopies(connection, ids) {
        const copies = new Map();
        for (const id of orderIds(ids)) {
            const [rows] = await connection.execute("SELECT copy_id, condition_status, availability_status FROM BanSaoSach WHERE copy_id = ? FOR UPDATE", [id]);
            if (!rows.length) throw new HttpError(404, "COPY_NOT_FOUND", "Không tìm thấy một bản sao được yêu cầu.");
            copies.set(id, rows[0]);
        }
        return copies;
    }
    return {
        findById,
        async list(query) {
            const clauses = [], params = [];
            for (const field of ["user_id", "status"]) if (query[field] !== undefined) { clauses.push(`p.${field} = ?`); params.push(query[field]); }
            const where = clauses.length ? ` WHERE ${clauses.join(" AND ")}` : "";
            return paged(pool, `SELECT COUNT(*) AS total FROM PhieuMuon p${where}`, `SELECT ${header} FROM PhieuMuon p${where} ORDER BY p.borrow_id DESC LIMIT ? OFFSET ?`, params, query, serializeHeader);
        },
        async create(data) {
            return transaction(pool, async connection => {
                const [users] = await connection.execute("SELECT user_id, status FROM NguoiDung WHERE user_id = ? FOR SHARE", [data.user_id]);
                if (!users.length) throw new HttpError(404, "BORROWER_NOT_FOUND", "Không tìm thấy người mượn.");
                if (users[0].status !== "active") conflict("BORROWER_INACTIVE", "Người mượn không có trạng thái active.");
                const copies = await lockCopies(connection, data.copy_ids);
                for (const [id, copy] of copies) {
                    if (copy.availability_status !== "available" || copy.condition_status !== "good") conflict("COPY_NOT_BORROWABLE", "Bản sao không sẵn sàng hoặc không ở tình trạng good.");
                    const [open] = await connection.execute("SELECT borrow_detail_id FROM ChiTietPhieuMuon WHERE copy_id = ? AND (returned_at IS NULL OR status <> 'returned') LIMIT 1 FOR UPDATE", [id]);
                    if (open.length) conflict("COPY_HAS_OPEN_LOAN", "Bản sao có lượt mượn chưa hoàn tất.");
                }
                const [clock] = await connection.execute("SELECT (CAST(? AS DATETIME) > UTC_TIMESTAMP()) AS valid_due_date", [data.due_date]);
                if (Number(clock[0].valid_due_date) !== 1) throw new HttpError(400, "INVALID_DUE_DATE", "Ngày hẹn trả đã hết hiệu lực theo giờ database.");
                const [result] = await connection.execute("INSERT INTO PhieuMuon (user_id, borrow_date, due_date, status, note, created_at) VALUES (?, UTC_TIMESTAMP(), ?, 'borrowed', ?, UTC_TIMESTAMP())", [data.user_id, data.due_date, data.note]);
                const id = String(result.insertId);
                for (const [copyId, copy] of copies) {
                    await connection.execute("INSERT INTO ChiTietPhieuMuon (borrow_id, copy_id, condition_before, status) VALUES (?, ?, ?, 'borrowed')", [id, copyId, copy.condition_status]);
                    await connection.execute("UPDATE BanSaoSach SET availability_status = 'borrowed' WHERE copy_id = ?", [copyId]);
                }
                for (const copyId of copies.keys()) await usage.record({ user_id: data.user_id, copy_id: copyId, action_type: "borrow", borrow_id: id }, connection);
                return findById(id, null, connection);
            });
        },
        async returnCopies(id, data) {
            return transaction(pool, async connection => {
                const [headers] = await connection.execute("SELECT borrow_id, user_id, status FROM PhieuMuon WHERE borrow_id = ? FOR UPDATE", [id]);
                if (!headers.length) throw new HttpError(404, "BORROW_NOT_FOUND", "Không tìm thấy phiếu mượn.");
                if (!["borrowed", "partially_returned", "overdue"].includes(headers[0].status)) conflict("BORROW_NOT_RETURNABLE", "Phiếu đã hoàn tất hoặc bị hủy, không thể trả.");
                // Header -> copies in numeric order -> details, compatible with copy admin locks.
                const [initial] = await connection.execute(`SELECT ${detail} FROM ChiTietPhieuMuon WHERE borrow_id = ?`, [id]);
                if (!initial.length || initial.length > maxCopiesPerBorrow || new Set(initial.map(row => String(row.copy_id))).size !== initial.length) conflict("BORROW_REQUIRES_REVIEW", "Chi tiết phiếu trống, trùng hoặc vượt giới hạn; cần kiểm tra riêng.");
                const copies = await lockCopies(connection, initial.map(row => String(row.copy_id)));
                const [rows] = await connection.execute(`SELECT ${detail} FROM ChiTietPhieuMuon WHERE borrow_id = ? ORDER BY copy_id FOR UPDATE`, [id]);
                const fingerprint = values => values.map(row => `${row.borrow_detail_id}:${row.copy_id}`).sort().join(",");
                if (fingerprint(initial) !== fingerprint(rows)) conflict("BORROW_CHANGED", "Chi tiết phiếu đã thay đổi; hãy tải lại.");
                if (rows.some(row => (row.status === "returned") !== (row.returned_at !== null))) conflict("RETURN_STATE_CONFLICT", "Trạng thái chi tiết và thời gian trả không nhất quán; cần kiểm tra riêng.");
                const requested = data.return_all ? rows.filter(row => row.status !== "returned").map(row => ({ copy_id: String(row.copy_id), condition_after: data.condition_after })) : data.items;
                if (!requested.length) conflict("ALREADY_RETURNED", "Không còn bản sao cần trả.");
                const details = new Map(rows.map(row => [String(row.copy_id), row]));
                for (const item of requested) {
                    const row = details.get(item.copy_id);
                    if (!row) throw new HttpError(400, "COPY_NOT_IN_BORROW", "Bản sao không thuộc phiếu mượn này.");
                    if (row.status === "returned" || row.returned_at !== null) conflict("ALREADY_RETURNED", "Bản sao đã trả hoặc có dữ liệu trả không nhất quán.");
                    if (row.status !== "borrowed" || copies.get(item.copy_id).availability_status !== "borrowed") conflict("RETURN_STATE_CONFLICT", "Trạng thái lưu thông không nhất quán hoặc liên quan bản sao mất; cần kiểm tra riêng.");
                    const [open] = await connection.execute("SELECT borrow_detail_id, borrow_id FROM ChiTietPhieuMuon WHERE copy_id = ? AND (returned_at IS NULL OR status <> 'returned') FOR UPDATE", [item.copy_id]);
                    if (open.length !== 1 || String(open[0].borrow_detail_id) !== String(row.borrow_detail_id) || String(open[0].borrow_id) !== id) conflict("RETURN_STATE_CONFLICT", "Bản sao có lịch sử mượn đang mở không nhất quán; cần kiểm tra riêng.");
                }
                // Validate the whole batch before the first write.
                for (const item of requested) {
                    await connection.execute("UPDATE ChiTietPhieuMuon SET returned_at = UTC_TIMESTAMP(), condition_after = ?, status = 'returned' WHERE borrow_detail_id = ?", [item.condition_after, String(details.get(item.copy_id).borrow_detail_id)]);
                    await connection.execute("UPDATE BanSaoSach SET condition_status = ?, availability_status = ? WHERE copy_id = ?", [item.condition_after, item.condition_after === "damaged" ? "maintenance" : "available", item.copy_id]);
                }
                const returned = new Set(requested.map(item => item.copy_id));
                const complete = rows.every(row => returned.has(String(row.copy_id)) || row.status === "returned" && row.returned_at !== null);
                await connection.execute("UPDATE PhieuMuon SET status = ? WHERE borrow_id = ?", [complete ? "returned" : "partially_returned", id]);
                for (const item of requested) await usage.record({ user_id: String(headers[0].user_id), copy_id: item.copy_id, action_type: "return", borrow_id: id }, connection);
                return findById(id, null, connection);
            });
        },
    };
}
