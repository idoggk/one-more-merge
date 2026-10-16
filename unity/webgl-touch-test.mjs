// Proves the HOP button works from a real touch in mobile-emulated Chrome (no extra npm packages).
//   node unity/webgl-touch-test.mjs [buildDir=unity/Builds/WebGL] [shotDir=unity/Builds/touch-test]
// Serves the build locally, starts headless Chrome with a CDP port, emulates an iPhone-size touch screen,
// dispatches a touchStart/touchEnd pair (Input.dispatchTouchEvent) on the HOP button and checks that the
// scene background colour changed (CannonHopTest.Hop cycles it). Exits 1 on failure.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const root = path.resolve(process.argv[2] ?? 'unity/Builds/WebGL');
const shots = path.resolve(process.argv[3] ?? 'unity/Builds/touch-test');
const chromePath = process.env.CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const W = 390, H = 844; // iPhone 12-14 portrait CSS pixels
fs.mkdirSync(shots, { recursive: true });

const types = { '.html': 'text/html', '.js': 'text/javascript', '.wasm': 'application/wasm', '.json': 'application/json' };
const server = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);
  const file = path.join(root, url === '/' ? 'index.html' : url);
  if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) return res.writeHead(404).end();
  res.writeHead(200, { 'Content-Type': types[path.extname(file)] ?? 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
}).listen(8099);

const chrome = spawn(chromePath, [
  '--headless=new', '--remote-debugging-port=9333', '--enable-unsafe-swiftshader', '--use-angle=swiftshader',
  '--ignore-gpu-blocklist', `--user-data-dir=${path.join(shots, 'profile')}`, 'about:blank',
], { stdio: 'ignore' });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let failed = true;
try {
  let target;
  for (let i = 0; i < 50 && !target; i++) {
    try { target = (await (await fetch('http://127.0.0.1:9333/json')).json()).find((t) => t.type === 'page'); } catch { /* not up yet */ }
    if (!target) await sleep(200);
  }
  if (!target) throw new Error('Chrome DevTools port did not open');
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r) => (ws.onopen = r));
  let id = 0; const pending = new Map();
  ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); } };
  const cdp = (method, params = {}) => new Promise((r) => { pending.set(++id, r); ws.send(JSON.stringify({ id, method, params })); });
  const evalJs = async (expr) => (await cdp('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true })).result.result.value;

  await cdp('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 2, mobile: true });
  await cdp('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await cdp('Emulation.setUserAgentOverride', { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' });
  await cdp('Page.enable');
  await cdp('Page.navigate', { url: 'http://127.0.0.1:8099/' });

  for (let i = 0; i < 240; i++) { // wait for the loading overlay to hide (software GL is slow)
    if (await evalJs("getComputedStyle(document.getElementById('loading')).display === 'none'")) break;
    await sleep(500);
  }
  await sleep(2000);

  // Reads one pixel of a screenshot back through a canvas. (x, y) in CSS pixels.
  const shot = async (name) => {
    const png = (await cdp('Page.captureScreenshot', { format: 'png' })).result.data;
    fs.writeFileSync(path.join(shots, name), Buffer.from(png, 'base64'));
    return png;
  };
  const pixel = (png, x, y) => evalJs(`(async()=>{const i=new Image();i.src='data:image/png;base64,${png}';await i.decode();
    const c=document.createElement('canvas');c.width=i.width;c.height=i.height;const g=c.getContext('2d');g.drawImage(i,0,0);
    return Array.from(g.getImageData(${x}*2,${y}*2,1,1).data).slice(0,3);})()`);

  const probe = [8, 300]; // background only (plates sit at x=+-160 units, centre)
  const before = await pixel(await shot('before.png'), ...probe);

  // HOP button: canvas scaler 1080x1920 match 0.5, button centre 230 units above bottom, centre x.
  const scale = Math.sqrt((W / 1080) * (H / 1920));
  const bx = W / 2, by = H - 230 * scale;
  await cdp('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: bx, y: by, id: 1 }] });
  await sleep(60);
  await cdp('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await sleep(1500);
  const after = await pixel(await shot('after.png'), ...probe);

  console.log(`touch at (${bx.toFixed(0)}, ${by.toFixed(0)}) background before=${before} after=${after}`);
  failed = before.join() === after.join() || before.join() === '0,0,0';
  console.log(failed ? 'FAIL: background did not change (or was black)' : 'PASS: tap on HOP changed the scene');
  ws.close();
} catch (e) {
  console.error('error:', e);
} finally {
  chrome.kill();
  server.close();
  process.exit(failed ? 1 : 0);
}
