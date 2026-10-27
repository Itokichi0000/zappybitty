import { describe, expect, it } from "vitest";
import type { ObstacleKind } from "../../zones";
import { pickKind } from "./picker";

/** Small deterministic PRNG so the test is reproducible. */
function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

describe("pickKind", () => {
  const weights: Partial<Record<ObstacleKind, number>> = { candle: 1, movingCandle: 1, volume: 1, channel: 1, crash: 1 };

  it("never repeats a kind three times, follows a crash with a candle and never chains channels", () => {
    const rand = lcg(42);
    const history: ObstacleKind[] = [];
    for (let i = 0; i < 3000; i++) {
      const kind = pickKind(weights, history.slice(-3), rand);
      const last = history[history.length - 1];
      const prev = history[history.length - 2];
      if (last === "crash") expect(kind).toBe("candle");
      if (last === "channel") expect(kind).not.toBe("channel");
      if (last === "channel") expect(kind).not.toBe("crash");
      if (last && last === prev) expect(kind).not.toBe(last);
      history.push(kind);
    }
    expect(new Set(history).size).toBe(5);
  });

  it("never chains the tunnels (channel, line chart) and keeps crashes away from them", () => {
    const rand = lcg(7);
    const all: Partial<Record<ObstacleKind, number>> = { candle: 1, channel: 2, line: 2, crash: 1, bars: 1, renko: 1, orderbook: 1 };
    const tunnel = (k?: ObstacleKind) => k === "channel" || k === "line";
    const history: ObstacleKind[] = [];
    for (let i = 0; i < 3000; i++) {
      const kind = pickKind(all, history.slice(-3), rand);
      const last = history[history.length - 1];
      if (tunnel(last)) {
        expect(tunnel(kind)).toBe(false);
        expect(kind).not.toBe("crash");
      }
      history.push(kind);
    }
    expect(new Set(history).size).toBe(7);
  });

  it("falls back to a candle when the weights allow nothing else", () => {
    expect(pickKind({ candle: 1 }, ["candle", "candle"], () => 0.5)).toBe("candle");
    expect(pickKind({}, [], () => 0.5)).toBe("candle");
  });
});
