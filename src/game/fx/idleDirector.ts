import Phaser from 'phaser';
import { UNIT_IDLE } from '../../content/experiments';
import { REDUCED_MOTION } from '../sceneKit';
import { IDLE_CONFIG, IDLE_CONFIG_LOW, IdleScheduler, type IdleKind } from './idleSchedule';

/** Unit idle life (flag UNIT_IDLE, QA row UNIT IDLE, default OFF). Visual only: it tweens the unit PICTURE (an inner image of the
 *  cell container, the tray icon or a units-tab portrait) and never reads or writes game state, saves or the game Rng. One 4 Hz
 *  scheduler, at most 2 units at once (1 on low-end phones), nothing at all under reduced motion, while hidden, dragging or in a cascade. */

type Pic = Phaser.GameObjects.Image;
interface Base { sx: number; sy: number; y: number; angle: number }
interface Entry { obj: Pic; scale: boolean }

export interface IdleHost {
  /** false while a drag, a cascade, a result or a popup owns the screen */
  canIdle: () => boolean;
  /** the board pictures: [id, picture] */
  board: () => Iterable<[string, Pic]>;
}

const TICK_MS = 250;

export class IdleDirector {
  private extra = new Map<string, Entry>();
  private bases = new WeakMap<Pic, Base>();
  private running = new Map<Pic, Phaser.Tweens.Tween>();
  private wobbleObj: Pic | null = null;
  private seen = new Map<string, Entry>();
  private sched: IdleScheduler;

  constructor(private scene: Phaser.Scene, private host: IdleHost) {
    const low = typeof navigator !== 'undefined' && (navigator.hardwareConcurrency ?? 8) <= 4;
    this.sched = new IdleScheduler({ ...(low ? IDLE_CONFIG_LOW : IDLE_CONFIG), reduced: REDUCED_MOTION }, Math.random, (a, b) => this.close(a, b));
    scene.time.addEvent({ delay: TICK_MS, loop: true, callback: () => this.tick() });
  }

  /** register a picture that is not on the board (tray icon, units-tab portrait); `scale:false` = something else resets its scale */
  watch(id: string, obj: Pic, scale = true) {
    if (obj) this.extra.set(id, { obj, scale });
  }

  /** units tab: watch the picture a helper just appended to `parent` */
  watchLast(id: string, parent: Phaser.GameObjects.Container) {
    const last = parent.list[parent.list.length - 1];
    if (last instanceof Phaser.GameObjects.Image) this.watch(id, last);
  }

  private usable(e: Entry) {
    if (!e.obj.active || !e.obj.visible || e.obj.alpha < 1) return false;
    for (let p: Phaser.GameObjects.Container | null = e.obj.parentContainer; p; p = p.parentContainer) if (!p.visible || !p.active) return false;
    return true;
  }

  private close(a: string, b: string) {
    const ea = this.seen.get(a), eb = this.seen.get(b);
    if (!ea || !eb) return false;
    const ma = ea.obj.getWorldTransformMatrix(), mb = eb.obj.getWorldTransformMatrix();
    return Math.hypot(ma.tx - mb.tx, ma.ty - mb.ty) < 240;
  }

  private tick() {
    if (!UNIT_IDLE.on || REDUCED_MOTION || (typeof document !== 'undefined' && document.hidden) || !this.host.canIdle()) {
      this.sched.tick(this.scene.time.now, []); // forgets stale ids, picks nothing
      return;
    }
    this.seen.clear();
    for (const [id, obj] of this.host.board()) this.seen.set(id, { obj, scale: true });
    for (const [id, e] of this.extra) {
      if (!e.obj.active) this.extra.delete(id);
      else this.seen.set(id, e);
    }
    const ids = [...this.seen].filter(([, e]) => this.usable(e) && !this.scene.tweens.isTweening(e.obj.parentContainer ?? e.obj)).map(([id]) => id);
    const pick = this.sched.tick(this.scene.time.now, ids);
    const e = pick && this.seen.get(pick.id);
    if (pick && e) this.play(e, pick.kind, pick.duration);
  }

  private base(obj: Pic): Base {
    let b = this.bases.get(obj);
    if (!b) this.bases.set(obj, (b = { sx: obj.scaleX, sy: obj.scaleY, y: obj.y, angle: obj.angle }));
    return b;
  }

  /** stop any idle tween on `obj` and put it back exactly where it was */
  private settle(obj: Pic) {
    this.running.get(obj)?.stop();
    this.running.delete(obj);
    const b = this.bases.get(obj);
    if (b && obj.active) obj.setScale(b.sx, b.sy).setY(b.y).setAngle(b.angle);
    this.bases.delete(obj);
  }

  private run(obj: Pic, props: Omit<Phaser.Types.Tweens.TweenBuilderConfig, 'targets'>, restoreOnDone = true) {
    const tw = this.scene.tweens.add({
      targets: obj,
      ...props,
      onComplete: () => {
        if (this.running.get(obj) === tw) {
          this.running.delete(obj);
          if (restoreOnDone) this.settle(obj);
        }
      },
    });
    this.running.set(obj, tw);
  }

  private play(e: Entry, kind: IdleKind, duration: number) {
    const o = e.obj;
    if (this.running.has(o) || o === this.wobbleObj) return;
    const b = this.base(o);
    if (!e.scale) {
      // something rewrites this picture's scale every frame (tray): bob and rock instead
      if (kind === 'breathe') this.run(o, { y: b.y - 2, duration: duration / 2, yoyo: true, ease: 'Sine.InOut' });
      else this.run(o, { angle: b.angle + 4, duration: duration / 2, yoyo: true, ease: 'Sine.InOut' });
      return;
    }
    if (kind === 'breathe') this.run(o, { scaleY: b.sy * 1.025, scaleX: b.sx * 0.9875, duration: duration / 2, yoyo: true, ease: 'Sine.InOut' });
    else this.run(o, { scaleY: b.sy * 0.94, duration: duration / 2, yoyo: true, ease: 'Sine.InOut' });
  }

  /** hop on merge: the survivor's picture jumps 10 px with a squash. Skipped under reduced motion or with the flag off. */
  hop(obj: Pic | null | undefined) {
    if (!UNIT_IDLE.on || REDUCED_MOTION || !obj || !obj.active || obj === this.wobbleObj) return;
    this.settle(obj);
    const b = this.base(obj);
    this.run(obj, { y: b.y - 10, scaleX: b.sx * 1.08, scaleY: b.sy * 0.93, duration: 110, yoyo: true, ease: 'Quad.Out' });
  }

  /** gentle wobble while a unit is picked or selected; `null` stops it */
  wobble(obj: Pic | null | undefined) {
    const next = UNIT_IDLE.on && !REDUCED_MOTION && obj && obj.active ? obj : null;
    if (next === this.wobbleObj) return;
    if (this.wobbleObj) this.settle(this.wobbleObj);
    this.wobbleObj = next;
    if (!next) return;
    this.settle(next);
    const b = this.base(next);
    next.setAngle(b.angle - 3);
    this.run(next, { angle: b.angle + 3, duration: 260, yoyo: true, repeat: -1, ease: 'Sine.InOut' }, false);
  }
}
