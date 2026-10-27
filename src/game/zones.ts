import type { Locale } from "@/config/game";
import { GAME_WIDTH } from "./constants";

/** Slot obstacles: one of these is chosen for every "slot" in the obstacle stream. */
export type ObstacleKind =
  | "candle"
  | "movingCandle"
  | "volume"
  | "channel"
  | "crash"
  /** 折れ線チャート: a zigzag tunnel. */
  | "line"
  /** 棒グラフ: a run of thin bars whose gap waves up and down. */
  | "bars"
  /** レンコー足: brick staircases from top and bottom. */
  | "renko"
  /** 板の壁: a thick buy / sell wall whose gap slides. */
  | "orderbook";

/** Moving enemies that cross the screen (they don't take an obstacle slot). */
export type EnemyKind = "bear" | "whale" | "crow" | "rock";

export interface SkyDisc {
  kind: "sun" | "moon" | "earth" | "planet";
  x: number;
  y: number;
  radius: number;
  color: number;
  glow: number;
}

export interface ZonePalette {
  skyTop: number;
  skyBottom: number;
  disc: SkyDisc | null;
  stars: boolean;
  /** null = the zone has no cloud layer. */
  cloud: number | null;
  cloudShadow: number;
  farFill: number;
  farRoof: number;
  nearFill: number;
  nearRoof: number;
  /** Lit windows on the near skyline; null = none. */
  windows: number | null;
  rain: boolean;
  /** Falling sakura petals (uses the rain layer with the petal texture). */
  petals: boolean;
  /** Other weather drawn on the same layer. */
  weather?: "fog" | "embers" | "dust" | "snow";
  groundAsphalt: number;
  groundSidewalk: number;
  groundCurb: number;
  groundDash: number;
  /** Which landmark set / drawing routine the skyline uses. */
  scenery:
    | "tokyo"
    | "tower"
    | "akiba"
    | "storm"
    | "moon"
    | "sakura"
    | "bay"
    | "wallstreet"
    | "london"
    | "hongkong"
    | "volcano"
    | "fuji"
    | "mars"
    | "galaxy";
}

export interface ZoneDef {
  id: string;
  name: Record<Locale, string>;
  /** The zone starts once the score reaches this value. Must be ascending. */
  startScore: number;
  /** Selectable in stage select from the start (otherwise it must be reached once). */
  freeSelect: boolean;
  palette: ZonePalette;
  /** Relative weights of the slot obstacles that may appear. */
  obstacles: Partial<Record<ObstacleKind, number>>;
  /** FUD paper planes: spawn interval range in ms, or null when the zone has none. */
  fud: { minMs: number; maxMs: number } | null;
  /** Vertical amplitude (px) of moving candles in this zone. */
  movingAmplitude: number;
  gravityScale: number;
  flapScale: number;
  /** Scroll speed multiplier on top of the difficulty curve. Never decreases from one zone to the next. */
  speedScale: number;
  /** Periodic vertical gusts (storm): interval range and impulse strength (px/s). */
  gust: { minMs: number; maxMs: number; force: number } | null;
  /** Moving enemies: weighted kinds and spawn interval range (ms). Absent = none. */
  enemies?: { kinds: Partial<Record<EnemyKind, number>>; minMs: number; maxMs: number };
  /** Drifting fog banks that hide part of the screen (visual only). */
  fog?: boolean;
  /** Gravity flips upside down for a while (tap pushes down). */
  flip?: { minMs: number; maxMs: number; durationMs: number };
}

