import { Router } from "express";
import { AuditController } from "../controllers/auditController";
import { authenticate } from "../middleware/auth";
import { requireRole } from "../middleware/rbac";

export const auditRouter = Router();

auditRouter.get("/audit", authenticate, requireRole("org_admin"), AuditController.listLogs);
auditRouter.get("/audit/verify", authenticate, requireRole("org_admin"), AuditController.verifyIntegrity);
