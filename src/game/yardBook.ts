// SCREW YARD BOOK, Phaser side (TUNING.yardBook): the live TAPS n/N + 3 star pips, the unit crate on the HUD that the box
// tokens fly into (+N CARDS fills as boxes complete), the crate pop + card flip at the end, and the 3-tile Collection
// Book screen. The rules are in src/core/yardBook.ts; nothing here holds game state beyond what is on screen.
import Phaser from 'phaser';
import { BOOK_ORDER, bestStars, bookStars, budgetOf, crateCount, isUnlocked, lockedText, playable, readBook, recordStars, type BookUnit } from '../core/yardBook';
import { TAKEN_APART_CARDS, THREE_STAR_MULT, UNIT_NAMES, yardObjectOf, pickedUnit, pickUnit } from '../content/yardObjects';
import { SCREW_COLORS } from './ScrewScene';
import { unitTex } from './unitArt';
import { sfx } from './audio';
import { H, REDUCED_MOTION, W } from './sceneKit';
import { store, type Meta } from './meta';
import { META_KEY } from '../platform/backup';
import type { ObjectYardResult, ObjectYardScene } from './ObjectYardScene';
import type { GameScene } from './GameScene';

const FONT = 'Lilita One, Arial Black';
const INK = 0x2b1d2e;
const GOLD = '#ffcf33';
const GREY = '#6a5a6a';
const CRATE_X = W - 62;
const CRATE_Y = 336;
const D = 46;

/** The object to play with the Book on: the picked / daily one, moved back along the chain to the last open object. */
export const bookObject = (meta: Meta) => yardObjectOf(playable(readBook(meta.yardBook), pickedUnit()));

/** A finished object: keep its best stars in the save (meta.yardBook). */
export function bookResult(meta: Meta, r: ObjectYardResult) {
  if (!r.won || !r.reward || !r.stars) return;
  const rec = readBook(meta.yardBook);
  recordStars(rec, r.reward.unit, r.stars);
  meta.yardBook = rec;
  store(META_KEY, JSON.stringify(meta));
}

const lighten = (c: number, t: number) => {
  const k = Phaser.Display.Color.IntegerToColor(c);
  return Phaser.Display.Color.GetColor(k.red + (255 - k.red) * t, k.green + (255 - k.green) * t, k.blue + (255 - k.blue) * t);
};

/** A small wooden crate with a brass band and a plate stamped with the unit name, centred on the container's origin. */
function crateBody(scene: Phaser.Scene, name: string, w = 92): Phaser.GameObjects.Container {
  const c = scene.add.container(0, 0);
  const h = w * 0.78;
  if (scene.textures.exists('crate_toolbox')) {
    const im = scene.add.image(0, 0, 'crate_toolbox');
    im.setScale(w / Math.max(im.width, im.height));
    c.add(im);
  } else {
    const g = scene.add.graphics();
    g.fillStyle(INK, 1).fillRoundedRect(-w / 2 - 4, -h / 2 - 4, w + 8, h + 8, 14);
    g.fillStyle(0xb47838, 1).fillRoundedRect(-w / 2, -h / 2, w, h, 11);
    g.fillStyle(0xd9a05a, 1).fillRoundedRect(-w / 2 + 4, -h / 2 + 4, w - 8, h * 0.28, 7);
    g.fillStyle(0xd9a53a, 1).fillRect(-w / 2, -h * 0.02, w, h * 0.14);
    g.lineStyle(3, INK, 0.5).lineBetween(-w / 2 + 6, h * 0.3, w / 2 - 6, h * 0.3);
    c.add(g);
  }
  const plate = scene.add.graphics().fillStyle(0xfff0cf, 1).fillRoundedRect(-w * 0.4, h * 0.02, w * 0.8, h * 0.3, 6).lineStyle(2, INK, 0.9).strokeRoundedRect(-w * 0.4, h * 0.02, w * 0.8, h * 0.3, 6);
  c.add(plate);
  c.add(scene.add.text(0, h * 0.17, name, { fontFamily: FONT, fontSize: '15px', color: '#3b2533' }).setOrigin(0.5));
  return c;
}

