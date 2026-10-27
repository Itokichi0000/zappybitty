import Phaser from "phaser";
import { OBSTACLES, TOP_MARGIN } from "../../constants";
import { maxDriftFor } from "../../difficulty";
import { TEX } from "../../textures";
import { ObstacleEntry, type SpawnContext } from "./types";

export interface CandlePalette {
  fill: number;
  light: number;
  shade: number;
  outline: number;
}

/** 陽線 (bullish, green) and 陰線 (bearish, red). */
export const BULL: CandlePalette = { fill: 0x2ecc71, light: 0x7ef0b0, shade: 0x1d9d55, outline: 0x0d3d22 };
export const BEAR: CandlePalette = { fill: 0xe8503f, light: 0xf79a8a, shade: 0xb5382a, outline: 0x4a110b };

/**
 * Drifts the gap centre from the previous obstacle so the stream reads like a chart.
 * The drift shrinks with the time until bitty reaches the new obstacle.
 */
export function nextCenter(ctx: SpawnContext, minCenter: number, maxCenter: number): number {
  if (ctx.lastCenter === null) return ctx.rng.between(minCenter, maxCenter);
  const drift = maxDriftFor((ctx.spacing + OBSTACLES.candleWidth) / ctx.speed);
  return Phaser.Math.Clamp(ctx.lastCenter + ctx.rng.between(-drift, drift), minCenter, maxCenter);
}

export interface CandleOptions {
  /** Vertical oscillation amplitude; > 0 makes a moving candle. */
  amplitude?: number;
  /** Force both candles bearish (crash clusters). */
  bearish?: boolean;
  /** Explicit gap centre (clamped) instead of drifting from the previous one. */
  center?: number;
  /** Kind recorded on the entry (crash clusters reuse the candle builder). */
  kind?: "candle" | "movingCandle" | "crash";
}

/** A candlestick pair: one hanging from the top, one rising from the ground, wicks pointing into the gap. */
export function spawnCandlePair(ctx: SpawnContext, x: number, opts: CandleOptions = {}): ObstacleEntry {
  const { candleWidth, wickWidth, wickMin, wickMax } = OBSTACLES;
  const amplitude = opts.amplitude ?? 0;
  const gap = ctx.gap;
  const minCenter = TOP_MARGIN + gap / 2 + amplitude;
  const maxCenter = ctx.groundY - 28 - gap / 2 - amplitude;
  const center =
    opts.center !== undefined
      ? Phaser.Math.Clamp(opts.center, minCenter, maxCenter)
      : nextCenter(ctx, minCenter, maxCenter);
  ctx.lastCenter = center;

  const wickTop = ctx.rng.between(wickMin, wickMax);
  const wickBottom = ctx.rng.between(wickMin, wickMax);
  const gapTop = center - gap / 2;
  const gapBottom = center + gap / 2;
  const overflow = 48 + amplitude;
  const topPalette = opts.bearish || ctx.rng.frac() < 0.5 ? BEAR : BULL;
  const bottomPalette = opts.bearish || ctx.rng.frac() < 0.5 ? BEAR : BULL;
  const parts: Phaser.GameObjects.GameObject[] = [];

  const body = (y1: number, y2: number, pal: CandlePalette) => {
    const h = Math.max(4, y2 - y1);
    const cy = y1 + h / 2;
    const rect = ctx.scene.add.rectangle(x, cy, candleWidth, h, pal.fill).setStrokeStyle(2, pal.outline).setDepth(10);
    ctx.addPart(rect, true);
    const light = ctx.scene.add.rectangle(x - candleWidth / 2 + 6, cy, 5, Math.max(1, h - 6), pal.light).setDepth(11);
    ctx.addPart(light, false);
    const shade = ctx.scene.add.rectangle(x + candleWidth / 2 - 6, cy, 5, Math.max(1, h - 6), pal.shade).setDepth(11);
    ctx.addPart(shade, false);
    parts.push(rect, light, shade);
    return rect;
  };
  /** Only the half next to the body collides: grazing the thin tip is forgiven. */
  const wick = (y1: number, y2: number, pal: CandlePalette, bodyAbove: boolean) => {
    const h = Math.max(2, y2 - y1);
    const rect = ctx.scene.add
      .rectangle(x, y1 + h / 2, wickWidth, h, pal.fill)
      .setStrokeStyle(2, pal.outline)
      .setDepth(10);
    ctx.addPart(rect, true);
    const hitbox = rect.body as Phaser.Physics.Arcade.Body;
    hitbox.setSize(wickWidth, h / 2, false).setOffset(0, bodyAbove ? 0 : h / 2);
    parts.push(rect);
  };

  const anchor = body(-overflow, gapTop - wickTop, topPalette);
  wick(gapTop - wickTop, gapTop, topPalette, true);
  wick(gapBottom, gapBottom + wickBottom, bottomPalette, false);
  body(gapBottom + wickBottom, ctx.groundY + overflow, bottomPalette);

  let updateFn: ((deltaMs: number) => void) | undefined;
  let offset = 0;
  if (amplitude > 0) {
    const icon = ctx.scene.add.image(x + candleWidth / 2 + 16, gapTop - 14, TEX.iconMove).setDepth(12);
    ctx.addPart(icon, false);
    parts.push(icon);
    const movers = parts.map((p) => {
      const part = p as unknown as Phaser.GameObjects.Components.Transform;
      return { part, baseY: part.y };
    });
    let t = ctx.rng.realInRange(0, OBSTACLES.moving.periodMs);
    updateFn = (deltaMs) => {
      t += deltaMs;
      offset = amplitude * Math.sin((2 * Math.PI * t) / OBSTACLES.moving.periodMs);
      for (const m of movers) m.part.y = m.baseY + offset;
    };
  }

  return new ObstacleEntry(
    opts.kind ?? (amplitude > 0 ? "movingCandle" : "candle"),
    1,
    anchor,
    candleWidth / 2,
    candleWidth / 2,
    parts,
    ctx.group,
    () => center + offset,
    updateFn,
  );
}
