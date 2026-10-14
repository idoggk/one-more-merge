// Shared boot for tools/unit-display-audit.mjs: temporary Vite server + headless Chrome at a phone viewport,
// every roster QA switch on, the game scene ready. Nothing touches a real save (fresh browser profile).
import puppeteer from 'puppeteer-core';
import { createServer } from 'vite';

export const CHROME = process.env.CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
export const wait = (ms) => new Promise((r) => setTimeout(r, ms));

export async function boot(w, h, port = 5197) {
  const server = await createServer({ server: { port, strictPort: false, host: '127.0.0.1' }, logLevel: 'error' });
  await server.listen();
  const URL = `${server.resolvedUrls.local[0]}?timer`;
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await browser.newPage();
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
  await page.evaluateOnNewDocument(() => {
    localStorage.setItem('omm_qa_units_b0', 'rb');
    for (let i = 1; i <= 7; i++) localStorage.setItem(`omm_qa_roster_${i}`, 'on');
    localStorage.setItem('omm_shake', 'off');
  });
  await page.goto(URL, { waitUntil: 'networkidle0', timeout: 120000 });
  await page.waitForFunction(() => window.__omm?.game?.scene?.getScene('game')?.s, { timeout: 30000 });
  await wait(9000); // lazy art batches
  await page.evaluate(() => {
    clearInterval(window.__bot);
    const sc = window.__omm.game.scene.getScene('game');
    sc.loadUnitPictures?.();
  });
  await wait(2500);
  return { page, server, close: async () => { await browser.close(); await server.close(); } };
}
