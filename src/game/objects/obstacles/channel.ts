import Phaser from "phaser";
import { OBSTACLES, TOP_MARGIN } from "../../constants";
import { BEAR, BULL, nextCenter } from "./candle";
import { ObstacleEntry, type SpawnContext } from "./types";

/**
 * Support / resistance channel: two sloped lines (built from pixel segments
 * so the hitboxes stay axis-aligned) forming a tunnel two slots long.
 */
export function spawnChannel(ctx: SpawnContext, x: number): ObstacleEntry[] {
  const { lengthSlots, segmentWidth, lineThickness, extraGap, riseMin, riseMax } = OBSTACLES.channel;
  const length = lengthSlots * (ctx.spacing + OBSTACLES.candleWidth);
  const gap = ctx.gap + extraGap;
  const minCenter = TOP_MARGIN + gap / 2 + 10;
  const maxCenter = ctx.groundY - 30 - gap / 2;
  const c0 = nextCenter(ctx, minCenter, maxCenter);
  const direction = ctx.rng.frac() < 0.5 ? -1 : 1;
  const c1 = Phaser.Math.Clamp(c0 + direction * ctx.rng.between(riseMin, riseMax), minCenter, maxCenter);
  const rise = c1 - c0;
  ctx.lastCenter = c1;

  const parts: Phaser.GameObjects.GameObject[] = [];
  const segments = Math.ceil(length / segmentWidth);
  let anchor: Phaser.GameObjects.Rectangle | null = null;
  for (let i = 0; i < segments; i++) {
    const sx = x + i * segmentWidth + segmentWidth / 2;
    const cy = c0 + (rise * (i + 0.5)) / segments;
    const top = ctx.scene.add
      .rectangle(sx, cy - gap / 2 - lineThickness / 2, segmentWidth, lineThickness, BEAR.fill)
      .setStrokeStyle(2, BEAR.outline)
      .setDepth(10);
    const bottom = ctx.scene.add
      .rectangle(sx, cy + gap / 2 + lineThickness / 2, segmentWidth, lineThickness, BULL.fill)
      .setStrokeStyle(2, BULL.outline)
      .setDepth(10);
    ctx.addPart(top, true);
    ctx.addPart(bottom, true);
    parts.push(top, bottom);
    anchor ??= top;
  }

  const fontFamily = (ctx.scene.registry.get("fontFamily") as string | undefined) || "monospace";
  const label = ctx.scene.add
    .text(x - 8, c0, "CHANNEL", { fontFamily, fontSize: "11px", color: "#ffffff", stroke: "#1b2a4a", strokeThickness: 3 })
    .setOrigin(1, 0.5)
    .setDepth(12);
  ctx.addPart(label, false);
  parts.push(label);

  const entranceOffset = -segmentWidth / 2; // anchor is the first segment's centre
  return [
    new ObstacleEntry(
      "channel",
      2,
      anchor!,
      length + entranceOffset,
      length + entranceOffset,
      parts,
      ctx.group,
      (px, anchorX) => {
        const t = Phaser.Math.Clamp((px - (anchorX + entranceOffset)) / length, 0, 1);
        return c0 + rise * t;
      },
    ),
  ];
}
