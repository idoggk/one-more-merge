// Phone-style scrolling window for the UNITS tab: drag + inertia + rubber band, thin scroll indicator, sticky section headers,
// a jump strip and a back-to-top button. All the maths lives in scrollMath.ts; this file only wires it to Phaser.
import Phaser from 'phaser';
import { W } from '../sceneKit';
import { sfx } from '../audio';
import type { GameScene } from '../GameScene';
import { activeSection, dragEnd, dragMove, dragStart, glide, headerY, jumpTarget, showBackToTop, step, wheel, type Layout, type Scroller } from './scrollMath';

export const HEAD_H = 52;
const FONT = 'Lilita One, Arial Black';

export interface ScrollSectionView {
  label: string;
  /** Short label on the jump chip. */
  chip: string;
  color: number;
}

/** A section header bar (drawn once, positioned every frame). */
export function makeHeader(scene: GameScene, label: string, color: number) {
  const h = scene.add.container(0, 0);
  h.add(scene.add.graphics().fillStyle(0x2b1d2e, 0.94).fillRoundedRect(30, 0, W - 60, HEAD_H - 8, 16).fillStyle(color, 1).fillRoundedRect(30, 0, 14, HEAD_H - 8, { tl: 16, bl: 16, tr: 0, br: 0 }));
  h.add(scene.add.text(60, (HEAD_H - 8) / 2, label, { fontFamily: FONT, fontSize: '26px', color: '#fff0cf' }).setOrigin(0, 0.5));
  return h;
}

export interface MountOpts {
  list: Phaser.GameObjects.Container;
  heads: Phaser.GameObjects.Container[];
  sections: ScrollSectionView[];
  layout: Layout;
  winTop: number;
  winBottom: number;
  chipY: number | null;
  scroller: Scroller;
  /** Keeps the live scroller reachable for a redraw (pictures loading) to carry the position over. */
  onTick?: (s: Scroller) => void;
}

