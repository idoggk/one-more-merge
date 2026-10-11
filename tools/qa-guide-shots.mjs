// Screenshots for docs/qa-guide: every QA panel control (highlighted) plus what it changes in the game.
// Starts its own Vite server and one fresh browser context per scenario (so QA switches never leak between shots).
// Usage: node tools/qa-guide-shots.mjs [outDir] [scenario ...]   (default outDir docs/qa-guide/img, 390x844 @ DPR 2)
import puppeteer from 'puppeteer-core';
import { createServer } from 'vite';
import { mkdirSync } from 'node:fs';

const args = process.argv.slice(2);
const out = args[0] ?? 'docs/qa-guide/img';
const only = args.slice(1);
mkdirSync(out, { recursive: true });
const CHROME = process.env.CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const server = await createServer({ server: { port: 5231, strictPort: false, host: '127.0.0.1' }, logLevel: 'error' });
await server.listen();
const URL = `${server.resolvedUrls.local[0]}?timer`;
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const ALL_TIPS = '__ALL_TIPS__';
/** Known-good meta: tutorial done, every tip seen, the first `stars` levels cleared. */
const baseMeta = (stars = 12, extra = {}) => ({ tutorialDone: true, onboarded: true, tips: ALL_TIPS, lessons: { card: true, boosters: true, road: true }, levelStars: Object.fromEntries(Array.from({ length: stars }, (_, i) => [i + 1, 2])), ...extra });

