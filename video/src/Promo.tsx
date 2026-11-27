import { AbsoluteFill, Audio, Easing, Freeze, Img, interpolate, OffthreadVideo, Sequence, spring, staticFile, useCurrentFrame } from "remotion";
import { TransitionSeries, linearTiming, type TransitionPresentation, type TransitionPresentationComponentProps } from "@remotion/transitions";
import { BookOpen, BookOpenCheck, ChartColumn, Download, FlaskConical, Globe, House, KeyRound, Map as MapIcon, MessageCircle, Monitor, Moon, PenLine, ShieldCheck, Smartphone, Sparkles, Star, Trophy, UserCheck, WandSparkles, AudioLines } from "lucide-react";
import type { ReactNode } from "react";
import { C, FONT, Mascot, Ornament, useFonts } from "./ui";
import { CLIPS, FPS, frameAt, LEAD, LENGTHS, SCENES, STARTS, T, TOTAL, VO, type Box, type Scene } from "./timeline";

const W = 1920, H = 1080;
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const ease = (f: number, a: number, b: number, from = 0, to = 1, e = Easing.bezier(0.45, 0, 0.2, 1)) => interpolate(f, [a, b], [from, to], { ...clamp, easing: e });
const pop = (f: number, at: number, len = 14, k = 1.7) => interpolate(f, [at, at + len], [0, 1], { ...clamp, easing: Easing.out(Easing.back(k)) });
const NAVY = "#071a4a";

// ---------- the window the site plays in ----------
const WW = 1560, S = WW / 1920, WH = Math.round(1080 * S), BAR = 38;
const WX = (W - WW) / 2, WY = 66;

/** A clip's own time with its idle spans (page and cursor still, an answer on its way) cut to KEEP s:
 *  `u` turns clip time into this busy time, `t` turns it back. */
const KEEP = 0.3;
function busy(clip: string) {
  const idle = (CLIPS[clip].idle ?? []).filter(([a, b]) => b - a > KEEP);
  const u = (t: number) => { let s = 0; for (const [a, b] of idle) { if (t <= a + KEEP) break; s += Math.min(t, b) - a - KEEP; } return t - s; };
  const t = (x: number) => { let s = 0; for (const [a, b] of idle) { if (x <= a + KEEP - s) break; s += b - a - KEEP; } return x + s; };
  return { u, t };
}

/** Frame by frame: which clip is on screen and at what time, so the click lands on the spoken word.
 *  Before a click the clip plays its lead-in (cursor on its way), at most 1.5× and in at most 40% of the time
 *  since the last click: what does not fit is skipped from its start, and a crossfade covers the jump.
 *  After a click the result plays, faster (up to 3×) when the next click comes soon. All in busy time. */
type Shot = { clip: string; t: number; seg: number };
export function planScene(s: Scene, len: number) {
  const segs = s.segs ?? [];
  const beat = frameAt(s.id);
  const at = segs.map((g) => beat(g.beat, g.d));
  const marks = segs.map((g) => {
    const m = CLIPS[g.clip].marks.find((m) => m.label === g.mark)!, w = busy(g.clip);
    return { pre: w.u(m.pre), at: w.u(g.at ?? m.at), end: w.u(m.end), t: w.t };
  });
  const lead = segs.map((_, k) => (k === 0 ? at[0] : Math.min(Math.round(((marks[k].at - marks[k].pre) * FPS) / 1.5), Math.round(0.4 * (at[k] - at[k - 1])), 40)));
  const start = segs.map((_, k) => (k === 0 ? 0 : at[k] - lead[k]));
  const avail = segs.map((_, k) => (k + 1 < segs.length ? start[k + 1] : len) - at[k]);
  const rate = segs.map((g, k) => { const need = (marks[k].end - marks[k].at) * FPS; return Math.max(g.speed ?? 1, need > avail[k] * 1.2 ? Math.min(3, need / avail[k]) : 1); });
  const shots: Shot[] = [];
  for (let f = 0; f < len; f++) {
    let k = 0;
    while (k + 1 < segs.length && f >= start[k + 1]) k++;
    const m = marks[k];
    let u: number;
    if (f >= at[k]) u = Math.min(m.end - 0.04, m.at + ((f - at[k]) / FPS) * rate[k]);
    else if (k === 0) u = Math.max(m.pre, m.at - (at[0] - f) / FPS); // never what came before the mark (the page it came from)
    else u = interpolate(f, [start[k], at[k]], [Math.max(m.pre, m.at - (lead[k] * 1.5) / FPS), m.at]);
    shots.push({ clip: segs[k].clip, t: m.t(u), seg: k });
  }
  const report = segs.map((g, k) => ({ mark: g.mark, at: at[k], lead: lead[k], skipped: +Math.max(0, marks[k].at - marks[k].pre - (k === 0 ? at[0] : lead[k] * 1.5) / FPS).toFixed(2), rate: +rate[k].toFixed(2), shown: +Math.min(1, (avail[k] * rate[k]) / FPS / Math.max(0.01, marks[k].end - marks[k].at)).toFixed(2), hold: avail[k] }));
  return { shots, report };
}
const PLANS: Record<string, Shot[]> = Object.fromEntries(SCENES.map((s, i) => [s.id, s.segs ? planScene(s, LENGTHS[i]).shots : []]));

/** Clicks and typing as they happen on screen, in scene frames. */
function events(id: string) {
  const plan = PLANS[id];
  const clicks: { f: number; x: number; y: number }[] = [], typing: { f: number; len: number }[] = [];
  for (let f = 1; f < plan.length; f++) {
    const a = plan[f - 1], b = plan[f];
    if (a.clip !== b.clip || b.t <= a.t) continue;
    for (const c of CLIPS[b.clip].cursor) if (c.click && c.t > a.t && c.t <= b.t) clicks.push({ f, x: c.x, y: c.y });
    for (const k of CLIPS[b.clip].keys ?? []) if (k.from > a.t && k.from <= b.t) {
      let e = f;
      while (e < plan.length && plan[e].clip === b.clip && plan[e].t < k.to) e++;
      if (e > f + 2) typing.push({ f, len: e - f });
    }
  }
  return { clicks, typing };
}
const EVENTS = Object.fromEntries(SCENES.filter((s) => s.segs).map((s) => [s.id, events(s.id)]));

