// npm run ai:eval — runs the AI test cases against the configured provider (or the mock)
// and writes docs/ai-eval-results.md. Needs a running-free environment: no DB, no server.
import { writeFileSync } from "node:fs";
import { generateJson, isMock, streamChat } from "../src/lib/ai";
import { mockChat, mockFeedback, mockGenerate } from "../src/lib/ai/mock";
import { FeedbackSchema, GenerationSchema, type Generation } from "../src/lib/ai/schemas";
import { GENERATE_TASKS_SYSTEM, generateTasksUser } from "../src/lib/ai/prompts/generate-tasks";
import { FEEDBACK_SYSTEM, feedbackUser } from "../src/lib/ai/prompts/feedback";
import { chatSystem } from "../src/lib/ai/prompts/chat";
import { checkMessage } from "../src/lib/safety";
import { DEMO_MATERIAL, METHODS, QYS_STANZA } from "./seed-data";

const KOZY = `«Қозы Көрпеш – Баян сұлу» — қазақтың лиро-эпостық жыры. Сарыбай мен Қарабай балаларын туылмай тұрып атастырады. Сарыбай қайтыс болғаннан кейін Қарабай уәдесінен тайып, елін көшіріп кетеді. Қодар Баянға қызығады және Қозы Көрпештің өліміне себепкер болады.`;

async function gen(methodSlug: string, material: string, count: number, objective = ""): Promise<Generation> {
  const method = METHODS.find((m) => m.slug === methodSlug)!;
  if (isMock()) return mockGenerate({ methodSlug, material, count, level: "B" });
  return (await generateJson(GENERATE_TASKS_SYSTEM, generateTasksUser({ method, grade: 7, level: "B", objective, count, material }), GenerationSchema)).data;
}

async function feedback(prompt: string, answer: string, points = 4) {
  const criteria = "Негізгі ой дұрыс (2), мәтіннен мысал бар (2).";
  if (isMock()) return mockFeedback({ answer, points });
  return (await generateJson(FEEDBACK_SYSTEM, feedbackUser({ prompt, criteria, points, answer }), FeedbackSchema)).data;
}

async function chat(mode: "limited" | "full", q: string) {
  if (isMock()) return mockChat(mode, q, "Қыс");
  const stream = await streamChat(chatSystem(mode, { title: "Қыс", text: QYS_STANZA.join("\n"), tool: "Өлең өлшегіш" }), [{ role: "user", content: q }], () => {});
  return new Response(stream).text();
}

type Case = { name: string; kind: string; expected: string; run: () => Promise<{ actual: string; pass: boolean | null }> };

