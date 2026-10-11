// Shows candidate unit art INSIDE the real game: boots the game headlessly (temporary Vite server, like tools/shots.mjs), swaps the unit's textures at runtime
// (nothing under src/ is touched), builds a board with the unit at ranks 1-8 among shipped units, and screenshots it at 390x844.
// Usage: node art-candidates/asset-program/tools/ingame-preview.mjs --family blowtorch --dir art-candidates/asset-program/inbox/blowtorch_v2 [--mode new|today] [--out file.png]
//   --mode new    candidate ranks <family>_1..8.webp from --dir replace the unit's picture at every rank (default)
//   --mode today  the shipped single picture src/assets/art/unit_<family>.webp, as the game shows it now (for a before/after)
// Needs Chrome (CHROME env var or /opt/pw-browsers/chromium).
import puppeteer from 'puppeteer-core';
import { createServer } from 'vite';
import sharp from 'sharp';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url)), REPO = resolve(HERE, '../../..');
const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf('--' + n); return i >= 0 ? args[i + 1] : d; };
const FAMILY = opt('family', 'blowtorch'), DIR = opt('dir'), MODE = opt('mode', 'new'), OUT = opt('out', `ingame_${FAMILY}_${MODE}.png`);
if (MODE === 'new' && !DIR) { console.error('--dir <folder with <family>_1..8.webp> is required in new mode'); process.exit(2); }
const CHROME = process.env.CHROME ?? '/opt/pw-browsers/chromium';
const uri = (buf) => 'data:image/webp;base64,' + buf.toString('base64');
const tex = {};
if (MODE === 'new') for (let r = 1; r <= 8; r++) { const f = join(DIR, `${FAMILY}_${r}.webp`); if (!existsSync(f)) throw new Error('missing ' + f); tex[`${FAMILY}_${r}`] = uri(readFileSync(f)); }
else tex[`unit_${FAMILY}`] = uri(readFileSync(join(REPO, 'src/assets/art', `unit_${FAMILY}.webp`)));

const server = await createServer({ root: REPO, server: { port: 5197, strictPort: false, host: '127.0.0.1' }, logLevel: 'error' });
await server.listen();
const URL0 = `${server.resolvedUrls.local[0]}?timer`;
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--allow-file-access-from-files', '--disable-background-networking', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
  await page.goto(URL0, { waitUntil: 'networkidle0', timeout: 120000 });
  await page.waitForFunction(() => window.__omm?.game?.scene?.getScene('game')?.s, { timeout: 60000 });
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  await page.evaluate(() => { const sc = window.__omm.game.scene.getScene('game'); clearInterval(window.__bot); sc.closeModal(); sc.meta.tips = new Proxy({}, { get: () => true, set: () => true }); sc.startLevel(1); sc.finishIntro(true); });
  await wait(3000);
  await page.evaluate(async (tex, family) => {
    const sc = window.__omm.game.scene.getScene('game');
    // swap the textures: remove whatever is there, add ours, wait until Phaser has decoded them
    await Promise.all(Object.entries(tex).map(([key, data]) => new Promise((res) => {
      if (sc.textures.exists(key)) sc.textures.remove(key);
      sc.textures.once('addtexture-' + key, () => res());
      sc.textures.addBase64(key, data);
    })));
    if (!Object.keys(tex).some((k) => k.startsWith('unit_')) && sc.textures.exists('unit_' + family)) sc.textures.remove('unit_' + family); // new mode: no single picture over the per-rank art
    sc.visCache?.clear?.();
    const s = sc.s, g0 = s.grid.find(Boolean);
    for (const v of sc.views.values()) v.destroy();
    sc.views.clear();
    s.grid = s.grid.map(() => null);
    const put = (i, fam, rank) => { s.grid[i] = { ...g0, id: 9000 + i, family: fam, rank }; };
    // row 1: the unit at ranks 1-5, row 2: ranks 6-8 and two shipped units for scale, rows 3-4: shipped units for context
    [1, 2, 3, 4, 5].forEach((r, k) => put(k, family, r));
    [6, 7, 8].forEach((r, k) => put(5 + k, family, r));
    put(8, 'cannon', 4); put(9, 'coil', 3);
    put(10, 'bell', 2); put(11, 'rocket', 5); put(12, 'cannon', 6); put(13, 'magnet', 3); put(14, 'battery', 2);
    put(15, 'cannon', 1); put(16, 'coil', 6); put(17, 'bell', 4);
    sc.reconcile(true);
  }, tex, FAMILY);
  await wait(1500);
  const buf = await page.screenshot({ type: 'png' });
  await sharp(buf).png({ compressionLevel: 9 }).toFile(OUT);
  console.log('wrote', OUT);
} finally {
  await browser.close();
  await server.close();
}
