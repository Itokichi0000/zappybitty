import Phaser from "phaser";
import { buildGoldBird, buildPlaceholderBird, buildSharedTextures, buildZoneTextures, TEX } from "../textures";
import { ZONES } from "../zones";

export class BootScene extends Phaser.Scene {
  constructor() {
    super("Boot");
  }

  preload(): void {
    // Pre-shrunk from art/bitty.png by `npm run assets:sprite`.
    // Relative so the build works from any folder (the Android app, a static web host).
    this.load.image(TEX.bitty, "assets/bitty-sprite.png");
  }

  create(): void {
    if (!this.textures.exists(TEX.bitty)) buildPlaceholderBird(this);
    buildGoldBird(this);
    buildSharedTextures(this);
    for (const zone of ZONES) buildZoneTextures(this, zone);
    this.scene.start("Play");
  }
}
