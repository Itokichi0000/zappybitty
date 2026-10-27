import { describe, expect, it } from "vitest";
import { ZONES, zoneIndexForScore } from "./zones";

describe("zones", () => {
  it("start at score 0 and are sorted by startScore", () => {
    expect(ZONES[0].startScore).toBe(0);
    for (let i = 1; i < ZONES.length; i++) {
      expect(ZONES[i].startScore).toBeGreaterThan(ZONES[i - 1].startScore);
    }
  });

  it("maps scores to the zone whose threshold was reached", () => {
    expect(zoneIndexForScore(0)).toBe(0);
    expect(zoneIndexForScore(ZONES[1].startScore - 1)).toBe(0);
    expect(zoneIndexForScore(ZONES[1].startScore)).toBe(1);
    expect(zoneIndexForScore(ZONES[ZONES.length - 1].startScore)).toBe(ZONES.length - 1);
    expect(zoneIndexForScore(99999)).toBe(ZONES.length - 1);
  });

  it("every zone has names in both locales and positive obstacle weights", () => {
    for (const zone of ZONES) {
      expect(zone.name.ja.length).toBeGreaterThan(0);
      expect(zone.name.en.length).toBeGreaterThan(0);
      const weights = Object.values(zone.obstacles);
      expect(weights.length).toBeGreaterThan(0);
      for (const w of weights) expect(w).toBeGreaterThan(0);
      expect(zone.gravityScale).toBeGreaterThan(0);
      expect(zone.speedScale).toBeGreaterThan(0);
    }
  });

  it("keeps the Tokyo zones gentle: new charts, enemies and gimmicks only after the Moon", () => {
    const newKinds = ["line", "bars", "renko", "orderbook"];
    ZONES.forEach((zone, i) => {
      if (i > 6) return;
      for (const kind of newKinds) expect(zone.obstacles[kind as keyof typeof zone.obstacles]).toBeUndefined();
      expect(zone.enemies).toBeUndefined();
      expect(zone.flip).toBeUndefined();
      expect(zone.fog).toBeFalsy();
    });
    expect(ZONES.length).toBe(14);
    for (const zone of ZONES.slice(7)) {
      if (zone.enemies) {
        expect(zone.enemies.minMs).toBeLessThanOrEqual(zone.enemies.maxMs);
        expect(Object.values(zone.enemies.kinds).some((w) => (w ?? 0) > 0)).toBe(true);
      }
    }
  });

  it("never slows the scroll down when the zone changes", () => {
    for (let i = 1; i < ZONES.length; i++) {
      expect(ZONES[i].speedScale).toBeGreaterThanOrEqual(ZONES[i - 1].speedScale);
    }
  });
});
