import { query } from "../db";

export interface AIUsageRecord {
  id: string;
  organization_id: string;
  user_id: string;
  feature: string;
  model: string;
  tokens_in: number;
  tokens_out: number;
  latency_ms: number;
  success: boolean;
  created_at: string;
}

export class AIUsageRepository {
  public static async recordUsage(params: {
    organization_id: string;
    user_id: string;
    feature: string;
    model: string;
    tokens_in: number;
    tokens_out: number;
    latency_ms: number;
    success: boolean;
  }): Promise<void> {
    await query(
      `INSERT INTO ai_usage (
        organization_id, user_id, feature, model, tokens_in, tokens_out, latency_ms, success
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        params.organization_id,
        params.user_id,
        params.feature,
        params.model,
        params.tokens_in,
        params.tokens_out,
        params.latency_ms,
        params.success
      ]
    );
  }

  public static async getDailyUserUsageCount(
    organizationId: string,
    userId: string
  ): Promise<number> {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const res = await query<{ count: string }>(
      `SELECT COUNT(*) as count 
       FROM ai_usage 
       WHERE organization_id = $1 AND user_id = $2 AND created_at >= $3`,
      [organizationId, userId, today.toISOString()]
    );
    return parseInt(res.rows[0]?.count || "0", 10);
  }
}
