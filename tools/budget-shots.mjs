// t-4c676288 phone screenshots (390x844) of a LAST MERGES bench level: start, mid-play, win and loss.
// Starts its own temporary Vite server with BUDGET LEVELS switched on (this device's QA flag). Usage: node tools/budget-shots.mjs [outDir] [levelIndex=0]
import puppeteer from 'puppeteer-core';
import { createServer } from 'vite';
import { mkdirSync } from 'node:fs';

const out = process.argv[2] ?? 'art-candidates/budget-bench';
const idx = +(process.argv[3] ?? 0);
mkdirSync(out, { recursive: true });
const CHROME = process.env.CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const server = await createServer({ server: { port: 5198, strictPort: false, host: '127.0.0.1' }, logLevel: 'error' });
await server.listen();
const base = server.resolvedUrls.local[0];
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
await page.evaluateOnNewDocument(() => localStorage.setItem('omm_qa_merge_budget', 'on'));
await page.goto(`${base}?timer`, { waitUntil: 'networkidle0', timeout: 120000 });
await page.waitForFunction(() => window.__omm?.game?.scene?.getScene('game')?.s, { timeout: 30000 });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const shot = async (name, ms) => {
  await wait(ms);
  await page.screenshot({ path: `${out}/${name}.png` });
  console.log('saved', `${out}/${name}.png`);
};
const run = (fn, arg) => page.evaluate(`(${fn.toString()})(window.__omm.game.scene.getScene('game'), ${JSON.stringify(arg ?? null)})`);

// start: the level card over a fresh board
await run(async (sc, i) => {
  clearInterval(window.__bot);
  sc.closeModal();
  sc.coach?.clear?.();
  sc.meta.tips = new Proxy({}, { get: () => true, set: () => true });
  const { BUDGET_LEVELS } = await import('/src/core/budget.ts');
  window.__b = BUDGET_LEVELS[i];
  sc.startBudget(window.__b);
}, idx);
await shot('1_start', 2200);

// mid-play: card away, half the best line played
await run((sc) => {
  sc.finishIntro?.(true);
  sc.explaining = false;
  sc.explainQueue = [];
  sc.closeModal();
});
await wait(1500);
await run((sc) => {
  const sol = window.__b.solution;
  for (let k = 0; k < Math.floor(sol.length / 2); k++) sc.commitDrop(sol[k][0], sol[k][1], sc.s.grid[sol[k][0]].id);
});
await shot('2_midplay', 2500);

// win: finish the best line
await run((sc) => {
  const sol = window.__b.solution;
  for (let k = Math.floor(sol.length / 2); k < sol.length; k++) sc.commitDrop(sol[k][0], sol[k][1], sc.s.grid[sol[k][0]].id);
});
await shot('3_win', 6000);

// loss: a fresh try that spends every merge on the weakest pair
await run((sc) => {
  sc.closeModal();
  sc.startBudget(window.__b);
  sc.finishIntro?.(true);
  sc.explaining = false;
  sc.explainQueue = [];
  sc.closeModal();
});
await wait(1500);
await run(async (sc) => {
  const { puzzleMoves, playMove } = await import('/src/core/puzzle.ts');
  while (sc.s.phase === 'playing') {
    const ms = puzzleMoves(sc.s);
    if (!ms.length) break;
    // weakest hit first: the merges a rushed player wastes
    ms.sort((a, b) => sc.s.hp - playMove(sc.s, a).hp - (sc.s.hp - playMove(sc.s, b).hp));
    sc.commitDrop(ms[0][0], ms[0][1], sc.s.grid[ms[0][0]].id);
  }
});
await shot('4_loss', 6000);
await browser.close();
await server.close();
