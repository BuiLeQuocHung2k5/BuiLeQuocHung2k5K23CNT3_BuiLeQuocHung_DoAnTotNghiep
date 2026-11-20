import { spawn } from "node:child_process";
import { once } from "node:events";
import { fileURLToPath } from "node:url";
import { napCauHinhKiemThu, moCoSoDuLieuKiemThu } from "./an-toan.mjs";

// Không setup/provision; chỉ chạy sau preflight SELECT/grants/marker của target đã có.
try {
    const cauHinh = napCauHinhKiemThu();
    const coSoDuLieu = await moCoSoDuLieuKiemThu(cauHinh);
    await coSoDuLieu.end();
    const con = spawn(process.execPath, ["--test", "--test-concurrency=1", fileURLToPath(new URL("./xac-thuc.mjs", import.meta.url))], { stdio: "inherit", env: process.env, windowsHide: true });
    con.on("error", () => { console.error("AUTH INTEGRATION CHILD FAILED TO START"); });
    const [ma] = await once(con, "exit");
    process.exitCode = ma ?? 1;
} catch (loi) {
    console.error(`AUTH INTEGRATION CHUA CHAY: ${/^[A-Z0-9_]+$/.test(loi.code ?? "") ? loi.code : "SAFETY_CHECK_FAILED"}. No test write was started.`);
    process.exitCode = 2;
}
