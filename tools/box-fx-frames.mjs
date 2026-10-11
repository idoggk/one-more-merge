// Frame strips of a Screw Yard box completing, for BOTH yards (t-9170d73d).
// Starts a temporary Vite server + headless Chrome at 390x844, plays a yard until the next tap completes a box, then
// screenshots the box area in a tight loop (timestamped; a real capture is ~40-70 ms a frame) and writes frames + a strip.
// Usage: node tools/box-fx-frames.mjs [outDir] [old|object ...]   (default art-candidates/box-fx, both yards)
import puppeteer from 'puppeteer-core';
import { createServer } from 'vite';
import sharp from 'sharp';
import { mkdirSync, writeFileSync } from 'node:fs';

const out = process.argv[2] ?? 'art-candidates/box-fx';
const which = process.argv.slice(3).length ? process.argv.slice(3) : ['old', 'object'];
mkdirSync(out, { recursive: true });
const CHROME = process.env.CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const server = await createServer({ server: { port: 5198, strictPort: false, host: '127.0.0.1' }, logLevel: 'error' });
await server.listen();
const URL = `${server.resolvedUrls.local[0]}?timer`;
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
// the box strip: header to just under the box counter
const CLIP = { x: 0, y: 50, width: 390, height: 180 };

for (const kind of which) {
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
  await page.goto(URL, { waitUntil: 'networkidle0', timeout: 120000 });
  await page.waitForFunction(() => window.__omm?.game?.scene?.getScene('game')?.s, { timeout: 30000 });
  await page.evaluate((k) => {
    clearInterval(window.__bot);
    localStorage.setItem('omm_qa_screw_yard', k === 'object' ? 'object' : 'old');
    const sc = window.__omm.game.scene.getScene('game');
    sc.meta.tips = new Proxy({}, { get: () => true, set: () => true });
    if (k === 'object') sc.startObjectYard();
    else sc.startYard(1);
  }, kind);
  const sceneKey = kind === 'object' ? 'objectYard' : 'yard';
  await page.waitForFunction((key) => window.__omm.game.scene.getScene(key)?.sys?.isActive() && window.__omm.game.scene.getScene(key).st, { timeout: 30000 }, sceneKey);
  await wait(1500);
  // one step: returns 'done' | 'completing' | 'moved'. dryRun reports whether the pick would complete a box.
  const step = (dry) => page.evaluate(async (k, key, dryRun) => {
    const sc = window.__omm.game.scene.getScene(key);
    const st = sc.st;
    if (st.won || st.lost) return 'done';
    if (k === 'object') {
      const m = await import('/src/core/screwObject.ts');
      const fit = (c) => st.boxes.findIndex((b) => b && b.color === c && b.n < 3);
      const rowFit = st.tray.findIndex((c) => fit(c) >= 0);
      let sid = m.greedyPick(st);
      const completing = (c) => st.boxes[fit(c)]?.n === 2;
      if (rowFit >= 0 && !(sid !== null && fit(st.lvl.screws[sid].color) >= 0)) {
        if (dryRun) return completing(st.tray[rowFit]) ? 'completing' : 'moved';
        sc.onRow(rowFit);
        return 'moved';
      }
      if (sid === null) return 'done';
      const c = st.lvl.screws[sid].color;
      if (dryRun) return fit(c) >= 0 && completing(c) ? 'completing' : 'moved';
      const v = m.viewFor(st, sid);
      sc.view = v; sc.turn = v; sc.drawObject();
      const p = sc.screwAt(sid);
      sc.onTap(p.x, p.y);
      return 'moved';
    }
    const m = await import('/src/core/screw.ts');
    const fit = (c) => m.fitSlot(st, c);
    const ti = st.tray.findIndex((c) => fit(c) >= 0);
    const free = st.lvl.screws.filter((s) => m.removable(st, s.id));
    const pick = free.find((s) => fit(s.color) >= 0) ?? (ti < 0 ? free[0] : undefined);
    if (pick) {
      if (dryRun) return st.boxes[fit(pick.color)]?.n === 2 ? 'completing' : 'moved';
      const p = sc.screwAt(pick.id);
      sc.onTap(p.x, p.y);
      return 'moved';
    }
    if (ti >= 0) {
      if (dryRun) return st.boxes[fit(st.tray[ti])]?.n === 2 ? 'completing' : 'moved';
      sc.onDock(ti);
      return 'moved';
    }
    return 'done';
  }, kind, sceneKey, dry);
  let guard = 0;
  while ((await step(true)) !== 'completing') {
    if ((await step(false)) === 'done' || ++guard > 80) throw new Error(`${kind}: no completing move found`);
    await wait(900);
  }
  // record: screenshots as fast as Chrome gives them, from just before the tap to 1.6 s after
  // deterministic: stop the real-time loop and advance it by hand, 2 x 20 ms per captured frame = exactly 40 ms a frame
  await page.evaluate(() => {
    const loop = window.__omm.game.loop;
    loop.sleep();
    loop.smoothStep = false;
    window.__simT = performance.now();
    window.__fakeNow = Date.now();
    Date.now = () => window.__fakeNow;
    loop.lastTime = window.__simT;
    window.__adv = (ms) => {
      for (let d = 0; d < ms; d += 20) { window.__fakeNow += 20; window.__omm.game.loop.step((window.__simT += 20)); }
    };
    window.__adv(40);
  });
  const frames = [];
  const grab = async (t) => frames.push({ t, buf: await page.screenshot({ type: 'png', clip: CLIP }) });
  await grab(-40);
  await step(false); // the tap that completes the box
  for (let t = 0; t <= 1400; t += 40) {
    await grab(t);
    await page.evaluate(() => window.__adv(40));
  }
  const tapAt = 0;
  console.log(kind, 'frames', frames.length);
  const dir = `${out}/${kind}`;
  if (process.env.FRAMES) mkdirSync(dir, { recursive: true });
  const pick = frames.filter((f, i) => i === 0 || f.t - frames[0].t >= 0);
  // every frame only with FRAMES=1 (37 PNGs a yard); the committed set is the strip + 4 key frames (KEYS, ms after the tap)
  const keys = (process.env.KEYS ?? "560,720,800,920").split(",").map(Number);
  if (process.env.FRAMES) pick.forEach((f, i) => writeFileSync(`${dir}/f${String(i).padStart(2, "0")}_${String(f.t).padStart(4, "0")}ms.png`, f.buf));
  keys.forEach((k, i) => { const f = pick.find((q) => q.t === k); if (f) writeFileSync(`${out}/key${i + 1}_${kind}_${k}ms.png`, f.buf); });
  // contact sheet: 8 columns, the frames after the tap, each labelled by its time since the tap
  const cols = 6, w = 260, h = 120;
  const sel = pick.filter((f) => f.t >= tapAt - 40).slice(0, 40);
  const comps = [];
  for (let i = 0; i < sel.length; i++) {
    comps.push({ input: await sharp(sel[i].buf).resize(w, h).toBuffer(), left: (i % cols) * w, top: Math.floor(i / cols) * (h + 16) + 16 });
    comps.push({ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="16"><text x="4" y="12" font-size="12" font-family="Arial" fill="#fff">${sel[i].t - tapAt} ms</text></svg>`), left: (i % cols) * w, top: Math.floor(i / cols) * (h + 16) });
  }
  const rows = Math.ceil(sel.length / cols);
  await sharp({ create: { width: cols * w, height: rows * (h + 16), channels: 3, background: '#222' } }).composite(comps).png().toFile(`${out}/strip_${kind}.png`);
  await page.close();
}
await browser.close();
await server.close();
