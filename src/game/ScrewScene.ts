// SCREW YARD scene (r36): the outside-core weekly mini-game. The model is src/core/screw.ts; this scene only draws it.
// Launched by GameScene (which sleeps meanwhile) with { n, seed, onEnd }; calls onEnd(won) and stops itself.
import Phaser from 'phaser';
import { BOX_SIZE, generateYard, newYard, OPEN_BOXES, removable, tapScrew, TRAY_CAP, YARD_H, YARD_W, type YardState } from '../core/screw';
import { H, RS, W } from './GameScene';
import { sfx } from './audio';

export const SCREW_COLORS = [0xe8452c, 0x27a4c0, 0xf2c12e, 0x5fbf4a, 0x8e58c9, 0xff8a1f];
const PLATE_TINTS = [0x9aa4ad, 0xb08d57, 0x7d8a96, 0xa86b45, 0x6f8f8a, 0xc0b49a];
const INK = 0x2b1d2e;

export interface YardData {
  n: number;
  seed: number;
  onEnd: (won: boolean) => void;
}

export class ScrewScene extends Phaser.Scene {
  st!: YardState;
  data0!: YardData;
  yard!: Phaser.GameObjects.Container;
  plateViews = new Map<number, Phaser.GameObjects.Container>();
  screwViews = new Map<number, Phaser.GameObjects.Container>();
  ui!: Phaser.GameObjects.Container;
  scale0 = 1;
  cy = 0;
  busy = 0;
  ended = false;
  tipText: Phaser.GameObjects.Text | null = null;

  constructor() {
    super('yard');
  }

  init(d: YardData) {
    this.data0 = d;
    this.ended = false;
    this.busy = 0;
    this.plateViews.clear();
    this.screwViews.clear();
  }

  create() {
    this.cameras.main.setOrigin(0, 0).setZoom(RS);
    const addText = this.add.text.bind(this.add);
    (this.add as unknown as { text: typeof addText }).text = (x, y, txt, style = {}) => addText(x, y, txt, { resolution: RS, ...style });
    this.st = newYard(generateYard(this.data0.n, this.data0.seed));
    // backdrop: the workshop floor
    if (this.textures.exists('bg')) {
      const bg = this.add.image(W / 2, H / 2, 'bg');
      bg.setScale(Math.max(W / bg.width, H / bg.height)).setTint(0xd8c8b0);
    } else this.add.rectangle(W / 2, H / 2, W, H, 0xe8cfa6);
    // header
    this.add.graphics().fillStyle(INK, 0.9).fillRoundedRect(16, 18, W - 32, 76, 24);
    this.add.text(W / 2, 56, `SCREW YARD  ·  ${this.data0.n}`, { fontFamily: 'Lilita One, Arial Black', fontSize: '38px', color: '#ffcf33' }).setOrigin(0.5);
    const back = this.add.text(56, 56, '✕', { fontFamily: 'Arial', fontSize: '44px', color: '#fff0cf' }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    back.on('pointerup', () => this.finish(false, true));
    // the pile
    const top = 430;
    this.scale0 = Math.min((W - 30) / YARD_W, (H - top - 40) / YARD_H, 1.12);
    this.cy = top + (H - top) * 0.45;
    this.yard = this.add.container(W / 2, this.cy).setScale(this.scale0);
    const lvl = this.st.lvl;
    for (const p of lvl.plates.slice().sort((a, b) => a.z - b.z)) {
      const pc = this.add.container(p.x, p.y).setRotation(p.angle);
      const g = this.add.graphics();
      const tint = PLATE_TINTS[p.id % PLATE_TINTS.length];
      g.fillStyle(INK, 0.42).fillRoundedRect(-p.len / 2 + 7, -p.thick / 2 + 12, p.len, p.thick, 22);
      g.fillStyle(tint, 0.9).fillRoundedRect(-p.len / 2, -p.thick / 2, p.len, p.thick, 22);
      g.fillStyle(0xffffff, 0.22).fillRoundedRect(-p.len / 2 + 8, -p.thick / 2 + 6, p.len - 16, 12, 6);
      g.lineStyle(4, INK, 0.9).strokeRoundedRect(-p.len / 2, -p.thick / 2, p.len, p.thick, 22);
      // rivets in the corners of long bars, then the screw holes
      if (p.thick < p.len * 0.8) for (const sx of [-1, 1]) g.fillStyle(INK, 0.3).fillCircle(sx * (p.len / 2 - 70), 0, 6);
      for (const sid of p.screws) {
        const s = lvl.screws[sid];
        const dx = s.x - p.x, dy = s.y - p.y;
        const lx = dx * Math.cos(-p.angle) - dy * Math.sin(-p.angle);
        const ly = dx * Math.sin(-p.angle) + dy * Math.cos(-p.angle);
        g.fillStyle(INK, 0.55).fillCircle(lx, ly, 25);
      }
      pc.add(g);
      // r38: ChatGPT plate art (neutral steel, tinted per plate); the drawn plate above stays as its shadow + fallback
      const artKey = p.kind ? `sy_plate_${p.kind}` : '';
      if (artKey && this.textures.exists(artKey)) {
        g.clear().fillStyle(INK, 0.42).fillRoundedRect(-p.len / 2 + 7, -p.thick / 2 + 12, p.len, p.thick, Math.min(36, p.thick / 2));
        pc.add(this.add.image(0, 0, artKey).setDisplaySize(p.len, p.thick).setTint(tint));
      }
      this.yard.add(pc);
      this.plateViews.set(p.id, pc);
      for (const sid of p.screws) {
        const s = lvl.screws[sid];
        const sv = this.screwSprite(SCREW_COLORS[s.color]);
        sv.setPosition(s.x, s.y);
        this.yard.add(sv);
        this.screwViews.set(sid, sv);
      }
    }
    this.ui = this.add.container(0, 0);
    this.drawUi();
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => this.onTap(p.worldX, p.worldY));
    // first yard: one line of rules
    // first yard: a top toast that leaves after the first screw (never over the pile)
    if (this.data0.n === 1) {
      const tip = this.add.text(W / 2, this.trayY + 70, 'TAKE A SCREW NOTHING COVERS \u2192 MATCH ITS TOOLBOX', { fontFamily: 'Lilita One, Arial Black', fontSize: '24px', color: '#ffcf33', backgroundColor: '#2b1d2e', padding: { x: 14, y: 6 } }).setOrigin(0.5).setDepth(80);
      this.tipText = tip;
    }
  }

