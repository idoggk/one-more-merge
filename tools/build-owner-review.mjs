// Builds art-candidates/owner-review/: a static, offline, phone-first page where the owner marks each accepted art piece
// LIKE or NOT. Index + one page per group, pieces packed into sprite atlases (grid tier + zoom tier), no contact sheets,
// no screenshots. No external requests, no private data. Votes stay in the phone's localStorage.
// Images are read from the art batch branches with `git show` (the list is in tools/owner-review-data.mjs).
// Usage: node tools/build-owner-review.mjs   (npm run review:build)   Needs the batch branches (git fetch origin) and sharp.
// Publishing: the Artifact host allows at most 511 files, so the whole folder (under 350 files) is published in one go.
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync, readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import sharp from 'sharp';
import { GROUPS, REDO, REDO_TEXT } from './owner-review-data.mjs';

const OUT = 'art-candidates/owner-review';
// Sprite atlases: the artifact host allows at most 511 files, so pieces are packed into a few webp atlases per group.
// Grid tier: 192 px cells, 8 columns, up to 8 rows (1536 px square). Zoom tier (zoom overlay only): 384 px cells, 4 columns, 4 rows.
const CELL = 192, COLS = 8, PER = 64;
const ZCELL = 384, ZCOLS = 4, ZPER = 16;
const PAD = 2; // transparent margin inside a cell so neighbours never bleed in
const MAX_ATLAS_MB = 2;
const MAX_MB = 24;
const MAX_FILES = 350;

const git = (...a) => execFileSync('git', a, { maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'pipe'] });

const titleCase = (id) => id.replace(/_v\d+$/, '').replace(/^node2_/, 'node_').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const jsonInline = (o) => JSON.stringify(o).replace(/</g, '\\u003c');
const readSource = (src) => git('show', `${src.branch}:${src.path}`);

// everything is rebuilt
rmSync(OUT, { recursive: true, force: true });
mkdirSync(`${OUT}/img`, { recursive: true });

/** One piece scaled to fit a square cell (aspect kept, centred, transparent). */
async function cellBuffer(buf, cell) {
  const inner = cell - 2 * PAD;
  const { data, info } = await sharp(buf).ensureAlpha().resize({ width: inner, height: inner, fit: 'inside' }).png().toBuffer({ resolveWithObject: true });
  return { input: data, left: PAD + Math.floor((inner - info.width) / 2), top: PAD + Math.floor((inner - info.height) / 2) };
}

