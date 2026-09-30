import { Pool, PoolClient, QueryResult, QueryResultRow } from "pg";
import { env } from "../config";
import pino from "pino";

const logger = pino({ name: "db-pool" });

let pool: Pool | null = null;
let isMemoryFallback = false;

// In-Memory store for offline/local resilience when DATABASE_URL is not yet configured
const memoryTables: Record<string, any[]> = {
  organizations: [],
  users: [],
  organization_members: [],
  refresh_tokens: [],
  privacy_policies: [],
  scans: [],
  detections: [],
  detection_feedback: [],
  ai_conversations: [],
  ai_messages: [],
  phishing_analyses: [],
  transactions: [],
  fraud_scores: [],
  incidents: [],
  incident_detections: [],
  incident_comments: [],
  reports: [],
  ai_usage: [],
  audit_logs: []
};

const isValidPgUrl =
  Boolean(env.DATABASE_URL) &&
  (env.DATABASE_URL.startsWith("postgres://") || env.DATABASE_URL.startsWith("postgresql://"));

if (isValidPgUrl) {
  try {
    const isSupabase =
      env.DATABASE_URL.includes("supabase.co") ||
      env.DATABASE_URL.includes("pooler") ||
      env.DATABASE_URL.includes("sslmode=require");

    pool = new Pool({
      connectionString: env.DATABASE_URL,
      ssl: isSupabase ? { rejectUnauthorized: false } : undefined,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000
    });

    pool.on("error", (err) => {
      logger.error({ err }, "Unexpected error on idle PostgreSQL client");
    });

    logger.info("Configured PostgreSQL connection pool with SSL");
  } catch (err) {
    logger.warn({ err }, "Could not initialize PostgreSQL pool. Enabling memory fallback store.");
    isMemoryFallback = true;
  }
} else {
  logger.warn("DATABASE_URL is not configured with a valid postgresql:// URI. Running in-memory database adapter for local sandbox.");
  isMemoryFallback = true;
}

export function getMemoryTables() {
  return memoryTables;
}

export function setIsMemoryFallback(fallback: boolean) {
  isMemoryFallback = fallback;
}

/**
 * Execute parameterized SQL query against PostgreSQL or fallback engine.
 */
export async function query<T extends QueryResultRow = any>(
  text: string,
  params: any[] = []
): Promise<QueryResult<T>> {
  if (pool && !isMemoryFallback) {
    try {
      return await pool.query<T>(text, params);
    } catch (err: any) {
      // If PostgreSQL connection fails (e.g. host unreachable), fallback gracefully
      logger.error({ err: err.message, sql: text }, "Database query error on live PostgreSQL");
      throw err;
    }
  }

  // Fallback in-memory query handler for local demonstration and zero-dependency tests
  return executeInMemoryQuery<T>(text, params);
}

