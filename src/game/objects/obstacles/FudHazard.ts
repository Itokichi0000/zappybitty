import Phaser from "phaser";
import { OBSTACLES, TOP_MARGIN } from "../../constants";
import { TEX } from "../../textures";
import type { ZoneDef } from "../../zones";

interface Plane {
  image: Phaser.GameObjects.Image;
  label: Phaser.GameObjects.Text;
}

/**
 * FUD paper planes: a hazard that flies faster than the scroll at a random
 * height, announced with a blinking "!" at the right edge. At most one at a time.
 */
export class FudHazard {
  readonly group: Phaser.Physics.Arcade.Group;
  private plane: Plane | null = null;
  private warning: Phaser.GameObjects.Image | null = null;
  private pending?: Phaser.Time.TimerEvent;
  private nextAt = 0;
  private speed = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly rng: Phaser.Math.RandomDataGenerator,
  ) {
    this.group = scene.physics.add.group({ allowGravity: false, immovable: true });
  }

  /** Current plane height, so other systems can keep the path clear. */
  get activeY(): number | null {
    return this.plane ? this.plane.image.y : null;
  }

  get planeX(): number | null {
    return this.plane ? this.plane.image.x : null;
  }

  reset(nowMs: number, zone: ZoneDef): void {
    this.pending?.remove(false);
    this.pending = undefined;
    this.warning?.destroy();
    this.warning = null;
    this.destroyPlane();
    this.schedule(nowMs, zone);
  }

  setSpeed(speed: number): void {
    this.speed = speed;
    if (this.plane) {
      (this.plane.image.body as Phaser.Physics.Arcade.Body).setVelocityX(-(speed + OBSTACLES.fud.speedBonus));
      (this.plane.label.body as Phaser.Physics.Arcade.Body).setVelocityX(-(speed + OBSTACLES.fud.speedBonus));
    }
  }

  /**
   * @param avoidYs heights the player will need soon (upcoming gaps); the plane keeps clear of them.
   */
  maintain(zone: ZoneDef, nowMs: number, groundY: number, width: number, avoidYs: number[]): void {
    if (this.plane && this.plane.image.x < -80) this.destroyPlane();
    if (!zone.fud || this.plane || this.warning || nowMs < this.nextAt) return;

    // Keep clear of every upcoming gap; when no height is clear, skip this plane.
    const clear = (y: number) => avoidYs.every((avoid) => Math.abs(avoid - y) >= 60);
    let y = this.rng.between(TOP_MARGIN + 40, groundY - 70);
    if (!clear(y)) {
      const options = avoidYs
        .flatMap((avoid) => [avoid - 100, avoid + 100])
        .map((v) => Phaser.Math.Clamp(v, TOP_MARGIN + 30, groundY - 60))
        .filter(clear);
      if (options.length === 0) {
        this.schedule(nowMs, zone);
        return;
      }
      y = this.rng.pick(options);
    }

    const icon = this.scene.add.image(width - 22, y, TEX.iconFud).setDepth(30);
    this.warning = icon;
    this.scene.tweens.add({ targets: icon, alpha: 0.15, duration: 120, yoyo: true, repeat: 3 });
    this.pending = this.scene.time.delayedCall(OBSTACLES.fud.warningMs, () => {
      this.pending = undefined;
      this.warning?.destroy();
      this.warning = null;
      this.launch(y, width);
      this.schedule(nowMs + OBSTACLES.fud.warningMs, zone);
    });
  }

  private launch(y: number, width: number): void {
    const image = this.scene.add.image(width + 40, y, TEX.fudPlane).setDepth(13);
    const fontFamily = (this.scene.registry.get("fontFamily") as string | undefined) || "monospace";
    const label = this.scene.add
      .text(width + 44, y - 1, "FUD", { fontFamily, fontSize: "10px", color: "#1b2a4a" })
      .setOrigin(0.5)
      .setDepth(14);
    this.group.add(image);
    this.group.add(label);
    const body = image.body as Phaser.Physics.Arcade.Body;
    body.setSize(OBSTACLES.fud.width - 8, OBSTACLES.fud.height - 8).setOffset(4, 4);
    const labelBody = label.body as Phaser.Physics.Arcade.Body;
    labelBody.checkCollision.none = true;
    this.plane = { image, label };
    this.setSpeed(this.speed);
  }

  private schedule(nowMs: number, zone: ZoneDef): void {
    this.nextAt = zone.fud ? nowMs + this.rng.between(zone.fud.minMs, zone.fud.maxMs) : Number.POSITIVE_INFINITY;
  }

  private destroyPlane(): void {
    if (!this.plane) return;
    this.group.remove(this.plane.image, true, true);
    this.group.remove(this.plane.label, true, true);
    this.plane = null;
  }
}
