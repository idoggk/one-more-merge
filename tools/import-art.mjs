// Normalise ChatGPT art into src/assets/art/<key>.png
// Usage: node tools/import-art.mjs <folder-with-pngs>
// Trims transparent padding so every sprite fills its box the same way, then resizes.
import sharp from 'sharp';
import { readdirSync, mkdirSync, statSync, unlinkSync } from 'node:fs';
import { join, basename, extname } from 'node:path';

const src = process.argv[2];
const out = 'src/assets/art';
mkdirSync(out, { recursive: true });
// not shipped in the game bundle: store frames + app icon source
const extraOut = 'assets_src';
mkdirSync(extraOut, { recursive: true });

const walk = (d) => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]));
// de-duplicate by file name (packs overlap); later paths win
const byName = new Map();
for (const f of walk(src).filter((f) => extname(f).toLowerCase() === '.png').sort()) byName.set(basename(f).toLowerCase(), f);
const files = [...byName.values()];

const debrisNames = files.filter((f) => /debris/i.test(basename(f))).sort();
const kickNames = files.filter((f) => /^kickback_/i.test(basename(f))).sort();
const targetOf = (n) =>
  /vacuum|viper/.test(n) ? 3 : /toaster_?twins|twins/.test(n) ? 4 : /piano/.test(n) ? 5 : /tin/.test(n) ? 0 : /fridge|kitchen/.test(n) ? 1 : /zilla|junkyard|dusk/.test(n) ? 2 : -1;

