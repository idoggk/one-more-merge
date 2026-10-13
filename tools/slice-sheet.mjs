// Slice a ChatGPT art sheet into clean, trimmed, keyed sprites and run quality gates.
// Usage: node tools/slice-sheet.mjs <sheet.png> --grid 3x2 --key magenta|white|none --out <dir> --names a,b,c,d,e,f
//          [--pad 8] [--aspect 4:1 | --aspect 1:1,4:1,...] [--size 128] [--tol 40] [--feather 50] [--coverage 0.02,0.85]
// Per cell: crop 2 px inward, key out the flat colour (tolerance + feather), erode alpha 1 px, replace
// key-contaminated edge colour with the nearest interior colour, trim to the alpha bbox, re-pad, then write
// <name>.png (2x), <name>.webp (1x), contact sheets (contact-dark/light.png), gates.json. Exit 1 if any gate fails.
import sharp from 'sharp';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const INSET = 2; // px cropped inside every cell
const BORDER = 3; // gate: nothing opaque within this many px of the original cell border
const KEYS = { magenta: [255, 0, 255], white: [255, 255, 255] };

const dist = (r, g, b, k) => Math.hypot(r - k[0], g - k[1], b - k[2]);
const lum = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

/** Manhattan distance (4-neighbour BFS) of every pixel with alpha >= 128 from the nearest pixel below 128. */
function depthMap(a, w, h) {
  const d = new Int16Array(w * h).fill(-1);
  const q = [];
  for (let i = 0; i < w * h; i++) if (a[i] < 128) { d[i] = 0; q.push(i); }
  for (let qi = 0; qi < q.length; qi++) {
    const p = q[qi], x = p % w, y = (p / w) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const n = ny * w + nx;
      if (d[n] < 0) { d[n] = d[p] + 1; q.push(n); }
    }
  }
  return d;
}

/** Key colour to alpha. Returns RGBA copy; alpha ramps from 0 (<= tol) to 255 (>= tol + feather). */
function keyOut(rgba, key, tol, feather) {
  const out = Buffer.from(rgba);
  if (!key) return out;
  for (let i = 0; i < out.length; i += 4) {
    const d = dist(out[i], out[i + 1], out[i + 2], key);
    const k = Math.min(1, Math.max(0, (d - tol) / feather));
    out[i + 3] = Math.round(out[i + 3] * k);
  }
  return out;
}

/** 3x3 cross min filter on alpha. */
function erode(out, w, h) {
  const a = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) a[i] = out[i * 4 + 3];
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      let m = a[y * w + x];
      if (x > 0) m = Math.min(m, a[y * w + x - 1]);
      else m = 0;
      if (x < w - 1) m = Math.min(m, a[y * w + x + 1]);
      else m = 0;
      if (y > 0) m = Math.min(m, a[(y - 1) * w + x]);
      else m = 0;
      if (y < h - 1) m = Math.min(m, a[(y + 1) * w + x]);
      else m = 0;
      out[(y * w + x) * 4 + 3] = m;
    }
}

/** Replace key-contaminated colour of pixels within 2 px of the silhouette by the nearest interior (depth >= 3) colour. */
function decontaminate(out, w, h, key) {
  if (!key) return;
  const a = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) a[i] = out[i * 4 + 3];
  const d = depthMap(a, w, h);
  const src = new Int32Array(w * h).fill(-1);
  const q = [];
  for (let i = 0; i < w * h; i++) if (d[i] >= 3) { src[i] = i; q.push(i); }
  if (!q.length) return;
  for (let qi = 0; qi < q.length; qi++) {
    const p = q[qi], x = p % w, y = (p / w) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const n = ny * w + nx;
      if (src[n] < 0 && out[n * 4 + 3] > 0 && d[n] < 3) { src[n] = src[p]; q.push(n); }
    }
  }
  for (let i = 0; i < w * h; i++)
    // only recolour pixels that lean towards the key more than the interior does; dark outlines stay
    if (d[i] < 3 && src[i] >= 0 && dist(out[i * 4], out[i * 4 + 1], out[i * 4 + 2], key) < dist(out[src[i] * 4], out[src[i] * 4 + 1], out[src[i] * 4 + 2], key) - 25) {
      out[i * 4] = out[src[i] * 4];
      out[i * 4 + 1] = out[src[i] * 4 + 1];
      out[i * 4 + 2] = out[src[i] * 4 + 2];
    }
}

