/**
 * App icons and splash screens from art/bitty.png.
 *
 *   npm run assets:icons
 *
 * Icons show bitty on the game's night-sky navy. Android's adaptive icon keeps bitty inside
 * the central safe zone of its foreground layer, so circle / squircle masks never cut it off.
 */
import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = join(root, "art/bitty.png");
const res = join(root, "android/app/src/main/res");
const NAVY = { r: 0x0e, g: 0x1a, b: 0x33, alpha: 1 };
const CLEAR = { r: 0, g: 0, b: 0, alpha: 0 };

const trimmed = await sharp(source).trim({ threshold: 24 }).toBuffer();

/** bitty scaled to `fill` of a `width` x `height` canvas, centred on `background`. */
async function render(file, width, height, fill, background) {
  const inner = Math.round(Math.min(width, height) * fill);
  const art = await sharp(trimmed).resize({ width: inner, height: inner, fit: "contain", background: CLEAR }).toBuffer();
  await mkdir(dirname(file), { recursive: true });
  let image = sharp({ create: { width, height, channels: 4, background } }).composite([{ input: art, gravity: "centre" }]);
  if (background.alpha === 1) image = image.flatten({ background });
  await image.png({ compressionLevel: 9 }).toFile(file);
}

/** A navy disc with bitty on it, for launchers that use round icons. */
async function renderRound(file, size) {
  await render(file, size, size, 0.62, NAVY);
  const mask = Buffer.from(`<svg width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}"/></svg>`);
  const round = await sharp(file).composite([{ input: mask, blend: "dest-in" }]).png({ compressionLevel: 9 }).toBuffer();
  await sharp(round).toFile(file);
}

// Web build and the Zapstore listing.
await render(join(root, "public/icons/icon-192.png"), 192, 192, 0.74, NAVY);
await render(join(root, "public/icons/icon-512.png"), 512, 512, 0.74, NAVY);

// Android launcher icons: legacy square + round, and the adaptive icon's foreground layer.
const densities = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
for (const [name, scale] of Object.entries(densities)) {
  const dir = join(res, `mipmap-${name}`);
  await render(join(dir, "ic_launcher.png"), 48 * scale, 48 * scale, 0.74, NAVY);
  await renderRound(join(dir, "ic_launcher_round.png"), 48 * scale);
  // 108dp layer; the safe zone is the central 66dp circle.
  await render(join(dir, "ic_launcher_foreground.png"), 108 * scale, 108 * scale, 0.5, CLEAR);
}

// Splash screens (Android 11 and older; newer versions show the launcher icon).
const splashes = {
  drawable: [480, 320],
  "drawable-port-mdpi": [320, 480],
  "drawable-port-hdpi": [480, 800],
  "drawable-port-xhdpi": [720, 1280],
  "drawable-port-xxhdpi": [960, 1600],
  "drawable-port-xxxhdpi": [1280, 1920],
  "drawable-land-mdpi": [480, 320],
  "drawable-land-hdpi": [800, 480],
  "drawable-land-xhdpi": [1280, 720],
  "drawable-land-xxhdpi": [1600, 960],
  "drawable-land-xxxhdpi": [1920, 1280],
};
for (const [dir, [width, height]] of Object.entries(splashes)) {
  await render(join(res, dir, "splash.png"), width, height, 0.4, NAVY);
}

console.log("Icons and splash screens written.");
