// LEVEL DURATION (read-only, t-7ab374d3): joins the static shape of each saga level (machines / waves, total HP, clock, star
// lines, goal) with the bot clear times that tools/level-report.ts measured, and prints the docs/design/LEVEL_DURATION.md tables.
// It never plays a level itself and never writes levels.json: the clear times are level-report's, the shape is newLevel()'s.
//   npx vite-node tools/level-report.ts --from 1 --to 80 --n 20 --nplan 4 --pace calm --out <dir>     (the measurement)
//   npx vite-node tools/level-duration.ts --dir <dir> [--min 45] [--bot smart3]                              (this table)
import { readdirSync, readFileSync } from 'node:fs';
import { applyPace } from '../src/content/experiments';
import { LEVELS } from '../src/content/levels';
import { newLevel } from '../src/core/game';
import { BOT_KEYS, parseCsv, type BotKey, type Row } from './level-report-lib';

const args = process.argv.slice(2);
const DIR = args.includes("--dir") ? args[args.indexOf("--dir") + 1] : "level-report";
const MIN = Number(args[args.indexOf('--min') + 1]) || 45;
const REF = (args.includes('--bot') ? args[args.indexOf('--bot') + 1] : 'smart3') as BotKey;
applyPace('calm');

const rows = new Map<number, Row>();
for (const f of readdirSync(DIR).filter((f) => f.startsWith('calm_L') && f.endsWith('.csv')))
  for (const r of parseCsv(readFileSync(`${DIR}/${f}`, 'utf8'))) rows.set(r.level, r);

const s0 = (x: number) => (Number.isFinite(x) ? String(Math.round(x)) : '-');
console.log(`| L | kind | machines | goal | total HP | clock s | rand 2.5s | smart 3s | smart 1s | HP/s (smart3) | < ${MIN} s |`);
console.log('|---|---|---|---|---|---|---|---|---|---|---|');
for (const def of LEVELS) {
  const r = rows.get(def.level);
  if (!r) continue;
  const s = newLevel(def);
  const hps = s.stage ? s.stage.hps : [Math.round(s.maxHp)];
  const machines = hps.length + (s.stage?.goal ? 1 : 0);
  const goalOnly = !s.stage && !!s.goal;
  const total = goalOnly ? NaN : hps.reduce((a, b) => a + b, 0);
  const goal = def.goal ? `${def.goal.kind}${def.goal.n}` : '';
  const t = (k: BotKey) => r.bots[k].clear;
  const dps = total / t(REF);
  const under = BOT_KEYS.filter((k) => k !== 'plan3' && t(k) < MIN).length;
  const flag = t(REF) < MIN ? (t('smart1') < MIN ? 'UNDER (all)' : `UNDER (${REF})`) : t('smart1') < MIN ? 'fast-tapper only' : '';
  void under;
  console.log(`| ${def.level} | ${r.kind} | ${machines} | ${goal} | ${goalOnly ? 'goal' : total} | ${r.clock} | ${s0(t('rand25'))} | ${s0(t('smart3'))} | ${s0(t('smart1'))} | ${Number.isFinite(dps) ? s0(dps) : '-'} | ${flag} |`);
}
