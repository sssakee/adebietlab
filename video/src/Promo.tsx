import { AbsoluteFill, Audio, interpolate, Sequence, staticFile, useCurrentFrame, Img, Easing } from "remotion";
import { TransitionSeries, linearTiming, type TransitionPresentation } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { wipe } from "@remotion/transitions/wipe";
import { FlaskConical, ShieldCheck, UserCheck, BookOpenCheck, Sparkles, Monitor, Smartphone, Moon, Download } from "lucide-react";
import type { ReactNode } from "react";
import voJson from "./vo.json";
import boxJson from "./boxes.json";
import { Burst, C, Chip, Count, Cursor, ease, FONT, FULL, HeroBg, SHOT_W, Mascot, Ornament, PageBg, Phone, PopOut, ShotView, useFonts, useIn, viewOf, mixView, Window, Words, type Box, type View } from "./ui";

const FPS = 30;
const T = 16; // transition overlap
const LEAD = 10; // the voice starts this many frames into a scene (after the transition)
const TAIL = 10; // breath after the last word

type Vo = { dur: number; beats: number[]; say: string[] };
const VO = voJson as Record<string, Vo>;
const BOXES = boxJson as Record<string, Record<string, Box>>;

// ---------- timeline language ----------

/** One camera move: at beat `at` (0 = the voice starts, n = the n-th {n} marker) plus `d` seconds. */
type Key = {
  at: number; d?: number; shot: string; url: string;
  look?: string | Box; // box to frame (name from boxes.json or a box in css px)
  fill?: number;
  pop?: string | Box; // lift this piece off the page
  cursor?: string | Box; // move the cursor here and click
  sfx?: string; burst?: boolean;
};
type Badge = { at: number; d?: number; text: string; num?: number };
type Scene = {
  id: string; min?: number; extra?: number; say?: string;
  kicker?: string; title?: string; part?: "Оқушыға" | "Мұғалімге";
  keys?: Key[]; badges?: Badge[]; mascot?: number;
  Custom?: (p: { len: number; beat: (n: number, d?: number) => number }) => ReactNode;
};

const box = (shot: string, b?: string | Box) => (typeof b === "string" ? BOXES[shot]?.[b] : b);
const frameAt = (id: string) => (n: number, d = 0) => LEAD + Math.round(((n === 0 ? 0 : VO[id]?.beats[n - 1] ?? 0) + d) * FPS);
const lengthOf = (s: Scene) => Math.max(s.min ?? 0, LEAD + Math.ceil((VO[s.id]?.dur ?? 3) * FPS) + TAIL + (s.extra ?? 0) + T);

// ---------- the screen stage ----------

// a wide window: the page fills almost the whole frame, cropped top-to-bottom rather than shrunk
const WIN_W = 1760;
const WIN_X = (1920 - WIN_W) / 2;
const WIN_Y = 122;
const BAR = 44;
const BODY_H = 1080 - WIN_Y - BAR - 24;
const VH = (SHOT_W * BODY_H) / WIN_W; // shot height visible at zoom 1
/** Without a look, frame the page without its side menu. */
const CONTENT: Box = { x: 290, y: 0, w: 1150, h: 480 };
const EASE = Easing.bezier(0.6, 0, 0.2, 1);

