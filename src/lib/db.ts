import "server-only";
import postgres from "postgres";

const open = () =>
  postgres(process.env.DATABASE_URL ?? "postgres://app:app@localhost:5432/adebietlab", {
    prepare: false, // works with Supabase's transaction pooler too
    max: process.env.VERCEL ? 5 : 10, // each serverless instance keeps its own pool
    max_pipeline: 1, // Supavisor before 2.10 never answers queries pipelined on one connection
    query_timeout: 10, // a socket that stops answering fails the page instead of hanging it
    idle_timeout: 20,
    connection: { search_path: "app" },
    transform: { undefined: null },
  });

/*
 * A serverless instance is frozen between requests, and meanwhile the pooler or a NAT may drop
 * its sockets. A query sent on such a socket never gets an answer, so the page stays on its
 * skeleton. Timers stop while frozen, so idle_timeout can't see it; the wall clock can: after
 * IDLE_MS without a query the pool is replaced. A fresh connection in the same region costs a
 * few milliseconds.
 */
const IDLE_MS = 30_000;
const g = globalThis as unknown as { pool?: postgres.Sql; used?: number };

function pool() {
  const now = Date.now();
  if (!g.pool || now - (g.used ?? 0) > IDLE_MS) {
    g.pool?.end({ timeout: 0 }).catch(() => {});
    g.pool = open();
  }
  g.used = now;
  return g.pool;
}

export const sql = new Proxy(function () {} as unknown as postgres.Sql, {
  apply: (_, __, args) => Reflect.apply(pool(), undefined, args),
  get: (_, key) => {
    const p = pool();
    const v = Reflect.get(p, key);
    return typeof v === "function" ? v.bind(p) : v;
  },
});