/** Open a page in a fresh context with `keys` already in localStorage, then run `fn(api)`. */
async function scenario(name, keys, fn) {
  if (only.length && !only.includes(name)) return;
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  page.on('pageerror', (e) => console.log('PAGEERROR', name, e.message));
  await page.evaluateOnNewDocument((k) => { for (const [a, b] of Object.entries(k)) localStorage.setItem(a, b); }, keys);
  await page.goto(URL, { waitUntil: 'networkidle0', timeout: 120000 });
  await page.waitForFunction(() => window.__omm?.game?.scene?.getScene('game')?.s, { timeout: 30000 });
  const sc = '(window.__omm.game.scene.getScene("game"))';
  const api = {
    page,
    wait,
    /** run `fn(scene, arg)` in the page */
    ev: (f, arg) => page.evaluate(`(${f.toString()})(${sc}, ${JSON.stringify(arg ?? null)})`),
    /** apply a baseMeta to the live scene and close whatever is open */
    setup: (stars, extra) => api.ev((s, m) => {
      clearInterval(window.__bot);
      s.closeModal();
      const tips = new Proxy({}, { get: () => true, set: () => true });
      Object.assign(s.meta, m.meta, m.meta.tips === '__ALL_TIPS__' ? { tips } : {});
    }, { meta: baseMeta(stars, extra) }),
    shot: async (file, o = {}) => {
      if (o.hl) await api.highlight(o.hl);
      await wait(o.ms ?? 300);
      await page.screenshot({ path: `${out}/${file}.png` });
      if (o.hl) await page.evaluate(() => document.querySelectorAll('.qa-hl').forEach((e) => e.remove()));
      console.log('saved', name, file);
    },
    /** tap a button/text whose label matches (brackets ignored); looks inside the modal sheet or the scene */
    tap: (label, nth = 0, prefix = false) => api.ev((s, a) => {
      const norm = (t) => String(t ?? '').replace(/^\[|\]$/g, '');
      const hits = [];
      const walk = (o) => {
        if (o.type === 'Container' && o.input && o.list?.[1] && (norm(o.list[1].text) === a.label || (a.prefix && norm(o.list[1].text).startsWith(a.label)))) hits.push(o);
        else if (o.type === 'Text' && o.input && norm(o.text) === a.label) hits.push(o);
        if (o.list) o.list.forEach(walk);
      };
      (s.modal ? [s.modal] : s.children.list).forEach(walk);
      const b = hits[a.nth];
      if (!b) throw new Error('no button ' + a.label);
      b.emit('pointerdown');
      b.emit('pointerup');
    }, { label, nth, prefix }),
    /** scroll the QA sheet so the labelled item is mid-window (set list.y directly: the mask is in world coords) */
    scrollTo: (label) => api.ev(async (s, a) => {
      const { qaGeometry } = await import('/src/game/ui/qaLayout.ts');
      const { QA_ROWS } = await import('/src/game/ui/qaPanel.ts');
      const H = (s.scale.height * 720) / s.scale.width;
      const geo = qaGeometry(QA_ROWS.map((r) => r.h), H);
      const list = s.modal.list.find((o) => o.type === 'Container' && o.mask);
      const t = (o) => String(o.text ?? '').replace(/^\[|\]$/g, '');
      let y = null;
      const walk = (o) => {
        const lab = o.type === 'Container' ? o.list?.[1] : o;
        if (y === null && lab && t(lab).startsWith(a.label)) y = o.type === 'Container' ? o.y : o.y;
        if (o.list) o.list.forEach(walk);
      };
      list.list.forEach(walk);
      if (y === null) throw new Error('no label ' + a.label);
      const top = H / 2 - Math.min(H - 60, geo.contentBottom) / 2;
      const mid = top + (geo.bodyTop + geo.bodyBottom) / 2;
      list.setY(Math.max(geo.minScroll, Math.min(0, mid - y - 30)));
    }, { label }),
    /** red box around the union of the items whose labels start with each string in `labels` */
    highlight: (labels) => page.evaluate(async (a) => {
      const s = window.__omm.game.scene.getScene('game');
      const list = s.modal?.list.find((o) => o.type === 'Container' && o.mask);
      const root = s.modal ?? null; void list;
      const norm = (t) => String(t ?? '').replace(/^\[|\]$/g, '');
      let r = null;
      const add = (b) => { r = r ? { x1: Math.min(r.x1, b.x), y1: Math.min(r.y1, b.y), x2: Math.max(r.x2, b.right), y2: Math.max(r.y2, b.bottom) } : { x1: b.x, y1: b.y, x2: b.right, y2: b.bottom }; };
      const walk = (o) => {
        const lab = o.type === 'Container' ? o.list?.[1] : o;
        if (lab && lab.text !== undefined && a.labels.some((l) => norm(lab.text).startsWith(l)) && (o.type === 'Text' || o.input)) add(o.getBounds());
        if (o.list) o.list.forEach(walk);
      };
      (root ? root.list : s.children.list).forEach(walk);
      if (!r) throw new Error('highlight: nothing for ' + a.labels);
      const cv = document.querySelector('canvas').getBoundingClientRect();
      const k = cv.width / 720, pad = 8;
      const d = document.createElement('div');
      d.className = 'qa-hl';
      Object.assign(d.style, { position: 'fixed', left: cv.left + r.x1 * k - pad + 'px', top: cv.top + r.y1 * k - pad + 'px', width: (r.x2 - r.x1) * k + 2 * pad + 'px', height: (r.y2 - r.y1) * k + 2 * pad + 'px', border: '3px solid #ff2d55', borderRadius: '10px', boxShadow: '0 0 0 2px #fff, 0 0 12px #ff2d55', pointerEvents: 'none', zIndex: 99999 });
      document.body.appendChild(d);
    }, { labels: [].concat(labels) }),
    close: () => ctx.close(),
  };
  try {
    await fn(api);
  } catch (e) {
    console.log('FAILED', name, e.message.split('\n')[0]);
  }
  await ctx.close();
}

// ---------------------------------------------------------------- scenarios
const openQa = async (a) => { await a.setup(); await a.ev((s) => { s.openTitle('road'); s.openQaTools(); }); await wait(700); };