function Stage({ id, keys }: { id: string; keys: Key[] }) {
  const f = useCurrentFrame();
  const beat = frameAt(id);
  const at = keys.map((k) => beat(k.at, k.d));
  const views = keys.map((k) => viewOf(box(k.shot, k.look) ?? CONTENT, k.fill ?? 0.92, 2.3, VH, CONTENT.x));
  let i = 0;
  while (i + 1 < keys.length && f >= at[i + 1]) i++;
  const p = interpolate(f, [at[i], at[i] + 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE });
  const prev = i > 0 ? i - 1 : 0;
  const drift = 1 + 0.015 * Math.min(1, (f - at[i]) / 120); // slow push-in while holding
  const cur: View = keys[i].shot === keys[prev].shot ? mixView(views[prev], views[i], i === 0 ? 1 : p) : views[i];
  const view = { ...cur, z: cur.z * drift };
  const s = WIN_W / SHOT_W;
  const toScreen = (x: number, y: number) => ({ x: WIN_X + (x - view.ox) * view.z * s, y: WIN_Y + BAR + (y - view.oy) * view.z * s });
  const k = keys[i];
  const popBox = box(k.shot, k.pop);
  const pop = popBox ? interpolate(f, [at[i] + 10, at[i] + 26], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.back(1.4)) }) : 0;
  // cursor: glides from where it was to the target, clicks on arrival
  const tgt = box(k.shot, k.cursor);
  let cursor: ReactNode = null;
  if (tgt) {
    const lastTgt = [...keys.slice(0, i)].reverse().map((x) => box(x.shot, x.cursor)).find(Boolean);
    const end = toScreen(tgt.x + Math.min(tgt.w / 2, 60), tgt.y + tgt.h / 2);
    const from = lastTgt ? toScreen(lastTgt.x + Math.min(lastTgt.w / 2, 60), lastTgt.y + lastTgt.h / 2) : { x: end.x + 260, y: end.y + 220 };
    const m = interpolate(f, [at[i] + 4, at[i] + 22], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE });
    cursor = <Cursor x={from.x + (end.x - from.x) * m} y={from.y + (end.y - from.y) * m} click={interpolate(f, [at[i] + 22, at[i] + 36], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })} opacity={ease(f, at[i], at[i] + 6, 0, 1)} />;
  }
  const enter = useIn(0, 20);
  const changing = i > 0 && keys[i].shot !== keys[prev].shot;
  const burstAt = k.burst ? (() => { const b = box(k.shot, k.look) ?? { x: 720, y: 450, w: 0, h: 0 }; return toScreen(b.x + b.w / 2, b.y + b.h / 2); })() : null;
  return (
    <>
      <div style={{ position: "absolute", left: WIN_X, top: WIN_Y, transform: `translateY(${(1 - enter) * 160}px) scale(${0.94 + 0.06 * enter})`, opacity: Math.min(1, enter * 1.4), transformOrigin: "50% 0" }}>
        <Window url={k.url} width={WIN_W} height={BODY_H}>
          {changing && <ShotView src={keys[prev].shot} view={views[prev]} width={WIN_W} opacity={1 - p} />}
          <ShotView src={k.shot} view={view} width={WIN_W} opacity={changing ? p : 1} />
          <div style={{ position: "absolute", inset: 0, background: "rgba(11,31,77,.42)", opacity: pop }} />
          <div style={{ position: "absolute", top: -200, bottom: -200, width: 260, background: "linear-gradient(90deg, transparent, rgba(255,255,255,.35), transparent)", transform: `translateX(${ease(f, 8, 40, -400, WIN_W + 400)}px) rotate(14deg)` }} />
        </Window>
      </div>
      {popBox && pop > 0 && (
        <div style={{ position: "absolute", left: 0, right: 0, top: WIN_Y + BAR, height: BODY_H, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <PopOut src={k.shot} box={popBox} p={pop} maxW={1500} maxH={BODY_H - 140} />
        </div>
      )}
      {cursor}
      {burstAt && <Burst x={burstAt.x} y={burstAt.y} start={at[i] + 8} />}
    </>
  );
}

/** Kicker and title above the window; the title changes word by word. */
function Head({ kicker, title, part }: { kicker?: string; title?: string; part?: string }) {
  const f = useCurrentFrame();
  return (
    <div style={{ position: "absolute", left: WIN_X, right: WIN_X, top: 30, height: 80, display: "flex", alignItems: "center", gap: 22, fontFamily: FONT, color: C.ink }}>
      {kicker && <Chip style={{ fontSize: 22, opacity: useIn(2) }}>{kicker}</Chip>}
      {title && (
        <span style={{ position: "relative" }}>
          <Words text={title} delay={4} style={{ fontSize: 48, fontWeight: 700, letterSpacing: -1, whiteSpace: "nowrap" }} />
          <span style={{ position: "absolute", left: 0, right: 0, bottom: -6, height: 6, borderRadius: 3, background: C.gold, transformOrigin: "0 50%", transform: `scaleX(${ease(f, 14, 34, 0, 1)})` }} />
        </span>
      )}
      {part && <span style={{ marginLeft: "auto", fontSize: 22, fontWeight: 700, color: C.muted, opacity: useIn(8) }}>{part}</span>}
    </div>
  );
}

/** What is being said, under the window, piece by piece as the voice reaches each beat. */
function Subtitle({ id }: { id: string }) {
  const f = useCurrentFrame();
  const v = VO[id];
  if (!v) return null;
  const starts = v.say.length === v.beats.length ? v.beats : [0, ...v.beats];
  const beat = frameAt(id);
  const times = starts.map((t) => LEAD + Math.round(t * FPS));
  let i = -1;
  times.forEach((t, k) => { if (f >= t - 2) i = k; });
  const endF = beat(0) + v.dur * FPS + 6;
  if (i < 0 || f > endF) return null;
  const o = Math.min(ease(f, times[i] - 2, times[i] + 6, 0, 1), ease(f, endF - 6, endF, 1, 0));
  const text = v.say[i].replace(/Әдебиет Лаб/g, "ӘдебиетLab");
  return (
    <div style={{ position: "absolute", left: 0, right: 0, bottom: 34, display: "flex", justifyContent: "center", opacity: o }}>
      <span style={{ maxWidth: 1500, padding: "14px 30px", borderRadius: 18, background: "rgba(11,31,77,.86)", color: "#fff", fontFamily: FONT, fontSize: 34, fontWeight: 600, lineHeight: 1.25, textAlign: "center", boxShadow: "0 10px 30px rgba(0,0,0,.25)" }}>{text}</span>
    </div>
  );
}

function Badges({ id, badges }: { id: string; badges: Badge[] }) {
  const f = useCurrentFrame();
  const beat = frameAt(id);
  return (
    <div style={{ position: "absolute", right: 36, top: WIN_Y + 64, display: "flex", flexDirection: "column", gap: 16, alignItems: "flex-end" }}>
      {badges.map((b, i) => {
        const start = beat(b.at, b.d);
        const p = interpolate(f, [start, start + 14], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.back(1.6)) });
        return (
          <div key={i} style={{ opacity: p, transform: `scale(${0.6 + 0.4 * p}) rotate(${(1 - p) * -8}deg)`, padding: "16px 26px", borderRadius: 22, background: C.gold, color: C.ink, fontFamily: FONT, fontWeight: 700, fontSize: 30, boxShadow: "0 18px 40px rgba(11,31,77,.3)", display: "flex", alignItems: "baseline", gap: 10 }}>
            {b.num !== undefined && <span style={{ fontSize: 54, lineHeight: 1 }}><Count to={b.num} start={start} /></span>}
            {b.text}
          </div>
        );
      })}
    </div>
  );
}

