import { query } from "../db";
import { DetectorType, FeedbackVerdict, Severity } from "@trustshield/shared";

export interface DetectionRecord {
  id: string;
  organization_id: string;
  scan_id: string;
  user_id: string;
  category: string;
  data_type: string;
  detector: DetectorType;
  masked_value: string;
  confidence: number;
  severity: Severity;
  evidence: Record<string, any>;
  recommended_action: string;
  start_offset: number;
  end_offset: number;
  created_at: string;
}

export interface DetectionFeedbackRecord {
  id: string;
  organization_id: string;
  detection_id: string;
  user_id: string;
  verdict: FeedbackVerdict;
  note: string | null;
  created_at: string;
}

export class DetectionRepository {
  public static async createDetections(
    organizationId: string,
    scanId: string,
    userId: string,
    items: Array<{
      category: string;
      data_type: string;
      detector: DetectorType;
      masked_value: string;
      confidence: number;
      severity: Severity;
      evidence?: Record<string, any>;
      recommended_action: string;
      start_offset: number;
      end_offset: number;
    }>
  ): Promise<DetectionRecord[]> {
    const created: DetectionRecord[] = [];

    for (const item of items) {
      const res = await query<DetectionRecord>(
        `INSERT INTO detections (
          organization_id, scan_id, user_id, category, data_type,
          detector, masked_value, confidence, severity, evidence,
          recommended_action, start_offset, end_offset
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *`,
        [
          organizationId,
          scanId,
          userId,
          item.category,
          item.data_type,
          item.detector,
          item.masked_value,
          item.confidence,
          item.severity,
          JSON.stringify(item.evidence || {}),
          item.recommended_action,
          item.start_offset,
          item.end_offset
        ]
      );
      created.push(res.rows[0]);
    }

    return created;
  }

  public static async getByScanId(
    organizationId: string,
    scanId: string
  ): Promise<DetectionRecord[]> {
    const res = await query<DetectionRecord>(
      `SELECT * FROM detections WHERE scan_id = $1 AND organization_id = $2 ORDER BY start_offset ASC`,
      [scanId, organizationId]
    );
    return res.rows;
  }

  public static async getById(
    organizationId: string,
    detectionId: string
  ): Promise<DetectionRecord | null> {
    const res = await query<DetectionRecord>(
      `SELECT * FROM detections WHERE id = $1 AND organization_id = $2`,
      [detectionId, organizationId]
    );
    return res.rows[0] || null;
  }

  public static async listDetections(
    organizationId: string,
    filters: {
      severity?: string;
      dataType?: string;
      detector?: string;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ detections: DetectionRecord[]; total: number }> {
    let sql = `SELECT * FROM detections WHERE organization_id = $1`;
    const params: any[] = [organizationId];

    if (filters.severity) {
      params.push(filters.severity);
      sql += ` AND severity = $${params.length}`;
    }
    if (filters.dataType) {
      params.push(filters.dataType);
      sql += ` AND data_type = $${params.length}`;
    }
    if (filters.detector) {
      params.push(filters.detector);
      sql += ` AND detector = $${params.length}`;
    }

    sql += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(filters.limit || 50, filters.offset || 0);

    const res = await query<DetectionRecord>(sql, params);

    const countRes = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM detections WHERE organization_id = $1`,
      [organizationId]
    );

    return {
      detections: res.rows,
      total: parseInt(countRes.rows[0]?.count || "0", 10)
    };
  }

  public static async saveFeedback(
    organizationId: string,
    detectionId: string,
    userId: string,
    verdict: FeedbackVerdict,
    note?: string
  ): Promise<DetectionFeedbackRecord> {
    const res = await query<DetectionFeedbackRecord>(
      `INSERT INTO detection_feedback (organization_id, detection_id, user_id, verdict, note)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [organizationId, detectionId, userId, verdict, note || null]
    );
    return res.rows[0];
  }

  public static async getFeedback(
    organizationId: string,
    detectionId: string
  ): Promise<DetectionFeedbackRecord | null> {
    const res = await query<DetectionFeedbackRecord>(
      `SELECT * FROM detection_feedback WHERE detection_id = $1 AND organization_id = $2 ORDER BY created_at DESC LIMIT 1`,
      [detectionId, organizationId]
    );
    return res.rows[0] || null;
  }
}
