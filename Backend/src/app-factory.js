import express from "express";
import cors from "cors";
import { createBookModel } from "./models/book.model.js";
import { createBookRouter } from "./routes/book.routes.js";
import { notFound, errorHandler } from "./middlewares/error-handler.js";
import { createAuthModel } from "./models/auth.model.js";
import { createAuthService } from "./services/auth.service.js";
import { createJwtService } from "./utils/jwt.js";
import { createAuthenticate } from "./middlewares/auth.js";
import { createAuthRouter } from "./routes/auth.routes.js";
import { createCategoryModel } from "./models/category.model.js";
import { createBookCopyModel } from "./models/book-copy.model.js";
import { createCategoryRouter } from "./routes/category.routes.js";
import { createBookCopyRouter, createBookCopiesForBookRouter } from "./routes/book-copy.routes.js";
import { createBorrowModel } from "./models/borrow.model.js";
import { createBorrowRouter } from "./routes/borrow.routes.js";
import { createFineModel } from "./models/fine.model.js";
import { createFineRouter } from "./routes/fine.routes.js";
import { createOverdueModel } from "./models/overdue.model.js";
import { createOverdueRouter } from "./routes/overdue.routes.js";
import { createUsageHistoryModel } from "./models/usage-history.model.js";
import { createUsageHistoryRouter } from "./routes/usage-history.routes.js";
import { createStatisticsModel } from "./models/statistics.model.js";
import { createStatisticsRouter } from "./routes/statistics.routes.js";

// No import of database.js/dotenv here. Every default model and health query uses this database.
export function buildApp({
    database,
    bookModel = createBookModel(database),
    authModel = createAuthModel(database),
    tokens = createJwtService(),
    categoryModel = createCategoryModel(database),
    bookCopyModel = createBookCopyModel(database),
    borrowModel = createBorrowModel(database),
    fineModel = createFineModel(database),
    overdueModel = createOverdueModel(database),
    usageHistoryModel = createUsageHistoryModel(database),
    statisticsModel = createStatisticsModel(database),
} = {}) {
    if (!database || typeof database.query !== "function") throw new Error("An explicit database dependency is required.");
    const app = express();
    const authService = createAuthService(authModel, tokens);
    const authenticate = createAuthenticate(tokens, authService);
    app.use(cors());
    app.use(express.json({ limit: "256kb" }));
    app.get("/api/health", (req, res) => res.status(200).json({ success: true, message: "LibriFlow Backend is running" }));
    app.get("/api/health/db", async (req, res) => {
        try { await database.query("SELECT 1");res.status(200).json({ success: true, database: "connected" }); }
        catch { res.status(503).json({ success: false, database: "disconnected" }); }
    });
    app.use("/api/auth", createAuthRouter(authService, authenticate));
    app.use("/api/usage-history", createUsageHistoryRouter(usageHistoryModel, authenticate));
    app.use("/api/statistics", createStatisticsRouter(statisticsModel, authenticate));
    app.use("/api", createOverdueRouter(overdueModel, authenticate));
    app.use("/api/fines", createFineRouter(fineModel, authenticate));
    app.use("/api/borrows", createBorrowRouter(borrowModel, authenticate));
    app.use("/api/categories", createCategoryRouter(categoryModel, authenticate));
    app.use("/api/book-copies", createBookCopyRouter(bookCopyModel, authenticate));
    app.use("/api/books", createBookCopiesForBookRouter(bookCopyModel));
    app.use("/api/books", createBookRouter(bookModel, authenticate));
    app.use(notFound);
    app.use(errorHandler);
    return app;
}