  screwSprite(color: number) {
    const c = this.add.container(0, 0);
    // r38: ChatGPT's neutral screw head, tinted per colour (drawn fallback below)
    if (this.textures.exists('sy_screw')) {
      const im = this.add.image(0, 0, 'sy_screw').setTint(color);
      im.setScale(50 / im.width);
      c.add(im);
      return c;
    }
    const g = this.add.graphics();
    g.fillStyle(INK, 1).fillCircle(0, 3, 24);
    g.fillStyle(color, 1).fillCircle(0, 0, 21);
    g.fillStyle(0xffffff, 0.35).fillCircle(-6, -7, 7);
    g.lineStyle(5, INK, 0.85).lineBetween(-10, -10, 10, 10).lineBetween(-10, 10, 10, -10);
    c.add(g);
    return c;
  }

  boxX = (slot: number) => W / 2 + (slot - (OPEN_BOXES - 1) / 2) * 300;
  boxY = 196;
  trayY = 362;
  /** r38 tray art (ChatGPT): 480 px wide, wells at 12/30/49/67/86% across. */
  static TRAY_W = 480;
  static TRAY_WELLS = [0.118, 0.303, 0.486, 0.671, 0.856];
  trayX = (i: number) => (this.textures.exists('sy_tray') ? W / 2 + (ScrewScene.TRAY_WELLS[i] - 0.5) * ScrewScene.TRAY_W : W / 2 + (i - (TRAY_CAP - 1) / 2) * 92);
  /** r38 toolbox art (ChatGPT): 250 px wide; wells at 22% / 48% / 74% across, 62% down. */
  get boxArt() {
    return this.textures.exists('sy_toolbox_open');
  }
  static BOX_W = 250;
  static WELLS = [0.217, 0.48, 0.744];
  slotX = (slot: number, k: number) => (this.boxArt ? this.boxX(slot) + (ScrewScene.WELLS[k] - 0.5) * ScrewScene.BOX_W : this.boxX(slot) + (k - 1) * 64);
  slotY = () => (this.boxArt ? this.boxY + (0.62 - 0.5) * ScrewScene.BOX_W * (209 / 360) : this.boxY - 4);

