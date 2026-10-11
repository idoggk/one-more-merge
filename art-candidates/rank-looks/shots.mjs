// Captures 390 px wide PNG previews of art-candidates/rank-looks/index.html into shots/.
// Usage: node art-candidates/rank-looks/shots.mjs [outDir]   (CHROME env var overrides the browser path)
import puppeteer from 'puppeteer-core';
import sharp from 'sharp';
import { mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = process.argv[2] ?? join(HERE, 'shots');
mkdirSync(OUT, { recursive: true });
const CHROME = process.env.CHROME ?? '/opt/pw-browsers/chromium';
const URL0 = pathToFileURL(join(HERE, 'index.html')).href;
// name -> [query, freeze ms or null, full page?]
const SHOTS = JSON.parse(readFileSync(join(HERE, 'shots.json'), 'utf8'));
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--allow-file-access-from-files', '--disable-background-networking'] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
page.on('requestfailed', (r) => console.log('REQFAIL', r.url().slice(0, 80)));
// the page must be fully offline: report any request that is not file: or data:
let netCount = 0;
page.on('request', (r) => { if (!/^(file|data|blob|about):/.test(r.url())) { netCount++; console.log('NETWORK REQUEST (should be none):', r.url().slice(0, 100)); } });
for (const [name, [query, freeze, full]] of Object.entries(SHOTS)) {
  await page.goto(`${URL0}?${query}${freeze != null ? `&freeze=${freeze}&sync=1` : ''}`, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await new Promise((r) => setTimeout(r, 400));
  const buf = await page.screenshot({ fullPage: !!full, type: 'png' });
  await sharp(buf).resize({ width: process.env.RAW ? 780 : 390 }).png({ compressionLevel: 9 }).toFile(join(OUT, `${name}.png`));
  console.log(name);
}
await browser.close();
console.log(netCount ? `${netCount} network request(s)!` : 'offline check: 0 network requests');
