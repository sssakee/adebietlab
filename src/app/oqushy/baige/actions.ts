"use server";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { sql } from "@/lib/db";
import { buildQuiz, DAILY } from "@/lib/quiz";
import { addPoints, dayBefore, quizWorks, today } from "@/lib/queries";

export type QuizResult = { score: number; total: number; gained: number; answers: number[] } | { error: string };

/** Rebuilds the quiz from its seed and checks the answers here: the browser never sees the key. */
export async function submitQuiz(key: string, seed: string, picks: number[]): Promise<QuizResult> {
  const u = await requireRole("student");
  const d = await today();
  // The seed is the day the quiz was opened; one started just before midnight still counts.
  if (seed !== d && seed !== dayBefore(d, 1)) return { error: "Викторина ескірді. Бетті жаңартып, қайта баста." };
  const qs = buildQuiz(await quizWorks(), key, seed, u.grade);
  if (!qs.length || !Array.isArray(picks) || picks.length !== qs.length) return { error: "Жауаптар толық емес." };
  const score = qs.filter((q, i) => picks[i] === q.answer).length;
  const quiz = key === DAILY ? `${DAILY}:${seed}` : key;
  const [prev] = await sql<{ best: number }[]>`select best from quiz_results where student_id = ${u.id} and quiz = ${quiz}`;
  await sql`insert into quiz_results (student_id, quiz, best, total) values (${u.id}, ${quiz}, ${score}, ${qs.length})
    on conflict (student_id, quiz) do update set best = greatest(quiz_results.best, excluded.best), total = excluded.total, updated_at = now()`;
  // A point for each answer above the previous best: replaying the same quiz pays nothing more.
  const gained = Math.max(0, score - (prev?.best ?? 0));
  await addPoints(u.id, gained, `quiz:${quiz}`);
  revalidatePath("/oqushy", "layout");
  return { score, total: qs.length, gained, answers: qs.map((q) => q.answer) };
}
