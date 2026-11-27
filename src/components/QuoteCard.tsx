"use client";
import { useEffect, useRef, useState } from "react";
import { Download, Share2 } from "lucide-react";

type Verse = { key: string; lines: string[]; by: string };

// Canvas colours are fixed on purpose: the picture must look the same whatever theme the page is in.
const THEMES = [
  { name: "Көк", bg: ["#1450e0", "#5b2ee0"], text: "#ffffff", accent: "#ffb800" },
  { name: "Түн", bg: ["#0b1f4d", "#13309c"], text: "#eaf0ff", accent: "#ffc21a" },
  { name: "Алтын", bg: ["#ffefc2", "#ffb800"], text: "#0b1f4d", accent: "#c42d12" },
  { name: "Дала", bg: ["#d9f7e8", "#00b86b"], text: "#0b1f4d", accent: "#0b1f4d" },
] as const;
const SIZES = [
  { name: "Пост 4:5", w: 1080, h: 1350 },
  { name: "Story 9:16", w: 1080, h: 1920 },
] as const;

/** Breaks a line into rows that fit the width. */
function wrap(ctx: CanvasRenderingContext2D, text: string, max: number) {
  const rows: string[] = [];
  let row = "";
  for (const word of text.split(" ")) {
    const next = row ? `${row} ${word}` : word;
    if (ctx.measureText(next).width > max && row) {
      rows.push(row);
      row = word;
    } else row = next;
  }
  return row ? [...rows, row] : rows;
}

function draw(c: HTMLCanvasElement, lines: string[], by: string, t: (typeof THEMES)[number], s: (typeof SIZES)[number]) {
  c.width = s.w;
  c.height = s.h;
  const ctx = c.getContext("2d")!;
  const g = ctx.createLinearGradient(0, 0, s.w, s.h);
  g.addColorStop(0, t.bg[0]);
  g.addColorStop(1, t.bg[1]);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s.w, s.h);
  // soft circles for depth
  ctx.globalAlpha = 0.12;
  ctx.fillStyle = t.text;
  ctx.beginPath();
  ctx.arc(s.w * 0.92, s.h * 0.08, 260, 0, Math.PI * 2);
  ctx.arc(s.w * 0.05, s.h * 0.95, 200, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  const pad = 110;
  const width = s.w - pad * 2;
  let size = 76;
  let rows: string[] = [];
  // shrink the type until the quote fits in about 60% of the height
  for (; size >= 40; size -= 4) {
    ctx.font = `700 ${size}px JUZ40, sans-serif`;
    rows = lines.flatMap((l) => wrap(ctx, l, width));
    if (rows.length * size * 1.3 < s.h * 0.6) break;
  }
  const lh = size * 1.3;
  const top = (s.h - rows.length * lh) / 2;
  ctx.fillStyle = t.accent;
  ctx.font = `700 220px JUZ40, Georgia, serif`;
  ctx.fillText("«", pad - 20, top - 30);
  ctx.fillStyle = t.text;
  ctx.font = `700 ${size}px JUZ40, sans-serif`;
  ctx.textBaseline = "top";
  rows.forEach((r, i) => ctx.fillText(r, pad, top + i * lh));
  ctx.fillStyle = t.accent;
  ctx.fillRect(pad, top + rows.length * lh + 40, 90, 8);
  ctx.fillStyle = t.text;
  ctx.font = `500 40px JUZ40, sans-serif`;
  wrap(ctx, by, width).forEach((r, i) => ctx.fillText(r, pad, top + rows.length * lh + 80 + i * 52));
  ctx.globalAlpha = 0.85;
  ctx.font = `700 36px JUZ40, sans-serif`;
  ctx.fillText("ӘдебиетLab", pad, s.h - pad);
  ctx.globalAlpha = 1;
}

