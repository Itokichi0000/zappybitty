import Phaser from "phaser";
import { BIRD, OBSTACLES } from "../../constants";
import type { Difficulty } from "../../difficulty";
import type { ObstacleKind, ZoneDef } from "../../zones";
import { spawnCandlePair } from "./candle";
import { spawnChannel } from "./channel";
import { spawnBars, spawnLine, spawnOrderbook, spawnRenko } from "./charts";
import { spawnCrash } from "./crash";
import { FudHazard } from "./FudHazard";
import { pickKind } from "./picker";
import { type ObstacleEntry, type SpawnContext, type Spawner } from "./types";
import { spawnVolume } from "./volume";

export interface SpawnReport {
  kind: ObstacleKind;
  /** Left edge of the first new entry. */
  x: number;
  prevRightX: number | null;
  prevY: number | null;
  /** Flight height at the entry (and exit for channels). */
  y: number;
  exitY?: number;
  length?: number;
  /** Flight height along a long obstacle (channels, line charts); coins follow it. */
  path?: (x: number) => number;
  gap: number;
  groundY: number;
}

/** Long obstacles whose left edge is the spawn x itself (others are centred on it). */
const TUNNELS: ObstacleKind[] = ["channel", "line"];

/** Half the width of the first column of each centred obstacle. */
function halfWidth(kind: ObstacleKind): number {
  switch (kind) {
    case "bars":
      return OBSTACLES.bars.barWidth / 2;
    case "renko":
      return OBSTACLES.renko.brick / 2;
    case "orderbook":
      return OBSTACLES.orderbook.width / 2;
    default:
      return OBSTACLES.candleWidth / 2;
  }
}

/**
 * The obstacle stream: picks slot obstacles from the zone's weights, spawns
 * them ahead of the bird, scores them as they are passed and recycles them.
 * FUD planes (hazards that don't occupy a slot) live in a second group.
 */
export class ObstacleField {
  /** Collidable slot obstacles. */
  readonly group: Phaser.Physics.Arcade.Group;
  readonly fud: FudHazard;

