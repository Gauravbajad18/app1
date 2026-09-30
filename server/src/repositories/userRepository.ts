import { query } from "../db";
import bcrypt from "bcrypt";

export interface UserRecord {
  id: string;
  email: string;
  password_hash: string;
  full_name: string;
  failed_login_count: number;
  locked_until: string | null;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

export class UserRepository {
  public static async findById(id: string): Promise<UserRecord | null> {
    const res = await query<UserRecord>(`SELECT * FROM users WHERE id = $1`, [id]);
    return res.rows[0] || null;
  }

  public static async findByEmail(email: string): Promise<UserRecord | null> {
    const res = await query<UserRecord>(
      `SELECT * FROM users WHERE LOWER(email) = LOWER($1)`,
      [email.trim()]
    );
    return res.rows[0] || null;
  }

  public static async create(
    email: string,
    plainPassword: string,
    fullName: string
  ): Promise<UserRecord> {
    // bcrypt with cost factor 12 as mandated by prompt
    const hash = await bcrypt.hash(plainPassword, 12);
    const res = await query<UserRecord>(
      `INSERT INTO users (email, password_hash, full_name)
       VALUES (LOWER($1), $2, $3)
       RETURNING *`,
      [email.trim(), hash, fullName.trim()]
    );
    return res.rows[0];
  }

  public static async recordFailedLogin(userId: string): Promise<{ locked: boolean; lockedUntil: Date | null }> {
    const user = await this.findById(userId);
    if (!user) return { locked: false, lockedUntil: null };

    const currentCount = Number(user.failed_login_count) || 0;
    const newCount = currentCount + 1;
    let lockedUntil: Date | null = null;

    // Lockout after 5 failed logins for 15 minutes
    if (newCount >= 5) {
      lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
    }

    await query(
      `UPDATE users 
       SET failed_login_count = $1, locked_until = $2, updated_at = NOW() 
       WHERE id = $3`,
      [newCount, lockedUntil ? lockedUntil.toISOString() : null, userId]
    );

    return { locked: newCount >= 5, lockedUntil };
  }

  public static async resetFailedLogin(userId: string): Promise<void> {
    await query(
      `UPDATE users 
       SET failed_login_count = 0, locked_until = NULL, last_login_at = NOW(), updated_at = NOW() 
       WHERE id = $1`,
      [userId]
    );
  }

  public static async updatePassword(userId: string, newPlainPassword: string): Promise<void> {
    const hash = await bcrypt.hash(newPlainPassword, 12);
    await query(
      `UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2`,
      [hash, userId]
    );
  }
}
