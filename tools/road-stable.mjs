// ROAD STABLE jitter probe (headless Chrome, CDP). Records the ROAD tab's scroll and every moving layer's drawn offset once per frame during a
// slow drag and a fling, then prints jitter metrics. Usage:
//   npm run build && node tools/road-stable.mjs --cfg stable|off [--level 60] [--cpu 1] [--runs 3] [--out file.json]
// cfg off = QA key omm_qa_road_stable=off (the pre-fix behaviour). Layer offsets are the absolute (world matrix) y in canvas device pixels
// (design px x render scale; the canvas is 1170 px wide on a 390 css px / DPR 3 phone, so 1 canvas px = 1 device px).
import puppeteer from 'puppeteer-core';
import { preview } from 'vite';
import { writeFileSync } from 'node:fs';

const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i < 0 ? d : (process.argv[i + 1] ?? true); };
const CFG = arg('cfg', 'stable'), LEVEL = Number(arg('level', 60)), CPU = Number(arg('cpu', 1)), RUNS = Number(arg('runs', 1)), OUT = arg('out', null);
const CHROME = process.env.CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const flags = CFG === 'off' ? { omm_qa_road_stable: 'off' } : {};
const server = await preview({ preview: { port: 4178, strictPort: false, host: '127.0.0.1' }, logLevel: 'error' });
const url = server.resolvedUrls.local[0] + '?timer';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
const std = (a) => { const m = mean(a); return Math.sqrt(mean(a.map((v) => (v - m) ** 2))); };
const r3 = (v) => +v.toFixed(3);

/** metrics for one layer over a frame window: `ys` = device-pixel offsets per frame, `road` = the road's own device offsets (same frames) */
function layerMetrics(ys, road) {
  const d = ys.slice(1).map((v, i) => v - ys[i]);
  const rd = road.slice(1).map((v, i) => v - road[i]);
  const moving = d.map((v, i) => i).filter((i) => Math.abs(rd[i]) > 1e-6 || Math.abs(d[i]) > 1e-6);
  const dm = moving.map((i) => d[i]), rm = moving.map((i) => rd[i]);
  // k = layer speed / road speed (1 for the road itself, 0.8 for parallax, ~0 for static layers): least squares through the origin
  const k = rm.reduce((a, v) => a + v * v, 0) > 0 ? dm.reduce((a, v, i) => a + v * rm[i], 0) / rm.reduce((a, v) => a + v * v, 0) : 0;
  const resid = dm.map((v, i) => v - k * rm[i]); // movement the road does not explain: rounding steps of this layer
  let rev = 0, prev = 0;
  for (const v of dm) { const s = Math.sign(Math.abs(v) < 1e-6 ? 0 : v); if (s && prev && s !== prev) rev++; if (s) prev = s; }
  const frac = ys.map((v) => Math.abs(v - Math.round(v)));
  return { k: r3(k), residRms: r3(Math.sqrt(mean(resid.map((v) => v * v)))), residMax: r3(Math.max(0, ...resid.map(Math.abs))), reversals: rev, fracShare: r3(frac.filter((f) => f > 0.01).length / Math.max(1, frac.length)), deltaCv: r3(Math.abs(mean(dm)) > 1e-6 ? std(dm) / Math.abs(mean(dm)) : 0) };
}

