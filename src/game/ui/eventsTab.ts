import { sfx } from '../audio';
import * as tlog from '../../platform/telemetry';
import { META_KEY } from '../../platform/backup';
import { RUSH_REWARDS, weekId } from '../../core/rush';
import { YARD_BOOSTERS, YARD_TIERS } from '../../core/screw';
import { nextYard, tierReached, YARD_COUNT, yardPlayable, yardStarTotal } from '../../core/yardWeek';
import { BOOSTER_COPY } from '../../core/marks';
import { dailyTasks, SEASON_TIERS, seasonDayLeft, seasonTier, TIER_XP, tierRewards, weeklyTasks } from '../../core/season';
import { localDate, store } from '../meta';
import { isNew, UNLOCK_LEVEL, type Feature } from '../unlocks';
import type { GameScene } from '../GameScene';
import { W, YARD_UNLOCK, H } from '../sceneKit';
import { mergesText } from '../../content/sceneCopy';
import { qaYardObject } from './qaPanel';
import { pickedUnit, pickUnit, UNIT_NAMES, YARD_UNITS, yardObjectOf } from '../../content/yardObjects';

/** EVENTS tab: Daily (level 3), Challenge (level 5), Remix (level 10), plus the classic 3-monster run. */
export function openEventsTab(scene: GameScene) {
  scene.closeModal();
  const m = scene.meta;
  const c = scene.add.container(0, 0).setDepth(100);
  if (scene.homeC?.active) scene.homeC.destroy();
  scene.homeC = c;
  scene.modal = c;
  const bg = scene.add.image(W / 2, 0, scene.hasArt('road_bg') ? 'road_bg' : 'hero_bg').setOrigin(0.5, 0);
  bg.setScale(Math.max(W / bg.width, H / bg.height));
  c.add([bg, scene.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.001).setInteractive()]);
  scene.drawWallet(c);
  c.add(scene.add.text(W / 2, 170, 'EVENTS', { fontFamily: 'Lilita One, Arial Black', fontSize: '56px', color: '#3b2533', stroke: '#fff0cf', strokeThickness: 4 }).setOrigin(0.5));
  const lv = scene.currentLevel() - 1; // levels cleared
  const card =(y: number, h: number, title: string, lines: string[], col: number, open: boolean, need: number, cb: () => void, extra?: [string, () => void, boolean]) => {
    const cc = scene.add.container(W / 2, y);
    if (scene.hasArt('ui_card')) cc.add(scene.add.image(0, 0, 'ui_card').setDisplaySize(W - 50, h));
    else cc.add(scene.add.graphics().fillStyle(0xfbe7c6, 1).fillRoundedRect(-(W - 50) / 2, -h / 2, W - 50, h, 26));
    cc.add(scene.add.text(-(W - 50) / 2 + 44, -h / 2 + 40, title, { fontFamily: 'Lilita One, Arial Black', fontSize: '38px', color: '#3b2533' }).setOrigin(0, 0.5));
    cc.add(scene.add.text(-(W - 50) / 2 + 44, -h / 2 + 72, open ? lines.join('\n') : `Unlocks after level ${need}`, { fontFamily: 'Arial', fontStyle: 'bold', fontSize: '22px', color: '#5a4a5a', lineSpacing: 6, wordWrap: { width: W - 330 } }));
    const b = scene.button(cc, (W - 50) / 2 - 130, h / 2 - 56, 200, open ? 'PLAY' : 'LOCKED', col, open ? cb : () => scene.showToast(`UNLOCKS AT LEVEL ${need}`), 0.72);
    if (!open) b.setAlpha(0.5);
    // extra[2]: the link shows even while the card itself is locked
    if (extra && (open || extra[2])) {
      const t = scene.add.text(-(W - 50) / 2 + 44, h / 2 - 50, extra[0], { fontFamily: 'Lilita One, Arial Black', fontSize: '24px', color: '#b06a1a' }).setOrigin(0, 0.5).setInteractive({ useHandCursor: true });
      t.on('pointerup', extra[1]);
      cc.add(t);
    }
    c.add(cc);
    return cc;
  };
  // t-2fd7bb86: Daily Puzzle, Challenge and Remix each open on their own level (unlocks.ts)
  const dailyOpen = m.playtestMode ? lv >= 10 : scene.featureOpen('puzzles');
  const modesOpen = !m.playtestMode && (['puzzles', 'challenge', 'remix'] as Feature[]).some((f) => scene.featureOpen(f));
  const modesNew = (['challenge', 'remix'] as Feature[]).some((f) => isNew(m, f));
  // r42 DAILY PUZZLE leads the Events tab (Daily Bench + classic modes moved behind "Other modes")
  const pz = scene.puzzleRec();
  const solvedToday = pz.lastSolved === localDate();
  const dp = scene.dailyPuzzle();
  const dcard = card(330, 220, solvedToday ? 'DAILY PUZZLE ✓' : 'DAILY PUZZLE', [`Win in ${mergesText(dp.moves)}${dp.only ? '  ·  special rule' : ''}  ·  streak ${pz.streak}`, solvedToday ? 'Solved! New puzzle tomorrow' : 'Reward: 40 Bolts + 3 Gems'], 0x8e58c9, dailyOpen, m.playtestMode ? 10 : UNLOCK_LEVEL.puzzles!, () => (scene.seen('puzzles'), scene.startPuzzle(dp, 'daily')), ['Other modes \u203a', () => scene.openOtherModes(), modesOpen]);
  if (dailyOpen && isNew(m, 'puzzles')) scene.newTag(dcard, 70, -70);
  if (modesOpen && modesNew) scene.newTag(dcard, -(W - 50) / 2 + 220, 110 - 50 - 18, 0.8);
  if (m.playtestMode) {
    scene.drawNav(c, 'events');
    return;
  }
  // r29 BOSS RUSH card (before the older modes)
  const rushOpen = scene.rushEligible();
  const rw = m.rush?.week === weekId() ? m.rush.granted : 0;
  scene.bountyCard(c, 585);
  card(845, 240, 'BOSS RUSH', ['3 fights in a row  \u00b7  fresh boards', `This week: ${rw}/${RUSH_REWARDS[2]} Bolts${m.rush?.medal ? '  \u00b7  medal ✓' : ''}`], 0x8e58c9, !!rushOpen, 20, () => scene.startRush());
  // r36 SCREW YARD weekly event (outside-core mini-game)
  const yd = scene.yardWeek();
  const tierNow = YARD_TIERS.filter((_, i) => tierReached(yd, i)).length;
  card(1100, 230, 'SCREW YARD', [`TIER ${tierNow}/${YARD_TIERS.length}  ·  ★ ${yardStarTotal(yd)}/${YARD_COUNT * 3}  ·  ends in ${scene.weekLeft()}`, 'Free to play  ·  Grand prize: Gold Crate + Epic'], 0xe0a020, lv >= YARD_UNLOCK, YARD_UNLOCK, () => scene.openYardEvent());
  scene.drawNav(c, 'events');
}

