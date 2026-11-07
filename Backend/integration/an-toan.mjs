import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { parse } from "dotenv";
import mysql from "mysql2/promise";

export const CAC_CO_SO_DU_LIEU_TEST_CHO_PHEP = Object.freeze(["libriflow_integration_test", "libriflow_ci_test"]);
export const CAC_BANG_UNG_DUNG = Object.freeze(["VaiTro", "QuyenHan", "NguoiDung", "NguoiDung_VaiTro", "VaiTro_QuyenHan", "DanhMuc", "BoSach", "Sach", "BanSaoSach", "PhieuMuon", "ChiTietPhieuMuon", "QuyDinhPhat", "Phat", "LichSuSuDung", "DuBaoTanSuat", "NhatKyHeThong"]);
const MAU_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function tuChoi(maLoi) { const loi = new Error(`Integration safety check refused: ${maLoi}`);loi.code = maLoi;throw loi; }

export function napCauHinhKiemThu(bienMoiTruong = process.env, tuyChon = {}) {
    for (const ten of ["TEST_DB_NAME", "TEST_DB_HOST", "TEST_DB_PORT", "TEST_DB_USER", "TEST_DB_PASSWORD", "TEST_DB_SERVER_UUID", "TEST_DB_MAIN_SERVER_UUID"]) {
        if (typeof bienMoiTruong[ten] !== "string" || bienMoiTruong[ten].trim() === "") tuChoi(`MISSING_${ten}`);
    }
    let tenCoSoDuLieuTrongTep;
    if (tuyChon.mainDatabaseNames === undefined) {
        try { tenCoSoDuLieuTrongTep = parse(readFileSync(new URL("../.env", import.meta.url))).DB_NAME; }
        catch (loi) { if (loi.code !== "ENOENT") tuChoi("MAIN_DATABASE_CONFIG_UNREADABLE"); }
    }
    const cacTenCoSoDuLieuChinh = ["libriflow", bienMoiTruong.DB_NAME, tenCoSoDuLieuTrongTep, ...(tuyChon.mainDatabaseNames ?? [])].filter(Boolean).map(ten => ten.trim().toLowerCase());
    const ten = bienMoiTruong.TEST_DB_NAME;
    if (cacTenCoSoDuLieuChinh.includes(ten.trim().toLowerCase())) tuChoi("MAIN_DATABASE_FORBIDDEN");
    if (!CAC_CO_SO_DU_LIEU_TEST_CHO_PHEP.includes(ten)) tuChoi("DATABASE_NOT_ALLOWLISTED");
    const cong = Number(bienMoiTruong.TEST_DB_PORT);
    if (!Number.isInteger(cong) || cong < 1 || cong > 65535) tuChoi("INVALID_TEST_PORT");
    if (!MAU_UUID.test(bienMoiTruong.TEST_DB_SERVER_UUID) || !MAU_UUID.test(bienMoiTruong.TEST_DB_MAIN_SERVER_UUID)) tuChoi("INVALID_SERVER_UUID");
    if (bienMoiTruong.TEST_DB_SERVER_UUID.toLowerCase() === bienMoiTruong.TEST_DB_MAIN_SERVER_UUID.toLowerCase()) tuChoi("MAIN_SERVER_FORBIDDEN");
    return Object.freeze({ name: ten, host: bienMoiTruong.TEST_DB_HOST, port: cong, user: bienMoiTruong.TEST_DB_USER, password: bienMoiTruong.TEST_DB_PASSWORD, serverUuid: bienMoiTruong.TEST_DB_SERVER_UUID.toLowerCase(), mainServerUuid: bienMoiTruong.TEST_DB_MAIN_SERVER_UUID.toLowerCase() });
}

