// Renders proto/engine-proto.html in headless Chrome (software GL) and writes shots/18_engine_proto_glint.png (4 times).
import puppeteer from 'puppeteer-core';
import sharp from 'sharp';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const browser = await puppeteer.launch({ executablePath: process.env.CHROME ?? '/opt/pw-browsers/chromium', headless: true, args: ['--no-sandbox', '--allow-file-access-from-files', '--disable-background-networking', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage();
await page.setViewport({ width: 600, height: 200, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
await page.goto(pathToFileURL(join(HERE, 'engine-proto.html')).href);
await page.waitForFunction(() => window.__ready, { timeout: 20000 });
const rows = [];
for (let i = 0; i < 4; i++) {
  await new Promise((r) => setTimeout(r, 420));
  rows.push({ input: await sharp(await page.screenshot({ type: 'png' })).extract({ left: 0, top: 0, width: 600, height: 200 }).toBuffer(), left: 0, top: i * 200 });
}
await browser.close();
// sharp resizes before it composites, so build the sheet first and shrink it in a second pass
const sheet = await sharp({ create: { width: 600, height: 800, channels: 3, background: '#b8691f' } }).composite(rows).png().toBuffer();
await sharp(sheet).resize({ width: 390 }).png({ compressionLevel: 9 }).toFile(join(HERE, '..', 'shots', '18_engine_proto_glint.png'));
console.log('ok');
