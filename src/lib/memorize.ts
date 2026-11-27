// Memorisation mode: which words of a line are hidden at each level, and checking what was typed.

/** A word split into its letters (what is hidden) and the punctuation around it (always shown). */
export function splitWord(w: string) {
  const m = w.match(/^([^\p{L}\p{N}]*)([\p{L}\p{N}-]*)(.*)$/u)!;
  return { pre: m[1], core: m[2], post: m[3] };
}

export const LEVELS = ["Оқу", "Әр төртінші сөз", "Әр екінші сөз", "Бас әріптері", "Толық жасырын"] as const;

/** Is word number i (counted across the whole text) hidden at this level? */
export function hidden(level: number, i: number) {
  if (level <= 0) return false;
  if (level === 1) return i % 4 === 1;
  if (level === 2) return i % 2 === 1;
  return true;
}

/** Case, ё/е-like spelling slips and dashes do not count as mistakes; letters do. */
export const sameWord = (typed: string, word: string) => {
  const n = (s: string) => s.toLocaleLowerCase("kk").replace(/[^\p{L}\p{N}]/gu, "");
  return n(typed) === n(word);
};
