import { taoMauTimKiem, thucHienGiaoDich } from '../utils/truy-van-danh-muc.js';
import { PHIEN_BAN_MO_HINH_DU_BAO as phienBan } from '../utils/thuat-toan-du-bao.js';
import { LoiHttp } from '../utils/loi-http.js';
export function taoMoHinhDuBao(boKetNoi) {
    return {
        async traCuu(tuKhoa) {
            const mau = taoMauTimKiem(tuKhoa);
            const [rows] = await boKetNoi.execute(`SELECT u.user_id,u.name,GROUP_CONCAT(r.name ORDER BY r.name) roles
                FROM NguoiDung u LEFT JOIN NguoiDung_VaiTro ur USING(user_id) LEFT JOIN VaiTro r USING(role_id)
                WHERE u.name LIKE ? ESCAPE '=' OR u.email LIKE ? ESCAPE '='
                GROUP BY u.user_id ORDER BY u.name,u.user_id LIMIT 20`, [mau,mau]);
            return rows.map(r => ({ ...r, user_id: String(r.user_id), roles: r.roles?.split(',') ?? [] }));
        },
        async lichSu(ma, ngay) {
            if (ngay) {
                const [rows] = await boKetNoi.execute(`SELECT DATE_FORMAT(forecast_date,'%Y-%m-%d') forecast_date,predicted_count
                    FROM DuBaoTanSuat WHERE user_id=? AND model_version=? AND DATE(created_at)=? ORDER BY forecast_date`, [ma,phienBan,ngay]);
                return rows;
            }
            const [rows] = await boKetNoi.execute(`SELECT DATE_FORMAT(created_at,'%Y-%m-%d') cutoff_date,
                DATE_FORMAT(MIN(created_at),'%Y-%m-%dT%H:%i:%sZ') created_at FROM DuBaoTanSuat
                WHERE user_id=? AND model_version=? GROUP BY cutoff_date ORDER BY cutoff_date DESC LIMIT 100`, [ma,phienBan]);
            return rows;
        },
        async luu(ma, tinh) {
            return thucHienGiaoDich(boKetNoi, async db => {
                await db.execute('SELECT user_id FROM NguoiDung WHERE user_id=? FOR UPDATE',[ma]);
                const model = taoMoHinhDuBao(db);
                const preview = await tinh(model);
                if (preview.status !== 'ready') throw new LoiHttp(409,'INSUFFICIENT_DATA','Chưa đủ dữ liệu để lưu.');
                const cu = await model.lichSu(ma,preview.cutoff_date);
                if (cu.length) return { cutoff_date: preview.cutoff_date, created: false };
                for (const diem of preview.predictions) {
                    const [r] = await db.execute(`INSERT INTO DuBaoTanSuat(user_id,forecast_date,predicted_count,model_version,created_at)
                        SELECT ?,?,?,?,UTC_TIMESTAMP() WHERE UTC_DATE()=?`,[ma,diem.forecast_date,diem.predicted_count,phienBan,preview.cutoff_date]);
                    if (!r.affectedRows) throw new LoiHttp(409,'CUTOFF_CHANGED','Ngày UTC đã đổi. Vui lòng tải lại.');
                }
                return { cutoff_date: preview.cutoff_date, created: true };
            });
        },
        async layNguCanh() {
            const [cacDong] = await boKetNoi.query("SELECT DATABASE() AS database_name, @@server_uuid AS server_uuid, DATE_FORMAT(UTC_TIMESTAMP(), '%Y-%m-%dT%H:%i:%sZ') AS observed_at");
            return cacDong[0];
        },
        async timNguoiDung(ma) {
            const [cacDong] = await boKetNoi.execute("SELECT user_id, name, status, DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') AS created_at FROM NguoiDung WHERE user_id = ?", [ma]);
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
