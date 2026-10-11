// MERGE ASSIST probe (t-8426336a): headless Chrome, 390x844 phone with touch emulation. Measures the effective hit area of a
// cell and the MISS RATE of a simulated finger with a 10-12 px error (CSS px) on levels 1-3, with the assist OFF and ON.
// Two ways of aiming: 'piece' (the player aims the lifted part at the target) and 'finger' (a new player puts the FINGER on the
// target and forgets the part floats above it). Usage: node tools/merge-assist-probe.mjs [trialsPerCell=40]
import puppeteer from 'puppeteer-core';
import { createServer } from 'vite';

const CHROME = process.env.CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const TRIALS = +(process.argv[2] ?? 40);
const server = await createServer({ server: { port: 5197, strictPort: false, host: '127.0.0.1' }, logLevel: 'error' });
await server.listen();
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let seed = 12345;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);

async function openPage(mode) {
  const page = await browser.newPage();
  page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
  await page.evaluateOnNewDocument((m) => { if (m !== 'off') localStorage.setItem('omm_merge_assist', m); }, mode);
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await page.goto(`${server.resolvedUrls.local[0]}?timer`, { waitUntil: 'networkidle0', timeout: 90000 });
  await page.waitForFunction(() => window.__omm?.game?.scene?.getScene('game')?.s, { timeout: 30000 });
  return page;
}

const geometry = (page) =>
  page.evaluate(() => {
    const sc = window.__omm.game.scene.getScene('game');
    const r = document.querySelector('canvas').getBoundingClientRect();
    const k = r.width / 720;
    const c0 = sc.cellCenter(0), c1 = sc.cellCenter(1);
    return { canvasCss: [r.width, r.height], cellCss: (c1.x - c0.x) * k, scale: k };
  });

async function trial(page, level, aim, err) {
  await page.evaluate((level) => {
    const sc = window.__omm.game.scene.getScene('game');
    clearInterval(window.__bot);
    sc.closeModal();
    sc.coach.clear();
    sc.meta.tips = { delivery: true, overdrive: true, full: true, clock: true, next: true, x_chain: true, x_boss: true, tap_hint: true, x_kick_fuse: true, x_kick_plain: true, new_fan: true, new_rocket: true, new_magnet: true, new_battery: true };
    sc.meta.merges = 0;
    sc.startLevel(level);
    sc.finishIntro(true);
  }, level);
  await wait(450);
  // a first-time lesson card pauses the game: dismiss whatever is open so the drag is a plain drag
  await page.evaluate(() => { const sc = window.__omm.game.scene.getScene('game'); sc.explainQueue = []; sc.nextExplain(); sc.coach.clear(); sc.paused = false; });
  await wait(100);
  const pair = await page.evaluate(() => {
    const sc = window.__omm.game.scene.getScene('game');
    const g = sc.s.grid, out = [];
    for (let i = 0; i < g.length; i++) for (let j = 0; j < g.length; j++) if (i !== j && g[i] && g[j] && g[i].family === g[j].family && g[i].rank === g[j].rank) out.push([i, j]);
    return { pairs: out, on: sc.assistOn?.() ?? false, merges: sc.s.stats.merges, phase: sc.s.phase };
  });
  if (!pair.pairs.length) return null;
  const [from, to] = pair.pairs[Math.floor(rnd() * pair.pairs.length)];
  const pt = await page.evaluate((from, to, aim, ex, ey) => {
    const sc = window.__omm.game.scene.getScene('game');
    const r = document.querySelector('canvas').getBoundingClientRect(), k = r.width / 720;
    const a = sc.cellCenter(from), b = sc.cellCenter(to);
    const liftY = sc.assistOn() ? Math.max(85, 0.6 * 124) : 85, liftX = sc.assistOn() ? -0.6 * 124 : 0;
    // 'piece': aim so the lifted part lands on the target centre; 'finger': aim the finger itself at the target centre
    const tx = aim === 'piece' ? b.x - liftX : b.x, ty = aim === 'piece' ? b.y + liftY : b.y;
    return { a: { x: r.left + a.x * k, y: r.top + a.y * k }, b: { x: r.left + tx * k + ex, y: r.top + ty * k + ey } };
  }, from, to, aim, err.x, err.y);
  await page.touchscreen.touchStart(pt.a.x, pt.a.y);
  for (let i = 1; i <= 10; i++) {
    await page.touchscreen.touchMove(pt.a.x + ((pt.b.x - pt.a.x) * i) / 10, pt.a.y + ((pt.b.y - pt.a.y) * i) / 10);
    await wait(16);
  }
  await wait(60);
  await page.touchscreen.touchEnd();
  await wait(120);
  const after = await page.evaluate(() => window.__omm.game.scene.getScene('game').s.stats.merges);
  return { hit: after > pair.merges, on: pair.on };
}

const results = {};
for (const mode of ['off', 'on']) {
  const page = await openPage(mode);
  const geo = await geometry(page);
  if (mode === 'off') {
    const cell = geo.cellCss;
    console.log(`phone 390x844: canvas ${geo.canvasCss.map((v) => v.toFixed(0)).join('x')} css px, cell = ${cell.toFixed(1)} css px (124 design px)`);
    console.log(`today: the target is the cell nearest the PART (within 0.8 cell), so the hit area is the cell: ${cell.toFixed(0)}x${cell.toFixed(0)} px around the part`);
    console.log(`assist: a valid partner is picked when the part is within 0.7 cell of its box: ${(cell * 2.4).toFixed(0)}x${(cell * 2.4).toFixed(0)} px (${(2.4 * 2.4).toFixed(1)}x the area), valid targets only`);
  }
  for (const aim of ['piece', 'finger']) {
    for (const level of [1, 2, 3]) {
      let n = 0, hits = 0, on = false;
      for (let t = 0; t < TRIALS; t++) {
        const ang = rnd() * Math.PI * 2, mag = 10 + rnd() * 2;
        const r = await trial(page, level, aim, { x: Math.cos(ang) * mag, y: Math.sin(ang) * mag });
        if (!r) continue;
        n++;
        on = r.on;
        if (r.hit) hits++;
      }
      results[`${mode}/${aim}/L${level}`] = { n, miss: n ? +(((n - hits) / n) * 100).toFixed(1) : null, assistOn: on };
      console.log(`assist ${mode.toUpperCase()}  aim ${aim.padEnd(6)}  level ${level}: ${n} drags, miss ${n ? (((n - hits) / n) * 100).toFixed(1) : '-'}%  (assistOn=${on})`);
    }
  }
  await page.close();
}
console.log(JSON.stringify(results));
await browser.close();
await server.close();
