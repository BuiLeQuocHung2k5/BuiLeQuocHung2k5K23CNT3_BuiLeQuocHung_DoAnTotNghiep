const PHAN_KET_NOI_BANG = "FROM PhieuMuon p JOIN ChiTietPhieuMuon d ON d.borrow_id = p.borrow_id";
const DIEU_KIEN_QUA_HAN_MO = "p.status IN ('borrowed', 'partially_returned', 'overdue') AND d.status = 'borrowed' AND d.returned_at IS NULL AND p.due_date < ?";
const CAC_COT_HIEN_THI = `p.borrow_id, p.user_id, d.borrow_detail_id, d.copy_id,
 DATE_FORMAT(p.due_date, '%Y-%m-%d %H:%i:%s') AS due_date,
 CEIL(TIMESTAMPDIFF(SECOND, p.due_date, ?) / 86400) AS days_overdue`;
function chuanHoaBanGhi(dongDuLieu) {
    return { ...dongDuLieu, borrow_id: String(dongDuLieu.borrow_id), user_id: String(dongDuLieu.user_id), borrow_detail_id: String(dongDuLieu.borrow_detail_id), copy_id: String(dongDuLieu.copy_id), days_overdue: Number(dongDuLieu.days_overdue) };
}

export function taoMoHinhQuaHan(boKetNoi) {
    async function layThoiGianHienTai() {
        const [cacDong] = await boKetNoi.query("SELECT DATE_FORMAT(UTC_TIMESTAMP(), '%Y-%m-%d %H:%i:%s') AS as_of");
        return cacDong[0].as_of;
    }
    return {
        async lietKe(truyVan) {
            const thoiDiemTinh = await layThoiGianHienTai(), cacDieuKien = [DIEU_KIEN_QUA_HAN_MO], thamSo = [thoiDiemTinh];
            for (const khoa of ["user_id", "borrow_id"]) if (truyVan[khoa] !== undefined) { cacDieuKien.push(`p.${khoa} = ?`); thamSo.push(truyVan[khoa]); }
            const dieuKienLoc = ` WHERE ${cacDieuKien.join(" AND ")}`;
            // Các cột trả về có tham số thời gian riêng nên không dùng trực tiếp hàm phân trang chung.
            const [[cacSoDem], [cacDong]] = await Promise.all([
                boKetNoi.execute(`SELECT COUNT(*) AS total ${PHAN_KET_NOI_BANG}${dieuKienLoc}`, thamSo),
                boKetNoi.query(`SELECT ${CAC_COT_HIEN_THI} ${PHAN_KET_NOI_BANG}${dieuKienLoc} ORDER BY p.due_date, d.borrow_detail_id LIMIT ? OFFSET ?`, [thoiDiemTinh, ...thamSo, truyVan.limit, truyVan.offset]),
            ]);
            const tongSo = Number(cacSoDem[0].total);
            if (!Number.isSafeInteger(tongSo)) throw new Error("Unsupported row count");
            return { items: cacDong.map(chuanHoaBanGhi), total: tongSo, as_of: thoiDiemTinh };
        },
        async layTheoPhieuMuon(ma, maChuSoHuu = null) {
            const thoiDiemTinh = await layThoiGianHienTai();
            // Một câu JOIN giữ phiếu và các chi tiết trong cùng snapshot đọc.
            const [cacDong] = await boKetNoi.execute(`SELECT p.borrow_id, DATE_FORMAT(p.due_date, '%Y-%m-%d %H:%i:%s') AS due_date, p.status,
                d.borrow_detail_id, d.copy_id, d.status AS detail_status, d.returned_at,
                CEIL(TIMESTAMPDIFF(SECOND, p.due_date, ?) / 86400) AS days_overdue,
                (p.due_date < ?) AS past_due
                FROM PhieuMuon p LEFT JOIN ChiTietPhieuMuon d ON d.borrow_id = p.borrow_id
                WHERE p.borrow_id = ?${maChuSoHuu === null ? "" : " AND p.user_id = ?"} ORDER BY d.borrow_detail_id`, maChuSoHuu === null ? [thoiDiemTinh, thoiDiemTinh, ma] : [thoiDiemTinh, thoiDiemTinh, ma, maChuSoHuu]);
            if (!cacDong.length) return null;
            const dangHoatDong = ["borrowed", "partially_returned", "overdue"].includes(cacDong[0].status);
            const cacChiTiet = cacDong.filter(dongDuLieu => dangHoatDong && Number(dongDuLieu.past_due) === 1 && dongDuLieu.borrow_detail_id !== null && dongDuLieu.detail_status === "borrowed" && dongDuLieu.returned_at === null)
                .map(dongDuLieu => ({ borrow_detail_id: String(dongDuLieu.borrow_detail_id), copy_id: String(dongDuLieu.copy_id), days_overdue: Number(dongDuLieu.days_overdue) }));
            return { borrow_id: String(cacDong[0].borrow_id), due_date: cacDong[0].due_date, status: cacDong[0].status, as_of: thoiDiemTinh, is_overdue: cacChiTiet.length > 0, overdue_count: cacChiTiet.length, details: cacChiTiet };
        },
    };
}
