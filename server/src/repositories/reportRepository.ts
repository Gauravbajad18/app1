import { query } from "../db";

export interface ReportRecord {
  id: string;
  organization_id: string;
  created_by: string;
  period_start: string;
  period_end: string;
  posture_score: number;
  metrics: Record<string, any>;
  content: Record<string, any>;
  created_at: string;
}

export class ReportRepository {
  /**
   * Aggregate real metrics strictly from the database within the date range.
   */
  public static async aggregateMetrics(
    organizationId: string,
    periodStart: string,
    periodEnd: string
  ): Promise<Record<string, any>> {
    // 1. Scans count
    const scansRes = await query<{ count: string; source: string }>(
      `SELECT source, COUNT(*) as count 
       FROM scans 
       WHERE organization_id = $1 AND created_at >= $2 AND created_at <= $3 
       GROUP BY source`,
      [organizationId, periodStart, periodEnd]
    );

    const scansBySource: Record<string, number> = {};
    let totalScans = 0;
    for (const r of scansRes.rows) {
      const c = parseInt(r.count, 10);
      scansBySource[r.source] = c;
      totalScans += c;
    }

    // 2. Detections by severity & data_type
    const detectionsRes = await query<{ count: string; severity: string; data_type: string }>(
      `SELECT severity, data_type, COUNT(*) as count 
       FROM detections 
       WHERE organization_id = $1 AND created_at >= $2 AND created_at <= $3 
       GROUP BY severity, data_type`,
      [organizationId, periodStart, periodEnd]
    );

    const detectionsBySeverity: Record<string, number> = { low: 0, medium: 0, high: 0, critical: 0 };
    const detectionsByDataType: Record<string, number> = {};
    let totalDetections = 0;

    for (const r of detectionsRes.rows) {
      const c = parseInt(r.count, 10);
      detectionsBySeverity[r.severity] = (detectionsBySeverity[r.severity] || 0) + c;
      detectionsByDataType[r.data_type] = (detectionsByDataType[r.data_type] || 0) + c;
      totalDetections += c;
    }

    // 3. Incidents metrics
    const incidentsRes = await query<{ count: string; status: string; severity: string }>(
      `SELECT status, severity, COUNT(*) as count 
       FROM incidents 
       WHERE organization_id = $1 AND created_at >= $2 AND created_at <= $3 
       GROUP BY status, severity`,
      [organizationId, periodStart, periodEnd]
    );

    let totalIncidents = 0;
    let resolvedIncidents = 0;
    for (const r of incidentsRes.rows) {
      const c = parseInt(r.count, 10);
      totalIncidents += c;
      if (r.status === "resolved" || r.status === "false_positive") {
        resolvedIncidents += c;
      }
    }

    // 4. Fraud transactions metrics
    const fraudRes = await query<{ count: string; review_status: string; risk_level: string }>(
      `SELECT f.review_status, f.risk_level, COUNT(*) as count 
       FROM fraud_scores f 
       WHERE f.organization_id = $1 AND f.created_at >= $2 AND f.created_at <= $3 
       GROUP BY f.review_status, f.risk_level`,
      [organizationId, periodStart, periodEnd]
    );

    let totalTransactionsScored = 0;
    let flaggedTransactions = 0;
    for (const r of fraudRes.rows) {
      const c = parseInt(r.count, 10);
      totalTransactionsScored += c;
      if (r.risk_level === "high" || r.risk_level === "critical") {
        flaggedTransactions += c;
      }
    }

    // Compute Posture Score (0 - 100)
    // Starts at 100, penalize for uncontained critical incidents, high volume of sensitive data leaks
    let deductions = 0;
    deductions += (detectionsBySeverity.critical || 0) * 4;
    deductions += (detectionsBySeverity.high || 0) * 2;
    deductions += (totalIncidents - resolvedIncidents) * 5;
    deductions += flaggedTransactions * 2;

    const postureScore = Math.max(25, Math.min(100, 100 - deductions));

    return {
      period_start: periodStart,
      period_end: periodEnd,
      total_scans: totalScans,
      scans_by_source: scansBySource,
      total_detections: totalDetections,
      detections_by_severity: detectionsBySeverity,
      detections_by_data_type: detectionsByDataType,
      total_incidents: totalIncidents,
      resolved_incidents: resolvedIncidents,
      open_incidents: totalIncidents - resolvedIncidents,
      total_transactions_scored: totalTransactionsScored,
      flagged_transactions: flaggedTransactions,
      posture_score: postureScore
    };
  }

  public static async createReport(params: {
    organization_id: string;
    created_by: string;
    period_start: string;
    period_end: string;
    posture_score: number;
    metrics: Record<string, any>;
    content: Record<string, any>;
  }): Promise<ReportRecord> {
    const res = await query<ReportRecord>(
      `INSERT INTO reports (
        organization_id, created_by, period_start, period_end, posture_score, metrics, content
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [
        params.organization_id,
        params.created_by,
        params.period_start,
        params.period_end,
        params.posture_score,
        JSON.stringify(params.metrics),
        JSON.stringify(params.content)
      ]
    );
    return res.rows[0];
  }

  public static async getReports(organizationId: string): Promise<ReportRecord[]> {
    const res = await query<ReportRecord>(
      `SELECT * FROM reports WHERE organization_id = $1 ORDER BY created_at DESC`,
      [organizationId]
    );
    return res.rows;
  }

  public static async getReportById(
    organizationId: string,
    reportId: string
  ): Promise<ReportRecord | null> {
    const res = await query<ReportRecord>(
      `SELECT * FROM reports WHERE id = $1 AND organization_id = $2`,
      [reportId, organizationId]
    );
    return res.rows[0] || null;
  }
}
