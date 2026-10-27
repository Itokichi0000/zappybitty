import Phaser from "phaser";
import { GROUND_HEIGHT, PARALLAX, ZONE } from "../constants";
import { CLOUDS_HEIGHT, FAR_SKYLINE_HEIGHT, NEAR_SKYLINE_HEIGHT, TEX, zoneTextureKeys } from "../textures";
import type { ZoneDef } from "../zones";

/** Clouds keep drifting even while the world stands still (px/s). */
const CLOUD_DRIFT = 6;
const RAIN_ALPHA = 0.55;

type Weather = NonNullable<ZoneDef["palette"]["weather"]>;
const WEATHER_TEX: Record<Weather, string> = { fog: TEX.fog, embers: TEX.embers, dust: TEX.dust, snow: TEX.snow };
const WEATHER_ALPHA: Record<Weather, number> = { fog: 0.85, embers: 0.9, dust: 0.7, snow: 0.9 };

/** One complete background: sky, clouds, far / near skyline, ground and rain. */
class LayerSet {
  readonly sky: Phaser.GameObjects.Image;
  readonly clouds: Phaser.GameObjects.TileSprite;
  readonly far: Phaser.GameObjects.TileSprite;
  readonly near: Phaser.GameObjects.TileSprite;
  readonly ground: Phaser.GameObjects.TileSprite;
  readonly rain: Phaser.GameObjects.TileSprite;
  private alpha = 1;
  private hasClouds = true;
  private hasRain = false;
  private hasPetals = false;
  private weather: ZoneDef["palette"]["weather"] = undefined;

  constructor(scene: Phaser.Scene, width: number, height: number, zone: ZoneDef, depth: number) {
    const keys = zoneTextureKeys(zone.id);
    this.sky = scene.add.image(0, 0, keys.sky).setOrigin(0).setDepth(depth);
    this.clouds = scene.add
      .tileSprite(0, 0, width, CLOUDS_HEIGHT, zone.palette.cloud === null ? keys.sky : keys.clouds)
      .setOrigin(0)
      .setDepth(depth + 0.1);
    this.far = scene.add.tileSprite(0, 0, width, FAR_SKYLINE_HEIGHT, keys.far).setOrigin(0).setDepth(depth + 0.2);
    this.near = scene.add.tileSprite(0, 0, width, NEAR_SKYLINE_HEIGHT, keys.near).setOrigin(0).setDepth(depth + 0.3);
    this.ground = scene.add.tileSprite(0, 0, width, GROUND_HEIGHT, keys.ground).setOrigin(0).setDepth(depth + 0.4);
    this.rain = scene.add.tileSprite(0, 0, width, height, TEX.rain).setOrigin(0).setDepth(depth + 0.5);
    this.setZone(zone);
    this.layout(width, height);
  }

  setZone(zone: ZoneDef): void {
    const keys = zoneTextureKeys(zone.id);
    this.sky.setTexture(keys.sky);
    this.hasClouds = zone.palette.cloud !== null;
    if (this.hasClouds) this.clouds.setTexture(keys.clouds);
    this.far.setTexture(keys.far);
    this.near.setTexture(keys.near);
    this.ground.setTexture(keys.ground);
    this.hasRain = zone.palette.rain;
    this.hasPetals = zone.palette.petals;
    this.weather = zone.palette.weather;
    this.rain.setTexture(this.weather ? WEATHER_TEX[this.weather] : this.hasPetals ? TEX.petals : TEX.rain);
    this.setAlpha(this.alpha);
  }

  setAlpha(alpha: number): void {
    this.alpha = alpha;
    this.sky.setAlpha(alpha);
    this.clouds.setAlpha(this.hasClouds ? alpha : 0);
    this.far.setAlpha(alpha);
    this.near.setAlpha(alpha);
    this.ground.setAlpha(alpha);
    this.rain.setAlpha(
      this.weather ? alpha * WEATHER_ALPHA[this.weather] : this.hasRain ? alpha * RAIN_ALPHA : this.hasPetals ? alpha * 0.9 : 0,
    );
  }

  setVisible(visible: boolean): void {
    for (const layer of this.layers()) layer.setVisible(visible);
  }

