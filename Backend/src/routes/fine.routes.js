import { Router } from "express";
import { authorize } from "../middlewares/auth.js";
import { createFineService } from "../services/fine.service.js";
import { createFineController } from "../controllers/fine.controller.js";

export function createFineRouter(model, authenticate) {
    const router = Router(), controller = createFineController(createFineService(model));
    router.use(authenticate);
    router.get("/", controller.list);
    router.get("/:id", controller.findById);
    router.post("/", authorize("fine_manage"), controller.create);
    router.patch("/:id/payment", authorize("fine_manage"), controller.pay);
    return router;
}