/** Қырантай peeks in from the corner, with a word of his own. */
function Peek({ at, say }: { at: number; say?: string }) {
  const f = useCurrentFrame();
  const p = interpolate(f, [at, at + 16], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.back(1.5)) });
  const b = interpolate(f, [at + 12, at + 24], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.back(2)) });
  return (
    <>
      <Mascot size={210} style={{ position: "absolute", right: 30, bottom: -20 + (1 - p) * 260, transform: `rotate(${Math.sin(f / 9) * 4}deg)` }} />
      {say && <div style={{ position: "absolute", right: 200, bottom: 190, padding: "14px 24px", borderRadius: "26px 26px 4px 26px", background: C.white, color: C.ink, fontFamily: FONT, fontSize: 30, fontWeight: 700, boxShadow: "0 16px 36px rgba(11,31,77,.28)", border: `3px solid ${C.gold}`, opacity: b, transform: `scale(${0.5 + 0.5 * b})`, transformOrigin: "100% 100%" }}>{say}</div>}
    </>
  );
}

function ScreenScene({ s, len }: { s: Scene; len: number }) {
  const beat = frameAt(s.id);
  return (
    <PageBg>
      <Head kicker={s.kicker} title={s.title} part={s.part} />
      {s.keys && <Stage id={s.id} keys={s.keys} />}
      {s.Custom && <s.Custom len={len} beat={beat} />}
      {s.badges && <Badges id={s.id} badges={s.badges} />}
      {s.mascot !== undefined && <Peek at={beat(s.mascot)} say={s.say} />}
      <Subtitle id={s.id} />
    </PageBg>
  );
}

// ---------- the brand scenes ----------

const WALL = ["home", "olen-syll", "karta", "chat", "card-1", "map", "t-analytics", "zhattau-2", "baige", "creative-typed", "works", "t-create", "quiz-pick", "tarih", "egeri"];

