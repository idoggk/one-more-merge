// Phaser side of the box-complete moment (see boxMoment.ts for the timing / state machine). Shared by the old Screw Yard
// (ScrewScene) and the object yard (ObjectYardScene). All motion is transforms on pooled display objects driven by one
// counter tween per moment: no Graphics is redrawn per frame, and the moment sits at LAYERS.fx, above the baked bands.
import Phaser from 'phaser';
import { sfx } from '../audio';
import { reduced as prefersReducedMotion, shakeCamera } from './shake';
import { BoxMoment, ChimeStreak, easeOutQuad, LAYERS, SPARKS, STAMP_MS, type MomentCue } from './boxMoment';

const INK = 0x2b1d2e;
const BRASS = 0xd9a53a;

export interface BoxMomentHost {
  scene: Phaser.Scene;
  /** Full size of a box at scale 1. */
  size: { w: number; h: number };
  /** Centre of the box in `slot`. */
  pos(slot: number): { x: number; y: number };
  /** Family colour of box colour index `color`. */
  tint(color: number): number;
  /** Draw a box of colour index `color` holding `n` screws into `into`, centred on its origin. */
  buildBox(into: Phaser.GameObjects.Container, color: number, n: number): void;
  /** The box that is open in `slot` right now (the incoming one), or null. */
  boxAt(slot: number): { color: number; n: number } | null;
  /** Where the "N BOXES TO GO" counter sits. */
  counterAt(): { x: number; y: number };
  /** Redraw the scene's real UI (called when a moment ends, and it paints the real box back in). */
  redraw(): void;
}

const lighten = (c: number) => {
  const k = Phaser.Display.Color.IntegerToColor(c);
  return Phaser.Display.Color.GetColor(k.red + (255 - k.red) * 0.35, k.green + (255 - k.green) * 0.35, k.blue + (255 - k.blue) * 0.35);
};
const shade = (c: number, t: number) => {
  const k = Phaser.Display.Color.IntegerToColor(c);
  return Phaser.Display.Color.GetColor(k.red * (1 - t), k.green * (1 - t), k.blue * (1 - t));
};

/** One moment's display objects, borrowed from the pool while it plays. */
interface Rig {
  oldC: Phaser.GameObjects.Container;
  newC: Phaser.GameObjects.Container;
  lid: Phaser.GameObjects.Graphics;
  flash: Phaser.GameObjects.Image;
  ring: Phaser.GameObjects.Image;
  sparks: Phaser.GameObjects.Image[];
  stamp: Phaser.GameObjects.Text;
  plus: Phaser.GameObjects.Text;
}

export function ensureBoxFxTextures(scene: Phaser.Scene) {
  if (!scene.textures.exists('bm_spark')) {
    const g = scene.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0xffffff, 0.35).fillCircle(16, 16, 15).fillStyle(0xffffff, 1).fillCircle(16, 16, 8);
    g.generateTexture('bm_spark', 32, 32);
    g.destroy();
  }
  if (!scene.textures.exists('bm_flash')) {
    const g = scene.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0xffffff, 1).fillRoundedRect(0, 0, 128, 74, 14);
    g.generateTexture('bm_flash', 128, 74);
    g.destroy();
  }
  if (!scene.textures.exists('bm_ring')) {
    const g = scene.make.graphics({ x: 0, y: 0 }, false);
    g.lineStyle(8, 0xffffff, 1).strokeCircle(64, 64, 56);
    g.generateTexture('bm_ring', 128, 128);
    g.destroy();
  }
}

export class BoxMomentFx {
  readonly streak = new ChimeStreak();
  private active = new Map<number, Rig>();
  private free: Rig[] = [];

  constructor(private host: BoxMomentHost) {
    ensureBoxFxTextures(host.scene);
  }

  /** True while `slot` is showing its moment: the scene's own drawUi skips that box (the moment paints the incoming one). */
  isActive(slot: number) {
    return this.active.has(slot);
  }

  /** A rejected tap: the next chime starts low again. */
  mistake() {
    this.streak.mistake();
  }

