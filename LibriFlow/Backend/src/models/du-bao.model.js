// Model chỉ đọc; phần lưu bị chặn khi chưa có quyền ghi riêng được phê duyệt.
export function taoMoHinhDuBao(boKetNoi) {
    return {
        async layNguCanh() {
            const [cacDong] = await boKetNoi.query("SELECT DATABASE() AS database_name, @@server_uuid AS server_uuid, DATE_FORMAT(UTC_TIMESTAMP(), '%Y-%m-%dT%H:%i:%sZ') AS observed_at");
            return cacDong[0];
        },
        async timNguoiDung(ma) {
            const [cacDong] = await boKetNoi.execute("SELECT user_id, status, DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') AS created_at FROM NguoiDung WHERE user_id = ?", [ma]);
            return cacDong[0] ?? null;
        },
        async demTheoNgay(ma, batDau, ngayCat) {
            const [cacDong] = await boKetNoi.execute(`SELECT DATE_FORMAT(borrow_date, '%Y-%m-%d') AS day, COUNT(*) AS borrow_count
                FROM PhieuMuon WHERE user_id = ? AND status <> 'cancelled' AND borrow_date >= ? AND borrow_date < ?
                GROUP BY day ORDER BY day LIMIT 28`, [ma, `${batDau} 00:00:00`, `${ngayCat} 00:00:00`]);
            return cacDong.map(dongDuLieu => ({ day: dongDuLieu.day, borrow_count: Number(dongDuLieu.borrow_count) }));
        },
    };
}