function Hook({ len, beat }: { len: number; beat: (n: number, d?: number) => number }) {
  const f = useCurrentFrame();
  const b1 = beat(1), b2 = beat(2);
  const big = interpolate(f, [b2, b2 + 14], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.back(1.8)) });
  const logo = useIn(b2 + 34, 14);
  const q = ease(f, b1 - 4, b1 + 6, 1, 0);
  return (
    <AbsoluteFill style={{ background: C.navyDeep, overflow: "hidden" }}>
      {/* a slow wall of real screens behind everything */}
      <div style={{ position: "absolute", inset: -200, transform: "perspective(1600px) rotateX(24deg) rotateZ(-8deg)", opacity: 0.35 }}>
        {[0, 1, 2, 3].map((r) => (
          <div key={r} style={{ display: "flex", gap: 28, marginBottom: 28, transform: `translateX(${(r % 2 ? -1 : 1) * (f * 1.4) - 400 - r * 160}px)` }}>
            {[...WALL, ...WALL].slice(r * 3, r * 3 + 9).map((src, i) => <Img key={i} src={staticFile(`shots/${src}.png`)} style={{ width: 560, borderRadius: 16 }} />)}
          </div>
        ))}
      </div>
      <AbsoluteFill style={{ background: `radial-gradient(circle at 50% 45%, rgba(19,48,156,.55), ${C.navyDeep} 75%)` }} />
      <AbsoluteFill style={{ fontFamily: FONT, color: "#fff", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
        <div style={{ position: "absolute", top: 380, fontSize: 68, fontWeight: 700, opacity: q }}><Words text="Әдебиетті тек оқып шығу жеткілікті ме?" delay={LEAD} step={4} /></div>
        {f >= b1 - 2 && <div style={{ position: "absolute", top: 300, fontSize: 64, fontWeight: 700, transform: `translateY(${-logo * 60}px)` }}><Words text="Ал егер әр шығарманы" delay={b1 - 2} step={3} /></div>}
        <div style={{ position: "absolute", top: 390, fontSize: 190, fontWeight: 700, color: C.gold, letterSpacing: -4, opacity: Math.min(1, big * 2), transform: `scale(${0.4 + 0.6 * big}) translateY(${-logo * 50}px)` }}>зерттесек?</div>
        <div style={{ position: "absolute", top: 700, display: "flex", alignItems: "center", gap: 24, opacity: logo, transform: `translateY(${(1 - logo) * 40}px)` }}>
          <span style={{ width: 96, height: 96, borderRadius: 28, background: "#fff", display: "grid", placeItems: "center" }}><FlaskConical size={52} color={C.primary} /></span>
          <span style={{ fontSize: 84, fontWeight: 700 }}>Әдебиет<span style={{ color: C.gold }}>Lab</span></span>
        </div>
      </AbsoluteFill>
      <Burst x={960} y={500} start={b2 + 4} />
      <div style={{ position: "absolute", left: 0, bottom: 40 }}><Ornament width={1920 * ease(f, b2, b2 + 40, 0, 1)} /></div>
    </AbsoluteFill>
  );
}

function Devices({ beat }: { len: number; beat: (n: number, d?: number) => number }) {
  const f = useCurrentFrame();
  const ph = interpolate(f, [beat(2), beat(2) + 18], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.back(1.3)) });
  const dk = interpolate(f, [beat(2, 0.8), beat(2, 0.8) + 18], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const enter = useIn(0, 20);
  const chips: [typeof Monitor, string, number][] = [[Monitor, "Компьютерде", beat(2)], [Smartphone, "Телефонда", beat(2, 0.5)], [Moon, "Қараңғы режим", beat(2, 1.2)], [Download, "Орнатусыз", beat(3)]];
  return (
    <>
      <div style={{ position: "absolute", left: 150, top: 190, transform: `translateY(${(1 - enter) * 160}px) rotateY(${(1 - enter) * -10}deg)`, opacity: enter }}>
        <Window url="/oqushy" width={1180}><ShotView src="home" view={FULL} width={1180} /></Window>
      </div>
      <div style={{ position: "absolute", left: 1000, top: 300, opacity: dk, transform: `translateX(${(1 - dk) * 300}px) rotate(3deg)` }}>
        <Window url="/oqushy" width={760}><ShotView src="dark-home" view={FULL} width={760} /></Window>
      </div>
      <Phone src="phone-home" style={{ position: "absolute", left: 1420, top: 330, transform: `translateY(${(1 - ph) * 700}px) rotate(-4deg)` }} />
      <div style={{ position: "absolute", left: 150, top: 960, display: "flex", gap: 16 }}>
        {chips.map(([Icon, t, at]) => {
          const p = interpolate(f, [at, at + 12], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.back(1.8)) });
          return <Chip key={t} style={{ opacity: p, transform: `scale(${0.6 + 0.4 * p})`, fontSize: 26, padding: "12px 22px" }}><Icon size={26} /> {t}</Chip>;
        })}
      </div>
    </>
  );
}

