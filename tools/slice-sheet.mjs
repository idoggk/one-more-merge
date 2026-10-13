// Slice a ChatGPT art sheet into clean, trimmed, keyed sprites and run quality gates.
// Usage: node tools/slice-sheet.mjs <sheet.png> --grid 3x2 --key magenta|white|none --out <dir> --names a,b,c,d,e,f
//          [--kind panel|strip|icon|unit|sheet] [--pad 8] [--aspect 4:1 | --aspect 1:1,4:1,...] [--size 128] [--tol 40]
//          [--feather 50] [--coverage 0.02,0.85] [--despeckle 16]
// Per cell: key out the flat colour (tolerance + feather), despeckle (drop tiny opaque components), run the
// cellBorder gate, crop 2 px inward, erode alpha 1 px, replace key-contaminated edge colour with the nearest
// interior colour, trim to the alpha bbox, re-pad, then write <name>.png (2x), <name>.webp (1x), contact sheets
// (contact-dark/light.png), gates.json. Every gate is pass / warn / fail with its measured value and threshold;
// exit code 1 only when a gate fails (warnings still write the files and are flagged).
import sharp from 'sharp';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const INSET = 2; // px cropped inside every cell
const BORDER = 3; // gate: nothing opaque within this many px of the original cell border
const KEYS = { magenta: [255, 0, 255], white: [255, 255, 255] };
const ASPECT_WARN = 0.1; // aspect deviation up to this passes
const ASPECT_FAIL = 0.25; // above this fails; in between warns
// Per-kind gate profiles. `ends`: the two short ends of the object may touch the cell border (ribbons, bars).
const KINDS = {
  sheet: { coverage: [0.02, 0.85], ends: false },
  icon: { coverage: [0.02, 0.85], ends: false },
  unit: { coverage: [0.02, 0.85], ends: false },
  panel: { coverage: [0.03, 0.95], ends: false },
  strip: { coverage: [0.01, 0.9], ends: true },
};

const dist = (r, g, b, k) => Math.hypot(r - k[0], g - k[1], b - k[2]);
const lum = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

/** Gate result: status pass|warn|fail plus the measured value and the threshold it was judged against. */
const gate = (status, value, threshold, detail) => ({ status, pass: status !== 'fail', value, threshold, detail });
/** pass up to `warnAt`, warn up to `failAt`, fail beyond (value judged "lower is better"). */
const graded = (v, warnAt, failAt) => (v <= warnAt ? 'pass' : v <= failAt ? 'warn' : 'fail');