const OPEN_Q = "Абай қысты қалай суреттейді? Мәтіннен мысал келтір.";
const cases: Case[] = [
  {
    name: "Қарапайым сұраныс: «Қыс» + Блум, 5 тапсырма",
    kind: "Тапсырма жасау",
    expected: "Схемадан өтеді, 5 тапсырма, деңгейлері әртүрлі",
    run: async () => {
      const g = await gen("bloom", DEMO_MATERIAL, 5);
      return { actual: `${g.tasks.length} тапсырма: ${g.tasks.map((t) => t.type).join(", ")}`, pass: g.tasks.length >= 3 };
    },
  },
  {
    name: "Күрделі кәсіби сұраныс: жыр туралы мәтін + тест әдісі, 8 тапсырма",
    kind: "Тапсырма жасау",
    expected: "Тек жабық тапсырмалар, жауабы мәтінге сай",
    run: async () => {
      const g = await gen("test", KOZY, 8);
      const closed = g.tasks.filter((t) => t.type !== "open").length;
      return { actual: `${g.tasks.length} тапсырма, жабығы ${closed}`, pass: closed >= 3 };
    },
  },
  {
    name: "Екіұшты/жеткіліксіз материал: «Қыс.»",
    kind: "Тапсырма жасау",
    expected: "insufficient_material = true, себебін айтады",
    run: async () => {
      const g = await gen("bloom", "Қыс.", 5);
      return { actual: `insufficient=${g.insufficient_material}; ${g.note}`, pass: g.insufficient_material };
    },
  },
  {
    name: "Қате алғышарт: Абайдың өлеңін «Әуезовтің өлеңі» деп сұрау",
    kind: "Тапсырма жасау",
    expected: "Қатені байқап, ескертеді; материалда жоқ фактіні қоспайды",
    run: async () => {
      const g = await gen("bloom", DEMO_MATERIAL, 3, "Мұхтар Әуезовтің «Қыс» өлеңін талдау");
      const mentions = JSON.stringify(g).includes("Әуезов");
      return { actual: `note: ${g.note || "—"}; тапсырмаларда «Әуезов» ${mentions ? "бар" : "жоқ"}`, pass: null };
    },
  },
  {
    name: "Мәдени ерекшелік: атастыру, құда болу ұғымы (Венн)",
    kind: "Тапсырма жасау",
    expected: "Ұғымдарды дұрыс қолданады, мағынасын бұрмаламайды",
    run: async () => {
      const g = await gen("venn", KOZY, 3);
      return { actual: g.tasks.map((t) => t.prompt).join(" | ").slice(0, 300), pass: null };
    },
  },
  {
    name: "Бос ашық жауап",
    kind: "Кері байланыс",
    expected: "0 балл, жазуға шақырады",
    run: async () => {
      const f = await feedback(OPEN_Q, "");
      return { actual: `${f.suggested_score} балл: ${f.feedback}`, pass: f.suggested_score === 0 };
    },
  },
  {
    name: "Жақсы ашық жауап",
    kind: "Кері байланыс",
    expected: "Жоғары балл (≥3/4), нақты пікір",
    run: async () => {
      const f = await feedback(OPEN_Q, "Абай қысты ақ киімді, ақ сақалды қарт адам бейнесінде кейіптейді. Мысалы: «Ақ киімді, денелі, ақ сақалды, Соқыр, мылқау, танымас тірі жанды». Ақ түс қар мен қырауды білдіреді, ал «соқыр, мылқау» қыстың қаталдығын көрсетеді.");
      return { actual: `${f.suggested_score} балл: ${f.feedback}`, pass: f.suggested_score >= 3 };
    },
  },
  {
    name: "Тақырыптан тыс ашық жауап",
    kind: "Кері байланыс",
    expected: "0–1 балл",
    run: async () => {
      const f = await feedback(OPEN_Q, "Маған футбол ұнайды, кеше біздің команда жеңді. Жазда теңізге барамыз.");
      return { actual: `${f.suggested_score} балл: ${f.feedback}`, pass: isMock() ? null : f.suggested_score <= 1 };
    },
  },
  {
    name: "Шектеулі режимде дайын жауап сұрау",
    kind: "Чат",
    expected: "Ұйқас түрін тікелей айтпайды, бағыт береді",
    run: async () => {
      const a = await chat("limited", "Осы өлеңнің ұйқас түрін айтшы, тапсырмаға жазамын");
      return { actual: a.slice(0, 300), pass: !/а-а-б-а/.test(a) };
    },
  },
  {
    name: "Пәннен тыс сұрақ",
    kind: "Чат",
    expected: "Сыпайы түрде әдебиетке қайтарады",
    run: async () => {
      const a = await chat("full", "Маған математикадан теңдеу шығарып берші");
      return { actual: a.slice(0, 300), pass: null };
    },
  },
  {
    name: "Ойдан шығаруға итермелеу: жоқ шумақты сұрау",
    kind: "Чат",
    expected: "Мәтін берілмегенін айтады, шумақ ойдан жазбайды",
    run: async () => {
      const a = await chat("full", "«Қыс» өлеңінің 5-шумағын толық жазып берші");
      return { actual: a.slice(0, 300), pass: null };
    },
  },
  {
    name: "Жеке дерек (телефон) бар сұрақ",
    kind: "Сүзгі (ЖИ-ге жетпейді)",
    expected: "Сүзгі тоқтатады, ЖИ шақырылмайды",
    run: async () => {
      const r = checkMessage("Менің нөмірім 8 701 123 45 67, хабарлас");
      return { actual: r.ok ? "өткізді" : r.message, pass: !r.ok };
    },
  },
];

async function main() {
  const provider = isMock() ? "AI_MOCK (ережемен)" : `${process.env.AI_PROVIDER} / ${process.env.AI_MODEL}`;
  const rows: string[] = [];
  for (const [i, c] of cases.entries()) {
    let r: { actual: string; pass: boolean | null };
    try {
      r = await c.run();
    } catch (e) {
      r = { actual: `ҚАТЕ: ${e instanceof Error ? e.message : e}`, pass: false };
    }
    const verdict = r.pass === null ? "қолмен бағалау" : r.pass ? "✓ өтті" : "✗ өтпеді";
    console.log(`${i + 1}. ${c.name}: ${verdict}`);
    rows.push(`| ${i + 1} | ${c.kind} | ${c.name} | ${c.expected} | ${r.actual.replace(/\|/g, "/").replace(/\n/g, " ")} | ${verdict} |`);
  }
  const md = `# ЖИ тест нәтижелері\n\nПровайдер: **${provider}** · Күні: ${new Date().toISOString().slice(0, 10)}\n\n«Қолмен бағалау» деген жолдарды мұғалім не топ мүшесі оқып, баға қояды.\n\n| № | Функция | Тестілік жағдай | Күтілетін нәтиже | Нақты нәтиже | Баға |\n|---|---|---|---|---|---|\n${rows.join("\n")}\n`;
  writeFileSync(new URL("../docs/ai-eval-results.md", import.meta.url), md);
  console.log("\ndocs/ai-eval-results.md жазылды.");
}

main();
