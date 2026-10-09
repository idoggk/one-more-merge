// Phone-size screenshots of named game states for design reviews (ChatGPT critique rounds).
// Starts its own temporary Vite server. Usage: node tools/shots.mjs [--viewport=WxH] [outDir] [state ...]
// (default screenshots/, 390x763; e.g. --viewport=390x844 for an iPhone 12-15 screen; VIEWPORT=390x844 also works)
import puppeteer from 'puppeteer-core';
import { createServer } from 'vite';
import { mkdirSync } from 'node:fs';

const vpArg = process.argv.find((a) => a.startsWith('--viewport='));
const args = process.argv.slice(2).filter((a) => !a.startsWith('--viewport='));
const vp = (vpArg?.slice('--viewport='.length) ?? process.env.VIEWPORT ?? '390x763').match(/^(\d+)x(\d+)$/);
if (!vp) throw new Error('viewport must look like 390x844');
const out = args[0] ?? 'screenshots';
mkdirSync(out, { recursive: true });
const CHROME = process.env.CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const server = await createServer({ server: { port: 5199, strictPort: false, host: '127.0.0.1' }, logLevel: 'error' });
await server.listen();
const URL = `${server.resolvedUrls.local[0]}?timer`;

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage();
await page.setViewport({ width: +vp[1], height: +vp[2], deviceScaleFactor: 2, isMobile: true, hasTouch: true });
page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
await page.goto(URL, { waitUntil: 'networkidle0', timeout: 120000 });
await page.waitForFunction(() => window.__omm?.game?.scene?.getScene('game')?.s, { timeout: 30000 });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/** Each state: a function run in the page (gets the scene) + how long to let animations play. */
const states = {
  s1_tutorial_start: [
    (sc) => {
      localStorage.clear();
      Object.assign(sc.meta, { tutorialDone: false, tips: {}, lessons: {}, levelStars: {}, bolts: 0, kits: 0, capsules: 0, mastery: {}, hardUnlocked: false, onboarded: false, toys: {} });
      sc.startTutorial();
    },
    1800,
  ],
  s2_tutorial_step1: [(sc) => {}, 2500],
  tut_after: [(sc) => { const st = sc.constructor.TUTORIAL[sc.tutorialStep]; const p = sc.tutorialPair(st); if (p) sc.commitDrop(p[0], p[1], sc.s.grid[p[0]].id); }, 2200],
  l1_lesson: [(sc) => { sc.startLevel(1); }, 4200],
  guide0: [(sc) => { clearInterval(window.__bot); sc.openTitle('road'); sc.openHowTo(0); }, 1500],
  guide2: [(sc) => { sc.openHowTo(2); }, 1300],
  new_rocket: [(sc) => { clearInterval(window.__bot); sc.closeModal(); sc.meta.tips = { ...sc.meta.tips, new_rocket: false }; sc.startLevel(6); }, 4200],
  settings: [(sc) => { sc.closeModal(); sc.openTitle('road'); sc.openSettings(); }, 900],
  item_lesson: [(sc) => { clearInterval(window.__bot); sc.closeModal(); sc.meta.tips = { delivery: true, overdrive: true, full: true, clock: true, next: true, x_chain: true, x_kick_fuse: true, x_kick_plain: true, x_boss: true, tap_hint: true, item_overcharge: false }; sc.startLevel(13); sc.finishIntro(true); setTimeout(() => { sc.s.itemTray = 'overcharge'; sc.s.itemGranted = true; sc.handleEvents([{ type: 'itemGrant', kind: 'overcharge', teach: true }]); }, 600); }, 2600],
  item_applied: [(sc) => { const i = sc.s.grid.findIndex((x) => x && (x.family === 'cannon' || x.family === 'rocket')); sc.tryApplyItem(i); }, 900],
  mini8: [(sc) => { clearInterval(window.__bot); sc.closeModal(); sc.meta.tips = { ...sc.meta.tips, delivery: true, overdrive: true, full: true, clock: true, next: true, x_chain: true, x_kick_fuse: true, x_kick_plain: true, x_boss: true, tap_hint: true, xb_bomb: true, xb_conveyor: true, xb_mirror: true, xb_blocks: true, xb_pull: true, xb_bounce: true }; sc.startLevel(8); sc.finishIntro(true); }, 9800],
  mini18: [(sc) => { clearInterval(window.__bot); sc.closeModal(); sc.meta.tips = { ...sc.meta.tips, delivery: true, overdrive: true, full: true, clock: true, next: true, x_chain: true, x_kick_fuse: true, x_kick_plain: true, x_boss: true, tap_hint: true, xb_bomb: true, xb_conveyor: true, xb_mirror: true, xb_blocks: true, xb_pull: true, xb_bounce: true }; sc.startLevel(18); sc.finishIntro(true); }, 9800],
  mini38: [(sc) => { clearInterval(window.__bot); sc.closeModal(); sc.meta.tips = { ...sc.meta.tips, delivery: true, overdrive: true, full: true, clock: true, next: true, x_chain: true, x_kick_fuse: true, x_kick_plain: true, x_boss: true, tap_hint: true, xb_bomb: true, xb_conveyor: true, xb_mirror: true, xb_blocks: true, xb_pull: true, xb_bounce: true }; sc.startLevel(38); sc.finishIntro(true); }, 11600],
  mini58: [(sc) => { clearInterval(window.__bot); sc.closeModal(); sc.meta.tips = { ...sc.meta.tips, delivery: true, overdrive: true, full: true, clock: true, next: true, x_chain: true, x_kick_fuse: true, x_kick_plain: true, x_boss: true, tap_hint: true, xb_bomb: true, xb_conveyor: true, xb_mirror: true, xb_blocks: true, xb_pull: true, xb_bounce: true }; sc.startLevel(58); sc.finishIntro(true); }, 9800],
  card8m: [(sc) => { clearInterval(window.__bot); sc.closeModal(); sc.meta.lessons = { card: true, boosters: true, road: true }; sc.openTitle('road'); sc.openLevelSheet(28); }, 900],
  book0: [(sc) => { clearInterval(window.__bot); sc.closeModal(); Object.assign(sc.meta, { levelStars: Object.fromEntries(Array.from({ length: 21 }, (_, i) => [i + 1, 2])) }); sc.openTitle('machine'); sc.openMonsterBook(0, 0); }, 900],
  book2: [(sc) => { sc.openMonsterBook(2, 0); }, 700],
  book1: [(sc) => { sc.openMonsterBook(1, 0); }, 700],
  cast4: [(sc) => { clearInterval(window.__bot); sc.closeModal(); sc.meta.tips = { ...sc.meta.tips, delivery: true, overdrive: true, full: true, clock: true, next: true, x_chain: true, x_boss: true, tap_hint: true, new_fan: true, new_rocket: true, new_magnet: true, new_battery: true }; sc.startLevel(4); sc.finishIntro(true); }, 1500],
  cast12: [(sc) => { clearInterval(window.__bot); sc.closeModal(); sc.meta.tips = { ...sc.meta.tips, delivery: true, overdrive: true, full: true, clock: true, next: true, x_chain: true, x_boss: true, tap_hint: true, new_fan: true, new_rocket: true, new_magnet: true, new_battery: true }; sc.startLevel(12); sc.finishIntro(true); }, 1500],
  cast21: [(sc) => { clearInterval(window.__bot); sc.closeModal(); sc.meta.tips = { ...sc.meta.tips, delivery: true, overdrive: true, full: true, clock: true, next: true, x_chain: true, x_boss: true, tap_hint: true, new_fan: true, new_rocket: true, new_magnet: true, new_battery: true }; sc.startLevel(21); sc.finishIntro(true); }, 1500],
  cast31: [(sc) => { clearInterval(window.__bot); sc.closeModal(); sc.meta.tips = { ...sc.meta.tips, delivery: true, overdrive: true, full: true, clock: true, next: true, x_chain: true, x_boss: true, tap_hint: true, new_fan: true, new_rocket: true, new_magnet: true, new_battery: true }; sc.startLevel(31); sc.finishIntro(true); }, 1500],
  cast41: [(sc) => { clearInterval(window.__bot); sc.closeModal(); sc.meta.tips = { ...sc.meta.tips, delivery: true, overdrive: true, full: true, clock: true, next: true, x_chain: true, x_boss: true, tap_hint: true, new_fan: true, new_rocket: true, new_magnet: true, new_battery: true }; sc.startLevel(41); sc.finishIntro(true); }, 1500],
  cast52: [(sc) => { clearInterval(window.__bot); sc.closeModal(); sc.meta.tips = { ...sc.meta.tips, delivery: true, overdrive: true, full: true, clock: true, next: true, x_chain: true, x_boss: true, tap_hint: true, new_fan: true, new_rocket: true, new_magnet: true, new_battery: true }; sc.startLevel(52); sc.finishIntro(true); }, 1500],
  road24: [(sc) => { clearInterval(window.__bot); sc.closeModal(); Object.assign(sc.meta, { levelStars: Object.fromEntries(Array.from({ length: 37 }, (_, i) => [i + 1, 2])), lessons: { road: true, card: true, boosters: true } }); sc.openTitle('road'); }, 1200],
  c7slick: [(sc) => { clearInterval(window.__bot); sc.closeModal(); sc.meta.tips = new Proxy({}, { get: () => true, set: () => true }); sc.startLevel(68); sc.finishIntro(true); }, 11500],
  c7tow: [(sc) => { clearInterval(window.__bot); sc.closeModal(); sc.meta.tips = new Proxy({}, { get: () => true, set: () => true }); sc.startLevel(70); sc.finishIntro(true); }, 11500],
  c8portal: [(sc) => { clearInterval(window.__bot); sc.closeModal(); sc.meta.tips = new Proxy({}, { get: () => true, set: () => true }); sc.startLevel(78); sc.finishIntro(true); }, 11500],
  c8ransom: [(sc) => { clearInterval(window.__bot); sc.closeModal(); sc.meta.tips = new Proxy({}, { get: () => true, set: () => true }); sc.startLevel(80); sc.finishIntro(true); }, 9700],
  rushcard: [(sc) => { clearInterval(window.__bot); sc.closeModal(); sc.meta.tips = {}; Object.assign(sc.meta, { levelStars: Object.fromEntries(Array.from({ length: 40 }, (_, i) => [i + 1, 2])) }); sc.openTitle('events'); }, 1000],
  rushend: [(sc) => { sc.startRush(); sc.rushRun.times = [31.2]; sc.s.elapsed = 28.4; sc.s.phase = 'won'; sc.openRushResult(true); }, 1200],
  mode_daily: [(sc) => { clearInterval(window.__bot); sc.closeModal(); sc.meta.tips = new Proxy({}, { get: () => true, set: () => true }); sc.startDaily(); window.__bot = setInterval(() => { const s = sc.s; if (s.phase !== 'playing') return; for (let i = 0; i < 30; i++) for (let j = i + 1; j < 30; j++) { const a = s.grid[i], b = s.grid[j]; if (a && b && a.family === b.family && a.rank === b.rank) { sc.commitDrop(i, j, a.id); return; } } }, 400); }, 15000],
  mode_challenge: [(sc) => { clearInterval(window.__bot); sc.closeModal(); sc.retry(true, -1); window.__bot = setInterval(() => { const s = sc.s; if (s.phase !== 'playing') return; for (let i = 0; i < 30; i++) for (let j = i + 1; j < 30; j++) { const a = s.grid[i], b = s.grid[j]; if (a && b && a.family === b.family && a.rank === b.rank) { sc.commitDrop(i, j, a.id); return; } } }, 400); }, 15000],
  mode_remix: [(sc) => { clearInterval(window.__bot); sc.closeModal(); sc.retry(false, 2); window.__bot = setInterval(() => { const s = sc.s; if (s.phase !== 'playing') return; for (let i = 0; i < 30; i++) for (let j = i + 1; j < 30; j++) { const a = s.grid[i], b = s.grid[j]; if (a && b && a.family === b.family && a.rank === b.rank) { sc.commitDrop(i, j, a.id); return; } } }, 400); }, 15000],
  bounty_events: [(sc) => { clearInterval(window.__bot); sc.closeModal(); sc.meta.tips = new Proxy({}, { get: () => true, set: () => true }); Object.assign(sc.meta, { levelStars: Object.fromEntries(Array.from({ length: 40 }, (_, i) => [i + 1, 2])) }); sc.openTitle('events'); }, 1000],
  bounty_fight: [(sc) => { sc.startBounty(0); sc.finishIntro(true); }, 2500],
  bounty_result: [(sc) => { sc.s.phase = 'won'; sc.s.timeLeft = 30; sc.openBountyResult(true); }, 1200],
  stage_card: [(sc) => { clearInterval(window.__bot); sc.closeModal(); sc.meta.tips = new Proxy({}, { get: () => true, set: () => true }); Object.assign(sc.meta, { levelStars: Object.fromEntries(Array.from({ length: 30 }, (_, i) => [i + 1, 2])) }); sc.openTitle('road'); sc.openLevelSheet(22); }, 800],
  stage_card_goal: [(sc) => { sc.openLevelSheet(21); }, 800],
  stage_card_boss: [(sc) => { sc.openLevelSheet(20); }, 800],
  stage_next: [(sc) => { sc.closeModal(); sc.startLevel(22); sc.finishIntro(true); setTimeout(() => { const k = () => { const s = sc.s; s.hp = 1; for (let i = 0; i < 30; i++) for (let j = i + 1; j < 30; j++) { const a = s.grid[i], b = s.grid[j]; if (a && b && a.family === b.family && a.rank === b.rank) { sc.commitDrop(i, j, a.id); return; } } }; k(); }, 1500); }, 3000],
  stage_goal: [(sc) => { sc.closeModal(); sc.startLevel(21); sc.finishIntro(true); const k = () => { const s = sc.s; s.hp = 1; for (let i = 0; i < 30; i++) for (let j = i + 1; j < 30; j++) { const a = s.grid[i], b = s.grid[j]; if (a && b && a.family === b.family && a.rank === b.rank) { sc.commitDrop(i, j, a.id); return; } } }; let n = 0; const t = setInterval(() => { if (sc.s.goal || n++ > 6) return clearInterval(t); k(); }, 900); }, 6800],
  stage_boss: [(sc) => { sc.closeModal(); sc.startLevel(20); sc.finishIntro(true); const k = () => { const s = sc.s; s.hp = 1; for (let i = 0; i < 30; i++) for (let j = i + 1; j < 30; j++) { const a = s.grid[i], b = s.grid[j]; if (a && b && a.family === b.family && a.rank === b.rank) { sc.commitDrop(i, j, a.id); return; } } }; let n = 0; const t = setInterval(() => { if (sc.s.boss || n++ > 6) return clearInterval(t); k(); }, 900); }, 6200],
  stage_lost: [(sc) => { sc.s.timeLeft = 0.05; }, 2500],
  n13_card: [(sc) => { clearInterval(window.__bot); sc.closeModal(); Object.assign(sc.meta, { tips: {}, lessons: {}, tutorialDone: true, onboarded: true, levelStars: Object.fromEntries(Array.from({ length: 12 }, (_, i) => [i + 1, 2])) }); sc.openTitle('road'); sc.openLevelSheet(13); }, 900],
  n13_t1: [(sc) => { sc.closeModal(); sc.startLevel(13); }, 2500],
  n13_t2: [(sc) => {}, 3000],
  n13_t3: [(sc) => { window.__bot = setInterval(() => { const s = sc.s; if (s.phase !== 'playing' || sc.modal) return; for (let i = 0; i < 30; i++) for (let j = i + 1; j < 30; j++) { const a = s.grid[i], b = s.grid[j]; if (a && b && a.family === b.family && a.rank === b.rank) { sc.commitDrop(i, j, a.id); return; } } }, 2000); }, 9000],
  n13_t4: [(sc) => {}, 12000],
  n13_t5: [(sc) => {}, 15000],
  r34_clock: [(sc) => { clearInterval(window.__bot); sc.closeModal(); sc.meta.tips = new Proxy({}, { get: () => true, set: () => true }); sc.startLevel(22); sc.finishIntro(true); }, 2500],
  r34_clock10: [(sc) => { sc.s.timeLeft = 9.6; }, 700],
  r34_boss_wake: [(sc) => { sc.closeModal(); sc.meta.tips = { delivery: true, overdrive: true, full: true, clock: true, next_machine: true, x_chain: true, x_kick_fuse: true, x_kick_plain: true, tap_hint: true }; sc.startLevel(20); sc.finishIntro(true); const k = () => { const s = sc.s; s.hp = 1; for (let i = 0; i < 30; i++) for (let j = i + 1; j < 30; j++) { const a = s.grid[i], b = s.grid[j]; if (a && b && a.family === b.family && a.rank === b.rank) { sc.commitDrop(i, j, a.id); return; } } }; let n = 0; const t = setInterval(() => { if (sc.s.boss || n++ > 6) return clearInterval(t); k(); }, 900); }, 7500],
  r34_card13: [(sc) => { sc.closeModal(); sc.openTitle('road'); sc.openLevelSheet(13); }, 900],
  fs_l3_card: [(sc) => { clearInterval(window.__bot); sc.closeModal(); Object.assign(sc.meta, { tips: {}, lessons: { card: true }, tutorialDone: true, onboarded: true, levelStars: { 1: 2, 2: 2 } }); sc.openTitle('road'); sc.openLevelSheet(3); }, 900],
  fs_l3_play: [(sc) => { sc.closeModal(); sc.startLevel(3); setTimeout(() => { window.__bot = setInterval(() => { const s = sc.s; if (s.phase !== 'playing' || sc.modal || sc.explaining) return; for (let i = 0; i < 30; i++) for (let j = i + 1; j < 30; j++) { const a = s.grid[i], b = s.grid[j]; if (a && b && a.family === b.family && a.rank === b.rank) { sc.commitDrop(i, j, a.id); return; } } }, 2500); }, 2500); }, 14000],
  fs_l3_late: [(sc) => {}, 14000],
  fs_l4_card: [(sc) => { clearInterval(window.__bot); sc.closeModal(); Object.assign(sc.meta, { levelStars: { 1: 2, 2: 2, 3: 2 } }); sc.openTitle('road'); sc.openLevelSheet(4); }, 900],
  fs_l4_play: [(sc) => { sc.closeModal(); sc.startLevel(4); setTimeout(() => { window.__bot = setInterval(() => { const s = sc.s; if (s.phase !== 'playing' || sc.modal || sc.explaining) return; for (let i = 0; i < 30; i++) for (let j = i + 1; j < 30; j++) { const a = s.grid[i], b = s.grid[j]; if (a && b && a.family === b.family && a.rank === b.rank) { sc.commitDrop(i, j, a.id); return; } } }, 2500); }, 2500); }, 16000],
  r35_a: [(sc) => { clearInterval(window.__bot); sc.closeModal(); sc.meta.tips = new Proxy({}, { get: () => true, set: () => true }); sc.startLevel(11); sc.finishIntro(true); window.__bot = setInterval(() => { const s = sc.s; if (s.phase !== 'playing' || sc.modal || sc.explaining) return; const ps = []; for (let i = 0; i < 30; i++) for (let j = i + 1; j < 30; j++) { const a = s.grid[i], b = s.grid[j]; if (a && b && a.family === b.family && a.rank === b.rank) ps.push([i, j]); } if (ps.length) { const [i, j] = ps[Math.floor(Math.random() * ps.length)]; sc.commitDrop(i, j, s.grid[i].id); } }, 3000); }, 10000],
  r35_b: [(sc) => {}, 10000],
  r35_c: [(sc) => {}, 10000],
  r35_d: [(sc) => {}, 15000],
  trophy_machine: [(sc) => { clearInterval(window.__bot); sc.closeModal(); Object.assign(sc.meta, { tips: new Proxy({}, { get: () => true, set: () => true }), levelStars: Object.fromEntries(Array.from({ length: 30 }, (_, i) => [i + 1, 2])), bossMastery: { tin_can_king: 3, pressure_popper: 4, fridge_overlord: 3, carousel_crab: 2, viper_queen: 1 }, trophies: ['tin_can_king', 'pressure_popper', 'fridge_overlord'] }); sc.openTitle('machine'); }, 1200],
  trophy_drawer: [(sc) => { sc.openTrophies(); }, 900],
  // Screw Yard 2.0: each yard state starts its own yard (run them one per invocation: node tools/shots.mjs out yard_start)
  yard_events: [(sc) => { clearInterval(window.__bot); sc.closeModal(); Object.assign(sc.meta, { tips: new Proxy({}, { get: () => true, set: () => true }), levelStars: Object.fromEntries(Array.from({ length: 12 }, (_, i) => [i + 1, 2])), yard: undefined }); sc.openTitle('events'); }, 1000],
  yard_panel: [(sc) => { sc.closeModal(); sc.meta.yard = undefined; const r = sc.yardWeek(); Object.assign(r, { clears: 4, paid: 2, stars: { 1: 3, 2: 2, 3: 3, 4: 1 } }); sc.openYardEvent(); }, 900],
  yard_start: [(sc) => { sc.closeModal(); Object.assign(sc.meta, { tips: {}, yard: undefined }); sc.startYard(1); }, 1800],
  yard_mid: [(sc) => { sc.closeModal(); Object.assign(sc.meta, { tips: new Proxy({}, { get: () => true, set: () => true }), yard: undefined }); Object.assign(sc.yardWeek(), { clears: 2, stars: { 1: 3, 2: 2 } }); sc.startYard(3); const ys = window.__omm.game.scene.getScene('yard'); let k = 0; const t = setInterval(() => { if (!ys.st || ys.ended || ys.busy || k > 11) return k > 11 && clearInterval(t); const st = ys.st; const di = st.tray.findIndex((c) => st.boxes.some((b) => b && b.color === c && b.n < 3)); if (di >= 0) { k++; return ys.onDock(di); } const free = st.lvl.screws.filter((q) => !st.removed[q.id] && ys.screwAt(q.id).free && ys.pick(ys.screwAt(q.id).x, ys.screwAt(q.id).y) === q.id); const pv = st.lvl.queue.slice(st.qi, st.qi + 2); const soon = (c) => (st.boxes.some((b) => b && b.color === c) ? -1 : pv.includes(c) ? pv.indexOf(c) : 9); const q = free.sort((a, b) => soon(a.color) - soon(b.color))[0]; if (q) { k++; ys.onTap(ys.screwAt(q.id).x, ys.screwAt(q.id).y); } }, 600); }, 9500],
  yard_win: [(sc) => { sc.closeModal(); Object.assign(sc.meta, { tips: new Proxy({}, { get: () => true, set: () => true }), yard: undefined }); sc.startYard(1); const ys = window.__omm.game.scene.getScene('yard'); const t = setInterval(() => { if (!ys.st || ys.ended) return clearInterval(t); if (ys.busy) return; const st = ys.st; const di = st.tray.findIndex((c) => st.boxes.some((b) => b && b.color === c && b.n < 3)); if (di >= 0) return ys.onDock(di); const free = st.lvl.screws.filter((q) => !st.removed[q.id] && ys.screwAt(q.id).free && ys.pick(ys.screwAt(q.id).x, ys.screwAt(q.id).y) === q.id); const pv = st.lvl.queue.slice(st.qi, st.qi + 2); const soon = (c) => (st.boxes.some((b) => b && b.color === c) ? -1 : pv.includes(c) ? pv.indexOf(c) : 9); const q = free.sort((a, b) => soon(a.color) - soon(b.color))[0]; if (q) ys.onTap(ys.screwAt(q.id).x, ys.screwAt(q.id).y); }, 450); }, 30000],
  fm_l1_a: [(sc) => { clearInterval(window.__bot); sc.closeModal(); Object.assign(sc.meta, { tips: {}, lessons: {}, tutorialDone: true, onboarded: true, levelStars: {} }); sc.startLevel(1); setTimeout(() => { clearInterval(window.__bot); window.__bot = setInterval(() => { const s = sc.s; if (s.phase !== 'playing' || sc.modal || sc.explaining || sc.paused) return; const ps = []; for (let i = 0; i < 30; i++) for (let j = i + 1; j < 30; j++) { const a = s.grid[i], b = s.grid[j]; if (a && b && a.family === b.family && a.rank === b.rank) ps.push([i, j]); } if (ps.length) { const [i, j] = ps[Math.floor(Math.random() * ps.length)]; sc.commitDrop(i, j, s.grid[i].id); } }, 3000); const gi = setInterval(() => { if (sc.explaining) sc.nextExplain(); }, 1500); setTimeout(() => clearInterval(gi), 60000); }, 3000); }, 9000],
  fm_l1_b: [(sc) => {}, 12000],
  fm_l1_c: [(sc) => {}, 14000],
  fm_l2_a: [(sc) => { sc.closeModal(); Object.assign(sc.meta, { levelStars: { 1: 2 } }); sc.startLevel(2); setTimeout(() => { clearInterval(window.__bot); window.__bot = setInterval(() => { const s = sc.s; if (s.phase !== 'playing' || sc.modal || sc.explaining || sc.paused) return; const ps = []; for (let i = 0; i < 30; i++) for (let j = i + 1; j < 30; j++) { const a = s.grid[i], b = s.grid[j]; if (a && b && a.family === b.family && a.rank === b.rank) ps.push([i, j]); } if (ps.length) { const [i, j] = ps[Math.floor(Math.random() * ps.length)]; sc.commitDrop(i, j, s.grid[i].id); } }, 3000); const gi = setInterval(() => { if (sc.explaining) sc.nextExplain(); }, 1500); setTimeout(() => clearInterval(gi), 60000); }, 3000); }, 9000],
  fm_l2_b: [(sc) => {}, 14000],
  fm_l2_c: [(sc) => {}, 16000],
  units_all: [(sc) => { clearInterval(window.__bot); sc.closeModal(); Object.assign(sc.meta, { tips: new Proxy({}, { get: () => true, set: () => true }), levelStars: Object.fromEntries(Array.from({ length: 30 }, (_, i) => [i + 1, 2])), units: Object.fromEntries(['cannon','coil','bell','horn','fan','rocket','mortar','fuse_box','magnet','battery','amplifier','arc_welder','signal_beacon'].map((u) => [u, { level: 3, cards: 1 }])) }); sc.openTitle('units'); }, 1200],
  boss_beam: [(sc) => { clearInterval(window.__bot); sc.closeModal(); sc.meta.tips = new Proxy({}, { get: () => true, set: () => true }); sc.startLevel(20); sc.finishIntro(true); setTimeout(() => sc.handleEvents([{ type: 'bossWarn', attack: 'frost', target: { attack: 'frost', row: 2, cells: [10, 12, 14] }, deadline: 0 }]), 1500); }, 1900],
  r38_lost: [(sc) => { clearInterval(window.__bot); sc.closeModal(); sc.meta.tips = new Proxy({}, { get: () => true, set: () => true }); sc.meta.units = { ...(sc.meta.units ?? {}), cannon: { level: 4, cards: 9 } }; sc.startLevel(13); sc.finishIntro(true); setTimeout(() => { sc.s.timeLeft = 0.05; }, 1200); }, 3500],
  r38_wake: [(sc) => { clearInterval(window.__bot); sc.closeModal(); sc.meta.tips = { delivery: true, overdrive: true, full: true, clock: true, next_machine: true, x_chain: true, x_kick_fuse: true, x_kick_plain: true, tap_hint: true, stage_hud: true }; sc.startLevel(20); sc.finishIntro(true); const k = () => { const s = sc.s; s.hp = 1; for (let i = 0; i < 30; i++) for (let j = i + 1; j < 30; j++) { const a = s.grid[i], b = s.grid[j]; if (a && b && a.family === b.family && a.rank === b.rank) { sc.commitDrop(i, j, a.id); return; } } }; let n = 0; const t = setInterval(() => { if (sc.s.boss || n++ > 8) return clearInterval(t); k(); }, 900); }, 9000],
  trial_card: [(sc) => { clearInterval(window.__bot); sc.closeModal(); Object.assign(sc.meta, { tips: new Proxy({}, { get: () => true, set: () => true }), lessons: { card: true, boosters: true }, levelStars: Object.fromEntries(Array.from({ length: 12 }, (_, i) => [i + 1, 2])), trial: undefined }); sc.openTitle('road'); sc.openLevelSheet(13); }, 900],
  trial_on: [(sc) => { sc.meta.trial.on = true; sc.openLevelSheet(13); }, 700],
  trial_play: [(sc) => { sc.closeModal(); sc.startLevel(13); sc.finishIntro(true); }, 2500],
  crate_shake: [(sc) => { sc.openTitle('units'); sc.openNextCrate(); }, 450],
  newsquad: [(sc) => { clearInterval(window.__bot); sc.closeModal(); Object.assign(sc.meta, { tips: new Proxy({}, { get: () => true, set: () => true }), levelStars: Object.fromEntries(Array.from({ length: 30 }, (_, i) => [i + 1, 2])), units: Object.fromEntries(['cannon','coil','bell','horn','fan','rocket','mortar','fuse_box','magnet','battery','amplifier','arc_welder','signal_beacon'].map((u) => [u, { level: 4, cards: 1 }])), shooter: 'mortar', relays: ['horn', 'fuse_box'], toys: { amplifier: true }, trial: undefined }); sc.startLevel(25); sc.finishIntro(true); setTimeout(() => { window.__bot = setInterval(() => { const s = sc.s; if (s.phase !== 'playing' || sc.modal || sc.explaining || sc.paused) return; const ps = []; for (let i = 0; i < 30; i++) for (let j = i + 1; j < 30; j++) { const a = s.grid[i], b = s.grid[j]; if (a && b && a.family === b.family && a.rank === b.rank) ps.push([i, j]); } if (ps.length) { const [i, j] = ps[Math.floor(Math.random() * ps.length)]; sc.commitDrop(i, j, s.grid[i].id); } }, 1500); }, 1500); }, 22000],
  detail_welder: [(sc) => { sc.closeModal(); sc.openTitle('units'); sc.openUnitDetail({ id: 'arc_welder', role: 'SHOOTER', rarity: 'epic', slot: 'shooter' }); }, 2500],
  endless_road: [(sc) => { clearInterval(window.__bot); sc.closeModal(); Object.assign(sc.meta, { tips: new Proxy({}, { get: () => true, set: () => true }), levelStars: Object.fromEntries(Array.from({ length: 80 }, (_, i) => [i + 1, 2])), endless: { floor: 5, best: 4 } }); sc.openTitle('road'); }, 1000],
  endless_play: [(sc) => { sc.startEndless(); sc.finishIntro(true); }, 3000],
  endless_win: [(sc) => { sc.s.phase = 'won'; sc.openEndlessResult(true); }, 900],
  mastery_card: [(sc) => { clearInterval(window.__bot); sc.closeModal(); Object.assign(sc.meta, { tips: new Proxy({}, { get: () => true, set: () => true }), lessons: { card: true, boosters: true }, levelStars: Object.fromEntries(Array.from({ length: 30 }, (_, i) => [i + 1, 2])), sagaMedals: { 22: [1] }, trial: { date: 'x', unit: 'mortar', left: 0, on: false } }); sc.openTitle('road'); sc.openLevelSheet(22); }, 900],
  mastery_win: [(sc) => { sc.closeModal(); sc.startLevel(22); sc.finishIntro(true); setTimeout(() => { sc.s.stats.biggestChain = 12; sc.s.phase = 'won'; sc.openResult(true); }, 1500); }, 3200],
  season_road: [(sc) => { clearInterval(window.__bot); sc.closeModal(); Object.assign(sc.meta, { tips: new Proxy({}, { get: () => true, set: () => true }), levelStars: Object.fromEntries(Array.from({ length: 30 }, (_, i) => [i + 1, 2])) }); const r = sc.seasonRec(); r.xp = 840; r.daily = [3, 0, 1]; r.weekly = [6, 1, 0, 2]; r.claimed = { free: [1, 2, 3, 4, 5, 6], prem: [] }; sc.openTitle('road'); }, 1000],
  season_panel: [(sc) => { sc.openSeason(); }, 900],
  pz_events: [(sc) => { clearInterval(window.__bot); sc.closeModal(); Object.assign(sc.meta, { tips: { delivery: true, overdrive: true, full: true, clock: true, x_chain: true, tap_hint: true }, levelStars: Object.fromEntries(Array.from({ length: 12 }, (_, i) => [i + 1, 2])) }); sc.openTitle('events'); }, 1000],
  pz_play: [(sc) => { sc.startPuzzle(sc.dailyPuzzle(), 'daily'); }, 1800],
  pz_go: [(sc) => { if (sc.explaining) sc.nextExplain(); }, 800],
  pz_hint: [(sc) => { sc.puzzleHint(); }, 1200],
  pz_solve: [(sc) => { const d = sc.puzzleDef; let k = 0; const t = setInterval(() => { if (k >= d.solution.length) return clearInterval(t); const [f, to] = d.solution[k++]; sc.commitDrop(f, to, sc.s.grid[f].id); }, 1500); }, 6500],
  pz_drills: [(sc) => { sc.closeModal(); sc.meta.units = { ...(sc.meta.units ?? {}), horn: { level: 2, cards: 1 } }; sc.openUnitDetail({ id: 'horn', role: 'RELAY', rarity: 'common', slot: 'relay' }); }, 1200],
  pz_drill_list: [(sc) => { sc.openDrills({ id: 'horn', role: 'RELAY', rarity: 'common', slot: 'relay' }); }, 800],
  qa_tools: [(sc) => { sc.closeModal(); sc.openTitle('road'); sc.openQaTools(); }, 900],
  units_tab: [(sc) => { clearInterval(window.__bot); sc.closeModal(); Object.assign(sc.meta, { bolts: 500, gems: 120, levelStars: Object.fromEntries(Array.from({ length: 14 }, (_, i) => [i + 1, 2])), units: { cannon: { level: 2, cards: 9 }, coil: { level: 1, cards: 1 }, bell: { level: 1, cards: 0 }, rocket: { level: 1, cards: 0 } }, crates: { iron: 1, gold: 1 } }); sc.openTitle('units'); }, 1000],
  units_crate: [(sc) => { sc.openNextCrate(); }, 4500],
  units_detail: [(sc) => { sc.openUnitDetail({ id: 'cannon', role: 'SHOOTER', rarity: 'common', slot: 'shooter' }); }, 1800],
  units_shop: [(sc) => { sc.openUnitShop(); }, 800],
  u2_tab: [(sc) => { clearInterval(window.__bot); sc.closeModal(); Object.assign(sc.meta, { bolts: 900, gems: 260, levelStars: Object.fromEntries(Array.from({ length: 24 }, (_, i) => [i + 1, 2])), units: { cannon: { level: 3, cards: 9 }, coil: { level: 2, cards: 1 }, bell: { level: 1, cards: 0 }, fan: { level: 1, cards: 0 }, rocket: { level: 1, cards: 0 } }, crates: { wood: 1, gold: 1 } }); sc.openTitle('units'); }, 1000],
  u2_wood: [(sc) => { sc.meta.crates = { wood: 1, gold: 1 }; sc.openCrate('wood'); }, 3500],
  u2_gold: [(sc) => { sc.openCrate('gold'); }, 7500],
  u2_tab2: [(sc) => { sc.openTitle('units'); }, 1000],
  u2_detail: [(sc) => { const u = sc.meta.units; const id = ['arc_welder', 'signal_beacon', 'mortar', 'amplifier'].find((x) => u[x]) ?? 'horn'; sc.openUnitDetail({ id, role: 'SHOOTER', rarity: 'epic', slot: 'shooter' }); }, 2200],
  u2_shop: [(sc) => { sc.openUnitShop(); }, 800],
  u2_team: [(sc) => { sc.closeModal(); sc.openTitle('machine'); sc.openTeamSheet(); }, 900],
  u3_detail: [(sc) => { clearInterval(window.__bot); sc.closeModal(); Object.assign(sc.meta, { bolts: 900, units: { ...sc.meta.units, cannon: { level: 6, cards: 30 }, coil: { level: 1, cards: 0 }, bell: { level: 1, cards: 0 }, fan: { level: 1, cards: 0 } } }); sc.openUnitDetail({ id: 'cannon', role: 'SHOOTER', rarity: 'common', slot: 'shooter' }); }, 1800],
  u4_choice: [(sc) => { clearInterval(window.__bot); sc.closeModal(); Object.assign(sc.meta, { gems: 300, unitChoiceDone: false, units: { cannon: { level: 1, cards: 0 }, coil: { level: 1, cards: 0 }, bell: { level: 1, cards: 0 }, fan: { level: 1, cards: 0 } } }); sc.openCrate('iron'); }, 1200],
  u4_shop: [(sc) => { sc.openUnitShop(); }, 900],
  s3_level1_entry: [(sc) => { sc.startLevel(1); }, 900],
  s4_level1_result: [
    (sc) => {
      sc.finishIntro(true);
      sc.s.elapsed = 24;
      sc.s.stats.merges = 9;
      sc.s.stats.biggestChain = 5;
      sc.s.phase = 'won';
      sc.openResult(true);
    },
    1500,
  ],
  s5_road_after_l1: [(sc) => sc.openTitle('road'), 900],
  s6_level2_card: [(sc) => sc.openLevelSheet(2), 700],
  road: [
    (sc) => {
      Object.assign(sc.meta, { tutorialDone: true, hardUnlocked: true, bolts: 120, kits: 2, capsules: 1, levelStars: { 1: 3, 2: 2, 3: 3, 4: 1, 5: 2, 6: 1 } });
      sc.openTitle('road');
    },
    900,
  ],
  level_sheet: [(sc) => sc.openLevelSheet(7), 600],
  level_play: [
    (sc) => {
      sc.startLevel(9);
      sc.finishIntro(true);
    },
    1500,
  ],
  level_result: [
    (sc) => {
      sc.s.elapsed = 31;
      sc.s.stats.merges = 12;
      sc.s.phase = 'won';
      sc.openResult(true);
    },
    1400,
  ],
  shop: [(sc) => { sc.openTitle('road'); sc.openWalletInfo(); }, 700],
  level21: [
    (sc) => {
      sc.startLevel(21);
      sc.finishIntro(true);
      const s = sc.s;
      const mk = (f, r) => ({ id: s.nextId++, family: f, rank: r, cd: 99 });
      Object.assign(s.grid, { 0: mk('cannon', 7), 1: mk('cannon', 8), 2: mk('coil', 7), 3: mk('coil', 8), 5: mk('bell', 7), 6: mk('bell', 8) });
      sc.reconcile(true);
    },
    900,
  ],
  chest: [(sc) => { sc.meta.medals = { 1: true }; sc.openTitle('road'); sc.playChapterChest(1); }, 1600],
  machine_medals: [(sc) => { sc.meta.medals = { 1: true, 2: true }; sc.openTitle('machine'); }, 900],
  workshop_orn: [(sc) => { Object.assign(sc.meta, { bolts: 800, owned: ['brass_kit'], finish: 'brass_kit', ornament: null, mastery: { cannon: 4, coil: 3, bell: 5 } }); sc.openTitle('machine'); sc.openWorkshop('violet_pennant'); }, 800],
  showcase: [(sc) => { sc.meta.lessons = {}; sc.startShowcase(7, 21); }, 1500],
  workshop_stage: [(sc) => { Object.assign(sc.meta, { bolts: 900 }); sc.openTitle('machine'); sc.openWorkshop('night_shift'); }, 800],
  machine_night: [(sc) => { Object.assign(sc.meta, { stage: 'night_shift', ornament: 'violet_pennant' }); sc.openTitle('machine'); }, 900],
  mid_l12: [
    (sc) => {
      Object.assign(sc.meta, { tips: { delivery: true, overdrive: true, full: true, clock: true, next: true, x_chain: true, x_kick_fuse: true, x_kick_plain: true } });
      sc.startLevel(12);
      sc.finishIntro(true);
      const g = window.__omm;
      clearInterval(window.__bot);
      window.__bot = setInterval(() => {
        const s = sc.s;
        if (s.phase !== 'playing') return clearInterval(window.__bot);
        for (let i = 0; i < 30; i++) for (let j = i + 1; j < 30; j++) {
          const a = s.grid[i], b = s.grid[j];
          if (a && b && a.family === b.family && a.rank === b.rank) { sc.commitDrop(i, j, a.id); return; }
        }
      }, 900);
      void g;
    },
    8000,
  ],
  mid_l15: [(sc) => { clearInterval(window.__bot); sc.startLevel(15); sc.finishIntro(true); window.__bot = setInterval(() => { const s = sc.s; if (s.phase !== 'playing') return clearInterval(window.__bot); for (let i = 0; i < 30; i++) for (let j = i + 1; j < 30; j++) { const a = s.grid[i], b = s.grid[j]; if (a && b && a.family === b.family && a.rank === b.rank) { sc.commitDrop(i, j, a.id); return; } } }, 1100); }, 17500],
  mid_l21: [(sc) => { clearInterval(window.__bot); sc.startLevel(21); sc.finishIntro(true); window.__bot = setInterval(() => { const s = sc.s; if (s.phase !== 'playing') return clearInterval(window.__bot); for (let i = 0; i < 30; i++) for (let j = i + 1; j < 30; j++) { const a = s.grid[i], b = s.grid[j]; if (a && b && a.family === b.family && a.rank === b.rank) { sc.commitDrop(i, j, a.id); return; } } }, 800); }, 20000],
  boss_card: [(sc) => { clearInterval(window.__bot); Object.assign(sc.meta, { levelStars: Object.fromEntries(Array.from({ length: 9 }, (_, i) => [i + 1, 2])), hardUnlocked: true }); sc.openTitle('road'); sc.openLevelSheet(10); }, 800],
  boss_fight: [(sc) => { clearInterval(window.__bot); sc.startLevel(10); sc.finishIntro(true); sc.meta.tips = { ...sc.meta.tips, x_boss: true, x_chain: true }; window.__bot = setInterval(() => { const s = sc.s; if (s.phase !== 'playing') return clearInterval(window.__bot); for (let i = 0; i < 30; i++) for (let j = i + 1; j < 30; j++) { const a = s.grid[i], b = s.grid[j]; if (a && b && a.family === b.family && a.rank === b.rank) { sc.commitDrop(i, j, a.id); return; } } }, 2500); }, 9000],
  boss_lesson: [(sc) => { clearInterval(window.__bot); sc.meta.tips = { delivery: true, x_chain: true }; sc.startLevel(10); sc.finishIntro(true); }, 9500],
  boss_clamp: [(sc) => { clearInterval(window.__bot); sc.meta.tips = { ...sc.meta.tips, x_boss: true, delivery: true, x_chain: true }; sc.startLevel(10); sc.finishIntro(true); }, 11300],
  lv4_goal: [(sc) => { clearInterval(window.__bot); sc.meta.tips = { delivery: true, overdrive: true, full: true, clock: true, next: true, x_chain: true, x_kick_fuse: true, x_kick_plain: true, x_boss: true, x_suction: true }; sc.startLevel(4); sc.finishIntro(true); window.__bot = setInterval(() => { const s = sc.s; if (s.phase !== 'playing') return clearInterval(window.__bot); for (let i = 0; i < 30; i++) for (let j = i + 1; j < 30; j++) { const a = s.grid[i], b = s.grid[j]; if (a && b && a.family === b.family && a.rank === b.rank) { sc.commitDrop(i, j, a.id); return; } } }, 2500); }, 9000],
  lv8_shield: [(sc) => { clearInterval(window.__bot); sc.meta.tips = { delivery: true, overdrive: true, full: true, clock: true, next: true, x_chain: true, x_kick_fuse: true, x_kick_plain: true, x_boss: true, x_suction: true }; sc.startLevel(8); sc.finishIntro(true); window.__bot = setInterval(() => { const s = sc.s; if (s.phase !== 'playing') return clearInterval(window.__bot); for (let i = 0; i < 30; i++) for (let j = i + 1; j < 30; j++) { const a = s.grid[i], b = s.grid[j]; if (a && b && a.family === b.family && a.rank === b.rank) { sc.commitDrop(i, j, a.id); return; } } }, 2500); }, 6000],
  lv9_suction: [(sc) => { clearInterval(window.__bot); sc.meta.tips = { delivery: true, overdrive: true, full: true, clock: true, next: true, x_chain: true, x_kick_fuse: true, x_kick_plain: true, x_boss: true, x_suction: true }; sc.meta.tips.x_suction = false; sc.startLevel(9); sc.finishIntro(true); }, 10600],
  lv10_guided: [(sc) => { clearInterval(window.__bot); sc.meta.tips = { delivery: true, overdrive: true, full: true, clock: true, next: true, x_chain: true, x_kick_fuse: true, x_kick_plain: true, x_boss: true, x_suction: true }; sc.meta.tips.x_boss = false; sc.meta.tips.x_boss_guided = false; sc.startLevel(10); sc.finishIntro(true); }, 9200],
  card6: [(sc) => { clearInterval(window.__bot); sc.meta.lessons = { card: true, boosters: true, road: true }; sc.openTitle('road'); sc.openLevelSheet(6); }, 800],
  card8: [(sc) => { clearInterval(window.__bot); sc.meta.lessons = { card: true, boosters: true, road: true }; sc.openTitle('road'); sc.openLevelSheet(8); }, 800],
  lv4_goalwin: [(sc) => { clearInterval(window.__bot); sc.meta.tips = { delivery: true, overdrive: true, full: true, clock: true, next: true, x_chain: true, x_kick_fuse: true, x_kick_plain: true, x_boss: true, x_suction: true }; sc.startLevel(4); sc.finishIntro(true); window.__bot = setInterval(() => { const s = sc.s; if (s.phase !== 'playing') return clearInterval(window.__bot); let best = null; for (let i = 0; i < 30; i++) for (let j = i + 1; j < 30; j++) { const a = s.grid[i], b = s.grid[j]; if (a && b && a.family === b.family && a.rank === b.rank && (!best || a.rank > s.grid[best[0]].rank)) best = [i, j]; } if (best) sc.commitDrop(best[0], best[1], s.grid[best[0]].id); }, 700); }, 22000],
  lv10_dodged: [(sc) => { clearInterval(window.__bot); const g = sc.guided; if (g) sc.commitDrop(g.from, g.to, sc.s.grid[g.from].id); }, 2700],
  boss_phase: [(sc) => { sc.s.hp = sc.s.maxHp * 0.6; }, 1500],
  boss_clean: [(sc) => { clearInterval(window.__bot); sc.meta.tips = { delivery: true, overdrive: true, full: true, clock: true, next: true, x_chain: true, x_kick_fuse: true, x_kick_plain: true, x_boss: true }; sc.startLevel(40); sc.finishIntro(true); window.__bot = setInterval(() => { const s = sc.s; if (s.phase !== 'playing') return clearInterval(window.__bot); for (let i = 0; i < 30; i++) for (let j = i + 1; j < 30; j++) { const a = s.grid[i], b = s.grid[j]; if (a && b && a.family === b.family && a.rank === b.rank) { sc.commitDrop(i, j, a.id); return; } } }, 1800); }, 11500],
  boss_split: [(sc) => { clearInterval(window.__bot); sc.startLevel(60); sc.finishIntro(true); window.__bot = setInterval(() => { const s = sc.s; if (s.phase !== 'playing') return clearInterval(window.__bot); for (let i = 0; i < 30; i++) for (let j = i + 1; j < 30; j++) { const a = s.grid[i], b = s.grid[j]; if (a && b && a.family === b.family && a.rank === b.rank) { sc.commitDrop(i, j, a.id); return; } } }, 1800); }, 21500],
  boss_win: [(sc) => { clearInterval(window.__bot); sc.s.hp = 1; sc.s.thresholds = 3; const s = sc.s; for (let i = 0; i < 30; i++) for (let j = i + 1; j < 30; j++) { const a = s.grid[i], b = s.grid[j]; if (a && b && a.family === b.family && a.rank === b.rank) { sc.commitDrop(i, j, a.id); return; } } }, 2600],
  stats: [(sc) => { sc.openTitle('road'); sc.openPlaytestStats(); }, 600],
  events: [(sc) => sc.openTitle('events'), 700],
  home: [
    (sc) => {
      const m = sc.meta;
      Object.assign(m, { tutorialDone: true, hardUnlocked: true, mastery: { cannon: 4, coil: 2, bell: 5, magnet: 3 }, bolts: 47, toys: { magnet: true }, bestChain: 18 });
      sc.openTitle();
    },
    900,
  ],
  home_new_player: [
    (sc) => {
      Object.assign(sc.meta, { tutorialDone: true, hardUnlocked: false, mastery: {}, bolts: 0, toys: {}, bestChain: 0 });
      sc.openTitle();
    },
    900,
  ],
  team: [
    (sc) => {
      Object.assign(sc.meta, { hardUnlocked: true, shooter: 'rocket', toys: { magnet: true, battery: false }, mastery: { cannon: 4, coil: 2, bell: 5, rocket: 3 } });
      sc.openTitle();
      sc.openTeamSheet();
    },
    600,
  ],
  home_rocket: [
    (sc) => sc.openTitle(),
    800,
  ],
  workshop: [
    (sc) => {
      Object.assign(sc.meta, { mastery: { cannon: 4, coil: 2, bell: 5, magnet: 3 }, bolts: 47, owned: ['brass_kit'], finish: 'brass_kit', toys: { magnet: true } });
      sc.openTitle();
      sc.openWorkshop('mint_paint');
    },
    700,
  ],
  gameplay_chain_explainer: [
    (sc) => {
      sc.closeModal();
      sc.meta.tips = { delivery: true, overdrive: true, full: true, clock: true, next: true };
      sc.meta.toys = {};
      sc.retry(false, -1);
      sc.finishIntro(true);
      const s = sc.s;
      const mk = (f, r) => ({ id: s.nextId++, family: f, rank: r, cd: 30 });
      s.grid.fill(null);
      Object.assign(s.grid, { 16: mk('coil', 2), 17: mk('coil', 2), 12: mk('cannon', 2), 22: mk('bell', 1), 20: mk('cannon', 1), 21: mk('coil', 1), 3: mk('bell', 2), 9: mk('cannon', 1) });
      sc.reconcile(true);
      sc.commitDrop(16, 17, s.grid[16].id);
    },
    2600,
  ],
  chain_card2: [(sc) => sc.nextExplain(), 1000],
  inspect_coil: [
    (sc) => {
      sc.closeModal();
      sc.coach.clear();
      sc.explaining = false;
      sc.explainQueue = [];
      sc.retry(false, -1);
      sc.finishIntro(true);
      const s = sc.s;
      const mk = (f, r) => ({ id: s.nextId++, family: f, rank: r, cd: 30 });
      s.grid.fill(null);
      Object.assign(s.grid, { 12: mk('coil', 2), 2: mk('cannon', 1), 14: mk('bell', 1), 22: mk('cannon', 3), 11: mk('bell', 1) });
      sc.reconcile(true);
      sc.openInspect(12);
    },
    500,
  ],
  // clarity pass 1: board marks (amp + item on one cannon, prime on another), their inspect card, guide + legend
  marks_board: [
    (sc) => {
      clearInterval(window.__bot);
      sc.closeModal();
      sc.coach.clear();
      sc.explaining = false;
      sc.explainQueue = [];
      sc.meta.tips = new Proxy({}, { get: () => true, set: () => true });
      sc.retry(false, -1);
      sc.finishIntro(true);
      const s = sc.s;
      const mk = (f, r, x = {}) => ({ id: s.nextId++, family: f, rank: r, cd: 30, ...x });
      s.grid.fill(null);
      Object.assign(s.grid, { 12: mk('cannon', 3, { amp: 1.3, item: { kind: 'overcharge', charges: 2 } }), 13: mk('amplifier', 1), 17: mk('cannon', 2, { primed: true, amp: 1.15 }), 16: mk('battery', 1), 7: mk('coil', 2), 22: mk('bell', 1) });
      sc.reconcile(true);
    },
    900,
  ],
  marks_inspect: [(sc) => sc.openInspect(12), 600],
  marks_tip: [(sc) => { sc.closeInspect?.(); sc.meta.tips = { delivery: true, overdrive: true, full: true, clock: true, next: true, next_machine: true, tap_hint: true }; sc.paused = false; }, 1400],
  marks_boss_hot: [(sc) => { sc.closeModal(); sc.coach.clear(); sc.explaining = false; sc.explainQueue = []; sc.meta.tips = new Proxy({}, { get: () => true, set: () => true }); const s = sc.s; s.boss = { def: 3, next: 99, phaseShown: 0, pending: null, active: { col: 2, until: s.elapsed + 30 } }; sc.paused = true; }, 600],
  marks_boss_inspect: [(sc) => { sc.openInspect(17); }, 600],
  marks_boss_clamp: [(sc) => { sc.closeInspect(); const s = sc.s; s.boss = { def: 0, next: 99, phaseShown: 0, pending: null, active: { cells: [12], until: s.elapsed + 30 } }; sc.paused = true; }, 600],
  marks_guide_amp: [(sc) => { sc.coach.clear(); sc.explaining = false; sc.explainQueue = []; sc.meta.hardUnlocked = true; sc.meta.units = { ...(sc.meta.units ?? {}), amplifier: { level: 1, cards: 0 }, signal_beacon: { level: 1, cards: 0 }, battery: { level: 1, cards: 0 } }; sc.openHowTo(sc.guidePages().findIndex((p) => p.key === 'amplifier')); }, 350],
  marks_guide_battery: [(sc) => { sc.openHowTo(sc.constructor.GUIDE.findIndex((p) => p.key === 'battery')); }, 350],
  marks_legend: [(sc) => { sc.openHowTo(Math.max(0, sc.constructor.GUIDE.findIndex((p) => p.key === 'marks'))); }, 900],
  marks2_legend: [(sc) => { sc.openHowTo(Math.max(0, sc.constructor.GUIDE.findIndex((p) => p.key === 'marks2'))); }, 900],
  overdrive_guide: [(sc) => { sc.openHowTo(Math.max(0, sc.constructor.GUIDE.findIndex((p) => p.key === 'overdrive'))); }, 900],
  // phone layout QA (390x844): guide legend pages, merge-preview chips on top-row targets, puzzle MERGES LEFT
  guide_marks: [(sc) => { clearInterval(window.__bot); sc.closeModal(); sc.openHowTo(sc.constructor.GUIDE.findIndex((p) => p.key === 'marks')); }, 900],
  guide_marks2: [(sc) => { sc.openHowTo(sc.constructor.GUIDE.findIndex((p) => p.key === 'marks2')); }, 900],
  chips_top_left: [(sc) => { clearInterval(window.__bot); sc.closeModal(); sc.coach.clear(); sc.explaining = false; sc.explainQueue = []; sc.meta.tips = new Proxy({}, { get: () => true, set: () => true }); sc.startLevel(22); sc.finishIntro(true); const s = sc.s; const mk = (f, r, x = {}) => ({ id: s.nextId++, family: f, rank: r, cd: 30, ...x }); s.grid.fill(null); Object.assign(s.grid, { 0: mk('cannon', 2, { amp: 1.3, primed: true }), 4: mk('cannon', 2, { amp: 1.15 }), 2: mk('cannon', 2), 7: mk('coil', 2), 6: mk('bell', 1), 12: mk('cannon', 2), 1: mk('amplifier', 1), 3: mk('battery', 1) }); sc.reconcile(true); setTimeout(() => { sc.input.activePointer.isDown = true; sc.paused = true; sc.dragIdx = 12; sc.dragId = s.grid[12].id; sc.moved = true; sc.hoverIdx = 0; sc.drawHeld(); }, 700); }, 1300],
  chips_top_right: [(sc) => { sc.hoverIdx = 4; sc.drawHeld(); }, 600],
  chips_top_mid: [(sc) => { sc.hoverIdx = 2; sc.drawHeld(); }, 600],
  // live hit formula (rival study #3): the lane strip while holding a match, the post-drop ribbon, and a long formula that wraps
  formula_strip: [(sc) => { clearInterval(window.__bot); sc.closeModal(); sc.coach.clear(); sc.explaining = false; sc.explainQueue = []; sc.meta.tips = new Proxy({}, { get: () => true, set: () => true }); sc.startLevel(22); sc.finishIntro(true); const s = sc.s; const mk = (f, r, x = {}) => ({ id: s.nextId++, family: f, rank: r, cd: 30, ...x }); s.grid.fill(null); Object.assign(s.grid, { 12: mk('cannon', 2, { amp: 1.3 }), 27: mk('cannon', 2), 7: mk('coil', 2), 11: mk('bell', 2), 2: mk('rocket', 2), 14: mk('cannon', 1), 13: mk('battery', 1) }); sc.reconcile(true); setTimeout(() => { sc.input.activePointer.isDown = true; sc.paused = true; sc.dragIdx = 27; sc.dragId = s.grid[27].id; sc.moved = true; sc.hoverIdx = 12; sc.drawHeld(); }, 700); }, 1300],
  formula_ribbon: [(sc) => { const id = sc.s.grid[27].id; sc.input.activePointer.isDown = false; sc.dragIdx = -1; sc.hoverIdx = -1; sc.moved = false; sc.commitDrop(27, 12, id); sc.drawHeld(); }, 1500],
  formula_wrap: [(sc) => { const s = sc.s; const mk = (f, r, x = {}) => ({ id: s.nextId++, family: f, rank: r, cd: 30, ...x }); s.grid.fill(null); s.odLeft = 5; s.maxHp = s.hp = 300; Object.assign(s.grid, { 12: mk('cannon', 4, { amp: 1.3, primed: true, item: { kind: 'overcharge', charges: 2 } }), 27: mk('cannon', 4), 7: mk('coil', 2), 11: mk('bell', 2), 2: mk('rocket', 2, { amp: 1.15 }), 14: mk('cannon', 1, { primed: true }), 13: mk('amplifier', 1) }); sc.reconcile(true); setTimeout(() => { sc.input.activePointer.isDown = true; sc.paused = true; sc.dragIdx = 27; sc.dragId = s.grid[27].id; sc.moved = true; sc.hoverIdx = 12; sc.chipKey = ''; sc.drawHeld(); }, 500); }, 1100],
  formula_wrap_ribbon: [(sc) => { const id = sc.s.grid[27].id; sc.input.activePointer.isDown = false; sc.dragIdx = -1; sc.hoverIdx = -1; sc.moved = false; sc.commitDrop(27, 12, id); sc.drawHeld(); }, 2000],
  pz_label: [(sc) => { clearInterval(window.__bot); sc.input.activePointer.isDown = false; sc.paused = false; sc.dragIdx = -1; sc.hoverIdx = -1; sc.drawHeld(); sc.closeModal(); sc.meta.tips = new Proxy({}, { get: () => true, set: () => true }); sc.startPuzzle(sc.dailyPuzzle(), 'daily'); setTimeout(() => { if (sc.explaining) sc.nextExplain(); }, 1200); }, 2400],
  // clarity pass 3: a tap on a closed corner with a loose part about to land beside it
  cell_card: [(sc) => { sc.closeModal(); sc.meta.tips = { ...sc.meta.tips, tap_hint: true }; sc.startLevel(5); sc.finishIntro(true); setTimeout(() => { sc.coach.clear(); sc.explaining = false; sc.explainQueue = []; sc.paused = false; const e = sc.s.grid.map((x, i) => (x ? -1 : i)).filter((i) => i >= 0); sc.s.masked = [e[e.length - 1]]; sc.openCellCard(e[e.length - 1]); }, 500); }, 1500],
  intro_mid: [
    (sc) => {
      sc.closeModal();
      sc.retry(false, -1);
    },
    800,
  ],
  pause: [
    (sc) => {
      sc.coach.clear();
      sc.paused = false;
      sc.explaining = false;
      sc.openPause();
    },
    600,
  ],
  // merge juice v2 (rival study #4/#10/#11): a held part with its matches leaning in, the idle pair blink, a big chain's
  // counter in its hold, and the 'so close' lose line. Run alone: node tools/shots.mjs shots fx_drag fx_idle fx_chain fx_lose
  fx_drag: [(sc) => { clearInterval(window.__bot); sc.closeModal(); sc.meta.tips = new Proxy({}, { get: () => true, set: () => true }); sc.startLevel(22); sc.finishIntro(true); setTimeout(() => { sc.coach.clear(); sc.explaining = false; sc.explainQueue = []; sc.paused = true; const s = sc.s; let pick = -1; for (let i = 0; i < 30 && pick < 0; i++) for (let j = 0; j < 30; j++) if (i !== j && s.grid[i] && s.grid[j] && s.grid[i].family === s.grid[j].family && s.grid[i].rank === s.grid[j].rank) { pick = i; break; } if (pick < 0) return; const m = s.grid.findIndex((g, j) => j !== pick && g && g.family === s.grid[pick].family && g.rank === s.grid[pick].rank); if (m >= 0) s.grid[m].primed = true; sc.input.activePointer.isDown = true; sc.dragIdx = pick; sc.dragId = s.grid[pick].id; sc.dragView = sc.views.get(sc.dragId); sc.moved = true; sc.dragView.setDepth(55).setPosition(sc.dragView.x + 150, sc.dragView.y - 60); }, 900); }, 1700],
  fx_idle: [(sc) => { sc.input.activePointer.isDown = false; sc.dragIdx = -1; sc.dragView = null; sc.moved = false; sc.reconcile(true); sc.paused = false; sc.idleTime = 6.5; sc.partReact.blinkFrom = sc.time.now - 1600 * 3 - 260; }, 60],
  fx_chain: [(sc) => { sc.paused = false; const s = sc.s; const cells = s.grid.map((g, i) => (g ? i : -1)).filter((i) => i >= 0).slice(0, 10); const acts = cells.map((idx, k) => ({ id: s.grid[idx].id, idx, family: s.grid[idx].family, rank: s.grid[idx].rank, depth: Math.min(k, 6), parent: -1, charge: 1, contribution: 10 })); sc.playCascade({ rootIdx: cells[0], activations: acts, edges: [], count: acts.length, total: 120 }, false, false); }, 760],
  fx_lose: [(sc) => { clearInterval(window.__bot); sc.closeModal(); sc.startLevel(22); sc.finishIntro(true); setTimeout(() => { sc.coach.clear(); sc.explaining = false; sc.explainQueue = []; sc.paused = false; const s = sc.s; if (s.stage) { s.stage.i = s.stage.hps.length - 1; s.maxHp = s.stage.hps[s.stage.i]; } s.hp = Math.round(s.maxHp * 0.08); s.stats.merges = 20; s.stats.totalDamage = Math.round(s.maxHp * 0.045 * 20); s.timeLeft = 0.05; }, 600); }, 3600],
  result_win: [
    (sc) => {
      sc.coach.clear();
      sc.paused = false;
      sc.explaining = false;
      sc.runBest = { cannon: 4, coil: 3, bell: 2 };
      sc.s.phase = 'won';
      sc.s.target = 2;
      sc.s.elapsed = 96.4;
      sc.s.stats.merges = 31;
      sc.s.stats.biggestChain = 14;
      sc.openResult(true);
    },
    900,
  ],
};
const only = args.slice(1);
for (const [name, [fn, ms]] of Object.entries(states)) {
  if (only.length && !only.includes(name)) continue;
  await page.evaluate(`(${fn.toString()})(window.__omm.game.scene.getScene('game'))`);
  await wait(ms);
  await page.screenshot({ path: `${out}/${name}.png` });
  console.log('saved', `${out}/${name}.png`);
}
await browser.close();
await server.close();
