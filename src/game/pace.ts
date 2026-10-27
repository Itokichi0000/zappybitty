import { OBSTACLES } from "./constants";
import { getDifficulty } from "./difficulty";
import { ZONES, zoneIndexForScore } from "./zones";

/**
 * Share of the full-speed pace a real run may beat: rockets (double speed for a few
 * seconds), laser eyes (obstacles just ahead count early) and denser obstacle kinds
 * can make a stretch faster than one candle per spacing, but never by this much on average.
 */
export const PACE_SLACK = 0.75;

/** Seconds between two points at full speed: one obstacle spacing at the scroll speed. */
function secondsPerPoint(effectiveScore: number): number {
  const d = getDifficulty(effectiveScore);
  return d.spacing / (d.speed * ZONES[zoneIndexForScore(effectiveScore)].speedScale);
}

/** Effective score from which neither the difficulty nor the zone changes any more. */
const FLAT_FROM = Math.max(OBSTACLES.lateScore, ZONES[ZONES.length - 1].startScore);

/**
 * Shortest wall-clock time (ms) a run can take to score `score` points when it starts
 * in `startZone` (stage select starts the difficulty at the zone's start score).
 * Game time never runs ahead of the clock (slow-mo and dropped frames only slow it),
 * so a report faster than this was not played.
 */
export function minPlayMs(score: number, startZone: number): number {
  return Math.floor(fullSpeedMs(score, startZone) * PACE_SLACK);
}

/** Time (ms) `score` points take at full speed with no items: the pace minPlayMs allows a share of. */
export function fullSpeedMs(score: number, startZone: number): number {
  const points = Math.max(0, Math.floor(score));
  const offset = ZONES[Math.max(0, Math.min(ZONES.length - 1, Math.floor(startZone) || 0))].startScore;
  let seconds = 0;
  // The curve changes up to FLAT_FROM; past it every point takes the same time.
  const ramp = Math.min(points, Math.max(0, FLAT_FROM - offset));
  for (let i = 0; i < ramp; i++) seconds += secondsPerPoint(offset + i);
  seconds += (points - ramp) * secondsPerPoint(Math.max(offset, FLAT_FROM));
  return seconds * 1000;
}
