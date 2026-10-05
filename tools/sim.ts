// Headless balance simulator. Usage: npx vite-node tools/sim.ts
import { TUNING } from '../src/content/tuning';
import { choosePerk, drop, legalPairs, newGame, previewMerge, tick, type GameState } from '../src/core/game';
import { Rng } from '../src/core/rng';

type Policy = { name: string; every: number; pick: (s: GameState, rng: Rng) => [number, number] | null };

const idle: Policy = { name: 'idle', every: 1e9, pick: () => null };
const novice: Policy = {
  name: 'novice 5s random',
  every: 5,
  pick: (s, rng) => {
    const p = legalPairs(s);
    if (!p.length) return null;
    const [a, b] = p[rng.int(p.length)];
    return rng.next() < 0.5 ? [a, b] : [b, a];
  },
};
const greedy: Policy = {
  name: 'greedy 2.5s',
  every: 2.5,
  pick: (s) => {
    const p = legalPairs(s);
    if (!p.length) return null;
    p.sort((x, y) => s.grid[y[0]]!.rank - s.grid[x[0]]!.rank);
    return p[0];
  },
};
const seeker: Policy = {
  name: 'cascade 2.5s',
  every: 2.5,
  pick: (s) => {
    let best: [number, number] | null = null;
    let bestDmg = -1;
    for (const [a, b] of legalPairs(s))
      for (const [f, t] of [[a, b], [b, a]] as [number, number][]) {
        const d = previewMerge(s, f, t)!.total;
        if (d > bestDmg) [bestDmg, best] = [d, [f, t]];
      }
    return best;
  },
};

function play(seed: number, pol: Policy) {
  const s = newGame(seed);
  const rng = new Rng(seed * 7 + 1);
  let next = pol.every;
  let kickFuses = 0;
  let casc = 0;
  let sat = 0;
  while (s.phase === 'playing' || s.phase === 'choice') {
    if (s.phase === 'choice') {
      choosePerk(s, s.offer[rng.int(s.offer.length)]);
      continue;
    }
    if (s.elapsed >= next) {
      next += pol.every;
      const m = pol.pick(s, rng);
      if (m) {
        const res = drop(s, m[0], m[1], s.grid[m[0]]!.id);
        const occ = s.grid.filter(Boolean).length;
        for (const e of res.events) if (e.type === 'cascade') {
          casc++;
          if (e.result.count >= 0.8 * occ && occ >= 10) sat++;
        }
      }
    }
    for (const e of tick(s)) if (e.type === 'kickback' && e.into >= 0) kickFuses++;
  }
  return { won: s.phase === 'won', time: s.elapsed, targets: s.phase === 'won' ? 3 : s.target, kickFuses, chain: s.stats.biggestChain, sat: casc ? sat / casc : 0 };
}

const median = (a: number[]) => (a.length ? [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)] : NaN);

function report(label: string, N = 200) {
  console.log(`\n== ${label}`);
  for (const pol of [idle, novice, greedy, seeker]) {
    const rs = Array.from({ length: N }, (_, i) => play(i + 1, pol));
    const wins = rs.filter((r) => r.won);
    console.log(
      `${pol.name.padEnd(18)} win ${String(wins.length).padStart(3)}/${N}  medWinTime ${median(wins.map((r) => r.time)).toFixed(1).padStart(6)}s  medTargets ${median(rs.map((r) => r.targets))}  fuses/run ${(rs.reduce((m, r) => m + r.kickFuses, 0) / N).toFixed(1)}  medChain ${median(rs.map((r) => r.chain))}  saturated ${((rs.reduce((m, r) => m + r.sat, 0) / N) * 100).toFixed(0)}%`,
    );
  }
}

const hp = (m: number) => TUNING.targetHp.map((h) => Math.round(h * m));
const variants: [string, Partial<typeof TUNING>][] = [
  ['current', {}],
  ['noSameRelay', { sameFamilyRelay: false }],
  ['noSameRelay HPx0.8', { sameFamilyRelay: false, targetHp: hp(0.8) }],
  ['noSameRelay HPx0.65', { sameFamilyRelay: false, targetHp: hp(0.65) }],];
const base = { ...TUNING };
const only = process.argv[2];
for (const [label, v] of variants) {
  if (only && !label.includes(only)) continue;
  Object.assign(TUNING, base, v);
  report(label);
}
