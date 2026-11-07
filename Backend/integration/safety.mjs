import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { parse } from "dotenv";
import mysql from "mysql2/promise";

export const allowedDatabases = Object.freeze(["libriflow_integration_test", "libriflow_ci_test"]);
export const applicationTables = Object.freeze(["VaiTro", "QuyenHan", "NguoiDung", "NguoiDung_VaiTro", "VaiTro_QuyenHan", "DanhMuc", "BoSach", "Sach", "BanSaoSach", "PhieuMuon", "ChiTietPhieuMuon", "QuyDinhPhat", "Phat", "LichSuSuDung", "DuBaoTanSuat", "NhatKyHeThong"]);
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function refuse(code) { const error = new Error(`Integration safety check refused: ${code}`);error.code = code;throw error; }

export function loadTestConfig(env = process.env, options = {}) {
    for (const name of ["TEST_DB_NAME", "TEST_DB_HOST", "TEST_DB_PORT", "TEST_DB_USER", "TEST_DB_PASSWORD", "TEST_DB_SERVER_UUID", "TEST_DB_MAIN_SERVER_UUID"]) {
        if (typeof env[name] !== "string" || env[name].trim() === "") refuse(`MISSING_${name}`);
    }
    let fileDatabase;
    if (options.mainDatabaseNames === undefined) {
        try { fileDatabase = parse(readFileSync(new URL("../.env", import.meta.url))).DB_NAME; }
        catch (error) { if (error.code !== "ENOENT") refuse("MAIN_DATABASE_CONFIG_UNREADABLE"); }
    }
    const mainNames = ["libriflow", env.DB_NAME, fileDatabase, ...(options.mainDatabaseNames ?? [])].filter(Boolean).map(name => name.trim().toLowerCase());
    const name = env.TEST_DB_NAME;
    if (mainNames.includes(name.trim().toLowerCase())) refuse("MAIN_DATABASE_FORBIDDEN");
    if (!allowedDatabases.includes(name)) refuse("DATABASE_NOT_ALLOWLISTED");
    const port = Number(env.TEST_DB_PORT);
    if (!Number.isInteger(port) || port < 1 || port > 65535) refuse("INVALID_TEST_PORT");
    if (!uuidPattern.test(env.TEST_DB_SERVER_UUID) || !uuidPattern.test(env.TEST_DB_MAIN_SERVER_UUID)) refuse("INVALID_SERVER_UUID");
    if (env.TEST_DB_SERVER_UUID.toLowerCase() === env.TEST_DB_MAIN_SERVER_UUID.toLowerCase()) refuse("MAIN_SERVER_FORBIDDEN");
    return Object.freeze({ name, host: env.TEST_DB_HOST, port, user: env.TEST_DB_USER, password: env.TEST_DB_PASSWORD, serverUuid: env.TEST_DB_SERVER_UUID.toLowerCase(), mainServerUuid: env.TEST_DB_MAIN_SERVER_UUID.toLowerCase() });
}

export function sqlStatements(source) {
    const result = [];let current = "", quote = null, lineComment = false, blockComment = false;
    for (let i = 0; i < source.length; i++) {
        const c = source[i], next = source[i + 1];
        if (lineComment) { if (c === "\n") { lineComment = false;current += "\n"; }continue; }
        if (blockComment) { if (c === "*" && next === "/") { blockComment = false;i++;current += " "; }continue; }
        if (quote) {
            current += c;
            if (c === "\\") current += source[++i] ?? "";
            else if (c === quote) { if (next === quote) current += source[++i];else quote = null; }
            continue;
        }
        if ((c === "-" && next === "-" && /\s/.test(source[i + 2] ?? "")) || c === "#") { lineComment = true;continue; }
        if (c === "/" && next === "*") { blockComment = true;i++;continue; }
        if (["'", '"', "`"].includes(c)) { quote = c;current += c; }
        else if (c === ";") { if (current.trim()) result.push(current.trim());current = ""; }
        else current += c;
    }
    if (quote || blockComment) refuse("UNTERMINATED_SQL");
    if (current.trim()) result.push(current.trim());
    return result;
}

