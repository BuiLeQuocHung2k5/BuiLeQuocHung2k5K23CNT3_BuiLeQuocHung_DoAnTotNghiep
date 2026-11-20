import { stat } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { CAC_BANG_UNG_DUNG } from "./an-toan.mjs";

// Chỉ SELECT; không khởi động mysqld, tạo file, schema, user hoặc cấp quyền.
export async function docKeHoachXacThuc(coSoDuLieu, binarySanSang) {
    const [[dinhDanh]] = await coSoDuLieu.query("SELECT DATABASE() AS database_name, @@server_uuid AS server_uuid, @@datadir AS data_directory, @@port AS port, VERSION() AS version");
    if (!dinhDanh?.database_name || !dinhDanh.server_uuid || !dinhDanh.data_directory || !Number(dinhDanh.port)) throw Object.assign(new Error("Main identity must be verified before planning."), { code: "MAIN_IDENTITY_UNVERIFIED" });
    const [cacCot] = await coSoDuLieu.query("SELECT TABLE_NAME,COLUMN_NAME,COLUMN_TYPE,IS_NULLABLE,COLUMN_DEFAULT FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() ORDER BY TABLE_NAME,ORDINAL_POSITION");
    const soDong = {};
    for (const bang of CAC_BANG_UNG_DUNG) soDong[bang] = String((await coSoDuLieu.query(`SELECT COUNT(*) AS total FROM \`${bang}\``))[0][0].total);
    const bam = giaTri => createHash("sha256").update(JSON.stringify(giaTri)).digest("hex");
    return {
        task: "BE-AUTH-SETUP-01", mode: "read-only-plan", approvalRequired: true,
        mainIdentityVerified: true, mysqlVersion: dinhDanh.version, mysqlBinaryAvailable: binarySanSang,
        mainMetadataHash: bam(cacCot), mainCountsHash: bam(soDong), mainUsers: soDong.NguoiDung,
        proposed: {
            instance: "new-loopback-instance", datadir: "%TEMP%/libriflow-integration-<random>/data",
            port: "OS-assigned, distinct from main", database: "libriflow_integration_test", user: "libriflow_it@127.0.0.1",
            bootstrapPassword: "CSPRNG in RAM after isolated identity verification", runtimePrivileges: ["SELECT", "INSERT", "UPDATE"],
            setupPrivileges: ["SELECT", "INSERT", "UPDATE", "CREATE", "REFERENCES", "INDEX"],
            applicationSchema: "existing 16-table DDL unchanged, loaded only into the verified new empty target",
            auxiliaryTables: ["__libriflow_integration_guard", "__libriflow_integration_runs"], accounts: ["reader", "reader+librarian"],
            cleanup: "deactivate owned fixtures; close HTTP/pools; stop only owned mysqld; retain datadir without DROP/DELETE",
        },
        databaseWrites: 0, provisioningStarted: false,
    };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    let pool;
    try {
        pool = (await import("../src/config/co-so-du-lieu.js")).default;
        const binary = process.env.MYSQLD_TEST_BINARY || "C:\\Program Files\\MySQL\\MySQL Server 8.0\\bin\\mysqld.exe";
        let sanSang = false;
        try { sanSang = (await stat(binary)).isFile() && /Ver 8\.0\./.test(execFileSync(binary, ["--no-defaults", "--version"], { encoding: "utf8", windowsHide: true })); } catch { /* Chỉ công bố boolean, không phản chiếu lỗi hoặc đường dẫn riêng. */ }
        console.log(JSON.stringify(await docKeHoachXacThuc(pool, sanSang), null, 2));
    } catch (loi) {
        console.error(`AUTH PLAN REFUSED: ${/^[A-Z0-9_]+$/.test(loi.code ?? "") ? loi.code : "READ_ONLY_PLAN_FAILED"}`);
        process.exitCode = 2;
    } finally { if (pool) await pool.end(); }
}
