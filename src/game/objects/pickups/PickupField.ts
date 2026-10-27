import Phaser from "phaser";
import { ECONOMY, pickItem, type ItemKind } from "@/config/economy";
import { OBSTACLES, TOP_MARGIN } from "../../constants";
import { PICKUP_TEX } from "../../textures";
import type { ObstacleKind } from "../../zones";

export interface PickupPlacement {
  kind: ObstacleKind;
  /** Left edge of the new obstacle. */
  x: number;
  /** Right edge of the previous obstacle, or null for the first one. */
  prevRightX: number | null;
  /** Flight heights: where the previous obstacle wanted the bird, and where this one does. */
  prevY: number | null;
  y: number;
  /** For channels / line charts: exit height and flight path; coins run along it. */
  exitY?: number;
  length?: number;
  path?: (x: number) => number;
  gap: number;
  groundY: number;
}

export type Pickup = Phaser.GameObjects.Image & { pickupKind: "coin" | ItemKind; collected: boolean };

export const ITEM_TEX: Record<ItemKind, string> = {
  magnet: PICKUP_TEX.magnet,
  shield: PICKUP_TEX.shield,
  rocket: PICKUP_TEX.rocket,
  slow: PICKUP_TEX.slow,
  double: PICKUP_TEX.double,
  mini: PICKUP_TEX.mini,
  laser: PICKUP_TEX.laser,
  feather: PICKUP_TEX.feather,
  coinRain: PICKUP_TEX.coinRain,
  heavy: PICKUP_TEX.heavy,
  smoke: PICKUP_TEX.smoke,
};

/** Coins (in-game sats) and items, laid out around the obstacles. */
export class PickupField {
  readonly group: Phaser.Physics.Arcade.Group;
  private pickups: Pickup[] = [];
  private speed = 0;
  private zoneIndex = 0;
  private readonly rng = new Phaser.Math.RandomDataGenerator();

  constructor(private readonly scene: Phaser.Scene) {
    this.group = scene.physics.add.group({ allowGravity: false, immovable: true });
  }

  reset(): void {
    this.group.clear(true, true);
    this.pickups = [];
  }

  setSpeed(speed: number): void {
    this.speed = speed;
    this.group.setVelocityX(-speed);
  }

  /** Zone index of the run, so bad items only show up from zone 4 on. */
  setZone(index: number): void {
    this.zoneIndex = index;
  }

  /**
   * Coin rain item: a wavy line of coins just ahead of bitty that follows the
   * flight path (`pathY`), so no coin ends up inside an obstacle.
   */
  rain(birdX: number, groundY: number, pathY: (x: number) => number): void {
    const n = ECONOMY.coinRainCount;
    for (let i = 0; i < n; i++) {
      const x = birdX + 60 + i * 26;
      const y = Phaser.Math.Clamp(pathY(x) + 14 * Math.sin(i / 2), TOP_MARGIN + 12, groundY - 24);
      this.add(x, y, "coin");
    }
  }

  /** Places a coin pattern (sometimes carrying an item) for a freshly spawned obstacle. */
  place(p: PickupPlacement): void {
    const minY = TOP_MARGIN + 12;
    const maxY = p.groundY - 24;
    const clampY = (y: number) => Phaser.Math.Clamp(y, minY, maxY);
    const points: Array<{ x: number; y: number }> = [];
    const tunnel = p.kind === "channel" || p.kind === "line";

    if (tunnel && p.exitY !== undefined && p.length !== undefined) {
      const n = Math.max(2, Math.floor(p.length / 56));
      for (let i = 0; i < n; i++) {
        const t = (i + 0.5) / n;
        const px = p.x + t * p.length;
        points.push({ x: px, y: clampY(p.path ? p.path(px) : Phaser.Math.Linear(p.y, p.exitY, t)) });
      }
    } else if (p.prevRightX !== null && p.prevY !== null && p.x - p.prevRightX > 90) {
      const xStart = p.prevRightX + 24;
      const xEnd = p.x - 20;
      const pattern = this.rng.between(0, 2);
      const n = pattern === 2 ? 6 : 5;
      for (let i = 0; i < n; i++) {
        const t = (i + 0.5) / n;
        const base = Phaser.Math.Linear(p.prevY, p.y, t);
        const offset = pattern === 0 ? -34 * Math.sin(Math.PI * t) : pattern === 1 ? 0 : i % 2 === 0 ? -22 : 22;
        points.push({ x: Phaser.Math.Linear(xStart, xEnd, t), y: clampY(base + offset) });
      }
      if (p.kind === "candle") points.push({ x: p.x + OBSTACLES.candleWidth / 2, y: clampY(p.y) });
    } else {
      points.push({ x: p.x + OBSTACLES.candleWidth / 2, y: clampY(p.y) });
    }

    const itemIndex = this.rng.frac() < ECONOMY.itemChance ? Math.floor(points.length / 2) : -1;
    points.forEach((pt, i) => {
      if (i === itemIndex) this.add(pt.x, pt.y, pickItem(this.zoneIndex, () => this.rng.frac(), !tunnel));
      else this.add(pt.x, pt.y, "coin");
    });
  }

  /**
   * Magnet pull, recycling. Returns how many coins scrolled away uncollected
   * (the combo breaks on a missed coin).
   */
  update(deltaMs: number, birdX: number, birdY: number, magnet: boolean): number {
    let missed = 0;
    const dt = deltaMs / 1000;
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const pk = this.pickups[i];
      if (magnet && pk.pickupKind === "coin") {
        const dx = birdX - pk.x;
        const dy = birdY - pk.y;
        const dist = Math.hypot(dx, dy);
        if (dist < ECONOMY.magnetRadius && dist > 1) {
          const step = Math.min(dist, ECONOMY.magnetPull * dt);
          pk.x += (dx / dist) * step;
          pk.y += (dy / dist) * step;
        }
      }
      if (pk.x < -20) {
        if (pk.pickupKind === "coin") missed++;
        this.remove(pk);
      }
    }
    return missed;
  }

  /** Marks a pickup as collected and removes it (with a tiny pop). */
  collect(pk: Pickup): void {
    if (pk.collected) return;
    pk.collected = true;
    this.pickups = this.pickups.filter((p) => p !== pk);
    this.group.remove(pk, false, false);
    (pk.body as Phaser.Physics.Arcade.Body).enable = false;
    this.scene.tweens.add({
      targets: pk,
      y: pk.y - 24,
      alpha: 0,
      scale: 1.6,
      duration: 220,
      ease: "Quad.easeOut",
      onComplete: () => pk.destroy(),
    });
  }

  private add(x: number, y: number, kind: "coin" | ItemKind): void {
    const tex = kind === "coin" ? PICKUP_TEX.coin : ITEM_TEX[kind];
    const img = this.scene.add.image(x, y, tex).setDepth(15) as Pickup;
    img.pickupKind = kind;
    img.collected = false;
    this.group.add(img);
    const body = img.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);
    body.setImmovable(true);
    body.setVelocityX(-this.speed);
    const r = kind === "coin" ? 7 : 11;
    body.setCircle(r, img.width / 2 - r, img.height / 2 - r);
    if (kind !== "coin") {
      this.scene.tweens.add({ targets: img, y: y - 6, duration: 600, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    }
    this.pickups.push(img);
  }

  private remove(pk: Pickup): void {
    this.pickups = this.pickups.filter((p) => p !== pk);
    this.group.remove(pk, true, true);
  }
}