/** The live book HUD inside the object yard: TAPS n/N, 3 pips, the crate with +N CARDS, box tokens and the end reveal. */
export class YardBookHud {
  taps = 0;
  readonly budget: number;
  readonly unit: BookUnit;
  readonly base: number;
  readonly total: number;
  done = 0;
  landed = 0;
  flying = 0;
  private tapTxt: Phaser.GameObjects.Text;
  private pips: Phaser.GameObjects.Text[] = [];
  private crate: Phaser.GameObjects.Container;
  private cardTxt: Phaser.GameObjects.Text;
  private shown = 3;
  private pieces: Phaser.GameObjects.GameObject[] = [];

  constructor(private sc: ObjectYardScene) {
    const lvl = sc.st.lvl;
    this.unit = lvl.id as BookUnit;
    this.budget = budgetOf(lvl);
    this.base = TAKEN_APART_CARDS[this.unit];
    this.total = lvl.queue.length;
    this.tapTxt = sc.add.text(W / 2 - 70, 114, '', { fontFamily: FONT, fontSize: '26px', color: '#fff0cf', backgroundColor: '#2b1d2e', padding: { x: 12, y: 2 } }).setOrigin(0.5).setDepth(D);
    for (let i = 0; i < 3; i++) this.pips.push(sc.add.text(W / 2 + 56 + i * 40, 114, '★', { fontFamily: 'Arial', fontStyle: 'bold', fontSize: '38px', color: GOLD, stroke: '#2b1d2e', strokeThickness: 5 }).setOrigin(0.5).setDepth(D));
    this.crate = crateBody(sc, UNIT_NAMES[this.unit]).setPosition(CRATE_X, CRATE_Y).setDepth(D);
    this.cardTxt = sc.add.text(CRATE_X, CRATE_Y + 66, '', { fontFamily: FONT, fontSize: '22px', color: '#fff0cf', backgroundColor: '#2b1d2e', padding: { x: 8, y: 2 } }).setOrigin(0.5).setDepth(D);
    this.pieces.push(this.tapTxt, ...this.pips, this.crate, this.cardTxt);
    this.refresh();
  }

  /** Stars if the object were cleared right now (only ever goes down). */
  stars = () => bookStars(this.taps, this.budget, this.sc.st.peak);
  /** The counter on the crate: boxes landed so far, doubled while 3 stars are still possible. */
  cards = () => crateCount(this.base, this.landed, this.total, this.stars() >= 3);

  /** One screw tap counted (a wasted tap on a blocked / turned-away screw too, like the pressure budget). */
  tap() {
    this.taps++;
    this.refresh();
  }

  refresh() {
    const over = this.taps > this.budget;
    this.tapTxt.setText(`TAPS ${this.taps}/${this.budget}`).setColor(over ? '#ff6a4a' : this.taps >= this.budget * 0.85 ? '#ffc04a' : '#fff0cf');
    const s = this.stars();
    this.pips.forEach((p, i) => {
      const on = i < s;
      p.setColor(on ? GOLD : GREY);
      if (!on && i < this.shown && !REDUCED_MOTION) this.sc.tweens.add({ targets: p, scale: { from: 1.5, to: 1 }, angle: { from: -25, to: 0 }, duration: 260, ease: 'Back.Out' });
    });
    this.shown = s;
    this.cardTxt.setText(`+${this.cards()} CARDS`).setColor(s >= 3 ? GOLD : '#fff0cf');
  }

