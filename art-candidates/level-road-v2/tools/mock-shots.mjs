// Screenshots the static mock at 390x844 (current position, gate/top, middle, start/bottom).
import puppeteer from 'puppeteer-core';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
const CHROME = process.env.CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const file = pathToFileURL(resolve('art-candidates/level-road-v2/mock/index.html')).href;
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--allow-file-access-from-files'] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
page.on('requestfailed', (r) => console.log('FAILED', r.url()));
for (const [name, q] of [['mock_current', ''], ['mock_gate_top', '?top=0'], ['mock_middle', '?top=800'], ['mock_start_bottom', '?top=1416']]) {
  await page.goto(file + q, { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 600));
  await page.screenshot({ path: `art-candidates/level-road-v2/mock/${name}.png` });
  console.log('saved', name);
}
await browser.close();
