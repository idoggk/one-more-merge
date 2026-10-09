// SCREW YARD "A" scene (t-9adea8b8): the turnable object, Screwdom-style. The model is src/core/screwObject.ts; this
// scene only draws it. Launched by GameScene.startYard when the QA switch SCREW YARD is on OBJECT (GameScene sleeps
// meanwhile); calls onEnd(result) and stops itself.
// Drawing: no 3D engine. Each block is a unit cube rotated about the vertical axis (the snapped view, tweened while
// turning) plus a fixed camera yaw / pitch, projected orthographically and painted back to front, so the front, the
// top and a sliver of the next side show. The projection, the painted faces and the tap test live in the model
// (screwObject.ts "the screen"), so a screw is bright exactly when a tap on it takes it, and the solver agrees.
import Phaser from 'phaser';
import { BOX_SIZE } from '../core/screw';
import { blockFaces, blockPos, faceUnder, HELPERS, newObject, previewColors, projectPt, reachable, SCREW_OUT, SCREW_R, screenPick, screwSpot3, shownFaces, tapRow, tapScrew, turnDir, useBroom, useDrill, useHammer, VIEW_NAMES, type Helper, type ObjectDef, type ObjectState, type ObjTap, type ShownFace, type V3, type View } from '../core/screwObject';
import { H, RS, W } from './GameScene';
import { SCREW_COLORS } from './ScrewScene';
import { sfx } from './audio';

const INK = 0x2b1d2e;
const WOOD = [0xc98d4e, 0xb47838];
const LIGHT = norm([-0.45, 0.8, 0.55]);
const TURN_MS = 260;
/** Screw ring segments: full detail in the idle snapshot, fewer while the live redraw runs every turning frame. */
const RING_IDLE = 18;
const RING_TURN = 10;

type Bakeable = Phaser.GameObjects.GameObject & Phaser.GameObjects.Components.Visible;

function norm(v: V3): V3 {
  const l = Math.hypot(...v);
  return [v[0] / l, v[1] / l, v[2] / l];
}

export interface ObjectYardResult {
  won: boolean;
  /** Left with the ✕ (no result panel). */
  quit: boolean;
  moves: number;
}
export interface ObjectYardData {
  lvl: ObjectDef;
  onEnd: (r: ObjectYardResult) => void;
}

export class ObjectYardScene extends Phaser.Scene {
  st!: ObjectState;
  data0!: ObjectYardData;
  view: View = 0;
  /** Object turn angle in quarter turns (tweened between snapped views). */
  turn = 0;
  turning = false;
  ended = false;
  hammerArmed = false;
  obj!: Phaser.GameObjects.Graphics;
  /** Still pictures (see bake): the object (obj stays live only while turning), the header + boxes + row band, and
   *  the turn arrows + helper bar band. Phaser re-triangulates every Graphics each frame, which cost ~60 ms a frame on
   *  a throttled phone even when nothing moved; a baked band is one quad. */
  snap!: Phaser.GameObjects.RenderTexture;
  topSnap!: Phaser.GameObjects.RenderTexture;
  botSnap!: Phaser.GameObjects.RenderTexture;
  topStatic: Bakeable[] = [];
  botStatic: Bakeable[] = [];
  /** Pieces that animate on their own (pulsing rings): never baked. */
  live = new Set<Phaser.GameObjects.GameObject>();
  /** Reused Vector2s for face corners / screw rings (fillPoints copies them, so one buffer per size is enough). */
  vbuf = new Map<string, Phaser.Math.Vector2[]>();
  buf(key: string, n: number) {
    let b = this.vbuf.get(key);
    if (!b || b.length !== n) this.vbuf.set(key, (b = Array.from({ length: n }, () => new Phaser.Math.Vector2())));
    return b;
  }
  ui!: Phaser.GameObjects.Container;
  bar!: Phaser.GameObjects.Container;
  viewLabel!: Phaser.GameObjects.Text;
  hint!: Phaser.GameObjects.Text;
  S = 140;
  cx = W / 2;
  cy = 800;
  down = { x: 0, y: 0, t: 0, on: false };

