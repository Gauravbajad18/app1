import { Request, Response, NextFunction } from "express";
import { AuditRepository } from "../repositories/auditRepository";

export class AuditController {
  public static async listLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Not authenticated" } });
        return;
      }

      const limit = parseInt(req.query.limit as string || "50", 10);
      const offset = parseInt(req.query.offset as string || "0", 10);
      const action = req.query.action as string | undefined;

      const result = await AuditRepository.getLogs(
        req.user.organizationId,
        limit,
        offset,
        action
      );

      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  public static async verifyIntegrity(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Not authenticated" } });
        return;
      }

      const verification = await AuditRepository.verifyIntegrity(req.user.organizationId);

      // Log the integrity verification itself!
      await AuditRepository.logAction({
        organization_id: req.user.organizationId,
        actor_user_id: req.user.userId,
        action: "AUDIT_INTEGRITY_VERIFIED",
        resource_type: "audit_log",
        metadata: {
          is_valid: verification.is_valid,
          total_verified: verification.total_verified
        },
        ip: req.ip,
        user_agent: req.headers["user-agent"]
      });

      res.json(verification);
    } catch (err) {
      next(err);
    }
  }
}
