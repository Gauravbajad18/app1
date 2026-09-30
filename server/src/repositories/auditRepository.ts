import { query } from "../db";
import { HashChainService, GENESIS_PREV_HASH, StoredAuditLog } from "../services/audit/hashChain";
import crypto from "crypto";

let lastAuditTime = 0;
function getMonotonicAuditTime(): string {
  let now = Date.now();
  if (now <= lastAuditTime) {
    now = lastAuditTime + 1;
  }
  lastAuditTime = now;
  return new Date(now).toISOString();
}

export class AuditRepository {
  /**
   * Fetch the latest entry hash for an organization's audit log to chain forward.
   */
  public static async getLatestHash(organizationId: string): Promise<string> {
    const res = await query<{ entry_hash: string }>(
      `SELECT entry_hash FROM audit_logs WHERE organization_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [organizationId]
    );

    if (res.rows.length === 0) {
      return GENESIS_PREV_HASH;
    }
    return res.rows[0].entry_hash;
  }

  /**
   * Append an immutable, hash-chained audit log entry.
   */
  public static async logAction(params: {
    organization_id: string;
    actor_user_id: string | null;
    action: string;
    resource_type: string;
    resource_id?: string | null;
    metadata?: Record<string, any>;
    ip?: string | null;
    user_agent?: string | null;
  }): Promise<StoredAuditLog> {
    const prevHash = await this.getLatestHash(params.organization_id);
    const createdAt = getMonotonicAuditTime();

    const entryHash = HashChainService.computeEntryHash(prevHash, {
      organization_id: params.organization_id,
      actor_user_id: params.actor_user_id,
      action: params.action,
      resource_type: params.resource_type,
      resource_id: params.resource_id || null,
      metadata: params.metadata || {},
      ip: params.ip || null,
      user_agent: params.user_agent || null,
      created_at: createdAt
    });

    const res = await query<StoredAuditLog>(
      `INSERT INTO audit_logs (
        organization_id, actor_user_id, action, resource_type, resource_id,
        metadata, ip, user_agent, prev_hash, entry_hash, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        params.organization_id,
        params.actor_user_id,
        params.action,
        params.resource_type,
        params.resource_id || null,
        JSON.stringify(params.metadata || {}),
        params.ip || null,
        params.user_agent || null,
        prevHash,
        entryHash,
        createdAt
      ]
    );

    return res.rows[0];
  }

  /**
   * Get paginated audit logs for an organization.
   */
  public static async getLogs(
    organizationId: string,
    limit: number = 50,
    offset: number = 0,
    actionFilter?: string
  ): Promise<{ logs: StoredAuditLog[]; total: number }> {
    let sql = `SELECT * FROM audit_logs WHERE organization_id = $1`;
    const params: any[] = [organizationId];

    if (actionFilter) {
      params.push(`%${actionFilter}%`);
      sql += ` AND action ILIKE $${params.length}`;
    }

    sql += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const res = await query<StoredAuditLog>(sql, params);

    const countRes = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM audit_logs WHERE organization_id = $1`,
      [organizationId]
    );

    return {
      logs: res.rows,
      total: parseInt(countRes.rows[0]?.count || "0", 10)
    };
  }

  /**
   * Cryptographically verify all audit entries for an organization.
   */
  public static async verifyIntegrity(organizationId: string) {
    const res = await query<StoredAuditLog>(
      `SELECT * FROM audit_logs WHERE organization_id = $1 ORDER BY created_at ASC`,
      [organizationId]
    );
    return HashChainService.verifyChain(res.rows);
  }
}