  constructor() {
    super('objectYard');
  }

  init(d: ObjectYardData) {
    this.data0 = d;
    this.view = 0;
    this.turn = 0;
    this.turning = false;
    this.ended = false;
    this.hammerArmed = false;
  }

  create() {
    this.cameras.main.setOrigin(0, 0).setZoom(RS);
    const addText = this.add.text.bind(this.add);
    (this.add as unknown as { text: typeof addText }).text = (x, y, txt, style = {}) => addText(x, y, txt, { resolution: RS, ...style });
    this.st = newObject(this.data0.lvl);
    if (this.textures.exists('sy_background')) {
      const bg = this.add.image(W / 2, 0, 'sy_background').setOrigin(0.5, 0);
      bg.setScale(Math.max(W / bg.width, H / bg.height));
    } else this.add.rectangle(W / 2, H / 2, W, H, 0xe8cfa6);
    // header
    this.live.clear();
    this.topStatic = [
      this.add.graphics().fillStyle(INK, 0.9).fillRoundedRect(16, 18, W - 32, 76, 24),
      this.add.text(W / 2, 56, `SCREW YARD  ·  ${this.st.lvl.name}`, { fontFamily: 'Lilita One, Arial Black', fontSize: '36px', color: '#ffcf33' }).setOrigin(0.5),
    ];
    this.botStatic = [];
    const back = this.add.text(56, 56, '✕', { fontFamily: 'Arial', fontSize: '44px', color: '#fff0cf' }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    back.on('pointerup', () => this.finish(false, true));
    // the object fills the space between the row and the turn controls
    const top = 450, bottom = H - 270;
    this.cy = (top + bottom) / 2 + 20;
    this.S = Math.min(150, (bottom - top) / 3.1, (W - 60) / 4.2);
    this.obj = this.add.graphics();
    this.snap = this.band(this.cy - this.S * 3, this.cy + this.S * 2.4);
    // the baked bands sit where their live pieces did in the draw order (the label / hint stay on top)
    const ty = H - 205;
    this.topSnap = this.band(0, this.rowY + 130);
    this.botSnap = this.band(ty - 60, H);
    this.ui = this.add.container(0, 0);
    this.bar = this.add.container(0, 0);
    // turn controls: ◀ VIEW ▶ (swipe left / right on the object does the same)
    this.viewLabel = this.add.text(W / 2, ty - 14, '', { fontFamily: 'Lilita One, Arial Black', fontSize: '30px', color: '#fff0cf', backgroundColor: '#2b1d2ecc', padding: { x: 14, y: 4 } }).setOrigin(0.5);
    this.hint = this.add.text(W / 2, ty + 30, 'Swipe or ◀ ▶ to turn it', { fontFamily: 'Arial', fontStyle: 'bold', fontSize: '20px', color: '#fff0cf', backgroundColor: '#2b1d2eaa', padding: { x: 10, y: 3 } }).setOrigin(0.5);
    this.arrow(84, ty, '◀', -1);
    this.arrow(W - 84, ty, '▶', 1);
    this.drawObject();
    this.drawUi();
    this.drawBar();
    this.input.on('pointerdown', (p: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
      this.down = { x: p.worldX, y: p.worldY, t: p.downTime, on: !over?.length };
    });
    this.input.on('pointerup', (p: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
      if (!this.down.on || over?.length) return;
      this.down.on = false;
      const dx = p.worldX - this.down.x, dy = p.worldY - this.down.y;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.2) return this.rotate(dx < 0 ? 1 : -1);
      if (Math.hypot(dx, dy) < 30) this.onTap(p.worldX, p.worldY);
    });
  }

  /** A screen band [y0, y1) baked at the canvas resolution (the camera zooms by RS). */
  band(y0: number, y1: number) {
    y0 = Math.max(0, Math.floor(y0));
    y1 = Math.min(H, Math.ceil(y1));
    const rt = this.add.renderTexture(0, y0, Math.ceil(W * RS), Math.ceil((y1 - y0) * RS)).setOrigin(0, 0).setScale(1 / RS);
    rt.camera.setOrigin(0, 0).setZoom(RS).setScroll(0, y0);
    return rt;
  }

