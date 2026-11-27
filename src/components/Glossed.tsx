import { requireRole } from "@/lib/auth";
import { glossParts } from "@/lib/glossary";
import { myWords } from "@/lib/queries";
import { Word } from "./Word";

/** Text with the school dictionary's words made pressable. */
export async function Glossed({ text }: { text: string }) {
  const user = await requireRole("student");
  const saved = new Set((await myWords(user.id)).map((w) => w.word));
  return glossParts(text).map((p, i) =>
    typeof p === "string" ? p : <Word key={i} text={p.text} word={p.gloss.word} meaning={p.gloss.meaning} saved={saved.has(p.gloss.word)} />,
  );
}