function Trust({ beat }: { len: number; beat: (n: number, d?: number) => number }) {
  const f = useCurrentFrame();
  const items = [
    [Sparkles, "ЖИ — көмекші,", "шешім — мұғалімде", 0],
    [UserCheck, "Оқушыдан жеке дерек", "сұралмайды", 1],
    [BookOpenCheck, "Авторлық құқық", "сақталады", 2],
  ] as const;
  return (
    <HeroBg>
      <AbsoluteFill style={{ fontFamily: FONT, color: "#fff", alignItems: "center", justifyContent: "center", gap: 70 }}>
        <div style={{ fontSize: 70, fontWeight: 700 }}><Words text="Сенімді әрі қауіпсіз" delay={4} /></div>
        <div style={{ display: "flex", gap: 40 }}>
          {items.map(([Icon, a, b, n]) => {
            const st = beat(n);
            const p = interpolate(f, [st, st + 16], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.back(1.4)) });
            return (
              <div key={a} style={{ width: 480, minHeight: 330, padding: "44px 36px", borderRadius: 32, background: "rgba(255,255,255,.12)", border: "2px solid rgba(255,255,255,.28)", textAlign: "center", opacity: p, transform: `translateY(${(1 - p) * 80}px) rotateX(${(1 - p) * 40}deg)` }}>
                <span style={{ display: "inline-grid", placeItems: "center", width: 96, height: 96, borderRadius: 28, background: C.gold, transform: `rotate(${(1 - p) * -90}deg)` }}><Icon size={52} color={C.ink} /></span>
                <div style={{ marginTop: 28, fontSize: 38, fontWeight: 700, lineHeight: 1.2 }}>{a}<br /><span style={{ color: C.gold }}>{b}</span></div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
      <Subtitle id="15" />
    </HeroBg>
  );
}

function Outro({ len, beat }: { len: number; beat: (n: number, d?: number) => number }) {
  const f = useCurrentFrame();
  const url = interpolate(f, [beat(1) + 10, beat(1) + 26], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.back(1.6)) });
  const out = ease(f, len - 24, len, 1, 0);
  return (
    <HeroBg>
      <AbsoluteFill style={{ fontFamily: FONT, color: "#fff", alignItems: "center", justifyContent: "center", gap: 40, opacity: out }}>
        <div style={{ display: "flex", alignItems: "center", gap: 28, transform: `scale(${0.8 + 0.2 * useIn(4, 12)})` }}>
          <span style={{ width: 130, height: 130, borderRadius: 36, background: "#fff", display: "grid", placeItems: "center", transform: `rotate(${Math.sin(f / 14) * 4}deg)` }}><FlaskConical size={72} color={C.primary} /></span>
          <span style={{ fontSize: 130, fontWeight: 700, letterSpacing: -2 }}>Әдебиет<span style={{ color: C.gold }}>Lab</span></span>
        </div>
        <div style={{ fontSize: 58, fontWeight: 600 }}><Words text="Сыныбыңызды бүгін ашыңыз!" delay={beat(1)} step={4} /></div>
        <div style={{ transform: `scale(${0.6 + 0.4 * url}) translateY(${Math.sin(f / 10) * 3}px)`, opacity: url }}>
          <span style={{ display: "inline-block", padding: "24px 54px", borderRadius: 999, background: C.gold, color: C.ink, fontSize: 54, fontWeight: 700, boxShadow: "0 16px 40px rgba(0,0,0,.25)" }}>adebietlab.vercel.app</span>
        </div>
      </AbsoluteFill>
      <Burst x={960} y={790} start={beat(1) + 22} />
      <Mascot size={260} style={{ position: "absolute", right: 140, bottom: 70 + Math.sin(f / 12) * 8, opacity: out, transform: `translateX(${(1 - useIn(beat(1))) * 500}px)` }} />
      <div style={{ position: "absolute", top: 36, left: 0 }}><Ornament opacity={0.9} /></div>
    </HeroBg>
  );
}

// ---------- the film ----------

// manual frames where a captured box is only a heading row
const B = {
  homeTop: { x: 800, y: 20, w: 620, h: 230 }, hero: { x: 300, y: 20, w: 1115, h: 250 },
  olenLines: { x: 300, y: 95, w: 760, h: 395 }, kartaMap: { x: 300, y: 95, w: 640, h: 560 },
  suhbatChat: { x: 300, y: 140, w: 780, h: 470 }, verse: { x: 620, y: 180, w: 800, h: 560 },
  baigeTop: { x: 300, y: 155, w: 1115, h: 250 }, board: { x: 300, y: 440, w: 1115, h: 290 },
  quizQ: { x: 300, y: 180, w: 1115, h: 330 }, tarihLine: { x: 300, y: 130, w: 1115, h: 560 },
};

