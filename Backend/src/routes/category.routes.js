import { Router } from "express";
import { createCategoryController } from "../controllers/category.controller.js";
import { createCategoryService } from "../services/category.service.js";
import { authorize } from "../middlewares/auth.js";

export function createCategoryRouter(model, authenticate) {
    const router = Router();
    const controller = createCategoryController(createCategoryService(model));
    router.get("/", controller.list);
    router.get("/:id", controller.findById);
    router.post("/", authenticate, authorize("category_manage"), controller.create);
    router.put("/:id", authenticate, authorize("category_manage"), controller.replace);
    router.delete("/:id", authenticate, authorize("category_manage"), controller.remove);
    return router;
}