  /** The scene redrew while `slot` is mid-moment: bring the incoming box up to date (a screw may have landed in it). */
  refresh(slot: number) {
    const rig = this.active.get(slot);
    if (!rig) return;
    rig.newC.removeAll(true);
    const b = this.host.boxAt(slot);
    if (b) this.host.buildBox(rig.newC, b.color, b.n);
  }

  private makeRig(): Rig {
    const s = this.host.scene;
    const d = LAYERS.fx;
    return {
      oldC: s.add.container(0, 0).setDepth(d).setVisible(false),
      newC: s.add.container(0, 0).setDepth(d).setVisible(false),
      lid: s.add.graphics().setVisible(false),
      flash: s.add.image(0, 0, 'bm_flash').setAlpha(0).setVisible(false),
      ring: s.add.image(0, 0, 'bm_ring').setDepth(d + 1).setBlendMode(Phaser.BlendModes.ADD).setVisible(false),
      sparks: Array.from({ length: SPARKS }, () => s.add.image(0, 0, 'bm_spark').setDepth(d + 1).setVisible(false)),
      stamp: s.add.text(0, 0, '✓', { fontFamily: 'Lilita One, Arial Black', fontSize: '110px', color: '#5fe05a', stroke: '#2b1d2e', strokeThickness: 14 }).setOrigin(0.5).setDepth(d + 2).setVisible(false),
      plus: s.add.text(0, 0, '+1 BOXES', { fontFamily: 'Lilita One, Arial Black', fontSize: '30px', color: '#8ef08a', stroke: '#2b1d2e', strokeThickness: 8 }).setOrigin(0.5).setDepth(d + 2).setVisible(false),
    };
  }

  /** The box in `slot` (colour index `color`) just got its last screw: shut it, latch it, slide it off, slide the next one in. */
  play(slot: number, color: number) {
    const host = this.host;
    const scene = host.scene;
    const rm = prefersReducedMotion();
    this.active.get(slot) && this.finish(slot);
    const rig = this.free.pop() ?? this.makeRig();
    this.active.set(slot, rig);
    const { x, y } = host.pos(slot);
    const col = host.tint(color);
    const { w, h } = host.size;
    const chimeStep = this.streak.box();
    // the finished box with its three screws, the lid (hinged along the top of the wells) and the flash, all in one container
    rig.oldC.remove([rig.lid, rig.flash], false);
    rig.oldC.removeAll(true);
    host.buildBox(rig.oldC, color, 3);
    const hy = -h * 0.2, lh = h * 0.62, lw = w * 0.9;
    rig.lid.clear().setPosition(0, hy).setScale(1, 0).setVisible(true);
    rig.lid.fillStyle(INK, 1).fillRoundedRect(-lw / 2 - 4, -4, lw + 8, lh + 8, 14);
    rig.lid.fillStyle(shade(col, 0.1), 1).fillRoundedRect(-lw / 2, 0, lw, lh, 11);
    rig.lid.fillStyle(0xffffff, 0.3).fillRoundedRect(-lw / 2 + 8, 6, lw - 16, 10, 5);
    for (const lx of [-lw * 0.28, lw * 0.28]) rig.lid.fillStyle(INK, 1).fillRoundedRect(lx - 14, lh - 18, 28, 30, 6).fillStyle(BRASS, 1).fillRoundedRect(lx - 10, lh - 14, 20, 22, 4);
    rig.lid.fillStyle(BRASS, 1).fillCircle(-lw / 2 + 12, 12, 7).fillCircle(lw / 2 - 12, 12, 7);
    rig.flash.setDisplaySize(w, h).setAlpha(0).setVisible(true);
    rig.oldC.add([rig.lid, rig.flash]);
    rig.oldC.setPosition(x, y).setAlpha(1).setScale(1).setVisible(true);
    // the incoming box starts off to the right
    rig.newC.removeAll(true);
    const nb = host.boxAt(slot);
    if (nb) host.buildBox(rig.newC, nb.color, nb.n);
    rig.newC.setPosition(x, y).setAlpha(0).setVisible(true);
    rig.stamp.setPosition(x, y - 6).setVisible(false);
    rig.plus.setVisible(false);
    for (const sp of rig.sparks) sp.setTint(lighten(col)).setVisible(false);
    rig.ring.setTint(lighten(col)).setVisible(false);

    const mom = new BoxMoment(rm);
    const run = (cues: MomentCue[]) => {
      for (const c of cues) {
        if (c === 'thud') sfx.boxThud();
        else if (c === 'clack') {
          sfx.boxClack();
          if (!rm) shakeCamera(scene.cameras.main, 'boxLatch');
        } else if (c === 'counter') this.popCounter(rig, rm);
        else if (c === 'chime') sfx.boxChime(chimeStep);
        else if (c === 'done') this.finish(slot);
      }
    };
    run(mom.start());
    const total = mom.times.total + 16;
    scene.tweens.addCounter({
      from: 0,
      to: total,
      duration: total,
      onUpdate: (tw) => {
        if (this.active.get(slot) !== rig) return;
        run(mom.seek(tw.getValue() ?? 0));
        if (this.active.get(slot) === rig) this.apply(rig, mom, x, y, rm);
      },
      onComplete: () => this.active.get(slot) === rig && this.finish(slot),
    });
    this.apply(rig, mom, x, y, rm);
  }