  layout(width: number, height: number): void {
    const groundY = height - GROUND_HEIGHT;
    this.sky.setDisplaySize(width, height);
    this.clouds.setPosition(0, 36).setSize(width, CLOUDS_HEIGHT);
    this.far.setPosition(0, groundY - FAR_SKYLINE_HEIGHT).setSize(width, FAR_SKYLINE_HEIGHT);
    this.near.setPosition(0, groundY - NEAR_SKYLINE_HEIGHT).setSize(width, NEAR_SKYLINE_HEIGHT);
    this.ground.setPosition(0, groundY).setSize(width, GROUND_HEIGHT);
    this.rain.setPosition(0, 0).setSize(width, height);
  }

  /** @param speed obstacle scroll speed in px/s; layers move at a fraction of it. */
  update(deltaMs: number, speed: number): void {
    const dt = deltaMs / 1000;
    const d = speed * dt;
    this.clouds.tilePositionX += d * PARALLAX.clouds + CLOUD_DRIFT * dt;
    this.far.tilePositionX += d * PARALLAX.farSkyline;
    this.near.tilePositionX += d * PARALLAX.nearSkyline;
    this.ground.tilePositionX += d * PARALLAX.ground;
    // A growing tile position moves the texture's content left / up on screen.
    if (this.weather === "fog") {
      this.rain.tilePositionX += (14 + speed * 0.12) * dt;
    } else if (this.weather === "embers") {
      this.rain.tilePositionX += (20 + speed * 0.2) * dt;
      this.rain.tilePositionY += 60 * dt;
    } else if (this.weather === "dust") {
      this.rain.tilePositionX += (160 + speed * 0.4) * dt;
      this.rain.tilePositionY -= 12 * dt;
    } else if (this.weather === "snow") {
      this.rain.tilePositionX += (20 + speed * 0.2) * dt;
      this.rain.tilePositionY -= 45 * dt;
    } else if (this.hasRain) {
      this.rain.tilePositionX += 260 * dt;
      this.rain.tilePositionY -= 520 * dt;
    } else if (this.hasPetals) {
      this.rain.tilePositionX += (40 + speed * 0.3) * dt;
      this.rain.tilePositionY -= 55 * dt;
    }
  }

  copyScrollFrom(other: LayerSet): void {
    this.clouds.tilePositionX = other.clouds.tilePositionX;
    this.far.tilePositionX = other.far.tilePositionX;
    this.near.tilePositionX = other.near.tilePositionX;
    this.ground.tilePositionX = other.ground.tilePositionX;
  }

  private layers(): Phaser.GameObjects.Components.Visible[] {
    return [this.sky, this.clouds, this.far, this.near, this.ground, this.rain];
  }
}

/**
 * Two background sets so a zone change can crossfade: the incoming zone is
 * drawn on the hidden set, faded in on top, then the sets swap roles.
 */
export class Parallax {
  private current: LayerSet;
  private incoming: LayerSet;
  private fade?: Phaser.Tweens.Tween;

  constructor(
    private readonly scene: Phaser.Scene,
    width: number,
    height: number,
    zone: ZoneDef,
  ) {
    this.current = new LayerSet(scene, width, height, zone, 0);
    this.incoming = new LayerSet(scene, width, height, zone, 1);
    this.incoming.setAlpha(0);
    this.incoming.setVisible(false);
  }

  /** Switches background; with `animate` the new zone fades in over ZONE.transitionMs. */
  setZone(zone: ZoneDef, animate: boolean): void {
    this.fade?.stop();
    this.fade = undefined;
    if (!animate) {
      this.current.setZone(zone);
      this.current.setAlpha(1);
      this.incoming.setAlpha(0);
      this.incoming.setVisible(false);
      return;
    }
    const next = this.incoming;
    next.setZone(zone);
    next.copyScrollFrom(this.current);
    next.setAlpha(0);
    next.setVisible(true);
    this.fade = this.scene.tweens.addCounter({
      from: 0,
      to: 1,
      duration: ZONE.transitionMs,
      onUpdate: (tween) => next.setAlpha(tween.getValue() ?? 0),
      onComplete: () => {
        next.setAlpha(1);
        const old = this.current;
        this.current = next;
        this.incoming = old;
        old.setAlpha(0);
        old.setVisible(false);
        this.fade = undefined;
      },
    });
  }

  layout(width: number, height: number): void {
    this.current.layout(width, height);
    this.incoming.layout(width, height);
  }

  update(deltaMs: number, speed: number): void {
    this.current.update(deltaMs, speed);
    if (this.fade) this.incoming.update(deltaMs, speed);
  }
}