  drawUi() {
    this.ui.removeAll(true);
    const g = this.add.graphics();
    this.ui.add(g);
    this.st.boxes.forEach((b, slot) => {
      const x = this.boxX(slot);
      if (this.boxArt) {
        // ChatGPT's toolbox, tinted to its colour (an empty slot shows a dark, faded box)
        const im = this.add.image(x, this.boxY, 'sy_toolbox_open');
        im.setScale(ScrewScene.BOX_W / im.width);
        if (b) im.setTint(SCREW_COLORS[b.color]);
        else im.setTint(0x2b1d2e).setAlpha(0.35);
        this.ui.add(im);
        if (b) for (let k = 0; k < b.n; k++) this.ui.add(this.screwSprite(SCREW_COLORS[b.color]).setPosition(this.slotX(slot, k), this.slotY()).setScale(0.85));
        return;
      }
      // toolbox: handle on top, body below
      g.lineStyle(12, INK, 1).strokeRoundedRect(x - 50, this.boxY - 82, 100, 46, 14);
      g.fillStyle(INK, 1).fillRoundedRect(x - 120, this.boxY - 52, 240, 104, 22);
      if (!b) return;
      g.fillStyle(SCREW_COLORS[b.color], 1).fillRoundedRect(x - 114, this.boxY - 46, 228, 92, 18);
      g.fillStyle(0x000000, 0.18).fillRoundedRect(x - 114, this.boxY + 14, 228, 32, { tl: 0, tr: 0, bl: 18, br: 18 });
      for (let k = 0; k < BOX_SIZE; k++) {
        g.fillStyle(INK, 0.55).fillCircle(this.slotX(slot, k), this.slotY(), 25);
        if (k < b.n) this.ui.add(this.screwSprite(SCREW_COLORS[b.color]).setPosition(this.slotX(slot, k), this.slotY()));
      }
    });
    const left = this.st.lvl.queue.length - this.st.qi;
    this.ui.add(this.add.text(W / 2, this.boxY + (this.boxArt ? 84 : 70), left > 0 ? `${left} more toolbox${left > 1 ? 'es' : ''}` : 'last toolboxes!', { fontFamily: 'Lilita One, Arial Black', fontSize: '22px', color: '#3b2533' }).setOrigin(0.5));
    // tray
    const trayArt = this.textures.exists('sy_tray');
    if (trayArt) {
      const im = this.add.image(W / 2, this.trayY, 'sy_tray');
      im.setScale(ScrewScene.TRAY_W / im.width);
      this.ui.add(im);
    } else g.fillStyle(INK, 0.85).fillRoundedRect(W / 2 - (TRAY_CAP * 92) / 2 - 10, this.trayY - 44, TRAY_CAP * 92 + 20, 88, 22);
    const nearFull = this.st.tray.length >= TRAY_CAP - 1;
    if (nearFull) {
      g.lineStyle(6, 0xe8452c, 1).strokeRoundedRect(W / 2 - (TRAY_CAP * 92) / 2 - 14, this.trayY - 48, TRAY_CAP * 92 + 28, 96, 24);
      this.ui.add(this.add.text(W / 2, this.trayY + 66, '1 SLOT LEFT!', { fontFamily: 'Lilita One, Arial Black', fontSize: '30px', color: '#e8452c', stroke: '#fff0cf', strokeThickness: 6 }).setOrigin(0.5));
    }
    for (let i = 0; i < TRAY_CAP; i++) {
      const danger = i === TRAY_CAP - 1;
      if (!trayArt) g.fillStyle(danger ? 0x7a2a2a : 0x5a4a5a, 1).fillCircle(this.trayX(i), this.trayY, 30);
      const c = this.st.tray[i];
      if (c !== undefined) this.ui.add(this.screwSprite(SCREW_COLORS[c]).setPosition(this.trayX(i), this.trayY));
    }
  }

  /** Screen point -> the top-most unremoved screw under the finger (or null). */
  pick(x: number, y: number) {
    const lx = (x - W / 2) / this.scale0, ly = (y - this.cy) / this.scale0;
    let best: number | null = null, bz = -1;
    for (const s of this.st.lvl.screws) {
      if (this.st.removed[s.id]) continue;
      if (Math.hypot(s.x - lx, s.y - ly) > 34) continue;
      const z = this.st.lvl.plates[s.plate].z;
      if (z > bz) [best, bz] = [s.id, z];
    }
    return best;
  }

  /** Screen position of a screw and whether it can come out (QA scripts / hints). */
  screwAt(id: number) {
    const sc = this.st.lvl.screws[id];
    return { x: W / 2 + sc.x * this.scale0, y: this.cy + sc.y * this.scale0, free: removable(this.st, id) };
  }

