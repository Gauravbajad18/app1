import { query } from "../db";
import { FraudReviewStatus, Severity } from "@trustshield/shared";
import crypto from "crypto";

export interface TransactionDbRecord {
  id: string;
  organization_id: string;
  uploaded_by: string;
  external_ref: string | null;
  amount: number;
  currency: string;
  merchant: string;
  category: string;
  country: string;
  channel: string;
  account_ref_hash: string;
  device_ref_hash: string;
  occurred_at: string;
  created_at: string;
}

export interface FraudScoreRecord {
  id: string;
  organization_id: string;
  transaction_id: string;
  score: number;
  risk_level: Severity;
  triggered_rules: any[];
  ai_reasoning: string;
  review_status: FraudReviewStatus;
  reviewed_by: string | null;
  review_note: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface EnrichedTransaction extends TransactionDbRecord {
  score: number;
  risk_level: Severity;
  triggered_rules: any[];
  ai_reasoning: string;
  review_status: FraudReviewStatus;
  reviewed_by: string | null;
  review_note: string | null;
  reviewed_at: string | null;
}

export class TransactionRepository {
  public static hashRef(val: string): string {
    return crypto.createHash("sha256").update(val.trim()).digest("hex");
  }

  public static async createTransaction(params: {
    organization_id: string;
    uploaded_by: string;
    external_ref?: string | null;
    amount: number;
    currency: string;
    merchant: string;
    category: string;
    country: string;
    channel: string;
    account_id: string;
    device_id: string;
    occurred_at?: string;
  }): Promise<TransactionDbRecord> {
    const accHash = this.hashRef(params.account_id);
    const devHash = this.hashRef(params.device_id);

    const res = await query<TransactionDbRecord>(
      `INSERT INTO transactions (
        organization_id, uploaded_by, external_ref, amount, currency,
        merchant, category, country, channel, account_ref_hash, device_ref_hash, occurred_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *`,
      [
        params.organization_id,
        params.uploaded_by,
        params.external_ref || null,
        params.amount,
        params.currency,
        params.merchant,
        params.category,
        params.country,
        params.channel,
        accHash,
        devHash,
        params.occurred_at || new Date().toISOString()
      ]
    );
    return res.rows[0];
  }

  public static async saveFraudScore(params: {
    organization_id: string;
    transaction_id: string;
    score: number;
    risk_level: Severity;
    triggered_rules: any[];
    ai_reasoning: string;
    review_status?: FraudReviewStatus;
  }): Promise<FraudScoreRecord> {
    const res = await query<FraudScoreRecord>(
      `INSERT INTO fraud_scores (
        organization_id, transaction_id, score, risk_level, triggered_rules, ai_reasoning, review_status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [
        params.organization_id,
        params.transaction_id,
        params.score,
        params.risk_level,
        JSON.stringify(params.triggered_rules),
        params.ai_reasoning,
        params.review_status || "pending"
      ]
    );
    return res.rows[0];
  }

  public static async getAccountHistory(
    organizationId: string,
    accountRefHash: string,
    limit: number = 20
  ): Promise<TransactionDbRecord[]> {
    const res = await query<TransactionDbRecord>(
      `SELECT * FROM transactions 
       WHERE organization_id = $1 AND account_ref_hash = $2 
       ORDER BY occurred_at DESC LIMIT $3`,
      [organizationId, accountRefHash, limit]
    );
    return res.rows;
  }

  public static async listTransactions(
    organizationId: string,
    filters: {
      reviewStatus?: string;
      riskLevel?: string;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ transactions: EnrichedTransaction[]; total: number }> {
    let sql = `
      SELECT t.*, f.score, f.risk_level, f.triggered_rules, f.ai_reasoning,
             f.review_status, f.reviewed_by, f.review_note, f.reviewed_at
      FROM transactions t
      JOIN fraud_scores f ON f.transaction_id = t.id AND f.organization_id = t.organization_id
      WHERE t.organization_id = $1
    `;
    const params: any[] = [organizationId];

    if (filters.reviewStatus) {
      params.push(filters.reviewStatus);
      sql += ` AND f.review_status = $${params.length}`;
    }
    if (filters.riskLevel) {
      params.push(filters.riskLevel);
      sql += ` AND f.risk_level = $${params.length}`;
    }

    sql += ` ORDER BY t.occurred_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(filters.limit || 50, filters.offset || 0);

    const res = await query<EnrichedTransaction>(sql, params);

    const countRes = await query<{ count: string }>(
      `SELECT COUNT(*) as count 
       FROM transactions t
       JOIN fraud_scores f ON f.transaction_id = t.id AND f.organization_id = t.organization_id
       WHERE t.organization_id = $1`,
      [organizationId]
    );

    return {
      transactions: res.rows,
      total: parseInt(countRes.rows[0]?.count || "0", 10)
    };
  }

  public static async updateReview(params: {
    organization_id: string;
    transaction_id: string;
    reviewed_by: string;
    review_status: FraudReviewStatus;
    review_note: string;
  }): Promise<FraudScoreRecord | null> {
    const res = await query<FraudScoreRecord>(
      `UPDATE fraud_scores 
       SET review_status = $1, reviewed_by = $2, review_note = $3, reviewed_at = NOW(), updated_at = NOW()
       WHERE transaction_id = $4 AND organization_id = $5
       RETURNING *`,
      [
        params.review_status,
        params.reviewed_by,
        params.review_note,
        params.transaction_id,
        params.organization_id
      ]
    );
    return res.rows[0] || null;
  }
}
