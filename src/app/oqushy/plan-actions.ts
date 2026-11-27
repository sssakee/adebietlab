"use server";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { sql } from "@/lib/db";
import { AiError, generateJson, isMock } from "@/lib/ai";
import { PlanSchema } from "@/lib/ai/schemas";
import { PLAN_SYSTEM, planUser } from "@/lib/ai/prompts/plan";
import { aiUsedToday, logAiRequest, STUDENT_LIMIT } from "@/lib/ai-quota";
import { planInput, rulePlan, stepHref, type Plan } from "@/lib/reading-plan";

/** Builds the reading plan at most once a day; the AI explains the choice, the rules make it when the AI cannot. */
export async function makePlan() {
  const user = await requireRole("student");
  const [fresh] = await sql`select 1 from reading_plans where student_id = ${user.id} and created_at::date = current_date`;
  if (fresh) return;

  const { skills, weak, candidates } = await planInput(user.id, user.grade);
  let plan: Plan = rulePlan(weak, candidates);
  if (candidates.length && !isMock() && (await aiUsedToday(user.id)) < STUDENT_LIMIT) {
    try {
      const r = await generateJson(PLAN_SYSTEM, planUser({ grade: user.grade, skills, candidates }), PlanSchema);
      await logAiRequest(user.id, r.usage);
      // The AI may only choose among the candidates; anything else is dropped.
      const picks = r.data.picks.flatMap((p) => {
        const c = candidates.find((x) => x.slug === p.slug);
        return c ? [{ slug: c.slug, title: c.title, why: p.why, step: p.step, href: stepHref(c.slug, c.tool), label: rulePlan([], [c]).picks[0].label }] : [];
      });
      if (picks.length) plan = { picks, note: r.data.note, weak, ai: true };
    } catch (e) {
      console.error(e instanceof AiError ? e.message : e);
    }
  }
  await sql`insert into reading_plans (student_id, plan) values (${user.id}, ${sql.json(plan as never)})
    on conflict (student_id) do update set plan = excluded.plan, created_at = now()`;
  revalidatePath("/oqushy");
}
