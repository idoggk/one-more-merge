// SCREW YARD scene: the weekly screw-sort mini-game. The model is src/core/screw.ts (2.0 rules), the week around it
// src/core/yardWeek.ts; this scene only draws it. Launched by GameScene (which sleeps meanwhile) with a YardData; calls
// onEnd(result) and stops itself.
// 2.0 (t-98293568): one open box + the NEXT 2 colours, a 4-slot dock (the 5th well is the +Well spare) whose screws the
// player taps into the box, swinging plates animated around their last screw, earned boosters, stars by dock peak,
// first-time lessons for yards 1-3 in the coach bubble (never blocking a tap).
import Phaser from 'phaser';
import { fitSlot, newYard, previewColors, removable, tapDock, tapScrew, useDrill, useMagnet, useWell, YARD_BOOSTERS, YARD_H, YARD_W, yardStars, type TapResult, type YardBooster, type YardState } from '../core/screw';
import { BOOSTER_COPY, YARD_MARKS, YARD_TIPS, type YardTipId } from '../core/marks';
import type { BoosterCounts, WeekYard } from '../core/yardWeek';
import { H, RS, W } from './GameScene';
import { Coach } from './coach';
import { sfx } from './audio';

export const SCREW_COLORS = [0xe8452c, 0x27a4c0, 0xf2c12e, 0x5fbf4a, 0x8e58c9, 0xff8a1f];
const PLATE_TINTS = [0x9aa4ad, 0xb08d57, 0x7d8a96, 0xa86b45, 0x6f8f8a, 0xc0b49a];
const INK = 0x2b1d2e;
const hex = (c: number) => `#${c.toString(16).padStart(6, '0')}`;

export interface YardResult {
  won: boolean;
  /** Left with the ✕ (no result panel, nothing booked). */
  quit: boolean;
  peak: number;
  stars: number;
  minPeak: number;
}
export interface YardData {
  n: number;
  level: WeekYard;
  /** meta.tips (first-time lessons; mutated here, saved through saveTips). */
  tips: Record<string, boolean>;
  boosters: BoosterCounts;
  /** Spend one booster in the save; false when none is left. */
  spend: (b: YardBooster) => boolean;
  saveTips: () => void;
  onEnd: (r: YardResult) => void;
}

export class ScrewScene extends Phaser.Scene {
  st!: YardState;
  data0!: YardData;
  yard!: Phaser.GameObjects.Container;
  plateViews = new Map<number, Phaser.GameObjects.Container>();
  screwViews = new Map<number, Phaser.GameObjects.Container>();
  ui!: Phaser.GameObjects.Container;
  bar!: Phaser.GameObjects.Container;
  coach!: Coach;
  scale0 = 1;
  cy = 0;
  busy = 0;
  ended = false;
  drillArmed = false;
  boosters: BoosterCounts = {};
  tipQueue: { id: YardTipId; spots: { x: number; y: number; r?: number }[] }[] = [];
  tipShown: YardTipId | null = null;

  constructor() {
    super('yard');
  }

  init(d: YardData) {
    this.data0 = d;
    this.ended = false;
    this.busy = 0;
    this.drillArmed = false;
    this.boosters = { ...d.boosters };
    this.tipQueue = [];
    this.tipShown = null;
    this.plateViews.clear();
    this.screwViews.clear();
  }

