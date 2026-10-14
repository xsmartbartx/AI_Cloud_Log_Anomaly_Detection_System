import { mkdirSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { Pool } from "pg";
import { PGlite } from "@electric-sql/pglite";

/**
 * One tiny interface over two Postgres drivers:
 *  - DATABASE_URL set: node-postgres pool (production, Neon, Supabase)
 *  - otherwise: PGlite, an in-process Postgres, so dev and tests need no server or account.
 * Migrations are plain SQL files in db/migrations, tracked in _migrations.
 */
export type Db = {
  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>;
  tx<R>(fn: (q: Db["query"]) => Promise<R>): Promise<R>;
  close(): Promise<void>;
};

const MIGRATIONS_DIR = join(process.cwd(), "db", "migrations");

function migrationFiles(): Array<{ name: string; sql: string }> {
  return readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith(".sql")).sort()
    .map((name) => ({ name, sql: readFileSync(join(MIGRATIONS_DIR, name), "utf8") }));
}

export async function migrate(db: Db): Promise<string[]> {
  await db.query("create table if not exists _migrations (name text primary key, applied_at timestamptz not null default now())");
  const done = new Set((await db.query<{ name: string }>("select name from _migrations")).map((r) => r.name));
  const applied: string[] = [];
  for (const m of migrationFiles()) {
    if (done.has(m.name)) continue;
    await db.tx(async (q) => {
      await q(m.sql);
      await q("insert into _migrations (name) values ($1)", [m.name]);
    });
    applied.push(m.name);
  }
  return applied;
}

/** PGlite prepares statements when params are given, so multi-statement SQL (migrations) goes through exec. */
async function run(c: { query: PGlite["query"]; exec: PGlite["exec"] }, sql: string, params?: unknown[]): Promise<never> {
  if (params === undefined) {
    const rs = await c.exec(sql);
    return (rs.length ? rs[rs.length - 1].rows : []) as never;
  }
  return (await c.query(sql, params as never[])).rows as never;
}

export async function createPgliteDb(dataDir?: string): Promise<Db> {
  if (dataDir) mkdirSync(dirname(dataDir), { recursive: true });
  const pg = new PGlite(dataDir);
  await pg.waitReady;
  const db: Db = {
    async query(sql, params) {
      return run(pg, sql, params);
    },
    async tx(fn) {
      return pg.transaction(async (t) => fn((sql, params) => run(t, sql, params)));
    },
    close: () => pg.close(),
  };
  return db;
}

export function createPgDb(url: string): Db {
  const pool = new Pool({ connectionString: url, max: 10 });
  return {
    async query(sql, params) {
      return (await pool.query(sql, params as never[] | undefined)).rows as never;
    },
    async tx(fn) {
      const c = await pool.connect();
      try {
        await c.query("begin");
        const r = await fn(async (sql, params) => (await c.query(sql, params as never[] | undefined)).rows as never);
        await c.query("commit");
        return r;
      } catch (e) {
        await c.query("rollback");
        throw e;
      } finally {
        c.release();
      }
    },
    close: () => pool.end(),
  };
}

const g = globalThis as unknown as { __sentinelDb?: Promise<Db> };

/** Shared handle for the running app. */
export function getDb(): Promise<Db> {
  if (!g.__sentinelDb) {
    g.__sentinelDb = (async () => {
      const url = process.env.DATABASE_URL;
      if (url) return createPgDb(url); // production: run `npm run db:migrate` as a deploy step
      if (process.env.NODE_ENV === "production") throw new Error("DATABASE_URL is required in production.");
      const db = await createPgliteDb(join(process.env.SENTINEL_DATA_DIR ?? join(process.cwd(), ".data"), "pglite"));
      await migrate(db);
      return db;
    })();
    g.__sentinelDb.catch(() => { g.__sentinelDb = undefined; }); // do not cache a failed start
  }
  return g.__sentinelDb;
}
