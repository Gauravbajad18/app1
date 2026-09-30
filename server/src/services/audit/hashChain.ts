import crypto from "crypto";

export const GENESIS_PREV_HASH = "0000000000000000000000000000000000000000000000000000000000000000";

/**
 * Deterministically serialize any object into canonical JSON with sorted keys
 * ensuring exact reproducibility of SHA-256 entry hashes across systems.
 */
export function canonicalJsonStringify(obj: any): string {
  if (obj === null || typeof obj !== "object") {
    return JSON.stringify(obj);
  }

  if (Array.isArray(obj)) {
    return "[" + obj.map(canonicalJsonStringify).join(",") + "]";
  }

  const sortedKeys = Object.keys(obj).sort();
  const pairs = sortedKeys.map(
    key => `${JSON.stringify(key)}:${canonicalJsonStringify(obj[key])}`
  );
  return "{" + pairs.join(",") + "}";
}

export interface AuditLogData {
  organization_id: string;
  actor_user_id: string | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  metadata: Record<string, any>;
  ip: string | null;
  user_agent: string | null;
  created_at?: string;
}

export interface StoredAuditLog extends AuditLogData {
  id: string;
  prev_hash: string;
  entry_hash: string;
  created_at: string;
}

export class HashChainService {
  /**
   * Compute SHA-256 hash for an audit log entry given its prev_hash and canonical data payload.
   */
  public static computeEntryHash(prevHash: string, data: AuditLogData): string {
    let metadataObj = data.metadata || {};
    if (typeof metadataObj === "string") {
      try {
        metadataObj = JSON.parse(metadataObj);
      } catch {
        // keep string
      }
    }

    const canonicalPayload = canonicalJsonStringify({
      organization_id: data.organization_id,
      actor_user_id: data.actor_user_id,
      action: data.action,
      resource_type: data.resource_type,
      resource_id: data.resource_id,
      metadata: metadataObj,
      ip: data.ip,
      user_agent: data.user_agent,
      created_at: data.created_at
    });

    const combined = `${prevHash}|${canonicalPayload}`;
    return crypto.createHash("sha256").update(combined, "utf8").digest("hex");
  }

  /**
   * Verify an entire chain of audit log records from oldest to newest.
   * Reports valid status or pinpoints the exact broken link index if tampered.
   */
  public static verifyChain(logs: StoredAuditLog[]): {
    is_valid: boolean;
    broken_index?: number;
    broken_log_id?: string;
    details: string;
    total_verified: number;
  } {
    if (!logs || logs.length === 0) {
      return {
        is_valid: true,
        details: "Audit log chain is empty; 0 records to verify.",
        total_verified: 0
      };
    }

    // Sort ascending by creation time to verify chronologically
    const sorted = [...logs].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    let expectedPrevHash = GENESIS_PREV_HASH;

    for (let i = 0; i < sorted.length; i++) {
      const entry = sorted[i];

      // 1. Verify prev_hash matches expected chain linkage
      if (entry.prev_hash !== expectedPrevHash) {
        return {
          is_valid: false,
          broken_index: i,
          broken_log_id: entry.id,
          details: `Broken hash link at entry #${i} (${entry.id}). Expected prev_hash '${expectedPrevHash}', but found '${entry.prev_hash}'.`,
          total_verified: i
        };
      }

      // 2. Recompute entry_hash and compare against stored entry_hash
      const recomputedHash = this.computeEntryHash(entry.prev_hash, {
        organization_id: entry.organization_id,
        actor_user_id: entry.actor_user_id,
        action: entry.action,
        resource_type: entry.resource_type,
        resource_id: entry.resource_id,
        metadata: entry.metadata,
        ip: entry.ip,
        user_agent: entry.user_agent,
        created_at: entry.created_at
      });

      if (recomputedHash !== entry.entry_hash) {
        return {
          is_valid: false,
          broken_index: i,
          broken_log_id: entry.id,
          details: `Tampered content at entry #${i} (${entry.id}). Stored hash '${entry.entry_hash}' does not match recomputed hash '${recomputedHash}'.`,
          total_verified: i
        };
      }

      // Chain forward
      expectedPrevHash = entry.entry_hash;
    }

    return {
      is_valid: true,
      details: `Cryptographic verification successful: all ${sorted.length} audit entries verified intact.`,
      total_verified: sorted.length
    };
  }
}
