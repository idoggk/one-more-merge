// Builds the style/format anchor sheets you attach to a ChatGPT image chat: rank 1-8 of an existing painted unit, 4x2 grid,
// pure white background, equal cells, no text. Source art = the game's own pictures (src/assets/art/<family>_<rank>.webp).
// Usage: node art-candidates/asset-program/tools/make-anchors.mjs
import sharp from 'sharp';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ART = join(HERE, '../../../src/assets/art');
const OUT = join(HERE, '../anchors');
const CELL = 384, COLS = 4, ROWS = 2, FIT = 330;

for (const family of ['cannon', 'coil', 'bell']) {
  const tiles = [];
  for (let r = 1; r <= 8; r++) {
    const trimmed = await sharp(join(ART, `${family}_${r}.webp`)).trim({ threshold: 5 }).toBuffer();
    const fitted = await sharp(trimmed).resize(FIT, FIT, { fit: 'inside' }).toBuffer();
    const m = await sharp(fitted).metadata();
    tiles.push({ input: fitted, left: ((r - 1) % COLS) * CELL + Math.round((CELL - m.width) / 2), top: Math.floor((r - 1) / COLS) * CELL + Math.round((CELL - m.height) / 2) });
  }
  await sharp({ create: { width: CELL * COLS, height: CELL * ROWS, channels: 3, background: '#ffffff' } }).composite(tiles).png({ compressionLevel: 9 }).toFile(join(OUT, `anchor_${family}_ranks1-8.png`));
  console.log('anchor', family);
}
