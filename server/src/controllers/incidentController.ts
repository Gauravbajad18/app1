import { Request, Response, NextFunction } from "express";
import { IncidentRepository } from "../repositories/incidentRepository";
import { GeminiService } from "../services/ai/gemini";
import { AuditRepository } from "../repositories/auditRepository";
import { AIUsageRepository } from "../repositories/aiUsageRepository";
import { IncidentCreateInput, IncidentUpdateInput, IncidentCommentInput } from "@trustshield/shared";

export class IncidentController {
  public static async listIncidents(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Not authenticated" } });
        return;
      }

      const status = req.query.status as string | undefined;
      const severity = req.query.severity as string | undefined;
      const limit = parseInt(req.query.limit as string || "50", 10);
      const offset = parseInt(req.query.offset as string || "0", 10);

      const results = await IncidentRepository.getIncidents(req.user.organizationId, {
        status,
        severity,
        limit,
        offset
      });

      res.json(results);
    } catch (err) {
      next(err);
    }
  }

  public static async createIncident(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Not authenticated" } });
        return;
      }

      const data: IncidentCreateInput = req.body;
      const incident = await IncidentRepository.createIncident({
        organization_id: req.user.organizationId,
        title: data.title,
        description: data.description,
        source_type: data.source_type,
        severity: data.severity,
        created_by: req.user.userId,
        assignee_id: data.assignee_id,
        detection_ids: data.detection_ids
      });

      await AuditRepository.logAction({
        organization_id: req.user.organizationId,
        actor_user_id: req.user.userId,
        action: "INCIDENT_CREATED",
        resource_type: "incident",
        resource_id: incident.id,
        metadata: { title: incident.title, severity: incident.severity },
        ip: req.ip,
        user_agent: req.headers["user-agent"]
      });

      res.status(201).json(incident);
    } catch (err) {
      next(err);
    }
  }

  public static async getIncidentById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Not authenticated" } });
        return;
      }

      const incident = await IncidentRepository.getIncidentById(
        req.user.organizationId,
        req.params.id
      );

      if (!incident) {
        res.status(404).json({ error: { code: "NOT_FOUND", message: "Incident not found." } });
        return;
      }

      const comments = await IncidentRepository.getComments(req.user.organizationId, incident.id);
      const detections = await IncidentRepository.getLinkedDetections(req.user.organizationId, incident.id);

      res.json({
        incident,
        comments,
        detections
      });
    } catch (err) {
      next(err);
    }
  }

  public static async updateIncident(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Not authenticated" } });
        return;
      }

      const updates: IncidentUpdateInput = req.body;
      const updated = await IncidentRepository.updateIncident(
        req.user.organizationId,
        req.params.id,
        updates
      );

      if (!updated) {
        res.status(404).json({ error: { code: "NOT_FOUND", message: "Incident not found." } });
        return;
      }

      await AuditRepository.logAction({
        organization_id: req.user.organizationId,
        actor_user_id: req.user.userId,
        action: "INCIDENT_UPDATED",
        resource_type: "incident",
        resource_id: updated.id,
        metadata: updates,
        ip: req.ip,
        user_agent: req.headers["user-agent"]
      });

      res.json(updated);
    } catch (err) {
      next(err);
    }
  }

  public static async addComment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Not authenticated" } });
        return;
      }

      const { body }: IncidentCommentInput = req.body;
      const comment = await IncidentRepository.addComment(
        req.user.organizationId,
        req.params.id,
        req.user.userId,
        body
      );

      res.status(201).json(comment);
    } catch (err) {
      next(err);
    }
  }

  public static async generateAIBrief(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Not authenticated" } });
        return;
      }

      const incident = await IncidentRepository.getIncidentById(
        req.user.organizationId,
        req.params.id
      );

      if (!incident) {
        res.status(404).json({ error: { code: "NOT_FOUND", message: "Incident not found." } });
        return;
      }

      const detections = await IncidentRepository.getLinkedDetections(req.user.organizationId, incident.id);

      const aiBriefResult = await GeminiService.generateIncidentBrief(
        incident.title,
        incident.description,
        incident.severity,
        detections
      );

      let briefPayload = aiBriefResult.data;
      if (!briefPayload) {
        briefPayload = {
          summary: `Security incident involving ${incident.source_type}. Immediate SOC triage required.`,
          likely_impact: "Potential regulatory non-compliance and exposure of organizational data assets.",
          containment_steps: [
            "Verify affected user session and revoke active refresh tokens.",
            "Review firewall detection logs for associated IP or device hashes.",
            "Enforce mask or block policy for affected data types."
          ],
          root_cause_hypotheses: [
            "Unsanitized input pasted into digital communication channel.",
            "Lack of client-side data loss prevention (DLP) controls."
          ],
          severity_assessment: incident.severity
        };
      }

      // Update incident with AI Brief
      const updated = await IncidentRepository.updateIncident(
        req.user.organizationId,
        incident.id,
        { ai_brief: briefPayload }
      );

      if (aiBriefResult.tokens_in > 0 || aiBriefResult.latency_ms > 0) {
        await AIUsageRepository.recordUsage({
          organization_id: req.user.organizationId,
          user_id: req.user.userId,
          feature: "incident_brief",
          model: aiBriefResult.model,
          tokens_in: aiBriefResult.tokens_in,
          tokens_out: aiBriefResult.tokens_out,
          latency_ms: aiBriefResult.latency_ms,
          success: aiBriefResult.success
        });
      }

      await AuditRepository.logAction({
        organization_id: req.user.organizationId,
        actor_user_id: req.user.userId,
        action: "INCIDENT_AI_BRIEF_GENERATED",
        resource_type: "incident",
        resource_id: incident.id,
        metadata: { severity: briefPayload.severity_assessment },
        ip: req.ip,
        user_agent: req.headers["user-agent"]
      });

      res.json({
        incident: updated,
        ai_brief: briefPayload,
        ai_status: aiBriefResult.ai_status
      });
    } catch (err) {
      next(err);
    }
  }
}
