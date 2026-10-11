// VARIED OPENINGS phone screenshots (390x844): the SAME level (default L22) opening on each of the 4 layouts.
// Usage: node tools/openings-shots.mjs [outDir=art-candidates/varied-openings] [level=22]
// Starts a temporary Vite server with the VARIED OPENINGS QA flag on; the page forces layout k by pointing every LAYOUTS slot at layout k.
import puppeteer from 'puppeteer-core';
import { createServer } from 'vite';
import { mkdirSync } from 'node:fs';

const out = process.argv[2] ?? 'art-candidates/varied-openings';
const level = +(process.argv[3] ?? 22);
mkdirSync(out, { recursive: true });
const CHROME = process.env.CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const server = await createServer({ server: { port: 5198, strictPort: false, host: '127.0.0.1' }, logLevel: 'error' });
await server.listen();
const base = server.resolvedUrls.local[0];
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
await page.evaluateOnNewDocument(() => localStorage.setItem('omm_qa_varied_openings', 'on'));
await page.goto(`${base}?timer`, { waitUntil: 'networkidle0', timeout: 120000 });
await page.waitForFunction(() => window.__omm?.game?.scene?.getScene('game')?.s, { timeout: 30000 });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
await wait(4000); // lazy art
const NAMES = ['A_today', 'B_top-left-stack', 'C_split-halves', 'D_scattered-ring'];
for (let k = 0; k < 4; k++) {
  await page.evaluate(
    `(async (k, level) => {
      clearInterval(window.__bot);
      const sc = window.__omm.game.scene.getScene('game');
      const { LAYOUTS } = await import('/src/content/openings.ts');
      window.__layouts ??= [...LAYOUTS];
      for (let i = 0; i < 4; i++) LAYOUTS[i] = window.__layouts[k];
      sc.closeModal();
      sc.meta.tips = new Proxy({}, { get: () => true, set: () => true });
      sc.startLevel(level);
    })(${k}, ${level})`,
  );
  await wait(1500);
  await page.evaluate(`(() => { const sc = window.__omm.game.scene.getScene('game'); sc.finishIntro?.(true); sc.explaining = false; sc.explainQueue = []; sc.closeModal(); })()`);
  await wait(900);
  await page.screenshot({ path: `${out}/L${level}_${k + 1}_${NAMES[k]}.png` });
  console.log('saved layout', NAMES[k]);
}
await browser.close();
await server.close();
