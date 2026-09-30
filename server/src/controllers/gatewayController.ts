import { Request, Response, NextFunction } from "express";
import { InjectionDetector } from "../services/detectors/injection";
import { RegexDetector } from "../services/detectors/regex";
import { GeminiService } from "../services/ai/gemini";
import { GatewayRepository } from "../repositories/gatewayRepository";
import { PolicyRepository } from "../repositories/policyRepository";
import { AuditRepository } from "../repositories/auditRepository";
import { AIUsageRepository } from "../repositories/aiUsageRepository";
import { ScanRepository } from "../repositories/scanRepository";
import { DetectionRepository } from "../repositories/detectionRepository";
import { IncidentRepository } from "../repositories/incidentRepository";
import { OrgRepository } from "../repositories/orgRepository";
import { GatewayMessageInput, CreateConversationInput } from "@trustshield/shared";

export class GatewayController {
  public static async createConversation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Not authenticated" } });
        return;
      }

      const { title }: CreateConversationInput = req.body;
      const conversation = await GatewayRepository.createConversation(
        req.user.organizationId,
        req.user.userId,
        title || "New Secure Chat"
      );

      res.status(201).json(conversation);
    } catch (err) {
      next(err);
    }
  }

  public static async listConversations(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Not authenticated" } });
        return;
      }

      const conversations = await GatewayRepository.getConversations(
        req.user.organizationId,
        req.user.userId
      );

      res.json(conversations);
    } catch (err) {
      next(err);
    }
  }

  public static async getConversation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Not authenticated" } });
        return;
      }

      const conversation = await GatewayRepository.getConversationById(
        req.user.organizationId,
        req.user.userId,
        req.params.id
      );

      if (!conversation) {
        res.status(404).json({ error: { code: "NOT_FOUND", message: "Conversation not found." } });
        return;
      }

      const messages = await GatewayRepository.getMessages(
        req.user.organizationId,
        conversation.id
      );

      res.json({
        conversation,
        messages
      });
    } catch (err) {
      next(err);
    }
  }

  public static async deleteConversation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Not authenticated" } });
        return;
      }

      const deleted = await GatewayRepository.deleteConversation(
        req.user.organizationId,
        req.user.userId,
        req.params.id
      );

      if (!deleted) {
        res.status(404).json({ error: { code: "NOT_FOUND", message: "Conversation not found." } });
        return;
      }

      res.json({ success: true, message: "Conversation deleted." });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Main Prompt Firewall and Secure Chat Pipeline
   */
  public static async sendMessage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Not authenticated" } });
        return;
      }

      const { content }: GatewayMessageInput = req.body;
      const conversationId = req.params.id;
      const orgId = req.user.organizationId;
      const userId = req.user.userId;

      // Verify conversation belongs to this user in this org
      const conversation = await GatewayRepository.getConversationById(orgId, userId, conversationId);
      if (!conversation) {
        res.status(404).json({ error: { code: "NOT_FOUND", message: "Conversation not found." } });
        return;
      }

      // Step 1: Prompt-Injection / Jailbreak Heuristics & Classifier
      const heuristicResult = InjectionDetector.analyze(content);
      let aiInjectionResult = { is_injection: false, is_jailbreak: false, risk_score: 0, tactics: [] as string[], explanation: "" };

      if (heuristicResult.risk_score > 20) {
        // Run AI classifier if heuristic flags potential risk
        const aiCheck = await GeminiService.classifyPromptFirewall(content);
        if (aiCheck.success && aiCheck.data) {
          aiInjectionResult = aiCheck.data;
        }
      }

      const isInjection = heuristicResult.is_injection || aiInjectionResult.is_injection;
      const isJailbreak = heuristicResult.is_jailbreak || aiInjectionResult.is_jailbreak;
      const injectionRiskScore = Math.max(heuristicResult.risk_score, aiInjectionResult.risk_score);
      const combinedTactics = Array.from(new Set([...heuristicResult.tactics, ...(aiInjectionResult.tactics || [])]));

      // If injection or jailbreak risk exceeds threshold, BLOCK prompt immediately
      if (isInjection || isJailbreak || injectionRiskScore >= 50) {
        const firewallDecision = {
          allowed: false,
          action_taken: "blocked",
          block_reason: "Adversarial prompt injection or jailbreak attempt detected.",
          injection_detected: isInjection,
          jailbreak_detected: isJailbreak,
          injection_risk_score: injectionRiskScore,
          detected_tactics: combinedTactics,
          masked_findings_count: 0,
          findings: [],
          explanation: heuristicResult.explanation || aiInjectionResult.explanation || "Adversarial directives detected."
        };

        // Record user message with blocked firewall decision
        const userMsg = await GatewayRepository.addMessage({
          organization_id: orgId,
          conversation_id: conversationId,
          role: "user",
          sanitized_content: content,
          firewall_decision: firewallDecision
        });

        // Record assistant security warning
        const assistantMsg = await GatewayRepository.addMessage({
          organization_id: orgId,
          conversation_id: conversationId,
          role: "system_notice",
          sanitized_content: `⚠️ Prompt Firewall Blocked Request: ${firewallDecision.block_reason} (Tactics: ${combinedTactics.join(", ")})`,
          firewall_decision: firewallDecision
        });

        // Auto-create SOC Incident for critical prompt injection attempt
        await IncidentRepository.createIncident({
          organization_id: orgId,
          title: `Prompt Firewall Attack Blocked: ${combinedTactics.join(", ") || "Adversarial Injection"}`,
          description: `User prompt was intercepted by TrustShield AI Prompt Firewall. Injection score: ${injectionRiskScore}/100. Tactics: ${combinedTactics.join(", ")}.`,
          source_type: "prompt_firewall",
          severity: "high",
          created_by: userId
        });

        await AuditRepository.logAction({
          organization_id: orgId,
          actor_user_id: userId,
          action: "PROMPT_FIREWALL_BLOCKED",
          resource_type: "gateway",
          resource_id: conversationId,
          metadata: { injectionRiskScore, combinedTactics },
          ip: req.ip,
          user_agent: req.headers["user-agent"]
        });

        res.json({
          user_message: userMsg,
          assistant_message: assistantMsg,
          firewall_decision: firewallDecision
        });
        return;
      }

      // Step 2: Sensitive Data Detection
      const findings = RegexDetector.detect(content);
      const policies = await PolicyRepository.getPolicies(orgId);
      const policyMap = new Map<string, string>();
      for (const p of policies) {
        policyMap.set(p.data_type, p.gateway_action);
      }

      // Step 3: Check if any finding has gateway policy 'block'
      const blockingFinding = findings.find(f => policyMap.get(f.data_type) === "block");
      if (blockingFinding) {
        const firewallDecision = {
          allowed: false,
          action_taken: "blocked",
          block_reason: `Organization privacy policy forbids transmitting data type '${blockingFinding.data_type}' to LLMs.`,
          injection_detected: false,
          jailbreak_detected: false,
          injection_risk_score: injectionRiskScore,
          detected_tactics: [],
          masked_findings_count: findings.length,
          findings: findings.map(f => ({
            category: f.category,
            data_type: f.data_type,
            detector: "rule" as const,
            masked_value: f.masked_value,
            start_offset: f.start_offset,
            end_offset: f.end_offset,
            confidence: f.confidence,
            severity: f.severity,
            recommended_action: f.recommended_action
          })),
          explanation: `Your prompt contains restricted sensitive data: '${blockingFinding.data_type}'. Prompt blocked per organizational privacy policy.`
        };

        const userMsg = await GatewayRepository.addMessage({
          organization_id: orgId,
          conversation_id: conversationId,
          role: "user",
          sanitized_content: content,
          firewall_decision: firewallDecision
        });

        const assistantMsg = await GatewayRepository.addMessage({
          organization_id: orgId,
          conversation_id: conversationId,
          role: "system_notice",
          sanitized_content: `🛡️ Security Policy Violation: ${firewallDecision.block_reason}`,
          firewall_decision: firewallDecision
        });

        res.json({
          user_message: userMsg,
          assistant_message: assistantMsg,
          firewall_decision: firewallDecision
        });
        return;
      }

      // Step 4: Reversible Vault Tokenization for 'mask' policy
      // In-memory request vault mapping reversible placeholder -> original value
      const tokenVault = new Map<string, string>();
      let sanitizedPrompt = content;
      const sortedFindings = [...findings].sort((a, b) => b.start_offset - a.start_offset);

      let maskedCount = 0;
      for (let i = 0; i < sortedFindings.length; i++) {
        const f = sortedFindings[i];
        const action = policyMap.get(f.data_type) || "mask";

        if (action === "mask") {
          const placeholder = `[[VAL_TOKEN_${f.data_type.toUpperCase()}_${i + 1}]]`;
          tokenVault.set(placeholder, f.raw_value);
          sanitizedPrompt =
            sanitizedPrompt.slice(0, f.start_offset) +
            placeholder +
            sanitizedPrompt.slice(f.end_offset);
          maskedCount++;
        }
      }

      // Step 5: Send Sanitized Prompt to Gemini
      const pastMessages = await GatewayRepository.getMessages(orgId, conversationId);
      const chatHistory = pastMessages.map(m => ({
        role: m.role === "assistant" ? "model" : "user",
        content: m.sanitized_content
      }));

      const aiResponse = await GeminiService.generateSecureChatAnswer(
        sanitizedPrompt,
        chatHistory
      );

      // Record AI usage
      if (aiResponse.tokens_in > 0 || aiResponse.latency_ms > 0) {
        await AIUsageRepository.recordUsage({
          organization_id: orgId,
          user_id: userId,
          feature: "secure_ai_gateway",
          model: aiResponse.model,
          tokens_in: aiResponse.tokens_in,
          tokens_out: aiResponse.tokens_out,
          latency_ms: aiResponse.latency_ms,
          success: aiResponse.success
        });
      }

      // Step 6: Scan Gemini Response for leaked secrets/PII
      let rawAnswer = aiResponse.data?.answer || "I received your sanitized request, but the AI service is currently operating in fallback mode.";
      const responseFindings = RegexDetector.detect(rawAnswer);
      for (const rf of responseFindings) {
        if (rf.severity === "critical" || rf.severity === "high") {
          rawAnswer = rawAnswer.replace(rf.raw_value, rf.masked_value);
        }
      }

      // Step 7: Re-insert original values from vault for requesting user
      let finalUserFacingAnswer = rawAnswer;
      for (const [placeholder, originalValue] of tokenVault.entries()) {
        finalUserFacingAnswer = finalUserFacingAnswer.replaceAll(placeholder, originalValue);
      }

      const firewallDecision = {
        allowed: true,
        action_taken: maskedCount > 0 ? "masked" : "allowed",
        injection_detected: false,
        jailbreak_detected: false,
        injection_risk_score: injectionRiskScore,
        detected_tactics: [],
        masked_findings_count: maskedCount,
        findings: findings.map(f => ({
          category: f.category,
          data_type: f.data_type,
          detector: "rule" as const,
          masked_value: f.masked_value,
          start_offset: f.start_offset,
          end_offset: f.end_offset,
          confidence: f.confidence,
          severity: f.severity,
          recommended_action: f.recommended_action
        })),
        explanation:
          maskedCount > 0
            ? `Protected ${maskedCount} sensitive field(s) with reversible tokenization before forwarding to Gemini.`
            : "Prompt verified clear of threats and sensitive data leakage."
      };

      const userMsg = await GatewayRepository.addMessage({
        organization_id: orgId,
        conversation_id: conversationId,
        role: "user",
        sanitized_content: sanitizedPrompt,
        firewall_decision: firewallDecision
      });

      const assistantMsg = await GatewayRepository.addMessage({
        organization_id: orgId,
        conversation_id: conversationId,
        role: "assistant",
        sanitized_content: finalUserFacingAnswer,
        firewall_decision: firewallDecision,
        tokens_in: aiResponse.tokens_in,
        tokens_out: aiResponse.tokens_out
      });

      res.json({
        user_message: userMsg,
        assistant_message: assistantMsg,
        firewall_decision: firewallDecision,
        safety_notes: aiResponse.data?.safety_notes || [],
        follow_up_questions: aiResponse.data?.follow_up_questions || []
      });
    } catch (err) {
      next(err);
    }
  }
}
