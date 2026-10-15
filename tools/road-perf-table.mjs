// Markdown table from road-perf.mjs --out files: node tools/road-perf-table.mjs a.json b.json ...   (one row per file, median over its runs)
import { readFileSync } from 'node:fs';
const med = (a) => { const v = a.filter((x) => x != null).sort((x, y) => x - y); return v.length ? v[Math.floor(v.length / 2)] : null; };
const rng = (a) => { const v = a.filter((x) => x != null); return v.length ? `${Math.min(...v)}-${Math.max(...v)}` : '-'; };
console.log('| file | runs | p50 ms | p95 ms (range) | max ms | >33 ms | >100 ms | fps | long tasks | script ms | draws/frame | tex MB | ratio | lag px p50 | fling 300ms px |');
console.log('|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|');
for (const f of process.argv.slice(2)) {
  const rs = JSON.parse(readFileSync(f, 'utf8'));
  const g = (fn) => rs.map(fn);
  console.log(`| ${f.split(/[\\/]/).pop().replace('.json', '')} | ${rs.length} | ${med(g((r) => r.p50))} | ${med(g((r) => r.p95))} (${rng(g((r) => r.p95))}) | ${med(g((r) => r.max))} | ${med(g((r) => r.over33))} | ${med(g((r) => r.over100))} | ${med(g((r) => r.fps))} | ${med(g((r) => r.longTasks))} | ${med(g((r) => r.scriptMs))} | ${med(g((r) => r.drawsPerFrameP50))} | ${med(g((r) => r.info.texMB))} | ${med(g((r) => r.slow?.speedRatioMedian))} | ${med(g((r) => r.slow?.lagPxP50))} | ${med(g((r) => r.slow?.flingTravel300ms))} |`);
}
