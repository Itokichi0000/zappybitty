import Phaser from "phaser";
import { BIRD } from "../constants";
import { sfx } from "../audio";
import { TEX } from "../textures";

/**
 * A skin is a texture key (plus, later, optional animation frames).
 * The gold skin from the brief plugs in here in stage 2.
 */
export interface BirdSkin {
  id: string;
  textureKey: string;
}

export const BIRD_SKINS = {
  default: { id: "default", textureKey: TEX.bitty },
  gold: { id: "gold", textureKey: TEX.bittyGold },
} satisfies Record<string, BirdSkin>;

/**
 * bitty. Flapping is a single image animated with rotation and
 * squash & stretch, as requested; frame-based animation can be layered on
 * top later via setSkin().
 */
export class Bird extends Phaser.Physics.Arcade.Sprite {
  declare body: Phaser.Physics.Arcade.Body;

  /** Collisions with candles are ignored while true (the rocket). */
  invincible = false;

  private bobTween?: Phaser.Tweens.Tween;
  private stretchTween?: Phaser.Tweens.Tween;
  private deathTween?: Phaser.Tweens.Tween;
  private targetAngle = 0;
  private airborne = false;
  private gravity = BIRD.gravity;
  private flapVelocity = BIRD.flapVelocity;
  /** Items scale gravity on top of the zone (heavy weight, feather). */
  private gravityMul = 1;
  /** Gravity points up (Mars / galaxy gimmick); a flap pushes down. */
  private flipped = false;
  /** Size multiplier (mini item); flaps squash around it. */
  private baseScale = 1;

  constructor(scene: Phaser.Scene, x: number, y: number, skin: BirdSkin = BIRD_SKINS.default) {
    super(scene, x, y, skin.textureKey);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setDepth(20);
    this.body.setAllowGravity(false);
    this.body.setMaxVelocityY(BIRD.maxFallSpeed);
    this.applyHitbox();
  }

  get isAirborne(): boolean {
    return this.airborne;
  }

  setSkin(skin: BirdSkin): this {
    this.setTexture(skin.textureKey);
    this.applyHitbox();
    return this;
  }

  /** Places the bird for the menu / ready screens and clears all motion. */
  resetTo(x: number, y: number): void {
    this.stopBobbing();
    this.stretchTween?.stop();
    this.deathTween?.stop();
    this.flipped = false;
    this.gravityMul = 1;
    this.baseScale = 1;
    this.setFlipY(false);
    this.setScale(1).setAngle(0).setPosition(x, y).setVisible(true);
    this.body.reset(x, y);
    this.body.setAllowGravity(false);
    this.body.setVelocity(0, 0);
    this.airborne = false;
    this.invincible = false;
    this.targetAngle = 0;
  }

  /** Gentle hover used while the game is idle. */
  startBobbing(): void {
    this.stopBobbing();
    this.bobTween = this.scene.tweens.add({
      targets: this,
      y: this.y - 8,
      duration: 650,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  }

  stopBobbing(): void {
    if (this.bobTween) {
      this.bobTween.stop();
      this.bobTween = undefined;
    }
  }

  /** Zones scale gravity and flap strength (the moon zone is floaty). */
  setPhysicsScale(gravityScale: number, flapScale: number): void {
    this.gravity = BIRD.gravity * gravityScale;
    this.flapVelocity = BIRD.flapVelocity * flapScale;
    this.applyGravity();
  }

  /** Item effect on gravity: > 1 heavier, < 1 floatier. */
  setGravityMul(mul: number): void {
    this.gravityMul = mul;
    this.applyGravity();
  }

  get isFlipped(): boolean {
    return this.flipped;
  }

  /** Turns gravity upside down (or back); the sprite flips with it. */
  setGravityFlipped(on: boolean): void {
    this.flipped = on;
    this.setFlipY(on);
    this.applyGravity();
  }

  /** Shrinks (or restores) bitty; the circular hitbox scales with the sprite. */
  setBaseScale(scale: number): void {
    this.baseScale = scale;
    this.stretchTween?.stop();
    this.setScale(scale);
  }

  private applyGravity(): void {
    if (!this.airborne) return;
    const g = this.gravity * this.gravityMul;
    this.body.setGravityY(this.flipped ? -g : g);
  }

  /** Vertical push from a gust of wind (px/s, negative = upwards). */
  applyGust(force: number): void {
    if (!this.airborne) return;
    this.body.setVelocityY(this.body.velocity.y + force);
  }

  /** Enables gravity; the first flap usually follows immediately. */
  launch(): void {
    this.stopBobbing();
    this.body.setAllowGravity(true);
    this.airborne = true;
    this.applyGravity();
  }

  flap(): void {
    if (!this.airborne) return;
    this.body.setVelocityY(this.flipped ? -this.flapVelocity : this.flapVelocity);
    this.targetAngle = this.flipped ? -BIRD.minAngle : BIRD.minAngle;
    this.setAngle(this.targetAngle);
    this.squash();
    sfx.flap();
  }

  /** Smoothly tilts the sprite: nose up while rising, nose down while falling. */
  updateRotation(deltaMs: number): void {
    if (!this.airborne) return;
    // Upside down, "falling" means moving up: mirror the velocity and the angle.
    const sign = this.flipped ? -1 : 1;
    const vy = this.body.velocity.y * sign;
    if (vy < 0) {
      this.targetAngle = BIRD.minAngle * sign;
    } else {
      const t = Phaser.Math.Clamp(vy / BIRD.maxFallSpeed, 0, 1);
      this.targetAngle = Phaser.Math.Linear(BIRD.minAngle, BIRD.maxAngle, t * t) * sign;
    }
    const k = Math.min(1, (BIRD.rotationLerp * deltaMs) / 1000);
    this.setAngle(this.angle + (this.targetAngle - this.angle) * k);
  }

  /** Crash: small hop, then tumble nose-first until settle() is called. */
  die(): void {
    this.airborne = false;
    this.stopBobbing();
    this.stretchTween?.stop();
    this.flipped = false;
    this.setFlipY(false);
    this.setScale(this.baseScale);
    this.body.setAllowGravity(true);
    this.body.setGravityY(this.gravity);
    this.body.setVelocity(0, -230);
    this.deathTween = this.scene.tweens.add({
      targets: this,
      angle: 90,
      duration: 420,
      ease: "Quad.easeIn",
    });
  }

  /** Lands the crashed bird on the ground. */
  settle(groundY: number): void {
    this.deathTween?.stop();
    this.body.setVelocity(0, 0);
    this.body.setAllowGravity(false);
    this.setAngle(90);
    this.y = groundY - this.width / 2 + 4;
    this.body.reset(this.x, this.y);
  }

  private applyHitbox(): void {
    const r = BIRD.hitboxRadius;
    this.body.setCircle(r, this.width / 2 - r, this.height / 2 - r);
  }

  private squash(): void {
    this.stretchTween?.stop();
    const base = this.baseScale;
    this.setScale(base);
    this.stretchTween = this.scene.tweens.add({
      targets: this,
      scaleX: BIRD.stretch.scaleX * base,
      scaleY: BIRD.stretch.scaleY * base,
      duration: BIRD.stretch.durationMs,
      yoyo: true,
      ease: "Quad.easeOut",
      onComplete: () => this.setScale(this.baseScale),
    });
  }
}
