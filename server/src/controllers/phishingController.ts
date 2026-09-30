import { Request, Response, NextFunction } from "express";
import { PhishingDetector } from "../services/detectors/phishingSignals";
import { GeminiService } from "../services/ai/gemini";
import { PhishingRepository } from "../repositories/phishingRepository";
import { ScanRepository } from "../repositories/scanRepository";
import { IncidentRepository } from "../repositories/incidentRepository";
import { AuditRepository } from "../repositories/auditRepository";
import { AIUsageRepository } from "../repositories/aiUsageRepository";
import { PhishingInput, PhishingVerdict, Severity } from "@trustshield/shared";

export class PhishingController {
  public static async analyze(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Not authenticated" } });
        return;
      }

      const { input_type, content, headers }: PhishingInput = req.body;
      const orgId = req.user.organizationId;
      const userId = req.user.userId;

      // 1. Run deterministic signal analyzer (never calls network)
      const detAnalysis = PhishingDetector.analyze(content, headers);

      // 2. Run Gemini contextual analysis
      const signalNames = detAnalysis.signals.map(s => s.type);
      const aiResult = await GeminiService.analyzePhishing(content, input_type, signalNames);

      if (aiResult.tokens_in > 0 || aiResult.latency_ms > 0) {
        await AIUsageRepository.recordUsage({
          organization_id: orgId,
          user_id: userId,
          feature: "phishing_analyzer",
          model: aiResult.model,
          tokens_in: aiResult.tokens_in,
          tokens_out: aiResult.tokens_out,
          latency_ms: aiResult.latency_ms,
          success: aiResult.success
        });
      }

      // 3. Merge indicators
      const mergedIndicators: Array<{ type: string; evidence: string; severity: Severity }> = [];
      for (const s of detAnalysis.signals) {
        mergedIndicators.push({
          type: s.type,
          evidence: s.evidence,
          severity: s.severity
        });
      }

      if (aiResult.success && aiResult.data?.indicators) {
        for (const ind of aiResult.data.indicators) {
          mergedIndicators.push({
            type: ind.type,
            evidence: ind.evidence,
            severity: ind.severity as Severity
          });
        }
      }

      // Merge tactics
      const tacticsSet = new Set<"urgency" | "authority" | "fear" | "reward" | "impersonation" | "other">(
        detAnalysis.tactics
      );
      if (aiResult.success && aiResult.data?.manipulation_tactics) {
        for (const t of aiResult.data.manipulation_tactics) {
          tacticsSet.add(t);
        }
      }

      // Determine final risk score and verdict
      const combinedRiskScore = Math.min(
        100,
        Math.max(detAnalysis.deterministicRiskScore, aiResult.data?.risk_score || 0)
      );

      let finalVerdict: PhishingVerdict = "safe";
      if (combinedRiskScore >= 60) {
        finalVerdict = input_type === "url" ? "phishing" : "scam";
      } else if (combinedRiskScore >= 40) {
        finalVerdict = "suspicious";
      } else {
        finalVerdict = aiResult.data?.verdict || "safe";
      }

      const severity: Severity =
        combinedRiskScore >= 75
          ? "critical"
          : combinedRiskScore >= 50
          ? "high"
          : combinedRiskScore >= 25
          ? "medium"
          : "low";

      // 4. Save Scan Record
      const scan = await ScanRepository.createScan({
        organization_id: orgId,
        user_id: userId,
        source: "phishing",
        content,
        redacted_content: content,
        risk_score: combinedRiskScore,
        severity,
        model: aiResult.model
      });

      // 5. Save Phishing Analysis Record
      const explanation =
        aiResult.data?.explanation_for_user ||
        (combinedRiskScore > 40
          ? `High risk indicators identified: ${detAnalysis.signals.map(s => s.evidence).join("; ")}`
          : "No immediate deceptive patterns detected.");

      await PhishingRepository.createAnalysis({
        organization_id: orgId,
        scan_id: scan.id,
        input_type,
        verdict: finalVerdict,
        indicators: mergedIndicators,
        tactics: Array.from(tacticsSet),
        explanation
      });

      // 6. Auto-create incident if high or critical
      if (severity === "high" || severity === "critical") {
        await IncidentRepository.createIncident({
          organization_id: orgId,
          title: `Phishing Threat Detected: ${finalVerdict.toUpperCase()} (${combinedRiskScore}/100)`,
          description: `Phishing analysis identified malicious indicators in ${input_type} content. Tactics: ${Array.from(tacticsSet).join(", ")}. Indicators: ${mergedIndicators.length}.`,
          source_type: "phishing",
          severity,
          created_by: userId
        });
      }

      await AuditRepository.logAction({
        organization_id: orgId,
        actor_user_id: userId,
        action: "PHISHING_ANALYSIS_COMPLETED",
        resource_type: "scan",
        resource_id: scan.id,
        metadata: { verdict: finalVerdict, risk_score: combinedRiskScore, severity },
        ip: req.ip,
        user_agent: req.headers["user-agent"]
      });

      res.json({
        scan_id: scan.id,
        verdict: finalVerdict,
        risk_score: combinedRiskScore,
        confidence: aiResult.data?.confidence || 0.85,
        indicators: mergedIndicators,
        manipulation_tactics: Array.from(tacticsSet),
        explanation_for_user: explanation,
        recommended_actions: aiResult.data?.recommended_actions || [
          "Do not click any embedded links or download attachments.",
          "Verify the sender's identity through an official external contact channel.",
          "Report this communication to your security awareness team."
        ],
        deterministic_signals: signalNames,
        ai_status: aiResult.ai_status
      });
    } catch (err) {
      next(err);
    }
  }
}
