// Render every CODE-DRAWN texture of the game to PNG contact sheets, using the game's own drawing code.
// Usage: node tools/render-code-assets.mjs [--out=art-candidates/code-assets] [--chrome=/path/to/chrome] [--only=step,step] [--quiet]
//
// How: starts a temporary Vite server (like tools/shots.mjs) and opens tools/render-code-assets.harness.html in headless
// Chrome. The harness boots a minimal Phaser game, imports the REAL modules (textures.ts ensureTextures, roster*Art.ts,
// toolboxCrates.ts, sceneKit.ts, supportCard.ts, ...) and calls them with NO painted art loaded, so every texture comes
// out as the code version. Textures are read back from Phaser's texture manager; things the game draws live on Graphics
// are built in a scene and snapshotted. This file only writes the PNGs (sharp) and index.json; nothing in src/ is edited.
// A tiny Vite plugin below patches three modules IN MEMORY (never on disk): textures.ts (art glob -> {}, so nothing is
// painted), crateScreen.ts and sandwichFx.ts (extra exports for private bake helpers).
import puppeteer from 'puppeteer-core';
import { createServer } from 'vite';
import sharp from 'sharp';
import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const arg = (name, dflt) => process.argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3) ?? dflt;
const OUT = resolve(ROOT, arg('out', 'art-candidates/code-assets'));
const QUIET = process.argv.includes('--quiet');
/** --only=screens,yards limits the harness to those steps (development aid); the default renders everything. */
const ONLY = arg('only', '');
const log = (...a) => QUIET || console.log(...a);

function findChrome() {
  const cands = [arg('chrome', ''), process.env.CHROME, '/opt/pw-browsers/chromium', 'C:/Program Files/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'];
  const hit = cands.find((c) => c && existsSync(c));
  if (!hit) throw new Error('No Chrome found: pass --chrome=/path/to/chrome or set CHROME');
  return hit;
}

/** In-memory patches of three src modules for the harness (the files on disk are never touched). */
function codeAssetsPlugin() {
  return {
    name: 'omm-code-assets',
    enforce: 'pre',
    transform(code, id) {
      const file = id.split('?')[0].replace(/\\/g, '/');
      if (file.endsWith('/src/game/textures.ts')) {
        const re = /import\.meta\.glob\(\s*'\.\.\/assets\/art\/\*\.\{png,webp\}'[^)]*\)/;
        if (!re.test(code)) throw new Error('render-code-assets: the art glob in textures.ts moved; update codeAssetsPlugin()');
        return { code: code.replace(re, '({})'), map: null };
      }
      if (file.endsWith('/src/game/ui/crateScreen.ts')) {
        for (const n of ['bakeFx', 'buildCard']) if (!new RegExp(`function ${n}\\(`).test(code)) throw new Error(`render-code-assets: ${n}() moved in crateScreen.ts`);
        return { code: `${code}\nexport { bakeFx as __bakeFx, buildCard as __buildCard };\n`, map: null };
      }
      if (file.endsWith('/src/game/sandwichFx.ts')) {
        if (!/function bakeAll\(/.test(code)) throw new Error('render-code-assets: bakeAll() moved in sandwichFx.ts');
        return { code: `${code}\nexport { bakeAll as __bakeAll };\n`, map: null };
      }
      return null;
    },
  };
}

/** Lossless PNG; `small` = palette PNG (256 colours, about 70% smaller): used for the contact sheets and the phone-sized screenshots, never for the single-texture PNGs. */
const png = (buf, small = false) => sharp(buf).png(small ? { palette: true, quality: 90, effort: 7 } : { compressionLevel: 9, adaptiveFiltering: true, effort: 10 });
const fromDataUrl = (u) => Buffer.from(u.slice(u.indexOf(',') + 1), 'base64');

