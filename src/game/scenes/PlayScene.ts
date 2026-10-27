import Phaser from "phaser";
import { BAD_ITEMS, coinValue, ECONOMY, findCosmetic, ITEM_NAMES, type ItemKind } from "@/config/economy";
import { BIRD, GROUND_HEIGHT, PARALLAX, TIMING, ZONE } from "../constants";
import { getDifficulty, type Difficulty } from "../difficulty";
import { gameBridge } from "../bridge";
import { useGameStore, type RunStats } from "../store";
import { bgm } from "../bgm";
import { sfx } from "../audio";
import { Bird, BIRD_SKINS } from "../objects/Bird";
import { Cosmetics } from "../objects/Cosmetics";
import { EnemyField } from "../objects/enemies/EnemyField";
import { ObstacleField } from "../objects/obstacles/ObstacleField";
import { Parallax } from "../objects/Parallax";
import { ITEM_TEX, PickupField, type Pickup } from "../objects/pickups/PickupField";
import { ensureSkinTexture, PICKUP_TEX, RAINBOW_HUES, TEX } from "../textures";
import { ZONES, zoneIndexForScore, type ZoneDef } from "../zones";

/** How long each timed item lasts (shield and coin rain are not timed). */
const ITEM_DURATION: Record<ItemKind, number> = {
  magnet: ECONOMY.magnetMs,
  shield: 0,
  rocket: ECONOMY.rocketMs,
  slow: ECONOMY.slowMs,
  double: ECONOMY.doubleMs,
  mini: ECONOMY.miniMs,
  laser: ECONOMY.laserMs,
  feather: ECONOMY.featherMs,
  coinRain: 0,
  heavy: ECONOMY.heavyMs,
  smoke: ECONOMY.smokeMs,
};

type RunState = "menu" | "ready" | "playing" | "paused" | "dying" | "gameover";
type HitSource = "obstacle" | "ground";

/**
 * The whole game lives in this scene. The world idles behind the React start
 * screen ("menu"), then runs ready -> playing -> dying -> gameover. Zones
 * change with the score: background crossfade, physics scale, obstacle mix.
 */
export class PlayScene extends Phaser.Scene {
  private bird!: Bird;
  private field!: ObstacleField;
  private parallax!: Parallax;
  private groundZone!: Phaser.GameObjects.Zone;
  private scoreText!: Phaser.GameObjects.Text;
  private flashRect!: Phaser.GameObjects.Rectangle;
  private pickups!: PickupField;
  private cosmetics!: Cosmetics;
  private satsIcon!: Phaser.GameObjects.Image;
  private satsText!: Phaser.GameObjects.Text;
  private comboText!: Phaser.GameObjects.Text;
  private itemIcon!: Phaser.GameObjects.Image;
  private itemBarBg!: Phaser.GameObjects.Rectangle;
  private itemBar!: Phaser.GameObjects.Rectangle;
  private shieldIcon!: Phaser.GameObjects.Image;
  private shieldRing!: Phaser.GameObjects.Image;
  private flame!: Phaser.GameObjects.Image;
  private enemies!: EnemyField;
  /** Laser eyes beam, smoke screen (bad item) and the upside-down tint (gimmick). */
  private laserBeam!: Phaser.GameObjects.Rectangle;
  private smoke!: Phaser.GameObjects.TileSprite;
  private flipTint!: Phaser.GameObjects.Rectangle;
  /** London fog banks drifting over the obstacles. */
  private fogBanks: Phaser.GameObjects.TileSprite[] = [];
  private nextFogAt = Number.POSITIVE_INFINITY;
  /** Gravity flip gimmick (Mars / galaxy): warning, then upside down until flipEndsAt. */
  private nextFlipAt = Number.POSITIVE_INFINITY;
  private flipEndsAt = 0;
  private flipTimer?: Phaser.Time.TimerEvent;
  private flipIcon?: Phaser.GameObjects.Image;

  private runSats = 0;
  /** runSats at the moment of a continue: the second report only asks for what came after. */
  private runSatsReported = 0;
  private combo = 0;
  private activeItem: { kind: ItemKind; until: number; duration: number } | null = null;
  private shielded = false;
  /** Scroll speed multiplier (rocket). */
  private speedMul = 1;
  /** World time scale (slow-mo). */
  private worldScale = 1;
  private continued = false;
  private runStats: RunStats = { bestCombo: 0, itemsUsed: 0, shieldsBroken: 0, rocketPoints: 0, continues: 0 };
  private rainbowTimer?: Phaser.Time.TimerEvent;
  private rainbowIndex = 0;

