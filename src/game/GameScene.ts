import Phaser from 'phaser';
import { FAMILY_INFO, PERKS, TARGET_NAMES } from '../content/perks';
import { COLS, MAX_RANK, ROWS, TICK, TUNING } from '../content/tuning';
import {
  canMerge,
  choosePerk,
  finishTutorial,
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
import type { CascadeResult, Family, Gadget, PerkId } from '../core/types';
import { audioSettings, duckMusic, haptic, setMusicIntensity, sfx, startMusic, stopMusic, unlockAudio } from './audio';
import { ensureTextures, preloadArt } from './textures';
import * as tlog from '../platform/telemetry';
import { Coach } from './coach';
import { REMIX_OPPONENTS, twinsDestination, type RemixKind } from '../core/remix';

export const W = 720;
const CELL = 124;
const REDUCED_MOTION = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const BX = (W - CELL * COLS) / 2;
const SPRITE = 108;
const SCRAP_X = W - 92;
// Safe-area-aware layout (ChatGPT round-7 review): design width is fixed, design height follows the phone's aspect,
// so there are no letterbox bands. Header pinned top, tray pinned bottom, board + event lane above it, stage gets the rest.
export let H = 1280;
/** Render scale: the canvas is W*RS x H*RS device-ish pixels; the main camera zooms by RS so game code stays in design units. */
export let RS = 1;
export function setRenderScale(r: number) {
  RS = r;
}
let BY = 446;
let TRAY_Y = 1234;
let EVENT_Y = 410;
let HP_Y = 404;
let STAGE_TOP = 92;
let STAGE_H = 284;
let TARGET_Y = 245;

export const layoutHeight = (viewW: number, viewH: number) => Math.round(Math.min(1720, Math.max(1280, (W * viewH) / Math.max(1, viewW))));

export function computeLayout(viewW: number, viewH: number) {
  H = layoutHeight(viewW, viewH);
  TRAY_Y = H - 66;
  BY = TRAY_Y - 58 - CELL * ROWS;
  EVENT_Y = BY - 34;
  HP_Y = EVENT_Y - 54;
  const top = 96;
  const avail = HP_Y - 34 - top;
  STAGE_H = Math.min(450, avail);
  STAGE_TOP = top + (avail - STAGE_H) / 2;
  TARGET_Y = STAGE_TOP + STAGE_H / 2 + 4;
  return H;
}

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
  /** Unlocked toys and whether each is switched on for runs. */
  toys: Partial<Record<Family, boolean>>;
  /** Remix fastest wins keyed by opponent + helper loadout. */
  remixBest: Record<string, number>;
  /** First-time contextual tips already shown. */
  tips: Record<string, boolean>;
}

const cellXY = (idx: number) => ({ x: BX + (idx % COLS) * CELL + CELL / 2, y: BY + Math.floor(idx / COLS) * CELL + CELL / 2 });
const fmt = (n: number) => (n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e4 ? (n / 1e3).toFixed(1) + 'K' : Math.round(n).toLocaleString());

