// MAP BADGES (flag MAP_BADGES): draws the left / right feature rails and the floating chips on the ROAD tab. Rules and keys: mapBadgesModel.ts.
// Each badge is a code-drawn brass medallion; real textures (badge_base_<state>, badge_glyph_<id>, badge_dot_red, badge_timer_ribbon,
// badge_new_tag, badge_lock) replace the matching part when they exist. Visual and navigation only: taps open an existing screen or a toast.
import Phaser from 'phaser';
import { MAP_BADGES } from '../../content/experiments';
import { sfx } from '../audio';
import { attentionWiggle, floatBob, popIn } from '../fx/juice';
import type { GameScene } from '../GameScene';
import { H, W } from '../sceneKit';
import {
  badgeIsDemo, baseKeyChain, cooldownOk, FLOAT_COOLDOWN_MS, FLOAT_X0, FLOAT_PITCH, FLOAT_Y, floatChipTarget, formatTimer, glyphKey, isFresh, KEY_DOT, KEY_LOCK, KEY_NEW, KEY_RIBBON,
  layoutBadges, railPos, resolveKey, timerUrgent, type BadgeCtx, type BadgeDef, type BadgeState, type PlacedBadge,
} from './mapBadgesModel';

const FONT = 'Lilita One, Arial Black';
const INK = 0x2b1d2e;
const INK_CSS = '#2b1d2e';
const R = 46; // medallion radius, design px (52 pt wireframe)
const RING: Record<BadgeState, number> = { idle: 0xc9962b, ready: 0xffcf33, timer: 0xc9962b, locked: 0x8d9bb5 };
const DOME: Record<BadgeState, number> = { idle: 0xf3e3c8, ready: 0xfff0b8, timer: 0xf3e3c8, locked: 0xb9c3d6 };

/** floating-chip cooldown memory: this session only, nothing is saved */
const lastFloat = new Map<string, number>();

function toastFor(scene: GameScene, d: BadgeDef) {
  switch (d.target) {
    case 'season': return scene.openSeason();
    case 'events': return scene.openEventsTab();
    case 'settings': return scene.openSettings();
    default: return scene.showToast(`${d.label}  ·  COMING SOON`);
  }
}

function drawMedallion(scene: GameScene, p: PlacedBadge): Phaser.GameObjects.Container {
  const { def, state } = p;
  const has = (k: string) => scene.hasArt(k);
  const c = scene.add.container(0, 0);
  const base = resolveKey(has, baseKeyChain(state));
  if (base) c.add(scene.add.image(0, 0, base).setDisplaySize(R * 2.5, R * 2.5));
  else {
    const g = scene.add.graphics();
    g.fillStyle(INK, 1).fillCircle(0, 2, R + 4);
    g.fillStyle(RING[state], 1).fillCircle(0, 0, R);
    g.fillStyle(DOME[state], 1).fillCircle(0, 0, R - 8);
    g.fillStyle(0xffffff, 0.35).fillEllipse(-8, -16, R * 0.9, R * 0.5);
    c.add(g);
  }
  const gk = glyphKey(def.id);
  if (state === 'locked') {
    const lk = resolveKey(has, [KEY_LOCK]);
    if (lk) c.add(scene.add.image(0, -2, lk).setDisplaySize(R * 1.1, R * 1.1));
    else {
      const g = scene.add.graphics();
      g.fillStyle(INK, 1).fillRoundedRect(-14, -4, 28, 22, 5).lineStyle(6, INK, 1).strokeCircle(0, -8, 9);
      g.fillStyle(0xffcf33, 1).fillCircle(0, 7, 3.5);
      c.add(g);
    }
  } else if (resolveKey(has, [gk])) c.add(scene.add.image(0, -2, gk).setDisplaySize(R * 1.2, R * 1.2));
  else c.add(scene.add.text(0, -2, def.glyph, { fontFamily: FONT, fontSize: def.glyph.length > 2 ? '22px' : '40px', color: '#2b1d2e' }).setOrigin(0.5));
  return c;
}

function ribbonText(p: PlacedBadge): { text: string; urgent: boolean } | null {
  const { def, state } = p;
  if (state === 'locked') return { text: `LV ${def.unlock}`, urgent: false };
  if (state === 'timer' && def.demoTimer) return { text: formatTimer(def.demoTimer), urgent: timerUrgent(def.demoTimer) };
  if (def.demoCount) return { text: def.demoCount, urgent: false };
  return null;
}

