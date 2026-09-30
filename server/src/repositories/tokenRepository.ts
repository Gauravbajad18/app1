import { query } from "../db";
import crypto from "crypto";

export interface RefreshTokenRecord {
  id: string;
  user_id: string;
  organization_id: string;
  token_hash: string;
  family_id: string;
  expires_at: string;
  revoked_at: string | null;
  user_agent: string | null;
  ip: string | null;
  created_at: string;
}

export class TokenRepository {
  public static hashToken(rawToken: string): string {
    return crypto.createHash("sha256").update(rawToken).digest("hex");
  }

  public static async createRefreshToken(params: {
    userId: string;
    organizationId: string;
    rawToken: string;
    familyId: string;
    expiresAt: Date;
    userAgent?: string | null;
    ip?: string | null;
  }): Promise<RefreshTokenRecord> {
    const tokenHash = this.hashToken(params.rawToken);
    const res = await query<RefreshTokenRecord>(
      `INSERT INTO refresh_tokens (
        user_id, organization_id, token_hash, family_id, expires_at, user_agent, ip
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [
        params.userId,
        params.organizationId,
        tokenHash,
        params.familyId,
        params.expiresAt.toISOString(),
        params.userAgent || null,
        params.ip || null
      ]
    );
    return res.rows[0];
  }

  public static async findByRawToken(rawToken: string): Promise<RefreshTokenRecord | null> {
    const tokenHash = this.hashToken(rawToken);
    const res = await query<RefreshTokenRecord>(
      `SELECT * FROM refresh_tokens WHERE token_hash = $1`,
      [tokenHash]
    );
    return res.rows[0] || null;
  }

  public static async revokeToken(id: string): Promise<void> {
    await query(`UPDATE refresh_tokens SET revoked_at = NOW() WHERE id = $1`, [id]);
  }

  /**
   * Token Reuse Detection: If an expired or already revoked token is used,
   * revoke all tokens in the entire family to protect the compromised user account.
   */
  public static async revokeFamily(familyId: string): Promise<void> {
    await query(
      `UPDATE refresh_tokens SET revoked_at = NOW() WHERE family_id = $1 AND revoked_at IS NULL`,
      [familyId]
    );
  }

  public static async listActiveSessions(
    userId: string,
    organizationId: string
  ): Promise<RefreshTokenRecord[]> {
    const res = await query<RefreshTokenRecord>(
      `SELECT * FROM refresh_tokens 
       WHERE user_id = $1 AND organization_id = $2 AND revoked_at IS NULL AND expires_at > NOW()
       ORDER BY created_at DESC`,
      [userId, organizationId]
    );
    return res.rows;
  }

  public static async revokeSession(
    sessionId: string,
    userId: string,
    organizationId: string
  ): Promise<boolean> {
    const res = await query(
      `UPDATE refresh_tokens SET revoked_at = NOW() 
       WHERE id = $1 AND user_id = $2 AND organization_id = $3 AND revoked_at IS NULL`,
      [sessionId, userId, organizationId]
    );
    return (res.rowCount || 0) > 0;
  }
}
