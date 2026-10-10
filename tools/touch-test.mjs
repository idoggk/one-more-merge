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
const rejects = () => page.evaluate(() => { const sc = window.__omm.game.scene.getScene('game'); return { n: sc.dropRejects, hint: sc.lastDropHint }; });
let rj0 = await rejects();
await drag(23, 23, { x: 10, y: 10 }, 6); // pick up and put back
st = await state();
let rj = await rejects();
check('pick up and drop on itself returns home (one reject, match hint)', st.cells[23] === 'b3' && !st.off.length && rj.n === rj0.n + 1 && rj.hint === 'DROP ON A MATCHING PART', { st, rj0, rj });

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
// a first-time explainer (clarity-pass tips) may open here and pause input; read it before the drags
await page.evaluate(() => {
  const sc = window.__omm.game.scene.getScene('game');
  while (sc.explaining) sc.nextExplain();
});
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
// 12b) a rank 3 part dropped on SCRAP without the hold: rejected (snaps home), with the hold-to-scrap hint
// 'Early' is measured on the scene clock: the time over SCRAP (scrapHold) is read as the drop resolves. A loaded
// machine can stall a frame long enough to fill the 0.25 s hold, and then a scrap is right; drag again (up to 3 times)
// until one drop lands early, and check every drop against its own hold.
await page.evaluate(() => {
  const sc = window.__omm.game.scene.getScene('game');
  sc.__holdAtDrop = -1;
  for (const k of ['doScrap', 'rejectDrop']) {
    const orig = sc[k];
    sc[k] = function (...a) { sc.__holdAtDrop = sc.scrapHold; return orig.apply(this, a); };
  }
});
const early = [];
for (let k = 0; k < 3 && !early.some((e) => e.hold < 0.25); k++) {
  await setBoard({ 27: 'c3' });
  await wait(200);
  await page.evaluate(() => { const sc = window.__omm.game.scene.getScene('game'); sc.hintGate = new sc.hintGate.constructor(); sc.__holdAtDrop = -1; });
  rj0 = await rejects();
  await fingerPath([await cellScreen(27), sf.scrap]);
  st = await state();
  rj = await rejects();
  const hold = await page.evaluate(() => window.__omm.game.scene.getScene('game').__holdAtDrop);
  const kept = st.cells[27] === 'c3' && st.live === 1 && clean(st) && rj.n === rj0.n + 1 && rj.hint === 'HOLD TO SCRAP';
  const scrapped = st.live === 0 && rj.n === rj0.n;
  early.push({ hold, ok: hold >= 0 && (hold < 0.25 ? kept : scrapped), st, rj0, rj });
}
await page.evaluate(() => { const sc = window.__omm.game.scene.getScene('game'); delete sc.doScrap; delete sc.rejectDrop; });
check('early SCRAP drop of a rank 3 part: kept, one reject, hold-to-scrap hint', early.every((e) => e.ok) && early.some((e) => e.hold < 0.25), early);

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

