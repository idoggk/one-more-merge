// Stage-change sprite audit: plays a level, kills each stage machine, and checks exactly one machine picture is visible.
// Usage: node tools/stage-sprites.mjs [level=46] [outDir]   (390x844 phone; saves a screenshot after every stage change)
import puppeteer from 'puppeteer-core';
import { createServer } from 'vite';
import { mkdirSync } from 'node:fs';

const level = +(process.argv[2] ?? 46);
const out = process.argv[3] ?? 'screenshots/stage-sprites';
mkdirSync(out, { recursive: true });
const CHROME = process.env.CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const server = await createServer({ server: { port: 5198, strictPort: false, host: '127.0.0.1' }, logLevel: 'error' });
await server.listen();
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
await page.goto(`${server.resolvedUrls.local[0]}?timer`, { waitUntil: 'networkidle0', timeout: 120000 });
await page.waitForFunction(() => window.__omm?.game?.scene?.getScene('game')?.s, { timeout: 30000 });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
await page.evaluate((lv) => {
  const sc = window.__omm.game.scene.getScene('game');
  clearInterval(window.__bot);
  sc.closeModal();
  sc.meta.tips = new Proxy({}, { get: () => true, set: () => true });
  sc.startLevel(lv);
  sc.finishIntro(true);
}, level);
await wait(1500);
let bad = 0;
for (let n = 0; n < 8; n++) {
  const info = await page.evaluate(() => {
    const sc = window.__omm.game.scene.getScene('game');
    const s = sc.s;
    return { phase: s.phase, i: s.stage?.i, vis: sc.stageVis?.(), machines: sc.machineSpritesVisible?.() ?? null };
  });
  console.log(n, JSON.stringify(info));
  if (info.phase !== 'playing') break;
  // hit the machine to its last HP, then merge a pair to finish it
  await page.evaluate(() => {
    const sc = window.__omm.game.scene.getScene('game');
    const s = sc.s;
    s.hp = 1;
    for (let i = 0; i < 30; i++) for (let j = i + 1; j < 30; j++) { const a = s.grid[i], b = s.grid[j]; if (a && b && a.family === b.family && a.rank === b.rank) { sc.commitDrop(i, j, a.id); return; } }
  });
  for (const ms of [250, 900, 1500, 2500]) {
    await wait(ms === 250 ? 250 : ms - [250, 900, 1500, 2500][[250, 900, 1500, 2500].indexOf(ms) - 1]);
    const { m, phase } = await page.evaluate(() => { const sc = window.__omm.game.scene.getScene('game'); return { m: sc.machineSpritesVisible(), phase: sc.s.phase }; });
    if (ms === 250) await page.screenshot({ path: `${out}/L${level}_s${n}_250.png` });
    if (phase !== 'playing') break; // level won: the last machine is gone on purpose
    if (m.length > 1 || (ms >= 2500 && m.length !== 1)) { bad++; console.log('  BAD at', ms, JSON.stringify(m)); await page.screenshot({ path: `${out}/L${level}_s${n}_${ms}_bad.png` }); }
  }
  await page.screenshot({ path: `${out}/L${level}_s${n}.png` });
}
await browser.close();
await server.close();
console.log(bad ? `FAIL ${bad}` : 'OK');
process.exit(bad ? 1 : 0);
