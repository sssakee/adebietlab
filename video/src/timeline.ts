// The film as data: what each scene shows and when, in step with the voice. No React here, so the
// music script (scripts/music.ts) can read the same timing as the film (src/Promo.tsx).
import clipsJson from "./clips.json";
import voJson from "./vo.json";

export const FPS = 30;
export const T = 18; // a cut between scenes, in frames (scenes overlap by this much)
export const LEAD = 14; // the voice starts this many frames into a scene
export const TAIL = 10; // breath after the last word

export type Box = { x: number; y: number; w: number; h: number };
export type Vo = { dur: number; beats: (number | null)[]; say: string[] };
export type Mark = { label: string; pre: number; at: number; end: number };
export type Clip = { w: number; h: number; dur: number; marks: Mark[]; idle?: [number, number][]; cursor: { t: number; x: number; y: number; click?: boolean }[]; keys: { from: number; to: number; n: number }[]; boxes: Record<string, Box & { t: number }> };
export const VO = voJson as unknown as Record<string, Vo>;
export const CLIPS = clipsJson as unknown as Record<string, Clip>;

/** At voice beat `beat` (0 = the voice starts, n = the n-th {n} word) + `d` s, the clip's mark is clicked
 *  (or, with `at`, the moment `at` s into the clip). `speed`: play what follows the click at least this fast. */
export type Seg = { beat: number; d?: number; clip: string; mark: string; at?: number; speed?: number };
/** Something drawn on the screen: a gold ring around a box, with a label. Box in clip pixels. */
export type Note = { beat: number; d?: number; len?: number; clip: string; box: Box | string; text: string; };
export type Scene = {
  id: string; kind: "hook" | "intro" | "screen" | "trust" | "outro";
  no?: string; title?: string; who?: "Оқушыға" | "Мұғалімге"; icon?: string;
  segs?: Seg[]; notes?: Note[]; react?: { beat: number; d?: number; text: string }; extra?: number;
};

