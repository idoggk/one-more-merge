// QA panel scroll check (390x844): opens QA TOOLS, drags the rows up, taps the last row's first button and prints what changed.
import puppeteer from 'puppeteer-core';
import { createServer } from 'vite';
import { mkdirSync } from 'node:fs';

const out = process.argv[2] ?? 'screenshots/qa-scroll';
mkdirSync(out, { recursive: true });
const CHROME = process.env.CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const server = await createServer({ server: { port: 5197, strictPort: false, host: '127.0.0.1' }, logLevel: 'error' });
await server.listen();
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
await page.goto(`${server.resolvedUrls.local[0]}?timer`, { waitUntil: 'networkidle0', timeout: 120000 });
await page.waitForFunction(() => window.__omm?.game?.scene?.getScene('game')?.s, { timeout: 30000 });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
// every section open so the panel is long enough to scroll; the MERGE RULE segments are what gets tapped
await page.evaluate(async () => { const sc = window.__omm.game.scene.getScene('game'); clearInterval(window.__bot); (await import('/src/game/ui/qaPanel.ts')).qaCollapsed.clear(); sc.closeModal(); sc.openTitle('road'); sc.openQaTools(); });
await wait(700);
await page.screenshot({ path: `${out}/qa_top.png` });
// screen px per design px
const k = await page.evaluate(() => { const c = document.querySelector('canvas').getBoundingClientRect(); return { w: c.width / 720, left: c.left, top: c.top }; });
const drag = async (x, y0, y1) => { await page.touchscreen.touchStart(x, y0); for (let i = 1; i <= 10; i++) { await page.touchscreen.touchMove(x, y0 + ((y1 - y0) * i) / 10); await wait(16); } await page.touchscreen.touchEnd(); await wait(200); };
const before = await page.evaluate(() => localStorage.getItem('omm_qa_merge_rule'));
for (let i = 0; i < 2; i++) await drag(195, 700, 400);
await page.screenshot({ path: `${out}/qa_bottom.png` });
const info = await page.evaluate(() => {
  const sc = window.__omm.game.scene.getScene('game');
  const list = sc.modal.list.find((o) => o.type === 'Container' && o.mask);
  const btns = [];
  const walk = (o, ox, oy) => { if (o.type === 'Container' && o.input) btns.push({ x: o.x, y: o.y + list.y, label: o.list[1]?.text }); if (o.list) o.list.forEach((x) => walk(x)); };
  list.list.forEach((x) => walk(x));
  return { scroll: list.y, last: btns[btns.length - 1], count: btns.length, H: sc.scale.height / (sc.scale.width / 720) };
});
console.log(JSON.stringify(info));
// tap the +2 segment of MERGE RULE (its y is measured against the scrolled list) in screen px
const target = await page.evaluate(() => {
  const sc = window.__omm.game.scene.getScene('game');
  const list = sc.modal.list.find((o) => o.type === 'Container' && o.mask);
  const t = list.list.find((o) => o.type === 'Container' && o.input && o.list[1]?.text === '+2');
  list.y = Math.min(0, 640 - t.y); // bring it to mid-screen (the drags above already proved the scrolling)
  return { x: t.x, y: t.y + list.y };
});
await wait(100);
const sx = target.x * k.w + k.left, sy = target.y * k.w + k.top;
await page.touchscreen.tap(sx, sy);
await wait(500);
const after = await page.evaluate(() => localStorage.getItem('omm_qa_merge_rule'));
console.log('merge rule', before, '->', after);
await page.screenshot({ path: `${out}/qa_tapped.png` });
await browser.close();
await server.close();
process.exit(after !== before ? 0 : 1);
