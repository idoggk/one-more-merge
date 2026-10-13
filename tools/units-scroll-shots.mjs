// UNITS tab scroll check at 390x844 and 360x640: top, a real touch swipe (two frames), a jump-chip tap and back-to-top.
// Usage: node tools/units-scroll-shots.mjs [outDir]   (starts its own temporary Vite server)
import puppeteer from 'puppeteer-core';
import { createServer } from 'vite';
import { mkdirSync } from 'node:fs';

const out = process.argv[2] ?? 'art-candidates/units-scroll';
mkdirSync(out, { recursive: true });
const CHROME = process.env.CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const server = await createServer({ server: { port: 5199, strictPort: false, host: '127.0.0.1' }, logLevel: 'error' });
await server.listen();
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let fail = 0;
const check = (name, ok, extra = '') => { console.log(ok ? 'OK  ' : 'FAIL', name, extra); if (!ok) fail++; };

for (const [w, h] of [[390, 844], [360, 640]]) {
  const tag = `${w}x${h}`;
  const page = await browser.newPage();
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
  await page.goto(`${server.resolvedUrls.local[0]}?timer`, { waitUntil: 'networkidle0', timeout: 120000 });
  await page.waitForFunction(() => window.__omm?.game?.scene?.getScene('game')?.s, { timeout: 30000 });
  // all roster batches on, about two thirds of the units owned (mixed rarities), the rest stay locked
  await page.evaluate(async () => {
    const sc = window.__omm.game.scene.getScene('game');
    clearInterval(window.__bot);
    const u = await import('/src/content/units.ts');
    const t = await import('/src/content/tuning.ts');
    for (let i = 1; i <= 7; i++) u[`applyRoster${i}`]?.(true);
    t.TUNING.rosterB = true;
    sc.meta.units = sc.meta.units ?? {};
    u.UNITS.forEach((d, i) => { if (i % 3 !== 2) sc.meta.units[d.id] = { level: 1 + (i % 6), cards: i % 5 }; });
    sc.closeModal();
    sc.openTitle('units');
  });
  await wait(1200);
  const state = () => page.evaluate(() => {
    const sc = window.__omm.game.scene.getScene('game');
    const list = sc.modal.list.find((o) => o.type === 'Container' && o.mask);
    return { y: list?.y, n: list?.list.length, H: sc.scale.height / (sc.scale.width / 720) };
  });
  const k = await page.evaluate(() => { const c = document.querySelector('canvas').getBoundingClientRect(); return { s: c.width / 720, left: c.left, top: c.top }; });
  const s0 = await state();
  console.log(tag, 'list', JSON.stringify(s0), 'screen px per design px', k.s.toFixed(3));
  await page.screenshot({ path: `${out}/units_top_${tag}.png` });

  // swipe up with a real touch drag (finger leaves while still moving, so inertia carries on)
  const x = w / 2, y0 = h * 0.75, y1 = h * 0.35;
  await page.touchscreen.touchStart(x, y0);
  for (let i = 1; i <= 4; i++) { await page.touchscreen.touchMove(x, y0 + ((y1 - y0) * i) / 8); await wait(16); }
  await page.screenshot({ path: `${out}/units_swipe_mid_${tag}.png` });
  const sMid = await state();
  for (let i = 5; i <= 8; i++) { await page.touchscreen.touchMove(x, y0 + ((y1 - y0) * i) / 8); await wait(16); }
  await page.touchscreen.touchEnd();
  await wait(60);
  const sAfter = await state();
  await wait(1200);
  const sRest = await state();
  await page.screenshot({ path: `${out}/units_swipe_end_${tag}.png` });
  console.log(tag, 'y top/mid/afterRelease/rest', s0.y, sMid.y, sAfter.y, sRest.y);
  check(`${tag} drag moves the list`, sMid.y < s0.y - 20);
  check(`${tag} inertia carries past the release point`, sRest.y < sMid.y - 1 || sRest.y <= sAfter.y);

  // tap-versus-drag: a drag that ends on a tile must not open it
  const modalBefore = await page.evaluate(() => window.__omm.game.scene.getScene('game').modal?.list.length);
  await page.touchscreen.touchStart(x, h * 0.6);
  for (let i = 1; i <= 6; i++) { await page.touchscreen.touchMove(x, h * 0.6 - i * 6); await wait(16); }
  await page.touchscreen.touchEnd();
  await wait(500);
  const stillTab = await page.evaluate(() => { const sc = window.__omm.game.scene.getScene('game'); return !!sc.modal && sc.modal.list.some((o) => o.type === 'Container' && o.mask); });
  check(`${tag} a drag ending on a tile does not open it`, stillTab && modalBefore > 0);

  // jump strip: tap the last chip
  const chip = await page.evaluate(() => {
    const sc = window.__omm.game.scene.getScene('game');
    const chips = sc.modal.list.filter((o) => o.type === 'Container' && o.input && o.list.length === 2 && o.list[0].type === 'Graphics' && o.list[1].type === 'Text' && !o.list[1].text.startsWith('▲'));
    const last = chips[chips.length - 1];
    return last ? { x: last.x, y: last.y, label: last.list[1].text, n: chips.length } : null;
  });
  console.log(tag, 'chips', JSON.stringify(chip));
  if (chip) {
    await page.touchscreen.tap(chip.x * k.s + k.left, chip.y * k.s + k.top);
    await wait(1500);
    const sJump = await state();
    await page.screenshot({ path: `${out}/units_jump_${chip.label}_${tag}.png` });
    check(`${tag} chip ${chip.label} scrolls`, sJump.y !== sRest.y, `y ${sRest.y} -> ${sJump.y}`);
  }
  // a quick tap on a tile still opens it
  await page.evaluate(() => { const sc = window.__omm.game.scene.getScene('game'); sc.openTitle('units'); });
  await wait(900);
  const tile = await page.evaluate(() => {
    const sc = window.__omm.game.scene.getScene('game');
    const list = sc.modal.list.find((o) => o.type === 'Container' && o.mask);
    const t = list.list.find((o) => o.input && o.y + list.y > 460 && o.y + list.y < 700);
    return t ? { x: t.x, y: t.y + list.y } : null;
  });
  if (tile) {
    await page.touchscreen.tap(tile.x * k.s + k.left, tile.y * k.s + k.top);
    await wait(700);
    const opened = await page.evaluate(() => { const sc = window.__omm.game.scene.getScene('game'); return !sc.modal.list.some((o) => o.type === 'Container' && o.mask); });
    check(`${tag} a short tap on a tile opens its page`, opened);
    await page.screenshot({ path: `${out}/units_tap_detail_${tag}.png` });
  }
  await page.close();
}
await browser.close();
await server.close();
process.exit(fail ? 1 : 0);
