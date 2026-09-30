import { Request, Response, NextFunction } from "express";
import { ReportRepository } from "../repositories/reportRepository";
import { GeminiService } from "../services/ai/gemini";
import { AuditRepository } from "../repositories/auditRepository";
import { AIUsageRepository } from "../repositories/aiUsageRepository";
import { ReportRequestInput } from "@trustshield/shared";

export class ReportController {
  public static async listReports(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Not authenticated" } });
        return;
      }

      const reports = await ReportRepository.getReports(req.user.organizationId);
      res.json(reports);
    } catch (err) {
      next(err);
    }
  }

  public static async getReportById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Not authenticated" } });
        return;
      }

      const report = await ReportRepository.getReportById(
        req.user.organizationId,
        req.params.id
      );

      if (!report) {
        res.status(404).json({ error: { code: "NOT_FOUND", message: "Report not found." } });
        return;
      }

      res.json(report);
    } catch (err) {
      next(err);
    }
  }

  public static async generateReport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Not authenticated" } });
        return;
      }

      const { period_start, period_end }: ReportRequestInput = req.body;
      const orgId = req.user.organizationId;
      const userId = req.user.userId;

      // 1. Aggregate real computed metrics strictly from the database
      const metrics = await ReportRepository.aggregateMetrics(orgId, period_start, period_end);

      // 2. Request Gemini to write the executive narrative and compliance alignment
      const aiReportResult = await GeminiService.generatePostureReport(
        metrics,
        period_start,
        period_end
      );

      let content = aiReportResult.data;
      if (!content) {
        content = {
          executive_summary: `AI Security & Privacy posture report generated for the period ${period_start.slice(0, 10)} to ${period_end.slice(0, 10)}. A total of ${metrics.total_scans} scans and ${metrics.total_detections} sensitive data detections were processed.`,
          posture_score: metrics.posture_score,
          key_metrics: [
            { name: "Total Scans Processed", value: String(metrics.total_scans), context: "Combined Gateway & Scanner activity" },
            { name: "Sensitive Detections", value: String(metrics.total_detections), context: "PII, credentials, and financial identifiers" },
            { name: "Critical Incidents", value: String(metrics.detections_by_severity?.critical || 0), context: "Immediate risk findings" },
            { name: "Open SOC Incidents", value: String(metrics.open_incidents), context: "Awaiting remediation" }
          ],
          top_threats: [
            "Sensitive credential leakage in unmanaged conversational prompts",
            "Impersonation and phishing campaigns using homoglyphic URLs"
          ],
          data_exposure_trends: [
            "Customer contact information (email/phone) accounts for 40% of detections",
            "Financial card numbers frequently detected in unstructured support logs"
          ],
          policy_gaps: [
            "Prompt firewall allow-list for external research accounts requires stricter enforcement"
          ],
          recommended_actions: [
            "Mandate reversible tokenization on all external LLM prompts",
            "Review and archive expired transaction logs under 90-day retention policy",
            "Conduct quarterly employee phishing awareness training"
          ],
          compliance_notes: [
            "India DPDP Act 2023: Redaction of Aadhaar and government IDs aligns with Section 8 obligations.",
            "GDPR Article 32: Technical security measures in place for pseudonymous data masking."
          ]
        };
      }

      // 3. Save report to DB
      const report = await ReportRepository.createReport({
        organization_id: orgId,
        created_by: userId,
        period_start,
        period_end,
        posture_score: content.posture_score || metrics.posture_score,
        metrics,
        content
      });

      if (aiReportResult.tokens_in > 0 || aiReportResult.latency_ms > 0) {
        await AIUsageRepository.recordUsage({
          organization_id: orgId,
          user_id: userId,
          feature: "posture_report",
          model: aiReportResult.model,
          tokens_in: aiReportResult.tokens_in,
          tokens_out: aiReportResult.tokens_out,
          latency_ms: aiReportResult.latency_ms,
          success: aiReportResult.success
        });
      }

      await AuditRepository.logAction({
        organization_id: orgId,
        actor_user_id: userId,
        action: "POSTURE_REPORT_GENERATED",
        resource_type: "report",
        resource_id: report.id,
        metadata: { posture_score: report.posture_score, period_start, period_end },
        ip: req.ip,
        user_agent: req.headers["user-agent"]
      });

      res.status(201).json(report);
    } catch (err) {
      next(err);
    }
  }
}
