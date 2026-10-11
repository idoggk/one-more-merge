// Phone screenshots (390x844) of the CRATES = TOOLBOX crate screen: closed, shake, burst, cards landed (3 and 8), latch upgrades.
// Usage: node tools/crate-shots.mjs [outDir] [kind ...]   (default art-candidates/crate-screen, all four kinds)
// Cards are synthetic (fixed units, one NEW) so the frames are comparable; nothing touches the save.
import puppeteer from 'puppeteer-core';
import { createServer } from 'vite';
import { mkdirSync } from 'node:fs';

const out = process.argv[2] ?? 'art-candidates/crate-screen';
const only = process.argv.slice(3);
mkdirSync(out, { recursive: true });
const CHROME = process.env.CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const server = await createServer({ server: { port: 5198, strictPort: false, host: '127.0.0.1' }, logLevel: 'error' });
await server.listen();
const URL = `${server.resolvedUrls.local[0]}?timer`;
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
await page.evaluateOnNewDocument(() => {
  localStorage.setItem('omm_qa_crates', 'toolbox');
  localStorage.setItem('omm_qa_units_b0', 'rb');
  for (let i = 1; i <= 7; i++) localStorage.setItem(`omm_qa_roster_${i}`, 'on');
  localStorage.setItem('omm_shake', 'full');
});
await page.goto(URL, { waitUntil: 'networkidle0', timeout: 120000 });
await page.waitForFunction(() => window.__omm?.game?.scene?.getScene('game')?.s, { timeout: 30000 });
await new Promise((r) => setTimeout(r, 6000)); // lazy art
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const POOL = ['rivet_gun', 'wrench', 'cannon', 'saw_blade', 'tesla_tower', 'hydraulic_press', 'vice', 'signal_beacon', 'router', 'lathe'];
/** `n` cards in total: 3 = three single cards, 8 = seven stacks (the first one is x2), a new unit and a Legendary among them. */
const make = (n) => POOL.slice(0, n === 8 ? 7 : n).map((unit, i) => ({ unit, count: n === 8 && i === 0 ? 2 : 1, isNew: i === 0 || i === 4 }));
const present = (kind, n, from) =>
  page.evaluate(
    (kind, cards, from) => {
      clearInterval(window.__bot);
      const sc = window.__omm.game.scene.getScene('game');
      sc.closeModal();
      sc.crateReturn = null;
      sc.seasonEv = () => {}; // its "+15 SEASON XP" toast would sit on the crate in every frame
      sc.presentCrate(kind, cards, undefined, from);
    },
    kind,
    make(n),
    from,
  );
const tap = () => page.mouse.click(195, 422);
const shot = (name) => page.screenshot({ path: `${out}/${name}.png` });
/** Scene clock speed (tweens + timers), so mid-animation frames can be caught: 1 = normal. */
const slow = (k) =>
  page.evaluate((k) => {
    const sc = window.__omm.game.scene.getScene('game');
    sc.tweens.timeScale = k;
    sc.time.timeScale = k;
  }, k);

const kinds = [['wood', 'bag'], ['iron', 'toolbox'], ['gold', 'chest'], ['bench', 'workbench']].filter(([, nm]) => !only.length || only.includes(nm));
for (const [kind, nm] of kinds) {
  await present(kind, 3);
  await wait(700);
  await shot(`${nm}_1_closed`);
  await slow(0.12);
  await tap();
  await wait(700); // ~85 ms of scene time: the first shake swing is at its widest
  await shot(`${nm}_2_shake`);
  await wait(5000); // ~700 ms: the lid is popping
  await shot(`${nm}_3_burst`);
  await slow(1);
  await wait(3000);
  await shot(`${nm}_4_cards3`);
  await present(kind, 8);
  await wait(500);
  await tap();
  await wait(4200);
  await shot(`${nm}_5_cards8`);
}
if (!only.length || only.includes('upgrade')) {
  for (const [kind, nm] of [['iron', 'toolbox'], ['gold', 'chest'], ['bench', 'workbench']]) {
    await present(kind, 8, 'wood');
    await wait(600);
    await shot(`upgrade_${nm}_1_bag`);
    await slow(0.12);
    await tap();
    await wait(4900); // ~590 ms: the latch has popped and the picture has swapped
    await shot(`upgrade_${nm}_2_swap`);
    await slow(1);
    await wait(3600);
    await shot(`upgrade_${nm}_3_cards`);
  }
}
await browser.close();
await server.close();