  /** Paint the still pieces into rt once and hide them, so idle frames draw one quad. Tappable, zone and pulsing
   *  pieces stay live (hit tests never look at the band). */
  bake(rt: Phaser.GameObjects.RenderTexture, items: Bakeable[]) {
    rt.clear();
    for (const o of items) {
      if (o.input || this.live.has(o) || o.type === 'Zone') continue;
      rt.draw(o.setVisible(true));
      o.setVisible(false);
    }
  }

  arrow(x: number, y: number, label: string, dir: 1 | -1) {
    const g = this.add.graphics();
    g.fillStyle(INK, 0.92).fillCircle(x, y, 52).fillStyle(0x8a6a4a, 1).fillCircle(x, y, 45).lineStyle(4, 0xfff0cf, 0.9).strokeCircle(x, y, 45);
    this.botStatic.push(g, this.add.text(x + dir * 3, y, label, { fontFamily: 'Arial', fontSize: '44px', color: '#ffffff' }).setOrigin(0.5));
    this.add.zone(x, y, 116, 116).setInteractive({ useHandCursor: true }).on('pointerup', () => this.rotate(dir));
  }

  // ---- projection ----
  /** Object space (block units, centred) -> screen point + depth (larger = nearer the camera), at turn `t`. */
  /** Object space (block units, centred) -> screen point + depth (larger = nearer the camera), at turn `t`. */
  project(p: V3, t = this.turn) {
    const s = projectPt(p, t);
    return { x: this.cx + s.x * this.S, y: this.cy + s.y * this.S, d: s.d };
  }
  bpos(bid: number): V3 {
    return blockPos(this.st.lvl, bid);
  }
  /** Screen -> the model's screen units. */
  toUnits(x: number, y: number) {
    return { x: (x - this.cx) / this.S, y: (y - this.cy) / this.S };
  }

  /** Paint faces (the model's shownFaces / blockFaces) and their screws into g. */
  paintFaces(g: Phaser.GameObjects.Graphics, faces: ShownFace[], off = { x: 0, y: 0 }) {
    const st = this.st;
    for (const { block: bid, face, n, k, pts: q } of faces) {
      const b = st.lvl.blocks[bid];
      const pts = this.buf('face', q.length);
      q.forEach((s, i) => pts[i].set(this.cx + s.x * this.S + off.x, this.cy + s.y * this.S + off.y));
      const r = turnDir(n, this.turn);
      const lit = Math.max(0, r[0] * LIGHT[0] + r[1] * LIGHT[1] + r[2] * LIGHT[2]);
      const base = Phaser.Display.Color.IntegerToColor(WOOD[b.tint % WOOD.length]);
      const f = 0.55 + 0.55 * lit;
      g.fillStyle(Phaser.Display.Color.GetColor(Math.min(255, base.red * f), Math.min(255, base.green * f), Math.min(255, base.blue * f)), 1).fillPoints(pts, true);
      // planks: two grain lines + a darker rim
      g.lineStyle(2, INK, 0.18);
      for (const t of [1 / 3, 2 / 3]) g.lineBetween(Phaser.Math.Linear(pts[0].x, pts[3].x, t), Phaser.Math.Linear(pts[0].y, pts[3].y, t), Phaser.Math.Linear(pts[1].x, pts[2].x, t), Phaser.Math.Linear(pts[1].y, pts[2].y, t));
      g.lineStyle(4, INK, 0.85).strokePoints(pts, true);
      if (face === 'bottom') continue;
      for (const sid of b.screws) if (!st.removed[sid] && st.lvl.screws[sid].face === face) this.paintScrew(g, sid, this.bpos(bid), n, k, off);
    }
  }

