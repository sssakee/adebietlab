// Rule-based checks: closed task types, character map vs reference, gamification levels.
import type { Task } from "./ai/schemas";

export type Answer = number | number[] | string | Record<string, string> | null | undefined;

const norm = (s: string) => s.toLowerCase().replace(/[«»"'.,!?;:]/g, "").replace(/\s+/g, " ").trim();

/** Points for a closed task; null for open tasks (scored by the teacher, AI only suggests). */
export function scoreTask(task: Pick<Task, "type" | "answer_key" | "points">, answer: Answer): number | null {
  const key = task.answer_key;
  switch (task.type) {
    case "open":
      return null;
    case "single_choice":
      return answer === key ? task.points : 0;
    case "multiple_choice": {
      if (!Array.isArray(answer) || !Array.isArray(key)) return 0;
      const a = [...answer].sort().join(",");
      const k = [...(key as number[])].sort().join(",");
      return a === k ? task.points : 0;
    }
    case "ordering": {
      if (!Array.isArray(answer) || !Array.isArray(key)) return 0;
      return answer.length === key.length && answer.every((v, i) => v === (key as number[])[i]) ? task.points : 0;
    }
    case "matching": {
      if (!answer || typeof answer !== "object" || Array.isArray(answer) || typeof key !== "object") return 0;
      const pairs = Object.entries(key as Record<string, string>);
      const right = pairs.filter(([l, r]) => (answer as Record<string, string>)[l] === r).length;
      return Math.floor((task.points * right) / pairs.length);
    }
    case "fill_blank": {
      if (typeof answer !== "string") return 0;
      const accepted = Array.isArray(key) ? (key as string[]) : [String(key)];
      return accepted.some((k) => norm(k) === norm(answer)) ? task.points : 0;
    }
  }
}

export type Edge = { from: string; to: string; label?: string; evidence?: string };

const pairKey = (e: Edge) => [e.from, e.to].sort().join("|");

/** Which reference links the student found (direction-insensitive). */
export function compareMap(reference: Edge[], student: Edge[]) {
  const found = new Set(student.map(pairKey));
  const matched = reference.filter((e) => found.has(pairKey(e)));
  const missing = reference.filter((e) => !found.has(pairKey(e)));
  const refKeys = new Set(reference.map(pairKey));
  const extra = student.filter((e) => !refKeys.has(pairKey(e)));
  return { found: matched.length, total: reference.length, matched, missing, extra };
}

export const PLOT_ELEMENTS = ["экспозиция", "байланыс", "шиеленіс", "шарықтау шегі", "шешім"] as const;
export type TimelineEvent = { id: string; text: string; element: string };

/** Student order (event ids) and element choices vs the reference order. */
export function compareTimeline(reference: TimelineEvent[], order: string[], elements: Record<string, string>) {
  const orderMarks = reference.map((e, i) => order[i] === e.id); // per position
  const orderOk = orderMarks.filter(Boolean).length;
  const elementsOk = reference.filter((e) => elements[e.id] === e.element).length;
  const wrong = reference.filter((e) => elements[e.id] && elements[e.id] !== e.element).map((e) => ({ id: e.id, chose: elements[e.id], right: e.element }));
  return { orderOk, elementsOk, total: reference.length, orderMarks, wrong };
}

export const LEVELS = [
  { name: "Балапан", min: 0 },
  { name: "Қанаттанған", min: 60 },
  { name: "Қыран", min: 150 },
] as const;

export function levelFor(points: number) {
  let i = 0;
  while (i + 1 < LEVELS.length && points >= LEVELS[i + 1].min) i++;
  const next = LEVELS[i + 1];
  return {
    index: i,
    name: LEVELS[i].name,
    next: next?.name ?? null,
    toNext: next ? next.min - points : 0,
    progress: next ? (points - LEVELS[i].min) / (next.min - LEVELS[i].min) : 1,
  };
}

/** Points ("ашылым") awarded per activity. */
export const POINTS = { olen: 5, charMap: 8, egerde: 10, zheli: 8, assignment: 10 } as const;
