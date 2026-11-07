import { Router } from "express";
import { authorize } from "../middlewares/auth.js";
import { createBorrowService } from "../services/borrow.service.js";
import { createBorrowController } from "../controllers/borrow.controller.js";

export function createBorrowRouter(model, authenticate) {
    const router = Router();
    const controller = createBorrowController(createBorrowService(model));
    router.use(authenticate);
    router.get("/", controller.list);
    router.get("/:id", controller.findById);
    router.post("/", authorize("borrow_manage"), controller.create);
    router.post("/:id/return", authorize("return_process"), controller.returnCopies);
    return router;
}
