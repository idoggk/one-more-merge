// Rank clarity audit: contact strips + an objective distinctness score for every adjacent rank pair of the 22 picture units.
//   node tools/rank-clarity.mjs [--help] [--units wrench,vice] [--threshold N] [--out art-candidates/rank-clarity] [--no-strips]
// Input : <out>/manifest.json + <out>/pieces/<unit>_<rank>.webp (the approved pieces, collected with plain `git show` of exact paths).
// Output: <out>/strips/<unit>.png (colour + grey rows at 70 px board tile and 48 px tray), <out>/strips/ALL_70.png (all units),
//         <out>/scores.json, <out>/scores.md (worst pairs first), and a console summary.
// A pair has four channels, each 0..1: silhouette (1 - IoU of the alpha masks after both opaque boxes are fitted to the same 64 px box),
// size (opaque bbox size ratio BEFORE normalising), colour (mean RGB distance of the opaque pixels), edges (Sobel edge count = parts/detail).
// score = 100 * (0.40 sil + 0.20 size + 0.20 colour + 0.20 edges). A channel "differs" at >= 0.5. Rule: >= 2 channels must differ.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';

const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(`--${n}`); return i < 0 ? d : args[i + 1]; };
if (args.includes('--help') || args.includes('-h')) {
  console.log(`rank-clarity.mjs - adjacent-rank distinctness audit for the picture units
Usage: node tools/rank-clarity.mjs [options]
  --units a,b,c     only these unit ids (default: all in manifest)
  --threshold N     score below N is flagged (default 30, calibrated by eye; 22 and under = near twins)
  --out DIR         data folder (default art-candidates/rank-clarity)
  --no-strips       skip writing the strip PNGs
  --help            this text
Needs: <out>/manifest.json and <out>/pieces/<unit>_<rank>.webp. Writes strips/, scores.json, scores.md.`);
  process.exit(0);
}

const OUT = opt('out', 'art-candidates/rank-clarity');
/** Calibrated on pairs judged visibly different by eye (see docs/art/RANK_CLARITY.md, "Calibration"). */
const THRESHOLD = Number(opt('threshold', 30));
const CH_ON = 0.5;
const N = 64;
const clamp = (x) => Math.max(0, Math.min(1, x));

const manifest = JSON.parse(readFileSync(join(OUT, 'manifest.json'), 'utf8'));
const only = opt('units', '') ? new Set(opt('units').split(',')) : null;
const units = [...new Set(manifest.map((m) => m.unit))].filter((u) => !only || only.has(u));
const piecePath = (u, r) => join(OUT, 'pieces', `${u}_${r}.webp`);
const has = (u, r) => existsSync(piecePath(u, r));

/** RGBA 256x256 of a piece. */
async function load(u, r) {
  const { data, info } = await sharp(piecePath(u, r)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, w: info.width, h: info.height };
}

/** bbox of alpha > 40, mean colour of opaque pixels, and the piece fitted into an N x N box (alpha mask + luminance). */
async function features(u, r) {
  const { data, w, h } = await load(u, r);
  let x0 = w, y0 = h, x1 = -1, y1 = -1, sr = 0, sg = 0, sb = 0, n = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4;
    if (data[i + 3] <= 40) continue;
    x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
    sr += data[i]; sg += data[i + 1]; sb += data[i + 2]; n++;
  }
  const bw = x1 - x0 + 1, bh = y1 - y0 + 1;
  const fitted = await sharp(piecePath(u, r)).ensureAlpha()
    .extract({ left: x0, top: y0, width: bw, height: bh })
    .resize(N, N, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .raw().toBuffer();
  const mask = new Uint8Array(N * N), lum = new Float32Array(N * N);
  for (let i = 0; i < N * N; i++) {
    mask[i] = fitted[i * 4 + 3] > 40 ? 1 : 0;
    lum[i] = mask[i] ? 0.299 * fitted[i * 4] + 0.587 * fitted[i * 4 + 1] + 0.114 * fitted[i * 4 + 2] : 0;
  }
  let edges = 0;
  for (let y = 1; y < N - 1; y++) for (let x = 1; x < N - 1; x++) {
    const L = (dx, dy) => lum[(y + dy) * N + x + dx];
    const gx = -L(-1, -1) - 2 * L(-1, 0) - L(-1, 1) + L(1, -1) + 2 * L(1, 0) + L(1, 1);
    const gy = -L(-1, -1) - 2 * L(0, -1) - L(1, -1) + L(-1, 1) + 2 * L(0, 1) + L(1, 1);
    if (Math.hypot(gx, gy) > 120) edges++;
  }
  return { bw, bh, size: Math.sqrt(bw * bh), mean: [sr / n, sg / n, sb / n], mask, edges, fill: n / (w * h) };
}

