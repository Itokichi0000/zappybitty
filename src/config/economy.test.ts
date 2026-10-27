import { describe, expect, it } from "vitest";
import { ZONES } from "@/game/zones";
import { ACCESSORIES, BAD_ITEMS, coinValue, COSMETICS, ECONOMY, GOOD_ITEMS, ITEM_NAMES, pickItem, TRAILS } from "./economy";

describe("economy", () => {
  it("doubles coins at the combo threshold and with the x2 item, stacking to x4", () => {
    expect(coinValue(0, false)).toBe(1);
    expect(coinValue(ECONOMY.comboDoubleAt - 1, false)).toBe(1);
    expect(coinValue(ECONOMY.comboDoubleAt, false)).toBe(2);
    expect(coinValue(0, true)).toBe(2);
    expect(coinValue(ECONOMY.comboDoubleAt, true)).toBe(4);
  });

  it("has unique cosmetic ids and bilingual names", () => {
    // Ownership is one id list, so ids must be unique across every kind of cosmetic.
    const ids = COSMETICS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const c of [...ACCESSORIES, ...TRAILS]) {
      expect(c.name.ja).toBeTruthy();
      expect(c.name.en).toBeTruthy();
      expect(c.price).toBeGreaterThanOrEqual(0);
    }
  });

  it("never drops a bad item before zone 4, and only now and then after", () => {
    let seed = 1;
    const rand = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 0x100000000;
    };
    for (let zone = 0; zone < ECONOMY.badFromZone; zone++) {
      for (let i = 0; i < 2000; i++) expect(GOOD_ITEMS).toContain(pickItem(zone, rand));
    }
    let bad = 0;
    const n = 5000;
    for (let i = 0; i < n; i++) if (BAD_ITEMS.includes(pickItem(ECONOMY.badFromZone, rand))) bad++;
    expect(bad / n).toBeGreaterThan(ECONOMY.badShare * 0.7);
    expect(bad / n).toBeLessThan(ECONOMY.badShare * 1.3);
  });

  it("only drops good items where bad ones can't be dodged", () => {
    let seed = 7;
    const rand = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 0x100000000;
    };
    for (let i = 0; i < 2000; i++) expect(GOOD_ITEMS).toContain(pickItem(ZONES.length - 1, rand, false));
  });

  it("names every item and unlocks zone rewards in zones that exist", () => {
    for (const kind of [...GOOD_ITEMS, ...BAD_ITEMS]) {
      expect(ITEM_NAMES[kind].ja).toBeTruthy();
      expect(ITEM_NAMES[kind].en).toBeTruthy();
    }
    for (const c of COSMETICS) {
      if (c.unlockZone === undefined) continue;
      expect(c.price).toBe(0);
      expect(c.unlockZone).toBeGreaterThan(0);
      expect(c.unlockZone).toBeLessThan(ZONES.length);
    }
  });
});
