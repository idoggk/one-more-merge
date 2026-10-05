// Normalise ChatGPT art into src/assets/art/<key>.png
// Usage: node tools/import-art.mjs <folder-with-pngs>
// Trims transparent padding so every sprite fills its box the same way, then resizes.
import sharp from 'sharp';
import { readdirSync, mkdirSync, statSync } from 'node:fs';
import { join, basename, extname } from 'node:path';

const src = process.argv[2];
const out = 'src/assets/art';
mkdirSync(out, { recursive: true });

const walk = (d) => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]));
const files = walk(src).filter((f) => extname(f).toLowerCase() === '.png');

/** Map a source filename to a game key. */
function keyFor(file) {
  const n = basename(file, '.png').toLowerCase();
  const fam = ['cannon', 'coil', 'bell'].find((f) => n.includes(f));
  const rank = n.match(/(?:rank|r)[_-]?0?([1-6])/)?.[1] ?? n.match(/_0?([1-6])(?:_|$)/)?.[1];
  if (fam && rank) return `${fam}_${rank}`;
  const tgt = n.includes('tin') && !n.includes('practice') ? 0 : n.includes('fridge') ? 1 : n.includes('zilla') ? 2 : -1;
  if (tgt >= 0) return `target_${tgt}${/damag|broken|dmg/.test(n) ? '_dmg' : ''}`;
  if (n.includes('practice') || n.includes('demo')) return 'demo_can';
  if (n.includes('workbench') || n.includes('background') || n === 'bg') return 'bg';
  if (n.includes('slot')) return 'slot';
  if (n.includes('scrap')) return 'icon_scrap';
  if (n.includes('timer') || n.includes('clock')) return 'icon_timer';
  if (n.includes('overdrive') || n.includes('bolt')) return 'icon_bolt';
  if (n.includes('card') || n.includes('frame')) return 'card';
  return null;
}

const SIZE = (key) =>
  key === 'bg' ? null : key.startsWith('target') || key === 'demo_can' ? 512 : key === 'card' ? 512 : 256;

for (const f of files) {
  const key = keyFor(f);
  if (!key) {
    console.log('skip (unmapped):', f);
    continue;
  }
  const dest = join(out, `${key}.png`);
  if (key === 'bg') {
    const buf = await sharp(f).trim({ threshold: 10 }).png().toBuffer();
    await sharp(buf).resize({ width: 720 }).png({ compressionLevel: 9 }).toFile(dest);
  } else {
    const s = SIZE(key);
    const trimmed = key === 'slot' || key === 'card' ? sharp(f) : sharp(f).trim({ threshold: 10 });
    const buf = await trimmed.png().toBuffer();
    await sharp(buf)
      .resize(s - 8, s - 8, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .extend({ top: 4, bottom: 4, left: 4, right: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png({ compressionLevel: 9, palette: false })
      .toFile(dest);
  }
  console.log(`${basename(f)} -> ${key}`);
}
