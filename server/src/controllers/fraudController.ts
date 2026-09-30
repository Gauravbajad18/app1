import { Request, Response, NextFunction } from "express";
import { FraudRuleEngine } from "../services/fraud/fraudEngine";
import { GeminiService } from "../services/ai/gemini";
import { TransactionRepository } from "../repositories/transactionRepository";
import { IncidentRepository } from "../repositories/incidentRepository";
import { AuditRepository } from "../repositories/auditRepository";
import { AIUsageRepository } from "../repositories/aiUsageRepository";
import { TransactionInput, FraudReviewInput } from "@trustshield/shared";

export class FraudController {
  public static async scoreSingle(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Not authenticated" } });
        return;
      }

      const txData: TransactionInput = req.body;
      const orgId = req.user.organizationId;
      const userId = req.user.userId;

      // 1. Fetch historical transactions for this account for context
      const accountHash = TransactionRepository.hashRef(txData.account_id);
      const historyDb = await TransactionRepository.getAccountHistory(orgId, accountHash, 15);
      const history = historyDb.map(h => ({
        amount: Number(h.amount),
        currency: h.currency,
        merchant: h.merchant,
        category: h.category,
        country: h.country,
        channel: h.channel,
        account_id: h.account_ref_hash,
        device_id: h.device_ref_hash,
        occurred_at: h.occurred_at
      }));

      // 2. Run deterministic fraud rule engine
      const ruleResult = FraudRuleEngine.evaluate(txData, history);

      // 3. Run Gemini reasoning with anonymized fields only
      let aiReasoning = "Transaction evaluated by automated heuristic rule engine.";
      let aiConfidence = 0.85;

      if (ruleResult.triggered_rules.length > 0) {
        const aiEvaluation = await GeminiService.evaluateFraudReasoning(
          ruleResult.anonymized_payload,
          ruleResult.triggered_rules
        );

        if (aiEvaluation.success && aiEvaluation.data) {
          aiReasoning = aiEvaluation.data.reasoning;
          aiConfidence = aiEvaluation.data.confidence;
        }

        if (aiEvaluation.tokens_in > 0 || aiEvaluation.latency_ms > 0) {
          await AIUsageRepository.recordUsage({
            organization_id: orgId,
            user_id: userId,
            feature: "fraud_reasoning",
            model: aiEvaluation.model,
            tokens_in: aiEvaluation.tokens_in,
            tokens_out: aiEvaluation.tokens_out,
            latency_ms: aiEvaluation.latency_ms,
            success: aiEvaluation.success
          });
        }
      }

      // 4. Save transaction and fraud score to DB
      const createdTx = await TransactionRepository.createTransaction({
        organization_id: orgId,
        uploaded_by: userId,
        external_ref: txData.external_ref,
        amount: txData.amount,
        currency: txData.currency,
        merchant: txData.merchant,
        category: txData.category,
        country: txData.country,
        channel: txData.channel,
        account_id: txData.account_id,
        device_id: txData.device_id,
        occurred_at: txData.occurred_at
      });

      const fraudRecord = await TransactionRepository.saveFraudScore({
        organization_id: orgId,
        transaction_id: createdTx.id,
        score: ruleResult.score,
        risk_level: ruleResult.risk_level,
        triggered_rules: ruleResult.triggered_rules,
        ai_reasoning: aiReasoning
      });

      // 5. Auto-create incident if high or critical
      if (ruleResult.risk_level === "high" || ruleResult.risk_level === "critical") {
        await IncidentRepository.createIncident({
          organization_id: orgId,
          title: `Fraud Alert: ${txData.currency} ${txData.amount} at ${txData.merchant} (Score: ${ruleResult.score})`,
          description: `Anomalous transaction flagged. Triggered rules: ${ruleResult.triggered_rules.map(r => r.rule_name).join(", ")}. AI reasoning: ${aiReasoning}`,
          source_type: "fraud",
          severity: ruleResult.risk_level,
          created_by: userId
        });
      }

      await AuditRepository.logAction({
        organization_id: orgId,
        actor_user_id: userId,
        action: "TRANSACTION_SCORED",
        resource_type: "transaction",
        resource_id: createdTx.id,
        metadata: {
          score: ruleResult.score,
          risk_level: ruleResult.risk_level,
          amount: txData.amount,
          currency: txData.currency
        },
        ip: req.ip,
        user_agent: req.headers["user-agent"]
      });

