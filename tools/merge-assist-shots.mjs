// MERGE ASSIST screenshots (t-8426336a): 390x844 phone, assist ON. Writes art-candidates/merge-assist/*.png
// Usage: node tools/merge-assist-shots.mjs
import puppeteer from 'puppeteer-core';
import { createServer } from 'vite';
import { mkdirSync } from 'node:fs';

const OUT = 'art-candidates/merge-assist';
mkdirSync(OUT, { recursive: true });
const CHROME = process.env.CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const server = await createServer({ server: { port: 5195, strictPort: false, host: '127.0.0.1' }, logLevel: 'error' });
await server.listen();
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
const page = await browser.newPage();
page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
await page.evaluateOnNewDocument(() => localStorage.setItem('omm_merge_assist', 'on'));
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await page.goto(`${server.resolvedUrls.local[0]}?timer`, { waitUntil: 'networkidle0', timeout: 90000 });
await page.waitForFunction(() => window.__omm?.game?.scene?.getScene('game')?.s, { timeout: 30000 });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const sc = (fn, ...a) => page.evaluate((src, ...args) => new Function('sc', 'args', `return (${src})(sc, ...args)`)(window.__omm.game.scene.getScene('game'), args), fn.toString(), ...a);

await sc((s) => {
  clearInterval(window.__bot);
  s.closeModal();
  s.coach.clear();
  s.meta.tips = { delivery: true, overdrive: true, full: true, clock: true, next: true, x_chain: true, x_boss: true, tap_hint: true, x_kick_fuse: true, x_kick_plain: true };
  s.startLevel(1);
  s.finishIntro(true);
});
await wait(600);
const unpause = () => sc((s) => { s.explainQueue = []; s.nextExplain(); s.coach.clear(); s.paused = false; });
await unpause();
await wait(200);

const cellPt = (i, dx = 0, dy = 0) => sc((s, i, dx, dy) => { const r = document.querySelector('canvas').getBoundingClientRect(), k = r.width / 720, c = s.cellCenter(i); return { x: r.left + (c.x + dx) * k, y: r.top + (c.y + dy) * k }; }, i, dx, dy);
/** a finger dot where the touch is (the screenshot cannot show a real finger) */
const dot = (x, y) => page.evaluate((x, y) => { let d = document.getElementById('fdot'); if (!d) { d = document.createElement('div'); d.id = 'fdot'; d.style.cssText = 'position:fixed;width:34px;height:34px;border-radius:50%;background:rgba(255,255,255,.35);border:3px solid rgba(255,255,255,.8);pointer-events:none;z-index:9;transform:translate(-50%,-50%)'; document.body.appendChild(d); } d.style.left = x + 'px'; d.style.top = y + 'px'; d.style.display = 'block'; }, x, y);
const nodot = () => page.evaluate(() => { const d = document.getElementById('fdot'); if (d) d.style.display = 'none'; });
const shot = async (name) => { await page.screenshot({ path: `${OUT}/${name}.png` }); console.log('wrote', name); };
const pairs = () => sc((s) => { const g = s.s.grid, out = []; for (let i = 0; i < g.length; i++) for (let j = i + 1; j < g.length; j++) if (g[i] && g[j] && g[i].family === g[j].family && g[i].rank === g[j].rank) out.push([i, j]); return out; });

// pick a pair that sits side by side-ish: first pair
const [from, to] = (await pairs())[0];
const a = await cellPt(from);

// 1) highlight: part lifted, every valid target pulses, the rest are dimmed; the part floats up-left of the finger
await page.touchscreen.touchStart(a.x, a.y);
const mid = await cellPt(to, 40 * 0.54 + 0, 0);
let fx = a.x, fy = a.y;
const target1 = { x: mid.x + 33, y: mid.y + 85 * 0.5417 + 70 };
for (let i = 1; i <= 10; i++) { fx = a.x + ((target1.x - a.x) * i) / 10; fy = a.y + ((target1.y - a.y) * i) / 10; await page.touchscreen.touchMove(fx, fy); await wait(20); }
await wait(250);
await dot(fx, fy);
await shot('1-highlight-and-offset');

// 2) snap line: the part is OUTSIDE the target cell (off by ~half a cell) and the thin line points at the snap target
const t2 = await cellPt(to, 0, 0);
fx = t2.x + 33 + 30; fy = t2.y + 46 + 62;
await page.touchscreen.touchMove(fx, fy); await wait(250);
await dot(fx, fy);
await shot('2-snap-line-near-miss');

// 3) snapped: the part is in range, the target ring is thick, the merge preview shows
fx = t2.x + 33 + 14; fy = t2.y + 46 + 20;
await page.touchscreen.touchMove(fx, fy); await wait(250);
await dot(fx, fy);
await shot('3-snapped-ready-to-drop');
await page.touchscreen.touchEnd();
await nodot();
await wait(900);

// 4) tap hint: a board with exactly one legal pair; MERGE pulses on it after a short idle
await sc((s) => {
  const st = s.s;
  const t = st.grid.find(Boolean);
  st.grid = st.grid.map(() => null);
  [[6, 1], [16, 1], [2, 2], [8, 3], [13, 4], [21, 5], [26, 6]].forEach(([i, r], k) => (st.grid[i] = { ...t, id: 9100 + k, family: 'cannon', rank: r }));
  st.pending = [];
  s.reconcile();
  s.idleTime = 2;
});
await wait(700);
await shot('4-tap-hint-merge-pair');

// 5) failed drop: drop on a non-matching part / empty air springs back with the toast (levels 1-5)
const p6 = await cellPt(13);
const q = { x: p6.x, y: 190 };
await page.touchscreen.touchStart(p6.x, p6.y);
for (let i = 1; i <= 8; i++) { await page.touchscreen.touchMove(p6.x + ((q.x - p6.x) * i) / 8, p6.y + ((q.y - p6.y) * i) / 8); await wait(20); }
await wait(120);
await page.touchscreen.touchEnd();
await wait(230);
await shot('5-failed-drop-toast');

// 6) auto-merge never happens without a tap: the tap hint, then the tap merges the pair
await sc((s) => { s.idleTime = 2; });
await wait(500);
const t6 = await cellPt(6);
await page.touchscreen.tap(t6.x, t6.y);
await wait(260);
await shot('6-tap-merged');
await browser.close();
await server.close();
