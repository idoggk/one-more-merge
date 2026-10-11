// Checks the review shell (index page, not solo): node art-candidates/screens/tools/review-shot.mjs <out-dir>
// Takes a desktop and a phone-width screenshot and reports horizontal overflow and any failed requests.
import puppeteer from 'puppeteer-core';
import path from 'node:path';
import fs from 'node:fs';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const out = process.argv[2];
fs.mkdirSync(out, { recursive: true });
const browser = await puppeteer.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox', '--allow-file-access-from-files'], headless: true });
const page = await browser.newPage();
const external = [];
const errors = [];
page.on('request', (r) => { if (!r.url().startsWith('file:') && !r.url().startsWith('data:')) external.push(r.url()); });
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

await page.setViewport({ width: 1280, height: 900, deviceScaleFactor: 1 });
await page.goto(`file://${root}/index.html`, { waitUntil: 'load' });
await new Promise((r) => setTimeout(r, 1200));
await page.screenshot({ path: path.join(out, 'review-desktop.png') });
await page.evaluate(() => document.getElementById('win').scrollIntoView());
await new Promise((r) => setTimeout(r, 4200));
await page.screenshot({ path: path.join(out, 'review-desktop-win.png') });

await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await page.goto(`file://${root}/index.html`, { waitUntil: 'load' });
await new Promise((r) => setTimeout(r, 1000));
await page.screenshot({ path: path.join(out, 'review-phone.png') });
const over = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
console.log('phone scrollWidth', over.sw, 'clientWidth', over.cw);
console.log('external requests:', external.length ? external : 'none');
console.log('page errors:', errors.length ? errors : 'none');
await browser.close();
