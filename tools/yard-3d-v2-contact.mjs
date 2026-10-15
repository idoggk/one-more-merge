// Contact sheets for art-candidates/screw-yard-3d-v2 (dark, light, small-size strip with 110 px / 70 px / grayscale).
// Usage: node tools/yard-3d-v2-contact.mjs [--dir art-candidates/screw-yard-3d-v2]
import sharp from 'sharp';
import { readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const i = process.argv.indexOf('--dir');
const DIR = i > 0 ? process.argv[i + 1] : 'art-candidates/screw-yard-3d-v2';
const ids = readdirSync(join(DIR, '2x')).filter((f) => f.endsWith('.png')).map((f) => f.replace('.png', ''));
const slots = existsSync(join(DIR, 'variants', '2x')) ? readdirSync(join(DIR, 'variants', '2x')).filter((f) => f.endsWith('.png')).map((f) => f.replace('.png', '')) : [];
const path = (id) => (id.endsWith('_slot') ? join(DIR, 'variants', '2x', `${id}.png`) : join(DIR, '2x', `${id}.png`));
const spin = 'screw_spin_frames';

async function sheet(name, bg, list, cell, cols) {
  const rows = Math.ceil(list.length / cols);
  const comps = [];
  for (let k = 0; k < list.length; k++) {
    const id = list[k];
    const inner = Math.round(cell * 0.92);
    const img = await sharp(path(id)).resize(inner, inner, { fit: 'inside' }).toBuffer();
    const m = await sharp(img).metadata();
    comps.push({ input: img, left: (k % cols) * cell + Math.round((cell - m.width) / 2), top: Math.floor(k / cols) * cell + Math.round((cell - m.height) / 2) });
  }
  await sharp({ create: { width: cell * cols, height: cell * rows, channels: 4, background: bg } }).composite(comps).png().toFile(join(DIR, name));
}

const main = ids.filter((x) => x !== spin);
const all = [...main, ...slots];
await sheet('contact-dark.png', '#2b2230', all, 360, 5);
await sheet('contact-light.png', '#f3e3c3', all, 360, 5);

// small strip: screws + collar + ring at 110 px, 70 px, and grayscale 70 px (dark and light halves)
const small = all.filter((x) => /^screw_(head|side)|collar|hole_ring/.test(x));
for (const [name, bg] of [['contact-small-dark.png', '#2b2230'], ['contact-small-light.png', '#f3e3c3']]) {
  const comps = [];
  const W = small.length * 120, rowsH = [130, 90, 90];
  for (let k = 0; k < small.length; k++) {
    for (const [r, sz, gray] of [[0, 110, false], [1, 70, false], [2, 70, true]]) {
      let s = sharp(path(small[k])).resize(sz, sz, { fit: 'inside' });
      if (gray) s = s.grayscale();
      comps.push({ input: await s.toBuffer(), left: k * 120 + 5, top: rowsH.slice(0, r).reduce((a, b) => a + b, 0) + 10 });
    }
  }
  await sharp({ create: { width: W, height: rowsH.reduce((a, b) => a + b, 0), channels: 4, background: bg } }).composite(comps).png().toFile(join(DIR, name));
}
// spin strip
if (ids.includes(spin)) {
  const m = await sharp(path(spin)).metadata();
  for (const [name, bg] of [['contact-spin-dark.png', '#2b2230'], ['contact-spin-light.png', '#f3e3c3']]) {
    const big = await sharp(path(spin)).resize(m.width * 2, m.height * 2, { kernel: 'lanczos3' }).toBuffer();
    await sharp({ create: { width: m.width * 2, height: m.height * 2, channels: 4, background: bg } }).composite([{ input: big }]).png().toFile(join(DIR, name));
  }
}
console.log('sheets written');
