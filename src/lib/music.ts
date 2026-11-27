// An original, slow tune in the manner of a lyrical shertpe küy: single plucked notes over the
// open-string drone, with a breath at the end of each phrase. Our own melody, so no licence is
// needed, and it is synthesized in the browser, so nothing is downloaded.

/** One eighth note of a slow 6/8: dotted quarter ≈ 56 bpm. */
export const EIGHTH = 0.36;

const HZ = {
  G2: 98.0, A2: 110.0, C3: 130.81, D3: 146.83, F3: 174.61,
  D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.0, A4: 440.0, C5: 523.25, D5: 587.33,
} as const;
type Pitch = keyof typeof HZ;
/** D minor without its sixth — the frame of many lyrical Kazakh melodies. Used for grace notes. */
const SCALE: Pitch[] = ["D4", "E4", "F4", "G4", "A4", "C5", "D5"];

/** Drone on the lower string and six eighths of melody; "." lets the last note ring on. */
export const BARS: [Pitch, string][] = [
  // A: low and calm
  ["D3", "A4 . . G4 F4 ."],
  ["D3", "G4 . A4 F4 . E4"],
  ["C3", "F4 . . E4 D4 ."],
  ["D3", "D4 . . . . ."],
  // B: it rises
  ["F3", "C5 . A4 C5 D5 ."],
  ["C3", "C5 . A4 G4 . A4"],
  ["A2", "E4 F4 G4 A4 . G4"],
  ["D3", "F4 . E4 D4 . ."],
  // C: the heart of it, then home
  ["D3", "A4 C5 D5 . . C5"],
  ["G2", "D5 . C5 A4 . G4"],
  ["A2", "A4 . G4 E4 . G4"],
  ["D3", "D4 . . . . ."],
];

/** Phrases in one pass (A B C A), then two bars of drone alone to breathe. */
const FORM = [0, 1, 2, 0];
const REST_BARS = 2;
const PASS = (FORM.length * 4 + REST_BARS) * 6;

export type Hit = { at: number; f: number; vol: number };

const place = (step: number) => {
  const s = step % PASS;
  return { bar: Math.floor(s / 6), pos: s % 6 };
};

/** The last bar of each phrase slows down, as a player lets it settle. */
export function stepLength(step: number) {
  const { bar, pos } = place(step);
  return bar % 4 === 3 || bar >= FORM.length * 4 ? EIGHTH * (1.1 + 0.05 * pos) : EIGHTH;
}

/** What sounds on a given eighth of the endless tune. */
export function hits(step: number): Hit[] {
  const { bar, pos } = place(step);
  if (bar >= FORM.length * 4) return pos === 0 ? [{ at: 0, f: HZ.D3, vol: 0.3 }] : [];
  const [root, line] = BARS[FORM[Math.floor(bar / 4)] * 4 + (bar % 4)];
  const tokens = line.split(" ");
  const tok = tokens[pos] as Pitch | ".";
  const out: Hit[] = [];
  if (pos === 0) out.push({ at: 0, f: HZ[root], vol: 0.4 });
  if (pos === 3) out.push({ at: 0, f: HZ[root], vol: 0.2 });
  if (tok === ".") return out;
  // A long note on the beat gets a quick grace from the note above: the dombyra's soft "qağys".
  const above = SCALE[SCALE.indexOf(tok) + 1];
  if (pos === 0 && tokens[1] === "." && above) out.push({ at: -0.08, f: HZ[above], vol: 0.25 });
  out.push({ at: 0, f: HZ[tok], vol: pos === 0 ? 0.65 : 0.5 });
  return out;
}
