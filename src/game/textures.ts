import Phaser from "phaser";
import { GAME_WIDTH, GROUND_HEIGHT, MAX_HEIGHT, OBSTACLES } from "./constants";
import type { SkyDisc, ZoneDef, ZonePalette } from "./zones";

/** Keys of textures that are shared by every zone. */
export const TEX = {
  bitty: "bitty",
  bittyGold: "bitty-gold",
  rain: "fx-rain",
  petals: "fx-petals",
  fudPlane: "fud-plane",
  iconMove: "icon-move",
  iconCrash: "icon-crash",
  iconFud: "icon-fud",
  iconGustUp: "icon-gust-up",
  iconGustDown: "icon-gust-down",
  enemyBear: "en-bear",
  enemyWhale: "en-whale",
  enemyCrow: "en-crow",
  enemyRock: "en-rock",
  iconRock: "icon-rock",
  iconFlip: "icon-flip",
  fog: "fx-fog",
  embers: "fx-embers",
  dust: "fx-dust",
  snow: "fx-snowfall",
} as const;

export const CLOUDS_HEIGHT = 200;
export const FAR_SKYLINE_HEIGHT = 190;
export const NEAR_SKYLINE_HEIGHT = 140;
/** Scrolling layers are twice the screen width so the seam is rarely visible. */
const TILE_WIDTH = GAME_WIDTH * 2;

export interface ZoneTextureKeys {
  sky: string;
  clouds: string;
  far: string;
  near: string;
  ground: string;
}

export function zoneTextureKeys(zoneId: string): ZoneTextureKeys {
  return {
    sky: `${zoneId}-sky`,
    clouds: `${zoneId}-clouds`,
    far: `${zoneId}-far`,
    near: `${zoneId}-near`,
    ground: `${zoneId}-ground`,
  };
}

type G = Phaser.GameObjects.Graphics;
type RNG = Phaser.Math.RandomDataGenerator;

// ---- pixel primitives -------------------------------------------------------

function rect(g: G, x: number, y: number, w: number, h: number, color: number): void {
  g.fillStyle(color, 1);
  g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

/** Pixel circle drawn as scan lines (no anti-aliasing, keeps the dot-art look). */
function pixelCircle(g: G, cx: number, cy: number, r: number, color: number, alpha = 1): void {
  g.fillStyle(color, alpha);
  for (let dy = -r; dy <= r; dy++) {
    const half = Math.floor(Math.sqrt(r * r - dy * dy));
    g.fillRect(Math.round(cx - half), Math.round(cy + dy), half * 2 + 1, 1);
  }
}

/** Pixel ring: the circle of radius `r` minus the one of radius `inner`, row by row. */
function pixelRing(g: G, cx: number, cy: number, r: number, inner: number, color: number, alpha = 1): void {
  g.fillStyle(color, alpha);
  for (let dy = -r; dy <= r; dy++) {
    const outer = Math.floor(Math.sqrt(r * r - dy * dy));
    const hole = Math.abs(dy) <= inner ? Math.floor(Math.sqrt(inner * inner - dy * dy)) : -1;
    if (hole < 0) g.fillRect(cx - outer, cy + dy, outer * 2 + 1, 1);
    else {
      g.fillRect(cx - outer, cy + dy, outer - hole, 1);
      g.fillRect(cx + hole + 1, cy + dy, outer - hole, 1);
    }
  }
}

/** Thick pixel line made of small squares. */
function pixelLine(g: G, x0: number, y0: number, x1: number, y1: number, color: number, thick = 2): void {
  const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
  for (let s = 0; s <= steps; s++) {
    rect(g, x0 + ((x1 - x0) * s) / steps, y0 + ((y1 - y0) * s) / steps, thick, thick, color);
  }
}

/** Upward-pointing pixel triangle with its apex at (cx, top). */
function pixelTriangle(g: G, cx: number, top: number, height: number, slope: number, color: number): void {
  for (let i = 0; i < height; i++) {
    const half = Math.floor(i * slope);
    rect(g, cx - half, top + i, half * 2 + 1, 1, color);
  }
}

// ---- shared textures ---------------------------------------------------------

/** Rain, warning icons, the FUD plane. Call once at boot. */
export function buildSharedTextures(scene: Phaser.Scene): void {
  buildRain(scene);
  buildPetals(scene);
  buildWeather(scene);
  buildEnemies(scene);
  buildIcons(scene);
  buildFudPlane(scene);
  buildPickupTextures(scene);
  buildExtraCosmeticTextures(scene);
}

/** Fallback sprite used only if public/assets/bitty-sprite.png fails to load. */
export function buildPlaceholderBird(scene: Phaser.Scene): void {
  const g = scene.add.graphics();
  pixelCircle(g, 28, 24, 22, 0xff8c1a);
  pixelCircle(g, 32, 30, 11, 0xfff2dc);
  rect(g, 16, 14, 6, 6, 0x1b1b1b);
  rect(g, 30, 14, 6, 6, 0x1b1b1b);
  rect(g, 24, 22, 4, 3, 0xff5c8a);
  g.generateTexture(TEX.bitty, 56, 47);
  g.destroy();
}

function buildPetals(scene: Phaser.Scene): void {
  const rng = new Phaser.Math.RandomDataGenerator(["petals"]);
  const g = scene.add.graphics();
  const S = 96;
  for (let i = 0; i < 9; i++) {
    const x = rng.between(0, S - 5);
    const y = rng.between(0, S - 5);
    const c = i % 3 === 0 ? 0xffd1dc : 0xffb7c5;
    rect(g, x + 1, y, 3, 1, c);
    rect(g, x, y + 1, 5, 2, c);
    rect(g, x + 1, y + 3, 3, 1, c);
    rect(g, x + 2, y + 1, 1, 1, 0xff8fb1);
  }
  g.generateTexture(TEX.petals, S, S);
  g.destroy();
}

function buildRain(scene: Phaser.Scene): void {
  const rng = new Phaser.Math.RandomDataGenerator(["rain"]);
  const g = scene.add.graphics();
  const S = 64;
  for (let i = 0; i < 16; i++) {
    const x = rng.between(0, S - 1);
    const y = rng.between(0, S - 1);
    // Streaks lean "/" to match the motion: the rain falls down and drifts left with the world.
    for (let j = 0; j < 8; j++) rect(g, (x - Math.floor(j / 2) + S) % S, (y + j) % S, 1, 1, 0xbcd0e6);
  }
  g.generateTexture(TEX.rain, S, S);
  g.destroy();
}

/** Tileable weather layers: fog banks, rising embers, blowing dust, falling snow. */
function buildWeather(scene: Phaser.Scene): void {
  const rng = new Phaser.Math.RandomDataGenerator(["weather"]);
  // fog: soft pale blobs on a 256 tile
  let g = scene.add.graphics();
  for (let i = 0; i < 7; i++) {
    const cx = rng.between(30, 226);
    const cy = rng.between(30, 226);
    for (let k = 0; k < 4; k++) {
      g.fillStyle(0xe8ecf1, 0.12);
      const r = 26 + k * 7 + rng.between(0, 8);
      g.fillCircle(cx, cy, r);
    }
  }
  g.generateTexture(TEX.fog, 256, 256);
  g.destroy();
  // embers: tiny orange / yellow sparks
  g = scene.add.graphics();
  for (let i = 0; i < 14; i++) {
    const x = rng.between(0, 94);
    const y = rng.between(0, 94);
    rect(g, x, y, 2, 2, i % 3 === 0 ? 0xffd54a : 0xff7a2f);
  }
  g.generateTexture(TEX.embers, 96, 96);
  g.destroy();
  // dust: tan streaks
  g = scene.add.graphics();
  for (let i = 0; i < 18; i++) {
    const x = rng.between(0, 90);
    const y = rng.between(0, 94);
    rect(g, x, y, rng.between(3, 6), 1, i % 2 === 0 ? 0xf0b884 : 0xd9925e);
  }
  g.generateTexture(TEX.dust, 96, 96);
  g.destroy();
  // snow: white flakes
  g = scene.add.graphics();
  for (let i = 0; i < 12; i++) {
    const x = rng.between(1, 93);
    const y = rng.between(1, 93);
    rect(g, x, y, 2, 2, 0xffffff);
    if (i % 3 === 0) {
      rect(g, x - 1, y, 1, 2, 0xe6eefc);
      rect(g, x + 2, y, 1, 2, 0xe6eefc);
    }
  }
  g.generateTexture(TEX.snow, 96, 96);
  g.destroy();
}

/** Enemy sprites, all facing left (towards the player), plus their warning icons. */
function buildEnemies(scene: Phaser.Scene): void {
  // Bear (弱気相場): brown bear, round ears, angry brows, red down-arrow badge.
  let g = scene.add.graphics();
  pixelCircle(g, 20, 20, 15, 0x6b4226);
  pixelCircle(g, 9, 7, 5, 0x6b4226);
  pixelCircle(g, 31, 7, 5, 0x6b4226);
  pixelCircle(g, 9, 7, 2, 0xc48a5a);
  pixelCircle(g, 31, 7, 2, 0xc48a5a);
  pixelCircle(g, 14, 26, 7, 0xc48a5a); // muzzle (pointing left)
  rect(g, 9, 23, 4, 3, 0x1b1b1b);
  rect(g, 11, 15, 4, 4, 0xffffff);
  rect(g, 21, 15, 4, 4, 0xffffff);
  rect(g, 11, 16, 2, 2, 0x1b1b1b);
  rect(g, 21, 16, 2, 2, 0x1b1b1b);
  rect(g, 10, 12, 6, 2, 0x1b1b1b);
  rect(g, 20, 12, 6, 2, 0x1b1b1b);
  pixelCircle(g, 30, 30, 6, 0xe8503f);
  rect(g, 29, 26, 2, 6, 0xffffff);
  rect(g, 27, 30, 6, 2, 0xffffff);
  rect(g, 28, 32, 4, 1, 0xffffff);
  g.generateTexture(TEX.enemyBear, 40, 38);
  g.destroy();
  // Whale (クジラ): big blue whale with a white belly and a spout.
  g = scene.add.graphics();
  for (let x = 0; x < 84; x++) {
    const t = x / 84;
    const h = Math.round(34 * Math.sin(Math.PI * Math.min(1, t * 1.15)) + 4);
    rect(g, x, 26 - h / 2, 1, h, 0x2563eb);
    if (t < 0.8) rect(g, x, 26 + h / 2 - Math.round(h * 0.3), 1, Math.round(h * 0.3), 0xdbeafe);
  }
  for (let i = 0; i < 12; i++) rect(g, 80 + Math.floor(i / 2), 14 - i, 3, 3 + i, 0x1d4ed8); // tail fluke
  rect(g, 16, 18, 4, 4, 0xffffff);
  rect(g, 17, 19, 2, 2, 0x0b1a3a);
  rect(g, 6, 30, 14, 2, 0x0b1a3a); // mouth
  rect(g, 30, 4, 3, 6, 0x93c5fd); // spout
  rect(g, 26, 2, 3, 3, 0x93c5fd);
  rect(g, 34, 2, 3, 3, 0x93c5fd);
  g.generateTexture(TEX.enemyWhale, 92, 48);
  g.destroy();
  // Crow (FUD のカラス): black bird with a red "FUD" eye.
  g = scene.add.graphics();
  pixelCircle(g, 16, 12, 9, 0x1f2430);
  pixelTriangle(g, 18, 2, 10, 1.1, 0x2b3240); // wing
  rect(g, 0, 11, 8, 3, 0xf2c94c); // beak
  rect(g, 9, 8, 3, 3, 0xff3b3b);
  rect(g, 24, 12, 8, 4, 0x1f2430); // tail
  g.generateTexture(TEX.enemyCrow, 32, 22);
  g.destroy();
  // Rock (火山弾 / 隕石): glowing lava rock.
  g = scene.add.graphics();
  pixelCircle(g, 12, 12, 11, 0xff7a1a);
  pixelCircle(g, 12, 12, 9, 0x4a2a24);
  rect(g, 7, 9, 4, 3, 0xff9f43);
  rect(g, 13, 14, 5, 2, 0xff9f43);
  rect(g, 10, 4, 2, 3, 0xffd54a);
  g.generateTexture(TEX.enemyRock, 24, 24);
  g.destroy();
  // ⇣ falling-rock warning
  g = scene.add.graphics();
  iconBackground(g);
  rect(g, 11, 5, 2, 10, 0xff9f43);
  for (let i = 0; i < 5; i++) rect(g, 7 + i, 13 + i, 10 - 2 * i, 1, 0xff9f43);
  g.generateTexture(TEX.iconRock, 24, 24);
  g.destroy();
  // ⇅ gravity flip warning
  g = scene.add.graphics();
  iconBackground(g);
  rect(g, 7, 6, 2, 12, 0xc084fc);
  for (let i = 0; i < 4; i++) rect(g, 8 - i, 6 + i, 2 + 2 * i - 1, 1, 0xc084fc);
  rect(g, 15, 6, 2, 12, 0x7df9ff);
  for (let i = 0; i < 4; i++) rect(g, 16 - i, 17 - i, 2 + 2 * i - 1, 1, 0x7df9ff);
  g.generateTexture(TEX.iconFlip, 24, 24);
  g.destroy();
}

function iconBackground(g: G): void {
  pixelCircle(g, 12, 12, 11, 0xffffff);
  pixelCircle(g, 12, 12, 9, 0x1b2a4a);
}

function buildIcons(scene: Phaser.Scene): void {
  // ↕ : moving candle marker
  let g = scene.add.graphics();
  const arrowV = (color: number, dx: number, dy: number) => {
    rect(g, 11 + dx, 4 + dy, 2, 16, color);
    for (let i = 0; i < 4; i++) {
      rect(g, 11 - i + dx, 4 + i + dy, 2 + 2 * i, 1, color);
      rect(g, 11 - i + dx, 19 - i + dy, 2 + 2 * i, 1, color);
    }
  };
  for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]] as const) arrowV(0x1b2a4a, dx, dy);
  arrowV(0xffffff, 0, 0);
  g.generateTexture(TEX.iconMove, 24, 24);
  g.destroy();

  // 📉 : crash cluster warning
  g = scene.add.graphics();
  iconBackground(g);
  pixelLine(g, 4, 7, 9, 12, 0xff6b5b);
  pixelLine(g, 9, 12, 13, 8, 0xff6b5b);
  pixelLine(g, 13, 8, 18, 15, 0xff6b5b);
  rect(g, 15, 16, 5, 2, 0xff6b5b);
  rect(g, 18, 12, 2, 6, 0xff6b5b);
  g.generateTexture(TEX.iconCrash, 24, 24);
  g.destroy();

  // ! : FUD plane incoming
  g = scene.add.graphics();
  pixelTriangle(g, 12, 2, 20, 0.66, 0x1b2a4a);
  pixelTriangle(g, 12, 4, 17, 0.62, 0xffd23f);
  rect(g, 11, 8, 2, 7, 0x1b2a4a);
  rect(g, 11, 17, 2, 2, 0x1b2a4a);
  g.generateTexture(TEX.iconFud, 24, 24);
  g.destroy();

  // gusts
  for (const [key, up] of [
    [TEX.iconGustUp, true],
    [TEX.iconGustDown, false],
  ] as const) {
    g = scene.add.graphics();
    iconBackground(g);
    if (up) {
      pixelLine(g, 6, 12, 11, 7, 0xffffff);
      pixelLine(g, 11, 7, 16, 12, 0xffffff);
    } else {
      pixelLine(g, 6, 10, 11, 15, 0xffffff);
      pixelLine(g, 11, 15, 16, 10, 0xffffff);
    }
    rect(g, 6, up ? 16 : 5, 12, 1, 0xbcd0e6);
    rect(g, 8, up ? 18 : 3, 8, 1, 0xbcd0e6);
    g.generateTexture(key, 24, 24);
    g.destroy();
  }
}

