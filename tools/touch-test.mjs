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
const pageErrors = [];
page.on('pageerror', (e) => pageErrors.push(String(e)));
await page.setViewport({ width: 390, height: 763, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
await page.goto(`${server.resolvedUrls.local[0]}?timer`, { waitUntil: 'networkidle0', timeout: 90000 });
await page.waitForFunction(() => window.__omm?.game?.scene?.getScene('game')?.s, { timeout: 30000 });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/** Fresh board from { cell: 'b1' | 'c2' | 'n3' ... } (b = bell, c = coil, n = cannon); no deliveries during the test. */
const setBoard = (cells) =>
  page.evaluate((cells) => {
    const sc = window.__omm.game.scene.getScene('game');
    const s = sc.s;
    const fam = { b: 'bell', c: 'coil', n: 'cannon' };
    s.grid.fill(null);
    for (const [i, k] of Object.entries(cells)) s.grid[+i] = { id: s.nextId++, family: fam[k[0]], rank: +k.slice(1), cd: 99 };
    s.supplyTimer = 1e9;
    s.reactive = false; // merges owe no parts here: cells stay where the test put them
    s.pending = [];
    s.drops = [];
    sc.reconcile(true);
  }, cells);

// board: bell1 @0, coil2 @12, cannon3 @13, bell2 @20, bell2 @24
await page.evaluate(() => {
  const sc = window.__omm.game.scene.getScene('game');
  sc.closeModal();
  sc.coach.clear();
  Object.assign(sc.meta, { tutorialDone: true, toys: {}, tips: { delivery: true, overdrive: true, full: true, clock: true, next: true, x_chain: true, x_kick_fuse: true, x_kick_plain: true } });
  sc.retry(false, -1);
  sc.finishIntro(true);
});
await setBoard({ 0: 'b1', 12: 'c2', 13: 'n3', 20: 'b2', 24: 'b2' });
await wait(300);
const geo = await page.evaluate(() => {
  const sc = window.__omm.game.scene.getScene('game');
  const r = document.querySelector('canvas').getBoundingClientRect();
  const v = sc.views.get(sc.s.grid[0].id);
  return { left: r.left, top: r.top, k: r.width / 720, x0: v.x, y0: v.y };
});
const CELL = 124;
/** On touch the held piece floats this many world px above the finger (GameScene DRAG_LIFT_TOUCH). */
const LIFT = 85;
const scr = (i, dx = 0, dy = 0) => ({ x: geo.left + (geo.x0 + (i % 5) * CELL + dx) * geo.k, y: geo.top + (geo.y0 + Math.floor(i / 5) * CELL + dy) * geo.k });

let finger = null;
/** Put the finger down at an offset inside `from`. */
async function press(from, grab = { x: 18, y: 26 }) {
  finger = scr(from, grab.x, grab.y);
  await page.touchscreen.touchStart(finger.x, finger.y);
}
/** Slide the finger until the PIECE (LIFT world px above the finger) is over `to`. */
async function slide(to, grab = { x: 18, y: 26 }, steps = 14) {
  const a = finger;
  const b = scr(to, grab.x * 0.3, LIFT + grab.y * 0.3);
  for (let i = 1; i <= steps; i++) {
    await page.touchscreen.touchMove(a.x + ((b.x - a.x) * i) / steps, a.y + ((b.y - a.y) * i) / steps);
    await wait(16);
  }
  finger = b;
}
async function release(settle = 450, still = 60) {
  await wait(still);
  await page.touchscreen.touchEnd();
  await wait(settle);
}
/** Drag with the finger: grab at an offset inside `from`, release where the PIECE is over `to`. */
async function drag(from, to, grab = { x: 18, y: 26 }, steps = 14, settle = 450, still = 60) {
  await press(from, grab);
  await slide(to, grab, steps);
  await release(settle, still);
}
const state = () =>
  page.evaluate(() => {
    const sc = window.__omm.game.scene.getScene('game');
    const s = sc.s;
    const cells = s.grid.map((g) => (g ? `${g.family[0]}${g.rank}` : '.'));
    const off = [];
    s.grid.forEach((g, i) => {
      if (!g) return;
      const v = sc.views.get(g.id);
      const c = sc.cellCenter(i);
      if (!v || !v.visible || Math.abs(v.x - c.x) > 1 || Math.abs(v.y - c.y) > 1 || Math.abs(v.angle) > 0.5 || Math.abs(v.scale - 1) > 0.01) off.push([i, g.family, v && Math.round(v.x), v && Math.round(v.y)]);
    });
    return { cells, off, views: sc.views.size, live: s.grid.filter(Boolean).length, dragIdx: sc.dragIdx, explaining: sc.explaining, paused: sc.paused, merges: s.stats.merges };
  });
const clean = (st) => !st.off.length && st.views === st.live && st.dragIdx === -1;

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

// --- merge-flow audit (t-0ed230cd) ---
// 6) a second legal merge right after the first (a fast flick; the old 100 ms merge cooldown refused these) lands
await setBoard({ 0: 'n1', 1: 'n1', 3: 'b2', 4: 'b2' });
await wait(200);
let m0 = (await state()).merges;
await page.evaluate(() => {
  const sc = window.__omm.game.scene.getScene('game');
  const orig = sc.commitDrop;
  sc.dropTimes = [];
  sc.commitDrop = function (...a) {
    sc.dropTimes.push(sc.s.elapsed);
    return orig.apply(this, a);
  };
});
await drag(0, 1, { x: 0, y: 0 }, 6, 0);
await drag(3, 4, { x: 0, y: 0 }, 3, 450, 0);
const gap = await page.evaluate(() => {
  const sc = window.__omm.game.scene.getScene('game');
  delete sc.commitDrop;
  return Math.round((sc.dropTimes[1] - sc.dropTimes[0]) * 1000);
});
st = await state();
check(`rapid double merge: both merges land (${gap} ms sim time apart)`, st.cells[1] === 'c2' && st.cells[4] === 'b3' && st.merges === m0 + 2 && clean(st), st);

// 7) a kickback fuse aimed at the held part goes elsewhere; the hold survives and the merge lands
await setBoard({ 6: 'b1', 8: 'b1', 20: 'c3' });
await wait(200);
await press(6, { x: 0, y: 0 });
await slide(7, { x: 0, y: 0 }, 6);
const heldId = await page.evaluate(() => {
  const sc = window.__omm.game.scene.getScene('game');
  const s = sc.s;
  const id = s.grid[6].id;
  s.drops.push({ t: 0, fuse: true, plan: { idx: 6, land: 1, id } });
  return id;
});
await wait(250);
const mid = await page.evaluate(() => {
  const sc = window.__omm.game.scene.getScene('game');
  return { id: sc.s.grid[6]?.id, dragIdx: sc.dragIdx, held: !!sc.dragView };
});
await slide(8, { x: 0, y: 0 }, 6);
await release();
st = await state();
check('kickback during hold: held part untouched, merge lands', mid.id === heldId && mid.dragIdx === 6 && mid.held && st.cells[8] === 'b2' && st.cells[6] === '.' && clean(st), { mid, st });

// 8) the game removes the held part (boss suction): the drag cancels cleanly, the release does nothing
await setBoard({ 6: 'b1', 8: 'b1' });
await wait(200);
m0 = (await state()).merges;
await press(6, { x: 0, y: 0 });
await slide(7, { x: 0, y: 0 }, 6);
await page.evaluate(() => {
  const sc = window.__omm.game.scene.getScene('game');
  const id = sc.s.grid[6].id;
  sc.s.grid[6] = null;
  sc.handleEvents([{ type: 'bossHit', attack: 'suction', target: { cells: [6] }, removedIds: [id], outcome: 'hit' }]);
});
await slide(8, { x: 0, y: 0 }, 6);
await release(600);
st = await state();
check('held part removed by the game: drag cancels cleanly', st.cells[6] === '.' && st.cells[8] === 'b1' && st.merges === m0 && clean(st), st);

// 9) a pausing explainer that fires mid-hold waits for the finger; the drag is not eaten
await setBoard({ 6: 'b1', 8: 'b1' });
await wait(200);
await press(6, { x: 0, y: 0 });
await slide(7, { x: 0, y: 0 }, 6);
await page.evaluate(() => window.__omm.game.scene.getScene('game').explain('touch_test_card', [{ text: 'TEST CARD', spots: [] }]));
await wait(200);
const during = await state();
await slide(8, { x: 0, y: 0 }, 6);
await release();
st = await state();
check('explainer during hold waits for finger-up, merge lands', !during.explaining && !during.paused && during.dragIdx === 6 && st.cells[8] === 'b2' && st.explaining && clean(st), { during, st });
await page.evaluate(() => {
  const sc = window.__omm.game.scene.getScene('game');
  while (sc.explaining) sc.nextExplain();
});

// 10) touchcancel mid-drag (iOS system gesture) cancels: no merge, the piece goes home
await setBoard({ 6: 'b1', 8: 'b1' });
await wait(200);
m0 = (await state()).merges;
await press(6, { x: 0, y: 0 });
await slide(8, { x: 0, y: 0 }, 10);
await page.evaluate(() => {
  // the browser's own touchcancel for the live touch (CDP can't cancel a touch from a second session)
  const sc = window.__omm.game.scene.getScene('game');
  const canvas = document.querySelector('canvas');
  const p = sc.input.activePointer;
  const r = canvas.getBoundingClientRect();
  const t = new Touch({ identifier: p.identifier, target: canvas, clientX: r.left + p.x * (r.width / 720), clientY: r.top + p.y * (r.width / 720) });
  canvas.dispatchEvent(new TouchEvent('touchcancel', { changedTouches: [t], touches: [], bubbles: true, cancelable: true }));
});
await wait(450);
st = await state();
check('touchcancel cancels the drag, never commits', st.cells[6] === 'b1' && st.cells[8] === 'b1' && st.merges === m0 && clean(st), st);
await page.touchscreen.touchEnd(); // puppeteer's finger is still down; lifting it must not commit anything either
await wait(300);
const after = await state();
check('touchcancel: a late finger-up does nothing', after.cells[6] === 'b1' && after.cells[8] === 'b1' && after.merges === m0 && clean(after), after);

check('no page errors', !pageErrors.length, pageErrors);
await browser.close();
await server.close();
console.log(fails ? `${fails} FAILED` : 'ALL PASS');
process.exit(fails ? 1 : 0);
