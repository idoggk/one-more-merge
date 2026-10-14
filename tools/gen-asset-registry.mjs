// One-off (but re-runnable) generator for src/content/assetRegistry.ts.
// Scans src/assets/art by filename pattern, reads code-drawn texture keys (families/ranks/job icons from
// src/core/types.ts + src/game/textures.ts), synthesized sounds (src/game/audio.ts) and code-only fx modules.
// Re-running KEEPS the status / source / notes / name you edited for ids that already exist, adds new ids as
// `draft` (code-drawn units: `placeholder`) and drops entries whose art file is gone.
// Usage: node tools/gen-asset-registry.mjs
import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import { REGISTRY_PATH, BEGIN, END, readRegistry } from './asset-registry-io.mjs';

const ART_DIR = 'src/assets/art';
const read = (p) => readFileSync(p, 'utf8');

// ---- families -------------------------------------------------------------------------------------------------
const types = read('src/core/types.ts');
const ORIGINAL = [...types.match(/export const FAMILIES: Family\[\] = \[([^\]]*)\]/)[1].matchAll(/'([a-z_]+)'/g)].map((m) => m[1]);
const ROSTER = {}; // family -> batch number
for (const m of types.matchAll(/export const ROSTER_(\d): Roster\dFamily\[\] = \[([^\]]*)\]/g)) {
  for (const f of m[2].matchAll(/'([a-z_]+)'/g)) ROSTER[f[1]] = +m[1];
}
const FAMILIES = [...ORIGINAL, ...Object.keys(ROSTER)];
const MAX_RANK = +read('src/content/tuning.ts').match(/export const MAX_RANK = (\d+)/)[1];

const title = (s) => s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
const entries = [];
const add = (e) => entries.push({ rank: undefined, notes: '', ...e });

// ---- art files -------------------------------------------------------------------------------------------------
const famRe = new RegExp(`^(${FAMILIES.join('|')})_(\\d+)$`);
const hmRe = new RegExp(`^hm_(${FAMILIES.join('|')})_(\\d+)$`);
const unitPicRe = new RegExp(`^unit_(${FAMILIES.join('|')})$`);
const unclassified = [];

/** Ordered filename rules -> [category, subcategory]. First match wins. */
const RULES = [
  [/^boss_card$/, 'monsters-bosses', 'boss-card'],
  [/^boss_/, 'monsters-bosses', 'boss-phases'],
  [/^mon_/, 'monsters-bosses', 'monsters'],
  [/^(face_|target_|demo_can|tg_)/, 'monsters-bosses', 'targets-faces'],
  [/^btg_/, 'monsters-bosses', 'boss-attack-tags'],
  [/^trophy_/, 'currency-rewards', 'boss-trophies'],
  [/^bfx_/, 'projectiles-impacts', 'boss-fx'],
  [/^vfx_(wave)$/, 'merge-cascade-fx', 'vfx'],
  [/^vfx_/, 'projectiles-impacts', 'vfx'],
  [/^(debris_)/, 'projectiles-impacts', 'debris'],
  [/^(starburst)$/, 'merge-cascade-fx', 'bursts'],
  [/^max_/, 'merge-cascade-fx', 'max-rank-effects'],
  [/^(kick_|sticker_kickback)/, 'board-cells', 'kickback'],
  [/^(slot|slot_old|tray_plate|shelf_plate|scrap_plate|plate_remix|dice_)/, 'board-cells', 'cells-plates'],
  [/^prop_/, 'board-cells', 'props'],
  [/^hero_(bg)$/, 'backgrounds', 'hero'],
  [/^hero_/, 'units', 'hero-chassis'],
  [/^worker_/, 'units', 'workers'],
  [/^btn_/, 'ui-buttons', 'buttons'],
  [/^(hp_|res_bar|gauge_|star$)/, 'ui-bars-stars', 'bars-stars'],
  [/^(ui_|hud_|card)/, 'ui-panels', 'panels'],
  [/^(banner_|victory|defeat|logo|title)/, 'popups-menus', 'banners-screens'],
  [/^(icon_|role_|badge_|node_|perk_)/, 'tabs-icons', 'icons'],
  [/^(item_|booster_|medal|crown|keepsake|bolt$|orn_)/, 'currency-rewards', 'rewards-items'],
  [/^(crate_|chest_)/, 'crates', 'crates'],
  [/^(bg|bg_|stage_|stagebg_|road_)/, 'backgrounds', 'backgrounds'],
  [/^sy_/, 'screw-yard', 'screw-yard'],
];

