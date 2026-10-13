// QA panel phone screenshots: all sections collapsed, each section open, and a long-label case, at 390x844 and 360x640.
// Starts its own temporary Vite server. Usage: node tools/qa-panel-shots.mjs [outDir]
import puppeteer from 'puppeteer-core';
import { createServer } from 'vite';
import { mkdirSync } from 'node:fs';

const out = process.argv[2] ?? 'art-candidates/qa-panel';
mkdirSync(out, { recursive: true });
const CHROME = process.env.CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const server = await createServer({ server: { port: 5191, strictPort: false, host: '127.0.0.1' }, logLevel: 'error' });
await server.listen();
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const SECTIONS = ['quick', 'feel', 'units', 'crates', 'tests', 'yard', 'display'];

for (const [w, h] of [[390, 844], [360, 640]]) {
  const page = await browser.newPage();
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
  await page.goto(`${server.resolvedUrls.local[0]}?timer`, { waitUntil: 'networkidle0', timeout: 120000 });
  await page.waitForFunction(() => window.__omm?.game?.scene?.getScene('game')?.s, { timeout: 30000 });
  const tag = `${w}x${h}`;
  const show = async (name, open, tweak) => {
    await page.evaluate(async (open, tweak) => {
      const sc = window.__omm.game.scene.getScene('game');
      clearInterval(window.__bot);
      const mod = await import('/src/game/ui/qaPanel.ts');
      mod.qaCollapsed.clear();
      for (const id of ['quick', 'feel', 'units', 'crates', 'tests', 'yard', 'display']) if (!open.includes(id)) mod.qaCollapsed.add(id);
      if (tweak === 'long') {
        // a temporary row with very long labels, to show they shrink inside their box
        const kit = await import('/src/game/ui/qaKit.ts');
        mod.QA_SECTIONS[0].rows.push(kit.qaFlag({ id: 'longCase', title: 'A VERY LONG SETTING TITLE THAT WOULD NEVER FIT ON ONE LINE', desc: 'and an equally long one-line description that keeps going and going', get: () => true, set() {}, toast: () => '' }));
        mod.QA_SECTIONS[0].rows.push(kit.qaChoice({ id: 'longChoice', title: 'LONG CHOICES', desc: 'segment labels shrink too', options: [{ id: 'a', label: 'FIRST LONG OPTION' }, { id: 'b', label: 'SECOND LONGER OPTION NAME' }, { id: 'c', label: 'C' }], current: () => 'b', pick() {}, toast: () => '' }));
      }
      sc.closeModal();
      sc.openTitle('road');
      sc.openQaTools();
    }, open, tweak ?? '');
    await wait(900);
    if (tweak === 'long') {
      // scroll the list to the end of the quick section so the long rows show
      await page.evaluate(() => {
        const sc = window.__omm.game.scene.getScene('game');
        const list = sc.modal.list.find((o) => o.type === 'Container' && o.mask);
        list.y = -560;
      });
      await wait(200);
    }
    await page.screenshot({ path: `${out}/${name}_${tag}.png` });
  };
  await show('collapsed', []);
  for (const id of SECTIONS) await show(`open_${id}`, [id]);
  await show('long_labels', ['quick'], 'long');
  await page.close();
}
await browser.close();
await server.close();
