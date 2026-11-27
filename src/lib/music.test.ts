import { describe, expect, it } from "vitest";
import { BARS, EIGHTH, hits, stepLength } from "./music";

describe("background tune", () => {
  it("every bar has six eighths and starts on a note", () => {
    for (const [, line] of BARS) {
      const t = line.split(" ");
      expect(t).toHaveLength(6);
      expect(t[0]).not.toBe(".");
    }
  });

  it("each bar starts on the drone, the pass ends with a breath, and phrase ends slow down", () => {
    const pass = 18 * 6;
    for (let bar = 0; bar < 18; bar++) expect(hits(bar * 6).length).toBeGreaterThan(0);
    const rest = Array.from({ length: 12 }, (_, i) => hits(16 * 6 + i)).flat();
    expect(rest).toHaveLength(2); // the drone alone, once per bar
    expect(stepLength(3 * 6 + 5)).toBeGreaterThan(EIGHTH);
    expect(stepLength(0)).toBe(EIGHTH);
    const all = Array.from({ length: pass }, (_, s) => hits(s)).flat();
    expect(all.every((h) => Number.isFinite(h.f) && h.vol > 0 && h.vol <= 1)).toBe(true);
  });
});