function loadMeta(): Meta {
  const d: Meta = { tutorialDone: false, bestTime: null, bestChain: 0, runs: 0, wins: 0, sound: true, hints: true, music: true, hardUnlocked: false, bestTimeHard: null, toys: {}, remixBest: {}, tips: {} };
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
  hpFill?: Phaser.GameObjects.Image;
  gaugeImgs: Phaser.GameObjects.Image[] = [];
  hpText!: Phaser.GameObjects.Text;
  shownHp = 0;
  headerText!: Phaser.GameObjects.Text;
  timerText!: Phaser.GameObjects.Text;
  odGauge!: Phaser.GameObjects.Graphics;
  boltIcon?: Phaser.GameObjects.Image;
  flames: Phaser.GameObjects.Image[] = [];
  face!: Phaser.GameObjects.Image;
  faceUntil = 0;
  odGlow!: Phaser.GameObjects.Graphics;
  overlayG!: Phaser.GameObjects.Graphics;
  previewText!: Phaser.GameObjects.Text;
  trayIcon!: Phaser.GameObjects.Image;
  trayBadge!: Phaser.GameObjects.Text;
  trayArc!: Phaser.GameObjects.Graphics;
  trayBox!: Phaser.GameObjects.Graphics;
  trayPlate?: Phaser.GameObjects.Image;
  laneBg!: Phaser.GameObjects.Image | Phaser.GameObjects.Rectangle;
  laneText!: Phaser.GameObjects.Text;
  laneMsg = { text: '', color: '#fff0cf', until: 0 };
  lastHeader = '';
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
  coach!: Coach;
  lastCascade: CascadeResult | null = null;

  constructor() {
    super('game');
  }

  preload() {
    preloadArt(this);
  }

  create() {
    this.cameras.main.setOrigin(0, 0).setZoom(RS);
    // crisp text on high-DPI phones: rasterize every Text at the render scale
    const addText = this.add.text.bind(this.add);
    (this.add as unknown as { text: typeof addText }).text = (x, y, txt, style = {}) => addText(x, y, txt, { resolution: RS, ...style });
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
      // full-bleed bench: stretched to the screen, header plate covers its very top
      this.add.image(W / 2, 0, 'bg').setOrigin(0.5, 0).setDisplaySize(W, H + 40);
    } else this.add.image(W / 2, H / 2, 'bg').setDisplaySize(W, H);
    for (let i = 0; i < ROWS * COLS; i++) {
      const { x, y } = cellXY(i);
      this.add.image(x, y, 'slot').setDisplaySize(CELL - 6, CELL - 6);
    }
    this.odGlow = this.add.graphics();
    if (this.hasArt('vfx_flame')) {
      const bw = CELL * COLS + 30;
      const bh = CELL * ROWS + 30;
      const mk = (x: number, y: number, len: number, ang: number) => this.add.image(x, y, 'vfx_flame').setAngle(ang).setDisplaySize(len, 60).setDepth(4).setVisible(false);
      this.flames = [
        mk(W / 2, BY - 22, bw, 180),
        mk(W / 2, BY + CELL * ROWS + 22, bw, 0),
        mk(BX - 22, BY + (CELL * ROWS) / 2, bh, 90),
        mk(BX + CELL * COLS + 22, BY + (CELL * ROWS) / 2, bh, -90),
      ];
    }
    this.overlayG = this.add.graphics().setDepth(5);
    this.linkG = this.add.graphics().setDepth(30);

    // header
    if (this.hasArt('hud_header')) this.add.image(W / 2, 46, 'hud_header').setDisplaySize(W - 8, 88);
    this.headerText = this.add.text(70, 27, '', { fontFamily: 'Lilita One, Arial Black', fontSize: '30px', color: '#3b2533' });
    this.timerText = this.add.text(W - 28, 22, '', { fontFamily: 'Lilita One, Arial Black', fontSize: '40px', color: '#3b2533' }).setOrigin(1, 0);
    this.odGauge = this.add.graphics();
    if (this.hasArt('icon_timer')) this.add.image(W - 132, 46, 'icon_timer').setDisplaySize(42, 42);
    if (this.hasArt('icon_bolt')) this.boltIcon = this.add.image(0, 46, 'icon_bolt').setDisplaySize(40, 40);
    this.practiceText = this.add.text(W - 28, 74, 'PRACTICE', { fontFamily: 'Arial Black', fontSize: '18px', color: '#8a6a4a' }).setOrigin(1, 0.5);

    // stage backdrop (per opponent) in a rounded window behind the target
    this.stage = this.add.image(W / 2, STAGE_TOP + STAGE_H / 2, 'dot').setVisible(false);
    const sm = this.make.graphics({}, false).fillStyle(0xffffff).fillRoundedRect(70, STAGE_TOP, W - 140, STAGE_H, 26);
    this.stage.setMask(sm.createGeometryMask());
    this.stageFrame = this.add.graphics();
    // target
    this.target = this.add.image(W / 2, TARGET_Y, 'target_0');
    this.face = this.add.image(W / 2, TARGET_Y, 'dot').setVisible(false);
    this.hpBar = this.add.graphics();
    if (this.hasArt('hp_frame') && this.hasArt('hp_fill')) {
      this.hpFill = this.add.image(W / 2 - 220, HP_Y, 'hp_fill').setOrigin(0, 0.5).setDisplaySize(440, 26);
      this.add.image(W / 2, HP_Y, 'hp_frame').setDisplaySize(476, 50);
    }
    this.hpText = this.add.text(W / 2, HP_Y, '', { fontFamily: 'Lilita One, Arial Black', fontSize: '26px', color: '#2a2233', stroke: '#fff0cf', strokeThickness: 2 }).setOrigin(0.5).setDepth(2);

    // event lane (single place for chain results / warnings, never over the HP bar or gadgets)
    this.laneBg = this.hasArt('ui_ribbon') ? this.add.image(W / 2, EVENT_Y, 'ui_ribbon').setDisplaySize(640, 56) : this.add.rectangle(W / 2, EVENT_Y, 640, 50, 0x2a2233, 0.85);
    this.laneBg.setDepth(20).setAlpha(0);
    this.laneText = this.add.text(W / 2, EVENT_Y, '', { fontFamily: 'Lilita One, Arial Black', fontSize: '28px', color: '#fff0cf' }).setOrigin(0.5).setDepth(21).setAlpha(0);

    // tray
    this.trayBox = this.add.graphics().setDepth(1);
    if (this.hasArt('tray_plate')) this.trayPlate = this.add.image(BX + 125, TRAY_Y, 'tray_plate').setDisplaySize(262, 72).setDepth(1);
    else this.trayBox.fillStyle(0x8a5a35, 1).fillRoundedRect(BX, TRAY_Y - 38, 240, 76, 22);
    this.trayLabel = this.add.text(BX + 28, TRAY_Y, 'NEXT', { fontFamily: 'Lilita One, Arial Black', fontSize: '26px', color: this.trayPlate ? '#5a3a2a' : '#fbe7c6' }).setOrigin(0, 0.5).setDepth(2);
    this.trayArc = this.add.graphics().setDepth(2);
    this.trayIcon = this.add.image(BX + 150, TRAY_Y, 'cannon_1').setDisplaySize(62, 62).setDepth(2);
    this.trayBadge = this.add.text(BX + 176, TRAY_Y + 18, '', { fontFamily: 'Arial Black', fontSize: '18px', color: '#fff', stroke: '#2b1d2e', strokeThickness: 4 }).setOrigin(0.5).setDepth(3);
    this.pendingText = this.add.text(BX + 250, TRAY_Y, '', { fontFamily: 'Arial Black', fontSize: '20px', color: '#9e2416' }).setOrigin(0, 0.5).setDepth(2);

    // scrap
    const sz = this.add.container(SCRAP_X, TRAY_Y).setDepth(2);
    const sg = this.hasArt('scrap_plate') ? this.add.image(0, 0, 'scrap_plate').setDisplaySize(150, 82) : this.add.graphics().fillStyle(0x5a4a5a, 1).fillRoundedRect(-62, -38, 124, 76, 22);
    const icon = this.textures.exists('icon_scrap') && this.textures.get('icon_scrap').key !== '__MISSING' ? this.add.image(-34, 0, 'icon_scrap').setDisplaySize(44, 44) : this.add.text(-24, 0, '🗑', { fontSize: '34px' }).setOrigin(0.5);
    const st = this.add.text(20, 0, 'SCRAP', { fontFamily: 'Lilita One, Arial Black', fontSize: '22px', color: '#fff', stroke: '#2b1d2e', strokeThickness: 5 }).setOrigin(0.5);
    this.scrapRing = this.add.graphics();
    sz.add([sg, icon, st, this.scrapRing]);
    this.scrapZone = sz;

    this.previewText = this.add.text(0, 0, '', { fontFamily: 'Lilita One, Arial Black', fontSize: '30px', color: '#fff', stroke: '#2b1d2e', strokeThickness: 7 }).setOrigin(0.5).setDepth(60).setVisible(false);
    this.tutorialText = this.add.text(W / 2, TRAY_Y, '', { fontFamily: 'Lilita One, Arial Black', fontSize: '32px', color: '#3b2533', align: 'center' }).setOrigin(0.5).setDepth(40);
    this.coach = new Coach(this, W);

    // settings button
    const gear = (this.hasArt('icon_pause') ? this.add.image(38, 46, 'icon_pause').setDisplaySize(52, 52) : this.add.text(38, 20, '⏸', { fontSize: '40px', color: '#3b2533' }).setOrigin(0.5, 0)).setInteractive({ useHandCursor: true });
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
    if (s.elapsed === 0 && s.stats.merges === 0) tlog.newRun({ mode: s.hard ? 'challenge' : s.phase === 'tutorial' ? 'tutorial' : s.practice ? 'practice' : 'normal', toys: s.toys, seed: s.seed });
    for (const v of this.views.values()) v.destroy();
    this.views.clear();
    this.s = s;
    this.pulledIds.clear();
    this.acc = 0;
    this.selectedIdx = -1;
    this.idleTime = 0;
    this.tutorialStep = 0;
    this.coach?.clear();
    if (s.phase === 'tutorial') this.time.delayedCall(500, () => this.runTutorial());
    this.shownHp = s.hp;
    this.setTargetTexture();
    this.reconcile(true);
    if (s.phase === 'choice') this.time.delayedCall(200, () => this.openChoice());
  }

  setTargetTexture() {
    const key = this.s.target < 0 ? 'demo_can' : `target_${this.s.target}${this.s.thresholds >= 2 && this.hasArt(`target_${this.s.target}_dmg`) ? '_dmg' : ''}`;
    this.target.setTexture(key);
    // remix opponents reuse the three backdrops (alley / kitchen / junkyard)
    const sk = `stage_${Math.max(0, this.s.target) % 3}`;
    if (this.hasArt(sk)) {
      this.stage.setTexture(sk).setVisible(true);
      this.stage.setScale(Math.max((W - 140) / this.stage.width, STAGE_H / this.stage.height));
      this.stageFrame.clear().lineStyle(8, 0x2b1d2e, 1).strokeRoundedRect(70, STAGE_TOP, W - 140, STAGE_H, 26);
    }
    const tex = this.target.frame;
    this.targetBaseScale = Math.min(280 / tex.width, (STAGE_H - 24) / tex.height);
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
    // big rank badge (playtest: ranks were hard to tell apart)
    const BXY = 36;
    const badgeArt = this.hasArt(`badge_${g.family}`) ? this.add.image(BXY, BXY, `badge_${g.family}`).setDisplaySize(58, 58) : null;
    if (!badgeArt) badge.fillStyle(0x2b1d2e, 1).fillCircle(BXY, BXY, 26).fillStyle(col, 1).fillCircle(BXY, BXY, 21);
    const label = g.rank >= MAX_RANK ? 'M' : String(g.rank);
    let t = this.add.text(BXY, BXY - 1, label, { fontFamily: 'Lilita One, Arial Black', fontSize: '34px', color: '#ffffff', stroke: '#2b1d2e', strokeThickness: 7 }).setOrigin(0.5);
    let parts: Phaser.GameObjects.GameObject[] = badgeArt ? [img, badge, badgeArt, t] : [img, badge, t];
    const dice = `dice_${g.rank}`;
    if (this.hasArt(dice)) {
      // ChatGPT round 8: neutral bottom-right plate, numeral left + standard dice pips right (same for every family)
      t.destroy();
      badgeArt?.destroy();
      badge.clear();
      const plate = this.add.image(26, 48, dice);
      plate.setScale(78 / plate.width);
      t = this.add.text(26 - 39 + 18, 47, String(g.rank), { fontFamily: 'Lilita One, Arial Black', fontSize: '28px', color: '#2a2233' }).setOrigin(0.5);
      parts = [img, plate, t];
    }
    t.setName('rank');
    if (g.rank >= MAX_RANK && this.hasArt('crown')) {
      const cr = this.add.image(-30, -42, 'crown');
      cr.setScale(Math.min(48 / cr.width, 48 / cr.height)).setAngle(-15);
      parts.push(cr);
    }
    c.add(parts);
    c.setSize(CELL, CELL).setDepth(10);
    return c;
  }

  /** Landing squash: quick flatten then springy settle. */
  squash(v: Phaser.GameObjects.Container) {
    if (!v.active) return;
    v.setScale(1.06, 0.94);
    this.tweens.add({ targets: v, scaleX: 1, scaleY: 1, duration: 135, ease: 'Sine.Out' });
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
          v.setPosition(from.x, from.y).setScale(0.45);
          const vv = v;
          const curve = new Phaser.Curves.QuadraticBezier(new Phaser.Math.Vector2(from.x, from.y), new Phaser.Math.Vector2((from.x + x) / 2, Math.min(from.y, y) - 140), new Phaser.Math.Vector2(x, y));
          const o = { t: 0 };
          this.tweens.add({
            targets: o,
            t: 1,
            duration: 340,
            ease: 'Sine.InOut',
            onUpdate: () => {
              const pt = curve.getPoint(o.t);
              vv.setPosition(pt.x, pt.y).setScale(0.45 + 0.55 * o.t);
            },
            onComplete: () => this.squash(vv),
          });
        } else {
          v.setPosition(x, y).setScale(0.2);
          this.tweens.add({ targets: v, scale: 1, duration: 280, ease: 'Back.Out' });
        }
      } else if (v !== this.dragView && (Math.abs(v.x - x) > 1 || Math.abs(v.y - y) > 1)) {
        this.tweens.killTweensOf(v);
        const vv = v;
        this.tweens.add({ targets: vv, x, y, scale: 1, angle: 0, duration: 150, ease: 'Quad.Out', onComplete: () => this.squash(vv) });
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
    // tap skips the boss-defeat show after its first 600 ms (ChatGPT r9: never a long unskippable interruption)
    if (this.s.phase === 'won' && this.resultCall && !this.modal && this.time.now - this.resultAt > 600) {
      this.resultCall.remove();
      this.resultCall = null;
      this.openResult(true);
      return;
    }
    if (this.coach.waitingTap && !this.modal) {
      sfx.click();
      this.coach.hide();
      return;
    }
    if (!this.canAct()) return;
    const idx = this.cellAt(p.worldX, p.worldY);
    if (idx < 0 || !this.s.grid[idx]) {
      if (this.selectedIdx >= 0 && idx >= 0) return; // handled on up (move to empty)
      if (this.selectedIdx >= 0 && this.overScrap(p.worldX, p.worldY)) return;
      return;
    }
    this.dragIdx = idx;
    this.dragId = this.s.grid[idx]!.id;
    this.dragView = this.views.get(this.dragId) ?? null;
    this.downAt = { x: p.worldX, y: p.worldY };
    this.moved = false;
    this.scrapHold = 0;
    this.idleTime = 0;
  }

  onMove(p: Phaser.Input.Pointer) {
    if (this.dragIdx < 0 || !this.dragView || !p.isDown) return;
    if (!this.moved && Phaser.Math.Distance.Between(p.worldX, p.worldY, this.downAt.x, this.downAt.y) < 12) return;
    if (!this.moved) {
      this.moved = true;
      this.selectedIdx = -1;
      sfx.pickup();
      this.dragView.setDepth(55);
      this.tweens.killTweensOf(this.dragView);
      this.tweens.add({ targets: this.dragView, scale: 1.08, duration: 75, ease: 'Cubic.Out' });
    }
    // weighty drag: piece leans into the motion and casts a shadow on the board
    const dx = p.worldX - this.dragView.x;
    this.dragView.setPosition(p.worldX, p.worldY - 40);
    this.dragView.setAngle(Phaser.Math.Linear(this.dragView.angle, Phaser.Math.Clamp(dx * 0.9, -14, 14), 0.35));
    if (!this.dragShadow) this.dragShadow = this.add.ellipse(0, 0, 92, 30, 0x000000, 0.28).setDepth(54);
    this.dragShadow.setPosition(p.worldX, p.worldY + 22).setVisible(true);
    const h = this.cellAt(p.worldX, p.worldY);
    if (h !== this.hoverIdx) {
      this.hoverIdx = h;
      this.drawHeld();
    }
    if (this.overScrap(p.worldX, p.worldY) !== (this.scrapHold > 0 || this.overScrapFlag)) {
      this.overScrapFlag = this.overScrap(p.worldX, p.worldY);
      this.scrapHold = 0;
    }
  }
  overScrapFlag = false;
  dragShadow?: Phaser.GameObjects.Ellipse;

  onUp(p: Phaser.Input.Pointer) {
    if (!this.canAct()) {
      this.cancelDrag();
      return;
    }
    const upIdx = this.cellAt(p.worldX, p.worldY);
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
        } else if (this.overScrap(p.worldX, p.worldY) && this.s.phase === 'playing') {
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
    this.dragShadow?.setVisible(false);
    view?.setAngle(0);
    this.dragIdx = -1;
    this.hoverIdx = -1;
    if (view) view.setDepth(10);
    if (this.overScrap(p.worldX, p.worldY) && this.s.phase === 'playing') {
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
    this.dragShadow?.setVisible(false);
    if (!view) return;
    view.setAngle(0);
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
    if (this.s.phase === 'tutorial' && this.onTutorialMismatch(from, to)) return false;
    const merging = canMerge(a, b);
    this.pulledMerge = merging && (this.pulledIds.has(a!.id) || this.pulledIds.has(b!.id));
    const prevBest = this.s.stats.bestRank;
    const res = drop(this.s, from, to, id);
    if (!res.ok) {
      sfx.invalid();
      tlog.log('invalid');
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
      const ce = res.events.find((e) => e.type === 'cascade');
      tlog.log('merge', { fam: ng.family, rank: ng.rank, chain: ce && ce.type === 'cascade' ? ce.result.count : 1, at: +this.s.elapsed.toFixed(1), occ: this.s.grid.filter(Boolean).length });
      sfx.merge(ng.rank);
      if (ng.rank > prevBest && ng.rank >= 2) {
        const { x, y } = cellXY(to);
        this.time.delayedCall(120, () => {
          sfx.rankUp(ng.rank);
          this.floatText(x, y + 46, ng.rank >= MAX_RANK ? 'MAX!' : `RANK ${ng.rank}`, '#ffffff', 28, 200);
          this.ring(x, y, FAMILY_INFO[ng.family].color, 110, 16, 420);
        });
      }
      haptic(15);
      if (this.s.phase === 'tutorial') this.onTutorialMerge();
    } else {
      sfx.drop();
      if (a && b && a.family === b.family && a.rank !== b.rank) {
        this.showEvent(`Swapped. Merging needs the SAME number (${a.rank} ≠ ${b.rank})`, '#ffd2c8', 2600);
        tlog.log('rank_mismatch', { fam: a.family, a: a.rank, b: b.rank });
        for (const id of [a.id, b.id]) {
          const rv = this.views.get(id)?.getByName('rank') as Phaser.GameObjects.Text | undefined;
          if (rv) this.tweens.add({ targets: rv, scale: 1.6, duration: 160, yoyo: true, repeat: 2 });
        }
      } else if (a && b && a.family !== b.family) this.showEvent('Swapped. Merge two of the SAME gadget', '#fff0cf', 1600);
      tlog.log('move', { swap: !!b });
      this.reconcile();
    }
    this.handleEvents(res.events);
    this.save();
    return true;
  }

  doScrap(idx: number, id: number) {
    const res = scrap(this.s, idx, id);
    if (!res.ok) return;
    tlog.log('scrap', { rank: (res.events[0] as { gadget?: Gadget }).gadget?.rank });
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
    // while holding: everything you can't merge with fades, matches stay bright (playtest: ranks were confused)
    const held = src >= 0 ? this.s.grid[src] : null;
    this.s.grid.forEach((b, i) => {
      const v = b ? this.views.get(b.id) : undefined;
      if (!v) return;
      const bright = !held || i === src || canMerge(held, b);
      v.setAlpha(bright ? 1 : 0.45);
    });
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
    this.updateFace();
    this.coach.update(this.time.now);
    this.checkTips();
    this.drawRemix();
    if (this.time.now - this.lastSave > 2000) this.save();
  }

  /** Cannons about to auto-fire puff up a little; everything breathes slightly. */
  primeG!: Phaser.GameObjects.Graphics;
  lastTickSec = -1;
  resultCall: Phaser.Time.TimerEvent | null = null;
  resultAt = 0;
  animateIdle() {
    const t = this.time.now / 1000;
    if (this.target && !this.tweens.isTweening(this.target) && this.s.phase === 'playing') this.target.setAngle(Math.sin(t * 1.4) * 1.6);
    if (this.s.phase === 'playing' && this.s.timeLeft < 10 && this.s.target >= 0) {
      const sec = Math.ceil(this.s.timeLeft);
      if (sec !== this.lastTickSec) {
        this.lastTickSec = sec;
        sfx.click();
        this.timerText.setScale(1.35);
        this.tweens.add({ targets: this.timerText, scale: 1, duration: 300, ease: 'Back.Out' });
      }
    }
    if (!this.primeG) this.primeG = this.add.graphics().setDepth(11);
    this.primeG.clear();
    this.s.grid.forEach((g, idx) => {
      if (!g?.primed) return;
      const { x, y } = cellXY(idx);
      const a = 0.6 + 0.4 * Math.sin(t * 6);
      this.primeG.lineStyle(5, 0x9be05a, a).strokeRoundedRect(x - 54, y - 54, 108, 108, 22);
      // little lightning bolt badge, top-right
      this.primeG.fillStyle(0x2b1d2e, 1).fillCircle(x + 38, y - 38, 15).fillStyle(0x9be05a, 1).fillCircle(x + 38, y - 38, 12);
      this.primeG.fillStyle(0x2b1d2e, 1).fillTriangle(x + 40, y - 48, x + 32, y - 36, x + 39, y - 36).fillTriangle(x + 37, y - 40, x + 44, y - 40, x + 36, y - 28);
    });
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

  // ---------- guided tutorial (playtest: "I was missing a good tutorial") ----------

  // Script from ChatGPT round 8 (6 hands-on steps on the real start board, idx = row*5+col).
  static TUTORIAL: { kind: 'merge' | 'mismatch'; pair: [number, number]; fam: Family; text: string; after?: string; focus?: 'target' | 'chain' | 'row' }[] = [
    { kind: 'merge', pair: [21, 22], fam: 'cannon', text: 'Same machine, same number.\nDrag one onto its match!', after: 'It got stronger and FIRED!\nEvery machine that fires hits the monster.', focus: 'target' },
    { kind: 'merge', pair: [6, 16], fam: 'coil', text: 'Merge to fire. Coils zap nearby\nmachines into a CHAIN.', after: 'That was a CHAIN: one merge\nset off its neighbours!', focus: 'chain' },
    { kind: 'merge', pair: [8, 17], fam: 'bell', text: 'Bells wake machines across\ntheir whole row. Watch the cannon!', after: 'The bell rang its row\nand woke that cannon!', focus: 'row' },
    { kind: 'mismatch', pair: [5, 22], fam: 'cannon', text: 'Different numbers can NOT merge.\nTry dragging this 1 onto the 2.' },
    { kind: 'merge', pair: [5, 19], fam: 'cannon', text: 'Cannons fire alone, slowly.\nIn a chain they hit much harder!' },
    { kind: 'merge', pair: [19, 22], fam: 'cannon', text: 'Two 2s make a 3! Bigger number,\nbigger blast.', after: 'Beat 3 monsters before the\nclock runs out. LET\'S PLAY!' },
  ];

  coachY() {
    return Math.max(STAGE_TOP + 90, HP_Y - 120);
  }

  /** Suggested pair for a step: the scripted cells if still valid, else any legal pair of that family. */
  tutorialPair(step: (typeof GameScene.TUTORIAL)[number]): [number, number] | null {
    const [a, b] = step.pair;
    const ga = this.s.grid[a], gb = this.s.grid[b];
    if (step.kind === 'mismatch') {
      if (ga && gb && ga.family === gb.family && ga.rank !== gb.rank) return [a, b];
      const cs = this.s.grid.flatMap((g, i) => (g && g.family === step.fam ? [{ g, i }] : []));
      for (const x of cs) for (const y of cs) if (x.g.rank !== y.g.rank) return [x.i, y.i];
      return null;
    }
    if (canMerge(ga, gb)) return [a, b];
    const pairs = legalPairs(this.s);
    return pairs.find(([p]) => this.s.grid[p]!.family === step.fam) ?? pairs[0] ?? null;
  }

  runTutorial() {
    if (this.s.phase !== 'tutorial') return;
    const step = GameScene.TUTORIAL[this.tutorialStep];
    this.coach.clear();
    if (!step) {
      // script done: the real run starts on the board they just built
      const ev = finishTutorial(this.s);
      this.meta.tutorialDone = true;
      store(META_KEY, JSON.stringify(this.meta));
      tlog.log('tutorial_done');
      this.handleEvents(ev);
      this.showEvent('GO! Beat the TIN CAN', '#ffd24a', 2000);
      return;
    }
    this.coach.say(step.text, this.coachY());
    const pair = this.tutorialPair(step);
    if (!pair) {
      this.tutorialStep++;
      this.time.delayedCall(200, () => this.runTutorial());
      return;
    }
    this.coach.focus([cellXY(pair[0]), cellXY(pair[1])]);
    // hand shows the move (repeats); ChatGPT: players should get a chance to try first, so it starts after a beat
    this.time.delayedCall(this.tutorialStep === 0 ? 400 : 1600, () => {
      if (GameScene.TUTORIAL[this.tutorialStep] === step && this.s.phase === 'tutorial') this.coach.drag(cellXY(pair[0]), cellXY(pair[1]));
    });
  }

  /** After a tutorial merge: short self-dismissing explanation, then the next step. */
  onTutorialMerge() {
    const step = GameScene.TUTORIAL[this.tutorialStep];
    if (!step || step.kind !== 'merge') return;
    this.coach.clear();
    this.tutorialStep++;
    const next = () => this.runTutorial();
    if (!step.after) {
      this.time.delayedCall(1200, next);
      return;
    }
    this.time.delayedCall(900, () => {
      this.coach.say(step.after!, this.coachY(), { ms: 2600 });
      if (step.focus === 'target') this.coach.focus([{ x: this.target.x, y: this.target.y, r: 120 }]);
      if (step.focus === 'chain' && this.lastCascade) this.coach.focus(this.lastCascade.activations.map((a) => cellXY(a.idx)));
      if (step.focus === 'row' && this.lastCascade) {
        const row = Math.floor(this.lastCascade.rootIdx / COLS);
        this.coach.focus(this.s.grid.flatMap((g, i) => (g && Math.floor(i / COLS) === row ? [cellXY(i)] : [])));
      }
      this.time.delayedCall(2800, next);
    });
  }

  /** Tutorial step 4: a mismatched drop bounces back (no swap) and teaches the rule. */
  onTutorialMismatch(from: number, to: number): boolean {
    const step = GameScene.TUTORIAL[this.tutorialStep];
    const a = this.s.grid[from], b = this.s.grid[to];
    if (this.s.phase !== 'tutorial' || !a || !b || a.family !== b.family || a.rank === b.rank) return false;
    sfx.invalid();
    for (const id of [a.id, b.id]) {
      const rv = this.views.get(id)?.getByName('rank') as Phaser.GameObjects.Text | undefined;
      if (rv) this.tweens.add({ targets: rv, scale: 1.7, duration: 150, yoyo: true, repeat: 2 });
    }
    this.showEvent(`Rank ${a.rank} ≠ Rank ${b.rank}: no merge`, '#ffd2c8', 2200);
    if (step?.kind === 'mismatch') {
      this.coach.clear();
      this.coach.say('Right! Only the SAME number merges.', this.coachY(), { ms: 1800 });
      this.tutorialStep++;
      this.time.delayedCall(2000, () => this.runTutorial());
    }
    return true;
  }
  /** First-time contextual tips (once per player). */
  tip(id: string, text: string, pointAt?: { x: number; y: number }) {
    if (this.meta.tips[id] || this.s.phase !== 'playing' || this.modal) return;
    this.meta.tips[id] = true;
    store(META_KEY, JSON.stringify(this.meta));
    tlog.log('tip', { id });
    this.coach.say(text, this.coachY(), { ms: 4200 });
    if (pointAt) {
      this.coach.point(pointAt);
      this.time.delayedCall(3000, () => this.coach.stopHand());
    }
  }

  checkTips() {
    const s = this.s;
    if (s.phase !== 'playing' || this.coach.waitingTap) return;
    const occ = s.grid.filter(Boolean).length;
    if (s.elapsed > 1.5 && s.elapsed < 6) this.tip('delivery', 'New parts drop in from here.\nMerge them into your machine!', { x: BX + 150, y: TRAY_Y - 30 });
    if (s.odCharge === odNeeded(s) - 1 && s.odLeft <= 0) this.tip('overdrive', 'One more merge fills the bolt meter:\nOVERDRIVE, cannons fire super fast!');
    if (s.drops.length) this.tip('kickback', 'A chunk broke off the monster!\nIt lands and upgrades one of your parts.');
    if (occ >= 23) this.tip('full', 'Board filling up! Merge pairs,\nor drag junk onto SCRAP.', { x: SCRAP_X, y: TRAY_Y - 30 });
    if (s.timeLeft < 30 && s.target >= 0) this.tip('clock', '30 seconds left!\nGo for the biggest chains you can.');
    if (s.target === 1) this.tip('next', 'Next monster! Your machine and\nupgrades carry over. Keep going!');
  }

  updateHints() {
    if (this.s.phase === 'tutorial') {
      this.tutorialText.setText('');
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
    this.headerText.setColor(s.hard ? '#b3201a' : s.remix ? '#1f6f8f' : '#3b2533');
    if (this.headerText.text !== this.lastHeader) {
      // fixed header columns: the name gets x 70..350 and shrinks to fit
      this.lastHeader = this.headerText.text;
      let fs = 30;
      this.headerText.setFontSize(fs);
      while (this.headerText.width > 276 && fs > 18) this.headerText.setFontSize((fs -= 2));
    }
    this.headerText.setText(demo ? 'WARM-UP' : s.remix ? TARGET_NAMES[s.target] : `${Math.min(s.target + 1, 3)}/3 ${TARGET_NAMES[Math.min(s.target, 2)]}`);
    const t = Math.ceil(s.timeLeft);
    this.timerText.setText(demo ? '' : `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`);
    this.timerText.setColor(s.timeLeft < 15 && !demo ? '#d8261a' : '#3b2533');
    this.practiceText.setVisible(s.practice && !demo);

    // smooth HP
    this.shownHp += (s.hp - this.shownHp) * Math.min(1, dms / 120);
    const frac = Math.max(0, this.shownHp / s.maxHp);
    const bw = 440;
    const hb = this.hpBar.clear();
    if (this.hpFill) {
      this.hpFill.setCrop(0, 0, this.hpFill.width * frac, this.hpFill.height);
      this.hpFill.setTint(frac > 0.5 ? 0xffffff : frac > 0.25 ? 0xffd27a : 0xff8a7a);
    } else {
    hb.fillStyle(0x2b1d2e, 1).fillRoundedRect(W / 2 - bw / 2 - 5, HP_Y - 18, bw + 10, 36, 18);
    hb.fillStyle(0x5a4a5a, 1).fillRoundedRect(W / 2 - bw / 2, HP_Y - 13, bw, 26, 13);
    if (frac > 0) hb.fillStyle(frac > 0.5 ? 0x5fd35f : frac > 0.25 ? 0xf2b521 : 0xe8452c, 1).fillRoundedRect(W / 2 - bw / 2, HP_Y - 13, Math.max(26, bw * frac), 26, 13);
    }
    this.hpText.setText(fmt(Math.max(0, Math.round(this.shownHp))));

    // overdrive gauge
    const og = this.odGauge.clear();
    const need = odNeeded(s);
    const gx = 384;
    this.boltIcon?.setPosition(gx - 26, 46).setVisible(!demo).setAngle(s.odLeft > 0 ? Math.sin(this.time.now / 60) * 12 : 0);
    const active = s.odLeft > 0;
    const gaugeArt = this.hasArt('gauge_off') && this.hasArt('gauge_on');
    if (gaugeArt && !this.gaugeImgs.length) for (let i = 0; i < 6; i++) this.gaugeImgs.push(this.add.image(0, 46, 'gauge_off').setDisplaySize(24, 34));
    this.gaugeImgs.forEach((g, i) => {
      const on = i < need && !demo;
      g.setVisible(on).setPosition(gx + i * 26 + 11, 46);
      if (on) g.setTexture(active ? (this.hasArt('gauge_lit') ? 'gauge_lit' : 'gauge_on') : i < s.odCharge ? 'gauge_on' : 'gauge_off').setDisplaySize(24, 34);
    });
    for (let i = 0; i < (demo || gaugeArt ? 0 : need); i++) {
      const filled = active || i < s.odCharge;
      og.fillStyle(0x2b1d2e, 1).fillRoundedRect(gx + i * 26, 30, 22, 30, 6);
      og.fillStyle(filled ? (active ? 0xff6a00 : 0xffcf33) : 0x7a6a6a, 1).fillRoundedRect(gx + i * 26 + 3, 33, 16, 24, 4);
    }
    setMusicIntensity(active);
    const glow = this.odGlow.clear();
    for (const fl of this.flames) fl.setVisible(active).setAlpha(0.75 + 0.25 * Math.sin(this.time.now / 70));
    if (active && !this.flames.length) {
      const a = 0.35 + 0.25 * Math.sin(this.time.now / 90);
      glow.lineStyle(14, 0xff6a00, a).strokeRoundedRect(BX - 14, BY - 14, CELL * COLS + 28, CELL * ROWS + 28, 30);
    }

    // tray
    const nxt = peekNext(s);
    this.trayIcon.setTexture(`${nxt.family}_${nxt.rank}`);
    const f = this.trayIcon.frame;
    this.trayIcon.setScale(Math.min(54 / f.width, 54 / f.height));
    this.trayBadge.setText(nxt.rank > 1 ? String(nxt.rank) : '');
    const ta = this.trayArc.clear();
    const prog = s.pending.length >= TUNING.maxPending ? 1 : 1 - s.supplyTimer / supplyPeriod(s);
    ta.lineStyle(6, 0xfbe7c6, 0.9).beginPath().arc(BX + 150, TRAY_Y, 38, -Math.PI / 2, -Math.PI / 2 + prog * Math.PI * 2).strokePath();
    this.pendingText.setText(s.pending.length ? (s.trayHold ? `board full · +${s.pending.length}` : `+${s.pending.length} waiting`) : '');
    const tut = s.phase === 'tutorial';
    this.scrapZone.setVisible(!tut);
    this.trayPlate?.setVisible(!tut);
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
          this.checkChallenges(e.result, e.kickback);
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
          const themed = `kick_${Math.max(0, this.s.target)}_${Phaser.Math.Between(0, 1)}`;
          const key = this.hasArt(themed) ? themed : g ? `${g.family}_${g.rank}` : 'chunk';
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
          sfx.kickback(e.into >= 0);
          tlog.log('kickback', { fuse: e.into >= 0 });
          this.chunks.explode(8, land.x, land.y);
          if (e.into >= 0) {
            const into = cellXY(e.into);
            spawn.set(e.gadget.id, land);
            this.ring(into.x, into.y, 0xffcf33, 90, 14, 320);
            this.showEvent('KICKBACK!  A loose part upgraded yours', '#ffd24a', 1800);
          } else spawn.set(e.gadget.id, { x: land.x, y: land.y - 80 });
          needReconcile = true;
          break;
        }        case 'threshold':
          sfx.panelBreak(e.target);
          this.chunks.explode(18, this.target.x, this.target.y - 40);
          this.shake(140, 0.006);
          if (e.level >= 2) this.setTargetTexture();
          break;
        case 'kill':
          if (!e.demo) tlog.log('kill', { target: e.target, at: +this.s.elapsed.toFixed(1) });
          if (e.final) this.playBossDefeat();
          else this.playKill(e.final, e.demo);
          break;
        case 'newTarget':
          this.introTarget();
          break;
        case 'overdriveEnd':
          break;
        case 'remixWarn':
          sfx.invalid();
          tlog.log('remix_warn', { kind: e.kind, cells: e.cells });
          this.hitTarget(false);
          break;
        case 'remixHit': {
          tlog.log('remix_hit', { kind: e.kind, outcome: e.outcome });
          const c0 = cellXY(e.cells[0]);
          if (e.kind === 'vacuum' && e.removedId !== undefined) {
            const v = this.views.get(e.removedId);
            if (v) {
              this.views.delete(e.removedId);
              this.tweens.add({ targets: v, x: this.target.x, y: this.target.y, scale: 0.1, angle: 720, duration: 420, ease: 'Quad.In', onComplete: () => v.destroy() });
            }
            sfx.scrap();
            this.showEvent('SLURP!  The Viper ate a part', '#ffb0a0', 1600);
          } else if (e.kind === 'twins' && e.outcome === 'hit') {
            sfx.fan(0);
            this.showEvent('SHOVE!  Part pushed aside', '#ffd24a', 1400);
          } else if (e.kind === 'piano' && e.outcome === 'hit') {
            sfx.panelBreak(2);
            this.shake(160, 0.006);
            this.showEvent('ROW LOCKED  ·  4s', '#d9c2ff', 1200);
          } else this.showEvent(e.outcome === 'jam' ? 'JAMMED!  Nowhere to shove it' : 'MISSED!  You saved it', '#b8f07a', 1600);
          void c0;
          needReconcile = true;
          break;
        }
        case 'remixUnlock':
          sfx.click();
          break;
        case 'scrap':
          needReconcile = true;
          break;
        case 'end':
          tlog.log('end', { won: e.won, targets: e.won ? 3 : this.s.target, elapsed: +this.s.elapsed.toFixed(1), chain: this.s.stats.biggestChain });
          tlog.flush();
          // a win first plays the full boss-defeat show (playtest: 'I want to see me winning the boss')
          this.resultAt = this.time.now;
          this.resultCall = this.time.delayedCall(e.won ? 3600 : 400, () => this.openResult(e.won));
          break;
      }
    }
    if (needReconcile) this.reconcile(false, spawn);
    if (this.s.phase === 'choice' && !this.modal && events.some((e) => e.type === 'kill' && !e.final && !e.demo)) {
      this.time.delayedCall(450, () => this.openChoice());
    }
  }

  /** Transient message in the event lane. Remix warnings (drawRemix) override it while active. */
  showEvent(text: string, color = '#fff0cf', ms = 1400) {
    this.laneMsg = { text, color, until: this.time.now + ms };
    this.laneText.setScale(1.25);
    this.tweens.add({ targets: this.laneText, scale: 1, duration: 180, ease: 'Back.Out' });
  }

  updateLane(persistent: string | null, color = '#ffd2c8') {
    const msg = persistent ?? (this.time.now < this.laneMsg.until ? this.laneMsg.text : '');
    const col = persistent ? color : this.laneMsg.color;
    const on = !!msg;
    if (msg) this.laneText.setText(msg).setColor(col);
    const a = on ? 1 : Math.max(0, this.laneText.alpha - 0.08);
    this.laneText.setAlpha(a);
    this.laneBg.setAlpha(a * 0.95);
  }

  floatText(x: number, y: number, text: string, color = '#ffffff', size = 34, hold = 0, banner = '') {
    const label = this.add.text(0, 0, text, { fontFamily: 'Lilita One, Arial Black', fontSize: `${size}px`, color, stroke: '#2b1d2e', strokeThickness: Math.max(5, size / 6), align: 'center' }).setOrigin(0.5);
    const t = this.add.container(x, y).setDepth(70);
    if (banner && this.hasArt(banner)) {
      const b = this.add.image(0, 4, banner);
      b.setScale(Math.max((label.width + size * 2.2) / b.width, (label.height + size * 1.2) / b.height));
      t.add(b);
    }
    t.add(label);
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

  /** MAX signature visuals: reveal the resolver's chosen target (Backfire puff, Arc Bridge bolt, Cross Chime ring). */
  signatureFx(kind: 'backfire' | 'bridge' | 'chime' | 'magnet' | 'battery' | 'fan', a: { x: number; y: number }, b: { x: number; y: number }) {
    const key = { backfire: 'max_backfire', bridge: 'max_bridge', chime: 'max_chime', magnet: 'max_twin', battery: 'max_split', fan: 'max_gust' }[kind];
    const ang = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
    if (this.hasArt(key)) {
      const im = this.add.image((a.x + b.x) / 2, (a.y + b.y) / 2, key).setDepth(32).setAngle(kind === 'chime' ? 0 : ang);
      const len = Phaser.Math.Distance.Between(a.x, a.y, b.x, b.y);
      im.setScale((kind === 'chime' ? 150 : len + 40) / im.width);
      this.tweens.add({ targets: im, alpha: 0, delay: 200, duration: 260, onComplete: () => im.destroy() });
    } else {
      const col = kind === 'backfire' ? 0xff5a3c : kind === 'bridge' ? 0x6ff3ff : kind === 'magnet' ? 0xe07af0 : kind === 'battery' ? 0x9be05a : kind === 'fan' ? 0xbfe8ff : 0xffe066;
      this.ring(b.x, b.y, col, 70, 10, 260);
    }
    const label = { backfire: 'BACKFIRE!', bridge: 'ARC BRIDGE!', chime: 'CROSS CHIME!', magnet: 'TWIN PULL!', battery: 'SPLIT CHARGE!', fan: 'LONG GUST!' }[kind];
    this.floatText(b.x, b.y - 50, label, '#ffffff', 24, 150);
  }

  /** One-shot sprite effect from ChatGPT's VFX set. Returns false if the art is missing (caller falls back). */
  fx(key: string, x: number, y: number, size: number, opts: { angle?: number; dur?: number; grow?: number; depth?: number } = {}): boolean {
    if (!this.hasArt(key)) return false;
    const img = this.add.image(x, y, key).setDepth(opts.depth ?? 49).setAngle(opts.angle ?? 0);
    const s = size / Math.max(img.width, img.height);
    img.setScale(s * 0.6);
    this.tweens.add({ targets: img, scale: s * (opts.grow ?? 1.3), alpha: 0, duration: opts.dur ?? 160, ease: 'Quad.Out', onComplete: () => img.destroy() });
    return true;
  }

  flash(x: number, y: number, size: number, color = 0xffffff) {
    const c = this.add.image(x, y, 'dot').setTint(color).setDepth(49).setScale(size / 16).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: c, scale: (size * 1.6) / 16, alpha: 0, duration: 140, onComplete: () => c.destroy() });
  }

  /** Face patches (face_<target>_<hit|angry|dizzy>) cover the sprite's own face; offsets are fractions of the sprite box. */
  // calibrated against ChatGPT's sprites (fractions of the 512px target box; patch boxes are 256px with ~0.83 fill)
  static FACE = [
    { x: 0.02, y: 0.0, w: 0.58 },
    { x: -0.07, y: -0.075, w: 0.59 },
    { x: 0.235, y: -0.255, w: 0.5 },
  ];

  showFace(mood: 'hit' | 'angry' | 'dizzy' | null, ms = 0) {
    const ti = this.s.target;
    const key = ti >= 0 && mood ? `face_${ti}_${mood}` : '';
    if (!key || !this.hasArt(key)) {
      this.face.setVisible(false);
      return;
    }
    const cfg = GameScene.FACE[ti];
    const tw = this.target.displayWidth;
    const th = this.target.displayHeight;
    this.face.setTexture(key).setVisible(true);
    this.face.setScale((tw * cfg.w) / this.face.width);
    this.face.setPosition(this.target.x + cfg.x * tw, this.target.y + cfg.y * th).setAngle(this.target.angle);
    this.faceUntil = ms ? this.time.now + ms : 0;
  }

  updateFace() {
    if (!this.face) return;
    const s = this.s;
    if (this.faceUntil && this.time.now < this.faceUntil) {
      this.face.setPosition(this.target.x + GameScene.FACE[Math.max(0, s.target)].x * this.target.displayWidth, this.target.y + GameScene.FACE[Math.max(0, s.target)].y * this.target.displayHeight).setAngle(this.target.angle).setAlpha(this.target.alpha);
      return;
    }
    this.showFace(s.target >= 0 && s.phase === 'playing' && s.hp / s.maxHp < 0.25 ? 'angry' : null);
  }

  hitTarget(big: boolean) {
    if (big) this.showFace('hit', 380);
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
          if (big && !this.fx('vfx_impact', b.x, b.y, 110, { dur: 140 })) this.ring(b.x, b.y, color, 46, 8, 200);
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
    this.lastCascade = r;
    const sig = r.edges.filter((e) => e.kind === 'backfire' || e.kind === 'bridge' || e.kind === 'chime').map((e) => e.kind);
    if (sig.length) tlog.log('max_signature', { kinds: sig, chain: r.count });
    const maxDepth = Math.max(...r.activations.map((a) => a.depth));
    const step = maxDepth > 0 ? Math.min(70, 380 / maxDepth) : 0;
    const windup = kickback ? 300 : 90;
    const depthOf = new Map(r.activations.map((a) => [a.idx, a.depth]));
    const maxToys = new Set(r.activations.filter((a) => a.rank >= MAX_RANK && (a.family === 'magnet' || a.family === 'battery' || a.family === 'fan')).map((a) => a.family as string));
    if (odStart) {
      sfx.overdrive();
      this.showEvent('OVERDRIVE!  Cannons fire fast', '#ffb070', 2200);
      this.cameras.main.flash(140, 255, 140, 0, false);
    }
    // root snap
    const root = cellXY(r.rootIdx);
    this.ring(root.x, root.y, 0xffffff, 80, 14, 300);
    if (!this.fx('vfx_spark', root.x, root.y, 150, { dur: 180, grow: 1.5 })) this.flash(root.x, root.y, 70);
    // links: a fading line + a travelling pulse per route
    const lg = this.add.graphics().setDepth(30);
    for (const e of r.edges) {
      const a = cellXY(e.from);
      const b = cellXY(e.to);
      const col = e.kind === 'coil' ? 0x5fe8ff : e.kind === 'bell' ? 0xffd34a : e.kind === 'magnet' ? 0xe07af0 : e.kind === 'battery' ? 0x9be05a : e.kind === 'fan' ? 0xbfe8ff : e.kind === 'backfire' ? 0xff5a3c : e.kind === 'bridge' ? 0x6ff3ff : e.kind === 'chime' ? 0xffe066 : 0xffffff;
      const d = windup + (depthOf.get(e.from) ?? 0) * step;
      this.time.delayedCall(d, () => {
        if (e.kind === 'backfire' || e.kind === 'bridge' || e.kind === 'chime') this.signatureFx(e.kind, a, b);
        else if ((e.kind === 'magnet' || e.kind === 'battery' || e.kind === 'fan') && maxToys.has(e.kind)) this.signatureFx(e.kind, a, b);
        if ((e.kind === 'coil' || e.kind === 'bridge') && this.hasArt('vfx_arc')) {
          const arc = this.add.image((a.x + b.x) / 2, (a.y + b.y) / 2, 'vfx_arc').setDepth(30);
          const len = Phaser.Math.Distance.Between(a.x, a.y, b.x, b.y);
          arc.setRotation(Math.atan2(b.y - a.y, b.x - a.x)).setDisplaySize(len, Math.min(60, (arc.height / arc.width) * len * 1.4));
          this.tweens.add({ targets: arc, alpha: 0, delay: 220, duration: 220, onComplete: () => arc.destroy() });
        } else lg.lineStyle(e.kind === 'spark' ? 5 : 8, col, 0.85).lineBetween(a.x, a.y, b.x, b.y);
        const p = this.add.image(a.x, a.y, 'spark').setTint(col).setDepth(31).setScale(1.1).setBlendMode(Phaser.BlendModes.ADD);
        this.tweens.add({ targets: p, x: b.x, y: b.y, angle: 180, duration: Math.max(60, step), onComplete: () => p.destroy() });
      });
    }
    this.tweens.add({ targets: lg, alpha: 0, delay: windup + maxDepth * step + 200, duration: 250, onComplete: () => lg.destroy() });

    // group activations into beats (one per depth): one phrase note + at most one zap / ring / payload per beat
    // live chain counter in the lane: counts up beat by beat, then the final line lands on the hit
    if (r.count > 2) {
      let soFar = 0;
      for (let d = 0; d <= maxDepth; d++) {
        soFar += r.activations.filter((a) => a.depth === d).length;
        const n = soFar;
        this.time.delayedCall(windup + d * step, () => this.showEvent(`CHAIN  x${n}`, n >= 10 ? '#ffd24a' : '#fff0cf', 900));
      }
    }
    for (let d = 0; d <= maxDepth; d++) {
      const at = (windup + d * step) / 1000;
      const acts = r.activations.filter((a) => a.depth === d);
      if (d > 0) sfx.cascadeStep(Math.min(d - 1, 3), at);
      if (acts.some((a) => a.family === 'coil')) sfx.zap(at);
      const bell = acts.find((a) => a.family === 'bell');
      if (bell) sfx.bell(bell.rank, at);
      if (acts.some((a) => a.family === 'cannon')) sfx.cannon(at + 0.02, true);
      if (acts.some((a) => a.family === 'magnet')) sfx.magnet(at);
      if (acts.some((a) => a.family === 'battery')) sfx.battery(at);
      if (acts.some((a) => a.family === 'fan')) sfx.fan(at);
    }
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
        if (a.rank >= 5) {
          // rank 5: cosmetic charge accent; rank 6: MAX glow (its signature effect is drawn on its link)
          this.ring(x, y, a.rank >= MAX_RANK ? 0xffffff : color, a.rank >= MAX_RANK ? 92 : 74, a.rank >= MAX_RANK ? 14 : 8, a.rank >= MAX_RANK ? 300 : 160);
          sfx.cannon(0, true);
          if (a.rank >= MAX_RANK) haptic(25);
        }
        if (a.family === 'bell') this.fx('vfx_wave', x, y, 170, { dur: 300, grow: 1.6, depth: 29 });
        if (a.family === 'cannon') {
          if (!this.fx('vfx_muzzle', x, y - 58, 90, { angle: -90, dur: 100, grow: 1.1 })) this.flash(x, y - 46, 40, 0xfff0a0);
        }
      });
      this.shoot(x, y - 30, color, delay + 30, a.family === 'cannon');
    });
    const end = windup + maxDepth * step + 260;
    this.time.delayedCall(end, () => {
      const big = r.count >= 6;
      this.hitTarget(true);
      if (r.count >= 3) {
        sfx.chord(Math.min(r.count, 20));
        duckMusic();
      }
      // camera: no shake for small merges, a 1-2px kick for real payloads, a 3px hit when a MAX machine fired
      const hasMax = r.activations.some((a) => a.rank >= MAX_RANK);
      if (hasMax) this.shake(100, 0.006);
      else if (big) this.shake(70, 0.003);
      haptic(big ? 30 : 12);
      const huge = r.count >= 10;
      if (r.count > 1) this.showEvent(`x${r.count} CHAIN  ·  ${fmt(r.total)}`, huge ? '#ffd24a' : '#fff0cf', 1500);
      // damage number beside the opponent, never on its face
      this.floatText(this.target.x + 150, this.target.y - 40, fmt(r.total), huge ? '#ffcf33' : '#ffffff', huge ? 44 : 34, huge ? 200 : 0);
    });
  }

  /** Final blow: hit-stop, rattle with dizzy face, rolling explosions, collapse, parts rain onto your board, machine celebrates. */
  playBossDefeat() {
    const tgt = this.target;
    const name = TARGET_NAMES[Math.max(0, this.s.target)] ?? 'BOSS';
    this.cancelDrag();
    this.coach.clear();
    // 1) hit-stop flash + slight zoom on the boss
    this.time.delayedCall(250, () => {
      this.cameras.main.flash(180, 255, 255, 255);
      this.tweens.add({ targets: tgt, scale: this.targetBaseScale * 1.12, duration: 260, ease: 'Quad.Out' });
      haptic(80);
      this.tweens.killTweensOf(tgt);
      if (this.hasArt(`target_${this.s.target}_dmg`)) tgt.setTexture(`target_${this.s.target}_dmg`);
      this.showFace('dizzy', 3000);
      this.tweens.add({ targets: tgt, x: { from: tgt.x - 10, to: tgt.x + 10 }, angle: { from: -4, to: 4 }, duration: 55, yoyo: true, repeat: 10 });
    });
    // 2) rolling explosions across the body
    for (let i = 0; i < 7; i++) {
      this.time.delayedCall(350 + i * 130, () => {
        const x = tgt.x + Phaser.Math.Between(-110, 110);
        const y = tgt.y + Phaser.Math.Between(-100, 90);
        if (!this.fx('vfx_impact', x, y, 150, { dur: 220, grow: 1.6, depth: 60 })) this.ring(x, y, 0xffcf33, 90, 12, 260);
        this.sparks.setParticleTint([0xffcf33, 0xff6a00, 0xffffff][i % 3]);
        this.sparks.explode(14, x, y);
        sfx.hit(true);
      });
    }
    // 3) the big one: collapse, junk rains onto the board
    this.time.delayedCall(1350, () => {
      sfx.kill();
      this.shake(450, 0.02);
      this.ring(tgt.x, tgt.y, 0xffcf33, 320, 26, 520);
      this.ring(tgt.x, tgt.y, 0xffffff, 220, 16, 380);
      this.chunks.explode(90, tgt.x, tgt.y);
      this.tweens.add({ targets: tgt, y: tgt.y + 90, angle: 35, alpha: 0, scale: this.targetBaseScale * 0.35, duration: 520, ease: 'Quad.In' });
      const keys = [0, 1].map((k) => `kick_${Math.max(0, this.s.target)}_${k}`).filter((k) => this.hasArt(k));
      for (let i = 0; i < 14; i++) {
        const key = keys.length ? keys[i % keys.length] : 'chunk';
        const p = this.add.image(tgt.x + Phaser.Math.Between(-60, 60), tgt.y, key).setDepth(58);
        p.setScale(Math.min(70 / p.width, 70 / p.height));
        const to = cellXY(Phaser.Math.Between(0, ROWS * COLS - 1));
        this.tweens.add({
          targets: p,
          x: to.x + Phaser.Math.Between(-30, 30),
          y: to.y,
          angle: Phaser.Math.Between(-540, 540),
          duration: 520 + i * 35,
          ease: 'Quad.In',
          onComplete: () => {
            this.sparks.setParticleTint(0xffcf33);
            this.sparks.explode(5, p.x, p.y);
            this.tweens.add({ targets: p, alpha: 0, scale: p.scale * 0.5, duration: 260, onComplete: () => p.destroy() });
          },
        });
      }
    });
    // 4) your machine celebrates: a bounce wave row by row + banner + confetti
    this.time.delayedCall(1900, () => {
      this.floatText(W / 2, STAGE_TOP + STAGE_H / 2, `${name}\nDOWN!`, '#ffcf33', 74, 1100, 'banner_destroyed');
      sfx.win();
      this.s.grid.forEach((g, idx) => {
        const v = g ? this.views.get(g.id) : undefined;
        if (!v) return;
        const row = Math.floor(idx / COLS);
        this.tweens.add({ targets: v, y: v.y - 34, scale: 1.18, duration: 160, delay: row * 70, yoyo: true, ease: 'Quad.Out' });
      });
      for (let i = 0; i < 6; i++)
        this.time.delayedCall(i * 160, () => {
          this.sparks.setParticleTint([0xe8452c, 0x27c4e0, 0xf2b521, 0x9be05a, 0xc23fd1, 0xffffff][i]);
          this.sparks.explode(26, Phaser.Math.Between(80, W - 80), Phaser.Math.Between(BY, BY + CELL * ROWS));
        });
    });
  }

  playKill(final: boolean, demo: boolean) {
    const tgt = this.target;
    this.time.delayedCall(demo ? 300 : 280, () => {
      // wind-up: white flash + rattle, then blow apart
      this.tweens.killTweensOf(tgt);
      tgt.setTintFill(0xffffff);
      this.showFace('dizzy', 900);
      this.tweens.add({ targets: tgt, x: { from: tgt.x - 8, to: tgt.x + 8 }, duration: 40, yoyo: true, repeat: demo ? 1 : 3 });
      this.time.delayedCall(demo ? 120 : 260, () => {
        tgt.clearTint().setX(W / 2);
        sfx.kill();
        this.chunks.explode(demo ? 20 : 70, tgt.x, tgt.y);
        this.sparks.setParticleTint(0xffcf33);
        this.sparks.explode(50, tgt.x, tgt.y);
        this.ring(tgt.x, tgt.y, 0xffcf33, 260, 24, 420);
        this.ring(tgt.x, tgt.y, 0xffffff, 180, 14, 300);
        this.shake(320, 0.014);
        haptic(60);
        this.floatText(W / 2, TARGET_Y - 40, demo ? 'SMASHED!' : final ? 'JUNKZILLA DOWN!' : 'DESTROYED!', '#ffcf33', 60, 300, 'banner_destroyed');
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
      if (this.s.target >= 0) {
        const label = this.s.remix ? TARGET_NAMES[this.s.target] : `ROUND ${this.s.target + 1}  ·  ${TARGET_NAMES[this.s.target]}`;
        this.time.delayedCall(380, () => this.floatText(W / 2, STAGE_TOP + 60, label, '#ffffff', 40, 700, 'banner_chain'));
      }
      this.shownHp = this.s.hp;
      this.target.y = -150;
      this.tweens.add({ targets: this.target, y: TARGET_Y, duration: 420, ease: 'Bounce.Out' });
    });
  }

  // ---------- modals ----------

  closeModal() {
    const m = this.modal;
    this.modal = null;
    if (!m) return;
    // exit 140ms cubic-in (ChatGPT r9); input dies immediately so the next screen is live
    m.each((o: Phaser.GameObjects.GameObject) => o.disableInteractive?.());
    this.tweens.add({ targets: m, alpha: 0, y: 24, duration: 140, ease: 'Cubic.In', onComplete: () => m.destroy() });
  }

  /** Camera shake, skipped entirely under prefers-reduced-motion. */
  shake(ms: number, intensity: number) {
    if (!REDUCED_MOTION) this.cameras.main.shake(ms, intensity);
  }

  panel(h: number) {
    const c = this.add.container(0, 0).setDepth(100);
    const dim = this.add.rectangle(W / 2, H / 2, W, H, 0x1a0f18, 0.6).setInteractive();
    const g = this.add.graphics().fillStyle(0x2b1d2e, 1).fillRoundedRect(40, H / 2 - h / 2 - 6, W - 80, h + 12, 36).fillStyle(0xfbe7c6, 1).fillRoundedRect(46, H / 2 - h / 2, W - 92, h, 32);
    c.add([dim, g]);
    this.modal = c;
    c.setAlpha(0).setY(40);
    this.tweens.add({ targets: c, alpha: 1, y: 0, duration: 220, ease: 'Quad.Out' });
    return c;
  }

  button(c: Phaser.GameObjects.Container, x: number, y: number, w: number, label: string, color: number, cb: () => void) {
    const b = this.add.container(x, y);
    const artKey = color === 0x5fbf4a ? 'btn_green' : color === 0x27a4c0 ? 'btn_blue' : color === 0xe8452c ? 'btn_red' : '';
    const g: Phaser.GameObjects.GameObject =
      artKey && this.hasArt(artKey)
        ? (() => {
            const im = this.add.image(0, 4, artKey);
            return im.setScale(Math.min((w + 30) / im.width, 108 / im.height));
          })()
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
    const c = this.panel(700);
    const top = H / 2 - 350;
    c.add(this.add.text(W / 2, top + 64, 'PICK AN UPGRADE', { fontFamily: 'Lilita One, Arial Black', fontSize: '46px', color: '#2a2233' }).setOrigin(0.5));
    this.s.offer.forEach((id: PerkId, i) => {
      // stacked full-width rows (ChatGPT round-7 review): big tap target, readable two-line text
      const card = this.add.container(W / 2, top + 210 + i * 190);
      const p = PERKS[id];
      const parts: Phaser.GameObjects.GameObject[] = [];
      if (this.hasArt('ui_perk_row')) parts.push(this.add.image(0, 0, 'ui_perk_row').setDisplaySize(612, 172));
      else parts.push(this.add.graphics().fillStyle(0x2b1d2e, 1).fillRoundedRect(-300, -82, 600, 164, 26).fillStyle(0xffffff, 1).fillRoundedRect(-294, -76, 588, 152, 22));
      const iconKey = this.hasArt(`perk_${id}`) ? `perk_${id}` : p.icon === 'bolt' ? 'icon_bolt' : p.icon === 'crate' ? 'cannon_2' : `${p.icon}_2`;
      const icon = this.add.image(-220, 0, this.textures.exists(iconKey) ? iconKey : 'spark');
      icon.setScale(Math.min(112 / icon.width, 112 / icon.height));
      const n = this.add.text(-140, -28, p.name, { fontFamily: 'Lilita One, Arial Black', fontSize: '36px', color: '#2a2233' }).setOrigin(0, 0.5);
      const t = this.add.text(-140, 26, p.text, { fontFamily: 'Arial', fontStyle: 'bold', fontSize: '27px', color: '#5a4a5a', wordWrap: { width: 400 }, maxLines: 2 }).setOrigin(0, 0.5);
      card.add([...parts, icon, n, t]).setSize(612, 172).setInteractive({ useHandCursor: true });
      card.setScale(0.7).setAlpha(0);
      this.tweens.add({ targets: card, scale: 1, alpha: 1, delay: 60 + i * 80, duration: 240, ease: 'Back.Out' });      card.on('pointerup', () => {
        sfx.click();
        this.closeModal();
        tlog.log('perk', { id });
        const res = choosePerk(this.s, id);
        this.handleEvents(res.events);
        this.showEvent(p.name + '  ·  ' + p.text, '#ffd24a', 2400);
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
      const rkey = s.remix ? `${s.target}:${this.activeToys()[0] ?? 'none'}` : '';
      const prev = s.remix ? (m.remixBest[rkey] ?? null) : s.hard ? m.bestTimeHard : m.bestTime;
      if (s.remix && (prev === null || s.elapsed < prev)) {
        m.remixBest[rkey] = s.elapsed;
        newBest = true;
      } else if (!s.remix && !s.practice && (prev === null || s.elapsed < prev)) {
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
      const pic = this.add.image(W / 2, top - 130, art);
      pic.setScale(Math.min(300 / pic.width, 270 / pic.height));
      c.add(pic);
      this.tweens.add({ targets: pic, scale: { from: pic.scale * 0.6, to: pic.scale }, duration: 400, ease: 'Back.Out' });
      const cap = won ? 'Your machine smashed it! Its junk is yours now.' : 'So close! Your machine needs one more go.';
      c.add(this.add.text(W / 2, top + 18, cap, { fontFamily: 'Arial', fontStyle: 'bold', fontSize: '22px', color: '#7a5a4a' }).setOrigin(0.5));
    }
    const head = this.add.text(W / 2, top + 82, won ? `YOU BEAT ${TARGET_NAMES[Math.max(0, s.target)]}!` : "TIME'S UP!", { fontFamily: 'Lilita One, Arial Black', fontSize: '60px', color: won ? '#e8452c' : '#3b2533' }).setOrigin(0.5);
    while (head.width > W - 140 && Number.parseInt(String(head.style.fontSize)) > 30) head.setFontSize(Number.parseInt(String(head.style.fontSize)) - 4);
    c.add(head);
    const lines: string[] = [];
    if (won) lines.push(`Time  ${s.elapsed.toFixed(1)}s${newBest ? '  NEW BEST!' : ''}${s.practice ? ' (practice)' : ''}`);
    else if (s.remix) lines.push(`${TARGET_NAMES[s.target]} at ${Math.round((1 - s.hp / s.maxHp) * 100)}%`);
    else lines.push(`Beat ${s.target} of 3  ·  ${TARGET_NAMES[s.target]} at ${Math.round((1 - s.hp / s.maxHp) * 100)}%`);
    lines.push(`Biggest chain  x${s.stats.biggestChain}`);
    lines.push(`Biggest hit  ${fmt(s.stats.biggestHit)}`);
    lines.push(`Best gadget  rank ${s.stats.bestRank}`);
    if (s.perks.length) lines.push(`Perks  ${s.perks.map((p) => PERKS[p].name).join(', ')}`);
    const rec = s.remix ? (m.remixBest[`${s.target}:${this.activeToys()[0] ?? 'none'}`] ?? null) : s.hard ? m.bestTimeHard : m.bestTime;
    if (rec !== null) lines.push(`Record${s.remix ? ' (remix)' : s.hard ? ' (challenge)' : ''}  ${rec.toFixed(1)}s`);
    if (unlockedNow) lines.push('★ CHALLENGE MODE UNLOCKED ★');
    c.add(this.add.text(W / 2, top + 290, lines.join('\n'), { fontFamily: 'Arial', fontStyle: 'bold', fontSize: '28px', color: '#3b2533', align: 'center', lineSpacing: 14 }).setOrigin(0.5));
    this.button(c, W / 2, top + 560, 420, 'ONE MORE!', 0xe8452c, () => this.retry());
  }

  activeToys(): Family[] {
    return (Object.entries(this.meta.toys) as [Family, boolean][]).filter(([, on]) => on).map(([f]) => f);
  }

  /** Discovery challenges (ChatGPT's meta plan): one toy unlocks the next. */
  static CHALLENGES: { toy: Family; text: string }[] = [
    { toy: 'magnet', text: 'Wake 3 cannons in one chain' },
    { toy: 'battery', text: 'Merge a gadget your Magnet pulled' },
    { toy: 'fan', text: 'Fire a Battery-primed cannon' },
  ];
  pulledIds = new Set<number>();
  pulledMerge = false;

  nextChallenge() {
    return GameScene.CHALLENGES.find((c) => !(c.toy in this.meta.toys));
  }

  unlockToy(toy: Family) {
    if (toy in this.meta.toys) return;
    for (const k of Object.keys(this.meta.toys) as Family[]) this.meta.toys[k] = false;
    this.meta.toys[toy] = true;
    store(META_KEY, JSON.stringify(this.meta));
    tlog.log('unlock', { toy });
    this.time.delayedCall(900, () => {
      sfx.rankUp(6);
      this.showEvent(`NEW TOY: ${FAMILY_INFO[toy].name.toUpperCase()}  ·  turn it on before your next run`, '#f0b8ff', 3200);
    });
  }

  checkChallenges(r: CascadeResult, kickback: boolean) {
    for (const m of r.edges) if (m.kind === 'magnet') this.pulledIds.add(this.s.grid[m.to]?.id ?? -1);
    if (this.s.phase === 'tutorial') return;
    const ch = this.nextChallenge();
    if (!ch) return;
    if (ch.toy === 'magnet' && !kickback && r.activations.filter((a) => a.family === 'cannon').length >= 3) this.unlockToy('magnet');
    if (ch.toy === 'battery' && !kickback && this.pulledMerge) this.unlockToy('battery');
    if (ch.toy === 'fan' && r.discharged.length) this.unlockToy('fan');
  }
  retry(hard = this.s.hard, remixTarget = this.s.remix ? this.s.target : -1) {
    tlog.log('retry', { hard });
    this.closeModal();
    this.meta.tutorialDone = true;
    store(META_KEY, JSON.stringify(this.meta));
    this.startState(newGame(Date.now() >>> 0, false, hard, this.activeToys(), remixTarget));
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
      const l = this.add.image(W / 2, Math.min(250, (H - 560) * 0.32), 'logo');
      l.setScale(Math.min(600 / l.width, 330 / l.height));
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
    this.modal = c;
    // quiet console behind all lower controls (ChatGPT round-7: readable labels over busy key art)
    const consoleTop = H - 560;
    if (this.hasArt('ui_console')) c.add(this.add.image(W / 2, consoleTop + 270, 'ui_console').setDisplaySize(676, 560));
    else c.add(this.add.graphics().fillStyle(0x1e1826, 0.88).fillRoundedRect(22, consoleTop, W - 44, 540, 34));
    const cream = { fontFamily: 'Lilita One, Arial Black', color: '#fff0cf' };
    const recs = [m.bestTime !== null ? `Best ${m.bestTime.toFixed(1)}s` : 'Beat all 3 before the clock runs out', m.bestTimeHard !== null ? `Challenge ${m.bestTimeHard.toFixed(1)}s` : '', m.bestChain ? `Chain x${m.bestChain}` : ''].filter(Boolean).join('   ·   ');
    c.add(this.add.text(W / 2, consoleTop + 58, recs, { ...cream, fontSize: '28px' }).setOrigin(0.5));
    const nc = this.nextChallenge();
    const unlocked = Object.keys(m.toys) as Family[];
    // one helper toy per run (ChatGPT TOY_RULES: limit supply dilution until humans show the toys pay back)
    const toggles: Phaser.GameObjects.Container[] = [];
    const lbl = (toy: Family) => `${FAMILY_INFO[toy].name.toUpperCase()} ${m.toys[toy] ? 'ON' : 'OFF'}`;
    unlocked.forEach((toy, i) => {
      const x = W / 2 + (i - (unlocked.length - 1) / 2) * 206;
      const tg = this.button(c, x, consoleTop + 140, 250, lbl(toy), 0x27a4c0, () => {
        const on = !m.toys[toy];
        for (const k of unlocked) m.toys[k] = false;
        m.toys[toy] = on;
        store(META_KEY, JSON.stringify(m));
        unlocked.forEach((k, j) => (toggles[j].list[1] as Phaser.GameObjects.Text).setText(lbl(k)));
      });
      tg.setScale(0.72);
      toggles.push(tg);
    });
    if (nc) c.add(this.add.text(W / 2, consoleTop + (unlocked.length ? 200 : 140), `Next toy: ${nc.text}`, { ...cream, fontSize: '24px', color: '#e9c8ff' }).setOrigin(0.5));
    const links = this.add.text(W / 2, consoleTop + 248, 'How to play   ·   Replay tutorial', { ...cream, fontSize: '25px', color: '#ffd24a' }).setOrigin(0.5);
    c.add(links);
    links.setInteractive({ useHandCursor: true }).on('pointerup', (p: Phaser.Input.Pointer) => {
      sfx.click();
      if (p.worldX < W / 2) this.openHowTo(0, () => this.openTitle());
      else this.startTutorial();
    });
    const play = this.button(c, W / 2, consoleTop + 320, 560, 'PLAY', 0x5fbf4a, () => this.retry(false, -1));
    if (m.hardUnlocked) {
      this.button(c, W / 2 - 152, consoleTop + 450, 256, 'CHALLENGE', 0xe8452c, () => this.retry(true, -1));
      this.button(c, W / 2 + 152, consoleTop + 450, 256, 'REMIX', 0x27a4c0, () => this.openRemixPicker());
    } else c.add(this.add.text(W / 2, consoleTop + 450, 'Win once to unlock Challenge + Remix', { ...cream, fontSize: '24px', color: '#cdbfa8' }).setOrigin(0.5));
    this.tweens.add({ targets: play, scale: 1.04, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
  }
  /** Illustrated rules, reachable from title + pause (playtest: wanted everything explained). */
  openHowTo(page = 0, back?: () => void) {
    this.closeModal();
    const c = this.panel(900);
    const top = H / 2 - 450;
    const pages: { title: string; rows: { icons: string[]; text: string }[] }[] = [
      {
        title: 'MERGE',
        rows: [
          { icons: ['cannon_1', '+', 'cannon_1', '=', 'cannon_2'], text: 'Drag a gadget onto the SAME gadget\nwith the SAME number.' },
          { icons: ['cannon_1', 'x', 'cannon_2'], text: 'Different numbers can NOT merge.\nThe number is the rank.' },
          { icons: ['cannon_2'], text: 'A merge makes it stronger\nand it FIRES right away.' },
        ],
      },
      {
        title: 'CHAINS',
        rows: [
          { icons: ['coil_2'], text: 'COIL: zaps the tiles next to it and\npowers them up. Rank 2+ reaches 2 tiles.' },
          { icons: ['bell_2'], text: 'BELL: rings its whole row.\nRank 2 also up/down, rank 3 the column.' },
          { icons: ['cannon_3'], text: 'CANNON: fires by itself slowly.\nWoken by a chain it hits HARD.' },
        ],
      },
      {
        title: 'DAMAGE + GOAL',
        rows: [
          { icons: ['target_0'], text: 'Every gadget in a chain hits the\nmonster. Longer chain = bigger hit.' },
          { icons: ['target_1', 'target_2'], text: 'Beat Tin Can, Mad Fridge and\nJunkzilla before the clock runs out.' },
          { icons: ['card'], text: 'After each monster pick an upgrade.\nYour machine carries over.' },
        ],
      },
      {
        title: 'POWER-UPS',
        rows: [
          { icons: ['sticker_kickback'], text: 'KICKBACK: at 75/50/25% HP a chunk\nbreaks off and upgrades one of your parts.' },
          { icons: ['icon_bolt'], text: 'OVERDRIVE: 6 merges fill the bolt meter.\nCannons fire super fast for a while.' },
          { icons: ['icon_scrap'], text: 'Board full? Drag junk onto SCRAP.\nNew parts arrive every few seconds.' },
        ],
      },
    ];
    const pg = pages[page];
    c.add(this.add.text(W / 2, top + 64, `HOW TO PLAY · ${pg.title}`, { fontFamily: 'Lilita One, Arial Black', fontSize: '44px', color: '#2a2233' }).setOrigin(0.5));
    pg.rows.forEach((row, i) => {
      const y = top + 220 + i * 200;
      const n = row.icons.length;
      const step = n > 3 ? 78 : 110;
      const x0 = W / 2 - ((n - 1) * step) / 2;
      row.icons.forEach((k, j) => {
        const x = x0 + j * step;
        if (k.length === 1) c.add(this.add.text(x, y - 50, k === 'x' ? '✕' : k, { fontFamily: 'Lilita One, Arial Black', fontSize: '46px', color: k === 'x' ? '#d8261a' : '#2a2233' }).setOrigin(0.5));
        else if (this.textures.exists(k)) {
          const im = this.add.image(x, y - 50, k);
          im.setScale(Math.min((n > 3 ? 80 : 104) / im.width, 96 / im.height));
          c.add(im);
          const m = k.match(/_(\d)$/);
          if (m && /^(cannon|coil|bell)/.test(k)) c.add(this.add.text(x + 30, y - 22, m[1], { fontFamily: 'Lilita One, Arial Black', fontSize: '28px', color: '#fff', stroke: '#2b1d2e', strokeThickness: 6 }).setOrigin(0.5));
        }
      });
      c.add(this.add.text(W / 2, y + 40, row.text, { fontFamily: 'Arial', fontStyle: 'bold', fontSize: '25px', color: '#4a3a4a', align: 'center' }).setOrigin(0.5, 0));
    });
    const dots = pages.map((_, i) => (i === page ? '●' : '○')).join(' ');
    c.add(this.add.text(W / 2, top + 780, dots, { fontFamily: 'Arial', fontSize: '26px', color: '#7a5a4a' }).setOrigin(0.5));
    const done = () => {
      this.closeModal();
      if (back) back();
    };
    if (page > 0) this.button(c, W / 2 - 165, top + 850, 280, 'BACK', 0x8a6a4a, () => this.openHowTo(page - 1, back));
    if (page < pages.length - 1) this.button(c, W / 2 + (page > 0 ? 165 : 0), top + 850, 280, 'NEXT', 0x5fbf4a, () => this.openHowTo(page + 1, back));
    else this.button(c, W / 2 + 165, top + 850, 280, 'GOT IT', 0x5fbf4a, done);
    tlog.log('howto', { page });
  }

  startTutorial() {
    this.closeModal();
    tlog.log('tutorial_replay');
    this.startState(newGame(Date.now() >>> 0, true));
  }

  openRemixPicker() {
    this.closeModal();
    const c = this.panel(760);
    const top = H / 2 - 380;
    c.add(this.add.text(W / 2, top + 60, 'REMIX', { fontFamily: 'Lilita One, Arial Black', fontSize: '56px', color: '#3b2533' }).setOrigin(0.5));
    c.add(this.add.text(W / 2, top + 108, 'One big junk monster. It fights back.', { fontFamily: 'Arial', fontStyle: 'bold', fontSize: '22px', color: '#5a4a5a' }).setOrigin(0.5));
    const blurbs: Record<RemixKind, string> = {
      vacuum: 'Sucks up your weakest part',
      twins: 'Shoves your best part aside',
      piano: 'Locks a whole row',
    };
    const loadout = this.activeToys()[0] ?? 'none';
    REMIX_OPPONENTS.forEach((o, i) => {
      const y = top + 220 + i * 175;
      const card = this.add.container(W / 2, y);
      const g = this.add.graphics().fillStyle(0x2b1d2e, 1).fillRoundedRect(-290, -78, 580, 156, 24).fillStyle(0xffffff, 1).fillRoundedRect(-285, -73, 570, 146, 20);
      const key = `target_${o.target}`;
      const img = this.add.image(-210, 0, this.textures.exists(key) ? key : 'target_0');
      img.setScale(Math.min(130 / img.width, 130 / img.height));
      const n = this.add.text(-130, -30, o.name, { fontFamily: 'Lilita One, Arial Black', fontSize: '32px', color: '#3b2533' }).setOrigin(0, 0.5);
      const best = this.meta.remixBest[`${o.target}:${loadout}`];
      const d = this.add.text(-130, 22, blurbs[o.kind] + (best ? `\nBest ${best.toFixed(1)}s` : ''), { fontFamily: 'Arial', fontStyle: 'bold', fontSize: '20px', color: '#5a4a5a' }).setOrigin(0, 0.5);
      card.add([g, img, n, d]).setSize(580, 156).setInteractive({ useHandCursor: true });
      card.on('pointerup', () => {
        sfx.click();
        this.retry(false, o.target);
      });
      c.add(card);
    });
    this.button(c, W / 2, top + 700, 300, 'BACK', 0x8a6a4a, () => {
      this.closeModal();
      this.openTitle();
    });
  }

  // ---------- remix telegraphs ----------
  remixG!: Phaser.GameObjects.Graphics;
  remixIcons: Phaser.GameObjects.Image[] = [];
  remixText!: Phaser.GameObjects.Text;

  drawRemix() {
    const r = this.s.remix;
    if (!this.remixG) {
      this.remixG = this.add.graphics().setDepth(46);
      this.remixText = this.add.text(0, 0, '', { fontFamily: 'Lilita One, Arial Black', fontSize: '30px', color: '#2a2233' }).setOrigin(0.5).setDepth(49);
    }
    const g = this.remixG.clear();
    for (const im of this.remixIcons) im.setVisible(false);
    this.remixText.setVisible(false);
    if (!r) {
      this.updateLane(null);
      return;
    }
    let used = 0;
    const icon = (key: string, x: number, y: number, size: number, angle = 0, alpha = 1, depth = 47) => {
      if (!this.hasArt(key)) return;
      let im = this.remixIcons[used];
      if (!im) this.remixIcons.push((im = this.add.image(0, 0, key)));
      used++;
      im.setTexture(key).setPosition(x, y).setAngle(angle).setAlpha(alpha).setDepth(depth).setVisible(true);
      im.setScale(size / Math.max(im.width, im.height));
    };
    const t = this.time.now / 1000;
    const HALF = CELL / 2 - 4;
    const cellBox = (c: number, col: number, alpha: number, width = 5) => {
      const { x, y } = cellXY(c);
      g.lineStyle(width, col, alpha).strokeRoundedRect(x - HALF, y - HALF, HALF * 2, HALF * 2, 18);
    };
    /** small countdown bubble on the marked cell's own top-right corner (never on a neighbour); behaviour icon top-left */
    const bubble = (c: number, secs: number, sideIcon: string) => {
      const { x, y } = cellXY(c);
      const bx = x + HALF - 6;
      const by = y - HALF + 6;
      if (this.hasArt('ui_bubble')) icon('ui_bubble', bx, by - 4, 50, 0, 1, 48);
      else g.fillStyle(0xfff0cf, 1).fillCircle(bx, by, 22).lineStyle(4, 0x2a2233, 1).strokeCircle(bx, by, 22);
      this.remixText.setText(String(secs)).setPosition(bx, by - 8).setFontSize(26).setVisible(true);
      if (sideIcon) icon(sideIcon, x - HALF + 10, y - HALF + 10, 38, 0, 0.95, 48);
    };    const coral = 0xf05c45;
    const purple = 0x8e58c9;
    let lane: string | null = null;
    if (r.pending) {
      const left = Math.max(0, r.pending.deadline - this.s.elapsed);
      const secs = Math.ceil(left);
      const pulse = 0.65 + 0.35 * Math.abs(Math.sin(t * (5 + (3 - left) * 3)));
      const c0 = r.pending.cells[0];
      if (r.kind === 'piano') {
        // dashed warning perimeter around the row
        const ys = cellXY(c0).y;
        const x0 = BX + 6, x1 = BX + CELL * COLS - 6, y0 = ys - HALF, y1 = ys + HALF;
        g.lineStyle(5, purple, pulse);
        for (let x = x0; x < x1; x += 28) g.lineBetween(x, y0, Math.min(x + 16, x1), y0).lineBetween(x, y1, Math.min(x + 16, x1), y1);
        g.lineBetween(x0, y0, x0, y1).lineBetween(x1, y0, x1, y1);
        bubble(r.pending.cells[r.pending.cells.length - 1], secs, 'tg_piano');
        lane = `ROW LOCK in ${secs}  ·  merge what you need now`;
      } else {
        cellBox(c0, coral, pulse);
        if (r.kind === 'vacuum') {
          bubble(c0, secs, 'tg_vacuum');
          lane = `SUCTION in ${secs}  ·  move this part to save it`;
        } else {
          const blocked = new Set([...this.s.drops.flatMap((d) => (d.plan ? [d.plan.land] : []))]);
          const to = twinsDestination(this.s.grid, c0, blocked);
          if (to >= 0) {
            const a = cellXY(c0), d = cellXY(to);
            cellBox(to, coral, 0.45, 3);
            const ang = (Math.atan2(d.y - a.y, d.x - a.x) * 180) / Math.PI + 90;
            icon('tg_twins', (a.x + d.x) / 2, (a.y + d.y) / 2, 54, ang, 0.95);
            lane = `SHOVE in ${secs}  ·  open or block a side to steer it`;
          } else lane = `SHOVE in ${secs}  ·  boxed in, it will jam`;
          bubble(c0, secs, '');
        }
      }
    }
    if (r.lock) {
      const ys = cellXY(r.lock.cells[0]).y;
      g.fillStyle(purple, 0.18).fillRoundedRect(BX + 6, ys - HALF, CELL * COLS - 12, HALF * 2, 18);
      g.lineStyle(5, purple, 0.95).strokeRoundedRect(BX + 6, ys - HALF, CELL * COLS - 12, HALF * 2, 18);
      icon('tg_piano', BX - 4, ys, 50, 0, 1, 48);
      lane = `ROW LOCKED  ·  ${Math.max(0, r.lock.until - this.s.elapsed).toFixed(1)}s`;
    }
    this.updateLane(lane, r.lock || r.kind === 'piano' ? '#d9c2ff' : '#ffd2c8');
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
    const ex = this.add.text(W / 2, top + (this.s.phase === 'tutorial' ? 740 : 640), 'export playtest log', { fontFamily: 'Arial', fontStyle: 'bold', fontSize: '22px', color: '#8a6a4a' }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    ex.on('pointerup', () => {
      try {
        const blob = new Blob([tlog.exportText()], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `one-more-merge-playtest-${Date.now()}.json`;
        a.click();
        ex.setText('saved ✓');
      } catch {
        ex.setText('export failed');
      }
    });
    c.add(ex);
    const how = this.add.text(W / 2, top + (this.s.phase === 'tutorial' ? 700 : 596), 'How to play', { fontFamily: 'Lilita One, Arial Black', fontSize: '28px', color: '#b06a1a' }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    how.on('pointerup', () => {
      sfx.click();
      this.openHowTo(0, () => this.openPause());
    });
    c.add(how);
    if (this.s.phase === 'tutorial') this.button(c, W / 2, top + 630, 420, 'SKIP TUTORIAL', 0x8a6a4a, () => this.retry());
  }

  save() {
    this.lastSave = this.time.now;
    tlog.flush();
    if (this.s.phase === 'won' || this.s.phase === 'lost') return;
    if (this.s.phase !== 'tutorial' && !this.meta.tutorialDone) {
      this.meta.tutorialDone = true;
      store(META_KEY, JSON.stringify(this.meta));
    }
    store(SAVE_KEY, serialize(this.s));
  }
}
