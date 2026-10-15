// ROAD tab scroll profiler (headless Chrome, CDP). Measures frame times while a synthetic touch drag + fling scrolls the road.
// Usage: node tools/road-perf.mjs [--cfg build8|master|perf4off] [--level 60] [--cpu 4] [--secs 10] [--rs 2] [--runs 1] [--trace] [--out file.json]
// Needs `npm run build` first (serves dist/ with vite preview). Headless Chrome renders WebGL in software (SwiftShader): CPU/JS cost and call
// counts are meaningful, GPU fill-rate is NOT a phone's.
import puppeteer from 'puppeteer-core';
import { preview } from 'vite';
import { writeFileSync } from 'node:fs';

const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i < 0 ? d : (process.argv[i + 1] ?? true); };
const CFG = arg('cfg', 'master'), LEVEL = Number(arg('level', 60)), CPU = Number(arg('cpu', 4)), SECS = Number(arg('secs', 10));
const RS = arg('rs', null), RUNS = Number(arg('runs', 1)), TRACE = process.argv.includes('--trace'), OUT = arg('out', null);
const CHROME = process.env.CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
// localStorage QA keys per configuration (default ON flags are removed; 'off' turns them off)
const CFGS = {
  build8: { omm_qa_road_perf3: 'off', omm_qa_road_perf4: 'off' }, // roadV2 + perf1+2 ON, polish OFF, perf3 OFF
  master: { omm_qa_road_perf4: 'off' }, // current master before this task: perf3 ON
  perf4off: { omm_qa_road_perf4: 'off' },
  perf4: {}, // default (ROAD PERF 4 ON)
  allperfoff: { omm_qa_road_perf: 'off', omm_qa_road_perf2: 'off', omm_qa_road_perf3: 'off', omm_qa_road_perf4: 'off' },
};
const flags = { omm_qa_road_perf_hud: 'on', ...(CFGS[CFG] ?? {}) };

const server = await preview({ preview: { port: 4177, strictPort: false, host: '127.0.0.1' }, logLevel: 'error' });
const url = server.resolvedUrls.local[0] + (RS ? `?timer&rs=${RS}` : '?timer');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const pct = (a, p) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))] : 0; };

const K = 720 / 390; // design px per CSS px
const at = (road, t) => { // road scroll at time t (linear between frames)
  let lo = 0, hi = road.length - 1;
  if (t <= road[0].t) return road[0].y; if (t >= road[hi].t) return road[hi].y;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (road[m].t <= t) lo = m; else hi = m; }
  const a = road[lo], b = road[hi]; return a.y + ((b.y - a.y) * (t - a.t)) / (b.t - a.t);
};
/** Slow-motion metrics per gesture: speed ratio (road px/s over finger px/s in the middle 60 % of the drag), lag (px the road is behind the finger),
 *  and how far the road coasts after release. All in design px; `road` = scroll samples per frame, `fing` = touch events. */
function slowMo(fing, roadRaw) {
  const road = roadRaw.filter((r) => r.y !== null);
  const gestures = []; let cur = null;
  for (const f of fing) { if (f.ev === 'touchstart') cur = { ev: [f] }; else if (cur) { cur.ev.push(f); if (f.ev === 'touchend') { gestures.push(cur); cur = null; } } }
  const ratios = [], lags = [], c300 = [], c1000 = [], dragMs = [];
  for (const g of gestures) {
    const mv = g.ev.filter((e) => e.ev === 'touchmove'); if (mv.length < 6 || road.length < 3) continue;
    const y0 = mv[0].y, tot = (mv[mv.length - 1].y - y0) * K; // finger travel (design px)
    const tAt = (frac) => mv.find((e) => Math.abs((e.y - y0) * K) >= Math.abs(tot) * frac)?.t;
    const t20 = tAt(0.2), t80 = tAt(0.8); if (!t20 || !t80 || t80 <= t20) continue;
    const dRoad = at(road, t80) - at(road, t20), dFing = ((mv.find((e) => e.t === t80)?.y ?? 0) - (mv.find((e) => e.t === t20)?.y ?? 0)) * K;
    if (Math.abs(dFing) > 50) ratios.push(dRoad / dFing);
    for (const e of mv) lags.push(Math.abs((e.y - y0) * K - (at(road, e.t) - at(road, mv[0].t))));
    dragMs.push(mv[mv.length - 1].t - mv[0].t);
    const te = g.ev[g.ev.length - 1].t, r0 = at(road, te);
    c300.push(Math.abs(at(road, te + 300) - r0)); c1000.push(Math.abs(at(road, te + 1000) - r0));
  }
  const med = (a) => (a.length ? [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)] : null);
  const r2 = (v) => (v === null ? null : +v.toFixed(2));
  return { gestures: gestures.length, speedRatioMedian: r2(med(ratios)), speedRatioMin: r2(Math.min(...ratios)), speedRatioMax: r2(Math.max(...ratios)), lagPxP50: r2(med(lags)), lagPxMax: r2(Math.max(0, ...lags)), flingTravel300ms: r2(med(c300)), flingTravel1000ms: r2(med(c1000)), dragMsMedian: r2(med(dragMs)) };
}

