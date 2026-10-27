import Phaser from "phaser";
import { OBSTACLES, TOP_MARGIN } from "../../constants";
import { TEX } from "../../textures";
import { BEAR, BULL, nextCenter } from "./candle";
import { ObstacleEntry, type SpawnContext } from "./types";

/**
 * Chart shapes beyond candlesticks. Every part is an axis-aligned rectangle so
 * the arcade hitboxes match what the player sees.
 */

const LINE = { fill: 0x38bdf8, outline: 0x0c4a6e, dot: 0xffffff };
const BAR_COLORS = [
  { fill: 0x60a5fa, outline: 0x1e3a8a },
  { fill: 0xf59e0b, outline: 0x78350f },
];

/** Piecewise-linear interpolation through (x, y) points sorted by x. */
function pathAt(points: Array<{ x: number; y: number }>, x: number): number {
  if (x <= points[0].x) return points[0].y;
  for (let i = 1; i < points.length; i++) {
    if (x <= points[i].x) {
      const a = points[i - 1];
      const b = points[i];
      return Phaser.Math.Linear(a.y, b.y, (x - a.x) / (b.x - a.x));
    }
  }
  return points[points.length - 1].y;
}

/**
 * 折れ線チャート: a zigzag tunnel two slots long. The bird follows the line
 * between an upper and a lower trace.
 */
export function spawnLine(ctx: SpawnContext, x: number): ObstacleEntry[] {
  const { lengthSlots, segmentWidth, lineThickness, extraGap, riseMin, riseMax, vertices } = OBSTACLES.line;
  const length = lengthSlots * (ctx.spacing + OBSTACLES.candleWidth);
  const gap = ctx.gap + extraGap;
  const minCenter = TOP_MARGIN + gap / 2 + 10;
  const maxCenter = ctx.groundY - 30 - gap / 2;
  let y = nextCenter(ctx, minCenter, maxCenter);
  let direction = ctx.rng.frac() < 0.5 ? -1 : 1;
  const local: Array<{ x: number; y: number }> = [{ x: 0, y }];
  for (let i = 1; i < vertices; i++) {
    let next = y + direction * ctx.rng.between(riseMin, riseMax);
    if (next < minCenter || next > maxCenter) {
      direction = -direction;
      next = y + direction * ctx.rng.between(riseMin, riseMax);
    }
    y = Phaser.Math.Clamp(next, minCenter, maxCenter);
    local.push({ x: (length * i) / (vertices - 1), y });
    direction = -direction; // zigzag
  }
  ctx.lastCenter = y;

  const parts: Phaser.GameObjects.GameObject[] = [];
  const segments = Math.ceil(length / segmentWidth);
  let anchor: Phaser.GameObjects.Rectangle | null = null;
  for (let i = 0; i < segments; i++) {
    const lx = i * segmentWidth + segmentWidth / 2;
    const cy = pathAt(local, lx);
    for (const side of [-1, 1]) {
      const r = ctx.scene.add
        .rectangle(x + lx, cy + side * (gap / 2 + lineThickness / 2), segmentWidth, lineThickness, LINE.fill)
        .setStrokeStyle(2, LINE.outline)
        .setDepth(10);
      ctx.addPart(r, true);
      parts.push(r);
      anchor ??= r;
    }
  }
  // Vertex markers, like the dots on a line chart.
  for (const v of local) {
    for (const side of [-1, 1]) {
      const dot = ctx.scene.add.rectangle(x + v.x, v.y + side * (gap / 2 + lineThickness / 2), 8, 8, LINE.dot).setDepth(11);
      ctx.addPart(dot, false);
      parts.push(dot);
    }
  }

  const entranceOffset = -segmentWidth / 2;
  return [
    new ObstacleEntry(
      "line",
      2,
      anchor!,
      length + entranceOffset,
      length + entranceOffset,
      parts,
      ctx.group,
      (px, anchorX) => pathAt(local, px - (anchorX + entranceOffset)),
    ),
  ];
}

/** 棒グラフ: a short run of thin bars whose gap waves gently. */
export function spawnBars(ctx: SpawnContext, x: number): ObstacleEntry[] {
  const { count, barWidth, step, extraGap, wave } = OBSTACLES.bars;
  const gap = ctx.gap + extraGap;
  const minCenter = TOP_MARGIN + gap / 2 + wave;
  const maxCenter = ctx.groundY - 28 - gap / 2 - wave;
  const c0 = nextCenter(ctx, minCenter, maxCenter);
  const phase = ctx.rng.frac() * Math.PI * 2;
  const centers = Array.from({ length: count }, (_, i) => c0 + wave * Math.sin(phase + (i * Math.PI) / 2));
  ctx.lastCenter = centers[count - 1];
  const overflow = 48;
  const parts: Phaser.GameObjects.GameObject[] = [];
  let anchor: Phaser.GameObjects.Rectangle | null = null;
  centers.forEach((c, i) => {
    const bx = x + i * step;
    const color = BAR_COLORS[i % 2];
    const topH = c - gap / 2 + overflow;
    const top = ctx.scene.add
      .rectangle(bx, (c - gap / 2 - overflow) / 2, barWidth, topH, color.fill)
      .setStrokeStyle(2, color.outline)
      .setDepth(10);
    const bottomY = c + gap / 2;
    const bottom = ctx.scene.add
      .rectangle(bx, (bottomY + ctx.groundY + overflow) / 2, barWidth, ctx.groundY + overflow - bottomY, color.fill)
      .setStrokeStyle(2, color.outline)
      .setDepth(10);
    ctx.addPart(top, true);
    ctx.addPart(bottom, true);
    parts.push(top, bottom);
    anchor ??= top;
  });
  const span = (count - 1) * step;
  return [
    new ObstacleEntry(
      "bars",
      1,
      anchor!,
      span + barWidth / 2,
      span / 2,
      parts,
      ctx.group,
      (px, anchorX) => {
        const i = Phaser.Math.Clamp((px - anchorX) / step, 0, count - 1);
        const lo = Math.floor(i);
        const hi = Math.min(count - 1, lo + 1);
        return Phaser.Math.Linear(centers[lo], centers[hi], i - lo);
      },
    ),
  ];
}

