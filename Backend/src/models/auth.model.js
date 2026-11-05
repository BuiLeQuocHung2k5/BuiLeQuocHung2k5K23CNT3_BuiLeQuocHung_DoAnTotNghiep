import { HttpError } from "../utils/http-error.js";

export function createAuthModel(pool) {
    async function getPrincipal(id, connection = pool) {
        const [rows] = await connection.execute(
            `SELECT u.user_id, u.name, u.email, u.phone, u.avatar, u.status, u.created_at, u.updated_at,
                    r.name AS role_name, p.name AS permission_name
             FROM NguoiDung u
             LEFT JOIN NguoiDung_VaiTro ur ON ur.user_id = u.user_id
             LEFT JOIN VaiTro r ON r.role_id = ur.role_id
             LEFT JOIN VaiTro_QuyenHan rp ON rp.role_id = r.role_id
             LEFT JOIN QuyenHan p ON p.permission_id = rp.permission_id
             WHERE u.user_id = ?`, [id]);
        if (!rows.length) return null;
        const { role_name, permission_name, ...user } = rows[0];
        return { ...user, user_id: String(user.user_id), roles: [...new Set(rows.map(row => row.role_name).filter(Boolean))], permissions: [...new Set(rows.map(row => row.permission_name).filter(Boolean))] };
    }
    return {
        getPrincipal,
        async findCredentials(email) {
            const [rows] = await pool.execute("SELECT user_id, password, status FROM NguoiDung WHERE email = ? LIMIT 1", [email]);
            return rows[0] ?? null;
        },
        async registerReader(data, passwordHash) {
            const connection = await pool.getConnection();
            try {
                await connection.beginTransaction();
                // The seed explicitly defines reader. Never create a role or fall back to admin.
                const [roles] = await connection.execute("SELECT role_id, name FROM VaiTro WHERE name = ? FOR SHARE", ["reader"]);
                if (roles.length !== 1 || roles[0].name !== "reader") {
                    throw new HttpError(503, "REGISTRATION_NOT_CONFIGURED", "Chưa có vai trò reader đúng seed; đăng ký tạm dừng.");
                }
                const [result] = await connection.execute(
                    "INSERT INTO NguoiDung (name, email, password, phone, status) VALUES (?, ?, ?, ?, ?)",
                    [data.name, data.email, passwordHash, data.phone, "active"]);
                const id = String(result.insertId);
                await connection.execute("INSERT INTO NguoiDung_VaiTro (user_id, role_id) VALUES (?, ?)", [id, String(roles[0].role_id)]);
                const user = await getPrincipal(id, connection);
                await connection.commit();
                return user;
            } catch (error) {
                try { await connection.rollback(); } catch { /* Preserve the original error. */ }
                if (error.code === "ER_DUP_ENTRY") throw new HttpError(409, "EMAIL_ALREADY_EXISTS", "Email đã được sử dụng.");
                throw error;
            } finally { connection.release(); }
        },
    };
}