const SCENES: Scene[] = [
  { id: "01", extra: 50, Custom: Hook },
  { id: "02", kicker: "Танысыңыз", title: "ӘдебиетLab — қазақ әдебиетінің веб-зертханасы", Custom: Devices },
  { id: "03", kicker: "Кіру", title: "Бастау — бір минуттық іс", keys: [
    { at: 0, shot: "t-classes", url: "/mugalim/synyptar" },
    { at: 1, shot: "t-classes", url: "/mugalim/synyptar", look: "code", pop: "code", sfx: "pop" },
    { at: 2, shot: "kiru-filled", url: "/kiru", look: { x: 300, y: 360, w: 620, h: 420 } },
    { at: 2, d: 1.2, shot: "kiru-filled", url: "/kiru", look: { x: 300, y: 360, w: 620, h: 420 }, cursor: "go" },
  ], badges: [{ at: 1, d: 0.8, num: 6, text: "таңбалы код" }, { at: 3, text: "🔒 Телефон да, пошта да керек емес" }] },
  { id: "04", kicker: "Оқушыға", title: "Әр оқушының өз кабинеті", part: "Оқушыға", keys: [
    { at: 0, shot: "home", url: "/oqushy" },
    { at: 1, shot: "home", url: "/oqushy", look: B.homeTop },
    { at: 2, shot: "achievements", url: "/oqushy/zhetistikter", look: B.hero },
    { at: 3, shot: "home-plan", url: "/oqushy", look: "plan", fill: 0.9 },
  ], badges: [{ at: 2, text: "Балапан → Қанаттанған → Қыран" }] },
  { id: "05", kicker: "Кітапхана", title: "Шығарма мен сөздік", part: "Оқушыға", keys: [
    { at: 0, shot: "works-search", url: "/oqushy/shygarmalar", look: { x: 300, y: 250, w: 1115, h: 600 } },
    { at: 1, shot: "work", url: "/oqushy/shygarmalar/abai-qys", look: "about", cursor: "word" },
    { at: 2, shot: "work-word", url: "/oqushy/shygarmalar/abai-qys", pop: "pop", sfx: "pop" },
    { at: 3, shot: "work-word-added", url: "/oqushy/shygarmalar/abai-qys", pop: "pop", sfx: "ok" },
  ], badges: [{ at: 0, d: 0.6, num: 36, text: "шығарма" }] },
  { id: "06", kicker: "Өлең өлшегіш", title: "Буын мен ұйқас — бір басумен", part: "Оқушыға", keys: [
    { at: 0, shot: "olen", url: "/oqushy/zertkhana/olen/abai-qys", cursor: "show" },
    { at: 1, shot: "olen-syll", url: "/oqushy/zertkhana/olen/abai-qys", look: B.olenLines, sfx: "step" },
    { at: 2, shot: "olen-ok", url: "/oqushy/zertkhana/olen/abai-qys", look: "quiz", sfx: "ok", burst: true },
  ], mascot: 2, say: "Жарайсың!" },
  { id: "07", kicker: "Талдау құралдары", title: "Байланыс, болжам, сюжет", part: "Оқушыға", keys: [
    { at: 1, shot: "karta", url: "/oqushy/zertkhana/karta/kozy-korpesh", look: B.kartaMap },
    { at: 2, shot: "egeri", url: "/oqushy/zertkhana/karta/kozy-korpesh", look: "card", fill: 0.9 },
    { at: 3, shot: "zheli", url: "/oqushy/zertkhana/zheli/kozy-korpesh", look: "list" },
  ], badges: [{ at: 1, d: 1.2, text: "Табылған байланыс: 4 / 6" }] },
  { id: "08", kicker: "ЖИ-мен бірге", title: "Абаймен сөйлесіп көр", part: "Оқушыға", keys: [
    { at: 0, shot: "suhbat", url: "/oqushy/suhbat", cursor: "q" },
    { at: 1, shot: "suhbat-answer", url: "/oqushy/suhbat", look: B.suhbatChat, sfx: "send" },
    { at: 2, shot: "chat-open", url: "/oqushy/shygarmalar/abai-qys", look: "panel", fill: 0.95 },
    { at: 3, shot: "chat", url: "/oqushy/shygarmalar/abai-qys", look: "panel", pop: { x: 980, y: 12, w: 448, h: 300 }, sfx: "pop" },
  ], badges: [{ at: 1, d: 0.6, num: 38, text: "кейіпкер" }], mascot: 2, say: "Өзің ойлап көр!" },
  { id: "09", kicker: "Шығармашылық зертхана", title: "Өз нұсқаңды жаз", part: "Оқушыға", keys: [
    { at: 1, shot: "creative-typed", url: "/oqushy/shygarmashylyq/kozy-korpesh", look: "text", fill: 0.9 },
    { at: 2, shot: "creative-fb", url: "/oqushy/shygarmashylyq/kozy-korpesh", look: { x: 320, y: 530, w: 510, h: 215 }, pop: { x: 320, y: 530, w: 510, h: 215 }, sfx: "pop" },
    { at: 3, shot: "creative-typed", url: "/oqushy/shygarmashylyq/kozy-korpesh", look: "text", cursor: "voice" },
  ], badges: [{ at: 2, d: 0.4, text: "3 критерий · 0–2 балл" }, { at: 3, d: 0.4, text: "🎙 Дауыспен айту" }] },
  { id: "10", kicker: "Жаттау мен бөлісу", title: "Жатта, жаса, бөліс", part: "Оқушыға", keys: [
    { at: 0, shot: "zhattau-0", url: "/oqushy/zhattau", look: B.verse },
    { at: 0, d: 0.5, shot: "zhattau-1", url: "/oqushy/zhattau", look: B.verse, sfx: "tick" },
    { at: 0, d: 1.0, shot: "zhattau-2", url: "/oqushy/zhattau", look: B.verse, sfx: "tick" },
    { at: 0, d: 1.5, shot: "zhattau-3", url: "/oqushy/zhattau", look: B.verse, sfx: "tick" },
    { at: 0, d: 2.0, shot: "zhattau-4", url: "/oqushy/zhattau", look: B.verse, sfx: "tick" },
    { at: 1, shot: "card-0", url: "/oqushy/kartochka", look: "canvas", fill: 0.92 },
    { at: 1, d: 0.6, shot: "card-1", url: "/oqushy/kartochka", look: "canvas", fill: 0.92 },
    { at: 1, d: 1.2, shot: "card-2", url: "/oqushy/kartochka", look: "canvas", fill: 0.92 },
    { at: 2, shot: "card-3", url: "/oqushy/kartochka", cursor: "share" },
  ], badges: [{ at: 0, d: 0.3, num: 5, text: "деңгей" }] },
  { id: "11", kicker: "Әдебиет әлемі", title: "Карта мен тарих", part: "Оқушыға", keys: [
    { at: 0, shot: "map", url: "/oqushy/adebi-karta", look: "map", fill: 0.95 },
    { at: 2, shot: "tarih", url: "/oqushy/tarih", look: B.tarihLine },
  ], badges: [{ at: 2, d: 0.5, num: 12, text: "дәуір" }] },
  { id: "12", kicker: "Бәйге", title: "Оқу — қызықты жарыс", part: "Оқушыға", keys: [
    { at: 0, shot: "quiz-pick", url: "/oqushy/baige/kozy-korpesh", look: B.quizQ, cursor: "pick" },
    { at: 1, shot: "baige", url: "/oqushy/baige", look: B.baigeTop },
    { at: 2, shot: "baige", url: "/oqushy/baige", look: B.board, sfx: "sparkle" },
  ] },
  { id: "13", kicker: "Мұғалімге", title: "Тапсырма — бірнеше минутта", part: "Мұғалімге", keys: [
    { at: 0, shot: "t-create", url: "/mugalim/zhasau" },
    { at: 1, shot: "t-create", url: "/mugalim/zhasau", look: "material", fill: 0.75 },
    { at: 2, shot: "t-create-methods", url: "/mugalim/zhasau", look: { x: 940, y: 200, w: 480, h: 560 }, cursor: "go" },
    { at: 3, shot: "t-new-set", url: "/mugalim/bank", look: { x: 300, y: 60, w: 1115, h: 560 }, cursor: "approve" },
    { at: 4, shot: "t-assign", url: "/mugalim/bank", look: "form", pop: "form", sfx: "pop" },
  ], badges: [{ at: 2, d: 0.6, text: "Блум · Венн · Синквейн · Тест" }, { at: 2, d: 1.3, text: "A · B · C деңгей" }] },
  { id: "14", kicker: "Нәтиже", title: "Сынып қайда қиналды?", part: "Мұғалімге", keys: [
    { at: 1, shot: "t-results", url: "/mugalim/natizheler", look: "table", sfx: "ok" },
    { at: 2, shot: "t-grade", url: "/mugalim/natizheler", look: { x: 300, y: 555, w: 1115, h: 345 } },
    { at: 3, shot: "t-analytics", url: "/mugalim/analitika", look: { x: 300, y: 270, w: 1115, h: 330 } },
  ], badges: [{ at: 1, d: 0.6, text: "Excel-ге (CSV)" }] },
  { id: "15", Custom: Trust },
  { id: "16", extra: 60, Custom: Outro },
];

