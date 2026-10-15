const USAGE = `usage: node tools/kit.mjs raw.png key(magenta|green|alpha) cropX0,cropY0,cropX1,cropY1 chapterPrefix outDir roadW [srcIsVertical=0]
Takes ONE straight road strip (crop) from a keyed sheet and derives all 12 pieces in 512x512 cells (v6).
env: DOM=25 magenta dominance threshold, PEEL=4 peel passes (0 = v4 behaviour), SYM=0 off, COLMATCH=1 on.
v6 per-chapter fixes (all default off = v5 output):
  CHEVRON=0.75   T/cross centre: extend the tread into the kerb rows along the chevron slope (dx per dy) instead of mirroring it.
  GRIDP=50.25    checker pitch (out px), with GRIDT0=27 (tread start across the road), GRIDE0=2.9 (first cell edge along u):
                 curves skip whole cells per ring (square cells, same ends as the straights), S curves use perpendicular
                 coordinates (no shear; SAMP=0.17 is the bump height / 512, lower it for a rounder inner bend),
                 T/cross centre repeats the rows (+-2 rows) instead of mirroring.
  INLAY=8        dead end: half thickness (px) of the centre inlay line; it tapers out over INLAYLEN=90 px and ends at the cap start.`;
import sharp from 'sharp';
import fs from 'fs';
if (process.argv.length < 8 || process.argv.includes('--help') || process.argv.includes('-h')) { console.log(USAGE); process.exit(process.argv.includes('--help') || process.argv.includes('-h') ? 0 : 1); }
const [raw, key, cropS, prefix, outDir, roadWs, isV] = process.argv.slice(2);
const [cx0, cy0, cx1, cy1] = cropS.split(',').map(Number);
const ROADW = Number(roadWs);
const CELL = 512, HW = ROADW / 2, MID = CELL / 2;

