import Phaser from "phaser";
import { OBSTACLES, TOP_MARGIN } from "../../constants";
import { TEX } from "../../textures";
import { nextCenter, spawnCandlePair } from "./candle";
import type { ObstacleEntry, SpawnContext } from "./types";

/** 大暴落: three tightly spaced bearish pairs whose gap steps down like a falling chart. */
export function spawnCrash(ctx: SpawnContext, x: number): ObstacleEntry[] {
  const { count, spacingRatio, stepDown, warningMs } = OBSTACLES.crash;
  const step = ctx.spacing * spacingRatio + OBSTACLES.candleWidth;
  const minCenter = TOP_MARGIN + ctx.gap / 2;
  const maxCenter = ctx.groundY - 28 - ctx.gap / 2;
  const startCenter = Phaser.Math.Clamp(
    nextCenter(ctx, minCenter, maxCenter - stepDown * (count - 1)),
    minCenter,
    maxCenter - stepDown * (count - 1),
  );

  // Warn at the right edge roughly one second before the cluster arrives.
  const icon = ctx.scene.add.image(ctx.width - 22, startCenter, TEX.iconCrash).setDepth(30);
  ctx.addFx(icon);
  ctx.scene.tweens.add({
    targets: icon,
    alpha: 0,
    duration: 110,
    yoyo: true,
    repeat: Math.max(1, Math.round(warningMs / 220) - 1),
    onComplete: () => icon.destroy(),
  });

  const entries: ObstacleEntry[] = [];
  for (let i = 0; i < count; i++) {
    entries.push(
      spawnCandlePair(ctx, x + i * step, { bearish: true, center: startCenter + i * stepDown, kind: "crash" }),
    );
  }
  return entries;
}
