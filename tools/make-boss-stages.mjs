// r33 one-off: bosses and mini-bosses get minions first (JunkIlla style: the boss is the last machine of the stage).
// Boss levels: L10 2 minions, later bosses 4. Mini-boss levels: L8 2, later 3. Minion HP/time from the nearest ordinary level.
import { readFileSync, writeFileSync } from 'node:fs';
const P = 'src/content/levels.json';
const ORIG = process.argv[2];
const j = JSON.parse(readFileSync(P, 'utf8'));
const orig = JSON.parse(readFileSync(ORIG, 'utf8')).levels;
const CAST = ['kettle_grump', 'colander_clatter', 'sock_cyclops', 'iron_duchess', 'toolbox_terrier', 'traffic_cone_goblin', 'pixel_pug', 'joystick_jester', 'gramophone_goose', 'accordion_imp', 'wheelie_warthog', 'satellite_scuttler', 'parcel_pup', 'pallet_pal', 'telescope_toad', 'radar_rascal'];
const CLASSIC = ['tin_can', 'mad_fridge', 'vacuum_viper', 'toaster_twins', 'grand_piano_saurus'];
const r5 = (x) => Math.round(x / 5) * 5;
const ordinary = (o) => !o.goal && o.level % 10 !== 0 && !o.mini_boss && o.level > 2;
let seed = 99;
const rnd = () => ((seed = (seed * 1103515245 + 12345) >>> 0) / 2 ** 32);
for (const l of j.levels) {
  const boss = l.level % 10 === 0;
  if (!boss && !l.mini_boss) continue;
  if (l.waves) throw new Error('already staged');
  const ch = Math.ceil(l.level / 10);
  const m = l.level <= 10 ? 2 : boss ? 4 : 3;
  let near;
  for (let d = 1; d < 10 && !near; d++) for (const k of [l.level - d, l.level + d]) if (!near && orig[k - 1] && ordinary(orig[k - 1]) && Math.ceil(k / 10) === ch) near = orig[k - 1];
  l.waves = m;
  l.minion_hp = r5(near.hp * (1 + 0.75 * (m - 1)) * 0.8);
  l.time_seconds = r5(near.time_seconds * (1 + 0.45 * (m - 1)) * 0.9 + (boss ? 90 : orig[l.level - 1].time_seconds));
  const pool = [...CAST.slice(Math.max(0, ch - 2) * 2, ch * 2), ...CLASSIC];
  const vis = [];
  while (vis.length < m) {
    const v = pool[Math.floor(rnd() * pool.length)];
    if (!vis.includes(v)) vis.push(v);
  }
  l.wave_visuals = vis;
  delete l.star_times;
}
writeFileSync(P, JSON.stringify(j, null, 2) + '\n');
console.log(j.levels.filter((l) => l.minion_hp).map((l) => `${l.level}:${l.waves}m/${l.minion_hp}+${l.hp}/${l.time_seconds}s`).join(' '));
