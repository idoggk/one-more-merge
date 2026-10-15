import Phaser from 'phaser';
import { MASCOT_MOTION } from '../../content/experiments';
import { REDUCED_MOTION } from '../sceneKit';
import { BOLT_CONFIG, BOLT_DURATION, BoltMachine, MASCOT_CAP, boltTexKey, peekProgress, type BoltState } from './boltMachine';

/** Mascot Bolt animator (flag MASCOT_MOTION, QA row MASCOT DEMO, default OFF). Visual only: drives one container with squash, hop,
 *  lean and slide tweens from the pure BoltMachine. Pose textures bolt_<state> are used when loaded; otherwise a simple code-drawn
 *  robot head. At most one animated mascot per screen (MASCOT_CAP). Reduced motion: poses swap, nothing moves, no sparkles. */

const INK = 0x2b1d2e;

export interface BoltOpts {
  /** cap owner id, e.g. 'levelIntro' */
  owner: string;
  size?: number;
  reduced?: boolean;
  /** peek: which edge Bolt slides in from */
  edge?: 'top' | 'side';
  /** hidden whenever idle (a popup Bolt that only shows when it peeks) */
  peekOnly?: boolean;
}

export class BoltAnimator {
  readonly root: Phaser.GameObjects.Container;
  private body: Phaser.GameObjects.Container;
  private fx: Phaser.GameObjects.Container;
  private img: Phaser.GameObjects.Image | null = null;
  private face: Phaser.GameObjects.Graphics;
  private machine: BoltMachine;
  private timer: Phaser.Time.TimerEvent;
  private peekTween: Phaser.Tweens.Tween | null = null;
  private dead = false;
  private baseX: number;
  private baseY: number;
  private size: number;
  private reduced: boolean;
  private edge: 'top' | 'side';
  private target: { x: number; y: number } | null = null;
  private blinking = false;
  private glance = 0;

  private constructor(
    private scene: Phaser.Scene,
    private o: BoltOpts,
    x: number,
    y: number,
  ) {
    this.size = o.size ?? 140;
    this.reduced = o.reduced ?? REDUCED_MOTION;
    this.edge = o.edge ?? 'top';
    this.baseX = x;
    this.baseY = y;
    this.machine = new BoltMachine({ ...BOLT_CONFIG, reduced: this.reduced }, Math.random, scene.time.now);
    this.root = scene.add.container(x, y);
    this.body = scene.add.container(0, 0);
    this.fx = scene.add.container(0, 0);
    this.face = scene.add.graphics();
    this.root.add([this.body, this.fx]);
    this.body.add(this.face);
    this.draw();
    this.timer = scene.time.addEvent({ delay: 50, loop: true, callback: () => this.step() });
    this.root.once(Phaser.GameObjects.Events.DESTROY, () => this.destroy());
    this.root.setVisible(!o.peekOnly);
    this.startBreathe();
  }

  /** Make a mascot, or null when the flag is off or another mascot already owns the screen. */
  static create(scene: Phaser.Scene, x: number, y: number, o: BoltOpts): BoltAnimator | null {
    if (!MASCOT_MOTION.on || !MASCOT_CAP.claim(o.owner)) return null;
    return new BoltAnimator(scene, o, x, y);
  }

  get state(): BoltState {
    return this.machine.state;
  }

  /** Ask for a state; false when the transition is not legal. `target` (scene coords) is where `point` leans and points. */
  play(state: BoltState, target?: { x: number; y: number }): boolean {
    if (this.dead || !this.machine.request(state, this.scene.time.now)) return false;
    this.target = target ?? null;
    this.enter(state);
    return true;
  }

  /** Go back to idle by hand (point and thinking are held until this). */
  rest() {
    this.play('idle');
  }

  destroy() {
    if (this.dead) return;
    this.dead = true;
    MASCOT_CAP.release(this.o.owner);
    this.timer.remove();
    this.peekTween?.stop();
    this.scene.tweens.killTweensOf([this.body, this.root, this.fx]);
    if (this.root.active) this.root.destroy();
  }

  // ---- internals

  private step() {
    if (this.dead) return;
    for (const e of this.machine.tick(this.scene.time.now)) {
      if (e.kind === 'state') this.enter('idle');
      else if (e.kind === 'blink') this.blink();
      else this.doGlance(e.dir);
    }
  }

