// Slice a ChatGPT sheet (N objects on a flat white background) into one transparent PNG per object, in reading order.
// Usage: node art-candidates/asset-program/tools/slice-sheet.mjs <sheet.png> <outDir> --cols 4 --rows 2 --prefix piston [--first 1] [--fit 460] [--size 512] [--keep-scale] [--bg #ffffff] [--tol 28]
// Output: <outDir>/<prefix>_<n>.png (size x size, transparent, object fitted to `fit` px, centred), <prefix>_<n>.webp (256), slice_report.json.
// Method: flood-fill the white background in from the sheet border (interior whites are kept), erode the mask 1 px to drop the white
// fringe, keep the big connected pieces as the objects, merge small detached bits (flame tip, steam) into the nearest object, drop specks.
import sharp from 'sharp';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const args = process.argv.slice(2);
const pos = args.filter((a, i) => !a.startsWith('--') && !(i > 0 && args[i - 1].startsWith('--') && args[i - 1] !== '--keep-scale'));
const opt = (name, d) => { const i = args.indexOf('--' + name); return i >= 0 ? args[i + 1] : d; };
const [sheet, outDir] = pos;
if (!sheet || !outDir) { console.error('usage: slice-sheet.mjs <sheet.png> <outDir> --cols C --rows R --prefix NAME'); process.exit(2); }
const COLS = +opt('cols', 4), ROWS = +opt('rows', 2), PREFIX = opt('prefix', 'obj'), FIRST = +opt('first', 1);
const FIT = +opt('fit', 460), SIZE = +opt('size', 512), TOL = +opt('tol', 28), KEEP_SCALE = args.includes('--keep-scale');
const bgHex = opt('bg', '#ffffff');
const ERODE = +opt('erode', 2); // px of the source sheet shaved off the object edge (the white halo of the anti-aliasing)
const bg = [1, 3, 5].map((i) => parseInt(bgHex.slice(i, i + 2), 16));
mkdirSync(outDir, { recursive: true });

const { data, info } = await sharp(sheet).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const W = info.width, H = info.height, N = W * H;
const isBg = (p) => Math.abs(data[p * 3] - bg[0]) <= TOL && Math.abs(data[p * 3 + 1] - bg[1]) <= TOL && Math.abs(data[p * 3 + 2] - bg[2]) <= TOL;

// 1. background = flood fill from the border over bg-coloured pixels
const outside = new Uint8Array(N);
const stack = [];
const push = (p) => { if (!outside[p] && isBg(p)) { outside[p] = 1; stack.push(p); } };
for (let x = 0; x < W; x++) { push(x); push((H - 1) * W + x); }
for (let y = 0; y < H; y++) { push(y * W); push(y * W + W - 1); }
while (stack.length) {
  const p = stack.pop(), x = p % W, y = (p / W) | 0;
  if (x > 0) push(p - 1); if (x < W - 1) push(p + 1); if (y > 0) push(p - W); if (y < H - 1) push(p + W);
}
// 2. object mask, eroded ERODE px (white halo from anti-aliasing)
let mask = new Uint8Array(N);
for (let p = 0; p < N; p++) mask[p] = outside[p] ? 0 : 1;
const erode = (m) => { const o = new Uint8Array(N); for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) { const p = y * W + x; if (m[p] && m[p - 1] && m[p + 1] && m[p - W] && m[p + W]) o[p] = 1; } return o; };
for (let i = 0; i < ERODE; i++) mask = erode(mask);

