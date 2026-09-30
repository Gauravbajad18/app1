import { query } from "../db";
import { PhishingVerdict } from "@trustshield/shared";

export interface PhishingRecord {
  id: string;
  organization_id: string;
  scan_id: string;
  input_type: "email" | "sms" | "url";
  verdict: PhishingVerdict;
  indicators: Array<{ type: string; evidence: string; severity: string }>;
  tactics: string[];
  explanation: string;
  created_at: string;
}

export class PhishingRepository {
  public static async createAnalysis(params: {
    organization_id: string;
    scan_id: string;
    input_type: "email" | "sms" | "url";
    verdict: PhishingVerdict;
    indicators: any[];
    tactics: string[];
    explanation: string;
  }): Promise<PhishingRecord> {
    const res = await query<PhishingRecord>(
      `INSERT INTO phishing_analyses (
        organization_id, scan_id, input_type, verdict, indicators, tactics, explanation
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [
        params.organization_id,
        params.scan_id,
        params.input_type,
        params.verdict,
        JSON.stringify(params.indicators),
        JSON.stringify(params.tactics),
        params.explanation
      ]
    );
    return res.rows[0];
  }

  public static async getByScanId(
    organizationId: string,
    scanId: string
  ): Promise<PhishingRecord | null> {
    const res = await query<PhishingRecord>(
      `SELECT * FROM phishing_analyses WHERE scan_id = $1 AND organization_id = $2`,
      [scanId, organizationId]
    );
    return res.rows[0] || null;
  }
}
