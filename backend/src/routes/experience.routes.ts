import { Router } from "express";
import { requireAuth, requireOrganizer } from "../middleware/auth.js";
import * as controller from "../controllers/experience.controller.js";

export const experienceRouter = Router();
experienceRouter.use(requireAuth, requireOrganizer);
experienceRouter.get("/", controller.list);
experienceRouter.get("/:id", controller.get);
experienceRouter.post("/", controller.create);
experienceRouter.put("/:id", controller.update);
experienceRouter.delete("/:id", controller.remove);
