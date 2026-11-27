// npm run ai:works — asks the model for a task set from each library entry that has a source link
// (author, title, our summary: what the teacher's "pick a work" option sends) and writes
// docs/works-eval-results.md. Checks that every work gives usable tasks grounded in the material.
import { writeFileSync } from "node:fs";
import { generateJson, isMock } from "../src/lib/ai";
import { mockGenerate } from "../src/lib/ai/mock";
import { GenerationSchema } from "../src/lib/ai/schemas";
import {
  GENERATE_TASKS_SYSTEM,
  generateTasksUser,
} from "../src/lib/ai/prompts/generate-tasks";
import { METHODS, WORKS } from "./seed-data";

const cell = (s: string) =>
  s.replace(/\|/g, "\\|").replace(/\s+/g, " ").slice(0, 160);
const works = WORKS.filter((w) => w.read_url && w.summary);

// A promise that never settles lets Node exit with code 0; make that a visible failure.
let written = false;
process.on("exit", () => {
  if (!written) {
    console.error("Нәтиже жазылмады: тест аяқталмай тоқтады.");
    process.exitCode = 1;
  }
});

async function main() {
  const rows: string[] = [];
  let ok = 0;
  for (const [i, w] of works.entries()) {
    const method = METHODS[i % METHODS.length];
    const material = [`${w.author}, «${w.title}».`, w.summary, w.text ?? ""]
      .filter(Boolean)
      .join("\n\n");
    const grade = w.grades[0] ?? 7;
    let actual: string;
    let pass = false;
    try {
      const g = isMock()
        ? mockGenerate({
            methodSlug: method.slug,
            material,
            count: 5,
            level: "B",
          })
        : (
            await generateJson(
              GENERATE_TASKS_SYSTEM,
              generateTasksUser({
                method,
                grade,
                level: "B",
                objective: "",
                count: 5,
                material,
              }),
              GenerationSchema,
            )
          ).data;
      const grounded = g.tasks.filter((t) => t.source_ref.trim()).length;
      pass = g.tasks.length >= 3 && !g.insufficient_material;
      actual = `${g.tasks.length} тапсырма (${[...new Set(g.tasks.map((t) => t.type))].join(", ")}), дереккөз сілтемесі бары ${grounded}. 1-тапсырма: ${g.tasks[0]?.prompt ?? "—"}${g.insufficient_material ? ` · Материал жеткіліксіз: ${g.note}` : ""}`;
    } catch (e) {
      actual = `Қате: ${e instanceof Error ? e.message : String(e)}`;
    }
    if (pass) ok++;
    rows.push(
      `| ${i + 1} | «${w.title}» — ${w.author} | ${method.name} | ${cell(actual)} | ${pass ? "✓" : "✗"} |`,
    );
    console.log(rows.at(-1));
    if (!isMock()) await new Promise((r) => setTimeout(r, 4500)); // free tier: 15 requests a minute
  }

  const provider = isMock()
    ? "AI_MOCK (ережемен)"
    : `${process.env.AI_PROVIDER?.trim()} / ${process.env.AI_MODEL?.trim()}`;
  writeFileSync(
    new URL("../docs/works-eval-results.md", import.meta.url),
    `# Кітапхана шығармалары бойынша тапсырма жасау

Провайдер: **${provider}** · Күні: ${new Date().toISOString().slice(0, 10)} · Өтті: **${ok} / ${works.length}**

Мұғалім «кітапханадан шығарма таңдаңыз» дегенде ЖИ-ге автор, атау және шығарманың қысқаша сипаттамасы барады (толық мәтін сайтқа көшірілмейді, сілтеме ғана беріледі). Өту шарты: кемінде 3 тапсырма, «материал жеткіліксіз» деген жауап жоқ.

| № | Шығарма | Әдіс | Нәтиже | Баға |
|---|---|---|---|---|
${rows.join("\n")}
`,
  );
  written = true;
  console.log(`docs/works-eval-results.md: ${ok} / ${works.length}`);
}

main();
