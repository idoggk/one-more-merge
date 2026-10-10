import Phaser from 'phaser';
import { FAMILY_INFO, TARGET_NAMES } from '../../content/perks';
import { COLS, ROWS, TUNING } from '../../content/tuning';
import { odNeeded, peekNext, fatigueCfg, supplyGated, mergeEarns, supplyPeriod, thinking } from '../../core/game';
import { BOOSTER_UNLOCK, LEVELS, starGoals } from '../../content/levels';
import { setMusicIntensity, setMusicMode, sfx } from '../audio';
import * as tlog from '../../platform/telemetry';
import { META_KEY } from '../../platform/backup';
import { BOSSES } from '../../core/boss';
import { itemFits } from '../../core/types';
import { PALETTE } from '../../core/marks';
import { recordCommand } from '../../core/replay';
import { ghostProgress, levelProgress, paceDelta, paceLabel } from '../../core/pace';
import { store } from '../meta';
import type { GameScene } from '../GameScene';
import { W, CELL, BX, CLOCK_X, ITEM_X, BY, TRAY_Y, HP_Y, STAGE_TOP, STAGE_H, SLOT, ITEM_COL, OD_COL, cellXY, fmt, textColor, textBg } from '../sceneKit';
import { trayEarnText } from '../flow';

export function drawHud(scene: GameScene, dms: number) {
  const s = scene.s;
  const demo = s.target < 0;
  textColor(scene.headerText, s.hard ? '#b3201a' : s.remix ? '#1f6f8f' : '#3b2533');
  if (scene.headerText.text !== scene.lastHeader) {
    // fixed header columns: the name gets x 70..350 and shrinks to fit
    scene.lastHeader = scene.headerText.text;
    let fs = 30;
    scene.headerText.setFontSize(fs);
    while (scene.headerText.width > 276 && fs > 18) scene.headerText.setFontSize((fs -= 2));
  }
  scene.headerText.setText(demo ? 'WARM-UP' : s.puzzle ? `${scene.puzzleKind === 'drill' ? 'DRILL' : 'PUZZLE'}  \u00b7  WIN IN ${s.puzzle.moves}` : s.level !== undefined ? `${s.rush ? `RUSH ${s.rush.slot + 1}/3` : s.bounty ? 'BOUNTY' : s.endless ? `FLOOR ${s.endless}` : `L${s.level}`} \u00b7 ${scene.realBoss ? (BOSSES[scene.realBoss.def].mini ? 'MINI-BOSS' : 'BOSS') : scene.s.goal ? 'GOAL' : scene.monName(true)}` : s.remix ? TARGET_NAMES[s.target] : `${Math.min(s.target + 1, 3)}/3 ${TARGET_NAMES[Math.min(s.target, 2)]}`);
  // Time Capsule (dynamic resource, levels 4+): +15s once per attempt while the clock runs
  const capOk = s.level !== undefined && s.level >= BOOSTER_UNLOCK.time_capsule && (scene.meta.capsules ?? 0) > 0 && !s.capsuleUsed && s.phase === 'playing';
  if (capOk && !scene.capsuleBtn) {
    // bottom action lane (ChatGPT r16), between NEXT and SCRAP; a 350ms hold with a progress rim prevents accidents
    const b = scene.add.container(W / 2 + 30, TRAY_Y).setDepth(60);
    const bgp = scene.add.graphics().fillStyle(0x2b1d2e, 1).fillRoundedRect(-84, -40, 168, 80, 24).fillStyle(0x27a4c0, 1).fillRoundedRect(-80, -36, 160, 72, 20);
    b.add(bgp);
    if (scene.hasArt('booster_time_capsule')) {
      const ic = scene.add.image(-46, 0, 'booster_time_capsule');
      ic.setScale(56 / Math.max(ic.width, ic.height));
      b.add(ic);
    }
    b.add(scene.add.text(18, -10, '+15s', { fontFamily: 'Lilita One, Arial Black', fontSize: '28px', color: '#ffffff' }).setOrigin(0.5));
    const stock = scene.add.text(18, 20, '', { fontFamily: 'Lilita One, Arial Black', fontSize: '18px', color: '#e8f8ff' }).setOrigin(0.5);
    stock.setName('stock');
    b.add(stock);
    const rim = scene.add.graphics();
    b.add(rim);
    let holdT: Phaser.Time.TimerEvent | null = null;
    let prog: Phaser.Tweens.Tween | null = null;
    const cancel = () => {
      holdT?.remove();
      holdT = null;
      prog?.stop();
      rim.clear();
    };
    b.setSize(168, 80).setInteractive({ useHandCursor: true });
    b.on('pointerdown', () => {
      cancel();
      const o = { t: 0 };
      prog = scene.tweens.add({ targets: o, t: 1, duration: 350, onUpdate: () => rim.clear().lineStyle(6, 0xffcf33, 1).beginPath().arc(0, 0, 46, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * o.t).strokePath() });
      holdT = scene.time.delayedCall(350, () => {
        cancel();
        if (!recordCommand(scene.runLog, scene.s, { k: 'capsule' }).ok) return;
        scene.meta.capsules = Math.max(0, (scene.meta.capsules ?? 0) - 1);
        store(META_KEY, JSON.stringify(scene.meta));
        tlog.log('booster', { kind: 'time_capsule', level: scene.s.level, at: +scene.s.elapsed.toFixed(1), left: scene.meta.capsules });
        sfx.capsule();
        scene.floatText(scene.timerText.x - 60, scene.timerText.y + 60, '+15s', '#7fe0ff', 40, 300);
      });
    });
    b.on('pointerup', cancel);
    b.on('pointerout', cancel);
    scene.capsuleBtn = b;
  }
  scene.capsuleBtn?.setVisible(capOk);
  (scene.capsuleBtn?.getByName('stock') as Phaser.GameObjects.Text | undefined)?.setText(`hold  ·  ${scene.meta.capsules ?? 0} left`);
  const t = Math.ceil(s.timeLeft);
  scene.timerText.setText(demo || s.showcase ? '' : `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`);
  textColor(scene.timerText, s.timeLeft < 10 && !demo ? '#d8261a' : '#3b2533');
  scene.drawClock(demo || !!s.showcase);
  scene.practiceText.setVisible(s.practice && !demo);
  // QA PACE MANIA: label the craze rules on the HUD (top-right of the stage window)
  if (!scene.maniaBadge) scene.maniaBadge = scene.add.text(W - 92, STAGE_TOP + 28, 'MANIA', { fontFamily: 'Lilita One, Arial Black', fontSize: '26px', color: '#ffffff', backgroundColor: '#c0287a', padding: { x: 12, y: 4 } }).setOrigin(1, 0.5).setDepth(22);
  scene.maniaBadge.setVisible(TUNING.pace === 'mania' && s.level !== undefined && !s.puzzle && !demo);
  // QA THINK BANK: PAUSED while the still board holds the clock, else the seconds left in the bank
  if (!scene.thinkBadge) scene.thinkBadge = scene.add.text(W - 92, STAGE_TOP + 70, '', { fontFamily: 'Lilita One, Arial Black', fontSize: '22px', color: '#ffffff', padding: { x: 10, y: 3 } }).setOrigin(1, 0.5).setDepth(22);
  const bankLeft = Math.max(0, Math.ceil(TUNING.tb.bank - (s.banked ?? 0)));
  scene.thinkBadge.setVisible(TUNING.thinkBank && s.level !== undefined && !s.puzzle && !demo && s.phase === 'playing');
  scene.thinkBadge.setText(thinking(s) ? `PAUSED · ${bankLeft}s` : `BANK ${bankLeft}s`).setBackgroundColor(thinking(s) ? '#27a4c0' : '#8a6a4a');
  // r22 live star chase: the best star still reachable and its seconds left (saga levels only)
  const ldef = s.level !== undefined && !s.showcase && !s.rush && !s.bounty && !s.endless ? LEVELS[s.level - 1] : undefined;
  if (!scene.starChase) scene.starChase = scene.add.text(92, STAGE_TOP + 28, '', { fontFamily: 'Lilita One, Arial Black', fontSize: '30px', color: '#ffcf33', stroke: '#2b1d2e', strokeThickness: 6 }).setOrigin(0, 0.5).setDepth(22);
  if (ldef && s.phase === 'playing' && !demo) {
    const [g2, g3] = starGoals(ldef);
    const goal = s.elapsed <= g3 ? 3 : s.elapsed <= g2 ? 2 : 0;
    const left = Math.ceil((goal === 3 ? g3 : g2) - s.elapsed);
    const txt = goal ? `${goal}★ · ${left}s left` : '';
    if (txt !== scene.starChase.text) textColor(scene.starChase.setText(txt), left <= 5 ? '#ff8a5c' : '#ffcf33');
    scene.starChase.setVisible(!!goal);
  } else if (s.puzzle && s.phase === 'playing') {
    // r42: the puzzle's rule lives where the star chase usually is
    const rule = s.puzzle.only ? `ONLY: ${s.puzzle.only.map((f) => FAMILY_INFO[f as 'cannon'].name.toUpperCase().replace('SIGNAL ', '')).join(' + ')}` : 'ANY MERGE';
    if (scene.starChase.text !== rule) textColor(scene.starChase.setText(rule), '#d9c2ff');
    scene.starChase.setVisible(true);
  } else scene.starChase.setVisible(false);
  const hudA = scene.time.now < scene.bannerUntil ? Math.max(0, scene.starChase.alpha - dms / 120) : Math.min(1, scene.starChase.alpha + dms / 250);
  scene.starChase.setAlpha(hudA);

  // smooth HP (goal levels: the bar fills with goal progress instead, r23)
  scene.shownHp += (s.hp - scene.shownHp) * Math.min(1, dms / 120);
  const frac = s.goal ? 1 - Math.min(1, s.goal.best / s.goal.n) : Math.max(0, scene.shownHp / s.maxHp);
  const bw = 440;
  const hb = scene.hpBar.clear();
  if (scene.hpFill) {
    scene.hpFill.setCrop(0, 0, scene.hpFill.width * frac, scene.hpFill.height);
    scene.hpFill.setTint(frac > 0.5 ? 0xffffff : frac > 0.25 ? 0xffd27a : 0xff8a7a);
  } else {
  hb.fillStyle(0x2b1d2e, 1).fillRoundedRect(W / 2 - bw / 2 - 5, HP_Y - 18, bw + 10, 36, 18);
  hb.fillStyle(0x5a4a5a, 1).fillRoundedRect(W / 2 - bw / 2, HP_Y - 13, bw, 26, 13);
  if (frac > 0) hb.fillStyle(frac > 0.5 ? 0x5fd35f : frac > 0.25 ? 0xf2b521 : 0xe8452c, 1).fillRoundedRect(W / 2 - bw / 2, HP_Y - 13, Math.max(26, bw * frac), 26, 13);
  }
  scene.hpText.setText(s.showcase ? 'PRACTICE' : s.goal ? (s.goal.kind === 'rank' ? `BEST RANK ${Math.max(1, s.goal.best)} / ${s.goal.n}` : `BEST CHAIN ${s.goal.best} / ${s.goal.n}`) : fmt(Math.max(0, Math.round(scene.shownHp))));
  if (s.goal && scene.hpFill) scene.hpFill.setCrop(0, 0, scene.hpFill.width * (1 - frac), scene.hpFill.height).setTint(0x8ef08a);
  scene.drawPace(bw);
  // r23 chain shield chip + bubble on the monster
  if (!scene.shieldChip) {
    scene.shieldChip = scene.add.text(W - 92, STAGE_TOP + 34, '', { fontFamily: 'Lilita One, Arial Black', fontSize: '22px', color: '#9fe8ff', stroke: '#2b1d2e', strokeThickness: 6, align: 'right', lineSpacing: -4 }).setOrigin(1, 0.5).setDepth(22);
    scene.shieldG = scene.add.graphics().setDepth(4);
  }
  const sh = s.shieldUntil !== undefined && s.phase === 'playing';
  const open = sh && s.elapsed < s.shieldUntil!;
  const shTxt = open ? `SHIELD OPEN  ${(s.shieldUntil! - s.elapsed).toFixed(1)}s\nfull damage` : 'SHIELD CLOSED  \u00b7  x0.75\nchain of 4 opens it';
  if (scene.shieldChip.text !== shTxt) textColor(scene.shieldChip.setText(shTxt), open ? '#8ef08a' : '#9fe8ff');
  scene.shieldChip.setVisible(sh).setAlpha(hudA);
  scene.shieldG.clear();
  if (sh && !open) {
    const rr = Math.min(STAGE_H * 0.46, 170);
    scene.shieldG.fillStyle(0x6fd3ff, 0.16).fillCircle(scene.target.x, scene.target.y, rr).lineStyle(5, 0x9fe8ff, 0.8 + 0.2 * Math.sin(scene.time.now / 200)).strokeCircle(scene.target.x, scene.target.y, rr);
  }
  if (!scene.hpTicks) scene.hpTicks = scene.add.graphics().setDepth(3);
  const ht = scene.hpTicks.clear();
  if (scene.realBoss && !BOSSES[scene.realBoss.def].mini) {
    // r30 (ChatGPT): bosses show their armor phases in the bar
    for (const q of [0.66, 0.33]) {
      const x = W / 2 - bw / 2 + bw * q;
      ht.fillStyle(0x2b1d2e, 1).fillRect(x - 5, HP_Y - 19, 10, 38).fillStyle(frac > q ? 0xe0b04a : 0x8a6a3a, 1).fillRect(x - 3, HP_Y - 17, 6, 34);
    }
  } else if (s.target >= 0 && TUNING.kickback && !s.goal)
    for (const q of [0.75, 0.5, 0.25]) {
      const x = W / 2 - bw / 2 + bw * q;
      ht.fillStyle(0x2b1d2e, frac > q ? 0.85 : 0.3).fillRect(x - 2, HP_Y - 15, 4, 30);
    }

  // r18 progressive reveal: overdrive from level 3, scrap from level 4
  const early = s.level !== undefined && s.level < 3;
  scene.scrapZone?.setVisible(scene.scrapShown());
  // overdrive gauge
  const og = scene.odGauge.clear();
  // experiments charge Overdrive by chain links (12 to fill): the 6 pips show the fraction
  const need = Math.min(6, odNeeded(s));
  const charged = Math.floor((s.odCharge * need) / odNeeded(s));
  const gx = 384;
  scene.boltIcon?.setPosition(gx - 26, 46).setVisible(!demo && !early).setAngle(s.odLeft > 0 ? Math.sin(scene.time.now / 60) * 12 : 0);
  scene.odLabel?.setVisible(!demo && !early);
  const active = s.odLeft > 0;
  const gaugeArt = scene.hasArt('gauge_off') && scene.hasArt('gauge_on');
  if (gaugeArt && !scene.gaugeImgs.length) for (let i = 0; i < 6; i++) scene.gaugeImgs.push(scene.add.image(0, 46, 'gauge_off').setDisplaySize(24, 34));
  scene.gaugeImgs.forEach((g, i) => {
    const on = i < need && !demo && !early;
    g.setVisible(on).setPosition(gx + i * 26 + 11, 46);
    if (on) g.setTexture(active ? (scene.hasArt('gauge_lit') ? 'gauge_lit' : 'gauge_on') : i < charged ? 'gauge_on' : 'gauge_off').setDisplaySize(24, 34);
  });
  for (let i = 0; i < (demo || gaugeArt || early ? 0 : need); i++) {
    const filled = active || i < charged;
    og.fillStyle(0x2b1d2e, 1).fillRoundedRect(gx + i * 26, 30, 22, 30, 6);
    // charged pips in the OVERDRIVE hue (gold is MAX only); while Overdrive runs they pulse toward white
    const lit = active ? Phaser.Display.Color.Interpolate.ColorWithColor(Phaser.Display.Color.ValueToColor(OD_COL), Phaser.Display.Color.ValueToColor(0xffffff), 100, 50 + 50 * Math.sin(scene.time.now / 90)) : null;
    og.fillStyle(filled ? (lit ? Phaser.Display.Color.GetColor(lit.r, lit.g, lit.b) : OD_COL) : 0x7a6a6a, 1).fillRoundedRect(gx + i * 26 + 3, 33, 16, 24, 4);
  }
  // EXPERIMENT spam fatigue (QA toggle): STEADY HAND bar under the gauge refills over the fatigue window after a merge;
  // a merge made before it is full hits for less (its damage number is dimmed)
  const fc = fatigueCfg();
  const steadyOn = !!fc && !demo && !early && s.phase === 'playing' && !s.goal && !s.puzzle;
  if (steadyOn) {
    const p = Math.min(1, (s.elapsed - (s.lastMergeAt ?? -1e9)) / fc!.window);
    og.fillStyle(0x2b1d2e, 1).fillRoundedRect(gx, 66, 152, 12, 6);
    og.fillStyle(p >= 1 ? 0x5fbf4a : 0xe0a020, 1).fillRoundedRect(gx + 2, 68, Math.max(4, 148 * p), 8, 4);
  }
  scene.steadyText.setVisible(steadyOn);
  setMusicIntensity(active);
  const rb = scene.realBoss;
  setMusicMode(!rb || s.phase !== 'playing' ? 'normal' : BOSSES[rb.def].mini ? 'mini' : rb.phaseShown >= 2 ? 'final' : 'boss');
  const glow = scene.odGlow.clear();
  for (const fl of scene.flames) fl.setVisible(active).setAlpha(0.75 + 0.25 * Math.sin(scene.time.now / 70));
  if (active && !scene.flames.length) {
    const a = 0.35 + 0.25 * Math.sin(scene.time.now / 90);
    glow.lineStyle(14, PALETTE.overdrive.hue, a).strokeRoundedRect(BX - 14, BY - 14, CELL * COLS + 28, CELL * ROWS + 28, 30);
  }

  // tray
  const nxt = peekNext(s);
  scene.trayIcon.setTexture(`${nxt.family}_${nxt.rank}`);
  const f = scene.trayIcon.frame;
  scene.trayIcon.setScale(Math.min(54 / f.width, 54 / f.height));
  scene.trayBadge.setText(nxt.rank > 1 ? String(nxt.rank) : '');
  const ta = scene.trayArc.clear();
  const prog = s.pending.length >= TUNING.maxPending ? 1 : 1 - s.supplyTimer / supplyPeriod(s);
  ta.lineStyle(6, 0xfbe7c6, 0.9).beginPath().arc(BX + 150, TRAY_Y, 38, -Math.PI / 2, -Math.PI / 2 + prog * Math.PI * 2).strokePath();
  // r38: reactive levels say what the next merge earns (the board only changes when you merge)
  const earn = mergeEarns(s);
  scene.pendingText.setText(s.pending.length ? (s.trayHold ? `board full · +${s.pending.length}` : `+${s.pending.length} waiting`) : s.reactive && s.phase === 'playing' ? trayEarnText(earn, !!earn && supplyGated(s)) : '');
  textBg(textColor(scene.pendingText, s.pending.length ? '#9e2416' : '#3b2533'), scene.pendingText.text && !s.pending.length ? '#fbe7c6' : '', scene.pendingText.text && !s.pending.length ? 10 : 0, 4);
  const tut = s.phase === 'tutorial';
  scene.scrapZone.setVisible(scene.scrapShown());
  scene.trayPlate?.setVisible(!tut && !s.puzzle);
  for (const o of [scene.trayBox, scene.trayLabel, scene.trayIcon, scene.trayBadge, scene.trayArc, scene.pendingText]) o.setVisible(!tut && !s.puzzle);
  scene.hintBtn?.setVisible(!!s.puzzle && s.phase === 'playing');
  const help = scene.puzzleHelpNow();
  scene.helpBtn?.setVisible(!!s.puzzle && s.phase === 'playing' && help.hint);
  scene.helpLabel?.setText(help.showMove ? 'NEXT MOVE' : 'HINT');
  const sr = scene.scrapRing.clear();
  if (scene.dragIdx >= 0 && scene.overScrapFlag) {
    const g = s.grid[scene.dragIdx];
    const need2 = g && g.rank >= 3 ? 0.25 : 0;
    const p = need2 ? Math.min(1, scene.scrapHold / need2) : 1;
    sr.lineStyle(6, 0xff5533, 1).beginPath().arc(0, 0, 50, -Math.PI / 2, -Math.PI / 2 + p * Math.PI * 2).strokePath();
  }
}

