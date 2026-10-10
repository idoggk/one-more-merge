import Phaser from 'phaser';
import { COLS, ROWS } from '../content/tuning';
import { CATALOG } from '../core/economy';
import type { BossAttack } from '../core/boss';
import type { PuzzleDef } from '../core/game';
import puzzleData from '../content/puzzles.json';
import { PALETTE } from '../core/marks';

export const W = 720;
export const CELL = 124;
/** A held piece floats this far above the pointer so it stays visible; targeting uses the piece, not the finger.
 *  Touch lifts higher (merge-flow audit: at 40 px the thumb still covered the piece and its target). */
export const DRAG_LIFT = 40;
export const DRAG_LIFT_TOUCH = 85;
/** A merging piece flies into its partner over this long; the merged gadget pops when it arrives. */
export const MERGE_ARRIVE = 110;
export const REDUCED_MOTION = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
/** Snap cue (held piece reaches a mergeable cell): at most one per this many ms. */
export const SNAP_CUE_GAP = 120;
export const BX = (W - CELL * COLS) / 2;
export const SCRAP_X = W - 92;
/** Smallest tap height in design px: 44 pt on a 390 pt-wide phone (W = 720). */
export const TAP_MIN = 82;
/** r38: player-facing durations are m:ss (ChatGPT review: never raw seconds on cards). */
/** Mix a 0xRRGGBB colour toward white by t (0..1). */
export const lighten = (c: number, t: number) => [16, 8, 0].reduce((n, sh) => n | (Math.round(((c >> sh) & 255) + (255 - ((c >> sh) & 255)) * t) << sh), 0);
export const mmss = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.round(sec % 60)).padStart(2, '0')}`;
/** r34: clock ring centre x (left of the HP bar); the machine counter mirrors it on the right. */
export const CLOCK_X = 62;
/** r35 trophy figurines (ChatGPT spec): 3 mastery stars on one boss / mini-boss win its trophy; 4 stand by the machine. */
export const TROPHY_AT = 3;
export const TROPHY_SHELF = 4;
/** r38 Featured Unit Trial: free battles per day with today's unit at this level; opens after this many cleared levels. */
export const TRIAL_BATTLES = 3;
export const TRIAL_LEVEL = 5;
export const TRIAL_UNLOCK = 6;
/** r36: the Screw Yard event opens after this many cleared levels. */
export const YARD_UNLOCK = 4;
/** r25 item tray slot, between NEXT (+ Time Capsule) and SCRAP. */
export const ITEM_X = W - 208;
// Safe-area-aware layout (ChatGPT round-7 review): design width is fixed, design height follows the phone's aspect,
// so there are no letterbox bands. Header pinned top, tray pinned bottom, board + event lane above it, stage gets the rest.
export let H = 1280;
/** Render scale: the canvas is W*RS x H*RS device-ish pixels; the main camera zooms by RS so game code stays in design units. */
export let RS = 1;
export function setRenderScale(r: number) {
  RS = r;
}
export let BY = 446;
export let TRAY_Y = 1234;
export let EVENT_Y = 410;
export let HP_Y = 404;
export let STAGE_TOP = 92;
export let STAGE_H = 284;
export let TARGET_Y = 245;

export const layoutHeight = (viewW: number, viewH: number) => Math.round(Math.min(1720, Math.max(1280, (W * viewH) / Math.max(1, viewW))));

export function computeLayout(viewW: number, viewH: number) {
  H = layoutHeight(viewW, viewH);
  // UI audit (375x667): the stage shrank to a thin strip; short layouts tighten the gaps around the board to give it back
  const t = H < 1380 ? 1 : 0;
  TRAY_Y = H - 66;
  BY = TRAY_Y - 58 + t * 8 - CELL * ROWS;
  EVENT_Y = BY - 34 + t * 2;
  HP_Y = EVENT_Y - 54 + t * 6;
  const top = 96 - t * 4;
  const avail = HP_Y - 34 + t * 10 - top;
  STAGE_H = Math.min(450, avail);
  STAGE_TOP = top + (avail - STAGE_H) / 2;
  TARGET_Y = STAGE_TOP + STAGE_H / 2 + 4;
  return H;
}


/** Which stage backdrop the Workshop preview shows: the previewed stage item, else the equipped one. */
export const it0Stage = (preview: string | null, equipped: string | null) => (preview && CATALOG.find((x) => x.id === preview)?.slot === 'stage' ? preview : equipped);
/** Telegraph icon per attack (v17 boss icons + v19 mini-boss icons). */
export const ATTACK_ICON: Record<BossAttack, string> = { clamp: 'btg_clamp', frost: 'btg_frost', suction: 'btg_suction', hot: 'btg_heat', rest: 'btg_rest', split: 'btg_split', bomb: 'btg_bomb', conveyor: 'btg_conveyor', mirror: 'btg_mirror', blocks: 'btg_blocks', pull: 'btg_pull', bounce: 'btg_bounce', slick: 'btg_slick', portals: 'btg_portals', tow: 'btg_tow', ransom: 'btg_ransom' };
/** Clarity pass 1: fixed badge slots, offsets from a cell's centre, so marks never sit on each other.
 *  TL = helper mark (Amplifier/Beacon boost, Battery charge; a second one drops to left-middle), top-centre = power-up,
 *  TR = boss/remix countdown (its icon just below, right-middle), BL = rank, BR = max-rank crown. */
export const SLOT = { helper: { x: -38, y: -38 }, helper2: { x: -38, y: -2 }, item: { x: 0, y: -42 }, boss: { x: 38, y: -38 }, bossIcon: { x: 42, y: 2 }, rank: { x: -36, y: 36 }, crown: { x: 36, y: 40 } };
// clarity pass 2: every mark colour comes from PALETTE in core/marks.ts (one hue per meaning)
export const AMP_COL = PALETTE.boost.hue, PRIME_COL = PALETTE.charge.hue, ITEM_COL = PALETTE.powerup.hue, ATTACK_COL = PALETTE.attack.hue, LOCK_COL = PALETTE.locked.hue, KICK_COL = PALETTE.kickback.hue, OD_COL = PALETTE.overdrive.hue;
export type Gfx = Phaser.GameObjects.Graphics;
/** Battery CHARGED mark: green ring + lightning badge. k scales it (guide demos / legend / inspect icon). */
export function drawPrimeMark(g: Gfx, x: number, y: number, a: number, k = 1, slot = SLOT.helper, ring = true) {
  const h = 54 * k;
  if (ring) g.lineStyle(5 * k, PRIME_COL, a).strokeRoundedRect(x - h, y - h, 2 * h, 2 * h, 22 * k);
  const bx = x + slot.x * k, by = y + slot.y * k;
  g.fillStyle(0x2b1d2e, 1).fillCircle(bx, by, 15 * k).fillStyle(PRIME_COL, 1).fillCircle(bx, by, 12 * k);
  g.fillStyle(0x2b1d2e, 1).fillTriangle(bx + 2 * k, by - 10 * k, bx - 6 * k, by + 2 * k, bx + k, by + 2 * k).fillTriangle(bx - k, by - 2 * k, bx + 6 * k, by - 2 * k, bx - 2 * k, by + 10 * k);
}
/** Amplifier / Signal Beacon BOOSTED mark: lavender ring + up-arrow badge. */
export function drawAmpMark(g: Gfx, x: number, y: number, a: number, k = 1, slot = SLOT.helper, ring = true) {
  const h = 49 * k;
  if (ring) g.lineStyle(5 * k, AMP_COL, a).strokeRoundedRect(x - h, y - h, 2 * h, 2 * h, 20 * k);
  const bx = x + slot.x * k, by = y + slot.y * k;
  g.fillStyle(0x2b1d2e, 1).fillCircle(bx, by, 15 * k).fillStyle(AMP_COL, 1).fillCircle(bx, by, 12 * k);
  g.fillStyle(0x2b1d2e, 1).fillTriangle(bx, by - 9 * k, bx - 8 * k, by + k, bx + 8 * k, by + k).fillRect(bx - 3 * k, by, 6 * k, 9 * k);
}
/** Boss telegraph on a cell: dashed coral boundary (warning) or the attack's tinted fill (active). */
export function drawBossCell(g: Gfx, x0: number, y0: number, sz: number, warn: boolean, pulse: number, tint: number) {
  const coral = ATTACK_COL;
  if (warn) {
    g.lineStyle(5, coral, pulse);
    for (let d = 0; d < sz; d += 22) {
      g.lineBetween(x0 + d, y0, Math.min(x0 + d + 12, x0 + sz), y0).lineBetween(x0 + d, y0 + sz, Math.min(x0 + d + 12, x0 + sz), y0 + sz);
      g.lineBetween(x0, y0 + d, x0, Math.min(y0 + d + 12, y0 + sz)).lineBetween(x0 + sz, y0 + d, x0 + sz, Math.min(y0 + d + 12, y0 + sz));
    }
  } else {
    g.fillStyle(tint, 0.55).fillRoundedRect(x0, y0, sz, sz, 16);
    g.lineStyle(6, coral, 1).strokeRoundedRect(x0, y0, sz, sz, 16).lineStyle(2, 0xfff0cf, 1).strokeRoundedRect(x0 + 4, y0 + 4, sz - 8, sz - 8, 13);
  }
}
export const MACHINE_NAMES = ['CLANKZILLA', 'BOLT BUCKET', 'SIR SPARKS', 'THE CONTRAPTION', 'BIG BERTHA', 'JUNK JUNIOR', 'RUSTY 3000', 'MEGA MERGE'];
export const cellXY = (idx: number) => ({ x: BX + (idx % COLS) * CELL + CELL / 2, y: BY + Math.floor(idx / COLS) * CELL + CELL / 2 });
export const fmt = (n: number) => (n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e4 ? (n / 1e3).toFixed(1) + 'K' : Math.round(n).toLocaleString());
/** Phaser's setColor / setBackgroundColor / setPadding re-render the text texture even when nothing changed:
 *  per-frame HUD code calls these instead (phone performance). */
export const textColor = (t: Phaser.GameObjects.Text, c: string) => (t.style.color === c ? t : t.setColor(c));
export const textBg = (t: Phaser.GameObjects.Text, bg: string, px: number, py: number) => {
  if (t.style.backgroundColor !== bg) t.setBackgroundColor(bg);
  const p = t.padding;
  if (p.left !== px || p.right !== px || p.top !== py || p.bottom !== py) t.setPadding(px, py);
  return t;
};
/** Bundled puzzle set (GameScene.PUZZLES): daily rotation + per-unit drills. */
export const PUZZLES = puzzleData as unknown as { daily: PuzzleDef[]; drills: Record<string, PuzzleDef[]> };

/** Phone performance: a new Text costs a canvas, a GPU texture and an upload, so HUD labels that come and go per hit
 *  (rank numerals, formula words, floating numbers) are recycled by style instead of created and destroyed. */
const textPools = new WeakMap<Phaser.Scene, Map<string, Phaser.GameObjects.Text[]>>();
const styleKey = (s: Phaser.Types.GameObjects.Text.TextStyle) => JSON.stringify(s);
export function pooledText(scene: Phaser.Scene, x: number, y: number, text: string, style: Phaser.Types.GameObjects.Text.TextStyle): Phaser.GameObjects.Text {
  const key = styleKey(style);
  const free = textPools.get(scene)?.get(key);
  let t = free?.pop();
  if (t && t.scene) {
    t.setActive(true).setVisible(true).setPosition(x, y).setDepth(0).setOrigin(0).setText(text).setScale(1).setAngle(0).setAlpha(1).setName('').setData('k', undefined);
    if (style.color && t.style.color !== style.color) t.setColor(style.color as string);
    scene.add.existing(t);
  } else {
    t = scene.add.text(x, y, text, style);
    t.setData('pk', key);
  }
  return t;
}
/** Give a pooled text back (it must already be out of its container, or the container is about to forget it). */
export function releaseText(scene: Phaser.Scene, t: Phaser.GameObjects.Text) {
  const key = t.getData('pk') as string | undefined;
  if (!key || !t.scene) return;
  scene.tweens.killTweensOf(t);
  t.parentContainer?.remove(t);
  t.removeFromDisplayList();
  t.setActive(false).setVisible(false);
  const pools = textPools.get(scene) ?? new Map<string, Phaser.GameObjects.Text[]>();
  textPools.set(scene, pools);
  const list = pools.get(key) ?? [];
  list.push(t);
  pools.set(key, list);
}
/** Recycle these pooled texts when `owner` is destroyed (a container's preDestroy would otherwise destroy them with it). */
export function recycleWith(scene: Phaser.Scene, owner: Phaser.GameObjects.Container, texts: Phaser.GameObjects.Text[]) {
  const o = owner as unknown as { preDestroy: () => void };
  const pre = o.preDestroy;
  o.preDestroy = function (this: Phaser.GameObjects.Container) {
    for (const t of texts) releaseText(scene, t);
    pre.call(this);
  };
}

/** Phone performance: a Phaser Graphics is re-triangulated every frame it is visible, so shapes that never change
 *  (rank plates, bars, rings' bases) are drawn once into a texture (at the render scale, so it stays sharp) and shown as an Image. */
export function bakeTexture(scene: Phaser.Scene, key: string, w: number, h: number, draw: (g: Gfx) => void): string {
  if (scene.textures.exists(key)) return key;
  const dt = scene.textures.addDynamicTexture(key, Math.ceil(w * RS), Math.ceil(h * RS));
  if (!dt) return key;
  const g = scene.make.graphics({}, false);
  draw(g);
  g.setScale(RS);
  dt.draw(g);
  g.destroy();
  return key;
}