// 16b) snap cue: one cue per NEW mergeable cell, none for empty or mismatch cells, throttled; the drag still lands
await setBoard({ 6: 'b1', 8: 'b1', 9: 'n1' });
await wait(200);
const errsSnap = pageErrors.length;
const cues = () => page.evaluate(() => window.__omm.game.scene.getScene('game').snapCues);
const c0 = await cues();
await press(6, { x: 0, y: 0 });
await slide(7, { x: 0, y: 0 }, 6); // empty cell
const cEmpty = (await cues()) - c0;
await slide(8, { x: 0, y: 0 }, 6); // match
const cMatch = (await cues()) - c0;
for (const dx of [6, -6, 4]) await page.touchscreen.touchMove(finger.x + dx, finger.y); // wiggle on the same cell
await wait(50);
const cSame = (await cues()) - c0;
await slide(9, { x: 0, y: 0 }, 4); // mismatch
const cMis = (await cues()) - c0;
await wait(200);
await slide(8, { x: 0, y: 0 }, 2); // back onto the match after the gap: a new cue
const cBack = (await cues()) - c0;
// throttle: hop off and straight back onto the match. The gap is measured on the SCENE clock (the one the throttle
// uses), from the last cue to the moment the piece is back over 8: a return inside SNAP_CUE_GAP (120 ms) must stay
// silent, a slower one must cue. A loaded machine can stretch a 'fast' wall-clock hop past the gap, so hop again
// (up to 5 times) until at least one return lands inside it.
await page.evaluate(() => {
  const sc = window.__omm.game.scene.getScene('game');
  sc.__snapArrive = -1;
  sc.__snapProbe = () => {
    if (sc.hoverIdx === 8 && sc.__snapPrev !== 8) sc.__snapArrive = sc.time.now;
    sc.__snapPrev = sc.hoverIdx;
  };
  sc.__snapPrev = sc.hoverIdx;
  sc.input.on('pointermove', sc.__snapProbe); // added after the scene's own onMove, so hoverIdx is already updated
});
const hops = [];
for (let k = 0; k < 5 && !hops.some((h) => h.gap < 120); k++) {
  const before = await page.evaluate(() => { const sc = window.__omm.game.scene.getScene('game'); return { cues: sc.snapCues, snapAt: sc.snapAt }; });
  await slide(7, { x: 0, y: 0 }, 1);
  await slide(8, { x: 0, y: 0 }, 1);
  const after = await page.evaluate(() => { const sc = window.__omm.game.scene.getScene('game'); return { cues: sc.snapCues, arrive: sc.__snapArrive }; });
  hops.push({ gap: after.arrive - before.snapAt, cues: after.cues - before.cues });
}
await page.evaluate(() => { const sc = window.__omm.game.scene.getScene('game'); sc.input.off('pointermove', sc.__snapProbe); });
const hopsOk = hops.every((h) => h.cues === (h.gap >= 120 ? 1 : 0)) && hops.some((h) => h.gap < 120);
m0 = (await state()).merges;
await release();
st = await state();
check('snap cue: once per new match, none on empty/mismatch/same cell, throttled; the drag still merges', cEmpty === 0 && cMatch === 1 && cSame === 1 && cMis === 1 && cBack === 2 && hopsOk && st.cells[8] === 'b2' && st.merges === m0 + 1 && clean(st) && pageErrors.length === errsSnap, { cEmpty, cMatch, cSame, cMis, cBack, hops, st, errs: pageErrors.slice(errsSnap) });

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

// 20) home tab switches leak nothing (phone perf): scene input listeners and display-list objects stay flat over 20 switches
const homeLeak = await page.evaluate(async () => {
  const sc = window.__omm.game.scene.getScene('game');
  const pause = (ms) => new Promise((r) => setTimeout(r, ms));
  const snap = () => ({ listeners: sc.input.eventNames().reduce((n, e) => n + sc.input.listenerCount(e), 0), objects: sc.children.list.length });
  sc.coach.clear();
  sc.openTitle('road');
  await pause(400);
  const before = snap();
  const tabs = ['machine', 'road', 'events', 'road', 'workshop'];
  for (let k = 0; k < 20; k++) {
    const t = tabs[k % tabs.length];
    if (t === 'workshop') sc.openWorkshop();
    else sc.openTitle(t);
    await pause(60);
  }
  sc.openTitle('road');
  await pause(400);
  return { before, after: snap(), road: sc.homeTab === 'road' && sc.hasArt('node_normal') };
});
check('20 home tab switches leak no listeners or objects', homeLeak.road && homeLeak.after.listeners === homeLeak.before.listeners && homeLeak.after.objects === homeLeak.before.objects, homeLeak);