  private state: RunState = "menu";
  private score = 0;
  /** Start zone's score threshold: difficulty and zone progression continue from here, points count from 0. */
  private scoreOffset = 0;
  private difficulty: Difficulty = getDifficulty(0);
  private zoneIndex = 0;
  private runStartZone = 0;
  /** Obstacle hits are ignored until this time (zone change grace). */
  private graceUntil = 0;
  private nextGustAt = Number.POSITIVE_INFINITY;
  private nextFlashAt = Number.POSITIVE_INFINITY;
  private gustTimer?: Phaser.Time.TimerEvent;
  private gustIcon?: Phaser.GameObjects.Image;
  private deathTimer?: Phaser.Time.TimerEvent;
  private gameOverAt = 0;
  private disposers: Array<() => void> = [];

  constructor() {
    super("Play");
  }

  private get zone(): ZoneDef {
    return ZONES[this.zoneIndex];
  }

  private get groundY(): number {
    return this.scale.height - GROUND_HEIGHT;
  }

  private get scrollSpeed(): number {
    return Math.round(this.difficulty.speed * this.zone.speedScale * this.speedMul);
  }

  create(): void {
    const { width, height } = this.scale;

    this.parallax = new Parallax(this, width, height, ZONES[0]);
    this.pickups = new PickupField(this);
    this.field = new ObstacleField(this, (report) => this.pickups.place(report));
    this.bird = new Bird(this, width / 2, height * 0.42);
    this.cosmetics = new Cosmetics(this, this.bird);
    this.shieldRing = this.add.image(0, 0, PICKUP_TEX.shieldRing).setDepth(22).setAlpha(0.8).setVisible(false);
    this.flame = this.add.image(0, 0, PICKUP_TEX.flame).setDepth(19).setVisible(false);
    this.enemies = new EnemyField(this);
    this.laserBeam = this.add.rectangle(0, 0, ECONOMY.laserRange, 4, 0xff3355).setOrigin(0, 0.5).setDepth(21).setVisible(false);
    this.smoke = this.add.tileSprite(0, 0, width, height, PICKUP_TEX.smokeCloud).setOrigin(0).setDepth(38).setAlpha(0.72).setVisible(false);
    this.flipTint = this.add.rectangle(0, 0, width, height, 0x8b5cf6).setOrigin(0).setDepth(37).setAlpha(0).setVisible(false);

    this.groundZone = this.add.zone(0, this.groundY, width, GROUND_HEIGHT).setOrigin(0, 0);
    this.physics.add.existing(this.groundZone, true);

    this.flashRect = this.add.rectangle(0, 0, width, height, 0xffffff).setOrigin(0).setDepth(40).setAlpha(0);

    const fontFamily = (this.registry.get("fontFamily") as string | undefined) || "monospace";
    this.scoreText = this.add
      .text(width / 2, 52, "0", {
        fontFamily,
        fontSize: "44px",
        color: "#ffffff",
        stroke: "#1b2a4a",
        strokeThickness: 6,
      })
      .setOrigin(0.5)
      .setDepth(50)
      .setVisible(false);

    const hudStyle = { fontFamily, fontSize: "18px", color: "#ffffff", stroke: "#1b2a4a", strokeThickness: 4 };
    this.satsIcon = this.add.image(18, 22, PICKUP_TEX.coin).setDepth(50).setScale(1.3);
    this.satsText = this.add.text(32, 22, "0", hudStyle).setOrigin(0, 0.5).setDepth(50);
    this.comboText = this.add
      .text(14, 44, "", { ...hudStyle, fontSize: "14px", color: "#ffe08a" })
      .setOrigin(0, 0.5)
      .setDepth(50);
    this.itemIcon = this.add.image(width - 18, 22, PICKUP_TEX.magnet).setDepth(50).setVisible(false);
    this.itemBarBg = this.add.rectangle(width - 32, 22, 64, 8, 0x1b2a4a).setOrigin(1, 0.5).setDepth(50).setVisible(false);
    this.itemBar = this.add.rectangle(width - 34, 22, 60, 4, 0xffe08a).setOrigin(1, 0.5).setDepth(51).setVisible(false);
    this.shieldIcon = this.add.image(width - 18, 48, PICKUP_TEX.shield).setDepth(50).setVisible(false);
    this.setHudVisible(false);

    this.physics.add.overlap(this.bird, this.pickups.group, (_bird, obj) => this.onPickup(obj as Pickup));
    this.physics.add.overlap(this.bird, this.field.group, () => this.onHit("obstacle"));
    this.physics.add.overlap(this.bird, this.field.hazardGroup, () => this.onHit("obstacle"));
    this.physics.add.overlap(this.bird, this.enemies.group, () => this.onHit("obstacle"));
    this.physics.add.overlap(this.bird, this.groundZone, () => this.onHit("ground"));

    this.input.on(Phaser.Input.Events.POINTER_DOWN, () => this.onTap(false));
    const keyboard = this.input.keyboard;
    if (keyboard) {
      // No global capture: typing a space into a form must still work. onKey prevents
      // scrolling only when it actually handles the key as a tap.
      keyboard.on("keydown-SPACE", this.onKey, this);
      keyboard.on("keydown-UP", this.onKey, this);
      keyboard.on("keydown-ENTER", this.onKey, this);
    }

    this.disposers.push(
      gameBridge.on("start", ({ zoneIndex }) => this.enterReady(zoneIndex)),
      gameBridge.on("menu", () => this.enterMenu()),
      gameBridge.on("resume", () => this.resumeRun()),
      gameBridge.on("continue", () => this.continueRun()),
    );
    this.game.events.on(Phaser.Core.Events.HIDDEN, this.onHidden, this);
    this.scale.on(Phaser.Scale.Events.RESIZE, this.onResize, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.dispose, this);

    this.enterMenu();
  }

