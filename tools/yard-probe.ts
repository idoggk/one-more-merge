// r36 probe: difficulty of generated Screw Yards. Greedy = sensible player; random = taps any free screw.
// t-11ac42f6: also the Screw Yard 2.0 weekly ramp (src/content/yards.json) played by the same random tapper through the
// model (tapScrew / tapDock), side by side with the old yard, and exact-solver timings at 30-60 screws.
// Usage: npx vite-node tools/yard-probe.ts [bench]
import { BOX_SIZE, CLASSIC_RULES, fitSlot, generateYard, newYard, removable, tapDock, tapScrew, yardParams, type YardLevel } from '../src/core/screw';
import { generateYard2 } from '../src/core/yardGen';
import { solveYard, YardTooBig } from '../src/core/yardSolver';
import { Rng } from '../src/core/rng';
import week from '../src/content/yards.json';

/** Taps any tappable screw: a free board screw, or (no auto-pull) a dock screw that fits the box. */
function randomWins(lvl: YardLevel, runs: number, seed: number) {
  let wins = 0;
  for (let k = 0; k < runs; k++) {
    const rs = newYard(lvl), rng = new Rng(seed + k);
    while (!rs.won && !rs.lost) {
      const free = lvl.screws.filter((s) => removable(rs, s.id)).map((s) => () => tapScrew(rs, s.id));
      const dock = rs.rules.autoPull ? [] : rs.tray.map((c, i) => (fitSlot(rs, c) >= 0 ? () => tapDock(rs, i) : null)).filter((f) => f !== null);
      const all = [...free, ...dock];
      if (!all.length) break;
      all[rng.int(all.length)]();
    }
    if (rs.won) wins++;
  }
  return wins / runs;
}

for (const n of [1, 3, 5, 8, 12, 16, 20]) {
  let maxTray = 0, randWins = 0, screws = 0;
  const N = 60;
  for (let k = 0; k < N; k++) {
    const lvl = generateYard(n, 1000 + k * 31);
    screws += lvl.screws.length;
    // greedy (tracks tray peak)
    const st = newYard(lvl);
    while (!st.won && !st.lost) {
      const free = lvl.screws.filter((s) => removable(st, s.id));
      const fit = free.find((s) => st.boxes.some((b) => b && b.color === s.color && b.n < BOX_SIZE));
      const soon = (c: number) => { const i = lvl.queue.indexOf(c, st.qi); return i < 0 ? 999 : i; };
      tapScrew(st, (fit ?? free.slice().sort((a, b) => soon(a.color) - soon(b.color))[0]).id);
      maxTray = Math.max(maxTray, st.tray.length);
    }
    // random tapper
    const rs = newYard(lvl), rng = new Rng(k + 5);
    while (!rs.won && !rs.lost) {
      const free = lvl.screws.filter((s) => removable(rs, s.id));
      tapScrew(rs, free[rng.int(free.length)].id);
    }
    if (rs.won) randWins++;
  }
  console.log(`yard ${n} ${JSON.stringify(yardParams(n))} screws ~${(screws / N).toFixed(0)}  greedy tray peak ${maxTray}  random tapper wins ${((randWins / N) * 100).toFixed(0)}%`);
}

console.log('\nrandom tapper win %: old yard (classic rules, 60 generated yards each) vs Screw Yard 2.0 weekly ramp (400 games)');
console.log('yard | old screws | old random | 2.0 screws | 2.0 score | 2.0 random | 2.0 layout under classic rules');
const yards = week.yards as unknown as (YardLevel & { score: number })[];
yards.forEach((y, i) => {
  const n = i + 1;
  let old = 0, oldScrews = 0;
  for (let k = 0; k < 60; k++) {
    const lvl = generateYard(n, 1000 + k * 31);
    oldScrews += lvl.screws.length;
    old += randomWins(lvl, 1, k + 5);
  }
  const pct = (v: number) => `${(v * 100).toFixed(1)}%`.padStart(6);
  console.log(`${String(n).padStart(4)} | ${(oldScrews / 60).toFixed(0).padStart(10)} | ${pct(old / 60).padStart(10)} | ${String(y.screws.length).padStart(10)} | ${String(y.score).padStart(9)} | ${pct(randomWins(y, 400, 77)).padStart(10)} | ${pct(randomWins({ ...y, rules: CLASSIC_RULES }, 400, 77))}`);
});

if (process.argv[2] === 'bench') {
  console.log('\nexact solver timings (2.0 rules, generated yards, 40 per bucket)');
  for (const plates of [10, 13, 16, 19]) {
    const ms: number[] = [];
    let screws = 0, big = 0, unsolvable = 0;
    for (let k = 0; k < 40; k++) {
      const lvl = generateYard2(1, 5000 + plates * 101 + k * 13, { plates, colors: 5, swaps: 6, window: 6, cluster: 0.7 });
      if (!lvl) continue;
      screws += lvl.screws.length;
      try {
        const r = solveYard(lvl);
        ms.push(r.ms);
        if (!r.solvable) unsolvable++;
      } catch (e) {
        if (!(e instanceof YardTooBig)) throw e;
        big++;
      }
    }
    ms.sort((a, b) => a - b);
    const q = (f: number) => ms[Math.min(ms.length - 1, Math.floor(f * ms.length))];
    console.log(`${plates} plates (~${(screws / (ms.length + big)).toFixed(0)} screws): median ${q(0.5)} ms, p90 ${q(0.9)} ms, max ${ms[ms.length - 1]} ms, unsolvable ${unsolvable}, over budget ${big}`);
  }
}
