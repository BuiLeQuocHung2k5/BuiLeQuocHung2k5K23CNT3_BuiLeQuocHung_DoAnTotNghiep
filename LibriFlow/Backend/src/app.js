import express from "express";
import cors from "cors";
import { checkDatabaseConnection } from "./config/database.js";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/api/health", (req, res) => {
    res.status(200).json({
        success: true,
        message: "LibriFlow Backend is running",
    });
});

app.get("/api/health/db", async (req, res) => {
    try {
        await checkDatabaseConnection();
        res.status(200).json({ success: true, database: "connected" });
    } catch {
        res.status(503).json({ success: false, database: "disconnected" });
    }
});

export default app;