  update(_time: number, delta: number): void {
    const speed =
      this.state === "playing"
        ? this.scrollSpeed
        : this.state === "menu" || this.state === "ready"
          ? PARALLAX.idleSpeed
          : 0;
    this.parallax.update(delta * this.worldScale, speed);
    this.cosmetics.update();
    this.shieldRing.setPosition(this.bird.x, this.bird.y);
    this.flame.setPosition(this.bird.x - 34, this.bird.y + 6).setRotation(this.bird.rotation);

    if (this.state !== "playing") return;
    const now = this.time.now;

    this.field.maintain(this.difficulty, this.zone, this.groundY, now);
    const gained = this.field.update(this.bird.x, delta * this.worldScale);
    if (gained > 0) this.addScore(gained);
    const { width } = this.scale;
    const avoid = [this.field.recommendedY(width - 40, NaN), this.field.recommendedY(width + 120, NaN)].filter((y) => !Number.isNaN(y));
    this.enemies.maintain(this.zone, now, this.groundY, width, this.bird.x, avoid);
    this.enemies.update(delta * this.worldScale, this.bird.x, this.bird.y, this.groundY);
    const missed = this.pickups.update(delta, this.bird.x, this.bird.y, this.activeItem?.kind === "magnet");
    if (missed > 0 && this.combo > 0) {
      this.combo = 0;
      this.updateHud();
    }
    this.bird.updateRotation(delta * this.worldScale);
    this.updateItem(now);
    this.updateFog(now, delta);
    this.updateFlip(now);

    // Soft ceiling: the bird can't leave the screen upwards.
    const ceiling = BIRD.hitboxRadius + 4;
    if (this.bird.y < ceiling) {
      this.bird.y = ceiling;
      if (this.bird.body.velocity.y < 0) this.bird.body.setVelocityY(0);
    }

    if (this.zone.gust && now >= this.nextGustAt && !this.gustTimer) this.startGust();
    if (this.zone.palette.rain && now >= this.nextFlashAt) {
      this.lightningFlash();
      this.nextFlashAt = now + Phaser.Math.Between(ZONE.flashMinMs, ZONE.flashMaxMs);
    }
  }

  // ---- state transitions -------------------------------------------------

  private enterMenu(): void {
    this.cancelDeath();
    this.clearGust();
    this.clearGimmicks();
    if (this.scene.isPaused()) this.scene.resume();
    this.state = "menu";
    this.score = 0;
    this.difficulty = getDifficulty(0);
    this.zoneIndex = 0;
    this.runStartZone = 0;
    this.parallax.setZone(this.zone, false);
    this.field.reset(this.time.now, this.zone);
    this.field.setSpeed(0);
    this.enemies.reset(this.time.now, this.zone);
    this.enemies.setSpeed(0);
    this.resetRunState();
    this.bird.resetTo(this.scale.width / 2, this.scale.height * 0.42);
    this.bird.setPhysicsScale(1, 1);
    this.bird.startBobbing();
    this.scoreText.setVisible(false);
    this.setHudVisible(false);
    const store = useGameStore.getState();
    store.setZone(0, false);
    store.setScore(0);
    store.setPhase("menu");
    bgm.setZone(0);
    bgm.play();
  }