async function once() {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage();
  const stars = {};
  for (let i = 1; i < LEVEL; i++) stars[String(i)] = 3;
  await page.evaluateOnNewDocument((flags, stars) => {
    try {
      if (!localStorage.getItem('omm.meta.v1.seeded')) {
        localStorage.setItem('omm.meta.v1', JSON.stringify({ levelStars: stars, tutorialDone: true, lessons: { road: true } }));
        localStorage.setItem('omm.meta.v1.seeded', '1');
      }
      for (const [k, v] of Object.entries(flags)) localStorage.setItem(k, v);
    } catch {}
    window.__rec = false; window.__cand = null; window.__fr = []; window.__mark = [];
    const pick = () => { // moving candidates: containers / images up to 3 levels under the ROAD tab container
      const sc = window.__omm.game.scene.getScene('game'), out = [];
      const walk = (l, depth, path) => l.forEach((o, i) => { if (depth > 0 && (o.type === 'Container' || o.type === 'Image') && o.getWorldTransformMatrix) out.push({ o, id: `${path}/${i}:${o.type}${o.texture ? ':' + o.texture.key : ''}` }); if (o.list && depth < 3) walk(o.list, depth + 1, `${path}/${i}`); });
      walk(sc.homeC.list, 1, 'h');
      return out;
    };
    const tmp = { tx: 0, ty: 0 };
    const tick = (t) => {
      if (window.__rec) {
        try {
          if (!window.__cand) window.__cand = pick();
          const rs = window.__omm.game.canvas.width / 720;
          const row = window.__cand.map((c) => { const m = c.o.getWorldTransformMatrix(); return m.ty * rs; });
          window.__fr.push({ t, ys: row, ph: window.__phase ?? '' });
        } catch {}
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, flags, stars);
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  const cdp = await page.createCDPSession();
  await page.goto(url, { waitUntil: 'load', timeout: 120000 });
  await page.waitForFunction(() => window.__omm?.game?.scene?.getScene('game')?.s, { timeout: 60000 });
  await wait(3000);
  await page.evaluate(() => window.__omm.game.scene.getScene('game').openTitle('road'));
  await wait(2500);
  if (CPU > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU });
  await page.evaluate(() => { window.__rec = true; });
  const x = 195;
  const touch = (type, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] });
  await wait(300);
  // slow drag: 0.7 css px every 8 ms (about 88 css px/s, 125 events/s like a 120 Hz screen), 2.5 s up, held to the end then released slowly
  await page.evaluate(() => { window.__phase = 'slow'; });
  let y = 700;
  await touch('touchStart', y);
  for (let i = 0; i < 300; i++) { y -= 0.7; await touch('touchMove', y); await wait(8); }
  await touch('touchEnd');
  await wait(1200);
  // fling: 400 css px in 120 ms, released, coasts 1.5 s
  await page.evaluate(() => { window.__phase = 'fling'; });
  y = 250;
  await touch('touchStart', y);
  for (let i = 0; i < 15; i++) { y += 27; await touch('touchMove', y); await wait(8); }
  await touch('touchEnd');
  await wait(1800);
  const data = await page.evaluate(() => { window.__rec = false; return { fr: window.__fr, ids: window.__cand?.map((c) => c.id) ?? [], rs: window.__omm.game.canvas.width / 720 }; });
  await browser.close();
  // road layer = the candidate with the largest total travel whose k ~ 1: pick by max travel
  const n = data.ids.length;
  const col = (j, ph) => data.fr.filter((f) => f.ph === ph).map((f) => f.ys[j]);
  const res = { cfg: CFG, level: LEVEL, cpu: CPU, rs: data.rs, frames: data.fr.length, phases: {} };
  for (const ph of ['slow', 'fling']) {
    const cols = [...Array(n).keys()].map((j) => col(j, ph));
    const travel = cols.map((c) => (c.length ? Math.max(...c) - Math.min(...c) : 0));
    const jumpy = cols.map((c) => c.some((v, i) => i && Math.abs(v - c[i - 1]) > 150)); // wrapping clouds are not the road
    const skyI = data.ids.findIndex((id) => id.includes(":Image:road_sky_")); // the sky image is pinned to the scroll value: the reference
    const ri = skyI >= 0 ? skyI : travel.indexOf(Math.max(...travel.map((v, j) => (jumpy[j] ? -1 : v))));
    const layers = [];
    const seen = new Set();
    for (let j = 0; j < n; j++) if (travel[j] > 2 && !seen.has(cols[j].map((v) => v.toFixed(2)).join(",")) && seen.add(cols[j].map((v) => v.toFixed(2)).join(","))) layers.push({ id: data.ids[j], travelPx: r3(travel[j]), ...layerMetrics(cols[j], cols[ri]) });
    const moving = layers.filter((l) => l.k > 0.05 && /^h\/\d+:|^h\/2\/\d+:Container$/.test(l.id)); // sky, clouds, far layers (tween bobs and recycled chunks are not scroll layers)
    const dts = data.fr.filter((f) => f.ph === ph).map((f) => f.t).slice(1).map((t, i, a) => 0);
    res.phases[ph] = {
      roadId: data.ids[ri], layersMoving: moving.length,
      worstResidRms: moving.length ? Math.max(...moving.map((l) => l.residRms)) : 0,
      meanResidRms: r3(mean(moving.map((l) => l.residRms))),
      totalReversals: moving.reduce((a, l) => a + l.reversals, 0),
      roadFracShare: layers.find((l) => l.id === data.ids[ri])?.fracShare ?? null,
      meanFracShare: r3(mean(moving.map((l) => l.fracShare))),
      kSpread: [...new Set(moving.map((l) => l.k.toFixed(2)))].length,
      layers: layers.sort((a, b) => b.residRms - a.residRms).slice(0, 8),
    };
    void dts;
  }
  const ft = data.fr.map((f) => f.t).slice(1).map((t, i) => t - data.fr[i].t);
  const s = [...ft].sort((a, b) => a - b);
  res.frameMs = { n: s.length, p50: r3(s[Math.floor(s.length * 0.5)]), p95: r3(s[Math.floor(s.length * 0.95)]), fps: r3(1000 / mean(ft)) };
  return res;
}

const results = [];
for (let r = 0; r < RUNS; r++) { results.push(await once()); const o = results[r]; console.log(JSON.stringify({ ...o, phases: Object.fromEntries(Object.entries(o.phases).map(([k, v]) => [k, { ...v, layers: undefined }])) })); }
if (OUT) writeFileSync(OUT, JSON.stringify(results, null, 1));
await server.close();
