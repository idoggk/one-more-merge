// LEVEL ROAD V2: finger / wheel scrolling with momentum and a rubber band (pure maths in roadModel.ts). The units-scroll module was
// not merged when this was written, so the road keeps its own; src/game/ui/scrollList.ts is a plain drag list and cannot coast.
import Phaser from 'phaser';
import type { GameScene } from '../GameScene';
import { H } from '../sceneKit';
import { releaseVelocity, rubberBand, stepFling, clamp, type Fling } from './roadModel';

const DRAG_SLOP = 12;

export interface RoadScroller {
  readonly scroll: number;
  /** the current gesture travelled farther than a tap: node taps must be ignored */
  moved(): boolean;
  /** jump or glide so that `scroll` is reached (ms 0 = jump) */
  to(scroll: number, ms?: number): void;
}

export function attachRoadScroll(
  scene: GameScene,
  c: Phaser.GameObjects.Container,
  opts: { startY: number; endY: number; lo: number; hi: number; start: number; onScroll: (scroll: number) => void },
): RoadScroller {
  let scroll = opts.start;
  let fling: Fling | null = null;
  let glide: { from: number; to: number; t: number; ms: number } | null = null;
  let downY = 0, startScroll = 0, dragging = false, travelled = 0;
  let samples: { t: number; y: number }[] = [];
  let shield: Phaser.GameObjects.Zone | null = null;
  const apply = (v: number) => {
    scroll = v;
    opts.onScroll(v);
  };
  const live = () => scene.homeC === c && c.active;
  const onDown = (p: Phaser.Input.Pointer) => {
    if (!live()) return;
    downY = p.worldY;
    startScroll = scroll;
    travelled = 0;
    fling = null;
    glide = null;
    dragging = p.worldY >= opts.startY && p.worldY <= opts.endY;
    samples = [{ t: scene.time.now, y: p.worldY }];
  };
  const onMove = (p: Phaser.Input.Pointer) => {
    if (!p.isDown || !live() || !dragging) return;
    travelled = Math.max(travelled, Math.abs(p.worldY - downY));
    if (travelled < DRAG_SLOP) return;
    if (!shield) {
      // a drag that ends over the wallet must not press it (the BOLTS popup bug): the shield takes the release instead
      shield = scene.add.zone(360, H / 2, 720, H).setInteractive().setDepth(1000);
    }
    samples.push({ t: scene.time.now, y: p.worldY });
    if (samples.length > 12) samples.shift();
    apply(rubberBand(startScroll + (p.worldY - downY), opts.lo, opts.hi));
  };
  const onUp = () => {
    if (!dragging) return;
    dragging = false;
    const v = travelled < DRAG_SLOP ? 0 : releaseVelocity(samples, scene.time.now);
    fling = v !== 0 || scroll < opts.lo || scroll > opts.hi ? { pos: scroll, vel: v } : null;
    scene.time.delayedCall(60, () => {
      shield?.destroy();
      shield = null;
    });
  };
  const onWheel = (p: Phaser.Input.Pointer, _o: unknown, _dx: number, dy: number) => {
    if (!live() || p.worldY < opts.startY || p.worldY > opts.endY) return;
    fling = null;
    apply(clamp(scroll - dy, opts.lo, opts.hi));
  };
  const onUpdate = (_t: number, dt: number) => {
    if (!live()) return;
    if (glide) {
      glide.t += dt;
      const k = Math.min(1, glide.t / glide.ms);
      apply(glide.from + (glide.to - glide.from) * (1 - Math.pow(1 - k, 3)));
      if (k >= 1) glide = null;
      return;
    }
    if (!fling || dragging) return;
    const s = stepFling(fling, Math.min(dt, 50), opts.lo, opts.hi);
    fling = s.rest ? null : { pos: s.pos, vel: s.vel };
    apply(s.pos);
  };
  scene.input.on('pointerdown', onDown);
  scene.input.on('pointermove', onMove);
  scene.input.on('pointerup', onUp);
  scene.input.on('pointerupoutside', onUp);
  scene.input.on('wheel', onWheel);
  scene.events.on('update', onUpdate);
  c.once(Phaser.GameObjects.Events.DESTROY, () => {
    scene.input.off('pointerdown', onDown);
    scene.input.off('pointermove', onMove);
    scene.input.off('pointerup', onUp);
    scene.input.off('pointerupoutside', onUp);
    scene.input.off('wheel', onWheel);
    scene.events.off('update', onUpdate);
    shield?.destroy();
  });
  apply(scroll);
  return {
    get scroll() {
      return scroll;
    },
    moved: () => travelled >= DRAG_SLOP,
    to(v, ms = 0) {
      fling = null;
      const target = clamp(v, opts.lo, opts.hi);
      if (ms <= 0) {
        glide = null;
        apply(target);
      } else glide = { from: scroll, to: target, t: 0, ms };
    },
  };
}
