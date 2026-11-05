import app from "./app.js";
import pool, { checkDatabaseConnection, databaseErrorMessage } from "./config/database.js";

const PORT = process.env.PORT || 3000;

try {
    await checkDatabaseConnection();
    console.log("MySQL connected successfully");
    const server = app.listen(PORT, "127.0.0.1", () => {
        console.log(`LibriFlow API running at http://localhost:${PORT}`);
    });
    server.on("error", async (error) => {
        console.error(`API startup failed (${error.code || "UNKNOWN"}).`);
        await pool.end();
        process.exitCode = 1;
    });
} catch (error) {
    console.error(databaseErrorMessage(error));
    await pool.end();
    process.exitCode = 1;
}
