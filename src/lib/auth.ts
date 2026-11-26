// Who is signed in. The cookie holds only a signed user id; the role is read from the database.
import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { sql } from "./db";

const COOKIE = "al_session";

function secret() {
  const s = process.env.AUTH_SECRET;
  if (s) return s;
  if (process.env.NODE_ENV === "production") throw new Error("AUTH_SECRET is not set");
  return "dev-only-secret";
}

const sign = (id: string) => createHmac("sha256", secret()).update(id).digest("base64url");

export async function startSession(userId: string) {
  (await cookies()).set(COOKIE, `${userId}.${sign(userId)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function endSession() {
  (await cookies()).delete(COOKIE);
}

export type User = {
  id: string;
  role: "teacher" | "student";
  full_name: string;
  points: number;
  class_id: string | null;
  class_name: string | null;
  grade: number | null;
};

export const getUser = cache(async (): Promise<User | null> => {
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return null;
  const [id, mac] = raw.split(".");
  let expected: string;
  try {
    expected = sign(id);
  } catch {
    return null; // misconfigured secret must not take the whole site down
  }
  if (!mac || mac.length !== expected.length || !timingSafeEqual(Buffer.from(mac), Buffer.from(expected))) return null;
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  const [u] = await sql<User[]>`
    select p.id, p.role, p.full_name, p.points, c.id as class_id, c.name as class_name, c.grade
    from profiles p
    left join class_members m on m.student_id = p.id
    left join classes c on c.id = m.class_id
    where p.id = ${id}
    order by c.created_at
    limit 1`;
  return u ?? null;
});

/** For pages and server actions: redirects when not signed in or wrong role. */
export async function requireRole<R extends User["role"]>(role: R): Promise<User & { role: R }> {
  const u = await getUser();
  if (!u) redirect("/kiru");
  if (u.role !== role) redirect(u.role === "teacher" ? "/mugalim" : "/oqushy");
  return u as User & { role: R };
}
