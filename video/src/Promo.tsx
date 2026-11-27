import { AbsoluteFill, Audio, interpolate, Sequence, staticFile, useCurrentFrame } from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { FlaskConical, ShieldCheck, UserCheck, BookOpenCheck, Sparkles, Check } from "lucide-react";
import type { ReactNode } from "react";
import vo from "./vo.json";
import { Browser, C, Chip, ease, FONT, HeroBg, Mascot, Ornament, PageBg, Phone, Rise, useFonts, useIn, type Box } from "./ui";

const FPS = 30;
const T = 15; // transition overlap, frames

type SceneProps = { len: number };
type Scene = { id: string; base: number; Comp: (p: SceneProps) => ReactNode };

/** Voiceover lengths in seconds (scripts/vo.ts writes them); a scene never ends before its line does. */
const voLen = vo as Record<string, number>;
const lengthOf = (s: Scene) => Math.max(s.base, voLen[s.id] ? Math.ceil((voLen[s.id] + 0.9) * FPS) + T : 0);

// ---------- shared layout ----------

function Side({ kicker, title, children, delay = 0 }: { kicker: string; title: ReactNode; children?: ReactNode; delay?: number }) {
  return (
    <div style={{ position: "absolute", left: 96, top: 0, bottom: 0, width: 560, display: "flex", flexDirection: "column", justifyContent: "center", gap: 28, fontFamily: FONT, color: C.ink }}>
      <Rise delay={delay}><Chip>{kicker}</Chip></Rise>
      <Rise delay={delay + 5}><div style={{ fontSize: 60, fontWeight: 700, lineHeight: 1.08, letterSpacing: -1 }}>{title}</div></Rise>
      {children}
    </div>
  );
}

function Bullet({ children, delay, active = true }: { children: ReactNode; delay: number; active?: boolean }) {
  return (
    <Rise delay={delay} y={24}>
      <div style={{ display: "flex", gap: 16, alignItems: "flex-start", fontSize: 30, fontWeight: 500, lineHeight: 1.3, color: active ? C.ink : C.muted, opacity: active ? 1 : 0.55, transition: "none" }}>
        <span style={{ flexShrink: 0, marginTop: 4, width: 32, height: 32, borderRadius: 10, background: active ? C.primary : C.line, display: "grid", placeItems: "center" }}>
          <Check size={20} color="#fff" strokeWidth={3} />
        </span>
        <span>{children}</span>
      </div>
    </Rise>
  );
}

/** Numbered step that lights up while it is the current one. */
function Step({ n, children, delay, on }: { n: number; children: ReactNode; delay: number; on: number }) {
  return (
    <Rise delay={delay} y={24}>
      <div style={{ display: "flex", gap: 18, alignItems: "center", padding: "16px 20px", borderRadius: 20, background: `rgba(255,255,255,${0.4 + 0.6 * on})`, border: `2px solid ${on > 0.5 ? C.primary : C.line}`, transform: `scale(${1 + 0.03 * on})`, transformOrigin: "left center", boxShadow: on > 0.5 ? "0 12px 30px rgba(15,92,242,.18)" : "none" }}>
        <span style={{ flexShrink: 0, width: 46, height: 46, borderRadius: 14, background: on > 0.5 ? C.primary : C.soft, color: on > 0.5 ? "#fff" : C.primary, display: "grid", placeItems: "center", fontSize: 26, fontWeight: 700 }}>{n}</span>
        <span style={{ fontSize: 28, fontWeight: 600, lineHeight: 1.25 }}>{children}</span>
      </div>
    </Rise>
  );
}

/** Device stage on the right: enters with a gentle tilt and keeps drifting a little. */
function Stage({ children, delay = 4 }: { children: ReactNode; delay?: number }) {
  const p = useIn(delay, 22);
  const f = useCurrentFrame();
  return (
    <div style={{ position: "absolute", left: 680, top: 0, bottom: 0, width: 1180, display: "flex", alignItems: "center", perspective: 2400 }}>
      <div style={{ opacity: Math.min(1, p * 1.5), transform: `translateX(${(1 - p) * 120}px) rotateY(${(1 - p) * -14 - 2 + Math.sin(f / 90) * 0.6}deg) translateY(${Math.sin(f / 70) * 4}px)`, transformOrigin: "left center", position: "relative" }}>
        {children}
      </div>
    </div>
  );
}