// 3. connected components (8-neighbour)
const lab = new Int32Array(N);
const comps = [{ area: 0 }];
for (let s = 0; s < N; s++) {
  if (!mask[s] || lab[s]) continue;
  const id = comps.length; let area = 0, x0 = W, y0 = H, x1 = -1, y1 = -1;
  lab[s] = id; stack.push(s);
  while (stack.length) {
    const p = stack.pop(); area++; const x = p % W, y = (p / W) | 0;
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      const q = ny * W + nx; if (mask[q] && !lab[q]) { lab[q] = id; stack.push(q); }
    }
  }
  comps.push({ id, area, x0, y0, x1, y1 });
}
const want = COLS * ROWS;
const sorted = comps.slice(1).sort((a, b) => b.area - a.area);
const big = sorted.slice(0, want);
if (big.length < want) { console.error(`found only ${big.length} objects, expected ${want}: objects may touch each other (leave wider gaps in the prompt)`); process.exit(1); }
const smallest = big[big.length - 1].area, largest = big[0].area;
const rest = sorted.slice(want);
// 4. merge detached bits into the nearest big object when close (flame tips, steam), else drop as specks
const objs = big.map((c) => ({ ...c, bits: 0 }));
let dropped = 0;
const gap = (a, b) => Math.max(0, Math.max(a.x0 - b.x1, b.x0 - a.x1)) + Math.max(0, Math.max(a.y0 - b.y1, b.y0 - a.y1));
const mergeDist = Math.min(W / COLS, H / ROWS) * 0.12;
const owner = new Map(); // comp id -> object index
objs.forEach((o, i) => owner.set(o.id, i));
for (const c of rest) {
  let bi = -1, bd = 1e9;
  objs.forEach((o, i) => { const d = gap(c, o); if (d < bd) { bd = d; bi = i; } });
  if (bi >= 0 && bd <= mergeDist && c.area >= 40) { const o = objs[bi]; o.x0 = Math.min(o.x0, c.x0); o.y0 = Math.min(o.y0, c.y0); o.x1 = Math.max(o.x1, c.x1); o.y1 = Math.max(o.y1, c.y1); o.bits++; owner.set(c.id, bi); }
  else dropped++;
}
// 5. reading order: split into ROWS by the biggest vertical gaps between centres, then sort by x
const cy = (o) => (o.y0 + o.y1) / 2, cx = (o) => (o.x0 + o.x1) / 2;
const byY = objs.map((o, i) => i).sort((a, b) => cy(objs[a]) - cy(objs[b]));
const cuts = [];
for (let i = 1; i < byY.length; i++) cuts.push({ i, g: cy(objs[byY[i]]) - cy(objs[byY[i - 1]]) });
const rowCuts = cuts.sort((a, b) => b.g - a.g).slice(0, ROWS - 1).map((c) => c.i).sort((a, b) => a - b);
const order = []; let from = 0;
for (const cut of [...rowCuts, byY.length]) { order.push(...byY.slice(from, cut).sort((a, b) => cx(objs[a]) - cx(objs[b]))); from = cut; }
if (new Set(order).size !== want) { console.error('could not arrange the objects into the grid; check --cols/--rows'); process.exit(1); }
// 6. write each object: crop its bbox, apply the mask (only pixels of THIS object and its merged bits), fit, centre
const report = { sheet, cols: COLS, rows: ROWS, objects: [], speckComponentsDropped: dropped, areaRatioSmallestToLargest: +(smallest / largest).toFixed(2) };
let common = 1;
const dims = order.map((i) => Math.max(objs[i].x1 - objs[i].x0 + 1, objs[i].y1 - objs[i].y0 + 1));
if (KEEP_SCALE) common = FIT / Math.max(...dims);
for (let n = 0; n < order.length; n++) {
  const i = order[n], o = objs[i], w = o.x1 - o.x0 + 1, h = o.y1 - o.y0 + 1;
  const rgba = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const p = (o.y0 + y) * W + (o.x0 + x), q = (y * w + x) * 4, L = lab[p];
    rgba[q] = data[p * 3]; rgba[q + 1] = data[p * 3 + 1]; rgba[q + 2] = data[p * 3 + 2];
    rgba[q + 3] = L && owner.get(L) === i ? 255 : 0;
  }
  // defringe: an edge pixel that is much lighter than the pixels 3-4 px further in is a leftover of the white background; paint it with the inner colour
  const at = (x, y) => (y * w + x) * 4;
  const lumOf = (q) => 0.2126 * rgba[q] + 0.7152 * rgba[q + 1] + 0.0722 * rgba[q + 2];
  const ring = [];
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) { const q = at(x, y); if (rgba[q + 3] && (!rgba[at(x - 1, y) + 3] || !rgba[at(x + 1, y) + 3] || !rgba[at(x, y - 1) + 3] || !rgba[at(x, y + 1) + 3])) ring.push([x, y]); }
  for (let pass = 0; pass < 2; pass++) for (const [x, y] of ring) {
    const q = at(x, y); let sr = 0, sg = 0, sb = 0, n = 0, minL = 1e9, mq = -1;
    for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) { const X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= w || Y >= h) continue; const r2 = at(X, Y); if (!rgba[r2 + 3] || (Math.abs(dx) < 2 && Math.abs(dy) < 2)) continue; const L = lumOf(r2); if (L < minL) { minL = L; mq = r2; } sr += rgba[r2]; sg += rgba[r2 + 1]; sb += rgba[r2 + 2]; n++; }
    if (n && mq >= 0 && lumOf(q) > minL + 40) { rgba[q] = rgba[mq]; rgba[q + 1] = rgba[mq + 1]; rgba[q + 2] = rgba[mq + 2]; }
  }
  // soften the hard edge a little (0.7 px blur on alpha only) so the sprite does not look cut out
  const alphaSoft = await sharp(rgba, { raw: { width: w, height: h, channels: 4 } }).extractChannel(3).blur(0.7).raw().toBuffer();
  for (let k = 0; k < w * h; k++) rgba[k * 4 + 3] = alphaSoft[k];
  const scale = KEEP_SCALE ? common : FIT / Math.max(w, h);
  const tw = Math.max(1, Math.round(w * scale)), th = Math.max(1, Math.round(h * scale));
  const piece = await sharp(rgba, { raw: { width: w, height: h, channels: 4 } }).resize(tw, th, { kernel: 'lanczos3' }).png().toBuffer();
  const file = `${PREFIX}_${FIRST + n}`;
  const canvas = await sharp({ create: { width: SIZE, height: SIZE, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite([{ input: piece, left: Math.round((SIZE - tw) / 2), top: Math.round((SIZE - th) / 2) }]).png({ compressionLevel: 9 }).toBuffer();
  writeFileSync(join(outDir, file + '.png'), canvas);
  await sharp(canvas).resize(256, 256).webp({ quality: 88, alphaQuality: 92 }).toFile(join(outDir, file + '.webp'));
  report.objects.push({ file, srcBox: [o.x0, o.y0, o.x1, o.y1], mergedBits: o.bits, srcSize: [w, h] });
}
writeFileSync(join(outDir, 'slice_report.json'), JSON.stringify(report, null, 1));
console.log(`sliced ${want} objects -> ${outDir} (${dropped} specks dropped, smallest/largest area ${report.areaRatioSmallestToLargest})`);