const files = readdirSync(ART_DIR).filter((f) => /\.(webp|png)$/.test(f)).sort();
const haveUnit = new Set();
for (const file of files) {
  const id = file.replace(/\.(webp|png)$/, '');
  const rel = `${ART_DIR}/${file}`;
  let m;
  if ((m = id.match(famRe))) {
    const [, fam, r] = m;
    haveUnit.add(fam);
    const orig = ORIGINAL.includes(fam) && !(fam in ROSTER);
    add({ id, category: 'units', subcategory: fam, name: `${title(fam)} rank ${r}`, rank: +r, file: rel, status: orig ? 'final' : 'draft', source: 'chatgpt' });
    continue;
  }
  if ((m = id.match(hmRe))) {
    add({ id, category: 'units', subcategory: `hero-machine-${m[1]}`, name: `Hero machine ${title(m[1])} ${m[2]}`, rank: +m[2], file: rel, status: 'draft', source: 'chatgpt' });
    continue;
  }
  if ((m = id.match(unitPicRe))) {
    add({ id, category: 'units', subcategory: m[1], name: `${title(m[1])} picture`, file: rel, status: 'draft', source: 'chatgpt', notes: 'one picture for every rank (unitArt.ts)' });
    continue;
  }
  const rule = RULES.find(([re]) => re.test(id));
  if (!rule) {
    unclassified.push(id);
    add({ id, category: 'popups-menus', subcategory: 'unclassified', name: title(id), file: rel, status: 'draft', source: 'chatgpt', notes: 'unclassified: pick a category' });
    continue;
  }
  const final = /^boss_[a-z_]+_(intact|cracked|critical)$/.test(id);
  add({ id, category: rule[1], subcategory: rule[2], name: title(id), file: rel, status: final ? 'final' : 'draft', source: 'chatgpt' });
}

// ---- code-drawn pictures -----------------------------------------------------------------------------------------
const taken = () => new Set(entries.map((e) => e.id));
for (const fam of FAMILIES) {
  for (let r = 1; r <= MAX_RANK; r++) {
    const id = `${fam}_${r}`;
    if (taken().has(id)) continue;
    add({ id, category: 'units', subcategory: fam, name: `${title(fam)} rank ${r}`, rank: r, file: 'code-drawn', status: 'placeholder', source: 'code', notes: `drawn in code (textures.ts${ROSTER[fam] ? ` / roster${ROSTER[fam]}Art.ts` : ''})` });
  }
}
for (const fam of Object.keys(ROSTER)) {
  add({ id: `job_${fam}`, category: 'tabs-icons', subcategory: 'job-icons', name: `${title(fam)} job icon`, file: 'code-drawn', status: 'placeholder', source: 'code', notes: `roster${ROSTER[fam]}Art.ts drawJobIcon` });
}
const CODE_TEX = [
  ['dot', 'merge-cascade-fx', 'particles', 'Dot particle'],
  ['spark', 'merge-cascade-fx', 'particles', 'Spark particle'],
  ['chunk', 'projectiles-impacts', 'debris', 'Chunk debris'],
  ['hand', 'tabs-icons', 'tutorial', 'Tutorial pointing hand'],
];
for (const [id, category, subcategory, name] of CODE_TEX) {
  if (!existsSync(`${ART_DIR}/${id}.webp`)) add({ id, category, subcategory, name, file: 'code-drawn', status: 'placeholder', source: 'code', notes: 'textures.ts ensureTextures' });
}

// ---- code-only effects ----------------------------------------------------------------------------------------------
const FX = [
  ['fx/boxMoment.ts', 'crates'], ['fx/boxMomentFx.ts', 'crates'], ['fx/toolboxCrates.ts', 'crates'],
  ['fx/chainLadder.ts', 'merge-cascade-fx'], ['fx/partReact.ts', 'merge-cascade-fx'], ['fx/soClose.ts', 'merge-cascade-fx'],
  ['fx/shake.ts', 'merge-cascade-fx'], ['sandwichFx.ts', 'merge-cascade-fx'], ['rosterFx.ts', 'projectiles-impacts'],
  ['dropFeedback.ts', 'merge-cascade-fx'], ['mergeAssist.ts', 'merge-cascade-fx'],
];
for (const [f, category] of FX) {
  const base = f.split('/').pop().replace(/\.ts$/, '');
  if (existsSync(`src/game/${f}`)) add({ id: `fx_${base}`, category, subcategory: 'code-effects', name: `${title(base.replace(/([A-Z])/g, ' $1').trim())} (Phaser code)`, file: 'code-drawn', status: 'draft', source: 'code', notes: `src/game/${f}` });
}

// ---- planned power tools -----------------------------------------------------------------------------------------------
for (const [id, name] of [['power_row_surge', 'Row Surge'], ['power_gear_bomb', 'Gear Bomb']]) {
  add({ id, category: 'power-tools', subcategory: 'power-ups', name, file: 'code-drawn', status: 'placeholder', source: 'code', notes: 'planned (power-up test behind a QA flag); no art yet' });
}