  /** Places the bird for a new run starting in the chosen zone. Every run is a real run. */
  private enterReady(zoneIndex: number): void {
    this.cancelDeath();
    this.clearGust();
    this.clearGimmicks();
    if (this.scene.isPaused()) this.scene.resume();
    this.state = "ready";
    this.runStartZone = Phaser.Math.Clamp(Math.floor(zoneIndex), 0, ZONES.length - 1);
    this.zoneIndex = this.runStartZone;
    this.score = 0;
    this.scoreOffset = this.zone.startScore;
    this.difficulty = getDifficulty(this.effectiveScore());
    this.graceUntil = 0;
    this.parallax.setZone(this.zone, false);
    this.field.reset(this.time.now, this.zone);
    this.field.setSpeed(0);
    this.enemies.reset(this.time.now, this.zone);
    this.enemies.setSpeed(0);
    this.pickups.setZone(this.zoneIndex);
    this.resetRunState();
    this.bird.resetTo(BIRD.x, this.scale.height * 0.45);
    this.bird.setPhysicsScale(this.zone.gravityScale, this.zone.flapScale);
    this.bird.startBobbing();
    this.scoreText.setText(String(this.score)).setScale(1).setVisible(true);
    this.setHudVisible(true);
    this.updateHud();
    const store = useGameStore.getState();
    store.beginRun(this.runStartZone);
    store.setRunSats(0);
    store.setPhase("ready");
    bgm.setZone(this.zoneIndex);
    bgm.play();
  }

  private startRun(): void {
    this.state = "playing";
    this.bird.launch();
    this.bird.flap();
    this.cosmetics.setTrailActive(true);
    this.applySpeed();
    this.enemies.reset(this.time.now, this.zone);
    this.scheduleZoneEvents(this.time.now);
    useGameStore.getState().setPhase("playing");
  }

  private resumeRun(): void {
    if (this.state !== "paused") return;
    this.state = "playing";
    this.scene.resume();
    // A courtesy flap so the bird doesn't drop the moment the game resumes.
    this.bird.flap();
    useGameStore.getState().setPhase("playing");
  }

  private addScore(points: number): void {
    this.score += points;
    if (this.activeItem?.kind === "rocket") this.runStats.rocketPoints += points;
    this.difficulty = getDifficulty(this.effectiveScore());
    const nextZone = zoneIndexForScore(this.effectiveScore());
    if (nextZone !== this.zoneIndex) this.enterZone(nextZone);
    else this.applySpeed();
    this.scoreText.setText(String(this.score));
    this.tweens.add({ targets: this.scoreText, scale: 1.3, duration: 80, yoyo: true, ease: "Quad.easeOut" });
    sfx.score();
    useGameStore.getState().setScore(this.score);
  }

  /** Zone change mid-run: crossfade the background, rescale physics, grant a short grace period. */
  private enterZone(index: number): void {
    this.zoneIndex = index;
    this.parallax.setZone(this.zone, true);
    this.bird.setPhysicsScale(this.zone.gravityScale, this.zone.flapScale);
    this.applySpeed();
    this.graceUntil = this.time.now + ZONE.graceMs;
    this.clearGust();
    // Fog banks drift out and an enemy already flying finishes its pass; a flip only
    // carries on into a zone that has the flip gimmick too.
    if (!this.zone.flip) this.endFlip(true);
    this.enemies.reschedule(this.time.now, this.zone);
    this.pickups.setZone(index);
    this.scheduleZoneEvents(this.time.now);
    sfx.zone();
    bgm.setZone(index);
    const store = useGameStore.getState();
    store.setZone(index, true);
    store.markReached(index);
  }

  private scheduleZoneEvents(now: number): void {
    this.nextGustAt = this.zone.gust ? now + Phaser.Math.Between(this.zone.gust.minMs, this.zone.gust.maxMs) : Number.POSITIVE_INFINITY;
    this.nextFlashAt = this.zone.palette.rain
      ? now + Phaser.Math.Between(ZONE.flashMinMs, ZONE.flashMaxMs)
      : Number.POSITIVE_INFINITY;
    this.nextFogAt = this.zone.fog ? now + Phaser.Math.Between(ZONE.fogMinMs, ZONE.fogMaxMs) : Number.POSITIVE_INFINITY;
    this.nextFlipAt = this.zone.flip
      ? now + Phaser.Math.Between(this.zone.flip.minMs, this.zone.flip.maxMs)
      : Number.POSITIVE_INFINITY;
  }

  /** London: a bank of fog drifts across now and then, hiding part of the course. */
  private updateFog(now: number, delta: number): void {
    if (now >= this.nextFogAt) {
      const { width } = this.scale;
      const bank = this.add
        .tileSprite(width, 0, ZONE.fogWidth, this.groundY, TEX.fog)
        .setOrigin(0)
        .setDepth(16)
        .setAlpha(ZONE.fogAlpha);
      bank.tilePositionY = Phaser.Math.Between(0, 255);
      this.fogBanks.push(bank);
      this.nextFogAt = now + Phaser.Math.Between(ZONE.fogMinMs, ZONE.fogMaxMs);
    }
    const dx = ((this.scrollSpeed * 0.85) * delta * this.worldScale) / 1000;
    this.fogBanks = this.fogBanks.filter((bank) => {
      bank.x -= dx;
      bank.tilePositionX += dx * 0.2;
      if (bank.x + bank.width > -10) return true;
      bank.destroy();
      return false;
    });
  }

