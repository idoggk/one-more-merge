import Phaser from 'phaser';
import { FAMILY_INFO, PERKS, TARGET_NAMES } from '../content/perks';
import { COLS, MAX_RANK, ROWS, TICK, TUNING } from '../content/tuning';
import {
  canMerge,
  choosePerk,
  deserialize,
  drop,
  legalPairs,
  newGame,
  odNeeded,
  peekNext,
  previewMerge,
  scrap,
  serialize,
  tick,
  type GameEvent,
  type GameState,
} from '../core/game';
import type { CascadeResult, Gadget, PerkId } from '../core/types';
import { audioSettings, haptic, sfx, unlockAudio } from './audio';
import { ensureTextures, preloadArt } from './textures';

export const W = 720;
export const H = 1280;
const CELL = 124;
const BX = (W - CELL * COLS) / 2;
const BY = 446;
const SPRITE = 108;
const TARGET_Y = 245;
const TRAY_Y = BY + CELL * ROWS + 44;
const SCRAP_X = W - 92;

const SAVE_KEY = 'omm.save.v1';
const META_KEY = 'omm.meta.v1';

interface Meta {
  tutorialDone: boolean;
  bestTime: number | null;
  bestChain: number;
  runs: number;
  wins: number;
  sound: boolean;
  hints: boolean;
}

const cellXY = (idx: number) => ({ x: BX + (idx % COLS) * CELL + CELL / 2, y: BY + Math.floor(idx / COLS) * CELL + CELL / 2 });
const fmt = (n: number) => (n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e4 ? (n / 1e3).toFixed(1) + 'K' : Math.round(n).toLocaleString());

function loadMeta(): Meta {
  const d: Meta = { tutorialDone: false, bestTime: null, bestChain: 0, runs: 0, wins: 0, sound: true, hints: true };
  try {
    return { ...d, ...JSON.parse(localStorage.getItem(META_KEY) || '{}') };
  } catch {
    return d;
  }
}
const store = (k: string, v: string | null) => {
  try {
    if (v === null) localStorage.removeItem(k);
    else localStorage.setItem(k, v);
  } catch {
    /* storage unavailable */
  }
};

type GadgetView = Phaser.GameObjects.Container & { gid: number };

export class GameScene extends Phaser.Scene {
  s!: GameState;
  meta!: Meta;
  views = new Map<number, GadgetView>();
  acc = 0;
  paused = false;

  // drag state
  dragIdx = -1;
  dragId = -1;
  dragView: GadgetView | null = null;
  hoverIdx = -1;
  downAt = { x: 0, y: 0 };
  moved = false;
  selectedIdx = -1;
  scrapHold = 0;

  // ui
  target!: Phaser.GameObjects.Image;
  targetBaseScale = 1;
  hpBar!: Phaser.GameObjects.Graphics;
  hpText!: Phaser.GameObjects.Text;
  shownHp = 0;
  headerText!: Phaser.GameObjects.Text;
  timerText!: Phaser.GameObjects.Text;
  odGauge!: Phaser.GameObjects.Graphics;
  odGlow!: Phaser.GameObjects.Graphics;
  overlayG!: Phaser.GameObjects.Graphics;
  previewText!: Phaser.GameObjects.Text;
  trayIcon!: Phaser.GameObjects.Image;
  trayBadge!: Phaser.GameObjects.Text;
  trayArc!: Phaser.GameObjects.Graphics;
  trayBox!: Phaser.GameObjects.Graphics;
  trayLabel!: Phaser.GameObjects.Text;
  pendingText!: Phaser.GameObjects.Text;
  scrapZone!: Phaser.GameObjects.Container;
  scrapRing!: Phaser.GameObjects.Graphics;
  tutorialText!: Phaser.GameObjects.Text;
  practiceText!: Phaser.GameObjects.Text;
  modal: Phaser.GameObjects.Container | null = null;
  linkG!: Phaser.GameObjects.Graphics;
  sparks!: Phaser.GameObjects.Particles.ParticleEmitter;
  chunks!: Phaser.GameObjects.Particles.ParticleEmitter;
  passiveAcc = 0;
  passiveTimer = 0;
  idleTime = 0;
  hintPair: [number, number] | null = null;
  lastSave = 0;
  tutorialStep = 0;

  constructor() {
    super('game');
  }

  preload() {
    preloadArt(this);
  }

