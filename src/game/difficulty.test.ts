import { describe, expect, it } from "vitest";
import { BIRD, OBSTACLES } from "./constants";
import { getDifficulty, maxDriftFor } from "./difficulty";
import { ZONES } from "./zones";

describe("getDifficulty", () => {
  it("starts at the base values", () => {
    expect(getDifficulty(0)).toEqual({
      speed: OBSTACLES.baseSpeed,
      gap: OBSTACLES.baseGap,
      spacing: OBSTACLES.baseSpacing,
    });
  });

  it("gets harder monotonically and never exceeds the late caps", () => {
    let prev = getDifficulty(0);
    for (let score = 1; score <= OBSTACLES.lateScore * 2; score++) {
      const d = getDifficulty(score);
      expect(d.speed).toBeGreaterThanOrEqual(prev.speed);
      expect(d.gap).toBeLessThanOrEqual(prev.gap);
      expect(d.spacing).toBeLessThanOrEqual(prev.spacing);
      expect(d.speed).toBeLessThanOrEqual(OBSTACLES.lateSpeed);
      expect(d.gap).toBeGreaterThanOrEqual(OBSTACLES.lateGap);
      expect(d.spacing).toBeGreaterThanOrEqual(OBSTACLES.lateSpacing);
      prev = d;
    }
  });

  it("reaches the mid values at rampScore and keeps getting harder after", () => {
    expect(getDifficulty(OBSTACLES.rampScore)).toEqual({
      speed: OBSTACLES.maxSpeed,
      gap: OBSTACLES.minGap,
      spacing: OBSTACLES.minSpacing,
    });
    const later = getDifficulty(OBSTACLES.rampScore + 40);
    expect(later.speed).toBeGreaterThan(OBSTACLES.maxSpeed);
    expect(later.gap).toBeLessThan(OBSTACLES.minGap);
  });

  it("reaches the late values at lateScore and stays flat", () => {
    expect(getDifficulty(OBSTACLES.lateScore)).toEqual({
      speed: OBSTACLES.lateSpeed,
      gap: OBSTACLES.lateGap,
      spacing: OBSTACLES.lateSpacing,
    });
    expect(getDifficulty(OBSTACLES.lateScore + 500)).toEqual(getDifficulty(OBSTACLES.lateScore));
  });

  it("leaves room for the bird even at the hardest gap", () => {
    expect(OBSTACLES.lateGap).toBeGreaterThanOrEqual(34 * 3);
  });

  it("shrinks the gap drift with the time between obstacles, within its bounds", () => {
    expect(maxDriftFor(10)).toBe(OBSTACLES.maxDrift);
    expect(maxDriftFor(0.01)).toBe(OBSTACLES.minDrift);
    expect(maxDriftFor(0)).toBe(OBSTACLES.maxDrift);
    expect(maxDriftFor(0.5)).toBeLessThan(maxDriftFor(1));
  });

  it("never asks for a climb faster than steady tapping manages, in any zone", () => {
    // Tapping every 0.2 s climbs at |flap| - gravity * 0.1 on average.
    ZONES.forEach((zone, i) => {
      const end = ZONES[i + 1]?.startScore ?? zone.startScore + 100;
      const climb = -BIRD.flapVelocity * zone.flapScale - BIRD.gravity * zone.gravityScale * 0.1;
      for (let score = zone.startScore; score < end; score++) {
        const d = getDifficulty(score);
        const interval = d.spacing / (d.speed * zone.speedScale);
        expect(maxDriftFor(interval) / interval).toBeLessThan(climb * 0.8);
      }
    });
  });
});
