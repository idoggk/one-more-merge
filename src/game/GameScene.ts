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
  supplyPeriod,
  tick,
  type GameEvent,
  type GameState,
} from '../core/game';
import type { CascadeResult, Gadget, PerkId } from '../core/types';
import { audioSettings, haptic, setMusicIntensity, sfx, startMusic, stopMusic, unlockAudio } from './audio';
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
  music: boolean;
  hardUnlocked: boolean;
  bestTimeHard: number | null;
}

const cellXY = (idx: number) => ({ x: BX + (idx % COLS) * CELL + CELL / 2, y: BY + Math.floor(idx / COLS) * CELL + CELL / 2 });
const fmt = (n: number) => (n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e4 ? (n / 1e3).toFixed(1) + 'K' : Math.round(n).toLocaleString());

function loadMeta(): Meta {
  const d: Meta = { tutorialDone: false, bestTime: null, bestChain: 0, runs: 0, wins: 0, sound: true, hints: true, music: true, hardUnlocked: false, bestTimeHard: null };
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
  stage!: Phaser.GameObjects.Image;
  stageFrame!: Phaser.GameObjects.Graphics;
  targetBaseScale = 1;
  hpBar!: Phaser.GameObjects.Graphics;
  hpText!: Phaser.GameObjects.Text;
  shownHp = 0;
  headerText!: Phaser.GameObjects.Text;
  timerText!: Phaser.GameObjects.Text;
  odGauge!: Phaser.GameObjects.Graphics;
  boltIcon?: Phaser.GameObjects.Image;
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
    audioSettings.music = this.meta.music;
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
    else {
      this.startState(newGame(Date.now() >>> 0, !this.meta.tutorialDone));
      if (this.meta.tutorialDone) this.openTitle();
    }

    this.input.on('pointerdown', this.onDown, this);
    this.input.on('pointermove', this.onMove, this);
    this.input.on('pointerup', this.onUp, this);
    this.input.on('pointerupoutside', this.onUp, this);
    this.input.on('gameout', () => this.cancelDrag());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        stopMusic();
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
    if (this.hasArt('icon_timer')) this.add.image(W - 150, 48, 'icon_timer').setDisplaySize(44, 44);
    if (this.hasArt('icon_bolt')) this.boltIcon = this.add.image(0, 46, 'icon_bolt').setDisplaySize(40, 40);
    this.practiceText = this.add.text(W - 28, 74, 'PRACTICE', { fontFamily: 'Arial Black', fontSize: '18px', color: '#8a6a4a' }).setOrigin(1, 0.5);

    // stage backdrop (per opponent) in a rounded window behind the target
    this.stage = this.add.image(W / 2, 236, 'dot').setVisible(false);
    const sm = this.make.graphics({}, false).fillStyle(0xffffff).fillRoundedRect(70, 92, W - 140, 284, 26);
    this.stage.setMask(sm.createGeometryMask());
    this.stageFrame = this.add.graphics();
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
    const debris = [0, 1, 2, 3, 4, 5].map((i) => `debris_${i}`).filter((k) => this.hasArt(k));
    const atlas = this.buildDebrisAtlas(debris);
    this.chunks = this.add.particles(0, 0, atlas ?? 'chunk', {
      frame: atlas ? debris : undefined,
      speed: { min: 250, max: 600 },
      angle: { min: 210, max: 330 },
      gravityY: 1500,
      lifespan: 800,
      alpha: { start: 1, end: 0 },
      tint: debris.length ? 0xffffff : [0x9aa4ad, 0x6c7680, 0xc9cfd4, 0xe8452c, 0x5a4a5a],
      rotate: { min: 0, max: 360 },
      scale: atlas ? { min: 0.35, max: 0.7 } : { min: 0.8, max: 1.6 },
      emitting: false,
    }).setDepth(45);
  }

  /** Pack debris_N images into one canvas texture with one frame each (particles need a single texture). */
  buildDebrisAtlas(keys: string[]): string | null {
    if (!keys.length) return null;
    const size = 128;
    const tex = this.textures.createCanvas('debris_atlas', size * keys.length, size);
    if (!tex) return null;
    keys.forEach((k, i) => {
      const src = this.textures.get(k).getSourceImage() as HTMLImageElement;
      const sc = Math.min(size / src.width, size / src.height);
      tex.context.drawImage(src, i * size + (size - src.width * sc) / 2, (size - src.height * sc) / 2, src.width * sc, src.height * sc);
      tex.add(k, 0, i * size, 0, size, size);
    });
    tex.refresh();
    return 'debris_atlas';
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
    const sk = `stage_${Math.max(0, this.s.target)}`;
    if (this.hasArt(sk)) {
      this.stage.setTexture(sk).setVisible(true);
      this.stage.setScale(Math.max((W - 140) / this.stage.width, 284 / this.stage.height));
      this.stageFrame.clear().lineStyle(8, 0x2b1d2e, 1).strokeRoundedRect(70, 92, W - 140, 284, 26);
    }
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
    const parts: Phaser.GameObjects.GameObject[] = [img, badge, t];
    if (g.rank >= MAX_RANK && this.hasArt('crown')) {
      const cr = this.add.image(-30, -42, 'crown');
      cr.setScale(Math.min(48 / cr.width, 48 / cr.height)).setAngle(-15);
      parts.push(cr);
    }
    c.add(parts);
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
    startMusic();
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
    const prevBest = this.s.stats.bestRank;
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
      if (this.hasArt('starburst')) {
        const { x, y } = cellXY(to);
        const sb = this.add.image(x, y, 'starburst').setDepth(9);
        const s0 = Math.min(150 / sb.width, 150 / sb.height);
        sb.setScale(s0 * 0.4);
        this.tweens.add({ targets: sb, scale: s0, angle: 90, alpha: 0, duration: 450, ease: 'Quad.Out', onComplete: () => sb.destroy() });
      }
      if (nv) {
        nv.setScale(1.45);
        this.tweens.add({ targets: nv, scale: 1, duration: 260, ease: 'Back.Out' });
      }
      const ng = this.s.grid[to]!;
      sfx.merge(ng.rank);
      if (ng.rank > prevBest && ng.rank >= 2) {
        const { x, y } = cellXY(to);
        this.time.delayedCall(120, () => {
          sfx.rankUp(ng.rank);
          this.floatText(x, y - 70, ng.rank >= MAX_RANK ? 'MAX RANK!' : `RANK ${ng.rank}!`, '#ffffff', 34, 200);
          this.ring(x, y, FAMILY_INFO[ng.family].color, 110, 16, 420);
        });
      }
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
    this.animateIdle();
    if (this.time.now - this.lastSave > 2000) this.save();
  }

  /** Cannons about to auto-fire puff up a little; everything breathes slightly. */
  animateIdle() {
    const t = this.time.now / 1000;
    this.s.grid.forEach((g, idx) => {
      if (!g) return;
      const v = this.views.get(g.id);
      if (!v || v === this.dragView || this.tweens.isTweening(v)) return;
      const img = v.list[0] as Phaser.GameObjects.Image;
      const base = (img.getData('base') as number) ?? img.scaleX;
      img.setData('base', base);
      let sx = 1 + Math.sin(t * 2.2 + idx) * 0.015;
      let sy = 1 - Math.sin(t * 2.2 + idx) * 0.015;
      if (g.family === 'cannon' && this.s.phase === 'playing' && g.cd < 0.35) {
        const k = 1 - g.cd / 0.35;
        sx += 0.06 * k;
        sy -= 0.08 * k;
      }
      img.setScale(base * sx, base * sy);
    });
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
    this.headerText.setColor(s.hard ? '#b3201a' : '#3b2533');
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
    this.boltIcon?.setPosition(gx - 26, 46).setVisible(!demo).setAngle(s.odLeft > 0 ? Math.sin(this.time.now / 60) * 12 : 0);
    const active = s.odLeft > 0;
    for (let i = 0; i < (demo ? 0 : need); i++) {
      const filled = active || i < s.odCharge;
      og.fillStyle(0x2b1d2e, 1).fillRoundedRect(gx + i * 26, 30, 22, 30, 6);
      og.fillStyle(filled ? (active ? 0xff6a00 : 0xffcf33) : 0x7a6a6a, 1).fillRoundedRect(gx + i * 26 + 3, 33, 16, 24, 4);
    }
    setMusicIntensity(active);
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
    const prog = s.pending.length >= TUNING.maxPending ? 1 : 1 - s.supplyTimer / supplyPeriod(s);
    ta.lineStyle(6, 0xfbe7c6, 0.9).beginPath().arc(BX + 150, TRAY_Y, 38, -Math.PI / 2, -Math.PI / 2 + prog * Math.PI * 2).strokePath();
    this.pendingText.setText(s.pending.length ? (s.trayHold ? `board full · +${s.pending.length}` : `+${s.pending.length} waiting`) : '');
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
        case 'kickbackIncoming': {
          this.chunks.explode(12, this.target.x, this.target.y);
          if (e.land < 0) break;
          // telegraph: pulsing target marker on the landing cell + a part arcing down to it
          const land = cellXY(e.land);
          const fall = TUNING.kickbackFall * 1000;
          const mk = this.add.graphics().setDepth(47).setPosition(land.x, land.y);
          const col = e.into >= 0 ? 0xffcf33 : 0xffffff;
          const o = { p: 0 };
          this.tweens.add({
            targets: o,
            p: 1,
            duration: fall,
            onUpdate: () => {
              const r = 52 - 14 * Math.abs(Math.sin(o.p * Math.PI * 3));
              mk.clear().lineStyle(6, col, 0.9).strokeCircle(0, 0, r).fillStyle(col, 0.18).fillCircle(0, 0, r);
            },
            onComplete: () => mk.destroy(),
          });
          const g = e.into >= 0 ? this.s.grid[e.into] : null;
          const key = g ? `${g.family}_${g.rank}` : 'chunk';
          const part = this.add.image(this.target.x, this.target.y - 30, key).setDepth(56);
          part.setScale(Math.min(76 / part.width, 76 / part.height));
          const curve = new Phaser.Curves.QuadraticBezier(
            new Phaser.Math.Vector2(part.x, part.y),
            new Phaser.Math.Vector2((part.x + land.x) / 2 + Phaser.Math.Between(-120, 120), part.y - 160),
            new Phaser.Math.Vector2(land.x, land.y),
          );
          const q = { t: 0 };
          this.tweens.add({
            targets: q,
            t: 1,
            duration: fall,
            ease: 'Quad.In',
            onUpdate: () => {
              const p = curve.getPoint(q.t);
              part.setPosition(p.x, p.y).setAngle(q.t * 540);
            },
            onComplete: () => part.destroy(),
          });
          break;
        }
        case 'kickback': {
          const land = cellXY(e.idx);
          sfx.kickback();
          this.chunks.explode(8, land.x, land.y);
          if (e.into >= 0) {
            const into = cellXY(e.into);
            spawn.set(e.gadget.id, land);
            this.ring(into.x, into.y, 0xffcf33, 90, 14, 320);
            this.floatText(into.x, into.y - 64, 'KICKBACK!', '#ffcf33', 32, 150);
          } else spawn.set(e.gadget.id, { x: land.x, y: land.y - 80 });
          needReconcile = true;
          break;
        }        case 'threshold':
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

  floatText(x: number, y: number, text: string, color = '#ffffff', size = 34, hold = 0) {
    const t = this.add.text(x, y, text, { fontFamily: 'Lilita One, Arial Black', fontSize: `${size}px`, color, stroke: '#2b1d2e', strokeThickness: Math.max(5, size / 6), align: 'center' }).setOrigin(0.5).setDepth(70);
    t.setScale(0.3).setAngle(Phaser.Math.Between(-4, 4));
    this.tweens.add({ targets: t, scale: 1, duration: 160, ease: 'Back.Out' });
    this.tweens.add({ targets: t, y: y - 70, alpha: 0, delay: 220 + hold, duration: 700, ease: 'Quad.In', onComplete: () => t.destroy() });
    return t;
  }

  /** Expanding ring burst (merge snap, muzzle flash, impacts). */
  ring(x: number, y: number, color: number, radius = 60, width = 10, dur = 260) {
    const g = this.add.graphics().setDepth(48).setPosition(x, y);
    const o = { r: radius * 0.3, a: 1 };
    this.tweens.add({
      targets: o,
      r: radius,
      a: 0,
      duration: dur,
      ease: 'Quad.Out',
      onUpdate: () => g.clear().lineStyle(width * o.a + 1, color, o.a).strokeCircle(0, 0, o.r),
      onComplete: () => g.destroy(),
    });
  }

  flash(x: number, y: number, size: number, color = 0xffffff) {
    const c = this.add.image(x, y, 'dot').setTint(color).setDepth(49).setScale(size / 16).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: c, scale: (size * 1.6) / 16, alpha: 0, duration: 140, onComplete: () => c.destroy() });
  }

  hitTarget(big: boolean) {
    this.tweens.killTweensOf(this.target);
    const s = this.targetBaseScale;
    this.target.setScale(s * (big ? 1.18 : 1.05), s * (big ? 0.85 : 0.96)).setAngle(Phaser.Math.Between(-6, 6)).setY(TARGET_Y);
    this.tweens.add({ targets: this.target, scaleX: s, scaleY: s, angle: 0, duration: big ? 360 : 160, ease: 'Elastic.Out' });
    if (big) {
      this.target.setTintFill(0xffffff);
      this.time.delayedCall(60, () => this.target.clearTint());
    }
    sfx.hit(big);
  }

  shoot(fromX: number, fromY: number, color: number, delay: number, big: boolean, onHit?: () => void) {
    this.time.delayedCall(delay, () => {
      const b = this.add.image(fromX, fromY, 'dot').setTint(color).setDepth(52).setScale(big ? 1.7 : 0.8);
      const trail = big ? this.add.image(fromX, fromY, 'dot').setTint(0xffffff).setDepth(51).setScale(1).setAlpha(0.6) : null;
      const tx = this.target.x + Phaser.Math.Between(-50, 50);
      const ty = this.target.y + Phaser.Math.Between(-60, 50);
      const midX = (fromX + tx) / 2 + Phaser.Math.Between(-60, 60);
      const curve = new Phaser.Curves.QuadraticBezier(new Phaser.Math.Vector2(fromX, fromY), new Phaser.Math.Vector2(midX, Math.min(fromY, ty) - 40), new Phaser.Math.Vector2(tx, ty));
      const o = { t: 0 };
      this.tweens.add({
        targets: o,
        t: 1,
        duration: big ? 230 : 200,
        ease: 'Quad.In',
        onUpdate: () => {
          const p = curve.getPoint(o.t);
          if (trail) trail.setPosition(b.x, b.y);
          b.setPosition(p.x, p.y);
        },
        onComplete: () => {
          this.sparks.setParticleTint(color);
          this.sparks.explode(big ? 8 : 3, b.x, b.y);
          if (big) this.ring(b.x, b.y, color, 46, 8, 200);
          b.destroy();
          trail?.destroy();
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
    this.shoot(x, y - 40, 0xff9a72, 0, false, () => {
      this.hitTarget(false);
      if (this.time.now - this.passiveTimer > 600 && this.passiveAcc > 0) {
        this.floatText(this.target.x + Phaser.Math.Between(-120, 120), this.target.y - 40, fmt(this.passiveAcc), '#ffe0d0', 22);
        this.passiveAcc = 0;
        this.passiveTimer = this.time.now;
      }
    });
  }

  playCascade(r: CascadeResult, odStart: boolean, kickback: boolean) {
    const maxDepth = Math.max(...r.activations.map((a) => a.depth));
    const step = maxDepth > 0 ? Math.min(70, 380 / maxDepth) : 0;
    const windup = kickback ? 300 : 90;
    const depthOf = new Map(r.activations.map((a) => [a.idx, a.depth]));
    if (odStart) {
      sfx.overdrive();
      this.floatText(W / 2, BY + 40, 'OVERDRIVE!', '#ff6a00', 56, 300);
      this.cameras.main.flash(140, 255, 140, 0, false);
    }
    // root snap
    const root = cellXY(r.rootIdx);
    this.ring(root.x, root.y, 0xffffff, 80, 14, 300);
    this.flash(root.x, root.y, 70);
    // links: a fading line + a travelling pulse per route
    const lg = this.add.graphics().setDepth(30);
    for (const e of r.edges) {
      const a = cellXY(e.from);
      const b = cellXY(e.to);
      const col = e.kind === 'coil' ? 0x5fe8ff : e.kind === 'bell' ? 0xffd34a : 0xffffff;
      const d = windup + (depthOf.get(e.from) ?? 0) * step;
      this.time.delayedCall(d, () => {
        lg.lineStyle(e.kind === 'spark' ? 5 : 8, col, 0.85).lineBetween(a.x, a.y, b.x, b.y);
        const p = this.add.image(a.x, a.y, 'spark').setTint(col).setDepth(31).setScale(1.1).setBlendMode(Phaser.BlendModes.ADD);
        this.tweens.add({ targets: p, x: b.x, y: b.y, angle: 180, duration: Math.max(60, step), onComplete: () => p.destroy() });
      });
    }
    this.tweens.add({ targets: lg, alpha: 0, delay: windup + maxDepth * step + 200, duration: 250, onComplete: () => lg.destroy() });

    for (let d = 0; d <= maxDepth; d++) sfx.cascadeStep(Math.min(d * 2 + (r.count > 8 ? 2 : 0), 13), (windup + d * step) / 1000);
    r.activations.forEach((a) => {
      const delay = windup + a.depth * step;
      const { x, y } = cellXY(a.idx);
      const color = FAMILY_INFO[a.family].color;
      this.time.delayedCall(delay, () => {
        const g = this.s.grid[a.idx];
        const v = g && g.id === a.id ? this.views.get(a.id) : undefined;
        if (v && v !== this.dragView) {
          this.tweens.killTweensOf(v);
          v.setScale(1.3).setPosition(x, a.family === 'cannon' ? y + 12 : y);
          this.tweens.add({ targets: v, scale: 1, x, y, duration: 240, ease: 'Back.Out' });
        }
        this.sparks.setParticleTint(color);
        this.sparks.explode(a.charge > 1 ? 10 : 5, x, y);
        if (a.charge > 1) this.ring(x, y, 0x5fe8ff, 56, 6, 220);
        if (a.family === 'cannon') {
          this.flash(x, y - 46, 40, 0xfff0a0);
          sfx.cannon(0, true);
        }
      });
      this.shoot(x, y - 30, color, delay + 30, a.family === 'cannon');
    });
    const end = windup + maxDepth * step + 260;
    this.time.delayedCall(end, () => {
      const big = r.count >= 6;
      this.hitTarget(true);
      if (r.count >= 3) sfx.chord(Math.min(r.count, 20));
      if (big) this.cameras.main.shake(180, 0.004 + Math.min(r.count, 30) * 0.0003);
      haptic(big ? 30 : 12);
      const huge = r.count >= 10;
      const label = r.count > 1 ? `x${r.count} CHAIN!\n${fmt(r.total)}` : fmt(r.total);
      this.floatText(this.target.x, this.target.y - 20, label, huge ? '#ffcf33' : '#ffffff', huge ? 54 : 40, huge ? 250 : 0);
    });
  }

  playKill(final: boolean, demo: boolean) {
    const tgt = this.target;
    this.time.delayedCall(demo ? 300 : 280, () => {
      // wind-up: white flash + rattle, then blow apart
      this.tweens.killTweensOf(tgt);
      tgt.setTintFill(0xffffff);
      this.tweens.add({ targets: tgt, x: { from: tgt.x - 8, to: tgt.x + 8 }, duration: 40, yoyo: true, repeat: demo ? 1 : 3 });
      this.time.delayedCall(demo ? 120 : 260, () => {
        tgt.clearTint().setX(W / 2);
        sfx.kill();
        this.chunks.explode(demo ? 20 : 70, tgt.x, tgt.y);
        this.sparks.setParticleTint(0xffcf33);
        this.sparks.explode(50, tgt.x, tgt.y);
        this.ring(tgt.x, tgt.y, 0xffcf33, 260, 24, 420);
        this.ring(tgt.x, tgt.y, 0xffffff, 180, 14, 300);
        this.cameras.main.shake(320, 0.014);
        haptic(60);
        this.floatText(W / 2, TARGET_Y - 40, demo ? 'SMASHED!' : final ? 'JUNKZILLA DOWN!' : 'DESTROYED!', '#ffcf33', 60, 300);
        this.tweens.add({
          targets: tgt,
          y: tgt.y + 60,
          angle: 30,
          alpha: 0,
          scale: this.targetBaseScale * 0.4,
          duration: 380,
          onComplete: () => {
            if (demo || this.s.target === -1) this.setTargetTexture();
          },
        });
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
    const artKey = color === 0x5fbf4a ? 'btn_green' : color === 0x27a4c0 ? 'btn_blue' : color === 0xe8452c ? 'btn_red' : '';
    const g: Phaser.GameObjects.GameObject =
      artKey && this.hasArt(artKey)
        ? this.add.image(0, 2, artKey).setDisplaySize(w + 20, 112)
        : this.add.graphics().fillStyle(0x2b1d2e, 1).fillRoundedRect(-w / 2, -40, w, 86, 26).fillStyle(color, 1).fillRoundedRect(-w / 2 + 5, -36, w - 10, 74, 22);
    const t = this.add.text(0, 0, label, { fontFamily: 'Lilita One, Arial Black', fontSize: '36px', color: '#fff', stroke: '#2b1d2e', strokeThickness: 6 }).setOrigin(0.5);
    b.add([g, t]).setSize(w, 86).setInteractive({ useHandCursor: true });
    b.on('pointerdown', () => {
      unlockAudio();
      startMusic();
      sfx.click();
      b.setScale(0.95);
      if (g instanceof Phaser.GameObjects.Image && this.hasArt(artKey + '_pressed')) g.setTexture(artKey + '_pressed');
    });
    b.on('pointerup', () => {
      b.setScale(1);
      if (g instanceof Phaser.GameObjects.Image) g.setTexture(artKey);
      cb();
    });
    c.add(b);
    return b;
  }

  openChoice() {
    if (this.s.phase !== 'choice' || this.modal) return;
    this.cancelDrag();
    const c = this.panel(470);
    const top = H / 2 - 235;
    c.add(this.add.text(W / 2, top + 62, 'PICK AN UPGRADE', { fontFamily: 'Lilita One, Arial Black', fontSize: '50px', color: '#3b2533' }).setOrigin(0.5));
    this.s.offer.forEach((id: PerkId, i) => {
      const card = this.add.container(W / 2 + (i - 1) * 206, top + 280);
      const p = PERKS[id];
      const parts: Phaser.GameObjects.GameObject[] = [];
      if (this.hasArt('card')) {
        parts.push(this.add.graphics().fillStyle(0xffffff, 1).fillRoundedRect(-76, -94, 152, 198, 14));
        parts.push(this.add.image(0, 0, 'card').setDisplaySize(322, 322));
      } else parts.push(this.add.graphics().fillStyle(0x2b1d2e, 1).fillRoundedRect(-100, -135, 200, 270, 22).fillStyle(0xffffff, 1).fillRoundedRect(-95, -130, 190, 260, 18));
      const iconKey = this.hasArt(`perk_${id}`) ? `perk_${id}` : p.icon === 'bolt' ? 'icon_bolt' : p.icon === 'crate' ? 'cannon_2' : `${p.icon}_2`;
      const icon = this.add.image(0, -52, this.textures.exists(iconKey) ? iconKey : 'spark');
      icon.setScale(Math.min(96 / icon.width, 96 / icon.height));
      const n = this.add.text(0, 22, p.name.replace(' ', '\n'), { fontFamily: 'Lilita One, Arial Black', fontSize: '26px', color: '#3b2533', align: 'center', lineSpacing: -6 }).setOrigin(0.5);
      const t = this.add.text(0, 86, p.text, { fontFamily: 'Arial', fontStyle: 'bold', fontSize: '16px', color: '#5a4a5a', align: 'center', wordWrap: { width: 140 } }).setOrigin(0.5);
      card.add([...parts, icon, n, t]).setSize(200, 270).setInteractive({ useHandCursor: true });
      this.tweens.add({ targets: icon, y: -58, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.InOut', delay: i * 200 });      card.setScale(0.6).setAlpha(0);
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
    let unlockedNow = false;
    if (won) {
      m.wins++;
      const prev = s.hard ? m.bestTimeHard : m.bestTime;
      if (!s.practice && (prev === null || s.elapsed < prev)) {
        if (s.hard) m.bestTimeHard = s.elapsed;
        else m.bestTime = s.elapsed;
        newBest = true;
      }
      if (!m.hardUnlocked) {
        m.hardUnlocked = true;
        unlockedNow = true;
      }
    }
    m.bestChain = Math.max(m.bestChain, s.stats.biggestChain);
    store(META_KEY, JSON.stringify(m));
    store(SAVE_KEY, null);
    won ? sfx.win() : sfx.lose();
    const art = won ? 'victory' : 'defeat';
    const hasPic = this.hasArt(art);
    const c = this.panel(hasPic ? 960 : 700);
    const top = H / 2 - (hasPic ? 480 : 350) + (hasPic ? 250 : 0);
    if (hasPic) {
      const pic = this.add.image(W / 2, top - 110, art);
      pic.setScale(Math.min(300 / pic.width, 270 / pic.height));
      c.add(pic);
      this.tweens.add({ targets: pic, scale: { from: pic.scale * 0.6, to: pic.scale }, duration: 400, ease: 'Back.Out' });
    }
    c.add(this.add.text(W / 2, top + 80, won ? 'MACHINE WINS!' : "TIME'S UP!", { fontFamily: 'Lilita One, Arial Black', fontSize: '64px', color: won ? '#e8452c' : '#3b2533' }).setOrigin(0.5));
    const lines: string[] = [];
    if (won) lines.push(`Time  ${s.elapsed.toFixed(1)}s${newBest ? '  NEW BEST!' : ''}${s.practice ? ' (practice)' : ''}`);
    else lines.push(`Beat ${s.target} of 3  ·  ${TARGET_NAMES[s.target]} at ${Math.round((1 - s.hp / s.maxHp) * 100)}%`);
    lines.push(`Biggest chain  x${s.stats.biggestChain}`);
    lines.push(`Biggest hit  ${fmt(s.stats.biggestHit)}`);
    lines.push(`Best gadget  rank ${s.stats.bestRank}`);
    if (s.perks.length) lines.push(`Perks  ${s.perks.map((p) => PERKS[p].name).join(', ')}`);
    const rec = s.hard ? m.bestTimeHard : m.bestTime;
    if (rec !== null) lines.push(`Record${s.hard ? ' (challenge)' : ''}  ${rec.toFixed(1)}s`);
    if (unlockedNow) lines.push('★ CHALLENGE MODE UNLOCKED ★');
    c.add(this.add.text(W / 2, top + 290, lines.join('\n'), { fontFamily: 'Arial', fontStyle: 'bold', fontSize: '28px', color: '#3b2533', align: 'center', lineSpacing: 14 }).setOrigin(0.5));
    this.button(c, W / 2, top + 560, 420, 'ONE MORE!', 0xe8452c, () => this.retry());
  }

  retry(hard = this.s.hard) {
    this.closeModal();
    this.meta.tutorialDone = true;
    store(META_KEY, JSON.stringify(this.meta));
    this.startState(newGame(Date.now() >>> 0, false, hard));
  }

  openTitle() {
    const c = this.add.container(0, 0).setDepth(100);
    if (this.hasArt('title')) {
      const img = this.add.image(W / 2, H / 2, 'title');
      img.setScale(Math.max(W / img.width, H / img.height));
      c.add(img);
    } else c.add(this.add.rectangle(W / 2, H / 2, W, H, 0x1a0f18, 0.72).setInteractive());
    c.add(this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.001).setInteractive());
    let logo: Phaser.GameObjects.GameObject;
    if (this.hasArt('logo')) {
      const l = this.add.image(W / 2, 250, 'logo');
      l.setScale(Math.min(620 / l.width, 360 / l.height));
      logo = l;
    } else {
      const l = this.add.text(W / 2, 250, 'ONE MORE\nMERGE', { fontFamily: 'Lilita One, Arial Black', fontSize: '112px', color: '#ffcf33', stroke: '#2b1d2e', strokeThickness: 16, align: 'center', lineSpacing: -18 }).setOrigin(0.5);
      l.setShadow(0, 10, '#2b1d2e', 0, true, true);
      logo = l;
      c.add(this.add.text(W / 2, 410, 'JUNK MACHINE', { fontFamily: 'Lilita One, Arial Black', fontSize: '44px', color: '#ffffff', stroke: '#2b1d2e', strokeThickness: 10 }).setOrigin(0.5));
    }
    c.add(logo);
    this.tweens.add({ targets: logo, angle: { from: -2, to: 2 }, scale: '*=1.03', duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    const m = this.meta;
    const info = [m.bestTime !== null ? `Best time  ${m.bestTime.toFixed(1)}s` : 'Beat all 3 before the clock runs out!', m.bestTimeHard !== null ? `Challenge best  ${m.bestTimeHard.toFixed(1)}s` : '', m.bestChain ? `Biggest chain  x${m.bestChain}` : ''].filter(Boolean).join('\n');
    c.add(this.add.text(W / 2, H - 400, info, { fontFamily: 'Lilita One, Arial Black', fontSize: '32px', color: '#ffffff', stroke: '#2b1d2e', strokeThickness: 8, align: 'center' }).setOrigin(0.5));
    this.modal = c;
    const play = this.button(c, W / 2, H - (m.hardUnlocked ? 250 : 200), 440, 'PLAY', 0x5fbf4a, () => this.retry(false));
    if (m.hardUnlocked) this.button(c, W / 2, H - 140, 440, 'CHALLENGE', 0xe8452c, () => this.retry(true));
    this.tweens.add({ targets: play, scale: 1.06, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
  }

  openPause() {
    if (this.modal || this.s.phase === 'won' || this.s.phase === 'lost') return;
    this.cancelDrag();
    const c = this.panel(this.s.phase === 'tutorial' ? 840 : 730);
    const top = H / 2 - (this.s.phase === 'tutorial' ? 420 : 365);
    c.add(this.add.text(W / 2, top + 70, 'PAUSED', { fontFamily: 'Lilita One, Arial Black', fontSize: '56px', color: '#3b2533' }).setOrigin(0.5));
    this.button(c, W / 2, top + 190, 420, 'RESUME', 0x5fbf4a, () => this.closeModal());
    const snd = this.button(c, W / 2, top + 300, 420, `SOUND: ${this.meta.sound ? 'ON' : 'OFF'}`, 0x27a4c0, () => {
      this.meta.sound = !this.meta.sound;
      audioSettings.on = this.meta.sound;
    audioSettings.music = this.meta.music;
      store(META_KEY, JSON.stringify(this.meta));
      (snd.list[1] as Phaser.GameObjects.Text).setText(`SOUND: ${this.meta.sound ? 'ON' : 'OFF'}`);
    });
    const mus = this.button(c, W / 2, top + 410, 420, `MUSIC: ${this.meta.music ? 'ON' : 'OFF'}`, 0x27a4c0, () => {
      this.meta.music = !this.meta.music;
      audioSettings.music = this.meta.music;
      store(META_KEY, JSON.stringify(this.meta));
      (mus.list[1] as Phaser.GameObjects.Text).setText(`MUSIC: ${this.meta.music ? 'ON' : 'OFF'}`);
    });
    this.button(c, W / 2, top + 520, 420, 'RESTART', 0xe8452c, () => this.retry());
    if (this.s.phase === 'tutorial') this.button(c, W / 2, top + 630, 420, 'SKIP TUTORIAL', 0x8a6a4a, () => this.retry());
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
