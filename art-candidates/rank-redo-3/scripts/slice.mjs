// usage: node slice.mjs raw cols rows key(black|magenta|green) outDir name1,name2,... [maxDim]
import sharp from 'sharp';
import fs from 'node:fs';
const [raw, cols, rows, key, outDir, names, maxDim = '512'] = process.argv.slice(2);
const C = +cols, R = +rows;
fs.mkdirSync(outDir, { recursive: true });
const { data, info } = await sharp(raw).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const W = info.width, H = info.height;
const cw = Math.floor(W / C), ch = Math.floor(H / R);
const list = names.split(',');
function keyAlpha(r, g, b) {
  if (key === 'black') { const m = Math.max(r, g, b); return m; } // additive: alpha=luma, colour stays
  const m = key === 'magenta' ? Math.min(r, b) - g : g - Math.max(r, b);
  return Math.max(0, Math.min(255, (130 - m) * (255 / 70)));
}
let n = 0;
for (let ry = 0; ry < R; ry++) for (let cx = 0; cx < C; cx++) {
  const name = list[n++]; if (!name) continue;
  const INS = +(process.env.INS||2); const x0 = cx * cw + INS, y0 = ry * ch + INS, w = cw - 2*INS, h = ch - 2*INS;
  const buf = Buffer.alloc(w * h * 4);
  let minx = w, miny = h, maxx = -1, maxy = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = ((y0 + y) * W + (x0 + x)) * 4, o = (y * w + x) * 4;
    let r = data[i], g = data[i + 1], b = data[i + 2];
    let a = keyAlpha(r, g, b);
    if (key === 'black') { if (a > 0) { const k = 255 / Math.max(1, a); r = Math.min(255, r * k); g = Math.min(255, g * k); b = Math.min(255, b * k); } if (a < 14) a = 0; }
    else if (a < 255 && a > 0) { // decontaminate: pull away from key colour
      const t = a / 255;
      if (key === 'magenta') { r = Math.max(0, (r - 255 * (1 - t)) / t); b = Math.max(0, (b - 255 * (1 - t)) / t); }
      else { g = Math.max(0, (g - 255 * (1 - t)) / t); }
      r = Math.min(255, r); g = Math.min(255, g); b = Math.min(255, b);
    }
    buf[o] = r; buf[o + 1] = g; buf[o + 2] = b; buf[o + 3] = a;
    if (a > 40) { if (x < minx) minx = x; if (x > maxx) maxx = x; if (y < miny) miny = y; if (y > maxy) maxy = y; }
  }
  if (key !== 'black') {
    // drop stray specks: keep connected components (alpha>40) of at least 3% of the largest one
    const lab = new Int32Array(w * h), sizes = [0];
    let nl = 0;
    for (let y0b = 0; y0b < h; y0b++) for (let x0b = 0; x0b < w; x0b++) {
      const p0 = y0b * w + x0b;
      if (lab[p0] || buf[p0 * 4 + 3] <= 40) continue;
      nl++; let cnt = 0; const st = [p0]; lab[p0] = nl;
      while (st.length) {
        const p = st.pop(); cnt++;
        const px = p % w, py = (p / w) | 0;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) {
          const nx = px + dx, ny = py + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          const q = ny * w + nx;
          if (!lab[q] && buf[q * 4 + 3] > 40) { lab[q] = nl; st.push(q); }
        }
      }
      sizes.push(cnt);
    }
    const big = Math.max(...sizes);
    minx = w; miny = h; maxx = -1; maxy = -1;
    for (let p = 0; p < w * h; p++) {
      if (lab[p] && sizes[lab[p]] < big * 0.03) buf[p * 4 + 3] = 0;
      else if (buf[p * 4 + 3] > 40) { const x = p % w, y = (p / w) | 0; if (x < minx) minx = x; if (x > maxx) maxx = x; if (y < miny) miny = y; if (y > maxy) maxy = y; }
    }
  }
  const bw = maxx - minx + 1, bh = maxy - miny + 1;
  const edge = (minx <= 1 || miny <= 1 || maxx >= w - 2 || maxy >= h - 2);
  const md = +maxDim, s = Math.min(1, md / Math.max(bw, bh));
  const tw = Math.round(bw * s), th = Math.round(bh * s);
  const pad = Math.round(Math.max(tw, th) * 0.06);
  await sharp(buf, { raw: { width: w, height: h, channels: 4 } })
    .extract({ left: minx, top: miny, width: bw, height: bh }).resize(tw, th)
    .extend({ top: pad, bottom: pad, left: pad, right: pad, background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png().toFile(`${outDir}/${name}.png`);
  console.log(name, `${tw}x${th}`, edge ? 'EDGE-TOUCH' : 'ok');
}
