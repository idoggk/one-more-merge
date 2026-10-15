// Read-only: turn tools/rank-difficulty.ts --json outputs into the markdown tables of docs/design/RANK_DIFFICULTY.md.
// Usage: npx vite-node tools/rank-difficulty-table.ts <dir with c0.json..c7.json> [<dir of the sandwichBonus run>]
import { readFileSync } from 'node:fs';

type Row = { level: number; kind: string; fam: string; rank: number; n: number; reach: number; lo: number; hi: number; medT: number; medMerges: number; win: number; medSecs: number; goal: unknown };
const load = (d: string): Row[] => Array.from({ length: 8 }, (_, i) => JSON.parse(readFileSync(`${d}/c${i}.json`, 'utf8')) as Row[]).flat();
const base = load(process.argv[2]);
const sw = process.argv[3] ? load(process.argv[3]) : [];
const fams = [...new Set(base.map((r) => r.fam))].sort();

// Formula table: plain merge = 2^(k-1)-1 merges / 2^(k-1) rank-1 units. Sandwich (4 parts of rank r -> 1 part of r+2, one merge):
// S(1)=0, S(2)=1, S(k)=min(1+2*S(k-1), 1+4*S(k-2)).
const S: number[] = [0, 0, 1];
for (let k = 3; k <= 8; k++) S[k] = Math.min(1 + 2 * S[k - 1], 1 + 4 * S[k - 2]);
console.log('## Formula table (exact, from the merge rules)\n');
console.log('| rank | rank-1 units | merges (plain) | merges (best with sandwich +2) | seconds at one merge / 3.5 s (plain) | (sandwich) |');
console.log('|---|---|---|---|---|---|');
for (let k = 1; k <= 8; k++) console.log(`| ${k} | ${2 ** (k - 1)} | ${2 ** (k - 1) - 1} | ${S[k]} | ${((2 ** (k - 1) - 1) * 3.5).toFixed(0)} | ${(S[k] * 3.5).toFixed(0)} |`);

const fmt = (r: Row | undefined) => (r ? `L${r.level} (ch${Math.ceil(r.level / 10)}) ${(r.reach * 100).toFixed(0)}% ${r.medT.toFixed(0)}s/${r.medMerges}m` : '-');
function first(rows: Row[], fam: string, rank: number, kind: string, thr: number) {
  return rows.filter((r) => r.fam === fam && r.rank === rank && r.kind === kind && r.reach >= thr).sort((a, b) => a.level - b.level)[0];
}
for (const [title, rows] of [['today (shipped rule)', base], ['sandwichBonus rule', sw]] as [string, Row[]][]) {
  if (!rows.length) continue;
  for (const kind of ['random', 'rankseek']) {
    console.log(`\n## First level where rank k is reached by >=50% of 20 runs, ${kind} bot, CALM, rule ${title}\n`);
    console.log('cell = first level (chapter) reach% median-seconds/median-player-merges at that level; ">=5%" row in brackets = first level where at least 1 run in 20 got it.\n');
    console.log(`| family | ${[2, 3, 4, 5, 6, 7, 8].map((k) => `r${k}`).join(' | ')} |`);
    console.log(`|---|${'---|'.repeat(7)}`);
    for (const f of fams) {
      const cells = [2, 3, 4, 5, 6, 7, 8].map((k) => {
        const a = first(rows, f, k, kind, 0.5), b = first(rows, f, k, kind, 0.05);
        return `${fmt(a)}${b && (!a || b.level < a.level) ? ` [${fmt(b)}]` : ''}`;
      });
      console.log(`| ${f} | ${cells.join(' | ')} |`);
    }
  }
}
// Reach and time per rank over all levels where the family appears, medians of the per-level medians.
const med = (a: number[]) => (a.length ? [...a].sort((x, y) => x - y)[Math.floor((a.length - 1) / 2)] : NaN);
console.log('\n## Typical time/merges to rank k, pooled over every level where it is reached by >=20% (median of per-level medians; random bot, today)\n');
console.log('| rank | levels with reach>=20% | median s | p10-p90 of per-level s | median merges | median level length s |');
console.log('|---|---|---|---|---|---|');
for (let k = 2; k <= 8; k++) {
  const rs = base.filter((r) => r.kind === 'random' && r.rank === k && r.reach >= 0.2);
  const t = rs.map((r) => r.medT).sort((a, b) => a - b);
  const q = (p: number) => (t.length ? t[Math.min(t.length - 1, Math.floor(p * t.length))] : NaN);
  console.log(`| ${k} | ${rs.length} | ${med(t).toFixed(0)} | ${q(0.1).toFixed(0)}-${q(0.9).toFixed(0)} | ${med(rs.map((r) => r.medMerges))} | ${med(rs.map((r) => r.medSecs)).toFixed(0)} |`);
}
console.log('\n## Per-chapter: the single best (family, level) for rank k in that chapter (random bot, today)\n');
console.log('| chapter | r4 | r5 | r6 | r7 | r8 |');
console.log('|---|---|---|---|---|---|');
for (let ch = 1; ch <= 8; ch++) {
  const cells = [4, 5, 6, 7, 8].map((k) => {
    const rs = base.filter((r) => r.kind === 'random' && r.rank === k && Math.ceil(r.level / 10) === ch);
    if (!rs.length) return '-';
    const best = rs.sort((a, b) => b.reach - a.reach)[0];
    return `best ${best.fam} L${best.level} ${(best.reach * 100).toFixed(0)}%`;
  });
  console.log(`| ${ch} | ${cells.join(' | ')} |`);
}
