// Phone-size screenshots of named game states for design reviews (ChatGPT critique rounds).
// Starts its own temporary Vite server. Usage: node tools/shots.mjs [outDir] [state ...]   (default screenshots/)
import puppeteer from 'puppeteer-core';
import { createServer } from 'vite';
import { mkdirSync } from 'node:fs';

const out = process.argv[2] ?? 'screenshots';
mkdirSync(out, { recursive: true });
const CHROME = process.env.CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const server = await createServer({ server: { port: 5199, strictPort: false, host: '127.0.0.1' }, logLevel: 'error' });
await server.listen();
const URL = `${server.resolvedUrls.local[0]}?timer`;

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 763, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await page.goto(URL, { waitUntil: 'networkidle0' });
await page.waitForFunction(() => window.__omm?.game?.scene?.getScene('game')?.s, { timeout: 30000 });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/** Each state: a function run in the page (gets the scene) + how long to let animations play. */
const states = {
  home: [
    (sc) => {
      const m = sc.meta;
      Object.assign(m, { tutorialDone: true, hardUnlocked: true, mastery: { cannon: 4, coil: 2, bell: 5, magnet: 3 }, bolts: 47, toys: { magnet: true }, bestChain: 18 });
      sc.openTitle();
    },
    900,
  ],
  home_new_player: [
    (sc) => {
      Object.assign(sc.meta, { tutorialDone: true, hardUnlocked: false, mastery: {}, bolts: 0, toys: {}, bestChain: 0 });
      sc.openTitle();
    },
    900,
  ],
  workshop: [
    (sc) => {
      Object.assign(sc.meta, { mastery: { cannon: 4, coil: 2, bell: 5, magnet: 3 }, bolts: 47, owned: ['brass_kit'], finish: 'brass_kit', toys: { magnet: true } });
      sc.openTitle();
      sc.openWorkshop('mint_paint');
    },
    700,
  ],
  gameplay_chain_explainer: [
    (sc) => {
      sc.closeModal();
      sc.meta.tips = { delivery: true, overdrive: true, full: true, clock: true, next: true };
      sc.meta.toys = {};
      sc.retry(false, -1);
      sc.finishIntro(true);
      const s = sc.s;
      const mk = (f, r) => ({ id: s.nextId++, family: f, rank: r, cd: 30 });
      s.grid.fill(null);
      Object.assign(s.grid, { 16: mk('coil', 2), 17: mk('coil', 2), 12: mk('cannon', 2), 22: mk('bell', 1), 20: mk('cannon', 1), 21: mk('coil', 1), 3: mk('bell', 2), 9: mk('cannon', 1) });
      sc.reconcile(true);
      sc.commitDrop(16, 17, s.grid[16].id);
    },
    2600,
  ],
  chain_card2: [(sc) => sc.nextExplain(), 1000],
  intro_mid: [
    (sc) => {
      sc.closeModal();
      sc.retry(false, -1);
    },
    800,
  ],
  pause: [
    (sc) => {
      sc.coach.clear();
      sc.paused = false;
      sc.explaining = false;
      sc.openPause();
    },
    600,
  ],
  result_win: [
    (sc) => {
      sc.coach.clear();
      sc.paused = false;
      sc.explaining = false;
      sc.runBest = { cannon: 4, coil: 3, bell: 2 };
      sc.s.phase = 'won';
      sc.s.target = 2;
      sc.s.elapsed = 96.4;
      sc.s.stats.merges = 31;
      sc.s.stats.biggestChain = 14;
      sc.openResult(true);
    },
    900,
  ],
};
const only = process.argv.slice(3);
for (const [name, [fn, ms]] of Object.entries(states)) {
  if (only.length && !only.includes(name)) continue;
  await page.evaluate(`(${fn.toString()})(window.__omm.game.scene.getScene('game'))`);
  await wait(ms);
  await page.screenshot({ path: `${out}/${name}.png` });
  console.log('saved', `${out}/${name}.png`);
}
await browser.close();
await server.close();
