import { OBSTACLES } from "./constants";

export interface Difficulty {
  /** Obstacle scroll speed in px/s. */
  speed: number;
  /** Vertical gap between the top and bottom wick tips, in px. */
  gap: number;
  /** Horizontal distance between candle pairs, in px. */
  spacing: number;
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/**
 * Pure difficulty curve: base → mid (at rampScore) → late (at lateScore), piecewise
 * linear, then flat. The late stage keeps the game getting harder long after the
 * first minute instead of plateauing.
 */
export function getDifficulty(score: number): Difficulty {
  const o = OBSTACLES;
  if (score <= o.rampScore) {
    const t = clamp01(score / o.rampScore);
    return {
      speed: Math.round(lerp(o.baseSpeed, o.maxSpeed, t)),
      gap: Math.round(lerp(o.baseGap, o.minGap, t)),
      spacing: Math.round(lerp(o.baseSpacing, o.minSpacing, t)),
    };
  }
  const t = clamp01((score - o.rampScore) / (o.lateScore - o.rampScore));
  return {
    speed: Math.round(lerp(o.maxSpeed, o.lateSpeed, t)),
    gap: Math.round(lerp(o.minGap, o.lateGap, t)),
    spacing: Math.round(lerp(o.minSpacing, o.lateSpacing, t)),
  };
}

/**
 * Largest vertical drift between two obstacles that pass bitty `intervalSec` apart.
 * Pure, so it is unit-tested.
 */
export function maxDriftFor(intervalSec: number): number {
  const o = OBSTACLES;
  if (!Number.isFinite(intervalSec) || intervalSec <= 0) return o.maxDrift;
  return Math.round(Math.min(o.maxDrift, Math.max(o.minDrift, o.driftRate * intervalSec)));
}
