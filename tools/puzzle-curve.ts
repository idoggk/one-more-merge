// r44: difficulty curve of a puzzles file (solver stats + one score per puzzle, see src/core/puzzle.ts).
// Usage: npx vite-node tools/puzzle-curve.ts [file=src/content/puzzles.json] [--days 14]
import { readFileSync } from 'node:fs';
import type { PuzzleDef } from '../src/core/game';
import { puzzleDifficulty as solve, type PuzzleStats } from '../src/core/puzzle';

const memo = new Map<PuzzleDef, PuzzleStats>();
const puzzleDifficulty = (p: PuzzleDef) => memo.get(p) ?? memo.set(p, solve(p)).get(p)!;

const file = process.argv.slice(2).find((a) => a.endsWith('.json')) ?? 'src/content/puzzles.json';
const data = JSON.parse(readFileSync(file, 'utf8')) as { daily: PuzzleDef[]; drills: Record<string, PuzzleDef[]> };
const di = process.argv.indexOf('--days');
const days = di > 0 ? Number(process.argv[di + 1]) : data.daily.length;
const row = (p: PuzzleDef) => {
  const d = puzzleDifficulty(p);
  return `${p.id.padEnd(16)} N=${d.moves} score=${String(d.score).padStart(3)}  sol ${d.solutions}/${d.lines}  dead1st ${d.deadFirst}/${d.firstMoves}  tempting ${d.tempting}  greedyFails ${d.greedyFails ? 'Y' : 'n'}  order ${d.orderMatters ? 'Y' : 'n'}${p.only ? '  only ' + p.only.join('+') : ''}`;
};
const daily = data.daily.slice(0, days).map((p) => [p, row(p)] as const);
console.log('DAILY (in the order a new player sees them)');
for (const [, r] of daily) console.log(' ', r);
console.log(' curve:', daily.map(([p]) => puzzleDifficulty(p).score).join(' '));
console.log('DRILLS');
for (const [u, list] of Object.entries(data.drills)) {
  console.log(` ${u}: ${list.map((p) => puzzleDifficulty(p).score).join(' -> ')}`);
  for (const p of list) console.log('   ', row(p));
}
