/** Resource fly-in (TUNING-free flag RESOURCE_FLY, QA row RESOURCE FLY): icons arc from where a reward appears to its counter,
 *  the counter ticks up as each lands and pulses. Presentation only: it never changes a granted value or the save. */
import Phaser from 'phaser';
import { REDUCED_MOTION } from '../sceneKit';
import { bezier, controlPoint, flyCount, FLY, splitAmount, staggerDelay, type FlyKind, type Pt } from './resourceFlyGeom';

export { type FlyKind, type Pt } from './resourceFlyGeom';

const DEPTH = 950;
const ICON_PX = 40;
const COL: Record<FlyKind, number> = { coin: 0xf2b830, bolt: 0xf2b830, gem: 0x47c8e8, kit: 0xe8452c };
const live = new WeakMap<Phaser.Scene, Set<Phaser.GameObjects.GameObject>>();

/** Texture key for a kind: the shipped bolt icon, or a small code-drawn stand-in (generated once). */
function iconKey(scene: Phaser.Scene, kind: FlyKind): string {
  if (kind === 'bolt' && scene.textures.exists('icon_bolt') && scene.textures.get('icon_bolt').key !== '__MISSING') return 'icon_bolt';
  const key = `fly_${kind}`;
  if (scene.textures.exists(key)) return key;
  const g = scene.make.graphics({}, false);
  const c = COL[kind];
  g.fillStyle(0x2b1d2e, 1);
  if (kind === 'gem') {
    g.fillPoints([{ x: 20, y: 1 }, { x: 38, y: 15 }, { x: 20, y: 39 }, { x: 2, y: 15 }] as Phaser.Types.Math.Vector2Like[], true);
    g.fillStyle(c, 1).fillPoints([{ x: 20, y: 6 }, { x: 33, y: 16 }, { x: 20, y: 34 }, { x: 7, y: 16 }] as Phaser.Types.Math.Vector2Like[], true);
    g.fillStyle(0xffffff, 0.6).fillPoints([{ x: 20, y: 8 }, { x: 28, y: 16 }, { x: 20, y: 16 }] as Phaser.Types.Math.Vector2Like[], true);
  } else if (kind === 'kit') {
    g.fillRoundedRect(3, 9, 34, 26, 6).fillStyle(c, 1).fillRoundedRect(6, 12, 28, 20, 4).fillStyle(0xfff0cf, 1).fillRect(17, 12, 6, 20).fillStyle(0x2b1d2e, 1).fillRoundedRect(14, 3, 12, 8, 3);
  } else {
    g.fillCircle(20, 20, 19).fillStyle(c, 1).fillCircle(20, 20, 15).fillStyle(0xfff0a8, 1).fillCircle(20, 20, 9).fillStyle(c, 1).fillCircle(20, 20, 5);
  }
  g.generateTexture(key, 40, 40);
  g.destroy();
  return key;
}

/** Scale pulse on a counter (text / image / container). */
export function bumpCounter(scene: Phaser.Scene, target: Phaser.GameObjects.Components.Transform & Phaser.GameObjects.GameObject, base = 1): void {
  if (!target.active) return;
  scene.tweens.killTweensOf(target);
  target.setScale(base);
  scene.tweens.add({ targets: target, scale: base * 1.28, duration: 90, yoyo: true, ease: 'Quad.Out', onComplete: () => target.active && target.setScale(base) });
}

export interface FlyOpts {
  /** called as each icon lands with that icon's share of the amount, and the running total landed so far */
  onArrive?: (share: number, landed: number) => void;
  /** pulsed on every arrival */
  counter?: Phaser.GameObjects.Components.Transform & Phaser.GameObjects.GameObject;
}

/** Fly `amount` of `kind` from `from` to `to`. Returns the number of icons launched (0 with reduced motion or a full budget:
 *  then onArrive fires once, at once, with the whole amount so a counter never stays short). */
export function flyResource(scene: Phaser.Scene, kind: FlyKind, amount: number, from: Pt, to: Pt, opts: FlyOpts = {}): number {
  if (!(amount > 0)) return 0;
  let set = live.get(scene);
  if (!set) live.set(scene, (set = new Set()));
  for (const o of set) if (!o.active) set.delete(o);
  const n = REDUCED_MOTION ? 0 : flyCount(amount, set.size);
  if (n === 0) {
    opts.onArrive?.(amount, amount);
    return 0;
  }
  const key = iconKey(scene, kind);
  const ctrl = controlPoint(from, to);
  const shares = splitAmount(amount, n);
  let landed = 0;
  for (let i = 0; i < n; i++) {
    const sp = scene.add.image(from.x, from.y, key).setDepth(DEPTH).setVisible(false);
    sp.setDisplaySize(ICON_PX, ICON_PX);
    const base = sp.scaleX;
    set.add(sp);
    scene.time.delayedCall(staggerDelay(i), () => {
      if (!sp.active) return;
      sp.setVisible(true).setScale(base * 0.4);
      scene.tweens.add({ targets: sp, scale: base * 1.25, duration: 110, yoyo: true, ease: 'Back.Out' }); // pop at the start
      scene.tweens.addCounter({
        from: 0,
        to: FLY.overshoot,
        duration: FLY.travelMs,
        ease: 'Quad.In',
        onUpdate: (tw) => {
          if (!sp.active) return;
          const p = bezier(from, ctrl, to, tw.getValue() ?? 0);
          sp.setPosition(p.x, p.y);
        },
        onComplete: () => {
          if (!sp.active) return;
          scene.tweens.add({
            targets: sp,
            x: to.x,
            y: to.y,
            alpha: 0,
            scale: base * 0.5,
            duration: 110,
            ease: 'Quad.Out',
            onComplete: () => sp.destroy(),
          });
          landed += shares[i];
          opts.onArrive?.(shares[i], landed);
          if (opts.counter) bumpCounter(scene, opts.counter);
        },
      });
    });
  }
  return n;
}

/** A small counter chip (icon + number) for panels that have no wallet of their own. Returns the chip and a setter. */
export function makeCounterChip(scene: Phaser.Scene, kind: FlyKind, x: number, y: number, value: number) {
  const box = scene.add.container(x, y);
  const bg = scene.add.graphics().fillStyle(0x2b1d2e, 0.85).fillRoundedRect(-70, -22, 140, 44, 22);
  const icon = scene.add.image(-46, 0, iconKey(scene, kind)).setDisplaySize(32, 32);
  const text = scene.add.text(-24, 0, `${value}`, { fontFamily: 'Lilita One, Arial Black', fontSize: '28px', color: '#fff0cf' }).setOrigin(0, 0.5);
  box.add([bg, icon, text]);
  return { box, set: (v: number) => text.active && text.setText(`${v}`) };
}

/** Grant fly-in with its own counter chip: the chip shows the balance BEFORE the grant and ticks to `balanceAfter` as icons land.
 *  `parent` (e.g. the results panel) owns the chip so it goes away with the panel; flying icons live on the scene. */
export function flyToChip(scene: Phaser.Scene, parent: Phaser.GameObjects.Container, kind: FlyKind, amount: number, balanceAfter: number, from: Pt, chipAt: Pt): void {
  const before = balanceAfter - amount;
  const chip = makeCounterChip(scene, kind, chipAt.x, chipAt.y, before);
  parent.add(chip.box);
  flyResource(scene, kind, amount, from, chipAt, { counter: chip.box, onArrive: (_s, landed) => chip.set(before + landed) });
}
