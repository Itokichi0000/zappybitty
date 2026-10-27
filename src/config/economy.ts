import type { Locale } from "./game";

/**
 * The bitty economy: points earned by playing and spent in the shop or on a
 * continue. They live only on this device and are never real bitcoin.
 */
export type ItemKind =
  | "magnet"
  | "shield"
  | "rocket"
  | "slow"
  | "double"
  | "mini"
  | "laser"
  | "feather"
  | "coinRain"
  /** Bad items (red rim): rarer, and only from zone 4 on. */
  | "heavy"
  | "smoke";

export const GOOD_ITEMS: ItemKind[] = ["magnet", "shield", "rocket", "slow", "double", "mini", "laser", "feather", "coinRain"];
export const BAD_ITEMS: ItemKind[] = ["heavy", "smoke"];

/** Price of the one continue a run may use, in bitty. */
export const CONTINUE_PRICE = 21;

export const ECONOMY = {
  /** Chance that a coin group carries an item instead of its middle coin. */
  itemChance: 0.08,
  /** Combo length from which coins count double. */
  comboDoubleAt: 10,
  /** Effect durations (ms). */
  magnetMs: 10000,
  rocketMs: 2500,
  slowMs: 5000,
  doubleMs: 10000,
  miniMs: 8000,
  laserMs: 5000,
  featherMs: 7000,
  heavyMs: 5000,
  smokeMs: 5000,
  /** bitty's size while "mini" is active (the hitbox shrinks with it). */
  miniScale: 0.62,
  /** Gravity multipliers: feather floats, the heavy weight drags down. */
  featherGravity: 0.55,
  heavyGravity: 1.25,
  /** Laser eyes clear obstacles this far ahead of bitty (px). */
  laserRange: 170,
  /** The smoke screen leaves this much clear air in front of bitty (px): about one obstacle ahead. */
  smokeClearPx: 150,
  /** Coins dropped by the coin rain. */
  coinRainCount: 14,
  /** Bad items appear from this zone index on, as this share of item drops. */
  badFromZone: 3,
  badShare: 0.2,
  /** World time scale while "slow" is active. */
  slowScale: 0.6,
  /** Scroll speed multiplier while riding the rocket. */
  rocketSpeed: 2,
  /** Magnet pull radius (px) and pull speed (px/s). */
  magnetRadius: 130,
  magnetPull: 520,
} as const;

/** Cosmetic slots. One item per slot can be equipped at a time. */
export type CosmeticSlot = "skin" | "hat" | "face" | "neck" | "trail";

export interface CosmeticDef {
  id: string;
  slot: CosmeticSlot;
  name: Record<Locale, string>;
  /** Price in sats; 0 = unlocked by progress or default. */
  price: number;
  /** Zone index that unlocks a free cosmetic. */
  unlockZone?: number;
  /** Skins: hue (degrees) the orange fur is shifted to; "rainbow" cycles; "gold" has its own texture. */
  hue?: number;
  lightness?: number;
}

