// 2x2 strip of the rank-7 tile (V2 Plinth, Tesla Tower) at four animation times, to show the glint sweep.
// Usage: node art-candidates/rank-looks/glint-frames.mjs   (CHROME env var overrides the browser path)
import puppeteer from 'puppeteer-core';
import sharp from 'sharp';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const browser = await puppeteer.launch({ executablePath: process.env.CHROME ?? '/opt/pw-browsers/chromium', headless: true, args: ['--no-sandbox', '--allow-file-access-from-files', '--disable-background-networking'] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 3 });
const frames = [];
for (const t of [200, 500, 800, 1100]) {
  await page.goto(`${pathToFileURL(join(HERE, 'index.html')).href}?unit=tesla_tower&view=ladder&look=v2&size=L&sync=1&freeze=${t}`);
  await page.evaluate(() => document.fonts.ready);
  await new Promise((r) => setTimeout(r, 300));
  frames.push(await (await page.$('.tile[data-seq="6"]')).screenshot({ type: 'png' }));
}
await browser.close();
const S = 340;
// sharp resizes before it composites, so build the sheet first and shrink it in a second pass
const sheet = await sharp({ create: { width: S * 2, height: S * 2, channels: 3, background: '#fbe7c6' } })
  .composite(await Promise.all(frames.map(async (f, i) => ({ input: await sharp(f).resize(S, S).toBuffer(), left: (i % 2) * S, top: Math.floor(i / 2) * S }))))
  .png().toBuffer();
await sharp(sheet).resize({ width: 390 }).png({ compressionLevel: 9 }).toFile(join(HERE, 'shots', '15_glint_rank7_frames.png'));
console.log('glint frames written');