/** Paper plane pointing left (it flies towards the player). */
function buildFudPlane(scene: Phaser.Scene): void {
  const { width: W, height: H } = OBSTACLES.fud;
  const g = scene.add.graphics();
  const wedge = (color: number, extra: number) => {
    for (let x = 0; x < W; x++) {
      const h = 2 + Math.floor((x * (H - 2)) / W) + extra;
      rect(g, x, H / 2 - h / 2, 1, h, color);
    }
  };
  wedge(0x1b2a4a, 2);
  wedge(0xf8fafc, 0);
  rect(g, 6, H / 2 - 1, W - 8, 2, 0xe8503f); // fold stripe
  g.generateTexture(TEX.fudPlane, W, H);
  g.destroy();
}

// ---- zone textures -----------------------------------------------------------

/** Builds the sky, clouds, skylines and ground for one zone. */
export function buildZoneTextures(scene: Phaser.Scene, zone: ZoneDef): void {
  const keys = zoneTextureKeys(zone.id);
  const p = zone.palette;
  const rng = new Phaser.Math.RandomDataGenerator([`flappy-bitty-${zone.id}`]);
  buildSky(scene, keys.sky, p, rng);
  if (p.cloud !== null) buildClouds(scene, keys.clouds, p, rng);
  buildFar(scene, keys.far, p, rng);
  buildNear(scene, keys.near, p, rng);
  buildGround(scene, keys.ground, p, rng);
}

function buildSky(scene: Phaser.Scene, key: string, p: ZonePalette, rng: RNG): void {
  const g = scene.add.graphics();
  const top = Phaser.Display.Color.ValueToColor(p.skyTop);
  const bottom = Phaser.Display.Color.ValueToColor(p.skyBottom);
  const bands = 16;
  const bandHeight = Math.ceil(MAX_HEIGHT / bands);
  for (let i = 0; i < bands; i++) {
    const c = Phaser.Display.Color.Interpolate.ColorWithColor(top, bottom, bands - 1, i);
    rect(g, 0, i * bandHeight, GAME_WIDTH, bandHeight, Phaser.Display.Color.GetColor(c.r, c.g, c.b));
  }
  if (p.stars) {
    const colors = [0xffffff, 0xfff4c2, 0xc7d9ff];
    for (let i = 0; i < 90; i++) {
      const x = rng.between(0, GAME_WIDTH - 2);
      const y = rng.between(0, Math.round(MAX_HEIGHT * 0.7));
      const size = rng.frac() < 0.2 ? 2 : 1;
      rect(g, x, y, size, size, colors[rng.between(0, colors.length - 1)]);
    }
  }
  if (p.disc) drawDisc(g, p.disc);
  g.generateTexture(key, GAME_WIDTH, MAX_HEIGHT);
  g.destroy();
}

function drawDisc(g: G, d: SkyDisc): void {
  pixelCircle(g, d.x, d.y, d.radius + 6, d.glow);
  pixelCircle(g, d.x, d.y, d.radius, d.color);
  if (d.kind === "moon") {
    pixelCircle(g, d.x - 6, d.y - 4, 4, d.glow);
    pixelCircle(g, d.x + 5, d.y + 6, 3, d.glow);
    pixelCircle(g, d.x + 3, d.y - 9, 2, d.glow);
  } else if (d.kind === "planet") {
    // ringed planet: bands and a tilted ring
    rect(g, d.x - d.radius + 4, d.y - 6, d.radius * 2 - 8, 3, d.glow);
    rect(g, d.x - d.radius + 2, d.y + 4, d.radius * 2 - 4, 3, d.glow);
    for (let x = -d.radius - 14; x <= d.radius + 14; x += 2) {
      const y = d.y + Math.round(x * 0.25);
      if (Math.abs(x) > d.radius - 4 || y > d.y) rect(g, d.x + x, y, 2, 2, 0xf5d0fe);
    }
  } else if (d.kind === "earth") {
    pixelCircle(g, d.x - 7, d.y - 5, 7, 0x3fa34d);
    pixelCircle(g, d.x + 8, d.y + 5, 5, 0x3fa34d);
    rect(g, d.x - 10, d.y + 9, 9, 4, 0x3fa34d);
    rect(g, d.x - 6, d.y - d.radius + 1, 12, 3, 0xf1f5f9);
    rect(g, d.x - 4, d.y + d.radius - 3, 9, 2, 0xf1f5f9);
  }
}