  /** A box finished: after its stamp moment a unit-coloured token flies from the box into the crate, and the counter fills. */
  boxDone(slot: number, color: number) {
    const sc = this.sc;
    this.done++;
    this.flying++;
    const col = SCREW_COLORS[color];
    const tok = sc.add.container(sc.boxX(slot), sc.boxY).setDepth(D + 10).setScale(0);
    tok.add(sc.add.graphics().fillStyle(INK, 1).fillCircle(0, 0, 26).fillStyle(col, 1).fillCircle(0, 0, 21).fillStyle(lighten(col, 0.5), 1).fillEllipse(-7, -9, 16, 8));
    tok.add(sc.add.text(0, 1, UNIT_NAMES[this.unit].charAt(0), { fontFamily: FONT, fontSize: '24px', color: '#ffffff', stroke: '#2b1d2e', strokeThickness: 4 }).setOrigin(0.5));
    sc.tweens.chain({
      targets: tok,
      delay: 450,
      tweens: [
        { scale: 1.2, duration: 140, ease: 'Back.Out' },
        { x: CRATE_X, y: CRATE_Y - 6, scale: 0.6, duration: 480, ease: 'Cubic.In' },
      ],
      onComplete: () => {
        tok.destroy();
        this.flying--;
        this.landed++;
        sfx.star(Math.min(3, this.landed));
        this.refresh();
        if (!REDUCED_MOTION) {
          sc.tweens.add({ targets: this.crate, scale: { from: 1.22, to: 1 }, duration: 200, ease: 'Back.Out' });
          sc.tweens.add({ targets: this.cardTxt, scale: { from: 1.25, to: 1 }, duration: 200, ease: 'Back.Out' });
        }
        this.sparkle(CRATE_X, CRATE_Y - 6, col);
      },
    });
  }

  private sparkle(x: number, y: number, tint: number) {
    const sc = this.sc;
    if (REDUCED_MOTION || !sc.textures.exists('oy_spark')) return;
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      const im = sc.add.image(x, y, 'oy_spark').setDepth(D + 11).setScale(0.3).setTint(tint).setBlendMode(Phaser.BlendModes.ADD);
      sc.tweens.add({ targets: im, x: x + Math.cos(a) * 40, y: y + Math.sin(a) * 40, scale: 0, alpha: 0, duration: 340, ease: 'Quad.Out', onComplete: () => im.destroy() });
    }
  }

  /** The crate pops and the cards flip out (once the last token has landed). Returns the milliseconds it will take. */
  reveal(stars: number, count: number): number {
    const sc = this.sc;
    const wait = this.flying ? 1100 : 250;
    const cx = W / 2, cy = sc.cy - 150;
    const show = Math.min(count, 5);
    const run = () => {
      if (!sc.scene.isActive()) return;
      this.landed = this.total;
      this.cardTxt.setText(`+${count} CARDS`);
      sfx.chestShake(1);
      sc.tweens.chain({
        targets: this.crate,
        tweens: [
          { x: cx, y: cy, scale: 2.4, duration: 380, ease: 'Cubic.Out' },
          ...(REDUCED_MOTION ? [] : [{ angle: -7, duration: 70 }, { angle: 7, duration: 110 }, { angle: -5, duration: 90 }, { angle: 0, duration: 70 }]),
        ],
        onComplete: () => {
          sfx.chestOpen();
          const flash = sc.add.circle(cx, cy, 30, 0xffffff, 0.9).setDepth(D + 12);
          sc.tweens.add({ targets: flash, scale: 7, alpha: 0, duration: 380, ease: 'Quad.Out', onComplete: () => flash.destroy() });
          sc.tweens.add({ targets: this.crate, scale: 3.2, alpha: 0, duration: 260, ease: 'Quad.Out' });
          this.cardTxt.setPosition(cx, cy + 170).setScale(1.4).setDepth(D + 14);
          this.cardTxt.setFontSize('34px').setText(`+${count} ${UNIT_NAMES[this.unit]} CARDS${stars >= 3 ? '  x' + THREE_STAR_MULT : ''}`);
          const key = unitTex(sc, `${this.unit}_1`);
          for (let i = 0; i < show; i++) {
            const tx = cx + (i - (show - 1) / 2) * 118, ty = cy + 20 + Math.abs(i - (show - 1) / 2) * 14;
            const card = sc.add.container(cx, cy).setDepth(D + 13).setScale(0, 0.2);
            card.add(sc.add.graphics().fillStyle(INK, 1).fillRoundedRect(-48, -62, 96, 124, 14).fillStyle(0xf3d9a4, 1).fillRoundedRect(-43, -57, 86, 114, 11));
            if (sc.textures.exists(key)) {
              const im = sc.add.image(0, -4, key);
              im.setScale(70 / Math.max(im.width, im.height));
              card.add(im);
            }
            this.pieces.push(card);
            sc.tweens.add({ targets: card, x: tx, y: ty, scaleX: 1, scaleY: 1, angle: (i - (show - 1) / 2) * 6, duration: 420, delay: 140 + i * 130, ease: 'Back.Out', onStart: () => sfx.star(Math.min(3, i + 1)) });
          }
        },
      });
    };
    sc.time.delayedCall(wait, run);
    return wait + 380 + (REDUCED_MOTION ? 0 : 340) + 140 + show * 130 + 420 + 350;
  }

  /** Remove the reveal pieces (the result panel takes over). */
  clear() {
    for (const o of this.pieces) o.destroy();
    this.pieces = [];
  }
}

