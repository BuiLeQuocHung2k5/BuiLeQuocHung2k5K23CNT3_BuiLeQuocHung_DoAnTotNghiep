import pool from "./config/database.js";
import { buildApp } from "./app-factory.js";

export function createApp(overrides = {}) {
    return buildApp({ database: pool, ...overrides });
}

export default createApp();
