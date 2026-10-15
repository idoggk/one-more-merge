/** UI juice kit (flag UI_JUICE, QA row UI JUICE, default OFF): timing-based motion presets for popups, buttons, badges and rewards.
 *  Presentation only: it never touches game state, the game Rng, saves or layout (only a target's own scale / alpha / angle / y,
 *  always returned to the base values). Every preset is a no-op with the flag off or under reduced motion. Docs: docs/art/UI_JUICE.md. */
import Phaser from 'phaser';
import { UI_JUICE } from '../../content/experiments';
import { REDUCED_MOTION } from '../sceneKit';
import { burstCount, countUpValue, glintGap, JUICE_CAPS, ParticleBudget, PRESS_DOWN, staggerDelay } from './juiceMath';

type Target = Phaser.GameObjects.GameObject & Phaser.GameObjects.Components.Transform;
type Alphaed = Target & Phaser.GameObjects.Components.AlphaSingle;

/** True when motion should play. */
export const juiceOn = () => UI_JUICE.on && !REDUCED_MOTION;

const budgets = new WeakMap<Phaser.Scene, ParticleBudget>();
const budgetOf = (s: Phaser.Scene) => {
  let b = budgets.get(s);
  if (!b) budgets.set(s, (b = new ParticleBudget()));
  return b;
};

/** Scale 0 -> 1.12 -> 1 with ease-out-back; ends exactly at `base`. */
export function popIn(scene: Phaser.Scene, t: Target, delay = 0, base = t.scaleX) {
  if (!juiceOn() || !t.active) return;
  t.setScale(0);
  scene.tweens.add({
    targets: t,
    scale: base * 1.12,
    delay,
    duration: 190,
    ease: 'Back.Out',
    onComplete: () => t.active && scene.tweens.add({ targets: t, scale: base, duration: 110, ease: 'Quad.Out', onComplete: () => t.active && t.setScale(base) }),
  });
}

/** Rises from `rise` px below its place with a bounce, fading in. */
export function bounceIn(scene: Phaser.Scene, t: Alphaed, delay = 0, rise = 60) {
  if (!juiceOn() || !t.active) return;
  const y = t.y;
  t.setY(y + rise).setAlpha(0);
  scene.tweens.add({ targets: t, y, alpha: 1, delay, duration: 420, ease: 'Bounce.Out', onComplete: () => t.active && t.setY(y).setAlpha(1) });
}

/** Anticipation squash, hop up, fade out. `done` runs at the end (also at once when juice is off, so callers never wait). */
export function jumpOut(scene: Phaser.Scene, t: Alphaed, done?: () => void, hop = 70) {
  if (!juiceOn() || !t.active) return void done?.();
  const y = t.y, sx = t.scaleX, sy = t.scaleY;
  scene.tweens.chain({
    targets: t,
    tweens: [
      { scaleX: sx * 1.12, scaleY: sy * 0.86, duration: 90, ease: 'Quad.Out' },
      { y: y - hop, scaleX: sx * 0.92, scaleY: sy * 1.1, alpha: 0, duration: 220, ease: 'Quad.Out' },
    ],
    onComplete: () => {
      if (t.active) t.setY(y).setScale(sx, sy);
      done?.();
    },
  });
}

/** Wire press feedback onto a button: down 0.94, release overshoot back to base. Returns the two handlers' work as tweens only. */
export function pressSquash(scene: Phaser.Scene, t: Target & Phaser.GameObjects.Components.ComputedSize, base = 1) {
  if (!juiceOn()) return;
  let down = false;
  t.on('pointerdown', () => {
    down = true;
    scene.tweens.killTweensOf(t);
    scene.tweens.add({ targets: t, scale: base * PRESS_DOWN, duration: 70, ease: 'Quad.Out' });
  });
  const release = () => {
    if (!down || !t.active) return;
    down = false;
    scene.tweens.killTweensOf(t);
    scene.tweens.add({ targets: t, scale: base * 1.06, duration: 90, ease: 'Quad.Out', onComplete: () => t.active && scene.tweens.add({ targets: t, scale: base, duration: 90, ease: 'Quad.InOut' }) });
  };
  t.on('pointerup', release);
  t.on('pointerout', release);
}

/** Diagonal white highlight crossing `box` (centre x,y, size w,h) every 2.5-6 s at random. Stops when `host` is destroyed. Up to 4 per scene. */
export function glintSweep(scene: Phaser.Scene, host: Phaser.GameObjects.Container, w: number, h: number, x = 0, y = 0) {
  if (!juiceOn()) return;
  const live = (scene.registry.get('juiceGlints') as number | undefined) ?? 0;
  if (live >= JUICE_CAPS.glints) return;
  scene.registry.set('juiceGlints', live + 1);
  const bar = scene.add.rectangle(x - w / 2 - 30, y, 22, h * 1.6, 0xffffff, 0.55).setAngle(20).setVisible(false);
  host.add(bar);
  let timer: Phaser.Time.TimerEvent | null = null;
  const next = () => {
    timer = scene.time.delayedCall(glintGap(Math.random()), () => {
      if (!bar.active) return;
      bar.setVisible(true).setX(x - w / 2 - 30);
      scene.tweens.add({ targets: bar, x: x + w / 2 + 30, duration: 420, ease: 'Sine.InOut', onComplete: () => bar.active && (bar.setVisible(false), next()) });
    });
  };
  next();
  host.once('destroy', () => {
    timer?.remove();
    scene.registry.set('juiceGlints', Math.max(0, ((scene.registry.get('juiceGlints') as number) ?? 1) - 1));
  });
}

