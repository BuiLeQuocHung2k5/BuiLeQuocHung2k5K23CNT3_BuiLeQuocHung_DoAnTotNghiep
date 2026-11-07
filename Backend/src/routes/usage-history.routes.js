import { Router } from "express";
import { createUsageHistoryService } from "../services/usage-history.service.js";
import { createUsageHistoryController } from "../controllers/usage-history.controller.js";

export function createUsageHistoryRouter(model, authenticate) {
    const router = Router(), controller = createUsageHistoryController(createUsageHistoryService(model));
    router.use(authenticate);
    router.use((req, res, next) => { res.set("Cache-Control", "no-store"); next(); });
    router.get("/", controller.list);
    router.get("/me", controller.me);
    return router;
}
