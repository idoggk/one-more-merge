// Unit display audit (t-f9b18abf): draws every unit at every rank in every place a unit is drawn and writes contact sheets.
// Usage: node tools/unit-display-audit.mjs <outDir> [place ...]   places: board next units detail intro crate qa monsters (default all)
// VIEWPORTS env: "390x844,360x640" (default). Nothing touches a real save (fresh headless profile, QA roster switches on).
import { mkdirSync } from 'node:fs';
import sharp from 'sharp';
import { boot, wait } from './unit-audit-lib.mjs';

const out = process.argv[2] ?? 'art-candidates/unit-display-audit';
const only = process.argv.slice(3);
const want = (p) => !only.length || only.includes(p);
const VPS = (process.env.VIEWPORTS ?? '390x844,360x640').split(',').map((v) => v.split('x').map(Number));
mkdirSync(out, { recursive: true });

/** Stitch PNG buffers (all the same size) into a grid sheet with a caption under each tile. */
async function sheet(file, tiles, cols) {
  const w = Math.max(...tiles.map((t) => t.w)), h = Math.max(...tiles.map((t) => t.h)), cap = 26;
  const rows = Math.ceil(tiles.length / cols);
  const comp = [];
  for (let i = 0; i < tiles.length; i++) {
    const x = (i % cols) * w, y = Math.floor(i / cols) * (h + cap);
    comp.push({ input: tiles[i].buf, left: x, top: y });
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${cap}"><rect width="${w}" height="${cap}" fill="#222"/><text x="4" y="18" font-family="Arial" font-size="15" fill="#fff">${tiles[i].label.replace(/&/g, '&amp;')}</text></svg>`;
    comp.push({ input: Buffer.from(svg), left: x, top: y + h });
  }
  await sharp({ create: { width: w * cols, height: rows * (h + cap), channels: 3, background: '#555' } }).composite(comp).png().toFile(file);
}

