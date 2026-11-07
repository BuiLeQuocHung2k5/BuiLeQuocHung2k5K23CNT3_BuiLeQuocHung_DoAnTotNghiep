import { truyVanPhanTrang } from "../utils/truy-van-danh-muc.js";

// Chỉ sự kiện có cấu trúc do phiên bản API này ghi mới tham gia thống kê hoạt động.
const DIEU_KIEN_SU_KIEN_TIN_CAY = `l.action_type IN ('login','borrow','return')
 AND JSON_UNQUOTE(JSON_EXTRACT(l.details, '$.source')) = 'libriflow-api'
 AND JSON_EXTRACT(l.details, '$.version') = 1`;
const CAC_NHOM_THOI_GIAN = {
    day: "DATE_FORMAT(p.borrow_date, '%Y-%m-%d')",
    week: "DATE_FORMAT(DATE_SUB(DATE(p.borrow_date), INTERVAL WEEKDAY(p.borrow_date) DAY), '%Y-%m-%d')",
    month: "DATE_FORMAT(p.borrow_date, '%Y-%m')",
};
function chuanHoaSoDem(giaTri) {
    const giaTriSo = Number(giaTri);
    if (!Number.isSafeInteger(giaTriSo) || giaTriSo < 0) throw new Error("Unsupported aggregate count");
    return giaTriSo;
}
function chuanHoaCacSoDem(dongDuLieu) { return Object.fromEntries(Object.entries(dongDuLieu).map(([khoa, giaTri]) => [khoa, chuanHoaSoDem(giaTri)])); }

export function taoMoHinhThongKe(boKetNoi) {
    return {
        async layTongQuan(truyVan) {
            const [cacDong] = await boKetNoi.execute(`SELECT
                (SELECT COUNT(*) FROM Sach) AS books_total,
                (SELECT COUNT(*) FROM BanSaoSach) AS copies_total,
                (SELECT COUNT(*) FROM NguoiDung) AS users_total,
                (SELECT COUNT(*) FROM PhieuMuon WHERE status <> 'cancelled') AS borrows_total,
                (SELECT COUNT(*) FROM PhieuMuon WHERE status <> 'cancelled' AND borrow_date >= ? AND borrow_date < ?) AS borrows_in_period,
                (SELECT COUNT(*) FROM ChiTietPhieuMuon d JOIN PhieuMuon p ON p.borrow_id = d.borrow_id
                    WHERE p.status <> 'cancelled' AND p.borrow_date >= ? AND p.borrow_date < ?) AS borrowed_copies_in_period,
                (SELECT COUNT(*) FROM ChiTietPhieuMuon WHERE status = 'returned' AND returned_at >= ? AND returned_at < ?) AS returned_copies_in_period`, [truyVan.from, truyVan.until, truyVan.from, truyVan.until, truyVan.from, truyVan.until]);
            return chuanHoaCacSoDem(cacDong[0]);
        },
        async thongKePhieuMuon(truyVan) {
            const thamSo = [truyVan.from, truyVan.until];
            if (truyVan.user_id !== undefined) thamSo.push(truyVan.user_id);
            // Ánh xạ group_by sang biểu thức cố định; không nội suy SQL do client cung cấp.
            const [cacDong] = await boKetNoi.execute(`SELECT ${CAC_NHOM_THOI_GIAN[truyVan.group_by]} AS period_start, COUNT(DISTINCT p.borrow_id) AS borrow_count,
                COUNT(d.borrow_detail_id) AS borrowed_copy_count FROM PhieuMuon p LEFT JOIN ChiTietPhieuMuon d ON d.borrow_id = p.borrow_id
                WHERE p.status <> 'cancelled' AND p.borrow_date >= ? AND p.borrow_date < ?${truyVan.user_id === undefined ? "" : " AND p.user_id = ?"}
                GROUP BY period_start ORDER BY period_start LIMIT 400`, thamSo);
            return cacDong.map(dongDuLieu => ({ period_start: dongDuLieu.period_start, borrow_count: chuanHoaSoDem(dongDuLieu.borrow_count), borrowed_copy_count: chuanHoaSoDem(dongDuLieu.borrowed_copy_count) }));
        },
        async thongKeNguoiDung(truyVan) {
            const cacNguon = `FROM NguoiDung u
                LEFT JOIN (SELECT user_id, COUNT(*) AS borrow_count FROM PhieuMuon
                    WHERE status <> 'cancelled' AND borrow_date >= ? AND borrow_date < ? GROUP BY user_id) b ON b.user_id = u.user_id
                LEFT JOIN (SELECT l.user_id, COUNT(*) AS usage_event_count, COUNT(DISTINCT DATE(l.action_date)) AS active_days,
                    SUM(l.action_type = 'login') AS login_count, SUM(l.action_type = 'borrow') AS borrow_copy_events,
                    SUM(l.action_type = 'return') AS return_copy_events FROM LichSuSuDung l
                    WHERE l.action_date >= ? AND l.action_date < ? AND ${DIEU_KIEN_SU_KIEN_TIN_CAY} GROUP BY l.user_id) a ON a.user_id = u.user_id
                WHERE (b.user_id IS NOT NULL OR a.user_id IS NOT NULL)${truyVan.user_id === undefined ? "" : " AND u.user_id = ?"}`;
            const thamSo = [truyVan.from, truyVan.until, truyVan.from, truyVan.until];
            if (truyVan.user_id !== undefined) thamSo.push(truyVan.user_id);
            return truyVanPhanTrang(boKetNoi, `SELECT COUNT(*) AS total ${cacNguon}`, `SELECT u.user_id, COALESCE(b.borrow_count, 0) AS borrow_count,
                COALESCE(a.usage_event_count, 0) AS usage_event_count, COALESCE(a.active_days, 0) AS active_days,
                COALESCE(a.login_count, 0) AS login_count, COALESCE(a.borrow_copy_events, 0) AS borrow_copy_events,
                COALESCE(a.return_copy_events, 0) AS return_copy_events ${cacNguon}
                ORDER BY borrow_count DESC, u.user_id LIMIT ? OFFSET ?`, thamSo, truyVan, dongDuLieu => {
                const { user_id: maNguoiDung, ...cacChiSo } = dongDuLieu;
                return { user_id: String(maNguoiDung), ...chuanHoaCacSoDem(cacChiSo) };
            });
        },
    };
}