/** r46 ghost pace on a replay of a beaten level: a thin tick on the HP bar where the best run's HP is now, and a
 *  small "2.1 s ahead" above the bar's right end (over the stage, never the board). Text refreshes 4x a second. */
export function drawPace(scene: GameScene, bw: number) {
  const s = scene.s;
  const p = scene.paceGhost && s.phase === 'playing' && !scene.modal ? levelProgress(s) : null;
  if (!scene.paceText) {
    scene.paceText = scene.add.text(W / 2 + bw / 2, HP_Y - 30, '', { fontFamily: 'Lilita One, Arial Black', fontSize: '20px', color: '#fff0cf', stroke: '#2b1d2e', strokeThickness: 5 }).setOrigin(1, 0.5).setDepth(4).setAlpha(0.85);
    scene.paceG = scene.add.graphics().setDepth(3.5); // above the HP number and the kickback quarter ticks
  }
  scene.paceG!.clear();
  if (p === null || !scene.paceGhost || s.elapsed < 1) {
    scene.paceText.setVisible(false);
    return;
  }
  // ghost marker: the ghost's damage mapped into the current machine's bar (stages: the bar is per machine)
  const st = s.stage;
  const g = ghostProgress(scene.paceGhost, s.elapsed);
  const inMachine = st ? (g * st.total - st.done) / s.maxHp : g;
  const gx = W / 2 - bw / 2 + bw * (1 - Math.min(1, Math.max(0, inMachine)));
  scene.paceG!.fillStyle(0x2b1d2e, 0.9).fillRect(gx - 2.5, HP_Y - 16, 5, 32); // dark outline: readable on the pale fill
  scene.paceG!.fillStyle(0xfff0cf, 0.95).fillRect(gx - 1.5, HP_Y - 15, 3, 30);
  if (scene.paceShownAt < 0 || s.elapsed - scene.paceShownAt >= 0.25 || s.elapsed < scene.paceShownAt) {
    scene.paceShownAt = s.elapsed;
    const d = paceDelta(scene.paceGhost, s.elapsed, p);
    textColor(scene.paceText.setText(paceLabel(d)), Math.abs(d) < 0.05 ? '#fff0cf' : d > 0 ? '#8ef08a' : '#ffa58a');
  }
  scene.paceText.setVisible(true);
}

