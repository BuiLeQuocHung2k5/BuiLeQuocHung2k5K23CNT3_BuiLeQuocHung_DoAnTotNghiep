import { Router } from "express";
import { createBookController } from "../controllers/book.controller.js";
import { createBookService } from "../services/book.service.js";
import { authorize } from "../middlewares/auth.js";

export function createBookRouter(model, authenticate) {
    const router = Router();
    const controller = createBookController(createBookService(model));
    // Express 5 forwards rejected async handlers to the error middleware.
    router.get("/", controller.list);
    router.get("/:id", controller.findById);
    router.post("/", authenticate, authorize("book_create"), controller.create);
    router.put("/:id", authenticate, authorize("book_update"), controller.replace);
    router.delete("/:id", authenticate, authorize("book_delete"), controller.remove);
    return router;
}
