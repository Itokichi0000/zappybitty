import Phaser from "phaser";
import type { Equipped } from "@/lib/storage";
import { ACC_TEX, TRAIL_TEX } from "../textures";
import type { Bird } from "./Bird";

interface Placement {
  dx: number;
  dy: number;
}

/** Offsets from the bird's centre in unrotated sprite space (sprite is 56x47). */
const PLACEMENTS: Record<string, Placement> = {
  // hats
  beanie: { dx: 2, dy: -22 },
  cap: { dx: 4, dy: -22 },
  straw: { dx: 2, dy: -22 },
  crown: { dx: 2, dy: -22 },
  party: { dx: 2, dy: -27 },
  headband: { dx: 2, dy: -14 },
  catears: { dx: 2, dy: -21 },
  tophat: { dx: 2, dy: -24 },
  helmet: { dx: 2, dy: -2 },
  beret: { dx: 0, dy: -22 },
  bullhorns: { dx: 2, dy: -24 },
  bowler: { dx: 2, dy: -23 },
  kasa: { dx: 2, dy: -23 },
  // face
  sunglasses: { dx: 7, dy: -2 },
  glasses: { dx: 7, dy: -2 },
  monocle: { dx: 13, dy: 0 },
  mask: { dx: 6, dy: 5 },
  laser: { dx: 24, dy: -3 },
  starglasses: { dx: 7, dy: -2 },
  // neck
  tie: { dx: 8, dy: 14 },
  bowtie: { dx: 8, dy: 10 },
  scarf: { dx: 6, dy: 10 },
  medal: { dx: 8, dy: 12 },
  pendant: { dx: 8, dy: 12 },
};

interface TrailStyle {
  texture: string;
  tint?: number[];
  speedX: { min: number; max: number };
  speedY: { min: number; max: number };
  lifespan: number;
  frequency: number;
  scaleStart: number;
  gravityY?: number;
}

const TRAILS: Record<string, TrailStyle> = {
  lightning: { texture: TRAIL_TEX.lightning, tint: [0xffff66, 0x7dd3fc], speedX: { min: -40, max: -10 }, speedY: { min: -30, max: 30 }, lifespan: 500, frequency: 45, scaleStart: 1 },
  sakura: { texture: TRAIL_TEX.sakura, speedX: { min: -50, max: -20 }, speedY: { min: 10, max: 50 }, lifespan: 900, frequency: 70, scaleStart: 1 },
  coins: { texture: TRAIL_TEX.coins, speedX: { min: -40, max: -10 }, speedY: { min: -20, max: 40 }, lifespan: 600, frequency: 80, scaleStart: 1, gravityY: 120 },
  stars: { texture: TRAIL_TEX.stars, tint: [0xffffff, 0xfff4c2, 0xc7d9ff], speedX: { min: -30, max: -5 }, speedY: { min: -40, max: 40 }, lifespan: 700, frequency: 50, scaleStart: 0.9 },
  hearts: { texture: TRAIL_TEX.hearts, speedX: { min: -30, max: -10 }, speedY: { min: -50, max: -10 }, lifespan: 800, frequency: 90, scaleStart: 1 },
  bubbles: { texture: TRAIL_TEX.bubbles, speedX: { min: -25, max: -5 }, speedY: { min: -40, max: -10 }, lifespan: 1100, frequency: 110, scaleStart: 0.8 },
  fire: { texture: TRAIL_TEX.fire, tint: [0xff8c1a, 0xffd54a, 0xff3b3b], speedX: { min: -90, max: -40 }, speedY: { min: -15, max: 15 }, lifespan: 350, frequency: 25, scaleStart: 1.2 },
  snowflakes: { texture: TRAIL_TEX.snowflakes, speedX: { min: -40, max: -10 }, speedY: { min: 20, max: 60 }, lifespan: 1000, frequency: 80, scaleStart: 1 },
  comet: { texture: TRAIL_TEX.comet, tint: [0xffffff, 0x93c5fd, 0x60a5fa], speedX: { min: -160, max: -110 }, speedY: { min: -10, max: 10 }, lifespan: 420, frequency: 18, scaleStart: 1.3 },
  marsdust: { texture: TRAIL_TEX.marsdust, tint: [0xc2410c, 0xf97316, 0xfdba74], speedX: { min: -70, max: -30 }, speedY: { min: -10, max: 30 }, lifespan: 700, frequency: 40, scaleStart: 1.1 },
  neon: { texture: TRAIL_TEX.neon, tint: [0x4ff0ff, 0xff4fa3], speedX: { min: -120, max: -80 }, speedY: { min: -4, max: 4 }, lifespan: 280, frequency: 20, scaleStart: 1 },
};

/** Up to three accessories (hat, face, neck) and a trail that follow the bird. Pure decoration. */
export class Cosmetics {
  private images: Array<{ image: Phaser.GameObjects.Image; placement: Placement }> = [];
  private trail?: Phaser.GameObjects.Particles.ParticleEmitter;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly bird: Bird,
  ) {}

  apply(equipped: Equipped): void {
    for (const { image } of this.images) image.destroy();
    this.images = [];
    for (const id of [equipped.neck, equipped.face, equipped.hat]) {
      if (!id || !ACC_TEX[id] || !PLACEMENTS[id]) continue;
      const image = this.scene.add.image(this.bird.x, this.bird.y, ACC_TEX[id]).setDepth(21);
      this.images.push({ image, placement: PLACEMENTS[id] });
    }

    this.trail?.destroy();
    this.trail = undefined;
    const style = equipped.trail ? TRAILS[equipped.trail] : undefined;
    if (style) {
      this.trail = this.scene.add.particles(0, 0, style.texture, {
        speedX: style.speedX,
        speedY: style.speedY,
        lifespan: style.lifespan,
        scale: { start: style.scaleStart, end: 0.2 },
        alpha: { start: 1, end: 0 },
        frequency: style.frequency,
        gravityY: style.gravityY ?? 0,
        tint: style.tint,
        emitting: false,
      });
      this.trail.setDepth(19);
      this.trail.startFollow(this.bird, -20, 6);
    }
  }

  setTrailActive(active: boolean): void {
    if (!this.trail) return;
    if (active) this.trail.start();
    else this.trail.stop();
  }

  /** Call every frame after the bird moved. */
  update(): void {
    if (this.images.length === 0) return;
    const cos = Math.cos(this.bird.rotation);
    const sin = Math.sin(this.bird.rotation);
    // Upside down (gravity flip) the sprite is mirrored vertically: mirror the accessories too.
    const flip = this.bird.flipY ? -1 : 1;
    for (const { image, placement } of this.images) {
      const dx = placement.dx;
      const dy = placement.dy * flip;
      image
        .setPosition(
          this.bird.x + (dx * cos - dy * sin) * this.bird.scaleX,
          this.bird.y + (dx * sin + dy * cos) * this.bird.scaleY,
        )
        .setRotation(this.bird.rotation)
        .setScale(this.bird.scaleX, this.bird.scaleY)
        .setFlipY(this.bird.flipY)
        .setVisible(this.bird.visible);
    }
  }
}