/** レンコー足: brick columns that step up or down like a staircase. */
export function spawnRenko(ctx: SpawnContext, x: number): ObstacleEntry[] {
  const { columns, brick, stepY, extraGap } = OBSTACLES.renko;
  const gap = ctx.gap + extraGap;
  const direction = ctx.rng.frac() < 0.5 ? -1 : 1; // -1 = rising (bullish)
  const minCenter = TOP_MARGIN + gap / 2;
  const maxCenter = ctx.groundY - 28 - gap / 2;
  const travel = stepY * (columns - 1);
  const lo = direction < 0 ? minCenter + travel : minCenter;
  const hi = direction < 0 ? maxCenter : maxCenter - travel;
  const c0 = Phaser.Math.Clamp(nextCenter(ctx, lo, hi), lo, hi);
  const centers = Array.from({ length: columns }, (_, i) => c0 + direction * stepY * i);
  ctx.lastCenter = centers[columns - 1];
  const palette = direction < 0 ? BULL : BEAR;
  const overflow = 48;
  const parts: Phaser.GameObjects.GameObject[] = [];
  let anchor: Phaser.GameObjects.Rectangle | null = null;

  const column = (cx: number, y1: number, y2: number) => {
    const h = Math.max(4, y2 - y1);
    const r = ctx.scene.add
      .rectangle(cx, y1 + h / 2, brick, h, palette.fill)
      .setStrokeStyle(2, palette.outline)
      .setDepth(10);
    ctx.addPart(r, true);
    parts.push(r);
    // Brick joints (decoration only).
    for (let y = y2 - brick; y > y1; y -= brick) {
      const joint = ctx.scene.add.rectangle(cx, y, brick - 4, 2, palette.shade).setDepth(11);
      ctx.addPart(joint, false);
      parts.push(joint);
    }
    return r;
  };
  centers.forEach((c, i) => {
    const cx = x + i * brick;
    const top = column(cx, -overflow, c - gap / 2);
    column(cx, c + gap / 2, ctx.groundY + overflow);
    anchor ??= top;
  });
  const span = (columns - 1) * brick;
  return [
    new ObstacleEntry(
      "renko",
      1,
      anchor!,
      span + brick / 2,
      span / 2,
      parts,
      ctx.group,
      (px, anchorX) => {
        const i = Phaser.Math.Clamp(Math.round((px - anchorX) / brick), 0, columns - 1);
        return centers[i];
      },
    ),
  ];
}

/** 板の壁: a thick sell wall on top and buy wall below; the gap between them slides. */
export function spawnOrderbook(ctx: SpawnContext, x: number): ObstacleEntry[] {
  const { width, extraGap, amplitude, periodMs } = OBSTACLES.orderbook;
  const gap = ctx.gap + extraGap;
  const minCenter = TOP_MARGIN + gap / 2 + amplitude;
  const maxCenter = ctx.groundY - 28 - gap / 2 - amplitude;
  const center = Phaser.Math.Clamp(nextCenter(ctx, minCenter, maxCenter), minCenter, maxCenter);
  ctx.lastCenter = center;
  const overflow = 48 + amplitude;
  const parts: Phaser.GameObjects.GameObject[] = [];

  const wall = (y1: number, y2: number, pal: typeof BULL, fromTop: boolean) => {
    const h = y2 - y1;
    const r = ctx.scene.add
      .rectangle(x, y1 + h / 2, width, h, pal.fill)
      .setStrokeStyle(3, pal.outline)
      .setDepth(10);
    ctx.addPart(r, true);
    parts.push(r);
    // Depth bars: longer near the gap, like an order book ladder.
    for (let k = 0; k < 6; k++) {
      const w = width - 10 - k * 9;
      const yy = fromTop ? y2 - 8 - k * 12 : y1 + 8 + k * 12;
      const bar = ctx.scene.add.rectangle(x, yy, Math.max(8, w), 6, pal.light).setDepth(11);
      ctx.addPart(bar, false);
      parts.push(bar);
    }
    return r;
  };
  const anchor = wall(-overflow, center - gap / 2, BEAR, true);
  wall(center + gap / 2, ctx.groundY + overflow, BULL, false);
  const icon = ctx.scene.add.image(x + width / 2 + 14, center - gap / 2 - 14, TEX.iconMove).setDepth(12);
  ctx.addPart(icon, false);
  parts.push(icon);

  const movers = parts.map((p) => {
    const part = p as unknown as Phaser.GameObjects.Components.Transform;
    return { part, baseY: part.y };
  });
  let t = ctx.rng.realInRange(0, periodMs);
  let offset = 0;
  return [
    new ObstacleEntry(
      "orderbook",
      1,
      anchor,
      width / 2,
      width / 2,
      parts,
      ctx.group,
      () => center + offset,
      (deltaMs) => {
        t += deltaMs;
        offset = amplitude * Math.sin((2 * Math.PI * t) / periodMs);
        for (const m of movers) m.part.y = m.baseY + offset;
      },
    ),
  ];
}
