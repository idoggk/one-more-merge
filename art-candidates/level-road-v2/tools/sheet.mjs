// Usage: node sheet.mjs outPng cols in1.png in2.png ... ; makes a labelled-free contact sheet (each frame resized to 390 wide)
import sharp from 'sharp';
const [out, cols, ...files] = process.argv.slice(2);
const c = +cols, w = 390;
const imgs = [];
for (const f of files) imgs.push({ f, b: await sharp(f).resize({ width: w }).png().toBuffer() });
const metas = await Promise.all(imgs.map((i) => sharp(i.b).metadata()));
const h = Math.max(...metas.map((m) => m.height));
const rows = Math.ceil(imgs.length / c);
await sharp({ create: { width: c * (w + 10) + 10, height: rows * (h + 10) + 10, channels: 3, background: '#222' } })
  .composite(imgs.map((i, k) => ({ input: i.b, left: 10 + (k % c) * (w + 10), top: 10 + Math.floor(k / c) * (h + 10) })))
  .png().toFile(out);