/** Screw Yard event panel (2.0): the star track + grand prize, the week's 10 yards with their stars, boosters, PLAY.
 *  Free to play: the r36 screwdriver ticket is gone (the 10-yard ramp already caps the week; stars pay, not volume). */
export function openYardEvent(scene: GameScene) {
  scene.closeModal();
  const yd = scene.yardWeek();
  const bst = scene.yardBoosters();
  const PH = 1180;
  const c = scene.sheet(PH);
  const top = H / 2 - PH / 2;
  const total = yardStarTotal(yd);
  scene.sheetTitle(c, top, 'SCREW YARD', `Earn stars to climb the tiers.  Event ends in ${scene.weekLeft()}.`);
  const rows = YARD_TIERS.length;
  YARD_TIERS.forEach((t, i) => {
    const y = top + 196 + i * 66;
    const done = tierReached(yd, i);
    const grand = i === rows - 1;
    const g = scene.add.graphics();
    g.fillStyle(grand ? 0xffcf33 : done ? 0x8ef08a : 0xfbe7c6, 1).fillRoundedRect(70, y - 29, W - 140, 58, 16);
    g.lineStyle(4, 0x2b1d2e, grand ? 1 : 0.4).strokeRoundedRect(70, y - 29, W - 140, 58, 16);
    c.add(g);
    c.add(scene.add.text(96, y, done ? '✓' : `★${t.need}`, { fontFamily: 'Lilita One, Arial Black', fontSize: '28px', color: '#3b2533' }).setOrigin(0, 0.5));
    c.add(scene.add.text(186, y, `${grand ? 'GRAND PRIZE: ' : ''}${scene.rewardText(t.reward)}`, { fontFamily: 'Lilita One, Arial Black', fontSize: grand ? '22px' : '24px', color: '#3b2533' }).setOrigin(0, 0.5));
  });
  // the week's 10 yards: number + best stars; open ones can be replayed for more stars
  const cy = top + 196 + rows * 66 + 40;
  for (let n = 1; n <= YARD_COUNT; n++) {
    const x = W / 2 + (n - (YARD_COUNT + 1) / 2) * 62;
    const open = yardPlayable(yd, n);
    const s = yd.stars?.[n] ?? 0;
    const g = scene.add.graphics();
    g.fillStyle(s ? 0xffe9a8 : open ? 0xfbe7c6 : 0xcdbfa8, 1).fillRoundedRect(x - 28, cy - 34, 56, 76, 14).lineStyle(3, 0x2b1d2e, open ? 0.8 : 0.3).strokeRoundedRect(x - 28, cy - 34, 56, 76, 14);
    c.add(g);
    c.add(scene.add.text(x, cy + 24, '★'.repeat(s) + '☆'.repeat(3 - s), { fontFamily: 'Arial', fontStyle: 'bold', fontSize: '17px', color: s ? '#c07a00' : '#8a7a6a' }).setOrigin(0.5));
    const t = scene.add.text(x, cy - 6, open ? String(n) : '\u{1F512}', { fontFamily: 'Lilita One, Arial Black', fontSize: open ? '30px' : '22px', color: '#3b2533' }).setOrigin(0.5);
    c.add(t);
    if (open) {
      const hit = scene.add.zone(x, cy + 4, 56, 76).setInteractive({ useHandCursor: true });
      hit.on('pointerup', () => scene.startYard(n));
      c.add(hit);
    }
  }
  const by = cy + 78;
  c.add(scene.add.text(W / 2, by, `★ ${total}/${YARD_COUNT * 3}  ·  ${YARD_BOOSTERS.map((k) => `${BOOSTER_COPY[k].name} ${bst[k] ?? 0}`).join('  ')}`, { fontFamily: 'Lilita One, Arial Black', fontSize: '25px', color: '#5a3a3a' }).setOrigin(0.5));
  c.add(scene.add.text(W / 2, by + 44, 'Free to play. Stars: keep the dock nearly empty.\nBoosters are earned with 3 stars and tiers.', { fontFamily: 'Arial', fontStyle: 'bold', fontSize: '20px', color: '#7a5a4a', align: 'center' }).setOrigin(0.5));
  const nx = nextYard(yd);
  if (qaYardObject()) {
    // QA SCREW YARD = OBJECT: which unit to take apart (default: rotation by day); easy > hard left to right
    const now = pickedUnit();
    YARD_UNITS.forEach((u, i) => scene.button(c, W / 2 + (i - 1) * 190, top + PH - 245, 175, UNIT_NAMES[u], u === now ? 0x5fbf4a : 0x8a6a4a, () => (pickUnit(u), openYardEvent(scene)), 0.6));
  }
  scene.button(c, W / 2, top + PH - 170, 460, qaYardObject() ? `PLAY ${yardObjectOf().name}` : `PLAY YARD ${nx}`, 0x5fbf4a, () => scene.startYard(nx), 0.95);
  scene.button(c, W / 2, top + PH - 70, 260, 'BACK', 0x8a6a4a, () => scene.openTitle('events'), 0.75);
}

