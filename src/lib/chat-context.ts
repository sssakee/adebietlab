import "server-only";
import { sql } from "./db";
import type { User } from "./auth";
import type { AiMode } from "./ai/prompts/chat";
import { getWork, TOOL_LABEL } from "./queries";

export type ChatContext = { mode: AiMode; assignmentId?: string; title?: string; text?: string; tool?: string; task?: string };

/** Works out what the student is looking at from the page path, and the AI mode the teacher set for it. */
export async function resolveContext(user: User, path: string): Promise<ChatContext> {
  const task = path.match(/^\/oqushy\/tapsyrmalar\/([0-9a-f-]{36})/);
  if (task && user.class_id) {
    const [a] = await sql<{ id: string; ai_mode: AiMode; set_title: string | null; slug: string | null }[]>`
      select a.id, a.ai_mode, ts.title as set_title, w.slug
      from assignments a left join task_sets ts on ts.id = a.set_id
      left join works w on w.id = coalesce(a.work_id, ts.work_id)
      where a.id = ${task[1]} and a.class_id = ${user.class_id}`;
    if (a) {
      const w = a.slug ? await getWork(a.slug) : null;
      return { mode: a.ai_mode, assignmentId: a.id, task: a.set_title ?? undefined, title: w?.title, text: w?.text ?? undefined };
    }
  }

  const lab = path.match(/^\/oqushy\/zertkhana\/(olen|karta|zheli)\/([a-z0-9-]+)/);
  const lib = path.match(/^\/oqushy\/shygarmalar\/([a-z0-9-]+)/);
  const slug = lab?.[2] ?? lib?.[1];
  if (slug) {
    const w = await getWork(slug);
    if (!w) return { mode: "full" };
    const ctx: ChatContext = { mode: "full", title: w.title, text: w.text ?? undefined };
    if (lab) {
      ctx.tool = lab[1] === "olen" ? TOOL_LABEL.olen : lab[1] === "zheli" ? TOOL_LABEL.zheli : `${TOOL_LABEL.char_map} және ${TOOL_LABEL.egerde}`;
      const [a] = user.class_id
        ? await sql<{ id: string; ai_mode: AiMode }[]>`select id, ai_mode from assignments
            where class_id = ${user.class_id} and kind = 'lab' and work_id = ${w.id} order by created_at desc limit 1`
        : [];
      if (a) Object.assign(ctx, { mode: a.ai_mode, assignmentId: a.id });
    }
    return ctx;
  }
  return { mode: "full" };
}