// --- reloads and HOME: the session flow (t-abfbda44) ---
const reload = async () => {
  await page.reload({ waitUntil: 'load', timeout: 90000 });
  await page.waitForFunction(() => window.__omm?.game?.scene?.getScene('game')?.s, { timeout: 30000 });
  await wait(800);
};
const flow = () =>
  page.evaluate(() => {
    const sc = window.__omm.game.scene.getScene('game');
    return { phase: sc.s.phase, level: sc.s.level, home: !!sc.homeC?.active, saved: localStorage.getItem('omm.save.v1') !== null, hard: !!sc.meta.hardUnlocked, showcase: !!sc.s.showcase, puzzle: sc.s.puzzle?.id, def: sc.puzzleDef?.id, rush: sc.s.rush?.slot };
  });
/** Every visible text in the open panel (result cards, pause menu). */
const modalTexts = () =>
  page.evaluate(() => {
    const sc = window.__omm.game.scene.getScene('game');
    const out = [];
    const walk = (o) => {
      if (!o || o.visible === false) return;
      if (o.type === 'Text') out.push(o.text);
      for (const ch of o.list ?? []) walk(ch);
    };
    walk(sc.modal);
    return out;
  });
/** Taps the panel button labelled `label` with a real touch; false when there is none. */
async function tapLabel(label) {
  const p = await page.evaluate((label) => {
    const sc = window.__omm.game.scene.getScene('game');
    const find = (o) => {
      if (!o || o.visible === false) return null;
      if (o.type === 'Text' && o.text === label) return o;
      for (const ch of o.list ?? []) {
        const f = find(ch);
        if (f) return f;
      }
      return null;
    };
    const t = find(sc.modal);
    if (!t) return null;
    const b = t.getBounds();
    const r = document.querySelector('canvas').getBoundingClientRect();
    return { x: r.left + b.centerX * (r.width / 720), y: r.top + b.centerY * (r.width / 720) };
  }, label);
  if (p) await page.touchscreen.tap(p.x, p.y);
  await wait(400);
  return !!p;
}
const drain = () =>
  page.evaluate(() => {
    const sc = window.__omm.game.scene.getScene('game');
    while (sc.explaining) sc.nextExplain();
  });

// 21) (a) a cold start with no saved run shows home; the run behind it is never saved, so the next launch is home again
await drain();
await page.evaluate(() => window.__omm.game.scene.getScene('game').quitHome());
await page.evaluate(() => localStorage.removeItem('omm.save.v1'));
await reload();
await wait(2600); // the 2 s autosave has had its chance
let fl = await flow();
await reload();
let fl2 = await flow();
check('cold start: home, the run behind it is never saved, reopening lands on home', fl.home && !fl.saved && fl2.home && !fl2.saved, { fl, fl2 });

// 22) (b) SKIP TUTORIAL starts Level 1 (not a classic run), and winning it does not unlock the hard events
await drain();
const hard0 = (await flow()).hard;
await page.evaluate(() => {
  const sc = window.__omm.game.scene.getScene('game');
  sc.meta.hardUnlocked = false;
  sc.startTutorial();
});
await wait(800);
await page.evaluate(() => window.__omm.game.scene.getScene('game').openPause());
await wait(300);
const skipped = await tapLabel('SKIP TUTORIAL');
await wait(600);
fl = await flow();
await drain();
await page.evaluate(() => setTimeout(() => window.__omm.game.scene.getScene('game').openResult(true)));
await wait(800);
fl2 = await flow();
check('SKIP TUTORIAL starts Level 1; winning it does not unlock the hard events', skipped && fl.phase === 'playing' && fl.level === 1 && !fl2.hard, { skipped, fl, fl2 });
await page.evaluate((h) => (window.__omm.game.scene.getScene('game').meta.hardUnlocked = h), hard0);

