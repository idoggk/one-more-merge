// POWER TOOLS presentation (t-e2a48327, TUNING.tools; rules in src/core/tools.ts). One instance owned by GameScene:
// tool views (TOOL badge, idle pulse), the long-press preview (exact cells + 'wakes N' chip, computed on a COPY of the state),
// the use effect (250 ms wind-up, 80 ms visual-only hold, board dim, ring wave ~50 ms per cell, pitch staircase, 'x N' chip)
// and the HUD recipe strip. Presentation only: nothing here changes the model, pauses it or swallows input.
import Phaser from 'phaser';
import type { GameEvent, GameState } from '../core/game';
import { planTool, previewTool, toolsAllowed } from '../core/tools';
import { COLS, TUNING } from '../content/tuning';
import { FAMILY_INFO } from '../content/perks';
import { COMBO_NAME } from '../core/tools';
import { sfx } from './audio';
import { UNIT_SOUND } from './unitSounds';
import { BX, BY, CELL, cellXY, REDUCED_MOTION, SLOT, STAGE_H, STAGE_TOP, TRAY_Y, W } from './sceneKit';
import type { GadgetView } from './GameScene';
import type { Gadget } from '../core/types';

type Scene = Phaser.Scene & {
  fitSprite: (img: Phaser.GameObjects.Image) => void;
  ring: (x: number, y: number, color: number, radius?: number, width?: number, dur?: number) => void;
  floatText: (x: number, y: number, text: string, color?: string, size?: number, hold?: number) => void;
  showEvent: (text: string, color: string, ms: number) => void;
  shake: (kind: 'bomb') => void;
  s: GameState;
};
type Made = Extract<GameEvent, { type: 'toolMade' }>;
type Used = Extract<GameEvent, { type: 'toolUse' }>;

const HOLD_MS = 250, WINDUP_MS = 250, FREEZE_MS = 80, STEP_MS = 50;
const GOLD = 0xffcf33;
const TOOL_COL = { surge: 0x27c4e0, bomb: 0xe0a030 } as const;

export class ToolUi {
  /** How long the cascade that follows a tool use waits (wind-up + hold), read once by GameScene. */
  private delay = 0;
  /** The last tool use's wind-up + hold (ms): the board catches up with the model after this. */
  lastWait = 0;
  private timer: Phaser.Time.TimerEvent | null = null;
  private pressed = -1;
  private held = false;
  private pv: Phaser.GameObjects.Container | null = null;
  private strip: Phaser.GameObjects.Container;
  private slots: Phaser.GameObjects.Image[] = [];
  private lit = [false, false];
  private shown = '';

  constructor(private scene: Scene) {
    this.strip = scene.add.container(W - 112, STAGE_TOP + STAGE_H - 44).setDepth(41).setVisible(false);
    const bg = scene.add.graphics().fillStyle(0x2b1d2e, 0.55).fillRoundedRect(-92, -34, 184, 68, 18);
    this.strip.add(bg);
    (['row_surge', 'gear_bomb'] as const).forEach((k, i) => {
      const x = -46 + i * 92;
      const im = scene.add.image(x, -4, `${k}_1`).setTintFill(0x8a7a88).setAlpha(0.45);
      im.setScale(46 / 128);
      const cap = scene.add.text(x, 24, i ? 'SANDWICH' : `CHAIN ${TUNING.tl.chain}+`, { fontFamily: 'Lilita One, Arial Black', fontSize: '12px', color: '#fff0cf' }).setOrigin(0.5);
      this.strip.add([im, cap]);
      this.slots.push(im);
    });
  }

  // ---------- views ----------

