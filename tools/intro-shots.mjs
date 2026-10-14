// Level intro popup (UI kit v3) phone screenshots: normal, mini-boss and boss at 390x844 and 360x640 (+ 430x932 with SIZES=all).
// Starts its own temporary Vite server. Usage: node tools/intro-shots.mjs [outDir] [flag=on|off]
import puppeteer from 'puppeteer-core';
import { createServer } from 'vite';
import { mkdirSync } from 'node:fs';

const out = process.argv[2] ?? 'art-candidates/intro-v3';
const flag = process.argv[3] ?? 'on';
mkdirSync(out, { recursive: true });
const CHROME = process.env.CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const server = await createServer({ server: { port: 5193, strictPort: false, host: '127.0.0.1' }, logLevel: 'error' });
await server.listen();
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const sizes = process.env.SIZES === 'all' ? [[390, 844], [360, 640], [430, 932]] : [[390, 844], [360, 640]];
const levels = (process.env.LEVELS ?? 'normal:14,mini:78,boss:60').split(',').map((x) => x.split(':'));

for (const [w, h] of sizes) {
  const page = await browser.newPage();
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
  await page.evaluateOnNewDocument((f) => localStorage.setItem('omm_qa_ui_kit_v3', f === 'on' ? 'on' : ''), flag);
  await page.goto(`${server.resolvedUrls.local[0]}?timer`, { waitUntil: 'networkidle0', timeout: 120000 });
  await page.waitForFunction(() => window.__omm?.game?.scene?.getScene('game')?.s, { timeout: 30000 });
  await page.evaluate(async () => {
    const sc = window.__omm.game.scene.getScene('game');
    const { TUNING } = await import('/src/content/tuning.ts');
    for (let i = 1; i <= 7; i++) TUNING['roster' + i] = true;
    sc.meta.units = { ...(sc.meta.units ?? {}) };
    for (const u of ['wrench', 'blowtorch', 'blast_plate', 'rewind_crank', 'wrecking_ball', 'piston', 'lathe']) sc.meta.units[u] = { level: 1, cards: 0 };
  });
  for (const [name, n] of levels) {
    await page.evaluate((lv) => {
      const sc = window.__omm.game.scene.getScene('game');
      clearInterval(window.__bot);
      sc.closeModal();
      sc.meta.kits = 2;
      sc.openTitle('road');
      sc.openLevelSheet(Number(lv));
    }, n);
    await wait(1800);
    await page.screenshot({ path: `${out}/${flag === 'on' ? '' : 'old_'}${name}_${n}_${w}x${h}.png` });
  }
  await page.close();
}
await browser.close();
await server.close();