export const ZONES: ZoneDef[] = [
  {
    id: "shibuya",
    name: { ja: "渋谷・昼", en: "Shibuya Day" },
    startScore: 0,
    freeSelect: true,
    palette: {
      skyTop: 0x3f8fe0,
      skyBottom: 0xc4e8ff,
      disc: { kind: "sun", x: GAME_WIDTH - 50, y: 158, radius: 21, color: 0xffe066, glow: 0xfff3b0 },
      stars: false,
      cloud: 0xffffff,
      cloudShadow: 0xcfe4fa,
      farFill: 0x8fb4e3,
      farRoof: 0xa6c6ee,
      nearFill: 0x3d5a8a,
      nearRoof: 0x52709f,
      windows: 0xffe08a,
      rain: false,
      petals: false,
      groundAsphalt: 0x3a4257,
      groundSidewalk: 0xd9d2c0,
      groundCurb: 0xa39b88,
      groundDash: 0xf2c94c,
      scenery: "tokyo",
    },
    obstacles: { candle: 1 },
    fud: null,
    movingAmplitude: 0,
    gravityScale: 1,
    flapScale: 1,
    speedScale: 1,
    gust: null,
  },
  {
    id: "sakura",
    name: { ja: "浅草・桜まつり", en: "Asakusa Sakura" },
    startScore: 15,
    freeSelect: true,
    palette: {
      skyTop: 0x7fb8ef,
      skyBottom: 0xffd9e6,
      disc: { kind: "sun", x: 70, y: 140, radius: 22, color: 0xfff1b5, glow: 0xffe3c2 },
      stars: false,
      cloud: 0xfff4f8,
      cloudShadow: 0xf3c6d8,
      farFill: 0xd99bb8,
      farRoof: 0xe9b4cc,
      nearFill: 0x8b3a4f,
      nearRoof: 0xa84a62,
      windows: 0xffe08a,
      rain: false,
      petals: true,
      groundAsphalt: 0x6b4f3a,
      groundSidewalk: 0xd9c7a6,
      groundCurb: 0xa8906c,
      groundDash: 0xf2c94c,
      scenery: "sakura",
    },
    obstacles: { candle: 0.7, volume: 0.3 },
    fud: null,
    movingAmplitude: 0,
    gravityScale: 1,
    flapScale: 1,
    speedScale: 1,
    gust: null,
  },
  {
    id: "tower",
    name: { ja: "東京タワー・夕焼け", en: "Tokyo Tower Sunset" },
    startScore: 30,
    freeSelect: true,
    palette: {
      skyTop: 0x4a2f7f,
      skyBottom: 0xffb36b,
      disc: { kind: "sun", x: GAME_WIDTH - 96, y: 330, radius: 30, color: 0xffd27a, glow: 0xffa64d },
      stars: false,
      cloud: 0xffc9a0,
      cloudShadow: 0xe39a7a,
      farFill: 0x6b4a8a,
      farRoof: 0x7d5c9c,
      nearFill: 0x2e2140,
      nearRoof: 0x3d2d55,
      windows: 0xffd27a,
      rain: false,
      petals: false,
      groundAsphalt: 0x2d2638,
      groundSidewalk: 0xc9a98c,
      groundCurb: 0x8f7461,
      groundDash: 0xf2c94c,
      scenery: "tower",
    },
    obstacles: { candle: 0.6, volume: 0.25, movingCandle: 0.15 },
    fud: null,
    movingAmplitude: 28,
    gravityScale: 1,
    flapScale: 1,
    speedScale: 1,
    gust: null,
  },
  {
    id: "bay",
    name: { ja: "東京湾・レインボーブリッジ", en: "Tokyo Bay Rainbow Bridge" },
    startScore: 45,
    freeSelect: true,
    palette: {
      skyTop: 0x0b1a3f,
      skyBottom: 0x2a4f8f,
      disc: { kind: "moon", x: GAME_WIDTH - 70, y: 100, radius: 15, color: 0xfff6cf, glow: 0x3f5a95 },
      stars: true,
      cloud: null,
      cloudShadow: 0x000000,
      farFill: 0x1c2f5e,
      farRoof: 0x2b4079,
      nearFill: 0x0f1d3f,
      nearRoof: 0x1a2c58,
      windows: 0xffe08a,
      rain: false,
      petals: false,
      groundAsphalt: 0x123a6b,
      groundSidewalk: 0x5f8fd1,
      groundCurb: 0x2f5fa8,
      groundDash: 0x8fc7ff,
      scenery: "bay",
    },
    obstacles: { candle: 0.5, movingCandle: 0.2, volume: 0.15, channel: 0.15 },
    fud: { minMs: 6000, maxMs: 10000 },
    movingAmplitude: 30,
    gravityScale: 1,
    flapScale: 1,
    speedScale: 1.01,
    gust: null,
  },
  {
    id: "akiba",
    name: { ja: "秋葉原・ネオンナイト", en: "Akiba Neon Night" },
    startScore: 60,
    freeSelect: true,
    palette: {
      skyTop: 0x070b1f,
      skyBottom: 0x1b2650,
      disc: { kind: "moon", x: 62, y: 112, radius: 17, color: 0xf5f1d8, glow: 0x3a4170 },
      stars: true,
      cloud: null,
      cloudShadow: 0x1f2a4d,
      farFill: 0x141c3a,
      farRoof: 0x222d55,
      nearFill: 0x0f1430,
      nearRoof: 0x1d2448,
      windows: 0xffe08a,
      rain: false,
      petals: false,
      groundAsphalt: 0x1c2235,
      groundSidewalk: 0x6b6f82,
      groundCurb: 0x4a4e60,
      groundDash: 0xd9b84c,
      scenery: "akiba",
    },
    obstacles: { candle: 0.45, volume: 0.15, movingCandle: 0.2, channel: 0.2 },
    fud: { minMs: 4500, maxMs: 8000 },
    movingAmplitude: 36,
    gravityScale: 1,
    flapScale: 1,
    speedScale: 1.02,
    gust: null,
  },
  {
    id: "storm",
    name: { ja: "暴落相場・嵐", en: "Crash Storm" },
    startScore: 80,
    freeSelect: false,
    palette: {
      skyTop: 0x1f2733,
      skyBottom: 0x5b6775,
      disc: null,
      stars: false,
      cloud: 0x6f7b8a,
      cloudShadow: 0x4f5a68,
      farFill: 0x2f3a4a,
      farRoof: 0x3b4858,
      nearFill: 0x1b2330,
      nearRoof: 0x27303e,
      windows: 0xcfd8e3,
      rain: true,
      petals: false,
      groundAsphalt: 0x242b36,
      groundSidewalk: 0x8a8f99,
      groundCurb: 0x5f656f,
      groundDash: 0xb9a34a,
      scenery: "storm",
    },
    obstacles: { candle: 0.35, movingCandle: 0.25, crash: 0.15, volume: 0.1, channel: 0.15 },
    fud: { minMs: 4000, maxMs: 7000 },
    movingAmplitude: 46,
    gravityScale: 1,
    flapScale: 1,
    speedScale: 1.03,
    gust: { minMs: 3500, maxMs: 6500, force: 190 },
  },
  {
    id: "moon",
    name: { ja: "TO THE MOON", en: "To the Moon" },
    startScore: 100,
    freeSelect: false,
    palette: {
      skyTop: 0x02030c,
      skyBottom: 0x0b1030,
      disc: { kind: "earth", x: GAME_WIDTH - 78, y: 118, radius: 24, color: 0x3b82f6, glow: 0x1e3a8a },
      stars: true,
      cloud: null,
      cloudShadow: 0x000000,
      farFill: 0x4b4f63,
      farRoof: 0x5d6178,
      nearFill: 0x2c2f40,
      nearRoof: 0x3a3d50,
      windows: null,
      rain: false,
      petals: false,
      groundAsphalt: 0x8a8da0,
      groundSidewalk: 0xa6a9bb,
      groundCurb: 0x6e7184,
      groundDash: 0x9ea1b4,
      scenery: "moon",
    },
    obstacles: { candle: 0.3, movingCandle: 0.2, volume: 0.15, channel: 0.15, crash: 0.2 },
    fud: { minMs: 3500, maxMs: 6500 },
    movingAmplitude: 48,
    gravityScale: 0.6,
    flapScale: 0.78,
    speedScale: 1.03,
    gust: null,
  },
  {
    id: "wallstreet",
    name: { ja: "ウォール街", en: "Wall Street" },
    startScore: 120,
    freeSelect: false,
    palette: {
      skyTop: 0x5a7fb0,
      skyBottom: 0xd8e4f0,
      disc: { kind: "sun", x: 64, y: 150, radius: 18, color: 0xfff4c2, glow: 0xffffff },
      stars: false,
      cloud: 0xf4f7fb,
      cloudShadow: 0xc7d3e2,
      farFill: 0x8796ad,
      farRoof: 0x9eacc0,
      nearFill: 0x3c4658,
      nearRoof: 0x525e73,
      windows: 0xfff1b8,
      rain: false,
      petals: false,
      groundAsphalt: 0x3b3f47,
      groundSidewalk: 0xbfb8a8,
      groundCurb: 0x8f887a,
      groundDash: 0xf2f2f2,
      scenery: "wallstreet",
    },
    obstacles: { candle: 0.3, movingCandle: 0.15, volume: 0.1, channel: 0.1, bars: 0.2, line: 0.15 },
    fud: { minMs: 5000, maxMs: 9000 },
    movingAmplitude: 48,
    gravityScale: 1,
    flapScale: 1,
    speedScale: 1.04,
    gust: null,
    enemies: { kinds: { bear: 1 }, minMs: 6000, maxMs: 10000 },
  },
  {
    id: "london",
    name: { ja: "ロンドン・霧", en: "London Fog" },
    startScore: 140,
    freeSelect: false,
    palette: {
      skyTop: 0x7d8794,
      skyBottom: 0xc9cfd6,
      disc: null,
      stars: false,
      cloud: 0xdfe3e8,
      cloudShadow: 0xaab2bc,
      farFill: 0x8a8f99,
      farRoof: 0x9aa0aa,
      nearFill: 0x4a4038,
      nearRoof: 0x5e5248,
      windows: 0xffd98a,
      rain: false,
      petals: false,
      weather: "fog",
      groundAsphalt: 0x3e4148,
      groundSidewalk: 0xa9a59c,
      groundCurb: 0x7d7a72,
      groundDash: 0xe8e8e8,
      scenery: "london",
    },
    obstacles: { candle: 0.3, movingCandle: 0.15, bars: 0.15, line: 0.15, renko: 0.15, channel: 0.1 },
    fud: null,
    movingAmplitude: 48,
    gravityScale: 1,
    flapScale: 1,
    speedScale: 1.04,
    gust: null,
    enemies: { kinds: { crow: 1 }, minMs: 6000, maxMs: 9500 },
    fog: true,
  },
  {
    id: "hongkong",
    name: { ja: "香港・夜景", en: "Hong Kong Night" },
    startScore: 160,
    freeSelect: false,
    palette: {
      skyTop: 0x0b0f2b,
      skyBottom: 0x3a1d5c,
      disc: { kind: "moon", x: GAME_WIDTH - 64, y: 120, radius: 15, color: 0xf3f0d8, glow: 0xd9d4b0 },
      stars: true,
      cloud: null,
      cloudShadow: 0x000000,
      farFill: 0x1d1b3f,
      farRoof: 0x2a2858,
      nearFill: 0x141230,
      nearRoof: 0x231f4a,
      windows: 0x7df9ff,
      rain: false,
      petals: false,
      groundAsphalt: 0x1a1830,
      groundSidewalk: 0x4b4766,
      groundCurb: 0x343050,
      groundDash: 0xff4fa3,
      scenery: "hongkong",
    },
    obstacles: { candle: 0.25, movingCandle: 0.15, renko: 0.15, orderbook: 0.2, line: 0.15, bars: 0.1 },
    fud: { minMs: 5000, maxMs: 9000 },
    movingAmplitude: 50,
    gravityScale: 1,
    flapScale: 1,
    speedScale: 1.05,
    gust: null,
    enemies: { kinds: { crow: 1, bear: 1 }, minMs: 5500, maxMs: 9000 },
  },
  {
    id: "volcano",
    name: { ja: "エルサルバドル・火山", en: "El Salvador Volcano" },
    startScore: 180,
    freeSelect: false,
    palette: {
      skyTop: 0x3a1a1a,
      skyBottom: 0xf08a4b,
      disc: { kind: "sun", x: GAME_WIDTH - 70, y: 170, radius: 24, color: 0xffb347, glow: 0xffd28a },
      stars: false,
      cloud: 0x6b4a46,
      cloudShadow: 0x4a302d,
      farFill: 0x4a2a24,
      farRoof: 0x5e362e,
      nearFill: 0x1f3b2a,
      nearRoof: 0x2c5239,
      windows: 0xffd98a,
      rain: false,
      petals: false,
      weather: "embers",
      groundAsphalt: 0x3a2a24,
      groundSidewalk: 0xc9a77c,
      groundCurb: 0x9a7a54,
      groundDash: 0xf7931a,
      scenery: "volcano",
    },
    obstacles: { candle: 0.25, movingCandle: 0.15, crash: 0.1, renko: 0.15, orderbook: 0.15, line: 0.2 },
    fud: null,
    movingAmplitude: 50,
    gravityScale: 1,
    flapScale: 1,
    speedScale: 1.05,
    gust: null,
    enemies: { kinds: { rock: 1 }, minMs: 3500, maxMs: 6500 },
  },
  {
    id: "fuji",
    name: { ja: "富士山・朝焼け", en: "Mt. Fuji Dawn" },
    startScore: 200,
    freeSelect: false,
    palette: {
      skyTop: 0x5b6fb5,
      skyBottom: 0xffc2a1,
      disc: { kind: "sun", x: 80, y: 190, radius: 26, color: 0xfff0b3, glow: 0xffd9a0 },
      stars: false,
      cloud: 0xfff1e8,
      cloudShadow: 0xf0c3b5,
      farFill: 0x6c7fb8,
      farRoof: 0xf8f8ff,
      nearFill: 0x2f4a3a,
      nearRoof: 0x3e5e4b,
      windows: null,
      rain: false,
      petals: false,
      weather: "snow",
      groundAsphalt: 0x4a5160,
      groundSidewalk: 0xe6ddd0,
      groundCurb: 0xb3a998,
      groundDash: 0xe8503f,
      scenery: "fuji",
    },
    obstacles: { candle: 0.25, movingCandle: 0.2, bars: 0.15, line: 0.15, orderbook: 0.1, channel: 0.15 },
    fud: null,
    movingAmplitude: 52,
    gravityScale: 1,
    flapScale: 1,
    speedScale: 1.06,
    gust: { minMs: 4500, maxMs: 8000, force: 170 },
    enemies: { kinds: { whale: 1, crow: 1 }, minMs: 6500, maxMs: 10000 },
  },
  {
    id: "mars",
    name: { ja: "火星", en: "Mars" },
    startScore: 225,
    freeSelect: false,
    palette: {
      skyTop: 0x4a1f14,
      skyBottom: 0xd9824e,
      disc: { kind: "sun", x: GAME_WIDTH - 60, y: 110, radius: 12, color: 0xfff6dc, glow: 0xffd9a8 },
      stars: true,
      cloud: null,
      cloudShadow: 0x000000,
      farFill: 0x9c4a2c,
      farRoof: 0xb85d39,
      nearFill: 0x6e2f1c,
      nearRoof: 0x8a3c25,
      windows: null,
      rain: false,
      petals: false,
      weather: "dust",
      groundAsphalt: 0x8a4a2e,
      groundSidewalk: 0xc27a4f,
      groundCurb: 0x9a5a38,
      groundDash: 0xd9a066,
      scenery: "mars",
    },
    obstacles: { candle: 0.2, movingCandle: 0.15, crash: 0.1, line: 0.15, renko: 0.15, orderbook: 0.15, bars: 0.1 },
    fud: null,
    movingAmplitude: 52,
    gravityScale: 0.8,
    flapScale: 0.88,
    speedScale: 1.06,
    gust: null,
    enemies: { kinds: { rock: 1, bear: 1 }, minMs: 5000, maxMs: 8500 },
    flip: { minMs: 9000, maxMs: 14000, durationMs: 4000 },
  },
  {
    id: "galaxy",
    name: { ja: "銀河の果て", en: "Edge of the Galaxy" },
    startScore: 250,
    freeSelect: false,
    palette: {
      skyTop: 0x05010f,
      skyBottom: 0x2b0b45,
      disc: { kind: "planet", x: 80, y: 130, radius: 20, color: 0xc084fc, glow: 0x7c3aed },
      stars: true,
      cloud: null,
      cloudShadow: 0x000000,
      farFill: 0x3b1d5e,
      farRoof: 0x5b2d8c,
      nearFill: 0x1e1036,
      nearRoof: 0x34205a,
      windows: 0x7df9ff,
      rain: false,
      petals: false,
      groundAsphalt: 0x241640,
      groundSidewalk: 0x4c3a75,
      groundCurb: 0x372a58,
      groundDash: 0x7df9ff,
      scenery: "galaxy",
    },
    obstacles: { candle: 0.2, movingCandle: 0.15, crash: 0.1, channel: 0.1, line: 0.15, renko: 0.1, orderbook: 0.1, bars: 0.1 },
    fud: { minMs: 5000, maxMs: 9000 },
    movingAmplitude: 54,
    gravityScale: 0.7,
    flapScale: 0.82,
    speedScale: 1.07,
    gust: null,
    enemies: { kinds: { whale: 1, rock: 1, crow: 1, bear: 1 }, minMs: 5000, maxMs: 8000 },
    flip: { minMs: 8000, maxMs: 13000, durationMs: 4000 },
  },
];

/** Index of the zone active at the given score. */
export function zoneIndexForScore(score: number): number {
  let index = 0;
  for (let i = 0; i < ZONES.length; i++) {
    if (score >= ZONES[i].startScore) index = i;
  }
  return index;
}

export function zoneForScore(score: number): ZoneDef {
  return ZONES[zoneIndexForScore(score)];
}
