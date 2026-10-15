// Builds art-candidates/owner-review-v9c/ from owner-review-v9b: adds ONE new first group "UNIT STYLE TEST: pick one"
// (vector v2 / ChatGPT style 1 / ChatGPT style 2: big sheet, same sheet at 48 px, greyscale, critic line, PICK THIS STYLE).
// Usage: node tools/build-owner-review-v9c.mjs   (v9c folder must already be a copy of v9b; sources are read with git show; needs sharp)
// Re-runnable: it patches v9c files idempotently (marker V9C).
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import sharp from 'sharp';

const OUT = 'art-candidates/owner-review-v9c';
const W = 780;
const show = (br, p) => execFileSync('git', ['show', `${br}:${p}`], { maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'pipe'] });
const VEC = 'orch/t-d139eaa2-unit-style-test-in-code-round-2', GPT = 'orch/t-bda452f6-unit-style-test-with-chatgpt-3-s';
const VD = 'art-candidates/unit-style-test/vector-v2/', GD = 'art-candidates/unit-style-test/raw/';
const jsonInline = (o) => JSON.stringify(o).replace(/</g, '\\u003c');

// key the magenta #FF00FF background of the ChatGPT sheets to the dark review background
async function keyed(buf) {
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    if (r > 200 && b > 180 && g < 110 + (255 - Math.min(r, b)) * 2) { data[i] = 27; data[i + 1] = 24; data[i + 2] = 32; }
  }
  return sharp(data, { raw: info }).png().toBuffer();
}
const big = (b) => sharp(b).resize({ width: W }).webp({ quality: 88 }).toBuffer();
const small = (b, w) => sharp(b).resize({ width: w, kernel: 'lanczos3' }).png({ palette: false }).toBuffer();
const grey = (b) => sharp(b).greyscale().resize({ width: W }).webp({ quality: 88 }).toBuffer();

const STYLES = [
  { id: 'unit_style_vector_v2', name: 'A  Code vector v2', key: 'vec', maker: 'Cannon, Coil, Bell. Drawn in code (SVG).',
    verdict: 'Critic ~16/20, RECOMMENDED: the only repeatable style for 9 families, clean edges, parts split for Unity; weakness: flatter than the painted anchor.',
    async load() { const s = await sharp(show(VEC, VD + 'sheet_dark.png')).toBuffer(); return { big: await big(s), s48: await sharp(show(VEC, VD + 'sheet_48_dark.png')).png().toBuffer(), grey: await grey(show(VEC, VD + 'sheet_grey_dark.png')) }; } },
  { id: 'unit_style_gpt_bold_toy', name: 'B  ChatGPT style 1: bold toy machine', key: 'gpt1', maker: 'Cannon, Coil, Hydraulic press. ChatGPT sheet.',
    verdict: 'Critic ~13/20, REDO: reads clearly, but the glow edges are dirty, the coil looks like a stack of rings and it is no flatter than style 2.',
    async load() { return fromGpt(GD + 'sheet_style1_bold_toy.png'); } },
  { id: 'unit_style_gpt_chunky_3d', name: 'C  ChatGPT style 2: chunky 3D toy machine', key: 'gpt2', maker: 'Cannon, Coil, Hydraulic press. ChatGPT sheet.',
    verdict: 'Critic ~13/20, REDO: closest to the painted anchor and the best backup, but busy (sparkles) and the same dirty glow edges.',
    async load() { return fromGpt(GD + 'sheet_style2_chunky_3d.png'); } },
];
async function fromGpt(p) {
  const k = await keyed(show(GPT, p));
  return { big: await big(k), s48: await small(k, 224), grey: await grey(k) };
}

mkdirSync(`${OUT}/img`, { recursive: true });
const byId = {}, ids = [];
for (const s of STYLES) {
  const r = await s.load();
  writeFileSync(`${OUT}/img/${s.id}.webp`, r.big);
  writeFileSync(`${OUT}/img/${s.id}_48.png`, r.s48);
  writeFileSync(`${OUT}/img/${s.id}_grey.webp`, r.grey);
  await sharp(r.big).resize({ width: 240 }).webp({ quality: 80 }).toFile(`${OUT}/img/${s.id}_t.webp`);
  byId[s.id] = { id: s.id, name: s.name, img: `img/${s.id}.webp`, img48: `img/${s.id}_48.png`, imgGrey: `img/${s.id}_grey.webp`, critic: 'NEW', fix: s.verdict, maker: null, note: s.maker };
  ids.push(s.id);
}
const group = {
  key: 'v9-unit-style', title: 'UNIT STYLE TEST: pick one', vote: true, compare: false, ids, byId, atlas: {}, redoText: [],
  sections: [
    { title: 'Same machines, three looks. Judge: can you tell them apart at phone size and in grey?', kind: 'styles', items: ids },
    { title: 'Not tested: D "sticker badge" (the ChatGPT run stopped after 2 sheets). Tell me in the comment if you want it tried.', kind: 'styles', items: [] },
  ],
};
const summary = {
  key: group.key, title: group.title, blurb: 'Vector v2 vs ChatGPT style 1 vs style 2: big, 48 px and greyscale, critic line, PICK THIS STYLE.', vote: true,
  page: 'v9-unit-style.html', ids: ids.length, fresh: true,
  cover: ids.map((i) => `background-image:url(img/${i}_t.webp);background-size:cover;background-position:center top`),
};