  private popCounter(rig: Rig, rm: boolean) {
    const at = this.host.counterAt();
    rig.plus.setPosition(at.x, at.y - 30).setAlpha(1).setScale(rm ? 1 : 0.5).setVisible(true);
    const tw = this.host.scene.tweens;
    if (rm) tw.add({ targets: rig.plus, alpha: 0, delay: 320, duration: 160 });
    else tw.chain({ targets: rig.plus, tweens: [{ scale: 1.2, duration: 110, ease: 'Back.Out' }, { scale: 1, y: at.y - 62, alpha: 0, duration: 360, ease: 'Quad.Out' }] });
  }

  /** Put every display object at its pose for this moment of the animation (transforms only). */
  private apply(rig: Rig, mom: BoxMoment, x: number, y: number, rm: boolean) {
    const p = mom.pose;
    rig.lid.setScale(1, p.lid);
    rig.flash.setAlpha(p.flash);
    rig.oldC.setPosition(x + p.oldX, y).setAlpha(p.oldAlpha).setScale(1 + 0.07 * p.bump);
    rig.newC.setPosition(x + p.newX, y).setAlpha(p.newAlpha);
    rig.stamp.setVisible(p.stamp !== null);
    if (p.stamp !== null) rig.stamp.setPosition(x + p.oldX, y - 6).setScale(rm ? 1 : 0.6 + 0.55 * Math.min(1, (p.stamp * STAMP_MS) / 90)).setAlpha(p.stamp > 0.8 ? 1 - (p.stamp - 0.8) * 5 : 1);
    rig.ring.setVisible(p.ring !== null);
    if (p.ring !== null) rig.ring.setPosition(x, y).setScale(0.6 + 1.9 * easeOutQuad(p.ring)).setAlpha(0.9 * (1 - p.ring));
    for (let i = 0; i < rig.sparks.length; i++) {
      const sp = rig.sparks[i];
      sp.setVisible(p.sparks !== null);
      if (p.sparks === null) continue;
      const a = (i / rig.sparks.length) * Math.PI * 2 + (i % 2 ? 0.25 : 0);
      const r = (62 + (i % 3) * 14) * easeOutQuad(p.sparks);
      sp.setPosition(x + Math.cos(a) * r, y + Math.sin(a) * r * 0.8).setScale(0.9 * (1 - p.sparks) + 0.12).setAlpha(1 - p.sparks * p.sparks);
    }
  }

  private finish(slot: number) {
    const rig = this.active.get(slot);
    if (!rig) return;
    this.active.delete(slot);
    rig.oldC.setVisible(false);
    rig.newC.setVisible(false);
    rig.lid.setVisible(false);
    rig.flash.setVisible(false);
    rig.ring.setVisible(false);
    rig.stamp.setVisible(false);
    for (const sp of rig.sparks) sp.setVisible(false);
    this.free.push(rig);
    this.host.redraw();
  }
}