  /** A screw head lying on its face (an ellipse in projection); bright = a tap here takes it now, dim = covered /
   *  turned away. */
  paintScrew(g: Phaser.GameObjects.Graphics, sid: number, p: V3, n: V3, k: number, off = { x: 0, y: 0 }) {
    const sc = this.st.lvl.screws[sid];
    const col = SCREW_COLORS[sc.color];
    const live = !this.turning && reachable(this.st, sid, this.view);
    const c: V3 = [p[0] + n[0] * SCREW_OUT, p[1] + n[1] * SCREW_OUT, p[2] + n[2] * SCREW_OUT];
    const u: V3 = n[1] !== 0 ? [1, 0, 0] : [-n[2], 0, n[0]];
    const v: V3 = [n[1] * u[2] - n[2] * u[1], n[2] * u[0] - n[0] * u[2], n[0] * u[1] - n[1] * u[0]];
    const N = this.turning ? RING_TURN : RING_IDLE;
    const ring = (r: number) => {
      const pts = this.buf('ring', N);
      for (let i = 0; i < N; i++) {
        const a = (i / N) * Math.PI * 2;
        const s = this.project([c[0] + (u[0] * Math.cos(a) + v[0] * Math.sin(a)) * r, c[1] + (u[1] * Math.cos(a) + v[1] * Math.sin(a)) * r, c[2] + (u[2] * Math.cos(a) + v[2] * Math.sin(a)) * r]);
        pts[i].set(s.x + off.x, s.y + off.y);
      }
      return pts;
    };
    if (live) g.fillStyle(0xffffff, 0.95).fillPoints(ring(SCREW_R * 1.32), true);
    g.fillStyle(INK, 1).fillPoints(ring(SCREW_R * 1.08), true);
    g.fillStyle(col, 1).fillPoints(ring(SCREW_R), true);
    // the cross slot
    const at = (a: number, b: number) => {
      const s = this.project([c[0] + (u[0] * a + v[0] * b) * SCREW_R, c[1] + (u[1] * a + v[1] * b) * SCREW_R, c[2] + (u[2] * a + v[2] * b) * SCREW_R]);
      return [s.x + off.x, s.y + off.y] as const;
    };
    g.lineStyle(Math.max(2, 5 * k), INK, 0.85);
    g.lineBetween(...at(-0.55, -0.55), ...at(0.55, 0.55)).lineBetween(...at(-0.55, 0.55), ...at(0.55, -0.55));
    if (!live) g.fillStyle(INK, 0.5).fillPoints(ring(SCREW_R * 1.08), true);
  }

  /** Redraw the whole object at the current turn, blocks back to front. */
  drawObject() {
    const g = this.obj.clear();
    // shadow on the floor
    g.fillStyle(INK, 0.22).fillEllipse(this.cx, this.cy + this.S * 1.45, this.S * 4.2, this.S * 0.9);
    this.paintFaces(g, shownFaces(this.st, this.turn));
    this.viewLabel?.setText(`${VIEW_NAMES[this.view]}  ·  ${this.view + 1}/4`);
    if (this.turning) {
      g.setVisible(true);
      this.snap.setVisible(false);
      return;
    }
    // still: bake it, then drop the commands
    this.bake(this.snap, [g]);
    g.clear();
    this.snap.setVisible(true);
  }

  rotate(dir: 1 | -1) {
    if (this.turning || this.ended) return;
    this.turning = true;
    sfx.pickup();
    const from = this.turn, to = this.turn + dir;
    const o = { t: from };
    this.tweens.add({
      targets: o,
      t: to,
      duration: TURN_MS,
      ease: 'Cubic.InOut',
      onUpdate: () => {
        this.turn = o.t;
        this.drawObject();
      },
      onComplete: () => {
        this.view = ((((to % 4) + 4) % 4) as View);
        // snapped: draw at exactly the view the model tests taps at
        this.turn = this.view;
        this.turning = false;
        sfx.snap();
        this.drawObject();
      },
    });
  }

