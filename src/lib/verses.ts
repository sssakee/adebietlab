// Lines a student may memorise or put on a card: only checked texts (a public-domain text stored with
// its source, and the quotes in quotes.ts). Nothing here is typed from memory.
import "server-only";
import { cache } from "react";
import { sql } from "./db";
import { QUOTES } from "./quotes";

export type Verse = { key: string; lines: string[]; by: string };

export const verses = cache(async (): Promise<Verse[]> => {
  const works = await sql<{ slug: string; title: string; author: string; text: string }[]>`
    select slug, title, author, text from works where text is not null order by title`;
  return [
    ...works.map((w) => ({ key: `work:${w.slug}`, lines: w.text.split("\n").filter((l) => l.trim()), by: `${w.author.split(" ")[0]}, «${w.title}»` })),
    ...Object.entries(QUOTES).map(([k, q]) => ({ key: `quote:${k}`, lines: q.lines, by: q.by })),
  ];
});
