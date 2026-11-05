import express from "express";
import cors from "cors";
import pool, { checkDatabaseConnection } from "./config/database.js";
import { createBookModel } from "./models/book.model.js";
import { createBookRouter } from "./routes/book.routes.js";
import { notFound, errorHandler } from "./middlewares/error-handler.js";
import { createAuthModel } from "./models/auth.model.js";
import { createAuthService } from "./services/auth.service.js";
import { createJwtService } from "./utils/jwt.js";
import { createAuthenticate } from "./middlewares/auth.js";
import { createAuthRouter } from "./routes/auth.routes.js";

export function createApp({ bookModel = createBookModel(pool), authModel = createAuthModel(pool), tokens = createJwtService() } = {}) {
    const app = express();
    const authService = createAuthService(authModel, tokens);
    const authenticate = createAuthenticate(tokens, authService);

    app.use(cors());
    app.use(express.json({ limit: "256kb" }));

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

    app.use("/api/auth", createAuthRouter(authService, authenticate));
    app.use("/api/books", createBookRouter(bookModel, authenticate));
    app.use(notFound);
    app.use(errorHandler);
    return app;
}

export default createApp();
