// Real-touch regression test for the merge interaction (playtest 3: "merges must be absolutely perfect").
// Headless Chrome at iPhone size with touch events; asserts every sprite ends exactly on its model cell.
// Usage: node tools/touch-test.mjs
import puppeteer from 'puppeteer-core';
import { createServer } from 'vite';

const CHROME = process.env.CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const server = await createServer({ server: { port: 5198, strictPort: false, host: '127.0.0.1' }, logLevel: 'error' });
await server.listen();
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 763, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
await page.goto(`${server.resolvedUrls.local[0]}?timer`, { waitUntil: 'networkidle0' });
await page.waitForFunction(() => window.__omm?.game?.scene?.getScene('game')?.s, { timeout: 30000 });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// board: bell1 @0, coil2 @12, cannon3 @13, bell2 @20, bell2 @24
await page.evaluate(() => {
  const sc = window.__omm.game.scene.getScene('game');
  sc.closeModal();
  sc.coach.clear();
  Object.assign(sc.meta, { tutorialDone: true, toys: {}, tips: { delivery: true, overdrive: true, full: true, clock: true, next: true, x_chain: true, x_kick_fuse: true, x_kick_plain: true } });
  sc.retry(false, -1);
  const s = sc.s;
  const mk = (f, r) => ({ id: s.nextId++, family: f, rank: r, cd: 99 });
  s.grid.fill(null);
  Object.assign(s.grid, { 0: mk('bell', 1), 12: mk('coil', 2), 13: mk('cannon', 3), 20: mk('bell', 2), 24: mk('bell', 2) });
  s.supplyTimer = 1e9; // no deliveries during the test
  sc.reconcile(true);
});
await wait(300);
const geo = await page.evaluate(() => {
  const sc = window.__omm.game.scene.getScene('game');
  const r = document.querySelector('canvas').getBoundingClientRect();
  const v = sc.views.get(sc.s.grid[0].id);
  return { left: r.left, top: r.top, k: r.width / 720, x0: v.x, y0: v.y };
});
const CELL = 124;
const scr = (i, dx = 0, dy = 0) => ({ x: geo.left + (geo.x0 + (i % 5) * CELL + dx) * geo.k, y: geo.top + (geo.y0 + Math.floor(i / 5) * CELL + dy) * geo.k });

/** Drag with the finger: grab at an offset inside `from`, release where the PIECE (40 world px above the finger) is over `to`. */
async function drag(from, to, grab = { x: 18, y: 26 }, steps = 14) {
  const a = scr(from, grab.x, grab.y);
  const b = scr(to, grab.x * 0.3, 40 + grab.y * 0.3);
  await page.touchscreen.touchStart(a.x, a.y);
  for (let i = 1; i <= steps; i++) {
    await page.touchscreen.touchMove(a.x + ((b.x - a.x) * i) / steps, a.y + ((b.y - a.y) * i) / steps);
    await wait(16);
  }
  await wait(60);
  await page.touchscreen.touchEnd();
  await wait(450);
}
const state = () =>
  page.evaluate(() => {
    const sc = window.__omm.game.scene.getScene('game');
    const s = sc.s;
    const v0 = { x: 112, y: 0 };
    const cells = s.grid.map((g) => (g ? `${g.family[0]}${g.rank}` : '.'));
    const off = [];
    const first = sc.views.values().next().value;
    s.grid.forEach((g, i) => {
      if (!g) return;
      const v = sc.views.get(g.id);
      const c = sc.cellCenter(i);
      if (!v || Math.abs(v.x - c.x) > 1 || Math.abs(v.y - c.y) > 1 || Math.abs(v.angle) > 0.5 || Math.abs(v.scale - 1) > 0.01) off.push([i, g.family, v && Math.round(v.x), v && Math.round(v.y)]);
    });
    void v0;
    void first;
    return { cells, off, views: sc.views.size, live: s.grid.filter(Boolean).length };
  });

let fails = 0;
const check = (name, cond, info) => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${cond ? '' : '  ' + JSON.stringify(info)}`);
  if (!cond) fails++;
};
await drag(0, 7);
let st = await state();
check('move into empty cell lands exactly', st.cells[7] === 'b1' && st.cells[0] === '.' && !st.off.length && st.views === st.live, st);
await drag(12, 13, { x: -30, y: 10 });
st = await state();
check('drop on a non-matching piece bounces back, nothing moves', st.cells[12] === 'c2' && st.cells[13] === 'c3' && !st.off.length, st);
await drag(20, 24, { x: 0, y: 0 });
st = await state();
check('merge lands exactly, one sprite per gadget', st.cells[24] === 'b3' && st.cells[20] === '.' && !st.off.length && st.views === st.live, st);
await drag(24, 23, { x: 35, y: 35 }, 4); // fast flick
st = await state();
check('fast short flick still lands exactly', st.cells[23] === 'b3' && !st.off.length, st);
await drag(23, 23, { x: 10, y: 10 }, 6); // pick up and put back
st = await state();
check('pick up and drop on itself returns home', st.cells[23] === 'b3' && !st.off.length, st);
await browser.close();
await server.close();
console.log(fails ? `${fails} FAILED` : 'ALL PASS');
process.exit(fails ? 1 : 0);
