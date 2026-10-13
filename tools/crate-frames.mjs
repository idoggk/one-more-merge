// Frame-by-frame capture of ONE crate opening at 390x844: a frame every 100 ms of SCENE time (the scene clock runs at 0.1x so the screenshot
// latency does not smear the timing). Usage: node tools/crate-frames.mjs <outDir> [v2|old] [kind=iron] [cards=7] [frames=48]
// Cards are synthetic and fixed (one NEW, one Legendary) so before/after are comparable; nothing touches the save.
import puppeteer from 'puppeteer-core';
import { createServer } from 'vite';
import { mkdirSync } from 'node:fs';

const out = process.argv[2] ?? 'art-candidates/crate-open-v2/before';
const mode = process.argv[3] ?? 'old';
const kind = process.argv[4] ?? 'iron';
const nCards = Number(process.argv[5] ?? 7);
const frames = Number(process.argv[6] ?? 48);
mkdirSync(out, { recursive: true });
const CHROME = process.env.CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const server = await createServer({ server: { port: 5199, strictPort: false, host: '127.0.0.1' }, logLevel: 'error' });
await server.listen();
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
await page.evaluateOnNewDocument((mode) => {
  localStorage.setItem('omm_qa_crates', 'toolbox');
  localStorage.setItem('omm_qa_units_b0', 'rb');
  for (let i = 1; i <= 7; i++) localStorage.setItem(`omm_qa_roster_${i}`, 'on');
  localStorage.setItem('omm_shake', 'full');
  if (mode === 'v2') localStorage.setItem('omm_qa_crate_open_v2', 'on');
}, mode);
await page.goto(`${server.resolvedUrls.local[0]}?timer`, { waitUntil: 'networkidle0', timeout: 120000 });
await page.waitForFunction(() => window.__omm?.game?.scene?.getScene('game')?.s, { timeout: 30000 });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
await wait(6000); // lazy art

const POOL = ['rivet_gun', 'wrench', 'cannon', 'saw_blade', 'tesla_tower', 'hydraulic_press', 'vice', 'signal_beacon', 'router', 'lathe'];
const cards = POOL.slice(0, nCards).map((unit, i) => ({ unit, count: i === 0 ? 2 : 1, isNew: i === 0 || i === 4 }));
await page.evaluate((kind, cards) => {
  clearInterval(window.__bot);
  const sc = window.__omm.game.scene.getScene('game');
  sc.closeModal();
  sc.crateReturn = null;
  sc.seasonEv = () => {};
  window.__cues = [];
  sc.presentCrate(kind, cards);
}, kind, cards);
await wait(900);
const K = 0.1, STEP = 100;
const TAPS = (process.env.TAPS ?? '').split(',').filter(Boolean).map(Number); // e.g. TAPS=200,900,1500
const setSpeed = (k) => page.evaluate((k) => { const sc = window.__omm.game.scene.getScene('game'); sc.tweens.timeScale = k; sc.time.timeScale = k; }, k);
const shot = (i) => page.screenshot({ path: `${out}/f${String(i).padStart(2, '0')}.jpg`, type: 'jpeg', quality: 72 });
await shot(0); // closed, before the tap
await setSpeed(K);
await page.mouse.click(195, 422);
let t0 = Date.now();
for (let i = 1; i <= frames; i++) {
  const due = t0 + (i * STEP) / K;
  const d = due - Date.now();
  if (d > 0) await wait(d);
  if (TAPS.includes(i * STEP)) await page.mouse.click(195, 422); // extra taps (scene ms) to test speeding
  await shot(i);
}
await browser.close();
await server.close();
console.log('frames', frames, '->', out);