/** Open the QA panel, tap `taps` (labels, in order), scroll to 'top' | 'bottom', outline `hl`, save `file`. */
const panelShot = async (a, file, { taps = [], view = 'top', hl, ms } = {}) => {
  await openQa(a);
  for (const t of [].concat(taps)) { await a.tap(t); await wait(450); }
  await a.ev(async (s, v) => {
    const { qaGeometry } = await import('/src/game/ui/qaLayout.ts');
    const { QA_ROWS } = await import('/src/game/ui/qaPanel.ts');
    const H = (s.scale.height * 720) / s.scale.width;
    const geo = qaGeometry(QA_ROWS.map((r) => r.h), H);
    s.modal.list.find((o) => o.type === 'Container' && o.mask).setY(v === 'bottom' ? geo.minScroll : 0);
  }, view);
  await a.shot(file, { hl, ms });
};
/** A level in play on the road's standard meta; QA keys come from `scenario(..., keys, ...)`. */
const playLevel = async (a, level, { stars = level, extra = {}, intro = true } = {}) => {
  await a.setup(stars, extra);
  await a.ev((s, l) => { s.startLevel(l); s.finishIntro(true); s.coach.clear(); s.explaining = false; s.explainQueue = []; }, level);
};
/** Merge the first same-family same-rank pair on the board (what a tap-drag does). */
const mergePair = (a, rankMin = 0) => a.ev((s, r) => {
  const g = s.s.grid;
  for (let i = 0; i < 30; i++) for (let j = i + 1; j < 30; j++) if (g[i] && g[j] && g[i].family === g[j].family && g[i].rank === g[j].rank && g[i].rank >= r) return s.commitDrop(i, j, g[i].id);
  return false;
}, rankMin);
const K = { pace: 'omm_qa_pace', units: 'omm_qa_units_b0', think: 'omm_qa_think_bank', spam: 'omm_qa_spam_variant', rule: 'omm_qa_merge_rule', crates: 'omm_qa_crates', yard: 'omm_qa_screw_yard', plan: 'omm_qa_roster_unlocks', shake: 'omm_shake' };
const ALL_ON = { omm_qa_units_b0: 'rb', omm_qa_roster_unlocks: 'on', ...Object.fromEntries([1, 2, 3, 4, 5, 6, 7].map((n) => [`omm_qa_roster_${n}`, 'on'])) };

// ---- 0) the whole panel in two screens, the pinned header, BACK
await scenario('panel', {}, async (a) => {
  await panelShot(a, 'panel_top', { view: 'top' });
  await panelShot(a, 'panel_bottom', { view: 'bottom' });
  await panelShot(a, 'panel_back', { hl: 'BACK' });
});
await scenario('settings', {}, async (a) => {
  await a.setup();
  await a.ev((s) => { s.openTitle('road'); s.openSettings(); });
  await a.shot('settings', { ms: 700 });
  await a.shot('settings_shake_hl', { hl: 'SCREEN SHAKE' });
  await a.shot('settings_build_hl', { hl: 'Build' });
  await a.tap('SCREEN SHAKE', 0, true);
  await a.shot('settings_shake_2', { ms: 900 });
  await a.tap('SCREEN SHAKE', 0, true);
  await a.shot('settings_shake_3', { ms: 900 });
});

// ---- 1) START OVER
await scenario('startover', {}, async (a) => {
  await panelShot(a, 'startover_armed', { taps: 'START OVER (WIPE ALL)', hl: 'TAP AGAIN TO WIPE' });
});
await scenario('fresh', {}, async (a) => {
  await a.wait(2500);
  await a.shot('startover_after', { ms: 800 });
});

// ---- 2) JUMP TO LEVEL
await scenario('jump', {}, async (a) => {
  await a.setup(12);
  await a.ev((s) => s.openTitle('road'));
  await a.shot('jump_before', { ms: 900 });
  await panelShot(a, 'jump_panel', { taps: ['+10'], hl: ['JUMP TO LEVEL', '-10', '-1', '+1', '+10', 'GO'] });
  await a.tap('GO');
  await a.shot('jump_after', { ms: 1200 });
});