  /** The container for a tool part: tinted cell / brass gear, TOOL badge, idle pulse. */
  makeView(g: Gadget): GadgetView {
    const sc = this.scene;
    const c = sc.add.container(0, 0) as GadgetView;
    c.gid = g.id;
    const col = g.tool === 'surge' ? FAMILY_INFO[g.hue ?? 'cannon'].color : TOOL_COL.bomb;
    const glow = sc.add.circle(0, 6, 54, g.tool === 'surge' ? col : 0xffd060, 0.25);
    const img = sc.add.image(0, 0, `${g.family}_1`);
    sc.fitSprite(img);
    if (g.tool === 'surge') img.setTint(col);
    const pill = sc.add.graphics().fillStyle(0x2b1d2e, 1).fillRoundedRect(SLOT.rank.x - 30, SLOT.rank.y - 12, 60, 24, 10).fillStyle(GOLD, 1).fillRoundedRect(SLOT.rank.x - 27, SLOT.rank.y - 9, 54, 18, 8);
    const label = sc.add.text(SLOT.rank.x, SLOT.rank.y, 'TOOL', { fontFamily: 'Lilita One, Arial Black', fontSize: '16px', color: '#2b1d2e' }).setOrigin(0.5);
    c.add([glow, img, pill, label]);
    c.setSize(CELL, CELL).setDepth(10);
    if (!REDUCED_MOTION) {
      // idle pulse on the children (the container's own tweens are killed by reconcile)
      const t1 = sc.tweens.add({ targets: img, scaleX: img.scaleX * 1.07, scaleY: img.scaleY * 1.07, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
      const t2 = sc.tweens.add({ targets: glow, alpha: 0.5, scale: 1.18, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
      c.once('destroy', () => (t1.remove(), t2.remove()));
    }
    return c;
  }

  // ---------- long-press preview ----------

  /** Finger down on a tool cell: after HOLD_MS the cells it would wake light up (release then does nothing). */
  press(idx: number, s: GameState) {
    this.cancel();
    if (!s.grid[idx]?.tool) return;
    this.pressed = idx;
    this.held = false;
    this.timer = this.scene.time.delayedCall(HOLD_MS, () => {
      this.held = true;
      this.showPreview(idx);
    });
  }
  /** The finger moved off (a drag) or the tap was cancelled. */
  cancel() {
    this.timer?.remove();
    this.timer = null;
    this.pressed = -1;
    this.held = false;
    this.hidePreview();
  }
  /** Finger up on a tapped tool cell: 'held' = the preview was showing (no use), 'use' = a quick tap, 'none' = not a tool. */
  release(idx: number): 'held' | 'use' | 'none' {
    const was = this.pressed === idx && !!this.scene.s.grid[idx]?.tool;
    const held = this.held;
    this.cancel();
    return !was ? 'none' : held ? 'held' : 'use';
  }

  private showPreview(idx: number) {
    this.hidePreview();
    const s = this.scene.s;
    const plan = planTool(s, idx); // a COPY is run below: neither call mutates the state
    const res = plan ? previewTool(s, plan) : null;
    const sc = this.scene;
    const c = sc.add.container(0, 0).setDepth(60);
    const g = sc.add.graphics();
    c.add(g);
    if (plan) for (const t of plan.tools) {
      const p = cellXY(t);
      g.lineStyle(6, 0xffffff, 1).strokeRoundedRect(p.x - CELL / 2 + 4, p.y - CELL / 2 + 4, CELL - 8, CELL - 8, 18);
    }
    const direct = new Set(plan?.wake ?? []);
    for (const a of res?.activations ?? []) {
      const p = cellXY(a.idx);
      const d = direct.has(a.idx);
      g.fillStyle(GOLD, d ? 0.3 : 0.14).fillRoundedRect(p.x - CELL / 2 + 6, p.y - CELL / 2 + 6, CELL - 12, CELL - 12, 16);
      g.lineStyle(d ? 6 : 3, GOLD, d ? 1 : 0.6).strokeRoundedRect(p.x - CELL / 2 + 6, p.y - CELL / 2 + 6, CELL - 12, CELL - 12, 16);
    }
    const at = cellXY(idx);
    const n = res?.count ?? 0;
    const label = res ? `${plan!.combo === 'surge' || plan!.combo === 'bomb' ? '' : COMBO_NAME[plan!.combo] + '  ·  '}wakes ${n}` : 'nothing to wake';
    const chip = sc.add.text(Phaser.Math.Clamp(at.x, 120, W - 120), at.y - CELL * 0.8, label, { fontFamily: 'Lilita One, Arial Black', fontSize: '30px', color: res ? '#ffcf33' : '#ffb0a0', stroke: '#2b1d2e', strokeThickness: 8 }).setOrigin(0.5);
    c.add(chip);
    this.pv = c;
  }
  hidePreview() {
    this.pv?.destroy();
    this.pv = null;
  }

  // ---------- events ----------

  /** A merge earned a tool: a pop at the new part (or the tray) and a banner. */
  playMade(e: Made) {
    const sc = this.scene;
    const p = e.tray ? { x: BX + 150, y: TRAY_Y } : cellXY(e.idx);
    sc.ring(p.x, p.y, TOOL_COL[e.kind], 90, 12, 420);
    sc.floatText(p.x, p.y - 70, e.kind === 'surge' ? 'ROW SURGE!' : 'GEAR BOMB!', '#ffcf33', 34, 200);
    sc.showEvent(e.tray ? 'TOOL IN THE TRAY: tap it when it lands' : `${e.kind === 'surge' ? 'ROW SURGE' : 'GEAR BOMB'} made: TAP it to use, HOLD to preview`, '#fff0cf', 2200);
    sfx.rankUp(5);
  }

  /** A tool (or combo) was used: wind-up, a visual-only hold, then the ring wave. Returns after scheduling; takeDelay() tells the cascade how long to wait. */
  playUse(e: Used) {
    const sc = this.scene;
    this.hidePreview();
    const o = cellXY(e.idx);
    const col = TOOL_COL[e.combo === 'surge' || e.combo === 'surge2' ? 'surge' : 'bomb'];
    const wind = REDUCED_MOTION ? 120 : WINDUP_MS, hold = REDUCED_MOTION ? 0 : FREEZE_MS;
    this.delay = this.lastWait = wind + hold;
    // board dim (a rectangle over the board, fades in during the wind-up, out after the wave)
    const dim = sc.add.rectangle(W / 2, BY + (CELL * 6) / 2, CELL * COLS, CELL * 6, 0x1a0f18, 0).setDepth(7);
    const cells = [...new Set(e.reach)];
    const dist = (i: number) => Math.abs(Math.floor(i / COLS) - Math.floor(e.idx / COLS)) + Math.abs((i % COLS) - (e.idx % COLS));
    const order = cells.sort((a, b) => dist(a) - dist(b) || a - b);
    const total = wind + hold + (dist(order[order.length - 1] ?? e.idx) + 1) * STEP_MS;
    sc.tweens.add({ targets: dim, alpha: 0.4, duration: wind, onComplete: () => sc.tweens.add({ targets: dim, alpha: 0, delay: total - wind, duration: 260, onComplete: () => dim.destroy() }) });
    // wind-up: the tool charges (pulses) at its cell; the second tool of a combo is drawn sliding into it
    const charge = sc.add.circle(o.x, o.y, 20, col, 0.6).setDepth(50);
    sc.tweens.add({ targets: charge, scale: REDUCED_MOTION ? 2 : 3.6, alpha: 0.9, duration: wind, ease: 'Cubic.In' });
    sfx.snap();
    if (e.tools.length > 1) {
      const q = cellXY(e.tools[1]);
      const ghost = sc.add.circle(q.x, q.y, 26, col, 0.8).setDepth(51);
      sc.tweens.add({ targets: ghost, x: o.x, y: o.y, duration: wind, ease: 'Cubic.In', onComplete: () => ghost.destroy() });
    }
    // after the hold: the white flash + wave outward, one ring per cell, ~50 ms apart, each step one note higher
    sc.time.delayedCall(wind + hold, () => {
      charge.destroy();
      sc.shake('bomb');
      const fl = sc.add.circle(o.x, o.y, 60, 0xffffff, 0.85).setDepth(52);
      sc.tweens.add({ targets: fl, alpha: 0, scale: 2, duration: 220, onComplete: () => fl.destroy() });
    });
    order.forEach((i, k) => {
      const p = cellXY(i);
      const at = wind + hold + dist(i) * STEP_MS;
      sc.time.delayedCall(at, () => {
        sc.ring(p.x, p.y, col, 70, 10, 300);
        const woke = e.wake.includes(i);
        if (woke) {
          const g = sc.add.rectangle(p.x, p.y, CELL - 10, CELL - 10, 0xffffff, 0.45).setDepth(49);
          sc.tweens.add({ targets: g, alpha: 0, duration: 260, onComplete: () => g.destroy() });
        }
        sfx.ladder(Math.min(dist(i), 11), 0);
      });
      void k;
    });
    sc.time.delayedCall(wind + hold, () => {
      UNIT_SOUND[e.combo === 'surge' || e.combo === 'surge2' ? 'row_surge' : 'gear_bomb'](0, 1);
      const chip = sc.add.text(Phaser.Math.Clamp(o.x, 100, W - 100), o.y - CELL * 0.7, `x ${e.count}`, { fontFamily: 'Lilita One, Arial Black', fontSize: '52px', color: '#ffcf33', stroke: '#2b1d2e', strokeThickness: 10 }).setOrigin(0.5).setDepth(64).setScale(REDUCED_MOTION ? 1 : 0.4);
      if (!REDUCED_MOTION) sc.tweens.add({ targets: chip, scale: 1, duration: 180, ease: 'Back.Out' });
      sc.tweens.add({ targets: chip, y: chip.y - 50, alpha: 0, delay: 700, duration: 400, onComplete: () => chip.destroy() });
      if (e.combo !== 'surge' && e.combo !== 'bomb') sc.floatText(Phaser.Math.Clamp(o.x, 140, W - 140), o.y - CELL * 1.25, COMBO_NAME[e.combo], '#ffffff', 36, 200);
    });
    // recipe strip: a combo or a use blinks the matching icon

  }

  /** Read once by the cascade event that follows a tool use: ms to wait so the wind-up plays first. */
  takeDelay(): number {
    const d = this.delay;
    this.delay = 0;
    return d;
  }

  // ---------- HUD recipe strip ----------

  /** Per frame: two ghost icons (CHAIN 5+ = Row Surge, SANDWICH = Gear Bomb) that fill in when this level made that tool. */
  sync(s: GameState) {
    const on = TUNING.tools && toolsAllowed(s);
    this.strip.setVisible(on).setY(STAGE_TOP + STAGE_H - 44);
    if (!on) return;
    const made = s.grid.concat(s.pending).filter((g) => g?.tool).map((g) => g!.tool);
    const key = `${(s.stats.tools?.made ?? 0)}|${made.join()}`;
    if (key === this.shown) return;
    this.shown = key;
    // lit = this level has made that kind (a tool still held or one already used)
    const madeKinds = [this.lit[0] || made.includes('surge'), this.lit[1] || made.includes('bomb')];
    madeKinds.forEach((m, i) => {
      if (m && !this.lit[i]) {
        this.slots[i].clearTint().setAlpha(1);
        if (i === 0 && this.slots[0].texture.key === 'row_surge_1') this.slots[0].setTint(TOOL_COL.surge);
        if (!REDUCED_MOTION) this.scene.tweens.add({ targets: this.slots[i], scale: this.slots[i].scale * 1.4, duration: 160, yoyo: true });
      }
      this.lit[i] = m;
    });
    if (!(s.stats.tools?.made)) this.lit = [false, false], this.slots.forEach((im) => im.setTintFill(0x8a7a88).setAlpha(0.45));
  }

  destroy() {
    this.cancel();
    this.strip.destroy();
  }
}
