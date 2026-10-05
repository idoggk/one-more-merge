// Normalise ChatGPT art into src/assets/art/<key>.png
// Usage: node tools/import-art.mjs <folder-with-pngs>
// Trims transparent padding so every sprite fills its box the same way, then resizes.
import sharp from 'sharp';
import { readdirSync, mkdirSync, statSync } from 'node:fs';
import { join, basename, extname } from 'node:path';

const src = process.argv[2];
const out = 'src/assets/art';
mkdirSync(out, { recursive: true });

const walk = (d) => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]));
const files = walk(src).filter((f) => extname(f).toLowerCase() === '.png');

const debrisNames = files.filter((f) => /debris/i.test(basename(f))).sort();
const targetOf = (n) => (/tin/.test(n) ? 0 : /fridge|kitchen/.test(n) ? 1 : /zilla|junkyard|dusk/.test(n) ? 2 : -1);

/** Map a source filename to a game key. Ordered: specific asset kinds first, so e.g. "tin_can_alley" is a stage, not a target. */
function keyFor(file) {
  const n = basename(file, '.png').toLowerCase();
  if (/app_?icon/.test(n)) return 'app_icon';
  // round 4 HUD plates
  if (/header/.test(n)) return 'hud_header';
  if (/hp|health/.test(n) && /frame/.test(n)) return 'hp_frame';
  if (/hp|health/.test(n) && /fill/.test(n)) return 'hp_fill';
  if (/gauge|segment|pill/.test(n) && !/flame/.test(n)) return /lit|active/.test(n) ? 'gauge_lit' : /_on|on_|filled/.test(n) ? 'gauge_on' : 'gauge_off';
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
    const mood = /hit|ouch/.test(n) ? 'hit' : /angry|mad|rage/.test(n) ? 'angry' : /dizzy|daze|ko/.test(n) ? 'dizzy' : null;
    if (tg >= 0 && mood) return `face_${tg}_${mood}`;
  }
  if (/stage|backdrop|scene_bg|alley|kitchen|junkyard/.test(n) && !/target/.test(n)) {
    const tg = targetOf(n);
    if (tg >= 0) return `stage_${tg}`;
  }
  if (/title|key_?art/.test(n)) return 'title';
  if (/victory|win/.test(n)) return 'victory';
  if (/defeat|lose|sad/.test(n)) return 'defeat';
  if (/starburst|rank_?up/.test(n)) return 'starburst';
  if (/crown|max/.test(n)) return 'crown';
  if (/button|btn/.test(n)) {
    const col = /red/.test(n) ? 'red' : /green/.test(n) ? 'green' : /blue/.test(n) ? 'blue' : null;
    if (col) return `btn_${col}${/press|down/.test(n) ? '_pressed' : ''}`;
  }
  if (/practice|demo|friendly/.test(n)) return 'demo_can';
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
  if (['bg', 'title', 'logo', 'vfx_flame', 'hud_header', 'hp_frame', 'hp_fill'].includes(key) || key.startsWith('stage_') || key.startsWith('banner_')) return null;
  if (key === 'app_icon') return 1024;
  if (key.startsWith('target') || key === 'demo_can' || key === 'card' || key === 'victory' || key === 'defeat' || key.startsWith('btn_')) return 512;
  if (key.startsWith('debris')) return 128;
  return 256;
};
const NO_TRIM = new Set(['slot', 'card', 'app_icon', 'title']);
for (const f of files) {
  const key = keyFor(f);
  if (!key) {
    console.log('skip (unmapped):', f);
    continue;
  }
  const dest = join(out, `${key}.png`);
  const s = SIZE(key);
  if (s === null) {
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
  console.log(`${basename(f)} -> ${key}`);
}