  create() {
    this.cameras.main.setOrigin(0, 0).setZoom(RS);
    const addText = this.add.text.bind(this.add);
    (this.add as unknown as { text: typeof addText }).text = (x, y, txt, style = {}) => addText(x, y, txt, { resolution: RS, ...style });
    this.st = newYard(this.data0.level);
    // backdrop: the workshop floor
    if (this.textures.exists('sy_background')) {
      // r39: ChatGPT's workbench (pegboard strip on top, quiet centre for the pile)
      const bg = this.add.image(W / 2, 0, 'sy_background').setOrigin(0.5, 0);
      bg.setScale(Math.max(W / bg.width, H / bg.height));
    } else if (this.textures.exists('bg')) {
      const bg = this.add.image(W / 2, H / 2, 'bg');
      bg.setScale(Math.max(W / bg.width, H / bg.height)).setTint(0xd8c8b0);
    } else this.add.rectangle(W / 2, H / 2, W, H, 0xe8cfa6);
    // header
    this.add.graphics().fillStyle(INK, 0.9).fillRoundedRect(16, 18, W - 32, 76, 24);
    this.add.text(W / 2, 56, `SCREW YARD  ·  ${this.data0.n}/10`, { fontFamily: 'Lilita One, Arial Black', fontSize: '38px', color: '#ffcf33' }).setOrigin(0.5);
    const back = this.add.text(56, 56, '✕', { fontFamily: 'Arial', fontSize: '44px', color: '#fff0cf' }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    back.on('pointerup', () => this.finish(false, true));
    // the pile, between the dock and the booster bar
    const top = 440, bottom = H - 150;
    this.scale0 = Math.min((W - 30) / YARD_W, (bottom - top) / YARD_H, 1.12);
    this.cy = (top + bottom) / 2;
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
        // r39: empty holes read as dark through-holes, never as brown screws
        for (const sid of p.screws) {
          const sc = lvl.screws[sid];
          const dx = sc.x - p.x, dy = sc.y - p.y;
          g.fillStyle(0x211923, 1).fillCircle(dx * Math.cos(-p.angle) - dy * Math.sin(-p.angle), dx * Math.sin(-p.angle) + dy * Math.cos(-p.angle), 10);
        }
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
    this.bar = this.add.container(0, 0);
    this.coach = new Coach(this, W);
    this.drawUi();
    this.drawBar();
    // taps on buttons / the coach bubble are theirs; everything else is the dock or the pile
    this.input.on('pointerup', (p: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
      if (!over?.length) this.onTap(p.worldX, p.worldY);
    });
    // first-time lessons: yards 1-3 teach the box and NEXT; boosters once there is a choice to make (yard 2+)
    if (this.data0.n <= 3) {
      this.queueTip('yard_box', [{ x: this.boxX(0), y: this.boxY, r: 120 }]);
      this.queueTip('yard_next', [{ x: this.prevX(0), y: this.boxY, r: 60 }, { x: this.prevX(1), y: this.boxY, r: 60 }]);
    }
    if (this.data0.n >= 2 && YARD_BOOSTERS.some((k) => this.boosters[k])) this.queueTip('yard_boosters', YARD_BOOSTERS.map((_, i) => ({ x: this.barX(i), y: this.barY, r: 80 })));
  }

  update(time: number) {
    this.coach?.update(time);
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

  // ---- layout ----
  /** The open box sits left of centre; the NEXT two boxes, smaller, to its right. */
  boxX = (slot: number) => W / 2 - 100 + slot * 260;
  boxY = 190;
  prevX = (k: number) => W / 2 + 132 + k * 118;
  trayY = 352;
  barY = H - 74;
  barX = (i: number) => W / 2 + (i - 1) * 228;
  /** Dock wells: the rules' slots + the +Well spare. */
  get wells() {
    return (this.st.lvl.rules ?? this.st.rules).dock + 1;
  }
  /** r38 tray art (ChatGPT): 480 px wide, wells at 12/30/49/67/86% across. */
  static TRAY_W = 480;
  static TRAY_WELLS = [0.118, 0.303, 0.486, 0.671, 0.856];
  trayX = (i: number) => (this.textures.exists('sy_tray') && this.wells === 5 ? W / 2 + (ScrewScene.TRAY_WELLS[i] - 0.5) * ScrewScene.TRAY_W : W / 2 + (i - (this.wells - 1) / 2) * 92);
  /** r38 toolbox art (ChatGPT): 250 px wide; wells at 22% / 48% / 74% across, 62% down. */
  get boxArt() {
    return this.textures.exists('sy_toolbox_open');
  }
  static BOX_W = 250;
  static WELLS = [0.217, 0.48, 0.744];
  slotX = (slot: number, k: number) => (this.boxArt ? this.boxX(slot) + (ScrewScene.WELLS[k] - 0.5) * ScrewScene.BOX_W : this.boxX(slot) + (k - 1) * 64);
  slotY = () => (this.boxArt ? this.boxY + (0.62 - 0.5) * ScrewScene.BOX_W * (209 / 360) : this.boxY - 4);

  /** A toolbox of `color` at (x, y), `scale` of full size, holding `n` screws (null colour = empty slot). */
  drawBox(into: Phaser.GameObjects.Container, x: number, y: number, scale: number, color: number | null, n: number) {
    const s = scale;
    if (this.boxArt) {
      const im = this.add.image(x, y, 'sy_toolbox_open');
      im.setScale((ScrewScene.BOX_W * s) / im.width);
      if (color !== null) im.setTint(SCREW_COLORS[color]);
      else im.setTint(INK).setAlpha(0.35);
      into.add(im);
      if (color !== null && this.textures.exists('sy_toolbox_open_brass')) into.add(this.add.image(x, y, 'sy_toolbox_open_brass').setDisplaySize(im.displayWidth, im.displayHeight));
      if (color !== null)
        for (let k = 0; k < n; k++) into.add(this.screwSprite(SCREW_COLORS[color]).setPosition(x + (ScrewScene.WELLS[k] - 0.5) * ScrewScene.BOX_W * s, y + 0.12 * ScrewScene.BOX_W * s * (209 / 360)).setScale(0.85 * s));
      return;
    }
    const g = this.add.graphics();
    into.add(g);
    g.lineStyle(12 * s, INK, 1).strokeRoundedRect(x - 50 * s, y - 82 * s, 100 * s, 46 * s, 14 * s);
    g.fillStyle(INK, 1).fillRoundedRect(x - 120 * s, y - 52 * s, 240 * s, 104 * s, 22 * s);
    if (color === null) return;
    g.fillStyle(SCREW_COLORS[color], 1).fillRoundedRect(x - 114 * s, y - 46 * s, 228 * s, 92 * s, 18 * s);
    for (let k = 0; k < 3; k++) {
      g.fillStyle(INK, 0.55).fillCircle(x + (k - 1) * 64 * s, y - 4 * s, 25 * s);
      if (k < n) into.add(this.screwSprite(SCREW_COLORS[color]).setPosition(x + (k - 1) * 64 * s, y - 4 * s).setScale(s));
    }
  }

  drawUi() {
    this.ui.removeAll(true);
    const st = this.st;
    const txt = (x: number, y: number, t: string, size: number, color = '#fff0cf') => this.ui.add(this.add.text(x, y, t, { fontFamily: 'Lilita One, Arial Black', fontSize: `${size}px`, color, backgroundColor: '#2b1d2e', padding: { x: 10, y: 2 } }).setOrigin(0.5));
    // the open box, then NEXT: the two colours after it (always visible, empty wells when the queue runs out)
    st.boxes.forEach((b, slot) => this.drawBox(this.ui, this.boxX(slot), this.boxY, 1, b ? b.color : null, b ? b.n : 0));
    const pv = previewColors(st);
    txt((this.prevX(0) + this.prevX(1)) / 2, this.boxY - 76, 'NEXT', 22, '#ffcf33');
    for (let k = 0; k < 2; k++) this.drawBox(this.ui, this.prevX(k), this.boxY + 4, 0.42, k < pv.length ? pv[k] : null, 0);
    const left = st.lvl.queue.length - st.qi;
    txt(this.boxX(0), this.boxY + 84, left > 0 ? `${left + st.boxes.filter(Boolean).length} BOXES TO GO` : st.boxes.some(Boolean) ? 'LAST BOX!' : 'DONE!', 20);
    // the dock (+ the spare well the +Well booster opens)
    const g = this.add.graphics();
    this.ui.add(g);
    const N = this.wells, open = st.rules.dock;
    if (this.textures.exists('sy_tray') && N === 5) {
      const im = this.add.image(W / 2, this.trayY, 'sy_tray');
      im.setScale(ScrewScene.TRAY_W / im.width);
      this.ui.add(im);
    } else g.fillStyle(INK, 0.85).fillRoundedRect(W / 2 - (N * 92) / 2 - 10, this.trayY - 44, N * 92 + 20, 88, 22);
    const g2 = this.add.graphics();
    this.ui.add(g2);
    for (let i = 0; i < N; i++) {
      const x = this.trayX(i);
      if (i >= open) {
        // spare well, shut: a grey cap with +WELL (clarity: what it is, YARD_MARKS.spare)
        g2.fillStyle(YARD_MARKS.spare.hue, 0.92).fillCircle(x, this.trayY, 32).lineStyle(4, INK, 0.8).strokeCircle(x, this.trayY, 32);
        this.ui.add(this.add.text(x, this.trayY, YARD_MARKS.spare.label, { fontFamily: 'Lilita One, Arial Black', fontSize: '17px', color: '#2b1d2e' }).setOrigin(0.5));
        continue;
      }
      const c = st.tray[i];
      if (c === undefined) continue;
      this.ui.add(this.screwSprite(SCREW_COLORS[c]).setPosition(x, this.trayY));
      // FITS marker: this dock screw matches the open box - tap it
      if (fitSlot(st, c) >= 0) {
        const ring = this.add.graphics().lineStyle(6, YARD_MARKS.fits.hue, 1).strokeCircle(x, this.trayY, 34);
        this.ui.add(ring);
        this.tweens.add({ targets: ring, alpha: 0.35, duration: 420, yoyo: true, repeat: -1 });
        this.ui.add(this.add.text(x, this.trayY - 50, YARD_MARKS.fits.label, { fontFamily: 'Lilita One, Arial Black', fontSize: '20px', color: '#2b1d2e', backgroundColor: hex(YARD_MARKS.fits.hue), padding: { x: 8, y: 1 } }).setOrigin(0.5));
        this.queueTip('yard_dockfit', [{ x, y: this.trayY, r: 50 }]);
      }
    }
    const used = st.tray.length;
    if (used >= open - 1 && used > 0) {
      g.lineStyle(6, 0xe8452c, 1).strokeRoundedRect(W / 2 - 254, this.trayY - 48, 508, 96, 24);
      txt(W / 2, this.trayY + 62, used >= open ? 'DOCK FULL: NEXT MISS LOSES!' : '1 DOCK SLOT LEFT!', 24, '#ff8a6a');
    }
    // live stars: by the most screws the dock has held (3 at the solver's best + 1)
    const stars = yardStars(true, st.peak, this.data0.level.minPeak);
    const sg = this.add.graphics();
    this.ui.add(sg);
    const sx = W - 92;
    sg.fillStyle(INK, 0.85).fillRoundedRect(sx - 66, this.trayY - 82, 132, 42, 14);
    for (let k = 0; k < 3; k++) this.star(sg, sx - 38 + k * 38, this.trayY - 61, 15, k < stars);
    if (used < open - 1 || !used) this.ui.add(this.add.text(W / 2, this.trayY + 58, `DOCK  ·  3★ if it never holds more than ${this.data0.level.minPeak + 1}`, { fontFamily: 'Arial', fontStyle: 'bold', fontSize: '19px', color: '#fff0cf', backgroundColor: '#2b1d2ecc', padding: { x: 10, y: 3 } }).setOrigin(0.5));
  }

  star(g: Phaser.GameObjects.Graphics, x: number, y: number, r: number, filled: boolean) {
    const pts: Phaser.Math.Vector2[] = [];
    for (let k = 0; k < 10; k++) {
      const a = -Math.PI / 2 + (k * Math.PI) / 5;
      const rr = k % 2 ? r * 0.45 : r;
      pts.push(new Phaser.Math.Vector2(x + Math.cos(a) * rr, y + Math.sin(a) * rr));
    }
    if (filled) g.fillStyle(0xffcf33, 1).fillPoints(pts, true);
    g.lineStyle(3, 0xfff0cf, 1).strokePoints(pts, true);
  }

  /** Earned boosters: DRILL / MAGNET / +WELL with their counts. */
  drawBar() {
    this.bar.removeAll(true);
    YARD_BOOSTERS.forEach((k, i) => {
      const x = this.barX(i), y = this.barY;
      const have = this.boosters[k] ?? 0;
      const armed = k === 'drill' && this.drillArmed;
      const spent = k === 'well' && !!this.st.well;
      const on = have > 0 && !spent;
      const g = this.add.graphics();
      g.fillStyle(INK, 0.92).fillRoundedRect(x - 104, y - 46, 208, 92, 22);
      g.fillStyle(armed ? YARD_MARKS.drill.hue : on ? 0x5fbf4a : 0x6a5a6a, 1).fillRoundedRect(x - 98, y - 40, 196, 80, 18);
      const name = this.add.text(x - 14, y - 12, BOOSTER_COPY[k].name, { fontFamily: 'Lilita One, Arial Black', fontSize: '28px', color: on ? '#ffffff' : '#bfb0bf' }).setOrigin(0.5);
      const sub = this.add.text(x - 14, y + 20, armed ? 'TAP A SCREW' : spent ? 'IN USE' : k === 'drill' ? 'any screw' : k === 'magnet' ? 'fill the box' : '+1 dock slot', { fontFamily: 'Arial', fontStyle: 'bold', fontSize: '17px', color: on ? '#fff0cf' : '#bfb0bf' }).setOrigin(0.5);
      const badge = this.add.graphics().fillStyle(have ? 0xe8452c : 0x3b2533, 1).fillCircle(x + 80, y - 34, 20).lineStyle(3, 0xfff0cf, 1).strokeCircle(x + 80, y - 34, 20);
      const cnt = this.add.text(x + 80, y - 34, String(have), { fontFamily: 'Lilita One, Arial Black', fontSize: '24px', color: '#ffffff' }).setOrigin(0.5);
      const hit = this.add.zone(x, y, 208, 92).setInteractive({ useHandCursor: true });
      hit.on('pointerup', () => this.onBooster(k));
      this.bar.add([g, name, sub, badge, cnt, hit]);
    });
  }

  // ---- first-time lessons (coach bubble near the bottom, GOT IT or the next tap moves on; input never blocked) ----
  queueTip(id: YardTipId, spots: { x: number; y: number; r?: number }[]) {
    if (this.data0.tips[id] || this.tipShown === id || this.tipQueue.some((t) => t.id === id)) return;
    this.tipQueue.push({ id, spots });
    if (!this.tipShown && !this.busy) this.nextTip();
  }

  nextTip() {
    if (this.tipShown) {
      this.data0.tips[this.tipShown] = true;
      this.data0.saveTips();
    }
    this.tipShown = null;
    const t = this.tipQueue.shift();
    if (!t || this.ended) {
      this.coach.clear();
      return;
    }
    this.tipShown = t.id;
    this.coach.focus(t.spots);
    this.coach.say(YARD_TIPS[t.id], H - 300, { next: { page: '', label: 'GOT IT', onNext: () => (sfx.click(), this.nextTip()) } });
  }

  /** A tap went through: the box / NEXT lessons have been acted on, so move on (after the animation, never mid-tap). */
  tipActed() {
    if (this.tipShown === 'yard_box' || this.tipShown === 'yard_next') this.nextTip();
    else if (!this.tipShown && this.tipQueue.length) this.nextTip();
  }

  // ---- input ----
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

  /** Dock well under the finger, or -1. */
  dockAt(x: number, y: number) {
    if (Math.abs(y - this.trayY) > 46) return -1;
    for (let i = 0; i < this.st.tray.length; i++) if (Math.abs(x - this.trayX(i)) < 42) return i;
    return -1;
  }

  onTap(x: number, y: number) {
    if (this.ended || this.busy > 2) return;
    const di = this.dockAt(x, y);
    if (di >= 0) return this.onDock(di);
    const id = this.pick(x, y);
    if (id === null) return;
    const sv = this.screwViews.get(id)!;
    const drill = this.drillArmed;
    const r = drill ? useDrill(this.st, id) : tapScrew(this.st, id);
    if (!r.ok) {
      if (r.reason === 'blocked' || r.reason === 'full') {
        sfx.invalid();
        this.tweens.add({ targets: sv, x: sv.x + 6, duration: 50, yoyo: true, repeat: 2 });
        if (r.reason === 'full') this.flash('NO ROOM FOR IT!', '#ff684a', 700);
      }
      return;
    }
    if (drill) {
      this.drillArmed = false;
      this.data0.spend('drill');
      this.boosters.drill = Math.max(0, (this.boosters.drill ?? 0) - 1);
      this.drawBar();
      sfx.panelBreak?.(0);
    } else sfx.click();
    this.flyScrew(id, r.to === 'box' ? { x: this.slotX(r.box!, Math.max(0, (r.left.length ? 3 : this.st.boxes[r.box!]?.n ?? 1) - 1)), y: this.slotY() } : { x: this.trayX(this.st.tray.length - 1), y: this.trayY }, () => this.afterMove(r));
    this.plates(r);
  }

  /** Tap a dock screw: into the open box if it matches (tapDock); a mismatch just wiggles. */
  onDock(i: number) {
    if (this.busy) return; // the dock row redraws after each move: wait so indexes stay true
    const c = this.st.tray[i];
    const r = tapDock(this.st, i);
    if (!r.ok) {
      sfx.invalid();
      this.flash('NOT THIS BOX YET', '#ff684a', 600);
      return;
    }
    sfx.click();
    const sv = this.screwSprite(SCREW_COLORS[c]).setPosition(this.trayX(i), this.trayY).setDepth(50);
    this.busy++;
    const to = { x: this.slotX(r.box!, Math.max(0, (r.left.length ? 3 : this.st.boxes[r.box!]?.n ?? 1) - 1)), y: this.slotY() };
    this.tweens.add({ targets: sv, x: to.x, y: to.y, duration: 260, ease: 'Cubic.In', onComplete: () => (sv.destroy(), this.busy--, this.afterMove(r)) });
  }

  onBooster(k: YardBooster) {
    if (this.ended) return;
    const have = this.boosters[k] ?? 0;
    if (!have) {
      sfx.invalid();
      this.coach.say(`${BOOSTER_COPY[k].name}: ${BOOSTER_COPY[k].text}\nEarn more with 3 stars and the event tiers.`, H - 300, { ms: 2600 });
      return;
    }
    if (k === 'drill') {
      this.drillArmed = !this.drillArmed;
      if (this.drillArmed) this.coach.say(YARD_MARKS.drill.text, H - 300, { ms: 2400 });
      this.drawBar();
      return;
    }
    if (this.busy) return;
    const r = k === 'magnet' ? useMagnet(this.st) : useWell(this.st);
    if (!r.ok) {
      sfx.invalid();
      return;
    }
    this.data0.spend(k);
    this.boosters[k] = have - 1;
    this.drawBar();
    sfx.rankUp?.(3);
    if (k === 'well') {
      this.flash('+1 DOCK SLOT!', '#8ef08a', 700);
      this.drawUi();
      return;
    }
    // MAGNET: dock screws, then pile screws, fly into the box
    let k2 = 0;
    for (const p of r.pulls) {
      const sv = this.screwSprite(SCREW_COLORS[p.color]).setPosition(this.trayX(k2++), this.trayY).setDepth(50);
      this.busy++;
      this.tweens.add({ targets: sv, x: this.boxX(r.box!), y: this.slotY(), duration: 380, ease: 'Cubic.In', onComplete: () => (sv.destroy(), this.busy--) });
    }
    const taken = r.taken ?? [];
    taken.forEach((id, j) => this.flyScrew(id, { x: this.boxX(r.box!), y: this.slotY() }, j === taken.length - 1 ? () => this.afterMove(r) : () => {}, j * 90));
    if (!taken.length) this.time.delayedCall(400, () => this.afterMove(r));
    this.plates(r);
  }

  /** Unscrew in place, then fly to `to`. */
  flyScrew(id: number, to: { x: number; y: number }, done: () => void, delay = 0) {
    const sv = this.screwViews.get(id)!;
    this.busy++;
    const wx = W / 2 + sv.x * this.scale0, wy = this.cy + sv.y * this.scale0;
    this.yard.remove(sv);
    sv.setPosition(wx, wy).setScale(this.scale0).setDepth(50);
    this.add.existing(sv);
    this.tweens.chain({
      targets: sv,
      delay,
      tweens: [
        { angle: -540, scale: this.scale0 * 1.35, duration: 220, ease: 'Quad.Out' },
        { x: to.x, y: to.y, scale: 1, duration: 260, ease: 'Cubic.In' },
      ],
      onComplete: () => {
        sv.destroy();
        this.busy--;
        done();
      },
    });
  }

  /** Plates that fell drop away; plates left on one screw swing down around it (the model's swingPose). */
  plates(r: TapResult) {
    for (const pid of r.fell) {
      const pv = this.plateViews.get(pid)!;
      sfx.panelBreak?.(0);
      this.tweens.add({ targets: pv, y: pv.y + 1400, angle: pv.angle + Phaser.Math.Between(-90, 90), alpha: 0.2, duration: 900, delay: 120, ease: 'Quad.In', onComplete: () => pv.destroy() });
    }
    for (const pid of r.swung) this.swing(pid);
  }

  /** Rotate the plate around its last screw until its centre hangs straight below it (Back.Out = a small pendulum
   *  overshoot). Ends exactly on platePose, so what the player sees covering is what the model covers. */
  swing(pid: number) {
    const p = this.st.lvl.plates[pid];
    const pv = this.plateViews.get(pid);
    const pivotId = p.screws.find((s) => !this.st.removed[s]);
    if (!pv || pivotId === undefined) return;
    const pivot = this.st.lvl.screws[pivotId];
    const dx = p.x - pivot.x, dy = p.y - pivot.y;
    if (Math.hypot(dx, dy) < 1) return;
    let d = Math.PI / 2 - Math.atan2(dy, dx);
    while (d > Math.PI) d -= 2 * Math.PI;
    while (d <= -Math.PI) d += 2 * Math.PI;
    const o = { t: 0 };
    this.tweens.add({
      targets: o,
      t: 1,
      duration: 720,
      delay: 160,
      ease: 'Back.Out',
      onUpdate: () => {
        const a = o.t * d, c = Math.cos(a), s = Math.sin(a);
        pv.setPosition(pivot.x + dx * c - dy * s, pivot.y + dx * s + dy * c).setRotation(p.angle + a);
      },
    });
    // HANGING marker on the pivot screw (YARD_MARKS.hanging): this plate now hangs from it
    const sv = this.screwViews.get(pivotId);
    if (sv) sv.add(this.add.graphics().lineStyle(5, YARD_MARKS.hanging.hue, 1).strokeCircle(0, 0, 30));
    const at = this.screwAt(pivotId);
    this.queueTip('yard_swing', [{ x: at.x, y: at.y + 80, r: 120 }]);
  }

  afterMove(r: TapResult) {
    if (r.left.length) {
      sfx.rankUp?.(4);
      for (const l of r.left) this.boxDone(l.slot, l.color);
    }
    this.drawUi();
    if (r.to === 'tray') this.queueTip('yard_dock', [{ x: W / 2, y: this.trayY, r: 90 }]);
    if (this.st.won) this.finish(true);
    else if (this.st.lost) this.finish(false);
    else this.tipActed();
  }

  boxDone(slot: number, color: number) {
    const x = this.boxX(slot);
    // the full toolbox (with its three screws) lifts away; the next one slides in from NEXT
    const g = this.add.container(0, 0).setDepth(40);
    this.drawBox(g, x, this.boxY, 1, color, 3);
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
    this.coach.clear();
    const stars = yardStars(won, this.st.peak, this.data0.level.minPeak);
    if (!quit) {
      this.flash(won ? `YARD CLEARED!\n${'★'.repeat(stars)}` : 'DOCK FULL!', won ? '#ffcf33' : '#ff684a', 900);
      if (won) sfx.star?.(stars);
      else sfx.invalid();
    }
    this.time.delayedCall(quit ? 0 : 1300, () => {
      this.data0.onEnd({ won, quit, peak: this.st.peak, stars, minPeak: this.data0.level.minPeak });
      this.scene.stop();
    });
  }
}
