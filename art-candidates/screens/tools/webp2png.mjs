// Review helper: convert every shipped .webp in src/assets/art to PNG in a scratch folder
// (the image viewer cannot show webp). usage: node art-candidates/screens/tools/webp2png.mjs <out-folder>
import sharp from 'sharp';
import fs from 'node:fs';

const out = process.argv[2];
fs.mkdirSync(out, { recursive: true });
for (const f of fs.readdirSync('src/assets/art')) {
  if (!f.endsWith('.webp')) continue;
  const n = f.replace('.webp', '');
  if (fs.existsSync(`${out}/${n}.png`)) continue;
  await sharp(`src/assets/art/${f}`).png().toFile(`${out}/${n}.png`);
}
console.log('done');