/** A checked quote (or the student's own thought) drawn as a picture to save or share. */
export function QuoteCard({ verses, name }: { verses: Verse[]; name: string }) {
  const [key, setKey] = useState(verses[0].key);
  const [own, setOwn] = useState("");
  const [theme, setTheme] = useState(0);
  const [size, setSize] = useState(0);
  const [note, setNote] = useState("");
  const canvas = useRef<HTMLCanvasElement>(null);
  const verse = key === "own" ? { lines: own.split("\n").filter((l) => l.trim()), by: `${name}, ӘдебиетLab оқушысы` } : verses.find((v) => v.key === key)!;
  const lines = verse.lines.length ? verse.lines : ["Ойыңды жаз…"];

  // Drawing is a side effect on the canvas element, not React state.
  useEffect(() => {
    let live = true;
    document.fonts.load("700 40px JUZ40").finally(() => live && canvas.current && draw(canvas.current, lines, verse.by, THEMES[theme], SIZES[size]));
    return () => {
      live = false;
    };
  }, [lines.join("\n"), verse.by, theme, size]); // eslint-disable-line react-hooks/exhaustive-deps

  const blob = () => new Promise<Blob | null>((r) => canvas.current?.toBlob(r, "image/png"));
  const download = async () => {
    const b = await blob();
    if (!b) return;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(b);
    a.download = "adebietlab-quote.png";
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const share = async () => {
    const b = await blob();
    if (!b) return;
    const file = new File([b], "adebietlab-quote.png", { type: "image/png" });
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: "ӘдебиетLab" });
      } catch {
        /* closed the share sheet */
      }
    } else {
      setNote("Бұл құрылғыдан тікелей бөлісу мүмкін емес: суретті жүктеп алып, Instagram-ға өзің сал.");
      download();
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <div className="card flex flex-col gap-5">
        <fieldset>
          <legend className="label">Дәйексөз</legend>
          <div className="flex flex-col gap-2">
            {verses.map((v) => (
              <label key={v.key} className="chip cursor-pointer justify-start text-left">
                <input type="radio" name="q" className="sr-only" checked={key === v.key} onChange={() => setKey(v.key)} />
                <span>
                  <span className="block">{v.lines.join(" / ")}</span>
                  <span className="block text-xs text-muted">{v.by}</span>
                </span>
              </label>
            ))}
            <label className="chip cursor-pointer justify-start">
              <input type="radio" name="q" className="sr-only" checked={key === "own"} onChange={() => setKey("own")} />
              Өз ойым
            </label>
          </div>
        </fieldset>
        {key === "own" && (
          <div>
            <label htmlFor="own-quote" className="label">Ойың (астында сенің атың тұрады)</label>
            <textarea id="own-quote" rows={3} maxLength={200} value={own} onChange={(e) => setOwn(e.target.value)} className="field" />
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <fieldset>
            <legend className="label">Түсі</legend>
            <div className="flex flex-wrap gap-2">
              {THEMES.map((t, i) => (
                <label key={t.name} className="chip cursor-pointer">
                  <input type="radio" name="theme" className="sr-only" checked={theme === i} onChange={() => setTheme(i)} />
                  <span className="size-4 rounded-full" style={{ background: `linear-gradient(135deg, ${t.bg[0]}, ${t.bg[1]})` }} aria-hidden="true" />
                  {t.name}
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className="label">Өлшемі</legend>
            <div className="flex flex-wrap gap-2">
              {SIZES.map((s, i) => (
                <label key={s.name} className="chip cursor-pointer">
                  <input type="radio" name="size" className="sr-only" checked={size === i} onChange={() => setSize(i)} />
                  {s.name}
                </label>
              ))}
            </div>
          </fieldset>
        </div>
        <p className="text-xs text-muted">Дәйексөздер басылған мәтінмен тексерілген. Тізімде жоқ жолды ақынның атымен жазуға болмайды: ол жалған дәйексөз болып кетеді.</p>
      </div>
      <div className="flex flex-col gap-4 self-start">
        <canvas ref={canvas} role="img" aria-label={`${lines.join(" ")} — ${verse.by}`} className="w-full rounded-3xl shadow-lg" />
        <div className="flex flex-wrap gap-3">
          <button type="button" className="btn-primary h-14 flex-1 px-6" onClick={share}>
            <Share2 className="size-5" aria-hidden="true" /> Бөлісу
          </button>
          <button type="button" className="btn-ghost h-14 flex-1 px-6" onClick={download}>
            <Download className="size-5" aria-hidden="true" /> Жүктеп алу
          </button>
        </div>
        {note && <p role="status" className="text-sm text-muted">{note}</p>}
      </div>
    </div>
  );
}
