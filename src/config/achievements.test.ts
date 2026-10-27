import { describe, expect, it } from "vitest";
import { ACHIEVEMENTS, EMPTY_STATS, newlyUnlocked } from "./achievements";

describe("achievements", () => {
  it("has unique ids and positive rewards", () => {
    expect(new Set(ACHIEVEMENTS.map((a) => a.id)).size).toBe(ACHIEVEMENTS.length);
    for (const a of ACHIEVEMENTS) expect(a.reward).toBeGreaterThan(0);
  });

  it("unlocks only what the stats reach and never twice", () => {
    expect(newlyUnlocked(EMPTY_STATS, [])).toEqual([]);
    const first = newlyUnlocked({ ...EMPTY_STATS, runs: 1, bestScore: 12 }, []).map((a) => a.id);
    expect(first).toEqual(["first-flight", "score-10"]);
    expect(newlyUnlocked({ ...EMPTY_STATS, runs: 1, bestScore: 12 }, first)).toEqual([]);
  });
});
