import { Router } from "express";
import { PolicyController } from "../controllers/policyController";
import { authenticate } from "../middleware/auth";
import { requireRole } from "../middleware/rbac";
import { validateBody } from "../middleware/validate";
import { PolicyUpdateSchema } from "@trustshield/shared";

export const policyRouter = Router();

policyRouter.get("/policies", authenticate, PolicyController.getPolicies);
policyRouter.put("/policies", authenticate, requireRole("org_admin"), validateBody(PolicyUpdateSchema), PolicyController.updatePolicies);
