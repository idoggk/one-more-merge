// Builds art-candidates/rank-looks/index.html: one offline file (images, font and code inline, no network).
// Usage: node art-candidates/rank-looks/build.mjs
// Reads the real unit pictures from src/assets/art (webp), crops them to their visible pixels the way
// GameScene.fitSprite does, shrinks them, and injects them into template.html. Touches nothing in src/.
import sharp from 'sharp';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ART = join(HERE, '../../src/assets/art');
const CELL = 124; // sceneKit.ts CELL (design px)

// Family colours: FAMILY_INFO.color (docs/art/ART_BIBLE.md 2.5). cap: highest rank in play (capOf: helpers 6, Saga L21+ core 8).
// pics: 'ranked' = <id>_1..N exist; 'single' = one unit_<id> picture for every rank (the 22 roster-B units).
const UNITS = [
  { id: 'cannon', name: 'Cannon', group: 'base', color: '#e8452c', cap: 8, pics: 'ranked', n: 8, role: 'Shooter' },
  { id: 'coil', name: 'Coil', group: 'base', color: '#27c4e0', cap: 8, pics: 'ranked', n: 8, role: 'Relay' },
  { id: 'bell', name: 'Bell', group: 'base', color: '#f2b521', cap: 8, pics: 'ranked', n: 8, role: 'Relay' },
  { id: 'rocket', name: 'Rocket', group: 'base', color: '#ff8a3c', cap: 8, pics: 'ranked', n: 8, role: 'Shooter' },
  { id: 'magnet', name: 'Magnet', group: 'base', color: '#c23fd1', cap: 6, pics: 'ranked', n: 6, role: 'Helper' },
  { id: 'nail_gun', name: 'Nail Gun', group: 'new', color: '#8a96a8', cap: 8, pics: 'ranked', n: 8, role: 'Shooter' },
  { id: 'jackhammer', name: 'Jackhammer', group: 'new', color: '#d8a020', cap: 8, pics: 'ranked', n: 8, role: 'Shooter' },
  { id: 'gear', name: 'Gear', group: 'new', color: '#9a7a5a', cap: 8, pics: 'ranked', n: 8, role: 'Relay' },
  { id: 'saw_blade', name: 'Saw Blade', group: 'new', color: '#c8d0d8', cap: 8, pics: 'ranked', n: 8, role: 'Shooter' },
  { id: 'piston', name: 'Piston', group: 'new', color: '#d05a3a', cap: 8, pics: 'single', n: 8, role: 'Shooter' },
  { id: 'tesla_tower', name: 'Tesla Tower', group: 'new', color: '#6ad0ff', cap: 8, pics: 'single', n: 8, role: 'Shooter' },
];

/** Crop to pixels with alpha > 24 (same threshold as GameScene.visBounds), shrink, encode webp. */
async function prep(file, maxPx = 240) {
  const src = sharp(file).ensureAlpha();
  const { data, info } = await src.raw().toBuffer({ resolveWithObject: true });
  let x0 = info.width, y0 = info.height, x1 = -1, y1 = -1;
  for (let y = 0; y < info.height; y++)
    for (let x = 0; x < info.width; x++)
      if (data[(y * info.width + x) * 4 + 3] > 24) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
  const w0 = x1 - x0 + 1, h0 = y1 - y0 + 1;
  const k = Math.min(1, maxPx / Math.max(w0, h0));
  const buf = await sharp(file).extract({ left: x0, top: y0, width: w0, height: h0 }).resize(Math.round(w0 * k), Math.round(h0 * k)).webp({ quality: 84, alphaQuality: 90 }).toBuffer();
  // fitSprite: scale = min(CELL*0.76 / h, CELL*0.84 / w) on the visible pixels, origin bottom-centre
  const s = Math.min((CELL * 0.76) / h0, (CELL * 0.84) / w0);
  return { src: 'data:image/webp;base64,' + buf.toString('base64'), w: +(w0 * s).toFixed(2), h: +(h0 * s).toFixed(2), bytes: buf.length };
}

const out = { units: {}, order: UNITS.map((u) => u.id) };
let bytes = 0;
for (const u of UNITS) {
  const ranks = [];
  if (u.pics === 'single') {
    const p = await prep(join(ART, `unit_${u.id}.webp`));
    bytes += p.bytes;
    for (let r = 1; r <= 8; r++) ranks.push({ ...p, same: true }); // one picture, shared by all ranks (src repeated in the page via an index)
  } else {
    for (let r = 1; r <= 8; r++) {
      const real = Math.min(r, u.n);
      const p = await prep(join(ART, `${u.id}_${real}.webp`));
      bytes += p.bytes;
      ranks.push({ ...p, ghost: r > u.n }); // ghost: no picture for this rank (helper cap 6), the rank-6 picture is reused only to show the overlay
    }
  }
  out.units[u.id] = { id: u.id, name: u.name, group: u.group, color: u.color, cap: u.cap, role: u.role, single: u.pics === 'single', ranks };
}

const slot = await sharp(join(ART, 'slot.webp')).resize(236, 236).webp({ quality: 85 }).toBuffer();
const crown = await sharp(join(ART, 'crown.webp')).resize(120, 120).webp({ quality: 88 }).toBuffer();
const font = readFileSync(join(HERE, '../../node_modules/@fontsource/lilita-one/files/lilita-one-latin-400-normal.woff2'));
out.slot = 'data:image/webp;base64,' + slot.toString('base64');
out.crown = 'data:image/webp;base64,' + crown.toString('base64');

let html = readFileSync(join(HERE, 'template.html'), 'utf8');
html = html.replace('%%FONT%%', 'data:font/woff2;base64,' + font.toString('base64')).replace('%%DATA%%', JSON.stringify(out));
writeFileSync(join(HERE, 'index.html'), html);
console.log(`index.html ${(html.length / 1024).toFixed(0)} KB, pictures ${(bytes / 1024).toFixed(0)} KB, ${UNITS.length} units`);
