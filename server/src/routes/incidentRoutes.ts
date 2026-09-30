import { Router } from "express";
import { IncidentController } from "../controllers/incidentController";
import { authenticate } from "../middleware/auth";
import { requireRole } from "../middleware/rbac";
import { validateBody } from "../middleware/validate";
import { aiRateLimiter } from "../middleware/rateLimit";
import { IncidentCreateSchema, IncidentUpdateSchema, IncidentCommentSchema } from "@trustshield/shared";

export const incidentRouter = Router();

incidentRouter.get("/incidents", authenticate, requireRole("analyst"), IncidentController.listIncidents);
incidentRouter.post("/incidents", authenticate, requireRole("analyst"), validateBody(IncidentCreateSchema), IncidentController.createIncident);
incidentRouter.get("/incidents/:id", authenticate, requireRole("analyst"), IncidentController.getIncidentById);
incidentRouter.patch("/incidents/:id", authenticate, requireRole("analyst"), validateBody(IncidentUpdateSchema), IncidentController.updateIncident);
incidentRouter.post("/incidents/:id/comments", authenticate, requireRole("analyst"), validateBody(IncidentCommentSchema), IncidentController.addComment);
incidentRouter.post("/incidents/:id/ai-brief", authenticate, requireRole("analyst"), aiRateLimiter, IncidentController.generateAIBrief);