export function assertRuntimeSql(sql) {
    if (typeof sql !== "string" || sqlStatements(sql).length !== 1 || !/^\s*(SELECT|INSERT|UPDATE)\b/i.test(sql)) refuse("SQL_NOT_ALLOWED");
    // A secondary rail, not a SQL sandbox: least-privilege grants and connection checks are mandatory.
    if (/\b(?:USE|DROP|TRUNCATE|ALTER|CREATE|GRANT|REVOKE|CALL|OUTFILE|DUMPFILE)\b/i.test(sql)) refuse("SQL_NOT_ALLOWED");
    if (/\b(?:FROM|JOIN|INTO|UPDATE)\s+`?[a-zA-Z_][\w]*`?\s*\./i.test(sql)) refuse("QUALIFIED_DATABASE_REFERENCE_FORBIDDEN");
}

export function assertIdentity(row, config) {
    if (row?.database_name !== config.name) refuse("CONNECTED_DATABASE_MISMATCH");
    if (typeof row.server_uuid !== "string" || row.server_uuid.toLowerCase() !== config.serverUuid || row.server_uuid.toLowerCase() === config.mainServerUuid) refuse("CONNECTED_SERVER_MISMATCH");
}

export function assertGrants(grants, name) {
    if (!grants.length) refuse("GRANTS_NOT_VERIFIED");
    for (const grant of grants) {
        if (/^GRANT USAGE ON \*\.\* TO /i.test(grant) && !/WITH GRANT OPTION/i.test(grant)) continue;
        const match = /^GRANT ([A-Z_, ]+) ON (`?\w+`?\.\*) TO /i.exec(grant);
        if (!match || match[2].replaceAll("`", "") !== `${name}.*` || /WITH GRANT OPTION/i.test(grant)) refuse("ACCOUNT_NOT_TEST_DATABASE_ONLY");
        if (match[1].split(",").some(value => !["SELECT", "INSERT", "UPDATE", "CREATE", "REFERENCES", "INDEX"].includes(value.trim().toUpperCase()))) refuse("EXCESSIVE_TEST_PRIVILEGES");
    }
}