  // ---- boxes, row, helpers ----
  boxX = (slot: number) => 150 + slot * 220;
  boxY = 190;
  prevX = (k: number) => 534 + k * 104;
  rowY = 336;
  get rowN() {
    return this.st.rules.dock;
  }
  rowX = (i: number) => W / 2 + (i - (this.rowN - 1) / 2) * Math.min(96, (W - 80) / this.rowN);
  barY = H - 74;
  barX = (i: number) => W / 2 + (i - 1) * 228;

  screwSprite(color: number, scale = 1) {
    const c = this.add.container(0, 0);
    if (this.textures.exists('sy_screw')) {
      const im = this.add.image(0, 0, 'sy_screw').setTint(color);
      im.setScale((50 * scale) / im.width);
      c.add(im);
      return c;
    }
    const g = this.add.graphics();
    g.fillStyle(INK, 1).fillCircle(0, 3, 24 * scale);
    g.fillStyle(color, 1).fillCircle(0, 0, 21 * scale);
    g.fillStyle(0xffffff, 0.35).fillCircle(-6 * scale, -7 * scale, 7 * scale);
    g.lineStyle(5 * scale, INK, 0.85).lineBetween(-10 * scale, -10 * scale, 10 * scale, 10 * scale).lineBetween(-10 * scale, 10 * scale, 10 * scale, -10 * scale);
    c.add(g);
    return c;
  }

  drawBox(x: number, y: number, s: number, color: number | null, n: number) {
    const g = this.add.graphics();
    this.ui.add(g);
    g.lineStyle(10 * s, INK, 1).strokeRoundedRect(x - 44 * s, y - 74 * s, 88 * s, 40 * s, 12 * s);
    g.fillStyle(INK, 1).fillRoundedRect(x - 100 * s, y - 46 * s, 200 * s, 92 * s, 20 * s);
    if (color === null) return;
    g.fillStyle(SCREW_COLORS[color], 1).fillRoundedRect(x - 94 * s, y - 40 * s, 188 * s, 80 * s, 16 * s);
    for (let k = 0; k < BOX_SIZE; k++) {
      g.fillStyle(INK, 0.55).fillCircle(x + (k - 1) * 58 * s, y, 23 * s);
      if (k < n) this.ui.add(this.screwSprite(SCREW_COLORS[color], 0.9 * s).setPosition(x + (k - 1) * 58 * s, y));
    }
  }

  drawUi() {
    this.ui.removeAll(true);
    this.live.clear();
    const st = this.st;
    const txt = (x: number, y: number, t: string, size: number, color = '#fff0cf') => this.ui.add(this.add.text(x, y, t, { fontFamily: 'Lilita One, Arial Black', fontSize: `${size}px`, color, backgroundColor: '#2b1d2e', padding: { x: 10, y: 2 } }).setOrigin(0.5));
    st.boxes.forEach((b, slot) => this.drawBox(this.boxX(slot), this.boxY, 1, b ? b.color : null, b ? b.n : 0));
    const pv = previewColors(st);
    txt((this.prevX(0) + this.prevX(1)) / 2, this.boxY - 62, 'NEXT', 22, '#ffcf33');
    for (let k = 0; k < 2; k++) this.drawBox(this.prevX(k), this.boxY + 4, 0.44, k < pv.length ? pv[k] : null, 0);
    const left = st.lvl.queue.length - st.qi + st.boxes.filter(Boolean).length;
    txt((this.boxX(0) + this.boxX(1)) / 2, this.boxY + 70, left ? `${left} BOXES TO GO` : 'DONE!', 20);
    // the holding row
    const N = this.rowN;
    const step = Math.min(96, (W - 80) / N);
    const g = this.add.graphics();
    this.ui.add(g);
    g.fillStyle(INK, 0.85).fillRoundedRect(W / 2 - (N * step) / 2 - 12, this.rowY - 44, N * step + 24, 88, 22);
    for (let i = 0; i < N; i++) {
      const x = this.rowX(i);
      g.fillStyle(0x000000, 0.35).fillCircle(x, this.rowY, 32);
      const c = st.tray[i];
      if (c === undefined) continue;
      this.ui.add(this.screwSprite(SCREW_COLORS[c]).setPosition(x, this.rowY));
      // AUTO_JUMP off: a row screw that fits an open box pulses (tap it)
      if (!st.rules.autoPull && st.boxes.some((b) => b && b.color === c && b.n < BOX_SIZE)) {
        const ring = this.add.graphics().lineStyle(6, 0x8ef08a, 1).strokeCircle(x, this.rowY, 34);
        this.ui.add(ring);
        this.live.add(ring);
        this.tweens.add({ targets: ring, alpha: 0.35, duration: 420, yoyo: true, repeat: -1 });
      }
    }
    const used = st.tray.length;
    if (used >= N - 1 && used > 0) {
      g.lineStyle(6, 0xe8452c, 1).strokeRoundedRect(W / 2 - (N * step) / 2 - 16, this.rowY - 48, N * step + 32, 96, 24);
      txt(W / 2, this.rowY + 64, used >= N ? 'ROW FULL!' : '1 SLOT LEFT: THE NEXT MISS LOSES!', 22, '#ff8a6a');
    } else txt(W / 2, this.rowY + 64, `HOLDING ROW  ·  ${used}/${N}  ·  full = lost`, 20);
    // Broom's side tray: waiting screws that drop into boxes later
    if (st.stash.length) {
      txt(W / 2 - 150, this.rowY + 104, 'SIDE TRAY', 18, '#ffcf33');
      st.stash.forEach((c, i) => this.ui.add(this.screwSprite(SCREW_COLORS[c], 0.5).setPosition(W / 2 - 70 + i * 30, this.rowY + 104)));
    }
    this.bake(this.topSnap, [...this.topStatic, ...(this.ui.list as Bakeable[])]);
  }