function bbox(out, w, h, thr = 8) {
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      if (out[(y * w + x) * 4 + 3] > thr) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
  return x1 < 0 ? null : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

/** Gates that look at the final (trimmed, padded) sprite. Returns {name: {pass, detail}}. */
function spriteGates(px, w, h, o) {
  const g = {};
  const A = (x, y) => px[(y * w + x) * 4 + 3];
  const a = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) a[i] = px[i * 4 + 3];
  const depth = depthMap(a, w, h);

  // corners transparent
  const c = Math.max(2, Math.round(Math.min(w, h) * 0.02));
  let cornerOpaque = 0;
  for (const [cx, cy] of [[0, 0], [w - c, 0], [0, h - c], [w - c, h - c]])
    for (let y = cy; y < cy + c; y++) for (let x = cx; x < cx + c; x++) if (A(x, y) > 8) cornerOpaque++;
  g.corners = { pass: cornerOpaque === 0, detail: `${cornerOpaque} opaque corner px` };

  // alpha present: some opaque and some transparent pixels
  let opaque = 0, partial = 0;
  for (let i = 0; i < w * h; i++) { if (a[i] > 128) opaque++; if (a[i] > 0 && a[i] < 255) partial++; }
  g.alpha = { pass: opaque > 0 && opaque < w * h, detail: `${opaque} opaque, ${partial} partial` };

  // key pixels left (magenta-ish, alpha not negligible)
  if (o.key === 'magenta') {
    let n = 0;
    for (let i = 0; i < w * h; i++) {
      const r = px[i * 4], gg = px[i * 4 + 1], b = px[i * 4 + 2];
      if (a[i] >= 64 && Math.min(r, b) - gg > 60 && dist(r, gg, b, KEYS.magenta) < 110) n++;
    }
    g.keyLeft = { pass: n <= Math.max(2, opaque * 0.001), detail: `${n} magenta-ish px` };
  } else if (o.key === 'white') {
    let n = 0;
    for (let i = 0; i < w * h; i++) if (a[i] >= 64 && depth[i] <= 2 && px[i * 4] > 245 && px[i * 4 + 1] > 245 && px[i * 4 + 2] > 245) n++;
    g.keyLeft = { pass: n <= Math.max(2, opaque * 0.001), detail: `${n} white edge px` };
  } else g.keyLeft = { pass: true, detail: 'key none' };

  // halo: edge ring clearly lighter than the object's own deep band
  let maxDepth = 0;
  for (let i = 0; i < w * h; i++) if (depth[i] > maxDepth) maxDepth = depth[i];
  const deep = [], ring = [];
  for (let i = 0; i < w * h; i++) {
    if (a[i] < 128) continue;
    const l = lum(px[i * 4], px[i * 4 + 1], px[i * 4 + 2]);
    if (depth[i] >= maxDepth * 0.5) deep.push(l);
    else if (depth[i] >= 1 && depth[i] <= 3) ring.push(l);
  }
  if (deep.length && ring.length) {
    deep.sort((x, y) => x - y);
    const ref = deep[deep.length >> 1];
    const light = ring.filter((l) => l - ref > 60).length / ring.length;
    g.halo = { pass: light <= 0.04, detail: `${(light * 100).toFixed(1)}% of edge px much lighter than body` };
  } else g.halo = { pass: true, detail: 'too small to judge' };

  // white in holes: enclosed near-white opaque blobs that are not at the silhouette and whose surround is not white
  const seen = new Uint8Array(w * h);
  const bb = bbox(px, w, h) ?? { w: 1, h: 1 };
  const minArea = Math.max(6, bb.w * bb.h * 0.002);
  let bad = 0;
  const isWhite = (i) => a[i] > 200 && px[i * 4] >= 235 && px[i * 4 + 1] >= 235 && px[i * 4 + 2] >= 235;
  for (let s = 0; s < w * h; s++) {
    if (seen[s] || !isWhite(s)) continue;
    const st = [s]; seen[s] = 1;
    let area = 0, touchesEdge = false;
    let frontier = new Set();
    while (st.length) {
      const p = st.pop(); area++;
      const x = p % w, y = (p / w) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) { touchesEdge = true; continue; }
        const n = ny * w + nx;
        if (isWhite(n)) { if (!seen[n]) { seen[n] = 1; st.push(n); } }
        else if (a[n] < 128) touchesEdge = true;
        else frontier.add(n);
      }
    }
    if (touchesEdge || area < minArea || !frontier.size) continue;
    // walk 3 px outward through non-white opaque pixels so antialiasing does not hide the neighbour colour
    const visited = new Set(frontier);
    for (let step = 0; step < 3; step++) {
      const next = new Set();
      for (const p of frontier) {
        const x = p % w, y = (p / w) | 0;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          const n = ny * w + nx;
          if (!visited.has(n) && !seen[n] && a[n] >= 128 && !isWhite(n)) { visited.add(n); next.add(n); }
        }
      }
      if (!next.size) break;
      frontier = next;
    }
    let sum = 0;
    for (const p of frontier) sum += lum(px[p * 4], px[p * 4 + 1], px[p * 4 + 2]);
    if (sum / frontier.size < 200) bad++;
  }
  g.whiteInHoles = { pass: bad === 0, detail: `${bad} enclosed near-white region(s)` };
  return g;
}

