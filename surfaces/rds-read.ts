// ─────────────────────────────────────────────────────────────────────────────
// Surface: rds (READ-ONLY Postgres).  SKMD rule: NEVER mutate prod — this adapter
// only ever issues SELECT/WITH and runs inside a READ ONLY transaction.  Creds are
// read from env (a full DATABASE_URL / RDS_URL, or discrete RDS_HOST/RDS_PORT/
// RDS_DATABASE/RDS_USER/RDS_PASSWORD, per SKMD/SSM conventions).  The `pg` driver
// is loaded via dynamic import so it is NOT a hard dependency — if creds or the
// driver are absent the tool degrades to a graceful { ok:false }.
// Tools: rds_list_tables, rds_query.
// ─────────────────────────────────────────────────────────────────────────────

import type { SurfaceTool, SurfaceToolResult } from "@/lib/surfaces";
import { asInt, asString, failed, firstEnv, noCreds } from "./util";

const ROW_CAP = 200;

interface PgConfig {
  connectionString?: string;
  host?: string;
  port?: number;
  database?: string;
  user?: string;
  password?: string;
  ssl?: { rejectUnauthorized: boolean };
}

/** Build a pg config from env, or null if nothing is configured. */
function pgConfig(): PgConfig | null {
  const url = firstEnv("DATABASE_URL", "RDS_URL", "RDS_DATABASE_URL");
  if (url) {
    return { connectionString: url, ssl: { rejectUnauthorized: false } };
  }
  const host = firstEnv("RDS_HOST", "RDS_HOSTNAME", "PGHOST");
  const database = firstEnv("RDS_DATABASE", "RDS_DB_NAME", "PGDATABASE");
  const user = firstEnv("RDS_USER", "RDS_USERNAME", "PGUSER");
  const password = firstEnv("RDS_PASSWORD", "PGPASSWORD");
  if (host && database && user) {
    return {
      host,
      database,
      user,
      password,
      port: parseInt(firstEnv("RDS_PORT", "PGPORT") ?? "5432", 10),
      ssl: { rejectUnauthorized: false },
    };
  }
  return null;
}

/** Reject anything that isn't a single read-only statement. */
function isReadOnlySql(sql: string): boolean {
  const trimmed = sql.trim().replace(/;+\s*$/, "");
  if (trimmed.includes(";")) return false; // no statement chaining
  if (!/^(select|with|table|show|explain)\b/i.test(trimmed)) return false;
  if (/\b(insert|update|delete|drop|alter|create|truncate|grant|revoke|copy|call|do|merge)\b/i.test(trimmed))
    return false;
  return true;
}

/** Dynamically load pg's Client class, or null if the driver isn't installed. */
async function loadPgClient(): Promise<(new (cfg: PgConfig) => PgClientLike) | null> {
  try {
    // Indirect specifier: keeps 'pg' an optional runtime dep, not a build-time one.
    const spec = "pg";
    const mod = (await import(/* webpackIgnore: true */ spec)) as unknown as {
      default?: { Client: new (cfg: PgConfig) => PgClientLike };
      Client?: new (cfg: PgConfig) => PgClientLike;
    };
    return mod.Client ?? mod.default?.Client ?? null;
  } catch {
    return null;
  }
}

interface PgClientLike {
  connect(): Promise<void>;
  query(sql: string, params?: unknown[]): Promise<{ rows: unknown[]; rowCount: number | null }>;
  end(): Promise<void>;
}

async function withReadOnly<T>(
  cfg: PgConfig,
  fn: (q: (sql: string, params?: unknown[]) => Promise<{ rows: unknown[]; rowCount: number | null }>) => Promise<T>,
): Promise<T | SurfaceToolResult> {
  const Client = await loadPgClient();
  if (!Client)
    return failed("pg driver not installed — rds unavailable (add 'pg' to enable live queries)");
  const client = new Client(cfg);
  try {
    await client.connect();
  } catch (e) {
    return failed(`rds connection failed: ${(e as Error).message}`);
  }
  try {
    await client.query("BEGIN TRANSACTION READ ONLY");
    const out = await fn((sql, params) => client.query(sql, params));
    await client.query("COMMIT");
    return out;
  } catch (e) {
    try {
      await client.query("ROLLBACK");
    } catch {
      /* ignore */
    }
    return failed(`rds query error: ${(e as Error).message}`);
  } finally {
    try {
      await client.end();
    } catch {
      /* ignore */
    }
  }
}

const rdsListTables: SurfaceTool = {
  name: "rds_list_tables",
  surface: "rds",
  description:
    "List user tables in the connected Postgres database (schema + table name + estimated row count).",
  schema: { type: "object", properties: {} },
  async invoke(): Promise<SurfaceToolResult> {
    const cfg = pgConfig();
    if (!cfg) return noCreds("rds");
    const res = await withReadOnly(cfg, async (q) => {
      const { rows } = await q(
        `select table_schema, table_name
           from information_schema.tables
          where table_type = 'BASE TABLE'
            and table_schema not in ('pg_catalog','information_schema')
          order by table_schema, table_name
          limit $1`,
        [ROW_CAP],
      );
      return rows;
    });
    if (isSurfaceResult(res)) return res;
    if (res.length === 0)
      return { ok: false, data: { tables: [] }, note: "empty result — no user tables" };
    return { ok: true, data: { count: res.length, tables: res } };
  },
};

const rdsQuery: SurfaceTool = {
  name: "rds_query",
  surface: "rds",
  description:
    "Run a single READ-ONLY SQL query (SELECT/WITH/EXPLAIN only) against the connected Postgres database. Rows are capped.",
  schema: {
    type: "object",
    properties: {
      sql: { type: "string", description: "A single read-only SQL statement." },
      max_rows: { type: "number", description: `Max rows to return (cap ${ROW_CAP}).` },
    },
    required: ["sql"],
  },
  async invoke(args): Promise<SurfaceToolResult> {
    const cfg = pgConfig();
    if (!cfg) return noCreds("rds");
    const sql = asString(args.sql);
    if (!sql) return failed("missing 'sql' argument");
    if (!isReadOnlySql(sql))
      return failed("refused — only single read-only statements (SELECT/WITH/EXPLAIN) are allowed");
    const cap = asInt(args.max_rows, 50, ROW_CAP);
    const res = await withReadOnly(cfg, async (q) => {
      const { rows } = await q(sql, []);
      return rows.slice(0, cap);
    });
    if (isSurfaceResult(res)) return res;
    if (res.length === 0)
      return { ok: false, data: { rows: [] }, note: "empty result — query returned no rows" };
    return { ok: true, data: { count: res.length, rows: res } };
  },
};

// Distinguish an early { ok:false } SurfaceToolResult from a real row array.
function isSurfaceResult(x: unknown): x is SurfaceToolResult {
  return typeof x === "object" && x !== null && "ok" in x && "data" in x;
}

export const rdsReadTools: SurfaceTool[] = [rdsListTables, rdsQuery];

export function rdsReadStatus(): "connected" | "unavailable" {
  return pgConfig() ? "connected" : "unavailable";
}
