import pool, { checkDatabaseConnection, databaseErrorMessage } from "../config/database.js";

try {
    await checkDatabaseConnection();
    console.log("MySQL connected successfully");
} catch (error) {
    console.error(databaseErrorMessage(error));
    process.exitCode = 1;
} finally {
    await pool.end();
}
