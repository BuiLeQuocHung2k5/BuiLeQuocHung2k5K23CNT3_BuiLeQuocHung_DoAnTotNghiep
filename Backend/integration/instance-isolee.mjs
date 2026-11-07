import { spawn } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:net";
import { mkdtemp, mkdir, writeFile, stat } from "node:fs/promises";
import { createWriteStream } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes, createHash } from "node:crypto";
import mysql from "mysql2/promise";
import boKetNoiChinh from "../src/config/co-so-du-lieu.js";
import { CAC_BANG_UNG_DUNG } from "./an-toan.mjs";

// Chỉ khởi tạo datadir mới dưới OS temp; không nạp my.ini, không đăng ký service, không dùng dữ liệu chính.
const tepThucThi = process.env.MYSQLD_TEST_BINARY || "C:\\Program Files\\MySQL\\MySQL Server 8.0\\bin\\mysqld.exe";
const thuMucBackend = fileURLToPath(new URL("../", import.meta.url));
const cho = ms => new Promise(resolve => setTimeout(resolve, ms));
const bam = value => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const chuanHoaDuongDan = value => path.resolve(value).replaceAll("\\", "/").replace(/\/$/, "").toLowerCase();
let mayChu, quanTriTest, thuMucTam, nhatKy, cauHinhTest, maThoat = 1;
const baoCao = { task: "TASK-018", started_at: new Date().toISOString(), unit_database_writes: false };

async function docDauVetChinh() {
    const [[identity]] = await boKetNoiChinh.query("SELECT DATABASE() AS database_name, @@server_uuid AS server_uuid, @@datadir AS data_directory, @@port AS port, VERSION() AS version");
    const [columns] = await boKetNoiChinh.query("SELECT TABLE_NAME,COLUMN_NAME,COLUMN_TYPE,IS_NULLABLE,COLUMN_DEFAULT FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() ORDER BY TABLE_NAME,ORDINAL_POSITION");
    const counts = {};
    for (const ten of CAC_BANG_UNG_DUNG) counts[ten] = String((await boKetNoiChinh.query(`SELECT COUNT(*) AS total FROM \`${ten}\``))[0][0].total);
    const [[quyen]] = await boKetNoiChinh.query("SELECT COUNT(*) AS total FROM QuyenHan WHERE name='category_manage'");
    const [[quyDinh]] = await boKetNoiChinh.query("SELECT COUNT(*) AS total FROM QuyDinhPhat WHERE is_active=1");
    return { identity, public: { database_name: identity.database_name, version: identity.version, metadata_hash: bam(columns), counts_hash: bam(counts), category_manage_installed: Number(quyen.total) > 0, active_fine_rules: Number(quyDinh.total) } };
}

async function chayTienTrinh(tep, thamSo, { env = process.env, log = false } = {}) {
    const con = spawn(tep, thamSo, { cwd: thuMucBackend, env, windowsHide: true, stdio: ["ignore", log ? "pipe" : "inherit", log ? "pipe" : "inherit"] });
    if (log) { con.stdout.pipe(nhatKy, { end: false }); con.stderr.pipe(nhatKy, { end: false }); }
    const [code] = await once(con, "exit");
    if (code !== 0) throw Object.assign(new Error("Child process failed"), { code: "ISOLATED_CHILD_FAILED" });
}

async function kiemTraQuanTriTest() {
    const [[row]] = await quanTriTest.query("SELECT @@server_uuid AS server_uuid, @@datadir AS data_directory, @@port AS port");
    if (row.server_uuid !== cauHinhTest.uuid || chuanHoaDuongDan(row.data_directory) !== chuanHoaDuongDan(cauHinhTest.datadir) || Number(row.port) !== cauHinhTest.port) throw Object.assign(new Error("Isolated identity changed"), { code: "ISOLATED_IDENTITY_MISMATCH" });
}