function cursorAt(clip: string, t: number) {
  const pts = CLIPS[clip].cursor;
  let i = 0;
  while (i + 1 < pts.length && pts[i + 1].t <= t) i++;
  const a = pts[i], b = pts[i + 1];
  if (!b || b.t === a.t) return { x: a.x, y: a.y };
  const e = Math.max(0, Math.min(1, (t - a.t) / (b.t - a.t)));
  const k = e < 0.5 ? 4 * e * e * e : 1 - (-2 * e + 2) ** 3 / 2;
  return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k };
}

function ClipFrame({ clip, t, opacity = 1 }: { clip: string; t: number; opacity?: number }) {
  return (
    <AbsoluteFill style={{ opacity }}>
      <Freeze frame={Math.max(0, Math.round(t * FPS))}>
        <OffthreadVideo src={staticFile(`clips/${clip}.mp4`)} muted style={{ width: WW, height: WH }} />
      </Freeze>
    </AbsoluteFill>
  );
}

function Cursor({ x, y, click }: { x: number; y: number; click: number }) {
  return (
    <div style={{ position: "absolute", left: x, top: y, pointerEvents: "none" }}>
      {click > 0 && click < 1 && (
        <>
          <div style={{ position: "absolute", left: -40, top: -40, width: 80, height: 80, borderRadius: 40, border: `5px solid ${C.gold}`, opacity: 1 - click, transform: `scale(${0.3 + click * 1.1})` }} />
          <div style={{ position: "absolute", left: -18, top: -18, width: 36, height: 36, borderRadius: 18, background: C.gold, opacity: 0.45 * (1 - click), transform: `scale(${0.5 + click})` }} />
        </>
      )}
      <svg width="44" height="52" viewBox="0 0 24 28" style={{ transform: `scale(${1 - 0.18 * Math.sin(Math.PI * Math.min(1, click * 2.5))})`, transformOrigin: "2px 1px", filter: "drop-shadow(0 4px 6px rgba(0,0,0,.35))" }}>
        <path d="M2 1 L2 21 L7.5 16 L11 25 L14.5 23.5 L11 15 L18.5 15 Z" fill={NAVY} stroke="#fff" strokeWidth="1.8" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

/** A gold ring drawn around a box, with a label that pops out beside it. */
function NoteMark({ box, text, f0, len, f }: { box: Box; text: string; f0: number; len: number; f: number }) {
  const pad = 12, x = box.x * S - pad, y = box.y * S - pad, w = box.w * S + pad * 2, h = box.h * S + pad * 2;
  const draw = ease(f, f0, f0 + 16), out = ease(f, f0 + len - 8, f0 + len, 1, 0), lab = pop(f, f0 + 8);
  const per = 2 * (w + h);
  const below = y + h + 70 < WH;
  return (
    <div style={{ position: "absolute", inset: 0, opacity: out }}>
      <svg width={WW} height={WH} style={{ position: "absolute", inset: 0 }}>
        <rect x={x} y={y} width={w} height={h} rx={16} fill="none" stroke={C.gold} strokeWidth={6} strokeDasharray={per} strokeDashoffset={per * (1 - draw)} strokeLinecap="round" />
      </svg>
      <div style={{ position: "absolute", ...(x + w / 2 > WW / 2 ? { right: Math.max(10, WW - x - w) } : { left: Math.max(10, x) }), top: below ? y + h + 14 : y - 70, transform: `scale(${lab})`, transformOrigin: x + w / 2 > WW / 2 ? "100% 0" : "0 0", padding: "10px 22px", borderRadius: 16, background: C.gold, color: C.ink, fontFamily: FONT, fontWeight: 700, fontSize: 30, boxShadow: "0 14px 30px rgba(7,26,74,.35)", whiteSpace: "nowrap" }}>{text}</div>
    </div>
  );
}

/** The site, live, in a window: the recorded clip, retimed to the voice, with the cursor and drawn notes. */
function Screen({ s, len }: { s: Scene; len: number }) {
  const f = useCurrentFrame();
  const plan = PLANS[s.id];
  const shot = plan[Math.min(f, plan.length - 1)];
  const k = shot.seg;
  const switchAt = plan.findIndex((p) => p.seg === k);
  const prev = k > 0 ? plan[switchAt - 1] : null;
  // a new clip, or a jump inside one (a page load left out): the new picture fades in over the old
  const cut = !!prev && (prev.clip !== shot.clip || Math.abs(plan[switchAt].t - prev.t) > 0.3);
  const fadeIn = cut ? ease(f, switchAt, switchAt + 8) : 1;
  const { clicks } = EVENTS[s.id];
  const lastClick = [...clicks].reverse().find((c) => c.f <= f);
  const click = lastClick ? (f - lastClick.f) / 14 : 1;
  const punch = lastClick && f - lastClick.f < 16 ? Math.sin((Math.PI * (f - lastClick.f)) / 16) * 0.022 : 0;
  const cur = cursorAt(shot.clip, shot.t);
  const enter = spring({ frame: f, fps: FPS, config: { damping: 17, mass: 0.9 } });
  const drift = 1 + 0.015 * (f / len);
  const notes = (s.notes ?? []).map((n) => {
    const b = typeof n.box === "string" ? CLIPS[n.clip].boxes[n.box] : n.box;
    return { ...n, b, f0: frameAt(s.id)(n.beat, n.d), l: Math.round((n.len ?? 2.2) * FPS) };
  });
  return (
    <div style={{ position: "absolute", left: WX, top: WY, width: WW, transform: `perspective(2200px) translateY(${(1 - enter) * 220}px) rotateX(${(1 - enter) * 12}deg) scale(${0.9 + 0.1 * enter})`, transformOrigin: "50% 100%" }}>
      <div style={{ borderRadius: 22, overflow: "hidden", background: "#fff", boxShadow: "0 60px 120px rgba(3,10,40,.55), 0 0 0 1px rgba(255,255,255,.25)" }}>
        <div style={{ height: BAR, display: "flex", alignItems: "center", gap: 9, padding: "0 18px", background: "#e9effc" }}>
          {["#ff5f57", "#febc2e", "#28c840"].map((c) => <span key={c} style={{ width: 13, height: 13, borderRadius: 7, background: c }} />)}
          <div style={{ marginLeft: 16, width: 520, height: 26, borderRadius: 13, background: "#fff", display: "flex", alignItems: "center", padding: "0 14px", fontFamily: FONT, fontSize: 15, color: C.muted, fontWeight: 500 }}>🔒&nbsp; adebietlab.vercel.app</div>
        </div>
        <div style={{ position: "relative", width: WW, height: WH, overflow: "hidden" }}>
          <div style={{ position: "absolute", inset: 0, transform: `scale(${drift + punch})`, transformOrigin: `${cur.x * S}px ${cur.y * S}px` }}>
            {cut && fadeIn < 1 && <ClipFrame clip={prev!.clip} t={prev!.t} />}
            <ClipFrame clip={shot.clip} t={shot.t} opacity={fadeIn} />
            {notes.map((n, i) => n.b && f >= n.f0 && f < n.f0 + n.l && n.clip === shot.clip && <NoteMark key={i} box={n.b} text={n.text} f0={n.f0} len={n.l} f={f} />)}
            <Cursor x={cur.x * S} y={cur.y * S} click={click} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------- the brand around it ----------
function Backdrop({ children, dark = false }: { children?: ReactNode; dark?: boolean }) {
  const f = useCurrentFrame();
  const blob = (color: string, size: number, x: number, y: number, ph: number, o = 0.7): React.CSSProperties => ({
    position: "absolute", width: size, height: size, borderRadius: "50%", background: `radial-gradient(circle, ${color} 0%, transparent 68%)`,
    left: x + Math.sin(f / 60 + ph) * 60, top: y + Math.cos(f / 75 + ph) * 40, opacity: o,
  });
  return (
    <AbsoluteFill style={{ background: dark ? `linear-gradient(160deg, #0a1f5c 0%, ${NAVY} 70%)` : `linear-gradient(140deg, ${C.hero} 0%, ${C.navyDeep} 55%, #0d2470 100%)`, overflow: "hidden" }}>
      <div style={blob(C.blobA, 1300, 1050, -500, 0)} />
      <div style={blob(C.blobB, 900, -300, 500, 2, 0.55)} />
      <div style={blob(C.primary, 1000, 300, -500, 4, 0.5)} />
      {Array.from({ length: 22 }, (_, i) => {
        const x = (i * 397) % W, y = (H + 80 - ((f * (0.6 + (i % 5) * 0.25) + i * 211) % (H + 160)));
        return <span key={i} style={{ position: "absolute", left: x, top: y, width: 4 + (i % 3) * 3, height: 4 + (i % 3) * 3, borderRadius: 6, background: i % 4 ? "rgba(255,255,255,.35)" : C.gold, opacity: 0.6 }} />;
      })}
      {children}
    </AbsoluteFill>
  );
}

const ICONS: Record<string, typeof House> = { key: KeyRound, home: House, book: BookOpen, wave: AudioLines, map: MapIcon, chat: MessageCircle, pen: PenLine, star: Star, globe: Globe, trophy: Trophy, wand: WandSparkles, chart: ChartColumn };

/** The scene's number and name: big over the window first, then tucked into the corner. */
function TitleCard({ s }: { s: Scene }) {
  const f = useCurrentFrame();
  const Icon = ICONS[s.icon ?? "star"];
  const big = ease(f, 46, 58, 1, 0), chip = pop(f, 50, 14);
  const words = (s.title ?? "").split(" ");
  return (
    <>
      <div style={{ position: "absolute", inset: 0, background: `linear-gradient(90deg, rgba(7,26,74,.94) 0%, rgba(7,26,74,.75) 45%, rgba(7,26,74,0) 85%)`, opacity: big }} />
      <div style={{ position: "absolute", left: 170, top: 300, fontFamily: FONT, color: "#fff", opacity: big, transform: `translateY(${(1 - big) * -40}px)` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 26, transform: `translateX(${(1 - pop(f, 0, 16)) * -120}px)`, opacity: Math.min(1, f / 6) }}>
          <span style={{ fontSize: 150, fontWeight: 700, lineHeight: 1, color: "transparent", WebkitTextStroke: `4px ${C.gold}` }}>{s.no}</span>
          <span style={{ display: "grid", placeItems: "center", width: 110, height: 110, borderRadius: 32, background: C.gold, transform: `rotate(${(1 - pop(f, 4, 18)) * -120}deg) scale(${pop(f, 4, 18)})` }}><Icon size={60} color={C.ink} strokeWidth={2.2} /></span>
        </div>
        <div style={{ marginTop: 26, fontSize: 104, fontWeight: 700, lineHeight: 1.02, maxWidth: 1250, letterSpacing: -2 }}>
          {words.map((w, i) => {
            const p = spring({ frame: f - 6 - i * 3, fps: FPS, config: { damping: 14, mass: 0.6 } });
            return <span key={i} style={{ display: "inline-block", marginRight: 26, opacity: Math.min(1, p * 1.5), transform: `translateY(${(1 - p) * 60}px) rotate(${(1 - p) * 8}deg)` }}>{w}</span>;
          })}
        </div>
        {s.who && <div style={{ marginTop: 22, display: "inline-block", padding: "10px 26px", borderRadius: 999, background: "rgba(255,255,255,.16)", border: "2px solid rgba(255,255,255,.35)", fontSize: 34, fontWeight: 700, opacity: pop(f, 14) }}>{s.who}</div>}
      </div>
      <div style={{ position: "absolute", left: WX, top: 12, height: 44, display: "flex", alignItems: "center", gap: 14, fontFamily: FONT, color: "#fff", transform: `scale(${chip})`, transformOrigin: "0 50%" }}>
        <span style={{ display: "grid", placeItems: "center", width: 44, height: 44, borderRadius: 13, background: C.gold }}><Icon size={26} color={C.ink} strokeWidth={2.4} /></span>
        <span style={{ fontSize: 30, fontWeight: 700, color: C.gold }}>{s.no}</span>
        <span style={{ fontSize: 30, fontWeight: 700 }}>{s.title}</span>
      </div>
      {s.who && <div style={{ position: "absolute", right: WX, top: 16, padding: "6px 20px", borderRadius: 999, background: "rgba(255,255,255,.14)", border: "2px solid rgba(255,255,255,.3)", fontFamily: FONT, fontWeight: 700, fontSize: 24, color: "#fff", transform: `scale(${chip})`, transformOrigin: "100% 50%" }}>{s.who}</div>}
    </>
  );
}

/** What is being said, word by word: the word being spoken lights up. */
function Karaoke({ id, bottom = 22, size = 38 }: { id: string; bottom?: number; size?: number }) {
  const f = useCurrentFrame();
  const v = VO[id];
  if (!v) return null;
  const beats = v.beats.map((x) => x ?? 0);
  const starts = v.say.length === beats.length ? beats : [0, ...beats];
  const ends = [...starts.slice(1), v.dur - 0.25];
  const t = (f - LEAD) / FPS;
  let i = -1;
  starts.forEach((s, k) => { if (t >= s - 0.05) i = k; });
  if (i < 0 || t > v.dur + 0.2) return null;
  const text = v.say[i].replace(/Әдебиет Лаб/g, "ӘдебиетLab");
  if (text.length > 64) size = Math.min(size, 32);
  const words = text.split(" ");
  const total = words.reduce((a, w) => a + w.length + 1, 0);
  let acc = 0;
  const local = (t - starts[i]) / Math.max(0.3, ends[i] - starts[i] - 0.1);
  const o = Math.min(ease(f, LEAD + starts[i] * FPS - 2, LEAD + starts[i] * FPS + 5), ease(f, LEAD + v.dur * FPS, LEAD + v.dur * FPS + 6, 1, 0));
  return (
    <div style={{ position: "absolute", left: 0, right: 0, bottom, display: "flex", justifyContent: "center", opacity: o }}>
      <div style={{ maxWidth: 1640, padding: "12px 30px", borderRadius: 20, background: "rgba(5,16,48,.82)", fontFamily: FONT, fontSize: size, fontWeight: 700, lineHeight: 1.2, textAlign: "center", boxShadow: "0 12px 30px rgba(0,0,0,.3)" }}>
        {words.map((w, k) => {
          const a = acc / total; acc += w.length + 1;
          const b = acc / total;
          const state = local >= b ? 2 : local >= a ? 1 : 0;
          return <span key={k} style={{ display: "inline-block", marginRight: "0.28em", color: state === 1 ? C.gold : "#fff", opacity: state === 0 ? 0.5 : 1, transform: `scale(${state === 1 ? 1.06 : 1})` }}>{w}</span>;
        })}
      </div>
    </div>
  );
}

/** Қырантай jumps in from the corner with a word of his own. */
function React_({ at, text }: { at: number; text: string }) {
  const f = useCurrentFrame();
  const p = pop(f, at, 16, 1.6), out = ease(f, at + 70, at + 82, 1, 0), b = pop(f, at + 8, 12, 2.2);
  if (f < at || out <= 0) return null;
  const hop = Math.abs(Math.sin(((f - at) / 10) * Math.PI)) * 14 * Math.max(0, 1 - (f - at) / 40);
  return (
    <div style={{ position: "absolute", right: 0, bottom: 0, width: 600, height: 480, opacity: out }}>
      <Mascot size={250} style={{ position: "absolute", right: 14, bottom: -30 + (1 - p) * -300 + 0, transform: `translateY(${(1 - p) * 320 - hop}px) rotate(${Math.sin(f / 6) * 5}deg) scaleY(${1 - 0.06 * Math.sin(((f - at) / 4))})`, transformOrigin: "50% 100%" }} />
      <div style={{ position: "absolute", right: 230, bottom: 210, padding: "16px 28px", borderRadius: "30px 30px 6px 30px", background: "#fff", border: `4px solid ${C.gold}`, color: C.ink, fontFamily: FONT, fontWeight: 700, fontSize: 40, boxShadow: "0 20px 40px rgba(0,0,0,.3)", transform: `scale(${b}) rotate(${(1 - b) * 10}deg)`, transformOrigin: "100% 100%", whiteSpace: "nowrap" }}>{text}</div>
    </div>
  );
}

function ScreenScene({ s, len }: { s: Scene; len: number }) {
  return (
    <Backdrop>
      <Screen s={s} len={len} />
      <TitleCard s={s} />
      {s.react && <React_ at={frameAt(s.id)(s.react.beat, s.react.d)} text={s.react.text} />}
      <Karaoke id={s.id} />
    </Backdrop>
  );
}

// ---------- the brand scenes ----------
const WALL = ["olen", "karta", "suhbat", "works", "zhattau", "baige", "teacher", "results", "creative", "world", "home", "login"];

function Hook({ len }: { len: number }) {
  const f = useCurrentFrame();
  const beat = frameAt("01");
  const no = beat(1), now = beat(2);
  const shake = f >= no && f < no + 14 ? Math.sin(f * 2.7) * 16 * (1 - (f - no) / 14) : 0;
  const words1 = "Әдебиет сабағы…".split(" "), words2 = "тек оқып, мазмұндап берумен бітеді ме?".split(" ");
  const t = (f - LEAD) / FPS;
  const said = Math.max(0, Math.min(1, t / ((no - LEAD) / FPS - 0.3)));
  const all = [...words1, ...words2];
  const reveal = (i: number) => ease(said * all.length, i - 0.2, i + 0.6);
  const flyOut = (i: number) => (f < no ? 0 : ease(f, no, no + 16));
  const flash = f >= no ? ease(f, no, no + 8, 0.9, 0) : 0;
  const zhoq = pop(f, no, 12, 2.6), zhoqOut = ease(f, now, now + 10, 1, 0);
  const wipe = ease(f, now, now + 16, 0, 1, Easing.out(Easing.cubic));
  return (
    <AbsoluteFill style={{ background: "#050f2e", overflow: "hidden", transform: `translate(${shake}px, ${shake * 0.4}px)` }}>
      {/* before: grey and slow */}
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", fontFamily: FONT, transform: `scale(${1 + 0.05 * Math.min(1, f / no)})` }}>
        <BookOpen size={520} color="#1c2b5c" strokeWidth={1.2} style={{ position: "absolute", opacity: 0.6, transform: `rotate(${-6 + Math.sin(f / 30) * 2}deg) translateY(${f * 0.2}px)` }} />
        <div style={{ position: "relative", textAlign: "center", width: 1500 }}>
          <div style={{ fontSize: 110, fontWeight: 700, color: "#fff" }}>
            {words1.map((w, i) => <span key={i} style={{ display: "inline-block", margin: "0 18px", opacity: reveal(i) * (1 - flyOut(i)), transform: `translate(${flyOut(i) * (i - 0.5) * 900}px, ${flyOut(i) * -400}px) rotate(${flyOut(i) * (i ? 40 : -40)}deg)` }}>{w}</span>)}
          </div>
          <div style={{ marginTop: 20, fontSize: 70, fontWeight: 600, color: "#a9b6d8" }}>
            {words2.map((w, i) => { const j = i + words1.length; return <span key={i} style={{ display: "inline-block", margin: "0 12px", opacity: reveal(j) * (1 - flyOut(j)), transform: `translate(${flyOut(j) * (i - 2.5) * 260}px, ${flyOut(j) * (300 + i * 60)}px) rotate(${flyOut(j) * (i % 2 ? 50 : -50)}deg)` }}>{w}</span>; })}
          </div>
        </div>
      </AbsoluteFill>
      {f >= no && (
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: zhoqOut }}>
          <div style={{ fontFamily: FONT, fontSize: 330, fontWeight: 700, color: C.gold, letterSpacing: -8, transform: `scale(${2.6 - 1.6 * zhoq}) rotate(${(1 - zhoq) * -8}deg)`, opacity: Math.min(1, zhoq * 2), textShadow: "0 30px 80px rgba(255,184,0,.35)" }}>Жоқ!</div>
        </AbsoluteFill>
      )}
      {/* after: the lab opens */}
      {f >= now && (
        <AbsoluteFill style={{ clipPath: `circle(${wipe * 130}% at 50% 50%)` }}>
          <Backdrop>
            <div style={{ position: "absolute", inset: -300, transform: "perspective(1800px) rotateX(28deg) rotateZ(-10deg)", opacity: 0.55 }}>
              {[0, 1, 2, 3].map((r) => (
                <div key={r} style={{ display: "flex", gap: 34, marginBottom: 34, transform: `translateX(${(r % 2 ? -1 : 1) * (f - now) * 2.2 - 500 - r * 200}px)` }}>
                  {[...WALL, ...WALL].slice(r * 3, r * 3 + 9).map((src, i) => {
                    const z = pop(f, now + 4 + i * 2 + r * 3, 18, 1.2);
                    return <Img key={i} src={staticFile(`wall/${src}.jpg`)} style={{ width: 600, borderRadius: 18, opacity: z, transform: `translateZ(${(1 - z) * 900}px) scale(${0.6 + 0.4 * z})`, boxShadow: "0 30px 60px rgba(0,0,0,.4)" }} />;
                  })}
                </div>
              ))}
            </div>
            <AbsoluteFill style={{ background: "radial-gradient(circle at 50% 50%, rgba(13,36,112,.25), rgba(7,26,74,.88) 70%)" }} />
            <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", fontFamily: FONT, color: "#fff", textAlign: "center" }}>
              <div style={{ fontSize: 76, fontWeight: 700, opacity: pop(f, now + 2), transform: `translateY(${(1 - pop(f, now + 2)) * 40}px)` }}>Енді әр шығарманы —</div>
              <div style={{ display: "flex", alignItems: "center", gap: 30, marginTop: 10 }}>
                <Flask f={f - now - 10} />
                <div style={{ fontSize: 200, fontWeight: 700, letterSpacing: -6, lineHeight: 1 }}>
                  {"зерттейміз!".split("").map((ch, i) => {
                    const p = spring({ frame: f - now - 12 - i * 2, fps: FPS, config: { damping: 9, mass: 0.6 } });
                    return <span key={i} style={{ display: "inline-block", color: C.gold, opacity: Math.min(1, p * 2), transform: `translateY(${(1 - p) * -160}px) scale(${0.4 + 0.6 * p})` }}>{ch}</span>;
                  })}
                </div>
              </div>
            </AbsoluteFill>
            <Burst x={960} y={600} at={now + 22} n={26} />
            <div style={{ position: "absolute", left: 0, bottom: 40 }}><Ornament width={W * ease(f, now + 10, now + 50)} /></div>
          </Backdrop>
        </AbsoluteFill>
      )}
      <AbsoluteFill style={{ background: C.gold, opacity: flash }} />
      <Karaoke id="01" bottom={40} size={34} />
    </AbsoluteFill>
  );
}

/** The site's flask, bubbling. */
function Flask({ f, size = 170 }: { f: number; size?: number }) {
  const p = pop(f, 0, 16, 2);
  return (
    <div style={{ position: "relative", width: size, height: size, transform: `scale(${p}) rotate(${(1 - p) * -40 + Math.sin(f / 8) * 4}deg)` }}>
      <div style={{ position: "absolute", inset: 0, borderRadius: size * 0.28, background: "#fff", display: "grid", placeItems: "center", boxShadow: "0 20px 50px rgba(0,0,0,.35)" }}><FlaskConical size={size * 0.56} color={C.primary} strokeWidth={2.2} /></div>
      {Array.from({ length: 7 }, (_, i) => {
        const t = ((f + i * 9) % 50) / 50;
        return <span key={i} style={{ position: "absolute", left: size * (0.3 + 0.08 * i) + Math.sin(f / 5 + i) * 8, top: -t * size * 0.9, width: 10 + (i % 3) * 6, height: 10 + (i % 3) * 6, borderRadius: 20, background: i % 2 ? C.gold : "#9fc0ff", opacity: f > 0 ? (1 - t) * 0.9 : 0 }} />;
      })}
    </div>
  );
}

function Burst({ x, y, at, n = 18 }: { x: number; y: number; at: number; n?: number }) {
  const f = useCurrentFrame() - at;
  if (f < 0 || f > 36) return null;
  const p = Easing.out(Easing.cubic)(f / 36);
  return (
    <div style={{ position: "absolute", left: x, top: y }}>
      {Array.from({ length: n }, (_, i) => {
        const a = (i / n) * Math.PI * 2 + (i % 2) * 0.2, r = 40 + (220 + (i % 4) * 60) * p;
        return <span key={i} style={{ position: "absolute", width: i % 3 ? 14 : 22, height: i % 3 ? 14 : 8, borderRadius: 4, background: [C.gold, "#fff", "#9fc0ff", C.gold][i % 4], left: Math.cos(a) * r, top: Math.sin(a) * r + p * p * 80, opacity: 1 - f / 36, transform: `rotate(${f * 12 + i * 30}deg)` }} />;
      })}
    </div>
  );
}

function Logo({ f, size = 1 }: { f: number; size?: number }) {
  const tile = pop(f, 0, 18, 2);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 34 * size, fontFamily: FONT, color: "#fff" }}>
      <span style={{ display: "grid", placeItems: "center", width: 150 * size, height: 150 * size, borderRadius: 42 * size, background: "#fff", transform: `scale(${tile}) rotate(${(1 - tile) * -180}deg)`, boxShadow: "0 24px 60px rgba(0,0,0,.35)" }}><FlaskConical size={84 * size} color={C.primary} strokeWidth={2.2} /></span>
      <span style={{ fontSize: 150 * size, fontWeight: 700, letterSpacing: -3 * size, lineHeight: 1 }}>
        {"ӘдебиетLab".split("").map((ch, i) => {
          const p = spring({ frame: f - 6 - i * 2, fps: FPS, config: { damping: 12, mass: 0.6 } });
          return <span key={i} style={{ display: "inline-block", color: i >= 7 ? C.gold : "#fff", opacity: Math.min(1, p * 2), transform: `translateY(${(1 - p) * 80}px) rotate(${(1 - p) * 20}deg)` }}>{ch}</span>;
        })}
      </span>
    </div>
  );
}

