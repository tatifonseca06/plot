import { Router } from "express";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import * as controller from "../controllers/admin.controller.js";

export const adminRouter = Router();
adminRouter.use(requireAuth, requireAdmin);
adminRouter.get("/organizers", controller.listOrganizers);
adminRouter.get("/experiences", controller.listExperiences);
adminRouter.post("/experiences", controller.create);
adminRouter.put("/experiences/:id", controller.update);
adminRouter.delete("/experiences/:id", controller.remove);
