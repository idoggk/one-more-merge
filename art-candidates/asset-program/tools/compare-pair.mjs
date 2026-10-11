// Original vs polished (or v1 vs v2) of the SAME rank: shows both at board and tray size on the real slot, as silhouettes, and prints how much of the design survived.
// Usage: node art-candidates/asset-program/tools/compare-pair.mjs --a <orig.png> --b <new.png> --label "rank 4" [--color #d05a3a] [--out file.png]
// IoU of the silhouettes (both fitted into a 128 box the way GameScene.fitSprite does): >= 0.90 design kept, 0.85-0.90 small changes, < 0.85 redesigned.
import sharp from 'sharp';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ART = join(HERE, '../../../src/assets/art');
const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf('--' + n); return i >= 0 ? args[i + 1] : d; };
const A = opt('a'), B = opt('b'), LABEL = opt('label', 'pair'), COLOR = opt('color', '#888888'), OUT = opt('out', `compare_${LABEL.replace(/\W+/g, '_')}.png`);
if (!A || !B) { console.error('usage: compare-pair.mjs --a orig.png --b new.png --label "rank 4"'); process.exit(2); }

async function load(f) {
  const { data, info } = await sharp(f).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let x0 = info.width, y0 = info.height, x1 = -1, y1 = -1;
  for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) if (data[(y * info.width + x) * 4 + 3] > 24) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  return { data, w: info.width, h: info.height, box: { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 } };
}
const fit = async (f, im, cell) => {
  const k = cell / 124, s = Math.min((124 * 0.76 * k) / im.box.h, (124 * 0.84 * k) / im.box.w);
  const w = Math.max(1, Math.round(im.box.w * s)), h = Math.max(1, Math.round(im.box.h * s));
  return { buf: await sharp(f).extract({ left: im.box.x, top: im.box.y, width: im.box.w, height: im.box.h }).resize(w, h).png().toBuffer(), left: Math.round((cell - w) / 2), top: Math.round(cell / 2 + 124 * 0.38 * k - h) };
};
const mask = async (f, im) => {
  const f2 = await fit(f, im, 128), piece = await sharp(f2.buf).ensureAlpha().extractChannel(3).raw().toBuffer(), m = await sharp(f2.buf).metadata();
  const out = new Uint8Array(128 * 128);
  for (let y = 0; y < m.height; y++) for (let x = 0; x < m.width; x++) { const X = x + f2.left, Y = y + f2.top; if (X >= 0 && X < 128 && Y >= 0 && Y < 128) out[Y * 128 + X] = piece[y * m.width + x] > 100 ? 1 : 0; }
  return out;
};
const hueShare = (im) => {
  const t = (() => { const [r, g, b] = [1, 3, 5].map((i) => parseInt(COLOR.slice(i, i + 2), 16) / 255), mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn; let h = 0; if (d) h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; return (h * 60 + 360) % 360; })();
  let opaque = 0, fam = 0;
  for (let p = 0; p < im.w * im.h; p++) { if (im.data[p * 4 + 3] <= 24) continue; opaque++; const r = im.data[p * 4] / 255, g = im.data[p * 4 + 1] / 255, b = im.data[p * 4 + 2] / 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn; if (!mx || d / mx < 0.35 || mx < 0.25) continue; let h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h = (h * 60 + 360) % 360; if (Math.min(Math.abs(h - t), 360 - Math.abs(h - t)) < 25) fam++; }
  return opaque ? +((fam / opaque) * 100).toFixed(1) : 0;
};
const ia = await load(A), ib = await load(B);
const ma = await mask(A, ia), mb = await mask(B, ib);
let inter = 0, uni = 0; for (let p = 0; p < ma.length; p++) { if (ma[p] & mb[p]) inter++; if (ma[p] | mb[p]) uni++; }
const iou = +(inter / uni).toFixed(2);
const verdict = iou >= 0.9 ? 'design kept' : iou >= 0.85 ? 'small changes' : 'REDESIGNED';

// sheet: columns = A, B ; rows = board 132, tray 66, silhouette 90
const CELL = 132, W = 520;
const slot = (n) => sharp(join(ART, 'slot.webp')).resize(Math.round(118 * n / 124), Math.round(118 * n / 124)).png().toBuffer();
const comps = []; let y = 84;
for (const [name, n] of [['BOARD', CELL], ['TRAY', 66]]) {
  for (const [i, [f, im]] of [[A, ia], [B, ib]].entries()) {
    const fx = await fit(f, im, n), left = 150 + i * 180 + Math.round((CELL - n) / 2);
    comps.push({ input: await slot(n), left: left + Math.round(3 * n / 124), top: y + Math.round(3 * n / 124) }, { input: fx.buf, left: left + fx.left, top: y + fx.top });
  }
  y += n + 14;
}
for (const [i, [f, im]] of [[A, ia], [B, ib]].entries()) {
  const fx = await fit(f, im, 64); const ink = await sharp(fx.buf).ensureAlpha().linear([0, 0, 0, 1], [43, 29, 46, 0]).png().toBuffer();
  comps.push({ input: await sharp({ create: { width: 150, height: 80, channels: 3, background: '#fbe7c6' } }).png().toBuffer(), left: 150 + i * 180 + 0, top: y }, { input: ink, left: 150 + i * 180 + fx.left + 43, top: y + fx.top - 4 });
}
y += 94;
const H = y + 56;
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" font-family="DejaVu Sans, Arial, sans-serif"><rect width="100%" height="100%" fill="#2b1d2e"/>
<text x="14" y="24" font-size="18" font-weight="700" fill="#ffd84a">${LABEL}: A vs B</text><text x="14" y="44" font-size="12" fill="#e8d2b4">silhouette overlap ${iou} (${verdict}) · family-hue pixels (of the whole object) A ${hueShare(ia)}% B ${hueShare(ib)}%</text>
<text x="160" y="72" font-size="12" fill="#fbe7c6">A (original)</text><text x="340" y="72" font-size="12" fill="#fbe7c6">B (new)</text>
<text x="14" y="${84 + 70}" font-size="12" font-weight="700" fill="#fbe7c6">BOARD</text><text x="14" y="${84 + 132 + 14 + 40}" font-size="12" font-weight="700" fill="#fbe7c6">TRAY</text><text x="14" y="${84 + 132 + 14 + 66 + 14 + 48}" font-size="12" font-weight="700" fill="#fbe7c6">SILHOUETTE</text></svg>`;
await sharp(Buffer.from(svg)).composite(comps).png({ compressionLevel: 9 }).toFile(OUT);
console.log(`${LABEL}: silhouette overlap ${iou} (${verdict}); family-hue share A ${hueShare(ia)}% B ${hueShare(ib)}% -> ${OUT}`);
