// Harsh-review sheet for one unit's rank ladder: shows each rank where the player actually sees it, plus objective flags.
// Usage: node art-candidates/asset-program/tools/review-sheet.mjs --dir <folder with <id>_1..N.png> --id piston --color #d05a3a [--anchor cannon] [--out <file.png>]
// Rows: board size (as GameScene.fitSprite fits it, on the real slot), tray size, silhouette, greyscale, optional anchor unit at the same ranks.
// Output: the PNG plus a .json with per-rank metrics and a list of FLAGS (things a reviewer must look at; they are not the score).
import sharp from 'sharp';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ART = join(HERE, '../../../src/assets/art');
const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf('--' + n); return i >= 0 ? args[i + 1] : d; };
const DIR = opt('dir'), ID = opt('id', 'unit'), COLOR = opt('color', '#888888'), ANCHOR = opt('anchor', '');
if (!DIR) { console.error('usage: review-sheet.mjs --dir <folder> --id <unit> --color #rrggbb [--anchor cannon]'); process.exit(2); }
const OUT = opt('out', join(DIR, `review_${ID}.png`));
const ranks = [];
for (let r = 1; r <= 8; r++) { const f = join(DIR, `${ID}_${r}.png`); if (existsSync(f)) ranks.push({ r, file: f }); }
if (!ranks.length) { console.error('no files named', `${ID}_<rank>.png`, 'in', DIR); process.exit(1); }

const CELL = 132, LBL = 92, PAD = 10, K = CELL / 124; // game CELL is 124 design px
const slotBuf = await sharp(join(ART, 'slot.webp')).resize(Math.round(118 * K), Math.round(118 * K)).png().toBuffer();

/** visible box (alpha > 24), the same threshold GameScene.visBounds uses */
async function load(file) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let x0 = info.width, y0 = info.height, x1 = -1, y1 = -1;
  for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) if (data[(y * info.width + x) * 4 + 3] > 24) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  return { data, w: info.width, h: info.height, box: { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 } };
}
/** the sprite cropped to its visible box and scaled like fitSprite: min(0.76 CELL / h, 0.84 CELL / w), standing on the baseline 0.38 CELL below the centre */
async function fitted(file, im, cell) {
  const k = cell / 124, s = Math.min((124 * 0.76 * k) / im.box.h, (124 * 0.84 * k) / im.box.w);
  const w = Math.max(1, Math.round(im.box.w * s)), h = Math.max(1, Math.round(im.box.h * s));
  const buf = await sharp(file).extract({ left: im.box.x, top: im.box.y, width: im.box.w, height: im.box.h }).resize(w, h).png().toBuffer();
  return { buf, w, h, left: Math.round((cell - w) / 2), top: Math.round(cell / 2 + 124 * 0.38 * k - h) };
}
const ink = (buf) => sharp(buf).ensureAlpha().linear([0, 0, 0, 1], [43, 29, 46, 0]).png().toBuffer(); // alpha kept, rgb -> plum ink
const grey = (buf) => sharp(buf).greyscale().png().toBuffer();