function buildClouds(scene: Phaser.Scene, key: string, p: ZonePalette, rng: RNG): void {
  const g = scene.add.graphics();
  const count = 7;
  const fill = p.cloud ?? 0xffffff;
  for (let i = 0; i < count; i++) {
    const cx = Phaser.Math.Clamp(
      Math.round((i + 0.5) * (TILE_WIDTH / count) + rng.between(-28, 28)),
      72,
      TILE_WIDTH - 72,
    );
    const cy = rng.between(34, CLOUDS_HEIGHT - 44);
    const puffs = rng.between(3, 5);
    const spread = rng.between(14, 22);
    const radii = Array.from({ length: puffs }, () => rng.between(9, 15));
    const offset = (n: number) => cx + (n - (puffs - 1) / 2) * spread;
    radii.forEach((r, n) => pixelCircle(g, offset(n), cy + 4, r, p.cloudShadow));
    radii.forEach((r, n) => pixelCircle(g, offset(n), cy, r, fill));
    rect(g, offset(0) - 10, cy + 2, (puffs - 1) * spread + 20, 8, fill);
  }
  g.generateTexture(key, TILE_WIDTH, CLOUDS_HEIGHT);
  g.destroy();
}

interface BuildingStyle {
  fill: number;
  roof: number;
  windows: number | null;
  minRatio: number;
  maxRatio: number;
  neon: boolean;
}

const NEON_COLORS = [0xff4fa3, 0x4ff0ff, 0x7dff6b, 0xffd23f];

function drawBuildings(g: G, rng: RNG, height: number, st: BuildingStyle): void {
  let x = 0;
  while (x < TILE_WIDTH) {
    const w = Math.min(rng.between(18, 44), TILE_WIDTH - x);
    const h = rng.between(Math.round(height * st.minRatio), Math.round(height * st.maxRatio));
    const y = height - h;
    rect(g, x, y, w, h, st.fill);
    rect(g, x, y, w, 3, st.roof);
    if (rng.frac() < 0.3) rect(g, x + Math.floor(w / 2) - 2, y - 6, 4, 6, st.fill);
    if (st.windows !== null) {
      for (let wy = y + 8; wy < height - 6; wy += 8) {
        for (let wx = x + 4; wx < x + w - 5; wx += 7) {
          if (rng.frac() < 0.55) rect(g, wx, wy, 3, 4, st.windows);
        }
      }
    }
    if (st.neon && w >= 24 && h > 50) {
      const signs = rng.between(1, 2);
      for (let s = 0; s < signs; s++) {
        const color = NEON_COLORS[rng.between(0, NEON_COLORS.length - 1)];
        const sx = x + 3 + s * (w - 12);
        const sy = y + 10 + rng.between(0, Math.max(0, h - 50));
        rect(g, sx, sy, 7, 26, color);
        rect(g, sx + 2, sy + 3, 3, 20, 0xffffff);
      }
    }
    x += w + rng.between(0, 3);
  }
}

/** Tokyo Tower silhouette: international-orange / white bands with two decks. */
function drawTokyoTower(g: G, cx: number, baseY: number, H: number, baseWidth: number): void {
  const top = baseY - H;
  const widthAt = (t: number) => Math.round(8 + (baseWidth - 8) * t * t);
  for (let y = top; y < baseY; y += 4) {
    const t = (y - top) / H;
    const w = widthAt(t);
    const orange = Math.floor((y - top) / 12) % 2 === 0;
    rect(g, cx - w / 2, y, w, 4, orange ? 0xf26b3a : 0xf8f4ec);
  }
  const deck = (t: number, extra: number, h: number) => {
    const w = widthAt(t) + extra;
    rect(g, cx - w / 2, top + H * t, w, h, 0xe8e2d6);
  };
  deck(0.56, 16, 9);
  deck(0.3, 10, 6);
  rect(g, cx - 1, top - 16, 2, 16, 0xf26b3a);
}

/** Tokyo Skytree silhouette: slim bluish-silver tower with two observation decks. */
function drawSkytree(g: G, cx: number, baseY: number): void {
  const H = 166;
  const top = baseY - H;
  for (let y = top; y < baseY; y += 4) {
    const t = (y - top) / H;
    const w = Math.round(6 + 10 * t);
    rect(g, cx - w / 2, y, w, 4, 0xaabfdd);
  }
  rect(g, cx - 12, top + H * 0.45, 24, 8, 0xc6d5ea);
  rect(g, cx - 9, top + H * 0.3, 18, 6, 0xc6d5ea);
  rect(g, cx - 1, top - 18, 2, 18, 0xaabfdd);
}

/** Rolling lunar hills; the sine periods divide the tile width so the layer tiles seamlessly. */
function drawHills(g: G, height: number, fill: number, roof: number): void {
  for (let x = 0; x < TILE_WIDTH; x += 2) {
    const h =
      height * 0.34 +
      28 * Math.sin((2 * Math.PI * x) / 360) +
      16 * Math.sin((2 * Math.PI * x) / 144 + 1) +
      8 * Math.sin((2 * Math.PI * x) / 48);
    rect(g, x, height - h, 2, h, fill);
    rect(g, x, height - h, 2, 3, roof);
  }
}

function drawBoulders(g: G, rng: RNG, height: number, fill: number, highlight: number): void {
  for (let i = 0; i < 9; i++) {
    const r = rng.between(8, 18);
    const cx = rng.between(r, TILE_WIDTH - r);
    const cy = height - r + 4;
    pixelCircle(g, cx, cy, r, highlight);
    pixelCircle(g, cx + 2, cy + 2, r - 2, fill);
  }
}

function drawLander(g: G, cx: number, baseY: number): void {
  rect(g, cx - 12, baseY - 26, 24, 14, 0xd4a53a); // descent stage
  rect(g, cx - 8, baseY - 40, 16, 14, 0xc9ccd6); // ascent stage
  pixelTriangle(g, cx, baseY - 46, 6, 0.8, 0xc9ccd6);
  pixelLine(g, cx - 12, baseY - 14, cx - 20, baseY - 2, 0xc9ccd6);
  pixelLine(g, cx + 10, baseY - 14, cx + 18, baseY - 2, 0xc9ccd6);
  rect(g, cx - 23, baseY - 3, 8, 2, 0xc9ccd6);
  rect(g, cx + 15, baseY - 3, 8, 2, 0xc9ccd6);
  rect(g, cx + 30, baseY - 34, 2, 34, 0xe5e7eb); // flag
  rect(g, cx + 32, baseY - 34, 14, 9, 0xf7931a);
}

function drawRail(g: G, height: number, band: number, pillar: number): void {
  const y = Math.round(height * 0.5);
  rect(g, 0, y, TILE_WIDTH, 6, band);
  rect(g, 0, y + 6, TILE_WIDTH, 2, 0x000000);
  for (let px = 16; px < TILE_WIDTH; px += 48) rect(g, px, y + 8, 4, height - y - 8, pillar);
}

function buildFar(scene: Phaser.Scene, key: string, p: ZonePalette, rng: RNG): void {
  const g = scene.add.graphics();
  const H = FAR_SKYLINE_HEIGHT;
  const base = { fill: p.farFill, roof: p.farRoof, windows: null, neon: false };
  switch (p.scenery) {
    case "tokyo":
    case "storm":
      drawBuildings(g, rng, H, { ...base, minRatio: 0.22, maxRatio: 0.72 });
      drawTokyoTower(g, rng.between(120, 240), H, 168, 64);
      drawSkytree(g, rng.between(440, 600), H);
      break;
    case "tower":
      drawBuildings(g, rng, H, { ...base, minRatio: 0.18, maxRatio: 0.42 });
      drawSkytree(g, rng.between(520, 640), H);
      drawTokyoTower(g, rng.between(150, 230), H, 186, 76);
      break;
    case "akiba":
      drawBuildings(g, rng, H, { ...base, minRatio: 0.3, maxRatio: 0.8 });
      break;
    case "moon":
      drawHills(g, H, p.farFill, p.farRoof);
      break;
    case "sakura":
      drawBuildings(g, rng, H, { ...base, minRatio: 0.15, maxRatio: 0.4 });
      drawPagoda(g, 180, H, p.farFill, p.farRoof);
      drawSkytree(g, 560, H);
      break;
    case "bay":
      drawBuildings(g, rng, H, { ...base, minRatio: 0.2, maxRatio: 0.6 });
      drawFerrisWheel(g, 600, H, p.farRoof);
      break;
    case "wallstreet":
      drawBuildings(g, rng, H, { ...base, minRatio: 0.45, maxRatio: 0.95 });
      drawSpire(g, 180, H, p.farRoof);
      drawSpire(g, 560, H, p.farRoof);
      break;
    case "london":
      drawBuildings(g, rng, H, { ...base, minRatio: 0.15, maxRatio: 0.45 });
      drawBigBen(g, 170, H, p.farFill, p.farRoof);
      drawTowerBridge(g, 520, H, p.farFill, p.farRoof);
      break;
    case "hongkong":
      drawPeaks(g, H, p.farFill, p.farRoof, 0.55);
      drawBuildings(g, rng, H, { ...base, minRatio: 0.35, maxRatio: 0.9, windows: 0x5a4fa0 });
      break;
    case "volcano":
      drawVolcano(g, 360, H, p.farFill, p.farRoof);
      break;
    case "fuji":
      drawFuji(g, 360, H, p.farFill, p.farRoof);
      break;
    case "mars":
      drawHills(g, H, p.farFill, p.farRoof);
      break;
    case "galaxy":
      drawNebula(g, rng, H);
      break;
  }
  g.generateTexture(key, TILE_WIDTH, H);
  g.destroy();
}

