import { query } from "../db";
import { IncidentSource, IncidentStatus, Severity } from "@trustshield/shared";

export interface IncidentRecord {
  id: string;
  organization_id: string;
  title: string;
  description: string;
  source_type: IncidentSource;
  severity: Severity;
  status: IncidentStatus;
  assignee_id: string | null;
  created_by: string;
  resolved_at: string | null;
  ai_brief: Record<string, any> | null;
  created_at: string;
  updated_at: string;
}

export interface IncidentCommentRecord {
  id: string;
  organization_id: string;
  incident_id: string;
  user_id: string;
  user_name?: string;
  body: string;
  created_at: string;
}

export class IncidentRepository {
  public static async createIncident(params: {
    organization_id: string;
    title: string;
    description: string;
    source_type: IncidentSource;
    severity: Severity;
    created_by: string;
    status?: IncidentStatus;
    assignee_id?: string | null;
    ai_brief?: Record<string, any> | null;
    detection_ids?: string[];
  }): Promise<IncidentRecord> {
    const res = await query<IncidentRecord>(
      `INSERT INTO incidents (
        organization_id, title, description, source_type, severity,
        status, assignee_id, created_by, ai_brief
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        params.organization_id,
        params.title,
        params.description,
        params.source_type,
        params.severity,
        params.status || "open",
        params.assignee_id || null,
        params.created_by,
        params.ai_brief ? JSON.stringify(params.ai_brief) : null
      ]
    );

    const incident = res.rows[0];

    // Link detections if provided
    if (params.detection_ids && params.detection_ids.length > 0) {
      for (const detId of params.detection_ids) {
        await query(
          `INSERT INTO incident_detections (incident_id, detection_id, organization_id)
           VALUES ($1, $2, $3)
           ON CONFLICT DO NOTHING`,
          [incident.id, detId, params.organization_id]
        );
      }
    }

    return incident;
  }

  public static async getIncidents(
    organizationId: string,
    filters: {
      status?: string;
      severity?: string;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ incidents: IncidentRecord[]; total: number }> {
    let sql = `SELECT * FROM incidents WHERE organization_id = $1`;
    const params: any[] = [organizationId];

    if (filters.status) {
      params.push(filters.status);
      sql += ` AND status = $${params.length}`;
    }
    if (filters.severity) {
      params.push(filters.severity);
      sql += ` AND severity = $${params.length}`;
    }

    sql += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(filters.limit || 50, filters.offset || 0);

    const res = await query<IncidentRecord>(sql, params);

    const countRes = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM incidents WHERE organization_id = $1`,
      [organizationId]
    );

    return {
      incidents: res.rows,
      total: parseInt(countRes.rows[0]?.count || "0", 10)
    };
  }

  public static async getIncidentById(
    organizationId: string,
    incidentId: string
  ): Promise<IncidentRecord | null> {
    const res = await query<IncidentRecord>(
      `SELECT * FROM incidents WHERE id = $1 AND organization_id = $2`,
      [incidentId, organizationId]
    );
    return res.rows[0] || null;
  }

  public static async updateIncident(
    organizationId: string,
    incidentId: string,
    updates: Partial<{
      title: string;
      description: string;
      severity: Severity;
      status: IncidentStatus;
      assignee_id: string | null;
      ai_brief: Record<string, any>;
    }>
  ): Promise<IncidentRecord | null> {
    const existing = await this.getIncidentById(organizationId, incidentId);
    if (!existing) return null;

    const newStatus = updates.status !== undefined ? updates.status : existing.status;
    const resolvedAt =
      newStatus === "resolved" || newStatus === "false_positive"
        ? new Date().toISOString()
        : null;

    const res = await query<IncidentRecord>(
      `UPDATE incidents SET
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        severity = COALESCE($3, severity),
        status = COALESCE($4, status),
        assignee_id = $5,
        ai_brief = COALESCE($6, ai_brief),
        resolved_at = $7,
        updated_at = NOW()
       WHERE id = $8 AND organization_id = $9
       RETURNING *`,
      [
        updates.title || null,
        updates.description || null,
        updates.severity || null,
        updates.status || null,
        updates.assignee_id !== undefined ? updates.assignee_id : existing.assignee_id,
        updates.ai_brief ? JSON.stringify(updates.ai_brief) : null,
        resolvedAt,
        incidentId,
        organizationId
      ]
    );
    return res.rows[0] || null;
  }

  public static async addComment(
    organizationId: string,
    incidentId: string,
    userId: string,
    body: string
  ): Promise<IncidentCommentRecord> {
    const res = await query<IncidentCommentRecord>(
      `INSERT INTO incident_comments (organization_id, incident_id, user_id, body)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [organizationId, incidentId, userId, body]
    );
    return res.rows[0];
  }

  public static async getComments(
    organizationId: string,
    incidentId: string
  ): Promise<IncidentCommentRecord[]> {
    const res = await query<IncidentCommentRecord>(
      `SELECT c.*, u.full_name as user_name
       FROM incident_comments c
       JOIN users u ON u.id = c.user_id
       WHERE c.incident_id = $1 AND c.organization_id = $2
       ORDER BY c.created_at ASC`,
      [incidentId, organizationId]
    );
    return res.rows;
  }

  public static async getLinkedDetections(
    organizationId: string,
    incidentId: string
  ): Promise<any[]> {
    const res = await query(
      `SELECT d.*
       FROM detections d
       JOIN incident_detections id ON id.detection_id = d.id
       WHERE id.incident_id = $1 AND id.organization_id = $2`,
      [incidentId, organizationId]
    );
    return res.rows;
  }
}
