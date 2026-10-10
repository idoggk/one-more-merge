// Smoke test: start every saga level in the real scene, let a merge bot play it fast for a few seconds,
// and report page errors / console errors per level. Usage: node tools/smoke-levels.mjs [from] [to] [seconds]
// 'to' defaults to the last level in levels.json. PAGES=n plays n levels at once, each on its own page in
// its own browser context (separate saves); output stays in level order.
import { readFileSync } from 'node:fs';
import puppeteer from 'puppeteer-core';
import { createServer } from 'vite';

const levelCount = JSON.parse(readFileSync(new URL('../src/content/levels.json', import.meta.url), 'utf8')).levels.length;
const from = Number(process.argv[2] ?? 1), to = Number(process.argv[3] ?? levelCount), secs = Number(process.argv[4] ?? 6);
const only = process.env.ONLY ? process.env.ONLY.split(',').map(Number) : null;
const pages = Math.max(1, Number(process.env.PAGES ?? 1) || 1);
const CHROME = process.env.CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const server = await createServer({ server: { port: 5198, strictPort: false, host: '127.0.0.1' }, logLevel: 'error' });
await server.listen();
// several pages run side by side, so none of them may be throttled as a background tab
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--autoplay-policy=no-user-gesture-required',
  '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows'] });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const levels = [];
for (let n = from; n <= to; n++) if (!only || only.includes(n)) levels.push(n);
const errors = []; // [level, message]
const lines = new Map();
let printed = 0;
const flush = () => { while (printed < levels.length && lines.has(levels[printed])) console.log(lines.get(levels[printed++])); };

async function openPage() {
  const ctx = pages > 1 ? await browser.createBrowserContext() : browser.defaultBrowserContext();
  const page = await ctx.newPage();
  await page.setViewport({ width: 390, height: 763, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  const p = { page, cur: 0 };
  page.on('pageerror', (e) => errors.push([p.cur, `L${p.cur} PAGEERROR ${e.message}\n${(e.stack ?? '').split('\n').slice(1, 6).join('\n')}`]));
  page.on('console', (m) => m.type() === 'error' && errors.push([p.cur, `L${p.cur} console ${m.text().slice(0, 160)}`]));
  // 'load' + polling for the scene, not networkidle0: a cold Vite dep pre-bundle on a busy machine can keep
  // the network busy past 30 s, and the scene check is what we actually need
  await page.goto(`${server.resolvedUrls.local[0]}?timer&reset`, { waitUntil: 'load', timeout: 120000 });
  await page.waitForFunction(() => window.__omm?.game?.scene?.getScene('game')?.s, { timeout: 120000 });
  return p;
}

async function runLevel(p, n) {
  const { page } = p;
  p.cur = n;
  await page.evaluate((fk) => { window.__fk = fk; }, !!process.env.FASTKILL);
  // MERGE_RULE=sandwich2|sandwichBonus: the QA MERGE RULE switch (t-1effe0bf), read when the level starts
  await page.evaluate((rule) => (rule ? localStorage.setItem('omm_qa_merge_rule', rule) : localStorage.removeItem('omm_qa_merge_rule')), process.env.MERGE_RULE ?? '');
  await page.evaluate((lv) => {
    const sc = window.__omm.game.scene.getScene('game');
    clearInterval(window.__bot);
    sc.closeModal();
    sc.meta.tips = new Proxy({}, { get: () => true, set: () => true }); // every lesson already seen
    sc.startLevel(lv);
    sc.finishIntro(true);
    // fast bot: merge the highest pair every 300 ms; apply any tray item to the first fitting machine
    window.__bot = setInterval(() => {
      const s = sc.s;
      if (s.phase !== 'playing') return;
      if (sc.modal) sc.closeModal();
      if (sc.explaining) sc.nextExplain();
      // FASTKILL: push through stage transitions (next machine, goal machine, boss wake) quickly
      if (window.__fk && !s.goal && Math.random() < 0.12) s.hp = Math.min(s.hp, 1);
      if (s.itemTray) {
        const i = s.grid.findIndex((g) => g && !g.item && (s.itemTray === 'corner' ? g.family === 'bell' : g.family === 'cannon' || g.family === 'rocket'));
        if (i >= 0) sc.tryApplyItem(i);
      }
      let best = null;
      for (let i = 0; i < 30; i++) for (let j = i + 1; j < 30; j++) {
        const a = s.grid[i], b = s.grid[j];
        if (a && b && a.family === b.family && a.rank === b.rank && (!best || a.rank > s.grid[best[0]].rank)) best = [i, j];
      }
      if (best) sc.commitDrop(best[0], best[1], s.grid[best[0]].id);
    }, 300);
  }, n);
  await wait(secs * 1000);
  const st = await page.evaluate((process_env_debug) => {
    const s = window.__omm.game.scene.getScene('game').s;
    const sc = window.__omm.game.scene.getScene('game');
    const flags = process_env_debug ? ` [paused=${sc.paused} modal=${!!sc.modal} expl=${sc.explaining} intro=${sc.introActive} guided=${!!sc.guided} item=${!!sc.itemLesson} wait=${sc.tutorialWaiting} coach=${sc.coach?.waitingTap}]` : '';
    return `${s.phase}${flags} t=${s.elapsed.toFixed(1)} hp=${Math.round(s.hp)}/${Math.round(s.maxHp)}${s.stage ? ` machine ${s.stage.i + 1}/${s.stage.hps.length + (s.stage.goal ? 1 : 0)}` : ''}${s.boss && !s.boss.light ? ' BOSS' : ''}${s.goal ? ` goal ${s.goal.best}/${s.goal.n}` : ''}${s.stats.sandwiches ? ` sandwiches ${s.stats.sandwiches}` : ''}`;
  }, !!process.env.DEBUGFLAGS);
  lines.set(n, `L${n} ${st}`);
  flush();
}

// the first page warms Vite's dep pre-bundle; the rest then open in parallel
const first = await openPage();
const workers = [first, ...await Promise.all(Array.from({ length: Math.min(pages, levels.length) - 1 }, openPage))];
let next = 0;
await Promise.all(workers.map(async (p) => { while (next < levels.length) await runLevel(p, levels[next++]); }));
// stable sort: errors stay in the order they happened within each level
errors.sort((a, b) => a[0] - b[0]);
console.log(errors.length ? errors.map((e) => e[1]).join('\n') : 'NO ERRORS');
await browser.close();
await server.close();