for (const [vw, vh] of VPS) {
  const tag = `${vw}x${vh}`;
  const { page, server, close } = await boot(vw, vh);
  const types = await server.ssrLoadModule('/src/core/types.ts');
  const game = await server.ssrLoadModule('/src/core/game.ts');
  const FAM = types.FAMILIES;
  const core = (f) => types.isShooter(f) || types.isRelay(f);
  const maxRank = (f) => (core(f) ? 8 : 6);
  const clipOf = async (rect) => {
    const buf = await page.screenshot({ clip: rect, encoding: 'binary' });
    const m = await sharp(buf).metadata();
    return { buf, w: m.width, h: m.height };
  };

  // ---------- BOARD: 3 families x ranks per board, whole board clipped ----------
  if (want('board')) {
    await page.evaluate(() => {
      const sc = window.__omm.game.scene.getScene('game');
      sc.closeModal?.();
      sc.meta.tips = new Proxy({}, { get: () => true, set: () => true });
      sc.startLevel(1);
      sc.finishIntro(true);
    });
    await wait(2500);
    const sets = [];
    for (let i = 0; i < FAM.length; i += 3) sets.push(FAM.slice(i, i + 3));
    const tiles = [];
    for (const set of sets) {
      await page.evaluate(() => {
        const sc = window.__omm.game.scene.getScene('game');
        sc.s.grid = sc.s.grid.map(() => null);
        sc.s.rankCap = 8;
        sc.reconcile(true);
        for (const v of [...sc.views.values()]) v.destroy();
        sc.views.clear();
      });
      await wait(500);
      await page.evaluate((set, ranks) => {
        const sc = window.__omm.game.scene.getScene('game');
        const s = sc.s;
        s.phase = 'playing';
        s.supplyTimer = 1e9;
        s.timeLeft = 1e9;
        s.grid = s.grid.map(() => null);
        let id = 70000;
        // 5 columns x 6 rows: each family gets two rows (ranks 1-5 / 6-8)
        set.forEach((f, k) => {
          for (let r = 1; r <= ranks[f]; r++) {
            const row = k * 2 + (r > 5 ? 1 : 0), col = (r - 1) % 5;
            s.grid[row * 5 + col] = { id: id++, family: f, rank: r, cd: 99 };
          }
        });
        sc.reconcile(true);
      }, set, Object.fromEntries(set.map((f) => [f, maxRank(f)])));
      await wait(900);
      const rect = await page.evaluate(async () => {
        const sc = window.__omm.game.scene.getScene('game');
        const kit = await import('/src/game/sceneKit.ts'), tun = await import('/src/content/tuning.ts');
        const cv = sc.game.canvas.getBoundingClientRect();
        const k = cv.width / kit.W;
        return { x: cv.x + kit.BX * k, y: cv.y + kit.BY * k, width: kit.CELL * tun.COLS * k, height: kit.CELL * tun.ROWS * k };
      });
      const t = await clipOf(rect);
      tiles.push({ ...t, label: `${set.join(' / ')} (rows: ranks 1-5, 6-8)` });
    }
    for (let i = 0; i < tiles.length; i += 4) await sheet(`${out}/board_${tag}_${String(i / 4 + 1)}.png`, tiles.slice(i, i + 4), 2);
  }
  const cvr = await page.evaluate(() => { const r = window.__omm.game.scene.getScene('game').game.canvas.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width }; });
  const K = cvr.w / 720;
  /** Design-px rect -> clip rect in CSS px. */
  const dr = (x, y, w, h) => ({ x: cvr.x + x * K, y: cvr.y + y * K, width: w * K, height: h * K });
  const evalScene = (fn, ...a) => page.evaluate((src, ...args) => { const sc = window.__omm.game.scene.getScene('game'); return (0, eval)(`(${src})`)(sc, ...args); }, fn.toString(), ...a);
  const toBoard = async () => {
    await evalScene(async (sc) => { sc.closeModal?.(); sc.meta.tips = new Proxy({}, { get: () => true, set: () => true }); sc.startLevel(1); sc.finishIntro(true); });
    await wait(1800);
  };
  const UNIT_IDS = await evalScene(async () => (await import('/src/content/units.ts')).UNITS.map((u) => u.id));
  const sheets = async (name, tiles, cols, per) => {
    for (let i = 0; i < tiles.length; i += per) await sheet(`${out}/${name}_${tag}_${i / per + 1}.png`, tiles.slice(i, i + per), cols);
  };
  const half = async (t, f = 0.5) => { const m = await sharp(t.buf).resize(Math.round(t.w * f)).png().toBuffer(); const mm = await sharp(m).metadata(); return { ...t, buf: m, w: mm.width, h: mm.height }; };
  const tryPlace = async (name, fn) => { try { await fn(); } catch (e) { console.log('PLACE FAILED', name, tag, e.message.slice(0, 300)); } };

  // ---------- NEXT strip: every unit at every rank in the tray ----------
  if (want('next')) await tryPlace('next', async () => {
    await toBoard();
    await evalScene((sc) => { sc.s.phase = 'playing'; sc.s.supplyTimer = 1e9; sc.s.timeLeft = 1e9; sc.s.rankCap = 8; sc.s.grid = sc.s.grid.map((_, i) => ({ id: 80000 + i, family: 'cannon', rank: 1, cd: 99 })); sc.reconcile(true); });
    await wait(3000);
    const tiles = [];
    for (const f of FAM) for (let r = 1; r <= maxRank(f); r++) {
      await evalScene((sc, f, r) => { sc.s.pending = [{ family: f, rank: r, id: 1 }]; sc.s.supplyTimer = 1e9; }, f, r);
      await wait(380);
      const rect = await page.evaluate(async () => { const kit = await import('/src/game/sceneKit.ts'); return { x: kit.BX + 80, y: kit.TRAY_Y - 44, w: 150, h: 88 }; });
      tiles.push({ ...(await clipOf(dr(rect.x, rect.y, rect.w, rect.h))), label: `${f} r${r}` });
    }
    await sheets('next', tiles, 8, 32);
  });

  // ---------- UNITS TAB: collection grid (owned L1 / owned L9 / locked) + the unit detail page ----------
  if (want('units')) await tryPlace('units', async () => {
    for (const [lv, nm] of [[1, 'L1'], [9, 'L9'], [0, 'locked']]) {
      await evalScene(async (sc, lv, ids) => {
        sc.meta.tips = new Proxy({}, { get: () => true, set: () => true });
        sc.meta.units = {};
        if (lv) for (const id of ids) sc.meta.units[id] = { level: lv, cards: 1 };
        sc.openTitle('machine');
        sc.openUnitsTab();
      }, lv, UNIT_IDS);
      await wait(1500);
      await page.screenshot({ path: `${out}/unitstab_${nm}_${tag}.png` });
    }
  });
  if (want('detail')) await tryPlace('detail', async () => {
    const tiles = [];
    for (const [lv, nm] of [[9, 'owned L9'], [0, 'locked']]) {
      for (const id of UNIT_IDS) {
        await evalScene(async (sc, lv, id) => {
          const un = await import('/src/content/units.ts');
          sc.meta.units = {};
          if (lv) for (const u of un.UNITS) sc.meta.units[u.id] = { level: lv, cards: 1 };
          sc.openUnitDetail(un.UNITS.find((u) => u.id === id));
        }, lv, id);
        await wait(700);
        const buf = await page.screenshot({ encoding: 'binary' });
        const m = await sharp(buf).metadata();
        const t = await sharp(buf).extract({ left: 0, top: 0, width: m.width, height: Math.round(m.height * 0.62) }).resize(Math.round(m.width * 0.5)).png().toBuffer();
        const mm = await sharp(t).metadata();
        tiles.push({ buf: t, w: mm.width, h: mm.height, label: `${id} (${nm})` });
      }
    }
    await sheets('detail', tiles, 4, 8);
  });
  // ---------- CRATE REVEAL: 7 unit stacks per crate (old crate screen and the TOOLBOX one) ----------
  if (want('crate')) for (const mode of ['', 'toolbox']) await tryPlace(`crate ${mode}`, async () => {
    await page.evaluate((m) => (m ? localStorage.setItem('omm_qa_crates', m) : localStorage.removeItem('omm_qa_crates')), mode);
    const tiles = [];
    const kinds = ['wood', 'iron', 'gold', 'bench', 'wood', 'iron'];
    for (let i = 0; i * 7 < UNIT_IDS.length; i++) {
      const ids = UNIT_IDS.slice(i * 7, i * 7 + 7);
      await evalScene((sc, kind, ids) => {
        clearInterval(window.__bot);
        sc.closeModal();
        sc.crateReturn = null;
        sc.seasonEv = () => {};
        sc.presentCrate(kind, ids.map((unit, k) => ({ unit, count: 1 + (k === 0), isNew: k === 1 })));
      }, kinds[i], ids);
      await wait(500);
      await page.mouse.click(vw / 2, vh / 2);
      await wait(5200);
      tiles.push(await half(await clipOf({ x: 0, y: 0, width: vw, height: vh }), 0.7));
      tiles[tiles.length - 1].label = `crate ${mode || 'classic'} ${kinds[i]}: ${ids.join(',')}`;
    }
    await sheets(`crate${mode ? '_toolbox' : ''}`, tiles, 3, 6);
  });

  // ---------- MONSTERS / BOSSES on the stage (intact + hurt) and the boss intro cards ----------
  if (want('monsters')) await tryPlace('monsters', async () => {
    await toBoard();
    const info = await evalScene(async () => {
      const lv = await import('/src/content/levels.ts'), boss = await import('/src/core/boss.ts');
      // every cast id (a missing art file shows as the black/green MISSING box) + the six classic target_N machines
      const vis = [...Object.keys(lv.CAST), ...[0, 1, 2, 3, 4, 5].map((i) => `#${i}`)];
      return { vis, bosses: boss.BOSSES.map((b) => b.id) };
    });
    const stageRect = await page.evaluate(async () => { const kit = await import('/src/game/sceneKit.ts'); return { y: kit.STAGE_TOP, h: kit.STAGE_H }; });
    const tiles = [];
    for (const v of info.vis) for (const hurt of [false, true]) {
      await evalScene((sc, v, hurt) => { sc.s.boss = null; sc.stageClassic = () => undefined; sc.castOf = () => (v[0] === '#' ? undefined : v); if (v[0] === '#') sc.s.target = +v.slice(1); sc.s.phase = 'playing'; sc.s.timeLeft = 1e9; sc.s.supplyTimer = 1e9; sc.s.thresholds = hurt ? 2 : 0; sc.s.hp = sc.s.maxHp; sc.setTargetTexture(); }, v, hurt);
      await wait(250);
      tiles.push({ ...(await clipOf(dr(70, stageRect.y, 580, stageRect.h))), label: `${v}${hurt ? ' (hurt)' : ''}` });
    }
    await sheets('monsters', tiles, 4, 16);
    const bt = [];
    for (let i = 0; i < info.bosses.length; i++) for (const [ph, hpf] of [['intact', 1], ['cracked', 0.5], ['critical', 0.15]]) {
      await evalScene((sc, i, hpf) => { sc.s.boss = { def: i, light: false, phaseShown: 0 }; sc.s.phase = 'playing'; sc.s.timeLeft = 1e9; sc.s.supplyTimer = 1e9; sc.closeModal?.(); sc.s.maxHp = 1000; sc.s.hp = 1000 * hpf; sc.setTargetTexture(); }, i, hpf);
      await wait(250);
      bt.push({ ...(await clipOf(dr(70, stageRect.y, 580, stageRect.h))), label: `${info.bosses[i]} ${ph}` });
    }
    await sheets('bosses', bt, 4, 16);
    const cards = [];
    for (let i = 0; i < info.bosses.length; i++) {
      await evalScene(async (sc, i) => { const bd = (await import('/src/core/boss.ts')).BOSSES[i]; sc.closeModal?.(); sc.s.boss = { def: i, light: false, phaseShown: 0 }; sc.s.maxHp = 1000; sc.s.hp = 1000; sc.setTargetTexture(); sc.bossWakeCard(bd); }, i);
      await wait(900);
      cards.push(await half(await clipOf({ x: 0, y: 0, width: vw, height: vh }), 0.6));
      cards[cards.length - 1].label = `boss wake card ${info.bosses[i]}`;
      await evalScene((sc) => sc.closeModal?.());
    }
    await sheets('bosscards', cards, 4, 8);
  });

  // ---------- LEVEL SHEET (road card) for the first level of every monster / boss, and the monster book ----------
  if (want('intro')) await tryPlace('intro', async () => {
    const lv = await evalScene(async () => {
      const L = (await import('/src/content/levels.ts')).LEVELS;
      const pick = [], seen = new Set();
      L.forEach((d, i) => { const k = `${d.visual ?? ''}|${d.mini_boss ?? ''}|${d.level % 10 === 0 ? 'B' + d.level : ''}`; if (!seen.has(k)) { seen.add(k); pick.push(i + 1); } });
      return pick;
    });
    const tiles = [];
    for (const n of lv) {
      await evalScene((sc, n) => { sc.closeModal?.(); sc.meta.lessons = { card: true, boosters: true, road: true }; sc.meta.levelStars = Object.fromEntries(Array.from({ length: 80 }, (_, i) => [i + 1, 2])); sc.openTitle('road'); sc.openLevelSheet(n); }, n);
      await wait(600);
      tiles.push(await half(await clipOf({ x: 0, y: 0, width: vw, height: vh }), 0.6));
      tiles[tiles.length - 1].label = `level sheet L${n}`;
    }
    await sheets('levelsheet', tiles, 4, 8);
    const bk = [];
    for (let tab = 0; tab < 3; tab++) for (let pg = 0; pg < 8; pg++) {
      const ok = await evalScene((sc, tab, pg) => { try { sc.openMonsterBook(tab, pg); return true; } catch { return false; } }, tab, pg);
      if (!ok) break;
      await wait(500);
      bk.push(await half(await clipOf({ x: 0, y: 0, width: vw, height: vh }), 0.6));
      bk[bk.length - 1].label = `monster book tab ${tab} page ${pg}`;
    }
    await sheets('monsterbook', bk, 4, 8);
  });

  // ---------- GUIDE pages, inspect card, team sheet, shop, unit choice ----------
  if (want('misc')) await tryPlace('misc', async () => {
    const tiles = [];
    const n = await evalScene((sc) => sc.constructor.GUIDE.length);
    for (let i = 0; i < n; i++) {
      await evalScene((sc, i) => { sc.closeModal?.(); sc.openHowTo(i); }, i);
      await wait(600);
      tiles.push(await half(await clipOf({ x: 0, y: 0, width: vw, height: vh }), 0.6));
      tiles[tiles.length - 1].label = `how-to page ${i}`;
    }
    await sheets('guide', tiles, 4, 8);
    const m = [];
    const shotFull = async (label) => { const t = await half(await clipOf({ x: 0, y: 0, width: vw, height: vh }), 0.6); t.label = label; m.push(t); };
    await evalScene(async (sc) => { const un = await import('/src/content/units.ts'); sc.meta.units = {}; for (const u of un.UNITS) sc.meta.units[u.id] = { level: 5, cards: 2 }; sc.closeModal?.(); sc.openTeamSheet(); });
    await wait(900); await shotFull('team sheet');
    await evalScene((sc) => { sc.closeModal?.(); sc.openUnitShop(); }); await wait(900); await shotFull('unit shop');
    await evalScene((sc) => { sc.closeModal?.(); sc.meta.unitChoiceDone = false; sc.meta.units = {}; sc.openUnitChoice(() => {}); }); await wait(900); await shotFull('unit choice (rare picks)');
    await evalScene((sc) => { sc.closeModal?.(); sc.openRolePick?.(); }); await wait(900); await shotFull('role pick');
    await toBoard();
    for (const [f, r] of [['cannon', 3], ['mortar', 6], ['lathe', 4], ['wrench', 2]]) {
      await evalScene((sc, f, r) => { sc.closeModal?.(); sc.s.phase = 'playing'; sc.s.supplyTimer = 1e9; sc.s.grid = sc.s.grid.map(() => null); sc.s.grid[12] = { id: 99001, family: f, rank: r, cd: 99 }; sc.reconcile(true); sc.openInspect(12); }, f, r);
      await wait(700); await shotFull(`inspect ${f} r${r}`);
    }
    await sheets('misc', m, 4, 8);
  });
  await close();
}
