import dotenv from "dotenv";
import mysql from "mysql2/promise";
import { fileURLToPath } from "node:url";

dotenv.config({
    path: fileURLToPath(new URL("../../.env", import.meta.url)),
    quiet: true,
});

const cong = Number(process.env.DB_PORT || 3306);
if (!Number.isInteger(cong) || cong < 1 || cong > 65535) {
    throw new Error("DB_PORT must be an integer between 1 and 65535.");
}

const boKetNoi = mysql.createPool({
    host: process.env.DB_HOST || "127.0.0.1",
    port: cong,
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "libriflow",
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 50,
    connectTimeout: 10000,
    charset: "utf8mb4",
    enableKeepAlive: true,
    supportBigNumbers: true,
    bigNumberStrings: true,
});

export async function kiemTraKetNoiCoSoDuLieu() {
    await boKetNoi.query("SELECT 1");
}

export function taoThongBaoLoiCoSoDuLieu(loi) {
    const goiYXuLy = {
        ER_ACCESS_DENIED_ERROR: "Check DB_USER and DB_PASSWORD in Backend/.env.",
        ER_BAD_DB_ERROR: "Create the schema in MySQL Workbench or correct DB_NAME in Backend/.env.",
        ECONNREFUSED: "Start MySQL Server and check DB_HOST / DB_PORT in Backend/.env.",
        ETIMEDOUT: "Check the MySQL host, port, and network connection.",
        ENOTFOUND: "Check DB_HOST in Backend/.env.",
    };
    return `MySQL connection failed (${loi.code || "UNKNOWN"}). ${goiYXuLy[loi.code] || "Check MySQL Server and the database configuration."}`;
}

export default boKetNoi;