/** Cross-fades between shots inside one browser at the given frames. */
function Shots({ items }: { items: { from: number; node: ReactNode }[] }) {
  const f = useCurrentFrame();
  return (
    <div style={{ position: "relative", width: 1180, height: 738 }}>
      {items.map((it, i) => {
        const next = items[i + 1]?.from;
        const out = next === undefined ? 1 : ease(f, next, next + 12, 1, 0);
        const o = i === 0 ? out : Math.min(ease(f, it.from, it.from + 12, 0, 1), out);
        return <div key={i} style={{ position: "absolute", inset: 0, opacity: o }}>{it.node}</div>;
      })}
    </div>
  );
}

const pan = (f: number, from: number, to: number, a: number, b: number) => ease(f, from, to, a, b);

// ---------- scenes ----------

function Intro({ len }: SceneProps) {
  const f = useCurrentFrame();
  const word = useIn(32, 12);
  const logo = useIn(78, 16);
  const up = ease(f, 70, 95, 0, 1);
  return (
    <HeroBg>
      <AbsoluteFill style={{ fontFamily: FONT, color: "#fff", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
        <div style={{ transform: `translateY(${-up * 110}px) scale(${1 - up * 0.25})` }}>
          <Rise delay={6}><div style={{ fontSize: 76, fontWeight: 700, letterSpacing: -1 }}>Әдебиетті оқып қана қоймай —</div></Rise>
          <div style={{ fontSize: 170, fontWeight: 700, color: C.gold, letterSpacing: -3, lineHeight: 1.1, opacity: Math.min(1, word * 2), transform: `scale(${0.6 + 0.4 * word})` }}>зерттейік</div>
        </div>
        <div style={{ position: "absolute", top: 640, display: "flex", alignItems: "center", gap: 24, opacity: logo, transform: `translateY(${(1 - logo) * 40}px)` }}>
          <span style={{ width: 96, height: 96, borderRadius: 28, background: "#fff", display: "grid", placeItems: "center" }}><FlaskConical size={52} color={C.primary} /></span>
          <span style={{ fontSize: 84, fontWeight: 700 }}>Әдебиет<span style={{ color: C.gold }}>Lab</span></span>
        </div>
      </AbsoluteFill>
      <Mascot size={300} style={{ position: "absolute", right: 140, bottom: 70 + Math.sin(f / 12) * 6, transform: `translateX(${(1 - useIn(90)) * 500}px) rotate(${Math.sin(f / 18) * 3}deg)` }} />
      <div style={{ position: "absolute", inset: 0, background: C.navyDeep, opacity: ease(f, 0, 12, 1, 0) * (len > 0 ? 1 : 0) }} />
    </HeroBg>
  );
}

function What({ len }: SceneProps) {
  const f = useCurrentFrame();
  return (
    <PageBg>
      <Side kicker="ӘдебиетLab деген не?" title={<>Қазақ әдебиетінің <span style={{ color: C.primary }}>ЖИ-мен</span> жұмыс істейтін веб-зертханасы</>}>
        <Bullet delay={22}>5–11-сынып оқушылары мен мұғалімдерге</Bullet>
        <Bullet delay={30}>Компьютерде де, телефонда да</Bullet>
        <Bullet delay={38}>Ештеңе орнатудың қажеті жоқ</Bullet>
      </Side>
      <Stage>
        <Browser src="st-home-full" url="/oqushy" scroll={pan(f, 30, len - 10, 0, 420)} />
        <Phone src="phone-home" style={{ position: "absolute", right: -40, bottom: -150, transform: `translateY(${(1 - useIn(40, 16)) * 400}px) rotate(4deg)` }} />
      </Stage>
    </PageBg>
  );
}

const CODE: Box = { x: 1132, y: 448, w: 268, h: 52 };
const STUDENT_FORM: Box = { x: 180, y: 548, w: 530, h: 352 };

function Login({ len }: SceneProps) {
  const f = useCurrentFrame();
  const a = Math.round(len * 0.33), b = Math.round(len * 0.55);
  const on = (from: number, to: number) => Math.min(ease(f, from, from + 8, 0, 1), ease(f, to, to + 8, 1, 0));
  return (
    <PageBg>
      <Side kicker="Бастау оңай" title="Үш қадам">
        <Step n={1} delay={14} on={on(14, a)}>Мұғалім поштамен тіркеледі</Step>
        <Step n={2} delay={20} on={on(a, b)}>Сынып ашып, 6 таңбалы код алады</Step>
        <Step n={3} delay={26} on={on(b, len + 99)}>Оқушы код, аты және PIN-мен кіреді</Step>
        <Rise delay={b + 20} y={20}><Chip color="#007a46" bg={C.greenSoft}><ShieldCheck size={26} /> Телефон да, пошта да сұралмайды</Chip></Rise>
      </Side>
      <Stage>
        <Shots items={[
          { from: 0, node: <Browser src="kiru-empty" url="/kiru" zoom={ease(f, 10, a, 1, 1.25)} focus={{ x: 1000, y: 600 }} /> },
          { from: a, node: <Browser src="t-classes" url="/mugalim/synyptar" ring={CODE} ringOn={ease(f, a + 18, a + 30, 0, 1)} zoom={ease(f, a + 10, b, 1, 1.15)} focus={{ x: 1260, y: 470 }} /> },
          { from: b, node: <Browser src="kiru" url="/kiru" ring={STUDENT_FORM} ringOn={ease(f, b + 18, b + 30, 0, 1)} scroll={ease(f, b, b + 40, 0, 0)} zoom={ease(f, b + 10, len, 1, 1.1)} focus={{ x: 440, y: 720 }} /> },
        ]} />
      </Stage>
    </PageBg>
  );
}

function Library({ len }: SceneProps) {
  const f = useCurrentFrame();
  const a = Math.round(len * 0.55);
  return (
    <PageBg>
      <Side kicker="Шығармалар кітапханасы" title={<>30-дан астам <span style={{ color: C.primary }}>шығарма</span></>}>
        <Bullet delay={18}>Іздеу, сынып пен жанр сүзгісі</Bullet>
        <Bullet delay={26}>Қысқаша мазмұн, қиын сөздің түсіндірмесі</Bullet>
        <Bullet delay={34}>Толық мәтін — сенімді кітапханада</Bullet>
      </Side>
      <Stage>
        <Shots items={[
          { from: 0, node: <Browser src="works" url="/oqushy/shygarmalar" scroll={pan(f, 15, a + 10, 0, 900)} /> },
          { from: a, node: <Browser src="work" url="/oqushy/shygarmalar/abai-qys" zoom={ease(f, a, len, 1.02, 1.3)} focus={{ x: 600, y: 560 }} /> },
        ]} />
      </Stage>
    </PageBg>
  );
}

function Tools({ len }: SceneProps) {
  const f = useCurrentFrame();
  const a = Math.round(len * 0.36), b = Math.round(len * 0.68);
  const on = (from: number, to: number) => Math.min(ease(f, from, from + 8, 0, 1), ease(f, to, to + 8, 1, 0));
  return (
    <PageBg>
      <Side kicker="Зертхана құралдары" title={<>Оқушы <span style={{ color: C.primary }}>зерттейді</span></>}>
        <Step n={1} delay={14} on={on(10, a)}>Өлең өлшегіш: буын мен ұйқас</Step>
        <Step n={2} delay={20} on={on(a, b)}>Кейіпкер картасы: байланыс пен дәлел</Step>
        <Step n={3} delay={26} on={on(b, len + 99)}>Оқиға желісі: сюжет элементтері</Step>
        <Rise delay={40} y={20}><Chip color="#007a46" bg={C.greenSoft}><Check size={26} /> ЖИ-сіз, ережемен тексеріледі</Chip></Rise>
      </Side>
      <Stage>
        <Shots items={[
          { from: 0, node: <Browser src="olen" url="/oqushy/zertkhana/olen/abai-qys" zoom={ease(f, 10, a, 1, 1.35)} focus={{ x: 640, y: 330 }} /> },
          { from: a, node: <Browser src="karta" url="/oqushy/zertkhana/karta/kozy-korpesh" zoom={ease(f, a, b, 1, 1.3)} focus={{ x: 700, y: 300 }} /> },
          { from: b, node: <Browser src="zheli" url="/oqushy/zertkhana/zheli/kozy-korpesh" zoom={ease(f, b, len, 1, 1.25)} focus={{ x: 500, y: 300 }} /> },
        ]} />
      </Stage>
    </PageBg>
  );
}

function Ai({ len }: SceneProps) {
  const f = useCurrentFrame();
  const a = Math.round(len * 0.5);
  return (
    <PageBg>
      <Side kicker="ЖИ көмекші" title={<>Абаймен <span style={{ color: C.primary }}>сөйлесіп</span> көр</>}>
        <Bullet delay={18}>Кейіпкермен сұхбат: тек шығарма мазмұнына сүйенеді</Bullet>
        <Bullet delay={a}>Қырантай дайын жауапты емес, бағытты береді</Bullet>
      </Side>
      <Stage>
        <Shots items={[
          { from: 0, node: <Browser src="suhbat" url="/oqushy/suhbat" zoom={ease(f, 10, a, 1, 1.3)} focus={{ x: 640, y: 300 }} /> },
          { from: a, node: <Browser src="chat" url="/oqushy/shygarmalar/abai-qys" zoom={ease(f, a, len, 1, 1.3)} focus={{ x: 1200, y: 180 }} /> },
        ]} />
      </Stage>
    </PageBg>
  );
}

function Games({ len }: SceneProps) {
  const f = useCurrentFrame();
  const cards = [["baige", "Бәйге: викторина мен рейтинг", -7], ["kartochka", "Цитата карточкасы", 0], ["sozdik", "Сөздік", 7]] as const;
  return (
    <PageBg>
      <div style={{ position: "absolute", top: 90, width: "100%", textAlign: "center", fontFamily: FONT, color: C.ink }}>
        <Rise><Chip>Оқу — қызықты ойын</Chip></Rise>
        <Rise delay={5}><div style={{ fontSize: 64, fontWeight: 700, marginTop: 22 }}>Бәйге · Тізбек · Рейтинг</div></Rise>
      </div>
      {cards.map(([src, label, rot], i) => {
        const p = useIn(12 + i * 7, 16);
        const drift = ease(f, 0, len, 0, 1);
        return (
          <div key={src} style={{ position: "absolute", left: 120 + i * 570, top: 340, width: 540, transform: `translateY(${(1 - p) * 500 - drift * 20}px) rotate(${rot * p}deg)`, opacity: Math.min(1, p * 1.5) }}>
            <Browser src={src} url="" width={540} height={338} />
            <div style={{ marginTop: 26, textAlign: "center", fontFamily: FONT, fontSize: 30, fontWeight: 700, color: C.ink }}>{label}</div>
          </div>
        );
      })}
    </PageBg>
  );
}

function Teacher({ len }: SceneProps) {
  const f = useCurrentFrame();
  const a = Math.round(len * 0.4), b = Math.round(len * 0.68);
  const on = (from: number, to: number) => Math.min(ease(f, from, from + 8, 0, 1), ease(f, to, to + 8, 1, 0));
  return (
    <PageBg>
      <Side kicker="Мұғалімге" title={<>Тапсырма — <span style={{ color: C.primary }}>бірнеше минутта</span></>}>
        <Step n={1} delay={14} on={on(10, a)}>Материал жүктейсіз не шығарма таңдайсыз</Step>
        <Step n={2} delay={20} on={on(a, b)}>ЖИ деңгейлік тапсырма құрады</Step>
        <Step n={3} delay={26} on={on(b, len + 99)}>Сіз тексеріп, бекітесіз</Step>
        <Rise delay={b + 10} y={20}>
          <div style={{ fontSize: 22, fontWeight: 600, color: C.muted, marginBottom: 10 }}>ЖИ режимін өзіңіз таңдайсыз:</div>
          <div style={{ display: "flex", gap: 10 }}>
            <Chip style={{ fontSize: 21 }}>ЖИ-сіз</Chip><Chip style={{ fontSize: 21 }}>Шектеулі</Chip><Chip style={{ fontSize: 21 }}>Рұқсат етілген</Chip>
          </div>
        </Rise>
      </Side>
      <Stage>
        <Shots items={[
          { from: 0, node: <Browser src="t-create" url="/mugalim/zhasau" scroll={pan(f, 20, a + 10, 0, 520)} /> },
          { from: a, node: <Browser src="t-set" url="/mugalim/bank" scroll={pan(f, a, b + 10, 0, 700)} /> },
          { from: b, node: <Browser src="t-bank" url="/mugalim/bank" zoom={ease(f, b, len, 1, 1.25)} focus={{ x: 700, y: 400 }} /> },
        ]} />
      </Stage>
    </PageBg>
  );
}

function Analytics({ len }: SceneProps) {
  const f = useCurrentFrame();
  const a = Math.round(len * 0.45);
  return (
    <PageBg>
      <Side kicker="Нәтиже мен аналитика" title={<>Сынып қайда <span style={{ color: C.primary }}>қиналды?</span></>}>
        <Bullet delay={18}>Жабық сұрақтар бірден тексеріледі</Bullet>
        <Bullet delay={26}>Ашық жауапқа ЖИ ұсыныс береді — балды мұғалім қояды</Bullet>
        <Bullet delay={a}>Қай шығарма мен қай дағды қиын — бір қарағанда</Bullet>
      </Side>
      <Stage>
        <Shots items={[
          { from: 0, node: <Browser src="t-results" url="/mugalim/natizheler" zoom={ease(f, 10, a, 1, 1.25)} focus={{ x: 820, y: 330 }} /> },
          { from: a, node: <Browser src="t-analytics" url="/mugalim/analitika" scroll={pan(f, a + 10, len, 0, 300)} zoom={ease(f, a, len, 1, 1.08)} focus={{ x: 900, y: 400 }} /> },
        ]} />
      </Stage>
    </PageBg>
  );
}

function Trust() {
  const items = [
    [Sparkles, "ЖИ — көмекші,", "шешім — мұғалімде"],
    [UserCheck, "Оқушыдан жеке дерек", "сұралмайды"],
    [BookOpenCheck, "Авторлық құқық", "сақталады"],
  ] as const;
  return (
    <HeroBg>
      <AbsoluteFill style={{ fontFamily: FONT, color: "#fff", alignItems: "center", justifyContent: "center", gap: 70 }}>
        <Rise><div style={{ fontSize: 66, fontWeight: 700 }}>Сенімді әрі қауіпсіз</div></Rise>
        <div style={{ display: "flex", gap: 40 }}>
          {items.map(([Icon, a, b], i) => (
            <Rise key={a} delay={10 + i * 8} y={60}>
              <div style={{ width: 480, minHeight: 330, padding: "44px 36px", borderRadius: 32, background: "rgba(255,255,255,.12)", border: "2px solid rgba(255,255,255,.25)", textAlign: "center" }}>
                <span style={{ display: "inline-grid", placeItems: "center", width: 96, height: 96, borderRadius: 28, background: C.gold }}><Icon size={52} color={C.ink} /></span>
                <div style={{ marginTop: 28, fontSize: 38, fontWeight: 700, lineHeight: 1.2 }}>{a}<br /><span style={{ color: C.gold }}>{b}</span></div>
              </div>
            </Rise>
          ))}
        </div>
      </AbsoluteFill>
    </HeroBg>
  );
}

function Outro({ len }: SceneProps) {
  const f = useCurrentFrame();
  const url = useIn(22, 14);
  return (
    <HeroBg>
      <AbsoluteFill style={{ fontFamily: FONT, color: "#fff", alignItems: "center", justifyContent: "center", gap: 40, opacity: ease(f, len - 20, len, 1, 0) }}>
        <Rise>
          <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
            <span style={{ width: 120, height: 120, borderRadius: 34, background: "#fff", display: "grid", placeItems: "center" }}><FlaskConical size={66} color={C.primary} /></span>
            <span style={{ fontSize: 120, fontWeight: 700, letterSpacing: -2 }}>Әдебиет<span style={{ color: C.gold }}>Lab</span></span>
          </div>
        </Rise>
        <Rise delay={10}><div style={{ fontSize: 54, fontWeight: 600 }}>Сыныбыңызды бүгін ашыңыз</div></Rise>
        <div style={{ transform: `scale(${0.7 + 0.3 * url})`, opacity: url }}>
          <span style={{ display: "inline-block", padding: "22px 48px", borderRadius: 999, background: C.gold, color: C.ink, fontSize: 50, fontWeight: 700, boxShadow: "0 16px 40px rgba(0,0,0,.25)" }}>adebietlab.vercel.app</span>
        </div>
      </AbsoluteFill>
      <Mascot size={250} style={{ position: "absolute", right: 150, bottom: 80 + Math.sin(f / 12) * 6, opacity: ease(f, len - 20, len, 1, 0) }} />
      <div style={{ position: "absolute", top: 36, left: 0 }}><Ornament opacity={0.9} /></div>
    </HeroBg>
  );
}

export const SCENES: Scene[] = [
  { id: "01", base: 150, Comp: Intro },
  { id: "02", base: 210, Comp: What },
  { id: "03", base: 285, Comp: Login },
  { id: "04", base: 210, Comp: Library },
  { id: "05", base: 300, Comp: Tools },
  { id: "06", base: 270, Comp: Ai },
  { id: "07", base: 180, Comp: Games },
  { id: "08", base: 360, Comp: Teacher },
  { id: "09", base: 270, Comp: Analytics },
  { id: "10", base: 150, Comp: Trust },
  { id: "11", base: 180, Comp: Outro },
];

export const promoLength = () => SCENES.reduce((s, x) => s + lengthOf(x), 0) - T * (SCENES.length - 1);

/** Frame where each scene starts, for laying the voiceover over the cut. */
const starts = SCENES.reduce<number[]>((acc, s, i) => [...acc, i === 0 ? 0 : acc[i - 1] + lengthOf(SCENES[i - 1]) - T], []);

export function Promo() {
  useFonts();
  const total = promoLength();
  const hasVo = Object.keys(voLen).length > 0;
  return (
    <AbsoluteFill style={{ background: C.navyDeep }}>
      <TransitionSeries>
        {SCENES.flatMap((s, i) => {
          const len = lengthOf(s);
          const seq = <TransitionSeries.Sequence key={s.id} durationInFrames={len}><s.Comp len={len} /></TransitionSeries.Sequence>;
          if (i === 0) return [seq];
          const brand = ["02", "10", "11"].includes(s.id);
          return [
            <TransitionSeries.Transition key={`t${s.id}`} presentation={brand ? fade() : slide({ direction: "from-right" })} timing={linearTiming({ durationInFrames: T })} />,
            seq,
          ];
        })}
      </TransitionSeries>
      <Audio src={staticFile("music.wav")} volume={(fr) => interpolate(fr, [0, 20, total - 90, total], [0, hasVo ? 0.22 : 0.6, hasVo ? 0.22 : 0.6, 0], { extrapolateRight: "clamp" })} />
      {SCENES.filter((s) => voLen[s.id]).map((s) => (
        <Sequence key={s.id} from={starts[SCENES.indexOf(s)] + (s.id === "01" ? 8 : T)}>
          <Audio src={staticFile(`vo/vo-${s.id}.mp3`)} />
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