  /** Mars / galaxy: gravity turns upside down for a while (announced first). */
  private updateFlip(now: number): void {
    const flip = this.zone.flip;
    if (this.flipEndsAt && now >= this.flipEndsAt) {
      this.setFlipped(false);
      if (flip) this.nextFlipAt = now + Phaser.Math.Between(flip.minMs, flip.maxMs);
      return;
    }
    if (!flip || this.flipTimer || this.flipEndsAt || now < this.nextFlipAt) return;
    this.flipIcon = this.add.image(this.bird.x + 46, this.bird.y - 42, TEX.iconFlip).setDepth(30);
    this.tweens.add({ targets: this.flipIcon, alpha: 0.2, duration: 120, yoyo: true, repeat: 3 });
    sfx.warning();
    this.flipTimer = this.time.delayedCall(ZONE.flipWarningMs, () => {
      this.flipTimer = undefined;
      this.flipIcon?.destroy();
      this.flipIcon = undefined;
      if (this.state !== "playing") return;
      this.setFlipped(true);
      this.flipEndsAt = this.time.now + flip.durationMs;
    });
  }

  private setFlipped(on: boolean): void {
    this.bird.setGravityFlipped(on);
    // Start the new direction from a standstill so the switch is never a surprise death.
    this.bird.body.setVelocityY(0);
    this.flipEndsAt = 0;
    this.flipTint.setVisible(true);
    this.tweens.killTweensOf(this.flipTint);
    this.tweens.add({ targets: this.flipTint, alpha: on ? 0.16 : 0, duration: 250 });
    sfx.gust();
  }

  /** Fog banks and the gravity flip end with the zone, the run or a continue. */
  private clearGimmicks(): void {
    for (const bank of this.fogBanks) bank.destroy();
    this.fogBanks = [];
    this.endFlip(false);
  }

  /** Cancels a pending flip and puts gravity back: smoothly mid-run, at once otherwise. */
  private endFlip(smooth: boolean): void {
    this.flipTimer?.remove(false);
    this.flipTimer = undefined;
    this.flipIcon?.destroy();
    this.flipIcon = undefined;
    if (smooth && this.bird.isFlipped) {
      this.setFlipped(false);
      return;
    }
    this.flipEndsAt = 0;
    if (this.bird.isFlipped) this.bird.setGravityFlipped(false);
    this.tweens.killTweensOf(this.flipTint);
    this.flipTint.setAlpha(0).setVisible(false);
  }

  /** Storm gust: warn next to the bird, then push it up or down. */
  private startGust(): void {
    const gust = this.zone.gust;
    if (!gust) return;
    const direction = Math.random() < 0.5 ? -1 : 1;
    this.gustIcon = this.add
      .image(this.bird.x + 46, this.bird.y - 42, direction < 0 ? TEX.iconGustUp : TEX.iconGustDown)
      .setDepth(30);
    this.tweens.add({ targets: this.gustIcon, alpha: 0.2, duration: 100, yoyo: true, repeat: 3 });
    sfx.warning();
    this.gustTimer = this.time.delayedCall(ZONE.gustWarningMs, () => {
      this.gustTimer = undefined;
      this.gustIcon?.destroy();
      this.gustIcon = undefined;
      if (this.state !== "playing") return;
      this.bird.applyGust(direction * gust.force);
      sfx.gust();
      this.nextGustAt = this.time.now + Phaser.Math.Between(gust.minMs, gust.maxMs);
    });
  }

  private clearGust(): void {
    this.gustTimer?.remove(false);
    this.gustTimer = undefined;
    this.gustIcon?.destroy();
    this.gustIcon = undefined;
  }

  private lightningFlash(): void {
    this.flashRect.setAlpha(0.45);
    this.tweens.add({ targets: this.flashRect, alpha: 0, duration: 180, ease: "Quad.easeOut" });
  }

  private onHit(source: HitSource): void {
    if (this.state === "dying") {
      if (source === "ground") this.finishRun();
      return;
    }
    if (this.state !== "playing") return;
    if (source === "obstacle" && (this.bird.invincible || this.time.now < this.graceUntil)) return;
    if (source === "obstacle" && this.shielded) {
      // The HODL shield absorbs one hit and grants a moment to get clear.
      this.shielded = false;
      this.shieldRing.setVisible(false);
      this.runStats.shieldsBroken += 1;
      this.graceUntil = this.time.now + 700;
      this.cameras.main.shake(150, 0.008);
      sfx.shieldBreak();
      this.updateHud();
      return;
    }

    this.state = "dying";
    useGameStore.getState().setPhase("dying");
    sfx.hit();
    this.cameras.main.flash(110, 255, 255, 255);
    this.cameras.main.shake(220, 0.012);
    this.clearItem();
    this.cosmetics.setTrailActive(false);
    this.field.setSpeed(0);
    this.pickups.setSpeed(0);
    this.enemies.setSpeed(0);
    this.enemies.stop();
    this.clearGust();
    this.endFlip(false);
    this.bird.die();

    if (source === "ground") {
      this.finishRun();
    } else {
      this.deathTimer = this.time.delayedCall(TIMING.deathToGameOverMs, () => this.finishRun());
    }
  }

