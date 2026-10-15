import sharp from 'sharp';
import fs from 'fs';
const D = 'art-candidates/road-kit-ch6-strip';
const files = fs.readdirSync(`${D}/ch6`).filter(f => f.endsWith('.webp')).sort();
const S = 256, COLS = 4;
for (const [name, bg] of [['dark', '#202028'], ['light', '#e8e4d8']]) {
  const comps = [];
  for (let i = 0; i < files.length; i++) {
    const b = await sharp(`${D}/ch6/${files[i]}`).resize(S, S).png().toBuffer();
    comps.push({ input: b, left: (i % COLS) * S, top: Math.floor(i / COLS) * S });
  }
  await sharp({ create: { width: S * COLS, height: S * 3, channels: 4, background: bg } }).composite(comps).png().toFile(`${D}/contact_ch6_${name}.png`);
}
// winding road: straight_h x3 side by side at full res (repeat check)
const h = await sharp(`${D}/ch6/road_ch6_straight_h.webp`).png().toBuffer();
await sharp({ create: { width: 1536, height: 512, channels: 4, background: '#202028' } }).composite([0, 1, 2].map(i => ({ input: h, left: i * 512, top: 0 }))).png().toFile(`${D}/tile3_ch6.png`);
