import { loadTestConfig, openTestDatabase, refuse } from "./safety.mjs";

let database;
try {
    const config = loadTestConfig();
    if (process.env.TEST_DB_SETUP_CONFIRM !== config.name) refuse("SETUP_CONFIRMATION_REQUIRED");
    database = await openTestDatabase(config, { setup: true });
    await database.prepare();
    console.log("Integration schema/seed prepared in the verified empty test database. Original SQL files unchanged.");
} catch (error) {
    console.error(`TEST SETUP REFUSED/FAILED: ${/^[A-Z0-9_]+$/.test(error.code ?? "") ? error.code : "SAFETY_CHECK_FAILED"}. No database was created or dropped; inspect partial test setup if applicable.`);
    process.exitCode = 2;
} finally { if (database) await database.end(); }
