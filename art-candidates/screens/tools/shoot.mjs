// Captures PNGs of the mockups with headless Chromium (puppeteer-core is already in node_modules).
//   node art-candidates/screens/tools/shoot.mjs <out-dir> [id[@t_ms[:final]] ...]
// No ids = every screen plus its animation frames (see frames.json). Writes <id>.png (and <id>@<t>.png) at 390x844 css px, deviceScaleFactor 2.
// Every capture pins all CSS animations at a fixed time (?t=), so renders are repeatable. Screens without an entry in
// frames.json are pinned at DEFAULT_T (an ambient moment); staged screens (win, lose, crate-open, reward) use their "final" time.
// A separate step (finish.mjs) downsizes to 390 px wide for commit and builds the contact sheet.
import puppeteer from 'puppeteer-core';
import path from 'node:path';
import fs from 'node:fs';

const DEFAULT_T = 1200;
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const out = process.argv[2];
let jobs = process.argv.slice(3);
fs.mkdirSync(out, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--allow-file-access-from-files'],
  headless: true,
});

async function ids() {
  const page = await browser.newPage();
  await page.goto(`file://${root}/index.html`);
  const list = await page.$$eval('.rv-cell', (els) => els.map((e) => ({ id: e.dataset.id })));
  await page.close();
  return list;
}

if (!jobs.length) {
  const list = await ids();
  const frames = JSON.parse(fs.readFileSync(path.join(root, 'tools', 'frames.json'), 'utf8'));
  jobs = [];
  for (const s of list) {
    const f = frames[s.id];
    jobs.push(`${s.id}@${f?.final ?? DEFAULT_T}:final`);
    for (const t of f?.frames ?? []) jobs.push(`${s.id}@${t}`);
  }
}

const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
for (const job of jobs) {
  const [id, tt] = job.split('@');
  const [t, tag] = (tt ?? '').split(':');
  const url = `file://${root}/index.html?screen=${id}${t ? `&t=${t}` : ''}`;
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForFunction(() => document.documentElement.getAttribute('data-ready') === '1', { timeout: 15000 });
  await new Promise((r) => setTimeout(r, t ? 150 : 700));
  const file = path.join(out, `${id}${t && tag !== 'final' ? `@${t}` : ''}.png`);
  await page.screenshot({ path: file, clip: { x: 0, y: 0, width: 390, height: 844 } });
  console.log('shot', file);
}
await browser.close();