      res.status(201).json({
        transaction: createdTx,
        fraud_score: fraudRecord,
        recommended_action: ruleResult.recommended_action,
        confidence: aiConfidence
      });
    } catch (err) {
      next(err);
    }
  }

  public static async uploadCsv(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Not authenticated" } });
        return;
      }

      if (!req.file) {
        res.status(400).json({ error: { code: "FILE_REQUIRED", message: "CSV file is required." } });
        return;
      }

      const csvContent = req.file.buffer.toString("utf-8");
      const lines = csvContent.split(/\r?\n/).filter(line => line.trim().length > 0);

      if (lines.length < 2) {
        res.status(400).json({ error: { code: "INVALID_CSV", message: "CSV file contains no records." } });
        return;
      }

      const headers = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/['"]/g, ""));
      const requiredCols = ["amount", "merchant", "category", "country", "channel", "account_id", "device_id"];
      for (const col of requiredCols) {
        if (!headers.includes(col)) {
          res.status(400).json({
            error: {
              code: "MISSING_CSV_COLUMN",
              message: `Missing required CSV column: '${col}'. Required columns: ${requiredCols.join(", ")}`
            }
          });
          return;
        }
      }

      const processed: any[] = [];
      const orgId = req.user.organizationId;
      const userId = req.user.userId;

      // Process up to 50 rows per batch
      const dataRows = lines.slice(1, 51);

      for (const row of dataRows) {
        const values = row.split(",").map(v => v.trim().replace(/^['"]|['"]$/g, ""));
        const rowObj: any = {};
        headers.forEach((h, i) => {
          rowObj[h] = values[i];
        });

        const amount = parseFloat(rowObj.amount);
        if (isNaN(amount)) continue;

        const txRecord: TransactionInput = {
          amount,
          currency: rowObj.currency || "USD",
          merchant: rowObj.merchant,
          category: rowObj.category,
          country: rowObj.country,
          channel: rowObj.channel,
          account_id: rowObj.account_id,
          device_id: rowObj.device_id,
          external_ref: rowObj.external_ref || undefined,
          occurred_at: rowObj.occurred_at || new Date().toISOString()
        };

        const ruleResult = FraudRuleEngine.evaluate(txRecord);

        const createdTx = await TransactionRepository.createTransaction({
          organization_id: orgId,
          uploaded_by: userId,
          external_ref: txRecord.external_ref,
          amount: txRecord.amount,
          currency: txRecord.currency,
          merchant: txRecord.merchant,
          category: txRecord.category,
          country: txRecord.country,
          channel: txRecord.channel,
          account_id: txRecord.account_id,
          device_id: txRecord.device_id,
          occurred_at: txRecord.occurred_at
        });

        const fraudRecord = await TransactionRepository.saveFraudScore({
          organization_id: orgId,
          transaction_id: createdTx.id,
          score: ruleResult.score,
          risk_level: ruleResult.risk_level,
          triggered_rules: ruleResult.triggered_rules,
          ai_reasoning: `Batch processed via rule engine. Triggered ${ruleResult.triggered_rules.length} rule indicators.`
        });

        processed.push({
          transaction: createdTx,
          fraud_score: fraudRecord
        });
      }

      await AuditRepository.logAction({
        organization_id: orgId,
        actor_user_id: userId,
        action: "TRANSACTIONS_CSV_UPLOADED",
        resource_type: "transactions_batch",
        metadata: { row_count: processed.length },
        ip: req.ip,
        user_agent: req.headers["user-agent"]
      });

      res.status(201).json({
        total_processed: processed.length,
        results: processed
      });
    } catch (err) {
      next(err);
    }
  }

  public static async listTransactions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Not authenticated" } });
        return;
      }

      const reviewStatus = req.query.review_status as string | undefined;
      const riskLevel = req.query.risk_level as string | undefined;
      const limit = parseInt(req.query.limit as string || "50", 10);
      const offset = parseInt(req.query.offset as string || "0", 10);

      const results = await TransactionRepository.listTransactions(req.user.organizationId, {
        reviewStatus,
        riskLevel,
        limit,
        offset
      });

      res.json(results);
    } catch (err) {
      next(err);
    }
  }

  public static async reviewTransaction(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Not authenticated" } });
        return;
      }

      const { review_status, review_note }: FraudReviewInput = req.body;
      const transactionId = req.params.id;

      const updated = await TransactionRepository.updateReview({
        organization_id: req.user.organizationId,
        transaction_id: transactionId,
        reviewed_by: req.user.userId,
        review_status,
        review_note
      });

      if (!updated) {
        res.status(404).json({ error: { code: "NOT_FOUND", message: "Transaction record not found." } });
        return;
      }

      await AuditRepository.logAction({
        organization_id: req.user.organizationId,
        actor_user_id: req.user.userId,
        action: "FRAUD_TRANSACTION_REVIEWED",
        resource_type: "transaction",
        resource_id: transactionId,
        metadata: { review_status, review_note },
        ip: req.ip,
        user_agent: req.headers["user-agent"]
      });

      res.json({ success: true, fraud_score: updated });
    } catch (err) {
      next(err);
    }
  }
}