  drawBar() {
    this.bar.removeAll(true);
    const COPY: Record<Helper, [string, string]> = { broom: ['BROOM', 'row → side tray'], hammer: ['HAMMER', 'break a block'], drill: ['DRILL', '+1 row slot'] };
    HELPERS.forEach((k, i) => {
      const x = this.barX(i), y = this.barY;
      const have = this.st.helpers[k];
      const armed = k === 'hammer' && this.hammerArmed;
      const g = this.add.graphics();
      g.fillStyle(INK, 0.92).fillRoundedRect(x - 104, y - 46, 208, 92, 22);
      g.fillStyle(armed ? 0xe0a020 : have ? 0x5fbf4a : 0x6a5a6a, 1).fillRoundedRect(x - 98, y - 40, 196, 80, 18);
      const name = this.add.text(x - 14, y - 12, COPY[k][0], { fontFamily: 'Lilita One, Arial Black', fontSize: '28px', color: have ? '#ffffff' : '#bfb0bf' }).setOrigin(0.5);
      const sub = this.add.text(x - 14, y + 20, armed ? 'TAP A BLOCK' : COPY[k][1], { fontFamily: 'Arial', fontStyle: 'bold', fontSize: '17px', color: have ? '#fff0cf' : '#bfb0bf' }).setOrigin(0.5);
      const badge = this.add.graphics().fillStyle(have ? 0xe8452c : 0x3b2533, 1).fillCircle(x + 80, y - 34, 20).lineStyle(3, 0xfff0cf, 1).strokeCircle(x + 80, y - 34, 20);
      const cnt = this.add.text(x + 80, y - 34, String(have), { fontFamily: 'Lilita One, Arial Black', fontSize: '24px', color: '#ffffff' }).setOrigin(0.5);
      const hit = this.add.zone(x, y, 208, 92).setInteractive({ useHandCursor: true });
      hit.on('pointerup', () => this.onHelper(k));
      this.bar.add([g, name, sub, badge, cnt, hit]);
    });
    this.bake(this.botSnap, [...this.botStatic, ...(this.bar.list as Bakeable[])]);
  }

  // ---- input ----
  /** What a tap here does (the model's screenPick: the screw on the front-most painted face under the finger). */
  pick(x: number, y: number) {
    const u = this.toUnits(x, y);
    return screenPick(this.st, this.view, u.x, u.y);
  }
  /** The screw a tap here takes, or null. */
  pickScrew(x: number, y: number) {
    return this.pick(x, y).sid;
  }

