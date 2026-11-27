import { expect, it } from "vitest";
import { PINS } from "./literary-map";
import { project, spread } from "./kz-outline";

it("spreads pins so none overlap, moving each only a little", () => {
  const real = PINS.map((p) => project(p.lat, p.lon));
  const out = spread(real);
  for (let i = 0; i < out.length; i++) {
    for (let j = i + 1; j < out.length; j++) expect(Math.hypot(out[i].x - out[j].x, out[i].y - out[j].y)).toBeGreaterThan(58);
    expect(Math.hypot(out[i].x - real[i].x, out[i].y - real[i].y)).toBeLessThan(80);
  }
});