/** Map a source filename to a game key. Ordered: specific asset kinds first, so e.g. "tin_can_alley" is a stage, not a target. */
function keyFor(file) {
  const n = basename(file, '.png').toLowerCase();
  if (/app_?icon/.test(n)) return 'app_icon';
  // round 9: MAX signature effects (+ _v9 gadget redraws handled by the family/rank rule; later folders win)
  if (/backfire/.test(n)) return 'max_backfire';
  if (/bridge/.test(n)) return 'max_bridge';
  if (/chime/.test(n)) return 'max_chime';
  if (/twin_?pull|attraction/.test(n)) return 'max_twin';
  if (/split|charge_branch/.test(n)) return 'max_split';
  if (/gust/.test(n)) return 'max_gust';
  // round 8: rank dice + tutorial
  { const m = n.match(/^rank_dice_0?([1-6])$/); if (m) return `dice_${m[1]}`; }
  if (/pointing_hand/.test(n)) return 'ui_hand';
  if (/^ui_coach_bubble/.test(n)) return 'ui_coach';
  if (/^ui_how_to_play/.test(n)) return 'ui_howto';
  // round 7: ui plates
  if (n === 'board_slot_quiet') return 'slot';
  if (n === 'board_slot_empty') return 'slot_old';
  if (/^ui_title_console/.test(n)) return 'ui_console';
  if (/^ui_countdown_bubble/.test(n)) return 'ui_bubble';
  if (/^ui_event_ribbon/.test(n)) return 'ui_ribbon';
  if (/^ui_perk_choice_row/.test(n)) return 'ui_perk_row';
  // round 6: remix
  if (/^kickback_/.test(n)) {
    const tg = targetOf(n);
    const parts = kickNames.filter((k) => targetOf(basename(k, '.png').toLowerCase()) === tg);
    if (tg >= 0) return `kick_${tg}_${parts.indexOf(file)}`;
  }
  if (/^telegraph_/.test(n)) return /piano|lock/.test(n) ? 'tg_piano' : /toaster|eject/.test(n) ? 'tg_twins' : /vacuum|suction/.test(n) ? 'tg_vacuum' : 'tg_cell';
  if (/badge_remix|remix_badge/.test(n)) return 'badge_remix';
  if (/plate_remix|record_plate|trophy/.test(n)) return 'plate_remix';
  // round 4 HUD plates
  if (/header/.test(n)) return 'hud_header';
  if (/hp|health/.test(n) && /frame/.test(n)) return 'hp_frame';
  if (/hp|health/.test(n) && /fill/.test(n)) return 'hp_fill';
  if (/gauge|pill/.test(n) && !/flame|vfx/.test(n)) return /lit|active/.test(n) ? 'gauge_lit' : /_on|on_|filled/.test(n) ? 'gauge_on' : 'gauge_off';
  if (/tray/.test(n)) return 'tray_plate';
  if (/scrap/.test(n) && /plate|button/.test(n)) return 'scrap_plate';
  if (/pause/.test(n)) return 'icon_pause';
  if (/badge/.test(n) && !/starburst/.test(n)) {
    const fam = /red|cannon/.test(n) ? 'cannon' : /cyan|blue|coil/.test(n) ? 'coil' : /gold|yellow|bell/.test(n) ? 'bell' : null;
    if (fam) return `badge_${fam}`;
  }
  if (/banner|ribbon|sticker/.test(n)) {
    if (/kickback/.test(n)) return 'sticker_kickback';
    if (/overdrive/.test(n)) return 'banner_overdrive';
    if (/destroy/.test(n)) return 'banner_destroyed';
    if (/chain/.test(n)) return 'banner_chain';
  }
  if (/screenshot|store_frame|store/.test(n)) {
    const k = n.match(/(\d+)/)?.[1];
    if (k) return `store_${k}`;
  }
  if (/practice_?bench|sandbox|workbench_practice/.test(n)) return 'bg_practice';
  if (/corner_?bench|workbench_corner/.test(n)) return 'bg_corner';
  for (const fam of ['battery', 'fan']) if (n.includes(fam)) {
    const r = n.match(/(?:rank|r)[_-]?0?([1-6])/)?.[1];
    if (r) return `${fam}_${r}`;
  }
  if (/magnet/.test(n)) {
    const r = n.match(/(?:rank|r)[_-]?0?([1-6])/)?.[1];
    if (r) return `magnet_${r}`;
  }
  if (/logo|wordmark/.test(n)) return 'logo';
  if (/debris/.test(n)) return `debris_${debrisNames.indexOf(file)}`;
  if (/^vfx|vfx_/.test(n)) {
    if (/spark/.test(n)) return 'vfx_spark';
    if (/arc/.test(n)) return 'vfx_arc';
    if (/wave|ring/.test(n)) return 'vfx_wave';
    if (/muzzle/.test(n)) return 'vfx_muzzle';
    if (/impact|burst/.test(n)) return 'vfx_impact';
    if (/flame|overdrive/.test(n)) return /corner/.test(n) ? 'vfx_flame_corner' : 'vfx_flame';
  }
  if (/overdrive.*(flame|border)|flame.*(corner|segment|border)/.test(n)) return /corner/.test(n) ? 'vfx_flame_corner' : 'vfx_flame';
  if (/^perk|perk_icon/.test(n)) {
    for (const [k, re] of [['twin', /twin/], ['leads', /lead/], ['encore', /encore/], ['juice', /juice/], ['quality', /quality/]]) if (re.test(n)) return `perk_${k}`;
  }
  if (/face|expression/.test(n)) {
    const tg = targetOf(n);
    const mood = /_(hit|ouch)$/.test(n) ? 'hit' : /_(dizzy|daze|ko)$/.test(n) ? 'dizzy' : /_(angry|rage)$/.test(n) ? 'angry' : null;
    if (tg >= 0 && mood) return `face_${tg}_${mood}`;
  }
  if (/stage|backdrop|scene_bg|alley|kitchen|junkyard/.test(n) && !/target/.test(n)) {
    const tg = targetOf(n);
    if (tg >= 0) return `stage_${tg}`;
  }
  if (/title|key_?art/.test(n)) return 'title';
  if (/^target_/.test(n) && !/practice/.test(n)) {
    const tg = targetOf(n);
    if (tg >= 0) return `target_${tg}${/damag|broken|dmg/.test(n) ? '_dmg' : ''}`;
  }
  if (/victory/.test(n)) return 'victory';
  if (/defeat/.test(n)) return 'defeat';
  if (/starburst|rank_?up/.test(n)) return 'starburst';
  if (/crown|max/.test(n)) return 'crown';
  if (/button|btn/.test(n)) {
    const col = /red/.test(n) ? 'red' : /green/.test(n) ? 'green' : /blue/.test(n) ? 'blue' : null;
    if (col) return `btn_${col}${/press|down/.test(n) ? '_pressed' : ''}`;
  }
  if (/practice_tin|demo|friendly/.test(n)) return 'demo_can';
  const fam = ['cannon', 'coil', 'bell'].find((f) => n.includes(f));
  const rank = n.match(/(?:rank|r)[_-]?0?([1-6])/)?.[1] ?? n.match(/_0?([1-6])(?:_|$)/)?.[1];
  if (fam && rank) return `${fam}_${rank}`;
  const tgt = targetOf(n);
  if (tgt >= 0 && /target|intact|damag|broken/.test(n)) return `target_${tgt}${/damag|broken|dmg/.test(n) ? '_dmg' : ''}`;
  if (n.includes('workbench') || n.includes('background') || n === 'bg') return 'bg';
  if (n.includes('slot')) return 'slot';
  if (n.includes('scrap')) return 'icon_scrap';
  if (n.includes('timer') || n.includes('clock')) return 'icon_timer';
  if (n.includes('overdrive') || n.includes('bolt')) return 'icon_bolt';
  if (n.includes('card') || n.includes('frame')) return 'card';
  return null;
}

