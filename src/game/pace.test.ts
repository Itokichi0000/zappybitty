import { describe, expect, it } from "vitest";
import { minPlayMs } from "./pace";
import { ZONES } from "./zones";

describe("minPlayMs", () => {
  it("is zero for no points and grows with the score", () => {
    expect(minPlayMs(0, 0)).toBe(0);
    let prev = 0;
    for (const score of [1, 10, 100, 250, 1000, 5000]) {
      const ms = minPlayMs(score, 0);
      expect(ms).toBeGreaterThan(prev);
      prev = ms;
    }
  });

  it("is never looser than the old flat 350 ms per point", () => {
    for (let zone = 0; zone < ZONES.length; zone++) {
      for (const score of [1, 5, 50, 359, 1000, 7714]) expect(minPlayMs(score, zone)).toBeGreaterThanOrEqual(score * 350);
    }
  });

  it("asks less time per point from a later start zone (it is already fast there)", () => {
    expect(minPlayMs(100, ZONES.length - 1)).toBeLessThan(minPlayMs(100, 0));
  });

  it("keeps real runs well inside the bound", () => {
    // 359 points from Shibuya: a full-speed run takes about 4.5 minutes.
    expect(minPlayMs(359, 0)).toBeLessThan(4 * 60_000);
    expect(minPlayMs(359, 0)).toBeGreaterThan(3 * 60_000);
  });
});
