// Settings screen phone screenshots: 390x844 top, 390x844 scrolled to the bottom, 360x640 top and bottom.
// Starts its own temporary Vite server. Usage: node tools/settings-shots.mjs [outDir]
import puppeteer from 'puppeteer-core';
import { createServer } from 'vite';
import { mkdirSync } from 'node:fs';

const out = process.argv[2] ?? 'art-candidates/settings-fix';
mkdirSync(out, { recursive: true });
const CHROME = process.env.CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const server = await createServer({ server: { port: 5192, strictPort: false, host: '127.0.0.1' }, logLevel: 'error' });
await server.listen();
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

for (const [w, h] of [[390, 844], [360, 640]]) {
  const page = await browser.newPage();
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
  await page.goto(`${server.resolvedUrls.local[0]}?timer`, { waitUntil: 'networkidle0', timeout: 120000 });
  await page.waitForFunction(() => window.__omm?.game?.scene?.getScene('game')?.s, { timeout: 30000 });
  await page.evaluate(() => {
    const sc = window.__omm.game.scene.getScene('game');
    clearInterval(window.__bot);
    sc.closeModal();
    sc.openTitle('road');
    sc.openSettings();
  });
  await wait(900);
  const tag = `${w}x${h}`;
  await page.screenshot({ path: `${out}/settings_top_${tag}.png` });
  const minScroll = await page.evaluate(async () => {
    const sc = window.__omm.game.scene.getScene('game');
    const list = sc.modal.list.find((o) => o.type === 'Container' && o.mask);
    const kit = await import('/src/game/sceneKit.ts');
    const lay = await import('/src/game/ui/settingsLayout.ts');
    // jump to the most negative scroll: the same value attachScroll clamps to
    list.y = lay.layoutSettings(kit.H).minScroll;
    return list.y;
  });
  console.log(tag, 'list y set (raw)', minScroll);
  await wait(200);
  await page.screenshot({ path: `${out}/settings_bottom_${tag}.png` });
  await page.close();
}
await browser.close();
await server.close();