// page: clone the mocks page shell
let h = readFileSync(`${OUT}/v9-mocks.html`, 'utf8');
const a = h.indexOf('var PAGE=') + 9, e = h.indexOf(';</script>', a);
h = h.slice(0, a) + jsonInline({ mode: 'group', group }) + h.slice(e);
h = h.replace(/<title>[^<]*<\/title>/, '<title>UNIT STYLE TEST - art review v9c</title>').replace(/<h1>[^<]*<\/h1>/, `<h1>${group.title}</h1>`)
  .replace(/<p class="intro">[^<]*<\/p>/, '<p class="intro">Pick the ONE unit style to continue with. Tap PICK THIS STYLE under it (stored as a LIKE with the reason "style pick"). Each sheet is shown big, at 48 px (real size) and in greyscale. Comment box at the bottom. Votes stay on this phone; tap Export and paste to the Lead.</p>');
writeFileSync(`${OUT}/v9-unit-style.html`, h);

// index: new group first; titles/intro to v9c
const ip = `${OUT}/index.html`;
let ih = readFileSync(ip, 'utf8');
const ia = ih.indexOf('var PAGE=') + 9, ie = ih.indexOf(';</script>', ia), page = JSON.parse(ih.slice(ia, ie));
page.groups = [summary, ...page.groups.filter((g) => g.key !== summary.key)];
ih = ih.slice(0, ia) + jsonInline(page) + ih.slice(ie);
ih = ih.replace('<title>Art review v9b</title>', '<title>Art review v9c</title>').replace('<h1>Art review v9b</h1>', '<h1>Art review v9c</h1>')
  .replace('v9b (v9 trimmed):', 'v9c (v9b plus the UNIT STYLE TEST on top, pick one):');
writeFileSync(ip, ih);

// app.js: "styles" section kind
const jp = `${OUT}/app.js`;
let js = readFileSync(jp, 'utf8');
if (!js.includes('V9C')) {
  js = js.replace("  var openId = null;", `  // V9C: unit style test card: big sheet, 48 px + greyscale, critic line, PICK THIS STYLE (a LIKE with reason "style pick").
  function styleHtml(p, d) {
    var x = d[p.id] || {};
    return '<div class="mock stylecard' + (x.v ? ' ' + x.v : '') + '"><div class="mockhd"><b>' + esc(p.name) + '</b> <span class="tag NEW">' + esc(p.note) + '</span></div>' +
      '<img src="' + p.img + '" alt="' + esc(p.name) + '" loading="lazy">' +
      '<div class="stylepair"><div><div class="stripnote">48 px (real size)</div><img class="px48" src="' + p.img48 + '" alt=""></div><div><div class="stripnote">greyscale</div><img src="' + p.imgGrey + '" alt="" loading="lazy"></div></div>' +
      '<div class="fixnote">' + esc(p.fix) + '</div>' +
      '<button class="btn pick' + (x.v === 'like' ? ' on' : '') + '" data-pick="' + p.id + '">' + (x.v === 'like' ? 'PICKED (tap to undo)' : 'PICK THIS STYLE') + '</button>' +
      (x.v === 'like' ? '<input class="why" data-why="' + p.id + '" maxlength="140" placeholder="Reason (optional)" value="' + esc(x.r) + '">' : '') + '</div>';
  }
  var openId = null;`);
  js = js.replace("      if (s.kind === 'mocks')", "      if (s.kind === 'styles') h += s.items.map(function (id) { return styleHtml(g.byId[id], d); }).join('');\n      else if (s.kind === 'mocks')");
  js = js.replace("    var o = e.target.closest('[data-open]');", `    var pk = e.target.closest('[data-pick]');
    if (pk) { var pid = pk.getAttribute('data-pick'), dd = load(); if (dd[pid] && dd[pid].v === 'like') delete dd[pid]; else dd[pid] = { v: 'like', r: 'style pick' }; save(dd); refresh(); return; }
    var o = e.target.closest('[data-open]');`);
  writeFileSync(jp, js);
}
const cp = `${OUT}/app.css`;
let css = readFileSync(cp, 'utf8');
if (!css.includes('V9C')) writeFileSync(cp, css + `
/* V9C unit style test */
.stylepair{display:grid;grid-template-columns:auto 1fr;gap:10px;align-items:start;margin:8px 0}
.stylepair img{width:100%}
.stylepair img.px48{width:auto;max-width:100%;image-rendering:auto}
.btn.pick{display:block;width:100%;min-height:56px;font-size:20px;font-weight:700;margin-top:8px;background:var(--like);color:#fff;border-color:var(--like)}
.btn.pick.on{background:#145a2c;box-shadow:0 0 0 3px var(--like)}
`);
console.log('ok', ids.length);
