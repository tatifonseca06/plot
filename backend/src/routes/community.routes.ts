import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { requireAuth, requireAdmin, optionalAuth } from "../middleware/auth.js";
import * as catalog from "../controllers/catalog.controller.js";
import * as planning from "../controllers/planning.controller.js";
import { createPlan, planSchema, addOption } from "../services/plan.service.js";
import { idSchema, occurrenceSchema } from "../validations.js";
import * as rooms from "../controllers/room.controller.js";

export const communityRouter = Router();
communityRouter.get("/catalog", catalog.list);
communityRouter.get("/catalog/:id", optionalAuth, catalog.detail);
communityRouter.use(requireAuth);
communityRouter.post("/plans", async (req, res) => {
  res
    .status(201)
    .json({ data: await createPlan(planSchema.parse(req.body), req.user!) });
});
communityRouter.post("/rooms/:id/options", async (req, res) => {
  res
    .status(201)
    .json({
      data: await addOption(
        idSchema.parse(req.params.id),
        occurrenceSchema.parse(req.body),
        req.user!,
      ),
    });
});
communityRouter.get("/manage/:id", planning.management);
communityRouter.post("/manage/:id/submit", planning.submit);
communityRouter.post("/manage/:id/occurrences", planning.createOccurrence);
communityRouter.post("/manage/:id/missions", planning.createMission);
communityRouter.patch("/occurrences/:id", planning.updateOccurrence);
communityRouter.post("/occurrences/:id/reservations", planning.book);
communityRouter.get("/reservations", planning.myReservations);
communityRouter.delete("/reservations/:id", planning.cancel);
communityRouter.patch("/reservations/:id/attendance", planning.attendance);
communityRouter.post(
  "/reservations/:id/missions/:missionId",
  planning.completeMission,
);
communityRouter.post("/reservations/:id/review", planning.review);
communityRouter.get("/rooms", rooms.list);
communityRouter.post("/rooms", rooms.create);
communityRouter.post(
  "/rooms/join",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 30,
    standardHeaders: "draft-8",
    legacyHeaders: false,
  }),
  rooms.join,
);
communityRouter.get("/rooms/:id", rooms.get);
communityRouter.post("/rooms/:id/proposals", rooms.propose);
communityRouter.put("/rooms/:id/vote", rooms.vote);
communityRouter.post("/rooms/:id/close", rooms.close);
communityRouter.patch(
  "/moderation/experiences/:id",
  requireAdmin,
  planning.moderate,
);
communityRouter.get("/moderation/reviews", requireAdmin, planning.listReviews);
communityRouter.patch(
  "/moderation/reviews/:id",
  requireAdmin,
  planning.moderateReview,
);