export function openOtherModes(scene: GameScene) {
  scene.closeModal();
  const m = scene.meta;
  const c = scene.sheet(560);
  const top = H / 2 - 280;
  scene.sheetTitle(c, top, 'OTHER MODES', 'Daily Bench and the classic modes.');
  // t-2fd7bb86: each mode opens on its own level; Daily Bench comes with the Daily Puzzle
  const mode = (y: number, label: string, col: number, f: Feature, go: () => void) => {
    const open = scene.featureOpen(f);
    const b = scene.button(c, W / 2, y, 440, label, col, () => (open ? (scene.seen(f), go()) : scene.showToast(`UNLOCKS AT LEVEL ${UNLOCK_LEVEL[f]}`)), 0.85);
    if (!open) b.setAlpha(0.5);
    else if (isNew(m, f)) scene.newTag(c, W / 2 + 170, y - 34);
  };
  mode(top + 210, 'DAILY BENCH', 0x5fbf4a, 'puzzles', () => scene.startDaily());
  mode(top + 320, 'CHALLENGE', 0xe8452c, 'challenge', () => scene.retry(true, -1));
  mode(top + 430, 'REMIX', 0x27a4c0, 'remix', () => scene.openRemixPicker());
}

/** r41 SEASON panel: XP bar, today's + this week's tasks, the tier track around the current tier, claim all, premium. */
export function openSeason(scene: GameScene) {
  scene.closeModal();
  const m = scene.meta;
  const rec = scene.seasonRec();
  const day = Math.floor(Date.now() / 86400000);
  const tier = seasonTier(rec);
  const PH = 1220;
  const c = scene.sheet(PH);
  const top = H / 2 - PH / 2;
  scene.sheetTitle(c, top, 'WORKSHOP SEASON', `Tier ${tier}/${SEASON_TIERS}  ·  ends in ${seasonDayLeft(day)} days`);
  // XP bar
  const into = tier >= SEASON_TIERS ? TIER_XP : rec.xp - tier * TIER_XP;
  const g = scene.add.graphics().fillStyle(0x2b1d2e, 1).fillRoundedRect(80, top + 168, W - 160, 30, 15).fillStyle(0xe0a020, 1).fillRoundedRect(84, top + 172, Math.max(22, (W - 168) * (into / TIER_XP)), 22, 11);
  c.add(g);
  c.add(scene.add.text(W / 2, top + 183, `${into}/${TIER_XP} XP`, { fontFamily: 'Lilita One, Arial Black', fontSize: '20px', color: '#ffffff', stroke: '#2b1d2e', strokeThickness: 4 }).setOrigin(0.5));
  // tasks
  const taskLine = (y: number, text: string, have: number, need: number, xp: number) => {
    const done = have >= need;
    c.add(scene.add.text(86, y, `${done ? '\u2713' : '\u25cb'} ${text}`, { fontFamily: 'Lilita One, Arial Black', fontSize: '22px', color: done ? '#3a8a2a' : '#3b2533' }).setOrigin(0, 0.5));
    c.add(scene.add.text(W - 86, y, done ? 'DONE' : `${have}/${need}  \u00b7  +${xp}`, { fontFamily: 'Lilita One, Arial Black', fontSize: '20px', color: done ? '#3a8a2a' : '#8a6a5a' }).setOrigin(1, 0.5));
  };
  c.add(scene.add.text(86, top + 230, 'TODAY', { fontFamily: 'Lilita One, Arial Black', fontSize: '22px', color: '#b06a1a' }).setOrigin(0, 0.5));
  dailyTasks(rec.day).forEach((t, i) => taskLine(top + 264 + i * 34, t.text, rec.daily[i], t.n, 15));
  c.add(scene.add.text(86, top + 378, 'THIS WEEK', { fontFamily: 'Lilita One, Arial Black', fontSize: '22px', color: '#b06a1a' }).setOrigin(0, 0.5));
  weeklyTasks(rec.week).forEach((t, i) => taskLine(top + 412 + i * 34, t.text, rec.weekly[i], t.n, 100));
  // track: 6 tiers from the current one
  c.add(scene.add.text(W / 2 - 100, top + 560, 'FREE', { fontFamily: 'Lilita One, Arial Black', fontSize: '22px', color: '#3b2533' }).setOrigin(0.5));
  c.add(scene.add.text(W / 2 + 170, top + 560, rec.premium ? 'PREMIUM \u2713' : 'PREMIUM', { fontFamily: 'Lilita One, Arial Black', fontSize: '22px', color: '#8e58c9' }).setOrigin(0.5));
  const first = Math.max(1, Math.min(SEASON_TIERS - 5, tier));
  for (let k = 0; k < 6; k++) {
    const t = first + k;
    const y = top + 604 + k * 66;
    const [fr, pr] = tierRewards(t);
    const reached = t <= tier;
    c.add(scene.add.graphics().fillStyle(reached ? 0x8ef08a : 0xfbe7c6, reached ? 0.45 : 1).fillRoundedRect(70, y - 28, W - 140, 56, 14));
    c.add(scene.add.text(96, y, `${t}`, { fontFamily: 'Lilita One, Arial Black', fontSize: '26px', color: '#3b2533' }).setOrigin(0, 0.5));
    const fDone = rec.claimed.free.includes(t), pDone = rec.claimed.prem.includes(t);
    c.add(scene.add.text(W / 2 - 100, y, `${fDone ? '\u2713 ' : ''}${scene.seasonRewardText(fr)}`, { fontFamily: 'Arial', fontStyle: 'bold', fontSize: '18px', color: fDone ? '#3a8a2a' : '#5a4a5a' }).setOrigin(0.5));
    c.add(scene.add.text(W / 2 + 170, y, `${pDone ? '\u2713 ' : rec.premium ? '' : '\u{1F512} '}${scene.seasonRewardText(pr)}`, { fontFamily: 'Arial', fontStyle: 'bold', fontSize: '18px', color: pDone ? '#3a8a2a' : '#6a4a8a' }).setOrigin(0.5));
  }
  const claim = scene.seasonClaimable();
  scene.button(c, W / 2, top + 1018, 420, claim ? `CLAIM ALL (${claim})` : 'NOTHING TO CLAIM', claim ? 0x5fbf4a : 0x81736c, () => {
    if (!claim) return;
    for (let t = 1; t <= tier; t++) {
      const [fr, pr] = tierRewards(t);
      if (!rec.claimed.free.includes(t)) {
        rec.claimed.free.push(t);
        scene.grantSeasonReward(fr);
      }
      if (rec.premium && !rec.claimed.prem.includes(t)) {
        rec.claimed.prem.push(t);
        scene.grantSeasonReward(pr);
      }
    }
    store(META_KEY, JSON.stringify(m));
    tlog.log('season_claim', { tier });
    sfx.star?.(3);
    scene.openSeason();
  }, 0.8);
  if (!rec.premium)
    scene.button(c, W / 2 - 150, top + 1118, 270, 'PREMIUM $4.99', 0x8e58c9, () => {
      rec.premium = true;
      store(META_KEY, JSON.stringify(m));
      tlog.log('season_premium_mock', { id: rec.id });
      scene.showToast('PREMIUM UNLOCKED (TEST)');
      scene.openSeason();
    }, 0.7);
  scene.button(c, rec.premium ? W / 2 : W / 2 + 150, top + 1118, 220, 'BACK', 0x8a6a4a, () => scene.openTitle('road'), 0.7);
}