export const SCENES: Scene[] = [
  { id: "01", kind: "hook", extra: 26 },
  { id: "02", kind: "intro", extra: 6 },
  { id: "03", kind: "screen", no: "01", title: "Бір минутта бастау", icon: "key", segs: [
    { beat: 1, d: 1.0, clip: "classes", mark: "open" },
    { beat: 2, d: 0.4, clip: "login", mark: "type" },
    { beat: 3, clip: "login", mark: "enter" },
  ], notes: [{ beat: 1, d: 1.85, len: 0.85, clip: "classes", box: "new", text: "6 таңбалы сынып коды" }] },
  { id: "04", kind: "screen", no: "02", title: "Оқушының кабинеті", who: "Оқушыға", icon: "home", segs: [
    { beat: 1, clip: "home", mark: "stats" },
    { beat: 2, clip: "home", mark: "levels" },
    { beat: 3, clip: "home", mark: "plan" },
  ] },
  { id: "05", kind: "screen", no: "03", title: "Кітапхана мен сөздік", who: "Оқушыға", icon: "book", segs: [
    { beat: 0, d: 0.3, clip: "works", mark: "list" },
    { beat: 1, clip: "works", mark: "word" },
    { beat: 2, clip: "works", mark: "meaning" },
    { beat: 3, clip: "works", mark: "save" },
  ], react: { beat: 3, d: 0.6, text: "Түсінікті!" } },
  { id: "06", kind: "screen", no: "04", title: "Өлең өлшегіш", who: "Оқушыға", icon: "wave", segs: [
    { beat: 1, clip: "olen", mark: "syllables" },
    { beat: 2, clip: "olen", mark: "rhyme" },
    { beat: 3, d: -0.5, clip: "olen", mark: "check" },
  ], notes: [{ beat: 1, d: 1.0, len: 1.3, clip: "olen", box: "tags", text: "Әр жол — 11 буын" }], react: { beat: 3, d: 0.2, text: "Ойпырмай!" } },
  { id: "07", kind: "screen", no: "05", title: "Кейіпкер, болжам, сюжет", who: "Оқушыға", icon: "map", segs: [
    { beat: 1, clip: "karta", mark: "map" },
    { beat: 2, clip: "karta", mark: "egeri" },
    { beat: 3, clip: "karta", mark: "plot", speed: 1.7 },
  ], notes: [{ beat: 3, d: 2.6, len: 1.9, clip: "karta", box: { x: 1404, y: 4, w: 480, h: 330 }, text: "Бәрі дұрыс: 5 / 5" }],
  react: { beat: 3, d: 2.9, text: "Ура!" }, extra: 40 },
  { id: "08", kind: "screen", no: "06", title: "Абаймен сұхбат", who: "Оқушыға", icon: "chat", segs: [
    { beat: 1, clip: "suhbat", mark: "abai" },
    { beat: 2, clip: "suhbat", mark: "ask" },
    { beat: 3, clip: "suhbat", mark: "helper" },
  ], react: { beat: 1, d: 0.4, text: "Ғажап!" } },
  { id: "09", kind: "screen", no: "07", title: "Шығармашылық зертхана", who: "Оқушыға", icon: "pen", segs: [
    { beat: 1, d: 0.2, clip: "creative", mark: "write" },
    { beat: 2, clip: "creative", mark: "feedback" },
    { beat: 3, clip: "creative", mark: "voice" },
  ], notes: [{ beat: 2, d: 2.6, len: 2.0, clip: "creative", box: { x: 496, y: 482, w: 616, h: 368 }, text: "3 критерий бойынша пікір" }] },
  { id: "10", kind: "screen", no: "08", title: "Жаттау мен карточка", who: "Оқушыға", icon: "star", segs: [
    { beat: 0, d: 1.0, clip: "zhattau", mark: "levels" },
    { beat: 2, clip: "zhattau", mark: "card" },
    { beat: 3, clip: "zhattau", mark: "share" },
  ], react: { beat: 2, d: 1.2, text: "Әдемі!" } },
  { id: "11", kind: "screen", no: "09", title: "Әдеби карта мен тарих", who: "Оқушыға", icon: "globe", segs: [
    { beat: 1, d: 0.3, clip: "world", mark: "map" },
    { beat: 2, clip: "world", mark: "history" },
  ] },
  { id: "12", kind: "screen", no: "10", title: "Бәйге", who: "Оқушыға", icon: "trophy", segs: [
    { beat: 0, d: 0.9, clip: "baige", mark: "quiz" },
    { beat: 2, clip: "baige", mark: "streak" },
    { beat: 3, clip: "baige", mark: "rating" },
  ], react: { beat: 3, d: 0.9, text: "Кім бірінші?" }, extra: 6 },
  { id: "13", kind: "screen", no: "11", title: "Тапсырма — бір минутта", who: "Мұғалімге", icon: "wand", segs: [
    { beat: 1, clip: "teacher", mark: "material" },
    { beat: 2, clip: "teacher", mark: "generate" },
    { beat: 3, clip: "teacher", mark: "approve" },
    { beat: 4, clip: "teacher", mark: "assign" },
  ], react: { beat: 2, d: 0.9, text: "Дайын!" } },
  { id: "14", kind: "screen", no: "12", title: "Нәтиже мен аналитика", who: "Мұғалімге", icon: "chart", segs: [
    { beat: 1, clip: "results", mark: "table" },
    { beat: 2, clip: "results", mark: "grade" },
    { beat: 3, clip: "results", mark: "analytics" },
  ], notes: [{ beat: 1, d: 1.3, len: 1.3, clip: "results", box: "table", text: "Тест өзі тексерілді" }] },
  { id: "15", kind: "trust" },
  { id: "16", kind: "outro", extra: 64 },
];

export const frameAt = (id: string) => (beat: number, d = 0) => LEAD + Math.round(((beat === 0 ? 0 : VO[id]?.beats[beat - 1] ?? 0) + d) * FPS);
export const lengthOf = (s: Scene) => LEAD + Math.ceil((VO[s.id]?.dur ?? 3) * FPS) + TAIL + (s.extra ?? 0) + T;
export const LENGTHS = SCENES.map(lengthOf);
export const STARTS = LENGTHS.map((_, i) => LENGTHS.slice(0, i).reduce((a, c) => a + c, 0) - T * i);
export const TOTAL = LENGTHS.reduce((a, c) => a + c, 0) - T * (SCENES.length - 1);
export const startOf = (id: string) => STARTS[SCENES.findIndex((s) => s.id === id)];

/** Where the music changes, in seconds: the drop on «зерттейміз!», the calm under the trust scene. */
export const cues = () => ({
  total: TOTAL / FPS,
  drop: (startOf("01") + frameAt("01")(2)) / FPS,
  calmFrom: startOf("15") / FPS,
  calmTo: (startOf("16") + 8) / FPS,
});