  /** The front-most block face under the finger, or -1. */
  pickBlock(x: number, y: number) {
    const u = this.toUnits(x, y);
    return faceUnder(shownFaces(this.st, this.turn), u.x, u.y)?.block ?? -1;
  }

  /** Screen position of a screw + whether a tap there takes it in this view (QA scripts). */
  screwAt(id: number) {
    const s = this.project(screwSpot3(this.st.lvl, id));
    return { x: s.x, y: s.y, free: reachable(this.st, id, this.view) };
  }

  rowAt(x: number, y: number) {
    if (Math.abs(y - this.rowY) > 46) return -1;
    for (let i = 0; i < this.st.tray.length; i++) if (Math.abs(x - this.rowX(i)) < 44) return i;
    return -1;
  }

  onTap(x: number, y: number) {
    if (this.ended || this.turning) return;
    const ri = this.rowAt(x, y);
    if (ri >= 0) return this.onRow(ri);
    if (this.hammerArmed) {
      const bid = this.pickBlock(x, y);
      if (bid >= 0) this.hammer(bid);
      return;
    }
    const pk = this.pick(x, y);
    const sid = pk.sid;
    if (sid === null) {
      // never a silent no-op on the object
      if (pk.reason) sfx.invalid();
      if (pk.reason === 'away') this.say(`TURN IT TO REACH THAT ONE`, '#ffcf33');
      else if (pk.reason === 'blocked') this.say(`A BLOCK IS IN FRONT OF IT`, '#ff8a6a');
      else if (pk.reason === 'bare') this.say(`TAP A BRIGHT SCREW`, '#ffcf33');
      return;
    }
    const before = this.screwAt(sid);
    const r = tapScrew(this.st, sid, this.view);
    if (!r.ok) {
      sfx.invalid();
      if (r.reason === 'away') this.say(`TURN IT TO REACH THAT ONE`, '#ffcf33');
      else if (r.reason === 'blocked') this.say(`A BLOCK IS IN FRONT OF IT`, '#ff8a6a');
      return;
    }
    sfx.click();
    this.drawObject();
    this.flyFrom(before.x, before.y, this.st.lvl.screws[sid].color, r, r.to === 'box' ? r.box! : -1);
  }

  onRow(i: number) {
    const c = this.st.tray[i];
    const r = tapRow(this.st, i);
    if (!r.ok) {
      sfx.invalid();
      if (this.st.rules.autoPull) this.say('IT JUMPS IN WHEN ITS BOX OPENS', '#ffcf33');
      else this.say('NO OPEN BOX FOR IT YET', '#ff8a6a');
      return;
    }
    sfx.click();
    this.flyFrom(this.rowX(i), this.rowY, c, r, r.box!);
  }

  /** A screw spins out at (x, y) and flies to its box (slot) or the row (slot -1); the UI redraws when it lands. */
  flyFrom(x: number, y: number, color: number, r: ObjTap, slot: number, delay = 0) {
    const sv = this.screwSprite(SCREW_COLORS[color]).setPosition(x, y).setDepth(50).setScale(0.8);
    const to = slot >= 0 ? { x: this.boxX(slot), y: this.boxY } : { x: this.rowX(Math.max(0, this.st.tray.length - 1)), y: this.rowY };
    this.tweens.chain({
      targets: sv,
      delay,
      tweens: [
        { angle: -540, scale: 1.25, duration: 200, ease: 'Quad.Out' },
        { x: to.x, y: to.y, scale: 1, duration: 260, ease: 'Cubic.In' },
      ],
      onComplete: () => {
        sv.destroy();
        this.afterMove(r);
      },
    });
    this.fall(r.fell);
  }

