// The piece list of the owner review page (tools/build-owner-review.mjs), read straight from the critic passes 4-7:
// keep-list.json (art-candidates/critic-N/) says what the critic kept and where the file is; the verdict tables in
// docs/art/CRITIQUE_N.md give the maker score, the critic score and the one-line note. The files are read with
// `git show` from the art batch branches, so nothing here needs a checkout of those branches.
//   KEEP = critic kept it (voting groups). NEWEST = accepted after the last critic pass (own group, none right now).
//   FIX / REDO = critic sent it back (group "Being redone", never for voting).
import { execFileSync } from 'node:child_process';

const git = (...a) => execFileSync('git', a, { maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'pipe'] }).toString();
const branches = git('branch', '-a', '--format=%(refname:short)').split('\n').filter(Boolean);
const branchFor = (task) => {
  const b = branches.find((x) => x.includes(task) && !x.startsWith('origin/')) ?? branches.find((x) => x.includes(task));
  if (!b) throw new Error(`no branch for ${task}: run git fetch origin`);
  return b;
};

/** Critic passes: task id of the critic branch that holds the keep-list and the doc (pass 4-6 docs are on the pass 6 branch). */
const PASSES = [
  { n: 4, list: 't-ca96d625', doc: 't-6cfc7a4f' },
  { n: 5, list: 't-f7df69f4', doc: 't-6cfc7a4f' },
  { n: 6, list: 't-6cfc7a4f', doc: 't-6cfc7a4f' },
  { n: 7, list: 't-1424bf49', doc: 't-1424bf49' },
];
/** Art branches searched (in order) for each file. Batch L holds J and K; batch G and D hold the rest. */
const ART = ['t-d47d4d11', 't-214a9e1e', 't-d6b95451', 't-6f793a81', 't-cf7845b7', 't-95f14f15'];

const exists = (ref, path) => { try { git('cat-file', '-e', `${ref}:${path}`); return true; } catch { return false; } };
/** Finds a branch that has the file; `hint` (a branch name from the keep-list) is tried first. */
function locate(path, hint) {
  const tries = [hint, ...ART.map(branchFor)].filter(Boolean);
  for (const b of tries) if (exists(b, path)) return { branch: b, path };
  throw new Error(`file ${path} not found on any art branch`);
}