function Intro() {
  const f = useCurrentFrame();
  const beat = frameAt("02");
  const b1 = beat(1), b2 = beat(2), b3 = beat(3);
  const up = ease(f, b2 - 6, b2 + 14);
  const lap = pop(f, b2, 22, 1.2), ph = pop(f, b2 + 8, 22, 1.4), dk = pop(f, b2 + 16, 22, 1.2);
  const stamp = pop(f, b3, 14, 2.4);
  const tag = "Қазақ әдебиетінің веб-зертханасы";
  const typed = Math.round(ease(f, b1 + 30, b1 + 62) * tag.length);
  const chips: [typeof Monitor, string, number][] = [[Monitor, "Компьютерде", b2 + 6], [Smartphone, "Телефонда", b2 + 14], [Moon, "Қараңғы режимде", b2 + 22]];
  return (
    <Backdrop>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", transform: `translateY(${up * -370}px) scale(${1 - 0.5 * up})` }}>
        <Logo f={f - 2} />
        <div style={{ marginTop: 30, fontFamily: FONT, fontSize: 56, fontWeight: 600, color: "#dfe8ff", minHeight: 70 }}>{tag.slice(0, typed)}<span style={{ opacity: typed > 0 && f % 20 < 10 && typed < tag.length ? 1 : 0, color: C.gold }}>|</span></div>
      </AbsoluteFill>
      {f >= b2 - 4 && (
        <>
          <div style={{ position: "absolute", left: 120, top: 250, transform: `perspective(2000px) translateX(${(1 - lap) * -900}px) rotateY(${(1 - lap) * 30 + 8}deg)`, transformOrigin: "0 50%" }}>
            <div style={{ width: 1040, borderRadius: 22, overflow: "hidden", background: "#fff", boxShadow: "0 50px 100px rgba(0,0,0,.45)" }}>
              <div style={{ height: 34, background: "#e9effc", display: "flex", alignItems: "center", gap: 8, padding: "0 16px" }}>{["#ff5f57", "#febc2e", "#28c840"].map((c) => <span key={c} style={{ width: 12, height: 12, borderRadius: 6, background: c }} />)}</div>
              <div style={{ width: 1040, height: 585 }}><OffthreadVideo src={staticFile("clips/home.mp4")} muted style={{ width: 1040, height: 585 }} /></div>
            </div>
          </div>
          <div style={{ position: "absolute", left: 1010, top: 250, opacity: dk, transform: `perspective(2000px) translateY(${(1 - dk) * -500}px) rotateY(-14deg) rotate(4deg)` }}>
            <div style={{ width: 560, borderRadius: 18, overflow: "hidden", boxShadow: "0 40px 80px rgba(0,0,0,.5)" }}><Img src={staticFile("wall/dark.jpg")} style={{ width: 560, display: "block" }} /></div>
          </div>
          <div style={{ position: "absolute", left: 1500, top: 290, transform: `translateY(${(1 - ph) * 800}px) rotate(${-6 + (1 - ph) * 20}deg)` }}>
            <div style={{ width: 300, height: 640, borderRadius: 46, background: "#0b1230", padding: 11, boxShadow: "0 40px 90px rgba(0,0,0,.5)" }}>
              <div style={{ width: "100%", height: "100%", borderRadius: 36, overflow: "hidden", position: "relative", background: "#fff" }}>
                <OffthreadVideo src={staticFile("clips/phone.mp4")} muted style={{ width: 278, height: 601 }} />
                <div style={{ position: "absolute", top: 8, left: "50%", marginLeft: -45, width: 90, height: 24, borderRadius: 12, background: "#0b1230" }} />
              </div>
            </div>
          </div>
          <div style={{ position: "absolute", left: 120, top: 878, display: "flex", gap: 18 }}>
            {chips.map(([Icon, t, at]) => (
              <span key={t} style={{ display: "inline-flex", alignItems: "center", gap: 12, padding: "12px 26px", borderRadius: 999, background: "#fff", color: C.primary, fontFamily: FONT, fontWeight: 700, fontSize: 32, transform: `scale(${pop(f, at, 12, 2)})`, boxShadow: "0 12px 30px rgba(0,0,0,.25)" }}><Icon size={32} /> {t}</span>
            ))}
          </div>
          {f >= b3 && (
            <div style={{ position: "absolute", left: 1290, top: 770, transform: `scale(${stamp}) rotate(${-10 + (1 - stamp) * -60}deg)`, padding: "22px 40px", borderRadius: 26, background: C.gold, color: C.ink, fontFamily: FONT, fontWeight: 700, fontSize: 50, display: "flex", alignItems: "center", gap: 16, boxShadow: "0 24px 50px rgba(0,0,0,.4)", border: "5px solid #fff" }}>
              <Download size={48} strokeWidth={2.6} /> Орнатусыз!
            </div>
          )}
          <Burst x={1500} y={880} at={b3 + 6} />
        </>
      )}
      <Karaoke id="02" />
    </Backdrop>
  );
}

