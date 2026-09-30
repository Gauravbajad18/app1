import { query } from "../db";
import { UserRole } from "@trustshield/shared";

export interface MemberRecord {
  id: string;
  organization_id: string;
  user_id: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface MemberWithUserProfile extends MemberRecord {
  email: string;
  full_name: string;
  last_login_at: string | null;
}

export class MemberRepository {
  public static async findByOrgAndUser(
    organizationId: string,
    userId: string
  ): Promise<MemberRecord | null> {
    const res = await query<MemberRecord>(
      `SELECT * FROM organization_members WHERE organization_id = $1 AND user_id = $2`,
      [organizationId, userId]
    );
    return res.rows[0] || null;
  }

  public static async getFirstOrgForUser(
    userId: string
  ): Promise<{ organization_id: string; role: UserRole } | null> {
    const res = await query<{ organization_id: string; role: UserRole }>(
      `SELECT organization_id, role FROM organization_members WHERE user_id = $1 ORDER BY created_at ASC LIMIT 1`,
      [userId]
    );
    return res.rows[0] || null;
  }

  public static async addMember(
    organizationId: string,
    userId: string,
    role: UserRole
  ): Promise<MemberRecord> {
    const res = await query<MemberRecord>(
      `INSERT INTO organization_members (organization_id, user_id, role)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [organizationId, userId, role]
    );
    return res.rows[0];
  }

  public static async listOrgMembers(
    organizationId: string
  ): Promise<MemberWithUserProfile[]> {
    const res = await query<MemberWithUserProfile>(
      `SELECT m.*, u.email, u.full_name, u.last_login_at
       FROM organization_members m
       JOIN users u ON u.id = m.user_id
       WHERE m.organization_id = $1
       ORDER BY m.created_at ASC`,
      [organizationId]
    );
    return res.rows;
  }

  public static async updateRole(
    organizationId: string,
    memberId: string,
    role: UserRole
  ): Promise<MemberRecord | null> {
    const res = await query<MemberRecord>(
      `UPDATE organization_members
       SET role = $1, updated_at = NOW()
       WHERE id = $2 AND organization_id = $3
       RETURNING *`,
      [role, memberId, organizationId]
    );
    return res.rows[0] || null;
  }

  public static async removeMember(
    organizationId: string,
    memberId: string
  ): Promise<boolean> {
    const res = await query(
      `DELETE FROM organization_members WHERE id = $1 AND organization_id = $2`,
      [memberId, organizationId]
    );
    return (res.rowCount || 0) > 0;
  }
}
