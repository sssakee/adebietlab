import { describe, expect, it } from "vitest";
import { WORKS } from "../../scripts/seed-data";
import { CHARACTERS } from "./characters";
import { buildQuiz, DAILY, FOLK, questionsFor, rng, type QuizWork } from "./quiz";

const all = WORKS.map((w) => ({ lab: {}, ...w })) as QuizWork[];

describe("quick quiz", () => {
  it("is the same for the same seed, so the server can check it", () => {
    expect(buildQuiz(all, DAILY, "2026-11-27", 7)).toEqual(buildQuiz(all, DAILY, "2026-11-27", 7));
    expect(buildQuiz(all, DAILY, "2026-11-27", 7)).not.toEqual(buildQuiz(all, DAILY, "2026-11-28", 7));
  });

  it("gives five questions from works of the student's grade", () => {
    const qs = buildQuiz(all, DAILY, "2026-11-27", 5);
    expect(qs).toHaveLength(5);
    for (const q of qs) expect(all.find((w) => w.slug === q.slug)!.grades).toContain(5);
  });

  it("has exactly one right answer that matches the library", () => {
    for (const w of all)
      for (let s = 0; s < 5; s++)
        for (const q of questionsFor(w, all, rng(`${w.slug}${s}`))) {
          expect(new Set(q.options).size).toBe(q.options.length);
          const right = q.options[q.answer];
          if (q.q.endsWith("авторы кім?")) expect(right).toBe(w.author);
          if (q.q.endsWith("кімнің шығармасы?")) expect(right).toBe(FOLK);
          if (q.q.endsWith("жанрға жатады?")) {
            expect(right).toBe(w.genre);
            // a толғау is a poem too: no overlapping genre among the wrong answers
            if (w.genre === "Толғау") expect(q.options).not.toContain("Өлең");
          }
          if (q.q.includes("кейіпкер")) {
            const own = CHARACTERS[w.slug].map((c) => c.name);
            expect(own).toContain(right);
            expect(q.options.filter((o) => own.includes(o))).toHaveLength(1);
          }
          if (q.q.includes("бәрінен бұрын")) {
            const order = (w.lab.timeline ?? []).map((e) => e.text);
            const first = Math.min(...q.options.map((o) => order.indexOf(o)));
            expect(order.indexOf(right)).toBe(first);
          }
        }
  });

  it("never asks which other work an author wrote with an ambiguous title", () => {
    for (const w of all) for (const q of questionsFor(w, all, rng(w.slug))) if (q.q.includes("тағы қай шығарма")) expect(q.options).not.toContain("«Өлеңдері»");
  });
});
