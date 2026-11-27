"use server";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { sql } from "@/lib/db";
import { addPoints } from "@/lib/queries";
import { verses } from "@/lib/verses";
import { sameWord, splitWord } from "@/lib/memorize";

/** Every word of a checked text typed from memory at the last level: 5 stars, once per text. The words are checked here too. */
export async function memorized(key: string, typed: string[]) {
  const u = await requireRole("student");
  const v = (await verses()).find((x) => x.key === key);
  const words = v?.lines.flatMap((l) => l.split(/\s+/)).map((w) => splitWord(w).core).filter(Boolean) ?? [];
  if (!words.length || typed.length !== words.length || !words.every((w, i) => sameWord(String(typed[i]), w))) return { points: 0 };
  const reason = `zhattau:${key}`;
  const [done] = await sql`select 1 from points_log where student_id = ${u.id} and reason = ${reason}`;
  if (done) return { points: 0 };
  await addPoints(u.id, 5, reason);
  revalidatePath("/oqushy", "layout");
  return { points: 5 };
}