export const COSMETICS: CosmeticDef[] = [
  // ---- skins (bitty's colour) ----
  { id: "default", slot: "skin", name: { ja: "ノーマル", en: "Normal" }, price: 0 },
  { id: "blue", slot: "skin", name: { ja: "ブルー bitty", en: "Blue bitty" }, price: 400, hue: 215 },
  { id: "pink", slot: "skin", name: { ja: "ピンク bitty", en: "Pink bitty" }, price: 400, hue: 335 },
  { id: "green", slot: "skin", name: { ja: "グリーン bitty", en: "Green bitty" }, price: 400, hue: 130 },
  { id: "purple", slot: "skin", name: { ja: "パープル bitty", en: "Purple bitty" }, price: 500, hue: 275 },
  { id: "mint", slot: "skin", name: { ja: "ミント bitty", en: "Mint bitty" }, price: 500, hue: 165, lightness: 1.1 },
  { id: "shadow", slot: "skin", name: { ja: "シャドウ bitty", en: "Shadow bitty" }, price: 800, hue: 230, lightness: 0.35 },
  { id: "snow", slot: "skin", name: { ja: "スノー bitty", en: "Snow bitty" }, price: 800, hue: 40, lightness: 1.6 },
  { id: "rainbow", slot: "skin", name: { ja: "レインボー bitty", en: "Rainbow bitty" }, price: 2000 },
  { id: "gold", slot: "skin", name: { ja: "ゴールド bitty", en: "Gold bitty" }, price: 2100 },
  { id: "neonskin", slot: "skin", name: { ja: "ネオン bitty", en: "Neon bitty" }, price: 0, unlockZone: 9, hue: 300, lightness: 1.15 },
  { id: "magma", slot: "skin", name: { ja: "マグマ bitty", en: "Magma bitty" }, price: 0, unlockZone: 10, hue: 2, lightness: 0.75 },
  { id: "galaxy", slot: "skin", name: { ja: "ギャラクシー bitty", en: "Galaxy bitty" }, price: 0, unlockZone: 13, hue: 255, lightness: 0.55 },
  // ---- hats ----
  { id: "beanie", slot: "hat", name: { ja: "ニット帽", en: "Beanie" }, price: 400 },
  { id: "cap", slot: "hat", name: { ja: "キャップ", en: "Cap" }, price: 350 },
  { id: "straw", slot: "hat", name: { ja: "麦わら帽子", en: "Straw Hat" }, price: 450 },
  { id: "crown", slot: "hat", name: { ja: "王冠", en: "Crown" }, price: 1200 },
  { id: "party", slot: "hat", name: { ja: "パーティー帽", en: "Party Hat" }, price: 300 },
  { id: "headband", slot: "hat", name: { ja: "忍者はちまき", en: "Ninja Headband" }, price: 500 },
  { id: "catears", slot: "hat", name: { ja: "ねこみみ", en: "Cat Ears" }, price: 600 },
  { id: "tophat", slot: "hat", name: { ja: "シルクハット", en: "Top Hat" }, price: 900 },
  { id: "beret", slot: "hat", name: { ja: "ベレー帽", en: "Beret" }, price: 450 },
  { id: "helmet", slot: "hat", name: { ja: "宇宙ヘルメット", en: "Space Helmet" }, price: 0, unlockZone: 6 },
  { id: "bullhorns", slot: "hat", name: { ja: "ブルのツノ", en: "Bull Horns" }, price: 0, unlockZone: 7 },
  { id: "bowler", slot: "hat", name: { ja: "山高帽", en: "Bowler Hat" }, price: 0, unlockZone: 8 },
  { id: "kasa", slot: "hat", name: { ja: "旅の笠", en: "Sedge Hat" }, price: 0, unlockZone: 11 },
  // ---- face ----
  { id: "sunglasses", slot: "face", name: { ja: "サングラス", en: "Sunglasses" }, price: 300 },
  { id: "glasses", slot: "face", name: { ja: "丸メガネ", en: "Round Glasses" }, price: 300 },
  { id: "monocle", slot: "face", name: { ja: "モノクル", en: "Monocle" }, price: 500 },
  { id: "mask", slot: "face", name: { ja: "マスク", en: "Face Mask" }, price: 250 },
  { id: "laser", slot: "face", name: { ja: "レーザーアイ", en: "Laser Eyes" }, price: 1500 },
  { id: "starglasses", slot: "face", name: { ja: "スターグラス", en: "Star Glasses" }, price: 500 },
  // ---- neck ----
  { id: "tie", slot: "neck", name: { ja: "ネクタイ", en: "Necktie" }, price: 350 },
  { id: "bowtie", slot: "neck", name: { ja: "蝶ネクタイ", en: "Bow Tie" }, price: 350 },
  { id: "scarf", slot: "neck", name: { ja: "マフラー", en: "Scarf" }, price: 400 },
  { id: "medal", slot: "neck", name: { ja: "金メダル", en: "Gold Medal" }, price: 700 },
  { id: "pendant", slot: "neck", name: { ja: "⚡ペンダント", en: "Lightning Pendant" }, price: 600 },
  // ---- trails ----
  { id: "lightning", slot: "trail", name: { ja: "稲妻の軌跡", en: "Lightning Trail" }, price: 600 },
  { id: "sakura", slot: "trail", name: { ja: "桜吹雪", en: "Sakura Trail" }, price: 600 },
  { id: "coins", slot: "trail", name: { ja: "コインの軌跡", en: "Coin Trail" }, price: 900 },
  { id: "stars", slot: "trail", name: { ja: "星くず", en: "Stardust" }, price: 700 },
  { id: "hearts", slot: "trail", name: { ja: "ハート", en: "Hearts" }, price: 700 },
  { id: "bubbles", slot: "trail", name: { ja: "シャボン玉", en: "Bubbles" }, price: 600 },
  { id: "fire", slot: "trail", name: { ja: "炎", en: "Fire" }, price: 900 },
  { id: "snowflakes", slot: "trail", name: { ja: "雪", en: "Snow" }, price: 700 },
  { id: "neon", slot: "trail", name: { ja: "ネオンライン", en: "Neon Streak" }, price: 1000 },
  { id: "comet", slot: "trail", name: { ja: "ほうき星", en: "Comet Tail" }, price: 800 },
  { id: "marsdust", slot: "trail", name: { ja: "火星の砂", en: "Mars Dust" }, price: 0, unlockZone: 12 },
];