export async function withTransaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  if (!pool || isMemoryFallback) {
    // Fake client for transaction
    const fakeClient: any = {
      query: (t: string, p: any[]) => query(t, p),
      release: () => {}
    };
    return await callback(fakeClient);
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Lightweight, robust in-memory SQL executor supporting parameterized
 * INSERT, SELECT, UPDATE, DELETE for tests and offline development.
 */
function executeInMemoryQuery<T extends QueryResultRow = any>(sql: string, params: any[]): QueryResult<T> {
  const trimmed = sql.trim();
  const lower = trimmed.toLowerCase();

  // 1. INSERT INTO table (cols) VALUES ($1, $2, ...) RETURNING *
  if (lower.startsWith("insert into")) {
    const tableMatch = trimmed.match(/insert\s+into\s+([a-zA-Z0-9_]+)\s*\(([^)]+)\)\s*values\s*\(([^)]+)\)/i);
    if (tableMatch) {
      const tableName = tableMatch[1].toLowerCase();
      const cols = tableMatch[2].split(",").map(c => c.trim().toLowerCase());
      
      const newRow: any = {
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      cols.forEach((col, idx) => {
        newRow[col] = params[idx];
      });

      if (!memoryTables[tableName]) {
        memoryTables[tableName] = [];
      }
      memoryTables[tableName].push(newRow);

      return {
        rows: [newRow as T],
        rowCount: 1,
        command: "INSERT",
        oid: 0,
        fields: []
      };
    }
  }

  // 2. SELECT ... FROM table WHERE ...
  if (lower.startsWith("select")) {
    const fromMatch = trimmed.match(/from\s+([a-zA-Z0-9_]+)/i);
    if (fromMatch) {
      const tableName = fromMatch[1].toLowerCase();
      let records = memoryTables[tableName] || [];

      // Filter by params using precise word boundaries
      if (lower.includes("where")) {
        records = records.filter(row => {
          let match = true;
          
          if (/\borganization_id\s*=\s*\$1\b/i.test(trimmed) && params[0]) {
            match = match && (row.organization_id === params[0]);
          }
          if (/\b(?<![a-zA-Z0-9_])id\s*=\s*\$1\b/i.test(trimmed) && params[0]) {
            match = match && (row.id === params[0]);
          }
          if (/\b(?<![a-zA-Z0-9_])id\s*=\s*\$2\b/i.test(trimmed) && params[1]) {
            match = match && (row.id === params[1]);
          }
          if (/email\s*=\s*\$1|lower\(email\)\s*=\s*lower\(\$1\)/i.test(trimmed)) {
            match = match && (row.email?.toLowerCase() === params[0]?.toLowerCase());
          }
          if (/\bslug\s*=\s*\$1\b/i.test(trimmed)) {
            match = match && (row.slug === params[0]);
          }
          if (/\btoken_hash\s*=\s*\$1\b/i.test(trimmed)) {
            match = match && (row.token_hash === params[0]);
          }
          if (/\binvite_code_hash\s*=\s*\$1\b/i.test(trimmed)) {
            match = match && (row.invite_code_hash === params[0]);
          }
          if (/\buser_id\s*=\s*\$1\b/i.test(trimmed) && params[0]) {
            match = match && (row.user_id === params[0]);
          }
          if (/\buser_id\s*=\s*\$2\b/i.test(trimmed) && params[1]) {
            match = match && (row.user_id === params[1]);
          }
          if (/\bfamily_id\s*=\s*\$1\b/i.test(trimmed) && params[0]) {
            match = match && (row.family_id === params[0]);
          }
          if (/\baccount_ref_hash\s*=\s*\$2\b/i.test(trimmed) && params[1]) {
            match = match && (row.account_ref_hash === params[1]);
          }
          if (/\bscan_id\s*=\s*\$1\b/i.test(trimmed) && params[0]) {
            match = match && (row.scan_id === params[0]);
          }
          if (/\bscan_id\s*=\s*\$2\b/i.test(trimmed) && params[1]) {
            match = match && (row.scan_id === params[1]);
          }
          if (/\bincident_id\s*=\s*\$1\b/i.test(trimmed) && params[0]) {
            match = match && (row.incident_id === params[0]);
          }
          if (/\bconversation_id\s*=\s*\$1\b/i.test(trimmed) && params[0]) {
            match = match && (row.conversation_id === params[0]);
          }
          if (/\bstatus\s*=\s*\$2\b/i.test(trimmed) && params[1]) {
            match = match && (row.status === params[1]);
          }
          if (/\bdata_type\s*=\s*\$2\b/i.test(trimmed) && params[1]) {
            match = match && (row.data_type === params[1]);
          }
          return match;
        });
      }

      // Order by
      if (lower.includes("order by created_at desc") || lower.includes("order by occurred_at desc") || lower.includes("order by updated_at desc")) {
        records.sort((a, b) => new Date(b.created_at || b.occurred_at || b.updated_at || 0).getTime() - new Date(a.created_at || a.occurred_at || a.updated_at || 0).getTime());
      } else if (lower.includes("order by created_at asc")) {
        records.sort((a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime());
      }

      // LIMIT
      const limitMatch = trimmed.match(/limit\s+(\d+|\$\d+)/i);
      if (limitMatch) {
        const lim = limitMatch[1].startsWith("$")
          ? params[parseInt(limitMatch[1].slice(1), 10) - 1]
          : parseInt(limitMatch[1], 10);
        records = records.slice(0, lim);
      }

      return {
        rows: records as T[],
        rowCount: records.length,
        command: "SELECT",
        oid: 0,
        fields: []
      };
    }
  }

  // 3. UPDATE table SET ... WHERE ...
  if (lower.startsWith("update")) {
    const tableMatch = trimmed.match(/update\s+([a-zA-Z0-9_]+)/i);
    if (tableMatch) {
      const tableName = tableMatch[1].toLowerCase();
      const records = memoryTables[tableName] || [];
      const updatedRows: any[] = [];

      // Extract target ID from WHERE clause
      const whereIdMatch = trimmed.match(/where\s+(?:.*?\s+)?id\s*=\s*\$(\d+)/i);
      const targetId = whereIdMatch ? params[parseInt(whereIdMatch[1], 10) - 1] : null;

      for (let i = 0; i < records.length; i++) {
        const row = records[i];
        let matches = true;

        if (targetId) {
          matches = (row.id === targetId);
        }

        if (matches) {
          // If updating specific columns, map from SET clause
          const setClauseMatch = trimmed.match(/set\s+(.*?)\s+where/i);
          if (setClauseMatch) {
            const assignments = setClauseMatch[1].split(",");
            for (const assign of assignments) {
              const paramMatch = assign.match(/([a-zA-Z0-9_]+)\s*=\s*\$(\d+)/);
              if (paramMatch) {
                const col = paramMatch[1].toLowerCase();
                const pIdx = parseInt(paramMatch[2], 10) - 1;
                row[col] = params[pIdx];
              }
            }
          }

          row.updated_at = new Date().toISOString();
          updatedRows.push(row);
        }
      }

      return {
        rows: updatedRows as T[],
        rowCount: updatedRows.length,
        command: "UPDATE",
        oid: 0,
        fields: []
      };
    }
  }

  // 4. DELETE FROM table WHERE ...
  if (lower.startsWith("delete from")) {
    const tableMatch = trimmed.match(/delete\s+from\s+([a-zA-Z0-9_]+)/i);
    if (tableMatch) {
      const tableName = tableMatch[1].toLowerCase();
      const records = memoryTables[tableName] || [];
      const kept = records.filter(row => {
        if (params.length > 0 && row.id === params[0]) return false;
        return true;
      });
      const deletedCount = records.length - kept.length;
      memoryTables[tableName] = kept;

      return {
        rows: [] as T[],
        rowCount: deletedCount,
        command: "DELETE",
        oid: 0,
        fields: []
      };
    }
  }

  return {
    rows: [] as T[],
    rowCount: 0,
    command: "UNKNOWN",
    oid: 0,
    fields: []
  };
}
