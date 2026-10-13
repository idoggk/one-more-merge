// Captures the CURRENT level road (ROAD tab) at 390x844 for several progress states and drag positions.
// Usage: node art-candidates/level-road-v2/tools/before-shots.mjs art-candidates/level-road-v2/before
import puppeteer from 'puppeteer-core';
import { createServer } from 'vite';
import { mkdirSync } from 'node:fs';

const out = process.argv[2] ?? 'art-candidates/level-road-v2/before';
mkdirSync(out, { recursive: true });
const CHROME = process.env.CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const server = await createServer({ server: { port: 5198, strictPort: false, host: '127.0.0.1' }, logLevel: 'error' });
await server.listen();
const URL = `${server.resolvedUrls.local[0]}?timer`;
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
await page.goto(URL, { waitUntil: 'networkidle0', timeout: 120000 });
await page.waitForFunction(() => window.__omm?.game?.scene?.getScene('game')?.s, { timeout: 30000 });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/** open the road with levels 1..cur-1 cleared */
async function openRoad(cur) {
  await page.evaluate((cur) => {
    const sc = window.__omm.game.scene.getScene('game');
    clearInterval(window.__bot);
    sc.closeModal();
    Object.assign(sc.meta, {
      tutorialDone: true, onboarded: true, tips: {}, lessons: { road: true, card: true, boosters: true },
      levelStars: Object.fromEntries(Array.from({ length: cur - 1 }, (_, i) => [i + 1, (i % 3) + 1])),
    });
    sc.openTitle('road');
  }, cur);
  await wait(1200);
}
/** drag the road: positive dy moves the road down on screen (shows later/higher levels? no: shows EARLIER levels) */
async function drag(dy) {
  const x = 195, y0 = 430;
  await page.mouse.move(x, y0);
  await page.mouse.down();
  const steps = 10;
  for (let i = 1; i <= steps; i++) await page.mouse.move(x, y0 + (dy * i) / steps);
  await page.mouse.up();
  await wait(400);
}
const shot = async (name) => { await page.screenshot({ path: `${out}/${name}.png` }); console.log('saved', name); };

const plan = [
  ['01_start_L1', 1, []],
  ['02_L8', 8, []],
  ['03_L10_boss_ch1_gate', 10, [0, -500]], // current = boss, then look UP the road (towards chapter 2)
  ['04_L11_ch2_start', 11, [0, 500]],
  ['05_L20_boss_ch2', 20, [-400]],
  ['06_L21_ch3_start', 21, [400]],
  ['07_L35_midgame', 35, []],
  ['08_L52', 52, []],
  ['09_L65_late', 65, []],
  ['10_L80_final_boss', 80, [-300]],
];
for (const [name, cur, drags] of plan) {
  await openRoad(cur);
  await shot(name);
  let i = 0;
  for (const d of drags) {
    if (d === 0) continue;
    await drag(d);
    await shot(`${name}_drag${++i}_${d}`);
  }
}
await browser.close();
await server.close();
