// Sandwich merge feel (t-1e79e325, TUNING.mergeRule): a PREVIEW while a part hovers a sandwich landing, and an IMPACT moment
// for the 'sandwich' event. Presentation only: the model decides (core/sandwich.ts planSandwich via sandwichFor), the absorbed
// parts' sprites already slide into the merge cell through GameScene.reconcile. Everything here is pooled / baked: two
// outline+arrow containers, one badge, a ring image pool and a spark pool; no Graphics is redrawn per frame.
import Phaser from 'phaser';
import type { GameEvent } from '../core/game';
import { sandwichBadge, type SandwichPlan } from '../core/sandwich';
import { CELL, REDUCED_MOTION, RS, W, bakeTexture, pooledText, releaseText } from './sceneKit';
import { haptic, sfx } from './audio';

type SandwichEvent = Extract<GameEvent, { type: 'sandwich' }>;
type XY = (idx: number) => { x: number; y: number };
const GOLD = 0xffcf33;
/** Hit-stop length (ms): board tweens crawl for this long, then everything lands at once. The model clock never stops. */
export const HIT_STOP_MS = 160;
const SPARKS = 10;

const TEX = { outline: 'sw_outline', arrow: 'sw_arrow', ring: 'sw_ring', plate: 'sw_plate' } as const;
function bakeAll(scene: Phaser.Scene) {
  bakeTexture(scene, TEX.outline, CELL, CELL, (g) => g.lineStyle(9, 0xffffff, 1).strokeRoundedRect(8, 8, CELL - 16, CELL - 16, 20));
  bakeTexture(scene, TEX.arrow, 44, 44, (g) => g.fillStyle(0xffffff, 1).fillTriangle(6, 4, 40, 22, 6, 40).lineStyle(4, 0x3b2533, 1).strokeTriangle(6, 4, 40, 22, 6, 40));
  bakeTexture(scene, TEX.ring, 200, 200, (g) => g.lineStyle(14, 0xffffff, 1).strokeCircle(100, 100, 90));
  bakeTexture(scene, TEX.plate, 340, 60, (g) => g.fillStyle(0x3b2533, 0.92).fillRoundedRect(2, 2, 336, 56, 28).lineStyle(4, GOLD, 1).strokeRoundedRect(2, 2, 336, 56, 28));
}

/** Free-list of Images by texture so an impact never allocates after its first use. */
const imgPools = new WeakMap<Phaser.Scene, Phaser.GameObjects.Image[]>();
function takeImage(scene: Phaser.Scene, tex: string): Phaser.GameObjects.Image {
  const list = imgPools.get(scene) ?? [];
  imgPools.set(scene, list);
  const i = list.findIndex((m) => m.texture.key === tex);
  const img = i >= 0 ? list.splice(i, 1)[0] : scene.add.image(0, 0, tex);
  return img.setVisible(true).setActive(true).setAlpha(1).setScale(1).setAngle(0).setTint(0xffffff);
}
function giveImage(scene: Phaser.Scene, img: Phaser.GameObjects.Image) {
  img.setVisible(false).setActive(false);
  imgPools.get(scene)?.push(img);
}

/** The promise while dragging: both side parts pulse with arrows into the target, a badge, a soft rising tone. */
export class SandwichPreview {
  private sides: Phaser.GameObjects.Container[] = [];
  private arrows: Phaser.GameObjects.Image[] = [];
  private badge?: Phaser.GameObjects.Container;
  private badgeText?: Phaser.GameObjects.Text;
  private key = '';
  constructor(private scene: Phaser.Scene, private cellXY: XY) {}

  private build() {
    const sc = this.scene;
    bakeAll(sc);
    for (let i = 0; i < 2; i++) {
      const outline = sc.add.image(0, 0, TEX.outline).setScale(1 / RS).setTint(GOLD);
      const arrow = sc.add.image(CELL / 2 - 6, 0, TEX.arrow).setScale(1 / RS).setTint(0xffffff);
      this.arrows.push(arrow);
      this.sides.push(sc.add.container(0, 0, [outline, arrow]).setDepth(54).setVisible(false));
    }
    const plate = sc.add.image(0, 0, TEX.plate).setScale(1 / RS);
    this.badgeText = sc.add.text(0, 0, '', { fontFamily: 'Lilita One, Arial Black', fontSize: '32px', color: '#ffcf33' }).setOrigin(0.5);
    this.badge = sc.add.container(0, 0, [plate, this.badgeText]).setDepth(63).setVisible(false);
  }

