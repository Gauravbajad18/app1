import { Request, Response, NextFunction } from "express";
import { RegexDetector, RawFinding } from "../services/detectors/regex";
import { GeminiService } from "../services/ai/gemini";
import { ScanRepository } from "../repositories/scanRepository";
import { DetectionRepository } from "../repositories/detectionRepository";
import { IncidentRepository } from "../repositories/incidentRepository";
import { OrgRepository } from "../repositories/orgRepository";
import { PolicyRepository } from "../repositories/policyRepository";
import { AuditRepository } from "../repositories/auditRepository";
import { AIUsageRepository } from "../repositories/aiUsageRepository";
import { FileExtractor } from "../utils/fileExtractor";
import {
  ScanTextInput,
  DetectionItem,
  Severity,
  DetectorType,
  RedactionMode
} from "@trustshield/shared";

function applyRedaction(
  text: string,
  findings: Array<{ raw_value?: string; masked_value: string; start_offset: number; end_offset: number; data_type: string }>,
  mode: RedactionMode
): string {
  // Sort descending by start offset to avoid shifting offsets
  const sorted = [...findings].sort((a, b) => b.start_offset - a.start_offset);
  let result = text;

  let tokenCounter = 1;
  const tokenMap = new Map<string, string>();

  for (const f of sorted) {
    if (f.start_offset < 0 || f.end_offset > result.length || f.start_offset >= f.end_offset) {
      continue;
    }

    let replacement = f.masked_value;
    if (mode === "remove") {
      replacement = "";
    } else if (mode === "tokenize") {
      const typeKey = f.data_type.toUpperCase();
      if (!tokenMap.has(f.raw_value || f.masked_value)) {
        tokenMap.set(f.raw_value || f.masked_value, `[${typeKey}_${tokenCounter++}]`);
      }
      replacement = tokenMap.get(f.raw_value || f.masked_value)!;
    }

    result = result.slice(0, f.start_offset) + replacement + result.slice(f.end_offset);
  }

  return result;
}

export class ScanController {
  public static async scanText(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Not authenticated" } });
        return;
      }

      const { text, redaction_mode }: ScanTextInput = req.body;
      const orgId = req.user.organizationId;
      const userId = req.user.userId;

      // 1. Run deterministic regex detectors
      const ruleFindings = RegexDetector.detect(text);

      // 2. Pre-mask deterministic values before sending to AI
      let preMaskedText = text;
      const sortedRuleFindings = [...ruleFindings].sort((a, b) => b.start_offset - a.start_offset);
      for (const rf of sortedRuleFindings) {
        preMaskedText =
          preMaskedText.slice(0, rf.start_offset) +
          `[PROTECTED_${rf.data_type.toUpperCase()}]` +
          preMaskedText.slice(rf.end_offset);
      }

      // 3. Contextual AI Analysis via Gemini
      const aiResult = await GeminiService.analyzePrivacy(preMaskedText);

      // Record AI usage metrics
      if (aiResult.tokens_in > 0 || aiResult.latency_ms > 0) {
        await AIUsageRepository.recordUsage({
          organization_id: orgId,
          user_id: userId,
          feature: "privacy_scanner",
          model: aiResult.model,
          tokens_in: aiResult.tokens_in,
          tokens_out: aiResult.tokens_out,
          latency_ms: aiResult.latency_ms,
          success: aiResult.success
        });
      }

      // 4. Merge deterministic findings and AI findings
      const mergedFindings: Array<{
        category: string;
        data_type: string;
        detector: DetectorType;
        masked_value: string;
        start_offset: number;
        end_offset: number;
        confidence: number;
        severity: Severity;
        evidence?: Record<string, any>;
        recommended_action: string;
        raw_value?: string;
      }> = [];

      for (const rf of ruleFindings) {
        mergedFindings.push({
          category: rf.category,
          data_type: rf.data_type,
          detector: "rule",
          masked_value: rf.masked_value,
          start_offset: rf.start_offset,
          end_offset: rf.end_offset,
          confidence: rf.confidence,
          severity: rf.severity,
          evidence: rf.evidence,
          recommended_action: rf.recommended_action,
          raw_value: rf.raw_value
        });
      }

      if (aiResult.success && aiResult.data?.findings) {
        for (const af of aiResult.data.findings) {
          mergedFindings.push({
            category: "contextual_pii",
            data_type: af.data_type,
            detector: "ai",
            masked_value: af.text_snippet_masked,
            start_offset: Math.min(af.start_offset, text.length),
            end_offset: Math.min(af.end_offset, text.length),
            confidence: af.confidence,
            severity: af.severity as Severity,
            evidence: { reason: af.reason },
            recommended_action: `Contextual risk flagged by AI: ${af.reason}`
          });
        }
      }

      // 5. Calculate overall risk score and severity
      let computedRisk = mergedFindings.reduce((acc, f) => {
        const weight = f.severity === "critical" ? 30 : f.severity === "high" ? 20 : f.severity === "medium" ? 10 : 5;
        return acc + weight;
      }, 0);

      const overallRiskScore = Math.min(100, Math.max(computedRisk, aiResult.data?.overall_risk_score || 0));
      const overallSeverity: Severity =
        overallRiskScore >= 75
          ? "critical"
          : overallRiskScore >= 50
          ? "high"
          : overallRiskScore >= 25
          ? "medium"
          : "low";

      // 6. Generate redacted text
      const redactedContent = applyRedaction(text, mergedFindings, redaction_mode);