// ---- 3) ALL UNITS (LV 5), UNLOCK ALL, BOLTS/GEMS, CRATES
const fewUnits = { bolts: 500, gems: 120, units: { cannon: { level: 2, cards: 9 }, coil: { level: 1, cards: 1 }, bell: { level: 1, cards: 0 }, rocket: { level: 1, cards: 0 } }, crates: {} };
await scenario('allunits', {}, async (a) => {
  await a.setup(14, fewUnits);
  await a.ev((s) => s.openTitle('units'));
  await a.shot('allunits_before', { ms: 900 });
  await openQa(a);
  await a.tap('ALL UNITS (LV 5)');
  await a.shot('allunits_panel', { hl: 'ALL UNITS (LV 5)', ms: 500 });
  await a.ev((s) => s.openTitle('units'));
  await a.shot('allunits_after', { ms: 900 });
});
await scenario('unlockall', {}, async (a) => {
  await a.setup(3, { hardUnlocked: false });
  await a.ev((s) => s.openTitle('machine'));
  await a.shot('unlockall_before', { ms: 900 });
  await openQa(a);
  await a.tap('UNLOCK ALL');
  await a.shot('unlockall_panel', { hl: 'UNLOCK ALL', ms: 500 });
  await a.ev((s) => s.openTitle('machine'));
  await a.shot('unlockall_after', { ms: 900 });
});
await scenario('bolts', {}, async (a) => {
  await a.setup(6, { bolts: 0, gems: 0 });
  await a.ev((s) => s.openTitle('road'));
  await a.shot('bolts_before', { ms: 900 });
  await openQa(a);
  await a.tap('+2000 BOLTS +500 GEMS');
  await a.shot('bolts_panel', { hl: '+2000 BOLTS +500 GEMS', ms: 500 });
  await a.ev((s) => s.openTitle('road'));
  await a.shot('bolts_after', { ms: 900 });
});
await scenario('crates', {}, async (a) => {
  await a.setup(14, { ...fewUnits, crates: {} });
  await a.ev((s) => s.openTitle('units'));
  await a.shot('crates_before', { ms: 900 });
  await openQa(a);
  await a.tap('+3 CRATES');
  await a.shot('crates_panel', { hl: '+3 CRATES', ms: 500 });
  await a.ev((s) => s.openTitle('units'));
  await a.shot('crates_after', { ms: 900 });
});
for (const look of ['old', 'toolbox']) {
  await scenario(`crates_${look}`, look === 'old' ? {} : { [K.crates]: 'toolbox' }, async (a) => {
    await a.setup(14, { ...fewUnits, unitChoiceDone: true, crates: { wood: 1, iron: 1, gold: 1 } });
    await a.ev((s) => s.openTitle('units'));
    await a.shot(`cratelook_${look}_tab`, { ms: 900 });
    for (const k of ['wood', 'iron', 'gold']) {
      await a.ev((s, kind) => { s.closeModal(); s.meta.crates = { [kind]: 1 }; s.openTitle('units'); s.openCrate(kind); }, k);
      await a.shot(`cratelook_${look}_${k}`, { ms: 700 });
    }
  });
}
await scenario('crates_panel', { [K.crates]: 'toolbox' }, async (a) => {
  await panelShot(a, 'cratelook_panel', { hl: 'CRATES: TOOLBOX' });
});

// ---- 4) THINK BANK
for (const on of [false, true]) {
  await scenario(`think_${on ? 'on' : 'off'}`, on ? { [K.think]: 'on' } : {}, async (a) => {
    await playLevel(a, 5);
    await a.wait(600);
    if (on) await a.shot('think_on_a_playing', { ms: 100 });
    await a.wait(on ? 3200 : 3800);
    await a.shot(on ? 'think_on_b_paused' : 'think_off_idle', { ms: 100 });
  });
}
await scenario('think_panel', { [K.think]: 'on' }, async (a) => {
  await panelShot(a, 'think_panel', { hl: 'THINK BANK: ON' });
});

// ---- 5) SPAM TEST: two quick merges, then the STEADY HAND bar
for (const v of ['off', 'a2', 'a3', 'a3f']) {
  await scenario(`spam_${v}`, v === 'off' ? {} : { [K.spam]: v }, async (a) => {
    await playLevel(a, 5);
    await a.wait(1500);
    await mergePair(a);
    await a.wait(250);
    await mergePair(a);
    await a.shot(`spam_${v}_after`, { ms: 250 });
  });
}
await scenario('spam_panel', { [K.spam]: 'a3f' }, async (a) => {
  await panelShot(a, 'spam_panel', { hl: ['SPAM TEST', 'A3+TIRE'] });
});

