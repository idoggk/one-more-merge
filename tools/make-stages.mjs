// r33 one-off: turn single-monster levels into stages of machines (Ido: "like JunkIlla, ~5 in a stage").
// ch1 3 machines, ch2 4, ch3+ 5 (L1-L2 tutorial stay single, L3 = 2). Goal levels: (n-1) HP machines + the goal machine.
// Bosses / mini-bosses unchanged here. HP is a starting guess; tools/sim-levels.ts refits it.
import { readFileSync, writeFileSync } from 'node:fs';
const P = 'src/content/levels.json';
const j = JSON.parse(readFileSync(P, 'utf8'));
const L = j.levels;
if (L.some((l) => l.waves)) throw new Error('already staged');
const CAST = ['kettle_grump', 'colander_clatter', 'sock_cyclops', 'iron_duchess', 'toolbox_terrier', 'traffic_cone_goblin', 'pixel_pug', 'joystick_jester', 'gramophone_goose', 'accordion_imp', 'wheelie_warthog', 'satellite_scuttler', 'parcel_pup', 'pallet_pal', 'telescope_toad', 'radar_rascal'];
const CLASSIC = ['tin_can', 'mad_fridge', 'vacuum_viper', 'toaster_twins', 'grand_piano_saurus'];
const r5 = (x) => Math.round(x / 5) * 5;
const special = (l) => l.level % 10 === 0 || l.mini_boss || l.level <= 2;
const orig = L.map((l) => ({ ...l }));
const nearestOrdinary = (n) => {
  for (let d = 1; d < 10; d++) for (const k of [n - d, n + d]) { const o = orig[k - 1]; if (o && !o.goal && !special(o) && Math.ceil(k / 10) === Math.ceil(n / 10)) return o; }
  throw new Error('no ordinary near ' + n);
};
let seed = 7;
const rnd = () => ((seed = (seed * 1103515245 + 12345) >>> 0) / 2 ** 32);
for (const l of L) {
  if (special(l)) continue;
  const ch = Math.ceil(l.level / 10);
  const n = l.level === 3 ? 2 : ch === 1 ? 3 : ch === 2 ? 4 : 5;
  const m = l.goal ? n - 1 : n;
  const base = l.goal ? nearestOrdinary(l.level) : l;
  l.hp = r5(base.hp * (1 + 0.75 * (m - 1)));
  l.time_seconds = r5(base.time_seconds * (1 + 0.45 * (m - 1)) + (l.goal ? 0.6 * orig[l.level - 1].time_seconds : 0));
  l.waves = m;
  // cast: this chapter's two + the previous chapter's two, plus classic junk; the level's own character is the last HP machine
  const pool = [...CAST.slice(Math.max(0, ch - 2) * 2, ch * 2), ...CLASSIC];
  const last = l.visual ?? l.monster;
  const vis = [];
  // goal levels: the level's own character is the goal machine (one entry past the HP machines)
  while (vis.length < (l.goal ? m : m - 1)) {
    const v = pool[Math.floor(rnd() * pool.length)];
    if (v !== last && !vis.includes(v)) vis.push(v);
  }
  l.wave_visuals = [...vis, last];
  delete l.star_times;
}
writeFileSync(P, JSON.stringify(j, null, 2) + '\n');
console.log(L.filter((l) => l.waves).map((l) => `${l.level}:${l.waves}${l.goal ? '+G' : ''}/${l.time_seconds}s/${l.hp}`).join(' '));