export function tachCauLenhSql(nguon) {
    const ketQua = [];let hienTai = "", dauNhay = null, dangTrongChuThichDong = false, dangTrongChuThichKhoi = false;
    for (let i = 0; i < nguon.length; i++) {
        const c = nguon[i], next = nguon[i + 1];
        if (dangTrongChuThichDong) { if (c === "\n") { dangTrongChuThichDong = false;hienTai += "\n"; }continue; }
        if (dangTrongChuThichKhoi) { if (c === "*" && next === "/") { dangTrongChuThichKhoi = false;i++;hienTai += " "; }continue; }
        if (dauNhay) {
            hienTai += c;
            if (c === "\\") hienTai += nguon[++i] ?? "";
            else if (c === dauNhay) { if (next === dauNhay) hienTai += nguon[++i];else dauNhay = null; }
            continue;
        }
        if ((c === "-" && next === "-" && /\s/.test(nguon[i + 2] ?? "")) || c === "#") { dangTrongChuThichDong = true;continue; }
        if (c === "/" && next === "*") { dangTrongChuThichKhoi = true;i++;continue; }
        if (["'", '"', "`"].includes(c)) { dauNhay = c;hienTai += c; }
        else if (c === ";") { if (hienTai.trim()) ketQua.push(hienTai.trim());hienTai = ""; }
        else hienTai += c;
    }
    if (dauNhay || dangTrongChuThichKhoi) tuChoi("UNTERMINATED_SQL");
    if (hienTai.trim()) ketQua.push(hienTai.trim());
    return ketQua;
}

export function kiemTraSqlLucChay(cauSql) {
    if (typeof cauSql !== "string" || tachCauLenhSql(cauSql).length !== 1 || !/^\s*(SELECT|INSERT|UPDATE)\b/i.test(cauSql)) tuChoi("SQL_NOT_ALLOWED");
    // Lớp kiểm tra bổ sung; vẫn bắt buộc quyền DB tối thiểu và xác minh kết nối, không coi là sandbox SQL.
    if (/\b(?:USE|DROP|TRUNCATE|ALTER|CREATE|GRANT|REVOKE|CALL|OUTFILE|DUMPFILE)\b/i.test(cauSql)) tuChoi("SQL_NOT_ALLOWED");
    if (/\b(?:FROM|JOIN|INTO|UPDATE)\s+`?[a-zA-Z_][\w]*`?\s*\./i.test(cauSql)) tuChoi("QUALIFIED_DATABASE_REFERENCE_FORBIDDEN");
}

export function kiemTraDinhDanhKetNoi(dongDuLieu, cauHinh) {
    if (dongDuLieu?.database_name !== cauHinh.name) tuChoi("CONNECTED_DATABASE_MISMATCH");
    if (typeof dongDuLieu.server_uuid !== "string" || dongDuLieu.server_uuid.toLowerCase() !== cauHinh.serverUuid || dongDuLieu.server_uuid.toLowerCase() === cauHinh.mainServerUuid) tuChoi("CONNECTED_SERVER_MISMATCH");
}

export function kiemTraQuyenCoSoDuLieu(cacDongQuyen, ten) {
    if (!cacDongQuyen.length) tuChoi("GRANTS_NOT_VERIFIED");
    for (const dongQuyen of cacDongQuyen) {
        if (/^GRANT USAGE ON \*\.\* TO /i.test(dongQuyen) && !/WITH GRANT OPTION/i.test(dongQuyen)) continue;
        const ketQuaKhop = /^GRANT ([A-Z_, ]+) ON (`?\w+`?\.\*) TO /i.exec(dongQuyen);
        if (!ketQuaKhop || ketQuaKhop[2].replaceAll("`", "") !== `${ten}.*` || /WITH GRANT OPTION/i.test(dongQuyen)) tuChoi("ACCOUNT_NOT_TEST_DATABASE_ONLY");
        if (ketQuaKhop[1].split(",").some(giaTri => !["SELECT", "INSERT", "UPDATE", "CREATE", "REFERENCES", "INDEX"].includes(giaTri.trim().toUpperCase()))) tuChoi("EXCESSIVE_TEST_PRIVILEGES");
    }
}

