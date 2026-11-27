// Deterministic stand-ins for the AI when AI_MOCK=true (no API key needed).
// They derive tasks from the material with simple rules, so the demo still reflects the input.
import type { CreativeFeedback, Feedback, Generation, Task, WordExplanation } from "./schemas";
import type { AiMode } from "./prompts/chat";

const DISTRACTORS = ["ғарыш", "компьютер", "мұхит", "пойыз", "телефон"];

function sentences(text: string) {
  return text
    .split(/\n+/)
    .flatMap((line) => line.split(/(?<=[.!?…])\s+/))
    .map((s) => s.replace(/\s+/g, " ").trim())
    .filter((s) => s.split(" ").length >= 4);
}

const longestWord = (s: string) => (s.match(/[А-Яа-яӘәҒғҚқҢңӨөҰұҮүҺһІі]+/g) ?? []).sort((a, b) => b.length - a.length)[0] ?? "";

export function mockGenerate(p: { methodSlug: string; material: string; count: number; level: string }): Generation {
  const ss = sentences(p.material);
  if (ss.length < 2)
    return { insufficient_material: true, note: "Материал тым қысқа: кемінде екі толық сөйлем керек.", tasks: [] };

  const tasks: Task[] = [];
  const s0 = ss[0];
  const w0 = longestWord(s0);
  if (w0)
    tasks.push({
      type: "fill_blank",
      prompt: `Бос орынды толтыр: «${s0.replace(w0, "____")}»`,
      options: [],
      answer_key: [w0],
      criteria: "Мәтіндегі сөз дәл жазылса — толық балл.",
      points: 2,
      source_ref: "1-сөйлем",
    });

  const word = longestWord(ss[1]);
  if (word)
    tasks.push({
      type: "single_choice",
      prompt: "Төмендегі сөздердің қайсысы материалда кездеседі?",
      options: [DISTRACTORS[0], word, DISTRACTORS[1], DISTRACTORS[2]],
      answer_key: 1,
      criteria: "Дұрыс нұсқа таңдалса — 1 балл.",
      points: 1,
      source_ref: "2-сөйлем",
    });

  const seq = ss.slice(0, Math.min(4, ss.length));
  if (seq.length >= 3) {
    const shuffled = [...seq].reverse();
    tasks.push({
      type: "ordering",
      prompt: "Сөйлемдерді мәтіндегі ретімен орналастыр.",
      options: shuffled,
      answer_key: seq.map((s) => shuffled.indexOf(s)),
      criteria: "Рет толық дұрыс болса — толық балл.",
      points: 3,
      source_ref: `1–${seq.length}-сөйлемдер`,
    });
  }

  const open: Record<string, [string, string][]> = {
    bloom: [
      ["Түсіну: материалдың негізгі ойын өз сөзіңмен 2–3 сөйлеммен түсіндір.", "Негізгі ой дұрыс анықталды (2), өз сөзімен жазылды (1), мәтінге сілтеме бар (1)."],
      ["Талдау: автор осы ойды қалай жеткізеді? Мәтіннен бір мысал келтір.", "Тәсіл аталды (2), мәтіннен мысал келтірілді (2)."],
      ["Бағалау: мәтіндегі ойға келісесің бе? Неге? Пікіріңді дәлелде.", "Пікір анық (1), кемінде бір дәлел бар (2), мәтінге сүйенген (1)."],
    ],
    sinkvein: [["Негізгі кейіпкерге не ұғымға синквейн құрастыр: зат есім, 2 сын есім, 3 етістік, 4 сөзді сөйлем, 1 синоним.", "Бес жолдың құрылымы сақталған (3), мазмұны мәтінге сай (2)."]],
    venn: [["Мәтіндегі екі кейіпкерді (немесе екі бейнені) Венн диаграммасымен салыстыр: ұқсастығы мен айырмашылығын жаз.", "Кемінде 2 ұқсастық (2), әр жағынан 2 айырмашылық (2), мәтінге сүйенген (1)."]],
    test: [],
  };
  for (const [prompt, criteria] of open[p.methodSlug] ?? open.bloom)
    tasks.push({ type: "open", prompt, options: [], answer_key: null, criteria, points: 4, source_ref: "бүкіл мәтін" });

  return {
    insufficient_material: false,
    note: "Демо режим: тапсырмалар ЖИ-сіз, ережемен жасалды (AI_MOCK=true).",
    tasks: tasks.slice(0, Math.max(1, p.count)),
  };
}

