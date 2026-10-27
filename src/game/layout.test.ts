import { describe, expect, it } from "vitest";
import { GAME_WIDTH, MAX_HEIGHT, MIN_HEIGHT } from "./constants";
import { computeGameSize } from "./layout";

describe("computeGameSize", () => {
  it("keeps a 9:16 world on wide (PC) viewports", () => {
    expect(computeGameSize(1920, 1080)).toEqual({ width: GAME_WIDTH, height: MIN_HEIGHT });
  });

  it("grows the height on tall phones, up to the cap", () => {
    const iphone = computeGameSize(390, 844);
    expect(iphone.width).toBe(GAME_WIDTH);
    expect(iphone.height).toBeGreaterThan(MIN_HEIGHT);
    expect(iphone.height).toBeLessThanOrEqual(MAX_HEIGHT);
    expect(computeGameSize(360, 2000).height).toBe(MAX_HEIGHT);
  });

  it("survives degenerate viewports", () => {
    expect(computeGameSize(0, 0)).toEqual({ width: GAME_WIDTH, height: MIN_HEIGHT });
  });
});