  private resetBody() {
    this.scene.tweens.killTweensOf([this.body, this.root]);
    this.scene.tweens.killTweensOf(this.fx.list);
    this.fx.removeAll(true);
    this.peekTween?.stop();
    this.peekTween = null;
    this.body.setPosition(0, 0).setScale(1).setAngle(0);
    this.root.setPosition(this.baseX, this.baseY).setAlpha(1);
    this.glance = 0;
  }

  private enter(s: BoltState) {
    this.resetBody();
    this.draw();
    this.root.setVisible(!this.o.peekOnly || s === 'peek');
    if (s === 'idle') return this.startBreathe();
    if (s === 'peek') return this.startPeek();
    if (this.reduced) return;
    const t = this.scene.tweens;
    const hop = (h: number, n: number, ms: number) => t.add({ targets: this.body, y: -h, scaleY: 1.08, scaleX: 0.94, duration: ms, yoyo: true, repeat: n - 1, ease: 'Quad.easeOut' });
    if (s === 'happy') {
      hop(34, 2, 170);
      this.sparkleBurst(0, -this.size * 0.5, 8);
    } else if (s === 'cheer') {
      hop(52, 3, 200);
      t.add({ targets: this.body, angle: { from: -8, to: 8 }, duration: 160, yoyo: true, repeat: 7 });
      this.sparkleBurst(0, -this.size * 0.5, 14);
    } else if (s === 'point') {
      this.startPoint();
    } else if (s === 'thinking') {
      this.startThinking();
    } else if (s === 'worried') {
      t.add({ targets: this.body, x: { from: -9, to: 9 }, duration: 55, yoyo: true, repeat: 5, onComplete: () => this.body.setX(0) });
    }
  }