  private finishRun(): void {
    if (this.state !== "dying") return;
    this.cancelDeath();
    this.state = "gameover";
    this.gameOverAt = this.time.now;
    this.bird.settle(this.groundY);
    const store = useGameStore.getState();
    store.finishRun(this.score, this.runSats, this.runStats, this.runSats - this.runSatsReported);
    if (useGameStore.getState().isNewBest) sfx.newBest();
  }

  /** Score as the difficulty curve sees it: points earned plus the start zone's threshold. */
  private effectiveScore(): number {
    return this.score + this.scoreOffset;
  }

  private cancelDeath(): void {
    this.deathTimer?.remove(false);
    this.deathTimer = undefined;
  }

  // ---- sats, items, cosmetics ---------------------------------------------

  private resetRunState(): void {
    this.clearItem();
    this.continued = false;
    this.pickups.reset();
    this.pickups.setSpeed(0);
    this.runSats = 0;
    this.runSatsReported = 0;
    this.combo = 0;
    this.shielded = false;
    this.shieldRing.setVisible(false);
    this.runStats = { bestCombo: 0, itemsUsed: 0, shieldsBroken: 0, rocketPoints: 0, continues: 0 };
    const { equipped, owned } = useGameStore.getState();
    this.applySkin(equipped.skin, owned);
    this.cosmetics.apply(equipped);
    this.cosmetics.setTrailActive(false);
    this.updateHud();
  }

  /** Picks the bird texture for the equipped skin (every paid skin must be owned). */
  private applySkin(skinId: string, owned: string[]): void {
    this.rainbowTimer?.remove(false);
    this.rainbowTimer = undefined;
    this.bird.clearTint();
    if (skinId === "gold" && owned.includes("gold")) {
      this.bird.setSkin(BIRD_SKINS.gold);
      return;
    }
    const def = findCosmetic(skinId);
    if (!def || def.slot !== "skin" || (def.price > 0 && !owned.includes(skinId))) {
      this.bird.setSkin(BIRD_SKINS.default);
      return;
    }
    if (skinId === "rainbow") {
      const keys = RAINBOW_HUES.map((h, i) => ensureSkinTexture(this, `rainbow${i}`, h));
      this.bird.setSkin({ id: "rainbow", textureKey: keys[0] });
      this.rainbowTimer = this.time.addEvent({
        delay: 160,
        loop: true,
        callback: () => {
          this.rainbowIndex = (this.rainbowIndex + 1) % keys.length;
          this.bird.setTexture(keys[this.rainbowIndex]);
        },
      });
      return;
    }
    if (def.hue === undefined) {
      this.bird.setSkin(BIRD_SKINS.default);
      return;
    }
    const key = ensureSkinTexture(this, skinId, def.hue, def.lightness ?? 1);
    this.bird.setSkin({ id: skinId, textureKey: key });
  }

  /** Pushes the current scroll speed to everything that scrolls. */
  private applySpeed(): void {
    this.field.setSpeed(this.scrollSpeed);
    this.pickups.setSpeed(this.scrollSpeed);
    this.enemies.setSpeed(this.scrollSpeed);
  }

  private onPickup(pickup: Pickup): void {
    if (this.state !== "playing" || pickup.collected) return;
    if (pickup.pickupKind === "coin") {
      const value = coinValue(this.combo, this.activeItem?.kind === "double");
      this.combo += 1;
      this.runStats.bestCombo = Math.max(this.runStats.bestCombo, this.combo);
      this.runSats += value;
      sfx.coin();
      useGameStore.getState().setRunSats(this.runSats);
      this.pickups.collect(pickup);
      this.updateHud();
      this.tweens.add({ targets: this.satsText, scale: 1.25, duration: 70, yoyo: true });
      return;
    }
    this.pickups.collect(pickup);
    this.activateItem(pickup.pickupKind);
  }

