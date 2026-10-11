// Crate screen for CRATES = TOOLBOX (owner: "the art in the crates is bad"): the ChatGPT crate pictures (crate_bag / crate_toolbox /
// crate_chest / crate_workbench), a big crate with a rarity glow and slow rays, a tap-to-open moment (3 shakes, latch glow, lid pop,
// burst, confetti, cards arcing out one after another into a centred grid) and the latch-upgrade swap. Presentation only: the crate
// kind, the cards and the latch roll were all decided (and saved) before this screen is built. The OLD look stays in unitsTab.presentCrate.
import Phaser from 'phaser';
import { FAMILY_INFO } from '../../content/perks';
import { CRATES, LATCH_B, RARITY_COLOR, UNITS, type CrateKind, type Rarity } from '../../content/units';
import { TUNING } from '../../content/tuning';
import type { CrateCard } from '../../core/crates';
import { guaranteeText, pctB, pityView } from '../../core/crateOdds';
import { sfx } from '../audio';
import type { GameScene } from '../GameScene';
import { W, H, REDUCED_MOTION } from '../sceneKit';
import { hasShippedArt } from '../textures';
import { crateName } from '../fx/toolboxCrates';
import { showOddsPanel } from './oddsPanel';
import { showUnitJobPopup, addUnitJob } from './unitJobUi';

const FONT = 'Lilita One, Arial Black';
const INK = 0x2b1d2e;
const PANEL_H = 1000;
/** Crate picture per tier, the rarity glow colour (common grey-white, rare blue, epic purple, legendary gold), and where the lid seam /
 *  latch sit as fractions of the picture's visible box (ChatGPT art, measured on the trimmed pictures). */
const CRATE: Record<CrateKind, { key: string; glow: number; tier: number; seam: number; latch: [number, number] }> = {
  wood: { key: 'crate_bag', glow: 0xdfe6ec, tier: 0, seam: 0.3, latch: [0.876, 0.456] },
  iron: { key: 'crate_toolbox', glow: 0x4aa3ff, tier: 1, seam: 0.52, latch: [0.362, 0.54] },
  gold: { key: 'crate_chest', glow: 0xa66bff, tier: 2, seam: 0.3, latch: [0.343, 0.253] },
  bench: { key: 'crate_workbench', glow: 0xffc83a, tier: 3, seam: 0.42, latch: [0.325, 0.606] },
};
const RARITY_TIER: Record<Rarity, number> = { common: 0, rare: 1, epic: 2, legendary: 3 };

/** The new look needs its four pictures loaded (they stream in after the first frame); otherwise the caller keeps the baked fallback. */
export const crateArtReady = (scene: GameScene, ...kinds: CrateKind[]) => kinds.every((k) => scene.hasArt(CRATE[k].key));

/** Soft radial glow + rays textures, baked once. */
function bakeFx(scene: Phaser.Scene) {
  if (!scene.textures.exists('omm_glow')) {
    const t = scene.textures.createCanvas('omm_glow', 256, 256)!;
    const x = t.getContext();
    const g = x.createRadialGradient(128, 128, 0, 128, 128, 128);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.35, 'rgba(255,255,255,0.55)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g;
    x.fillRect(0, 0, 256, 256);
    t.refresh();
  }
  if (!scene.textures.exists('omm_rays')) {
    const t = scene.textures.createCanvas('omm_rays', 512, 512)!;
    const x = t.getContext();
    const g = x.createRadialGradient(256, 256, 20, 256, 256, 256);
    g.addColorStop(0, 'rgba(255,255,255,0.95)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g;
    const n = 14;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2, w = (Math.PI / n) * 0.55;
      x.beginPath();
      x.moveTo(256, 256);
      x.arc(256, 256, 256, a - w, a + w);
      x.closePath();
      x.fill();
    }
    t.refresh();
  }
}

/**
 * A unit picture: the real art when it ships, otherwise a clean framed tile (dark panel, rarity-coloured edge and glow, the job glyph
 * big in the middle) so a unit that is still waiting for its art reads as designed, not broken. Centred at (cx, cy), `size` px square.
 */