function buildNear(scene: Phaser.Scene, key: string, p: ZonePalette, rng: RNG): void {
  const g = scene.add.graphics();
  const H = NEAR_SKYLINE_HEIGHT;
  const base = { fill: p.nearFill, roof: p.nearRoof, windows: p.windows, minRatio: 0.22, maxRatio: 0.72 };
  switch (p.scenery) {
    case "tokyo":
    case "storm":
    case "tower":
      drawBuildings(g, rng, H, { ...base, neon: false });
      break;
    case "akiba":
      drawBuildings(g, rng, H, { ...base, minRatio: 0.3, maxRatio: 0.85, neon: true });
      drawRail(g, H, p.nearRoof, p.nearFill);
      break;
    case "moon":
      drawBoulders(g, rng, H, p.nearFill, p.nearRoof);
      drawLander(g, 300, H);
      break;
    case "sakura":
      drawSakuraTrees(g, rng, H);
      drawGate(g, 360, H, p.nearFill, p.nearRoof);
      break;
    case "bay":
      drawRainbowBridge(g, H, p.nearFill);
      drawBoats(g, rng, H, p.nearRoof);
      break;
    case "wallstreet":
      drawBuildings(g, rng, H, { ...base, minRatio: 0.4, maxRatio: 0.9, neon: false });
      drawBull(g, 300, H);
      break;
    case "london":
      drawBuildings(g, rng, H, { ...base, minRatio: 0.25, maxRatio: 0.6, neon: false });
      drawBus(g, 140, H);
      drawBus(g, 520, H);
      break;
    case "hongkong":
      drawBuildings(g, rng, H, { ...base, minRatio: 0.35, maxRatio: 0.9, neon: true });
      drawJunk(g, 260, H);
      break;
    case "volcano":
      drawPalms(g, rng, H);
      drawHuts(g, rng, H, p.nearFill, p.nearRoof);
      break;
    case "fuji":
      drawPines(g, rng, H, p.nearFill, p.nearRoof);
      drawTorii(g, 380, H);
      break;
    case "mars":
      drawBoulders(g, rng, H, p.nearFill, p.nearRoof);
      drawDomes(g, 200, H);
      drawRover(g, 520, H);
      break;
    case "galaxy":
      drawAsteroids(g, rng, H);
      drawStation(g, 420, H);
      break;
  }
  g.generateTexture(key, TILE_WIDTH, H);
  g.destroy();
}

/** Five-storey pagoda silhouette. */
function drawPagoda(g: G, cx: number, baseY: number, fill: number, roof: number): void {
  const tiers = 5;
  for (let i = 0; i < tiers; i++) {
    const y = baseY - 28 - i * 26;
    const w = 52 - i * 6;
    rect(g, cx - w / 2 + 6, y, w - 12, 18, fill);
    rect(g, cx - w / 2, y - 6, w, 6, roof);
    rect(g, cx - w / 2 - 4, y - 2, 4, 2, roof);
    rect(g, cx + w / 2, y - 2, 4, 2, roof);
  }
  rect(g, cx - 1, baseY - 28 - tiers * 26 - 18, 2, 18, roof);
}

/** Kaminarimon-style gate with a big lantern. */
function drawGate(g: G, cx: number, baseY: number, fill: number, roof: number): void {
  rect(g, cx - 44, baseY - 70, 8, 70, fill);
  rect(g, cx + 36, baseY - 70, 8, 70, fill);
  rect(g, cx - 52, baseY - 84, 104, 14, fill);
  rect(g, cx - 58, baseY - 92, 116, 8, roof);
  pixelCircle(g, cx, baseY - 54, 14, 0xe8503f);
  rect(g, cx - 10, baseY - 60, 20, 2, 0x1b2a4a);
  rect(g, cx - 10, baseY - 50, 20, 2, 0x1b2a4a);
  rect(g, cx - 2, baseY - 70, 4, 6, 0x1b2a4a);
}

function drawSakuraTrees(g: G, rng: RNG, height: number): void {
  for (let i = 0; i < 8; i++) {
    const cx = 40 + i * 90 + rng.between(-15, 15);
    const trunkH = rng.between(26, 40);
    rect(g, cx - 3, height - trunkH, 6, trunkH, 0x4a2f24);
    const r = rng.between(18, 26);
    pixelCircle(g, cx, height - trunkH - r + 10, r, 0xf7a8c0);
    pixelCircle(g, cx - r * 0.5, height - trunkH - r * 0.5 + 10, r * 0.7, 0xffc1d4);
    pixelCircle(g, cx + r * 0.5, height - trunkH - r * 0.4 + 10, r * 0.65, 0xffd1dc);
  }
}

function drawFerrisWheel(g: G, cx: number, baseY: number, color: number): void {
  const cy = baseY - 70;
  const r = 44;
  for (let a = 0; a < 360; a += 10) {
    const rad = (a * Math.PI) / 180;
    rect(g, cx + Math.cos(rad) * r, cy + Math.sin(rad) * r, 2, 2, color);
    if (a % 45 === 0) pixelLine(g, cx, cy, cx + Math.cos(rad) * r, cy + Math.sin(rad) * r, color, 1);
    if (a % 45 === 0) rect(g, cx + Math.cos(rad) * r - 3, cy + Math.sin(rad) * r - 3, 6, 6, NEON_COLORS[(a / 45) % NEON_COLORS.length]);
  }
  pixelLine(g, cx - 20, baseY, cx, cy, color, 2);
  pixelLine(g, cx + 20, baseY, cx, cy, color, 2);
}

/** Rainbow Bridge: two towers, deck and suspension cables with lit segments. */
function drawRainbowBridge(g: G, height: number, fill: number): void {
  const deckY = height - 60;
  rect(g, 0, deckY, TILE_WIDTH, 8, fill);
  rect(g, 0, deckY + 8, TILE_WIDTH, 3, 0x0a1430);
  const colors = [0xff6b6b, 0xffd166, 0x7dff6b, 0x4ff0ff, 0x9b7bff];
  for (const tx of [200, 520]) {
    rect(g, tx - 6, deckY - 70, 12, 70 + 60, fill);
    rect(g, tx - 10, deckY - 76, 20, 6, fill);
    for (let i = 0; i < 12; i++) {
      const x0 = tx + (i - 6) * 26;
      const sag = Math.abs(i - 6) * 9;
      pixelLine(g, x0, deckY, tx, deckY - 68 + sag * 0.2, colors[i % colors.length], 1);
    }
  }
  for (let x = 0; x < TILE_WIDTH; x += 24) rect(g, x, deckY - 4, 2, 4, 0xffe08a);
  for (let i = 0; i < 14; i++) rect(g, 10 + i * 52, deckY + 22, 3, 3, 0xffe08a);
}

function drawBoats(g: G, rng: RNG, height: number, color: number): void {
  for (let i = 0; i < 4; i++) {
    const x = 60 + i * 180 + rng.between(-20, 20);
    rect(g, x, height - 18, 34, 8, color);
    rect(g, x + 8, height - 28, 16, 10, color);
    rect(g, x + 12, height - 26, 3, 3, 0xffe08a);
    rect(g, x + 18, height - 26, 3, 3, 0xffe08a);
  }
}

// ---- world tour scenery -------------------------------------------------------

/** Art-deco skyscraper spire (Wall Street skyline). */
function drawSpire(g: G, cx: number, baseY: number, color: number): void {
  const H = 176;
  const top = baseY - H;
  for (let y = top; y < baseY; y += 4) {
    const t = (y - top) / H;
    const w = Math.round(t < 0.25 ? 6 + t * 40 : t < 0.5 ? 18 + (t - 0.25) * 60 : 34);
    rect(g, cx - w / 2, y, w, 4, color);
  }
  rect(g, cx - 1, top - 20, 2, 20, color);
}

/** The charging bull statue, in bronze. */
function drawBull(g: G, cx: number, baseY: number): void {
  const c = 0x8a5a2b;
  const hi = 0xb07a3f;
  rect(g, cx - 30, baseY - 6, 60, 6, 0x5a5a5a); // plinth
  rect(g, cx - 26, baseY - 30, 44, 18, c); // body
  rect(g, cx - 22, baseY - 34, 30, 4, hi);
  rect(g, cx + 14, baseY - 36, 16, 14, c); // head (lowered, charging left-to-right)
  rect(g, cx + 26, baseY - 42, 3, 8, 0xe8e2d6); // horns
  rect(g, cx + 18, baseY - 42, 3, 8, 0xe8e2d6);
  for (const lx of [cx - 24, cx - 14, cx + 2, cx + 12]) rect(g, lx, baseY - 12, 5, 8, c);
  rect(g, cx - 32, baseY - 30, 6, 2, c); // tail
}

/** Elizabeth Tower (Big Ben) with a lit clock face. */
function drawBigBen(g: G, cx: number, baseY: number, fill: number, roof: number): void {
  rect(g, cx - 12, baseY - 150, 24, 150, fill);
  rect(g, cx - 14, baseY - 156, 28, 6, roof);
  pixelCircle(g, cx, baseY - 132, 9, 0xfff3c4);
  rect(g, cx, baseY - 138, 1, 6, 0x1b2a4a);
  rect(g, cx, baseY - 132, 5, 1, 0x1b2a4a);
  pixelTriangle(g, cx, baseY - 186, 30, 0.45, roof);
  rect(g, cx - 1, baseY - 196, 2, 10, roof);
}

/** Tower Bridge: two gothic towers and the walkway between them. */
function drawTowerBridge(g: G, cx: number, baseY: number, fill: number, roof: number): void {
  for (const tx of [cx - 50, cx + 50]) {
    rect(g, tx - 12, baseY - 110, 24, 110, fill);
    pixelTriangle(g, tx, baseY - 132, 22, 0.55, roof);
    rect(g, tx - 4, baseY - 96, 8, 12, 0x6f7a8a);
  }
  rect(g, cx - 38, baseY - 98, 76, 6, roof); // high walkway
  rect(g, cx - 38, baseY - 44, 76, 8, fill); // deck
  for (const side of [-1, 1]) pixelLine(g, cx + side * 38, baseY - 92, cx + side * 110, baseY - 40, roof, 2);
}

