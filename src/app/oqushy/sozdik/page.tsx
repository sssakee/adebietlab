import Form from "next/form";
import { BookmarkPlus, Check, Search, Trash2 } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { GLOSSARY, searchGlossary, type Gloss } from "@/lib/glossary";
import { myWords } from "@/lib/queries";
import { STUDENT_LIMIT } from "@/lib/ai-quota";
import { PageHead } from "@/components/PageHead";
import { Submit } from "@/components/Submit";
import { AskWord } from "@/components/AskWord";
import { removeWord, saveWord } from "./actions";

export const metadata = { title: "Сөздік" };

const BY_WORD = [...GLOSSARY].sort((a, b) => a.word.localeCompare(b.word, "kk"));

export default async function Dictionary({ searchParams }: PageProps<"/oqushy/sozdik">) {
  const user = await requireRole("student");
  const raw = (await searchParams).q;
  const q = String(Array.isArray(raw) ? raw[0] : (raw ?? "")).replace(/\s+/g, " ").trim().slice(0, 40);
  const mine = await myWords(user.id);
  const saved = new Set(mine.map((w) => w.word));
  const found = q ? searchGlossary(q) : [];
  const mineHit = mine.find((w) => w.word === q.toLocaleLowerCase("kk") && w.source === "ai");

  const entry = (g: Gloss) => (
    <li key={g.word} className="flex flex-wrap items-start justify-between gap-3 py-4">
      <div className="min-w-0 flex-1 basis-60">
        <b className="text-lg">{g.word}</b>
        <p className="text-muted">{g.meaning}</p>
      </div>
      {saved.has(g.word) ? (
        <span className="tag bg-green-soft py-2 text-green-ink">
          <Check className="mr-1 size-4" aria-hidden="true" /> Сөздігімде
        </span>
      ) : (
        <form action={saveWord.bind(null, g.word)}>
          <Submit className="btn-ghost" aria-label={`«${g.word}» сөзін сөздігіме қосу`}>
            <BookmarkPlus className="size-4" aria-hidden="true" /> Қосу
          </Submit>
        </form>
      )}
    </li>
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHead
        title="Сөздік"
        sub="Көнерген, сирек және әдеби сөздер. Шығарма бетінде астын нүктемен сызған сөзді бассаң, түсіндірмесі шығады."
        stats={[["Менің сөздерім", mine.length], ["Мектеп сөздігінде", GLOSSARY.length]]}
      />

      <Form action="/oqushy/sozdik" role="search" className="card flex flex-wrap items-end gap-3">
        <div className="min-w-0 flex-1 basis-60">
          <label htmlFor="q" className="label">Сөз іздеу</label>
          <input id="q" name="q" type="search" defaultValue={q} maxLength={40} placeholder="Мысалы: тұлпар" className="field" />
        </div>
        <button className="btn-primary h-14">
          <Search className="size-4" aria-hidden="true" /> Іздеу
        </button>
      </Form>

      {q && (
        <section aria-labelledby="found">
          <h2 id="found" className="mb-4 text-2xl font-bold">«{q}» бойынша</h2>
          {found.length > 0 ? (
            <ul className="card py-2 [&>li+li]:border-t-2 [&>li+li]:border-line">{found.map(entry)}</ul>
          ) : mineHit ? (
            <div className="card">
              <p className="flex flex-wrap items-center gap-2"><b className="text-xl">{mineHit.word}</b><span className="tag bg-violet-soft">ЖИ түсіндірмесі</span></p>
              <p className="mt-2">{mineHit.meaning}</p>
              <p className="mt-2 text-sm font-bold text-green-ink">✓ Сөздігіңде бар</p>
            </div>
          ) : (
            <AskWord key={q} word={q} limit={STUDENT_LIMIT} />
          )}
        </section>
      )}

      <section aria-labelledby="mine">
        <h2 id="mine" className="mb-4 text-2xl font-bold">Менің сөздігім</h2>
        {mine.length ? (
          <ul className="card py-2 [&>li+li]:border-t-2 [&>li+li]:border-line">
            {mine.map((w) => (
              <li key={w.word} className="flex flex-wrap items-start justify-between gap-3 py-4">
                <div className="min-w-0 flex-1 basis-60">
                  <p className="flex flex-wrap items-center gap-2">
                    <b className="text-lg">{w.word}</b>
                    {w.source === "ai" && <span className="tag bg-violet-soft">ЖИ</span>}
                  </p>
                  <p className="text-muted">{w.meaning}</p>
                </div>
                <form action={removeWord.bind(null, w.word)}>
                  <Submit className="btn-ghost" aria-label={`«${w.word}» сөзін сөздігімнен алып тастау`}>
                    <Trash2 className="size-4" aria-hidden="true" /> Алып тастау
                  </Submit>
                </form>
              </li>
            ))}
          </ul>
        ) : (
          <p className="card text-muted">Әзірге бос. Шығарманы оқып отырып, астын нүктемен сызған сөзді бас, сосын «Сөздігіме қосу» деп сақта.</p>
        )}
      </section>

      <section aria-labelledby="all">
        <h2 id="all" className="mb-4 text-2xl font-bold">Мектеп сөздігі</h2>
        <ul className="card py-2 [&>li+li]:border-t-2 [&>li+li]:border-line">{BY_WORD.map(entry)}</ul>
        <p className="mt-3 text-xs text-muted">Түсіндірмелерді ӘдебиетLab жазды, мұғалім тексеріп отырады. Шығармадағы мағынасы өзгеше болса, мәтінге сүйен.</p>
      </section>
    </div>
  );
}
