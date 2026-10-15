// Unit style test round 2: "chunky glossy toy workshop MACHINES". Pure SVG -> PNG via sharp (free).
// Families: Cannon (red), Coil (cyan), Bell (yellow). Ranks 1, 4, 8.
// Rank = size step + pips + glow ring, identical for every family. No extra parts per rank.
// Usage: node tools/render-unit-style-test-v2.mjs  -> art-candidates/unit-style-test/vector-v2/
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';

const OUT = 'art-candidates/unit-style-test/vector-v2';
fs.mkdirSync(path.join(OUT, 'svg'), { recursive: true });
fs.mkdirSync(path.join(OUT, 'png'), { recursive: true });

const LINE = '#33180f'; // warm dark brown outline
const SW = 9; // outline width in local units
const RANKS = [1, 4, 8];
const SCALE = { 1: 0.68, 4: 0.82, 8: 0.96 };
const WHEEL = ['#6a5a78', '#3a2f46', '#1f1828'];

const grad = (id, [l, m, d]) =>
  `<linearGradient id="${id}" x1="0.1" y1="0" x2="0.9" y2="1"><stop offset="0" stop-color="${l}"/><stop offset="0.45" stop-color="${m}"/><stop offset="1" stop-color="${d}"/></linearGradient>`;
const st = `stroke="${LINE}" stroke-width="${SW}" stroke-linejoin="round" stroke-linecap="round"`;
const gloss = (d, op = 0.55) => `<path d="${d}" fill="#fff" fill-opacity="${op}"/>`;
const wheel = (cx, cy, r, hub) => `
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#gw)" ${st}/>
  <circle cx="${cx}" cy="${cy}" r="${r * 0.42}" fill="${hub}" stroke="${LINE}" stroke-width="6" stroke-linejoin="round"/>
  ${gloss(`M${cx - r * 0.8},${cy - r * 0.15} A${r * 0.82},${r * 0.82} 0 0 1 ${cx - r * 0.1},${cy - r * 0.8} L${cx - r * 0.05},${cy - r * 0.62} A${r * 0.64},${r * 0.64} 0 0 0 ${cx - r * 0.62},${cy - r * 0.1} Z`, 0.35)}`;
const star = (cx, cy, R) => {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? R * 0.45 : R;
    pts.push(`${(cx + rr * Math.cos(a)).toFixed(1)},${(cy + rr * Math.sin(a)).toFixed(1)}`);
  }
  return `<polygon points="${pts.join(' ')}" fill="#ffe27a" stroke="${LINE}" stroke-width="5" stroke-linejoin="round"/>`;
};