/** Red double-decker bus. */
function drawBus(g: G, x: number, baseY: number): void {
  rect(g, x, baseY - 34, 52, 28, 0xd9312b);
  rect(g, x, baseY - 36, 52, 2, 0xb5261f);
  for (let i = 0; i < 5; i++) {
    rect(g, x + 4 + i * 10, baseY - 32, 7, 6, 0xcfe6ff);
    rect(g, x + 4 + i * 10, baseY - 22, 7, 6, 0xcfe6ff);
  }
  pixelCircle(g, x + 10, baseY - 5, 5, 0x1b1b1b);
  pixelCircle(g, x + 42, baseY - 5, 5, 0x1b1b1b);
}

/** Jagged mountain ridge (Hong Kong's peaks); `ratio` sets the height. */
function drawPeaks(g: G, height: number, fill: number, roof: number, ratio: number): void {
  for (let x = 0; x < TILE_WIDTH; x += 2) {
    const h =
      height * ratio +
      30 * Math.sin((2 * Math.PI * x) / 240) +
      18 * Math.sin((2 * Math.PI * x) / 90 + 2) +
      6 * Math.sin((2 * Math.PI * x) / 30);
    rect(g, x, height - h, 2, h, fill);
    rect(g, x, height - h, 2, 2, roof);
  }
}

/** Junk boat with red battened sails. */
function drawJunk(g: G, x: number, baseY: number): void {
  rect(g, x, baseY - 14, 70, 10, 0x5a3a22);
  rect(g, x - 6, baseY - 18, 10, 6, 0x5a3a22);
  for (const [mx, h] of [
    [x + 18, 52],
    [x + 44, 40],
  ] as const) {
    rect(g, mx, baseY - 14 - h, 2, h, 0x3a2414);
    for (let i = 0; i < h - 6; i += 6) rect(g, mx - 14 + Math.floor(i / 8), baseY - 14 - h + i + 4, 26 - Math.floor(i / 4), 4, 0xc0392b);
  }
}

/** Smoking volcano with a lava crown. */
function drawVolcano(g: G, cx: number, baseY: number, fill: number, roof: number): void {
  const H = 160;
  for (let y = 0; y < H; y += 2) {
    const half = 26 + Math.round(y * 1.6);
    rect(g, cx - half, baseY - H + y, half * 2, 2, fill);
  }
  rect(g, cx - 26, baseY - H, 52, 4, roof);
  for (let i = 0; i < 6; i++) rect(g, cx - 22 + i * 8, baseY - H + 2, 4, 10 + (i % 3) * 8, 0xff6a1a); // lava streams
  rect(g, cx - 24, baseY - H - 2, 48, 3, 0xffb347);
  for (let i = 0; i < 6; i++) pixelCircle(g, cx - 10 + i * 6, baseY - H - 12 - i * 9, 8 + i, 0x5a4642); // smoke
}

function drawPalms(g: G, rng: RNG, height: number): void {
  for (let i = 0; i < 8; i++) {
    const cx = 30 + i * 92 + rng.between(-14, 14);
    const trunkH = rng.between(48, 72);
    for (let y = 0; y < trunkH; y += 4) rect(g, cx + Math.round(Math.sin(y / 16) * 4), height - y - 4, 5, 4, 0x6b4a2b);
    const top = height - trunkH;
    for (const [dx, dy] of [
      [-18, 4],
      [18, 4],
      [-12, -6],
      [12, -6],
      [0, -10],
    ] as const) {
      pixelLine(g, cx + 2, top, cx + 2 + dx, top + dy + 8, 0x2f8a4a, 3);
    }
  }
}

function drawHuts(g: G, rng: RNG, height: number, fill: number, roof: number): void {
  for (let i = 0; i < 5; i++) {
    const x = 70 + i * 140 + rng.between(-10, 10);
    rect(g, x, height - 24, 30, 24, fill);
    pixelTriangle(g, x + 15, height - 38, 14, 1.2, roof);
    rect(g, x + 11, height - 14, 8, 14, 0x1b1b1b);
  }
}

/** Mt. Fuji with its snow cap. */
function drawFuji(g: G, cx: number, baseY: number, fill: number, snow: number): void {
  const H = 150;
  for (let y = 0; y < H; y += 2) {
    const half = 30 + Math.round(y * 2.2);
    rect(g, cx - half, baseY - H + y, half * 2, 2, fill);
    if (y < 46) {
      // jagged snow edge
      const snowHalf = half - (y > 30 ? ((y * 7) % 11) : 0);
      rect(g, cx - snowHalf, baseY - H + y, snowHalf * 2, 2, snow);
    }
  }
}

function drawPines(g: G, rng: RNG, height: number, fill: number, roof: number): void {
  for (let i = 0; i < 12; i++) {
    const cx = 20 + i * 62 + rng.between(-10, 10);
    const h = rng.between(40, 70);
    pixelTriangle(g, cx, height - h, h - 6, 0.38, i % 2 ? fill : roof);
    rect(g, cx - 2, height - 8, 4, 8, 0x3a2414);
  }
}

/** Vermilion torii gate. */
function drawTorii(g: G, cx: number, baseY: number): void {
  const red = 0xd9312b;
  rect(g, cx - 36, baseY - 80, 7, 80, red);
  rect(g, cx + 29, baseY - 80, 7, 80, red);
  rect(g, cx - 48, baseY - 90, 96, 8, red);
  rect(g, cx - 52, baseY - 94, 104, 4, 0x1b1b1b);
  rect(g, cx - 40, baseY - 70, 80, 5, red);
}

/** Pressurised habitat domes. */
function drawDomes(g: G, cx: number, baseY: number): void {
  for (const [dx, r] of [
    [0, 28],
    [56, 18],
    [-48, 16],
  ] as const) {
    pixelCircle(g, cx + dx, baseY, r, 0xd6e4f0);
    pixelCircle(g, cx + dx, baseY, r - 3, 0x9fb7cc);
    rect(g, cx + dx - r, baseY - 1, r * 2, 2, 0x6b7f93);
  }
  rect(g, cx - 32, baseY - 6, 64, 4, 0x6b7f93);
}

function drawRover(g: G, cx: number, baseY: number): void {
  rect(g, cx - 18, baseY - 18, 36, 10, 0xe5e7eb);
  rect(g, cx - 10, baseY - 26, 14, 8, 0xc9ccd6);
  rect(g, cx + 6, baseY - 34, 2, 16, 0xc9ccd6);
  rect(g, cx + 2, baseY - 38, 10, 4, 0xf7931a);
  for (const wx of [-14, 0, 14]) pixelCircle(g, cx + wx, baseY - 5, 5, 0x3a3a3a);
}

/** Purple and teal nebula clouds with a few bright stars. */
function drawNebula(g: G, rng: RNG, height: number): void {
  const colors = [0x7c3aed, 0x2dd4bf, 0xdb2777];
  for (let i = 0; i < 9; i++) {
    const cx = rng.between(40, TILE_WIDTH - 40);
    const cy = rng.between(30, height - 30);
    const c = colors[i % colors.length];
    for (let k = 0; k < 3; k++) {
      g.fillStyle(c, 0.18);
      g.fillCircle(cx + k * 8, cy - k * 4, 30 - k * 6);
    }
  }
  for (let i = 0; i < 20; i++) rect(g, rng.between(0, TILE_WIDTH - 2), rng.between(0, height - 2), 2, 2, 0xffffff);
}

function drawAsteroids(g: G, rng: RNG, height: number): void {
  for (let i = 0; i < 10; i++) {
    const r = rng.between(6, 16);
    const cx = rng.between(r, TILE_WIDTH - r);
    const cy = rng.between(height * 0.3, height - r);
    pixelCircle(g, cx, cy, r, 0x5b4a7a);
    pixelCircle(g, cx - 2, cy - 2, r - 3, 0x7a6a9a);
    pixelCircle(g, cx + r / 3, cy, 2, 0x4a3a66);
  }
}

/** Ring-shaped space station. */
function drawStation(g: G, cx: number, baseY: number): void {
  const cy = baseY - 70;
  for (let a = 0; a < 360; a += 6) {
    const rad = (a * Math.PI) / 180;
    rect(g, cx + Math.cos(rad) * 46, cy + Math.sin(rad) * 18, 3, 3, 0xc7d2fe);
  }
  rect(g, cx - 6, cy - 30, 12, 60, 0xa5b4fc);
  rect(g, cx - 30, cy - 4, 60, 8, 0xa5b4fc);
  for (const dx of [-42, 34]) rect(g, cx + dx, cy - 10, 8, 20, 0x38bdf8); // solar panels
}

function buildGround(scene: Phaser.Scene, key: string, p: ZonePalette, rng: RNG): void {
  const g = scene.add.graphics();
  if (p.scenery === "bay") {
    const W = 96;
    rect(g, 0, 0, W, GROUND_HEIGHT, p.groundAsphalt);
    rect(g, 0, 0, W, 6, p.groundSidewalk);
    for (let i = 0; i < 14; i++) {
      rect(g, rng.between(0, W - 10), rng.between(10, GROUND_HEIGHT - 4), rng.between(6, 14), 1, p.groundDash);
    }
    rect(g, 0, 6, W, 2, p.groundCurb);
    g.generateTexture(key, W, GROUND_HEIGHT);
  } else if (p.scenery === "moon" || p.scenery === "mars" || p.scenery === "galaxy") {
    const W = 128;
    rect(g, 0, 0, W, GROUND_HEIGHT, p.groundAsphalt);
    rect(g, 0, 0, W, 8, p.groundSidewalk);
    rect(g, 0, 8, W, 2, p.groundCurb);
    for (const [cx, cy, r] of [
      [24, 30, 9],
      [78, 40, 7],
      [110, 22, 5],
    ] as const) {
      pixelCircle(g, cx, cy, r, p.groundCurb);
      pixelCircle(g, cx + 1, cy + 1, r - 2, p.groundAsphalt);
    }
    for (let i = 0; i < 30; i++) {
      rect(g, rng.between(0, W - 2), rng.between(12, GROUND_HEIGHT - 3), 2, 2, p.groundSidewalk);
    }
    g.generateTexture(key, W, GROUND_HEIGHT);
  } else {
    const W = 64;
    rect(g, 0, 0, W, GROUND_HEIGHT, p.groundAsphalt); // asphalt
    rect(g, 0, 0, W, 8, p.groundSidewalk); // sidewalk
    for (let i = 0; i < W; i += 16) rect(g, i, 0, 1, 8, p.groundCurb); // paving joints
    rect(g, 0, 8, W, 2, p.groundCurb); // curb
    rect(g, 0, 10, W, 2, 0x000000); // curb shadow
    rect(g, 8, 32, 32, 4, p.groundDash); // lane dash
    for (let i = 0; i < 18; i++) {
      rect(g, rng.between(0, W - 2), rng.between(14, GROUND_HEIGHT - 3), 2, 2, p.groundCurb);
    }
    g.generateTexture(key, W, GROUND_HEIGHT);
  }
  g.destroy();
}