  /** Call every frame the drag hovers; cheap (keyed). `plan` null / `to` < 0 = no sandwich here. */
  show(plan: SandwichPlan | null, to: number) {
    const key = plan && to >= 0 ? `${to}:${plan.cells.join(',')}:${plan.plus}:${plan.bonus}` : '';
    if (key === this.key) return;
    this.key = key;
    if (!this.badge) {
      if (!key) return;
      this.build();
    }
    const sc = this.scene;
    sc.tweens.killTweensOf([...this.sides, ...this.arrows, this.badge!]);
    if (!plan || !key) {
      for (const s of this.sides) s.setVisible(false);
      this.badge!.setVisible(false);
      return;
    }
    const t = this.cellXY(to);
    plan.cells.forEach((cell, i) => {
      const p = this.cellXY(cell);
      this.sides[i].setPosition(p.x, p.y).setRotation(Math.atan2(t.y - p.y, t.x - p.x)).setVisible(true).setAlpha(1);
      this.arrows[i].x = CELL / 2 - 6;
      if (!REDUCED_MOTION) {
        sc.tweens.add({ targets: this.sides[i], alpha: 0.45, duration: 280, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
        sc.tweens.add({ targets: this.arrows[i], x: CELL / 2 + 8, duration: 240, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
      }
    });
    this.badgeText!.setText(sandwichBadge(plan));
    const bx = Phaser.Math.Clamp(t.x, 170 + 8, W - 170 - 8);
    this.badge!.setPosition(bx, t.y - CELL / 2 + 14).setVisible(true).setAlpha(1).setScale(REDUCED_MOTION ? 1 : 0.7);
    if (!REDUCED_MOTION) sc.tweens.add({ targets: this.badge, scale: 1, duration: 140, ease: 'Back.Out' });
    sfx.sandwichPromise();
  }

  hide() {
    this.show(null, -1);
  }
}

/** What GameScene lends the impact: its chain-style banner, the SCREEN SHAKE setting, the merged part's view, a one-time tip. */
export interface SandwichHost {
  banner(text: string, x: number, y: number): void;
  shake(): void;
  view(id: number): Phaser.GameObjects.Container | undefined;
  tip(x: number, y: number): void;
}

let stopToken = 0;
/** Board tweens crawl for `ms`, then resume. Only tweens: the model tick, the clock and the input queue are untouched, so no time is lost. */
function hitStop(scene: Phaser.Scene, ms: number) {
  const mine = ++stopToken;
  scene.tweens.timeScale = 0.04;
  scene.time.delayedCall(ms, () => {
    if (mine === stopToken) scene.tweens.timeScale = 1;
  });
}

export function playSandwich(scene: Phaser.Scene, e: SandwichEvent, cellXY: XY, host: SandwichHost, newPartId?: number) {
  bakeAll(scene);
  const to = cellXY(e.idx);
  const wait = REDUCED_MOTION ? 0 : HIT_STOP_MS;
  if (wait) hitStop(scene, wait);
  // frozen frame: a white flash over the three cells (baked outline tinted white, no Graphics)
  const flashes = [e.idx, ...e.cells].map((c) => {
    const p = cellXY(c);
    return takeImage(scene, TEX.outline).setPosition(p.x, p.y).setScale(1 / RS).setDepth(58).setTint(c === e.idx ? 0xffffff : GOLD);
  });
  scene.time.delayedCall(wait, () => {
    for (const f of flashes) scene.tweens.add({ targets: f, alpha: 0, duration: 260, onComplete: () => giveImage(scene, f) });
    sfx.sandwich(e.rank);
    haptic(40);
    if (!REDUCED_MOTION) host.shake();
    // ring burst + sparks, from pools
    const ring = takeImage(scene, TEX.ring).setPosition(to.x, to.y).setDepth(57).setTint(GOLD);
    ring.setScale((REDUCED_MOTION ? 0.9 : 0.4) / RS);
    scene.tweens.add({ targets: ring, scale: (REDUCED_MOTION ? 0.9 : 1.5) / RS, alpha: 0, duration: 380, ease: 'Quad.Out', onComplete: () => giveImage(scene, ring) });
    if (!REDUCED_MOTION) {
      for (let i = 0; i < SPARKS; i++) {
        const a = (i / SPARKS) * Math.PI * 2 + Math.random() * 0.4;
        const d = 70 + Math.random() * 40;
        const sp = takeImage(scene, 'dot').setPosition(to.x, to.y).setDepth(59).setTint(i % 2 ? 0xffffff : GOLD).setScale(0.5 + Math.random() * 0.4);
        scene.tweens.add({ targets: sp, x: to.x + Math.cos(a) * d, y: to.y + Math.sin(a) * d, alpha: 0, scale: 0.1, duration: 360, ease: 'Quad.Out', onComplete: () => giveImage(scene, sp) });
      }
      // the merged part squashes, then settles
      const v = newPartId !== undefined ? host.view(newPartId) : undefined;
      if (v) {
        const sx = v.scaleX, sy = v.scaleY;
        scene.tweens.add({ targets: v, scaleX: sx * 1.28, scaleY: sy * 0.78, duration: 70, yoyo: true, ease: 'Quad.Out', onComplete: () => v.setScale(sx, sy) });
      }
    }
    // the new rank number pops large at the target
    const num = pooledText(scene, to.x, to.y, `${e.rank}`, { fontFamily: 'Lilita One, Arial Black', fontSize: '120px', color: '#ffffff', stroke: '#3b2533', strokeThickness: 14, align: 'center' }).setOrigin(0.5).setDepth(60);
    if (REDUCED_MOTION) {
      scene.tweens.add({ targets: num, alpha: 0, delay: 350, duration: 200, onComplete: () => releaseText(scene, num) });
    } else {
      num.setScale(0.3);
      scene.tweens.add({ targets: num, scale: 1.1, duration: 150, ease: 'Back.Out' });
      scene.tweens.add({ targets: num, y: to.y - 40, alpha: 0, delay: 330, duration: 260, ease: 'Quad.In', onComplete: () => releaseText(scene, num) });
    }
    host.banner(e.od > 0 ? `SANDWICH!  +${e.plus}  ·  +${e.od} OVERDRIVE` : `SANDWICH!  +${e.plus}`, to.x, to.y - CELL * 0.8);
    host.tip(to.x, to.y + CELL * 1.05);
  });
}

/** The one-time tip's words. */
export const SANDWICH_TIP = 'Two partners on both sides? They merge into a +2!';