  private entries: ObstacleEntry[] = [];
  private fx: Phaser.GameObjects.GameObject[] = [];
  private recent: ObstacleKind[] = [];
  private speed = 0;
  private lastCenter: number | null = null;
  private readonly rng = new Phaser.Math.RandomDataGenerator();
  private readonly spawners: Record<ObstacleKind, Spawner>;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly onSpawn?: (report: SpawnReport) => void,
  ) {
    this.group = scene.physics.add.group({ allowGravity: false, immovable: true });
    this.fud = new FudHazard(scene, this.rng);
    this.spawners = {
      candle: (ctx, x) => [spawnCandlePair(ctx, x)],
      movingCandle: (ctx, x) => [spawnCandlePair(ctx, x, { amplitude: ctx.zone.movingAmplitude })],
      volume: spawnVolume,
      channel: spawnChannel,
      crash: spawnCrash,
      line: spawnLine,
      bars: spawnBars,
      renko: spawnRenko,
      orderbook: spawnOrderbook,
    };
  }

  get hazardGroup(): Phaser.Physics.Arcade.Group {
    return this.fud.group;
  }

  get count(): number {
    return this.entries.length;
  }

  reset(nowMs: number, zone: ZoneDef): void {
    this.group.clear(true, true);
    for (const obj of this.fx) obj.destroy();
    this.fx = [];
    this.entries = [];
    this.recent = [];
    this.lastCenter = null;
    this.fud.reset(nowMs, zone);
  }

  setSpeed(speed: number): void {
    this.speed = speed;
    this.group.setVelocityX(-speed);
    this.fud.setSpeed(speed);
  }

  /** Keeps the stream populated ahead of the bird. Call every frame while playing. */
  maintain(difficulty: Difficulty, zone: ZoneDef, groundY: number, nowMs: number): void {
    const width = this.scene.scale.width;
    const spacing = Math.max(60, difficulty.spacing - OBSTACLES.candleWidth);
    const spawnX = width + OBSTACLES.candleWidth;
    const last = this.entries[this.entries.length - 1];

    if (!last) {
      this.spawn("candle", spawnX + 140, difficulty, zone, spacing, groundY);
    } else if (last.rightX <= spawnX - spacing) {
      const kind = pickKind(zone.obstacles, this.recent, () => this.rng.frac());
      let x = Math.max(spawnX, last.rightX + spacing);
      if (kind === "crash") x += this.speed * (OBSTACLES.crash.warningMs / 1000);
      this.spawn(kind, x, difficulty, zone, spacing, groundY);
    }

    const avoid = this.entries
      .filter((e) => e.scoreX > width - 60 && e.scoreX < width + 360)
      .map((e) => e.targetY(width));
    this.fud.maintain(zone, nowMs, groundY, width, avoid);
  }

  /** Advances moving obstacles, scores passed ones, recycles off-screen ones. Returns points gained. */
  update(birdX: number, deltaMs: number): number {
    let gained = 0;
    for (let i = this.entries.length - 1; i >= 0; i--) {
      const entry = this.entries[i];
      entry.update(deltaMs);
      if (!entry.scored && entry.scoreX < birdX) {
        entry.scored = true;
        gained += entry.points;
      }
      if (entry.rightX < -40) {
        entry.destroy();
        this.entries.splice(i, 1);
      }
    }
    return gained;
  }

  /**
   * Laser eyes: destroys every obstacle that reaches into [fromX, toX] and is still
   * ahead of bitty. Points for them are awarded as if they had been passed.
   * Returns the points and the x positions hit (for the beam effect).
   */
  blast(fromX: number, toX: number): { points: number; hits: number[] } {
    let points = 0;
    const hits: number[] = [];
    this.entries = this.entries.filter((entry) => {
      const hit = entry.rightX > fromX && entry.scoreX < toX && !entry.scored;
      if (!hit) return true;
      points += entry.points;
      hits.push(Math.max(fromX + 20, entry.scoreX));
      entry.destroy();
      return false;
    });
    return { points, hits };
  }

  /** Removes every obstacle that starts before x and any FUD plane (used by continue). */
  clearAhead(x: number, zone: ZoneDef): void {
    this.entries = this.entries.filter((entry) => {
      const keep = entry.rightX - 400 > x;
      if (!keep) entry.destroy();
      return keep;
    });
    this.fud.reset(this.scene.time.now, zone);
  }

  /**
   * Recommended flight height for something at x: the path through the first
   * obstacle that x has not fully cleared yet (hitbox included), or the fallback.
   */
  recommendedY(x: number, fallback: number): number {
    const clearance = BIRD.hitboxRadius + 4;
    const next = this.entries.find((e) => e.rightX > x - clearance);
    return next ? next.targetY(x) : fallback;
  }

  private spawn(
    kind: ObstacleKind,
    x: number,
    difficulty: Difficulty,
    zone: ZoneDef,
    spacing: number,
    groundY: number,
  ): void {
    const ctx: SpawnContext = {
      scene: this.scene,
      group: this.group,
      rng: this.rng,
      gap: difficulty.gap,
      spacing,
      speed: this.speed,
      groundY,
      width: this.scene.scale.width,
      zone,
      lastCenter: this.lastCenter,
      addPart: (part, collides) => this.addPart(part, collides),
      addFx: (obj) => {
        this.fx.push(obj);
        obj.once(Phaser.GameObjects.Events.DESTROY, () => {
          this.fx = this.fx.filter((o) => o !== obj);
        });
      },
    };
    const prev = this.entries[this.entries.length - 1];
    const prevY = prev ? prev.targetY(prev.rightX) : null;
    const created = this.spawners[kind](ctx, x);
    this.lastCenter = ctx.lastCenter;
    if (created.length > 0 && this.onSpawn) {
      const first = created[0];
      const tunnel = TUNNELS.includes(kind);
      const leftX = tunnel ? x : x - halfWidth(kind);
      const report: SpawnReport = {
        kind,
        x: leftX,
        prevRightX: prev ? prev.rightX : null,
        prevY,
        y: first.targetY(leftX),
        gap: difficulty.gap,
        groundY,
      };
      if (tunnel) {
        report.length = first.rightX - leftX;
        report.exitY = first.targetY(first.rightX);
        report.path = (px) => first.targetY(px);
      }
      this.onSpawn(report);
    }
    this.entries.push(...created);
    this.recent.push(kind);
    if (this.recent.length > 3) this.recent.shift();
  }

  private addPart(part: Phaser.GameObjects.GameObject, collides: boolean): void {
    this.group.add(part);
    const body = part.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);
    body.setImmovable(true);
    body.setVelocityX(-this.speed);
    if (!collides) body.checkCollision.none = true;
  }
}
