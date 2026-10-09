import Phaser from 'phaser';
import { FAMILY_INFO } from '../../content/perks';
import type { Family } from '../../core/types';
import { buildMachine } from '../machine';
import { CATALOG } from '../../core/economy';
import { sfx } from '../audio';
import * as tlog from '../../platform/telemetry';
import { META_KEY } from '../../platform/backup';
import { localDate, store } from '../meta';
import { isNew, UNLOCK_LEVEL } from '../unlocks';
import type { GameScene } from '../GameScene';
import { W, REDUCED_MOTION, TROPHY_AT, H, MACHINE_NAMES } from '../sceneKit';

/** MACHINE tab: YOUR MACHINE as the hero, team, PLAY (current level), workshop, utilities. */
export function openMachineTab(scene: GameScene) {
  scene.closeModal();
  const m = scene.meta;
  const c = scene.add.container(0, 0).setDepth(100);
  if (scene.homeC?.active) scene.homeC.destroy();
  scene.homeC = c;
  scene.modal = c;
  const bottom = H;
  // layout: top-anchored header, bottom-anchored controls, the machine fills what is left
  const helperY = bottom - 547;
  const feetY = Math.min(helperY - 70, bottom - 600);
  const headY = 150;
  const room = feetY - (headY + 70);
  const mWidth = Math.min(W * 1.02, Math.max(380, room / 0.56));
  // background, pedestal aligned under the machine's feet
  const stageKey = m.stage && scene.hasArt(`stagebg_${m.stage}`) ? `stagebg_${m.stage}` : 'hero_bg';
  const bg = scene.add.image(W / 2, 0, stageKey).setOrigin(0.5, 0);
  const k = Math.max(W / bg.width, (feetY - 20) / (0.538 * bg.height), (H - feetY + 20) / (0.462 * bg.height));
  bg.setScale(k).setY(feetY - 20 - 0.538 * bg.height * k);
  c.add([bg, scene.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.001).setInteractive()]);

  scene.drawWallet(c);

  // identity
  const name = m.owned?.includes('nameplate') ? MACHINE_NAMES[(m.nameIdx ?? 0) % MACHINE_NAMES.length] : 'YOUR MACHINE';
  // ChatGPT r13: quieter identity on the quiet wall (no heavy sticker outline)
  const darkStage = m.stage === 'night_shift';
  c.add(scene.add.text(W / 2, headY, name, { fontFamily: 'Lilita One, Arial Black', fontSize: '50px', color: darkStage ? '#fff0cf' : '#3b2533', stroke: darkStage ? '#2b1d2e' : '#fff0cf', strokeThickness: darkStage ? 8 : 4 }).setOrigin(0.5));
  const empty = !Object.values(m.mastery ?? {}).some((r) => (r ?? 0) > 0);
  const status = empty ? 'Starter kit  ·  upgrade it in runs' : m.bestChain ? `Best chain: x${m.bestChain}` : "Built from the gadgets you've merged";
  c.add(scene.add.text(W / 2, headY + 48, status, { fontFamily: 'Lilita One, Arial Black', fontSize: '26px', color: darkStage ? '#e8dcc8' : '#5a3a3a' }).setOrigin(0.5));

  // trophy shelf (r17): earned chapter medals, collection only
  const medals = Object.keys(m.medals ?? {}).map(Number).sort((a, b) => a - b);
  medals.slice(0, 6).forEach((ch, i) => c.add(scene.medalIcon(W / 2 + (i - (Math.min(medals.length, 6) - 1) / 2) * 76, headY + 110, 70, ch, true)));
  // r28 MONSTER BOOK: every monster / mini-boss / boss you have met
  if (scene.currentLevel() > 1) {
    const bk = scene.add.container(W - 86, headY + 110);
    bk.add(scene.add.graphics().fillStyle(0x2b1d2e, 1).fillRoundedRect(-60, -34, 120, 68, 18).fillStyle(0x8e58c9, 1).fillRoundedRect(-56, -30, 112, 60, 15));
    bk.add(scene.add.text(0, 0, 'BOOK', { fontFamily: 'Lilita One, Arial Black', fontSize: '28px', color: '#ffffff' }).setOrigin(0.5));
    bk.setSize(120, 68).setInteractive({ useHandCursor: true });
    bk.on('pointerup', () => (sfx.click(), scene.openMonsterBook(0, 0)));
    c.add(bk);
  }
  // r35 TROPHIES: drawer button (mirror of BOOK) + the figurines on display around the machine's feet
  if (scene.currentLevel() > 1) {
    const tb = scene.add.container(86, headY + 110);
    tb.add(scene.add.graphics().fillStyle(0x2b1d2e, 1).fillRoundedRect(-74, -34, 148, 68, 18).fillStyle(0xe0a020, 1).fillRoundedRect(-70, -30, 140, 60, 15));
    tb.add(scene.add.text(0, 0, 'TROPHIES', { fontFamily: 'Lilita One, Arial Black', fontSize: '24px', color: '#ffffff', stroke: '#2b1d2e', strokeThickness: 4 }).setOrigin(0.5));
    tb.setSize(148, 68).setInteractive({ useHandCursor: true });
    tb.on('pointerup', () => (sfx.click(), scene.openTrophies()));
    c.add(tb);
  }
  // the machine
  const helper = scene.activeToys()[0] ?? null;
  // day 0: three rank-1 starter modules instead of an empty chassis (display baseline, not earned mastery)
  const shown = empty ? { cannon: 1, coil: 1, bell: 1 } : (m.mastery ?? {});
  const mach = buildMachine(scene, W / 2, feetY, mWidth, empty ? { ...shown, [scene.teamShooter()]: 1 } : shown, helper, scene.teamShooter())!;
  scene.applyFinish(mach);
  c.add(mach);
  const hit = scene.add.zone(W / 2, feetY - mWidth * 0.25, mWidth * 0.95, mWidth * 0.5).setInteractive({ useHandCursor: true });
  hit.on('pointerup', () => (!m.playtestMode && scene.featureOpen('workshop') ? scene.openWorkshop() : scene.showToast(`THE WORKSHOP OPENS AFTER LEVEL ${UNLOCK_LEVEL.workshop}`)));
  c.add(hit);
  // idle: 1% breath over 2400ms; newly improved modules get one 180ms highlight
  if (!REDUCED_MOTION) scene.tweens.add({ targets: mach, scaleY: mach.scaleY * 1.01, duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
  const seen = m.homeSeen ?? {};
  for (const f of ['cannon', 'coil', 'bell'] as Family[]) {
    if ((m.mastery?.[f] ?? 0) > (seen[f] ?? 0)) {
      const part = mach.getByName(f) as Phaser.GameObjects.Image | null;
      if (part) {
        const s0 = part.scale;
        scene.tweens.chain({ targets: part, tweens: [{ scale: s0 * 1.12, duration: 180, delay: 350, ease: 'Quad.Out' }, { scale: s0, duration: 220, ease: 'Sine.Out' }] });
      }
    }
  }
  m.homeSeen = { ...(m.mastery ?? {}) };
  store(META_KEY, JSON.stringify(m));
  // r38 (ChatGPT review): four fixed sockets on a shelf plank, never free-placed
  const anyTrophy = Object.values(m.bossMastery ?? {}).some((v) => v >= TROPHY_AT);
  if (anyTrophy) {
    const sy = feetY - 2, xs = [82, 262, W - 262, W - 82];
    const shelf = m.trophies ?? [];
    xs.forEach((x, i) => {
      // brass plinth per socket (ChatGPT shelf_plate); an empty socket shows the bare plinth
      if (scene.hasArt('shelf_plate')) {
        const pl = scene.add.image(x, sy + 14, 'shelf_plate').setOrigin(0.5, 1);
        pl.setScale(118 / pl.width);
        c.add(pl);
      } else c.add(scene.add.graphics().fillStyle(0x2b1d2e, 0.35).fillEllipse(x, sy + 1, 64, 12));
      const id = shelf[i];
      const im = id ? scene.trophyImage(id, x, sy + 2, 122) : null;
      if (im) c.add(im);
      else c.add(scene.add.text(x, sy - 22, '\u{1F512}', { fontSize: '30px' }).setOrigin(0.5).setAlpha(0.7));
    });
  }

  // helper row
  const hy = helperY;
  const hg = scene.add.graphics().fillStyle(0x2b1d2e, 0.82).fillRoundedRect(44, hy - 46, W - 88, 92, 26);
  c.add(hg);
  const nc = scene.nextChallenge();
  const teamOn = scene.featureOpen('team');
  const shooterName = FAMILY_INFO[scene.teamShooter() as keyof typeof FAMILY_INFO].name;
  const hl = teamOn ? `Team:  ${shooterName} + ${helper ? FAMILY_INFO[helper].name : 'no helper'}` : empty || !m.bestChain ? 'Merge your first gadgets: tap PLAY!' : nc ? `Next helper: ${nc.text}` : 'Helpers: none yet';
  const ht = scene.add.text(80, hy, hl, { fontFamily: 'Lilita One, Arial Black', fontSize: teamOn ? '28px' : '22px', color: '#fff0cf', wordWrap: { width: teamOn ? 400 : W - 170 } }).setOrigin(0, 0.5);
  c.add(ht);
  if (teamOn && !(m.playtestMode && !m.hardUnlocked)) {
    scene.button(c, W - 150, hy, 220, 'TEAM', 0x27a4c0, () => scene.openTeamSheet(), 0.62);
    if (isNew(m, 'team')) scene.newTag(c, W - 82, hy - 40);
  }

  // PLAY = the current saga level
  const play = scene.button(c, W / 2, bottom - 410, 600, `PLAY  LEVEL ${scene.currentLevel()}`, 0x5fbf4a, () => scene.openLevelSheet(scene.currentLevel()), 1.1);
  if (!REDUCED_MOTION) scene.tweens.add({ targets: play, scale: 1.13, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.InOut' });

  const today = m.daily?.[localDate()];
  if (m.hardUnlocked) tlog.log('daily_offer_view', { date: localDate(), done: !!today });

  // workshop
  const wsOpen = !m.playtestMode && scene.featureOpen('workshop');
  const wsAt = UNLOCK_LEVEL.workshop;
  const ws = scene.button(c, W / 2, bottom - 280, 600, wsOpen ? 'WORKSHOP' : m.playtestMode ? 'WORKSHOP  \u00b7  soon' : `WORKSHOP  \u00b7  level ${wsAt}`, 0x8a6a4a, () => (wsOpen ? scene.openWorkshop() : scene.showToast(`THE WORKSHOP OPENS AFTER LEVEL ${wsAt}`)), 0.85);
  if (!wsOpen) ws.setAlpha(0.6);
  else if (isNew(m, 'workshop')) scene.newTag(c, W / 2 - 230, bottom - 312);
  // dot only for genuinely new options: something became affordable since the last Workshop visit
  const affordable = wsOpen && CATALOG.some((it) => !m.owned?.includes(it.id) && it.price <= (m.bolts ?? 0) && it.price > (m.workshopSeenBolts ?? -1));
  if (affordable) c.add(scene.add.circle(W / 2 + 230, bottom - 312, 12, 0xe8452c).setStrokeStyle(4, 0xffffff));

  // utilities
  const util = scene.add.text(W / 2, bottom - 175, 'Records   ·   How to play', { fontFamily: 'Lilita One, Arial Black', fontSize: '28px', color: '#fff0cf', stroke: '#2b1d2e', strokeThickness: 6 }).setOrigin(0.5).setInteractive({ useHandCursor: true });
  util.on('pointerup', (p: Phaser.Input.Pointer) => {
    sfx.click();
    if (p.worldX < W / 2) scene.openRecords();
    else scene.openHowTo(0, () => scene.openTitle());
  });
  c.add(util);
  scene.drawNav(c, 'machine');
  c.setAlpha(0);
  scene.tweens.add({ targets: c, alpha: 1, duration: 180, ease: 'Cubic.Out' });
}
