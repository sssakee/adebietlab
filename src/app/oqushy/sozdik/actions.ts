"use server";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { sql } from "@/lib/db";
import { GLOSSARY, glossFor } from "@/lib/glossary";
import { checkMessage } from "@/lib/safety";
import { AiError, generateJson, isMock } from "@/lib/ai";
import { WordSchema } from "@/lib/ai/schemas";
import { WORD_SYSTEM, wordUser } from "@/lib/ai/prompts/word";
import { mockWord } from "@/lib/ai/mock";
import { aiUsedToday, logAiRequest, STUDENT_LIMIT } from "@/lib/ai-quota";

const norm = (s: string) => s.toLocaleLowerCase("kk").replace(/\s+/g, " ").trim();

/** Saves a school-dictionary word; only entries of GLOSSARY, so the meaning cannot come from the browser. */
export async function saveWord(word: string) {
  const user = await requireRole("student");
  const g = GLOSSARY.find((x) => x.word === word);
  if (!g) return;
  await sql`insert into words (student_id, word, meaning, source) values (${user.id}, ${g.word}, ${g.meaning}, 'sozdik') on conflict do nothing`;
  revalidatePath("/oqushy", "layout");
}

export async function removeWord(word: string) {
  const user = await requireRole("student");
  await sql`delete from words where student_id = ${user.id} and word = ${word}`;
  revalidatePath("/oqushy", "layout");
}

export type Explained = { word: string; meaning: string; ai: boolean; saved: boolean } | { error: string } | undefined;

/** Explains a word the school dictionary lacks and saves it to the student's dictionary. */
export async function explainWord(_: Explained, form: FormData): Promise<Explained> {
  const user = await requireRole("student");
  const word = norm(String(form.get("word") ?? ""));
  if (!/^[\p{L}-]{2,30}( [\p{L}-]{2,30})?$/u.test(word)) return { error: "Бір сөз не екі сөзден тұратын тіркес жаз: тек әріптер." };
  const check = checkMessage(word);
  if (!check.ok) return { error: check.message };

  const save = async (meaning: string, source: string) => {
    await sql`insert into words (student_id, word, meaning, source) values (${user.id}, ${word}, ${meaning}, ${source})
      on conflict (student_id, word) do nothing`;
    revalidatePath("/oqushy", "layout");
  };
  const g = glossFor(word);
  if (g) {
    await save(g.meaning, "sozdik");
    return { word: g.word, meaning: g.meaning, ai: false, saved: true };
  }
  // Another student may have asked already: reuse that answer instead of spending the free quota.
  const [known] = await sql<{ meaning: string }[]>`select meaning from words where word = ${word} and source = 'ai' order by added_at limit 1`;
  if (known) {
    await save(known.meaning, "ai");
    return { word, meaning: known.meaning, ai: true, saved: true };
  }
  if ((await aiUsedToday(user.id)) >= STUDENT_LIMIT) return { error: `Бүгінгі ${STUDENT_LIMIT} ЖИ сұрағының шегі бітті (чатпен ортақ). Ертең қайта көр.` };

  try {
    const r = isMock() ? { data: mockWord(word), usage: undefined } : await generateJson(WORD_SYSTEM, wordUser(word), WordSchema);
    await logAiRequest(user.id, r.usage);
    if (!r.data.known || !r.data.meaning.trim())
      return { error: `ЖИ «${word}» сөзін сенімді түсіндіре алмады. Жазылуын тексер немесе мұғалімнен сұра.` };
    const meaning = r.data.example.trim() ? `${r.data.meaning.trim()} Мысалы: ${r.data.example.trim()}` : r.data.meaning.trim();
    if (!isMock()) await save(meaning, "ai");
    return { word, meaning, ai: true, saved: !isMock() };
  } catch (e) {
    console.error(e);
    return { error: e instanceof AiError ? e.userMessage : "Қате шықты. Қайта көр." };
  }
}
