import { describe, expect, it } from "vitest";
import { BARS, hits } from "./music";

describe("background tune", () => {
  it("every bar has six eighths and starts on a note", () => {
    for (const [, line] of BARS) {
      const t = line.split(" ");
      expect(t).toHaveLength(6);
      expect(t[0]).not.toBe(".");
    }
  });

  it("strums every eighth with a drum on the beats, and the calm section has no drum", () => {
    const loud = Array.from({ length: 48 }, (_, s) => hits(s));
    expect(loud.every((h) => h.length > 0)).toBe(true);
    expect(loud.filter((h) => h.some((x) => x.kind === "drum"))).toHaveLength(16);
    const calm = Array.from({ length: 48 }, (_, s) => hits(96 + s)).flat();
    expect(calm.some((x) => x.kind === "drum")).toBe(false);
    expect(hits(0).every((x) => Number.isFinite(x.f) && x.vol > 0 && x.vol <= 1)).toBe(true);
  });
});
