import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { napCauHinhKiemThu, moCoSoDuLieuKiemThu } from "./an-toan.mjs";

try {
    const cauHinh = napCauHinhKiemThu();
    const coSoDuLieu = await moCoSoDuLieuKiemThu(cauHinh);
    await coSoDuLieu.end();
    const tienTrinhCon = spawn(process.execPath, ["--test", "--test-concurrency=1", fileURLToPath(new URL("./kich-ban.mjs", import.meta.url))], { stdio: "inherit", env: process.env });
    tienTrinhCon.on("error", () => { console.error("Integration runner failed to start.");process.exitCode = 1; });
    tienTrinhCon.on("exit", maLoi => { process.exitCode = maLoi ?? 1; });
} catch (loi) {
    console.error(`INTEGRATION CHUA CHAY: ${/^[A-Z0-9_]+$/.test(loi.code ?? "") ? loi.code : "SAFETY_CHECK_FAILED"}. No test write was started.`);
    process.exitCode = 2;
}
