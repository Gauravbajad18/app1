import { Request, Response, NextFunction } from "express";
import { PolicyRepository } from "../repositories/policyRepository";
import { OrgRepository } from "../repositories/orgRepository";
import { AuditRepository } from "../repositories/auditRepository";
import { PolicyUpdateInput } from "@trustshield/shared";

export class PolicyController {
  public static async getPolicies(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Not authenticated" } });
        return;
      }

      const policies = await PolicyRepository.getPolicies(req.user.organizationId);
      const org = await OrgRepository.findById(req.user.organizationId);

      res.json({
        policies,
        settings: org?.settings || {
          auto_incident_threshold: "high",
          data_retention_days: 90,
          store_raw_content: false,
          ai_daily_limit_per_user: 200
        }
      });
    } catch (err) {
      next(err);
    }
  }

  public static async updatePolicies(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Not authenticated" } });
        return;
      }

      const orgId = req.user.organizationId;
      const data: PolicyUpdateInput = req.body;
      const oldPolicies = await PolicyRepository.getPolicies(orgId);
      const oldOrg = await OrgRepository.findById(orgId);

      // Update per-data-type policies
      const updatedPolicies: any[] = [];
      if (data.policies && Array.isArray(data.policies)) {
        for (const item of data.policies) {
          const updated = await PolicyRepository.upsertPolicy(orgId, item);
          updatedPolicies.push(updated);
        }
      }

      // Update org settings
      const settingsUpdates: any = {};
      if (data.auto_incident_threshold !== undefined) {
        settingsUpdates.auto_incident_threshold = data.auto_incident_threshold;
      }
      if (data.data_retention_days !== undefined) {
        settingsUpdates.data_retention_days = data.data_retention_days;
      }
      if (data.store_raw_content !== undefined) {
        settingsUpdates.store_raw_content = data.store_raw_content;
      }
      if (data.ai_daily_limit_per_user !== undefined) {
        settingsUpdates.ai_daily_limit_per_user = data.ai_daily_limit_per_user;
      }

      let updatedOrg = oldOrg;
      if (Object.keys(settingsUpdates).length > 0) {
        updatedOrg = await OrgRepository.updateSettings(orgId, settingsUpdates);
      }

      // Audit log before/after change as mandated
      await AuditRepository.logAction({
        organization_id: orgId,
        actor_user_id: req.user.userId,
        action: "PRIVACY_POLICY_UPDATED",
        resource_type: "policy",
        metadata: {
          before: { policies_count: oldPolicies.length, settings: oldOrg?.settings },
          after: { policies_updated: updatedPolicies.length, settings: updatedOrg?.settings }
        },
        ip: req.ip,
        user_agent: req.headers["user-agent"]
      });

      res.json({
        success: true,
        policies: updatedPolicies.length > 0 ? updatedPolicies : oldPolicies,
        settings: updatedOrg?.settings
      });
    } catch (err) {
      next(err);
    }
  }
}
