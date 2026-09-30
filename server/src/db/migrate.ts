import fs from "fs";
import path from "path";
import { query, withTransaction } from "./index";
import pino from "pino";

const logger = pino({ name: "db-migrate" });

export async function runMigrations() {
  logger.info("Starting database migration runner...");

  try {
    // Create schema_migrations table if not exists
    await query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    const migrationsDir = path.resolve(__dirname, "../../migrations");
    if (!fs.existsSync(migrationsDir)) {
      logger.warn({ migrationsDir }, "Migrations directory not found, skipping.");
      return;
    }

    const files = fs
      .readdirSync(migrationsDir)
      .filter(f => f.endsWith(".sql"))
      .sort();

    for (const file of files) {
      const alreadyApplied = await query(
        `SELECT id FROM schema_migrations WHERE name = $1`,
        [file]
      );

      if (alreadyApplied.rows.length === 0) {
        logger.info({ file }, "Applying database migration...");
        const sql = fs.readFileSync(path.join(migrationsDir, file), "utf-8");

        await withTransaction(async (client) => {
          await client.query(sql);
          await client.query(`INSERT INTO schema_migrations (name) VALUES ($1)`, [file]);
        });

        logger.info({ file }, "Successfully applied migration.");
      } else {
        logger.info({ file }, "Migration already applied; skipping.");
      }
    }

    logger.info("All database migrations completed successfully.");
  } catch (err: any) {
    logger.error({ err: err.message }, "Database migration runner failed");
    // Don't crash in local development if offline
    if (process.env.NODE_ENV === "production") {
      throw err;
    }
  }
}

if (require.main === module) {
  runMigrations()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