      // 7. Store scan record
      const scan = await ScanRepository.createScan({
        organization_id: orgId,
        user_id: userId,
        source: "text",
        content: text,
        redacted_content: redactedContent,
        risk_score: overallRiskScore,
        severity: overallSeverity,
        model: aiResult.model
      });

      // 8. Store detections
      const createdDetections = await DetectionRepository.createDetections(
        orgId,
        scan.id,
        userId,
        mergedFindings
      );

      // 9. Auto-create incident if high/critical
      const org = await OrgRepository.findById(orgId);
      const threshold = org?.settings?.auto_incident_threshold || "high";
      const shouldAutoCreateIncident =
        (threshold === "medium" && (overallSeverity === "medium" || overallSeverity === "high" || overallSeverity === "critical")) ||
        (threshold === "high" && (overallSeverity === "high" || overallSeverity === "critical")) ||
        (threshold === "critical" && overallSeverity === "critical");

      if (shouldAutoCreateIncident && mergedFindings.length > 0) {
        await IncidentRepository.createIncident({
          organization_id: orgId,
          title: `Sensitive Data Exposure: ${mergedFindings.length} items (${overallSeverity.toUpperCase()})`,
          description: `Automated detection detected ${mergedFindings.length} sensitive items in text scan (Source: Privacy Scanner). Highest severity: ${overallSeverity}.`,
          source_type: "privacy_scan",
          severity: overallSeverity,
          created_by: userId,
          detection_ids: createdDetections.map(d => d.id)
        });
      }

      await AuditRepository.logAction({
        organization_id: orgId,
        actor_user_id: userId,
        action: "PRIVACY_SCAN_COMPLETED",
        resource_type: "scan",
        resource_id: scan.id,
        metadata: {
          findings_count: mergedFindings.length,
          risk_score: overallRiskScore,
          severity: overallSeverity,
          ai_status: aiResult.ai_status
        },
        ip: req.ip,
        user_agent: req.headers["user-agent"]
      });

      res.json({
        scan_id: scan.id,
        risk_score: overallRiskScore,
        severity: overallSeverity,
        findings: createdDetections,
        redacted_content: redactedContent,
        original_length: text.length,
        redacted_length: redactedContent.length,
        ai_status: aiResult.ai_status,
        summary: aiResult.data?.summary || `Analyzed content. Identified ${mergedFindings.length} sensitive data indicators.`,
        recommended_actions: aiResult.data?.recommended_actions || [
          "Mask or remove identified credentials and PII prior to external sharing.",
          "Review policy enforcement matrix for identified categories."
        ]
      });
    } catch (err) {
      next(err);
    }
  }

  public static async scanFile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Not authenticated" } });
        return;
      }

      if (!req.file) {
        res.status(400).json({ error: { code: "FILE_REQUIRED", message: "No file was uploaded." } });
        return;
      }

      const redaction_mode = (req.body.redaction_mode as RedactionMode) || "mask";
      const text = await FileExtractor.extractText(req.file.buffer, req.file.originalname);

      if (!text || text.trim().length === 0) {
        res.status(400).json({
          error: {
            code: "EMPTY_FILE",
            message: "Extracted file content is empty or contains no parseable text."
          }
        });
        return;
      }

      // Reuse scan logic on extracted text
      req.body = { text, redaction_mode };
      return ScanController.scanText(req, res, next);
    } catch (err) {
      next(err);
    }
  }

  public static async listDetections(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Not authenticated" } });
        return;
      }

      const severity = req.query.severity as string | undefined;
      const dataType = req.query.data_type as string | undefined;
      const detector = req.query.detector as string | undefined;
      const limit = parseInt(req.query.limit as string || "50", 10);
      const offset = parseInt(req.query.offset as string || "0", 10);

      const results = await DetectionRepository.listDetections(req.user.organizationId, {
        severity,
        dataType,
        detector,
        limit,
        offset
      });

      res.json(results);
    } catch (err) {
      next(err);
    }
  }

  public static async getDetectionById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Not authenticated" } });
        return;
      }

      const detection = await DetectionRepository.getById(
        req.user.organizationId,
        req.params.id
      );

      // Return 404 for cross-organization isolation
      if (!detection) {
        res.status(404).json({ error: { code: "NOT_FOUND", message: "Detection record not found." } });
        return;
      }

      const feedback = await DetectionRepository.getFeedback(
        req.user.organizationId,
        detection.id
      );

      res.json({
        detection,
        feedback
      });
    } catch (err) {
      next(err);
    }
  }

  public static async submitFeedback(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Not authenticated" } });
        return;
      }

      const { verdict, note } = req.body;
      const detection = await DetectionRepository.getById(
        req.user.organizationId,
        req.params.id
      );

      if (!detection) {
        res.status(404).json({ error: { code: "NOT_FOUND", message: "Detection record not found." } });
        return;
      }

      const feedback = await DetectionRepository.saveFeedback(
        req.user.organizationId,
        detection.id,
        req.user.userId,
        verdict,
        note
      );

      await AuditRepository.logAction({
        organization_id: req.user.organizationId,
        actor_user_id: req.user.userId,
        action: "DETECTION_FEEDBACK_SUBMITTED",
        resource_type: "detection",
        resource_id: detection.id,
        metadata: { verdict, note },
        ip: req.ip,
        user_agent: req.headers["user-agent"]
      });

      res.status(201).json({ success: true, feedback });
    } catch (err) {
      next(err);
    }
  }
}
