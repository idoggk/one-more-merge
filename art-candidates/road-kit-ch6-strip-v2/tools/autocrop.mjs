// usage: node autocrop.mjs raw.png key -> prints x0,y0,x1,y1 of the widest wide-aspect keyed component (the horizontal straight strip)
import sharp from 'sharp';
const [raw, key] = process.argv.slice(2);
const { data, info } = await sharp(raw).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const W = info.width, H = info.height, M = new Uint8Array(W * H);
for (let i = 0; i < W * H; i++) { const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2]; const d = key === 'magenta' ? Math.hypot(255 - r, g, 255 - b) : Math.hypot(r, 255 - g, b); M[i] = d > 100 ? 1 : 0; }
const seen = new Uint8Array(W * H); let best = null;
for (let s = 0; s < W * H; s++) { if (!M[s] || seen[s]) continue; const st = [s]; seen[s] = 1; let x0 = W, y0 = H, x1 = 0, y1 = 0, n = 0;
  while (st.length) { const p = st.pop(); const x = p % W, y = (p / W) | 0; n++; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; for (const q of [p - 1, p + 1, p - W, p + W]) if (q >= 0 && q < W * H && M[q] && !seen[q] && !(q === p - 1 && x === 0) && !(q === p + 1 && x === W - 1)) { seen[q] = 1; st.push(q); } }
  const w = x1 - x0 + 1, h = y1 - y0 + 1; if (n > 2000 && w / h > 2.2 && (!best || w > best.w)) best = { x0, y0, x1: x1 + 1, y1: y1 + 1, w, h }; }
console.log(best ? `${best.x0},${best.y0},${best.x1},${best.y1}` : 'none');