function pair(a, b) {
  let inter = 0, uni = 0;
  for (let i = 0; i < N * N; i++) { inter += a.mask[i] & b.mask[i]; uni += a.mask[i] | b.mask[i]; }
  const iou = inter / Math.max(1, uni);
  const sizeRatio = Math.min(a.size, b.size) / Math.max(a.size, b.size);
  const colDist = Math.hypot(a.mean[0] - b.mean[0], a.mean[1] - b.mean[1], a.mean[2] - b.mean[2]);
  const edgeDiff = Math.abs(a.edges - b.edges) / Math.max(1, a.edges, b.edges);
  const ch = { sil: clamp((1 - iou) / 0.5), size: clamp((1 - sizeRatio) / 0.25), colour: clamp(colDist / 60), edges: clamp(edgeDiff / 0.35) };
  const score = 100 * (0.4 * ch.sil + 0.2 * ch.size + 0.2 * ch.colour + 0.2 * ch.edges);
  const differs = Object.entries(ch).filter(([, v]) => v >= CH_ON).map(([k]) => k);
  return { iou: +iou.toFixed(3), sizeRatio: +sizeRatio.toFixed(3), colDist: +colDist.toFixed(1), edgeDiff: +edgeDiff.toFixed(3), ch: Object.fromEntries(Object.entries(ch).map(([k, v]) => [k, +v.toFixed(2)])), score: +score.toFixed(1), differs, rule2: differs.length >= 2 };
}

