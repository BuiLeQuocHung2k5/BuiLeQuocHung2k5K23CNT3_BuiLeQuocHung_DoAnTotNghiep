import { LoiHttp } from "../utils/loi-http.js";
import { taoMoHinhLichSuSuDung } from "./lich-su-su-dung.model.js";
import { taoDichVuLichSuSuDung } from "../services/lich-su-su-dung.service.js";

export function taoMoHinhXacThuc(boKetNoi) {
    const lichSuSuDung = taoDichVuLichSuSuDung(taoMoHinhLichSuSuDung(boKetNoi));
    async function layNguoiDungXacThuc(ma, ketNoi = boKetNoi) {
        const [cacDong] = await ketNoi.execute(
            `SELECT u.user_id, u.name, u.email, u.phone, u.avatar, u.status, u.created_at, u.updated_at,
                    r.name AS role_name, p.name AS permission_name
             FROM NguoiDung u
             LEFT JOIN NguoiDung_VaiTro ur ON ur.user_id = u.user_id
             LEFT JOIN VaiTro r ON r.role_id = ur.role_id
             LEFT JOIN VaiTro_QuyenHan rp ON rp.role_id = r.role_id
             LEFT JOIN QuyenHan p ON p.permission_id = rp.permission_id
             WHERE u.user_id = ?`, [ma]);
        if (!cacDong.length) return null;
        const { role_name: tenVaiTro, permission_name: tenQuyen, ...nguoiDung } = cacDong[0];
        return { ...nguoiDung, user_id: String(nguoiDung.user_id), roles: [...new Set(cacDong.map(dongDuLieu => dongDuLieu.role_name).filter(Boolean))], permissions: [...new Set(cacDong.map(dongDuLieu => dongDuLieu.permission_name).filter(Boolean))] };
    }
    return {
        layNguoiDungXacThuc: layNguoiDungXacThuc,
        async ghiNhanDangNhap(ma) { await lichSuSuDung.ghiNhan({ user_id: ma, copy_id: null, action_type: "login" }); },
        async layThongTinDangNhap(thuDienTu) {
            const [cacDong] = await boKetNoi.execute("SELECT user_id, password, status FROM NguoiDung WHERE email = ? LIMIT 1", [thuDienTu]);
            return cacDong[0] ?? null;
        },
        async dangKyDocGia(duLieu, maBamMatKhau) {
            const ketNoi = await boKetNoi.getConnection();
            try {
                await ketNoi.beginTransaction();
                // Seed xác định vai trò reader; không tự tạo vai trò hoặc chuyển sang admin.
                const [cacVaiTro] = await ketNoi.execute("SELECT role_id, name FROM VaiTro WHERE name = ? FOR SHARE", ["reader"]);
                if (cacVaiTro.length !== 1 || cacVaiTro[0].name !== "reader") {
                    throw new LoiHttp(503, "REGISTRATION_NOT_CONFIGURED", "Chưa có vai trò reader đúng seed; đăng ký tạm dừng.");
                }
                const [ketQua] = await ketNoi.execute(
                    "INSERT INTO NguoiDung (name, email, password, phone, status) VALUES (?, ?, ?, ?, ?)",
                    [duLieu.name, duLieu.email, maBamMatKhau, duLieu.phone, "active"]);
                const ma = String(ketQua.insertId);
                await ketNoi.execute("INSERT INTO NguoiDung_VaiTro (user_id, role_id) VALUES (?, ?)", [ma, String(cacVaiTro[0].role_id)]);
                const nguoiDung = await layNguoiDungXacThuc(ma, ketNoi);
                await ketNoi.commit();
                return nguoiDung;
            } catch (loi) {
                try { await ketNoi.rollback(); } catch { /* Giữ nguyên lỗi ban đầu. */ }
                if (loi.code === "ER_DUP_ENTRY") throw new LoiHttp(409, "EMAIL_ALREADY_EXISTS", "Email đã được sử dụng.");
                throw loi;
            } finally { ketNoi.release(); }
        },
    };
}
