import "server-only";
import { sql } from "./db";
import { groupSkills, scored } from "./skills";
import { CHARACTERS } from "./characters";
import { TOOL_LABEL, toolHref, type WorkLab } from "./queries";

export type PlanPick = { slug: string; title: string; why: string; step: string; href: string; label: string };
export type Plan = { picks: PlanPick[]; note: string; weak: string[]; ai: boolean };
export type Candidate = { slug: string; title: string; author: string; genre: string; summary: string | null; tools: string[]; tool: string };

// Which page trains which skill group (labels from SKILL in skills.ts).
const TRAINS: Record<string, string> = {
  "Өлең құрылысы": "olen",
  "Оқиға реті мен құрылым": "zheli",
  "Байланыс табу": "char_map",
  "Шығармашылық ой": "soni",
  "Өз ойын жазу": "soni",
  "Мазмұнды білу": "quiz",
};
const LABEL: Record<string, string> = { ...TOOL_LABEL, soni: "Шығармашылық зертхана", quiz: "Викторина" };

export function stepHref(slug: string, tool: string) {
  if (tool === "quiz") return `/oqushy/baige/${slug}`;
  if (tool === "soni") return `/oqushy/shygarmashylyq/${slug}`;
  return toolHref(slug, tool);
}

const toolsOf = (slug: string, lab: WorkLab) => [
  ...(["olen", "char_map", "egerde", "zheli"] as const).filter((t) => ({ olen: lab.poem, char_map: lab.characters, egerde: lab.egerde, zheli: lab.timeline })[t]),
  ...(CHARACTERS[slug] ? ["soni"] : []),
  "quiz",
];

/** The student's skills (weakest first) and up to six works they have not opened yet, best fit first. */
export async function planInput(studentId: string, grade: number | null) {
  const [skillRows, works] = await Promise.all([
    sql<{ skill: string; pct: number; n: number }[]>`
      select skill, round(100.0 * sum(got) / nullif(sum(max), 0))::int as pct, count(*)::int as n
      from (${scored(sql`select ${studentId}::uuid`)}) x group by skill having sum(max) > 0`,
    sql<{ slug: string; title: string; author: string; genre: string; summary: string | null; grades: number[]; lab: WorkLab }[]>`
      select slug, title, author, genre, summary, grades, lab from works w
      where not exists (select 1 from lab_works l where l.work_id = w.id and l.student_id = ${studentId})
        and not exists (select 1 from quiz_results q where q.quiz = w.slug and q.student_id = ${studentId})
      order by slug`,
  ]);
  const skills = groupSkills(skillRows);
  const weak = skills.filter((s) => s.pct < 70).map((s) => s.label);
  const wanted = weak.map((w) => TRAINS[w]).filter(Boolean);
  const near = (g: number[]) => (grade === null || !g.length ? 1 : g.includes(grade) ? 3 : g.some((x) => Math.abs(x - grade) === 1) ? 1 : 0);
  const candidates: Candidate[] = works
    .map((w) => {
      const tools = toolsOf(w.slug, w.lab);
      const tool = wanted.find((t) => tools.includes(t)) ?? tools[0];
      const fit = near(w.grades) * 10 + (wanted.length ? wanted.length - Math.max(0, wanted.indexOf(tool)) : 0);
      return { fit, c: { slug: w.slug, title: w.title, author: w.author, genre: w.genre, summary: w.summary, tools: tools.map((t) => LABEL[t]), tool } };
    })
    .filter((x) => x.fit >= 10)
    .sort((a, b) => b.fit - a.fit || a.c.slug.localeCompare(b.c.slug))
    .slice(0, 6)
    .map((x) => x.c);
  return { skills, weak, candidates };
}

/** The same choice without the AI: the best-fitting works and the tool that trains the weakest skill. */
export function rulePlan(weak: string[], candidates: Candidate[]): Plan {
  return {
    ai: false,
    weak,
    note: weak.length ? `Ең көп жаттығатын тұсың: ${weak[0].toLocaleLowerCase("kk")}.` : "Жаңа шығармалардан баста: әрқайсысында бірнеше құрал бар.",
    picks: candidates.slice(0, 3).map((c) => ({
      slug: c.slug,
      title: c.title,
      why: `${c.author}, ${c.genre.toLocaleLowerCase("kk")}. Сыныбыңа сай, әлі ашпаған шығармаң.`,
      step: `«${LABEL[c.tool]}» құралынан баста.`,
      href: stepHref(c.slug, c.tool),
      label: LABEL[c.tool],
    })),
  };
}
