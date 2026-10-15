// Re-render every PNG of the SCREW YARD mock (run from the repo root: node art-candidates/mockups/screw-yard/render.mjs [state])
// Needs Chrome at the default Windows path; override with CHROME=<path>.
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const dir = resolve('art-candidates/mockups/screw-yard');
const chrome = process.env.CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const page = pathToFileURL(resolve(dir, 'index.html')).href;
const sizes = [[390, 844], [360, 780], [430, 932]];
if (process.argv[2] === 'audit') {
  // measured checks (tap size, safe areas, 8px grid, overlaps, text fit) for every state and size
  for (const s of ['start', 'mid', 'danger', 'win', 'fail', 'screws']) for (const [w, h] of sizes) {
    const r = spawnSync(chrome, ['--headless=new', '--allow-file-access-from-files', '--virtual-time-budget=4000', `--window-size=${w},${h}`, '--dump-dom', `${page}?state=${s}&w=${w}&h=${h}&audit=1`], { encoding: 'utf8', maxBuffer: 1 << 26 });
    console.log((/<pre id="audit">([\s\S]*?)<\/pre>/.exec(r.stdout || '') || [, 'NO AUDIT'])[1].replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&amp;/g, '&'));
  }
  process.exit(0);
}
const states = process.argv[2] ? [process.argv[2]] : ['start', 'mid', 'danger', 'win', 'fail', 'screws'];

function shot(out, query, w, h) {
  const r = spawnSync(chrome, ['--headless=new', '--allow-file-access-from-files', '--hide-scrollbars', '--force-device-scale-factor=2',
    `--window-size=${w},${h}`, '--virtual-time-budget=4000', `--screenshot=${resolve(dir, out)}`, `${page}?${query}&w=${w}&h=${h}`], { stdio: 'ignore' });
  if (r.status !== 0) console.log('FAILED', out);
}
for (const s of states) {
  for (const [w, h] of sizes) shot(`screwyard_${s}_${w}x${h}.png`, `state=${s}`, w, h);
  shot(`annotated_${s}_390x844.png`, `state=${s}&grid=1&names=1`, 390, 844);
}
console.log('done', states.join(','));
