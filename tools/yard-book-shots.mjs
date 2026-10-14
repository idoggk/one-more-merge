// Screenshots (390x844 @ DPR 2) of the Screw Yard Book: the Collection Book (locked / unlocked), the live TAPS + pips + unit crate,
// the box token flying to the crate, the crate pop + card flip, the result. Starts its own Vite server, one fresh browser context per scenario.
// Usage: node tools/yard-book-shots.mjs [outDir]   (default art-candidates/yard-book)
import puppeteer from 'puppeteer-core';
import { createServer } from 'vite';
import { mkdirSync } from 'node:fs';

const out = process.argv[2] ?? 'art-candidates/yard-book';
mkdirSync(out, { recursive: true });
const CHROME = process.env.CHROME ?? `${process.env.ProgramFiles}/Google/Chrome/Application/chrome.exe`;
const server = await createServer({ server: { port: 5251, strictPort: false, host: '127.0.0.1' }, logLevel: 'error' });
await server.listen();
const URL = `${server.resolvedUrls.local[0]}?timer`;
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function scenario(unit, meta, fn) {
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
  const keys = { omm_qa_screw_yard: 'object', omm_qa_yard_book: 'on', omm_qa_yard_unit: unit, omm_shake: 'soft' };
  await page.evaluateOnNewDocument((k) => { for (const [a, b] of Object.entries(k)) localStorage.setItem(a, b); }, keys);
  await page.goto(URL, { waitUntil: 'networkidle0', timeout: 120000 });
  await page.waitForFunction(() => window.__omm?.game?.scene?.getScene('game')?.s, { timeout: 30000 });
  if (meta) await page.evaluate((m) => { window.__omm.game.scene.getScene('game').meta.yardBook = m; }, meta);
  const yard = '(window.__omm.game.scene.getScene("objectYard"))';
  const api = {
    page,
    wait,
    ev: (f, arg) => page.evaluate(`(${f.toString()})(${yard}, ${JSON.stringify(arg ?? null)})`),
    shot: async (file, ms = 300) => {
      await wait(ms);
      await page.screenshot({ path: `${out}/${file}.png` });
      console.log('saved', file);
    },
    // the BOOK button of the SCREW YARD sheet (game coordinates 720 x H -> css px)
    tapBook: () => page.evaluate(() => {
      const g = window.__omm.game, s = g.scene.getScene('game');
      const k = g.canvas.getBoundingClientRect().width / 720;
      return { k, H: g.canvas.height / (g.canvas.width / 720) };
    }).then(async ({ k, H }) => { await page.touchscreen.tap((360 + 150) * k, (H / 2 + 590 - 70) * k); }),
  };
  await page.evaluate(() => {
    const s = window.__omm.game.scene.getScene('game');
    s.closeModal();
  });
  await fn(api);
  await ctx.close();
}

const startYard = async (a) => {
  await a.page.evaluate(() => window.__omm.game.scene.getScene('game').startYard(1));
  await wait(2500);
};

/** Tap one free screw, preferring a colour an open box wants. Returns false when nothing was free in this view. */
const tapOne = (s) => {
  const free = s.st.lvl.screws.filter((sc) => !s.st.removed[sc.id] && s.screwAt(sc.id).free);
  if (!free.length) return false;
  const want = free.find((sc) => s.st.boxes.some((b) => b && b.color === sc.color && b.n < 3)) ?? free[0];
  const a = s.screwAt(want.id);
  s.onTap(a.x, a.y);
  return true;
};

// 1 the Book on a fresh save: Cannon open, Coil and Bell locked
await scenario('cannon', null, async (a) => {
  await a.page.evaluate(() => window.__omm.game.scene.getScene('game').openYardEvent());
  await wait(800);
  await a.shot('1-yard-entry-with-book-button');
  await a.tapBook();
  await a.shot('2-book-locked', 900);
});

// 2 the Book after Cannon (3 stars) and Coil (1 star): Bell opens
await scenario('cannon', { cannon: 3, coil: 1 }, async (a) => {
  await a.page.evaluate(() => window.__omm.game.scene.getScene('game').openYardEvent());
  await wait(800);
  await a.tapBook();
  await a.shot('3-book-chain-open', 900);
});

// 3 a played Cannon: HUD, token in flight, crate pop + cards, result
await scenario('cannon', null, async (a) => {
  await startYard(a);
  let flight = false;
  let n = 0;
  for (let guard = 0; guard < 200; guard++) {
    if (await a.ev((s) => s.ended)) break;
    const tapped = await a.ev(tapOne);
    if (tapped) {
      n++;
      await a.wait(750);
      // first box done: catch the token on its way
      const done = await a.ev((s) => s.book.done);
      if (done >= 1 && !flight) {
        flight = true;
        await a.shot('4-hud-and-token-flying', 250);
      }
    } else {
      await a.ev((s) => s.rotate(1));
      await a.wait(450);
    }
  }
  await a.shot('5-crate-pop-cards', 2350);
  await a.shot('6-result-stars', 2000);
});

await browser.close();
await server.close();
