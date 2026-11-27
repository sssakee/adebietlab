// An original dombyra-style tune in 6/8 for the site's background music. Our own melody, so no
// licence is needed, and it is synthesized in the browser, so nothing is downloaded.

/** One eighth note: dotted quarter = 84 bpm, a gentle canter. */
export const EIGHTH = 60 / 84 / 3;

const HZ = {
  G2: 98.0, A2: 110.0, D3: 146.83,
  D4: 293.66, E4: 329.63, "F#4": 369.99, G4: 392.0, A4: 440.0, B4: 493.88, D5: 587.33,
} as const;
type Pitch = keyof typeof HZ;

/** Lower string (chord root) and six eighths on the upper string; "." keeps the fretted note. */
export const BARS: [Pitch, string][] = [
  ["D3", "F#4 . A4 B4 A4 F#4"],
  ["G2", "G4 . B4 D5 . B4"],
  ["A2", "A4 B4 A4 E4 . F#4"],
  ["D3", "D4 . . D4 . ."],
  ["D3", "D5 . D5 B4 A4 B4"],
  ["G2", "D5 . B4 A4 . G4"],
  ["A2", "F#4 A4 B4 A4 F#4 E4"],
  ["D3", "D4 . F#4 A4 . ."],
];

export type Hit = { at: number; f: number; vol: number; kind: "string" | "drum" };

const STEPS = BARS.length * 6;

/**
 * What sounds on a given eighth of the endless tune. Three sections of eight bars repeat:
 * strummed, strummed with a fuller drum, and a calm one with single plucks and no drum,
 * so the loop breathes instead of drilling the same eleven seconds.
 */
export function hits(step: number): Hit[] {
  const section = Math.floor(step / STEPS) % 3;
  const [root, line] = BARS[Math.floor(step / 6) % BARS.length];
  const tokens = line.split(" ");
  const pos = step % 6;
  let i = pos;
  while (tokens[i] === ".") i--;
  const top = HZ[tokens[i] as Pitch];
  const down = pos % 3 !== 1; // 6/8 strum: down, up, down | down, up, down
  const accent = pos === 0 || pos === 3;
  const out: Hit[] = [];

  if (section === 2) {
    if (tokens[pos] !== ".") out.push({ at: 0, f: top, vol: 0.5, kind: "string" });
    if (accent) out.push({ at: 0, f: HZ[root], vol: 0.45, kind: "string" });
    return out;
  }
  const v = accent ? 0.75 : down ? 0.5 : 0.3;
  if (down) out.push({ at: 0, f: HZ[root], vol: v * 0.8, kind: "string" }, { at: 0.012, f: top, vol: v, kind: "string" });
  else out.push({ at: 0, f: top, vol: v, kind: "string" });
  if (accent || (section === 1 && pos === 5)) out.push({ at: 0, f: pos === 0 ? 110 : 90, vol: pos === 0 ? 0.6 : 0.35, kind: "drum" });
  return out;
}