  /** Fallen blocks drop with a bounce and a clatter, then slide off. */
  fall(blocks: number[]) {
    for (const bid of blocks) {
      const g = this.add.graphics().setDepth(30);
      this.paintFaces(g, blockFaces(this.st, bid, this.turn, true));
      const floor = this.cy + this.S * 1.45 - this.project(this.bpos(bid)).y;
      sfx.panelBreak(0);
      this.tweens.chain({
        targets: g,
        tweens: [
          { y: Math.max(40, floor), duration: 420, ease: 'Bounce.Out', onComplete: () => sfx.scrap() },
          { x: (this.bpos(bid)[0] >= 0 ? 1 : -1) * 520, alpha: 0, angle: this.bpos(bid)[0] >= 0 ? 25 : -25, duration: 420, delay: 160, ease: 'Quad.In' },
        ],
        onComplete: () => g.destroy(),
      });
    }
  }

  onHelper(k: Helper) {
    if (this.ended || this.turning) return;
    if (!this.st.helpers[k]) {
      sfx.invalid();
      this.say('NONE LEFT IN THIS YARD', '#ff8a6a');
      return;
    }
    if (k === 'hammer') {
      this.hammerArmed = !this.hammerArmed;
      if (this.hammerArmed) this.say('TAP A BLOCK TO BREAK IT', '#ffcf33');
      this.drawBar();
      return;
    }
    const r = k === 'broom' ? useBroom(this.st) : useDrill(this.st);
    if (!r.ok) {
      sfx.invalid();
      this.say(k === 'broom' ? 'THE ROW IS EMPTY' : 'NOT NOW', '#ff8a6a');
      return;
    }
    sfx.rankUp(3);
    this.say(k === 'broom' ? 'ROW SWEPT TO THE SIDE TRAY' : '+1 ROW SLOT', '#8ef08a');
    this.drawBar();
    this.afterMove(r);
  }

  hammer(bid: number) {
    const r = useHammer(this.st, bid);
    this.hammerArmed = false;
    this.drawBar();
    if (!r.ok) {
      sfx.invalid();
      if (r.reason === 'full') this.say('NO ROOM IN THE ROW FOR ITS SCREWS', '#ff8a6a');
      return;
    }
    sfx.panelBreak(1);
    this.cameras.main.shake(140, 0.006);
    const p = this.project(this.bpos(bid));
    this.drawObject();
    const taken = r.taken ?? [];
    taken.forEach((t, j) => this.flyFrom(p.x, p.y, this.st.lvl.screws[t.id].color, j === taken.length - 1 ? r : { ...r, fell: [], left: [] }, t.to === 'box' ? t.box! : -1, j * 90));
    if (!taken.length) {
      this.fall(r.fell);
      this.afterMove(r);
    }
  }

  afterMove(r: ObjTap) {
    if (r.left.length) sfx.rankUp(4);
    this.drawUi();
    this.drawObject();
    if (this.st.won) this.finish(true);
    else if (this.st.lost) this.finish(false);
  }

  say(text: string, color: string) {
    this.hint.setText(text).setColor(color);
    this.tweens.killTweensOf(this.hint);
    this.hint.setAlpha(1);
    this.time.delayedCall(1500, () => !this.ended && this.hint.setText('Swipe or ◀ ▶ to turn it').setColor('#fff0cf'));
  }

  finish(won: boolean, quit = false) {
    if (this.ended) return;
    this.ended = true;
    if (!quit) {
      const tx = this.add.text(W / 2, this.cy, won ? 'TAKEN APART!' : 'ROW FULL!', { fontFamily: 'Lilita One, Arial Black', fontSize: '56px', color: won ? '#ffcf33' : '#ff684a', stroke: '#2b1d2e', strokeThickness: 12 }).setOrigin(0.5).setDepth(70);
      this.tweens.add({ targets: tx, scale: { from: 0.6, to: 1 }, duration: 300, ease: 'Back.Out' });
      if (won) sfx.star(3);
      else sfx.invalid();
    }
    this.time.delayedCall(quit ? 0 : 1300, () => {
      this.data0.onEnd({ won, quit, moves: this.st.moves });
      this.scene.stop();
    });
  }
}
