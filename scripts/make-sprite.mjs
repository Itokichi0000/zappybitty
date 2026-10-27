/**
 * Regenerates the in-game sprites from art/bitty.png.
 *
 *   npm run assets:sprite
 *
 * The source illustration is large (1368x1150). The game runs in a 360px-wide
 * logical world with nearest-neighbour upscaling, so the sprite is pre-shrunk
 * to exactly the size it is drawn at (56px wide) plus 2x / 4x copies for the
 * DOM UI.
 */
import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = join(root, "art/bitty.png");
const outDir = join(root, "public/assets");

const variants = [
  { width: 56, file: "bitty-sprite.png" },
  { width: 112, file: "bitty-sprite@2x.png" },
  { width: 224, file: "bitty-sprite@4x.png" },
];

await mkdir(outDir, { recursive: true });

// Trim fully transparent margins first so the sprite is tightly framed.
const trimmed = await sharp(source).trim({ threshold: 24 }).toBuffer();

for (const { width, file } of variants) {
  const out = join(outDir, file);
  const info = await sharp(trimmed)
    .resize({ width, kernel: sharp.kernel.lanczos3 })
    .png({ compressionLevel: 9, palette: false })
    .toFile(out);
  console.log(`${file}: ${info.width}x${info.height} (${info.size} bytes)`);
}
