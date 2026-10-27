/**
 * Gameplay tunables. All numbers are in logical game pixels / seconds.
 * The game world is GAME_WIDTH wide; its height follows the viewport
 * (see layout.ts) and stays between MIN_HEIGHT and MAX_HEIGHT.
 */
export const GAME_WIDTH = 360;
/** 9:16 reference height (PC letterbox). */
export const MIN_HEIGHT = 640;
/** Tall phones (9:20) get a little more vertical space. */
export const MAX_HEIGHT = 800;

export const GROUND_HEIGHT = 56;
/** Keep obstacles away from the very top of the screen (HUD lives there). */
export const TOP_MARGIN = 64;

export const BIRD = {
  /** Horizontal position of the bird while playing. */
  x: 96,
  /** Downward acceleration (px/s²). */
  gravity: 1700,
  /** Upward velocity applied on every flap (px/s, negative = up). */
  flapVelocity: -440,
  /** Terminal falling speed (px/s). */
  maxFallSpeed: 760,
  /** Circle hitbox radius in texture pixels (sprite is 56x47). */
  hitboxRadius: 17,
  /** Rotation limits in degrees. */
  minAngle: -24,
  maxAngle: 88,
  /** How fast the sprite rotates towards its target angle (per second). */
  rotationLerp: 9,
  /** Squash & stretch amounts applied on a flap. */
  stretch: { scaleX: 0.82, scaleY: 1.22, durationMs: 70 },
};

export const OBSTACLES = {
  /**
   * Difficulty curve in three stages: base values at score 0, the "mid" values at
   * rampScore, the "late" values at lateScore, then flat. Everything else scales
   * from these (zone multipliers apply on top).
   */
  /** Scroll speed (px/s). */
  baseSpeed: 155,
  maxSpeed: 250,
  lateSpeed: 330,
  /** Vertical gap between wick tips (px). The bird's hitbox is 34 px tall. */
  baseGap: 172,
  minGap: 126,
  lateGap: 110,
  /** Horizontal distance between consecutive candle pairs (px). */
  baseSpacing: 236,
  minSpacing: 196,
  lateSpacing: 170,
  /** Score where the mid values are reached. */
  rampScore: 90,
  /** Score where the late values are reached; nothing gets harder after this. */
  lateScore: 250,
  /** Candle body width and wick width. */
  candleWidth: 48,
  wickWidth: 6,
  /** Wick length range (each wick points into the gap). */
  wickMin: 10,
  wickMax: 26,
  /**
   * Vertical drift of the gap centre between consecutive obstacles (chart-like).
   * The limit follows the time between obstacles (driftRate px per second of it),
   * so faster, tighter streams don't also demand ever bigger climbs and dives.
   */
  maxDrift: 150,
  minDrift: 60,
  driftRate: 180,

  /** Moving candles: vertical oscillation period. Amplitude comes from the zone. */
  moving: { periodMs: 2400 },
  /** Volume histogram bars rising from the ground. Heights are ratios of the play height. */
  volume: { barWidth: 36, minBars: 2, maxBars: 3, minHeightRatio: 0.22, maxHeightRatio: 0.42 },
  /** Support / resistance channel: a sloped tunnel spanning `lengthSlots` obstacle slots. */
  channel: { lengthSlots: 2, segmentWidth: 24, lineThickness: 8, extraGap: 24, riseMin: 70, riseMax: 140 },
  /** Crash cluster: `count` bearish pairs, tightly spaced, gap stepping down. */
  crash: { count: 3, spacingRatio: 0.6, stepDown: 46, warningMs: 1000 },
  /** 折れ線: zigzag tunnel through `vertices` points over `lengthSlots` slots. */
  line: { lengthSlots: 2, segmentWidth: 24, lineThickness: 8, extraGap: 40, riseMin: 40, riseMax: 75, vertices: 4 },
  /** 棒グラフ: thin bars, `step` px apart, gap waving by `wave` px. */
  bars: { count: 4, barWidth: 22, step: 34, extraGap: 12, wave: 30 },
  /** レンコー: brick columns stepping `stepY` px per column. */
  renko: { columns: 4, brick: 40, stepY: 22, extraGap: 16 },
  /** 板の壁: a wide wall whose gap slides up and down. */
  orderbook: { width: 72, extraGap: 18, amplitude: 40, periodMs: 3200 },
  /** FUD paper planes fly faster than the scroll and are announced with a "!" first. */
  fud: { speedBonus: 160, warningMs: 1000, width: 44, height: 22 },
};

export const ZONE = {
  /** Background crossfade when the zone changes (ms). */
  transitionMs: 1000,
  /** Obstacle hits are ignored for this long after a zone change (ms). */
  graceMs: 1000,
  /** How long the "ZONE n" banner stays on screen (ms). */
  bannerMs: 1700,
  /** Lightning flashes in the storm zone: interval range (ms). */
  flashMinMs: 4000,
  flashMaxMs: 9000,
  /** Gust warning shown before the push (ms). */
  gustWarningMs: 800,
  /** London fog banks: interval range (ms), width (px) and opacity. */
  fogMinMs: 4500,
  fogMaxMs: 8000,
  fogWidth: 200,
  fogAlpha: 0.78,
  /** Obstacle hits are ignored this long after the rocket ends (ms). */
  rocketGraceMs: 600,
  /** Gravity flip warning before the switch (ms). */
  flipWarningMs: 1000,
};

export const PARALLAX = {
  /** Fraction of the obstacle speed used by each background layer. */
  clouds: 0.08,
  farSkyline: 0.18,
  nearSkyline: 0.4,
  ground: 1,
  /** Background keeps moving slowly on the menu / ready screens. */
  idleSpeed: 40,
};

export const TIMING = {
  /** Delay between the crash and the game-over overlay (ms, upper bound). */
  deathToGameOverMs: 1100,
  /** Ignore "retry" keypresses for this long after dying (ms). */
  gameOverInputLockMs: 500,
};