// 23) (c) HOME from a showcase or a replayed tutorial clears the run (nothing resumes on the next launch)
await page.evaluate(() => {
  const sc = window.__omm.game.scene.getScene('game');
  sc.closeModal();
  sc.startShowcase(7, 21);
});
await wait(800);
await page.evaluate(() => window.__omm.game.scene.getScene('game').openPause());
await wait(300);
let homed = await tapLabel('HOME');
await wait(2600);
fl = await flow();
await reload();
fl2 = await flow();
check('HOME from a showcase clears the run', homed && fl.home && !fl.saved && fl2.home && !fl2.showcase, { homed, fl, fl2 });
await drain();
await page.evaluate(() => window.__omm.game.scene.getScene('game').startTutorial());
await wait(800);
await page.evaluate(() => window.__omm.game.scene.getScene('game').openPause());
await wait(300);
homed = await tapLabel('HOME');
await wait(2600);
fl = await flow();
await reload();
fl2 = await flow();
check('HOME from a replayed tutorial clears the run', homed && fl.home && !fl.saved && fl2.home && fl2.phase !== 'tutorial', { homed, fl, fl2 });

// 24) (d) a puzzle reloaded mid-way finishes without a page error
let errs0 = pageErrors.length;
await drain();
await page.evaluate(() => {
  const sc = window.__omm.game.scene.getScene('game');
  sc.startPuzzle(sc.dailyPuzzle(), 'daily');
  sc.save();
});
await reload();
await drain();
fl = await flow();
await page.evaluate(() => setTimeout(() => window.__omm.game.scene.getScene('game').openResult(false)));
await wait(800);
let texts = await modalTexts();
check('puzzle reloaded mid-way finishes without a page error', fl.puzzle && fl.def === fl.puzzle && texts.includes('NOT QUITE') && pageErrors.length === errs0, { fl, texts, errs: pageErrors.slice(errs0) });

// 25) (d) Boss Rush reloaded between fights keeps the earlier fight times; a lost rush record never throws
errs0 = pageErrors.length;
await page.evaluate(() => {
  const sc = window.__omm.game.scene.getScene('game');
  sc.closeModal();
  sc.meta.levelStars = Object.fromEntries(Array.from({ length: 40 }, (_, i) => [String(i + 1), 1]));
  sc.startRush();
  sc.s.elapsed = 30;
  setTimeout(() => sc.openResult(true));
});
await wait(800);
const next1 = await tapLabel('NEXT FIGHT');
await page.evaluate(() => window.__omm.game.scene.getScene('game').save());
await reload();
await drain();
fl = await flow();
await page.evaluate(() => {
  const sc = window.__omm.game.scene.getScene('game');
  sc.s.elapsed = 20;
  setTimeout(() => sc.openResult(true));
});
await wait(800);
texts = await modalTexts();
check('Boss Rush reloaded between fights keeps the fight times', next1 && fl.rush === 1 && texts.includes('FIGHT 2 CLEARED!') && texts.some((t) => t.startsWith('2 of 3 fights  ·  50.0s')) && pageErrors.length === errs0, { next1, fl, texts, errs: pageErrors.slice(errs0) });
const next2 = await tapLabel('NEXT FIGHT');
await page.evaluate(() => {
  const sc = window.__omm.game.scene.getScene('game');
  sc.save();
  delete sc.meta.rush;
  localStorage.setItem('omm.meta.v1', JSON.stringify(sc.meta));
});
await reload();
await drain();
fl = await flow();
await page.evaluate(() => {
  const sc = window.__omm.game.scene.getScene('game');
  sc.s.elapsed = 25;
  setTimeout(() => sc.openResult(true));
});
await wait(800);
fl2 = await flow();
check('Boss Rush with no rush record after a reload ends without a page error', next2 && fl.rush === 2 && fl2.home && !fl2.saved && pageErrors.length === errs0, { next2, fl, fl2, errs: pageErrors.slice(errs0) });

