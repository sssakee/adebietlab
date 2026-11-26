// Every quote here was checked against a published text (source in the comment).
// Do not add or edit a line from memory: find the text first.
import type { HeadQuote } from "@/components/PageHead";

export const QUOTES = {
  // sites.google.com/site/abai1845/-le-der/-le-s-zdi-patsasy-s-z-sarasy
  olen: { lines: ["Өлең — сөздің патшасы, сөз сарасы,", "Қиыннан қиыстырар ер данасы."], by: "Абай, «Өлең — сөздің патшасы, сөз сарасы»" },
  // books.yandex.ru/books/jnt2viaE (Ы. Алтынсарин, «Кел, балалар, оқылық»)
  oqu: { lines: ["Оқығанды көңілге", "Ықыласпен тоқылық!"], by: "Ыбырай Алтынсарин, «Кел, балалар, оқылық»" },
  // sites.google.com/site/abai1845/-le-der/gylym-tappaj-maktanba
  adam: { lines: ["Бес нәрседен қашық бол,", "Бес нәрсеге асық бол,", "Адам болам десеңіз."], by: "Абай, «Ғылым таппай мақтанба»" },
  // sites.google.com/site/abai1845/-le-der/men-zazbajmyn-le-di-ermek-sin
  ulgi: { lines: ["Көкірегі сезімді, тілі орамды", "Жаздым үлгі жастарға бермек үшін."], by: "Абай, «Мен жазбаймын өлеңді ермек үшін»" },
} satisfies Record<string, HeadQuote>;
