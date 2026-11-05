import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { createAuthController } from "../controllers/auth.controller.js";
import { HttpError } from "../utils/http-error.js";

export function createAuthRouter(service, authenticate) {
    const router = Router();
    const controller = createAuthController(service);
    const limiter = (limit) => rateLimit({
        windowMs: 15 * 60 * 1000, limit, standardHeaders: "draft-7", legacyHeaders: false,
        handler(req, res, next) { next(new HttpError(429, "TOO_MANY_ATTEMPTS", "Quá nhiều yêu cầu. Vui lòng thử lại sau.")); },
    });
    router.use((req, res, next) => { res.set("Cache-Control", "no-store"); next(); });
    router.post("/register", limiter(5), controller.register);
    router.post("/login", limiter(10), controller.login);
    router.get("/me", authenticate, controller.me);
    router.post("/logout", authenticate, controller.logout);
    return router;
}
