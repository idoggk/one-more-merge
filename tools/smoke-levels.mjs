// Smoke test: start every saga level in the real scene, let a merge bot play it fast for a few seconds,
// and report page errors / console errors per level. Usage: node tools/smoke-levels.mjs [from] [to] [seconds]
import puppeteer from 'puppeteer-core';
import { createServer } from 'vite';

const from = Number(process.argv[2] ?? 1), to = Number(process.argv[3] ?? 60), secs = Number(process.argv[4] ?? 6);
const only = process.env.ONLY ? process.env.ONLY.split(',').map(Number) : null;
const CHROME = process.env.CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const server = await createServer({ server: { port: 5198, strictPort: false, host: '127.0.0.1' }, logLevel: 'error' });
await server.listen();
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 763, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
const errors = [];
let cur = 0;
page.on('pageerror', (e) => errors.push(`L${cur} PAGEERROR ${e.message}\n${(e.stack ?? '').split('\n').slice(1, 6).join('\n')}`));
page.on('console', (m) => m.type() === 'error' && errors.push(`L${cur} console ${m.text().slice(0, 160)}`));
await page.goto(`${server.resolvedUrls.local[0]}?timer&reset`, { waitUntil: 'networkidle0' });
await page.waitForFunction(() => window.__omm?.game?.scene?.getScene('game')?.s, { timeout: 30000 });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
for (let n = from; n <= to; n++) {
  if (only && !only.includes(n)) continue;
  cur = n;
  await page.evaluate((fk) => { window.__fk = fk; }, !!process.env.FASTKILL);
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
    return `${s.phase}${flags} t=${s.elapsed.toFixed(1)} hp=${Math.round(s.hp)}/${Math.round(s.maxHp)}${s.stage ? ` machine ${s.stage.i + 1}/${s.stage.hps.length + (s.stage.goal ? 1 : 0)}` : ''}${s.boss && !s.boss.light ? ' BOSS' : ''}${s.goal ? ` goal ${s.goal.best}/${s.goal.n}` : ''}`;
  }, !!process.env.DEBUGFLAGS);
  console.log(`L${n} ${st}`);
}
console.log(errors.length ? errors.join('\n') : 'NO ERRORS');
await browser.close();
await server.close();