function drawBadge(scene: GameScene, p: PlacedBadge, x: number, y: number, isNew: boolean, small = false): Phaser.GameObjects.Container {
  const has = (k: string) => scene.hasArt(k);
  const { def, state } = p;
  const c = scene.add.container(x, y);
  const med = drawMedallion(scene, p);
  c.add(med);
  const rb = ribbonText(p);
  if (rb) {
    const rk = resolveKey(has, [KEY_RIBBON]);
    if (rk) c.add(scene.add.image(0, R + 10, rk).setDisplaySize(112, 34));
    else c.add(scene.add.graphics().fillStyle(INK, 1).fillRoundedRect(-44, R - 6, 88, 32, 14).fillStyle(rb.urgent ? 0xd8452c : state === 'locked' ? 0x8d9bb5 : 0xb8742c, 1).fillRoundedRect(-41, R - 3, 82, 26, 12));
    c.add(scene.add.text(0, R + 10, rb.text, { fontFamily: FONT, fontSize: '20px', color: '#ffffff', stroke: INK_CSS, strokeThickness: 3 }).setOrigin(0.5));
  } else c.add(scene.add.text(0, R + 10, def.label, { fontFamily: FONT, fontSize: '18px', color: '#ffffff', stroke: INK_CSS, strokeThickness: 4 }).setOrigin(0.5));
  if (state === 'ready') {
    const dk = resolveKey(has, [KEY_DOT]);
    if (dk) c.add(scene.add.image(R - 6, -R + 6, dk).setDisplaySize(30, 30));
    else c.add(scene.add.circle(R - 6, -R + 6, 13, 0xe8452c).setStrokeStyle(4, 0xfff0cf));
  }
  if (badgeIsDemo(def, state)) c.add(scene.add.text(-R + 2, -R + 4, 'demo', { fontFamily: FONT, fontSize: '14px', color: '#fff0cf', stroke: INK_CSS, strokeThickness: 3 }).setOrigin(0, 0.5));
  if (isNew) {
    const nk = resolveKey(has, [KEY_NEW]);
    if (nk) c.add(scene.add.image(-R + 4, -R + 4, nk).setDisplaySize(64, 32));
    else c.add([scene.add.graphics().fillStyle(INK, 1).fillRoundedRect(-R - 14, -R - 8, 58, 26, 10).fillStyle(0xffcf33, 1).fillRoundedRect(-R - 11, -R - 5, 52, 20, 8), scene.add.text(-R + 15, -R + 5, 'NEW', { fontFamily: FONT, fontSize: '16px', color: INK_CSS }).setOrigin(0.5)]);
  }
  if (small) c.setScale(0.72);
  c.add(scene.add.zone(0, 8, R * 2 + 16, R * 2 + 56).setInteractive({ useHandCursor: true }).on('pointerup', () => {
    sfx.click();
    if (state === 'locked') return scene.showToast(`CLEAR LEVEL ${def.unlock - 1} TO OPEN ${def.label}`);
    toastFor(scene, def);
  }));
  popIn(scene, c, 40 * (p.slot + 1));
  if (state === 'ready') attentionWiggle(scene, med);
  else if (state === 'idle' || state === 'timer') floatBob(scene, med);
  return c;
}

/** Adds the rails, the overflow counts and the floating claim chip to the ROAD container. Returns the number of badges drawn. */
export function addMapBadges(scene: GameScene, parent: Phaser.GameObjects.Container, ctx: BadgeCtx): number {
  if (!MAP_BADGES.on) return 0;
  const lay = layoutBadges(ctx, MAP_BADGES.force);
  let n = 0;
  for (const side of ['L', 'R'] as const) {
    for (const p of side === 'L' ? lay.left : lay.right) {
      const { x, y } = railPos(side, p.slot);
      parent.add(drawBadge(scene, p, x, y, isFresh(p, ctx)));
      n++;
    }
    const extra = lay.overflow[side];
    if (extra > 0) {
      const { x, y } = railPos(side, 3);
      const o = scene.add.container(x, y + 8);
      o.add([scene.add.graphics().fillStyle(INK, 1).fillRoundedRect(-36, -20, 72, 40, 18).fillStyle(0xc9962b, 1).fillRoundedRect(-33, -17, 66, 34, 15), scene.add.text(0, 0, `+${extra}`, { fontFamily: FONT, fontSize: '24px', color: INK_CSS }).setOrigin(0.5)]);
      o.add(scene.add.zone(0, 0, 80, 48).setInteractive({ useHandCursor: true }).on('pointerup', () => (sfx.click(), scene.showToast(`${extra} MORE FEATURES`))));
      parent.add(o);
    }
  }
  for (const p of lay.floats) {
    parent.add(drawBadge(scene, p, FLOAT_X0 + p.slot * FLOAT_PITCH, FLOAT_Y, isFresh(p, ctx), true));
    n++;
  }
  // one floating claim chip, at most once per cooldown per badge type (session memory only)
  const t = floatChipTarget(lay);
  if (t && cooldownOk(lastFloat.get(t.def.id), scene.time.now, FLOAT_COOLDOWN_MS)) {
    lastFloat.set(t.def.id, scene.time.now);
    const chip = scene.add.container(W / 2 - 150, H - 275);
    chip.add([scene.add.graphics().fillStyle(INK, 1).fillRoundedRect(-84, -26, 168, 52, 24).fillStyle(0x5fbf4a, 1).fillRoundedRect(-80, -22, 160, 44, 21), scene.add.text(0, 0, `CLAIM ${t.def.label}`, { fontFamily: FONT, fontSize: '22px', color: '#ffffff', stroke: INK_CSS, strokeThickness: 4 }).setOrigin(0.5)]);
    chip.add(scene.add.zone(0, 0, 170, 56).setInteractive({ useHandCursor: true }).on('pointerup', () => (sfx.click(), toastFor(scene, t.def))));
    parent.add(chip);
    floatBob(scene, chip);
    popIn(scene, chip, 200);
  }
  return n;
}