// 26) (t-d88cc343) a finished run never comes back on reload: Rush, Bounty, Endless, Puzzle, and a level during the best-chain replay
errs0 = pageErrors.length;
for (const mode of ['rush', 'bounty', 'endless', 'puzzle', 'level']) {
  await drain();
  const started = await page.evaluate((mode) => {
    const sc = window.__omm.game.scene.getScene('game');
    sc.closeModal();
    sc.meta.levelStars = Object.fromEntries(Array.from({ length: 40 }, (_, i) => [String(i + 1), 1]));
    if (mode === 'rush') sc.startRush();
    else if (mode === 'bounty') sc.startBounty(0);
    else if (mode === 'endless') sc.startEndless();
    else if (mode === 'puzzle') sc.startPuzzle(sc.dailyPuzzle(), 'daily');
    else {
      sc.startLevel(3);
      sc.runLog.best = { at: 0, count: 5 }; // even a replay that ends early: the save is gone when the run ends
    }
    sc.save();
    const was = localStorage.getItem('omm.save.v1') !== null;
    sc.s.phase = 'lost';
    sc.openResult(false);
    return was;
  }, mode);
  const gone = await page.evaluate(() => localStorage.getItem('omm.save.v1') === null);
  await reload();
  fl = await flow();
  check(`finished ${mode} run is not resumed on reload`, started && gone && !fl.saved && fl.home && pageErrors.length === errs0, { mode, started, gone, fl, errs: pageErrors.slice(errs0) });
}

// 27) one bad meta value never bricks the game: the next launch repairs it
await drain();
await page.evaluate(() => {
  const m = JSON.parse(localStorage.getItem('omm.meta.v1'));
  m.units = { ...m.units, rocket: null, coil: { level: 'x' } };
  m.levelStars = { ...m.levelStars, 2: null };
  localStorage.setItem('omm.meta.v1', JSON.stringify(m));
  localStorage.setItem('omm.save.v1', JSON.stringify(window.__omm.game.scene.getScene('game').s)); // a run resumes: startState reads units
});
await reload();
let fixed = await page.evaluate(() => {
  const sc = window.__omm.game.scene.getScene('game');
  const stored = JSON.parse(localStorage.getItem('omm.meta.v1'));
  return { rocket: sc.meta.units.rocket ?? null, coil: sc.meta.units.coil, stored: stored.units.rocket ?? null, star2: stored.levelStars['2'] ?? null, phase: sc.s.phase };
});
check('bad nested meta loads repaired (no crash, repaired meta written back)', fixed.rocket === null && fixed.stored === null && fixed.star2 === null && fixed.coil?.level === 1 && pageErrors.length === errs0, { fixed, errs: pageErrors.slice(errs0) });

// 28) a saved level this build no longer has: home, the save dropped
await page.evaluate(() => {
  const sc = window.__omm.game.scene.getScene('game');
  sc.quitHome(); // home: the unload-time save() must not write the live run over the planted one
  const s = sc.s;
  localStorage.setItem('omm.save.v1', JSON.stringify({ ...s, phase: 'playing', level: 9999, rush: undefined, bounty: undefined, endless: undefined, puzzle: undefined }));
});
await reload();
fl = await flow();
check('a saved level that no longer exists opens home', fl.home && !fl.saved && pageErrors.length === errs0, { fl, errs: pageErrors.slice(errs0) });

// 29) a save mid upgrade-pick whose upgrade was removed: the pick shows real upgrades
await page.evaluate(() => {
  const sc = window.__omm.game.scene.getScene('game');
  sc.quitHome();
  const s = JSON.parse(JSON.stringify(sc.s));
  Object.assign(s, { phase: 'choice', offer: ['gone_perk'], perks: [], level: undefined, rush: undefined, bounty: undefined, endless: undefined, puzzle: undefined, target: 0 });
  localStorage.setItem('omm.save.v1', JSON.stringify(s));
});
await reload();
await wait(400);
texts = await modalTexts();
fl = await flow();
check('a removed upgrade in a saved pick re-rolls (board not frozen)', fl.phase === 'choice' && texts.includes('PICK AN UPGRADE') && pageErrors.length === errs0, { fl, texts, errs: pageErrors.slice(errs0) });
await page.evaluate(() => localStorage.removeItem('omm.save.v1'));