/** r25: tray slot (between NEXT and SCRAP), drag ghost, valid-target rims, and owner badges with charge pips. */
export function drawItems(scene: GameScene) {
  const s = scene.s;
  if (!scene.itemG) scene.itemG = scene.add.graphics().setDepth(57);
  const g = scene.itemG.clear();
  const kind = s.itemTray ?? null;
  if (kind && !scene.itemSlot) {
    const c = scene.add.container(ITEM_X, TRAY_Y).setDepth(58);
    c.add(scene.add.graphics().fillStyle(0x2b1d2e, 1).fillCircle(0, 0, 38).fillStyle(0xfff0cf, 1).fillCircle(0, 0, 33));
    const ic = scene.add.image(0, 0, `item_${kind}`);
    ic.setScale(60 / Math.max(ic.width, ic.height)).setName('icon');
    c.add(ic);
    scene.itemSlot = c;
  }
  if (!kind && scene.itemSlot) {
    scene.itemSlot.destroy();
    scene.itemSlot = null;
  }
  if (scene.itemSlot && kind) {
    const ic = scene.itemSlot.getByName('icon') as Phaser.GameObjects.Image;
    if (ic.texture.key !== `item_${kind}`) ic.setTexture(`item_${kind}`);
    const lift = scene.itemDrag?.moved;
    ic.setPosition(lift ? scene.itemDrag!.x - ITEM_X : 0, lift ? scene.itemDrag!.y - TRAY_Y - 30 : 0).setScale((lift ? 84 : 60 + 4 * Math.sin(scene.time.now / 180)) / Math.max(ic.width, ic.height));
    // while selecting: rim every machine that can take it
    if (scene.itemDrag || scene.itemSelected || scene.itemLesson)
      s.grid.forEach((x, i) => {
        if (!x || !itemFits(kind, x.family) || x.item) return;
        const { x: cx, y: cy } = cellXY(i);
        g.lineStyle(6, ITEM_COL, 0.6 + 0.4 * Math.sin(scene.time.now / 150)).strokeRoundedRect(cx - CELL / 2 + 5, cy - CELL / 2 + 5, CELL - 10, CELL - 10, 16);
      });
  }
  // owner badges (top-centre slot, clear of the helper marks and the rank plate) + pips for OVERCHARGE
  const seen = new Set<number>();
  for (const x of s.grid) {
    if (!x?.item) continue;
    seen.add(x.id);
    const v = scene.views.get(x.id);
    if (!v) continue;
    let b = scene.itemBadges.get(x.id);
    if (!b || b.getData('kind') !== x.item.kind) {
      b?.destroy();
      b = scene.add.container(0, 0).setDepth(56).setData('kind', x.item.kind);
      const im = scene.add.image(0, 0, `item_badge_${x.item.kind}`);
      im.setScale(40 / Math.max(im.width, im.height));
      b.add(im);
      const pips = scene.add.graphics().setName('pips');
      b.add(pips);
      scene.itemBadges.set(x.id, b);
      b.setScale(0.2);
      scene.tweens.add({ targets: b, scale: 1, duration: 180, ease: 'Back.Out' });
    }
    b.setPosition(v.x + SLOT.item.x, v.y + SLOT.item.y).setVisible(v.visible);
    const pg = b.getByName('pips') as Phaser.GameObjects.Graphics;
    pg.clear();
    if (x.item.kind === 'overcharge') for (let k = 0; k < x.item.charges; k++) pg.fillStyle(0x2b1d2e, 1).fillCircle(-8 + k * 16, 26, 7).fillStyle(ITEM_COL, 1).fillCircle(-8 + k * 16, 26, 5);
  }
  for (const [id, b] of scene.itemBadges)
    if (!seen.has(id)) {
      scene.itemBadges.delete(id);
      scene.tweens.add({ targets: b, scale: 1.6, alpha: 0, duration: 160, onComplete: () => b.destroy() });
    }
}