export function addPortrait(scene: GameScene, parent: Phaser.GameObjects.Container, id: string, rarity: Rarity, cx: number, cy: number, size: number, dim = false) {
  const key = scene.unitPortrait(id);
  bakeFx(scene);
  if (hasShippedArt(key) && scene.textures.exists(key)) {
    const im = scene.fitVisible(scene.add.image(cx, cy, key), size);
    if (dim) im.setTint(INK).setAlpha(0.6);
    parent.add(im);
    return;
  }
  const rc = RARITY_COLOR[rarity], s = size;
  const g = scene.add.graphics();
  g.fillStyle(INK, 1).fillRoundedRect(cx - s / 2, cy - s / 2, s, s, s * 0.12);
  g.fillStyle(rc, 0.22).fillRoundedRect(cx - s / 2 + 5, cy - s / 2 + 5, s - 10, s - 10, s * 0.1);
  g.lineStyle(4, rc, 1).strokeRoundedRect(cx - s / 2 + 5, cy - s / 2 + 5, s - 10, s - 10, s * 0.1);
  parent.add(g);
  if (scene.textures.exists('omm_glow')) parent.add(scene.add.image(cx, cy, 'omm_glow').setDisplaySize(s * 0.95, s * 0.95).setTint(rc).setAlpha(0.55).setBlendMode(Phaser.BlendModes.ADD));
  const jk = `job_${id}`;
  if (scene.textures.exists(jk)) parent.add(scene.add.image(cx, cy, jk).setDisplaySize(s * 0.7, s * 0.7).setAlpha(dim ? 0.5 : 1));
  else parent.add(scene.add.text(cx, cy, (FAMILY_INFO[id as 'cannon']?.name ?? id).replace('Signal ', '').charAt(0).toUpperCase(), { fontFamily: FONT, fontSize: `${Math.round(s * 0.55)}px`, color: '#ffffff', stroke: `#${rc.toString(16).padStart(6, '0')}`, strokeThickness: 8 }).setOrigin(0.5));
}

interface Slot {
  x: number;
  y: number;
}
interface Layout {
  cols: number;
  cw: number;
  ch: number;
  sc: number;
  pos: Slot[];
  by: number;
  crate: { y: number; size: number } | null;
}

/** Centred grid, up to 3 a row (4-5 for the very big crates); cards as large as the panel allows; the NEXT/UNITS row sits directly below it. */
export function crateLayout(n: number, top: number): Layout {
  const cols = n <= 9 ? 3 : n <= 16 ? 4 : 5, rows = Math.ceil(n / cols), gap = 14;
  const aTop = top + 176, aBot = top + PANEL_H - 22, btnH = 78, btnGap = 26;
  const small = rows === 1; // a one-row crate keeps its (emptied) crate picture above the cards so the panel never reads empty
  const crateH = small ? 300 : 0;
  const maxCellW = (W - 92 - 44 - gap * (cols - 1)) / cols;
  const wantW = n === 1 ? 250 : n === 2 ? 230 : 190;
  const availH = aBot - aTop - btnH - btnGap - crateH - (small ? 20 : 0);
  const cw = Math.min(maxCellW, wantW, ((availH - gap * (rows - 1)) / rows) * 0.8);
  const ch = cw / 0.8;
  const gridH = rows * ch + (rows - 1) * gap;
  const blockH = crateH + (small ? 20 : 0) + gridH + btnGap + btnH;
  const y0 = aTop + Math.max(0, (aBot - aTop - blockH) / 2);
  const gy = y0 + crateH + (small ? 20 : 0);
  const pos: Slot[] = [];
  for (let k = 0; k < n; k++) {
    const r = Math.floor(k / cols), inRow = Math.min(cols, n - r * cols);
    pos.push({ x: W / 2 + ((k % cols) - (inRow - 1) / 2) * (cw + gap), y: gy + r * (ch + gap) + ch / 2 });
  }
  return { cols, cw, ch, sc: cw / 176, pos, by: gy + gridH + btnGap + btnH / 2 - 8, crate: small ? { y: y0 + crateH / 2, size: 270 } : null };
}

