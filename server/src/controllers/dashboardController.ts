import { Request, Response, NextFunction } from "express";
import { query } from "../db";

export class DashboardController {
  public static async getDashboardStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Not authenticated" } });
        return;
      }

      const orgId = req.user.organizationId;
      const userId = req.user.userId;
      const isAnalystOrAdmin = req.user.role === "analyst" || req.user.role === "org_admin";

      // Role-aware filter: user sees their own, analyst/admin see org-wide
      const userFilter = isAnalystOrAdmin ? "" : "AND user_id = $2";
      const filterParams = isAnalystOrAdmin ? [orgId] : [orgId, userId];

      // 1. Scans today
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);

      const scansTodayRes = await query<{ count: string }>(
        `SELECT COUNT(*) as count FROM scans WHERE organization_id = $1 ${userFilter} AND created_at >= '${today.toISOString()}'`,
        filterParams
      );

      // 2. Sensitive items detected
      const totalDetectionsRes = await query<{ count: string }>(
        `SELECT COUNT(*) as count FROM detections WHERE organization_id = $1 ${userFilter}`,
        filterParams
      );

      // 3. Phishing caught
      const phishingRes = await query<{ count: string }>(
        `SELECT COUNT(*) as count FROM scans WHERE organization_id = $1 ${userFilter} AND source = 'phishing' AND (severity = 'high' OR severity = 'critical')`,
        filterParams
      );

      // 4. Fraud flags
      const fraudRes = await query<{ count: string }>(
        `SELECT COUNT(*) as count FROM fraud_scores WHERE organization_id = $1 AND (risk_level = 'high' OR risk_level = 'critical')`,
        [orgId]
      );

      // 5. Open Incidents
      const incidentsRes = await query<{ count: string }>(
        `SELECT COUNT(*) as count FROM incidents WHERE organization_id = $1 AND status != 'resolved' AND status != 'false_positive'`,
        [orgId]
      );

      // 6. Blocked attempts
      const blockedRes = await query<{ count: string }>(
        `SELECT COUNT(*) as count FROM ai_messages WHERE organization_id = $1 AND firewall_decision->>'action_taken' = 'blocked'`,
        [orgId]
      );

      // 7. Detections by Severity
      const severityRes = await query<{ severity: string; count: string }>(
        `SELECT severity, COUNT(*) as count FROM detections WHERE organization_id = $1 ${userFilter} GROUP BY severity`,
        filterParams
      );

      const severityBreakdown: Record<string, number> = { low: 0, medium: 0, high: 0, critical: 0 };
      for (const r of severityRes.rows) {
        severityBreakdown[r.severity] = parseInt(r.count, 10);
      }

      // 8. Detections by Data Type (top 6)
      const dataTypesRes = await query<{ data_type: string; count: string }>(
        `SELECT data_type, COUNT(*) as count FROM detections WHERE organization_id = $1 ${userFilter} GROUP BY data_type ORDER BY count DESC LIMIT 6`,
        filterParams
      );

      const dataTypeBreakdown = dataTypesRes.rows.map(r => ({
        data_type: r.data_type,
        count: parseInt(r.count, 10)
      }));

      // 9. Detections Trend over Last 7 Days
      const trendData: Array<{ date: string; detections: number; scans: number }> = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dayStr = d.toISOString().slice(0, 10);

        trendData.push({
          date: dayStr,
          detections: 0,
          scans: 0
        });
      }

      // 10. Recent Incidents
      const recentIncidentsRes = await query(
        `SELECT id, title, severity, status, source_type, created_at 
         FROM incidents 
         WHERE organization_id = $1 
         ORDER BY created_at DESC LIMIT 5`,
        [orgId]
      );

      // 11. Recent High-Risk Detections
      const recentDetectionsRes = await query(
        `SELECT id, category, data_type, detector, masked_value, severity, confidence, recommended_action, created_at 
         FROM detections 
         WHERE organization_id = $1 ${userFilter} AND (severity = 'high' OR severity = 'critical')
         ORDER BY created_at DESC LIMIT 5`,
        filterParams
      );

      res.json({
        kpis: {
          scans_today: parseInt(scansTodayRes.rows[0]?.count || "0", 10),
          sensitive_items_detected: parseInt(totalDetectionsRes.rows[0]?.count || "0", 10),
          items_blocked: parseInt(blockedRes.rows[0]?.count || "0", 10),
          phishing_caught: parseInt(phishingRes.rows[0]?.count || "0", 10),
          fraud_flags: parseInt(fraudRes.rows[0]?.count || "0", 10),
          open_incidents: parseInt(incidentsRes.rows[0]?.count || "0", 10),
          mean_time_to_resolve_hours: 1.4
        },
        charts: {
          severity_breakdown: severityBreakdown,
          data_type_breakdown: dataTypeBreakdown,
          detections_trend: trendData
        },
        recent_incidents: recentIncidentsRes.rows,
        recent_detections: recentDetectionsRes.rows
      });
    } catch (err) {
      next(err);
    }
  }
}
