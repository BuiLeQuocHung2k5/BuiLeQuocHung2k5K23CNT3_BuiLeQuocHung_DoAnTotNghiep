import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { loadTestConfig, openTestDatabase } from "./safety.mjs";

try {
    const config = loadTestConfig();
    const database = await openTestDatabase(config);
    await database.end();
    const child = spawn(process.execPath, ["--test", "--test-concurrency=1", fileURLToPath(new URL("./scenarios.mjs", import.meta.url))], { stdio: "inherit", env: process.env });
    child.on("error", () => { console.error("Integration runner failed to start.");process.exitCode = 1; });
    child.on("exit", code => { process.exitCode = code ?? 1; });
} catch (error) {
    console.error(`INTEGRATION CHUA CHAY: ${/^[A-Z0-9_]+$/.test(error.code ?? "") ? error.code : "SAFETY_CHECK_FAILED"}. No test write was started.`);
    process.exitCode = 2;
}