/** Box (longest side) each key is normalised into; null = keep aspect at full width 720. */
const SIZE = (key) => {
  if (key.startsWith('store_')) return null;
  if (['bg', 'bg_practice', 'bg_corner', 'title', 'logo', 'vfx_flame', 'hud_header', 'hp_frame', 'hp_fill'].includes(key) || key.startsWith('stage_') || key.startsWith('banner_')) return null;
  if (key === 'app_icon') return 1024;
  if (key.startsWith('ui_')) return 720;
  if (key.startsWith('dice_')) return 160;
  if (key.startsWith('target') || key === 'demo_can' || key === 'card' || key === 'victory' || key === 'defeat' || key.startsWith('btn_')) return 512;
  if (key.startsWith('debris')) return 128;
  return 256;
};
const NO_TRIM = new Set(['slot', 'card', 'app_icon', 'title']);
/** Non-square UI pieces keep their own aspect ratio (no square padding). */
const KEEP_ASPECT = (key) => /^(dice_|ui_|tray_plate|scrap_plate|btn_|banner_|sticker_|gauge_|icon_pause|badge_|plate_)/.test(key);
for (const f of files) {
  const key = keyFor(f);
  if (!key) {
    console.log('skip (unmapped):', f);
    continue;
  }
  const shipped = !(key.startsWith('store_') || key === 'app_icon');
  const dest = join(shipped ? out : extraOut, `${key}.png`);
  const s = SIZE(key);
  if (s !== null && KEEP_ASPECT(key)) {
    const buf = await sharp(f).trim({ threshold: 10 }).png().toBuffer();
    await sharp(buf).resize(s, s, { fit: 'inside' }).png({ compressionLevel: 9 }).toFile(dest);
  } else if (s === null) {
    const src = NO_TRIM.has(key) ? sharp(f) : sharp(f).trim({ threshold: 10 });
    const buf = await src.png().toBuffer();
    await sharp(buf).resize({ width: 720 }).png({ compressionLevel: 9 }).toFile(dest);
  } else if (NO_TRIM.has(key) && key !== 'slot' && key !== 'card') {
    await sharp(f).resize(s, s, { fit: 'cover' }).png({ compressionLevel: 9 }).toFile(dest);
  } else {
    const trimmed = NO_TRIM.has(key) ? sharp(f) : sharp(f).trim({ threshold: 10 });
    const buf = await trimmed.png().toBuffer();
    await sharp(buf)
      .resize(s - 8, s - 8, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .extend({ top: 4, bottom: 4, left: 4, right: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png({ compressionLevel: 9, palette: false })
      .toFile(dest);
  }
  if (shipped) {
    await sharp(dest).webp({ quality: 86, alphaQuality: 90, effort: 5 }).toFile(dest.replace(/\.png$/, '.webp'));
    unlinkSync(dest);
  }
  console.log(`${basename(f)} -> ${key}`);
}