async function main() {
  const t0 = Date.now();
  const server = await createServer({
    root: ROOT,
    plugins: [codeAssetsPlugin()],
    logLevel: 'error',
    // the settings screen prints the build stamp (date + git sha): pin it so the renders are byte-identical run to run
    define: { __BUILD_ID__: JSON.stringify('2026-10-11 12:00 · code-assets') },
    server: { port: 5300 + Math.floor(Math.random() * 400), strictPort: false, host: '127.0.0.1', hmr: false, watch: null },
    optimizeDeps: { include: ['phaser'] },
  });
  await server.listen();
  const base = server.resolvedUrls.local[0];
  const browser = await puppeteer.launch({ executablePath: findChrome(), headless: true, protocolTimeout: 900000, args: ['--no-sandbox', '--allow-file-access-from-files', '--autoplay-policy=no-user-gesture-required', '--font-render-hinting=none', '--disable-lcd-text', '--force-color-profile=srgb', '--disable-background-networking', '--disable-component-update', '--disable-sync', '--no-first-run', '--no-default-browser-check', '--metrics-recording-only'] });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 800, height: 800, deviceScaleFactor: 1 });
    const problems = [];
    page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
    page.on('response', (r) => r.status() >= 400 && problems.push(`HTTP ${r.status()} ${r.url()}`));
    page.on('console', (m) => {
      if (m.type() === 'error') problems.push(`console.error: ${m.text()}`);
      else if (!QUIET && m.text().startsWith('[harness]')) console.log(m.text());
    });
    await page.goto(`${base}tools/render-code-assets.harness.html${ONLY ? `?only=${ONLY}` : ''}`, { waitUntil: 'load', timeout: 180000 });
    const hang = Number(arg('hang-after', 0));
    if (hang > 0) {
      // development aid: after N seconds, pause the page's JS and print where it is stuck
      const cdp = await page.createCDPSession();
      await cdp.send('Debugger.enable');
      cdp.on('Debugger.paused', (e) => {
        console.log('[render] page paused; stack:');
        for (const f of e.callFrames.slice(0, 25)) console.log('  ', f.functionName || '(anon)', f.url.replace(base, ''), `${f.location.lineNumber + 1}:${f.location.columnNumber}`);
        process.exit(3);
      });
      setTimeout(() => cdp.send('Debugger.pause').catch(() => {}), hang * 1000);
    }
    await page.waitForFunction(() => window.__codeAssets?.ready === true || window.__codeAssets?.error, { timeout: 600000, polling: 500 });
    const err = await page.evaluate(() => window.__codeAssets.error ?? null);
    if (err) throw new Error(`harness failed: ${err}`);
    const manifest = await page.evaluate(() => window.__codeAssets.manifest());
    if (manifest.skipped.length) {
      console.log(`[render] ${manifest.skipped.length} harness step problem(s):`);
      for (const m of manifest.skipped) console.log('  ', m.split('\n').slice(0, 3).join(' | '));
    }
    log(`[render] ${manifest.items.length} textures, ${manifest.sheets.length} sheets from the harness (${((Date.now() - t0) / 1000).toFixed(1)} s)`);

    // clean the generated parts of OUT (README.md is hand-written and stays)
    mkdirSync(OUT, { recursive: true });
    for (const e of readdirSync(OUT, { withFileTypes: true })) {
      if (e.name === 'README.md') continue;
      rmSync(join(OUT, e.name), { recursive: true, force: true });
    }

    const index = [];
    for (let i = 0; i < manifest.items.length; i++) {
      const it = manifest.items[i];
      const file = `${it.category}/${it.id}.png`;
      mkdirSync(join(OUT, it.category), { recursive: true });
      const buf = fromDataUrl(await page.evaluate((n) => window.__codeAssets.itemPng(n), i));
      const info = await png(buf, it.live && it.w * it.h > 250000).toFile(join(OUT, file));
      index.push({ id: it.id, category: it.category, file, width: info.width, height: info.height, ...(it.family ? { family: it.family } : {}), ...(it.rank ? { rank: it.rank } : {}), source: it.source, live: it.live, upscaled: it.upscaled });
    }
    writeFileSync(join(OUT, 'index.json'), `${JSON.stringify(index, null, 1)}\n`);
    // how much each code stand-in changes with rank (% of its pixels that differ from rank 1)
    writeFileSync(join(OUT, 'rank-spread.json'), `${JSON.stringify(manifest.rankSpread ?? [], null, 1)}\n`);

    const sheets = [];
    mkdirSync(join(OUT, 'sheets'), { recursive: true });
    for (let i = 0; i < manifest.sheets.length; i++) {
      const sh = manifest.sheets[i];
      const buf = fromDataUrl(await page.evaluate((n) => window.__codeAssets.sheetPng(n), i));
      const file = `sheets/${sh.name}.png`;
      const info = await png(buf, true).toFile(join(OUT, file));
      let preview = file;
      if (info.width > 1200) {
        preview = `previews/${sh.name}.png`;
        mkdirSync(join(OUT, 'previews'), { recursive: true });
        await png(await sharp(buf).resize({ width: 1200, kernel: 'lanczos3' }).png().toBuffer(), true).toFile(join(OUT, preview));
      }
      sheets.push({ name: sh.name, title: sh.title, file, preview, width: info.width, height: info.height, tiles: sh.tiles });
    }
    writeFileSync(join(OUT, 'sheets.json'), `${JSON.stringify(sheets, null, 1)}\n`);
    if (problems.length) {
      console.log('[render] page problems (first 12):');
      for (const p of [...new Set(problems)].slice(0, 12)) console.log('  ', p);
    }
    const perCat = {};
    for (const e of index) perCat[e.category] = (perCat[e.category] ?? 0) + 1;
    log(`[render] wrote ${index.length} PNGs + ${sheets.length} sheets to ${OUT} in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
    log('[render] per category:', JSON.stringify(perCat));
  } finally {
    await browser.close();
    await server.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