  private startBreathe() {
    if (this.reduced) return;
    this.scene.tweens.add({ targets: this.body, scaleY: 0.96, scaleX: 1.02, y: 2, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  private startPoint() {
    const dir = this.target ? Math.sign(this.target.x - this.baseX) || 1 : 1;
    this.scene.tweens.add({ targets: this.body, angle: dir * 9, x: dir * 8, duration: 220, ease: 'Back.easeOut' });
    const hand = this.scene.add.graphics();
    hand.fillStyle(INK, 1).fillCircle(0, 0, 17).fillStyle(0xffd24a, 1).fillCircle(0, 0, 13);
    const ang = this.target ? Math.atan2(this.target.y - this.baseY, this.target.x - this.baseX) : 0;
    const d = this.size * 0.62;
    hand.setPosition(Math.cos(ang) * d, Math.sin(ang) * d);
    this.fx.add(hand);
    this.scene.tweens.add({ targets: hand, x: hand.x + Math.cos(ang) * 22, y: hand.y + Math.sin(ang) * 22, duration: 340, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  private startThinking() {
    this.scene.tweens.add({ targets: this.body, angle: 12, x: 6, duration: 300, ease: 'Back.easeOut' });
    for (let i = 0; i < 3; i++) {
      const dot = this.scene.add.circle(this.size * 0.38 + i * 18, -this.size * 0.62 - i * 6, 6 + i * 2, 0xffffff).setStrokeStyle(3, INK).setAlpha(0.15);
      this.fx.add(dot);
      this.scene.tweens.add({ targets: dot, alpha: 1, duration: 260, delay: i * 260, yoyo: true, hold: 500, repeat: -1, repeatDelay: 200 });
    }
  }

  private startPeek() {
    const len = BOLT_DURATION.peek ?? 2400;
    const hidden = this.size * 1.1;
    const hx = this.edge === 'side' ? hidden : 0;
    const hy = this.edge === 'top' ? -hidden : 0;
    const apply = (p: number) => {
      const { slide, wiggle } = peekProgress(p);
      this.root.setPosition(this.baseX + hx * (1 - slide), this.baseY + hy * (1 - slide));
      this.body.setAngle(wiggle ? Math.sin(p * Math.PI * 10) * 7 : 0);
    };
    if (this.reduced) return apply(0.5);
    apply(0);
    const k = { p: 0 };
    this.peekTween = this.scene.tweens.add({ targets: k, p: 1, duration: len, onUpdate: () => apply(k.p) });
  }

  /** A small star burst: tweened sparks that fly out and fade. Capped at 14 sparks, skipped under reduced motion. */
  sparkleBurst(x: number, y: number, n = 8) {
    if (this.reduced || this.dead) return;
    for (let i = 0; i < Math.min(14, n); i++) {
      const a = (i / n) * Math.PI * 2 + Math.random() * 0.4;
      const r = this.size * (0.45 + Math.random() * 0.3);
      const sp = this.scene.add.star(x, y, 4, 3, 9, 0xfff08a).setStrokeStyle(2, 0xff9d2e);
      this.fx.add(sp);
      this.scene.tweens.add({ targets: sp, x: x + Math.cos(a) * r, y: y + Math.sin(a) * r, alpha: 0, scale: 0.3, angle: 120, duration: 520, ease: 'Quad.easeOut', onComplete: () => sp.destroy() });
    }
  }

  private blink() {
    if (this.blinking || this.img) return;
    this.blinking = true;
    this.draw();
    this.scene.time.delayedCall(130, () => {
      this.blinking = false;
      if (!this.dead) this.draw();
    });
  }

  private doGlance(dir: -1 | 1) {
    if (this.reduced) return;
    this.glance = dir * 5;
    this.draw();
    this.scene.time.delayedCall(700, () => {
      this.glance = 0;
      if (!this.dead) this.draw();
    });
  }

  /** Pose texture when it is loaded, else the code-drawn robot head. */
  private draw() {
    const s = this.machine.state;
    const key = boltTexKey(s, this.edge);
    const tex = this.scene.textures.exists(key) && this.scene.textures.get(key).source[0]?.width > 1;
    if (tex) {
      if (!this.img) {
        this.img = this.scene.add.image(0, 0, key);
        this.body.add(this.img);
      }
      this.img.setTexture(key);
      this.img.setScale(this.size / Math.max(this.img.width, this.img.height));
      this.face.clear();
      return;
    }
    this.img?.destroy();
    this.img = null;
    drawFallbackHead(this.face, this.size, s, this.blinking, this.glance);
  }
}

/** A simple robot head from rounded rects and circles. State changes the eyes and mouth. */
export function drawFallbackHead(g: Phaser.GameObjects.Graphics, size: number, s: BoltState, blink: boolean, glance: number) {
  const w = size * 0.8;
  const h = size * 0.68;
  const top = -h / 2 + size * 0.06;
  g.clear();
  // antenna
  g.lineStyle(5, INK, 1).lineBetween(0, top, 0, top - size * 0.18);
  g.fillStyle(s === 'worried' ? 0x6fb7ff : 0xff6a4a, 1).fillCircle(0, top - size * 0.2, size * 0.07).lineStyle(4, INK, 1).strokeCircle(0, top - size * 0.2, size * 0.07);
  // head
  g.fillStyle(INK, 1).fillRoundedRect(-w / 2 - 5, top - 5, w + 10, h + 10, 26);
  g.fillStyle(0xc9d3e0, 1).fillRoundedRect(-w / 2, top, w, h, 22);
  g.fillStyle(0x3a3f55, 1).fillRoundedRect(-w * 0.42, top + h * 0.14, w * 0.84, h * 0.5, 14);
  // eyes
  const ey = top + h * 0.39;
  const ex = w * 0.19;
  const er = size * 0.065;
  g.fillStyle(0x7ff0ff, 1);
  for (const sx of [-1, 1]) {
    const cx = sx * ex + glance;
    if (blink || s === 'happy' || s === 'cheer') g.fillRect(cx - er, ey - 2, er * 2, 5); // closed or smiling lines
    else if (s === 'worried') g.fillEllipse(cx, ey + 2, er * 1.8, er * 2.4);
    else g.fillCircle(cx, s === 'thinking' ? ey - 3 : ey, er);
  }
  // mouth
  const my = top + h * 0.8;
  g.lineStyle(5, INK, 1);
  if (s === 'happy' || s === 'cheer') g.beginPath().arc(0, my - 8, 14, 0.1, Math.PI - 0.1, false).strokePath();
  else if (s === 'worried') g.beginPath().arc(0, my + 10, 12, Math.PI + 0.3, -0.3, false).strokePath();
  else g.lineBetween(-10, my, 10, my);
}