function Trust() {
  const f = useCurrentFrame();
  const beat = frameAt("15");
  const items = [
    { Icon: Sparkles, a: "ЖИ — көмекші", b: "Шешім — мұғалімде", at: LEAD + 4 },
    { Icon: ShieldCheck, a: "Жеке дерек", b: "сұралмайды", at: beat(1) },
    { Icon: BookOpenCheck, a: "Авторлық құқық", b: "сақталады", at: beat(2) },
  ];
  return (
    <Backdrop dark>
      <div style={{ position: "absolute", left: 0, right: 0, top: 130, textAlign: "center", fontFamily: FONT, fontSize: 84, fontWeight: 700, color: "#fff" }}>
        {"Сенімді әрі қауіпсіз".split(" ").map((w, i) => { const p = spring({ frame: f - 2 - i * 4, fps: FPS, config: { damping: 14 } }); return <span key={i} style={{ display: "inline-block", margin: "0 14px", opacity: p, transform: `translateY(${(1 - p) * 50}px)` }}>{w}</span>; })}
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 330, display: "flex", justifyContent: "center", gap: 44, perspective: 1600 }}>
        {items.map(({ Icon, a, b, at }, i) => {
          const p = pop(f, at, 20, 1.3);
          const check = ease(f, at + 14, at + 30);
          const lit = f >= at ? 1 : 0;
          return (
            <div key={i} style={{ width: 500, height: 430, borderRadius: 36, padding: "48px 36px", background: lit ? "rgba(255,255,255,.12)" : "rgba(255,255,255,.04)", border: `3px solid ${lit ? "rgba(255,184,0,.7)" : "rgba(255,255,255,.12)"}`, textAlign: "center", fontFamily: FONT, color: "#fff", opacity: 0.25 + 0.75 * p, transform: `rotateY(${(1 - p) * 70}deg) translateY(${(1 - p) * 60}px) scale(${0.9 + 0.1 * p})` }}>
              <div style={{ position: "relative", display: "inline-grid", placeItems: "center", width: 130, height: 130, borderRadius: 38, background: C.gold }}>
                <Icon size={74} color={C.ink} strokeWidth={2.2} />
                <svg width="60" height="60" viewBox="0 0 60 60" style={{ position: "absolute", right: -22, bottom: -22 }}>
                  <circle cx="30" cy="30" r="27" fill={C.green} opacity={check > 0 ? 1 : 0} />
                  <path d="M17 31 L26 40 L44 21" fill="none" stroke="#fff" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="40" strokeDashoffset={40 * (1 - check)} />
                </svg>
              </div>
              <div style={{ marginTop: 44, fontSize: 50, fontWeight: 700, lineHeight: 1.15 }}>{a}</div>
              <div style={{ marginTop: 6, fontSize: 50, fontWeight: 700, color: C.gold, lineHeight: 1.15 }}>{b}</div>
            </div>
          );
        })}
      </div>
      <div style={{ position: "absolute", left: 0, top: 40 }}><Ornament opacity={0.5} /></div>
      <Karaoke id="15" />
    </Backdrop>
  );
}