try {
    if (!(await stat(tepThucThi)).isFile()) throw Object.assign(new Error("mysqld missing"), { code: "MYSQLD_NOT_FOUND" });
    const chinh = await docDauVetChinh();
    baoCao.main_before = chinh.public;
    if (!chinh.identity.database_name || !chinh.identity.server_uuid) throw Object.assign(new Error("Main identity unknown"), { code: "MAIN_IDENTITY_UNVERIFIED" });
    thuMucTam = await mkdtemp(path.join(tmpdir(), "libriflow-integration-"));
    const datadir = path.join(thuMucTam, "data");
    if (!chuanHoaDuongDan(datadir).startsWith(chuanHoaDuongDan(tmpdir()) + "/libriflow-integration-") || chuanHoaDuongDan(datadir) === chuanHoaDuongDan(chinh.identity.data_directory)) throw Object.assign(new Error("Unsafe data path"), { code: "UNSAFE_ISOLATED_DATADIR" });
    await mkdir(datadir);
    nhatKy = createWriteStream(path.join(thuMucTam, "mysql.log"), { flags: "a" });
    const coWindows = process.platform === "win32" ? ["--no-monitor"] : [];
    await chayTienTrinh(tepThucThi, ["--no-defaults", ...coWindows, "--initialize-insecure", `--basedir=${path.dirname(path.dirname(tepThucThi))}`, `--datadir=${datadir}`], { log: true });
    const datCho = createServer(); datCho.listen(0, "127.0.0.1"); await once(datCho, "listening");
    const port = datCho.address().port; await new Promise(resolve => datCho.close(resolve));
    if (port === Number(chinh.identity.port)) throw Object.assign(new Error("Port collision"), { code: "MAIN_PORT_FORBIDDEN" });
    mayChu = spawn(tepThucThi, ["--no-defaults", ...coWindows, "--console", `--basedir=${path.dirname(path.dirname(tepThucThi))}`, `--datadir=${datadir}`, `--port=${port}`, "--bind-address=127.0.0.1", "--mysqlx=0", "--skip-log-bin", "--local-infile=0", "--performance-schema=OFF", "--innodb-buffer-pool-size=64M", "--max-connections=25", "--default-time-zone=+00:00", "--character-set-server=utf8mb4", "--collation-server=utf8mb4_unicode_ci"], { cwd: thuMucTam, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
    mayChu.stdout.pipe(nhatKy, { end: false }); mayChu.stderr.pipe(nhatKy, { end: false });
    let loiKetNoi;
    for (let i = 0; i < 80; i++) {
        try { quanTriTest = await mysql.createConnection({ host: "127.0.0.1", port, user: "root", password: "", connectTimeout: 1000 }); break; }
        catch (loi) { loiKetNoi = loi; if (mayChu.exitCode !== null) break; await cho(250); }
    }
    if (!quanTriTest) throw Object.assign(new Error("Isolated server unavailable"), { code: "ISOLATED_START_FAILED", cause: loiKetNoi?.code });
    const [[dinhDanh]] = await quanTriTest.query("SELECT @@server_uuid AS server_uuid, @@datadir AS data_directory, @@port AS port");
    if (!dinhDanh.server_uuid || dinhDanh.server_uuid === chinh.identity.server_uuid || chuanHoaDuongDan(dinhDanh.data_directory) !== chuanHoaDuongDan(datadir) || Number(dinhDanh.port) !== port) throw Object.assign(new Error("Unsafe test identity"), { code: "ISOLATED_IDENTITY_UNVERIFIED" });
    cauHinhTest = { uuid: dinhDanh.server_uuid, datadir, port };
    baoCao.isolation = { distinct_server_uuid: true, distinct_datadir: true, distinct_port: true, bind_address: "127.0.0.1", database_name: "libriflow_integration_test", dedicated_user: true, version: chinh.identity.version };
    // Mọi DDL dưới đây chỉ dùng connection mới đã xác minh UUID/datadir/cổng, không dùng pool chính.
    const matKhauTest = randomBytes(36).toString("base64url");
    for (const [sql, params] of [
        ["CREATE DATABASE libriflow_integration_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"],
        ["CREATE USER 'libriflow_it'@'127.0.0.1' IDENTIFIED BY ?", [matKhauTest]],
        ["GRANT SELECT,INSERT,UPDATE,CREATE,REFERENCES,INDEX ON libriflow_integration_test.* TO 'libriflow_it'@'127.0.0.1'"],
    ]) { await kiemTraQuanTriTest(); await quanTriTest.query(sql, params); }
    const env = { ...process.env, TEST_DB_NAME: "libriflow_integration_test", TEST_DB_HOST: "127.0.0.1", TEST_DB_PORT: String(port), TEST_DB_USER: "libriflow_it", TEST_DB_PASSWORD: matKhauTest, TEST_DB_SERVER_UUID: dinhDanh.server_uuid, TEST_DB_MAIN_SERVER_UUID: chinh.identity.server_uuid, TEST_DB_SETUP_CONFIRM: "libriflow_integration_test" };
    console.log("ISOLATED MYSQL VERIFIED: separate UUID/datadir/port; loopback; dedicated least-privilege account. No secrets are printed.");
    await chayTienTrinh(process.execPath, [fileURLToPath(new URL("./setup.mjs", import.meta.url))], { env });
    baoCao.setup = "passed";
    await chayTienTrinh(process.execPath, [fileURLToPath(new URL("./run.mjs", import.meta.url))], { env });
    baoCao.integration = "passed";
    const [[marker]] = await quanTriTest.query("SELECT guard_version,sql_fingerprint FROM libriflow_integration_test.__libriflow_integration_guard WHERE id=1");
    const [runs] = await quanTriTest.query("SELECT status,COUNT(*) AS total FROM libriflow_integration_test.__libriflow_integration_runs GROUP BY status");
    baoCao.guard = { version: marker.guard_version, fingerprint: marker.sql_fingerprint, runs };
    maThoat = 0;
} catch (loi) {
    baoCao.failure_code = typeof loi.code === "string" && /^[A-Z0-9_]+$/.test(loi.code) ? loi.code : "ISOLATED_RUN_FAILED";
    if (typeof loi.cause === "string" && /^[A-Z0-9_]+$/.test(loi.cause)) baoCao.failure_cause = loi.cause;
    console.error(`ISOLATED RUN STOPPED: ${baoCao.failure_code}. Main database is never used for test writes.`);
} finally {
    try { const sau = await docDauVetChinh(); baoCao.main_after = sau.public; baoCao.main_snapshot_unchanged = JSON.stringify(baoCao.main_before) === JSON.stringify(sau.public); if (!baoCao.main_snapshot_unchanged) maThoat = 1; } catch { baoCao.main_snapshot_unchanged = "unverified"; maThoat = 1; }
    await boKetNoiChinh.end();
    if (quanTriTest) {
        try { if (cauHinhTest) { await kiemTraQuanTriTest(); await quanTriTest.query("SHUTDOWN"); } } catch { /* SHUTDOWN có thể đóng socket trước response. */ }
        try { await quanTriTest.end(); } catch { /* Kết nối đã đóng. */ }
    }
    if (mayChu && mayChu.exitCode === null) {
        await Promise.race([once(mayChu, "exit"), cho(10000)]);
        if (mayChu.exitCode === null) mayChu.kill(); // Chỉ PID do chính script tạo, không đụng Windows service/MySQL khác.
    }
    if (mayChu && mayChu.exitCode === null && mayChu.killed) await Promise.race([once(mayChu, "exit"), cho(10000)]);
    baoCao.server_stopped = !mayChu || mayChu.exitCode !== null;
    if (!baoCao.server_stopped) maThoat = 1;
    baoCao.finished_at = new Date().toISOString();
    if (thuMucTam) { baoCao.runtime_directory = thuMucTam; await writeFile(path.join(thuMucTam, "result.json"), JSON.stringify(baoCao, null, 2)); }
    if (nhatKy) await new Promise(resolve => nhatKy.end(resolve));
    console.log(JSON.stringify({ result: maThoat === 0 ? "PASS" : "NOT_PASSED", ...baoCao }));
    process.exitCode = maThoat;
}
