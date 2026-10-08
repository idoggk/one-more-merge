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
// iPhone has no navigator.vibrate: run the iOS haptic path (hidden switch <label>.click()) like the phone does
await page.evaluateOnNewDocument(() => delete Navigator.prototype.vibrate);
await page.setViewport({ width: 390, height: 763, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
await page.goto(`${server.resolvedUrls.local[0]}?timer`, { waitUntil: 'networkidle0', timeout: 90000 });
await page.waitForFunction(() => window.__omm?.game?.scene?.getScene('game')?.s, { timeout: 30000 });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

let fails = 0;
const check = (name, cond, info) => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${cond ? '' : '  ' + JSON.stringify(info)}`);
  if (!cond) fails++;
};

// --- fresh player: the warm-up tutorial is played with touch only (t-a4bbd2f7: "in the warm up tutorial I can't click on anything") ---
const tut = () =>
  page.evaluate(() => {
    const sc = window.__omm.game.scene.getScene('game');
    const step = sc.constructor.TUTORIAL[sc.tutorialStep];
    const b = sc.coach.nextBtn.getBounds();
    return { phase: sc.s.phase, step: sc.tutorialStep, short: sc.tutorialShort, waiting: sc.tutorialWaiting, pair: step && sc.s.phase === 'tutorial' ? sc.tutorialPair(step) : null, gotIt: { x: b.centerX, y: b.centerY }, merges: sc.s.stats.merges, done: sc.meta.tutorialDone, focus: document.activeElement?.tagName, modal: !!sc.modal };
  });
const toScreen = (wx, wy) => page.evaluate((wx, wy) => { const r = document.querySelector('canvas').getBoundingClientRect(); return { x: r.left + wx * (r.width / 720), y: r.top + wy * (r.width / 720) }; }, wx, wy);
const cellScreen = (i, dy = 0) => page.evaluate((i, dy) => { const sc = window.__omm.game.scene.getScene('game'); const c = sc.cellCenter(i); const r = document.querySelector('canvas').getBoundingClientRect(); return { x: r.left + c.x * (r.width / 720), y: r.top + (c.y + dy) * (r.width / 720) }; }, i, dy);
/** Touch-drag so the lifted PIECE (85 world px above the finger) lands on `to`. */
async function touchDrag(from, to) {
  const a = await cellScreen(from), b = await cellScreen(to, 85);
  await page.touchscreen.touchStart(a.x, a.y);
  for (let i = 1; i <= 12; i++) {
    await page.touchscreen.touchMove(a.x + ((b.x - a.x) * i) / 12, a.y + ((b.y - a.y) * i) / 12);
    await wait(16);
  }
  await wait(60);
  await page.touchscreen.touchEnd();
}
/** Any same-family same-rank pair on the board (a legal merge), or null. */
const anyPair = () =>
  page.evaluate(() => {
    const g = window.__omm.game.scene.getScene('game').s.grid;
    for (let i = 0; i < g.length; i++) for (let j = 0; j < g.length; j++) if (i !== j && g[i] && g[j] && g[i].family === g[j].family && g[i].rank === g[j].rank) return [i, j];
    return null;
  });
/** Plays the tutorial by touch as the coach asks (drag the shown pair, tap GOT IT); `wrongAt`: at that mismatch step, merge a pair instead;
 *  `doubleAt`: at that step, make a second merge right after the asked one (before its GOT IT shows). */
async function playTutorial(wrongAt = -1, doubleAt = -1) {
  let wrong = false, doubled = false;
  for (let guard = 0; guard < 30; guard++) {
    const t = await tut();
    if (t.phase !== 'tutorial') {
      await wait(1200); // the script's own startLevel(1) lands first
      return tut();
    }
    if (t.waiting) {
      const g = await toScreen(t.gotIt.x, t.gotIt.y);
      await page.touchscreen.tap(g.x, g.y);
      await wait(1500);
      continue;
    }
    if (!t.pair) {
      await wait(500);
      continue;
    }
    let [a, b] = t.pair;
    if (t.step === wrongAt && !wrong) {
      wrong = true;
      [a, b] = await page.evaluate(() => {
        const g = window.__omm.game.scene.getScene('game').s.grid;
        for (let i = 0; i < g.length; i++) for (let j = 0; j < g.length; j++) if (i !== j && g[i] && g[j] && g[i].family === 'cannon' && g[j].family === 'cannon' && g[i].rank === g[j].rank) return [i, j];
        return [-1, -1];
      });
    }
    await touchDrag(a, b);
    if (t.step === doubleAt && !doubled) {
      doubled = true;
      const p = await anyPair();
      if (p) await touchDrag(p[0], p[1]);
    }
    await wait(1800);
  }
  return tut();
}
await wait(800);
let t0 = await tut();
const t0Tap = await cellScreen(t0.pair?.[0] ?? 0);
await page.touchscreen.tap(t0Tap.x, t0Tap.y); // a tap is not a drag: nothing breaks, the coach says to drag
await wait(300);
const tapMsg = await page.evaluate(() => {
  const sc = window.__omm.game.scene.getScene('game');
  return { text: sc.laneMsg.text, live: sc.time.now < sc.laneMsg.until };
});
check('tutorial tap says to drag', tapMsg.text === 'DRAG it onto its match!' && tapMsg.live, tapMsg);
const tEnd = await playTutorial();
check('fresh player: warm-up starts short and finishes by touch', t0.phase === 'tutorial' && t0.short && tEnd.phase === 'playing' && tEnd.done && tEnd.merges === 0, { t0, tEnd });
check('iOS haptic switch never takes focus', tEnd.focus === 'BODY' || tEnd.focus === 'CANVAS', tEnd);
// full tutorial (Replay tutorial); a merge during the mismatch step must not stall the script
await page.evaluate(() => {
  const sc = window.__omm.game.scene.getScene('game');
  while (sc.explaining) sc.nextExplain();
  sc.startTutorial();
});
await wait(800);
const tFull = await playTutorial(3);
check('full tutorial: a merge in the mismatch step does not stall it', tFull.phase === 'playing', tFull);
// full tutorial: two quick merges at the bell step (the 2nd lands in the mismatch step before GOT IT shows) must not lock input
await page.evaluate(() => {
  const sc = window.__omm.game.scene.getScene('game');
  while (sc.explaining) sc.nextExplain();
  sc.startTutorial();
});
await wait(800);
const tDouble = await playTutorial(-1, 2);
check('full tutorial: two quick merges into the mismatch step do not lock input', tDouble.phase === 'playing', tDouble);
// a warm-up saved mid-way and reloaded stays the one-merge warm-up
await page.evaluate(() => {
  const sc = window.__omm.game.scene.getScene('game');
  while (sc.explaining) sc.nextExplain();
  sc.startTutorial();
  sc.save();
  localStorage.setItem('omm.meta.v1', JSON.stringify({ ...sc.meta, tutorialDone: false }));
});
await page.reload({ waitUntil: 'load', timeout: 90000 });
await page.waitForFunction(() => window.__omm?.game?.scene?.getScene('game')?.s, { timeout: 30000 });
await wait(800);
t0 = await tut();
const tReload = await playTutorial();
check('reloaded warm-up stays the one-merge warm-up and finishes', t0.phase === 'tutorial' && t0.short && tReload.phase === 'playing' && tReload.done, { t0, tReload });

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
  while (sc.explaining) sc.nextExplain();
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

// --- drag reliability on iPhone Safari (t-82a81e11) ---
/** Finger down at the first screen point, slides through the rest, lifts unless `lift` is false. */
async function fingerPath(pts, { steps = 10, lift = true, settle = 450 } = {}) {
  await page.touchscreen.touchStart(pts[0].x, pts[0].y);
  for (let k = 1; k < pts.length; k++)
    for (let i = 1; i <= steps; i++) {
      await page.touchscreen.touchMove(pts[k - 1].x + ((pts[k].x - pts[k - 1].x) * i) / steps, pts[k - 1].y + ((pts[k].y - pts[k - 1].y) * i) / steps);
      await wait(16);
    }
  if (lift) await release(settle);
}
/** Screen point of the finger that holds the PIECE over cell `i` (the piece floats LIFT world px above the finger). */
const holdOver = (i) => cellScreen(i, LIFT);
const setLevel = (n) => page.evaluate((n) => (window.__omm.game.scene.getScene('game').s.level = n), n);
/** A finger point (world) where the held piece is over SCRAP and also over the bottom-right cell (BR), else over SCRAP alone. */
const scrapFinger = () =>
  page.evaluate(() => {
    const sc = window.__omm.game.scene.getScene('game');
    const zx = sc.scrapZone.x, zy = sc.scrapZone.y;
    const hv = sc.hoverIdx;
    sc.hoverIdx = -1;
    let both = null;
    for (let y = zy - 10; y < zy + 70 && !both; y += 2) for (let x = zx - 66; x < zx + 60 && !both; x += 2) if (sc.overScrap(x, y - 45) && sc.targetCell(x, y - LIFT_W) === sc.s.grid.length - 1) both = { x, y };
    sc.hoverIdx = hv;
    return { both, scrap: { x: zx, y: zy + 45 } };
  }).then(async (r) => ({ both: r.both && (await toScreen(r.both.x, r.both.y)), scrap: await toScreen(r.scrap.x, r.scrap.y) }));
await page.evaluate((l) => (window.LIFT_W = l), LIFT);
const BR = await page.evaluate(() => window.__omm.game.scene.getScene('game').s.grid.length - 1);

// 11) SCRAP is hidden in levels 1-3: a low piece dropped there is never deleted
await setLevel(2);
await setBoard({ 27: 'b1' });
await wait(200);
let sf = await scrapFinger();
await fingerPath([await cellScreen(27), sf.scrap]);
st = await state();
check('hidden SCRAP zone (level 2) never deletes a piece', st.live === 1 && st.cells.includes('b1') && clean(st), st);

// 12) SCRAP shown (level 10): a highlighted merge over the zone wins; without a merge there, the zone scraps
await setLevel(10);
await setBoard({ 27: 'b1', [BR]: 'b1' });
await wait(200);
sf = await scrapFinger();
check('a finger point exists where SCRAP and the bottom-right cell overlap', !!sf.both, sf);
m0 = (await state()).merges;
await fingerPath([await cellScreen(27), sf.both ?? sf.scrap]);
st = await state();
check('highlighted merge over the SCRAP zone merges, never scraps', st.cells[BR] === 'b2' && st.live === 1 && st.merges === m0 + 1 && clean(st), st);
await setBoard({ 27: 'b1', [BR]: 'n2' });
await wait(200);
await fingerPath([await cellScreen(27), sf.both ?? sf.scrap]);
st = await state();
check('no merge under the piece: shown SCRAP zone scraps it', st.live === 1 && st.cells[BR] === 'c2' && clean(st), st);

// 13) background/foreground mid-touch (the touchend never comes): the next drag still works
const ghostTouch = (i, id) =>
  page.evaluate(
    (i, id) => {
      const sc = window.__omm.game.scene.getScene('game');
      const canvas = document.querySelector('canvas');
      const r = canvas.getBoundingClientRect();
      const c = sc.cellCenter(i);
      const t = new Touch({ identifier: id, target: canvas, clientX: r.left + c.x * (r.width / 720), clientY: r.top + c.y * (r.width / 720), pageX: r.left + c.x * (r.width / 720), pageY: r.top + c.y * (r.width / 720) });
      canvas.dispatchEvent(new TouchEvent('touchstart', { changedTouches: [t], touches: [t], targetTouches: [t], bubbles: true, cancelable: true }));
      return sc.dragIdx;
    },
    i,
    id,
  );
const setHidden = (h) =>
  page.evaluate((h) => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => h });
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => (h ? 'hidden' : 'visible') });
    document.dispatchEvent(new Event('visibilitychange'));
  }, h);
await setLevel(10);
await setBoard({ 6: 'b1', 8: 'b1' });
await wait(200);
const ghostHeld = await ghostTouch(6, 4242);
await setHidden(true);
await wait(200);
await setHidden(false);
await wait(300);
const back = await state();
m0 = back.merges;
await fingerPath([await cellScreen(6), await holdOver(8)]);
st = await state();
check('backgrounded mid-touch: the hold is dropped and the next drag merges', ghostHeld === 6 && back.dragIdx === -1 && st.cells[8] === 'b2' && st.merges === m0 + 1 && clean(st), { ghostHeld, back, st });

// 14) a lost touchend with no app switch: the next touch frees the dead touch slot
await setBoard({ 6: 'b1', 8: 'b1' });
await wait(200);
const ghost2 = await ghostTouch(6, 4343);
await wait(300);
m0 = (await state()).merges;
await fingerPath([await cellScreen(6), await holdOver(8)]);
st = await state();
check('lost touchend: the next touch still drags and merges', ghost2 === 6 && st.cells[8] === 'b2' && st.merges === m0 + 1 && clean(st), st);

// 15) a held power-up is dropped by cancelDrag and by the lost-finger safety net
const item = await page.evaluate(async () => {
  const sc = window.__omm.game.scene.getScene('game');
  sc.itemDrag = { x: 0, y: 0, moved: true };
  sc.cancelDrag();
  const byCancel = sc.itemDrag;
  sc.itemDrag = { x: 0, y: 0, moved: true }; // no finger is down
  await new Promise((r) => setTimeout(r, 200));
  const byNet = sc.itemDrag;
  sc.itemDrag = null;
  sc.itemSelected = false;
  return { byCancel, byNet };
});
check('held power-up cleared by cancelDrag and the safety net', item.byCancel === null && item.byNet === null, item);

// 16) repeated mismatch bounces: every sprite back on its cell, every rank label back to size
await setBoard({ 12: 'c2', 13: 'c3' });
await wait(200);
await drag(12, 13, { x: 0, y: 0 }); // one real bounce, then three more that each land mid-pulse of the last
const bounced = await page.evaluate(async () => {
  const sc = window.__omm.game.scene.getScene('game');
  const out = [];
  for (let k = 0; k < 3; k++) {
    out.push(sc.commitDrop(12, 13, sc.s.grid[12].id));
    await new Promise((r) => setTimeout(r, 120));
  }
  return out;
});
await wait(1400);
st = await state();
const ranks = await page.evaluate(() => {
  const sc = window.__omm.game.scene.getScene('game');
  return [...sc.views.values()].map((v) => v.getByName('rank')?.scale).filter((s) => s !== undefined && Math.abs(s - 1) > 0.01);
});
check('repeated shakes leave no sprite offset and no enlarged rank label', bounced.every((b) => b === false) && st.cells[12] === 'c2' && st.cells[13] === 'c3' && clean(st) && !ranks.length, { bounced, st, ranks });

// --- iPhone safe areas: #game inset like a notched phone, so the canvas has margins the finger can slide into ---
await page.evaluateOnNewDocument(() => {
  document.addEventListener('DOMContentLoaded', () => {
    const s = document.createElement('style');
    s.textContent = '#game{inset:47px 0 34px 0 !important}';
    document.head.appendChild(s);
  });
});
await page.reload({ waitUntil: 'load', timeout: 90000 });
await page.waitForFunction(() => window.__omm?.game?.scene?.getScene('game')?.s, { timeout: 30000 });
await wait(800);
await page.evaluate((l) => {
  window.LIFT_W = l;
  const sc = window.__omm.game.scene.getScene('game');
  while (sc.explaining) sc.nextExplain();
  sc.closeModal();
  sc.coach.clear();
  sc.retry(false, -1);
  sc.finishIntro(true);
  while (sc.explaining) sc.nextExplain();
  sc.s.level = 10;
}, LIFT);
const rect = await page.evaluate(() => {
  const r = document.querySelector('canvas').getBoundingClientRect();
  return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, vh: innerHeight };
});
check('inset layout: the canvas sits inside the safe areas', rect.top >= 46 && rect.bottom <= rect.vh - 33, rect);

// 17) the finger slides off the canvas (into the top inset) and comes back: the drop still lands
await setBoard({ 6: 'b1', 8: 'b1' });
await wait(300);
m0 = (await state()).merges;
await fingerPath([await cellScreen(6), { x: (rect.left + rect.right) / 2, y: rect.top - 20 }, await holdOver(8)]);
st = await state();
check('inset: drag that leaves the canvas and comes back still merges', st.cells[8] === 'b2' && st.merges === m0 + 1 && clean(st), st);

// 18) the finger lets go off the canvas (side margin): the highlighted merge lands
await setBoard({ 5: 'b1', 9: 'b1' });
await wait(300);
m0 = (await state()).merges;
const over9 = await holdOver(9);
await fingerPath([await cellScreen(5), over9], { lift: false });
await page.touchscreen.touchMove(rect.right + 6, over9.y); // one jump off the right edge
await wait(40);
await release();
st = await state();
check('inset: release off the canvas lands on the highlighted merge', rect.right + 6 < 390 && st.cells[9] === 'b2' && st.merges === m0 + 1 && clean(st), { st, rect });

// 19) a SCRAP drag that overshoots below the canvas (into the home-bar inset) still scraps
await setBoard({ 27: 'b1', 0: 'c3' });
await wait(300);
sf = await scrapFinger();
await fingerPath([await cellScreen(27), sf.scrap, { x: sf.scrap.x, y: rect.bottom + 14 }]);
st = await state();
check('inset: SCRAP overshoot below the canvas still scraps', !st.cells.includes('b1') && st.live === 1 && clean(st), { st, rect });

check('no page errors', !pageErrors.length, pageErrors);
await browser.close();
await server.close();
console.log(fails ? `${fails} FAILED` : 'ALL PASS');
process.exit(fails ? 1 : 0);