  private activateItem(kind: ItemKind): void {
    const bad = BAD_ITEMS.includes(kind);
    if (bad) sfx.warning();
    else sfx.item();
    this.showItemName(kind, bad);
    if (!bad) this.runStats.itemsUsed += 1;
    if (kind === "shield") {
      this.shielded = true;
      this.shieldRing.setVisible(true);
      this.updateHud();
      return;
    }
    if (kind === "coinRain") {
      // Instant: drops a line of coins ahead and leaves the running item alone.
      this.pickups.rain(this.bird.x, this.groundY, (x) => this.field.recommendedY(x, this.bird.y));
      return;
    }
    this.clearItem();
    const duration = ITEM_DURATION[kind];
    this.activeItem = { kind, until: this.time.now + duration, duration };
    if (kind === "rocket") {
      this.speedMul = ECONOMY.rocketSpeed;
      this.bird.invincible = true;
      this.flame.setVisible(true);
      this.applySpeed();
      sfx.rocket();
    } else if (kind === "slow") {
      this.worldScale = ECONOMY.slowScale;
      this.physics.world.timeScale = 1 / ECONOMY.slowScale;
    } else if (kind === "mini") {
      this.bird.setBaseScale(ECONOMY.miniScale);
    } else if (kind === "feather") {
      this.bird.setGravityMul(ECONOMY.featherGravity);
    } else if (kind === "heavy") {
      this.bird.setGravityMul(ECONOMY.heavyGravity);
    } else if (kind === "laser") {
      this.laserBeam.setVisible(true);
    } else if (kind === "smoke") {
      this.smoke.setX(this.bird.x + ECONOMY.smokeClearPx).setVisible(true);
    }
    useGameStore.getState().setActiveItem(kind);
    this.updateHud();
  }

  /** Ends the timed item (if any) and restores normal physics. */
  private clearItem(): void {
    if (!this.activeItem) return;
    const wasRocket = this.activeItem.kind === "rocket";
    this.activeItem = null;
    this.speedMul = 1;
    this.worldScale = 1;
    this.physics.world.timeScale = 1;
    // Leaving the rocket gets a moment to get clear.
    this.bird.invincible = false;
    if (wasRocket && this.state === "playing") this.graceUntil = Math.max(this.graceUntil, this.time.now + ZONE.rocketGraceMs);
    this.flame.setVisible(false);
    this.bird.setBaseScale(1);
    this.bird.setGravityMul(1);
    this.laserBeam.setVisible(false);
    this.smoke.setVisible(false);
    if (this.state === "playing") this.applySpeed();
    useGameStore.getState().setActiveItem(null);
    this.updateHud();
  }

  private updateItem(now: number): void {
    if (!this.activeItem) return;
    const remaining = this.activeItem.until - now;
    if (remaining <= 0) {
      this.clearItem();
      return;
    }
    this.itemBar.width = Math.max(1, 60 * (remaining / this.activeItem.duration));
    if (this.activeItem.kind === "laser") this.fireLaser();
    else if (this.activeItem.kind === "smoke") this.smoke.tilePositionX += 0.6;
  }

  /** Laser eyes: everything just ahead of bitty burns away and still counts. */
  private fireLaser(): void {
    const from = this.bird.x;
    const to = from + ECONOMY.laserRange;
    this.laserBeam.setPosition(from + 10, this.bird.y - 4).setAlpha(0.55 + 0.45 * Math.random());
    const { points, hits } = this.field.blast(from, to);
    const enemyX = this.enemies.blast(from, to);
    if (enemyX !== null) hits.push(enemyX);
    for (const x of hits) this.burst(x, this.bird.y);
    if (points > 0) this.addScore(points);
  }

  private burst(x: number, y: number): void {
    const spark = this.add.image(x, y, PICKUP_TEX.sparkle).setDepth(23).setTint(0xff3355).setScale(3);
    this.tweens.add({ targets: spark, scale: 0, alpha: 0, duration: 260, onComplete: () => spark.destroy() });
  }

