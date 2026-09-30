import { Router } from "express";
import { MemberController } from "../controllers/memberController";
import { authenticate } from "../middleware/auth";
import { requireRole } from "../middleware/rbac";
import { validateBody } from "../middleware/validate";
import { UpdateMemberRoleSchema } from "@trustshield/shared";

export const memberRouter = Router();

memberRouter.get("/members", authenticate, requireRole("org_admin"), MemberController.listMembers);
memberRouter.patch("/members/:id/role", authenticate, requireRole("org_admin"), validateBody(UpdateMemberRoleSchema), MemberController.updateMemberRole);
memberRouter.delete("/members/:id", authenticate, requireRole("org_admin"), MemberController.removeMember);
memberRouter.post("/members/invite-code", authenticate, requireRole("org_admin"), MemberController.rotateInviteCode);