function Outro({ len }: { len: number }) {
  const f = useCurrentFrame();
  const beat = frameAt("16");
  const b1 = beat(1), b2 = beat(2);
  const out = ease(f, len - 22, len, 1, 0);
  const url = pop(f, b2 + 16, 16, 2);
  const conf = Array.from({ length: 70 }, (_, i) => i);
  return (
    <Backdrop>
      <AbsoluteFill style={{ opacity: out }}>
        {f > b2 && conf.map((i) => {
          const t = f - b2 - (i % 10) * 2, x = (i * 271) % W, fall = t * (5 + (i % 5)), sway = Math.sin(t / 8 + i) * 40;
          return <span key={i} style={{ position: "absolute", left: x + sway, top: -40 + fall, width: 16, height: 10 + (i % 3) * 6, background: [C.gold, "#fff", "#9fc0ff", C.blobB, C.green][i % 5], transform: `rotate(${t * (6 + (i % 7))}deg)`, opacity: t > 0 ? 1 : 0 }} />;
        })}
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", fontFamily: FONT, color: "#fff", textAlign: "center", transform: `translateY(${ease(f, b1 - 8, b1 + 10) * -120}px)` }}>
          <Logo f={f - 4} />
        </AbsoluteFill>
        <div style={{ position: "absolute", left: 0, right: 0, top: 560, textAlign: "center", fontFamily: FONT, color: "#fff" }}>
          <div style={{ fontSize: 64, fontWeight: 700 }}>
            {"Әдебиетті бірге зерттейік!".split(" ").map((w, i) => { const p = spring({ frame: f - b1 - i * 3, fps: FPS, config: { damping: 13 } }); return <span key={i} style={{ display: "inline-block", margin: "0 12px", opacity: Math.min(1, p * 1.5), transform: `translateY(${(1 - p) * 50}px)` }}>{w}</span>; })}
          </div>
          <div style={{ marginTop: 16, fontSize: 52, fontWeight: 600, color: "#dfe8ff" }}>
            {"Сыныбыңызды бүгін ашыңыз".split(" ").map((w, i) => { const p = spring({ frame: f - b2 - i * 3, fps: FPS, config: { damping: 13 } }); return <span key={i} style={{ display: "inline-block", margin: "0 10px", opacity: Math.min(1, p * 1.5), transform: `translateY(${(1 - p) * 50}px)` }}>{w}</span>; })}
          </div>
          <div style={{ marginTop: 46, display: "inline-block", padding: "26px 60px", borderRadius: 999, background: C.gold, color: C.ink, fontSize: 60, fontWeight: 700, transform: `scale(${url * (1 + 0.03 * Math.sin(f / 6))})`, boxShadow: `0 0 0 ${10 + 8 * Math.sin(f / 6)}px rgba(255,184,0,.25), 0 20px 50px rgba(0,0,0,.35)` }}>adebietlab.vercel.app</div>
        </div>
        <Mascot size={300} style={{ position: "absolute", right: 110, bottom: 60 + Math.abs(Math.sin(f / 9)) * 20, transform: `translateX(${(1 - pop(f, b1, 20, 1.5)) * 600}px) rotate(${Math.sin(f / 7) * 8}deg)` }} />
        <Burst x={960} y={860} at={b2 + 20} n={30} />
        <div style={{ position: "absolute", left: 0, top: 34 }}><Ornament /></div>
        <div style={{ position: "absolute", left: 0, bottom: 34 }}><Ornament /></div>
      </AbsoluteFill>
      <AbsoluteFill style={{ background: NAVY, opacity: 1 - out }} />
    </Backdrop>
  );
}

