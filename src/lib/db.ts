import "server-only";
import postgres from "postgres";

// One pool per server process (kept across dev hot reloads).
const g = globalThis as unknown as { sql?: postgres.Sql };

export const sql =
  g.sql ??
  postgres(process.env.DATABASE_URL ?? "postgres://app:app@localhost:5432/adebietlab", {
    prepare: false, // works with Supabase's transaction pooler too
    connection: { search_path: "app" },
    transform: { undefined: null },
  });

if (process.env.NODE_ENV !== "production") g.sql = sql;