  /** The item's name floats up from bitty (red for the bad ones). */
  private showItemName(kind: ItemKind, bad: boolean): void {
    const name = ITEM_NAMES[kind][useGameStore.getState().locale];
    const fontFamily = (this.registry.get("fontFamily") as string | undefined) || "monospace";
    const label = this.add
      .text(this.bird.x, this.bird.y - 34, name, {
        fontFamily,
        fontSize: "14px",
        color: bad ? "#ff8a8a" : "#ffe08a",
        stroke: "#1b2a4a",
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(52);
    this.tweens.add({ targets: label, y: label.y - 26, alpha: 0, delay: 500, duration: 600, onComplete: () => label.destroy() });
  }

  private setHudVisible(visible: boolean): void {
    this.satsIcon.setVisible(visible);
    this.satsText.setVisible(visible);
    this.comboText.setVisible(visible);
    if (!visible) {
      this.itemIcon.setVisible(false);
      this.itemBarBg.setVisible(false);
      this.itemBar.setVisible(false);
      this.shieldIcon.setVisible(false);
    }
  }

  private updateHud(): void {
    this.satsText.setText(String(this.runSats));
    this.comboText.setText(this.combo >= 2 ? `×${this.combo}` : "");
    const item = this.activeItem;
    const hudOn = this.satsText.visible;
    this.itemIcon.setVisible(hudOn && item !== null);
    this.itemBarBg.setVisible(hudOn && item !== null);
    this.itemBar.setVisible(hudOn && item !== null);
    if (item) {
      this.itemIcon.setTexture(ITEM_TEX[item.kind]);
    }
    this.shieldIcon.setVisible(hudOn && this.shielded);
  }

  // ---- continue ------------------------------------------------------------

  /** Continue (paid with bitty): clears the obstacles around the bird and resumes with the same score. */
  private continueRun(): void {
    if (this.state !== "gameover" || this.continued) return;
    this.continued = true;
    this.runStats.continues += 1;
    this.cancelDeath();
    this.state = "playing";
    // The total keeps counting across the continue; the first report already banked this much.
    this.runSatsReported = this.runSats;
    this.combo = 0;
    this.field.clearAhead(this.bird.x + 260, this.zone);
    this.enemies.clear(this.time.now, this.zone);
    this.clearGimmicks();
    this.pickups.reset();
    this.bird.resetTo(BIRD.x, this.scale.height * 0.45);
    this.bird.setPhysicsScale(this.zone.gravityScale, this.zone.flapScale);
    this.bird.launch();
    this.bird.flap();
    this.graceUntil = this.time.now + 1500;
    this.cosmetics.setTrailActive(true);
    this.applySpeed();
    this.scheduleZoneEvents(this.time.now);
    this.updateHud();
    sfx.zone();
    useGameStore.getState().continueRun();
  }

  // ---- input ---------------------------------------------------------------

  /** `fromKey`: Space / Enter / Up on PC. Pointer taps on the canvas never leave game over. */
  private onTap(fromKey = false): void {
    switch (this.state) {
      case "ready":
        this.startRun();
        break;
      case "playing":
        this.bird.flap();
        break;
      case "gameover":
        // Only a key press, and only once the result buttons are up (after the continue
        // question): a flap still in the player's fingers must not skip the game-over screen.
        if (fromKey && useGameStore.getState().quickRetry && this.time.now - this.gameOverAt > TIMING.gameOverInputLockMs) {
          this.enterReady(this.runStartZone);
        }
        break;
      case "menu":
        // Pointer taps never reach the canvas here (the DOM start screen is on top);
        // this is the keyboard shortcut for PC players.
        this.enterReady(0);
        break;
      default:
        break;
    }
  }

  private onKey(event: KeyboardEvent): void {
    if (event.repeat) return;
    // Keys typed into a form, or while a dialog is open, belong to the DOM, not the game.
    const active = document.activeElement;
    if (active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA")) return;
    if (document.querySelector("[role='dialog']")) return;
    event.preventDefault();
    this.onTap(true);
  }

  // ---- lifecycle -----------------------------------------------------------

  /** The tab was hidden: freeze the run and wait for an explicit tap to resume. */
  private onHidden(): void {
    if (this.state !== "playing") return;
    this.state = "paused";
    useGameStore.getState().setPhase("paused");
    this.scene.pause();
  }

  private onResize(gameSize: Phaser.Structs.Size): void {
    const { width, height } = gameSize;
    this.parallax.layout(width, height);
    this.groundZone.setPosition(0, height - GROUND_HEIGHT).setSize(width, GROUND_HEIGHT);
    (this.groundZone.body as Phaser.Physics.Arcade.StaticBody).updateFromGameObject();
    this.flashRect.setSize(width, height);
    this.flipTint.setSize(width, height);
    this.smoke.setSize(width, height);
    this.scoreText.setPosition(width / 2, 52);
    this.itemIcon.setPosition(width - 18, 22);
    this.itemBarBg.setPosition(width - 32, 22);
    this.itemBar.setPosition(width - 34, 22);
    this.shieldIcon.setPosition(width - 18, 48);
    if (this.state === "menu") {
      this.bird.resetTo(width / 2, height * 0.42);
      this.bird.startBobbing();
    } else if (this.state === "ready") {
      this.bird.resetTo(BIRD.x, height * 0.45);
      this.bird.startBobbing();
    }
  }

  private dispose(): void {
    this.game.events.off(Phaser.Core.Events.HIDDEN, this.onHidden, this);
    this.scale.off(Phaser.Scale.Events.RESIZE, this.onResize, this);
    for (const dispose of this.disposers) dispose();
    this.disposers = [];
  }
}