// ---- load + key the crop
let img = sharp(raw).extract({ left: cx0, top: cy0, width: cx1 - cx0, height: cy1 - cy0 });
if (isV === '1') img = img.rotate(90); // vertical source: rotate so chevrons/flow run along +x like a horizontal strip
const { data, info } = await img.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const SW = info.width, SH = info.height;
const src = new Float32Array(SW * SH * 4);
for (let i = 0; i < SW * SH; i++) {
  const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2];
  if (key === 'alpha') { const a0 = data[i*4+3]/255; src[i*4]=data[i*4]*a0; src[i*4+1]=data[i*4+1]*a0; src[i*4+2]=data[i*4+2]*a0; src[i*4+3]=a0; continue; }
  const d = key === 'magenta' ? Math.hypot(255 - r, g, 255 - b) : Math.hypot(r, 255 - g, b);
  const a = d < 70 ? 0 : d > 140 ? 1 : (d - 70) / 70;
  let R = r, G = g, B = b;
  if (a < 1 && a > 0) { if (key === 'magenta') { const e = Math.max(0, Math.min(r, b) - g); R = Math.max(0, r - e); B = Math.max(0, b - e); } else { G = Math.min(g, Math.max(r, b)); } }
  src[i * 4] = R * a; src[i * 4 + 1] = G * a; src[i * 4 + 2] = B * a; src[i * 4 + 3] = a; // premultiplied
}
// v5: magenta ring fix. The strip border is a 1 px blend of the key colour and the dark outline (e.g. 138,24,111).
// Its distance to magenta is above the key threshold, so v4 kept it opaque. Peel contiguous magenta-dominant
// pixels (min(R,B) - G > DOM) that touch keyed-out pixels (PEEL passes), then despill what is left near the edge.
// scale reference: band rows BEFORE the peel, so the content scale and phase stay identical to v4 (only the border changes)
let b0o = SH, b1o = -1;
for (let y = 0; y < SH; y++) { let c = 0; for (let x = 0; x < SW; x++) if (src[(y * SW + x) * 4 + 3] > 0.5) c++; if (c > SW * 0.5) { if (y < b0o) b0o = y; if (y > b1o) b1o = y; } }
const DOM = Number(process.env.DOM ?? 25), PEEL = Number(process.env.PEEL ?? 4);
if (key === 'magenta' && PEEL > 0) {
  const dom = (i) => Math.min(data[i * 4], data[i * 4 + 2]) - data[i * 4 + 1];
  const gone = (i) => i < 0 || src[i * 4 + 3] <= 0.001; // index -1 = outside the crop = key colour
  const nb = (x, y) => [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]].map(([a, b]) => (a >= 0 && b >= 0 && a < SW && b < SH ? b * SW + a : -1));
  let peeled = 0;
  for (let pass = 0; pass < PEEL; pass++) {
    const kill = [];
    for (let y = 0; y < SH; y++) for (let x = 0; x < SW; x++) { const i = y * SW + x; if (gone(i) || dom(i) <= DOM) continue; if (nb(x, y).some(gone)) kill.push(i); }
    for (const i of kill) { src[i * 4] = src[i * 4 + 1] = src[i * 4 + 2] = src[i * 4 + 3] = 0; }
    peeled += kill.length;
  }
  // despill: opaque pixels within 2 px of a gone pixel lose their magenta excess (keep green channel)
  let dist = new Int16Array(SW * SH).fill(99);
  for (let i = 0; i < SW * SH; i++) if (gone(i)) dist[i] = 0;
  for (let pass = 1; pass <= 2; pass++) for (let y = 0; y < SH; y++) for (let x = 0; x < SW; x++) { const i = y * SW + x; if (dist[i] === 99 && nb(x, y).some(j => dist[j] === pass - 1)) dist[i] = pass; }
  let spilled = 0;
  for (let i = 0; i < SW * SH; i++) if (dist[i] <= 2 && dist[i] > 0 && !gone(i)) {
    const a = src[i * 4 + 3], g = src[i * 4 + 1] / a, r = src[i * 4] / a, b = src[i * 4 + 2] / a, e = Math.min(r, b) - g;
    if (e > 8) { src[i * 4] = (r - (e - 8)) * a; src[i * 4 + 2] = (b - (e - 8)) * a; spilled++; }
  }
  console.log('magenta ring: peeled', peeled, 'despilled', spilled);
}
// band rows (alpha>0.5 in a middle column range)
let b0 = SH, b1 = -1;
for (let y = 0; y < SH; y++) { let c = 0; for (let x = 0; x < SW; x++) if (src[(y * SW + x) * 4 + 3] > 0.5) c++; if (c > SW * 0.5) { if (y < b0) b0 = y; if (y > b1) b1 = y; } }
let sx0 = SW, sx1 = -1;
for (let x = 0; x < SW; x++) { let c = 0; for (let y = b0; y <= b1; y++) if (src[(y * SW + x) * 4 + 3] > 0.5) c++; if (c > (b1 - b0) * 0.8) { if (x < sx0) sx0 = x; if (x > sx1) sx1 = x; } }
sx0 += 3; sx1 -= 3; // avoid ragged ends
const bandH = b1o - b0o + 1, sLen = sx1 - sx0;
const k = ROADW / bandH; // output px per source px
const len = sLen * k;
console.log('strip band rows', b0, b1, 'bandH', bandH, 'len(out)', Math.round(len), 'scale', k.toFixed(3));
function px(x, y) { x = Math.max(0, Math.min(SW - 1, x)); y = Math.max(0, Math.min(SH - 1, y)); return (y * SW + x) * 4; }
// strip sampler: u = along (out px), v = across (out px from top rim edge); returns premult rgba; u mirror-tiled
function S(u, v, o) {
  // b3: loop (no mirror, so no X fold): period PER, first F px crossfaded with the px one period later
  // b4: output period is always exactly CELL (straights repeat onto themselves); a short strip is stretched along u (SR < 1)
  const p = (((u % CELL) + CELL) % CELL) * SR;
  const v0 = v; if (v > ROADW / 2 && SYM) v = ROADW - v; // b4: tread is mirror-symmetric across the road so every curve end matches the straight's profile
  const fy = Math.max(b0, Math.min(b1, b0o + v / k));
  if (p < F) {
    samp(p, fy, o); samp(p + PER, fy, tmp2); const t = p / F;
    for (let c = 0; c < 4; c++) o[c] = tmp2[c] * (1 - t) + o[c] * t;
  } else samp(p, fy, o);
  // v5: past the road edge the sampler used to clamp to the crop's border row (the magenta key pixel) for 4 px = the ring.
  // Now the band is clamped to its own outermost rows and the silhouette feathers out over 2 px.
  const w = v0 < 0 ? Math.max(0, 1 + v0 / 1.5) : v0 > ROADW ? Math.max(0, 1 - (v0 - ROADW) / 1.5) : 1;
  if (w < 1) { for (let c = 0; c < 4; c++) o[c] *= w; }
}
const SYM = process.env.SYM !== '0', F = 64, tmp2 = [0, 0, 0, 0];
const SR = Math.min(1, (len - F) / CELL), PER = CELL * SR; // source period (out px); crossfade partner sits one period later
console.log('period stretch', (1 / SR).toFixed(3), 'sym', SYM);
function samp(p, fy, o) {
  const fx = sx0 + p / k;
  const x0 = Math.floor(fx), y0 = Math.floor(fy), tx = fx - x0, ty = fy - y0;
  for (let c = 0; c < 4; c++) {
    o[c] = src[px(x0, y0) + c] * (1 - tx) * (1 - ty) + src[px(x0 + 1, y0) + c] * tx * (1 - ty) + src[px(x0, y0 + 1) + c] * (1 - tx) * ty + src[px(x0 + 1, y0 + 1) + c] * tx * ty;
  }
}
const rim = Math.round(ROADW * 0.2);
// v6 options (all off by default)
const CHEVRON = Number(process.env.CHEVRON ?? 0), GRIDP = Number(process.env.GRIDP ?? 0), GRIDT0 = Number(process.env.GRIDT0 ?? 27);
const INLAY = Number(process.env.INLAY ?? 0), INLAYLEN = Number(process.env.INLAYLEN ?? 90);
// GRIDP: cell pitch of the checker (out px), GRIDE0 = u of the first cell edge, tread rows start at GRIDT0 across the road.
// Arcs keep u running 0..CELL (both ends equal the straights, loop crossfade included) but, per row ring, skip an even number of
// whole cells at a cell edge in the middle, so the cells along the arc are about as long as they are wide (no wedges, no shear).
// Skipping an even number of cells keeps the checker parity, and a jump from one edge to another edge is invisible.
const GRIDE0 = Number(process.env.GRIDE0 ?? 2.9), SAMP = Number(process.env.SAMP ?? 0.17);
const gridRows = GRIDP ? Math.round((ROADW - 2 * GRIDT0) / GRIDP) : 0;
function arcU(ph, v) {
  if (!GRIDP) return ph * (2 / Math.PI) * CELL;
  const row = Math.max(0, Math.min(gridRows - 1, Math.floor((v - GRIDT0) / GRIDP)));
  const r = MID - HW + GRIDT0 + (row + 0.5) * GRIDP; // ring radius at the row centre
  const len = (Math.PI / 2) * r;
  const skip = 2 * GRIDP * Math.max(0, Math.round((CELL - len) / (2 * GRIDP)));
  const sigma = (CELL - skip) / len; // u per arc px on the kept part (about 1)
  const cut = GRIDE0 + GRIDP * Math.round((sigma * len / 2 - GRIDE0) / GRIDP); // a cell edge near the middle
  const u1 = sigma * r * ph;
  return u1 < cut ? u1 : u1 + skip;
}
// across-road coordinate for the centre of a T or cross, where there is no kerb (v5 reflected it, which flips chevrons and resizes cells)
function openCentre(vAcross, u) {
  if (GRIDP) return { v: vAcross < GRIDT0 ? vAcross + 2 * GRIDP : vAcross > ROADW - GRIDT0 ? vAcross - 2 * GRIDP : vAcross, u };
  if (CHEVRON) { // continue each chevron arm diagonally: clamp across, slide along by slope x distance
    const lo = rim + 16, hi = ROADW - rim - 16, v = Math.max(lo, Math.min(hi, vAcross));
    return { v, u: u + CHEVRON * Math.abs(vAcross - v) };
  }
  return null;
}
function newCell() { return new Float32Array(CELL * CELL * 4); }
function over(buf, x, y, c, w = 1) { const i = (y * CELL + x) * 4; const a = c[3] * w; for (let j = 0; j < 4; j++) buf[i + j] = c[j] * w + buf[i + j] * (1 - a); }
const tmp = [0, 0, 0, 0];
// painters
function hStrip(buf, x0, x1, uOff = 0) { for (let y = 0; y < CELL; y++) for (let x = x0; x < x1; x++) { const v = y + 0.5 - (MID - HW); if (v < -4 || v > ROADW + 4) continue; S(x + uOff, v, tmp); if (tmp[3] > 0) over(buf, x, y, tmp); } }
// vertical strip: flow upward (u = CELL - y)
function vStrip(buf, y0, y1, xMin = -1, xMax = 99999, soft = 0) { for (let y = y0; y < y1; y++) for (let x = 0; x < CELL; x++) { if (x < xMin || x > xMax) continue; const v = x + 0.5 - (MID - HW); if (v < -4 || v > ROADW + 4) continue; S(CELL - y, v, tmp); if (tmp[3] > 0) { let w = 1; if (soft) { const e = Math.min(y - y0, y1 - 1 - y); w = e >= soft ? 1 : e / soft; } over(buf, x, y, tmp, w); } } }
function arc(buf, cxc, cyc, a0dir) { // quarter ring around corner (cxc,cyc) between the two edge midpoints
  const R = MID; for (let y = 0; y < CELL; y++) for (let x = 0; x < CELL; x++) {
    const dx = x + 0.5 - cxc, dy = y + 0.5 - cyc; const r = Math.hypot(dx, dy); const v = r - R + HW; if (v < -4 || v > ROADW + 4) continue;
    // angle measured from the horizontal-edge end, folded to [0,pi/2]
    const ph = Math.atan2(Math.abs(dy), Math.abs(dx)); // 0 at horizontal-axis end, pi/2 at vertical-axis end
    S(arcU(ph, v), v, tmp); /* quarter turn = one period (v6 GRIDP: whole cells per ring) */ if (tmp[3] > 0) over(buf, x, y, tmp);
  }
}
const pieces = {};
// straights
{ const b = newCell(); hStrip(b, 0, CELL); pieces.straight_h = b; }
{ const b = newCell(); vStrip(b, 0, CELL); pieces.straight_v = b; }
// curves: arc centre at the corner of the cell
{ const b = newCell(); arc(b, CELL, 0); pieces.curve_ne = b; }   // top <-> right
{ const b = newCell(); arc(b, 0, 0); pieces.curve_nw = b; }       // top <-> left
{ const b = newCell(); arc(b, CELL, CELL); pieces.curve_se = b; } // bottom <-> right
{ const b = newCell(); arc(b, 0, CELL); pieces.curve_sw = b; }    // bottom <-> left
// s-curves (zero slope at both ends, bump A)
const A = Math.round(CELL * SAMP);
// v6 GRIDP: perpendicular coordinates (nearest centre line point, arc length as u) so squares stay squares instead of shearing
function sCurvePerp(vert) {
  const b = newCell(), N = 2048, ofs = (t) => -A * (1 - Math.cos(2 * Math.PI * t)) / 2 * (vert ? -1 : 1);
  const cp = [], cq = [], cs = [0]; // centre line in (along p, across q)
  for (let i = 0; i <= N; i++) { cp.push(i / N * CELL); cq.push(MID + ofs(i / N)); if (i) cs.push(cs[i - 1] + Math.hypot(cp[i] - cp[i - 1], cq[i] - cq[i - 1])); }
  const L = cs[N];
  for (let y = 0; y < CELL; y++) for (let x = 0; x < CELL; x++) {
    const p = (vert ? y : x) + 0.5, q = (vert ? x : y) + 0.5;
    if (Math.abs(q - cq[Math.max(0, Math.min(N, Math.round(p / CELL * N)))]) > HW + 12) continue;
    let bi = 0, bd = 1e9; const i0 = Math.max(0, Math.floor((p - HW - 12) / CELL * N)), i1 = Math.min(N, Math.ceil((p + HW + 12) / CELL * N));
    for (let i = i0; i <= i1; i++) { const d = (cp[i] - p) ** 2 + (cq[i] - q) ** 2; if (d < bd) { bd = d; bi = i; } }
    const v = (q - cq[bi]) + HW; if (v < -4 || v > ROADW + 4) continue;
    const s = cs[bi] / L * CELL;
    S(vert ? CELL - s : s, v, tmp); if (tmp[3] > 0) over(b, x, y, tmp);
  }
  return b;
}
function sCurve(vert) {
  if (GRIDP) return sCurvePerp(vert);
  const b = newCell();
  for (let y = 0; y < CELL; y++) for (let x = 0; x < CELL; x++) {
    const t = (vert ? y : x) / CELL; const off = -A * (1 - Math.cos(2 * Math.PI * t)) / 2 * (vert ? -1 : 1);
    const c = (vert ? x : y) + 0.5 - (MID + off); const v = c + HW; if (v < -4 || v > ROADW + 4) continue;
    S(vert ? CELL - y : x, v, tmp); if (tmp[3] > 0) over(b, x, y, tmp);
  }
  return b;
}
pieces.s_curve_a = sCurve(false); pieces.s_curve_b = sCurve(true);
// T and cross: h strip + vertical arms; opening cut through the rim with a soft blend
function junction(up) {
  const buf = newCell(); const a = MID - HW, bb = MID + HW;
  for (let y = 0; y < CELL; y++) for (let x = 0; x < CELL; x++) {
    const inSq = x >= a && x <= bb && y >= a && y <= bb;
    const inH = y >= a - 4 && y <= bb + 4, inV = x >= a - 4 && x <= bb + 4 && (up || y >= a - 4);
    if (!(inH || inV)) continue;
    const px_ = x + 0.5, py_ = y + 0.5;
    let best = 1e9, flip = false;
    const cand = (d, f) => { if (d < best) { best = d; flip = f; } };
    if (up) {
      if (!inSq) cand(Math.hypot(Math.max(0, px_ - a), Math.max(0, py_ - a)), false);
      if (!inSq) cand(Math.hypot(Math.max(0, bb - px_), Math.max(0, py_ - a)), false);
    } else cand(Math.max(0, py_ - a), false);
    // b3: inside the centre square only a real wall (T top) makes a rim, open corners stay tread
    if (!inSq) cand(Math.hypot(Math.max(0, px_ - a), Math.max(0, bb - py_)), true);
    if (!inSq) cand(Math.hypot(Math.max(0, bb - px_), Math.max(0, bb - py_)), true);
    // vertical arm walls only exist when pixel is in an arm; horizontal arms: left/right ends open
    const arm = inSq ? 'h' : (inV && !inH ? 'v' : 'h');
    const v = Math.min(HW, best); // d in 0..HW
    const vv = flip ? ROADW - v : v;
    let u = arm === 'h' ? px_ : CELL - py_;
    // distance-based v for the straight arms: use true across-position so both rims keep their own shading
    let vAcross;
    if (arm === 'h') vAcross = py_ - a; else vAcross = px_ - a;
    // b3: true across position; inside the square reflect the tread band (no clamp smear)
    const m = Math.round(rim * 1.7), tl = ROADW - 2 * m; let vt = vAcross; // centre tread only, away from the rim shadow
    // b4: single reflection at the tread bounds (the old periodic fold repeated the centre inlay line)
    let uC = u;
    if (inSq && !(best < rim + 4) && openCentre(vAcross, u)) { const oc = openCentre(vAcross, u); vt = oc.v; uC = oc.u; }
    else if (inSq && !(best < rim + 4)) { const m2 = rim; vt = vAcross < m2 ? 2 * m2 - vAcross : vAcross > ROADW - m2 ? 2 * (ROADW - m2) - vAcross : vAcross; }
    // b4: pixels in a pure vertical arm are exactly the straight_v mapping (no rim bar across the opening)
    // v5: also the 4 px apron strips beside the centre square (they used to take rim shading from the nearest square corner = dark box lines at the openings)
    const pureArm = !inSq && ((inV && !inH) || (py_ >= a && py_ <= bb && (px_ < a || px_ > bb)) || (px_ >= a && px_ <= bb && (py_ > bb || (up && py_ < a))));
    if (pureArm) { const isV = (inV && !inH) || (px_ >= a && px_ <= bb); vAcross = isV ? px_ - a : py_ - a; u = isV ? CELL - py_ : px_; }
    const useV = pureArm ? Math.max(-4, Math.min(ROADW + 4, vAcross)) : best < rim + 4 ? vv : Math.max(0, Math.min(ROADW, vt));
    // v5: pixels outside the road shape (the old 4 px apron that was painted as an opaque rim bar) take the feathered edge
    const hx = Math.max(0, a - px_) + Math.max(0, px_ - bb);
    const dH = Math.max(0, a - py_) + Math.max(0, py_ - bb), dV = Math.hypot(hx, up ? 0 : Math.max(0, a - py_));
    const dOut = Math.min(dH, dV);
    S(pureArm || best < rim + 4 ? u : uC, dOut > 0 ? -dOut : useV, tmp); if (tmp[3] > 0) over(buf, x, y, tmp);
  }
  return buf;
}
pieces.t_junction = junction(false); pieces.cross = junction(true);
// dead end: strip from the left to the centre, round pad cap by revolving the half-strip
{
  const b = newCell(); const cxp = MID + 40;
  // v6 INLAY: the centre line (half thickness INLAY) tapers to nothing over INLAYLEN px and ends where the cap starts;
  // the rows it vacates are filled from the tread beside it (mirrored across the line edge), so no square cut shows inside the cap
  const inlayV = (x, v) => {
    if (!INLAY) return v;
    const dist = Math.abs(v - HW), h = INLAY * Math.max(0, 1 - Math.max(0, x - (cxp - INLAYLEN)) / INLAYLEN), edge = INLAY + 1;
    if (dist > edge || dist <= h) return v;
    return HW + (v >= HW ? 1 : -1) * (2 * edge - dist);
  };
  for (let y = 0; y < CELL; y++) for (let x = 0; x < cxp; x++) { const v = y + 0.5 - (MID - HW); if (v < -4 || v > ROADW + 4) continue; S(x, inlayV(x, v), tmp); if (tmp[3] > 0) over(b, x, y, tmp); }
  for (let y = 0; y < CELL; y++) for (let x = cxp; x < CELL; x++) { const r = Math.hypot(x + 0.5 - cxp, y + 0.5 - MID); if (HW + r > ROADW + 4) continue; const inner = r <= HW - rim; const v = inner ? y + 0.5 - (MID - HW) : HW + r; S(inner ? x : 80, inner ? inlayV(x, v) : v, tmp); /* b3: flat tread inside, rim revolved only */ if (tmp[3] > 0) over(b, x, y, tmp); }
  // the left half of the cap disc (inside the strip) is already covered by the strip
  pieces.dead_end = b;
}
// shoulder edge: a single rim bar (kerb only) at the bottom rim rows, border to border
{
  const b = newCell(); const yTop = MID - Math.round(rim / 2); for (let y = 0; y < CELL; y++) for (let x = 0; x < CELL; x++) { const v = ROADW - rim - 3 + (y - yTop); if (v < ROADW - rim - 4 || v > ROADW + 4) continue; S(x, v, tmp); if (tmp[3] > 0) over(b, x, y, tmp); }
  pieces.shoulder_edge = b;
}
// b4: per-piece colour match to the straight (mean + contrast per channel over the road pixels), clamped so details are not crushed
function stats(buf) { const m = [0, 0, 0], q = [0, 0, 0]; let n = 0; for (let i = 0; i < CELL * CELL; i++) { const a = buf[i * 4 + 3]; if (a < 0.98) continue; n++; for (let j = 0; j < 3; j++) { const v = buf[i * 4 + j] / a; m[j] += v; q[j] += v * v; } } return { m: m.map(x => x / n), sd: q.map((x, j) => Math.sqrt(Math.max(1e-6, x / n - (m[j] / n) ** 2))) }; }
{
  const ref = stats(pieces.straight_h); if (process.env.COLMATCH !== "1") { console.log("colour match off"); } else
  for (const [n, buf] of Object.entries(pieces)) {
    if (n === 'straight_h' || n === 'straight_v' || n === 'shoulder_edge') continue;
    const st = stats(buf); const g = [0, 1, 2].map(j => Math.max(0.9, Math.min(1.1, ref.sd[j] / st.sd[j])));
    const offc = [0, 1, 2].map(j => Math.max(-14, Math.min(14, ref.m[j] - st.m[j] * g[j])));
    for (let i = 0; i < CELL * CELL; i++) { const a = buf[i * 4 + 3]; if (a <= 0.001) continue; for (let j = 0; j < 3; j++) { const v = buf[i * 4 + j] / a; buf[i * 4 + j] = Math.max(0, Math.min(255, v * g[j] + offc[j])) * a; } }
    console.log('colour match', n, 'gain', g.map(x => x.toFixed(2)).join('/'), 'offset', offc.map(x => x.toFixed(1)).join('/'));
  }
}
fs.mkdirSync(outDir, { recursive: true });
for (const [n, buf] of Object.entries(pieces)) {
  const out = Buffer.alloc(CELL * CELL * 4);
  for (let i = 0; i < CELL * CELL; i++) { const a = buf[i * 4 + 3]; out[i * 4 + 3] = Math.round(Math.max(0, Math.min(1, a)) * 255); for (let j = 0; j < 3; j++) out[i * 4 + j] = a > 0.001 ? Math.round(Math.max(0, Math.min(255, buf[i * 4 + j] / a))) : 0; }
  await sharp(out, { raw: { width: CELL, height: CELL, channels: 4 } }).webp({ quality: 92 }).toFile(`${outDir}/road_${prefix}_${n}.webp`);
}
console.log('done', Object.keys(pieces).length);