// ---- 6) PACE: TODAY / CALM / MANIA on level 13 (a few seconds in)
for (const p of ['today', 'calm', 'mania']) {
  await scenario(`pace_${p}`, p === 'calm' ? {} : { [K.pace]: p }, async (a) => {
    await playLevel(a, 13);
    await a.wait(1500);
    await a.shot(`pace_${p}`, { ms: 100 });
    // then a steady player: one merge every 1.2 s for ~25 s, and look at the board
    await a.ev((s) => { window.__bot = setInterval(() => { const g = s.s.grid; if (s.s.phase !== 'playing') return; for (let i = 0; i < 30; i++) for (let j = i + 1; j < 30; j++) if (g[i] && g[j] && g[i].family === g[j].family && g[i].rank === g[j].rank) return s.commitDrop(i, j, g[i].id); }, 1200); });
    await a.wait(25000);
    const n = await a.ev((s) => ({ parts: s.s.grid.filter(Boolean).length, merges: s.s.stats.merges, left: Math.round(s.s.timeLeft ?? 0) }));
    console.log('PACE', p, JSON.stringify(n));
    await a.shot(`pace_${p}_late`, { ms: 100 });
  });
}
await scenario('pace_panel', { [K.pace]: 'mania' }, async (a) => {
  await panelShot(a, 'pace_panel', { hl: ['PACE', 'MANIA'] });
});

// ---- 7) UNITS variants
const allOwned = (lv = 3) => ({ units: Object.fromEntries([['cannon', 0], ['coil', 0], ['bell', 0], ['horn', 0], ['fan', 0], ['rocket', 0], ['mortar', 0], ['fuse_box', 0], ['magnet', 0], ['battery', 0], ['amplifier', 0], ['arc_welder', 0], ['signal_beacon', 0]].map(([u]) => [u, { level: lv, cards: 1 }])), bolts: 900, gems: 260 });
for (const v of ['off', 'b0', 'b1', 'rb']) {
  await scenario(`units_${v}`, v === 'off' ? {} : { [K.units]: v }, async (a) => {
    await a.setup(30, { ...allOwned(), crates: {} });
    await a.ev((s) => s.openTitle('units'));
    await a.shot(`units_${v}_tab`, { ms: 1000 });
    if (v === 'off' || v === 'rb') {
      await a.ev((s) => { s.closeModal(); Object.assign(s.meta, { shooter: 'cannon', relays: ['horn', 'fuse_box'], toys: { fan: true, magnet: true } }); s.startLevel(25); s.finishIntro(true); s.coach.clear(); s.explaining = false; s.explainQueue = []; });
      await a.wait(2500);
      await a.shot(`units_${v}_board`, { ms: 100 });
    }
    if (v === 'rb') {
      await a.ev((s) => { s.closeModal(); s.openTitle('units'); s.openUnitDetail({ id: 'fan', role: 'SUPPORT', rarity: 'rare', slot: 'helper' }); });
      await a.shot('units_rb_detail', { ms: 1200 });
    }
  });
}
await scenario('units_panel', { [K.units]: 'rb' }, async (a) => {
  await panelShot(a, 'units_panel', { hl: ['UNITS (next', 'ROSTER B'] });
});

// ---- 8) SCREW YARD
for (const v of ['old', 'object']) {
  await scenario(`yard_${v}`, v === 'old' ? {} : { [K.yard]: 'object' }, async (a) => {
    await a.setup(14, { tips: ALL_TIPS });
    await a.ev((s) => { Object.assign(s.meta, { yard: undefined }); s.openTitle('events'); s.openYardEvent(); });
    await a.shot(`yard_${v}_event`, { ms: 1000 });
    await a.ev((s) => { s.closeModal(); s.startYard(1); });
    await a.wait(2500);
    await a.shot(`yard_${v}_play`, { ms: 100 });
  });
}
await scenario('yard_panel', { [K.yard]: 'object' }, async (a) => {
  await panelShot(a, 'yard_panel', { hl: ['SCREW YARD', 'OBJECT'], view: 'bottom' });
});

