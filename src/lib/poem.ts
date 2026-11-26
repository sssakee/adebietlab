// Rule-based Kazakh poem tools: syllable counting, syllabification, rhyme scheme.
// No AI involved — results are deterministic and covered by tests.

const VOWELS = new Set("аәеиоөұүыіэюяё".split(""));
const LETTER = /[а-яәғқңөұүһіё]/;

function isVowel(ch: string) {
  return VOWELS.has(ch);
}

/** Positions of letters that form a syllable nucleus in a lower-cased word. */
function nuclei(word: string): number[] {
  const out: number[] = [];
  for (let i = 0; i < word.length; i++) {
    const ch = word[i];
    if (isVowel(ch)) out.push(i);
    // "у" is a syllable only after a consonant: су-ық (2), мыл-қау (2), уа-қыт (2).
    else if (ch === "у" && i > 0 && LETTER.test(word[i - 1]) && !isVowel(word[i - 1]) && word[i - 1] !== "у")
      out.push(i);
  }
  return out;
}

/** Words of a line, letters only, lower-cased. */
export function words(line: string): string[] {
  return line.toLowerCase().match(/[а-яәғқңөұүһіё]+/g) ?? [];
}

export function countSyllables(line: string): number {
  return words(line).reduce((n, w) => n + nuclei(w).length, 0);
}

/** Splits one word into syllables: a single consonant between nuclei starts the next syllable. */
export function syllabify(word: string): string[] {
  const lower = word.toLowerCase();
  const nuc = nuclei(lower);
  if (nuc.length <= 1) return [word];
  const cuts: number[] = [];
  for (let k = 0; k < nuc.length - 1; k++) {
    const gap = nuc[k + 1] - nuc[k] - 1; // consonants between the two nuclei
    cuts.push(gap === 0 ? nuc[k] + 1 : nuc[k + 1] - 1);
  }
  const parts: string[] = [];
  let start = 0;
  for (const c of cuts) {
    parts.push(word.slice(start, c));
    start = c;
  }
  parts.push(word.slice(start));
  return parts;
}

/** Line with every word split into syllables, punctuation kept: "Ақ ки-ім-ді, ...". */
export function syllabifyLine(line: string): string {
  return line.replace(/[А-Яа-яӘәҒғҚқҢңӨөҰұҮүҺһІіЁё]+/g, (w) => syllabify(w).join("-"));
}

const LABELS = ["а", "б", "в", "г", "д", "е"];

/** Rhyme key: the last two letters of the line's last word. */
function rhymeKey(line: string): string {
  const w = words(line);
  return (w[w.length - 1] ?? "").slice(-2);
}

/** Rhyme scheme of a stanza, e.g. "а-а-б-а". */
export function rhymeScheme(lines: string[]): string {
  const seen = new Map<string, string>();
  return lines
    .filter((l) => l.trim())
    .map((l) => {
      const key = rhymeKey(l);
      if (!seen.has(key)) seen.set(key, LABELS[seen.size] ?? "?");
      return seen.get(key)!;
    })
    .join("-");
}

export const RHYME_TYPES: Record<string, string> = {
  "а-а-б-а": "қара өлең ұйқасы",
  "а-б-а-б": "кезекті ұйқас",
  "а-а-б-б": "егіз ұйқас",
  "а-а-а-а": "шұбыртпалы ұйқас",
};

/** Meter name by the dominant syllable count. */
export function meterName(syllables: number): string {
  if (syllables === 11) return "11 буынды (қара өлең өлшемі)";
  if (syllables === 7 || syllables === 8) return "7–8 буынды (жыр өлшемі)";
  return `${syllables} буынды`;
}