export function mockFeedback(p: { answer: string; points: number }): Feedback {
  const len = p.answer.trim().length;
  if (len < 10) return { suggested_score: 0, feedback: "Жауап тым қысқа. Ойыңды толығырақ жазып, мәтіннен мысал келтір." };
  const score = Math.min(p.points, Math.max(1, Math.round((p.points * len) / 250)));
  return {
    suggested_score: score,
    feedback:
      score >= p.points
        ? "Жауап толық әрі ойың анық. Мәтіннен тағы бір дәйек қоссаң, тіпті жақсы болады."
        : "Жақсы бастама! Ойыңды мәтіннен нақты мысалмен дәлелдеп, қорытынды сөйлем қос.",
  };
}

export function mockChat(mode: Exclude<AiMode, "off">, question: string, title?: string): string {
  const q = question.toLowerCase();
  const about = title ? `«${title}» шығармасында` : "мәтінде";
  if (q.includes("мағына") || q.includes("сөз"))
    return mode === "limited"
      ? `Жақсы сұрақ! Алдымен сол сөз тұрған сөйлемді қайта оқып көрші. ${about} оның алдында және артында не айтылған? Сөздің түбірін тапсаң, мағынасын болжауға болады.`
      : `Сөздің мағынасын табу үшін оның түбіріне және сөйлемдегі орнына қара. ${about} сөз қай контексте тұрғанын айтшы — бірге талдайық. Түсіндірме сөздікпен де тексеріп көр.`;
  if (q.includes("кейіпкер"))
    return `Кейіпкерді түсіну үшін үш нәрсеге қара: ол не істейді, не айтады, басқалар ол туралы не дейді. ${about} кейіпкердің бір әрекетін тауып, «ол неге олай істеді?» деп сұрап көр. Сенің ойың қандай?`;
  if (q.includes("бастаймын") || q.includes("тапсырма"))
    return `Тапсырманың шартын қайта оқып, ондағы негізгі етістікті (сипатта, салыстыр, дәлелде) тап. Сосын мәтіннен соған қатысты бір үзінді белгіле. Қай қадамнан бастағың келеді?`;
  return `Қызық сұрақ! ${about} осыған қатысты қандай жерді байқадың? Алдымен өз болжамыңды айтшы, сосын бірге тексереміз. (Демо режим: бұл ЖИ-сіз дайын жауап.)`;
}

/** Demo mode has no dictionary behind it, so it says so instead of inventing a meaning. */
export function mockWord(word: string): WordExplanation {
  return { known: true, meaning: `Демо режим: «${word}» сөзінің шын түсіндірмесін ЖИ кілті қосылғанда көресің.`, example: "" };
}

export function mockPersona(name: string): string {
  return `Сәлем! Мен — ${name}. (Демо режим: бұл ЖИ-сіз дайын жауап. ЖИ кілті қосылғанда мен шығарманың мазмұнына сүйеніп, сұрағыңа өз атымнан жауап беремін.) Ал сен шығармадағы қай оқиғаны есте сақтадың?`;
}

export function mockCreative(text: string): CreativeFeedback {
  const n = text.split(/\s+/).filter(Boolean).length;
  return {
    scores: n < 40 ? [1, 1, 1] : [2, 1, 2],
    comment: `Демо режим: бұл ЖИ-сіз ережемен берілген пікір. Жұмысың ${n} сөзден тұрады${n < 40 ? ", ойыңды кеңейтуге болады" : ", ойың толық жазылған"}.`,
    tip: "Кейіпкердің бір сөзін не ісін мысалға алып, ойыңды дәлелде.",
  };
}
