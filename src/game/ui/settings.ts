import Phaser from 'phaser';
import { serialize } from '../../core/game';
import { LEVELS } from '../../content/levels';
import { audioSettings, sfx } from '../audio';
import * as tlog from '../../platform/telemetry';
import { applyBundle, exportCode, importCode, lockSaves, META_KEY, readBundle, readPreimport, restorePreimport, safeStorage, type SaveBundle } from '../../platform/backup';
import { closeCodeBox, copyText, openCodeBox } from '../codeBox';
import { store } from '../meta';
import type { GameScene } from '../GameScene';
import { W, H } from '../sceneKit';
import { addBuildInfo } from './buildInfo';

export function openSettings(scene: GameScene) {
  sfx.click();
  const c = scene.sheet(1090);
  const top = H / 2 - 480;
  scene.sheetTitle(c, top, 'SETTINGS');
  const m = scene.meta;
  const toggles: [string, () => boolean, () => void][] = [
    ['SOUND', () => m.sound, () => ((m.sound = !m.sound), (audioSettings.on = m.sound))],
    ['MUSIC', () => m.music, () => ((m.music = !m.music), (audioSettings.music = m.music))],
    ['SHAKE', () => m.shake !== false, () => (m.shake = m.shake === false)],
    ['SWAP ON DROP', () => !!m.swapMismatch, () => (m.swapMismatch = !m.swapMismatch)],
  ];
  toggles.forEach(([label, get, flip], i) => {
    const b = scene.button(c, W / 2, top + 180 + i * 110, 460, `${label}: ${get() ? 'ON' : 'OFF'}`, 0x27a4c0, () => {
      flip();
      store(META_KEY, JSON.stringify(m));
      (b.list[1] as Phaser.GameObjects.Text).setText(`${label}: ${get() ? 'ON' : 'OFF'}`);
    });
  });
  // r43 save backup code
  const pre = safeStorage(readPreimport, () => null);
  if (pre) {
    // a code was loaded: this line becomes the one-time undo
    const un = scene.add.text(W / 2, top + 580, 'Loaded the wrong code? Tap to undo', { fontFamily: 'Lilita One, Arial Black', fontSize: '26px', color: '#b06a1a' }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    un.on('pointerup', () => scene.confirmImport(pre, true));
    c.add(un);
  } else c.add(scene.add.text(W / 2, top + 580, 'SAVE BACKUP  ·  move or keep your progress', { fontFamily: 'Arial', fontStyle: 'bold', fontSize: '22px', color: '#7a5a4a' }).setOrigin(0.5));
  scene.button(c, W / 2 - 150, top + 640, 360, 'COPY SAVE CODE', 0x5fbf4a, () => scene.copySaveCode(), 0.78);
  scene.button(c, W / 2 + 150, top + 640, 360, 'PASTE SAVE CODE', 0x27a4c0, () => scene.openPasteCode(), 0.78);
  // the two text links share one row so each gets a finger-sized hit box (they were 52 px apart, one above the other)
  const link = { fontFamily: 'Lilita One, Arial Black', fontSize: '28px', color: '#b06a1a' };
  c.add(scene.tapLink(scene.add.text(W / 2 - 150, top + 722, 'Playtest stats', link).setOrigin(0.5), () => scene.openPlaytestStats()));
  c.add(scene.tapLink(scene.add.text(W / 2 + 150, top + 722, 'Replay tutorial', link).setOrigin(0.5), () => scene.startTutorial()));
  // r33 (Ido: "a reset button to check things from the start, a jump-to button for later levels")
  scene.button(c, W / 2, top + 808, 360, 'QA TOOLS', 0xe8452c, () => scene.openQaTools(), 0.8);
  scene.button(c, W / 2, top + 900, 300, 'BACK', 0x8a6a4a, () => scene.openTitle(), 0.85);
  addBuildInfo(scene, c, W / 2, top + 990);
}

/** r43 save backup: the whole save as a code on the clipboard; a select-all text box when the clipboard is refused. */
export function copySaveCode(scene: GameScene) {
  const live = (scene.s.phase === 'playing' || scene.s.phase === 'choice') && !scene.s.showcase && !scene.homeIdle;
  if (live) scene.save();
  store(META_KEY, JSON.stringify(scene.meta));
  // storage blocked (private mode, site data off): the code is made from the game in memory
  const code = exportCode(safeStorage(readBundle, () => ({ meta: scene.meta as unknown as Record<string, unknown>, run: live ? serialize(scene.s) : null })));
  void copyText(code).then((ok) => {
    tlog.log('backup_copy', { clipboard: ok });
    if (ok) return scene.showToast('SAVE CODE COPIED!\nPaste it in Notes to keep it safe');
    return code.then(
      (value) => void openCodeBox({ title: 'YOUR SAVE CODE', hint: 'Tap and hold the code, then tap Copy.\nKeep it in Notes or send it to yourself.', value, actions: [{ label: 'DONE', color: '#27a4c0', run: () => undefined }] }),
      () => scene.showToast("COULDN'T MAKE THE CODE"),
    );
  });
}

/** r43: paste box -> checked code -> confirm -> the save is replaced and the game reloads. Bad codes never touch the save. */
export function openPasteCode(scene: GameScene) {
  openCodeBox({
    title: 'PASTE SAVE CODE',
    hint: 'Tap and hold the box, then tap Paste.',
    placeholder: 'OMM1z.…',
    actions: [
      { label: 'CANCEL', color: '#8a6a4a', run: () => undefined },
      {
        label: 'LOAD',
        color: '#5fbf4a',
        run: async (text) => {
          const r = await importCode(text);
          tlog.log('backup_paste', { ok: r.ok, reason: r.ok ? undefined : r.reason });
          if (!r.ok) return r.message;
          scene.confirmImport(r.bundle);
        },
      },
    ],
  });
}

/** `undo`: put back the save from before the last load (Settings link). */
export function confirmImport(scene: GameScene, b: SaveBundle, undo = false) {
  closeCodeBox();
  const c = scene.sheet(620);
  const top = H / 2 - 310;
  scene.sheetTitle(c, top, undo ? 'UNDO LAST LOAD?' : 'LOAD THIS SAVE?', undo ? 'This puts back the save you had\nbefore you loaded a code.' : 'This replaces your current progress.\nYou can undo it once in Settings.');
  const sum = (meta: Record<string, unknown>) => {
    const stars = Object.values((meta.levelStars ?? {}) as Record<string, number>);
    return `${stars.length} levels  ·  ${stars.reduce((a, x) => a + (Number(x) || 0), 0)} stars  ·  ${Number(meta.bolts) || 0} Bolts`;
  };
  const when = b.at ? new Date(b.at).toLocaleDateString() : '';
  c.add(scene.add.text(W / 2, top + 210, `${undo ? 'BEFORE THE LOAD' : `SAVE CODE${when ? ` (${when})` : ''}`}\n${sum(b.meta)}\n\nNOW ON THIS PHONE\n${sum(scene.meta as unknown as Record<string, unknown>)}`, { fontFamily: 'Lilita One, Arial Black', fontSize: '26px', color: '#3b2533', align: 'center', lineSpacing: 6 }).setOrigin(0.5, 0));
  scene.button(c, W / 2 - 140, top + 540, 260, 'CANCEL', 0x8a6a4a, () => scene.openSettings(), 0.8);
  scene.button(c, W / 2 + 140, top + 540, 260, undo ? 'UNDO' : 'REPLACE', 0xe8452c, () => {
    tlog.log(undo ? 'backup_undo' : 'backup_restore');
    tlog.flush();
    // lock first: nothing may write the old in-memory game back before or during the reload
    lockSaves();
    try {
      if (undo) restorePreimport(localStorage);
      else applyBundle(localStorage, b);
    } catch {
      lockSaves(false);
      return scene.showToast("COULDN'T SAVE ON THIS PHONE");
    }
    location.reload();
  }, 0.8);
}

/** Local playtest dashboard (ChatGPT r17 D): the numbers that decide rhythm, booster use and rank payoff. */
export function openPlaytestStats(scene: GameScene) {
  sfx.click();
  const ev = tlog.events();
  const ends = ev.filter((e) => e.e === 'level_end');
  const by: Record<string, { n: number; w: number }> = { NORMAL: { n: 0, w: 0 }, HARD: { n: 0, w: 0 }, MEGA_HARD: { n: 0, w: 0 } };
  for (const e of ends) {
    const d = LEVELS[Number(e.level) - 1]?.difficulty ?? 'NORMAL';
    by[d].n++;
    if (e.won) by[d].w++;
  }
  const pct = (x: { n: number; w: number }) => (x.n ? `${Math.round((100 * x.w) / x.n)}% (${x.w}/${x.n})` : '-');
  const cleared = new Set(ends.filter((e) => e.won).map((e) => e.level)).size;
  const attemptsPerClear = cleared ? (ends.length / cleared).toFixed(1) : '-';
  const bought = (k: string) => ev.filter((e) => e.e === 'booster_buy' && e.item === k).length;
  const used = (k: string) => ev.filter((e) => e.e === 'booster' && e.kind === k).length;
  const merges = ev.filter((e) => e.e === 'merge');
  const topRank = Math.max(0, ...merges.map((e) => Number(e.rank) || 0));
  const r78 = merges.filter((e) => Number(e.rank) >= 7).length;
  const starts = ev.filter((e) => e.e === 'level_start').length;
  const lines = [
    `Level win rate  Normal ${pct(by.NORMAL)}`,
    `Hard ${pct(by.HARD)}   Mega ${pct(by.MEGA_HARD)}`,
    `Attempts per clear  ${attemptsPerClear}   (levels started ${starts})`,
    `Kits  bought ${bought('kits')} / used ${used('jumpstart')} / held ${scene.meta.kits ?? 0}`,
    `Capsules  bought ${bought('capsules')} / used ${used('time_capsule')} / held ${scene.meta.capsules ?? 0}`,
    `Highest rank made  ${topRank}   (rank 7-8 merges: ${r78})`,
    `Merges logged  ${merges.length}   Bolts now ${scene.meta.bolts ?? 0}`,
  ];
  const c = scene.sheet(760);
  const top = H / 2 - 380;
  scene.sheetTitle(c, top, 'PLAYTEST STATS', 'Local only. Nothing leaves this phone.');
  c.add(scene.add.text(W / 2, top + 170, lines.join('\n'), { fontFamily: 'Arial', fontStyle: 'bold', fontSize: '24px', color: '#3b2533', align: 'center', lineSpacing: 18 }).setOrigin(0.5, 0));
  scene.button(c, W / 2, top + 680, 300, 'BACK', 0x8a6a4a, () => scene.openSettings(), 0.8);
}
