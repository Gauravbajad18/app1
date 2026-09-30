import { Severity } from "@trustshield/shared";

export interface TransactionRecord {
  id?: string;
  amount: number;
  currency: string;
  merchant: string;
  category: string;
  country: string;
  channel: string;
  account_id: string;
  device_id: string;
  occurred_at?: string;
}

export interface RuleEvaluation {
  rule_id: string;
  rule_name: string;
  description: string;
  severity: Severity;
  score_delta: number;
  evidence: Record<string, any>;
}

export interface FraudAnalysisResult {
  score: number;
  risk_level: Severity;
  triggered_rules: RuleEvaluation[];
  recommended_action: "approve" | "review" | "block";
  anonymized_payload: {
    amount: number;
    currency: string;
    category: string;
    country: string;
    channel: string;
    account_hash: string;
    device_hash: string;
    hour_of_day: number;
  };
}

export class FraudRuleEngine {
  /**
   * Evaluate transaction against historical account context and heuristic risk rules.
   */
  public static evaluate(
    tx: TransactionRecord,
    history: TransactionRecord[] = []
  ): FraudAnalysisResult {
    const triggered_rules: RuleEvaluation[] = [];
    let score = 0;

    const txDate = tx.occurred_at ? new Date(tx.occurred_at) : new Date();
    const txHour = txDate.getUTCHours();

    // 1. Odd Hours Rule (2:00 AM to 5:00 AM UTC/local)
    if (txHour >= 2 && txHour <= 4) {
      const delta = 15;
      score += delta;
      triggered_rules.push({
        rule_id: "RULE_ODD_HOURS",
        rule_name: "Odd Hours Activity",
        description: "Transaction initiated during high-fraud window (02:00 - 04:59 UTC)",
        severity: "medium",
        score_delta: delta,
        evidence: { hour: txHour }
      });
    }

    // 2. High Round Amount Pattern (e.g. 5000, 10000, 25000)
    if (tx.amount >= 1000 && tx.amount % 500 === 0) {
      const delta = 15;
      score += delta;
      triggered_rules.push({
        rule_id: "RULE_ROUND_AMOUNT",
        rule_name: "Round Amount Pattern",
        description: "Unusually round transaction amount indicative of structuring or carding tests",
        severity: "medium",
        score_delta: delta,
        evidence: { amount: tx.amount }
      });
    }

    // 3. Very High Absolute Amount Threshold
    if (tx.amount >= 10000) {
      const delta = 25;
      score += delta;
      triggered_rules.push({
        rule_id: "RULE_EXCESSIVE_AMOUNT",
        rule_name: "Excessive Transaction Amount",
        description: "Amount exceeds high-value reporting threshold",
        severity: "high",
        score_delta: delta,
        evidence: { amount: tx.amount, threshold: 10000 }
      });
    }

    // If historical records exist for this account:
    if (history.length > 0) {
      // 4. Duplicate Transaction Check (same merchant & amount within 15 minutes)
      const isDuplicate = history.some(h => {
        const hDate = h.occurred_at ? new Date(h.occurred_at) : new Date();
        const diffMinutes = Math.abs((txDate.getTime() - hDate.getTime()) / (1000 * 60));
        return (
          diffMinutes <= 15 &&
          h.merchant.toLowerCase() === tx.merchant.toLowerCase() &&
          Math.abs(h.amount - tx.amount) < 0.01
        );
      });

      if (isDuplicate) {
        const delta = 35;
        score += delta;
        triggered_rules.push({
          rule_id: "RULE_DUPLICATE_TX",
          rule_name: "Rapid Duplicate Transaction",
          description: "Identical transaction amount and merchant processed within 15 minutes",
          severity: "critical",
          score_delta: delta,
          evidence: { merchant: tx.merchant, amount: tx.amount }
        });
      }

      // 5. Velocity Check (more than 3 transactions in last 1 hour)
      const lastHourCount = history.filter(h => {
        const hDate = h.occurred_at ? new Date(h.occurred_at) : new Date();
        const diffHours = Math.abs((txDate.getTime() - hDate.getTime()) / (1000 * 60 * 60));
        return diffHours <= 1;
      }).length;

      if (lastHourCount >= 3) {
        const delta = 25;
        score += delta;
        triggered_rules.push({
          rule_id: "RULE_HIGH_VELOCITY",
          rule_name: "High Transaction Velocity",
          description: `${lastHourCount} transactions processed on this account in the past 60 minutes`,
          severity: "high",
          score_delta: delta,
          evidence: { count: lastHourCount }
        });
      }

      // 6. Device Anomaly Check (unrecognized device for established account)
      const knownDevices = new Set(history.map(h => h.device_id));
      if (!knownDevices.has(tx.device_id)) {
        const delta = 20;
        score += delta;
        triggered_rules.push({
          rule_id: "RULE_NEW_DEVICE",
          rule_name: "Unrecognized Device Fingerprint",
          description: "Transaction originated from an unrecognized device ID",
          severity: "medium",
          score_delta: delta,
          evidence: { device_id: tx.device_id }
        });
      }

      // 7. Unusual Country Check
      const knownCountries = new Set(history.map(h => h.country.toUpperCase()));
      if (!knownCountries.has(tx.country.toUpperCase())) {
        const delta = 30;
        score += delta;
        triggered_rules.push({
          rule_id: "RULE_CROSS_BORDER_ANOMALY",
          rule_name: "Unusual Geographic Origin",
          description: `Transaction initiated in ${tx.country}, differing from historical country profiles`,
          severity: "high",
          score_delta: delta,
          evidence: { country: tx.country, expected: Array.from(knownCountries) }
        });
      }

      // 8. Amount Z-Score Outlier Check
      const amounts = history.map(h => h.amount);
      const mean = amounts.reduce((a, b) => a + b, 0) / amounts.length;
      const variance = amounts.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / amounts.length;
      const stdDev = Math.sqrt(variance);

      if (stdDev > 0) {
        const zScore = (tx.amount - mean) / stdDev;
        if (zScore >= 3.0) {
          const delta = 75;
          score += delta;
          triggered_rules.push({
            rule_id: "RULE_STATISTICAL_OUTLIER",
            rule_name: "Statistical Amount Outlier (Z > 3.0)",
            description: `Amount is ${zScore.toFixed(1)} standard deviations above account historical mean`,
            severity: "critical",
            score_delta: delta,
            evidence: { zScore: parseFloat(zScore.toFixed(2)), mean, stdDev }
          });
        }
      }
    }

    const normalizedScore = Math.min(100, Math.max(0, score));

    let risk_level: Severity = "low";
    let recommended_action: "approve" | "review" | "block" = "approve";

    if (normalizedScore >= 75) {
      risk_level = "critical";
      recommended_action = "block";
    } else if (normalizedScore >= 50) {
      risk_level = "high";
      recommended_action = "review";
    } else if (normalizedScore >= 25) {
      risk_level = "medium";
      recommended_action = "review";
    } else {
      risk_level = "low";
      recommended_action = "approve";
    }

    return {
      score: normalizedScore,
      risk_level,
      triggered_rules,
      recommended_action,
      anonymized_payload: {
        amount: tx.amount,
        currency: tx.currency,
        category: tx.category,
        country: tx.country,
        channel: tx.channel,
        account_hash: `ACC_${tx.account_id.slice(-4)}`,
        device_hash: `DEV_${tx.device_id.slice(-4)}`,
        hour_of_day: txHour
      }
    };
  }
}