// ---- metrics ----
const rgb2hsv = (r, g, b) => { r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn; let h = 0; if (d) h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; return [(h * 60 + 360) % 360, mx ? d / mx : 0, mx]; };
const tgt = rgb2hsv(...[1, 3, 5].map((i) => parseInt(COLOR.slice(i, i + 2), 16)));
const metrics = [];
const imgs = [];
for (const { r, file } of ranks) {
  const im = await load(file); imgs.push(im);
  const { data, w, h, box } = im;
  let opaque = 0, edge = 0, fringe = 0, sat = 0, famHue = 0, dark = 0, mid = 0, light = 0, lum = 0;
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const p = (y * w + x) * 4, a = data[p + 3];
    if (a > 24) {
      opaque++;
      const [hh, ss, vv] = rgb2hsv(data[p], data[p + 1], data[p + 2]);
      const l = (0.2126 * data[p] + 0.7152 * data[p + 1] + 0.0722 * data[p + 2]) / 255; lum += l;
      if (l < 0.25) dark++; else if (l > 0.8) light++; else mid++;
      if (ss > 0.35 && vv > 0.25) { sat++; const dh = Math.min(Math.abs(hh - tgt[0]), 360 - Math.abs(hh - tgt[0])); if (dh < 25) famHue++; }
    }
    if (a > 10 && a < 245) { edge++; if (Math.min(data[p], data[p + 1], data[p + 2]) > 215) fringe++; }
  }
  // specks: components of alpha>24 that are tiny next to the biggest one
  const N = w * h, seen = new Uint8Array(N); const sizes = [];
  const st = [];
  for (let s = 0; s < N; s++) { if (seen[s] || data[s * 4 + 3] <= 24) continue; let n = 0; seen[s] = 1; st.push(s); while (st.length) { const p = st.pop(); n++; const x = p % w, y = (p / w) | 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue; const q = ny * w + nx; if (!seen[q] && data[q * 4 + 3] > 24) { seen[q] = 1; st.push(q); } } } sizes.push(n); }
  sizes.sort((a, b) => b - a);
  const specks = sizes.slice(1).filter((n) => n < sizes[0] * 0.01).length;
  metrics.push({ rank: r, size: [w, h], visibleBox: box, fillOfBox: +(opaque / (box.w * box.h)).toFixed(2), padding: { left: box.x, right: w - box.x - box.w, top: box.y, bottom: h - box.y - box.h }, whiteFringePct: edge ? +((fringe / edge) * 100).toFixed(1) : 0, specks, familyHuePct: opaque ? +((famHue / opaque) * 100).toFixed(1) : 0, saturatedPct: opaque ? +((sat / opaque) * 100).toFixed(1) : 0, darkPct: +((dark / opaque) * 100).toFixed(0), midPct: +((mid / opaque) * 100).toFixed(0), lightPct: +((light / opaque) * 100).toFixed(0) });
}
// silhouette change between consecutive ranks: both fitted into a 128 box like the game, IoU of the alpha masks
async function mask128(file, im) {
  const s = Math.min((128 * 0.76) / im.box.h, (128 * 0.84) / im.box.w);
  const w = Math.max(1, Math.round(im.box.w * s)), h = Math.max(1, Math.round(im.box.h * s));
  const piece = await sharp(file).extract({ left: im.box.x, top: im.box.y, width: im.box.w, height: im.box.h }).resize(w, h).ensureAlpha().extractChannel(3).raw().toBuffer();
  const m = new Uint8Array(128 * 128); const left = Math.round((128 - w) / 2), top = Math.round(128 / 2 + 128 * 0.38 - h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const X = x + left, Y = y + top; if (X >= 0 && X < 128 && Y >= 0 && Y < 128) m[Y * 128 + X] = piece[y * w + x] > 100 ? 1 : 0; }
  return m;
}
const masks = []; for (let i = 0; i < ranks.length; i++) masks.push(await mask128(ranks[i].file, imgs[i]));
for (let i = 1; i < masks.length; i++) { let inter = 0, uni = 0; for (let p = 0; p < masks[i].length; p++) { const a = masks[i - 1][p], b = masks[i][p]; if (a & b) inter++; if (a | b) uni++; } metrics[i].silhouetteIoUWithPrevious = +(inter / uni).toFixed(2); }

// ---- flags (harsh: each one is something to look at, not a score) ----
const flags = [];
for (const m of metrics) {
  const t = `rank ${m.rank}`;
  if (m.whiteFringePct > 12) flags.push(`${t}: white fringe on ${m.whiteFringePct}% of edge pixels (halo on dark backgrounds)`);
  if (m.specks) flags.push(`${t}: ${m.specks} stray speck(s) next to the object`);
  const { left, right, top, bottom } = m.padding; if (Math.min(left, right, top, bottom) < 2) flags.push(`${t}: object touches the canvas edge (clipped?)`);
  if (m.familyHuePct < 15) flags.push(`${t}: only ${m.familyHuePct}% of pixels are in the family hue ${COLOR} (family colour not dominant)`);
  if (m.midPct > 82) flags.push(`${t}: ${m.midPct}% of pixels are mid-value (flat, weak light/dark structure)`);
  if (m.silhouetteIoUWithPrevious > 0.93) flags.push(`${t}: silhouette is ${Math.round(m.silhouetteIoUWithPrevious * 100)}% the same as rank ${m.rank - 1} (will not read as an upgrade at 64 px)`);
  if (m.silhouetteIoUWithPrevious !== undefined && m.silhouetteIoUWithPrevious < 0.45) flags.push(`${t}: silhouette only ${Math.round(m.silhouetteIoUWithPrevious * 100)}% like rank ${m.rank - 1} (a different object? progression broken)`);
}
if (ranks.length < 8) flags.push(`only ${ranks.length} of 8 ranks found`);

