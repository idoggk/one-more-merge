// t-4c676288 LAST MERGES check: every bench level against four bots (random, a 1-second spammer, greedy, a 2-ply planner), n games each, through the
// real game path (newBudgetState + drop), plus the exact planner's perfect line. Plain words: win %, stars, and how far greedy falls from the best line.
// Usage: npx vite-node tools/budget-sim.ts [n=200]
import { TUNING } from '../src/content/tuning';
import { BUDGET_LEVELS, budgetStars, newBudgetState, mergesLeft } from '../src/core/budget';
import { drop } from '../src/core/game';
import { playMove, puzzleMoves } from '../src/core/puzzle';
import { Rng } from '../src/core/rng';
import { BIG, BOTS, Planner, liftedState, playout } from './budget-lib';
import { budgetPuzzleDef } from '../src/core/budget';

TUNING.mergeBudget = true;
const N = +(process.argv[2] ?? 200);
const pct = (n: number, d = N) => `${((100 * n) / d).toFixed(0)}%`.padStart(4);
const mean = (a: number[]) => a.reduce((x, y) => x + y, 0) / Math.max(1, a.length);

for (const b of BUDGET_LEVELS) {
  console.log(`\n== ${b.name}: ${b.merge_budget} merges, ${b.hp} HP (machine of level ${b.level}), stars 3 = ${b.star_spare[1]}+ spare, 2 = ${b.star_spare[0]}+ spare`);
  const def = budgetPuzzleDef(b);
  const planner = new Planner();
  const top = Array.from({ length: b.merge_budget }, (_, k) => planner.line({ ...def, hp: BIG }, k + 1).dmg.at(-1) ?? 0);
  const best = top[b.merge_budget - 1];
  const rows: { name: string; win: number; s3: number; s2: number; s1: number; dmg: number }[] = [];
  // the exact planner as a player: follows the best line, but slips to a random merge 5% of the time (then re-plans from where it landed).
  // It plays a shadow board with the HP lifted, so the damage it plans is never cut off by the real kill.
  const exact: (typeof BOTS)[number] = {
    name: 'planner exact',
    pick: (rng) => {
      let shadow = liftedState(def);
      return (s, moves, left) => {
        if (s.puzzle!.used === 0) shadow = liftedState(def);
        const m = rng.next() < 0.05 ? moves[rng.int(moves.length)] : (planner.best(shadow, left).move ?? moves[0]);
        shadow = playMove(shadow, m);
        return m;
      };
    },
  };
  for (const bot of [...BOTS, exact]) {
    let win = 0, s3 = 0, s2 = 0, s1 = 0;
    const dmg: number[] = [];
    for (let g = 0; g < N; g++) {
      const rng = new Rng(g * 977 + 13);
      const pick = bot.pick(rng);
      const s = newBudgetState(b)!;
      while (s.phase === 'playing') {
        const legal = puzzleMoves(s);
        const m = legal.length ? pick(s, legal, mergesLeft(s)) : null;
        if (!m) break;
        drop(s, m[0], m[1], s.grid[m[0]]!.id);
      }
      dmg.push(b.hp - s.hp);
      if (s.phase === 'won') {
        win++;
        const st = budgetStars(mergesLeft(s), b.star_spare);
        if (st === 3) s3++;
        else if (st === 2) s2++;
        else s1++;
      }
    }
    rows.push({ name: bot.name, win, s3, s2, s1, dmg: mean(dmg) });
  }
  const perfect = top.findIndex((d) => d >= b.hp) + 1;
  console.log(`${'bot'.padEnd(14)} win   3-star 2-star 1-star  avg damage vs HP`);
  for (const r of rows) console.log(`${r.name.padEnd(14)} ${pct(r.win)}  ${pct(r.s3)}   ${pct(r.s2)}   ${pct(r.s1)}   ${((100 * r.dmg) / b.hp).toFixed(0)}%`);
  console.log(`perfect line: breaks it in ${perfect} of ${b.merge_budget} merges (${b.merge_budget - perfect} spare), best damage in the budget ${Math.round(best)} = HP is ${(100 * b.hp / best).toFixed(0)}% of it`);
  const greedy = rows.find((r) => r.name === 'greedy')!;
  const gDmg = mean(Array.from({ length: N }, (_, g) => playout({ ...def, hp: BIG }, BOTS[2].pick(new Rng(g * 977 + 13))).dmg.at(-1) ?? 0)); // uncapped: what greedy would deal if nothing ended early
  console.log(`greedy vs best: greedy deals ${(100 * gDmg / best).toFixed(0)}% of the best line's damage (gap ${(100 * (1 - gDmg / best)).toFixed(0)}%); against the HP it falls ${(100 * (1 - gDmg / b.hp)).toFixed(0)}% short${greedy.win ? ' (but still wins some games)' : ''}`);
}