async function once() {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--js-flags=--expose-gc'] });
  const page = await browser.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e)));
  const stars = {};
  for (let i = 1; i < LEVEL; i++) stars[String(i)] = 3;
  await page.evaluateOnNewDocument((flags, stars) => {
    try {
      if (!localStorage.getItem('omm.meta.v1.seeded')) {
        localStorage.setItem('omm.meta.v1', JSON.stringify({ levelStars: stars, tutorialDone: true }));
        localStorage.setItem('omm.meta.v1.seeded', '1');
      }
      for (const [k, v] of Object.entries(flags)) localStorage.setItem(k, v);
    } catch {}
    // draw-call counter + frame recorder
    window.__draws = 0;
    for (const C of [window.WebGLRenderingContext, window.WebGL2RenderingContext]) {
      if (!C) continue;
      for (const f of ['drawElements', 'drawArrays', 'drawElementsInstanced', 'drawArraysInstanced']) {
        const o = C.prototype[f];
        if (o) C.prototype[f] = function (...a) { window.__draws++; return o.apply(this, a); };
      }
    }
    window.__frames = [];
    window.__rec = false;
    let last = performance.now();
    // slow-motion recorder: finger events (page clock) and the road's scroll (the biggest container of the ROAD tab) once a frame
    window.__fing = []; window.__road = []; window.__marks = [];
    const roadY = () => { try { const sc = window.__omm.game.scene.getScene('game'); let best = null; for (const o of sc.homeC.list) if (o.list && (!best || o.list.length > best.list.length)) best = o; return best ? best.y : null; } catch { return null; } };
    for (const ev of ['touchstart', 'touchmove', 'touchend']) window.addEventListener(ev, (e) => { if (!window.__rec) return; const y = e.touches[0]?.clientY ?? e.changedTouches[0]?.clientY; window.__fing.push({ t: e.timeStamp, y, ev }); }, { capture: true, passive: true });
    const tick = (t) => { if (window.__rec) { window.__frames.push({ dt: t - last, draws: window.__draws }); window.__road.push({ t, y: roadY() }); } last = t; requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  }, flags, stars);
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  const cdp = await page.createCDPSession();
  const t0 = Date.now();
  await page.goto(url, { waitUntil: 'load', timeout: 120000 });
  await page.waitForFunction(() => window.__omm?.game?.scene?.getScene('game')?.s, { timeout: 60000 });
  await wait(3000);
  // --fakeart: the road-kit art is NOT in this repo yet, so stand in for it with same-sized canvases (8 chapter scenery pictures 1024x1536, 15 node frames 512x512)
  const fake = process.argv.includes('--fakeart');
  await page.evaluate((fake) => {
    const sc = window.__omm.game.scene.getScene('game');
    if (fake) {
      const mk = (key, w, h) => { const t = sc.textures.createCanvas(key, w, h); const c = t.getContext(); const g = c.createLinearGradient(0, 0, w, h); g.addColorStop(0, '#c8b090'); g.addColorStop(1, '#605040'); c.fillStyle = g; c.fillRect(0, 0, w, h); for (let i = 0; i < 400; i++) { c.fillStyle = `hsl(${(i * 37) % 360} 40% 50% / .5)`; c.fillRect(Math.random() * w, Math.random() * h, 40 + Math.random() * 80, 40 + Math.random() * 80); } t.refresh(); };
      for (let i = 1; i <= 8; i++) mk(`chapterScenery_${i}`, 1024, 1536);
      for (const k of ['normal', 'hard', 'mega', 'mini', 'boss']) for (const s of ['locked', 'open', 'done']) mk(`nodeFrame_${k}_${s}`, 512, 512);
    }
    sc.openTitle('road');
  }, fake);
  await wait(2500);
  if (arg('shot', null)) await page.screenshot({ path: arg('shot', null) });
  const info = await page.evaluate(() => {
    const g = window.__omm.game, sc = g.scene.getScene('game');
    let texBytes = 0, texCount = 0, big = [];
    const byPrefix = {};
    for (const k of g.textures.getTextureKeys()) {
      const t = g.textures.get(k);
      for (const s of t.source) {
        const b = s.width * s.height * 4; texBytes += b; texCount++;
        const p = k.split('_')[0]; byPrefix[p] = byPrefix[p] ?? [0, 0]; byPrefix[p][0]++; byPrefix[p][1] += b / 1048576;
        big.push([k, s.width, s.height, +(b / 1048576).toFixed(2)]);
      }
    }
    big.sort((a, b) => b[3] - a[3]);
    const prefixes = Object.entries(byPrefix).sort((a, b) => b[1][1] - a[1][1]).slice(0, 12).map(([p, v]) => [p, v[0], +v[1].toFixed(1)]);
    const canvas = document.querySelector('canvas');
    return { loadMs: 0, gl: g.renderer.type === 2 ? 'WEBGL' : 'CANVAS', canvas: [canvas.width, canvas.height], texCount, texMB: +(texBytes / 1048576).toFixed(1), biggest: big.slice(0, 12), prefixes, homeTab: sc.homeTab };
  });
  info.bootMs = Date.now() - t0;
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU });
  if (TRACE) await cdp.send('Tracing.start', { categories: 'devtools.timeline,disabled-by-default-devtools.timeline,v8,disabled-by-default-v8.cpu_profiler,blink.user_timing', transferMode: 'ReturnAsStream' }).catch(() => {});
  await cdp.send('Profiler.enable');
  if (TRACE) await cdp.send('Profiler.setSamplingInterval', { interval: 500 });
  if (TRACE) await cdp.send('Profiler.start');
  const m0 = await cdp.send('Performance.enable').then(() => cdp.send('Performance.getMetrics'));
  await page.evaluate(() => { window.__frames.length = 0; window.__rec = true; window.__longTasks = []; try { new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__longTasks.push(e.duration); }).observe({ entryTypes: ['longtask'] }); } catch {} });
  // gesture driver: alternating drags (up/down) of 520 px over ~250 ms, each released as a fling, 10 s total
  const tEnd = Date.now() + SECS * 1000;
  let dir = -1, n = 0;
  const x = 195;
  while (Date.now() < tEnd) {
    const y0 = dir < 0 ? 650 : 250, y1 = y0 + dir * 400;
    await page.touchscreen.touchStart(x, y0);
    const steps = 15;
    for (let i = 1; i <= steps; i++) { await page.touchscreen.touchMove(x, y0 + ((y1 - y0) * i) / steps); if (i < steps) await wait(4); }
    await page.touchscreen.touchEnd();
    await wait(900); // the fling coasts
    n++;
    if (n % 3 === 0) dir = -dir;
  }
  const res = await page.evaluate(() => {
    window.__rec = false;
    const sc = window.__omm.game.scene.getScene('game');
    const hud = [];
    const walk = (l) => { for (const o of l) { if (o.type === 'Text' && /ROAD PERF/.test(o.text)) hud.push(o.text); if (o.list) walk(o.list); } };
    if (sc.homeC) walk(sc.homeC.list);
    // visible Graphics still on screen (each is re-triangulated every frame): count and command-buffer words
    const gfx = [];
    const walkG = (l, vis) => { for (const o of l) { const v = vis && o.visible !== false; if (v && o.type === 'Graphics' && o.commandBuffer.length) gfx.push([o.commandBuffer.length, Math.round(o.y), o.parentContainer ? o.parentContainer.list.length : -1]); if (o.list) walkG(o.list, v); } };
    walkG(sc.children.list, true);
    gfx.sort((a, b) => b[0] - a[0]);
    return { gfxLive: { n: gfx.length, words: gfx.reduce((a, g) => a + g[0], 0), top: gfx.slice(0, 8) }, frames: window.__frames, fing: window.__fing, road: window.__road, long: window.__longTasks, hud: hud[0] ?? null, gcMem: performance.memory ? performance.memory.usedJSHeapSize : null };
  });
  const m1 = await cdp.send('Performance.getMetrics');
  const metric = (m, k) => m.metrics.find((x) => x.name === k)?.value ?? 0;
  let profile = null;
  if (TRACE) {
    profile = (await cdp.send('Profiler.stop')).profile;
    await cdp.send('Tracing.end').catch(() => {});
  }
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  const dts = res.frames.map((f) => f.dt).slice(1);
  const draws = res.frames.map((f, i) => (i ? f.draws - res.frames[i - 1].draws : 0)).slice(1);
  const slow = slowMo(res.fing, res.road);
  const out = {
    slow, raw: process.argv.includes('--raw') ? { fing: res.fing.slice(0, 60), road: res.road.slice(0, 160) } : undefined,
    cfg: CFG, level: LEVEL, cpu: CPU, rs: RS, secs: SECS, frames: dts.length, fps: +(dts.length / SECS).toFixed(1),
    p50: +pct(dts, 50).toFixed(1), p95: +pct(dts, 95).toFixed(1), p99: +pct(dts, 99).toFixed(1), max: +Math.max(...dts).toFixed(1),
    over33: dts.filter((d) => d > 33.4).length, over100: dts.filter((d) => d > 100).length,
    longTasks: res.long.length, longTaskMs: +res.long.reduce((a, b) => a + b, 0).toFixed(0), maxLong: +Math.max(0, ...res.long).toFixed(0),
    drawsPerFrameP50: pct(draws, 50), drawsPerFrameMax: Math.max(...draws),
    scriptMs: +((metric(m1, 'ScriptDuration') - metric(m0, 'ScriptDuration')) * 1000).toFixed(0),
    layoutMs: +((metric(m1, 'LayoutDuration') - metric(m0, 'LayoutDuration')) * 1000).toFixed(0),
    taskMs: +((metric(m1, 'TaskDuration') - metric(m0, 'TaskDuration')) * 1000).toFixed(0),
    jsHeapMB: +(metric(m1, 'JSHeapUsedSize') / 1048576).toFixed(1),
    hud: res.hud, gfxLive: res.gfxLive, info, pageErrors: errs.slice(0, 3),
  };
  if (profile) {
    // top self-time functions
    const byId = new Map(profile.nodes.map((nd) => [nd.id, nd]));
    const self = new Map();
    const dt = profile.timeDeltas;
    profile.samples.forEach((id, i) => { const nd = byId.get(id); const cf = nd.callFrame; const key = `${cf.functionName || '(anon)'} ${cf.url.split('/').pop()}:${cf.lineNumber}`; self.set(key, (self.get(key) ?? 0) + (dt[i] ?? 0)); });
    out.top = [...self.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15).map(([k, v]) => [k, +(v / 1000).toFixed(0)]);
  }
  await browser.close();
  return out;
}

const results = [];
for (let r = 0; r < RUNS; r++) { results.push(await once()); console.log(JSON.stringify(results[r], null, 1)); }
if (OUT) writeFileSync(OUT, JSON.stringify(results, null, 1));
await server.close();