// 30) storage blocked: Settings and Copy Save Code don't throw
await page.evaluate(() => {
  const sc = window.__omm.game.scene.getScene('game');
  sc.closeModal();
  window.__lsDesc = Object.getOwnPropertyDescriptor(window, 'localStorage');
  Object.defineProperty(window, 'localStorage', { configurable: true, get() { throw new DOMException('The operation is insecure.', 'SecurityError'); } });
});
const blocked = await page.evaluate(() => {
  const sc = window.__omm.game.scene.getScene('game');
  const out = { settings: 'ok', copy: 'ok' };
  try { sc.openSettings(); } catch (e) { out.settings = String(e); }
  try { sc.copySaveCode(); } catch (e) { out.copy = String(e); }
  return out;
});
await wait(800);
await page.evaluate(() => {
  Object.defineProperty(window, 'localStorage', window.__lsDesc);
  window.__omm.game.scene.getScene('game').closeModal();
  [...document.querySelectorAll('button')].find((b) => b.textContent === 'DONE')?.click();
});
check('storage blocked: Settings and Copy Save Code do not throw', blocked.settings === 'ok' && blocked.copy === 'ok' && pageErrors.length === errs0, { blocked, errs: pageErrors.slice(errs0) });

// 31) prefers-reduced-motion: a merge (rank-up + chain) never scales, spins or tilts a part; every sprite ends on its cell at scale 1
await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
await reload();
await drain();
const rmOn = await page.evaluate(() => {
  const sc = window.__omm.game.scene.getScene('game');
  sc.closeModal();
  sc.coach.clear();
  sc.retry(false, -1);
  sc.finishIntro(true);
  while (sc.explaining) sc.nextExplain();
  sc.s.level = 10;
  return matchMedia('(prefers-reduced-motion: reduce)').matches;
});
await setBoard({ 6: 'b1', 8: 'b1', 3: 'c2', 9: 'n2', 13: 'n1', 7: 'c1' });
await wait(300);
await drain();
await page.evaluate(() => {
  const sc = window.__omm.game.scene.getScene('game');
  sc.s.stats.bestRank = 1; // the merge is a rank-up: ring + rank pulse
  const worst = (window.__rmWorst = { scale: 0, angle: 0, label: 0, burst: 0 });
  const end = performance.now() + 1500;
  const sample = () => {
    for (const v of sc.views.values()) {
      if (v === sc.dragView || !v.visible) continue;
      worst.scale = Math.max(worst.scale, Math.abs(v.scaleX - 1), Math.abs(v.scaleY - 1));
      worst.angle = Math.max(worst.angle, Math.abs(v.angle));
      const rv = v.getByName('rank');
      if (rv) worst.label = Math.max(worst.label, Math.abs(rv.scale - 1));
    }
    for (const o of sc.children.list) if (o.texture?.key === 'starburst') worst.burst = Math.max(worst.burst, Math.abs(o.angle));
    if (performance.now() < end) requestAnimationFrame(sample);
  };
  requestAnimationFrame(sample);
});
m0 = (await state()).merges;
await fingerPath([await cellScreen(6), await holdOver(8)]);
await wait(1200);
st = await state();
const rmWorst = await page.evaluate(() => window.__rmWorst);
check('reduced motion: merge lands, no scale/rotation during the merge, sprites end on their cells at scale 1', rmOn && st.cells[8] === 'b2' && st.merges === m0 + 1 && clean(st) && rmWorst.scale < 0.01 && rmWorst.angle < 0.5 && rmWorst.label < 0.01 && rmWorst.burst < 0.5, { rmOn, rmWorst, st });
await page.emulateMediaFeatures([]);

check('no page errors', !pageErrors.length, pageErrors);
await browser.close();
await server.close();
console.log(fails ? `${fails} FAILED` : 'ALL PASS');
process.exit(fails ? 1 : 0);
