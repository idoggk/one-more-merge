// Turns the 2x captures from shoot.mjs into the committed previews:
//   node art-candidates/screens/tools/finish.mjs <capture-dir>
// - shots/<id>.png and shots/<id>@<t>.png  : 390 px wide (palette PNG, small)
// - shots/_contact-sheet.png               : every main screen on one sheet, labelled
// - shots/_strip-<id>.png                  : animation frames side by side (win, lose, crate-open, reward)
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const src = process.argv[2];
const out = path.join(root, 'shots');
fs.mkdirSync(out, { recursive: true });
for (const f of fs.readdirSync(out)) fs.unlinkSync(path.join(out, f));

const files = fs.readdirSync(src).filter((f) => f.endsWith('.png')).sort();
for (const f of files) {
  await sharp(path.join(src, f)).resize({ width: 390 }).png({ compressionLevel: 9, palette: true, quality: 92, dither: 1.0, effort: 10 }).toFile(path.join(out, f));
}

const frames = JSON.parse(fs.readFileSync(path.join(root, 'tools', 'frames.json'), 'utf8'));
const ORDER = ['home-a1', 'home-a2', 'road', 'units', 'machine', 'crates', 'prelevel', 'hud', 'win', 'lose', 'crate-open', 'reward', 'settings', 'kit-1', 'kit-2', 'kit-3'];
const LABEL = { 'home-a1': 'Home A1 board', 'home-a2': 'Home A2 machine', road: 'Road', units: 'Units', machine: 'Machine', crates: 'Crates', prelevel: 'Pre-level', hud: 'In-level HUD', win: 'Win', lose: 'Lose', 'crate-open': 'Crate opening', reward: 'Reward popup', settings: 'Settings', 'kit-1': 'Kit 1', 'kit-2': 'Kit 2', 'kit-3': 'Kit 3' };

async function label(text, w) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="34"><rect width="100%" height="100%" fill="#1b1220"/><text x="${w / 2}" y="23" font-family="Inter, Arial, sans-serif" font-weight="700" font-size="17" fill="#ffe8a8" text-anchor="middle">${text}</text></svg>`;
  return Buffer.from(svg);
}

// contact sheet: 8 x 2, each 260 px wide
{
  const W = 260;
  const H = Math.round((844 / 390) * W);
  const cols = 8;
  const rows = Math.ceil(ORDER.length / cols);
  const gap = 12;
  const sheetW = cols * W + (cols + 1) * gap;
  const sheetH = rows * (H + 34) + (rows + 1) * gap;
  const comps = [];
  for (let i = 0; i < ORDER.length; i++) {
    const id = ORDER[i];
    const x = gap + (i % cols) * (W + gap);
    const y = gap + Math.floor(i / cols) * (H + 34 + gap);
    const img = await sharp(path.join(src, `${id}.png`)).resize({ width: W }).png().toBuffer();
    comps.push({ input: img, left: x, top: y });
    comps.push({ input: await label(LABEL[id], W), left: x, top: y + H });
  }
  await sharp({ create: { width: sheetW, height: sheetH, channels: 3, background: '#0d080f' } })
    .composite(comps)
    .png({ compressionLevel: 9, palette: true, quality: 92, dither: 1.0, effort: 10 })
    .toFile(path.join(out, '_contact-sheet.png'));
}

// animation strips
for (const id of Object.keys(frames)) {
  const ts = frames[id].frames;
  const names = [...ts.map((t) => `${id}@${t}`), id];
  const W = 300;
  const H = Math.round((844 / 390) * W);
  const gap = 10;
  const comps = [];
  for (let i = 0; i < names.length; i++) {
    const x = gap + i * (W + gap);
    comps.push({ input: await sharp(path.join(src, `${names[i]}.png`)).resize({ width: W }).png().toBuffer(), left: x, top: gap });
    const tl = i < ts.length ? `${(ts[i] / 1000).toFixed(1)} s` : 'end';
    comps.push({ input: await label(tl, W), left: x, top: gap + H });
  }
  await sharp({ create: { width: gap + names.length * (W + gap), height: H + 34 + 2 * gap, channels: 3, background: '#0d080f' } })
    .composite(comps)
    .png({ compressionLevel: 9, palette: true, quality: 92, dither: 1.0, effort: 10 })
    .toFile(path.join(out, `_strip-${id}.png`));
}
const total = fs.readdirSync(out).reduce((a, f) => a + fs.statSync(path.join(out, f)).size, 0);
console.log(`wrote ${fs.readdirSync(out).length} files to shots/, ${(total / 1024 / 1024).toFixed(2)} MB`);