// ---- sheet ----
const rows = [];
const cellOf = (i) => LBL + PAD + i * (CELL + 4);
const board = [], tray = [], sil = [], gry = [], anch = [];
const T = 66;
for (let i = 0; i < ranks.length; i++) {
  const f = await fitted(ranks[i].file, imgs[i], CELL);
  board.push({ input: slotBuf, left: cellOf(i) + Math.round(3 * K), top: 0 + Math.round(3 * K) }, { input: f.buf, left: cellOf(i) + f.left, top: f.top });
  const ft = await fitted(ranks[i].file, imgs[i], T);
  tray.push({ input: await sharp(slotBuf).resize(Math.round(118 * T / 124), Math.round(118 * T / 124)).png().toBuffer(), left: cellOf(i) + Math.round((CELL - T) / 2) + Math.round(3 * T / 124), top: Math.round(3 * T / 124) }, { input: ft.buf, left: cellOf(i) + Math.round((CELL - T) / 2) + ft.left, top: ft.top });
  const f64 = await fitted(ranks[i].file, imgs[i], 64);
  sil.push({ input: await ink(f64.buf), left: cellOf(i) + 34 + f64.left, top: f64.top });
  gry.push({ input: await grey(f64.buf), left: cellOf(i) + 34 + f64.left, top: f64.top });
  if (ANCHOR) {
    const af = join(ART, `${ANCHOR}_${ranks[i].r}.webp`);
    if (existsSync(af)) { const ai = await load(af); const a = await fitted(af, ai, CELL); anch.push({ input: slotBuf, left: cellOf(i) + Math.round(3 * K), top: Math.round(3 * K) }, { input: a.buf, left: cellOf(i) + a.left, top: a.top }); }
  }
}
const rowDefs = [['BOARD', CELL, board, '#5a3a2a'], ['TRAY', T + 6, tray, '#5a3a2a'], ['SILHOUETTE', 70, sil, '#fbe7c6'], ['GREYSCALE', 70, gry, '#8a8a8a']];
if (anch.length) rowDefs.splice(1, 0, ['ANCHOR', CELL, anch, '#5a3a2a']);
const HEAD = 70, W = LBL + PAD * 2 + 8 * (CELL + 4);
let y = HEAD; const comps = []; const labels = [];
for (const [name, h, layers, bgc] of rowDefs) {
  comps.push({ input: await sharp({ create: { width: W - 16, height: h + 6, channels: 3, background: bgc } }).png().toBuffer(), left: 8, top: y });
  for (const l of layers) comps.push({ input: l.input, left: l.left, top: l.top + y + 3 });
  labels.push(`<text x="16" y="${y + h / 2 + 4}" font-size="13" font-weight="700" fill="#fbe7c6">${name}</text>`);
  y += h + 14;
}
// metric strip
const flagLines = flags.slice(0, 14);
const metricTxt = metrics.map((m, i) => `<text x="${cellOf(i) + 4}" y="${y + 14}" font-size="11" fill="#e8d2b4">r${m.rank}${m.silhouetteIoUWithPrevious !== undefined ? ` IoU ${m.silhouetteIoUWithPrevious}` : ''}</text><text x="${cellOf(i) + 4}" y="${y + 28}" font-size="11" fill="#e8d2b4">fringe ${m.whiteFringePct}% hue ${m.familyHuePct}%</text>`).join('');
const flagTxt = (flagLines.length ? flagLines : ['no automatic flags (a human still has to look)']).map((t, i) => `<text x="16" y="${y + 52 + i * 16}" font-size="12" fill="${flagLines.length ? '#ffb4a0' : '#a8e8a0'}">${t.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</text>`).join('');
const totalH = y + 60 + Math.max(1, flagLines.length) * 16;
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${totalH}" font-family="DejaVu Sans, Arial, sans-serif"><rect width="100%" height="100%" fill="#2b1d2e"/><text x="16" y="30" font-size="20" font-weight="700" fill="#ffd84a">${ID} review sheet</text><text x="16" y="52" font-size="12" fill="#e8d2b4">family colour ${COLOR}${ANCHOR ? ' · anchor row = shipped ' + ANCHOR + ' at the same ranks' : ''} · board/tray fitted like GameScene.fitSprite · IoU = silhouette overlap with previous rank</text></svg>`;
const base = await sharp(Buffer.from(svg)).png().toBuffer();
const overlay = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${totalH}" font-family="DejaVu Sans, Arial, sans-serif">${labels.join('')}${metricTxt}${flagTxt}</svg>`;
await sharp(base).composite([...comps, { input: Buffer.from(overlay), left: 0, top: 0 }]).png({ compressionLevel: 9 }).toFile(OUT);
writeFileSync(OUT.replace(/\.png$/, '.json'), JSON.stringify({ id: ID, color: COLOR, anchor: ANCHOR || null, flags, metrics }, null, 1));
console.log(`${OUT}: ${ranks.length} ranks, ${flags.length} flag(s)`);
for (const f of flags) console.log(' FLAG', f);