const lengths = SCENES.map(lengthOf);
export const promoLength = () => lengths.reduce((a, b) => a + b, 0) - T * (SCENES.length - 1);
const starts = lengths.map((_, i) => lengths.slice(0, i).reduce((a, b) => a + b, 0) - T * i);

/** Every sound with its frame: the voice, a whoosh on each cut, the clicks and pops of the scenes. */
function sounds() {
  const list: { from: number; src: string; vol: number }[] = [];
  SCENES.forEach((s, i) => {
    const beat = frameAt(s.id);
    if (VO[s.id]) list.push({ from: starts[i] + LEAD, src: `vo/vo-${s.id}.mp3`, vol: 1 });
    if (i > 0) list.push({ from: starts[i] - 6, src: "sfx/whoosh.wav", vol: 0.35 });
    for (const k of s.keys ?? []) {
      const at = starts[i] + beat(k.at, k.d);
      if (k.sfx) list.push({ from: at + (k.pop ? 10 : 0), src: `sfx/${k.sfx}.wav`, vol: 0.5 });
      if (k.cursor) list.push({ from: at + 22, src: "sfx/tap.wav", vol: 0.6 });
    }
    for (const b of s.badges ?? []) list.push({ from: starts[i] + beat(b.at, b.d), src: "sfx/pop.wav", vol: 0.3 });
  });
  list.push({ from: starts[0] + frameAt("01")(2), src: "sfx/sparkle.wav", vol: 0.5 });
  list.push({ from: starts[15] + frameAt("16")(1) + 22, src: "sfx/sparkle.wav", vol: 0.5 });
  return list;
}
const SOUNDS = sounds();
const voice = SOUNDS.filter((x) => x.src.startsWith("vo/")).map((x) => ({ from: x.from, to: x.from + VO[x.src.slice(6, 8)].dur * FPS }));