// ---------- between scenes: gold, blue and violet bands sweep across ----------
type BandsProps = Record<string, never>;
function Bands({ children, presentationDirection, presentationProgress }: TransitionPresentationComponentProps<BandsProps>) {
  const p = Easing.inOut(Easing.cubic)(presentationProgress);
  if (presentationDirection === "exiting") return <AbsoluteFill style={{ transform: `translateX(${-p * 260}px) scale(${1 - 0.06 * p})` }}>{children}</AbsoluteFill>;
  const edge = (1 - p) * (W + 700) - 300; // the front of the sweep, moving right to left
  const slant = 260;
  const band = (off: number, color: string) => (
    <div style={{ position: "absolute", inset: 0, background: color, clipPath: `polygon(${edge + off}px 0, ${edge + off + 160}px 0, ${edge + off + 160 - slant}px ${H}px, ${edge + off - slant}px ${H}px)` }} />
  );
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ clipPath: `polygon(${edge + 480}px 0, ${W + 400}px 0, ${W + 400}px ${H}px, ${edge + 480 - slant}px ${H}px)` }}>{children}</AbsoluteFill>
      {band(0, C.gold)}{band(160, C.primary)}{band(320, C.blobA)}
    </AbsoluteFill>
  );
}
const bands = (): TransitionPresentation<BandsProps> => ({ component: Bands, props: {} });

