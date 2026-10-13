// QA panel START HERE phone screenshots at 390x844 and 360x640: the top, scrolled down through the cards, the bottom.
// Starts its own temporary Vite server. Usage: node tools/qa-start-here-shots.mjs [outDir]   (default art-candidates/qa-guide)
import puppeteer from 'puppeteer-core';
import { createServer } from 'vite';
import { mkdirSync } from 'node:fs';

const out = process.argv[2] ?? 'art-candidates/qa-guide';
mkdirSync(out, { recursive: true });
const CHROME = process.env.CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const server = await createServer({ server: { port: 5192, strictPort: false, host: '127.0.0.1' }, logLevel: 'error' });
await server.listen();
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

for (const [w, h] of [[390, 844], [360, 640]]) {
  const page = await browser.newPage();
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
  // a few answers already given, so both the YES and NOT RIGHT looks show
  await page.evaluateOnNewDocument(() => localStorage.setItem('qaGuide', JSON.stringify({ 1: 'yes', 2: 'yes', 3: 'no' })));
  await page.goto(`${server.resolvedUrls.local[0]}?timer`, { waitUntil: 'networkidle0', timeout: 120000 });
  await page.waitForFunction(() => window.__omm?.game?.scene?.getScene('game')?.s, { timeout: 30000 });
  const tag = `${w}x${h}`;
  await page.evaluate(() => {
    const sc = window.__omm.game.scene.getScene('game');
    clearInterval(window.__bot);
    sc.closeModal();
    sc.openTitle('road');
    sc.openQaTools();
  });
  await wait(900);
  const scrollTo = async (y) => {
    await page.evaluate((y) => {
      const sc = window.__omm.game.scene.getScene('game');
      const list = sc.modal.list.find((o) => o.type === 'Container' && o.mask);
      list.y = y;
    }, y);
    await wait(200);
  };
  await page.screenshot({ path: `${out}/top_${tag}.png` });
  await scrollTo(-700);
  await page.screenshot({ path: `${out}/cards_a_${tag}.png` });
  await scrollTo(-1700);
  await page.screenshot({ path: `${out}/cards_b_${tag}.png` });
  await scrollTo(-2900);
  await page.screenshot({ path: `${out}/cards_c_${tag}.png` });
  await page.close();
}
await browser.close();
await server.close();
