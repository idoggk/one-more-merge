// Builds art-candidates/owner-review-v9/: the v8 review page (unchanged groups) plus the v9 groups, painted mocks first.
// Same approach as v8 (tools/build-owner-review.mjs): static, offline, phone-first; small pieces packed into sprite atlases
// (grid tier + zoom tier), webp only, no external requests. Votes and group comments stay in the phone's localStorage.
// v8 groups are copied from the v8 branch output (git show), their index entries are kept; v9 groups come first.
// Images and critic docs are read with `git show` from HEAD or from the batch branches (found by task id), nothing is checked out.
// Usage: node tools/build-owner-review-v9.mjs     Needs sharp (npm ci) and the batch branches present locally.
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname } from 'node:path';
import sharp from 'sharp';

// v9b = v9 trimmed: superseded versions, REDO pieces that were not redone, assembled mocks, raw/duplicate sheets removed.
const OUT = 'art-candidates/owner-review-v9b';
const DROP_V8_GROUPS = new Set(['redo', 'rank-redraws', 'ranks', 'units-78', 'units-frames']); // redo = old "being redone" page; rank-redraws = old-vs-new display, replaced by rank redo 4 / fix 5
const DROP_V8_SECTION = /^Chapter (4|6):|^Assembled:/; // ch4/ch6 v1 kits (v2 kits and v4 exist); assembled badge mock
const WEAK = []; // REDO and not redone: listed on page 1 instead of shown
const DROPPED = []; // superseded by a newer version of the same asset
const V8_DIR = 'art-candidates/owner-review';
const V8_TASK = 't-aad78cee';
const CELL = 192, COLS = 8, PER = 64, ZCELL = 384, ZCOLS = 4, ZPER = 16, PAD = 2, MAX_ATLAS_MB = 2;
const MAX_FILES = 254, MOCK_W = 780;