// ---- 9) ALL NEW UNITS, BATCH 1..7, UNLOCK PLAN
await scenario('allnew_panel_off', {}, async (a) => { await panelShot(a, 'allnew_panel_off', { view: 'bottom', hl: ['ALL NEW UNITS'] }); });
await scenario('allnew_panel_on', ALL_ON, async (a) => { await panelShot(a, 'allnew_panel_on', { view: 'bottom', hl: ['ALL NEW UNITS', 'BATCH', 'UNLOCK PLAN'] }); });
await scenario('allnew_panel_mixed', { omm_qa_roster_1: 'on', omm_qa_roster_4: 'on' }, async (a) => { await panelShot(a, 'allnew_panel_mixed', { view: 'bottom', hl: ['ALL NEW UNITS'] }); });
await scenario('allnew_button', {}, async (a) => {
  await panelShot(a, 'allnew_small_panel', { view: 'bottom', taps: 'ALL NEW UNITS', hl: ['ALL NEW UNITS'] });
});
const ownedFew = { units: { cannon: { level: 2, cards: 9 }, coil: { level: 1, cards: 1 }, bell: { level: 1, cards: 0 }, rocket: { level: 1, cards: 0 } }, bolts: 900, gems: 260, crates: { wood: 1, iron: 1, gold: 1 } };
for (const on of [false, true]) {
  await scenario(`allnew_${on ? 'on' : 'off'}_game`, on ? ALL_ON : {}, async (a) => {
    const t = on ? 'on' : 'off';
    await a.setup(40, { ...ownedFew, unitChoiceDone: true });
    await a.ev((s) => s.openTitle('units'));
    await a.shot(`allnew_${t}_units`, { ms: 1000 });
    await a.ev((s) => s.openUnitShop());
    await a.shot(`allnew_${t}_shop`, { ms: 900 });
    await a.ev((s) => { const b = s.modal.list.find((o) => o.list?.some?.((t) => t.text === 'ODDS')); b.emit('pointerup'); });
    await a.shot(`allnew_${t}_odds`, { ms: 800 });
  });
}

// each batch: panel with it ON, one unit's detail page (WHEN MERGED), and that unit on a board
const BATCH_UNIT = { 1: 'nail_gun', 2: 'piston', 3: 'blowtorch', 4: 'ladder', 5: 'wrecking_ball', 6: 'robot_arm', 7: 'rivet_gun' };
for (const n of [1, 2, 3, 4, 5, 6, 7]) {
  await scenario(`batch_${n}`, { [`omm_qa_roster_${n}`]: 'on', ...(n === 6 ? { [K.units]: 'rb' } : {}) }, async (a) => {
    await panelShot(a, `batch_${n}_panel`, { view: 'bottom', hl: `BATCH ${n}` });
    const id = BATCH_UNIT[n];
    await a.setup(40, { bolts: 900, units: { cannon: { level: 3, cards: 1 }, coil: { level: 3, cards: 1 }, bell: { level: 3, cards: 1 }, [id]: { level: 3, cards: 1 } } });
    await a.ev(async (s, uid) => {
      const { UNITS } = await import('/src/content/units.ts');
      const u = UNITS.find((x) => x.id === uid);
      s.openTitle('units');
      s.openUnitDetail(u);
    }, id);
    await a.shot(`batch_${n}_detail`, { ms: 1800 });
    await a.ev(async (s, uid) => {
      const { UNITS } = await import('/src/content/units.ts');
      const u = UNITS.find((x) => x.id === uid);
      s.closeModal();
      if (u.slot === 'shooter') s.meta.shooter = uid;
      else if (u.slot === 'relay') s.meta.relays = [uid, 'coil'];
      else s.meta.toys = { [uid]: true };
      s.startLevel(25);
      s.finishIntro(true);
      s.coach.clear();
      s.explaining = false;
      s.explainQueue = [];
    }, id);
    await a.wait(3000);
    await a.shot(`batch_${n}_board`, { ms: 100 });
  });
}

