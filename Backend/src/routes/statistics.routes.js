import { Router } from "express";
import { authorize } from "../middlewares/auth.js";
import { createStatisticsService } from "../services/statistics.service.js";
import { createStatisticsController } from "../controllers/statistics.controller.js";

export function createStatisticsRouter(model, authenticate) {
    const router = Router(), controller = createStatisticsController(createStatisticsService(model));
    router.use(authenticate, authorize("report_view"));
    router.use((req, res, next) => { res.set("Cache-Control", "no-store"); next(); });
    router.get("/overview", controller.overview);
    router.get("/borrows", controller.borrows);
    router.get("/users", controller.users);
    return router;
}
