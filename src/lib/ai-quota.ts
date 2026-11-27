import "server-only";
import { sql } from "./db";
import type { Usage } from "./ai";

/** One daily budget for everything a student asks the AI: the chat and word explanations share it. */
export const STUDENT_LIMIT = Number(process.env.AI_DAILY_LIMIT_STUDENT ?? 30);

export async function aiUsedToday(userId: string) {
  const [r] = await sql`select requests from ai_usage where user_id = ${userId} and day = current_date`;
  return (r?.requests as number) ?? 0;
}

export async function logAiRequest(userId: string, u: Usage = { input_tokens: 0, output_tokens: 0 }) {
  await sql`insert into ai_usage (user_id, requests, input_tokens, output_tokens) values (${userId}, 1, ${u.input_tokens}, ${u.output_tokens})
    on conflict (user_id, day) do update set requests = ai_usage.requests + 1,
      input_tokens = ai_usage.input_tokens + excluded.input_tokens, output_tokens = ai_usage.output_tokens + excluded.output_tokens`;
}