export function docNguonSql() {
    const cauTruc = readFileSync(new URL("../sql/schema.sql", import.meta.url), "utf8");
    const duLieuKhoiTao = readFileSync(new URL("../sql/seeds/initial-permissions.sql", import.meta.url), "utf8");
    const cacPhanCauTruc = tachCauLenhSql(cauTruc), cacPhanKhoiTao = tachCauLenhSql(duLieuKhoiTao);
    if (!/^CREATE DATABASE IF NOT EXISTS libriflow\b/i.test(cacPhanCauTruc[0]) || cacPhanCauTruc[1] !== "USE libriflow" || cacPhanKhoiTao[0] !== "USE libriflow") tuChoi("UNEXPECTED_SOURCE_LAYOUT");
    const cacLenhDinhNghia = cacPhanCauTruc.slice(2), cacLenhKhoiTao = cacPhanKhoiTao.slice(1);
    if (cacLenhDinhNghia.length !== CAC_BANG_UNG_DUNG.length || cacLenhDinhNghia.some((cauLenh, i) => !cauLenh.startsWith(`CREATE TABLE IF NOT EXISTS ${CAC_BANG_UNG_DUNG[i]} (`))) tuChoi("UNEXPECTED_SCHEMA_STATEMENTS");
    if (cacLenhKhoiTao.length !== 5 || cacLenhKhoiTao.some(cauLenh => !/^INSERT IGNORE INTO (VaiTro|QuyenHan|VaiTro_QuyenHan)\s*\(/.test(cauLenh))) tuChoi("UNEXPECTED_SEED_STATEMENTS");
    return { ddl: cacLenhDinhNghia, seeds: cacLenhKhoiTao, fingerprint: createHash("sha256").update(cauTruc).update("\0").update(duLieuKhoiTao).digest("hex") };
}

function taoLoiAnToan(loi) {
    const maLoi = typeof loi.code === "string" && /^[A-Z0-9_]+$/.test(loi.code) ? loi.code : "MYSQL_OPERATION_FAILED";
    return Object.assign(new Error(`Integration database operation failed (${maLoi}).`), { code: maLoi });
}

async function docDinhDanhKetNoi(ketNoi, cauHinh) {
    const [cacDong] = await ketNoi.execute("SELECT DATABASE() AS database_name, @@server_uuid AS server_uuid");
    kiemTraDinhDanhKetNoi(cacDong[0], cauHinh);
}

export async function moCoSoDuLieuKiemThu(cauHinh, { setup: cheDoChuanBi = false } = {}) {
    let duLieuTho;
    try {
        if (!CAC_CO_SO_DU_LIEU_TEST_CHO_PHEP.includes(cauHinh.name) || !MAU_UUID.test(cauHinh.serverUuid) || !MAU_UUID.test(cauHinh.mainServerUuid) || cauHinh.serverUuid === cauHinh.mainServerUuid) tuChoi("UNSAFE_TEST_CONFIGURATION");
        duLieuTho = mysql.createPool({ host: cauHinh.host, port: cauHinh.port, user: cauHinh.user, password: cauHinh.password, database: cauHinh.name,
            connectionLimit: 8, connectTimeout: 10000, waitForConnections: true, queueLimit: 100, supportBigNumbers: true, bigNumberStrings: true, multipleStatements: false, charset: "utf8mb4" });
        const banDau = await duLieuTho.getConnection();
        try {
            await docDinhDanhKetNoi(banDau, cauHinh);
            const [cacDongQuyen] = await banDau.query("SHOW GRANTS");
            kiemTraQuyenCoSoDuLieu(cacDongQuyen.map(dongDuLieu => Object.values(dongDuLieu)[0]), cauHinh.name);
            if (!cheDoChuanBi) {
                const [cacDong] = await banDau.execute("SELECT database_name, server_uuid, guard_version, sql_fingerprint FROM __libriflow_integration_guard WHERE id = 1");
                const dauXacNhan = cacDong[0];
                if (!dauXacNhan || dauXacNhan.database_name !== cauHinh.name || dauXacNhan.server_uuid.toLowerCase() !== cauHinh.serverUuid || Number(dauXacNhan.guard_version) !== 1 || dauXacNhan.sql_fingerprint !== docNguonSql().fingerprint) tuChoi("TEST_MARKER_OR_SCHEMA_MISMATCH");
            }
        } finally { banDau.release(); }
        if (cheDoChuanBi) return {
            async chuanBi() {
                const ketNoi = await duLieuTho.getConnection();
                try {
                    await docDinhDanhKetNoi(ketNoi, cauHinh);
                    const [cacBang] = await ketNoi.execute("SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE()");
                    if (cacBang.length) tuChoi("SETUP_REQUIRES_EMPTY_DATABASE");
                    const nguon = docNguonSql();
                    for (const cauLenh of [...nguon.ddl, ...nguon.seeds]) { await docDinhDanhKetNoi(ketNoi, cauHinh);await ketNoi.query(cauLenh); }
                    await ketNoi.query("CREATE TABLE __libriflow_integration_guard (id TINYINT PRIMARY KEY, database_name VARCHAR(64) NOT NULL, server_uuid VARCHAR(36) NOT NULL, guard_version INT NOT NULL, sql_fingerprint CHAR(64) NOT NULL)");
                    await ketNoi.query("CREATE TABLE __libriflow_integration_runs (run_id VARCHAR(32) PRIMARY KEY, status VARCHAR(16) NOT NULL, started_at DATETIME NOT NULL, finished_at DATETIME NULL, manifest JSON NOT NULL)");
                    await ketNoi.execute("INSERT INTO __libriflow_integration_guard (id, database_name, server_uuid, guard_version, sql_fingerprint) VALUES (1, ?, ?, 1, ?)", [cauHinh.name, cauHinh.serverUuid, nguon.fingerprint]);
                } catch (loi) { throw taoLoiAnToan(loi); } finally { ketNoi.release(); }
            },
            async end() { await duLieuTho.end(); },
        };
        async function layKetNoi() {
            let ketNoi;
            try { ketNoi = await duLieuTho.getConnection();await docDinhDanhKetNoi(ketNoi, cauHinh); }
            catch (loi) { if (ketNoi) ketNoi.release();throw taoLoiAnToan(loi); }
            async function thucThi(phuongThuc, cauSql, thamSo) {
                kiemTraSqlLucChay(cauSql);
                try { await docDinhDanhKetNoi(ketNoi, cauHinh);return await ketNoi[phuongThuc](cauSql, thamSo); }
                catch (loi) { throw taoLoiAnToan(loi); }
            }
            return {
                execute: (cauSql, thamSo) => thucThi("execute", cauSql, thamSo), query: (cauSql, thamSo) => thucThi("query", cauSql, thamSo),
                async beginTransaction() { try { await docDinhDanhKetNoi(ketNoi, cauHinh);await ketNoi.beginTransaction(); } catch (loi) { throw taoLoiAnToan(loi); } },
                async commit() { try { await docDinhDanhKetNoi(ketNoi, cauHinh);await ketNoi.commit(); } catch (loi) { throw taoLoiAnToan(loi); } },
                async rollback() { await ketNoi.rollback(); }, release() { ketNoi.release(); },
            };
        }
        return {
            getConnection: layKetNoi,
            async execute(cauSql, thamSo) { const ketNoi = await layKetNoi();try { return await ketNoi.execute(cauSql, thamSo); } finally { ketNoi.release(); } },
            async query(cauSql, thamSo) { const ketNoi = await layKetNoi();try { return await ketNoi.query(cauSql, thamSo); } finally { ketNoi.release(); } },
            async end() { await duLieuTho.end(); },
        };
    } catch (loi) { if (duLieuTho) await duLieuTho.end();throw taoLoiAnToan(loi); }
}