// ---------- sound ----------
function sounds() {
  const list: { from: number; src: string; vol: number; len?: number }[] = [];
  SCENES.forEach((s, i) => {
    const at = STARTS[i];
    if (VO[s.id]) list.push({ from: at + LEAD, src: `vo/vo-${s.id}.mp3`, vol: 1 });
    if (i > 0) list.push({ from: at - 4, src: "sfx/whoosh.wav", vol: 0.4 });
    const ev = EVENTS[s.id];
    if (ev) {
      for (const c of ev.clicks) list.push({ from: at + c.f, src: "sfx/click.wav", vol: 0.7 });
      for (const k of ev.typing) list.push({ from: at + k.f, src: "sfx/typing.wav", vol: 0.32, len: k.len });
    }
    if (s.kind === "screen") list.push({ from: at + 2, src: "sfx/whoosh-soft.wav", vol: 0.35 });
    for (const n of s.notes ?? []) list.push({ from: at + frameAt(s.id)(n.beat, n.d) + 8, src: "sfx/pop.wav", vol: 0.4 });
    if (s.react) list.push({ from: at + frameAt(s.id)(s.react.beat, s.react.d), src: "sfx/boing.wav", vol: 0.5 });
  });
  const h = frameAt("01");
  list.push({ from: STARTS[0] + h(1), src: "sfx/hit.wav", vol: 0.8 });
  list.push({ from: STARTS[0] + h(2) + 22, src: "sfx/sparkle.wav", vol: 0.5 });
  const o = frameAt("16"), oi = SCENES.length - 1;
  list.push({ from: STARTS[oi] + o(2) + 20, src: "sfx/sparkle.wav", vol: 0.5 });
  const t = frameAt("15"), ti = SCENES.findIndex((s) => s.id === "15");
  for (const at of [LEAD + 18, t(1) + 14, t(2) + 14]) list.push({ from: STARTS[ti] + at, src: "sfx/ok.wav", vol: 0.35 });
  const ii = SCENES.findIndex((s) => s.id === "02"), b = frameAt("02");
  list.push({ from: STARTS[ii] + b(3), src: "sfx/pop.wav", vol: 0.5 });
  return list;
}
const SOUNDS = sounds();
const VOICE = SCENES.map((s, i) => (VO[s.id] ? { from: STARTS[i] + LEAD, to: STARTS[i] + LEAD + VO[s.id].dur * FPS } : null)).filter(Boolean) as { from: number; to: number }[];