export function mountScroll(scene: GameScene, c: Phaser.GameObjects.Container, o: MountOpts) {
  const { list, heads, layout, winTop, winBottom, scroller: s } = o;
  const winH = winBottom - winTop;
  const mask = scene.add.graphics().setVisible(false).fillRect(0, winTop, W, winH);
  const geo = mask.createGeometryMask();
  const headLayer = scene.add.container(0, 0);
  heads.forEach((h) => headLayer.add(h));
  list.setMask(geo);
  headLayer.setMask(geo);
  c.add([list, headLayer]);

  // tiles that can be pressed: every interactive child of the list
  const tiles = list.list.filter((g) => g.input) as Phaser.GameObjects.Container[];
  let lock = false; // true while a drag / fling is in progress: no tile may be pressed
  let lockUntilUp = false;

  // thin scroll indicator on the right edge
  const bar = scene.add.graphics().setAlpha(0);
  c.add(bar);
  let barAlpha = 0, idle = 0;

  // jump strip
  const chips: { g: Phaser.GameObjects.Graphics; w: number; x: number; color: number }[] = [];
  let shownActive = -1;
  const drawChips = (active: number) => {
    chips.forEach((ch, i) => {
      ch.g.clear().fillStyle(0x2b1d2e, 1).fillRoundedRect(-ch.w / 2, -28, ch.w, 56, 18);
      ch.g.fillStyle(i === active ? 0xffcf33 : ch.color, i === active ? 1 : 0.9).fillRoundedRect(-ch.w / 2 + 4, -24, ch.w - 8, 48, 15);
    });
  };
  if (o.chipY !== null && o.sections.length > 1) {
    const n = o.sections.length, gap = 12, cw = Math.min(150, (W - 60 - gap * (n - 1)) / n);
    o.sections.forEach((sec, i) => {
      const x = W / 2 + (i - (n - 1) / 2) * (cw + gap);
      const chip = scene.add.container(x, o.chipY!);
      const g = scene.add.graphics();
      chip.add(g);
      chip.add(scene.add.text(0, 0, sec.chip, { fontFamily: FONT, fontSize: '22px', color: '#ffffff', stroke: '#2b1d2e', strokeThickness: 4 }).setOrigin(0.5));
      chip.setSize(cw, 56).setInteractive({ useHandCursor: true });
      chip.on('pointerup', () => {
        sfx.click();
        glide(s, jumpTarget(layout, i));
      });
      c.add(chip);
      chips.push({ g, w: cw, x, color: sec.color });
    });
    drawChips(0);
  }

  // back to top
  const top = scene.add.container(W - 84, winBottom - 54).setAlpha(0).setVisible(false);
  top.add(scene.add.graphics().fillStyle(0x2b1d2e, 1).fillRoundedRect(-52, -30, 104, 60, 22).fillStyle(0x27a4c0, 1).fillRoundedRect(-48, -26, 96, 52, 19));
  top.add(scene.add.text(0, 0, '▲ TOP', { fontFamily: FONT, fontSize: '24px', color: '#ffffff' }).setOrigin(0.5));
  top.setSize(104, 60).setInteractive({ useHandCursor: true });
  top.on('pointerup', () => (sfx.click(), glide(s, 0)));
  c.add(top);

  let appliedPos = NaN, appliedLock: boolean | null = null;
  const apply = () => {
    list.y = winTop - s.pos;
    heads.forEach((h, i) => (h.y = winTop + headerY(layout, i, s.pos, HEAD_H)));
    const a = activeSection(layout, s.pos);
    if (a !== shownActive && chips.length) {
      shownActive = a;
      drawChips(a);
    }
    for (const t of tiles) {
      const ty = list.y + t.y;
      if (t.input) t.input.enabled = !lock && ty > winTop && ty < winBottom;
    }
    // indicator: its length is the visible share of the content, squeezed while the band is stretched
    bar.clear();
    if (layout.max > 0) {
      const over = s.pos < 0 ? -s.pos : s.pos > layout.max ? s.pos - layout.max : 0;
      const len = Math.max(40, (winH * winH) / layout.contentH - over);
      const frac = Math.min(1, Math.max(0, s.pos / layout.max));
      const y = winTop + 6 + (winH - 12 - len) * frac + (s.pos > layout.max ? over : 0);
      bar.fillStyle(0x2b1d2e, 0.55).fillRoundedRect(W - 14, y, 6, len, 3);
    }
  };

  const inWin = (p: Phaser.Input.Pointer) => p.worldY >= winTop && p.worldY <= winBottom;
  const live = () => scene.modal === c && c.active;
  const onDown = (p: Phaser.Input.Pointer) => {
    if (!live() || !inWin(p) || layout.max <= 0) return;
    // pressing a moving list only stops it: the tile under the finger must not open
    lockUntilUp = s.vel !== 0 || s.glideTo !== null || s.pos < 0 || s.pos > layout.max;
    if (lockUntilUp) lock = true;
    dragStart(s, p.worldY, scene.time.now);
  };
  const onMove = (p: Phaser.Input.Pointer) => {
    if (!s.dragging || !p.isDown || !live()) return;
    dragMove(s, p.worldY, scene.time.now);
    if (s.moved) lock = true; // movement of 8 px or more: a scroll, no tap
  };
  const onUp = () => {
    if (!s.dragging) return;
    dragEnd(s, scene.time.now);
    scene.time.delayedCall(80, () => {
      if (!s.dragging && c.active) lock = false;
    });
  };
  const onWheel = (p: Phaser.Input.Pointer, _o: unknown, _dx: number, dy: number) => {
    if (live() && inWin(p)) wheel(s, dy);
  };
  const onUpdate = (_t: number, dtMs: number) => {
    if (!live()) return;
    const moving = step(s, Math.min(0.05, dtMs / 1000));
    if (moving || s.dragging) idle = 0;
    else idle += dtMs;
    // a fling that ended unlocks the tiles; while it still runs they stay off
    if (!s.dragging && !moving && lock && !lockUntilUp) lock = false;
    if (!s.dragging && !moving) lockUntilUp = false;
    const want = idle < 500 && layout.max > 0 ? 1 : 0;
    barAlpha += (want - barAlpha) * Math.min(1, dtMs / 120);
    bar.setAlpha(barAlpha);
    const wantTop = showBackToTop(s.pos, winH);
    if (wantTop && !top.visible) top.setVisible(true);
    top.setAlpha(Phaser.Math.Linear(top.alpha, wantTop ? 1 : 0, Math.min(1, dtMs / 120)));
    if (!wantTop && top.alpha < 0.02) top.setVisible(false);
    if (s.pos !== appliedPos || lock !== appliedLock) {
      appliedPos = s.pos;
      appliedLock = lock;
      apply();
    }
    o.onTick?.(s);
  };
  scene.input.on('pointerdown', onDown);
  scene.input.on('pointermove', onMove);
  scene.input.on('pointerup', onUp);
  scene.input.on('pointerupoutside', onUp);
  scene.input.on('wheel', onWheel);
  scene.events.on(Phaser.Scenes.Events.UPDATE, onUpdate);
  c.once(Phaser.GameObjects.Events.DESTROY, () => {
    scene.input.off('pointerdown', onDown);
    scene.input.off('pointermove', onMove);
    scene.input.off('pointerup', onUp);
    scene.input.off('pointerupoutside', onUp);
    scene.input.off('wheel', onWheel);
    scene.events.off(Phaser.Scenes.Events.UPDATE, onUpdate);
    headLayer.destroy();
    mask.destroy();
  });
  apply();
}
