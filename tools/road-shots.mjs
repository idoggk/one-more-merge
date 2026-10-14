// Screenshots of the LEVEL ROAD V2 tab (flag on) at 390x844 and 360x640.
// Usage: node tools/road-shots.mjs art-candidates/level-road-v2/built [off]   ('off' also captures the flag-OFF road for comparison)
import puppeteer from 'puppeteer-core';
import { createServer } from 'vite';
import { mkdirSync } from 'node:fs';

const out = process.argv[2] ?? 'art-candidates/level-road-v2/built';
const flagOn = process.argv[3] !== 'off';
mkdirSync(out, { recursive: true });
const CHROME = process.env.CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const server = await createServer({ server: { port: 5197, strictPort: false, host: '127.0.0.1' }, logLevel: 'error' });
await server.listen();
const URL = `${server.resolvedUrls.local[0]}?timer`;
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

for (const [vw, vh] of [[390, 844], [360, 640]]) {
  const page = await browser.newPage();
  await page.setViewport({ width: vw, height: vh, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await page.evaluateOnNewDocument((on) => {
    if (on) localStorage.setItem('omm_qa_level_road_v2', 'on');
  }, flagOn);
  page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
  await page.goto(URL, { waitUntil: 'load', timeout: 120000 });
  await page.waitForFunction(() => window.__omm?.game?.scene?.getScene('game')?.s, { timeout: 30000 });
  await wait(3500);
  const openRoad = async (cur) => {
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
    await wait(1800);
  };
  const drag = async (dy) => {
    const x = vw / 2, y0 = vh * 0.5;
    await page.mouse.move(x, y0);
    await page.mouse.down();
    for (let i = 1; i <= 8; i++) {
      await page.mouse.move(x, y0 + (dy * i) / 8);
      await wait(16);
    }
    await page.mouse.up();
    await wait(1600);
  };
  const shot = async (name) => {
    await page.screenshot({ path: `${out}/${name}_${vw}x${vh}.png` });
    console.log('saved', name, vw, vh);
  };
  const plan = [
    ['ch1_L3', 3, []],
    ['ch1_L1_fresh', 1, []],
    ['ch4_L34', 34, []],
    ['ch8_L75', 75, []],
    ['gate_L10', 10, [420]],
    ['gate_L11_look_down', 11, [-420]],
    ['ch8_L80_final', 80, [300]],
  ];
  for (const [name, cur, drags] of plan) {
    await openRoad(cur);
    await shot(name);
    for (const d of drags) {
      await drag(d);
      await shot(`${name}_drag${d}`);
    }
  }
  await page.close();
}
await browser.close();
await server.close();