/** Music under the voice, up in the gaps. */
function music(fr: number) {
  const near = Math.min(...VOICE.map((p) => (fr < p.from ? p.from - fr : fr > p.to ? fr - p.to : 0)));
  const bed = interpolate(near, [3, 16], [0.13, 0.34], clamp);
  return bed * interpolate(fr, [0, 10, TOTAL - 30, TOTAL], [0, 1, 1, 0], clamp);
}

export const promoLength = () => TOTAL;

export function Promo() {
  useFonts();
  return (
    <AbsoluteFill style={{ background: NAVY }}>
      <TransitionSeries>
        {SCENES.flatMap((s, i) => {
          const len = LENGTHS[i];
          const body = s.kind === "hook" ? <Hook len={len} /> : s.kind === "intro" ? <Intro /> : s.kind === "trust" ? <Trust /> : s.kind === "outro" ? <Outro len={len} /> : <ScreenScene s={s} len={len} />;
          const seq = <TransitionSeries.Sequence key={s.id} durationInFrames={len}>{body}</TransitionSeries.Sequence>;
          return i === 0 ? [seq] : [<TransitionSeries.Transition key={`t${s.id}`} presentation={bands()} timing={linearTiming({ durationInFrames: T })} />, seq];
        })}
      </TransitionSeries>
      <Audio src={staticFile("music.wav")} volume={music} />
      {SOUNDS.map((x, i) => (
        <Sequence key={i} from={Math.max(0, x.from)} durationInFrames={x.len}>
          <Audio src={staticFile(x.src)} volume={x.vol} />
        </Sequence>
      ))}
      <Progress />
    </AbsoluteFill>
  );
}

function Progress() {
  const f = useCurrentFrame();
  return <div style={{ position: "absolute", left: 0, bottom: 0, height: 6, width: `${(f / TOTAL) * 100}%`, background: `linear-gradient(90deg, ${C.gold}, #ffd866)` }} />;
}