const git = (...a) => execFileSync('git', a, { maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'pipe'] });
const branchCache = {};
const refOf = (task) => {
  if (task === 'HEAD') return 'HEAD';
  if (!branchCache[task]) {
    const b = git('for-each-ref', '--format=%(refname:short)', `refs/heads/orch/${task}*`, `refs/remotes/origin/orch/${task}*`).toString().split('\n').filter(Boolean)[0];
    if (!b) throw new Error(`no branch for ${task}`);
    branchCache[task] = b;
  }
  return branchCache[task];
};
const show = (ref, path) => git('show', `${refOf(ref)}:${path}`);
const lsTree = (ref, dir) => git('ls-tree', '-r', '--name-only', refOf(ref), '--', dir).toString().split('\n').filter(Boolean);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const jsonInline = (o) => JSON.stringify(o).replace(/</g, '\\u003c');
const titleCase = (id) => id.replace(/__\w+$/, '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

// ---------- critic docs: number -> { ref, path }. Later numbers win. ----------
const DOCS = {
  85: ['HEAD', 'docs/art/mocks/road-map/PAINTED_CRITIQUE_V2.md'],
  86: ['HEAD', 'docs/art/mocks/screw-yard/PAINTED_CRITIQUE_V2.md'],
  87: ['HEAD', 'docs/art/mocks/screw-yard/RENDER_CRITIQUE.md'],
  88: ['HEAD', 'docs/art/CRITIQUE_88.md'],
  89: ['HEAD', 'docs/art/CRITIQUE_89.md'],
  90: ['HEAD', 'docs/art/CRITIQUE_90.md'],
  91: ['HEAD', 'docs/art/mocks/screw-yard/RENDER_CRITIQUE_V2.md'],
  92: ['t-163e390a', 'docs/art/CRITIQUE_92.md'],
  93: ['t-2b3aa2fe', 'docs/art/CRITIQUE_93.md'],
  94: ['t-a8cb7b37', 'docs/art/CRITIQUE_94.md'],
  95: ['t-eceeeefe', 'docs/art/CRITIQUE_95.md'],
  96: ['t-128e8548', 'docs/art/CRITIQUE_96.md'],
  97: ['t-09ead268', 'docs/art/CRITIQUE_97.md'],
  98: ['t-790a6588', 'docs/art/CRITIQUE_98.md'],
};
const docLines = Object.fromEntries(Object.entries(DOCS).map(([n, [r, p]]) => [n, show(r, p).toString().split('\n')]));

const clean = (s) => s.replace(/\*\*/g, '').replace(/`/g, '').replace(/\s+/g, ' ').trim();
/** Verdict of a piece from the critic docs allowed for its source (highest number first). Keys are tried in order. */
function lookup(keys, docs) {
  for (const n of [...docs].sort((a, b) => b - a)) {
    for (const key of keys) {
      const re = new RegExp(`(?<![a-z0-9_])${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![a-z0-9_])`, 'i');
      // table rows first (they hold the per-piece verdict), then any other line that names the piece
      for (const rows of [docLines[n].filter((l) => l.startsWith('|')), docLines[n].filter((l) => !l.startsWith('|'))]) {
        for (const line of rows) {
          const m = re.exec(line);
          if (!m) continue;
          const v = /\b(KEEP|FIX|REDO)\b/.exec(line.slice(m.index));
          if (!v) continue;
          const score = /(\d{1,2})\s*\/\s*20/.exec(line.slice(m.index));
          let note;
          if (line.startsWith('|')) {
            const cells = line.split('|').map((c) => clean(c)).filter((c) => c && !re.test(c) && !/^(\*\*)?(KEEP|FIX|REDO)/.test(c));
            note = cells.reduce((a, c) => (c.length > a.length ? c : a), '');
            if (note.length < 20) note = '';
          } else note = clean(line).replace(/^[-*\d.\s]+/, '');
          return { verdict: v[1], mine: score ? +score[1] : null, note: note.length > 190 ? `${note.slice(0, 187)}...` : note, doc: n };
        }
      }
    }
  }
  return null;
}

// ---------- groups ----------
const SKIP = /@2x|\.(md|json|mjs)$|\/raw\/|\/orig\/|\/ref\/|contact|strip44|\/2x\//;
/** Image files under a source dir; webp preferred over png of the same name. */
function listImages(ref, dir) {
  const files = lsTree(ref, dir).filter((f) => /\.(webp|png)$/.test(f) && !SKIP.test(f));
  const by = new Map();
  for (const f of files) { const k = f.replace(/\.(webp|png)$/, ''); if (!by.has(k) || f.endsWith('.webp')) by.set(k, f); }
  return [...by.values()].sort();
}

const KIT = (v, note) => (id) => (/_(t_junction|cross)$/.test(id) ? { verdict: 'REDO', note: 'T-junction and cross: arm joins fail', doc: 97 } : { verdict: 'KEEP', note, doc: 97 });
// CRITIQUE_93 summary line: REDO road kit, ring segments; FIX clouds; everything else KEEP.
const V1_RULE = (id) => {
  if (/^road_ch\d_/.test(id)) return { verdict: 'REDO', note: 'Flat street-tile kit, not the mock ribbon (whole kit REDO).', doc: 93 };
  if (/^ring_segment/.test(id)) return { verdict: 'REDO', note: 'Ring segments REDO.', doc: 93 };
  if (/^cloud_/.test(id)) return { verdict: 'FIX', note: 'Dark maroon outline the mock does not have.', doc: 93 };
  return null;
};
const V1_DFLT = { verdict: 'KEEP', note: 'Not listed as FIX or REDO in the summary.', doc: 93 };
const CLOUD_V2 = (id) => (/^cloud_/.test(id) ? { verdict: 'FIX', mine: 14, note: 'Six clouds share one flaw: use only as foreground pop decorations or re-roll soft.', doc: 97 } : null);
const GROUPS = [
  { key: 'v9-badges', title: 'Map badges: batch 2 and v2', blurb: 'Badge bases, glyphs, chapter ring, tab bar. Batch 2 (CRITIQUE_88) next to the 15 replacements v2 (CRITIQUE_95).',
    sources: [
      { ref: 'HEAD', dir: 'art-candidates/map-badge-2/final', cat: 'Batch 2 (27 pieces, CRITIQUE_88)', docs: [88] },
      { ref: 't-462bc28b', dir: 'art-candidates/map-badge-2-v2/final', cat: 'v2 replacements (CRITIQUE_95)', docs: [95], suffix: '__v2' },
    ] },
  { key: 'v9-road-new', title: 'Road map new pieces: v1, v2, v3', blurb: 'Nodes, play buttons, plaques, scenery, clouds, platforms, ch4 road kit (CRITIQUE_93, 97, 98). v4 is not on any branch yet.',
    sources: [
      { ref: 't-91628e3e', dir: 'art-candidates/road-map-new', cat: 'v1 first pass (CRITIQUE_93)', docs: [93], suffix: '__v1', rule: V1_RULE, dflt: V1_DFLT, skipRe: /road-map-new-v/, dropRe: /^(cloud_|scenery_ch4_body)/ },
      { ref: 't-a7584630', dir: 'art-candidates/road-map-new-v2/ch4_kit', cat: 'v2 chapter 4 road kit (CRITIQUE_97)', docs: [97], suffix: '__v2', rule: KIT('v2', 'Cream ribbon, gold lanes, plum wall: on target, after ghost-stud fix') },
      { ref: 't-a7584630', dir: 'art-candidates/road-map-new-v2/final', cat: 'v2 sky, bar, plaque, scenery (CRITIQUE_97)', docs: [97], suffix: '__v2', dropRe: /^scenery_ch4_body/ },
      { ref: 't-a7584630', dir: 'art-candidates/road-map-new-v2/fixed', cat: 'v2 clouds and platforms (CRITIQUE_97)', docs: [97], suffix: '__v2', rule: CLOUD_V2, dropRe: /^cloud_/ },
      { ref: 't-3acda9dd', dir: 'art-candidates/road-map-new-v3/pieces', cat: 'v3 props and open gate (CRITIQUE_98)', docs: [98], suffix: '__v3' },
      { ref: 'HEAD', dir: 'art-candidates/final-leftovers/pieces', cat: 'Final leftovers: platform, ch4 scenery, clouds, pipes (not critic-reviewed)', docs: [98], suffix: '__lo', dflt: { verdict: 'NEW', note: 'Newest version, not critic-reviewed yet.', doc: 98 }, dfltOnly: true },
      { ref: 'HEAD', dir: 'art-candidates/road-map-new-v4', cat: 'v4 ch4 road kit and ch7/ch8 entrance panels (newest)', docs: [98], suffix: '__v4', skipRe: /join_/, dflt: { verdict: 'NEW', note: 'Newest version, not critic-reviewed yet.', doc: 98 }, dfltOnly: true },
    ] },
  { key: 'v9-slices', title: 'Road map slices v2', blurb: 'Icons cut from the painted road map mock (CRITIQUE_90).',
    sources: [{ ref: 'HEAD', dir: 'art-candidates/road-map-slices-v2', cat: 'Slices (CRITIQUE_90)', docs: [90], suffix: '__s2' }] },
  { key: 'v9-ch6', title: 'Chapter 6 strip kit v2', blurb: 'Chapter 6 road kit v2 (all 12 pieces, CRITIQUE_95). The ch7/ch8 panel tries are replaced by the v4 entrances on the road map page.',
    sources: [
      { ref: 't-bb85a9c5', dir: 'art-candidates/road-kit-ch6-strip-v2/ch6', cat: 'Chapter 6 road kit v2 (CRITIQUE_95)', docs: [95], dfltOnly: true, suffix: '__v2', dflt: { verdict: 'KEEP', note: 'Whole kit KEEP (CRITIQUE_95); shoulder_edge is geometry only', doc: 95 } },
    ] },
  { key: 'v9-3d', title: 'Screw Yard 3D renders v2', blurb: 'Rendered screws, plank, beam, toolbox, turntable (CRITIQUE_87, 91) and the slot / red variants.',
    sources: [
      { ref: 'HEAD', dir: 'art-candidates/screw-yard-3d-v2/1x', cat: 'Renders v2 (CRITIQUE_91)', docs: [91, 87] },
      { ref: 'HEAD', dir: 'art-candidates/screw-yard-3d-v2/variants/1x', cat: 'Variants (slot heads, red fix)', docs: [91, 87], suffix: '__var' },
    ] },
  { key: 'v9-gpt', title: 'Screw Yard GPT pieces v1, v2, v3', blurb: 'Tool icons and tiles, buttons, plate, star, stages, win pieces (CRITIQUE_94, 96, 98).',
    sources: [
      { ref: 't-5c263b0f', dir: 'art-candidates/screw-yard-new/sliced', cat: 'v1 (CRITIQUE_94)', docs: [94], suffix: '__v1' },
      { ref: 't-128e8548', dir: 'art-candidates/screw-yard-new-v2/sliced', cat: 'v2 (CRITIQUE_96)', docs: [96], suffix: '__v2' },
      { ref: 't-128e8548', dir: 'art-candidates/screw-yard-new-v3/sliced', cat: 'v3 (CRITIQUE_98)', docs: [98], suffix: '__v3' },
    ] },
];

const MOCKS = {
  key: 'v9-mocks', title: 'Painted full-page mocks (start here)', blurb: 'Road map v2 and Screw Yard v2, four states each, with the critic line (CRITIQUE_85, 86).',
  sections: [
    { title: 'Road map v2 (CRITIQUE_85)', ref: 't-1716254a', dir: 'art-candidates/mockups/road-map-painted-v2', items: [
      ['normal_try1', '1 Normal', 'KEEP', 'Style anchor. Only leftover: node 33 still shows 3 stars (live art overrides).'],
      ['boss_try2', '2 Boss', 'KEEP', 'Best of the set: clean calm rails, Bolt clearly worried, best safe areas.'],
      ['chapter_try1', '3 Chapter', 'FIX', 'Popup is great; QUESTS and SEASON chips broken, node states contradict "0/10".'],
      ['locked_try1', '4 Locked', 'FIX', 'Good ice road and gate; wallet at the very top and the plate says CH 4 for level 41.'],
    ] },
    { title: 'Screw Yard v2 (CRITIQUE_86)', ref: 't-640f9aa7', dir: 'art-candidates/mockups/screw-yard-painted-v2', items: [
      ['v2_01_start', '1 Start', 'KEEP', 'Master, with live-layer rules. Clean, best screw read; HUD still sits partly in the island zone.'],
      ['v2_02_mid', '2 Mid', 'KEEP', 'Same layout as 01, clear state story (empty holes, flying screw, 2/5 row).'],
      ['v2_03_danger', '3 Danger', 'FIX', 'Layout offset from 01/02, small labels shrank again, red-on-red screw remains, glow baked in.'],
      ['v2_04_win', '4 Win', 'KEEP', 'Hero cannon matches, NEXT: COIL passes 44 px; ghost UI behind is the only nit.'],
    ] },
  ],
};

// ---------- image helpers (as v8) ----------
async function cellBuffer(buf, cell) {
  const inner = cell - 2 * PAD;
  const { data, info } = await sharp(buf).ensureAlpha().resize({ width: inner, height: inner, fit: 'inside' }).png().toBuffer({ resolveWithObject: true });
  return { input: data, left: PAD + Math.floor((inner - info.width) / 2), top: PAD + Math.floor((inner - info.height) / 2) };
}
async function packAtlases(name, cells, cell, cols, per, q0 = 74) {
  const atlases = [], pos = [];
  for (let a = 0; a * per < cells.length; a++) {
    const part = cells.slice(a * per, (a + 1) * per);
    const c = Math.min(cols, part.length), rows = Math.ceil(part.length / c);
    const layers = part.map((x, i) => ({ input: x.input, left: (i % c) * cell + x.left, top: Math.floor(i / c) * cell + x.top }));
    const f = `img/${name}_${a}.webp`;
    let size = 0;
    for (let q = q0; q >= 40; q -= 8) {
      const out = await sharp({ create: { width: c * cell, height: rows * cell, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite(layers).webp({ quality: q, alphaQuality: 90 }).toBuffer();
      size = out.length;
      if (size <= MAX_ATLAS_MB * 1048576 * 0.95) { writeFileSync(`${OUT}/${f}`, out); break; }
    }
    if (size > MAX_ATLAS_MB * 1048576) throw new Error(`atlas ${f} over ${MAX_ATLAS_MB} MB`);
    atlases.push({ f, cols: c, rows });
    part.forEach((_, i) => pos.push([a, i % c, Math.floor(i / c)]));
  }
  return { atlases, pos };
}
const spriteCss = (at, [a, col, row]) => {
  const A = at[a], px = A.cols > 1 ? (col / (A.cols - 1)) * 100 : 0, py = A.rows > 1 ? (row / (A.rows - 1)) * 100 : 0;
  return `background-image:url(${A.f});background-size:${A.cols * 100}% ${A.rows * 100}%;background-position:${+px.toFixed(4)}% ${+py.toFixed(4)}%`;
};

// ---------- start: copy v8 output ----------
rmSync(OUT, { recursive: true, force: true });
mkdirSync(`${OUT}/img`, { recursive: true });
const v8Files = lsTree(V8_TASK, V8_DIR);
for (const f of v8Files) {
  const rel = f.slice(V8_DIR.length + 1);
  if (['app.js', 'app.css', 'index.html', 'README.md'].includes(rel)) continue;
  const gk = rel.replace(/^img\//, '').replace(/(_zoom)?_\d+\.webp$|\.html$/, '');
  if (DROP_V8_GROUPS.has(gk)) continue;
  if (/^img\/(sheet_ch\d|badges_assembled|strip_\w+)\.webp$/.test(rel)) continue; // assembled (non-painted) road and badge mocks
  mkdirSync(dirname(`${OUT}/${rel}`), { recursive: true });
  writeFileSync(`${OUT}/${rel}`, show(V8_TASK, f));
}
const v8Index = show(V8_TASK, `${V8_DIR}/index.html`).toString();
const m0 = v8Index.indexOf('var PAGE=') + 9;
const v8Groups = JSON.parse(v8Index.slice(m0, v8Index.indexOf(';</script>', m0))).groups.filter((g) => !DROP_V8_GROUPS.has(g.key));
const REMOVED_V8 = [];
for (const key of ['road-kits', 'map-badges']) { // drop assembled strips and the ch4/ch6 v1 kits from the copied pages
  const p = `${OUT}/${key}.html`, h = readFileSync(p, 'utf8');
  const a = h.indexOf('var PAGE=') + 9, e = h.indexOf(';</script>', a), page = JSON.parse(h.slice(a, e));
  const gr = page.group;
  gr.sections = gr.sections.filter((s) => !DROP_V8_SECTION.test(s.title));
  for (const s of gr.sections) if (s.strip && /sheet_ch|badges_assembled/.test(s.strip)) { delete s.strip; delete s.stripNote; }
  const keep = new Set(gr.sections.flatMap((s) => s.items));
  REMOVED_V8.push(...gr.ids.filter((i) => !keep.has(i)));
  gr.ids = gr.ids.filter((i) => keep.has(i));
  writeFileSync(p, h.slice(0, a) + jsonInline(page) + h.slice(e));
  const gi = v8Groups.find((x) => x.key === key);
  if (gi) gi.ids = gr.ids;
}

const built = [];
const unmatched = [];
const IDS = new Set();

async function buildMocks() {
  const byId = {}, sections = [], ids = [], cover = [];
  for (const s of MOCKS.sections) {
    const items = [];
    for (const [stem, name, verdict, line] of s.items) {
      const id = `mock_${s.dir.includes('road-map') ? 'road' : 'yard'}_${stem}`;
      const img = `img/${id}.webp`;
      const buf = sharp(show(s.ref, `${s.dir}/${stem}.png`)).resize({ width: MOCK_W, withoutEnlargement: true });
      await buf.clone().webp({ quality: 80 }).toFile(`${OUT}/${img}`);
      const thumb = `img/${id}_t.webp`;
      await buf.clone().resize({ width: 140 }).webp({ quality: 70 }).toFile(`${OUT}/${thumb}`);
      cover.push(`background-image:url(${thumb});background-size:cover;background-position:center top`);
      byId[id] = { id, name: `${s.title.split(' (')[0]} ${name}`, img, critic: verdict, fix: line, maker: null };
      items.push(id); ids.push(id); IDS.add(id);
    }
    sections.push({ title: s.title, kind: 'mocks', items });
  }
  built.push({ key: MOCKS.key, title: MOCKS.title, blurb: MOCKS.blurb, vote: true, page: `${MOCKS.key}.html`, sections, byId, atlas: { g: [], z: [] }, ids, cover: cover.slice(0, 6), fresh: true });
}

async function buildGroup(g) {
  const pieces = [], sections = [];
  const stemOf = (f) => f.split('/').pop().replace(/\.(webp|png)$/, '');
  const listed = g.sources.map((src) => listImages(src.ref, src.dir).filter((f) => !(src.skipRe && src.skipRe.test(f))));
  for (const [si, src] of g.sources.entries()) {
    const later = new Set(listed.slice(si + 1).flat().map(stemOf));
    const files = listed[si].filter((f) => {
      const stem = stemOf(f);
      if (later.has(stem) || (src.dropRe && src.dropRe.test(stem))) { DROPPED.push(`${g.key}: ${stem} (${src.cat.split(' (')[0]})`); return false; }
      return true;
    });
    const items = [];
    for (const f of files) {
      const stem = stemOf(f);
      let id = stem + (src.suffix ?? '');
      if (IDS.has(id)) id = `${stem}_${f.split('/').at(-2)}${src.suffix ?? ''}`; // same file name in two folders
      if (IDS.has(id)) throw new Error(`duplicate id ${id}`);
      const keys = [src.keyOf ? src.keyOf(stem) : stem, stem.replace(/^road_ch\d_/, ''), stem.replace(/_(pressed|glow|disabled|slot)$/, ''), stem.replace(/_slot$/, '').replace(/_[UYG]$/, '_R'), stem.replace(/^tool_icon_/, ''), stem.replace(/_b$/, '_a'), stem.replace(/_[RUYG]$/, '')].filter((k, i, a) => k && a.indexOf(k) === i);
      let r = src.rule ? src.rule(stem) : null;
      if (!r && src.dflt && src.dfltOnly) r = src.dflt;
      r = r ?? lookup(keys.slice(0, 1), src.docs) ?? lookup(keys.slice(1), src.docs) ?? src.dflt ?? null;
      if (r && r.verdict === 'REDO') { WEAK.push(`${stem} (${src.cat.split(' (')[0]}): ${r.note || 'REDO'}`); continue; }
      if (!r) unmatched.push(`${g.key}: ${id}`);
      const buf = show(src.ref, f);
      const meta = await sharp(buf).metadata();
      pieces.push({ id, name: titleCase(stem), critic: r ? r.verdict : 'UNJUDGED', mine: r?.mine ?? null, fix: r ? `${r.note ? `${r.note} ` : ''}(CRITIQUE_${r.doc})`.trim() : 'No critic verdict found in the docs yet.', w: meta.width, h: meta.height, buf, src: f, ranksRef: src.ranksRef });
      items.push(id); IDS.add(id);
      if (src.ranksRef) {
        const refId = `ref_${id}`;
        try {
          const rb = readFileSync(`src/assets/art/${stem}.webp`);
          pieces.push({ id: refId, name: `${titleCase(stem)} (in the game now)`, ref: true, refText: 'in the game now', critic: 'ref', w: 0, h: 0, buf: rb });
          items.push(refId); IDS.add(refId);
        } catch { /* no game picture */ }
      }
    }
    if (items.length) sections.push({ title: src.cat, kind: 'grid', items });
  }
  const small = [], big = [];
  for (const p of pieces) { small.push(await cellBuffer(p.buf, CELL)); big.push(await cellBuffer(p.buf, ZCELL)); }
  const grid = await packAtlases(g.key, small, CELL, COLS, PER);
  const zoom = await packAtlases(`${g.key}_zoom`, big, ZCELL, ZCOLS, ZPER, 58);
  pieces.forEach((p, i) => { p.s = grid.pos[i]; p.z = zoom.pos[i]; delete p.buf; delete p.ranksRef; });
  const atlas = { g: grid.atlases, z: zoom.atlases };
  built.push({ key: g.key, title: g.title, blurb: g.blurb, vote: true, page: `${g.key}.html`, sections, byId: Object.fromEntries(pieces.map((p) => [p.id, p])), atlas, ids: pieces.filter((p) => !p.ref).map((p) => p.id), cover: pieces.filter((p) => !p.ref).slice(0, 6).map((p) => spriteCss(atlas.g, p.s)), fresh: true });
}

await buildMocks();
for (const g of GROUPS) await buildGroup(g);

// ---------- pages ----------
const INTRO = 'v9b (v9 trimmed): painted mocks first, then the new pieces with the latest critic verdict (green KEEP, amber FIX, red REDO, grey = no verdict yet). Mark LIKE or NOT; each group page also has a comment box. Votes and comments stay on this phone. Tap Export and paste the text to the Lead.';
const head = (title) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="color-scheme" content="dark light"><title>${esc(title)}</title><link rel="stylesheet" href="app.css"></head><body>`;
const tail = (page) => `<dialog id="dlg"></dialog><dialog id="exp"></dialog><script>var PAGE=${jsonInline(page)};</script><script src="app.js"></script></body></html>`;
const intro = `<p class="intro">${esc(INTRO)}</p>`;
const nDrop = (re) => DROPPED.filter((d) => re.test(d)).length;
const REMOVED = [
  'Assembled (non-painted) mocks: the 8 winding-road sheets and the assembled badge sheet.',
  `Road map v1 pieces replaced by v2/v3/v4/leftovers: ${nDrop(/^v9-road-new: .*v1 first pass/)} (clouds, ch4 scenery, kit pieces).`,
  `Road map v2 pieces replaced by v3, v4 or the final leftovers: ${nDrop(/^v9-road-new: .*(v2 )/)}.`,
  `Map badge batch 2 pieces redone in v2: ${nDrop(/^v9-badges/)}.`,
  'Road map slices v1 (v2 replaced them), first Screw Yard 3D set and intermediate renders (only the final red-fixed set).',
  `Screw Yard GPT v1/v2 pieces where v3 exists: ${nDrop(/^v9-gpt/)}.`,
  'Chapter 6 strip kit v1, chapter 4 and 6 first road kits, ch7/ch8 panel tries (v4 entrances shown instead).',
  'Unit art: you said it is too detailed and hard to identify; being redone in a new simpler style (see the Style test group when ready).',
  `${WEAK.length} other pieces whose latest verdict is REDO and were not redone (named below).`,
  'The old "Being redone" page (24 FIX pieces) and raw sheets, contact sheets and duplicates.',
  'Kept: every older group that is not superseded or decided yet (popups, HUD, offers, nodes, panels, resources...).',
];
const removedHtml = `<details open><summary><b>What was removed and why</b></summary><ul>${REMOVED.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></details><details><summary><b>Known weak, being redone (${WEAK.length})</b></summary><ul>${WEAK.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></details>`;
const summary = [
  ...built.map((g) => ({ key: g.key, title: g.title, blurb: g.blurb, vote: true, page: g.page, ids: g.ids, cover: g.cover, fresh: true })),
  ...v8Groups,
];
writeFileSync(`${OUT}/index.html`, `${head('Art review v9b')}<header><div class="top"><h1>Art review v9b</h1><button class="btn sm" id="export">Export</button></div><div class="counts" id="counts"></div></header>${intro}<div class="intro">${removedHtml}</div><main id="main"></main>${tail({ mode: 'index', groups: summary })}`);
for (const g of built) {
  const page = { mode: 'group', group: { key: g.key, title: g.title, vote: true, compare: false, ids: g.ids, sections: g.sections, byId: g.byId, atlas: g.atlas, redoText: [] } };
  writeFileSync(`${OUT}/${g.page}`, `${head(`${g.title} - art review v9`)}<header><div class="top"><a class="back" href="index.html">&larr; All</a><h1>${esc(g.title)}</h1><button class="btn sm" id="export">Export</button></div><div class="counts" id="counts"></div></header>${intro}<main id="main"></main>${tail(page)}`);
}
writeFileSync(`${OUT}/app.css`, readFileSync('tools/owner-review-v9/app.css'));
writeFileSync(`${OUT}/app.js`, readFileSync('tools/owner-review-v9/app.js'));

// ---------- report ----------
const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(`${d}/${e.name}`) : [`${d}/${e.name}`]));
const countFiles = () => walk(OUT).length;
const pieceCount = built.reduce((n, g) => n + g.ids.length, 0);
const tally = {};
for (const g of built) for (const id of g.ids) { const c = g.byId[id].critic; tally[c] = (tally[c] ?? 0) + 1; }
const NOT_INCLUDED = [
  ...REMOVED,
  'Rank pieces in the v8 Unit ranks page that the fix batch replaced are still inside that page (atlas not re-cut).',
  'CRITIQUE_87 as a separate doc is the first 3D render critique (HEAD docs/art/mocks/screw-yard/RENDER_CRITIQUE.md); later verdicts (91) win.',
  'Screw Yard backdrop and the win hero pieces from v2 are still open in CRITIQUE_98 (backdrop REDO), no new picture exists.',
  'Chapter 7/8 panel tries have verdicts only for the two try2 pictures (REDO); other tries show "no verdict".',
  'Pieces whose critic doc line could not be matched show UNJUDGED (list below).',
  'Map badge v2 contact sheets, raw sheets and @2x files are left out on purpose (pieces only).',
];
const readme = `# Owner art review v9

Open \`index.html\` (phone friendly, 390 px wide, dark and light mode, no external requests). Built by \`node tools/build-owner-review-v9.mjs\` (reads HEAD and the batch branches with git, needs \`npm ci\` for sharp).

- v9 groups first: painted mocks (8 full-page images, CRITIQUE_85 and 86), then ${built.length - 1} piece groups with ${pieceCount - 8} pieces, each with the latest critic verdict chip (KEEP / FIX / REDO, grey = none found).
- Earlier groups are the v8 pages, unchanged (copied from branch \`orch/${V8_TASK}-owner-review-page-v8-everything\`).
- LIKE / NOT per piece as in v8, plus a free comment box on every group page. Export JSON now has a \`comments\` object next to \`votes\` and \`reasons\`.
- Verdict chips for the new pieces: ${Object.entries(tally).map(([k, v]) => `${k} ${v}`).join(', ')}.

Files: FILECOUNT in this folder (limit: 255 per publish call, 511 per artifact). Total size SIZEMB MB.

## Not included yet
${NOT_INCLUDED.map((x) => `- ${x}`).join('\n')}

## Known weak, being redone (${WEAK.length})
${WEAK.map((x) => `- ${x}`).join('\n')}

## No verdict found (${unmatched.length})
${unmatched.length ? unmatched.map((x) => `- ${x}`).join('\n') : '- none'}
`;
writeFileSync(`${OUT}/README.md`, readme);
let files = walk(OUT);
const mb = files.reduce((n, f) => n + statSync(f).size, 0) / 1048576;
writeFileSync(`${OUT}/README.md`, readme.replace('FILECOUNT', String(files.length)).replace('SIZEMB', mb.toFixed(1)));
files = walk(OUT);
console.log(`${OUT}: ${pieceCount} v9 pieces (incl. 8 mocks), ${built.length} v9 groups + ${v8Groups.length} v8 groups, ${files.length} files, ${mb.toFixed(1)} MB`);
console.log('verdicts', JSON.stringify(tally), 'unmatched', unmatched.length);
if (unmatched.length) console.log(unmatched.join('\n'));
if (files.length > MAX_FILES) throw new Error(`${files.length} files, over ${MAX_FILES}`);