const STAR_KEY = 'juice_star';
function starTexture(scene: Phaser.Scene): string {
  if (scene.textures.exists(STAR_KEY)) return STAR_KEY;
  const g = scene.make.graphics({}, false);
  g.fillStyle(0xffe07a, 1);
  const pts: Phaser.Types.Math.Vector2Like[] = [];
  for (let k = 0; k < 8; k++) {
    const a = -Math.PI / 2 + (k * Math.PI) / 4, r = k % 2 ? 4 : 12;
    pts.push({ x: 12 + Math.cos(a) * r, y: 12 + Math.sin(a) * r });
  }
  g.fillPoints(pts, true);
  g.generateTexture(STAR_KEY, 24, 24);
  g.destroy();
  return STAR_KEY;
}

/** 6-12 small stars flying out from (x, y) and fading. The scene-wide live cap is 30. Returns how many were launched. */
export function sparkleBurst(scene: Phaser.Scene, parent: Phaser.GameObjects.Container | null, x: number, y: number, want = 8, radius = 90, depth = 960): number {
  if (!juiceOn()) return 0;
  const bud = budgetOf(scene);
  const n = burstCount(want, bud);
  if (n === 0) return 0;
  const key = starTexture(scene);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + Math.random() * 0.5;
    const d = radius * (0.6 + Math.random() * 0.5);
    const s = scene.add.image(x, y, key).setScale(0.4 + Math.random() * 0.5).setDepth(depth).setAngle(Math.random() * 90);
    parent?.add(s);
    scene.tweens.add({
      targets: s,
      x: x + Math.cos(a) * d,
      y: y + Math.sin(a) * d,
      alpha: 0,
      angle: s.angle + 120,
      duration: 480 + Math.random() * 220,
      ease: 'Quad.Out',
      onComplete: () => s.destroy(),
    });
    s.once('destroy', () => bud.release(1)); // also frees the slot when the parent popup is destroyed mid-burst
  }
  return n;
}

/** Small rotate shake (for a map badge with a reward ready); repeats every ~3 s until the target is destroyed. */
export function attentionWiggle(scene: Phaser.Scene, t: Target, every = 3000) {
  if (!juiceOn() || !t.active) return;
  const base = t.angle;
  const go = () => {
    if (!t.active) return;
    scene.tweens.add({ targets: t, angle: { from: base - 8, to: base + 8 }, duration: 70, yoyo: true, repeat: 3, ease: 'Sine.InOut', onComplete: () => t.active && t.setAngle(base) });
  };
  const ev = scene.time.addEvent({ delay: every, loop: true, callback: go });
  t.once('destroy', () => ev.remove());
}

/** Slow 3 px bob for idle badges. */
export function floatBob(scene: Phaser.Scene, t: Target, amp = 3, period = 1800) {
  if (!juiceOn() || !t.active) return;
  const y = t.y;
  scene.tweens.add({ targets: t, y: y - amp, duration: period / 2, yoyo: true, repeat: -1, ease: 'Sine.InOut', delay: Math.random() * period });
  t.once('destroy', () => scene.tweens.killTweensOf(t));
}

/** Soft alpha + scale pulse on a glow image. */
export function glowPulse(scene: Phaser.Scene, t: Alphaed, lo = 0.45, hi = 0.9, period = 1400) {
  if (!juiceOn() || !t.active) return;
  t.setAlpha(lo);
  const s = t.scaleX;
  scene.tweens.add({ targets: t, alpha: hi, scale: s * 1.08, duration: period / 2, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
  t.once('destroy', () => scene.tweens.killTweensOf(t));
}

/** Count a text up from `from` to `to`. With juice off the final text is set at once. `fmt` formats the number. */
export function countUp(scene: Phaser.Scene, text: Phaser.GameObjects.Text, from: number, to: number, fmt: (n: number) => string = String, ms = 700, delay = 0) {
  if (!juiceOn() || from === to) return text.setText(fmt(to));
  text.setText(fmt(from));
  const o = { t: 0 };
  scene.tweens.add({
    targets: o,
    t: 1,
    delay,
    duration: ms,
    ease: 'Linear',
    onUpdate: () => text.active && text.setText(fmt(countUpValue(from, to, o.t))),
    onComplete: () => text.active && text.setText(fmt(to)),
  });
}

/** Run `fn(item, delay)` for each item with a staggered delay (list never takes longer than ~600 ms to start). */
export function stagger<T>(items: readonly T[], fn: (item: T, delay: number, i: number) => void, step = 70) {
  items.forEach((it, i) => fn(it, staggerDelay(i, step), i));
}
