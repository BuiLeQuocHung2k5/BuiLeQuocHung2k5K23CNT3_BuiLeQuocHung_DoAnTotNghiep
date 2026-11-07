import { Router } from "express";
import { createOverdueService } from "../services/overdue.service.js";
import { createOverdueController } from "../controllers/overdue.controller.js";

export function createOverdueRouter(model, authenticate) {
    const router = Router(), controller = createOverdueController(createOverdueService(model));
    router.get("/overdues", authenticate, controller.list);
    router.get("/borrows/:id/overdue", authenticate, controller.findByBorrow);
    return router;
}