// Each family: palette, defs, parts (drawn back to front), ground-shadow ellipse, glow colour.
const FAMILIES = {
  cannon: {
    glow: '#ff8d8d',
    pal: { body: ['#ff6a74', '#d4263a', '#8e1126'], trim: ['#fff1a0', '#f5b92e', '#b8741a'] },
    shadow: [0, 92, 98, 14],
    parts: `
      <!-- 1 carriage -->
      <path d="M-70,22 Q-70,10 -56,10 L52,10 Q66,10 66,22 L66,56 L-70,56 Z" fill="url(#body)" ${st}/>
      ${gloss('M-60,20 Q-60,15 -54,15 L30,15 L30,24 L-60,24 Z', 0.5)}
      <!-- 2 barrel (tilted up-right) with breech cap -->
      <g transform="translate(-36,10) rotate(-30)">
        <circle cx="-4" cy="0" r="30" fill="url(#body)" ${st}/>
        <path d="M0,-27 L104,-21 L104,21 L0,27 Z" fill="url(#body)" ${st}/>
        ${gloss('M6,-21 L100,-16 L100,-9 L6,-13 Z', 0.6)}
        ${star(46, 0, 17).replace("<polygon", "<polygon transform=\"rotate(30 46 0)\"")}
        <!-- 3 gold muzzle ring + 4 dark bore -->
        <rect x="92" y="-31" width="26" height="62" rx="10" fill="url(#trim)" ${st}/>
        <ellipse cx="116" cy="0" rx="9" ry="22" fill="#4a0d18" stroke="${LINE}" stroke-width="5"/>
      </g>
      <!-- 5 wheels -->
      ${wheel(-34, 58, 32, 'url(#trim)')}
      ${wheel(42, 58, 32, 'url(#trim)')}`,
  },
  coil: {
    glow: '#8fe9ff',
    pal: { body: ['#7fe6ff', '#17b2dc', '#0a6a8e'], trim: ['#ffd9a0', '#f2933a', '#a85a16'] },
    shadow: [0, 94, 92, 13],
    parts: `
      <!-- 1 base block -->
      <path d="M-72,62 Q-72,50 -60,50 L60,50 Q72,50 72,62 L72,80 L-72,80 Z" fill="url(#body)" ${st}/>
      ${gloss('M-64,58 Q-64,54 -58,54 L30,54 L30,60 L-64,60 Z', 0.5)}
      <!-- 2 small wheels -->
      ${wheel(-46, 84, 17, 'url(#trim)')}
      ${wheel(46, 84, 17, 'url(#trim)')}
      <!-- 3 tower -->
      <path d="M-36,52 L-22,-34 L22,-34 L36,52 Z" fill="url(#body)" ${st}/>
      ${gloss('M-28,44 L-16,-26 L-6,-26 L-17,44 Z', 0.5)}
      <!-- 4 copper winding rings -->
      <rect x="-34" y="-12" width="68" height="17" rx="8" fill="url(#trim)" ${st}/>
      <rect x="-38" y="16" width="76" height="17" rx="8" fill="url(#trim)" ${st}/>
      <!-- 5 top ball -->
      <circle cx="0" cy="-56" r="31" fill="url(#body)" ${st}/>
      ${gloss('M-24,-62 A26,26 0 0 1 -4,-82 L-6,-72 A18,18 0 0 0 -17,-60 Z', 0.7)}
      <!-- 6 bolt badge -->
      <path d="M6,-72 L-12,-52 L-1,-52 L-6,-36 L14,-58 L3,-58 Z" fill="#fff3a0" stroke="${LINE}" stroke-width="4.5" stroke-linejoin="round"/>`,
  },
  bell: {
    glow: '#ffe27a',
    pal: { body: ['#fff0a0', '#f5b81c', '#b87a0c'], trim: ['#ff8a7a', '#d4263a', '#8e1126'], wood: ['#c98a5a', '#8a4e2c', '#552a14'] },
    shadow: [0, 94, 98, 13],
    parts: `
      <!-- 1 skid base with wheels -->
      <rect x="-82" y="64" width="164" height="22" rx="10" fill="url(#wood)" ${st}/>
      ${wheel(-56, 90, 15, 'url(#trim)')}
      ${wheel(56, 90, 15, 'url(#trim)')}
      <!-- 2 A-frame posts + crossbeam -->
      <path d="M-70,66 L-58,-62 L-34,-62 L-44,66 Z" fill="url(#wood)" ${st}/>
      <path d="M70,66 L58,-62 L34,-62 L44,66 Z" fill="url(#wood)" ${st}/>
      <rect x="-68" y="-80" width="136" height="26" rx="12" fill="url(#wood)" ${st}/>
      <!-- 3 bell -->
      <path d="M-50,34 C-50,-18 -34,-48 0,-48 C34,-48 50,-18 50,34 Q62,42 66,56 L-66,56 Q-62,42 -50,34 Z" fill="url(#body)" ${st}/>
      ${gloss('M-40,30 C-40,-12 -28,-36 -8,-42 C-24,-20 -26,6 -26,30 Z', 0.6)}
      <!-- 4 red trim band -->
      <rect x="-68" y="48" width="136" height="16" rx="8" fill="url(#trim)" ${st}/>
      <!-- 5 clapper -->
      <circle cx="0" cy="74" r="13" fill="url(#trim)" ${st}/>`,
  },
};