  create() {
    ensureTextures(this);
    if (new URLSearchParams(location.search).has('reset')) {
      store(SAVE_KEY, null);
      store(META_KEY, null);
      history.replaceState(null, '', location.pathname);
    }
    this.meta = loadMeta();
    audioSettings.on = this.meta.sound;
    this.buildStatic();
    const saved = (() => {
      try {
        return localStorage.getItem(SAVE_KEY);
      } catch {
        return null;
      }
    })();
    const loaded = saved ? deserialize(saved) : null;
    if (loaded && (loaded.phase === 'playing' || loaded.phase === 'choice' || loaded.phase === 'tutorial')) this.startState(loaded);
    else this.startState(newGame(Date.now() >>> 0, !this.meta.tutorialDone));

    this.input.on('pointerdown', this.onDown, this);
    this.input.on('pointermove', this.onMove, this);
    this.input.on('pointerup', this.onUp, this);
    this.input.on('pointerupoutside', this.onUp, this);
    this.input.on('gameout', () => this.cancelDrag());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.save();
        this.cancelDrag();
      }
      this.acc = 0;
    });
  }

  // ---------- setup ----------

  buildStatic() {
    if (this.hasArt('slot') && this.textures.get('bg').source[0].height < H) {
      // ChatGPT workbench: sand backdrop, bench anchored under the header, bottom bezel off-screen
      this.add.rectangle(W / 2, H / 2, W, H, 0xf3cf9b);
      this.add.image(W / 2, 62, 'bg').setOrigin(0.5, 0).setDisplaySize(W, 1300);
    } else this.add.image(W / 2, H / 2, 'bg').setDisplaySize(W, H);
    for (let i = 0; i < ROWS * COLS; i++) {
      const { x, y } = cellXY(i);
      this.add.image(x, y, 'slot').setDisplaySize(CELL - 6, CELL - 6);
    }
    this.odGlow = this.add.graphics();
    this.overlayG = this.add.graphics().setDepth(5);
    this.linkG = this.add.graphics().setDepth(30);

    // header
    this.headerText = this.add.text(76, 24, '', { fontFamily: 'Lilita One, Arial Black', fontSize: '34px', color: '#3b2533' });
    this.timerText = this.add.text(W - 28, 22, '', { fontFamily: 'Lilita One, Arial Black', fontSize: '40px', color: '#3b2533' }).setOrigin(1, 0);
    this.odGauge = this.add.graphics();
    this.practiceText = this.add.text(W - 28, 74, 'PRACTICE', { fontFamily: 'Arial Black', fontSize: '18px', color: '#8a6a4a' }).setOrigin(1, 0.5);

    // target
    this.target = this.add.image(W / 2, TARGET_Y, 'target_0');
    this.hpBar = this.add.graphics();
    this.hpText = this.add.text(W / 2, 404, '', { fontFamily: 'Arial Black', fontSize: '22px', color: '#ffffff', stroke: '#2b1d2e', strokeThickness: 5 }).setOrigin(0.5).setDepth(2);

    // tray
    this.trayBox = this.add.graphics().fillStyle(0x8a5a35, 1).fillRoundedRect(BX, TRAY_Y - 38, 240, 76, 22).setDepth(1);
    this.trayLabel = 
    this.add.text(BX + 20, TRAY_Y, 'NEXT', { fontFamily: 'Lilita One, Arial Black', fontSize: '26px', color: '#fbe7c6' }).setOrigin(0, 0.5).setDepth(2);
    this.trayArc = this.add.graphics().setDepth(2);
    this.trayIcon = this.add.image(BX + 150, TRAY_Y, 'cannon_1').setDisplaySize(62, 62).setDepth(2);
    this.trayBadge = this.add.text(BX + 176, TRAY_Y + 18, '', { fontFamily: 'Arial Black', fontSize: '18px', color: '#fff', stroke: '#2b1d2e', strokeThickness: 4 }).setOrigin(0.5).setDepth(3);
    this.pendingText = this.add.text(BX + 250, TRAY_Y, '', { fontFamily: 'Arial Black', fontSize: '20px', color: '#9e2416' }).setOrigin(0, 0.5).setDepth(2);

    // scrap
    const sz = this.add.container(SCRAP_X, TRAY_Y).setDepth(2);
    const sg = this.add.graphics().fillStyle(0x5a4a5a, 1).fillRoundedRect(-62, -38, 124, 76, 22);
    const icon = this.textures.exists('icon_scrap') && this.textures.get('icon_scrap').key !== '__MISSING' ? this.add.image(-24, 0, 'icon_scrap').setDisplaySize(48, 48) : this.add.text(-24, 0, '🗑', { fontSize: '34px' }).setOrigin(0.5);
    const st = this.add.text(18, 0, 'SCRAP', { fontFamily: 'Arial Black', fontSize: '16px', color: '#fbe7c6' }).setOrigin(0.5);
    this.scrapRing = this.add.graphics();
    sz.add([sg, icon, st, this.scrapRing]);
    this.scrapZone = sz;

    this.previewText = this.add.text(0, 0, '', { fontFamily: 'Lilita One, Arial Black', fontSize: '30px', color: '#fff', stroke: '#2b1d2e', strokeThickness: 7 }).setOrigin(0.5).setDepth(60).setVisible(false);
    this.tutorialText = this.add.text(W / 2, TRAY_Y, '', { fontFamily: 'Lilita One, Arial Black', fontSize: '32px', color: '#3b2533', align: 'center' }).setOrigin(0.5).setDepth(40);

    // settings button
    const gear = this.add.text(38, 20, '⏸', { fontSize: '40px', color: '#3b2533' }).setOrigin(0.5, 0).setInteractive({ useHandCursor: true });
    gear.on('pointerdown', (_p: Phaser.Input.Pointer, _x: number, _y: number, e: Phaser.Types.Input.EventData) => {
      e.stopPropagation();
      this.openPause();
    });

    this.sparks = this.add.particles(0, 0, 'spark', {
      speed: { min: 120, max: 420 },
      lifespan: 420,
      scale: { start: 0.8, end: 0 },
      rotate: { min: 0, max: 360 },
      emitting: false,
      blendMode: 'ADD',
    }).setDepth(50);
    this.chunks = this.add.particles(0, 0, 'chunk', {
      speed: { min: 250, max: 650 },
      angle: { min: 200, max: 340 },
      gravityY: 1400,
      lifespan: 1200,
      rotate: { min: 0, max: 360 },
      scale: { min: 0.8, max: 1.8 },
      emitting: false,
    }).setDepth(45);
  }

  startState(s: GameState) {
    this.closeModal();
    for (const v of this.views.values()) v.destroy();
    this.views.clear();
    this.s = s;
    this.acc = 0;
    this.selectedIdx = -1;
    this.idleTime = 0;
    this.tutorialStep = 0;
    this.shownHp = s.hp;
    this.setTargetTexture();
    this.reconcile(true);
    if (s.phase === 'choice') this.time.delayedCall(200, () => this.openChoice());
  }

  setTargetTexture() {
    const key = this.s.target < 0 ? 'demo_can' : `target_${this.s.target}${this.s.thresholds >= 2 && this.hasArt(`target_${this.s.target}_dmg`) ? '_dmg' : ''}`;
    this.target.setTexture(key);
    const tex = this.target.frame;
    this.targetBaseScale = Math.min(270 / tex.width, 260 / tex.height);
    this.target.setScale(this.targetBaseScale).setAngle(0).setAlpha(1).setPosition(W / 2, TARGET_Y);
  }

  hasArt(key: string) {
    return this.textures.exists(key) && this.textures.get(key).source[0]?.width > 1;
  }

  // ---------- gadget views ----------

  makeView(g: Gadget): GadgetView {
    const c = this.add.container(0, 0) as GadgetView;
    c.gid = g.id;
    const img = this.add.image(0, 0, `${g.family}_${g.rank}`);
    const f = img.frame;
    img.setScale(Math.min(SPRITE / f.width, SPRITE / f.height));
    const badge = this.add.graphics();
    const col = FAMILY_INFO[g.family].color;
    badge.fillStyle(0x2b1d2e, 1).fillCircle(38, 38, 17).fillStyle(col, 1).fillCircle(38, 38, 13);
    const label = g.rank >= MAX_RANK ? 'M' : String(g.rank);
    const t = this.add.text(38, 38, label, { fontFamily: 'Arial Black', fontSize: '18px', color: '#fff', stroke: '#2b1d2e', strokeThickness: 4 }).setOrigin(0.5);
    c.add([img, badge, t]);
    c.setSize(CELL, CELL).setDepth(10);
    return c;
  }

  /** Make sprites match the model grid. */
  reconcile(instant = false, spawnFrom?: Map<number, { x: number; y: number }>, mergeInto?: { x: number; y: number }) {
    const live = new Set<number>();
    this.s.grid.forEach((g, idx) => {
      if (!g) return;
      live.add(g.id);
      const { x, y } = cellXY(idx);
      let v = this.views.get(g.id);
      if (!v) {
        v = this.makeView(g);
        this.views.set(g.id, v);
        const from = spawnFrom?.get(g.id);
        if (instant) v.setPosition(x, y);
        else if (from) {
          v.setPosition(from.x, from.y).setScale(0.5);
          this.tweens.add({ targets: v, x, y, scale: 1, duration: 260, ease: 'Back.Out' });
        } else {
          v.setPosition(x, y).setScale(0.2);
          this.tweens.add({ targets: v, scale: 1, duration: 280, ease: 'Back.Out' });
        }
      } else if (v !== this.dragView && (Math.abs(v.x - x) > 1 || Math.abs(v.y - y) > 1)) {
        this.tweens.killTweensOf(v);
        this.tweens.add({ targets: v, x, y, scale: 1, duration: 140, ease: 'Quad.Out' });
      }
    });
    for (const [id, v] of this.views) {
      if (live.has(id)) continue;
      this.views.delete(id);
      if (v === this.dragView) this.dragView = null;
      this.tweens.killTweensOf(v);
      if (mergeInto) this.tweens.add({ targets: v, x: mergeInto.x, y: mergeInto.y, scale: 0.6, alpha: 0, duration: 110, onComplete: () => v.destroy() });
      else this.tweens.add({ targets: v, scale: 0, alpha: 0, duration: 150, onComplete: () => v.destroy() });
    }
  }

  // ---------- input ----------

  cellAt(x: number, y: number) {
    const c = Math.floor((x - BX) / CELL);
    const r = Math.floor((y - BY) / CELL);
    return c >= 0 && c < COLS && r >= 0 && r < ROWS ? r * COLS + c : -1;
  }
  overScrap(x: number, y: number) {
    return Math.abs(x - SCRAP_X) < 70 && Math.abs(y - TRAY_Y) < 50;
  }
  canAct() {
    return !this.modal && !this.paused && (this.s.phase === 'playing' || this.s.phase === 'tutorial');
  }

  onDown(p: Phaser.Input.Pointer) {
    unlockAudio();
    if (!this.canAct()) return;
    const idx = this.cellAt(p.x, p.y);
    if (idx < 0 || !this.s.grid[idx]) {
      if (this.selectedIdx >= 0 && idx >= 0) return; // handled on up (move to empty)
      if (this.selectedIdx >= 0 && this.overScrap(p.x, p.y)) return;
      return;
    }
    this.dragIdx = idx;
    this.dragId = this.s.grid[idx]!.id;
    this.dragView = this.views.get(this.dragId) ?? null;
    this.downAt = { x: p.x, y: p.y };
    this.moved = false;
    this.scrapHold = 0;
    this.idleTime = 0;
  }

  onMove(p: Phaser.Input.Pointer) {
    if (this.dragIdx < 0 || !this.dragView || !p.isDown) return;
    if (!this.moved && Phaser.Math.Distance.Between(p.x, p.y, this.downAt.x, this.downAt.y) < 12) return;
    if (!this.moved) {
      this.moved = true;
      this.selectedIdx = -1;
      sfx.pickup();
      this.dragView.setDepth(55);
      this.tweens.killTweensOf(this.dragView);
      this.tweens.add({ targets: this.dragView, scale: 1.15, duration: 80 });
    }
    this.dragView.setPosition(p.x, p.y - 40);
    const h = this.cellAt(p.x, p.y);
    if (h !== this.hoverIdx) {
      this.hoverIdx = h;
      this.drawHeld();
    }
    if (this.overScrap(p.x, p.y) !== (this.scrapHold > 0 || this.overScrapFlag)) {
      this.overScrapFlag = this.overScrap(p.x, p.y);
      this.scrapHold = 0;
    }
  }
  overScrapFlag = false;

  onUp(p: Phaser.Input.Pointer) {
    if (!this.canAct()) {
      this.cancelDrag();
      return;
    }
    const upIdx = this.cellAt(p.x, p.y);
    // tap-to-select flow
    if (this.dragIdx >= 0 && !this.moved) {
      const tapped = this.dragIdx;
      this.dragIdx = -1;
      this.dragView = null;
      if (this.selectedIdx >= 0 && this.selectedIdx !== tapped) {
        const from = this.selectedIdx;
        this.selectedIdx = -1;
        this.commitDrop(from, tapped, this.s.grid[from]?.id ?? -1);
      } else {
        this.selectedIdx = this.selectedIdx === tapped ? -1 : tapped;
        if (this.selectedIdx >= 0) sfx.pickup();
      }
      this.drawHeld();
      return;
    }
    if (this.dragIdx < 0) {
      if (this.selectedIdx >= 0) {
        if (upIdx >= 0) {
          const from = this.selectedIdx;
          this.selectedIdx = -1;
          this.commitDrop(from, upIdx, this.s.grid[from]?.id ?? -1);
        } else if (this.overScrap(p.x, p.y) && this.s.phase === 'playing') {
          const from = this.selectedIdx;
          this.selectedIdx = -1;
          this.doScrap(from, this.s.grid[from]?.id ?? -1);
        } else this.selectedIdx = -1;
        this.drawHeld();
      }
      return;
    }
    const from = this.dragIdx;
    const id = this.dragId;
    const view = this.dragView;
    this.dragIdx = -1;
    this.hoverIdx = -1;
    if (view) view.setDepth(10);
    if (this.overScrap(p.x, p.y) && this.s.phase === 'playing') {
      const g = this.s.grid[from];
      const needsHold = g && g.rank >= 3;
      if (!needsHold || this.scrapHold >= 0.25) this.doScrap(from, id);
      else this.snapBack(view, from);
    } else if (upIdx >= 0 && upIdx !== from) {
      if (!this.commitDrop(from, upIdx, id)) this.snapBack(view, from);
    } else this.snapBack(view, from);
    this.dragView = null;
    this.scrapHold = 0;
    this.overScrapFlag = false;
    this.drawHeld();
  }

  snapBack(view: GadgetView | null, idx: number) {
    if (!view) return;
    const { x, y } = cellXY(idx);
    this.tweens.add({ targets: view, x, y, scale: 1, duration: 160, ease: 'Back.Out' });
  }

  cancelDrag() {
    if (this.dragIdx >= 0) this.snapBack(this.dragView, this.dragIdx);
    if (this.dragView) this.dragView.setDepth(10);
    this.dragIdx = -1;
    this.dragView = null;
    this.hoverIdx = -1;
    this.drawHeld();
  }

  commitDrop(from: number, to: number, id: number): boolean {
    const a = this.s.grid[from];
    const b = this.s.grid[to];
    const merging = canMerge(a, b);
    const res = drop(this.s, from, to, id);
    if (!res.ok) {
      sfx.invalid();
      return false;
    }
    this.idleTime = 0;
    this.hintPair = null;
    if (merging) {
      this.reconcile(false, undefined, cellXY(to));
      const nv = this.views.get(this.s.grid[to]!.id);
      if (nv) {
        nv.setScale(1.45);
        this.tweens.add({ targets: nv, scale: 1, duration: 260, ease: 'Back.Out' });
      }
      sfx.merge(this.s.grid[to]!.rank);
      haptic(15);
      if (this.s.phase === 'tutorial' || this.tutorialStep < 2) this.tutorialStep++;
    } else {
      sfx.drop();
      this.reconcile();
    }
    this.handleEvents(res.events);
    this.save();
    return true;
  }

  doScrap(idx: number, id: number) {
    const res = scrap(this.s, idx, id);
    if (!res.ok) return;
    sfx.scrap();
    const v = this.views.get(id);
    if (v) {
      this.views.delete(id);
      this.tweens.add({ targets: v, x: SCRAP_X, y: TRAY_Y, scale: 0, angle: 180, duration: 220, onComplete: () => v.destroy() });
    }
    this.handleEvents(res.events);
  }

  /** Highlights for held/selected piece: matching double-rings + live cascade preview. */
  drawHeld() {
    const g = this.overlayG.clear();
    this.previewText.setVisible(false);
    const src = this.dragIdx >= 0 && this.moved ? this.dragIdx : this.selectedIdx;
    if (src >= 0 && this.s.grid[src]) {
      const a = this.s.grid[src]!;
      const { x: sx, y: sy } = cellXY(src);
      g.lineStyle(6, 0xffffff, 0.9).strokeRoundedRect(sx - CELL / 2 + 6, sy - CELL / 2 + 6, CELL - 12, CELL - 12, 20);
      this.s.grid.forEach((b, i) => {
        if (i === src || !canMerge(a, b)) return;
        const { x, y } = cellXY(i);
        g.lineStyle(5, 0xffffff, 1).strokeCircle(x, y, 54).lineStyle(3, FAMILY_INFO[a.family].color, 1).strokeCircle(x, y, 46);
      });
      const hov = this.dragIdx >= 0 ? this.hoverIdx : -1;
      if (hov >= 0 && hov !== src && canMerge(a, this.s.grid[hov])) {
        const p = previewMerge(this.s, src, hov)!;
        for (const act of p.activations) {
          if (act.idx === hov) continue;
          const { x, y } = cellXY(act.idx);
          g.fillStyle(0xfff3a0, 0.35).fillRoundedRect(x - CELL / 2 + 8, y - CELL / 2 + 8, CELL - 16, CELL - 16, 18);
        }
        const { x, y } = cellXY(hov);
        this.previewText.setText(`${p.count} FIRE`).setPosition(x, y - 78).setVisible(true);
      }
    }
    if (this.hintPair && src < 0) {
      for (const i of this.hintPair) {
        const { x, y } = cellXY(i);
        const t = (this.time.now % 1000) / 1000;
        g.lineStyle(5, 0xffffff, 0.5 + 0.5 * Math.sin(t * Math.PI * 2)).strokeCircle(x, y, 56);
      }
    }
  }

  // ---------- simulation loop ----------

  update(_t: number, dms: number) {
    if (!this.paused && !this.modal) {
      this.acc += Math.min(dms, 250) / 1000;
      while (this.acc >= TICK) {
        this.acc -= TICK;
        const reserved = new Set<number>();
        if (this.dragIdx >= 0) reserved.add(this.dragIdx);
        if (this.hoverIdx >= 0) reserved.add(this.hoverIdx);
        const ev = tick(this.s, reserved);
        if (ev.length) this.handleEvents(ev);
        if (this.modal) break;
      }
      if (this.dragIdx >= 0 && this.moved && this.overScrapFlag) this.scrapHold += dms / 1000;
      if (this.s.phase === 'playing') this.idleTime += dms / 1000;
    }
    this.updateHints();
    this.drawHud(dms);
    if (this.time.now - this.lastSave > 2000) this.save();
  }

  updateHints() {
    if (this.s.phase === 'tutorial') {
      const dist = ([a, b]: [number, number]) => Math.abs((a % COLS) - (b % COLS)) + Math.abs(Math.floor(a / COLS) - Math.floor(b / COLS));
      const pairs = legalPairs(this.s).sort((p, q) => dist(p) - dist(q));
      const cannonPair = pairs.find(([a]) => this.s.grid[a]!.family === 'cannon');
      const relayPair = pairs.find(([a]) => this.s.grid[a]!.family !== 'cannon');
      this.hintPair = this.s.tutorialMerges === 0 ? (cannonPair ?? pairs[0] ?? null) : (relayPair ?? pairs[0] ?? null);
      this.tutorialText.setText(this.s.tutorialMerges === 0 ? 'Drag matching gadgets together!' : 'Bigger relays reach farther!');
      this.drawHeld();
      return;
    }
    this.tutorialText.setText('');
    if (!this.meta.hints || this.s.phase !== 'playing') return;
    if (this.idleTime > 4 && !this.hintPair && this.dragIdx < 0 && this.selectedIdx < 0) {
      const pairs = legalPairs(this.s);
      if (pairs.length) this.hintPair = pairs[0];
    }
    if (this.hintPair) {
      const [a, b] = this.hintPair;
      if (!canMerge(this.s.grid[a], this.s.grid[b])) this.hintPair = null;
      this.drawHeld();
    }
  }

  drawHud(dms: number) {
    const s = this.s;
    const demo = s.target < 0;
    this.headerText.setText(demo ? 'WARM-UP' : `${Math.min(s.target + 1, 3)}/3 ${TARGET_NAMES[Math.min(s.target, 2)]}`);
    const t = Math.ceil(s.timeLeft);
    this.timerText.setText(demo ? '' : `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`);
    this.timerText.setColor(s.timeLeft < 15 && !demo ? '#d8261a' : '#3b2533');
    this.practiceText.setVisible(s.practice && !demo);

    // smooth HP
    this.shownHp += (s.hp - this.shownHp) * Math.min(1, dms / 120);
    const frac = Math.max(0, this.shownHp / s.maxHp);
    const bw = 440;
    const hb = this.hpBar.clear();
    hb.fillStyle(0x2b1d2e, 1).fillRoundedRect(W / 2 - bw / 2 - 5, 386, bw + 10, 36, 18);
    hb.fillStyle(0x5a4a5a, 1).fillRoundedRect(W / 2 - bw / 2, 391, bw, 26, 13);
    if (frac > 0) hb.fillStyle(frac > 0.5 ? 0x5fd35f : frac > 0.25 ? 0xf2b521 : 0xe8452c, 1).fillRoundedRect(W / 2 - bw / 2, 391, Math.max(26, bw * frac), 26, 13);
    this.hpText.setText(fmt(Math.max(0, s.hp)));

    // overdrive gauge
    const og = this.odGauge.clear();
    const need = odNeeded(s);
    const gx = W - 200 - need * 26;
    const active = s.odLeft > 0;
    for (let i = 0; i < (demo ? 0 : need); i++) {
      const filled = active || i < s.odCharge;
      og.fillStyle(0x2b1d2e, 1).fillRoundedRect(gx + i * 26, 30, 22, 30, 6);
      og.fillStyle(filled ? (active ? 0xff6a00 : 0xffcf33) : 0x7a6a6a, 1).fillRoundedRect(gx + i * 26 + 3, 33, 16, 24, 4);
    }
    const glow = this.odGlow.clear();
    if (active) {
      const a = 0.35 + 0.25 * Math.sin(this.time.now / 90);
      glow.lineStyle(14, 0xff6a00, a).strokeRoundedRect(BX - 14, BY - 14, CELL * COLS + 28, CELL * ROWS + 28, 30);
    }

    // tray
    const nxt = peekNext(s);
    this.trayIcon.setTexture(`${nxt.family}_${nxt.rank}`);
    const f = this.trayIcon.frame;
    this.trayIcon.setScale(Math.min(62 / f.width, 62 / f.height));
    this.trayBadge.setText(nxt.rank > 1 ? String(nxt.rank) : '');
    const ta = this.trayArc.clear();
    const prog = s.pending.length >= TUNING.maxPending ? 1 : 1 - s.supplyTimer / TUNING.supplyPeriod;
    ta.lineStyle(6, 0xfbe7c6, 0.9).beginPath().arc(BX + 150, TRAY_Y, 38, -Math.PI / 2, -Math.PI / 2 + prog * Math.PI * 2).strokePath();
    this.pendingText.setText(s.pending.length ? `+${s.pending.length} waiting` : '');
    const tut = s.phase === 'tutorial';
    this.scrapZone.setVisible(!tut);
    for (const o of [this.trayBox, this.trayLabel, this.trayIcon, this.trayBadge, this.trayArc, this.pendingText]) o.setVisible(!tut);
    const sr = this.scrapRing.clear();
    if (this.dragIdx >= 0 && this.overScrapFlag) {
      const g = s.grid[this.dragIdx];
      const need2 = g && g.rank >= 3 ? 0.25 : 0;
      const p = need2 ? Math.min(1, this.scrapHold / need2) : 1;
      sr.lineStyle(6, 0xff5533, 1).beginPath().arc(0, 0, 50, -Math.PI / 2, -Math.PI / 2 + p * Math.PI * 2).strokePath();
    }
  }

  // ---------- events → presentation ----------

  handleEvents(events: GameEvent[]) {
    const spawn = new Map<number, { x: number; y: number }>();
    let needReconcile = false;
    for (const e of events) {
      switch (e.type) {
        case 'cascade':
          this.playCascade(e.result, e.overdriveStart, e.kickback);
          break;
        case 'shot':
          this.playPassiveShot(e.idx, e.damage);
          break;
        case 'delivery':
          spawn.set(e.gadget.id, { x: BX + 150, y: TRAY_Y });
          needReconcile = true;
          sfx.delivery();
          break;
        case 'move':
          break;
        case 'kickbackIncoming':
          this.chunks.explode(10, this.target.x, this.target.y);
          break;
        case 'kickback': {
          spawn.set(e.gadget.id, { x: this.target.x + Phaser.Math.Between(-60, 60), y: this.target.y });
          sfx.kickback();
          if (e.into >= 0) {
            // falling part slams into its lonely match
            const land = cellXY(e.idx);
            const into = cellXY(e.into);
            const part = this.add.image(this.target.x, this.target.y, `${e.gadget.family}_${e.gadget.rank - 1}`).setDepth(56);
            part.setScale(Math.min(80 / part.width, 80 / part.height));
            this.tweens.add({
              targets: part,
              x: land.x,
              y: land.y,
              angle: 540,
              duration: 260,
              ease: 'Quad.In',
              onComplete: () => this.tweens.add({ targets: part, x: into.x, y: into.y, duration: 90, onComplete: () => part.destroy() }),
            });
            this.floatText(into.x, into.y - 60, 'KICKBACK!', '#ffcf33', 30);
          }
          needReconcile = true;
          break;
        }
        case 'threshold':
          this.chunks.explode(18, this.target.x, this.target.y - 40);
          this.cameras.main.shake(140, 0.006);
          if (e.level >= 2) this.setTargetTexture();
          break;
        case 'kill':
          this.playKill(e.final, e.demo);
          break;
        case 'newTarget':
          this.introTarget();
          break;
        case 'overdriveEnd':
          break;
        case 'scrap':
          needReconcile = true;
          break;
        case 'end':
          this.time.delayedCall(e.won ? 900 : 300, () => this.openResult(e.won));
          break;
      }
    }
    if (needReconcile) this.reconcile(false, spawn);
    if (this.s.phase === 'choice' && !this.modal && events.some((e) => e.type === 'kill' && !e.final && !e.demo)) {
      this.time.delayedCall(450, () => this.openChoice());
    }
  }

  floatText(x: number, y: number, text: string, color = '#ffffff', size = 34) {
    const t = this.add.text(x, y, text, { fontFamily: 'Lilita One, Arial Black', fontSize: `${size}px`, color, stroke: '#2b1d2e', strokeThickness: 7 }).setOrigin(0.5).setDepth(70);
    this.tweens.add({ targets: t, y: y - 70, alpha: 0, duration: 900, ease: 'Quad.Out', onComplete: () => t.destroy() });
    return t;
  }

  hitTarget(big: boolean) {
    this.tweens.killTweensOf(this.target);
    const s = this.targetBaseScale;
    this.target.setScale(s * (big ? 1.18 : 1.06), s * (big ? 0.85 : 0.95)).setAngle(Phaser.Math.Between(-6, 6));
    this.tweens.add({ targets: this.target, scaleX: s, scaleY: s, angle: 0, duration: big ? 320 : 160, ease: 'Elastic.Out' });
    sfx.hit(big);
  }

  shoot(fromX: number, fromY: number, color: number, delay: number, big: boolean, onHit?: () => void) {
    this.time.delayedCall(delay, () => {
      const b = this.add.image(fromX, fromY, 'dot').setTint(color).setDepth(52).setScale(big ? 1.6 : 0.9);
      this.tweens.add({
        targets: b,
        x: this.target.x + Phaser.Math.Between(-50, 50),
        y: this.target.y + Phaser.Math.Between(-60, 60),
        duration: 200,
        ease: 'Quad.In',
        onComplete: () => {
          this.sparks.setParticleTint(color);
          this.sparks.explode(big ? 8 : 3, b.x, b.y);
          b.destroy();
          onHit?.();
        },
      });
    });
  }

  playPassiveShot(idx: number, dmg: number) {
    const { x, y } = cellXY(idx);
    const v = this.s.grid[idx] ? this.views.get(this.s.grid[idx]!.id) : undefined;
    if (v && v !== this.dragView) {
      v.y = y + 6;
      this.tweens.add({ targets: v, y, duration: 120 });
    }
    sfx.cannon(0, false);
    this.passiveAcc += dmg;
    this.shoot(x, y - 40, 0xff7a52, 0, false, () => {
      this.hitTarget(false);
      if (this.time.now - this.passiveTimer > 450 && this.passiveAcc > 0) {
        this.floatText(this.target.x + Phaser.Math.Between(-110, 110), this.target.y - 40, fmt(this.passiveAcc), '#ffe0d0', 24);
        this.passiveAcc = 0;
        this.passiveTimer = this.time.now;
      }
    });
  }

  playCascade(r: CascadeResult, odStart: boolean, kickback: boolean) {
    const maxDepth = Math.max(...r.activations.map((a) => a.depth));
    const step = maxDepth > 0 ? Math.min(55, 350 / maxDepth) : 0;
    const lg = this.linkG;
    const windup = kickback ? 260 : 90;
    if (odStart) {
      sfx.overdrive();
      this.floatText(W / 2, BY + 40, 'OVERDRIVE!', '#ff6a00', 52);
      this.cameras.main.flash(120, 255, 140, 0, false);
    }
    // links
    this.time.delayedCall(windup, () => {
      for (const e of r.edges) {
        const a = cellXY(e.from);
        const b = cellXY(e.to);
        const col = e.kind === 'coil' ? 0x27c4e0 : e.kind === 'bell' ? 0xf2b521 : 0xffffff;
        const d = (r.activations.find((x) => x.idx === e.from)?.depth ?? 0) * step;
        this.time.delayedCall(d, () => {
          lg.lineStyle(e.kind === 'spark' ? 6 : 9, col, 0.95).lineBetween(a.x, a.y, b.x, b.y);
        });
      }
      this.time.delayedCall(maxDepth * step + 260, () => lg.clear());
    });
    r.activations.forEach((a, i) => {
      const delay = windup + a.depth * step;
      const { x, y } = cellXY(a.idx);
      const color = FAMILY_INFO[a.family].color;
      sfx.cascadeStep(Math.min(i, 13), (delay + 20) / 1000);
      this.time.delayedCall(delay, () => {
        const g = this.s.grid[a.idx];
        const v = g && g.id === a.id ? this.views.get(a.id) : undefined;
        if (v && v !== this.dragView) {
          this.tweens.killTweensOf(v);
          v.setScale(1.28);
          this.tweens.add({ targets: v, scale: 1, x, y, duration: 220, ease: 'Back.Out' });
        }
        this.sparks.setParticleTint(color);
        this.sparks.explode(a.charge > 1 ? 10 : 5, x, y);
        if (a.family === 'cannon') sfx.cannon(0, true);
      });
      this.shoot(x, y - 30, color, delay + 30, a.family === 'cannon');
    });
    const end = windup + maxDepth * step + 240;
    this.time.delayedCall(end, () => {
      const big = r.count >= 6;
      this.hitTarget(true);
      if (big) this.cameras.main.shake(160, 0.004 + Math.min(r.count, 30) * 0.0003);
      haptic(big ? 30 : 12);
      const label = r.count > 1 ? `x${r.count} CHAIN!\n${fmt(r.total)}` : fmt(r.total);
      this.floatText(this.target.x, this.target.y - 20, label, r.count >= 10 ? '#ffcf33' : '#ffffff', r.count >= 10 ? 48 : 38);
    });
  }

  playKill(final: boolean, demo: boolean) {
    const tgt = this.target;
    this.time.delayedCall(demo ? 350 : 300, () => {
      sfx.kill();
      this.chunks.explode(demo ? 20 : 60, tgt.x, tgt.y);
      this.sparks.setParticleTint(0xffcf33);
      this.sparks.explode(40, tgt.x, tgt.y);
      this.cameras.main.shake(300, 0.012);
      haptic(60);
      this.floatText(W / 2, TARGET_Y - 40, demo ? 'SMASHED!' : final ? 'JUNKZILLA DOWN!' : 'DESTROYED!', '#ffcf33', 56);
      this.tweens.add({
        targets: tgt,
        y: tgt.y + 40,
        angle: 25,
        alpha: 0,
        scale: this.targetBaseScale * 0.5,
        duration: 380,
        onComplete: () => {
          if (demo || this.s.target === -1) this.setTargetTexture();
        },
      });
    });
  }

  introTarget() {
    this.time.delayedCall(80, () => {
      this.setTargetTexture();
      this.shownHp = this.s.hp;
      this.target.y = -150;
      this.tweens.add({ targets: this.target, y: TARGET_Y, duration: 420, ease: 'Bounce.Out' });
    });
  }

  // ---------- modals ----------

  closeModal() {
    this.modal?.destroy();
    this.modal = null;
  }

  panel(h: number) {
    const c = this.add.container(0, 0).setDepth(100);
    const dim = this.add.rectangle(W / 2, H / 2, W, H, 0x1a0f18, 0.6).setInteractive();
    const g = this.add.graphics().fillStyle(0x2b1d2e, 1).fillRoundedRect(40, H / 2 - h / 2 - 6, W - 80, h + 12, 36).fillStyle(0xfbe7c6, 1).fillRoundedRect(46, H / 2 - h / 2, W - 92, h, 32);
    c.add([dim, g]);
    this.modal = c;
    return c;
  }

  button(c: Phaser.GameObjects.Container, x: number, y: number, w: number, label: string, color: number, cb: () => void) {
    const b = this.add.container(x, y);
    const g = this.add.graphics().fillStyle(0x2b1d2e, 1).fillRoundedRect(-w / 2, -40, w, 86, 26).fillStyle(color, 1).fillRoundedRect(-w / 2 + 5, -36, w - 10, 74, 22);
    const t = this.add.text(0, 0, label, { fontFamily: 'Lilita One, Arial Black', fontSize: '36px', color: '#fff', stroke: '#2b1d2e', strokeThickness: 6 }).setOrigin(0.5);
    b.add([g, t]).setSize(w, 86).setInteractive({ useHandCursor: true });
    b.on('pointerdown', () => {
      unlockAudio();
      sfx.click();
      b.setScale(0.95);
    });
    b.on('pointerup', () => {
      b.setScale(1);
      cb();
    });
    c.add(b);
    return b;
  }

  openChoice() {
    if (this.s.phase !== 'choice' || this.modal) return;
    this.cancelDrag();
    const c = this.panel(760);
    const top = H / 2 - 380;
    c.add(this.add.text(W / 2, top + 60, 'PICK AN UPGRADE', { fontFamily: 'Lilita One, Arial Black', fontSize: '46px', color: '#3b2533' }).setOrigin(0.5));
    this.s.offer.forEach((id: PerkId, i) => {
      const y = top + 190 + i * 200;
      const card = this.add.container(W / 2, y);
      const g = this.add.graphics().fillStyle(0x2b1d2e, 1).fillRoundedRect(-280, -84, 560, 172, 26).fillStyle(0xffffff, 1).fillRoundedRect(-275, -79, 550, 162, 22);
      const p = PERKS[id];
      const iconKey = p.icon === 'bolt' ? 'icon_bolt' : p.icon === 'crate' ? 'cannon_2' : `${p.icon}_2`;
      const icon = this.add.image(-200, 0, this.hasArt(iconKey) || iconKey.includes('_') ? iconKey : 'spark');
      icon.setScale(Math.min(110 / icon.width, 110 / icon.height));
      const n = this.add.text(-120, -34, p.name, { fontFamily: 'Lilita One, Arial Black', fontSize: '36px', color: '#3b2533' }).setOrigin(0, 0.5);
      const t = this.add.text(-120, 22, p.text, { fontFamily: 'Arial', fontStyle: 'bold', fontSize: '24px', color: '#5a4a5a', wordWrap: { width: 380 } }).setOrigin(0, 0.5);
      card.add([g, icon, n, t]).setSize(560, 172).setInteractive({ useHandCursor: true });
      card.setScale(0.6).setAlpha(0);
      this.tweens.add({ targets: card, scale: 1, alpha: 1, delay: 80 + i * 90, duration: 260, ease: 'Back.Out' });
      card.on('pointerup', () => {
        sfx.click();
        this.closeModal();
        const res = choosePerk(this.s, id);
        this.handleEvents(res.events);
        this.floatText(W / 2, BY + 60, p.name + '!', '#ffcf33', 44);
        this.save();
      });
      c.add(card);
    });
  }

  openResult(won: boolean) {
    if (this.modal) this.closeModal();
    const s = this.s;
    const m = this.meta;
    m.runs++;
    let newBest = false;
    if (won) {
      m.wins++;
      if (!s.practice && (m.bestTime === null || s.elapsed < m.bestTime)) {
        m.bestTime = s.elapsed;
        newBest = true;
      }
    }
    m.bestChain = Math.max(m.bestChain, s.stats.biggestChain);
    store(META_KEY, JSON.stringify(m));
    store(SAVE_KEY, null);
    won ? sfx.win() : sfx.lose();
    const c = this.panel(700);
    const top = H / 2 - 350;
    c.add(this.add.text(W / 2, top + 80, won ? 'MACHINE WINS!' : "TIME'S UP!", { fontFamily: 'Lilita One, Arial Black', fontSize: '64px', color: won ? '#e8452c' : '#3b2533' }).setOrigin(0.5));
    const lines: string[] = [];
    if (won) lines.push(`Time  ${s.elapsed.toFixed(1)}s${newBest ? '  NEW BEST!' : ''}${s.practice ? ' (practice)' : ''}`);
    else lines.push(`Beat ${s.target} of 3  ·  ${TARGET_NAMES[s.target]} at ${Math.round((1 - s.hp / s.maxHp) * 100)}%`);
    lines.push(`Biggest chain  x${s.stats.biggestChain}`);
    lines.push(`Biggest hit  ${fmt(s.stats.biggestHit)}`);
    lines.push(`Best gadget  rank ${s.stats.bestRank}`);
    if (s.perks.length) lines.push(`Perks  ${s.perks.map((p) => PERKS[p].name).join(', ')}`);
    if (m.bestTime !== null) lines.push(`Record  ${m.bestTime.toFixed(1)}s`);
    c.add(this.add.text(W / 2, top + 290, lines.join('\n'), { fontFamily: 'Arial', fontStyle: 'bold', fontSize: '28px', color: '#3b2533', align: 'center', lineSpacing: 14 }).setOrigin(0.5));
    this.button(c, W / 2, top + 560, 420, 'ONE MORE!', 0xe8452c, () => this.retry());
  }

  retry() {
    this.closeModal();
    this.meta.tutorialDone = true;
    store(META_KEY, JSON.stringify(this.meta));
    this.startState(newGame(Date.now() >>> 0, false));
  }

  openPause() {
    if (this.modal || this.s.phase === 'won' || this.s.phase === 'lost') return;
    this.cancelDrag();
    const c = this.panel(620);
    const top = H / 2 - 310;
    c.add(this.add.text(W / 2, top + 70, 'PAUSED', { fontFamily: 'Lilita One, Arial Black', fontSize: '56px', color: '#3b2533' }).setOrigin(0.5));
    this.button(c, W / 2, top + 190, 420, 'RESUME', 0x5fbf4a, () => this.closeModal());
    const snd = this.button(c, W / 2, top + 300, 420, `SOUND: ${this.meta.sound ? 'ON' : 'OFF'}`, 0x27a4c0, () => {
      this.meta.sound = !this.meta.sound;
      audioSettings.on = this.meta.sound;
      store(META_KEY, JSON.stringify(this.meta));
      (snd.list[1] as Phaser.GameObjects.Text).setText(`SOUND: ${this.meta.sound ? 'ON' : 'OFF'}`);
    });
    this.button(c, W / 2, top + 410, 420, 'RESTART', 0xe8452c, () => this.retry());
    if (this.s.phase === 'tutorial') this.button(c, W / 2, top + 520, 420, 'SKIP TUTORIAL', 0x8a6a4a, () => this.retry());
  }

  save() {
    this.lastSave = this.time.now;
    if (this.s.phase === 'won' || this.s.phase === 'lost') return;
    if (this.s.phase !== 'tutorial' && !this.meta.tutorialDone) {
      this.meta.tutorialDone = true;
      store(META_KEY, JSON.stringify(this.meta));
    }
    store(SAVE_KEY, serialize(this.s));
  }
}