// ---- pickups, items and cosmetics -------------------------------------------

export const PICKUP_TEX = {
  coin: "pk-coin",
  magnet: "pk-magnet",
  shield: "pk-shield",
  rocket: "pk-rocket",
  slow: "pk-slow",
  double: "pk-double",
  mini: "pk-mini",
  laser: "pk-laser",
  feather: "pk-feather",
  coinRain: "pk-coin-rain",
  heavy: "pk-heavy",
  smoke: "pk-smoke",
  smokeCloud: "fx-smoke",
  flame: "fx-flame",
  shieldRing: "fx-shield-ring",
  sparkle: "fx-sparkle",
  petal: "fx-petal",
  miniCoin: "fx-minicoin",
  sunglasses: "acc-sunglasses",
  beanie: "acc-beanie",
  tie: "acc-tie",
  crown: "acc-crown",
  helmet: "acc-helmet",
} as const;

/** Coins, item icons, effect particles and accessories. Call once at boot. */
export function buildPickupTextures(scene: Phaser.Scene): void {
  let g = scene.add.graphics();
  // bitty coin 14x14: a gold coin with bitty's face (not the ₿ sign; points aren't bitcoin).
  // Mirrors the BittyCoin icon in src/components/ui/BittyCoin.tsx.
  pixelCircle(g, 7, 7, 6, 0xb8860b);
  pixelCircle(g, 7, 7, 5, 0xffd54a);
  pixelCircle(g, 7, 7, 4, 0xf7931a);
  rect(g, 3, 5, 3, 1, 0x1b2a4a);
  rect(g, 8, 5, 3, 1, 0x1b2a4a);
  rect(g, 4, 6, 2, 2, 0xffffff);
  rect(g, 8, 6, 2, 2, 0xffffff);
  rect(g, 5, 7, 1, 1, 0x1b2a4a);
  rect(g, 9, 7, 1, 1, 0x1b2a4a);
  rect(g, 6, 9, 2, 1, 0xe8503f);
  g.generateTexture(PICKUP_TEX.coin, 14, 14);
  g.destroy();

  const itemBase = () => {
    g = scene.add.graphics();
    pixelCircle(g, 11, 11, 11, 0xffffff);
    pixelCircle(g, 11, 11, 9, 0x1b2a4a);
  };
  // magnet: red horseshoe
  itemBase();
  rect(g, 5, 5, 4, 10, 0xe8503f);
  rect(g, 13, 5, 4, 10, 0xe8503f);
  rect(g, 5, 13, 12, 4, 0xe8503f);
  rect(g, 5, 5, 4, 3, 0xf1f5f9);
  rect(g, 13, 5, 4, 3, 0xf1f5f9);
  g.generateTexture(PICKUP_TEX.magnet, 22, 22);
  g.destroy();
  // shield: blue shield with H
  itemBase();
  pixelTriangle(g, 11, 16, 1, 0, 0x60a5fa);
  rect(g, 5, 5, 12, 8, 0x60a5fa);
  for (let i = 0; i < 5; i++) rect(g, 5 + i, 13 + i, 12 - 2 * i, 1, 0x60a5fa);
  rect(g, 8, 7, 2, 6, 0x1b2a4a);
  rect(g, 12, 7, 2, 6, 0x1b2a4a);
  rect(g, 10, 9, 2, 2, 0x1b2a4a);
  g.generateTexture(PICKUP_TEX.shield, 22, 22);
  g.destroy();
  // rocket: white body, red tip, flame
  itemBase();
  rect(g, 8, 7, 6, 9, 0xf8fafc);
  pixelTriangle(g, 11, 3, 4, 0.75, 0xe8503f);
  rect(g, 6, 13, 2, 3, 0xe8503f);
  rect(g, 14, 13, 2, 3, 0xe8503f);
  rect(g, 9, 16, 4, 2, 0xffb347);
  rect(g, 10, 18, 2, 2, 0xffd54a);
  g.generateTexture(PICKUP_TEX.rocket, 22, 22);
  g.destroy();
  // slow: hourglass
  itemBase();
  rect(g, 6, 4, 10, 2, 0xffd54a);
  rect(g, 6, 16, 10, 2, 0xffd54a);
  for (let i = 0; i < 5; i++) {
    rect(g, 7 + i, 6 + i, 8 - 2 * i, 1, 0xfff1a8);
    rect(g, 7 + i, 15 - i, 8 - 2 * i, 1, 0xfff1a8);
  }
  g.generateTexture(PICKUP_TEX.slow, 22, 22);
  g.destroy();
  // double: gold "x2"
  itemBase();
  pixelLine(g, 4, 7, 9, 12, 0xffd54a, 2);
  pixelLine(g, 9, 7, 4, 12, 0xffd54a, 2);
  rect(g, 12, 6, 5, 2, 0xffd54a);
  rect(g, 15, 8, 2, 2, 0xffd54a);
  rect(g, 12, 10, 5, 2, 0xffd54a);
  rect(g, 12, 12, 2, 2, 0xffd54a);
  rect(g, 12, 14, 5, 2, 0xffd54a);
  g.generateTexture(PICKUP_TEX.double, 22, 22);
  g.destroy();
  // mini: a small bitty-orange circle inside arrows pointing inwards
  itemBase();
  pixelCircle(g, 11, 11, 3, 0xff8c1a);
  for (const [x, y, dx, dy] of [
    [3, 3, 1, 1],
    [18, 3, -1, 1],
    [3, 18, 1, -1],
    [18, 18, -1, -1],
  ] as const) {
    rect(g, x, y, 2, 2, 0xffffff);
    rect(g, x + dx * 2, y + dy * 2, 2, 2, 0xffffff);
  }
  g.generateTexture(PICKUP_TEX.mini, 22, 22);
  g.destroy();
  // laser eyes: two red eyes with beams
  itemBase();
  rect(g, 5, 9, 4, 4, 0xffffff);
  rect(g, 11, 9, 4, 4, 0xffffff);
  rect(g, 6, 10, 2, 2, 0xff2d2d);
  rect(g, 12, 10, 2, 2, 0xff2d2d);
  rect(g, 15, 10, 4, 1, 0xff2d2d);
  rect(g, 15, 12, 4, 1, 0xff6b6b);
  g.generateTexture(PICKUP_TEX.laser, 22, 22);
  g.destroy();
  // feather
  itemBase();
  pixelLine(g, 6, 16, 15, 5, 0xe0f2fe, 2);
  for (let i = 0; i < 5; i++) {
    rect(g, 8 + i * 2, 12 - i * 2, 4, 2, 0xbae6fd);
    rect(g, 6 + i * 2, 10 - i * 2, 3, 2, 0xffffff);
  }
  g.generateTexture(PICKUP_TEX.feather, 22, 22);
  g.destroy();
  // coin rain: three small coins falling
  itemBase();
  for (const [x, y] of [
    [7, 6],
    [14, 9],
    [9, 14],
  ] as const) {
    pixelCircle(g, x, y, 3, 0xffd54a);
    rect(g, x - 1, y - 1, 1, 1, 0xfff1a8);
  }
  g.generateTexture(PICKUP_TEX.coinRain, 22, 22);
  g.destroy();

  // Bad items: red rim, so players learn to dodge them.
  const badBase = () => {
    g = scene.add.graphics();
    pixelCircle(g, 11, 11, 11, 0xff3b3b);
    pixelCircle(g, 11, 11, 9, 0x2a0f12);
  };
  // heavy: iron weight "kg"
  badBase();
  rect(g, 6, 9, 10, 8, 0x9ca3af);
  rect(g, 8, 6, 6, 3, 0x9ca3af);
  rect(g, 9, 7, 4, 1, 0x2a0f12);
  rect(g, 8, 11, 2, 4, 0x2a0f12);
  rect(g, 11, 11, 3, 4, 0x2a0f12);
  g.generateTexture(PICKUP_TEX.heavy, 22, 22);
  g.destroy();
  // smoke: grey puffs
  badBase();
  pixelCircle(g, 8, 12, 4, 0x6b7280);
  pixelCircle(g, 13, 10, 4, 0x9ca3af);
  pixelCircle(g, 14, 14, 3, 0x6b7280);
  g.generateTexture(PICKUP_TEX.smoke, 22, 22);
  g.destroy();
  // smoke screen: dark soft blobs on a 128 tile
  g = scene.add.graphics();
  for (let i = 0; i < 10; i++) {
    g.fillStyle(0x1f2430, 0.35);
    g.fillCircle(12 + ((i * 37) % 104), 12 + ((i * 53) % 104), 26);
  }
  g.fillStyle(0x1f2430, 0.45);
  g.fillRect(0, 0, 128, 128);
  g.generateTexture(PICKUP_TEX.smokeCloud, 128, 128);
  g.destroy();

  // rocket flame 16x12 (points left, sits behind the bird)
  g = scene.add.graphics();
  for (let x = 0; x < 16; x++) {
    const h = Math.max(1, Math.round(12 * (x / 16)));
    rect(g, x, 6 - h / 2, 1, h, x < 6 ? 0xffd54a : 0xff8c1a);
  }
  g.generateTexture(PICKUP_TEX.flame, 16, 12);
  g.destroy();

  // shield ring 60x60
  g = scene.add.graphics();
  pixelCircle(g, 30, 30, 29, 0x7dd3fc);
  pixelCircle(g, 30, 30, 26, 0x000000);
  g.generateTexture(PICKUP_TEX.shieldRing, 60, 60);
  g.destroy();

  // particles 6x6
  g = scene.add.graphics();
  pixelTriangle(g, 3, 0, 3, 1, 0xfff1a8);
  rect(g, 0, 3, 7, 1, 0xfff1a8);
  for (let i = 0; i < 3; i++) rect(g, 1 + i, 4 + i, 5 - 2 * i, 1, 0xfff1a8);
  g.generateTexture(PICKUP_TEX.sparkle, 7, 7);
  g.destroy();
  g = scene.add.graphics();
  pixelCircle(g, 3, 3, 3, 0xffb7c5);
  rect(g, 3, 3, 1, 1, 0xff7aa2);
  g.generateTexture(PICKUP_TEX.petal, 7, 7);
  g.destroy();
  g = scene.add.graphics();
  pixelCircle(g, 3, 3, 3, 0xffd54a);
  rect(g, 3, 1, 1, 5, 0x8a5a00);
  g.generateTexture(PICKUP_TEX.miniCoin, 7, 7);
  g.destroy();

  // accessories
  g = scene.add.graphics();
  rect(g, 0, 2, 13, 8, 0x111827);
  rect(g, 17, 2, 13, 8, 0x111827);
  rect(g, 13, 4, 4, 2, 0x111827);
  rect(g, 2, 3, 3, 2, 0x64748b);
  rect(g, 19, 3, 3, 2, 0x64748b);
  g.generateTexture(PICKUP_TEX.sunglasses, 30, 10);
  g.destroy();
  g = scene.add.graphics();
  for (let i = 0; i < 10; i++) rect(g, 15 - i * 1.5, 4 + i, 2 + i * 3, 1, i % 4 < 2 ? 0xf7931a : 0xfff6e5);
  rect(g, 0, 14, 32, 3, 0xfff6e5);
  pixelCircle(g, 16, 3, 3, 0xfff6e5);
  g.generateTexture(PICKUP_TEX.beanie, 32, 18);
  g.destroy();
  g = scene.add.graphics();
  rect(g, 3, 0, 4, 3, 0xb91c1c);
  for (let i = 0; i < 12; i++) rect(g, 4 - Math.min(3, Math.floor(i / 2)), 3 + i, 2 + Math.min(6, i), 1, 0xe8503f);
  rect(g, 4, 15, 2, 3, 0xe8503f);
  g.generateTexture(PICKUP_TEX.tie, 10, 18);
  g.destroy();
  g = scene.add.graphics();
  rect(g, 0, 8, 26, 6, 0xffd54a);
  pixelTriangle(g, 4, 0, 8, 0.6, 0xffd54a);
  pixelTriangle(g, 13, 0, 8, 0.6, 0xffd54a);
  pixelTriangle(g, 22, 0, 8, 0.6, 0xffd54a);
  rect(g, 4, 10, 2, 2, 0xe8503f);
  rect(g, 12, 10, 2, 2, 0x60a5fa);
  rect(g, 20, 10, 2, 2, 0x2ecc71);
  g.generateTexture(PICKUP_TEX.crown, 26, 14);
  g.destroy();
  // space helmet: a see-through glass bowl over bitty's whole head, so the face stays visible
  g = scene.add.graphics();
  pixelCircle(g, 32, 32, 29, 0xbfdbfe, 0.18);
  pixelRing(g, 32, 32, 31, 29, 0xe2e8f0);
  g.fillStyle(0xffffff, 0.9);
  g.fillRect(12, 17, 2, 7);
  g.fillRect(14, 13, 2, 4);
  g.fillRect(16, 11, 4, 2);
  g.fillStyle(0xffffff, 0.6);
  g.fillRect(46, 40, 2, 4);
  g.generateTexture(PICKUP_TEX.helmet, 64, 64);
  g.destroy();
}