  onTap(x: number, y: number) {
    if (this.ended || this.busy > 2) return;
    const id = this.pick(x, y);
    if (id === null) return;
    const sv = this.screwViews.get(id)!;
    const r = tapScrew(this.st, id);
    if (!r.ok) {
      if (r.reason === 'blocked') {
        sfx.invalid();
        this.tweens.add({ targets: sv, x: sv.x + 6, duration: 50, yoyo: true, repeat: 2 });
      }
      return;
    }
    sfx.click();
    this.busy++;
    if (this.tipText) {
      const t = this.tipText;
      this.tipText = null;
      this.tweens.add({ targets: t, alpha: 0, duration: 250, onComplete: () => t.destroy() });
    }
    // unscrew in place, then fly to its toolbox slot or the tray
    const wx = W / 2 + sv.x * this.scale0, wy = this.cy + sv.y * this.scale0;
    this.yard.remove(sv);
    sv.setPosition(wx, wy).setScale(this.scale0).setDepth(50);
    this.add.existing(sv);
    const box = r.to === 'box' ? this.st.boxes[r.box!] : null;
    const tx = r.to === 'box' ? this.slotX(r.box!, Math.max(0, (r.left.length ? BOX_SIZE : box ? box.n : 1) - 1)) : this.trayX(this.st.tray.length - 1 + r.pulls.length);
    const ty = r.to === 'box' ? this.slotY() : this.trayY;
    this.tweens.chain({
      targets: sv,
      tweens: [
        { angle: -540, scale: this.scale0 * 1.35, duration: 220, ease: 'Quad.Out' },
        { x: tx, y: ty, scale: 1, duration: 260, ease: 'Cubic.In' },
      ],
      onComplete: () => {
        sv.destroy();
        this.busy--;
        if (r.left.length) {
          sfx.rankUp?.(4);
          for (const l of r.left) this.boxDone(l.slot, l.color);
        }
        this.drawUi();
        if (this.st.won) this.finish(true);
        else if (this.st.lost) this.finish(false);
      },
    });
    for (const pid of r.fell) {
      const pv = this.plateViews.get(pid)!;
      sfx.panelBreak?.(0);
      this.tweens.add({ targets: pv, y: pv.y + 1400, angle: pv.angle + Phaser.Math.Between(-90, 90), alpha: 0.2, duration: 900, delay: 120, ease: 'Quad.In', onComplete: () => pv.destroy() });
    }
  }

  boxDone(slot: number, color: number) {
    const x = this.boxX(slot);
    // the full toolbox (with its three screws) lifts away
    const g = this.add.container(0, 0).setDepth(40);
    if (this.boxArt) {
      const im = this.add.image(x, this.boxY, 'sy_toolbox_open').setTint(SCREW_COLORS[color]);
      im.setScale(ScrewScene.BOX_W / im.width);
      g.add(im);
      for (let k = 0; k < BOX_SIZE; k++) g.add(this.screwSprite(SCREW_COLORS[color]).setPosition(this.slotX(slot, k), this.slotY()).setScale(0.85));
    } else g.add(this.add.graphics().fillStyle(SCREW_COLORS[color], 1).fillRoundedRect(x - 114, this.boxY - 46, 228, 92, 18));
    this.tweens.add({ targets: g, y: -260, alpha: 0, duration: 460, ease: 'Back.In', onComplete: () => g.destroy() });
    this.flashAt(x, this.boxY, '✓', '#8ef08a');
  }

  flashAt(x: number, y: number, t: string, color: string) {
    const tx = this.add.text(x, y, t, { fontFamily: 'Lilita One, Arial Black', fontSize: '64px', color, stroke: '#2b1d2e', strokeThickness: 10 }).setOrigin(0.5).setDepth(60);
    this.tweens.add({ targets: tx, y: y - 60, alpha: 0, duration: 700, onComplete: () => tx.destroy() });
  }

  flash(text: string, color: string, ms: number) {
    const tx = this.add.text(W / 2, this.cy, text, { fontFamily: 'Lilita One, Arial Black', fontSize: '40px', color, stroke: '#2b1d2e', strokeThickness: 10, align: 'center' }).setOrigin(0.5).setDepth(70);
    this.tweens.add({ targets: tx, alpha: 0, delay: ms, duration: 300, onComplete: () => tx.destroy() });
  }

  finish(won: boolean, quit = false) {
    if (this.ended) return;
    this.ended = true;
    if (!quit) {
      this.flash(won ? 'YARD CLEARED!' : 'TRAY FULL!', won ? '#ffcf33' : '#ff684a', 900);
      if (won) sfx.star?.(3);
      else sfx.invalid();
    }
    this.time.delayedCall(quit ? 0 : 1300, () => {
      this.data0.onEnd(won);
      this.scene.stop();
    });
  }
}
