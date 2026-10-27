import Phaser from "phaser";
import { TOP_MARGIN } from "../../constants";
import { TEX } from "../../textures";
import type { EnemyKind, ZoneDef } from "../../zones";
import { sfx } from "../../audio";

interface Enemy {
  kind: EnemyKind;
  sprite: Phaser.GameObjects.Image;
  baseY: number;
  t: number;
  dived: boolean;
  /** Rocks: where bitty was when the rock dropped. */
  targetX: number;
  targetY: number;
}

/** How each enemy moves and how big its hitbox is. */
const SPEC: Record<EnemyKind, { texture: string; extraSpeed: number; hitbox: [number, number]; warningMs: number }> = {
  bear: { texture: TEX.enemyBear, extraSpeed: 70, hitbox: [30, 28], warningMs: 900 },
  whale: { texture: TEX.enemyWhale, extraSpeed: 30, hitbox: [74, 28], warningMs: 1100 },
  crow: { texture: TEX.enemyCrow, extraSpeed: 140, hitbox: [24, 14], warningMs: 800 },
  rock: { texture: TEX.enemyRock, extraSpeed: 0, hitbox: [16, 16], warningMs: 900 },
};

/** Falling rocks aim at the height bitty is at when they drop (px/s, clamped). */
const ROCK_FALL = { min: 170, max: 620, leadMin: 260, leadMax: 340 };
const BEAR_BOB = { amplitude: 34, periodMs: 1500 };
const CROW_DIVE = { triggerDistance: 190, maxVy: 170 };

/**
 * Moving enemies that cross the screen on top of the obstacle stream:
 * 弱気のクマ (bobs up and down), クジラ (big and slow), FUD のカラス (dives at
 * bitty once) and 火山弾 / 隕石 (falls from the sky). Each one is announced
 * with a blinking icon first. At most one enemy at a time.
 */
export class EnemyField {
  readonly group: Phaser.Physics.Arcade.Group;
  private enemy: Enemy | null = null;
  private warning: Phaser.GameObjects.Image | null = null;
  private pending?: Phaser.Time.TimerEvent;
  private nextAt = Number.POSITIVE_INFINITY;
  private speed = 0;
  private birdX = 0;
  private birdY = 0;
  private readonly rng = new Phaser.Math.RandomDataGenerator();

  constructor(private readonly scene: Phaser.Scene) {
    this.group = scene.physics.add.group({ allowGravity: false, immovable: true });
  }

  /** Current enemy kind (tests and debugging). */
  get activeKind(): EnemyKind | null {
    return this.enemy?.kind ?? null;
  }

  reset(nowMs: number, zone: ZoneDef): void {
    this.pending?.remove(false);
    this.pending = undefined;
    this.warning?.destroy();
    this.warning = null;
    this.destroyEnemy();
    this.schedule(nowMs, zone);
  }

  /** Death: no new warnings or launches; an enemy already on screen freezes with the world. */
  stop(): void {
    this.pending?.remove(false);
    this.pending = undefined;
    this.warning?.destroy();
    this.warning = null;
    this.nextAt = Number.POSITIVE_INFINITY;
  }

  /** Zone change: the next enemy follows the new zone's timing; one already flying stays. */
  reschedule(nowMs: number, zone: ZoneDef): void {
    if (!zone.enemies) {
      this.pending?.remove(false);
      this.pending = undefined;
      this.warning?.destroy();
      this.warning = null;
    }
    this.schedule(nowMs, zone);
  }

  setSpeed(speed: number): void {
    this.speed = speed;
    if (this.enemy) this.applyVelocity(this.enemy);
  }

  /**
   * @param avoidYs heights the player needs soon; side enemies keep clear of them.
   */
  maintain(zone: ZoneDef, nowMs: number, groundY: number, width: number, birdX: number, avoidYs: number[]): void {
    if (!zone.enemies || this.enemy || this.warning || nowMs < this.nextAt) return;
    const kind = this.pick(zone.enemies.kinds);
    const spec = SPEC[kind];
    if (kind === "rock") {
      const x = Math.min(width - 16, birdX + this.rng.between(ROCK_FALL.leadMin, ROCK_FALL.leadMax));
      const icon = this.scene.add.image(x, TOP_MARGIN - 14, TEX.iconRock).setDepth(30);
      this.warn(icon, spec.warningMs, () => this.launch(kind, x, -20, zone, nowMs));
      return;
    }
    const margin = kind === "whale" ? 40 : 30;
    let y = this.rng.between(TOP_MARGIN + margin, groundY - margin - 30);
    for (const avoid of avoidYs) {
      if (Math.abs(avoid - y) < 70) {
        y = avoid - 110 >= TOP_MARGIN + margin ? avoid - 110 : avoid + 110;
        y = Phaser.Math.Clamp(y, TOP_MARGIN + margin, groundY - margin - 30);
      }
    }
    const icon = this.scene.add.image(width - 22, y, TEX.iconFud).setDepth(30);
    this.warn(icon, spec.warningMs, () => this.launch(kind, width + 50, y, zone, nowMs));
  }

