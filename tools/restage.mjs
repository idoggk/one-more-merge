// r38 one-off (ChatGPT review): fewer machines per level and no clock over 3 minutes.
// Total machines: ch1 2 (L4-6) then 3, ch2 3, ch3-4 4, ch5-8 4 (goal levels 5). Bosses: ch1 3, ch2 4, ch3+ 5.
// Mini-bosses: ch1-2 3, ch3-4 4, ch5-8 5. Clock by total machines: 2 -> 70 s, 3 -> 95, 4 -> 125, 5 -> 165.
// HP pools are rescaled by the ramp-weight sum; tools/sim-levels.ts refits them afterwards.
import { readFileSync, writeFileSync } from 'node:fs';
const P = 'src/content/levels.json';
const j = JSON.parse(readFileSync(P, 'utf8'));
const CLOCK = { 2: 70, 3: 95, 4: 125, 5: 165 };
const RAMP = 0.3;
const wsum = (n) => Array.from({ length: n }, (_, i) => 1 + RAMP * i).reduce((a, b) => a + b, 0);
const CLASSIC = ['tin_can', 'mad_fridge', 'vacuum_viper', 'toaster_twins', 'grand_piano_saurus'];
const fit = (vis, n, keepEnd) => {
  let v = keepEnd ? vis.slice(-n) : vis.slice(0, n);
  for (const c of CLASSIC) if (v.length < n && !v.includes(c)) v = [c, ...v];
  return v;
};
const out = [];
for (const l of j.levels) {
  if (!l.waves) continue;
  const ch = Math.ceil(l.level / 10);
  const boss = l.level % 10 === 0, mini = !!l.mini_boss;
  const std = ch === 1 ? (l.level <= 6 ? 2 : 3) : ch === 2 ? 3 : 4;
  const total = boss ? Math.min(5, ch === 1 ? 3 : ch === 2 ? 4 : 5) : mini ? (ch <= 2 ? 3 : ch <= 4 ? 4 : 5) : l.goal && ch >= 5 ? 5 : l.level === 3 ? 2 : std;
  const hpMachines = l.goal || boss || mini ? total - 1 : total;
  const old = l.waves;
  if (boss || mini) {
    l.minion_hp = Math.round((l.minion_hp * wsum(hpMachines)) / wsum(old) / 50) * 50;
    l.wave_visuals = fit(l.wave_visuals, hpMachines, false);
  } else {
    l.hp = Math.round((l.hp * wsum(hpMachines)) / wsum(old) / 50) * 50;
    l.wave_visuals = fit(l.wave_visuals, hpMachines + (l.goal ? 1 : 0), true);
  }
  l.waves = hpMachines;
  l.time_seconds = CLOCK[total];
  delete l.star_times;
  out.push(`${l.level}:${old}->${hpMachines}${l.goal ? '+G' : boss ? '+B' : mini ? '+M' : ''}/${l.time_seconds}s`);
}
writeFileSync(P, JSON.stringify(j, null, 2) + '\n');
console.log(out.join(' '));
