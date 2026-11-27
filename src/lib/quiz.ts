// Quick quiz: questions built by rule from the library itself (author, genre, years, characters,
// order of events), so every answer is as correct as the library data. No AI.
import { CHARACTERS } from "./characters";

export type QuizWork = {
  slug: string;
  title: string;
  author: string;
  author_years: string | null;
  genre: string;
  grades: number[];
  lab: { timeline?: { id: string; text: string }[] };
};
export type Question = { q: string; options: string[]; answer: number; slug: string };

export const FOLK = "Халық ауыз әдебиеті";
export const DAILY = "kun";

/** Seeded PRNG: the same seed gives the same quiz, so the server can rebuild it to check answers. */
export function rng(seed: string) {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

const shuffle = <T,>(r: () => number, a: T[]) => {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
};

/** A question with the right answer among up to three distinct wrong ones, in random order. */
function ask(r: () => number, slug: string, q: string, right: string, pool: string[]): Question | null {
  const wrong = shuffle(r, [...new Set(pool)].filter((x) => x !== right)).slice(0, 3);
  if (wrong.length < 2) return null;
  const options = shuffle(r, [right, ...wrong]);
  return { q, options, answer: options.indexOf(right), slug };
}

// Genres that overlap (a толғау is also a poem) are never offered as each other's wrong answer.
const GENRE_GROUP: Record<string, string> = {
  Өлең: "poem", Толғау: "poem", Поэма: "poem",
  "Батырлар жыры": "epic", "Лиро-эпостық жыр": "epic",
  Әңгіме: "prose", Роман: "prose", "Роман-эпопея": "prose", Проза: "prose",
  Ертегі: "tale", Аңыз: "tale", Мысал: "tale",
};

/** Every question one work can give. */
export function questionsFor(w: QuizWork, all: QuizWork[], r: () => number): Question[] {
  const out: (Question | null)[] = [];
  const authors = all.map((x) => x.author);
  out.push(
    w.author === FOLK
      ? ask(r, w.slug, `«${w.title}» кімнің шығармасы?`, FOLK, authors)
      : ask(r, w.slug, `«${w.title}» шығармасының авторы кім?`, w.author, authors),
  );
  const group = GENRE_GROUP[w.genre];
  out.push(ask(r, w.slug, `«${w.title}» қай жанрға жатады?`, w.genre, all.map((x) => x.genre).filter((g) => !group || GENRE_GROUP[g] !== group)));
  if (w.author_years)
    out.push(ask(r, w.slug, `${w.author} қай жылдары өмір сүрген?`, w.author_years, all.filter((x) => x.author !== w.author && x.author_years).map((x) => x.author_years!)));
  // Titles shared by two authors («Өлеңдері») would make this ambiguous, so they are left out.
  const titles = new Map<string, number>();
  for (const x of all) titles.set(x.title, (titles.get(x.title) ?? 0) + 1);
  const unique = (x: QuizWork) => titles.get(x.title) === 1;
  const same = all.filter((x) => x.author === w.author && x.slug !== w.slug && w.author !== FOLK && unique(x));
  if (same.length)
    out.push(ask(r, w.slug, `${w.author} тағы қай шығарманы жазған?`, `«${same[Math.floor(r() * same.length)].title}»`, all.filter((x) => x.author !== w.author && x.author !== FOLK && unique(x)).map((x) => `«${x.title}»`)));
  const own = CHARACTERS[w.slug]?.map((c) => c.name) ?? [];
  if (own.length) {
    const others = Object.entries(CHARACTERS).filter(([s]) => s !== w.slug).flatMap(([, cs]) => cs.map((c) => c.name)).filter((n) => !own.includes(n));
    out.push(ask(r, w.slug, `Қай кейіпкер «${w.title}» шығармасында кездеседі?`, own[Math.floor(r() * own.length)], others));
  }
  const events = w.lab.timeline;
  if (events && events.length >= 3) {
    const picked = shuffle(r, events.map((e, i) => ({ text: e.text, i }))).slice(0, 3);
    const first = picked.reduce((a, b) => (a.i < b.i ? a : b));
    out.push(ask(r, w.slug, `«${w.title}»: осы оқиғалардың қайсысы бәрінен бұрын болды?`, first.text, picked.map((p) => p.text)));
  }
  return out.filter((q): q is Question => q !== null);
}

/**
 * Five questions. key = a work slug (questions about that work) or DAILY (one question from each of
 * five works of the student's grade). The seed includes the date, so the quiz changes every day.
 */
export function buildQuiz(all: QuizWork[], key: string, seed: string, grade: number | null): Question[] {
  const r = rng(`${key}|${seed}`);
  const sorted = [...all].sort((a, b) => a.slug.localeCompare(b.slug));
  if (key !== DAILY) {
    const w = sorted.find((x) => x.slug === key);
    return w ? shuffle(r, questionsFor(w, sorted, r)).slice(0, 5) : [];
  }
  const mine = sorted.filter((x) => grade === null || x.grades.includes(grade));
  const pool = mine.length >= 5 ? mine : sorted;
  return shuffle(r, pool)
    .slice(0, 5)
    .map((w) => {
      const qs = questionsFor(w, sorted, r);
      return qs[Math.floor(r() * qs.length)];
    })
    .filter(Boolean);
}