export const COSMETIC_SLOTS: CosmeticSlot[] = ["skin", "hat", "face", "neck", "trail"];

export function cosmeticsFor(slot: CosmeticSlot): CosmeticDef[] {
  return COSMETICS.filter((c) => c.slot === slot);
}

export function findCosmetic(id: string): CosmeticDef | undefined {
  return COSMETICS.find((c) => c.id === id);
}

/** Kept for existing imports: accessories are every non-skin, non-trail cosmetic. */
export const ACCESSORIES: CosmeticDef[] = COSMETICS.filter((c) => c.slot === "hat" || c.slot === "face" || c.slot === "neck");
export const TRAILS: CosmeticDef[] = COSMETICS.filter((c) => c.slot === "trail");

export const ITEM_NAMES: Record<ItemKind, Record<Locale, string>> = {
  magnet: { ja: "マグネット", en: "Magnet" },
  shield: { ja: "HODL シールド", en: "HODL Shield" },
  rocket: { ja: "ロケット", en: "Rocket" },
  slow: { ja: "スロー", en: "Slow-mo" },
  double: { ja: "bitty ×2", en: "Bitty ×2" },
  mini: { ja: "ミニ化", en: "Mini" },
  laser: { ja: "レーザーアイ", en: "Laser Eyes" },
  feather: { ja: "羽根", en: "Feather" },
  coinRain: { ja: "コインの雨", en: "Coin Rain" },
  heavy: { ja: "重り", en: "Heavy Weight" },
  smoke: { ja: "煙幕", en: "Smoke Screen" },
};

/**
 * Which item a drop carries: any good item, or (from zone 4 on, a fifth of the
 * time) a bad one. `allowBad: false` (drops inside a tunnel, where they can't be
 * dodged) only ever gives a good item. Pure, so it is unit-tested.
 */
export function pickItem(zoneIndex: number, rand: () => number, allowBad = true): ItemKind {
  if (allowBad && zoneIndex >= ECONOMY.badFromZone && rand() < ECONOMY.badShare) {
    return BAD_ITEMS[Math.floor(rand() * BAD_ITEMS.length)] ?? BAD_ITEMS[0];
  }
  return GOOD_ITEMS[Math.floor(rand() * GOOD_ITEMS.length)] ?? GOOD_ITEMS[0];
}

/** Coin value for one pickup given the combo length and the ×2 item. */
export function coinValue(combo: number, doubleActive: boolean): number {
  let value = 1;
  if (combo >= ECONOMY.comboDoubleAt) value *= 2;
  if (doubleActive) value *= 2;
  return value;
}