/**
 * Gold bitty: recolours the orange fur of the loaded sprite to gold on a
 * canvas, keeping the white belly, wings, eyes and nose as they are.
 */
export function buildGoldBird(scene: Phaser.Scene): void {
  const source = scene.textures.get(TEX.bitty).getSourceImage() as HTMLImageElement | HTMLCanvasElement;
  const canvas = document.createElement("canvas");
  canvas.width = source.width;
  canvas.height = source.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.drawImage(source, 0, 0);
  const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = image.data;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i];
    const g = d[i + 1];
    const b = d[i + 2];
    const orange = r > 120 && r > g && g > b && r - b > 70 && !(r > 200 && g < 120 && b > 100);
    if (!orange) continue;
    const lum = (0.3 * r + 0.59 * g + 0.11 * b) / 255;
    d[i] = Math.min(255, Math.round(150 + 105 * lum));
    d[i + 1] = Math.min(255, Math.round(110 + 110 * lum));
    d[i + 2] = Math.round(20 + 40 * lum);
  }
  ctx.putImageData(image, 0, 0);
  if (scene.textures.exists(TEX.bittyGold)) scene.textures.remove(TEX.bittyGold);
  scene.textures.addCanvas(TEX.bittyGold, canvas);
}

// ---- extra accessories, trail particles and colour skins ---------------------

export const ACC_TEX: Record<string, string> = {
  sunglasses: PICKUP_TEX.sunglasses,
  beanie: PICKUP_TEX.beanie,
  tie: PICKUP_TEX.tie,
  crown: PICKUP_TEX.crown,
  helmet: PICKUP_TEX.helmet,
  cap: "acc-cap",
  straw: "acc-straw",
  party: "acc-party",
  headband: "acc-headband",
  catears: "acc-catears",
  tophat: "acc-tophat",
  glasses: "acc-glasses",
  monocle: "acc-monocle",
  mask: "acc-mask",
  laser: "acc-laser",
  bowtie: "acc-bowtie",
  scarf: "acc-scarf",
  medal: "acc-medal",
  pendant: "acc-pendant",
  beret: "acc-beret",
  bullhorns: "acc-bullhorns",
  bowler: "acc-bowler",
  kasa: "acc-kasa",
  starglasses: "acc-starglasses",
};

export const TRAIL_TEX: Record<string, string> = {
  lightning: PICKUP_TEX.sparkle,
  sakura: PICKUP_TEX.petal,
  coins: PICKUP_TEX.miniCoin,
  stars: PICKUP_TEX.sparkle,
  hearts: "fx-heart",
  bubbles: "fx-bubble",
  fire: "fx-fire",
  snowflakes: "fx-snow",
  neon: "fx-neon",
  comet: PICKUP_TEX.sparkle,
  marsdust: PICKUP_TEX.miniCoin,
};

