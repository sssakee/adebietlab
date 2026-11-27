// Brute-force guard for sign-in: a 4-digit PIN has only 10 000 values.
// Only failed attempts count; a successful sign-in clears the account's counter.
import "server-only";
import { headers } from "next/headers";
import { sql } from "./db";

const WINDOW = "15 minutes";
export const LIMIT_MESSAGE = "Тым көп қате әрекет. 15 минуттан кейін қайта көріңіз.";
export const PER_ACCOUNT = 5;
export const PER_IP = 30;

// Created on first use, so the live database needs no manual migration (also in db/schema.sql).
let ready: Promise<unknown> | undefined;
const ensure = () =>
  (ready ??= sql`create table if not exists app.login_attempts (key text primary key, fails int not null default 0, reset_at timestamptz not null)`
    .then(() => sql`alter table app.login_attempts enable row level security`)
    .catch((e) => {
      ready = undefined;
      throw e;
    }));

export async function clientIp() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0].trim() || h.get("x-real-ip") || "local";
}

/** True when any key has reached its limit inside the current window. */
export async function blocked(keys: [key: string, limit: number][]) {
  await ensure();
  const rows = await sql<{ key: string; fails: number }[]>`
    select key, fails from app.login_attempts where key in ${sql(keys.map(([k]) => k))} and reset_at > now()`;
  return rows.some((r) => r.fails >= keys.find(([k]) => k === r.key)![1]);
}

export async function noteFail(keys: string[]) {
  await ensure();
  for (const key of keys)
    await sql`insert into app.login_attempts (key, fails, reset_at) values (${key}, 1, now() + ${WINDOW}::interval)
      on conflict (key) do update set
        fails = case when app.login_attempts.reset_at <= now() then 1 else app.login_attempts.fails + 1 end,
        reset_at = case when app.login_attempts.reset_at <= now() then now() + ${WINDOW}::interval else app.login_attempts.reset_at end`;
}

export async function clearFails(key: string) {
  await ensure();
  await sql`delete from app.login_attempts where key = ${key}`;
}
