// SCREW YARD "A" scene (t-9adea8b8): the turnable object. The model is src/core/screwObject.ts; this
// scene only draws it. Launched by GameScene.startYard when the QA switch SCREW YARD is on OBJECT (GameScene sleeps
// meanwhile); calls onEnd(result) and stops itself.
// Drawing: no 3D engine. Each block is a unit cube rotated about the vertical axis (the snapped view, tweened while
// turning) plus a fixed camera yaw / pitch, projected orthographically and painted back to front, so the front, the
// top and a sliver of the next side show. The projection, the painted faces and the tap test live in the model
// (screwObject.ts "the screen"), so a screw is bright exactly when a tap on it takes it, and the solver agrees.
import Phaser from 'phaser';
import { BOX_SIZE } from '../core/screw';
import { blockFaces, blockPos, faceUnder, floorOffset, HELPERS, newObject, previewColors, projectPt, reachable, SCREW_OUT, SCREW_R, screenPick, screwSpot3, shownFaces, tapRow, tapScrew, turnDir, useBroom, useDrill, useHammer, VIEW_NAMES, type Helper, type ObjectDef, type ObjectState, type ObjTap, type ShownFace, type V3, type View } from '../core/screwObject';
import { H, RS, W } from './GameScene';
import { SCREW_COLORS } from './ScrewScene';
import { sfx } from './audio';
import { UNIT_NAMES, YARD_UNITS, yardReward, yardStars, type YardUnit } from '../content/yardObjects';

const INK = 0x2b1d2e;
const WOOD = [0xc98d4e, 0xb47838];
const LIGHT = norm([-0.45, 0.8, 0.55]);
const TURN_MS = 260;
/** Screw ring segments: full detail in the idle snapshot, fewer while the live redraw runs every turning frame. */
const RING_IDLE = 18;
const RING_TURN = 10;

/** Family stamp per screw colour (0 Cannon red, 1 Coil blue, 2 Bell gold, 3 Support green), in -1..1 head units.
 *  fill = flat x,y,x,y polygons; line = polylines. Other colours get a plain cross. */