export function buildExtraCosmeticTextures(scene: Phaser.Scene): void {
  let g = scene.add.graphics();
  // cap: dome + brim to the right
  pixelCircle(g, 13, 13, 12, 0x2563eb);
  rect(g, 0, 13, 30, 4, 0x000000);
  rect(g, 0, 13, 30, 3, 0x1e40af);
  rect(g, 12, 2, 2, 10, 0x60a5fa);
  g.generateTexture(ACC_TEX.cap, 32, 17);
  g.destroy();
  // straw hat
  g = scene.add.graphics();
  pixelCircle(g, 18, 12, 11, 0xf2d675);
  rect(g, 0, 13, 36, 4, 0xe3c35a);
  rect(g, 8, 9, 20, 3, 0xe8503f);
  g.generateTexture(ACC_TEX.straw, 36, 17);
  g.destroy();
  // party hat
  g = scene.add.graphics();
  for (let i = 0; i < 20; i++) rect(g, 9 - i * 0.45, 4 + i, 1 + i * 0.9, 1, Math.floor(i / 4) % 2 === 0 ? 0xff4fa3 : 0x4ff0ff);
  pixelCircle(g, 9, 3, 3, 0xffd23f);
  g.generateTexture(ACC_TEX.party, 20, 24);
  g.destroy();
  // ninja headband
  g = scene.add.graphics();
  rect(g, 4, 2, 30, 6, 0x1e293b);
  rect(g, 13, 1, 10, 8, 0x94a3b8);
  rect(g, 16, 3, 4, 4, 0x1e293b);
  rect(g, 0, 4, 5, 2, 0x1e293b);
  rect(g, 0, 7, 4, 2, 0x1e293b);
  g.generateTexture(ACC_TEX.headband, 34, 10);
  g.destroy();
  // cat ears
  g = scene.add.graphics();
  pixelTriangle(g, 7, 0, 12, 0.6, 0x1b2a4a);
  pixelTriangle(g, 25, 0, 12, 0.6, 0x1b2a4a);
  pixelTriangle(g, 7, 4, 7, 0.45, 0xff8fb1);
  pixelTriangle(g, 25, 4, 7, 0.45, 0xff8fb1);
  g.generateTexture(ACC_TEX.catears, 32, 14);
  g.destroy();
  // top hat
  g = scene.add.graphics();
  rect(g, 6, 0, 16, 16, 0x111827);
  rect(g, 6, 11, 16, 3, 0xe8503f);
  rect(g, 0, 16, 28, 4, 0x111827);
  rect(g, 8, 1, 2, 12, 0x374151);
  g.generateTexture(ACC_TEX.tophat, 28, 20);
  g.destroy();
  // round glasses
  g = scene.add.graphics();
  for (const cx of [7, 23]) {
    pixelCircle(g, cx, 6, 6, 0x1b2a4a);
    pixelCircle(g, cx, 6, 4, 0xbfe6ff);
    rect(g, cx - 2, 3, 2, 2, 0xffffff);
  }
  rect(g, 13, 5, 4, 2, 0x1b2a4a);
  g.generateTexture(ACC_TEX.glasses, 30, 13);
  g.destroy();
  // monocle
  g = scene.add.graphics();
  pixelCircle(g, 7, 7, 6, 0xffd54a);
  pixelCircle(g, 7, 7, 4, 0xbfe6ff);
  rect(g, 4, 4, 2, 2, 0xffffff);
  for (let i = 0; i < 5; i++) rect(g, 10 + i, 12 + i, 1, 1, 0xffd54a);
  g.generateTexture(ACC_TEX.monocle, 16, 18);
  g.destroy();
  // face mask
  g = scene.add.graphics();
  rect(g, 4, 2, 16, 10, 0xf8fafc);
  rect(g, 5, 11, 14, 1, 0xcbd5e1);
  rect(g, 0, 4, 4, 1, 0xcbd5e1);
  rect(g, 20, 4, 4, 1, 0xcbd5e1);
  g.generateTexture(ACC_TEX.mask, 24, 13);
  g.destroy();
  // laser eyes (two beams going right)
  g = scene.add.graphics();
  rect(g, 0, 0, 34, 4, 0xff3b3b);
  rect(g, 0, 1, 34, 2, 0xfff1a8);
  rect(g, 0, 5, 34, 4, 0xff3b3b);
  rect(g, 0, 6, 34, 2, 0xfff1a8);
  g.generateTexture(ACC_TEX.laser, 34, 9);
  g.destroy();
  // bow tie
  g = scene.add.graphics();
  // two wings that widen outward from the knot
  for (let i = 0; i < 7; i++) {
    const h = 4 + i;
    rect(g, 6 - i, 5 - Math.floor(h / 2), 1, h, 0xe8503f);
    rect(g, 11 + i, 5 - Math.floor(h / 2), 1, h, 0xe8503f);
  }
  rect(g, 7, 3, 4, 4, 0xb91c1c);
  g.generateTexture(ACC_TEX.bowtie, 18, 10);
  g.destroy();
  // scarf
  g = scene.add.graphics();
  rect(g, 0, 0, 30, 7, 0xe8503f);
  rect(g, 0, 2, 30, 1, 0xfff6e5);
  rect(g, 20, 6, 7, 10, 0xe8503f);
  rect(g, 20, 13, 7, 2, 0xfff6e5);
  g.generateTexture(ACC_TEX.scarf, 30, 16);
  g.destroy();
  // medal
  g = scene.add.graphics();
  rect(g, 3, 0, 3, 8, 0x2563eb);
  rect(g, 7, 0, 3, 8, 0xe8503f);
  pixelCircle(g, 6, 12, 5, 0xffd54a);
  pixelCircle(g, 6, 12, 3, 0xf59e0b);
  g.generateTexture(ACC_TEX.medal, 13, 18);
  g.destroy();
  // lightning pendant
  g = scene.add.graphics();
  rect(g, 4, 0, 1, 5, 0x475569);
  rect(g, 6, 0, 1, 5, 0x475569);
  rect(g, 5, 5, 2, 3, 0xffd54a);
  rect(g, 3, 8, 5, 2, 0xffd54a);
  rect(g, 5, 10, 2, 2, 0xffd54a);
  rect(g, 2, 12, 5, 2, 0xffd54a);
  rect(g, 3, 14, 2, 2, 0xffd54a);
  g.generateTexture(ACC_TEX.pendant, 11, 17);
  g.destroy();
  // beret: flat disc tilted to the left, with a stalk
  g = scene.add.graphics();
  rect(g, 2, 5, 26, 6, 0x7f1d1d);
  rect(g, 0, 7, 4, 3, 0x7f1d1d);
  rect(g, 6, 3, 18, 3, 0x991b1b);
  rect(g, 14, 0, 2, 3, 0x450a0a);
  rect(g, 4, 10, 22, 2, 0x450a0a);
  g.generateTexture(ACC_TEX.beret, 30, 12);
  g.destroy();
  // bull horns: two curved horns on a band
  g = scene.add.graphics();
  rect(g, 6, 12, 24, 3, 0x7c2d12);
  for (let i = 0; i < 7; i++) {
    rect(g, 4 - Math.min(i, 3), 11 - i, 4, 2, 0xf5e6c8);
    rect(g, 28 + Math.min(i, 3), 11 - i, 4, 2, 0xf5e6c8);
  }
  rect(g, 1, 3, 3, 2, 0xd6c4a1);
  rect(g, 32, 3, 3, 2, 0xd6c4a1);
  g.generateTexture(ACC_TEX.bullhorns, 36, 16);
  g.destroy();
  // bowler hat
  g = scene.add.graphics();
  pixelCircle(g, 14, 10, 9, 0x1f2937);
  rect(g, 0, 12, 28, 4, 0x111827);
  rect(g, 5, 10, 18, 2, 0x78350f);
  rect(g, 9, 3, 2, 5, 0x374151);
  g.generateTexture(ACC_TEX.bowler, 28, 16);
  g.destroy();
  // sedge hat (kasa): wide flat cone
  g = scene.add.graphics();
  for (let i = 0; i < 10; i++) rect(g, 18 - i * 1.8, i, 1 + i * 3.6, 1, i % 3 === 0 ? 0xb08d57 : 0xd9b779);
  rect(g, 0, 10, 38, 2, 0x8a6a3a);
  g.generateTexture(ACC_TEX.kasa, 38, 12);
  g.destroy();
  // star glasses
  g = scene.add.graphics();
  for (const cx of [7, 23]) {
    // a star: one triangle pointing up, one pointing down, and the wide middle band
    pixelTriangle(g, cx, 0, 7, 0.75, 0xff4fa3);
    for (let i = 0; i < 7; i++) {
      const half = Math.floor((6 - i) * 0.75);
      rect(g, cx - half, 4 + i, half * 2 + 1, 1, 0xff4fa3);
    }
    rect(g, cx - 6, 4, 13, 3, 0xff4fa3);
    rect(g, cx - 2, 4, 4, 3, 0xffe08a);
  }
  rect(g, 13, 5, 4, 2, 0x1b2a4a);
  g.generateTexture(ACC_TEX.starglasses, 30, 11);
  g.destroy();

  // trail particles
  g = scene.add.graphics();
  pixelCircle(g, 2, 2, 2, 0xff7aa2);
  pixelCircle(g, 5, 2, 2, 0xff7aa2);
  pixelTriangle(g, 3, 7, 1, 0, 0xff7aa2);
  for (let i = 0; i < 4; i++) rect(g, i, 3 + i, 8 - 2 * i, 1, 0xff7aa2);
  g.generateTexture(TRAIL_TEX.hearts, 8, 8);
  g.destroy();
  g = scene.add.graphics();
  // a hollow bubble: light rim, faint see-through inside
  pixelRing(g, 4, 4, 4, 2, 0x7dd3fc);
  pixelCircle(g, 4, 4, 2, 0xe0f2fe, 0.3);
  rect(g, 2, 2, 1, 1, 0xffffff);
  g.generateTexture(TRAIL_TEX.bubbles, 9, 9);
  g.destroy();
  g = scene.add.graphics();
  pixelCircle(g, 4, 5, 4, 0xff8c1a);
  pixelCircle(g, 4, 6, 2, 0xffd54a);
  rect(g, 4, 0, 1, 2, 0xff8c1a);
  g.generateTexture(TRAIL_TEX.fire, 9, 10);
  g.destroy();
  g = scene.add.graphics();
  rect(g, 3, 0, 1, 7, 0xffffff);
  rect(g, 0, 3, 7, 1, 0xffffff);
  for (let i = 0; i < 7; i++) {
    rect(g, i, i, 1, 1, 0xdbeafe);
    rect(g, 6 - i, i, 1, 1, 0xdbeafe);
  }
  g.generateTexture(TRAIL_TEX.snowflakes, 7, 7);
  g.destroy();
  g = scene.add.graphics();
  rect(g, 0, 1, 12, 2, 0x4ff0ff);
  rect(g, 0, 0, 12, 4, 0x4ff0ff);
  rect(g, 0, 1, 12, 2, 0xffffff);
  g.generateTexture(TRAIL_TEX.neon, 12, 4);
  g.destroy();
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const [r, g, b] =
    h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
}

export function skinTextureKey(id: string): string {
  return id === "default" ? TEX.bitty : id === "gold" ? TEX.bittyGold : `bitty-skin-${id}`;
}

/**
 * Colour skins: recolours the orange fur to another hue (keeping shading),
 * leaving the belly, wings, eyes and nose alone. Built lazily, once per skin.
 */
export function ensureSkinTexture(scene: Phaser.Scene, id: string, hue: number, lightness = 1): string {
  const key = skinTextureKey(id);
  if (scene.textures.exists(key)) return key;
  const source = scene.textures.get(TEX.bitty).getSourceImage() as HTMLImageElement | HTMLCanvasElement;
  const canvas = document.createElement("canvas");
  canvas.width = source.width;
  canvas.height = source.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return TEX.bitty;
  ctx.drawImage(source, 0, 0);
  const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = image.data;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i];
    const g = d[i + 1];
    const b = d[i + 2];
    const orange = r > 120 && r > g && g > b && r - b > 70 && !(r > 200 && g < 120 && b > 100);
    if (!orange) continue;
    const lum = (0.3 * r + 0.59 * g + 0.11 * b) / 255; // 0.35..0.75 across the fur shading
    const l = Math.min(0.95, Math.max(0.08, (0.2 + lum * 0.55) * lightness));
    const sat = lightness > 1.4 ? 0.25 : lightness < 0.5 ? 0.45 : 0.85;
    const [nr, ng, nb] = hslToRgb(hue, sat, l);
    d[i] = nr;
    d[i + 1] = ng;
    d[i + 2] = nb;
  }
  ctx.putImageData(image, 0, 0);
  scene.textures.addCanvas(key, canvas);
  return key;
}

/** Hue sequence used by the rainbow skin. */
export const RAINBOW_HUES = [0, 45, 90, 150, 210, 270, 320];
