import { query } from "../db";
import { OrgRepository } from "../repositories/orgRepository";
import pino from "pino";

const logger = pino({ name: "retention-job" });

export class RetentionCleanupJob {
  /**
   * Scans all organizations and removes scan records older than the configured data_retention_days.
   */
  public static async run(): Promise<number> {
    try {
      logger.info("Starting scheduled data retention cleanup job...");

      const orgsRes = await query<{ id: string; settings: any }>(
        `SELECT id, settings FROM organizations`
      );

      let totalDeleted = 0;

      for (const org of orgsRes.rows) {
        const retentionDays = org.settings?.data_retention_days || 90;
        const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString();

        const delRes = await query(
          `DELETE FROM scans WHERE organization_id = $1 AND created_at < $2`,
          [org.id, cutoffDate]
        );

        const count = delRes.rowCount || 0;
        totalDeleted += count;
        if (count > 0) {
          logger.info({ orgId: org.id, retentionDays, deletedCount: count }, "Cleaned up expired scan records");
        }
      }

      logger.info({ totalDeleted }, "Completed data retention cleanup job");
      return totalDeleted;
    } catch (err: any) {
      logger.error({ err: err.message }, "Retention cleanup job encountered an error");
      return 0;
    }
  }
}