/** The card face, 176 x 220 design px (the caller scales it): rarity frame, picture or glyph tile, name, job word under it. */
function buildCard(scene: GameScene, cd: CrateCard) {
  const u = UNITS.find((v) => v.id === cd.unit)!;
  const rc = RARITY_COLOR[u.rarity];
  const card = scene.add.container(0, 0);
  card.add(scene.add.graphics().fillStyle(INK, 1).fillRoundedRect(-88, -110, 176, 220, 18).fillStyle(rc, 1).fillRoundedRect(-84, -106, 168, 212, 15).fillStyle(0xfbe7c6, 1).fillRoundedRect(-76, -96, 152, 128, 12));
  card.add(scene.add.text(0, -84, u.rarity.toUpperCase(), { fontFamily: FONT, fontSize: '15px', color: '#7a5a4a' }).setOrigin(0.5));
  addPortrait(scene, card, cd.unit, u.rarity, 0, -26, 100);
  const nm = scene.add.text(0, 58, FAMILY_INFO[cd.unit as 'cannon'].name.toUpperCase().replace('SIGNAL ', ''), { fontFamily: FONT, fontSize: '24px', color: '#ffffff', stroke: '#2b1d2e', strokeThickness: 5 }).setOrigin(0.5);
  if (nm.width > 156) nm.setScale(156 / nm.width);
  card.add(nm);
  addUnitJob(scene, card, cd.unit, 0, 88, 19);
  if (cd.count > 1) card.add(scene.add.text(-70, 28, `x${cd.count}`, { fontFamily: FONT, fontSize: '24px', color: '#ffffff', backgroundColor: '#2b1d2e', padding: { x: 6, y: 1 } }).setOrigin(0, 1));
  return { card, rc, tier: RARITY_TIER[u.rarity] };
}

