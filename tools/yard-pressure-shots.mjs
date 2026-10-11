// Screenshots (390x844 @ DPR 2) of the Screw Yard pressure prototype: timer ring, tap counter, danger states, pause, results.
// Starts its own Vite server and one fresh browser context per scenario.
// Usage: node tools/yard-pressure-shots.mjs [outDir]   (default art-candidates/yard-pressure)
import puppeteer from 'puppeteer-core';
import { createServer } from 'vite';
import { mkdirSync } from 'node:fs';

const out = process.argv[2] ?? 'art-candidates/yard-pressure';
mkdirSync(out, { recursive: true });
const CHROME = process.env.CHROME ?? `${process.env.ProgramFiles}/Google/Chrome/Application/chrome.exe`;
const server = await createServer({ server: { port: 5241, strictPort: false, host: '127.0.0.1' }, logLevel: 'error' });
await server.listen();
const URL = `${server.resolvedUrls.local[0]}?timer`;
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function scenario(unit, fn) {
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
  const keys = { omm_qa_screw_yard: 'object', omm_qa_yard_pressure: 'on', omm_qa_yard_unit: unit, omm_shake: 'soft' };
  await page.evaluateOnNewDocument((k) => { for (const [a, b] of Object.entries(k)) localStorage.setItem(a, b); }, keys);
  await page.goto(URL, { waitUntil: 'networkidle0', timeout: 120000 });
  await page.waitForFunction(() => window.__omm?.game?.scene?.getScene('game')?.s, { timeout: 30000 });
  const yard = '(window.__omm.game.scene.getScene("objectYard"))';
  const api = {
    wait,
    ev: (f, arg) => page.evaluate(`(${f.toString()})(${yard}, ${JSON.stringify(arg ?? null)})`),
    shot: async (file, ms = 300) => {
      await wait(ms);
      await page.screenshot({ path: `${out}/${file}.png` });
      console.log('saved', file);
    },
  };
  await page.evaluate(() => {
    const s = window.__omm.game.scene.getScene('game');
    s.closeModal();
    s.startYard(1);
  });
  await wait(2500);
  await fn(api);
  await ctx.close();
}

/** Tap one free screw, preferring a colour an open box wants. Returns false when nothing was free in this view. */
const tapOne = (s) => {
  const free = s.st.lvl.screws.filter((sc) => !s.st.removed[sc.id] && s.screwAt(sc.id).free);
  if (!free.length) return false;
  const want = free.find((sc) => s.st.boxes.some((b) => b && b.color === sc.color && b.n < 3)) ?? free[0];
  const a = s.screwAt(want.id);
  s.onTap(a.x, a.y);
  return true;
};

await scenario('cannon', async (a) => {
  await a.shot('1-timer-ring-before-first-tap');
  for (let i = 0; i < 6; i++) { await a.ev(tapOne); await a.wait(750); }
  await a.shot('2-tap-counter');
  await a.ev((s) => { s.P.msLeft = s.P.cfg.time * 1000 * 0.2; });
  await a.shot('3-danger-amber', 1200);
  await a.ev((s) => { s.P.msLeft = s.P.cfg.time * 1000 * 0.07; });
  await a.shot('4-danger-red', 1100);
  await a.ev((s) => s.setPaused(true));
  await a.shot('5-paused');
  await a.ev((s) => s.setPaused(false));
  await a.ev((s) => { s.P.msLeft = 600; });
  await a.shot('6-result-time-up', 2800);
});

await scenario('cannon', async (a) => {
  await a.ev(tapOne);
  await a.wait(700);
  for (let guard = 0; guard < 200; guard++) {
    const done = await a.ev((s) => s.ended);
    if (done) break;
    await a.ev((s) => { s.P.msLeft = Math.max(s.P.msLeft, s.P.cfg.time * 1000 * 0.9); });
    const tapped = await a.ev(tapOne);
    if (tapped) await a.wait(750);
    else { await a.ev((s) => s.rotate(1)); await a.wait(450); }
  }
  await a.shot('7-result-win-stars', 2500);
});

await browser.close();
await server.close();
