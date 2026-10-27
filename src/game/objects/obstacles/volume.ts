import Phaser from "phaser";
import { OBSTACLES, TOP_MARGIN } from "../../constants";
import { ObstacleEntry, type SpawnContext } from "./types";

const FILL = 0x4f7bd1;
const OUTLINE = 0x15306b;
const CAP = 0x9dbcff;

/** Volume histogram bars rising from the ground. No top obstacle: fly over them. */
export function spawnVolume(ctx: SpawnContext, x: number): ObstacleEntry[] {
  const { barWidth, minBars, maxBars, minHeightRatio, maxHeightRatio } = OBSTACLES.volume;
  const bars = ctx.rng.between(minBars, maxBars);
  const playHeight = ctx.groundY - TOP_MARGIN;
  const heights = Array.from({ length: bars }, () =>
    Math.round(playHeight * ctx.rng.realInRange(minHeightRatio, maxHeightRatio)),
  );
  const totalWidth = bars * barWidth;
  const left = x - totalWidth / 2;
  const parts: Phaser.GameObjects.GameObject[] = [];
  let anchor: Phaser.GameObjects.Rectangle | null = null;

  heights.forEach((h, i) => {
    const cx = left + i * barWidth + barWidth / 2;
    const overflow = 48;
    const rect = ctx.scene.add
      .rectangle(cx, ctx.groundY - h / 2 + overflow / 2, barWidth, h + overflow, FILL)
      .setStrokeStyle(2, OUTLINE)
      .setDepth(10);
    ctx.addPart(rect, true);
    const cap = ctx.scene.add.rectangle(cx, ctx.groundY - h + 4, barWidth - 8, 4, CAP).setDepth(11);
    ctx.addPart(cap, false);
    parts.push(rect, cap);
    anchor ??= rect;
  });

  const maxHeight = Math.max(...heights);
  const flyY = ctx.groundY - maxHeight - 72;
  // Bias the next candle gap upwards so the stream stays passable.
  ctx.lastCenter = Phaser.Math.Clamp(flyY, TOP_MARGIN + ctx.gap / 2, ctx.groundY - 28 - ctx.gap / 2);

  return [
    new ObstacleEntry(
      "volume",
      1,
      anchor!,
      totalWidth - barWidth / 2,
      totalWidth / 2 - barWidth / 2,
      parts,
      ctx.group,
      () => flyY,
    ),
  ];
}
