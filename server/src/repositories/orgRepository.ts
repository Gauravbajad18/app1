import { query } from "../db";
import crypto from "crypto";

export interface OrganizationRecord {
  id: string;
  name: string;
  slug: string;
  invite_code_hash: string;
  settings: {
    auto_incident_threshold: string;
    data_retention_days: number;
    store_raw_content: boolean;
    ai_daily_limit_per_user: number;
  };
  created_at: string;
  updated_at: string;
}

export class OrgRepository {
  public static async findById(id: string): Promise<OrganizationRecord | null> {
    const res = await query<OrganizationRecord>(
      `SELECT * FROM organizations WHERE id = $1`,
      [id]
    );
    return res.rows[0] || null;
  }

  public static async findBySlug(slug: string): Promise<OrganizationRecord | null> {
    const res = await query<OrganizationRecord>(
      `SELECT * FROM organizations WHERE slug = $1`,
      [slug]
    );
    return res.rows[0] || null;
  }

  public static async findByInviteCode(inviteCode: string): Promise<OrganizationRecord | null> {
    const inviteHash = crypto.createHash("sha256").update(inviteCode.trim()).digest("hex");
    const res = await query<OrganizationRecord>(
      `SELECT * FROM organizations WHERE invite_code_hash = $1`,
      [inviteHash]
    );
    return res.rows[0] || null;
  }

  public static async create(name: string, slug: string, inviteCode: string): Promise<OrganizationRecord> {
    const inviteHash = crypto.createHash("sha256").update(inviteCode.trim()).digest("hex");
    const defaultSettings = {
      auto_incident_threshold: "high",
      data_retention_days: 90,
      store_raw_content: false,
      ai_daily_limit_per_user: 200
    };

    const res = await query<OrganizationRecord>(
      `INSERT INTO organizations (name, slug, invite_code_hash, settings)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [name, slug, inviteHash, JSON.stringify(defaultSettings)]
    );
    return res.rows[0];
  }

  public static async updateSettings(
    id: string,
    settings: Partial<OrganizationRecord["settings"]>
  ): Promise<OrganizationRecord | null> {
    const org = await this.findById(id);
    if (!org) return null;

    const merged = { ...org.settings, ...settings };
    const res = await query<OrganizationRecord>(
      `UPDATE organizations SET settings = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [JSON.stringify(merged), id]
    );
    return res.rows[0] || null;
  }

  public static async rotateInviteCode(id: string, newInviteCode: string): Promise<string> {
    const inviteHash = crypto.createHash("sha256").update(newInviteCode.trim()).digest("hex");
    await query(
      `UPDATE organizations SET invite_code_hash = $1, updated_at = NOW() WHERE id = $2`,
      [inviteHash, id]
    );
    return newInviteCode;
  }
}