export function sqlSources() {
    const schema = readFileSync(new URL("../sql/schema.sql", import.meta.url), "utf8");
    const seed = readFileSync(new URL("../sql/seeds/initial-permissions.sql", import.meta.url), "utf8");
    const schemaParts = sqlStatements(schema), seedParts = sqlStatements(seed);
    if (!/^CREATE DATABASE IF NOT EXISTS libriflow\b/i.test(schemaParts[0]) || schemaParts[1] !== "USE libriflow" || seedParts[0] !== "USE libriflow") refuse("UNEXPECTED_SOURCE_LAYOUT");
    const ddl = schemaParts.slice(2), seeds = seedParts.slice(1);
    if (ddl.length !== applicationTables.length || ddl.some((statement, i) => !statement.startsWith(`CREATE TABLE IF NOT EXISTS ${applicationTables[i]} (`))) refuse("UNEXPECTED_SCHEMA_STATEMENTS");
    if (seeds.length !== 5 || seeds.some(statement => !/^INSERT IGNORE INTO (VaiTro|QuyenHan|VaiTro_QuyenHan)\s*\(/.test(statement))) refuse("UNEXPECTED_SEED_STATEMENTS");
    return { ddl, seeds, fingerprint: createHash("sha256").update(schema).update("\0").update(seed).digest("hex") };
}

function safeError(error) {
    const code = typeof error.code === "string" && /^[A-Z0-9_]+$/.test(error.code) ? error.code : "MYSQL_OPERATION_FAILED";
    return Object.assign(new Error(`Integration database operation failed (${code}).`), { code });
}

async function identity(connection, config) {
    const [rows] = await connection.execute("SELECT DATABASE() AS database_name, @@server_uuid AS server_uuid");
    assertIdentity(rows[0], config);
}

export async function openTestDatabase(config, { setup = false } = {}) {
    let raw;
    try {
        if (!allowedDatabases.includes(config.name) || !uuidPattern.test(config.serverUuid) || !uuidPattern.test(config.mainServerUuid) || config.serverUuid === config.mainServerUuid) refuse("UNSAFE_TEST_CONFIGURATION");
        raw = mysql.createPool({ host: config.host, port: config.port, user: config.user, password: config.password, database: config.name,
            connectionLimit: 8, connectTimeout: 10000, waitForConnections: true, queueLimit: 100, supportBigNumbers: true, bigNumberStrings: true, multipleStatements: false, charset: "utf8mb4" });
        const initial = await raw.getConnection();
        try {
            await identity(initial, config);
            const [grants] = await initial.query("SHOW GRANTS");
            assertGrants(grants.map(row => Object.values(row)[0]), config.name);
            if (!setup) {
                const [rows] = await initial.execute("SELECT database_name, server_uuid, guard_version, sql_fingerprint FROM __libriflow_integration_guard WHERE id = 1");
                const marker = rows[0];
                if (!marker || marker.database_name !== config.name || marker.server_uuid.toLowerCase() !== config.serverUuid || Number(marker.guard_version) !== 1 || marker.sql_fingerprint !== sqlSources().fingerprint) refuse("TEST_MARKER_OR_SCHEMA_MISMATCH");
            }
        } finally { initial.release(); }
        if (setup) return {
            async prepare() {
                const connection = await raw.getConnection();
                try {
                    await identity(connection, config);
                    const [tables] = await connection.execute("SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE()");
                    if (tables.length) refuse("SETUP_REQUIRES_EMPTY_DATABASE");
                    const source = sqlSources();
                    for (const statement of [...source.ddl, ...source.seeds]) { await identity(connection, config);await connection.query(statement); }
                    await connection.query("CREATE TABLE __libriflow_integration_guard (id TINYINT PRIMARY KEY, database_name VARCHAR(64) NOT NULL, server_uuid VARCHAR(36) NOT NULL, guard_version INT NOT NULL, sql_fingerprint CHAR(64) NOT NULL)");
                    await connection.query("CREATE TABLE __libriflow_integration_runs (run_id VARCHAR(32) PRIMARY KEY, status VARCHAR(16) NOT NULL, started_at DATETIME NOT NULL, finished_at DATETIME NULL, manifest JSON NOT NULL)");
                    await connection.execute("INSERT INTO __libriflow_integration_guard (id, database_name, server_uuid, guard_version, sql_fingerprint) VALUES (1, ?, ?, 1, ?)", [config.name, config.serverUuid, source.fingerprint]);
                } catch (error) { throw safeError(error); } finally { connection.release(); }
            },
            async end() { await raw.end(); },
        };
        async function getConnection() {
            let connection;
            try { connection = await raw.getConnection();await identity(connection, config); }
            catch (error) { if (connection) connection.release();throw safeError(error); }
            async function execute(method, sql, params) {
                assertRuntimeSql(sql);
                try { await identity(connection, config);return await connection[method](sql, params); }
                catch (error) { throw safeError(error); }
            }
            return {
                execute: (sql, params) => execute("execute", sql, params), query: (sql, params) => execute("query", sql, params),
                async beginTransaction() { try { await identity(connection, config);await connection.beginTransaction(); } catch (error) { throw safeError(error); } },
                async commit() { try { await identity(connection, config);await connection.commit(); } catch (error) { throw safeError(error); } },
                async rollback() { await connection.rollback(); }, release() { connection.release(); },
            };
        }
        return {
            getConnection,
            async execute(sql, params) { const connection = await getConnection();try { return await connection.execute(sql, params); } finally { connection.release(); } },
            async query(sql, params) { const connection = await getConnection();try { return await connection.query(sql, params); } finally { connection.release(); } },
            async end() { await raw.end(); },
        };
    } catch (error) { if (raw) await raw.end();throw safeError(error); }
}
