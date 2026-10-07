import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import * as controller from "../controllers/auth.controller.js";
import { requireAuth } from "../middleware/auth.js";

export const authRouter = Router();
const limit = rateLimit({
  windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: "draft-8", legacyHeaders: false,
  message: { error: { code: "RATE_LIMITED", message: "Demasiados intentos. Vuelve a intentarlo en 15 minutos." } },
});
authRouter.post("/register", limit, controller.register);
authRouter.post("/login", limit, controller.login);
authRouter.post("/logout", controller.logout);
authRouter.get("/me", requireAuth, controller.me);
