import type Phaser from "phaser";
import type { ObstacleKind, ZoneDef } from "../../zones";

/** Everything a spawner needs to build an obstacle at a given x. */
export interface SpawnContext {
  scene: Phaser.Scene;
  /** Scrolling physics group: every part of every slot obstacle lives here. */
  group: Phaser.Physics.Arcade.Group;
  rng: Phaser.Math.RandomDataGenerator;
  /** Vertical gap between wick tips (px). */
  gap: number;
  /** Free horizontal space between consecutive obstacles (px). */
  spacing: number;
  /** Current scroll speed (px/s). */
  speed: number;
  groundY: number;
  width: number;
  zone: ZoneDef;
  /** Gap centre of the previous obstacle; spawners read and update it so the stream drifts like a chart. */
  lastCenter: number | null;
  /** Adds a scrolling part. Non-colliding parts still move with the obstacle. */
  addPart(part: Phaser.GameObjects.GameObject, collides: boolean): void;
  /** Registers a fixed-position effect (warning icon) for cleanup. */
  addFx(obj: Phaser.GameObjects.GameObject): void;
}

export type Spawner = (ctx: SpawnContext, x: number) => ObstacleEntry[];

/**
 * One scrolling obstacle. `anchor` is a part whose x drives spacing, scoring
 * and recycling; offsets describe the obstacle's extent relative to it.
 */
export class ObstacleEntry {
  scored = false;

  constructor(
    readonly kind: ObstacleKind,
    readonly points: number,
    private readonly anchor: { x: number },
    private readonly rightOffset: number,
    private readonly scoreOffset: number,
    private readonly parts: Phaser.GameObjects.GameObject[],
    private readonly group: Phaser.Physics.Arcade.Group,
    private readonly targetFn: (x: number, anchorX: number) => number,
    private readonly updateFn?: (deltaMs: number) => void,
  ) {}

  /** Right edge; the next obstacle spawns `spacing` px after it. */
  get rightX(): number {
    return this.anchor.x + this.rightOffset;
  }

  /** Points are awarded once the bird passes this x. */
  get scoreX(): number {
    return this.anchor.x + this.scoreOffset;
  }

  /** Recommended flight height at x (used by the autopilot in tests and by hazards to avoid the path). */
  targetY(x: number): number {
    return this.targetFn(x, this.anchor.x);
  }

  update(deltaMs: number): void {
    this.updateFn?.(deltaMs);
  }

  destroy(): void {
    for (const part of this.parts) this.group.remove(part, true, true);
    this.parts.length = 0;
  }
}
