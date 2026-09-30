import { query } from "../db";
import { ScanSource, Severity } from "@trustshield/shared";
import crypto from "crypto";

export interface ScanRecord {
  id: string;
  organization_id: string;
  user_id: string;
  source: ScanSource;
  content_hash: string;
  redacted_content: string;
  risk_score: number;
  severity: Severity;
  model: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export class ScanRepository {
  public static computeHash(content: string): string {
    return crypto.createHash("sha256").update(content).digest("hex");
  }

  public static async createScan(params: {
    organization_id: string;
    user_id: string;
    source: ScanSource;
    content: string;
    redacted_content: string;
    risk_score: number;
    severity: Severity;
    model: string;
    status?: string;
  }): Promise<ScanRecord> {
    const contentHash = this.computeHash(params.content);
    const res = await query<ScanRecord>(
      `INSERT INTO scans (
        organization_id, user_id, source, content_hash, redacted_content,
        risk_score, severity, model, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        params.organization_id,
        params.user_id,
        params.source,
        contentHash,
        params.redacted_content,
        params.risk_score,
        params.severity,
        params.model,
        params.status || "completed"
      ]
    );
    return res.rows[0];
  }

  public static async getScanById(
    organizationId: string,
    scanId: string
  ): Promise<ScanRecord | null> {
    const res = await query<ScanRecord>(
      `SELECT * FROM scans WHERE id = $1 AND organization_id = $2`,
      [scanId, organizationId]
    );
    return res.rows[0] || null;
  }

  public static async getScans(
    organizationId: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<{ scans: ScanRecord[]; total: number }> {
    const res = await query<ScanRecord>(
      `SELECT * FROM scans WHERE organization_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
      [organizationId, limit, offset]
    );
    const countRes = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM scans WHERE organization_id = $1`,
      [organizationId]
    );
    return {
      scans: res.rows,
      total: parseInt(countRes.rows[0]?.count || "0", 10)
    };
  }
}
