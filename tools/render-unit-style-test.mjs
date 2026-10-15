// STYLE 4 "vector icon" unit style test. Pure SVG -> PNG via sharp (free).
// Families (first three confusion-pair families in UNIT_ROSTER_AUDIT.md): Bell, Horn, Coil.
// Ranks 1, 4, 8. Rank = size step + pips + glow ring (identical for every family).
// Usage: node tools/render-unit-style-test.mjs   -> art-candidates/unit-style-test/vector/
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';

const OUT = 'art-candidates/unit-style-test/vector';
fs.mkdirSync(path.join(OUT, 'svg'), { recursive: true });
fs.mkdirSync(path.join(OUT, 'png'), { recursive: true });

const OUTLINE = '#1b1326';
const RANKS = [1, 4, 8];
// size step per rank (same for all families)
const SCALE = { 1: 0.55, 4: 0.7, 8: 0.86 };
const OUTLINE_W = 11;

// Each family: one silhouette body path + clip-masked highlight/shadow + <=4 detail shapes.
const FAMILIES = {
  bell: {
    color: '#f6b91a',
    body: 'M-66,52 C-66,-30 -40,-72 0,-72 C40,-72 66,-30 66,52 Z',
    highlight: 'M-52,40 C-52,-24 -34,-58 -14,-62 C-30,-36 -34,0 -34,40 Z',
    shadow: 'M30,-60 C56,-40 66,0 66,52 L26,52 C30,10 34,-30 30,-60 Z',
    details: (c) => `
      <rect x="-86" y="46" width="172" height="26" rx="13" fill="${c}" stroke="${OUTLINE}" stroke-width="${OUTLINE_W}"/>
      <circle cx="0" cy="86" r="17" fill="#8a5a12" stroke="${OUTLINE}" stroke-width="${OUTLINE_W}"/>
      <circle cx="0" cy="-80" r="12" fill="${c}" stroke="${OUTLINE}" stroke-width="${OUTLINE_W}"/>`,
  },
  horn: {
    color: '#ff6a2e',
    body: 'M-20,76 L-62,-70 L62,-70 L20,76 Z',
    highlight: 'M-26,60 L-54,-58 L-34,-58 L-14,60 Z',
    shadow: 'M24,-60 L56,-60 L18,70 L8,70 Z',
    details: (c) => `
      <rect x="-76" y="-88" width="152" height="24" rx="12" fill="${c}" stroke="${OUTLINE}" stroke-width="${OUTLINE_W}"/>
      <rect x="-28" y="68" width="56" height="24" rx="10" fill="#7a2a10" stroke="${OUTLINE}" stroke-width="${OUTLINE_W}"/>
      <path d="M-40,-14 L40,-14" stroke="#ffd9b8" stroke-width="12" stroke-linecap="round"/>`,
  },
  coil: {
    color: '#1fc8e8',
    body: 'M-28,-84 H28 V-28 H84 V28 H28 V84 H-28 V28 H-84 V-28 H-28 Z',
    highlight: 'M-22,-76 H-6 V-22 H-76 V-6 H-22 Z',
    shadow: 'M22,26 H78 V22 H28 V78 H22 Z M-22,78 H22 V30 H-22 Z',
    details: () => `
      <circle cx="0" cy="0" r="30" fill="#0b6f86" stroke="${OUTLINE}" stroke-width="${OUTLINE_W}"/>
      <circle cx="0" cy="0" r="10" fill="#c9f6ff"/>`,
  },
};

function unitSvg(fam, rank) {
  const f = FAMILIES[fam];
  const s = SCALE[rank];
  // glow ring: stronger + thicker with rank, rank 1 faint
  const glowOp = { 1: 0.0, 4: 0.55, 8: 0.95 }[rank];
  const ringOp = { 1: 0.35, 4: 0.7, 8: 1 }[rank];
  const ringW = { 1: 5, 4: 7, 8: 10 }[rank];
  const ringCol = '#fff6c2';
  // pips: rank 1 -> 1, rank 4 -> 4, rank 8 -> 8 (two rows of 4)
  let pips = '';
  const r = 7.5, gap = 22;
  const rows = rank > 4 ? [4, rank - 4] : [rank];
  const y0 = rows.length === 2 ? 224 : 232;
  rows.forEach((n, ri) => {
    const x0 = 128 - ((n - 1) * gap) / 2;
    for (let i = 0; i < n; i++) {
      pips += `<circle cx="${x0 + i * gap}" cy="${y0 + ri * 20 - (rows.length === 2 ? 10 : 0)}" r="${r}" fill="${ringCol}" stroke="${OUTLINE}" stroke-width="4"/>`;
    }
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
  <defs>
    <clipPath id="b"><path d="${f.body}"/></clipPath>
    <radialGradient id="g" cx="50%" cy="50%" r="50%">
      <stop offset="82%" stop-color="${ringCol}" stop-opacity="${glowOp}"/>
      <stop offset="100%" stop-color="${ringCol}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <circle cx="128" cy="116" r="122" fill="url(#g)"/>
  <circle cx="128" cy="116" r="104" fill="none" stroke="${ringCol}" stroke-opacity="${ringOp}" stroke-width="${ringW}"/>
  <g transform="translate(128 104) scale(${s})" stroke-linejoin="round">
    <path d="${f.body}" fill="${f.color}" stroke="${OUTLINE}" stroke-width="${OUTLINE_W}"/>
    <g clip-path="url(#b)">
      <path d="${f.highlight}" fill="#ffffff" fill-opacity="0.55"/>
      <path d="${f.shadow}" fill="#000000" fill-opacity="0.28"/>
    </g>
    ${f.details(f.color)}
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

// Contact sheets: rows = families, cols = ranks.
async function sheet(file, { cell, bg, grey }) {
  const pad = Math.round(cell * 0.12);
  const W = RANKS.length * cell + (RANKS.length + 1) * pad;
  const H = Object.keys(FAMILIES).length * cell + (Object.keys(FAMILIES).length + 1) * pad;
  const comps = [];
  for (const it of items) {
    const col = RANKS.indexOf(it.rank);
    const row = Object.keys(FAMILIES).indexOf(it.fam);
    const buf = await sharp(Buffer.from(it.svg), { density: Math.max(72, (cell / 256) * 72 * 2) })
      .resize(cell, cell)
      .png()
      .toBuffer();
    comps.push({ input: buf, left: pad + col * (cell + pad), top: pad + row * (cell + pad) });
  }
  let img = sharp({ create: { width: W, height: H, channels: 4, background: bg } }).composite(comps);
  if (grey) img = sharp(await img.png().toBuffer()).greyscale();
  await img.png().toFile(path.join(OUT, file));
}

const DARK = '#22202e';
const LIGHT = '#f0ebe0';
await sheet('sheet_dark.png', { cell: 256, bg: DARK });
await sheet('sheet_light.png', { cell: 256, bg: LIGHT });
await sheet('sheet_48_dark.png', { cell: 48, bg: DARK });
await sheet('sheet_48_light.png', { cell: 48, bg: LIGHT });
await sheet('sheet_grey_dark.png', { cell: 256, bg: DARK, grey: true });
await sheet('sheet_grey_light.png', { cell: 256, bg: LIGHT, grey: true });
await sheet('sheet_48_grey_dark.png', { cell: 48, bg: DARK, grey: true });
await sheet('sheet_48_grey_light.png', { cell: 48, bg: LIGHT, grey: true });
console.log('done', items.length, 'units');
