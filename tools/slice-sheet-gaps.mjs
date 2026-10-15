// Slice a ChatGPT sheet whose sprites do NOT sit on an even grid: split by empty gaps instead.
// Usage: node tools/slice-sheet-gaps.mjs <sheet.png> --rows 2 --key magenta|green --out <dir> --names a,b,c,...
//          [--cols 3 | --cols 3,3 (per row)] [--tol 70] [--feather 60] [--pad 0.08]
// Keys the flat colour (soft alpha, colour un-mixed from the key), splits rows by empty horizontal bands and
// each row into --cols sprites by the widest empty vertical bands, trims, pads, writes <name>.png + .webp
// and contact-dark.png / contact-light.png. Prints each sprite size and any component touching the sheet edge.
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const args = process.argv.slice(2);
const sheet = args[0];
const opt = (k, d) => { const i = args.indexOf('--' + k); return i < 0 ? d : args[i + 1]; };
const rows = +opt('rows', 1);
const colsArg = String(opt('cols', '3')).split(',').map(Number);
const key = { magenta: [255, 0, 255], green: [0, 255, 0] }[opt('key', 'magenta')];
const out = opt('out', 'out');
const names = String(opt('names', '')).split(',');
const TOL = +opt('tol', 70), FEATHER = +opt('feather', 60), PAD = +opt('pad', 0.08);
mkdirSync(out, { recursive: true });

const { data, info } = await sharp(sheet).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width: W, height: H } = info;
const px = new Uint8ClampedArray(data);
const A = new Uint8Array(W * H);
for (let i = 0; i < W * H; i++) {
  const r = px[i * 4], g = px[i * 4 + 1], b = px[i * 4 + 2];
  const d = Math.hypot(r - key[0], g - key[1], b - key[2]);
  const a = d <= TOL ? 0 : d >= TOL + FEATHER ? 1 : (d - TOL) / FEATHER;
  A[i] = Math.round(a * 255);
  if (a > 0 && a < 1) {
    px[i * 4] = Math.max(0, Math.min(255, (r - (1 - a) * key[0]) / a));
    px[i * 4 + 1] = Math.max(0, Math.min(255, (g - (1 - a) * key[1]) / a));
    px[i * 4 + 2] = Math.max(0, Math.min(255, (b - (1 - a) * key[2]) / a));
  }
  px[i * 4 + 3] = A[i];
}
// drop tiny specks
const MINA = 40;

/** runs of non-empty indices in a 1-D profile; returns [{s,e}] */
function runs(profile, minCount = 3) {
  const res = [];
  let s = -1;
  for (let i = 0; i <= profile.length; i++) {
    const on = i < profile.length && profile[i] >= minCount;
    if (on && s < 0) s = i;
    if (!on && s >= 0) { res.push({ s, e: i - 1 }); s = -1; }
  }
  return res;
}
/** merge the runs down to n by closing the smallest gaps */
function mergeTo(rs, n) {
  rs = rs.map((r) => ({ ...r }));
  while (rs.length > n) {
    let bi = 0, bg = Infinity;
    for (let i = 0; i < rs.length - 1; i++) { const g = rs[i + 1].s - rs[i].e; if (g < bg) { bg = g; bi = i; } }
    rs[bi].e = rs[bi + 1].e; rs.splice(bi + 1, 1);
  }
  return rs;
}
const prof = (x0, x1, y0, y1, byRow) => {
  const n = byRow ? y1 - y0 : x1 - x0;
  const p = new Uint32Array(n);
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) if (A[y * W + x] > MINA) p[byRow ? y - y0 : x - x0]++;
  return p;
};

const rowRuns = mergeTo(runs(prof(0, W, 0, H, true)), rows);
if (rowRuns.length !== rows) throw new Error(`found ${rowRuns.length} rows, wanted ${rows}`);
const cells = [];
rowRuns.forEach((rr, ri) => {
  const n = colsArg[ri] ?? colsArg[0];
  const cr = mergeTo(runs(prof(0, W, rr.s, rr.e + 1, false)), n);
  if (cr.length !== n) throw new Error(`row ${ri}: found ${cr.length} sprites, wanted ${n}`);
  for (const c of cr) cells.push({ x0: c.s, x1: c.e, y0: rr.s, y1: rr.e });
});
if (cells.length !== names.length) throw new Error(`${cells.length} sprites but ${names.length} names`);

const made = [];
for (let k = 0; k < cells.length; k++) {
  let { x0, x1, y0, y1 } = cells[k];
  // tighten to alpha bbox
  let bx0 = x1, bx1 = x0, by0 = y1, by1 = y0;
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (A[y * W + x] > MINA) { if (x < bx0) bx0 = x; if (x > bx1) bx1 = x; if (y < by0) by0 = y; if (y > by1) by1 = y; }
  const w = bx1 - bx0 + 1, h = by1 - by0 + 1;
  const pad = Math.round(Math.max(w, h) * PAD);
  const buf = Buffer.alloc((w + 2 * pad) * (h + 2 * pad) * 4);
  const cw = w + 2 * pad;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const s = ((by0 + y) * W + bx0 + x) * 4;
    // only keep pixels that belong to this cell's column range
    if (bx0 + x < x0 || bx0 + x > x1) continue;
    const d = ((y + pad) * cw + x + pad) * 4;
    buf[d] = px[s]; buf[d + 1] = px[s + 1]; buf[d + 2] = px[s + 2]; buf[d + 3] = px[s + 3];
  }
  const img = sharp(buf, { raw: { width: cw, height: h + 2 * pad, channels: 4 } });
  await img.clone().png().toFile(join(out, names[k] + '.png'));
  await img.clone().webp({ quality: 92, alphaQuality: 100 }).toFile(join(out, names[k] + '.webp'));
  const edge = bx0 <= 1 || by0 <= 1 || bx1 >= W - 2 || by1 >= H - 2;
  made.push({ name: names[k], w: cw, h: h + 2 * pad });
  console.log(`${edge ? 'WARN edge' : 'ok  '} ${names[k]} ${cw}x${h + 2 * pad}`);
}
// contact sheets
const CW = 200, CH = 150, PER = 4;
for (const [label, bg] of [['dark', { r: 32, g: 34, b: 42 }], ['light', { r: 242, g: 230, b: 201 }]]) {
  const rowsN = Math.ceil(made.length / PER);
  const comps = [];
  for (let k = 0; k < made.length; k++) {
    const t = await sharp(join(out, made[k].name + '.png')).resize(CW - 10, CH - 10, { fit: 'inside' }).toBuffer();
    comps.push({ input: t, left: (k % PER) * CW + 5, top: Math.floor(k / PER) * CH + 5 });
  }
  await sharp({ create: { width: CW * PER, height: CH * rowsN, channels: 3, background: bg } }).composite(comps).png().toFile(join(out, `contact-${label}.png`));
}