// ---- contact strips ----
const BG = { r: 58, g: 50, b: 74, alpha: 1 };
const PAD = 6;
async function tile(u, r, size, grey) {
  const box = Math.round(size * 0.92);
  const base = { create: { width: size, height: size, channels: 4, background: BG } };
  if (!has(u, r)) {
    const hatch = Buffer.from(`<svg width="${size}" height="${size}"><rect width="${size}" height="${size}" fill="#2a2438"/><path d="M0 ${size}L${size} 0M0 ${size / 2}L${size / 2} 0M${size / 2} ${size}L${size} ${size / 2}" stroke="#6a5a88" stroke-width="2"/></svg>`);
    return sharp(hatch).png().toBuffer();
  }
  const piece = await sharp(piecePath(u, r)).resize(box, box, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  let img = sharp(base).composite([{ input: piece, gravity: 'centre' }]);
  if (grey) img = img.greyscale();
  return img.png().toBuffer();
}
async function row(u, size, grey, ranks) {
  const W = ranks.length * (size + PAD) + PAD;
  const tiles = await Promise.all(ranks.map((r) => tile(u, r, size, grey)));
  return sharp({ create: { width: W, height: size + PAD * 2, channels: 4, background: { r: 24, g: 20, b: 34, alpha: 1 } } })
    .composite(tiles.map((t, i) => ({ input: t, left: PAD + i * (size + PAD), top: PAD }))).png().toBuffer();
}
async function stripFor(u) {
  const ranks = [1, 2, 3, 4, 5, 6, 7, 8];
  const rows = [await row(u, 70, false, ranks), await row(u, 70, true, ranks), await row(u, 48, false, ranks), await row(u, 48, true, ranks)];
  const heights = [82, 82, 60, 60];
  const W = ranks.length * 76 + PAD;
  let top = 0;
  const comp = rows.map((b, i) => { const c = { input: b, left: 0, top }; top += heights[i]; return c; });
  return sharp({ create: { width: W, height: top, channels: 4, background: { r: 24, g: 20, b: 34, alpha: 1 } } }).composite(comp).png().toBuffer();
}

// ---- main ----
const results = [];
for (const u of units) {
  const feats = {};
  for (let r = 1; r <= 8; r++) if (has(u, r)) feats[r] = await features(u, r);
  for (let r = 1; r < 8; r++) {
    if (!feats[r] || !feats[r + 1]) continue;
    results.push({ unit: u, from: r, to: r + 1, ...pair(feats[r], feats[r + 1]) });
  }
  const missing = [1, 2, 3, 4, 5, 6, 7, 8].filter((r) => !feats[r] && r <= (u === 'wrench' ? 6 : 8));
  results.missing = (results.missing ?? {});
  results.missing[u] = missing;
}
if (!args.includes('--no-strips')) {
  mkdirSync(join(OUT, 'strips'), { recursive: true });
  const bufs = [];
  for (const u of units) { const b = await stripFor(u); bufs.push(b); await sharp(b).toFile(join(OUT, 'strips', `${u}.png`)); }
  const meta = await Promise.all(bufs.map((b) => sharp(b).metadata()));
  // overview: colour + grey 70 px rows of every unit
  const H = 82, W = meta[0].width;
  const comp = [];
  for (let i = 0; i < bufs.length; i++) comp.push({ input: await sharp(bufs[i]).extract({ left: 0, top: 0, width: W, height: H * 2 }).toBuffer(), left: 0, top: i * H * 2 });
  await sharp({ create: { width: W, height: bufs.length * H * 2, channels: 4, background: { r: 24, g: 20, b: 34, alpha: 1 } } }).composite(comp).png().toFile(join(OUT, 'strips', 'ALL_70.png'));
}

const ranked = [...results].sort((a, b) => a.score - b.score);
const flagged = ranked.filter((p) => p.score < THRESHOLD || !p.rule2);
writeFileSync(join(OUT, 'scores.json'), JSON.stringify({ threshold: THRESHOLD, pairs: ranked, missing: results.missing }, null, 1));
const md = ['| # | Unit | Ranks | Score | IoU | Size ratio | Colour dist | Edge diff | Channels that differ |', '|---|---|---|---|---|---|---|---|---|',
  ...ranked.map((p, i) => `| ${i + 1} | ${p.unit} | ${p.from}-${p.to} | ${p.score} | ${p.iou} | ${p.sizeRatio} | ${p.colDist} | ${p.edgeDiff} | ${p.differs.join(', ') || 'none'}${p.rule2 ? '' : ' (FAILS 2-of rule)'} |`)];
writeFileSync(join(OUT, 'scores.md'), `Threshold ${THRESHOLD}; ${ranked.length} adjacent pairs (both ranks approved), worst first.\n\n${md.join('\n')}\n`);

console.log(`units ${units.length}, adjacent pairs scored ${ranked.length}, threshold ${THRESHOLD}`);
console.log(`flagged (score < ${THRESHOLD} or fewer than 2 differing channels): ${flagged.length}`);
console.log('worst 15:');
for (const p of ranked.slice(0, 15)) console.log(`  ${p.unit.padEnd(16)} ${p.from}-${p.to}  score ${String(p.score).padStart(5)}  iou ${p.iou}  size ${p.sizeRatio}  col ${p.colDist}  edges ${p.edgeDiff}  [${p.differs.join(',') || 'none'}]`);
const gaps = Object.entries(results.missing).filter(([, v]) => v.length);
console.log(`units with ranks that have no approved piece: ${gaps.map(([u, v]) => `${u}:${v.join('')}`).join(' ')}`);
