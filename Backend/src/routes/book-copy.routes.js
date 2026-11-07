import { Router } from "express";
import { authorize } from "../middlewares/auth.js";
import { createBookCopyController } from "../controllers/book-copy.controller.js";
import { createBookCopyService } from "../services/book-copy.service.js";

export function createBookCopyRouter(model, authenticate) {
    const router = Router();
    const controller = createBookCopyController(createBookCopyService(model));
    router.get("/", controller.list);
    router.get("/:id", controller.findById);
    router.post("/", authenticate, authorize("copy_manage"), controller.create);
    router.put("/:id", authenticate, authorize("copy_manage"), controller.replace);
    router.delete("/:id", authenticate, authorize("copy_manage"), controller.remove);
    return router;
}

export function createBookCopiesForBookRouter(model) {
    const router = Router();
    router.get("/:id/copies", createBookCopyController(createBookCopyService(model)).listForBook);
    return router;
}
