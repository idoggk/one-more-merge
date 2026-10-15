// Runs the whole ROAD PERF measurement matrix (needs `npm run build` first) and prints the markdown table. ~20-30 min.
// Usage: node tools/road-perf-matrix.mjs [outDir=scratch/matrix] [runs=3]
import { spawnSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
const dir = process.argv[2] ?? 'scratch/matrix', runs = process.argv[3] ?? '3';
mkdirSync(dir, { recursive: true });
const rows = [];
const run = (name, args) => { const out = `${dir}/${name}.json`; spawnSync('node', ['tools/road-perf.mjs', ...args, '--runs', runs, '--secs', '10', '--out', out], { stdio: 'ignore' }); rows.push(out); };
for (const level of [60, 1]) for (const cpu of [4, 6]) for (const cfg of ['build8', 'master', 'perf4']) run(`${cfg}_L${level}_cpu${cpu}`, ['--cfg', cfg, '--level', String(level), '--cpu', String(cpu)]);
for (const rs of ['1', '1.25']) run(`master_L60_cpu4_rs${rs}`, ['--cfg', 'master', '--level', '60', '--cpu', '4', '--rs', rs]);
for (const cfg of ['master', 'perf4']) run(`${cfg}_L60_cpu4_fakeart`, ['--cfg', cfg, '--level', '60', '--cpu', '4', '--fakeart']);
spawnSync('node', ['tools/road-perf-table.mjs', ...rows], { stdio: 'inherit' });