// ---- fonts + sounds ------------------------------------------------------------------------------------------------------
add({ id: 'font_lilita_one', category: 'fonts', subcategory: 'display', name: 'Lilita One (display font)', file: 'code-drawn', status: 'draft', source: 'hand', notes: '@fontsource/lilita-one' });
const audio = read('src/game/audio.ts');
const sfxBody = audio.slice(audio.indexOf('export const sfx = {'), audio.indexOf('function iosHapticLabel'));
const sfxKeys = [...sfxBody.matchAll(/^ {2}([a-zA-Z0-9_]+): /gm)].map((m) => m[1]);
for (const k of sfxKeys) add({ id: `sfx_${k}`, category: 'sounds', subcategory: 'sfx', name: `sfx.${k}`, file: 'code-drawn', status: 'draft', source: 'synth', notes: 'synthesized in audio.ts (WebAudio)' });
for (const mode of ['normal', 'mini', 'boss', 'final']) add({ id: `music_${mode}`, category: 'sounds', subcategory: 'music', name: `Music (${mode})`, file: 'code-drawn', status: 'draft', source: 'synth', notes: 'procedural loop in audio.ts' });

// ---- level road v2 slots (src/game/road/roadArt.ts ROAD_SLOTS): a code-drawn fallback until the picture file lands -------------------
const roadSlots = [
  ...Array.from({ length: 8 }, (_, i) => `chapterScenery_${i + 1}`),
  'pathTile',
  ...['normal', 'hard', 'mega', 'mini', 'boss'].flatMap((k) => ['locked', 'open', 'done'].map((s) => `nodeFrame_${k}_${s}`)),
  'avatarMarker',
  'fog',
];
for (const id of roadSlots) {
  if (!existsSync(`${ART_DIR}/${id}.webp`) && !existsSync(`${ART_DIR}/${id}.png`)) add({ id, category: 'backgrounds', subcategory: 'level-road-v2', name: `Road slot ${id}`, file: 'code-drawn', status: 'placeholder', source: 'code', notes: 'slot read by src/game/road (drop src/assets/art/<id>.png|webp to replace the code-drawn fallback)' });
}

// ---- merge with existing registry (keep hand edits) ---------------------------------------------------------------------------
const old = existsSync(REGISTRY_PATH) && read(REGISTRY_PATH).includes(BEGIN) ? new Map(readRegistry().map((e) => [e.id, e])) : new Map();
const seen = new Set();
const out = [];
for (const e of entries) {
  if (seen.has(e.id)) throw new Error(`duplicate id ${e.id}`);
  seen.add(e.id);
  const prev = old.get(e.id);
  const merged = prev ? { ...e, name: prev.name, status: prev.status, source: prev.source, notes: prev.notes, category: prev.category, subcategory: prev.subcategory } : e;
  if (merged.rank === undefined) delete merged.rank;
  out.push(merged);
}
const ORDER = ['units', 'monsters-bosses', 'board-cells', 'projectiles-impacts', 'merge-cascade-fx', 'ui-buttons', 'ui-panels', 'ui-bars-stars', 'popups-menus', 'tabs-icons', 'currency-rewards', 'crates', 'backgrounds', 'screw-yard', 'power-tools', 'fonts', 'sounds'];
out.sort((a, b) => ORDER.indexOf(a.category) - ORDER.indexOf(b.category));

const header = `// Asset registry: one entry per art file in src/assets/art, per code-drawn picture, per synthesized sound and per
// code-only effect. Generated by tools/gen-asset-registry.mjs (re-running keeps your status/notes edits); edit
// 'status' by hand to promote an asset (placeholder -> draft -> final). Checked by tests/assetRegistry.test.ts.
// See docs/art/ASSET_HUB.md.

export type AssetCategory = ${ORDER.map((c) => `'${c}'`).join(' | ')};
export type AssetStatus = 'placeholder' | 'draft' | 'final';
export type AssetSource = 'chatgpt' | 'hand' | 'code' | 'synth';

export interface AssetEntry {
  id: string;
  category: AssetCategory;
  subcategory: string;
  name: string;
  /** Repo-relative path under src/assets/art, or 'code-drawn' for pictures/sounds/effects made in code. */
  file: string;
  status: AssetStatus;
  source: AssetSource;
  /** Unit rank (1..) for units. */
  rank?: number;
  notes: string;
}

export const ASSET_CATEGORIES: AssetCategory[] = [${ORDER.map((c) => `'${c}'`).join(', ')}];
export const ASSET_STATUSES: AssetStatus[] = ['placeholder', 'draft', 'final'];

export const assetsIn = (category: AssetCategory) => ASSET_REGISTRY.filter((a) => a.category === category);
export const assetById = (id: string) => ASSET_REGISTRY.find((a) => a.id === id);

${BEGIN} (JSON, one entry per line; machine-edited)
export const ASSET_REGISTRY: AssetEntry[] = [
`;
const body = out.map((e) => '  ' + JSON.stringify(e)).join(',\n');
writeFileSync(REGISTRY_PATH, `${header}${body},\n];\n${END}\n`);
console.log(`${out.length} entries (${files.length} files); unclassified: ${unclassified.join(', ') || 'none'}`);
