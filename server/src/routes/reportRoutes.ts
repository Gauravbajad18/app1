import { Router } from "express";
import { ReportController } from "../controllers/reportController";
import { authenticate } from "../middleware/auth";
import { requireRole } from "../middleware/rbac";
import { validateBody } from "../middleware/validate";
import { aiRateLimiter } from "../middleware/rateLimit";
import { ReportRequestSchema } from "@trustshield/shared";

export const reportRouter = Router();

reportRouter.get("/reports", authenticate, requireRole("analyst"), ReportController.listReports);
reportRouter.post("/reports", authenticate, requireRole("analyst"), aiRateLimiter, validateBody(ReportRequestSchema), ReportController.generateReport);
reportRouter.get("/reports/:id", authenticate, requireRole("analyst"), ReportController.getReportById);