function unitSvg(fam, rank) {
  const f = FAMILIES[fam];
  const s = SCALE[rank];
  const glowOp = { 1: 0, 4: 0.5, 8: 0.9 }[rank];
  const ringOp = { 1: 0.3, 4: 0.7, 8: 1 }[rank];
  const ringW = { 1: 4, 4: 7, 8: 10 }[rank];
  const [sx, sy, sw, sh] = f.shadow;
  let pips = '';
  const rows = rank > 4 ? [4, rank - 4] : [rank];
  const gap = 22;
  rows.forEach((n, ri) => {
    const x0 = 128 - ((n - 1) * gap) / 2;
    const y = rows.length === 2 ? 224 + ri * 19 : 236;
    for (let i = 0; i < n; i++) pips += `<circle cx="${x0 + i * gap}" cy="${y}" r="7.5" fill="#fff6c2" stroke="${LINE}" stroke-width="4"/>`;
  });
  const g = (id, p) => grad(id, p);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
  <defs>
    ${g('body', f.pal.body)}${g('trim', f.pal.trim)}${g('wood', f.pal.wood ?? f.pal.trim)}${g('gw', WHEEL)}
    <radialGradient id="glow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="${f.glow}" stop-opacity="0"/><stop offset="78%" stop-color="${f.glow}" stop-opacity="0"/><stop offset="88%" stop-color="${f.glow}" stop-opacity="${glowOp}"/>
      <stop offset="100%" stop-color="${f.glow}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <circle cx="128" cy="112" r="122" fill="url(#glow)"/>
  <circle cx="128" cy="112" r="104" fill="none" stroke="${f.glow}" stroke-opacity="${ringOp}" stroke-width="${ringW}"/>
  <g transform="translate(128 112) scale(${s})">
    <ellipse cx="${sx}" cy="${sy}" rx="${sw}" ry="${sh}" fill="#000" fill-opacity="0.3"/>
    ${f.parts}
  </g>
  ${pips}
</svg>`;
}

const items = [];
for (const fam of Object.keys(FAMILIES)) {
  for (const rank of RANKS) {
    const name = `${fam}_r${rank}`;
    const svg = unitSvg(fam, rank);
    fs.writeFileSync(path.join(OUT, 'svg', `${name}.svg`), svg);
    for (const px of [128, 256]) {
      await sharp(Buffer.from(svg), { density: 72 * (px / 256) * 2 })
        .resize(px, px)
        .png()
        .toFile(path.join(OUT, 'png', `${name}_${px}.png`));
    }
    items.push({ fam, rank, svg });
  }
}

async function sheet(file, { cell, bg, grey }) {
  const pad = Math.round(cell * 0.12);
  const nF = Object.keys(FAMILIES).length;
  const W = RANKS.length * cell + (RANKS.length + 1) * pad;
  const H = nF * cell + (nF + 1) * pad;
  const comps = [];
  for (const it of items) {
    const buf = await sharp(Buffer.from(it.svg), { density: Math.max(72, (cell / 256) * 72 * 2) })
      .resize(cell, cell)
      .png()
      .toBuffer();
    comps.push({
      input: buf,
      left: pad + RANKS.indexOf(it.rank) * (cell + pad),
      top: pad + Object.keys(FAMILIES).indexOf(it.fam) * (cell + pad),
    });
  }
  let img = sharp({ create: { width: W, height: H, channels: 4, background: bg } }).composite(comps);
  if (grey) img = sharp(await img.png().toBuffer()).greyscale();
  await img.png().toFile(path.join(OUT, file));
}

const DARK = '#22202e';
const LIGHT = '#f0ebe0';
for (const [tag, cell] of [['', 256], ['_48', 48]]) {
  await sheet(`sheet${tag}_dark.png`, { cell, bg: DARK });
  await sheet(`sheet${tag}_light.png`, { cell, bg: LIGHT });
  await sheet(`sheet${tag}_grey_dark.png`, { cell, bg: DARK, grey: true });
  await sheet(`sheet${tag}_grey_light.png`, { cell, bg: LIGHT, grey: true });
}
console.log('done', items.length, 'units');