type Mark = { fill?: number[][]; line?: number[][] };
const CROSS: Mark = { line: [[-0.45, -0.45, 0.45, 0.45], [-0.45, 0.45, 0.45, -0.45]] };
const MARKS: Mark[] = [
  { fill: [Array.from({ length: 10 }, (_, i) => [Math.cos((i / 10) * Math.PI * 2) * 0.42, Math.sin((i / 10) * Math.PI * 2) * 0.42]).flat()] },
  { line: [[-0.6, 0.35, -0.3, -0.35, 0, 0.35, 0.3, -0.35, 0.6, 0.35]] },
  { fill: [[-0.5, 0.35, -0.38, -0.1, -0.15, -0.42, 0.15, -0.42, 0.38, -0.1, 0.5, 0.35]] },
  { line: [[-0.5, 0, 0.5, 0], [0, -0.5, 0, 0.5]] },
];
const markOf = (c: number) => MARKS[c] ?? CROSS;
const lighten = (c: number, t: number) => {
  const k = Phaser.Display.Color.IntegerToColor(c);
  return Phaser.Display.Color.GetColor(k.red + (255 - k.red) * t, k.green + (255 - k.green) * t, k.blue + (255 - k.blue) * t);
};
const darken = (c: number, t: number) => {
  const k = Phaser.Display.Color.IntegerToColor(c);
  return Phaser.Display.Color.GetColor(k.red * (1 - t), k.green * (1 - t), k.blue * (1 - t));
};
const BOX_W = 200;
const BOX_H = BOX_W * (209 / 360);
const WELLS = [0.217, 0.48, 0.744];
const TRAY_W = 480;
const TRAY_WELLS = [0.118, 0.303, 0.486, 0.671, 0.856];

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
  /** Left from the in-yard result panel with EVENT. */
  event?: boolean;
  /** A cleared unit object (not the crate): 1-3 stars and the cards of THAT unit it pays (granted by the caller). */
  stars?: number;
  reward?: { unit: YardUnit; count: number };
}
export interface ObjectYardData {
  lvl: ObjectDef;
  onEnd: (r: ObjectYardResult) => void;
  /** Fired once when a yard is won or lost (the result panel itself is drawn here, over the yard). */
  onResult?: (r: ObjectYardResult) => void;
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
  snapY = 0;
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
  /** Floor line below the object's centre and shadow width, in block sizes (set from the object's size). */
  floorK = 1.45;
  floorW = 4.2;
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
    this.bakeFx();
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
    // the object fills the space between the row and the turn controls
    const top = 450, bottom = H - 270;
    this.cy = (top + bottom) / 2 + 20;
    const ext = (k: 'x' | 'y') => Math.max(...this.st.lvl.blocks.map((b) => b[k])) - Math.min(...this.st.lvl.blocks.map((b) => b[k]));
    this.floorK = floorOffset(this.st.lvl);
    this.floorW = ext('x') + 1.2;
    this.S = Math.min(150, (bottom - top) / Math.max(3.1, ext('y') + 1.1), (W - 60) / Math.max(4.2, ext('x') + 1.2));
    this.obj = this.add.graphics();
    this.snap = this.band(this.cy - this.S * 3, this.cy + this.S * 2.4);
    this.snapY = this.snap.y;
    // the baked bands sit where their live pieces did in the draw order. Anything still that is not in
    // topStatic / ui / botStatic / bar must be added AFTER the bands (like ✕, the label and the hint) or a band paints over it
    const ty = H - 205;
    this.topSnap = this.band(0, this.rowY + 130);
    this.botSnap = this.band(ty - 60, H);
    const back = this.add.text(56, 56, '✕', { fontFamily: 'Arial', fontSize: '44px', color: '#fff0cf' }).setOrigin(0.5).setDepth(200).setInteractive({ useHandCursor: true });
    back.on('pointerup', () => this.finish(false, true));
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
    // a lost WebGL context (iOS backgrounding) wipes the bands: bake them again once it is back
    const rebake = () => { this.drawObject(); this.drawUi(); this.drawBar(); };
    this.game.renderer.on(Phaser.Renderer.Events.RESTORE_WEBGL, rebake);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.game.renderer.off(Phaser.Renderer.Events.RESTORE_WEBGL, rebake));
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

  /** Glossy screw heads (one per colour, family stamp engraved), a spark and a dust puff: baked once, shared by every redraw. */
  bakeFx() {
    SCREW_COLORS.forEach((col, c) => {
      const key = `oy_screw_${c}`;
      if (this.textures.exists(key)) return;
      const g = this.add.graphics().setVisible(false);
      const R = 64;
      g.fillStyle(INK, 1).fillCircle(R, R, 60);
      g.fillStyle(darken(col, 0.3), 1).fillCircle(R, R, 54);
      g.fillStyle(col, 1).fillCircle(R, R, 46);
      g.fillStyle(lighten(col, 0.3), 1).fillCircle(R - 4, R - 5, 34);
      g.fillStyle(col, 1).fillCircle(R - 2, R - 2, 28);
      g.fillStyle(0xffffff, 0.75).fillEllipse(R - 24, R - 28, 26, 13);
      g.fillStyle(0xffffff, 0.35).fillCircle(R + 26, R + 28, 5);
      const m = markOf(c);
      const S = 26;
      for (const [dx, col2, a] of [[3, 0xffffff, 0.5], [0, INK, 0.9]] as const) {
        g.fillStyle(col2, a).lineStyle(9, col2, a);
        for (const poly of m.fill ?? []) g.fillPoints(poly.reduce<Phaser.Math.Vector2[]>((o, v, i) => (i % 2 ? o : [...o, new Phaser.Math.Vector2(R + dx + v * S, R + dx + poly[i + 1] * S)]), []), true);
        for (const ln of m.line ?? []) for (let i = 0; i + 3 < ln.length; i += 2) g.lineBetween(R + dx + ln[i] * S, R + dx + ln[i + 1] * S, R + dx + ln[i + 2] * S, R + dx + ln[i + 3] * S);
      }
      g.generateTexture(key, 128, 128);
      g.destroy();
    });
    if (!this.textures.exists('oy_spark')) {
      const g = this.add.graphics().setVisible(false);
      const pts: Phaser.Math.Vector2[] = [];
      for (let i = 0; i < 8; i++) pts.push(new Phaser.Math.Vector2(32 + Math.cos((i / 8) * Math.PI * 2) * (i % 2 ? 9 : 30), 32 + Math.sin((i / 8) * Math.PI * 2) * (i % 2 ? 9 : 30)));
      g.fillStyle(0xfff3a0, 1).fillPoints(pts, true).fillStyle(0xffffff, 1).fillCircle(32, 32, 7);
      g.generateTexture('oy_spark', 64, 64);
      g.destroy();
    }
    if (!this.textures.exists('oy_dust')) {
      const g = this.add.graphics().setVisible(false);
      g.fillStyle(0xf3e3c3, 1).fillCircle(32, 32, 26).fillCircle(14, 38, 12).fillCircle(50, 38, 12);
      g.generateTexture('oy_dust', 64, 64);
      g.destroy();
    }
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
    const still = items.filter(o => !o.input && !this.live.has(o) && o.type !== 'Zone');
    // one capture + one blit for the whole band, rather than one per piece
    rt.beginDraw();
    for (const o of still) rt.batchDraw(o.setVisible(true));
    rt.endDraw();
    for (const o of still) o.setVisible(false);
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
      const pal = st.lvl.palette ?? WOOD;
      const base = Phaser.Display.Color.IntegerToColor(pal[b.tint % pal.length]);
      const f = 0.55 + 0.55 * lit;
      g.fillStyle(Phaser.Display.Color.GetColor(Math.min(255, base.red * f), Math.min(255, base.green * f), Math.min(255, base.blue * f)), 1).fillPoints(pts, true);
      // planks: two grain lines + a darker rim
      g.lineStyle(2, INK, 0.18);
      if (!st.lvl.palette) for (const t of [1 / 3, 2 / 3]) g.lineBetween(Phaser.Math.Linear(pts[0].x, pts[3].x, t), Phaser.Math.Linear(pts[0].y, pts[3].y, t), Phaser.Math.Linear(pts[1].x, pts[2].x, t), Phaser.Math.Linear(pts[1].y, pts[2].y, t));
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
    g.fillStyle(darken(col, 0.3), 1).fillPoints(ring(SCREW_R), true);
    g.fillStyle(col, 1).fillPoints(ring(SCREW_R * 0.82), true);
    g.fillStyle(lighten(col, 0.3), 1).fillPoints(ring(SCREW_R * 0.6), true);
    // the family stamp (skipped while the object is turning: the live redraw runs every frame)
    const at = (a: number, b: number) => {
      const s = this.project([c[0] + (u[0] * a + v[0] * b) * SCREW_R, c[1] + (u[1] * a + v[1] * b) * SCREW_R, c[2] + (u[2] * a + v[2] * b) * SCREW_R]);
      return [s.x + off.x, s.y + off.y] as const;
    };
    if (!this.turning) {
      const m = markOf(sc.color);
      const gl = at(-0.45, -0.5);
      g.fillStyle(0xffffff, 0.7).fillEllipse(gl[0], gl[1], Math.max(3, 9 * k), Math.max(2, 5 * k));
      g.fillStyle(INK, 0.85).lineStyle(Math.max(2, 4 * k), INK, 0.85);
      for (const poly of m.fill ?? []) g.fillPoints(poly.reduce<Phaser.Math.Vector2[]>((o, x, i) => (i % 2 ? o : [...o, new Phaser.Math.Vector2(...at(x, poly[i + 1]))]), []), true);
      for (const ln of m.line ?? []) for (let i = 0; i + 3 < ln.length; i += 2) g.lineBetween(...at(ln[i], ln[i + 1]), ...at(ln[i + 2], ln[i + 3]));
    }
    if (!live) g.fillStyle(INK, 0.5).fillPoints(ring(SCREW_R * 1.08), true);
  }

  /** Redraw the whole object at the current turn, blocks back to front. */
  drawObject() {
    const g = this.obj.clear();
    // shadow on the floor
    g.fillStyle(INK, 0.22).fillEllipse(this.cx, this.cy + this.S * this.floorK, this.S * this.floorW, this.S * 0.9);
    this.paintFaces(g, shownFaces(this.st, this.turn));
    // follows the turn while it tweens (the nearest quarter), not only the snapped view
    const shown = ((Math.round(this.turn) % 4) + 4) % 4;
    this.viewLabel?.setText(`${VIEW_NAMES[shown as View]}  ·  ${shown + 1}/4`);
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
  /** The tray art (5 wells) when it fits the row, else a drawn bar. */
  get trayArt() {
    return this.textures.exists('sy_tray') && this.rowN === 5;
  }
  rowX = (i: number) => (this.trayArt ? W / 2 + (TRAY_WELLS[i] - 0.5) * TRAY_W : W / 2 + (i - (this.rowN - 1) / 2) * Math.min(96, (W - 80) / this.rowN));
  barY = H - 74;
  barX = (i: number) => W / 2 + (i - 1) * 228;

  /** A glossy screw head (baked per colour, family stamp engraved), ~50 px at scale 1. */
  screwSprite(color: number, scale = 1) {
    const c = this.add.container(0, 0);
    const im = this.add.image(0, 0, `oy_screw_${Math.max(0, SCREW_COLORS.indexOf(color))}`);
    im.setScale((54 * scale) / im.width);
    c.add(im);
    return c;
  }

  /** The game's open toolbox crate (sy_toolbox_open + brass trim), tinted by its colour, with `n` screws in its wells. */
  boxArt(into: Phaser.GameObjects.Container, x: number, y: number, s: number, color: number | null) {
    const w = BOX_W * s;
    const im = this.add.image(x, y, 'sy_toolbox_open').setScale(w / 360);
    if (color !== null) im.setTint(lighten(SCREW_COLORS[color], 0.5));
    else im.setTint(INK).setAlpha(0.35);
    into.add(im);
    // the art is mid-grey, so a plain tint comes out muddy (gold -> olive): a coloured additive pass brings the paint back
    if (color !== null) into.add(this.add.image(x, y, 'sy_toolbox_open').setScale(w / 360).setTint(SCREW_COLORS[color]).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.3));
    if (color !== null && this.textures.exists('sy_toolbox_open_brass')) into.add(this.add.image(x, y, 'sy_toolbox_open_brass').setDisplaySize(im.displayWidth, im.displayHeight));
  }
  wellX = (x: number, k: number, s = 1) => x + (WELLS[k] - 0.5) * BOX_W * s;
  wellY = (y: number, s = 1) => y + 0.12 * BOX_H * s;

  drawBox(x: number, y: number, s: number, color: number | null, n: number) {
    this.boxArt(this.ui, x, y, s, color);
    if (color === null) return;
    for (let k = 0; k < n; k++) this.ui.add(this.screwSprite(SCREW_COLORS[color], 0.8 * s).setPosition(this.wellX(x, k, s), this.wellY(y, s)));
  }

  drawUi() {
    this.ui.removeAll(true);
    this.live.clear();
    const st = this.st;
    const txt = (x: number, y: number, t: string, size: number, color = '#fff0cf') => this.ui.add(this.add.text(x, y, t, { fontFamily: 'Lilita One, Arial Black', fontSize: `${size}px`, color, backgroundColor: '#2b1d2e', padding: { x: 10, y: 2 } }).setOrigin(0.5));
    st.boxes.forEach((b, slot) => this.drawBox(this.boxX(slot), this.boxY, 1, b ? b.color : null, b ? b.n : 0));
    const pv = previewColors(st);
    txt((this.prevX(0) + this.prevX(1)) / 2, this.boxY - 62, 'NEXT', 22, '#ffcf33');
    for (let k = 0; k < 2; k++) this.drawBox(this.prevX(k), this.boxY + 4, 0.42, k < pv.length ? pv[k] : null, 0);
    const left = st.lvl.queue.length - st.qi + st.boxes.filter(Boolean).length;
    txt((this.boxX(0) + this.boxX(1)) / 2, this.boxY + 70, left ? `${left} BOXES TO GO` : 'DONE!', 20);
    // the holding row
    const N = this.rowN;
    const step = Math.min(96, (W - 80) / N);
    const g = this.add.graphics();
    this.ui.add(g);
    if (this.trayArt) {
      const im = this.add.image(W / 2, this.rowY, 'sy_tray');
      im.setScale(TRAY_W / im.width);
      this.ui.add(im);
    } else g.fillStyle(INK, 0.85).fillRoundedRect(W / 2 - (N * step) / 2 - 12, this.rowY - 44, N * step + 24, 88, 22);
    const g2 = this.add.graphics();
    this.ui.add(g2);
    for (let i = 0; i < N; i++) {
      const x = this.rowX(i);
      if (!this.trayArt) g2.fillStyle(0x000000, 0.35).fillCircle(x, this.rowY, 32);
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
      const hw = this.trayArt ? TRAY_W / 2 + 4 : (N * step) / 2 + 16;
      g2.lineStyle(6, 0xe8452c, 1).strokeRoundedRect(W / 2 - hw, this.rowY - 62, hw * 2, 124, 24);
      txt(W / 2, this.rowY + 64, used >= N ? 'ROW FULL!' : '1 SLOT LEFT: THE NEXT MISS LOSES!', 22, '#ff8a6a');
    } else txt(W / 2, this.rowY + 64, `HOLDING ROW  ·  ${used}/${N}  ·  full = lost`, 20);
    // Broom's side tray: waiting screws that drop into boxes later
    if (st.stash.length) {
      txt(W / 2 - 150, this.rowY + 104, 'SIDE TRAY', 18, '#ffcf33');
      st.stash.forEach((c, i) => this.ui.add(this.screwSprite(SCREW_COLORS[c], 0.5).setPosition(W / 2 - 70 + i * 30, this.rowY + 104)));
    }
    this.bake(this.topSnap, [...this.topStatic, ...(this.ui.list as Bakeable[])]);
  }

  /** Broom / hammer / drill pictures, drawn from rotated polygons (so the bake keeps them). */
  boosterIcon(g: Phaser.GameObjects.Graphics, k: Helper, cx: number, cy: number, on: boolean) {
    const ang = k === 'broom' ? 0.7 : k === 'hammer' ? -0.7 : 0;
    const co = Math.cos(ang), si = Math.sin(ang);
    const Z = 0.74;
    const poly = (fill: number, pts: number[][], a = 1) => {
      const q = pts.map(([x, y]) => new Phaser.Math.Vector2(cx + (x * co - y * si) * Z, cy + (x * si + y * co) * Z));
      g.fillStyle(on ? fill : darken(fill, 0.45), a).fillPoints(q, true).lineStyle(2.5, INK, 1).strokePoints(q, true);
    };
    const rect = (fill: number, x: number, y: number, w: number, h: number) => poly(fill, [[x, y], [x + w, y], [x + w, y + h], [x, y + h]]);
    g.fillStyle(0xffffff, on ? 0.9 : 0.35).fillCircle(cx, cy, 25).lineStyle(4, INK, 1).strokeCircle(cx, cy, 25);
    if (k === 'broom') {
      rect(0x9a6a3a, -3, -26, 6, 26);
      rect(0xb8bec8, -11, -2, 22, 8);
      poly(0xf2c12e, [[-11, 6], [11, 6], [15, 24], [-15, 24]]);
      g.lineStyle(2, INK, 0.6);
      for (const bx of [-6, 0, 6]) g.lineBetween(cx + (bx * co - 8 * si) * Z, cy + (bx * si + 8 * co) * Z, cx + (bx * 1.3 * co - 22 * si) * Z, cy + (bx * 1.3 * si + 22 * co) * Z);
    } else if (k === 'hammer') {
      rect(0xb47838, -3, -8, 7, 34);
      rect(0xc2c8d2, -16, -22, 30, 15);
      poly(0xe8452c, [[-16, -22], [-26, -18], [-26, -11], [-16, -7]]);
    } else {
      poly(0xff8a1f, [[-20, -9], [8, -9], [10, 5], [-20, 5]]);
      rect(0x5a4a5a, -13, 5, 12, 20);
      rect(0xc2c8d2, 8, -4, 16, 6);
      rect(0x5a4a5a, 24, -2, 5, 2);
    }
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
      const icon = this.add.graphics();
      this.boosterIcon(icon, k, x - 74, y + 2, have > 0);
      const name = this.add.text(x + 20, y - 12, COPY[k][0], { fontFamily: 'Lilita One, Arial Black', fontSize: '26px', color: have ? '#ffffff' : '#bfb0bf' }).setOrigin(0.5);
      const sub = this.add.text(x + 20, y + 20, armed ? 'TAP A BLOCK' : COPY[k][1], { fontFamily: 'Arial', fontStyle: 'bold', fontSize: '16px', color: have ? '#fff0cf' : '#bfb0bf' }).setOrigin(0.5);
      const badge = this.add.graphics().fillStyle(have ? 0xe8452c : 0x3b2533, 1).fillCircle(x + 80, y - 34, 20).lineStyle(3, 0xfff0cf, 1).strokeCircle(x + 80, y - 34, 20);
      const cnt = this.add.text(x + 80, y - 34, String(have), { fontFamily: 'Lilita One, Arial Black', fontSize: '24px', color: '#ffffff' }).setOrigin(0.5);
      const hit = this.add.zone(x, y, 208, 92).setInteractive({ useHandCursor: true });
      hit.on('pointerup', () => this.onHelper(k));
      this.bar.add([g, icon, name, sub, badge, cnt, hit]);
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
    this.spark(before.x, before.y, lighten(SCREW_COLORS[this.st.lvl.screws[sid].color], 0.5));
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
      const floor = this.cy + this.S * this.floorK - this.project(this.bpos(bid)).y;
      sfx.panelBreak(0);
      this.tweens.chain({
        targets: g,
        tweens: [
          { y: Math.max(40, floor), duration: 420, ease: 'Bounce.Out', onComplete: () => { sfx.scrap(); this.landFx(this.project(this.bpos(bid)).x, this.cy + this.S * this.floorK); } },
          { x: (this.bpos(bid)[0] >= 0 ? 1 : -1) * 520, alpha: 0, angle: this.bpos(bid)[0] >= 0 ? 25 : -25, duration: 420, delay: 160, ease: 'Quad.In' },
        ],
        onComplete: () => g.destroy(),
      });
    }
  }

  /** A full box shuts its lid with a clack, latches, then lifts away (the next box is already in its place under it). */
  latchBox(slot: number, color: number, delay = 0) {
    const x = this.boxX(slot), y = this.boxY;
    const col = SCREW_COLORS[color];
    const c = this.add.container(x, y).setDepth(60);
    const body = this.add.image(0, 0, 'sy_toolbox_open').setScale(BOX_W / 360).setTint(lighten(col, 0.5));
    c.add([body, this.add.image(0, 0, 'sy_toolbox_open').setScale(BOX_W / 360).setTint(col).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.3)]);
    if (this.textures.exists('sy_toolbox_open_brass')) c.add(this.add.image(0, 0, 'sy_toolbox_open_brass').setDisplaySize(body.displayWidth, body.displayHeight));
    for (let k = 0; k < BOX_SIZE; k++) c.add(this.screwSprite(col, 0.8).setPosition(this.wellX(0, k), this.wellY(0)));
    // the lid hangs from the hinge line and swings down over the wells (scaleY 0 -> 1)
    const hy = -BOX_H * 0.2, lh = BOX_H * 0.62, lw = BOX_W * 0.9;
    const lid = this.add.graphics().setPosition(0, hy).setScale(1, 0);
    lid.fillStyle(INK, 1).fillRoundedRect(-lw / 2 - 4, -4, lw + 8, lh + 8, 14);
    lid.fillStyle(darken(col, 0.1), 1).fillRoundedRect(-lw / 2, 0, lw, lh, 11);
    lid.fillStyle(0xffffff, 0.3).fillRoundedRect(-lw / 2 + 8, 6, lw - 16, 10, 5);
    for (const lx of [-lw * 0.28, lw * 0.28]) lid.fillStyle(INK, 1).fillRoundedRect(lx - 14, lh - 18, 28, 30, 6).fillStyle(0xd9a53a, 1).fillRoundedRect(lx - 10, lh - 14, 20, 22, 4);
    lid.fillStyle(0xd9a53a, 1).fillCircle(-lw / 2 + 12, 12, 7).fillCircle(lw / 2 - 12, 12, 7);
    c.add(lid);
    c.setAlpha(0);
    this.tweens.chain({
      targets: lid,
      tweens: [
        { delay, duration: 1, onStart: () => c.setAlpha(1) },
        { scaleY: 1, duration: 230, ease: 'Back.Out', onComplete: () => { sfx.snap(); this.pulse(c, 1.12); } },
        { duration: 260 },
      ],
      onComplete: () => this.tweens.add({ targets: c, y: y - 110, alpha: 0, scale: 0.7, duration: 320, ease: 'Quad.In', onComplete: () => c.destroy() }),
    });
  }

  /** A quick scale pop (a latch clack, a landing). */
  pulse(o: Phaser.GameObjects.Components.Transform & Phaser.GameObjects.GameObject, to: number) {
    this.tweens.add({ targets: o, scale: to, duration: 70, yoyo: true, ease: 'Quad.Out' });
  }

  /** A few sparks fly off at (x, y) when a screw pops. */
  spark(x: number, y: number, tint = 0xffffff) {
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + Math.random() * 0.5;
      const im = this.add.image(x, y, 'oy_spark').setDepth(55).setScale(0.35).setTint(tint).setBlendMode(Phaser.BlendModes.ADD);
      this.tweens.add({ targets: im, x: x + Math.cos(a) * 46, y: y + Math.sin(a) * 46 - 8, scale: 0, alpha: 0, angle: 90, duration: 380, ease: 'Quad.Out', onComplete: () => im.destroy() });
    }
    const ring = this.add.circle(x, y, 10, 0xffffff, 0).setStrokeStyle(4, 0xffffff, 0.9).setDepth(55);
    this.tweens.add({ targets: ring, scale: 3.2, alpha: 0, duration: 300, ease: 'Quad.Out', onComplete: () => ring.destroy() });
  }

  /** A block lands: a dust puff either side and the object takes a small bump. */
  landFx(x: number, y: number) {
    for (const dir of [-1, 1]) {
      const im = this.add.image(x + dir * 20, y, 'oy_dust').setDepth(31).setScale(0.3).setAlpha(0.8);
      this.tweens.add({ targets: im, x: x + dir * 80, y: y - 14, scale: 1, alpha: 0, duration: 420, ease: 'Quad.Out', onComplete: () => im.destroy() });
    }
    this.tweens.killTweensOf(this.snap);
    this.snap.y = this.snapY;
    this.tweens.add({ targets: this.snap, y: this.snapY + 7, duration: 90, yoyo: true, ease: 'Quad.Out' });
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
    r.left.forEach((l, i) => this.latchBox(l.slot, l.color, i * 160));
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
    if (quit) {
      this.scene.stop();
      this.data0.onEnd({ won, quit, moves: this.st.moves });
      return;
    }
    const tx = this.add.text(W / 2, this.cy, won ? 'TAKEN APART!' : 'ROW FULL!', { fontFamily: 'Lilita One, Arial Black', fontSize: '56px', color: won ? '#ffcf33' : '#ff684a', stroke: '#2b1d2e', strokeThickness: 12 }).setOrigin(0.5).setDepth(70);
    this.tweens.add({ targets: tx, scale: { from: 0.6, to: 1 }, duration: 300, ease: 'Back.Out' });
    if (won) sfx.star(3);
    else {
      sfx.invalid();
      this.cameras.main.shake(260, 0.008);
    }
    this.data0.onResult?.({ won, quit: false, moves: this.st.moves, ...this.prize(won) });
    this.time.delayedCall(1100, () => this.resultPanel(won, tx));
  }

  /** The unit this object is (null: the plain crate) and what a clear pays. */
  prize(won: boolean): { stars?: number; reward?: { unit: YardUnit; count: number } } {
    const unit = YARD_UNITS.find((u) => u === this.st.lvl.id);
    if (!won || !unit) return {};
    const stars = yardStars(this.st.peak);
    return { stars, reward: { unit, count: yardReward(unit, stars) } };
  }

  /** 'CANNON  ·  24 moves', the stars, and the unit's card art with '+3 CANNON CARDS' (x2 on 3 stars). */
  rewardRow(c: Phaser.GameObjects.Container, cx: number, top: number, stars: number, rw: { unit: YardUnit; count: number }, moves: number) {
    const LILITA = 'Lilita One, Arial Black';
    const name = UNIT_NAMES[rw.unit];
    c.add(this.add.text(cx, top + 108, `${name}  ·  ${moves} moves`, { fontFamily: LILITA, fontSize: '28px', color: '#5a3a3a' }).setOrigin(0.5));
    c.add(this.add.text(cx, top + 160, '★'.repeat(stars) + '☆'.repeat(3 - stars), { fontFamily: 'Arial', fontStyle: 'bold', fontSize: '52px', color: '#e0a000' }).setOrigin(0.5));
    const g = this.add.graphics().fillStyle(0xf3d9a4, 1).fillRoundedRect(cx - 220, top + 205, 440, 100, 24).lineStyle(4, INK, 0.5).strokeRoundedRect(cx - 220, top + 205, 440, 100, 24);
    c.add(g);
    const key = `${rw.unit}_1`;
    if (this.textures.exists(key)) {
      const im = this.add.image(cx - 150, top + 255, key);
      im.setScale(84 / Math.max(im.width, im.height));
      c.add(im);
    }
    c.add(this.add.text(cx + 40, top + 244, `+${rw.count} ${name} CARDS`, { fontFamily: LILITA, fontSize: '32px', color: '#3b2533' }).setOrigin(0.5));
    c.add(this.add.text(cx + 40, top + 281, stars >= 3 ? '3 STARS: DOUBLE CARDS!' : '3 STARS = DOUBLE CARDS', { fontFamily: 'Arial', fontStyle: 'bold', fontSize: '19px', color: '#7a5a4a' }).setOrigin(0.5));
  }

  /** The result panel, drawn over the yard (the object stays visible behind a dim). */
  resultPanel(won: boolean, banner: Phaser.GameObjects.Text) {
    banner.destroy();
    const moves = this.st.moves;
    const cx = W / 2, top = H / 2 - 250;
    const dim = this.add.rectangle(W / 2, H / 2, W, H, 0x1a0f1c, 0.55).setDepth(80).setAlpha(0);
    this.tweens.add({ targets: dim, alpha: 1, duration: 200 });
    const c = this.add.container(0, 0).setDepth(81);
    const g = this.add.graphics();
    g.fillStyle(INK, 1).fillRoundedRect(cx - 270, top - 6, 540, 512, 40).fillStyle(0xfff0cf, 1).fillRoundedRect(cx - 262, top, 524, 500, 34);
    c.add(g);
    const prize = this.prize(won);
    const LILITA = 'Lilita One, Arial Black';
    c.add(this.add.text(cx, top + (prize.reward ? 56 : 70), won ? 'TAKEN APART!' : 'ROW FULL!', { fontFamily: LILITA, fontSize: '46px', color: won ? '#e8452c' : '#3b2533' }).setOrigin(0.5));
    if (prize.reward) this.rewardRow(c, cx, top, prize.stars ?? 1, prize.reward, moves);
    else c.add(this.add.text(cx, top + 170, won ? `Every screw out in ${moves} moves.` : 'Turn it and look first: take screws\nwhose box is open or comes NEXT.', { fontFamily: 'Lilita One, Arial Black', fontSize: '26px', color: '#5a3a3a', align: 'center', lineSpacing: 8 }).setOrigin(0.5));
    const by = prize.reward ? 30 : 0;
    const btn = (y: number, w: number, label: string, col: number, fn: () => void) => {
      const bg = this.add.graphics().fillStyle(INK, 1).fillRoundedRect(cx - w / 2 - 5, y - 40, w + 10, 80, 26).fillStyle(col, 1).fillRoundedRect(cx - w / 2, y - 35, w, 70, 22);
      const t = this.add.text(cx, y, label, { fontFamily: 'Lilita One, Arial Black', fontSize: '34px', color: '#ffffff' }).setOrigin(0.5);
      const hit = this.add.zone(cx, y, w, 80).setInteractive({ useHandCursor: true });
      hit.once('pointerup', fn);
      c.add([bg, t, hit]);
    };
    btn(top + 330 + by, 420, won ? 'PLAY AGAIN' : 'TRY AGAIN', 0x5fbf4a, () => this.scene.restart(this.data0));
    btn(top + 430 + by, 260, 'EVENT', 0x8a6a4a, () => {
      this.scene.stop();
      this.data0.onEnd({ won, quit: false, moves, event: true });
    });
    c.setAlpha(0).setY(30);
    this.tweens.add({ targets: c, alpha: 1, y: 0, duration: 240, ease: 'Back.Out' });
  }
}
