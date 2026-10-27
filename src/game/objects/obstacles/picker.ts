import type { ObstacleKind } from "../../zones";

/**
 * Picks the next slot obstacle from weighted candidates with a few pacing rules:
 * never the same kind three times in a row, a plain candle always follows a
 * crash cluster, and a channel is never directly followed by another channel
 * or a crash. Pure, so it is unit-tested.
 */
export function pickKind(
  weights: Partial<Record<ObstacleKind, number>>,
  recent: ObstacleKind[],
  rand: () => number,
): ObstacleKind {
  const last = recent[recent.length - 1];
  const prev = recent[recent.length - 2];
  if (last === "crash") return "candle";

  let candidates = (Object.entries(weights) as Array<[ObstacleKind, number]>).filter(([, w]) => w > 0);
  if (last && last === prev) candidates = candidates.filter(([k]) => k !== last);
  // Long tunnels (channel, line chart) never follow each other or lead into a crash.
  const tunnel = (k: ObstacleKind | undefined) => k === "channel" || k === "line";
  if (tunnel(last)) candidates = candidates.filter(([k]) => !tunnel(k) && k !== "crash");
  if (candidates.length === 0) return "candle";

  const total = candidates.reduce((sum, [, w]) => sum + w, 0);
  let roll = rand() * total;
  for (const [kind, w] of candidates) {
    roll -= w;
    if (roll < 0) return kind;
  }
  return candidates[candidates.length - 1][0];
}