/**
 * Programmatic entry. `sheet` is a path or a Buffer. Returns {gates, cells, pass}; writes files when out is given.
 */
export async function sliceSheet(sheet, opts) {
  const o = {
    pad: 8, size: 128, tol: 40, feather: 50, coverage: [0.02, 0.85], key: 'magenta', ...Object.fromEntries(Object.entries(opts).filter(([, v]) => v !== undefined)),
  };
  const [cols, rows] = o.grid;
  const key = o.key === 'none' ? null : KEYS[o.key];
  if (o.key !== 'none' && !key) throw new Error(`unknown key "${o.key}"`);
  const names = o.names ?? Array.from({ length: cols * rows }, (_, i) => `cell_${i + 1}`);
  if (names.length !== cols * rows) throw new Error(`need ${cols * rows} names, got ${names.length}`);
  const aspects = names.map((_, i) => (o.aspects ? o.aspects[o.aspects.length === 1 ? 0 : i] : undefined));

  const { data, info } = await sharp(sheet).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const cw = Math.floor(info.width / cols), ch = Math.floor(info.height / rows);
  if (o.out) mkdirSync(o.out, { recursive: true });
  const cells = [];
  for (let n = 0; n < names.length; n++) {
    const ox = (n % cols) * cw, oy = Math.floor(n / cols) * ch;
    const raw = Buffer.alloc(cw * ch * 4);
    for (let y = 0; y < ch; y++) data.copy(raw, y * cw * 4, ((oy + y) * info.width + ox) * 4, ((oy + y) * info.width + ox + cw) * 4);
    const keyed = keyOut(raw, key, o.tol, o.feather);

    const gates = {};
    // border gate on the full original cell, before the inset crop hides the evidence
    let edge = 0;
    for (let y = 0; y < ch; y++)
      for (let x = 0; x < cw; x++)
        if ((x < BORDER || y < BORDER || x >= cw - BORDER || y >= ch - BORDER) && keyed[(y * cw + x) * 4 + 3] > 16) edge++;
    gates.cellBorder = { pass: edge === 0, detail: `${edge} opaque px within ${BORDER}px of cell border` };

    const w = cw - 2 * INSET, h = ch - 2 * INSET;
    const inner = Buffer.alloc(w * h * 4);
    for (let y = 0; y < h; y++) keyed.copy(inner, y * w * 4, ((y + INSET) * cw + INSET) * 4, ((y + INSET) * cw + INSET + w) * 4);
    erode(inner, w, h);
    decontaminate(inner, w, h, key);

    const bb = bbox(inner, w, h);
    if (!bb) {
      gates.empty = { pass: false, detail: 'no opaque pixels after keying' };
      cells.push({ name: names[n], gates });
      continue;
    }
    const long = Math.max(bb.w, bb.h);
    const pad = Math.round((long * o.pad) / 100);
    const wanted = aspects[n];
    const aspect = wanted ?? 1;
    let solid = 0;
    for (let i = 3; i < inner.length; i += 4) if (inner[i] > 128) solid++;
    const cov = solid / (w * h);
    gates.coverage = { pass: cov >= o.coverage[0] && cov <= o.coverage[1], detail: `${cov.toFixed(3)} of the cell (range ${o.coverage.join('-')})` };
    if (wanted) {
      const ar = bb.w / bb.h;
      gates.aspect = { pass: Math.abs(ar - wanted) / wanted <= 0.1, detail: `object ${ar.toFixed(3)} vs requested ${wanted.toFixed(3)}` };
    }
    // canvas: object bbox + pad on all sides, grown to the requested aspect
    let W = bb.w + 2 * pad, H = bb.h + 2 * pad;
    if (W / H < aspect) W = Math.ceil(H * aspect);
    else H = Math.ceil(W / aspect);
    const trimmed = await sharp(inner, { raw: { width: w, height: h, channels: 4 } })
      .extract({ left: bb.x, top: bb.y, width: bb.w, height: bb.h }).png().toBuffer();
    const canvas = await sharp({ create: { width: W, height: H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
      .composite([{ input: trimmed, left: Math.floor((W - bb.w) / 2), top: Math.floor((H - bb.h) / 2) }]).png().toBuffer();
    // output: long side = size*2 for PNG (2x), size for WebP (1x)
    const fit = (s) => (W >= H ? { width: s } : { height: s });
    const png2 = await sharp(canvas).resize({ ...fit(o.size * 2), kernel: 'lanczos3' }).png().toBuffer();
    const webp1 = await sharp(canvas).resize({ ...fit(o.size), kernel: 'lanczos3' }).webp({ quality: 90, alpha: 90 }).toBuffer();

    const fin = await sharp(png2).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    Object.assign(gates, spriteGates(fin.data, fin.info.width, fin.info.height, o));
    if (o.out) {
      writeFileSync(join(o.out, `${names[n]}.png`), png2);
      writeFileSync(join(o.out, `${names[n]}.webp`), webp1);
    }
    cells.push({ name: names[n], gates, png: png2, width: fin.info.width, height: fin.info.height });
  }

  const report = {
    sheet: typeof sheet === 'string' ? sheet : '(buffer)',
    grid: `${cols}x${rows}`, key: o.key,
    pass: cells.every((c) => Object.values(c.gates).every((g) => g.pass)),
    cells: cells.map((c) => ({
      name: c.name, pass: Object.values(c.gates).every((g) => g.pass), gates: c.gates,
      failed: Object.entries(c.gates).filter(([, g]) => !g.pass).map(([k]) => k),
    })),
  };
  if (o.out) {
    writeFileSync(join(o.out, 'gates.json'), JSON.stringify(report, null, 2));
    for (const [tag, bg] of [['dark', '#20222a'], ['light', '#f2e6c9']]) await contactSheet(cells, join(o.out, `contact-${tag}.png`), bg, tag === 'dark');
  }
  return { ...report, cellsRaw: cells };
}

/** Labelled contact sheet; failed cells get a red label. */
async function contactSheet(cells, file, bg, dark) {
  const T = 200, L = 22, cols = Math.min(cells.length, 4), rows = Math.ceil(cells.length / cols);
  const layers = [];
  for (let i = 0; i < cells.length; i++) {
    const c = cells[i], x = (i % cols) * T, y = Math.floor(i / cols) * (T + L);
    const ok = Object.values(c.gates).every((g) => g.pass);
    const fill = ok ? (dark ? '#dddddd' : '#222222') : '#e0202a';
    const label = `<svg width="${T}" height="${L}"><text x="${T / 2}" y="16" font-family="sans-serif" font-size="14" text-anchor="middle" fill="${fill}">${c.name}${ok ? '' : ' FAIL'}</text></svg>`;
    layers.push({ input: Buffer.from(label), left: x, top: y + T });
    if (c.png) {
      const img = await sharp(c.png).resize(T - 16, T - 16, { fit: 'inside' }).png().toBuffer();
      const m = await sharp(img).metadata();
      layers.push({ input: img, left: x + Math.floor((T - m.width) / 2), top: y + Math.floor((T - m.height) / 2) });
    }
  }
  await sharp({ create: { width: cols * T, height: rows * (T + L), channels: 4, background: bg } }).composite(layers).png().toFile(file);
}

function parseArgs(argv) {
  const a = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) a[argv[i].slice(2)] = argv[++i];
    else a._.push(argv[i]);
  }
  return a;
}

async function main() {
  const a = parseArgs(process.argv.slice(2));
  if (!a._[0] || !a.grid || !a.out) {
    console.error('usage: node tools/slice-sheet.mjs <sheet.png> --grid 3x2 --key magenta|white|none --out <dir> --names a,b,c [--pad 8] [--aspect 4:1] [--size 128]');
    process.exit(2);
  }
  const [cols, rows] = a.grid.split('x').map(Number);
  const aspects = a.aspect?.split(',').map((s) => { const [p, q] = s.split(':').map(Number); return p / q; });
  const res = await sliceSheet(resolve(a._[0]), {
    grid: [cols, rows], key: a.key ?? 'magenta', out: resolve(a.out), names: a.names?.split(','),
    pad: a.pad ? Number(a.pad) : undefined, size: a.size ? Number(a.size) : undefined,
    tol: a.tol ? Number(a.tol) : undefined, feather: a.feather ? Number(a.feather) : undefined,
    coverage: a.coverage?.split(',').map(Number), aspects,
  });
  for (const c of res.cells) console.log(`${c.pass ? 'ok  ' : 'FAIL'} ${c.name}${c.failed.length ? '  gates: ' + c.failed.map((k) => `${k} (${c.gates[k].detail})`).join('; ') : ''}`);
  console.log(res.pass ? 'all gates passed' : 'GATES FAILED, see gates.json');
  process.exit(res.pass ? 0 : 1);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
