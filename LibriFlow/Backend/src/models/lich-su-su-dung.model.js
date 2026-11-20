import { truyVanPhanTrang } from "../utils/truy-van-danh-muc.js";

export function taoMoHinhLichSuSuDung(boKetNoi) {
    return {
        async ghiNhan(suKien, ketNoi = boKetNoi) {
            await ketNoi.execute("INSERT INTO LichSuSuDung (user_id, copy_id, action_type, action_date, details) VALUES (?, ?, ?, UTC_TIMESTAMP(), ?)", [suKien.user_id, suKien.copy_id, suKien.action_type, suKien.details]);
        },
        async lietKe(truyVan) {
            const cacDieuKien = ["l.action_date >= ?", "l.action_date < ?", "l.action_type IN ('login','borrow','return')"], thamSo = [truyVan.from, truyVan.until];
            for (const khoa of ["user_id", "action_type"]) if (truyVan[khoa] !== undefined) { cacDieuKien.push(`l.${khoa} = ?`); thamSo.push(truyVan[khoa]); }
            const dieuKienLoc = ` WHERE ${cacDieuKien.join(" AND ")}`;
            // Không SELECT JSON details cũ vì có thể chứa dữ liệu riêng tư hoặc chưa được kiểm tra.
            return truyVanPhanTrang(boKetNoi, `SELECT COUNT(*) AS total FROM LichSuSuDung l${dieuKienLoc}`, `SELECT l.usage_id, l.user_id, l.copy_id, l.action_type,
                DATE_FORMAT(l.action_date, '%Y-%m-%d %H:%i:%s') AS action_date FROM LichSuSuDung l${dieuKienLoc}
                ORDER BY l.action_date DESC, l.usage_id DESC LIMIT ? OFFSET ?`, thamSo, truyVan, dongDuLieu => ({
                usage_id: String(dongDuLieu.usage_id), user_id: String(dongDuLieu.user_id), copy_id: dongDuLieu.copy_id === null ? null : String(dongDuLieu.copy_id), action_type: dongDuLieu.action_type, action_date: dongDuLieu.action_date,
            }));
        },
    };
}