/** Parses the verdict rows of a CRITIQUE doc: id -> { maker, mine, verdict, note }. Pass 7 prefixes the L / J icons. */
function parseDoc(task, n) {
  const out = {};
  const text = git('show', `${branchFor(task)}:docs/art/CRITIQUE_${n}.md`);
  for (const line of text.split('\n')) {
    if (!line.startsWith('|')) continue;
    const c = line.split('|').slice(1, -1).map((s) => s.trim());
    if (c.length < 5 || !/^\d+$/.test(c[1]) || !/^\d+$/.test(c[2]) || !/^(KEEP|FIX|REDO)$/.test(c[3])) continue;
    let id = c[0].replace(/ \(.*\)$/, '');
    if (/^L icon_/.test(id)) id = id.slice(2);
    else if (/^J icon_/.test(id)) id = id.slice(2) + '_J';
    const note = c.slice(4).join(' | ').replace(/\s*Fix: ".*$/s, '').replace(/\*\*/g, '').replace(/`/g, '');
    out[id] = { maker: +c[1], mine: +c[2], verdict: c[3], note: sentences(note) };
  }
  return out;
}
/** First sentences of a critic note, at most about 190 characters. */
function sentences(s) {
  const parts = s.split(/(?<=\.)\s+/);
  let o = '';
  for (const p of parts) { if (o && (o + ' ' + p).length > 190) break; o = o ? `${o} ${p}` : p; }
  return o.slice(0, 220);
}

/** Notes corrected by hand where the critic text is wrong or too long. */
const NOTES = {
  // Checked against the picture: four barrels (the old page said "side-on ... fanning right", CRITIQUE_6 says five), seen from the front.
  mortar_7: 'Seen from the front: four olive barrels with gold rims fanning up and out from a gold crown plate on the cream base. A clear step up from rank 6.',
  // Counted on the picture (the critic text said seven for both mortar_8 and horn_7, and ten rivets for the node).
  mortar_8: 'Six olive barrels with gold rims in two tiers around a gold crown plate on the cream base. Clearly wider than rank 7.',
  horn_7: 'Six gold horns (three above, three below) on the blue boiler, same base as the lower ranks. Silhouette a little round, but the family is obvious.',
  node2_normal_open: 'Cream disc in a brass porthole with five gold rivets. Number goes on the cream disc. The code adds the next-level glow.',
};

export const RANK_FAMS = ['wrench', 'piston', 'spring', 'rivet_gun_v2', 'rivet_gun', 'vice', 'blowtorch', 'pipe', 'blast_plate', 'router', 'wrecking_ball', 'belt_drive', 'capacitor', 'ladder', 'blueprint', 'rewind_crank', 'hydraulic_press', 'lathe', 'tesla_tower', 'robot_arm', 'crane', 'dynamo', 'tilt_lever'];
const ROAD_CH = { kitchen: 'LR05 Kitchen', laundry: 'LR06 Laundry', arcade: 'LR07 Arcade', music_attic: 'LR08 Music attic', scrapyard: 'LR09 Scrapyard', packing_depot: 'LR10 Packing depot', observatory: 'LR11 Observatory' };
/** id -> group key (and sub-category for the tools group so its sheets split cleanly). */
function groupOf(id) {
  if (/^(medal_)/.test(id)) return ['medallions'];
  if (/^(notebook_|day_card_|gift7_|milestone_gift_|stamp_)/.test(id)) return ['daily-gift'];
  if (/^(mortar_|horn_|fuse_box_|arc_welder_)\d/.test(id)) return ['units-78'];
  if (/^(close_|burst_|tag_limited|banner_title_|popup_frame_)/.test(id)) return ['popup-parts'];
  if (/^(scene_|reward_strip_|reward_ring_)/.test(id)) return ['popup-scenes'];
  if (/^offer_/.test(id)) return ['offers'];
  if (/^res_/.test(id)) return ['resources'];
  if (RANK_FAMS.some((f) => id.startsWith(f + '_') && /^\d$/.test(id.slice(f.length + 1)))) return ['ranks'];
  if (/^(cloud_|steam_|sparkle_|bird_|fog_)/.test(id)) return ['road-props', 'LR04 Sky and fog'];
  const rp = id.match(/^road_(kitchen|laundry|arcade|music_attic|scrapyard|packing_depot|observatory)_prop/);
  if (rp) return ['road-props', ROAD_CH[rp[1]]];
  if (/^milestone_track/.test(id)) return ['daily-gift'];
  if (/^(icon_|tool_|power_)/.test(id)) return ['tools', 'Icons, markers and chips'];
  if (/^fx_/.test(id)) return ['tools', 'Effect frames'];
  if (/^road_garage_prop/.test(id)) return ['props'];
  if (/^(node2_|arena_platform_|avatar_platform_|here_pointer_)/.test(id)) return ['nodes'];
  if (/^road_/.test(id)) return ['road-pieces'];
  if (/^(btn_|ribbon_|ui_|bar_|tab_)/.test(id)) return ['ui-kit'];
  throw new Error(`no group for ${id}`);
}

/** v5 groups for pieces first kept in passes 30-38 (null = use groupOf: ranks, v4 ids). Returns [group, sub-category]. */
function newGroupOf(id) {
  if (RANK_FAMS.some((f) => id.startsWith(f + '_') && /^\d$/.test(id.slice(f.length + 1)))) return null;
  if (/^(mascot_|boiler_)/.test(id)) return ['mascots-boilers'];
  if (/^road_chest_/.test(id)) return ['chests'];
  if (/^road_(avatar_|friend_marker)/.test(id)) return ['avatars'];
  if (/^(road_banner_|event_ribbon_|result_banner_|timer_chip_)/.test(id)) return ['banners'];
  if (/^road_(gate_|panel_|path_|postcard_)/.test(id)) return ['chapter-panels'];
  if (/^(price_|ad_|disabled_)/.test(id)) return ['buttons-bars', 'Buttons'];
  if (/^(bar_|vfill_|meter_)/.test(id)) return ['buttons-bars', 'Bars and meters'];
  if (/^socket_/.test(id)) return ['buttons-bars', 'Sockets'];
  if (/^tab_/.test(id)) return ['buttons-bars', 'Tab icons'];
  if (/^badge_/.test(id)) return ['buttons-bars', 'Badges'];
  return ['ideas'];
}

const titleOrder = ['hud', 'level-card', 'results', 'rank-badges', 'cells', 'bolt-coach', 'units-frames', 'crates', 'season-events', 'resource-extras', 'tool-fx', 'loading', 'settings', 'screw-yard', 'machine-tab', 'job-icons', 'buttons-bars', 'chapter-panels', 'chests', 'avatars', 'banners', 'ideas', 'mascots-boilers', 'ui-kit', 'popup-parts', 'popup-scenes', 'offers', 'resources', 'ranks', 'road-props', 'medallions', 'daily-gift', 'units-78', 'tools', 'props', 'nodes', 'road-pieces'];
const GROUP_META = {
  'road-kits': ['Road surface kits (8 chapters)', 'Per chapter: a winding road built from all 12 pieces, then the pieces. Pieces sent back show a FIX or REDO tag and a note (not for voting).'],
  'map-badges': ['Map badges', 'Badge bases, glyphs and parts, shown assembled first. Pieces sent back show a tag and a note (not for voting).'],
  'panels-8': ['Chapter panels, all 8', 'Entrance and gate of every chapter. Pieces sent back show a tag and a note (not for voting).'],
  'rank-redraws': ['Rank redraws, old and new', 'Each redrawn unit rank next to the older picture. Display only: vote on the redrawn picture on the Unit ranks pages (same ids).'],
  'buttons-bars': ['Buttons and bars', 'Price, ad, pressed and disabled buttons, bar fills and frames, sockets, tab icons, badges, meters.'],
  'chapter-panels': ['Road gates and path pieces', 'Gates, path pieces, postcard stamp. The chapter panels are on the Chapter panels, all 8 page.'],
  chests: ['Chests', 'Wood, iron and gold chests: closed, open, ready.'],
  avatars: ['Avatars', 'Road avatar poses and the friend marker.'],
  banners: ['Banners', 'Road banners, event ribbons, timer chips, result banners.'],
  ideas: ['New ideas (batches AM and AN)', 'Gloves, pass nodes and cards, daily cards and crates, star gears, loot tray, loading bar, HUD parts, effects, offer hero.'],
  'mascots-boilers': ['Mascots and boilers', 'Mascot poses and the boiler fill states.'],
  'ui-kit': ['UI kit', 'Buttons, bars, panels, ribbons, tabs.'],
  'popup-parts': ['Popup parts', 'Close buttons, badges, title banners, frame.'],
  'popup-scenes': ['Popup scenes and chips', 'Painted hero scenes for popups, reward strips and reward rings.'],
  offers: ['Offer templates', 'Shop offer shapes, gold and blue side by side, grouped by shape. Mock prices only.'],
  resources: ['Resource icons', 'One row per resource icon: hero, small, pile, spark.'],
  ranks: ['Unit ranks 1-6', 'All 22 units, ranks 1-6 in a row on dark and light, grouped by rarity.'],
  'road-props': ['Level road LR04-LR11: props', 'Props, clouds, steam, birds per chapter. Scenery floor tiles are left out: they do not tile.'],
  medallions: ['Medallions', 'Event medallions with an empty timer plate.'],
  'daily-gift': ['Daily gift', 'Notebook frame, day cards, gift boxes, stamp, milestone tracks.'],
  'units-78': ['Unit ranks 7-8', 'New ranks 7 and 8, one row per unit (ranks 1-6 of these units are on the Unit ranks 1-6 page; the strip shows them where they are in the game now).'],
  hud: ['HUD plates', 'Top plate, moves, boss HP and name plates, overdrive bar and pips, timer ring, tool button and tray, chain badges, shield overlay, next strip.'],
  'level-card': ['Level card and boss intro', 'Level number plate, star pill, clock chip, info and hard tags, boss portrait plate, booster tiles, rule chip, boss banners.'],
  results: ['Results pieces', 'Big stars, reward tiles, medal plate, nudge tiles, win and lose ribbons, trophy banner, level-up and quest banners.'],
  'rank-badges': ['Rank badges 1-8', 'Eight rank badges and the max crown, redone in fix batch 1.'],
  cells: ['Cell states and hazards', 'Blocked, locked, selected, preview and target cells; clamp, frost, heat and lock hazard marks.'],
  'bolt-coach': ['Mascot Bolt poses and coach pieces', 'Bolt poses, road avatar idle and hop, coach bubbles, pointing hand, focus ring, next and got-it buttons.'],
  'units-frames': ['Units screen frames', 'Rarity card frames, level badge, padlock, filter chips, rarity ribbons, stat icons, hero glow.'],
  crates: ['Crates and reveal frames', 'Five crate tiers closed and open, reveal frames, odds button, new sticker, shop tile, gem packs, burst, confetti, background.'],
  'season-events': ['Season pass and event ribbons', 'Season tabs and buttons, track nodes, reward cells, banner, task cards, event card and timer ribbon, event ribbons, medal.'],
  'resource-extras': ['Resource extras and fly effects', 'Energy, key, token and ticket icons, plus mini button, counter glow plates, fly trail sparks and arrive burst.'],
  'tool-fx': ['Tool FX, shots and impacts', 'Surge effects, tool cooldown ring, count badge, locked state, and one shot and one impact per unit family.'],
  loading: ['Loading screen, app icons and logo', 'Loading backdrops, tip plate, bar frame, loading Bolt, splash, app icons, favicon, logo, store graphics.'],
  settings: ['Settings and achievements', 'Settings icons, achievement frames and icons, collection book pieces, toast icons, ready dot, settings header gear.'],
  'screw-yard': ['Screw Yard 2.0', 'Boosters, blocks, screws, tools, trays, background and effects for the new yard.'],
  'machine-tab': ['Machine tab, mode cards and backgrounds', 'Machine upgrade plate and chips, mode icons and cards, events, victory, defeat and home title backgrounds.'],
  'job-icons': ['Unit job icons', 'One icon per unit job (what the unit does on the board).'],
  tools: ['Power tools: icons and effects', 'Tool icons, tag, markers, chips, recipe strip, and the Row Surge, Gear Bomb and Big Bang frames.'],
  props: ['Props', 'Road props: drum, toolbox, paint cans, lamp.'],
  nodes: ['Nodes and platforms', 'Level nodes in three states, boss platforms, avatar platforms, pointer.'],
  'road-pieces': ['Road pieces', 'Only the goal pad passed. The other road pieces are being redone.'],
};

// Build the KEEP set from the four keep-lists (later pass wins when a piece appears twice).
const docs = {};
for (const ps of PASSES) docs[ps.n] = parseDoc(ps.doc, ps.n);
const keep = new Map();
for (const ps of PASSES) {
  const list = JSON.parse(git('show', `${branchFor(ps.list)}:art-candidates/critic-${ps.n}/keep-list.json`));
  for (const k of list.keep) {
    let key = k.piece.replace(/_cyan$/, '');
    const docId = k.piece === 'icon_tool_tag_gold' ? 'icon_tool_tag_J' : key;
    const row = docs[ps.n][docId] ?? { maker: null, mine: k.score, verdict: 'KEEP', note: '' };
    const id = k.piece === 'icon_tool_tag_cyan' ? 'icon_tool_tag_cyan' : k.piece;
    keep.set(id, { id, pass: ps.n, maker: row.maker, mine: k.score, critic: 'KEEP', note: NOTES[id] ?? (k.flag ? `${k.flag}. ${row.note}` : row.note), src: locate(k.path, k.branch) });
  }
}

// ---- Critic passes 8-12: keep-lists have five different shapes, read here into { id, branch, path, mine, from } ----
const AB = 'art-candidates/';
const baseName = (s) => s.replace(/^.*\//, '').replace(/\.(png|webp)$/, '');
const tb = (t) => branchFor(t);
const NEW_KEEP = []; // KEEP pieces
const NEW_BACK = []; // FIX / REDO pieces: text only on the page, { id, critic, note, pass }
const NEW_PASSES = [
  { n: 8, task: 't-24f581c6' }, { n: 9, task: 't-abd5280e' }, { n: 10, task: 't-039d8cb3' }, { n: 11, task: 't-71c8e6b0' }, { n: 12, task: 't-caadab12' },
];
const lists = {};
for (const ps of NEW_PASSES) lists[ps.n] = JSON.parse(git('show', `${branchFor(ps.task)}:art-candidates/critic-${ps.n}/keep-list.json`));
const back = (n, id, critic, note) => NEW_BACK.push({ id, critic, note: note ?? '', pass: n });

// pass 8 (batch M2, popup scenes)
for (const k of lists[8].keep) NEW_KEEP.push({ id: k.piece, pass: 8, mine: k.score, branch: tb('t-ecaf9fd2'), path: k.path });
for (const k of lists[8].fix) back(8, k.piece, 'FIX', k.fix);
for (const k of lists[8].redo) back(8, k.piece, 'REDO', k.fix);
// pass 9 (batch N wrench, batch P offers)
for (const id of lists[9].batchN.keep) NEW_KEEP.push({ id, pass: 9, branch: tb('t-06eb1506'), path: `${AB}rank-art/wrench_v2/${id}.png` });
for (const id of lists[9].batchN.fix) back(9, id, 'FIX', lists[9].batchN.notes[id]);
for (const id of lists[9].batchN.redo) back(9, id, 'REDO', lists[9].batchN.notes[id]);
for (const id of lists[9].batchP.keep) NEW_KEEP.push({ id, pass: 9, branch: tb('t-8ad31f5d'), path: `${AB}offers-p/sliced/${id}/${id}.png` });
for (const id of lists[9].batchP.fix) back(9, id, 'FIX', lists[9].batchP.familyFixes.join('; '));
// pass 10 (batch O resource icons)
for (const f of lists[10].keep) NEW_KEEP.push({ id: baseName(f), pass: 10, branch: tb('t-689f6e76'), path: `${AB}resources-o/${f}` });
for (const k of lists[10].fix) back(10, baseName(k.file), 'FIX', k.fix);
// pass 11 (batch N2 ranks, batch R fixes); rivet_gun here is the v1 set
for (const k of lists[11].keep) NEW_KEEP.push({ id: k.id, pass: 11, branch: lists[11].branches[k.branch], path: k.path });
for (const k of lists[11].fix) back(11, k.id, 'FIX', k.note);
for (const k of lists[11].redo) back(11, k.id, 'REDO', k.note);
// pass 12 (batch S): rivet_gun_v2 gets ids rivet_gun_v2_N so it does not clash with the v1 set
const idS = (p) => baseName(p).replace(/^rivet_gun_(\d)$/, (m, n) => (p.includes('rivet_gun_v2') ? `rivet_gun_v2_${n}` : m));
for (const p of lists[12].keep) NEW_KEEP.push({ id: idS(p), pass: 12, branch: tb('t-1605cc14'), path: `${AB}${p}.png` });
for (const [p, note] of Object.entries(lists[12].fix)) back(12, idS(p), 'FIX', note);

// notes: first matching row of the critic doc (rows are "| id | score | verdict | note |" or "| id | verdict | note |")
const NEW_DOCS = {};
for (const ps of NEW_PASSES) {
  const rows = {};
  for (const line of git('show', `${branchFor(ps.task)}:docs/art/CRITIQUE_${ps.n}.md`).split('\n')) {
    if (!line.startsWith('|')) continue;
    const c = line.split('|').slice(1, -1).map((s) => s.trim().replace(/\*\*|`/g, ''));
    if (c.length < 3 || /^-+$/.test(c[0]) || /^(piece|template)$/i.test(c[0])) continue;
    const score = c.find((x, i) => i > 0 && /^\d+(\/20)?$/.test(x));
    const note = /^(KEEP|FIX|REDO)/.test(c.at(-1)) || /^\d+(\/20)?$/.test(c.at(-1)) ? '' : c.at(-1);
    for (const key of c[0].split(',').map((s) => s.trim())) {
      const k = key.replace(/ \(.*\)$/, '').toLowerCase();
      rows[k] ??= { mine: score ? parseInt(score, 10) : null, note: sentences(note) };
      if (/^offer_/.test(c[0]) && !/^offer_/.test(key)) rows[`offer_${k}`] ??= rows[k];
    }
  }
  NEW_DOCS[ps.n] = rows;
}
const newNote = (p) => {
  const rows = NEW_DOCS[p.pass];
  const base = p.id.replace(/^rivet_gun_v2_/, 'rivet_gun_');
  const shape = base.replace(/^offer_/, '').replace(/_(gold|blue)$/, '');
  const row = rows[base] ?? rows[base.replace(/^res_/, '')] ?? (/^offer_/.test(base) ? rows[shape] : null) ?? (NEW_DOCS[11] && /^res_|^offer_/.test(base) ? null : null);
  let note = row?.note ?? '';
  if (/^res_\w+_small$/.test(p.id)) note = `Downscaled copy of the hero drawing (critic counts it as a duplicate). ${note}`.trim();
  if (p.id === 'res_coin_hero') note = 'Clean. Conditional: only if you want coin as a soft currency.';
  if (/^offer_/.test(p.id) && note) note = `Template note: ${note}`;
  return { note, mine: p.mine ?? row?.mine ?? null };
};
for (const p of NEW_KEEP) {
  const n = newNote(p);
  // a piece re-kept in a later batch under the same file name (fx_gear_bomb_N: pass 7 and pass 12) gets a suffix so both can be voted on
  if (keep.has(p.id) && p.pass === 12) { n.note = `Redrawn in batch S (the pass 7 version has the id without the suffix). ${n.note}`.trim(); p.id = `${p.id}_p12`; }
  if (keep.has(p.id)) throw new Error(`duplicate piece id ${p.id} (pass ${p.pass} and pass ${keep.get(p.id).pass})`);
  keep.set(p.id, { id: p.id, pass: p.pass, maker: null, mine: n.mine, critic: 'KEEP', note: NOTES[p.id] ?? n.note, src: locate(p.path, p.branch) });
}

// ---- Critic passes 13-29: keep-lists have many shapes. Each pass is read into KEEP { id, branch, rels, mine, note } and
// FIX/REDO { id, verdict, note } rows. The latest verdict per id wins: a later KEEP replaces an earlier one (newer file) or
// an earlier FIX; a later FIX/REDO removes an earlier KEEP. Scenery floor/wall tiles (road_*_a/b/c) are left out on purpose:
// they do not tile (CRITIQUE_16/17) and the road uses single backdrops, so they are not for voting.
const CRITIC_TASK = { 13: 't-df6377c4', 14: 't-00aa29f8', 15: 't-011294e5', 16: 't-a399729c', 17: 't-96011d6d', 18: 't-54108048', 19: 't-31cd608f', 20: 't-c398fa6b', 21: 't-7c6deae8', 22: 't-9ebfa3c5', 23: 't-86f2ee24', 24: 't-f63d9bcf', 25: 't-7b81ae05', 26: 't-03e8249a', 27: 't-63fc640b', 28: 't-11b33606', 29: 't-9fa79930' };
const BATCH_TASK = { 21: 't-9225d1c4', 23: 't-7be528e4', 26: 't-dd59d896' };
const isTile = (id) => /^road_[a-z_]+_[abc](_v\d+)?$/.test(id);
const base = (s) => s.replace(/^.*\//, '').replace(/\.png$/, '');
const taskOf = (ref) => ref.match(/t-[0-9a-f]{8}/)[0];
const RA = 'art-candidates/rank-art/';
const treeCache = new Map();
const has = (br, p) => { let s = treeCache.get(br); if (!s) treeCache.set(br, (s = new Set(git('ls-tree', '-r', '--name-only', br).split('\n')))); return s.has(p); };
const BATCH_BRANCHES = branches.filter((b) => /chatgpt-art-batch/.test(b) && !b.startsWith('origin/'));
const pathsFor = (rels) => rels.flatMap((x) => { const ext = /\.webp$/.test(x) ? '.webp' : '.png'; const r = x.replace(/\.(png|webp)$/, ''); return [r, `${AB}${r}`, `${RA}${r}`].map((p) => p + ext); });
/** The file on the named branch; when that branch lacks it (an earlier batch made it), the first batch branch that has it. */
function findIn(br, rels) {
  for (const b of [br, ...BATCH_BRANCHES]) for (const p of pathsFor(rels)) if (has(b, p)) return { branch: b, path: p };
  throw new Error(`not found on ${br}: ${rels[0]}`);
}
const P = []; // { pass, id, verdict, branch?, rels?, mine?, note }
const add = (pass, id, verdict, o = {}) => P.push({ pass, id, verdict, note: '', ...o });
const K = {};
for (let n = 13; n <= 29; n++) K[n] = JSON.parse(git('show', `${branchFor(CRITIC_TASK[n])}:art-candidates/critic-${n}/keep-list.json`));
const fixObj = (n, o, v) => { if (Array.isArray(o)) for (const x of o) add(n, typeof x === 'string' ? base(x) : x.piece ?? x.key ?? base(x.file), v, { note: typeof x === 'string' ? '' : x.note ?? x.fix ?? '' }); else for (const [k, note] of Object.entries(o ?? {})) add(n, base(k), v, { note: typeof note === 'string' ? note : note.note ?? '' }); };
// 13 (batch T)
for (const s of K[13].keep) add(13, base(s), 'KEEP', { branch: branchFor(taskOf(K[13].branch)), rels: [`${AB}${s}.png`] });
fixObj(13, K[13].fix, 'FIX');
// 14 (batch U)
for (const k of K[14].keep) add(14, k.piece, 'KEEP', { branch: branchFor(taskOf(K[14].sourceBranch)), rels: [k.path], mine: k.score, note: k.note ?? '' });
fixObj(14, K[14].fix, 'FIX');
// 15 (batch V)
for (const k of K[15].keep) add(15, base(k.file), 'KEEP', { branch: branchFor(taskOf(K[15].branch)), rels: [`${AB}batch-v/${k.file}`], mine: k.score, note: k.note ?? '' });
for (const k of K[15].fix) { const id = base(k.file); if (id === 'fog_bank_1-3') for (const i of [1, 2, 3]) add(15, `fog_bank_${i}`, 'FIX', { note: k.fix }); else add(15, id, 'FIX', { note: k.fix }); }
// 16 (batch W) and 17 (batch X): full paths
for (const n of [16, 17]) {
  const b = branchFor(taskOf(K[n].source_branch ?? K[n].branch));
  for (const p of K[n].keep) add(n, base(p), 'KEEP', { branch: b, rels: [p] });
  fixObj(n, K[n].fix, 'FIX'); fixObj(n, K[n].redo, 'REDO');
}
// 18-22, 24, 26, 28, 29 (rank art): ids are the file names
const RANKS = {
  18: { b: () => branchFor(taskOf(K[18].sourceBranch)) }, 19: { b: () => branchFor(taskOf(K[19].sourceBranch)) }, 20: { b: () => branchFor(taskOf(K[20].sourceBranch)) },
  21: { b: () => branchFor(BATCH_TASK[21]) }, 22: { b: () => branchFor(taskOf(K[22].sourceBranch)) }, 24: { b: () => branchFor(taskOf(K[24].sourceBranch)) },
};
for (const [n, r] of Object.entries(RANKS)) {
  for (const p of K[n].keep) add(+n, base(p), 'KEEP', { branch: r.b(), rels: [p] });
  fixObj(+n, K[n].fix, 'FIX'); fixObj(+n, K[n].redo, 'REDO');
}
// 23 (batch AD)
for (const k of K[23].keep) add(23, `${k.unit}_${k.rank}`, 'KEEP', { branch: branchFor(BATCH_TASK[23]), rels: [k.file], mine: k.score });
for (const k of K[23].fix) add(23, `${k.unit}_${k.rank}`, 'FIX');
// 25 (batch AF)
for (const k of K[25].keep) add(25, k.piece, 'KEEP', { branch: branchFor(taskOf(K[25].branch)), rels: [k.path], mine: k.score, note: k.note ?? '' });
for (const k of K[25].fix) add(25, k.piece, 'FIX', { mine: k.score, note: `${k.reason}. ${k.fix}` });
// 26 (batch AG)
for (const id of K[26].keep) add(26, id, 'KEEP', { branch: branchFor(BATCH_TASK[26]), rels: [`${RA}fix_ag_v1/${id}.png`], mine: K[26].verdicts[id].score, note: K[26].verdicts[id].note });
for (const id of K[26].redo) add(26, id, 'REDO', { note: K[26].verdicts[id].note });
// 27 (batch AH)
for (const k of K[27].keep) add(27, k.key, 'KEEP', { branch: branchFor(taskOf(K[27].branch)), rels: [k.file], mine: k.score });
for (const k of K[27].fix) add(27, k.key, 'FIX', { note: k.note });
// 28 (batch AI)
for (const k of K[28].keep) add(28, base(k.file), 'KEEP', { branch: branchFor(taskOf(K[28].branch)), rels: [k.file], mine: k.score });
for (const k of K[28].fix) add(28, base(k.file), 'FIX', { mine: k.score, note: k.note });
// 29 (batch AJ)
for (const k of K[29].keep) add(29, k.piece, 'KEEP', { branch: branchFor(taskOf(K[29].sourceBranch)), rels: [k.path], mine: k.score, note: k.note ?? '' });
for (const k of K[29].fix) add(29, k.piece, 'FIX', { mine: k.score, note: k.note });

// ---- Critic passes 30-38 (v5). Pass 34 is saved on its branch as critic-4 (batch AO); pass 35 has no list. Ids of pieces that were
// in v4 stay the same (tilt_lever_N, crane_6 ...), so earlier LIKE/NOT votes still match. ----
const CT = { 30: 't-208bd6e3', 31: 't-c9983331', 32: 't-c9e05c96', 33: 't-9fd96372', 34: 't-f0e96c58', 36: 't-8762d6c4', 37: 't-5f289093', 38: 't-dc9db3ab' };
const SRC = { 30: 't-0257a407', 31: 't-c7751009', 32: 't-7e7cbabf', 33: 't-c127c437', 34: 't-eb187d4f', 36: 't-b0e816ef', 37: 't-44a66d65', 38: 't-67dcb282' };
const KL = { 30: 'critic-30', 31: 'critic-31', 32: 'critic-32', 33: 'critic-33', 34: 'critic-4', 36: 'critic-36', 37: 'critic-37', 38: 'critic-38' };
const DOCN = { 30: 30, 31: 31, 32: 32, 33: 33, 34: 4, 36: 36, 37: 37, 38: 38 };
const NK = {};
const NDOC = {};
for (const n of Object.keys(CT).map(Number)) {
  NK[n] = JSON.parse(git('show', `${branchFor(CT[n])}:art-candidates/${KL[n]}/keep-list.json`));
  // note rows of the critic doc: "| id / id | verdict | note |" (some passes have no doc table)
  const rows = {};
  let text = '';
  try { text = git('show', `${branchFor(CT[n])}:docs/art/CRITIQUE_${DOCN[n]}.md`); } catch { /* no doc */ }
  for (const line of text.split('\n')) {
    if (!line.startsWith('|')) continue;
    const c = line.split('|').slice(1, -1).map((s) => s.trim().replace(/\*\*|`/g, ''));
    if (c.length < 3 || !/(KEEP|FIX|REDO)/.test(c[1])) continue;
    const note = c.slice(2).join(' | ').replace(/\s*Prompt: ".*$/s, '');
    for (const k of c[0].split(/\s*\/\s*/)) rows[k.trim()] ??= sentences(note);
  }
  NDOC[n] = rows;
}
const nn = (n, id, own) => (own ? sentences(own) : NDOC[n][id] ?? '');
const sb = (n) => branchFor(SRC[n]);
const wbase = (s) => s.replace(/^.*\//, '').replace(/\.(png|webp)$/, '');
// 30 (batch AK)
for (const k of NK[30].keep) add(30, k.piece, 'KEEP', { branch: sb(30), rels: [`${RA}${k.file}`], mine: k.score, note: nn(30, k.piece, k.note) });
for (const k of NK[30].fix) add(30, k.piece, 'FIX', { mine: k.score, note: k.fix });
// 31 (batch AL)
for (const s of NK[31].keep) add(31, wbase(s), 'KEEP', { branch: sb(31), rels: [`${AB}batch-al/${s}.png`], note: nn(31, wbase(s)) });
for (const [s, note] of Object.entries(NK[31].fix)) { if (s.includes('..')) continue; add(31, wbase(s), 'FIX', { note }); }
// 32 (batch AM)
for (const k of NK[32].keep) add(32, k.piece, 'KEEP', { branch: sb(32), rels: [`${AB}batch-am/${k.file}`], mine: k.score, note: nn(32, k.piece, k.note) });
for (const k of NK[32].fix) add(32, k.piece, 'FIX', { mine: k.score, note: k.fix });
for (const k of NK[32].redo) add(32, k.piece, 'REDO', { mine: k.score, note: k.fix });
// 33 (batch AN)
for (const s of NK[33].keep) add(33, wbase(s), 'KEEP', { branch: sb(33), rels: [`${AB}batch-an/${s}.png`], note: nn(33, wbase(s)) });
for (const [s, note] of Object.entries(NK[33].fix)) add(33, wbase(s), 'FIX', { note });
// 34 (batch AO, critic-4 on its branch)
for (const k of NK[34].keep) add(34, k.name, 'KEEP', { branch: sb(34), rels: [k.path], mine: k.score, note: nn(34, k.name) });
for (const k of NK[34].fix) add(34, k.name, 'FIX', { mine: k.score, note: k.note });
// 36 (road art 1: gates, banners, chests)
for (const s of NK[36].keep) add(36, wbase(s), 'KEEP', { branch: sb(36), rels: [`${AB}road-art-1/${s}.png`], note: nn(36, wbase(s)) });
for (const [s, note] of Object.entries(NK[36].fix)) add(36, wbase(s), 'FIX', { note });
for (const [s, note] of Object.entries(NK[36].redo)) add(36, wbase(s), 'REDO', { note });
// 37 (road art 2: chapter panels, webp)
for (const f of NK[37].keep) add(37, wbase(f), 'KEEP', { branch: sb(37), rels: [`${AB}road-art-2/${f}`], note: nn(37, wbase(f)) });
for (const [f, note] of Object.entries(NK[37].fix)) add(37, wbase(f), 'FIX', { note });
for (const [f, note] of Object.entries(NK[37].redo)) add(37, wbase(f), 'REDO', { note });
// 38 (road art 3 fixes): ids with a slash are png sheets cuts, plain ids are webp panels
for (const s of NK[38].keep) add(38, wbase(s), 'KEEP', { branch: sb(38), rels: [s.includes('/') ? `${AB}road-art-3/${s}.png` : `${AB}road-art-3/${s}.webp`], note: nn(38, wbase(s)) });
for (const k of [...NK[38].fix, ...NK[38].redo]) add(38, wbase(k.id), NK[38].redo.includes(k) ? 'REDO' : 'FIX', { note: `${k.reason}. ${k.prompt_fix ?? ''}`.trim() });

// ---- Critic passes 39-62 (v6). Pass 40 exists twice (AQ and AR); the AS pass was saved as critic-18 on its branch (it is pass 41 here).
// Every piece id is the file name, so a later pass or a fix batch replaces the earlier verdict of the same piece. ----
const V6_PASSES = [
  { n: 39, label: '39', critic: 't-007d57a1', docN: 39, src: 't-49e1e616', dir: 'batch-ap/', list: 39 },
  { n: 40, label: '40 (AQ)', critic: 't-c2407b82', docN: 40, src: 't-827d9dff', dir: 'batch-aq/', list: 40 },
  { n: 40.1, label: '40 (AR)', critic: 't-90b7fec3', docN: 40, src: 't-b6cc5bbb', dir: 'batch-ar/', list: 40 },
  { n: 41, label: '41 (AS)', critic: 't-03ffd07d', docN: 18, src: 't-fce66d0e', dir: 'batch-as/', list: 18 },
  { n: 43, label: '43', critic: 't-aac3667b', docN: 43, src: 't-3d9a6523', dir: 'batch-at/', list: 43 },
  { n: 44, label: '44', critic: 't-a4c9e5c6', docN: 44, src: 't-3d32bc93', dir: 'batch-fix1/', list: 44 },
  { n: 45, label: '45', critic: 't-bd2292c5', docN: 45, src: 't-3703dbdb', dir: 'batch-av/', list: 45 },
  { n: 46, label: '46', critic: 't-2f9d3018', docN: 46, src: 't-9e78ad3b', dir: 'batch-aw/final/', list: 46 },
  { n: 47, label: '47', critic: 't-edb51f63', docN: 47, src: 't-6f39e569', dir: 'batch-ay/', list: 47 },
  { n: 48, label: '48', critic: 't-33e018b7', docN: 48, src: 't-2c60a883', dir: '', list: 48 },
  { n: 49, label: '49', critic: 't-c38a457f', docN: 49, src: 't-ca82bec1', dir: 'batch-fix3/final/', list: 49 },
  { n: 50, label: '50', critic: 't-b57f193d', docN: 50, src: 't-0fd17b14', dir: 'batch-az/', list: 50 },
  { n: 51, label: '51', critic: 't-d7d726e2', docN: 51, src: 't-1b1aaaaf', dir: '', list: 51 },
  { n: 52, label: '52', critic: 't-bdea36f5', docN: 52, src: 't-f74588a2', dir: 'batch-be/final/', list: 52 },
  { n: 53, label: '53', critic: 't-bb44cab5', docN: 53, src: 't-e723ba85', dir: 'batch-fx2/', list: 53 },
  { n: 54, label: '54', critic: 't-d642a072', docN: 54, src: 't-f8073fc1', dir: '', list: 54 },
  { n: 55, label: '55', critic: 't-9262f351', docN: 55, src: 't-579b2946', dir: 'batch-bg/final/', list: 55 },
  { n: 56, label: '56', critic: 't-9c452c7a', docN: 56, src: 't-2ba5280a', dir: 'yard-art-v2-bi/final/', list: 56 },
  { n: 57, label: '57', critic: 't-d93e4e48', docN: 57, src: 't-17534409', dir: 'fix-batch-6/final/', list: 57 },
  { n: 58, label: '58', critic: 't-a7711f98', docN: 58, src: 't-7cc7969c', dir: 'batch-bj-bk/final/', list: 58 },
  { n: 59, label: '59', critic: 't-1b15c48b', docN: 59, src: 't-a5a321d6', dir: 'batch-bl/', list: 59 },
  { n: 60, label: '60', critic: 't-8959faeb', docN: 60, src: 't-47b4f090', dir: 'fix-batch-7/final/', list: 60 },
  { n: 61, label: '61', critic: 't-3020f794', docN: 61, src: 't-f05fb2fd', dir: 'batch-bl/', list: 61 },
  { n: 62, label: '62', critic: 't-e204bc32', docN: 62, src: 't-d42e513d', dir: 'batch-bm/', list: 62 },
];
const bn = (s) => String(s).replace(/^.*\//, '').replace(/\.(png|webp)$/, '');
const imgTree = new Map();
/** Image files of art-candidates/ on a branch, without contact sheets, raw sheets and cell cuts. */
const imgs = (br) => {
  let s = imgTree.get(br);
  if (!s) imgTree.set(br, (s = git('ls-tree', '-r', '--name-only', br).split('\n').filter((p) => /^art-candidates\/.+\.(png|webp)$/.test(p) && !/\/(_raw|raw|_cells|refs)\/|contact-/.test(p))));
  return s;
};
/** The file for a piece on a source branch. `hint` is a path fragment (batch dir or dir/name); png wins over webp, then the shortest path. */
function locV6(br, id, hint = '') {
  let c = imgs(br).filter((p) => bn(p) === id);
  const h = c.filter((p) => hint && p.includes(hint));
  if (h.length) c = h;
  if (!c.length) throw new Error(`not found on ${br}: ${id} (${hint})`);
  c.sort((a, b) => (/\.png$/.test(a) ? 0 : 1) - (/\.png$/.test(b) ? 0 : 1) || a.length - b.length);
  return { branch: br, path: c[0] };
}
/** Rows of a critic doc: id -> { mine, note } (several ids may share a row: "a / b" or "a, b"). */
function docRows(branch, n) {
  const out = {};
  let text = '';
  try { text = git('show', `${branch}:docs/art/CRITIQUE_${n}.md`); } catch { return out; }
  for (const line of text.split('\n')) {
    if (!line.startsWith('|')) continue;
    const c = line.split('|').slice(1, -1).map((s) => s.trim().replace(/\*\*|`/g, ''));
    const v = c.findIndex((x, i) => i > 0 && /^(KEEP|FIX|REDO)\b/.test(x));
    if (v < 0) continue;
    const score = c.find((x, i) => i > 0 && i !== v && /^\d+(\/20)?$/.test(x));
    const tail = c.at(-1);
    const note = c.length - 1 > v && !/^\d+(\/20)?$/.test(tail) && !/^(none|none critical)$/i.test(tail) ? sentences(tail.replace(/\s*(Prompt|Redo|Fix): ".*$/s, '')) : '';
    for (const k of c[0].split(/\s+\/\s+|,\s*/)) out[k.trim().replace(/ \(.*\)$/, '').replace(/\.(png|webp)$/, '')] ??= { mine: score ? parseInt(score, 10) : null, note };
  }
  return out;
}
const rowFor = (rows, id) => {
  for (const k of [id, id.replace(/^(shot|impact)_/, ''), id.replace(/^(ach_icon_|job_|mode_icon_|sy2_)/, ''), id.replace(/_\d$/, ''), id.replace(/_[a-f]$/, '')]) if (rows[k]) return rows[k];
  return null;
};
const keepText = (x) => (typeof x === 'string' ? '' : x?.note ?? x?.reason ?? x?.fix ?? '');
for (const ps of V6_PASSES) {
  const critBranch = branchFor(ps.critic);
  const L = JSON.parse(git('show', `${critBranch}:art-candidates/critic-${ps.list}/keep-list.json`));
  const rows = docRows(critBranch, ps.docN);
  const br = branchFor(ps.src);
  const idOf = (x) => bn(typeof x === 'string' ? x : x.id ?? x.name ?? x.piece ?? x.file);
  const pathOf = (x) => (typeof x === 'string' ? x : x.path ?? x.file ?? x.id ?? x.name ?? x.piece);
  // keep entries are a name, "dir/name" (inside the batch dir) or a full path under art-candidates/
  const hintOf = (x) => {
    const p = String(pathOf(x)).replace(/\.(png|webp)$/, '').replace(/^art-candidates\//, '');
    if (!p.includes('/')) return ps.dir;
    return /^(batch-|fix-batch|yard-art)/.test(p) ? p : ps.dir + p;
  };
  for (const x of L.keep ?? []) {
    const id = idOf(x);
    const row = rowFor(rows, id);
    add(ps.n, id, 'KEEP', { src: locV6(br, id, hintOf(x)), mine: x.score ?? row?.mine ?? null, note: keepText(x) || row?.note || '', label: ps.label });
  }
  for (const [verdict, key] of [['FIX', 'fix'], ['REDO', 'redo']]) {
    const f = L[key];
    if (Array.isArray(f)) for (const x of f) { const id = idOf(x); add(ps.n, id, verdict, { note: keepText(x) || rowFor(rows, id)?.note || '', label: ps.label }); }
    else for (const [k, note] of Object.entries(f ?? {})) add(ps.n, bn(k), verdict, { note: typeof note === 'string' ? note : keepText(note), label: ps.label });
  }
}

// ---- v8: critic passes 63-71, the rank redraw batches, map badges and road surface kits.
// Same rule as before: the latest verdict per id wins, ids stay stable (a redrawn rank piece keeps its id and replaces the older picture).
// Road surface kits are judged in pass 70 (it re-judged every piece of passes 66 and 68), so only pass 70 is read for them.
// `pic: true` = a FIX / REDO piece whose picture is still shown on its group page (tagged, not for voting).
const V8 = (t) => branchFor(t);
const loc8 = (br, path) => { if (!has(br, path)) throw new Error(`v8: ${path} not on ${br}`); return { branch: br, path }; };
const L8 = (task, n, file = 'keep-list.json') => JSON.parse(git('show', `${branchFor(task)}:art-candidates/critic-${n}/${file}`));
const b9 = V8('t-071cff43'), b10 = V8('t-87c19b51'), b11 = V8('t-2c18c50c'), b12 = V8('t-66151b29'), b4c = V8('t-3e2ccb7a');
const bR4 = V8('t-d179438f'), bR5 = V8('t-8e72ade2'), bR5b = V8('t-e9bb9bd4'), bR5c = V8('t-e36646bc'), bFix2 = V8('t-2c60a883');
const bKit2 = V8('t-f807c19c'), bKit3 = V8('t-bf956f7c'), bBadge = V8('t-7a7ea2eb'), bRank1 = V8('t-14819aae'), bRank2 = V8('t-11f704eb');
export const RANK_REDRAWS = []; // { id, verdict, note, pass, src, old } shown next to the older pictures
const clarity = (id) => { try { git('cat-file', '-e', `ed2f3ca:art-candidates/rank-clarity/pieces/${id}.webp`); return { branch: 'ed2f3ca', path: `art-candidates/rank-clarity/pieces/${id}.webp` }; } catch { return null; } };

// 63 (fix batch 9: job icons, vice 8, lathe 7)
{
  const L = L8('t-57bc3794', 63);
  for (const s of L.keep) { const id = bn(s); add(63, id, 'KEEP', { src: loc8(b9, `art-candidates/fix-batch-9/out/${id}/${id}.webp`), label: '63' }); }
  for (const [s, note] of Object.entries(L.fix)) add(63, bn(s), 'FIX', { note, label: '63' });
}
// 64 (road art 4: chapter 4 and 5 panels)
{
  const L = L8('t-bdd977e0', 64);
  for (const k of L.keep) add(64, bn(k.file), 'KEEP', { src: loc8(bR4, k.file), note: k.note, label: '64' });
  for (const k of L.fix) add(64, bn(k.file), 'FIX', { src: loc8(bR4, k.file), note: k.fix, pic: true, label: '64' });
}
// 65 (road art 4c landmarks, fix batches 10 and 11)
const landmark = (s) => `road_landmark_${bn(s).replace(/^road_landmark_/, '')}`;
{
  const L = L8('t-e82cdeb2', 65);
  for (const s of L.keep) {
    if (/^road-art-4c/.test(s)) add(65, landmark(s), 'KEEP', { src: loc8(b4c, `art-candidates/${s}.webp`), label: '65' });
    else { const id = bn(s); add(65, id, 'KEEP', { src: loc8(/fix-batch-10/.test(s) ? b10 : b11, `art-candidates/${s}.webp`), label: '65' }); }
  }
  for (const [s, note] of [...Object.entries(L.fix), ...Object.entries(L.redo)]) add(65, /^road-art-4c/.test(s) ? landmark(s) : bn(s), L.redo[s] ? 'REDO' : 'FIX', { note, label: '65' });
}
// 67 (fix batch 12: lathe 8, vice 8, chapter 4 and 5 landmarks)
{
  const L = L8('t-f54ab622', 67);
  for (const k of L.keep) { const id = /^(lathe|vice)_/.test(k.id) ? k.id : `road_landmark_${k.id}`; add(67, id, 'KEEP', { src: loc8(b12, k.path), note: k.note ?? '', label: '67' }); }
  for (const k of L.fix) add(67, `road_landmark_${k.id}`, 'FIX', { note: `${k.reason}. ${k.prompt}`, label: '67' });
  for (const k of L.redo) add(67, `road_landmark_${k.id}`, 'REDO', { note: `${k.reason}. ${k.prompt}`, label: '67' });
}
// 71 (road art 5: chapter 6, 7 and 8 panels) and the ch2 gate (still FIX from pass 48; picture from its batch)
{
  const L = L8('t-85bf0280', 71);
  const bOf = (f) => (/road-art-5\//.test(f) ? bR5 : /road-art-5b/.test(f) ? bR5b : bR5c);
  for (const k of L.keep) add(71, bn(k.file), 'KEEP', { src: loc8(bOf(k.file), k.file), note: k.note, label: '71' });
  for (const k of L.fix) add(71, bn(k.file), 'FIX', { src: loc8(bOf(k.file), k.file), note: `${k.fix} (margins ${k.margins_px.join(' / ')} px, join ${k.join})`, pic: true, label: '71' });
  add(48, 'road_panel_ch2_gate', 'FIX', { src: loc8(bFix2, 'art-candidates/batch-fix2/s4/road_panel_ch2_gate.webp'), note: 'Sent back in pass 48 (older picture shown).', pic: true, label: '48' });
}
// 70 (road surface kits, 8 chapters x 12 pieces): ch4 and ch6 are batch 2, the rest batch 3
{
  const L = L8('t-fd3d5182', 70);
  for (let c = 1; c <= 8; c++) {
    const [br, dir] = c === 4 || c === 6 ? [bKit2, 'road-surface-kit-b2'] : [bKit3, 'road-surface-kit-b3'];
    const v = L[`ch${c}`];
    for (const n of L.pieceNames) {
      const id = `road_ch${c}_${n}`;
      const verdict = v.KEEP.includes(n) ? 'KEEP' : v.REDO[n] ? 'REDO' : 'FIX';
      const note = verdict === 'KEEP' ? '' : v[verdict][n];
      add(70, id, verdict, { src: loc8(br, `art-candidates/${dir}/ch${c}/${id}.webp`), note, pic: verdict !== 'KEEP', label: '70' });
    }
  }
}
// 69 (map badge batch 1 retry, rank redo 1). Map badge ids carry the prefix mapbadge_ (badge_lock, badge_new ... already exist as game pieces).
{
  const L = L8('t-aa7cfeb0', 69);
  const bid = (f) => `mapbadge_${bn(f).replace(/^badge_/, '')}`;
  for (const f of L.badges.KEEP) add(69, bid(f), 'KEEP', { src: loc8(bBadge, `art-candidates/map-badge-1/${f}`), label: '69' });
  for (const [f, note] of Object.entries(L.badges.FIX)) add(69, bid(f), 'FIX', { src: loc8(bBadge, `art-candidates/map-badge-1/${f}`), note, pic: true, label: '69' });
  const SC = { router_8: '7-8 pair clarity 12.8 -> 37.1', vice_3: 'pairs 2-3 to 5-6 clarity 15-27 -> 31-35', vice_4: 'pairs 2-3 to 5-6 clarity 15-27 -> 31-35', vice_5: 'pairs 2-3 to 5-6 clarity 15-27 -> 31-35', rivet_gun_8: '7-8 pair clarity 15.3 -> 42.2', piston_4: '3-4 pair clarity 17 -> 31', piston_5: '4-5 pair clarity 19 -> 27.4', piston_8: '7-8 pair clarity 17 -> 38.8' };
  for (const id of L.ranks.KEEP) { add(69, id, 'KEEP', { src: loc8(bRank1, `art-candidates/rank-redo-1/pieces/${id}.webp`), note: `Redrawn in rank redo 1 (${SC[id]}).`, label: '69' }); RANK_REDRAWS.push({ id, verdict: 'KEEP', pass: 69, src: { branch: bRank1, path: `art-candidates/rank-redo-1/pieces/${id}.webp` }, note: `Critic KEEP. Redrawn in rank redo 1 (${SC[id]}).` }); }
  for (const [id, note] of Object.entries(L.ranks.FIX)) {
    const src = { branch: bRank1, path: `art-candidates/rank-redo-1/pieces/${id}.webp` };
    RANK_REDRAWS.push({ id, verdict: 'FIX', pass: 69, src, note: `Critic FIX: ${note}. Redrawn in rank redo 1 (${SC[id]}); the older picture stays on the Unit ranks pages until a better one is made.` });
    NEW_BACK.push({ id: `${id}_redraw`, critic: 'FIX', note, pass: 69 });
  }
}
// rank redo 2: redrawn after pass 69, no critic has judged them yet (shown as NEW, voted on the Unit ranks pages)
{
  const R2 = { belt_drive_6: '5-6 pair clarity 20.7 -> 79.9, 6-7 19.5 -> 80.3', blast_plate_4: '3-4 21.5 -> 58.1, 4-5 23.1 -> 59.5', blowtorch_8: '7-8 pair clarity 19.1 -> 57.5', capacitor_6: '5-6 17.6 -> 59.5, 6-7 21.6 -> 64.2', dynamo_8: '7-8 pair clarity 19.6 -> 54.8', hydraulic_press_8: '7-8 pair clarity 22.6 -> 66.4', robot_arm_8: '7-8 pair clarity 19.9 -> 81.2', spring_2: '1-2 pair clarity 20.7 -> 58.1, 2-3 23.1 -> 49.4', spring_7: '6-7 pair clarity 17 -> 59, 7-8 18.5 -> 57' };
  for (const [id, sc] of Object.entries(R2)) {
    const src = { branch: bRank2, path: `art-candidates/rank-redo-2/pieces/${id}.webp` };
    if (!has(bRank2, src.path)) throw new Error(`v8: ${src.path} missing`);
    const note = `Redrawn in rank redo 2 (${sc}). Not yet judged by a critic.`;
    add(72, id, 'NEW', { src, note, label: 'redo 2' });
    RANK_REDRAWS.push({ id, verdict: 'NEW', pass: 72, src, note });
  }
}

P.sort((a, b) => a.pass - b.pass);
export const SUPERSEDED = [];
const PICS = new Map(); // pic: true pieces: id -> entry (latest verdict wins)
for (const e of P) {
  if (isTile(e.id)) continue;
  if (e.verdict === 'KEEP' || e.verdict === 'NEW') {
    const old = keep.get(e.id);
    if (old) SUPERSEDED.push(`${e.id}: pass ${old.pass} replaced by pass ${e.pass}`);
    PICS.delete(e.id);
    const note = e.note ? `${e.note}.`.replace(/\.\.$/, '.') : '';
    keep.set(e.id, { id: e.id, pass: e.pass, maker: null, mine: e.mine ?? null, critic: e.verdict, note: NOTES[e.id] ?? note, src: e.src ?? findIn(e.branch, e.rels), fresh: old ? old.fresh : e.pass >= 30, v6: e.pass >= 39, label: e.label });
  } else {
    const old = keep.get(e.id);
    if (old && old.pass < e.pass) { keep.delete(e.id); SUPERSEDED.push(`${e.id}: KEEP of pass ${old.pass} withdrawn by ${e.verdict} in pass ${e.pass}`); }
    NEW_BACK.push({ id: e.id, critic: e.verdict, note: e.note, pass: e.label ?? e.pass });
    if (e.pic && e.src) PICS.set(e.id, e); else PICS.delete(e.id);
  }
}

/** v6 groups for pieces first kept in passes 39-62: [regex, group, sub-category]. First match wins. */
const V6_RULES = [
  [new RegExp(`^(mortar|horn|fuse_box|arc_welder|${RANK_FAMS.join('|')})_[78]$`), 'units-78'],
  [/^(boss_portrait_plate|booster_tile_|star_pill|clock_chip|info_button_i|hard_tag|level_number_plate|rule_chip_frame|warning_banner_boss|banner_mini_boss|name_plate_boss)/, 'level-card'],
  [/^(star_big_|reward_tile_|medal_plate|retry_nudge_tile|upgrade_nudge_tile|lose_hero_sad|star_pop_burst)/, 'results', 'Result tiles and stars'],
  [/^(result_ribbon_|new_best_ribbon|boss_trophy_banner|chapter_complete_ribbon|banner_(level_up|quest_complete|new_unit|chapter_unlocked))/, 'results', 'Ribbons and title banners'],
  [/^(hud_top_plate|moves_plate|boss_hp_|boss_name_plate|overdrive_|timer_ring_frame|tool_button_frame|chain_badge_|tool_tray_frame|shield_overlay|next_strip_plate)/, 'hud'],
  [/^rank_badge_/, 'rank-badges'],
  [/^(cell_|hazard_)/, 'cells'],
  [/^(bolt_|coach_|hand_point_glow|focus_ring|arrow_dashed|road_avatar_)/, 'bolt-coach'],
  [/^(card_frame_|level_badge|padlock_silhouette|filter_chip_|rarity_ribbon_|stat_icon_|unit_hero_glow)/, 'units-frames'],
  [/^(crate_|crates_bg|reveal_frame_|odds_i_button|new_sticker|shop_tile_frame|gem_pack_)/, 'crates'],
  [/^(day_card_|gift7_|gift_|decor_|notebook_ribbon|milestone_track)/, 'daily-gift'],
  [/^(season_|btn_unlock_vip|btn_claim_small|vip_padlock|track_node_|reward_cell_|collect_all_bar|task_|event_progress_chest_bar|event_card_frame|event_timer_ribbon|medal_goldrush|ribbon_|tier_row_plate)/, 'season-events'],
  [/^(resource_plus_mini|icon_energy|icon_key|icon_token|icon_ticket|fly_|counter_glow_plate)/, 'resource-extras'],
  [/^(double_surge_fx|bomb_surge_fx|tool_cooldown_ring|tool_count_badge|tool_locked_state)/, 'tool-fx', 'Tool parts and surge effects'],
  [/^shot_/, 'tool-fx', 'Shots (one per family)'],
  [/^impact_/, 'tool-fx', 'Impacts (one per family)'],
  [/^(backdrop_load_|loading_|mascot_loading_pose|splash_)/, 'loading', 'Loading screen'],
  [/^(app_icon_|apple_touch_icon|favicon_)/, 'loading', 'App icons'],
  [/^(logo_|store_)/, 'loading', 'Logo and store graphics'],
  [/^(icon_(home|music|sound|restart)|settings_gear_badge_header)/, 'settings', 'Settings'],
  [/^ach_/, 'settings', 'Achievements'],
  [/^(book_|toast_icon_|badge_ready_dot)/, 'settings', 'Collection book, toasts, badges'],
  [/^booster_/, 'screw-yard', 'Boosters'],
  [/^sy2_/, 'screw-yard', 'Screw Yard 2.0 pieces'],
  [/^(machine_|mode_)/, 'machine-tab'],
  [/^(events_bg|victory_bg|defeat_bg|home_title_bg)/, 'machine-tab', 'Backgrounds'],
  [/^job_/, 'job-icons'],
];
const v6Group = (id) => { for (const [re, g, cat] of V6_RULES) if (re.test(id)) return [g, cat]; return null; };

/** v8 groups: all chapter panels (any pass), road surface kit pieces, map badges, chapter 4-5 landmarks. */
const KIT_PIECES = ['straight_h', 'straight_v', 'curve_ne', 'curve_nw', 'curve_se', 'curve_sw', 't_junction', 'cross', 'dead_end', 's_curve_a', 's_curve_b', 'shoulder_edge'];
const v8Group = (id) => {
  if (/^road_panel_ch[1-8]_(entrance|gate)$/.test(id)) return ['panels-8'];
  const k = id.match(/^road_ch([1-8])_(.+)$/);
  if (k && KIT_PIECES.includes(k[2])) return ['road-kits', `Chapter ${k[1]}`];
  const m = id.match(/^mapbadge_(base|glyph)?/);
  if (m) return ['map-badges', m[1] === 'base' ? 'Bases' : m[1] === 'glyph' ? 'Glyphs' : 'Parts'];
  if (/^road_landmark_/.test(id)) return ['road-props', 'Chapter 4-5 landmarks'];
  return null;
};

const byGroup = {};
for (const p of keep.values()) {
  const [g, cat] = v8Group(p.id) ?? (p.v6 ? v6Group(p.id) : null) ?? (p.fresh ? newGroupOf(p.id) : null) ?? groupOf(p.id);
  (byGroup[g] ??= []).push({ ...p, cat });
}
// FIX / REDO pieces that still have a picture on their page (tagged, not for voting)
for (const e of PICS.values()) {
  if (keep.has(e.id)) continue;
  const [g, cat] = v8Group(e.id);
  (byGroup[g] ??= []).push({ id: e.id, pass: e.pass, maker: null, mine: null, critic: e.verdict, note: e.note, fix: e.note, src: e.src, noVote: true, cat });
}
{
  const order = (p) => { const k = p.id.match(/^road_ch(\d)_(.+)$/); return k ? +k[1] * 100 + KIT_PIECES.indexOf(k[2]) : 0; };
  byGroup['road-kits']?.sort((a, b) => order(a) - order(b));
  const BO = (p) => ['Bases', 'Glyphs', 'Parts'].indexOf(p.cat);
  byGroup['map-badges']?.sort((a, b) => BO(a) - BO(b));
}

/** Rank redraws next to the older pictures (display only: the real ids are voted on the Unit ranks pages). */
const famTitle = (id) => titleCase(id.replace(/_\d$/, ''));
const REDRAW_ITEMS = RANK_REDRAWS.slice().sort((a, b) => a.id.replace(/_\d$/, '').localeCompare(b.id.replace(/_\d$/, '')) || +a.id.slice(-1) - +b.id.slice(-1)).flatMap((r) => {
  const old = clarity(r.id);
  const cat = famTitle(r.id);
  return [
    ...(old ? [{ id: `old_${r.id}`, src: old, ref: true, refText: 'older picture', cat, critic: 'ref', note: 'The picture before the redraw (as scored by the rank clarity audit).' }] : []),
    { id: `redraw_${r.id}`, src: r.src, critic: r.verdict, mine: null, maker: null, noVote: true, cat, note: r.note, fix: r.verdict === 'FIX' ? r.note : undefined },
  ];
});

/** Voting groups in page order. Pieces keep the order of the keep-lists (pass 4 first). */
export const GROUPS = ['road-kits', 'map-badges', 'panels-8', 'rank-redraws', ...titleOrder].map((key) => {
  const g = { key, title: GROUP_META[key][0], blurb: GROUP_META[key][1], items: key === 'rank-redraws' ? REDRAW_ITEMS : byGroup[key] ?? [] };
  if (key === 'rank-redraws') { g.layout = 'compare'; g.compare = true; }
  if (key === 'road-kits') g.layout = 'kits';
  if (key === 'map-badges') g.layout = 'badges';
  if (key === 'panels-8') g.layout = 'panels';
  if (key === 'units-78') {
    g.layout = 'units-78';
    g.families = [...new Set(g.items.map((p) => p.id.replace(/_[78]$/, '')))];
    g.stripFams = ['mortar', 'horn', 'fuse_box', 'arc_welder']; // ranks 1-6 of these four are in src/assets/art
  }
  if (key === 'ranks') g.layout = 'ranks';
  if (key === 'offers') g.layout = 'offers';
  if (key === 'resources') g.layout = 'resources';
  return g;
});
export const KEEP_COUNT = keep.size;

/** FIX / REDO pieces of passes 8-12 that are still not KEEP (text only, no picture on the page). The newest verdict wins. */
const latest = new Map();
for (const b of NEW_BACK) latest.set(b.id, b);
export const REDO_TEXT = [...latest.values()].filter((b) => !keep.has(b.id)).map((b) => ({ ...b, name: titleCase(b.id) }));
function titleCase(id) { return id.replace(/_v\d+$/, '').replace(/^node2_/, 'node_').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()); }

/** Accepted in a later batch and not judged by any critic yet. Batch M branch has no commits past batch L, so none yet. */
export const NEWEST = { key: 'newest', title: 'Newest, not yet critic-checked', blurb: 'Accepted in batch M and later; no critic has judged these yet.', items: [] };

const r = (cat, id, path, maker, mine, critic, fix) => ({ id, src: locate(path), maker, mine, critic, cat, note: fix, fix });
const PK = 'art-candidates/pack-v2/';
const PU = 'art-candidates/popups-v3/';
const doc7 = docs[7];
const fixText = (id) => doc7[id].note;

/** FIX and REDO pieces whose latest version is still not accepted. Shown for information only, never for voting. */
export const REDO = {
  key: 'redo', title: 'Being redone', blurb: 'The critic sent these back. Not for voting.',
  items: [
    r('UI kit and popups', 'ui_panel_popup_v03', `${PK}ui_panel_popup_v03/ui_panel_popup_v03.png`, 18, 17, 'FIX', 'Header corners differ left and right; bezel thinner at the sides. Mirror the corners and use one bezel thickness.'),
    r('UI kit and popups', 'banner_title_gold_v02', `${PU}PU06b/banner_title_gold_v02.png`, 18, 17, 'FIX', 'Soft glow on the tail outline, flat yellow. Needs a crisp 4% outline and a gloss band.'),
    r('UI kit and popups', 'popup_frame_tall', `${PU}PU05/frames_popup_frame_tall/popup_frame_tall.png`, 18, 17, 'FIX', 'Flat cobalt, brown glow, only 0.64:1. Needs an enamel gradient and a crisp outline.'),
    r('UI kit and popups', 'popup_frame_peek', `${PU}PU05/frames_popup_frame_peek/popup_frame_peek.png`, 18, 17, 'FIX', 'Flat blue, mascot paws block the title strip, too narrow (0.53:1). Make it about 0.75:1.'),
    r('UI kit and popups', 'reward_strip_4_v02', `${PU}PU06b/reward_strip_4_v02.png`, 18, 17, 'FIX', 'Slot rings are thin lines. Make recessed dark circles with thick brass rings.'),
    r('UI kit and popups', 'reward_strip_6_v02', `${PU}PU06b/reward_strip_6_v02.png`, 18, 16, 'FIX', 'Same as the 4-slot strip; the six slots are tight.'),
    r('Medallions, gifts and nodes', 'medal_goldrush', `${PU}PU12/medal_goldrush.png`, 18, 17, 'FIX', 'Gold on yellow on gold; grey metal bands. Use a deep orange-brown disc and warm brown steel.'),
    r('Medallions, gifts and nodes', 'milestone_track', `${PU}PU08/milestone_track.png`, 17, 16, 'FIX', 'Notch rings are thin lines. Make recessed dark circles with a thick brass ring.'),
    r('Medallions, gifts and nodes', 'gift7_open', `${PU}PU09/gift7_open.png`, 18, 15, 'FIX', 'Reads as two boxes plus loose coins. Redraw as one open box filling 85% of the canvas.'),
    r('Medallions, gifts and nodes', 'node2_boss_open', `${PK}LR02/boss/node2_boss_open.png`, 18, 16, 'FIX', 'Gold crown on a gold face. Use a red-orange enamel face and keep the crown gold.'),
    r('Medallions, gifts and nodes', 'avatar_platform_boss', `${PK}LR02/avatar/avatar_platform_boss.png`, 18, 16, 'FIX', 'Smaller than the mini platform. Make it 25% wider with a gold gear edge.'),
    r('Unit ranks', 'horn_8', 'art-candidates/batch-k/units/horn_8.png', 18, 16, 'FIX', 'Top rank is shorter than rank 7 (65% of the canvas height against 84%) and lost its blue boiler.'),
    r('Unit ranks', 'fuse_box_8', 'art-candidates/batch-k/units/fuse_box_8.png', 18, 16, 'FIX', 'Top rank is smaller than rank 7 (75% of the canvas height) and the brass X is gone.'),
    r('Power tools', 'icon_row_surge', 'art-candidates/batch-l/icons/icon_row_surge.png', 18, 16, 'FIX', fixText('icon_row_surge').split(/(?<=\.)\s/)[0]),
    r('Power tools', 'fx_row_surge_4', 'art-candidates/batch-j/fx_row_surge/fx_row_surge_4.png', 18, 16, 'FIX', 'Peak frame is clipped by the cell: a hard vertical edge shows at cell size. Fade the last 8% at each end.'),
    r('Power tools', 'fx_row_surge_5', 'art-candidates/batch-j/fx_row_surge/fx_row_surge_5.png', 18, 16, 'FIX', 'Same clip as frame 4.'),
    r('Road scenery', 'road_garage_a', `${PK}LR01/scenery/road_garage_a.png`, 18, 14, 'FIX', 'Photoreal floor, no outline, tiles do not stack. Batch H made a toy-style alternate (17), not accepted.'),
    r('Road scenery', 'road_garage_b', `${PK}LR01/scenery/road_garage_b.png`, 18, 14, 'FIX', 'Same as road_garage_a.'),
    r('Road scenery', 'road_garage_c', `${PK}LR01/scenery/road_garage_c.png`, 18, 15, 'FIX', 'Same as road_garage_a; keep the round arena floor lines.'),
    r('Road pieces', 'road_arrow', `${PK}LR03/pieces/road_arrow.png`, 18, 17, 'FIX', 'Cream slab on cream nodes. Use a mid-tan path, one camera, dark outline.'),
    r('Road pieces', 'road_junction', `${PK}LR03/pieces/road_junction.png`, 18, 17, 'FIX', 'Same cream-on-cream problem as road_arrow.'),
    r('Road pieces', 'road_step', `${PK}LR03/pieces/road_step.png`, 18, 17, 'FIX', 'Angled view that no other piece shares.'),
    r('Road pieces', 'road_bridge', `${PK}LR03/pieces/road_bridge.png`, 18, 17, 'FIX', 'Planks look good but sit at a 30 degree rotation.'),
    r('Road pieces', 'road_endcap', `${PK}LR03/pieces/road_endcap.png`, 18, 16, 'FIX', 'Reads as a gravestone. Make a rounded half-width pad.'),
    r('Props', 'road_garage_prop1', `${PK}LR01/props/road_garage_prop1.png`, 18, 16, 'FIX', 'Rendered tyres with a thin outline. Batch H redo was rejected (16).'),
    r('Props', 'road_garage_prop4', `${PK}LR01/props/road_garage_prop4.png`, 18, 16, 'FIX', 'Thin handle and wheels vanish at 70 px. Batch H alternate scored 17.'),
  ],
};

// a piece that is KEEP now (a later pass or a fix batch redrew it) leaves the "Being redone" list
REDO.items = REDO.items.filter((x) => !keep.has(x.id));