// UNLOCK PLAN: win level 10, then NEXT LEVEL shows the NEW UNIT reveal
await scenario('plan', { [K.plan]: 'on', omm_qa_roster_1: 'on' }, async (a) => {
  await panelShot(a, 'plan_panel', { view: 'bottom', hl: 'UNLOCK PLAN' });
  await a.setup(9, { bolts: 100 });
  await a.ev((s) => { s.closeModal(); s.startLevel(10); s.finishIntro(true); setTimeout(() => { s.coach.clear(); s.paused = false; s.explaining = false; s.s.phase = 'won'; s.s.elapsed = 52.3; s.s.stats.biggestChain = 9; s.openLevelResult(true); }, 600); });
  await a.wait(2200);
  await a.shot('plan_result', { ms: 300 });
  await a.tap('NEXT', 0, true);
  await a.wait(1500);
  await a.shot('plan_reveal', { ms: 600 });
});
await scenario('plan_off', { omm_qa_roster_1: 'on' }, async (a) => {
  await a.setup(9, { bolts: 100 });
  await a.ev((s) => { s.closeModal(); s.startLevel(10); s.finishIntro(true); setTimeout(() => { s.coach.clear(); s.paused = false; s.explaining = false; s.s.phase = 'won'; s.s.elapsed = 52.3; s.s.stats.biggestChain = 9; s.openLevelResult(true); }, 600); });
  await a.wait(2200);
  await a.tap('NEXT', 0, true);
  await a.wait(1500);
  await a.shot('plan_off_after', { ms: 600 });
});

// ---- 10) MERGE RULE: a sandwich merge (17 -> 12 with 11 and 13 touching, all rank 2 cannons)
for (const r of ['today', 'sandwich2', 'sandwichBonus']) {
  await scenario(`rule_${r}`, r === 'today' ? {} : { [K.rule]: r }, async (a) => {
    await playLevel(a, 5);
    await a.ev((s) => {
      const st = s.s;
      st.grid.fill(null);
      const mk = (f, rk) => ({ id: st.nextId++, family: f, rank: rk, cd: 30 });
      Object.assign(st.grid, { 11: mk('cannon', 2), 12: mk('cannon', 2), 13: mk('cannon', 2), 17: mk('cannon', 2), 1: mk('bell', 1), 4: mk('coil', 1) });
      s.reconcile(true);
    });
    await a.wait(300);
    if (r === 'today') await a.shot('rule_before', { ms: 100 });
    await a.ev((s) => { const st = s.s; s.commitDrop(17, 12, st.grid[17].id); });
    await a.shot(`rule_${r}_after`, { ms: 450 });
    await a.shot(`rule_${r}_after2`, { ms: 1400 });
  });
}
await scenario('rule_panel', { [K.rule]: 'sandwich2' }, async (a) => {
  await panelShot(a, 'rule_panel', { view: 'bottom', hl: ['MERGE RULE', '+2'] });
});

// ---- one panel picture per option that has no game picture of its own
for (const [name, key, val, view, hl] of [
  ['opt_spam_a2', K.spam, 'a2', 'top', ['SPAM TEST', 'A2']],
  ['opt_spam_a3', K.spam, 'a3', 'top', ['SPAM TEST', 'A3']],
  ['opt_pace_today', K.pace, 'today', 'top', ['PACE', 'TODAY']],
  ['opt_pace_calm', 'x', 'x', 'top', ['PACE', 'CALM']],
  ['opt_units_b0', K.units, 'on', 'top', ['UNITS (next', 'B0']],
  ['opt_units_b1', K.units, 'b1', 'top', ['UNITS (next', 'B1']],
  ['opt_rule_bonus', K.rule, 'sandwichBonus', 'bottom', ['MERGE RULE', '+1 BONUS']],
  ['opt_yard_old', 'x', 'x', 'top', ['SCREW YARD', 'OLD']],
]) {
  await scenario(name, { [key]: val }, async (a) => { await panelShot(a, name, { view, hl }); });
}

await browser.close();
await server.close();