/** `from` = the Tool Bag whose latch rolled up into `kind` (decided before this screen). */
export function presentCrateToolbox(scene: GameScene, kind: CrateKind, cards: CrateCard[], title?: string, from?: CrateKind) {
  scene.closeModal();
  bakeFx(scene);
  const c = scene.panel(PANEL_H);
  const top = H / 2 - PANEL_H / 2;
  const n = cards.length;
  const total = cards.reduce((s, cd) => s + cd.count, 0);
  const lay = crateLayout(n, top);
  const time = scene.time;
  const calm = REDUCED_MOTION;
  let shown: CrateKind = from ?? kind;
  scene.seasonEv('crateOpen');

  // ---- title + header (two odds lines, ODDS on its own line) ----
  const titleTxt = scene.add.text(W / 2, top + 58, title ?? crateName(shown), { fontFamily: FONT, fontSize: '52px', color: '#3b2533' }).setOrigin(0.5);
  const hdr = scene.add.container(0, 0);
  const latchLine = TUNING.rosterB && !title && shown === 'wood';
  const l1 = latchLine ? 'LATCH ROLL  ·  the bag can upgrade' : `${total} CARD${total > 1 ? 'S' : ''} INSIDE`;
  const l2 = latchLine
    ? `Toolbox+ ${pctB(LATCH_B.iron)}   Chest+ ${pctB(LATCH_B.gold)}   Workbench ${pctB(LATCH_B.bench)}`
    : title ? '' : TUNING.rosterB ? guaranteeText(shown) : `${CRATES[shown].cards} cards  ·  ${CRATES[shown].rareMin}+ rare`;
  hdr.add(scene.add.text(W / 2, top + 112, l1, { fontFamily: FONT, fontSize: '26px', color: '#7a5a4a' }).setOrigin(0.5));
  if (l2) hdr.add(scene.add.text(W / 2, top + 148, l2, { fontFamily: FONT, fontSize: '22px', color: '#9a7a6a', wordWrap: { width: W - 140 }, align: 'center' }).setOrigin(0.5));
  if (!title) {
    const odds = scene.add.container(W / 2, top + 206);
    odds.add(scene.add.graphics().fillStyle(INK, 1).fillRoundedRect(-84, -22, 168, 44, 22));
    odds.add(scene.add.text(0, 0, 'i  ODDS', { fontFamily: FONT, fontSize: '24px', color: '#ffffff' }).setOrigin(0.5));
    odds.setSize(240, 80).setInteractive({ useHandCursor: true });
    odds.on('pointerup', () => showOddsPanel(scene, W, H, pityView(scene.meta), kind));
    hdr.add(odds);
  }

  // ---- stage: rays + glow behind the crate, the crate itself ----
  const cy = top + 490, SIZE = 400;
  const stage = scene.add.container(W / 2, cy);
  // normal blending (not additive): on the cream panel an additive glow washes out to white and the rarity colour is lost
  const rays = scene.add.image(0, 0, 'omm_rays').setDisplaySize(760, 760).setAlpha(0.42);
  const glow = scene.add.image(0, 0, 'omm_glow').setDisplaySize(580, 580).setAlpha(0.6);
  const tint = (k: CrateKind) => {
    rays.setTint(CRATE[k].glow);
    glow.setTint(CRATE[k].glow);
  };
  tint(shown);
  const box = scene.add.container(0, 0);
  const whole = scene.fitVisible(scene.add.image(0, 0, CRATE[shown].key), SIZE);
  box.add(whole);
  const latchGlow = scene.add.image(0, 0, 'omm_glow').setDisplaySize(120, 120).setTint(0xfff2b0).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0);
  box.add(latchGlow);
  stage.add([rays, glow, box]);
  /** Latch / seam places in box coordinates for the crate picture currently shown. */
  const geo = (k: CrateKind) => {
    const b = scene.visBounds(CRATE[k].key), s = SIZE / Math.max(b.w, b.h);
    return { lx: (CRATE[k].latch[0] - 0.5) * b.w * s, ly: (CRATE[k].latch[1] - 0.5) * b.h * s, sy: (CRATE[k].seam - 0.5) * b.h * s, b, s };
  };
  const placeLatch = () => {
    const g = geo(shown);
    latchGlow.setPosition(g.lx, g.ly);
  };
  placeLatch();
  if (!calm) scene.tweens.add({ targets: rays, angle: 360, duration: 36000, repeat: -1 });
  scene.tweens.add({ targets: glow, alpha: { from: 0.45, to: 0.7 }, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
  const idle = calm ? null : scene.tweens.add({ targets: box, y: { from: 0, to: -10 }, scaleX: { from: 1, to: 1.025 }, scaleY: { from: 1, to: 1.025 }, duration: 1000, yoyo: true, repeat: -1, ease: 'Sine.InOut' });

  const tapTxt = scene.add.text(W / 2, top + 790, 'TAP TO OPEN', { fontFamily: FONT, fontSize: '46px', color: '#ffffff', stroke: '#2b1d2e', strokeThickness: 8 }).setOrigin(0.5);
  scene.tweens.add({ targets: tapTxt, scale: { from: 0.94, to: 1.06 }, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.InOut' });

  // ---- counter + progress dots (closed: hollow, under TAP; opened: under the title) ----
  const dotStep = Math.min(30, 560 / Math.max(1, total)), dotR = Math.min(9, dotStep / 2 - 2);
  const counter = scene.add.container(0, 0);
  const cText = scene.add.text(W / 2, top + 116, `CARD 0 / ${total}`, { fontFamily: FONT, fontSize: '30px', color: '#3b2533' }).setOrigin(0.5);
  const dotG = scene.add.graphics();
  const drawDots = (done: number, y: number) => {
    dotG.clear();
    for (let k = 0; k < total; k++) {
      const x = W / 2 + (k - (total - 1) / 2) * dotStep;
      dotG.fillStyle(INK, 1).fillCircle(x, y, dotR + 2);
      dotG.fillStyle(k < done ? 0xffcf33 : 0xead2b0, 1).fillCircle(x, y, dotR);
    }
  };
  counter.add([cText, dotG]);
  drawDots(0, top + 846);
  cText.setY(top + 886).setText(`${total} CARD${total > 1 ? 'S' : ''}`);

  c.add([titleTxt, hdr, stage, tapTxt, counter]);

  // ---- tap handling: closed -> open, opening -> skip ----
  let state: 'closed' | 'opening' | 'done' = 'closed';
  const timers: Phaser.Time.TimerEvent[] = [];
  const at = (ms: number, fn: () => void) => timers.push(time.delayedCall(ms, () => c.active && fn()));
  const zone = scene.add.rectangle(W / 2, H / 2, W - 92, PANEL_H, 0x000000, 0.001).setInteractive();
  c.addAt(zone, 2);
  zone.on('pointerup', () => (state === 'closed' ? start() : state === 'opening' ? skip() : undefined));
  whole.setInteractive();
  whole.on('pointerup', () => (state === 'closed' ? start() : state === 'opening' ? skip() : undefined));

  // ---- the cards ----
  const built = cards.map((cd) => buildCard(scene, cd));
  const landed: boolean[] = cards.map(() => false);
  let landedN = 0;
  built.forEach((b, k) => {
    b.card.setPosition(W / 2, cy).setScale(0).setAlpha(0);
    b.card.setSize(176, 220).setInteractive({ useHandCursor: true }).on('pointerup', () => {
      if (state === 'done') showUnitJobPopup(scene, W, H, cards[k].unit, FAMILY_INFO[cards[k].unit as 'cannon'].name.toUpperCase(), scene.meta.units?.[cards[k].unit]?.level ?? 1);
      else if (state === 'opening') skip();
    });
    c.add(b.card);
  });

  const confetti = (x: number, y: number, col: number, count: number) => {
    const k = calm ? Math.min(6, count) : count;
    const ps = Array.from({ length: k }, () => {
      const r = scene.add.rectangle(x, y, Phaser.Math.Between(8, 14), Phaser.Math.Between(5, 9), Phaser.Math.RND.pick([col, 0xffffff, 0xffcf33, col])).setAngle(Phaser.Math.Between(0, 180));
      c.add(r);
      const a = Phaser.Math.FloatBetween(-Math.PI * 0.95, -Math.PI * 0.05), v = Phaser.Math.FloatBetween(160, 420);
      return { r, vx: Math.cos(a) * v, vy: Math.sin(a) * v, spin: Phaser.Math.Between(-540, 540) };
    });
    const o = { p: 0 };
    scene.tweens.add({
      targets: o,
      p: 1,
      duration: calm ? 500 : 1000,
      ease: 'Quad.Out',
      onUpdate: () => {
        const t = o.p;
        for (const q of ps) {
          q.r.setPosition(x + q.vx * t, y + q.vy * t + 520 * t * t);
          if (!calm) q.r.setAngle(q.r.angle + q.spin * 0.016);
          q.r.setAlpha(1 - t * t);
        }
      },
      onComplete: () => ps.forEach((q) => q.r.destroy()),
    });
  };
  /** scene.ring / scene.floatText draw under the modal panel, so the crate screen has its own, inside the panel. */
  const ringIn = (x: number, y: number, col: number, radius: number, width: number, dur: number) => {
    const g = scene.add.graphics().setPosition(x, y);
    c.add(g);
    const o = { r: calm ? radius * 0.65 : radius * 0.3, a: 1 };
    scene.tweens.add({ targets: o, r: calm ? o.r : radius, a: 0, duration: dur, ease: 'Quad.Out', onUpdate: () => g.clear().lineStyle(width * o.a + 1, col, o.a).strokeCircle(0, 0, o.r), onComplete: () => g.destroy() });
  };
  const bannerIn = (text: string) => {
    const t = scene.add.text(W / 2, top + 150, text, { fontFamily: FONT, fontSize: '36px', color: '#ffcf33', stroke: '#2b1d2e', strokeThickness: 7 }).setOrigin(0.5).setScale(0.3);
    c.add(t);
    scene.tweens.add({ targets: t, scale: 1, duration: 180, ease: 'Back.Out' });
    scene.tweens.add({ targets: t, alpha: 0, y: top + 110, delay: 900, duration: 500, onComplete: () => t.destroy() });
  };
  const flash = (color: number, a = 0.8, dur = 260, scale = 2) => {
    if (!scene.textures.exists('omm_glow')) return;
    const f = scene.add.image(W / 2, cy, 'omm_glow').setTint(color).setBlendMode(Phaser.BlendModes.ADD).setDisplaySize(380, 380).setAlpha(a);
    c.add(f);
    scene.tweens.add({ targets: f, alpha: 0, displayWidth: 380 * scale, displayHeight: 380 * scale, duration: dur, ease: 'Quad.Out', onComplete: () => f.destroy() });
  };

  const setCounter = () => {
    cText.setText(`CARD ${landedN} / ${total}`);
    drawDots(landedN, top + 150);
  };

  function land(k: number, fx: boolean) {
    if (landed[k]) return;
    landed[k] = true;
    landedN += cards[k].count;
    const b = built[k], p = lay.pos[k], u = cards[k];
    scene.tweens.killTweensOf(b.card);
    b.card.setPosition(p.x, p.y).setAngle(0).setAlpha(1).setScale(lay.sc);
    setCounter();
    const hot = u.isNew || b.tier >= 1;
    if (fx) {
      if (!calm) scene.tweens.add({ targets: b.card, scale: { from: lay.sc * 1.12, to: lay.sc }, duration: 200, ease: 'Back.Out' });
      if (hot) {
        const g = scene.add.image(p.x, p.y, 'omm_glow').setTint(b.rc).setBlendMode(Phaser.BlendModes.ADD).setDisplaySize(lay.cw * 1.9, lay.ch * 1.9).setAlpha(0.9);
        c.addAt(g, c.getIndex(b.card));
        scene.tweens.add({ targets: g, alpha: 0, displayWidth: lay.cw * 2.8, displayHeight: lay.ch * 2.8, duration: 650, ease: 'Quad.Out', onComplete: () => g.destroy() });
      }
      if (b.tier >= 2) confetti(p.x, p.y, b.rc, 16);
      if (hot) sfx.rarityHit(b.tier);
      else sfx.star?.(Math.min(2, k));
    }
    if (u.isNew) {
      const st = scene.add.text(p.x + lay.cw * 0.33, p.y - lay.ch * 0.47, 'NEW!', { fontFamily: FONT, fontSize: `${Math.round(30 * lay.sc)}px`, color: '#2b1d2e', backgroundColor: '#ffcf33', padding: { x: 9, y: 2 } }).setOrigin(0.5).setAngle(10);
      c.add(st);
      if (fx && !calm) {
        st.setScale(3.2).setAlpha(0);
        scene.tweens.add({ targets: st, scale: 1, alpha: 1, duration: 170, ease: 'Quad.In', onComplete: () => {
          ringIn(p.x + lay.cw * 0.33, p.y - lay.ch * 0.47, 0xffcf33, 70, 12, 320);
          scene.shake('preview');
        } });
      }
    }
  }

  const flyTw: Phaser.Tweens.Tween[] = [];
  function fly(k: number) {
    const b = built[k], p = lay.pos[k];
    b.card.setPosition(W / 2, cy).setScale(0.25).setAlpha(1).setAngle(Phaser.Math.Between(-25, 25));
    if (calm) return land(k, true);
    const o = { t: 0 }, ang0 = b.card.angle, arc = 90 + Math.abs(p.x - W / 2) * 0.1;
    flyTw[k] = scene.tweens.add({
      targets: o,
      t: 1,
      duration: 420,
      ease: 'Quad.Out',
      onUpdate: () => {
        b.card.setPosition(Phaser.Math.Linear(W / 2, p.x, o.t), Phaser.Math.Linear(cy, p.y, o.t) - Math.sin(o.t * Math.PI) * arc);
        b.card.setScale(Phaser.Math.Linear(0.25, lay.sc, o.t)).setAngle(ang0 * (1 - o.t));
      },
      onComplete: () => land(k, true),
    });
  }

  function showButtons() {
    if (state === 'done') return;
    state = 'done';
    counter.setAlpha(1);
    const more = scene.totalCrates();
    const by = lay.by;
    const bc = scene.add.container(0, 0).setAlpha(0);
    c.add(bc);
    if (more) scene.button(bc, W / 2 - 150, by, 260, `NEXT (${more})`, 0x5fbf4a, () => scene.openNextCrate(), 0.8);
    const back = scene.crateReturn;
    if (back) scene.button(bc, more ? W / 2 + 150 : W / 2, by, 260, 'CONTINUE', 0x27a4c0, () => ((scene.crateReturn = null), back()), 0.8);
    else scene.button(bc, more ? W / 2 + 150 : W / 2, by, 260, 'UNITS', 0x27a4c0, () => scene.openTitle('units'), 0.8);
    scene.tweens.add({ targets: bc, alpha: 1, duration: 200 });
  }

  /** The emptied crate stays above a one-row grid; bigger grids fade it away. */
  function settleCrate() {
    if (lay.crate) {
      // the lid goes back on for the little crate that stays above a one-row grid
      if (halves) {
        halves.lid.destroy();
        halves.lower.destroy();
        halves = null;
      }
      whole.setVisible(true).setAlpha(0);
      scene.tweens.add({ targets: whole, alpha: 1, duration: 300 });
      scene.tweens.add({ targets: stage, y: lay.crate.y, scale: lay.crate.size / SIZE, duration: 300, ease: 'Quad.Out' });
      scene.tweens.add({ targets: rays, alpha: 0.25, duration: 300 });
    } else scene.tweens.add({ targets: stage, alpha: 0, duration: 250 });
  }

  let halves: { lid: Phaser.GameObjects.Container; lower: Phaser.GameObjects.Image } | null = null;
  function openLid() {
    const g = geo(shown), key = CRATE[shown].key;
    const cut = g.b.y + g.b.h * CRATE[shown].seam;
    const mk = (cropY: number, cropH: number) => {
      const im = scene.fitVisible(scene.add.image(0, 0, key), SIZE);
      im.setCrop(0, cropY, im.width, cropH);
      return im;
    };
    whole.setVisible(false);
    latchGlow.setVisible(false);
    const upper = mk(0, cut), lower = mk(cut, scene.textures.get(key).getSourceImage().height - cut);
    const lid = scene.add.container(0, g.sy);
    upper.setPosition(0, -g.sy);
    lid.add(upper);
    box.add(lower);
    halves = { lid, lower };
    idle?.stop();
    box.setPosition(0, 0).setScale(1).setAngle(0);
    // the open mouth: a dark cavity over the cut edge, light pouring up out of it, then the lid pops off
    const cavity = scene.add.ellipse(0, g.sy, g.b.w * g.s * 0.84, 84, 0x2b1d2e);
    const beam = scene.add.image(0, g.sy - 90, 'omm_glow').setTint(0xffe9a0).setBlendMode(Phaser.BlendModes.ADD).setDisplaySize(SIZE * 0.7, 420).setAlpha(0.95);
    box.add([cavity, beam, lid]);
    scene.tweens.add({ targets: beam, alpha: 0, displayWidth: SIZE * 1.1, displayHeight: 560, duration: 700, ease: 'Quad.Out' });
    scene.tweens.add({ targets: cavity, alpha: 0, delay: 260, duration: 300 });
    const seamGlow = scene.add.image(0, g.sy, 'omm_glow').setTint(0xfff2b0).setBlendMode(Phaser.BlendModes.ADD).setDisplaySize(SIZE * 1.25, 150).setAlpha(1);
    box.add(seamGlow);
    scene.tweens.add({ targets: seamGlow, alpha: 0, displayWidth: SIZE * 1.7, displayHeight: 300, duration: 560, ease: 'Quad.Out' });
    if (calm) {
      lid.setAlpha(0);
      lower.setAlpha(0);
    } else {
      scene.tweens.add({ targets: lower, alpha: 0, delay: 260, duration: 300 });
      scene.tweens.add({ targets: lid, y: g.sy - 120, angle: -22, duration: 300, ease: 'Back.Out' });
      scene.tweens.add({ targets: lid, alpha: 0, delay: 260, duration: 260 });
      scene.tweens.add({ targets: lower, scaleY: { from: lower.scaleY * 0.93, to: lower.scaleY }, scaleX: { from: lower.scaleX * 1.05, to: lower.scaleX }, duration: 260, ease: 'Back.Out' });
    }
    flash(0xfff2b0, 0.6, 380, 2.4);
    ringIn(W / 2, cy, CRATE[shown].glow, 240, 22, 520);
    confetti(W / 2, cy - 20, CRATE[shown].glow, 34);
    sfx.chestOpen?.();
    scene.shake('bomb');
  }

  function dropCards() {
    cards.forEach((_, k) => at(120 + k * 120, () => fly(k)));
    at(120 + (n - 1) * 120 + 520, finish);
  }

  function finish() {
    for (let k = 0; k < n; k++) land(k, false);
    settleCrate();
    showButtons();
  }

  function swapToKind() {
    // the latch pops off: flash, the picture swaps to the crate the roll decided, the rarity glow changes colour
    shown = kind;
    whole.setTexture(CRATE[kind].key);
    scene.fitVisible(whole, SIZE);
    placeLatch();
    tint(kind);
    titleTxt.setText(crateName(kind));
    flash(0xffffff, 1, 420, 2.2);
    ringIn(W / 2, cy, CRATE[kind].glow, 260, 24, 560);
    scene.tweens.add({ targets: box, scale: { from: 0.55, to: 1 }, duration: 300, ease: 'Back.Out' });
    sfx.star?.(2);
    bannerIn(`LATCH POPPED!  ${crateName(kind)}`);
    confetti(W / 2, cy, CRATE[kind].glow, 24);
  }

  function shakes(count: number, t0: number, pitch0: number) {
    for (let i = 0; i < count; i++) {
      at(t0 + i * 180, () => {
        sfx.chestShake?.(pitch0 + i * 0.22);
        latchGlow.setAlpha(0.35 + (0.65 * (i + 1)) / count);
        if (calm) return;
        scene.tweens.add({ targets: box, angle: { from: -7 - i * 1.5, to: 7 + i * 1.5 }, duration: 90, yoyo: true, ease: 'Sine.InOut' });
        scene.tweens.add({ targets: latchGlow, displayWidth: 120 + i * 40, displayHeight: 120 + i * 40, duration: 150 });
        scene.shake('preview');
      });
    }
  }

  function start() {
    if (state !== 'closed') return;
    state = 'opening';
    scene.tweens.add({ targets: [hdr, tapTxt, counter], alpha: 0, duration: 140 });
    idle?.stop();
    box.setPosition(0, 0).setScale(1);
    // counter moves up under the title once the shaking is done
    at(180, () => {
      cText.setY(top + 116);
      setCounter();
      scene.tweens.add({ targets: counter, alpha: 1, duration: 200 });
    });
    shakes(3, 0, 1);
    let t = 3 * 180 + 40;
    if (from) {
      // latch roll: glow, pop, swap with a flash, then a shorter second shake on the new crate
      at(t, swapToKind);
      shakes(2, t + 420, 1.4);
      t += 420 + 2 * 180 + 40;
    }
    at(t, openLid);
    at(t + 120, dropCards);
  }

  function skip() {
    if (state !== 'opening') return;
    timers.forEach((tm) => tm.remove(false));
    flyTw.forEach((tw) => tw.stop());
    if (halves) scene.tweens.killTweensOf([halves.lid, halves.lower]);
    scene.tweens.killTweensOf(box);
    if (shown !== kind) swapToKind();
    if (halves) (halves.lid.setAlpha(0), halves.lower.setAlpha(0));
    else {
      whole.setVisible(false);
      latchGlow.setVisible(false);
      sfx.chestOpen?.();
    }
    box.setAngle(0).setScale(1);
    scene.tweens.add({ targets: [hdr, tapTxt], alpha: 0, duration: 60 });
    cText.setY(top + 116);
    counter.setAlpha(1);
    sfx.rarityHit(Math.max(0, ...built.map((b) => b.tier)));
    finish();
  }
}