/** Packs cell buffers into atlas files `${OUT}/img/${name}_N.webp`. Returns [{f, cols, rows}] and a position [atlas, col, row] per cell. */
async function packAtlases(name, cells, cell, cols, per, q0 = 74) {
  const atlases = [], pos = [];
  for (let a = 0; a * per < cells.length; a++) {
    const part = cells.slice(a * per, (a + 1) * per);
    const c = Math.min(cols, part.length), rows = Math.ceil(part.length / c);
    const layers = part.map((x, i) => ({ input: x.input, left: (i % c) * cell + x.left, top: Math.floor(i / c) * cell + x.top }));
    const f = `img/${name}_${a}.webp`;
    const canvas = () => sharp({ create: { width: c * cell, height: rows * cell, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite(layers);
    let q = q0, size = 0;
    for (; q >= 40; q -= 8) { const out = await canvas().webp({ quality: q, alphaQuality: 90 }).toBuffer(); size = out.length; if (size <= MAX_ATLAS_MB * 1048576 * 0.95) { writeFileSync(`${OUT}/${f}`, out); break; } }
    if (size > MAX_ATLAS_MB * 1048576) throw new Error(`atlas ${f} is ${(size / 1048576).toFixed(2)} MB, over ${MAX_ATLAS_MB}`);
    atlases.push({ f, cols: c, rows });
    part.forEach((_, i) => pos.push([a, i % c, Math.floor(i / c)]));
  }
  return { atlases, pos };
}

/** CSS for one sprite as inline style text (percent based, so it scales with the element). */
const spriteCss = (at, [a, col, row]) => {
  const A = at[a], px = A.cols > 1 ? (col / (A.cols - 1)) * 100 : 0, py = A.rows > 1 ? (row / (A.rows - 1)) * 100 : 0;
  return `background-image:url(${A.f});background-size:${A.cols * 100}% ${A.rows * 100}%;background-position:${+px.toFixed(4)}% ${+py.toFixed(4)}%`;
};

/** The six in-game ranks of one family side by side as one strip (units 7-8 page). */
async function makeStrip(fam) {
  const cell = 128, layers = [];
  for (let n = 1; n <= 6; n++) {
    const f = `src/assets/art/${fam}_${n}.webp`;
    if (!existsSync(f)) throw new Error(`missing ${f}`);
    layers.push({ input: await sharp(f).resize({ width: cell - 8, height: cell - 8, fit: 'inside' }).png().toBuffer(), left: (n - 1) * cell + 4, top: 4 });
  }
  // centre each picture in its cell
  for (let i = 0; i < layers.length; i++) {
    const m = await sharp(layers[i].input).metadata();
    layers[i].left = i * cell + Math.floor((cell - m.width) / 2);
    layers[i].top = Math.floor((cell - m.height) / 2);
  }
  const file = `img/strip_${fam}.webp`;
  await sharp({ create: { width: cell * 6, height: cell, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite(layers).webp({ quality: 74 }).toFile(`${OUT}/${file}`);
  return file;
}

const built = [];
const IDS = new Set();
const RARITY = [
  ['Common', [['wrench', 'Wrench'], ['piston', 'Piston'], ['spring', 'Spring'], ['rivet_gun', 'Rivet Gun (first set)'], ['rivet_gun_v2', 'Rivet Gun (second set)'], ['vice', 'Vice']]],
  ['Rare', [['blowtorch', 'Blowtorch'], ['pipe', 'Pipe'], ['blast_plate', 'Blast Plate'], ['router', 'Router']]],
  ['Epic', [['wrecking_ball', 'Wrecking Ball'], ['belt_drive', 'Belt Drive'], ['capacitor', 'Capacitor'], ['ladder', 'Ladder'], ['blueprint', 'Blueprint'], ['rewind_crank', 'Rewind Crank'], ['hydraulic_press', 'Hydraulic Press'], ['lathe', 'Lathe']]],
  ['Legendary', [['tesla_tower', 'Tesla Tower'], ['robot_arm', 'Robot Arm'], ['crane', 'Crane'], ['dynamo', 'Dynamo'], ['tilt_lever', 'Tilt Lever']]],
];
const POSES = [['hero', 'Hero'], ['small', 'Small'], ['pile', 'Pile'], ['spark', 'Spark']];

/** Sections: { title, kind: 'grid' | 'cells', cols, strip?, items | cells:[{id, label} | {empty, label}] } */
function sectionsFor(g, pieces) {
  const by = Object.fromEntries(pieces.map((p) => [p.id, p]));
  if (g.layout === 'ranks') {
    return RARITY.flatMap(([rar, fams]) => fams.map(([fam, title]) => ({
      title: `${rar}: ${title}`, kind: 'cells', cols: 6, dual: true,
      cells: [1, 2, 3, 4, 5, 6].map((n) => { const id = `${fam}_${n}`; return by[id] ? { id, label: `Rank ${n}` } : { empty: true, label: `Rank ${n}: not kept` }; }),
    })));
  }
  if (g.layout === 'offers') {
    const shapes = [];
    for (const p of pieces) { const s = p.id.replace(/^offer_/, '').replace(/_(gold|blue)$/, ''); if (!shapes.includes(s)) shapes.push(s); }
    return shapes.map((s) => ({ title: titleCase(s), kind: 'cells', cols: 2, cells: ['gold', 'blue'].map((c) => (by[`offer_${s}_${c}`] ? { id: `offer_${s}_${c}`, label: titleCase(c) } : { empty: true, label: `${titleCase(c)}: being redone` })) }));
  }
  if (g.layout === 'kits') {
    const chs = [...new Set(pieces.map((p) => p.cat))];
    return chs.map((c) => ({ title: `${c}: winding road and 12 pieces`, kind: 'grid', strip: g.sheets[c], stripNote: 'Winding road built from all 12 pieces of the chapter (pieces sent back are in the sheet too, so the joins can be judged).', items: pieces.filter((p) => p.cat === c).map((p) => p.id) }));
  }
  if (g.layout === 'panels') {
    return [1, 2, 3, 4, 5, 6, 7, 8].map((n) => ({ title: `Chapter ${n}`, kind: 'cells', cols: 2, cells: ['entrance', 'gate'].map((k) => (by[`road_panel_ch${n}_${k}`] ? { id: `road_panel_ch${n}_${k}`, label: titleCase(k) } : { empty: true, label: `${titleCase(k)}: not drawn` })) }));
  }
  if (g.layout === 'badges') {
    const cats = ['Bases', 'Glyphs', 'Parts'];
    return [{ title: 'Assembled: base + glyph + parts', kind: 'grid', strip: g.assembled, stripNote: 'Rows: brass, copper, teal, then locked bases. Glyphs: daily, offers, season, quests, album, mail. Dots, ribbons, new tag and lock are the parts. Only pieces the critic kept are used.', items: [] },
      ...cats.map((c) => ({ title: c, kind: 'grid', items: pieces.filter((p) => p.cat === c).map((p) => p.id) }))];
  }
  if (g.layout === 'resources') {
    const icons = [];
    for (const p of pieces) { const s = p.id.replace(/^res_/, '').replace(/_(hero|small|pile|spark)$/, ''); if (!icons.includes(s)) icons.push(s); }
    return icons.map((s) => ({ title: titleCase(s), kind: 'cells', cols: 4, cells: POSES.map(([k, l]) => (by[`res_${s}_${k}`] ? { id: `res_${s}_${k}`, label: l } : { empty: true, label: `${l}: not kept` })) }));
  }
  if (g.layout === 'units-78') {
    return g.families.map((fam) => ({ title: titleCase(fam), kind: 'grid', strip: g.strips[fam], stripNote: 'In the game now, ranks 1-6 (not voted on)', items: pieces.filter((p) => p.id.replace(/_[78]$/, '') === fam).map((p) => p.id) }));
  }
  const cats = [];
  for (const p of pieces) { const c = p.cat ?? ''; let s = cats.find((x) => x.title === c); if (!s) cats.push(s = { title: c, kind: 'grid', items: [] }); s.items.push(p.id); }
  return cats;
}

const KIT_LAYOUT = { '0,0': 'curve_se', '1,0': 'straight_h', '2,0': 't_junction', '3,0': 'straight_h', '4,0': 'curve_sw', '0,1': 'straight_v', '2,1': 's_curve_b', '4,1': 'straight_v', '0,2': 'curve_ne', '1,2': 'straight_h', '2,2': 'cross', '3,2': 'straight_h', '4,2': 'curve_nw', '2,3': 'curve_ne', '3,3': 's_curve_a', '4,3': 'dead_end' };

/** One winding-road sheet per chapter: the 12 kit pieces (all of them, whatever the verdict) laid out on a flat floor colour, 5 x 4 tiles. */
async function makeKitSheet(ch, pieces) {
  const T = 112, bgc = [{ r: 62, g: 98, b: 96 }, { r: 70, g: 86, b: 92 }][ch % 2];
  const layers = [];
  for (const [k, name] of Object.entries(KIT_LAYOUT)) {
    const p = pieces.find((x) => x.id === `road_ch${ch}_${name}`);
    if (!p) continue;
    const [c, r] = k.split(',').map(Number);
    layers.push({ input: await sharp(readSource(p.src)).ensureAlpha().resize(T, T).png().toBuffer(), left: c * T, top: r * T });
  }
  const file = `img/sheet_ch${ch}.webp`;
  await sharp({ create: { width: 5 * T, height: 4 * T, channels: 4, background: { ...bgc, alpha: 1 } } }).composite(layers).webp({ quality: 78 }).toFile(`${OUT}/${file}`);
  return file;
}

/** Map badges assembled: base + glyph + parts, 6 glyphs per row, kept pieces only. */
async function makeBadgeSheet(pieces) {
  const by = Object.fromEntries(pieces.filter((p) => p.critic === 'KEEP').map((p) => [p.id, p]));
  const C = 150, B = 124, layers = [];
  const img = async (id, w) => { const buf = await sharp(readSource(by[id].src)).ensureAlpha().resize({ width: w }).png().toBuffer(); return { buf, m: await sharp(buf).metadata() }; };
  const put = async (id, w, x, y) => { if (!by[id]) return; const { buf, m } = await img(id, w); layers.push({ input: buf, left: Math.round(x - m.width / 2), top: Math.round(y - m.height / 2) }); };
  const glyphs = ['daily', 'offers', 'season', 'quests', 'album', 'mail'];
  const rows = [
    ['brass', glyphs, [null, 'ribbon_timer', 'ribbon_count', 'dot_green', 'new', 'dot']],
    ['copper', ['daily_open', 'offers', 'season', 'quests', 'album', 'mail_open'], ['dot', 'ribbon_timer_urgent', null, 'dot_green', null, 'new']],
    ['teal', glyphs, ['new', null, 'dot', 'ribbon_count', 'dot_green', 'ribbon_timer_expired']],
    ['brass_locked', glyphs, ['lock', 'lock', 'lock', 'lock', 'lock', 'lock']],
  ];
  for (let r = 0; r < rows.length; r++) {
    const [base, gl, parts] = rows[r];
    for (let c = 0; c < 6; c++) {
      const cx = c * C + C / 2, cy = r * C + C / 2;
      await put(`mapbadge_base_${base}`, B, cx, cy);
      await put(`mapbadge_glyph_${gl[c]}`, Math.round(B * 0.56), cx, cy - 2);
      const part = parts[c];
      if (!part) continue;
      if (part.startsWith('ribbon')) await put(`mapbadge_${part}`, Math.round(B * 0.95), cx, cy + B * 0.42);
      else if (part === 'new') await put('mapbadge_new', Math.round(B * 0.6), cx - B * 0.28, cy - B * 0.42);
      else if (part === 'lock') await put('mapbadge_lock', Math.round(B * 0.36), cx + B * 0.34, cy + B * 0.34);
      else await put(`mapbadge_${part}`, Math.round(B * 0.3), cx + B * 0.38, cy - B * 0.36);
    }
  }
  const file = 'img/badges_assembled.webp';
  await sharp({ create: { width: 6 * C, height: rows.length * C, channels: 4, background: { r: 58, g: 74, b: 84, alpha: 1 } } }).composite(layers).webp({ quality: 80 }).toFile(`${OUT}/${file}`);
  return file;
}

async function buildGroup(g, vote) {
  const pieces = g.items.map((x) => ({ ...x, name: titleCase(x.id) }));
  const small = [], big = [];
  for (const p of pieces) {
    const buf = readSource(p.src), meta = await sharp(buf).metadata();
    p.w = meta.width;
    p.h = meta.height;
    small.push(await cellBuffer(buf, CELL));
    big.push(await cellBuffer(buf, ZCELL));
  }
  if (g.layout === 'kits') { g.sheets = {}; for (let c = 1; c <= 8; c++) g.sheets[`Chapter ${c}`] = await makeKitSheet(c, pieces); }
  if (g.layout === 'badges') g.assembled = await makeBadgeSheet(pieces);
  const grid = await packAtlases(g.key, small, CELL, COLS, PER);
  const zoom = await packAtlases(`${g.key}_zoom`, big, ZCELL, ZCOLS, ZPER, 58);
  pieces.forEach((p, i) => { p.s = grid.pos[i]; p.z = zoom.pos[i]; });
  const atlas = { g: grid.atlases, z: zoom.atlases };
  if (g.layout === 'units-78') { g.strips = {}; for (const fam of g.stripFams) g.strips[fam] = await makeStrip(fam); }
  for (const p of pieces) { delete p.src; if (IDS.has(p.id)) throw new Error(`duplicate id ${p.id}`); IDS.add(p.id); }
  const byId = Object.fromEntries(pieces.map((p) => [p.id, p]));
  const sections = sectionsFor(g, pieces);
  built.push({ key: g.key, title: g.title, blurb: g.blurb, vote, page: `${g.key}.html`, sections, byId, atlas, compare: !!g.compare, ids: pieces.filter((p) => !vote || (!p.ref && !p.noVote)).map((p) => p.id), cover: pieces.slice(0, 6).map((p) => spriteCss(atlas.g, p.s)), redoText: vote || g.compare ? [] : REDO_TEXT });
}

for (const g of GROUPS) await buildGroup(g, !g.compare);
await buildGroup(REDO, false);

const INTRO = 'This page shows the art pieces the critics kept, for you to mark LIKE or NOT. Your votes stay on this phone only. When you are done, tap Export and paste the text to the Lead.';
const head = (title) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>${esc(title)}</title><link rel="stylesheet" href="app.css"></head><body>`;
const tail = (page) => `<dialog id="dlg"></dialog><dialog id="exp"></dialog><script>var PAGE=${jsonInline(page)};</script><script src="app.js"></script></body></html>`;
const intro = `<p class="intro">${esc(INTRO)}</p>`;
const summary = built.map((g) => ({ key: g.key, title: g.title, blurb: g.blurb, vote: g.vote, page: g.page, ids: g.ids, cover: g.cover }));

writeFileSync(`${OUT}/index.html`, `${head('Art review')}<header><div class="top"><h1>Art review</h1><button class="btn sm" id="export">Export</button></div><div class="counts" id="counts"></div></header>${intro}<main id="main"></main>${tail({ mode: 'index', groups: summary })}`);
for (const g of built) {
  const page = { mode: 'group', group: { key: g.key, title: g.title, vote: g.vote, compare: g.compare, ids: g.ids, sections: g.sections, byId: g.byId, atlas: g.atlas, redoText: g.redoText } };
  writeFileSync(`${OUT}/${g.page}`, `${head(`${g.title} - art review`)}<header><div class="top"><a class="back" href="index.html">&larr; All</a><h1>${esc(g.title)}</h1><button class="btn sm" id="export">Export</button></div><div class="counts" id="counts"></div></header>${intro}<main id="main"></main>${tail(page)}`);
}
writeFileSync(`${OUT}/app.css`, readFileSync('tools/owner-review/app.css'));
writeFileSync(`${OUT}/app.js`, readFileSync('tools/owner-review/app.js'));

const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(`${d}/${e.name}`) : [`${d}/${e.name}`]));
const files = walk(OUT);
const mb = files.reduce((n, f) => n + statSync(f).size, 0) / 1048576;
const votable = built.filter((g) => g.vote).reduce((n, g) => n + g.ids.length, 0);
const redo = built.at(-1);
console.log(`${OUT}: ${votable} pieces to vote on, ${redo.ids.length} pictures + ${REDO_TEXT.length} text lines in "Being redone", ${files.length} files, ${mb.toFixed(1)} MB`);
const atlasFiles = files.filter((f) => /_\d+\.webp$/.test(f));
console.log(`${atlasFiles.length} atlas files, largest ${(Math.max(...atlasFiles.map((f) => statSync(f).size)) / 1048576).toFixed(2)} MB (artifact limit: 511 files)`);
if (files.length > MAX_FILES) throw new Error(`owner-review has ${files.length} files, over ${MAX_FILES}`);
if (mb > MAX_MB) throw new Error(`owner-review is ${mb.toFixed(1)} MB, over ${MAX_MB} MB`);