// ---- the Collection Book: three tiles, Cannon then Coil then Bell ----
export function openYardBook(scene: GameScene) {
  scene.closeModal();
  const PH = 1100;
  const c = scene.sheet(PH);
  const top = H / 2 - PH / 2;
  const rec = readBook(scene.meta.yardBook);
  const total = BOOK_ORDER.reduce((a, u) => a + bestStars(rec, u), 0);
  scene.sheetTitle(c, top, 'COLLECTION BOOK', `Take each object apart.  ★ ${total}/${BOOK_ORDER.length * 3}`);
  BOOK_ORDER.forEach((u, i) => {
    const cy = top + 330 + i * 235, cx = W / 2, tw = W - 150, th = 205;
    const open = isUnlocked(rec, u);
    const best = bestStars(rec, u);
    const g = scene.add.graphics();
    g.fillStyle(INK, 1).fillRoundedRect(cx - tw / 2 - 5, cy - th / 2 - 5, tw + 10, th + 10, 28);
    g.fillStyle(open ? (best ? 0xffe9a8 : 0xfbe7c6) : 0xb9ab95, 1).fillRoundedRect(cx - tw / 2, cy - th / 2, tw, th, 24);
    c.add(g);
    const key = unitTex(scene, `${u}_1`);
    if (scene.textures.exists(key)) {
      const im = scene.add.image(cx - tw / 2 + 95, cy - 6, key);
      im.setScale(130 / Math.max(im.width, im.height));
      if (!open) im.setTint(INK).setAlpha(0.45);
      c.add(im);
    }
    const tx = cx + 60;
    c.add(scene.add.text(tx, cy - 62, UNIT_NAMES[u], { fontFamily: FONT, fontSize: '40px', color: open ? '#3b2533' : '#6a5a6a' }).setOrigin(0.5));
    if (open) {
      c.add(scene.add.text(tx, cy - 6, '★'.repeat(best) + '☆'.repeat(3 - best), { fontFamily: 'Arial', fontStyle: 'bold', fontSize: '46px', color: best ? '#e0a000' : '#8a7a6a' }).setOrigin(0.5));
      c.add(scene.add.text(tx, cy + 50, `${TAKEN_APART_CARDS[u]} cards  ·  ${TAKEN_APART_CARDS[u] * THREE_STAR_MULT} at 3★`, { fontFamily: 'Arial', fontStyle: 'bold', fontSize: '22px', color: '#7a5a4a' }).setOrigin(0.5));
      const hit = scene.add.zone(cx, cy, tw, th).setInteractive({ useHandCursor: true });
      hit.on('pointerup', () => {
        sfx.click();
        pickUnit(u);
        scene.startYard();
      });
      c.add(hit);
    } else {
      // a drawn padlock: body, shackle, keyhole
      const lg = scene.add.graphics();
      const lx = tx, ly = cy - 4;
      lg.lineStyle(10, INK, 1).beginPath().arc(lx, ly - 8, 17, Math.PI, 0, false).strokePath();
      lg.fillStyle(INK, 1).fillRoundedRect(lx - 30, ly - 8, 60, 46, 9).fillStyle(0xd9a53a, 1).fillRoundedRect(lx - 25, ly - 3, 50, 36, 6).fillStyle(INK, 1).fillCircle(lx, ly + 11, 6).fillRect(lx - 2.5, ly + 11, 5, 12);
      c.add(lg);
      c.add(scene.add.text(tx, cy + 58, lockedText(u), { fontFamily: FONT, fontSize: '26px', color: '#5a3a3a' }).setOrigin(0.5));
    }
  });
  scene.button(c, W / 2, top + PH - 70, 260, 'BACK', 0x8a6a4a, () => scene.openYardEvent(), 0.75);
}
