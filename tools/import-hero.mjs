// Import ChatGPT's v10 home/machine pack (layered "YOUR MACHINE" + Bolts UI) into src/assets/art as WebP.
// Usage: node tools/import-hero.mjs art_inbox/v10/assets
// Sprites are trimmed to their visible pixels so the in-game assembly can anchor by visible bounds (ASSEMBLY.json).
import sharp from 'sharp';
import { readdirSync } from 'node:fs';
import { join, basename } from 'node:path';

const src = process.argv[2] ?? 'art_inbox/v10/assets';
const out = 'src/assets/art';
const jobs = [];
for (const f of readdirSync(src).filter((f) => f.endsWith('.png'))) {
  const n = basename(f, '.png');
  let key = null;
  let box = 256;
  let trim = true;
  const m = n.match(/^hero_module_(\w+)_t([123])$/);
  if (m) [key, box] = [`hm_${m[1]}_${m[2]}`, 300];
  else if (n === 'hero_home_background') [key, box, trim] = ['hero_bg', 720, false];
  else if (n === 'hero_machine_chassis') [key, box] = ['hero_chassis', 900];
  else if (n === 'hero_mount_socket') [key, box] = ['hero_socket', 160];
  else if (n === 'resource_bolts_icon') [key, box] = ['bolt', 96];
  else if (n === 'hero_resources_bar_plate') [key, box] = ['res_bar', 640];
  if (key) jobs.push({ f: join(src, f), key, box, trim });
  else console.log('skip:', f);
}
for (const j of jobs) {
  const img = j.trim ? sharp(j.f).trim({ threshold: 32 }) : sharp(j.f);
  const buf = await img.png().toBuffer();
  const resized = j.key === 'hero_bg' ? sharp(buf).resize({ width: j.box }) : sharp(buf).resize(j.box, j.box, { fit: 'inside' });
  await resized.webp({ quality: 86, alphaQuality: 90, effort: 5 }).toFile(join(out, `${j.key}.webp`));
  console.log(`${basename(j.f)} -> ${j.key}`);
}