/** Remove opaque (alpha > 16) 8-connected components smaller than minArea; returns how many pixels were cleared. */
function despeckle(out, w, h, minArea) {
  const seen = new Uint8Array(w * h);
  let removed = 0;
  for (let s = 0; s < w * h; s++) {
    if (seen[s] || out[s * 4 + 3] <= 16) continue;
    const comp = [s];
    seen[s] = 1;
    for (let i = 0; i < comp.length; i++) {
      const p = comp[i], x = p % w, y = (p / w) | 0;
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          const n = ny * w + nx;
          if (!seen[n] && out[n * 4 + 3] > 16) { seen[n] = 1; comp.push(n); }
        }
    }
    if (comp.length < minArea) {
      for (const p of comp) out[p * 4 + 3] = 0;
      removed += comp.length;
    }
  }
  return removed;
}

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
  g.corners = gate(cornerOpaque === 0 ? 'pass' : 'fail', cornerOpaque, 0, `${cornerOpaque} opaque corner px`);

  // alpha present: some opaque and some transparent pixels
  let opaque = 0, partial = 0;
  for (let i = 0; i < w * h; i++) { if (a[i] > 128) opaque++; if (a[i] > 0 && a[i] < 255) partial++; }
  g.alpha = gate(opaque > 0 && opaque < w * h ? 'pass' : 'fail', opaque, `0 < opaque < ${w * h}`, `${opaque} opaque, ${partial} partial`);

  // key pixels left (magenta-ish, alpha not negligible)
  if (o.key === 'magenta') {
    let n = 0;
    for (let i = 0; i < w * h; i++) {
      const r = px[i * 4], gg = px[i * 4 + 1], b = px[i * 4 + 2];
      if (a[i] >= 64 && Math.min(r, b) - gg > 60 && dist(r, gg, b, KEYS.magenta) < 110) n++;
    }
    const t = Math.max(2, opaque * 0.001);
    g.keyLeft = gate(n <= t ? 'pass' : 'fail', n, t, `${n} magenta-ish px`);
  } else if (o.key === 'white') {
    let n = 0;
    for (let i = 0; i < w * h; i++) if (a[i] >= 64 && depth[i] <= 2 && px[i * 4] > 245 && px[i * 4 + 1] > 245 && px[i * 4 + 2] > 245) n++;
    const t = Math.max(2, opaque * 0.001);
    g.keyLeft = gate(n <= t ? 'pass' : 'fail', n, t, `${n} white edge px`);
  } else g.keyLeft = gate('pass', 0, 0, 'key none');

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
    // A fringe is the OUTERMOST layer (key bleed) being pale. A designed cream/brass rim sits inside a dark outline,
    // so judge the outermost pixel layer (depth 1) only; the depth 1-3 ring figure is reported for context.
    let o1 = 0, o1l = 0;
    for (let i = 0; i < w * h; i++)
      if (a[i] >= 128 && depth[i] === 1) {
        o1++;
        if (lum(px[i * 4], px[i * 4 + 1], px[i * 4 + 2]) - ref > 60) o1l++;
      }
    const outer = o1 ? o1l / o1 : 0;
    g.halo = gate(graded(outer, 0.04, 0.08), +outer.toFixed(4), 0.04,
      `${(outer * 100).toFixed(1)}% of outermost edge px much lighter than body (warn above 4%, fail above 8%); depth 1-3 ring: ${(light * 100).toFixed(1)}%`);
  } else g.halo = gate('pass', 0, 0.04, 'too small to judge');

  // white in holes: SMALL enclosed near-white opaque blobs (a hole painted white instead of key) whose surround
  // is not white. Large regions (cream/white panel centres) are content, not holes.
  const seen = new Uint8Array(w * h);
  const bb = bbox(px, w, h) ?? { w: 1, h: 1 };
  const minArea = Math.max(6, bb.w * bb.h * 0.015); // below this: specular dots on rivets/gems, not holes
  const maxArea = bb.w * bb.h * 0.1;
  let big = 0;
  let bad = 0;
  const isWhite = (i) => a[i] > 200 && px[i * 4] >= 235 && px[i * 4 + 1] >= 235 && px[i * 4 + 2] >= 235;
  for (let s = 0; s < w * h; s++) {
    if (seen[s] || !isWhite(s)) continue;
    const st = [s]; seen[s] = 1;
    let area = 0, touchesEdge = false;
    let frontier = new Set();
    let rx0 = w, rx1 = 0, ry0 = h, ry1 = 0;
    while (st.length) {
      const p = st.pop(); area++;
      const x = p % w, y = (p / w) | 0;
      if (x < rx0) rx0 = x;
      if (x > rx1) rx1 = x;
      if (y < ry0) ry0 = y;
      if (y > ry1) ry1 = y;
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
    if (area > maxArea || (rx1 - rx0 + 1) > bb.w * 0.4 || (ry1 - ry0 + 1) > bb.h * 0.4) { big++; continue; }
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
  g.whiteInHoles = gate(bad === 0 ? 'pass' : 'fail', bad, 0, `${bad} small enclosed near-white region(s) (size ${minArea.toFixed(0)}-${maxArea.toFixed(0)} px, each side under 40% of the object); ${big} large region(s) ignored as content`);
  return g;
}

/**
 * Programmatic entry. `sheet` is a path or a Buffer. Returns {gates, cells, pass}; writes files when out is given.
 */
export async function sliceSheet(sheet, opts) {
  const o = {
    pad: 8, size: 128, tol: 40, feather: 50, key: 'magenta', kind: 'sheet', ...Object.fromEntries(Object.entries(opts).filter(([, v]) => v !== undefined)),
  };
  const profile = KINDS[o.kind];
  if (!profile) throw new Error(`unknown kind "${o.kind}" (${Object.keys(KINDS).join('|')})`);
  o.coverage ??= profile.coverage;
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
    // despeckle before any gate: a stray near-key pixel or tiny fragment must not trip border/key/white gates
    const speckMin = o.despeckle ?? Math.max(16, Math.round(cw * ch * 0.0002));
    const speckled = despeckle(keyed, cw, ch, speckMin);

    const gates = {};
    // border gate on the full original cell, before the inset crop hides the evidence.
    // Strips (kind strip) may touch the two short ends; the long sides must stay clear.
    let horizontal = true;
    if (profile.ends) {
      const ob = bbox(keyed, cw, ch, 16);
      horizontal = o.aspects?.[o.aspects.length === 1 ? 0 : n] ? o.aspects[o.aspects.length === 1 ? 0 : n] >= 1 : !ob || ob.w >= ob.h;
    }
    let edge = 0;
    for (let y = 0; y < ch; y++)
      for (let x = 0; x < cw; x++) {
        const l = x < BORDER, r = x >= cw - BORDER, t = y < BORDER, b = y >= ch - BORDER;
        const hit = profile.ends ? (horizontal ? t || b : l || r) : l || r || t || b;
        if (hit && keyed[(y * cw + x) * 4 + 3] > 16) edge++;
      }
    gates.cellBorder = gate(edge === 0 ? 'pass' : 'fail', edge, 0,
      `${edge} opaque px within ${BORDER}px of ${profile.ends ? `the ${horizontal ? 'top/bottom' : 'left/right'} border (ends may touch)` : 'cell border'}; despeckle cleared ${speckled} px in components under ${speckMin} px`);

    const w = cw - 2 * INSET, h = ch - 2 * INSET;
    const inner = Buffer.alloc(w * h * 4);
    for (let y = 0; y < h; y++) keyed.copy(inner, y * w * 4, ((y + INSET) * cw + INSET) * 4, ((y + INSET) * cw + INSET + w) * 4);
    erode(inner, w, h);
    decontaminate(inner, w, h, key);

    const bb = bbox(inner, w, h);
    if (!bb) {
      gates.empty = gate('fail', 0, 1, 'no opaque pixels after keying');
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
    const [cLo, cHi] = o.coverage;
    const covStatus = cov >= cLo && cov <= cHi ? 'pass' : cov >= cLo / 2 && cov <= Math.min(1, cHi + 0.1) ? 'warn' : 'fail';
    gates.coverage = gate(covStatus, +cov.toFixed(4), `${cLo}-${cHi} (warn down to ${cLo / 2} and up to ${Math.min(1, cHi + 0.1).toFixed(2)})`, `${cov.toFixed(3)} of the cell`);
    if (wanted) {
      const ar = bb.w / bb.h;
      const dev = Math.abs(ar - wanted) / wanted;
      gates.aspect = gate(graded(dev, ASPECT_WARN, ASPECT_FAIL), +ar.toFixed(3), `${wanted.toFixed(3)} +-${ASPECT_WARN * 100}% pass, +-${ASPECT_FAIL * 100}% warn`,
        `object ${ar.toFixed(3)} vs requested ${wanted.toFixed(3)} (${(dev * 100).toFixed(1)}% off)`);
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

  const statusOf = (gs) => (Object.values(gs).some((g) => g.status === 'fail') ? 'fail' : Object.values(gs).some((g) => g.status === 'warn') ? 'warn' : 'pass');
  const names2 = (gs, st) => Object.entries(gs).filter(([, g]) => g.status === st).map(([k]) => k);
  const report = {
    sheet: typeof sheet === 'string' ? sheet : '(buffer)',
    grid: `${cols}x${rows}`, key: o.key, kind: o.kind,
    pass: cells.every((c) => statusOf(c.gates) !== 'fail'),
    status: statusOf(Object.fromEntries(cells.flatMap((c) => Object.entries(c.gates).map(([k, g]) => [`${c.name}.${k}`, g])))),
    cells: cells.map((c) => ({
      name: c.name, status: statusOf(c.gates), pass: statusOf(c.gates) !== 'fail', gates: c.gates,
      failed: names2(c.gates, 'fail'), warned: names2(c.gates, 'warn'), flags: names2(c.gates, 'warn').map((k) => `${k}-warn`),
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
    const failed = Object.values(c.gates).some((g) => g.status === 'fail');
    const warned = !failed && Object.values(c.gates).some((g) => g.status === 'warn');
    const fill = failed ? '#e0202a' : warned ? '#d08a00' : dark ? '#dddddd' : '#222222';
    const label = `<svg width="${T}" height="${L}"><text x="${T / 2}" y="16" font-family="sans-serif" font-size="14" text-anchor="middle" fill="${fill}">${c.name}${failed ? ' FAIL' : warned ? ' WARN' : ''}</text></svg>`;
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
    coverage: a.coverage?.split(',').map(Number), aspects, kind: a.kind, despeckle: a.despeckle ? Number(a.despeckle) : undefined,
  });
  for (const c of res.cells) {
    const tag = c.status === 'pass' ? 'ok  ' : c.status === 'warn' ? 'WARN' : 'FAIL';
    const list = [...c.failed, ...c.warned].map((k) => `${k} ${c.gates[k].status} (${c.gates[k].detail})`);
    console.log(`${tag} ${c.name}${list.length ? '  gates: ' + list.join('; ') : ''}`);
  }
  console.log(res.pass ? (res.status === 'warn' ? 'no gate failed (warnings, see gates.json)' : 'all gates passed') : 'GATES FAILED, see gates.json');
  process.exit(res.pass ? 0 : 1);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