  /** Bear bobbing, crow dive, cleanup. Call every frame while playing. */
  update(deltaMs: number, birdX: number, birdY: number, groundY: number): void {
    this.birdX = birdX;
    this.birdY = birdY;
    const e = this.enemy;
    if (!e) return;
    e.t += deltaMs;
    const body = e.sprite.body as Phaser.Physics.Arcade.Body;
    if (e.kind === "bear") {
      e.sprite.y = e.baseY + BEAR_BOB.amplitude * Math.sin((2 * Math.PI * e.t) / BEAR_BOB.periodMs);
    } else if (e.kind === "crow" && !e.dived && e.sprite.x - birdX < CROW_DIVE.triggerDistance) {
      e.dived = true;
      const vy = Phaser.Math.Clamp((birdY - e.sprite.y) * 1.4, -CROW_DIVE.maxVy, CROW_DIVE.maxVy);
      body.setVelocityY(vy);
      e.sprite.setAngle(vy > 0 ? -18 : 18);
    } else if (e.kind === "rock") {
      e.sprite.angle -= deltaMs * 0.3;
    }
    if (e.sprite.x < -110 || e.sprite.y > groundY + 30 || e.sprite.y < -60) this.destroyEnemy();
  }

  /** Laser eyes: removes the enemy if it is within [fromX, toX]. Returns its x when hit. */
  blast(fromX: number, toX: number): number | null {
    const e = this.enemy;
    if (!e || e.sprite.x < fromX || e.sprite.x > toX) return null;
    const x = e.sprite.x;
    this.destroyEnemy();
    return x;
  }

  /** Everything but the warning is cleared (continue). */
  clear(nowMs: number, zone: ZoneDef): void {
    this.reset(nowMs, zone);
  }

  private warn(icon: Phaser.GameObjects.Image, ms: number, then: () => void): void {
    this.warning = icon;
    this.scene.tweens.add({ targets: icon, alpha: 0.15, duration: 110, yoyo: true, repeat: Math.max(1, Math.round(ms / 220) - 1) });
    sfx.warning();
    this.pending = this.scene.time.delayedCall(ms, () => {
      this.pending = undefined;
      this.warning?.destroy();
      this.warning = null;
      then();
    });
  }

  private launch(kind: EnemyKind, x: number, y: number, zone: ZoneDef, nowMs: number): void {
    const spec = SPEC[kind];
    const sprite = this.scene.add.image(x, y, spec.texture).setDepth(13);
    this.group.add(sprite);
    const body = sprite.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);
    body.setImmovable(true);
    body.setSize(spec.hitbox[0], spec.hitbox[1]).setOffset((sprite.width - spec.hitbox[0]) / 2, (sprite.height - spec.hitbox[1]) / 2);
    this.enemy = { kind, sprite, baseY: y, t: 0, dived: false, targetX: this.birdX, targetY: this.birdY };
    this.applyVelocity(this.enemy);
    this.schedule(nowMs + spec.warningMs, zone);
  }

  private applyVelocity(e: Enemy): void {
    const body = e.sprite.body as Phaser.Physics.Arcade.Body;
    if (this.speed === 0) {
      // The world stopped (death): the enemy freezes with it.
      body.setVelocity(0, 0);
      return;
    }
    body.setVelocityX(-(this.speed + SPEC[e.kind].extraSpeed));
    if (e.kind === "rock") {
      // Reach bitty's height (as it was at the drop) about when the rock reaches bitty's x.
      const secs = Math.max(0.3, (e.sprite.x - e.targetX) / Math.max(1, this.speed));
      const vy = Phaser.Math.Clamp((e.targetY - e.sprite.y) / secs, ROCK_FALL.min, ROCK_FALL.max);
      body.setVelocityY(this.speed > 0 ? vy : 0);
    }
  }

  private pick(kinds: Partial<Record<EnemyKind, number>>): EnemyKind {
    const entries = (Object.entries(kinds) as Array<[EnemyKind, number]>).filter(([, w]) => w > 0);
    const total = entries.reduce((sum, [, w]) => sum + w, 0);
    let roll = this.rng.frac() * total;
    for (const [kind, w] of entries) {
      roll -= w;
      if (roll < 0) return kind;
    }
    return entries[entries.length - 1][0];
  }

  private schedule(nowMs: number, zone: ZoneDef): void {
    this.nextAt = zone.enemies ? nowMs + this.rng.between(zone.enemies.minMs, zone.enemies.maxMs) : Number.POSITIVE_INFINITY;
  }

  private destroyEnemy(): void {
    if (!this.enemy) return;
    this.group.remove(this.enemy.sprite, true, true);
    this.enemy = null;
  }
}
