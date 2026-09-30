import { Request, Response, NextFunction } from "express";
import { MemberRepository } from "../repositories/memberRepository";
import { OrgRepository } from "../repositories/orgRepository";
import { AuditRepository } from "../repositories/auditRepository";
import { UpdateMemberRoleInput } from "@trustshield/shared";
import crypto from "crypto";

export class MemberController {
  public static async listMembers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Not authenticated" } });
        return;
      }

      const members = await MemberRepository.listOrgMembers(req.user.organizationId);
      res.json(members);
    } catch (err) {
      next(err);
    }
  }

  public static async updateMemberRole(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Not authenticated" } });
        return;
      }

      const { role }: UpdateMemberRoleInput = req.body;
      const memberId = req.params.id;

      const updated = await MemberRepository.updateRole(
        req.user.organizationId,
        memberId,
        role
      );

      if (!updated) {
        res.status(404).json({ error: { code: "NOT_FOUND", message: "Organization member not found." } });
        return;
      }

      await AuditRepository.logAction({
        organization_id: req.user.organizationId,
        actor_user_id: req.user.userId,
        action: "MEMBER_ROLE_UPDATED",
        resource_type: "member",
        resource_id: memberId,
        metadata: { new_role: role },
        ip: req.ip,
        user_agent: req.headers["user-agent"]
      });

      res.json({ success: true, member: updated });
    } catch (err) {
      next(err);
    }
  }

  public static async removeMember(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Not authenticated" } });
        return;
      }

      const memberId = req.params.id;

      const removed = await MemberRepository.removeMember(
        req.user.organizationId,
        memberId
      );

      if (!removed) {
        res.status(404).json({ error: { code: "NOT_FOUND", message: "Organization member not found." } });
        return;
      }

      await AuditRepository.logAction({
        organization_id: req.user.organizationId,
        actor_user_id: req.user.userId,
        action: "MEMBER_REMOVED",
        resource_type: "member",
        resource_id: memberId,
        ip: req.ip,
        user_agent: req.headers["user-agent"]
      });

      res.json({ success: true, message: "Member removed from organization." });
    } catch (err) {
      next(err);
    }
  }

  public static async rotateInviteCode(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Not authenticated" } });
        return;
      }

      const newCode = "INV-" + crypto.randomBytes(6).toString("hex").toUpperCase();
      await OrgRepository.rotateInviteCode(req.user.organizationId, newCode);

      await AuditRepository.logAction({
        organization_id: req.user.organizationId,
        actor_user_id: req.user.userId,
        action: "INVITE_CODE_ROTATED",
        resource_type: "organization",
        resource_id: req.user.organizationId,
        ip: req.ip,
        user_agent: req.headers["user-agent"]
      });

      res.json({ success: true, invite_code: newCode });
    } catch (err) {
      next(err);
    }
  }
}