/** Transient message in the event lane. Remix warnings (drawRemix) override it while active. */
/** r34: draining clock ring + 30 s warning + last-10 countdown over the board (the board is where the player looks). */
export function drawClock(scene: GameScene, hidden: boolean) {
  const s = scene.s;
  const r = scene.clockRing.clear();
  const sc = s.stage ? scene.stageCount() : undefined;
  if (scene.mergesLeftLabel.visible !== !!s.puzzle) scene.mergesLeftLabel.setVisible(!!s.puzzle).setY(HP_Y - 52);
  // puzzles set the pips to merges-left below: skip this text so it isn't re-rendered twice every frame
  if (!s.puzzle) scene.stagePips.setText(sc ? `${sc.goal ? 'GOAL' : `${sc.at}/${sc.n}`}` : '').setVisible(!!sc && !hidden);
  if (sc) {
    r.fillStyle(0x2b1d2e, 1).fillRoundedRect(W - CLOCK_X - 46, HP_Y - 26, 92, 52, 16);
  }
  if (s.puzzle) {
    // r42 puzzles: no time; the ring shows merges left
    scene.timerText.setText('');
    const left = s.puzzle.moves - s.puzzle.used;
    r.fillStyle(0x2b1d2e, 1).fillCircle(CLOCK_X, HP_Y, 50).fillStyle(0x8e58c9, 1).fillCircle(CLOCK_X, HP_Y, 40);
    scene.stagePips.setText(`${left}`).setVisible(true).setPosition(CLOCK_X, HP_Y).setFontSize(44);
    return;
  }
  scene.stagePips.setPosition(W - CLOCK_X, HP_Y).setFontSize(30);
  if (hidden || s.phase === 'tutorial') return;
  const total = s.levelTime ?? TUNING.runTime;
  const frac = Phaser.Math.Clamp(s.timeLeft / Math.max(1, total), 0, 1);
  const col = s.timeLeft < 10 ? 0xe8452c : s.timeLeft < 30 ? 0xf2b521 : 0x5fd35f;
  r.fillStyle(0x2b1d2e, 1).fillCircle(CLOCK_X, HP_Y, 50);
  r.fillStyle(0xfff0cf, 1).fillCircle(CLOCK_X, HP_Y, 36);
  if (frac > 0) r.lineStyle(10, col, 1).beginPath().arc(CLOCK_X, HP_Y, 43, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * frac, false).strokePath();
  // r39: gold ticks where the 2- and 3-star times fall (still reachable ones bright, missed ones faded)
  const sdef = s.level !== undefined && !s.rush && !s.bounty && !s.endless ? LEVELS[s.level - 1] : undefined;
  if (sdef?.star_times)
    for (const st of sdef.star_times) {
      const a = -Math.PI / 2 + Math.PI * 2 * Math.max(0, (total - st) / total);
      const live = s.elapsed <= st;
      r.lineStyle(5, live ? 0xffcf33 : 0x8a7a5a, live ? 1 : 0.6).lineBetween(CLOCK_X + Math.cos(a) * 36, HP_Y + Math.sin(a) * 36, CLOCK_X + Math.cos(a) * 52, HP_Y + Math.sin(a) * 52);
    }
  const sec = Math.ceil(s.timeLeft);
  if (sec !== scene.lastSec && s.phase === 'playing' && !scene.paused) {
    const prev = scene.lastSec;
    scene.lastSec = sec;
    if (prev > 30 && sec <= 30 && total > 45) scene.showEvent('30 SECONDS LEFT!', '#ffcf33', 1100);
    if (sec <= 10 && sec > 0 && prev > sec) {
      scene.timerText.setScale(1.45);
      scene.tweens.add({ targets: scene.timerText, scale: 1, duration: 320, ease: 'Back.Out' });
      const big = scene.add.text(W / 2, BY + (CELL * ROWS) / 2, String(sec), { fontFamily: 'Lilita One, Arial Black', fontSize: '260px', color: '#e8452c', stroke: '#2b1d2e', strokeThickness: 14 }).setOrigin(0.5).setDepth(70).setAlpha(0.32).setScale(1.2);
      scene.tweens.add({ targets: big, alpha: 0, scale: 0.9, duration: 800, onComplete: () => big.destroy() });
      scene.cameras.main.flash?.(120, 120, 20, 10, false);
    }
  }
}

export function showEvent(scene: GameScene, text: string, color = '#fff0cf', ms = 1400) {
  scene.laneMsg = { text, color, until: scene.time.now + ms };
  scene.laneText.setScale(1.25);
  scene.tweens.add({ targets: scene.laneText, scale: 1, duration: 180, ease: 'Back.Out' });
}

export function updateLane(scene: GameScene, persistent: string | null, color = '#ffd2c8') {
  const msg = persistent ?? (scene.time.now < scene.laneMsg.until ? scene.laneMsg.text : '');
  const col = persistent ? color : scene.laneMsg.color;
  const on = !!msg;
  if (msg && msg !== scene.laneText.text) {
    scene.laneText.setFontSize(28).setText(msg);
    if (scene.laneText.width > 610) scene.laneText.setFontSize(Math.max(26, Math.floor((28 * 610) / scene.laneText.width)));
  }
  if (msg) textColor(scene.laneText, col);
  const a = on ? 1 : Math.max(0, scene.laneText.alpha - 0.08);
  scene.laneText.setAlpha(a);
  scene.laneBg.setAlpha(a * 0.95);
}