/** Music under the voice, a little up in the gaps. */
function music(fr: number, total: number) {
  const near = Math.min(...voice.map((p) => (fr < p.from ? p.from - fr : fr > p.to ? fr - p.to : 0)));
  const bed = interpolate(near, [4, 20], [0.16, 0.38], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return bed * interpolate(fr, [0, 20, total - 60, total], [0, 1, 1, 0], { extrapolateRight: "clamp" });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const transitions: TransitionPresentation<any>[] = [slide({ direction: "from-right" }), wipe({ direction: "from-left" }), slide({ direction: "from-bottom" }), fade()];

export function Promo() {
  useFonts();
  const total = promoLength();
  return (
    <AbsoluteFill style={{ background: C.navyDeep }}>
      <TransitionSeries>
        {SCENES.flatMap((s, i) => {
          const seq = (
            <TransitionSeries.Sequence key={s.id} durationInFrames={lengths[i]}>
              {s.keys || s.title ? <ScreenScene s={s} len={lengths[i]} /> : s.Custom && <s.Custom len={lengths[i]} beat={frameAt(s.id)} />}
            </TransitionSeries.Sequence>
          );
          if (i === 0) return [seq];
          const tr = ["02", "15", "16"].includes(s.id) ? transitions[3] : transitions[i % transitions.length];
          return [<TransitionSeries.Transition key={`t${s.id}`} presentation={tr} timing={linearTiming({ durationInFrames: T })} />, seq];
        })}
      </TransitionSeries>
      <Audio src={staticFile("music.wav")} volume={(fr) => music(fr, total)} />
      {SOUNDS.map((x, i) => (
        <Sequence key={i} from={Math.max(0, x.from)}>
          <Audio src={staticFile(x.src)} volume={x.vol} />
        </Sequence>
      ))}
      <Progress total={total} />
    </AbsoluteFill>
  );
}

function Progress({ total }: { total: number }) {
  const f = useCurrentFrame();
  return <div style={{ position: "absolute", left: 0, bottom: 0, height: 6, width: `${(f / total) * 100}%`, background: C.gold }} />;
}
