import Phaser from 'phaser';
import { FAMILY_INFO, PERKS, SHORT_NAMES, TARGET_NAMES } from '../content/perks';
import { COLS, MAX_RANK, ROWS, TICK, TUNING } from '../content/tuning';
import { applyItem,
  canMerge,
  capOf,
  choosePerk,
  finishTutorial,
  deserialize,
  drop,
  legalPairs,
  newGame,
  newLevel,
  useTimeCapsule,
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
import { buildMachine, hasMachineArt, setFinish, setOrnament } from './machine';
import { rawDamage, routeCells } from '../core/cascade';
import { buy, CATALOG, ONBOARDING_BOLTS, runPayout, type Payout, type Wallet } from '../core/economy';
import { DAILY_SEEDS, DAILY_VERSION } from '../content/dailySeeds';
import { BEHAVIOUR_TEXT, BOOSTER_UNLOCK, goalText, LEVELS, levelReward, MODIFIER_TEXT, MONSTER_INDEX, PRICES, starGoals, starsFor } from '../content/levels';
import { audioSettings, duckMusic, haptic, setMusicIntensity, sfx, startMusic, stopMusic, unlockAudio } from './audio';
import { ensureTextures, preloadArt } from './textures';
import * as tlog from '../platform/telemetry';
import { Coach } from './coach';
import { REMIX_OPPONENTS, twinsDestination, type RemixKind } from '../core/remix';
import { ATTACK_COPY, BOSSES, bossBlocked, bossPhase, BOSS_WARN, castAttack, type BossAttack } from '../core/boss';
import { itemFits, type ItemKind } from '../core/types';

export const W = 720;
const CELL = 124;
/** A held piece floats this far above the finger so it stays visible; targeting uses the piece, not the finger. */
const DRAG_LIFT = 40;
const REDUCED_MOTION = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const BX = (W - CELL * COLS) / 2;
const SCRAP_X = W - 92;
/** r25 item tray slot, between NEXT (+ Time Capsule) and SCRAP. */
const ITEM_X = W - 208;
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
  /** Equipped MACHINE-tab stage backdrop (r18 Bolt sink). */
  stage?: string | null;
  /** Equipped hero ornament (r17 Bolt sink). */
  ornament?: string | null;
  /** Bolts balance at the last Workshop visit (new-item dot). */
  workshopSeenBolts?: number;
  /** Chapter medals earned (chapter number -> true), r17. */
  medals?: Record<string, boolean>;
  /** One-time road / card / booster lessons (r17 onboarding). */
  lessons?: Record<string, boolean>;
  /** SAGA progress: best stars per level number, dynamic resources, one-time grants. */
  levelStars?: Record<string, number>;
  kits?: number;
  capsules?: number;
  grants?: Record<string, boolean>;
  failPaid?: Record<string, string>;
  /** Team shooter slot (Cannon, or Rocket once unlocked by the first full clear). */
  shooter?: Family;
  /** Simplified configuration for the stranger playtest (ChatGPT r21). */
  playtestMode?: boolean;
  /** Dropping on a non-matching piece swaps them (off by default: mismatches bounce back). */
  swapMismatch?: boolean;
  /** Camera shake on big hits (pause-menu toggle; default on). */
  shake?: boolean;
  hardUnlocked: boolean;
  bestTimeHard: number | null;
  /** Unlocked toys and whether each is switched on for runs. */
  toys: Partial<Record<Family, boolean>>;
  /** Remix fastest wins keyed by opponent + helper loadout. */
  remixBest: Record<string, number>;
  /** First-time contextual tips already shown. */
  tips: Record<string, boolean>;
  /** Bolts wallet (the only spendable resource; cosmetics only). */
  bolts?: number;
  owned?: string[];
  finish?: string | null;
  nameIdx?: number;
  /** One-time entitlements / settlement guards. */
  onboarded?: boolean;
  dailyPaid?: Record<string, boolean>;
  lastSettle?: string;
  /** Mastery as last seen on the home page (improved modules get a highlight). */
  homeSeen?: Partial<Record<Family, number>>;
  /** Highest rank ever created per family by a player merge or Kickback fuse: builds YOUR MACHINE. */
  mastery?: Partial<Record<Family, number>>;
  /** Daily Bench personal bests by local date (only recent days kept). */
  daily?: Record<string, DailyBest>;
}

/** Daily Bench result, ordered: more opponents beaten > (cleared: faster) > more damage on the opponent reached. */
interface DailyBest {
  v: number;
  targets: number;
  time: number | null;
  dmg: number;
  attempts: number;
}
const dailyBetter = (a: DailyBest, b: DailyBest | undefined) =>
  !b || a.targets > b.targets || (a.targets === b.targets && (a.targets === 3 ? (a.time ?? 1e9) < (b.time ?? 1e9) : a.dmg > b.dmg));
export function localDate(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function dailySeed(date: string) {
  const [y, m, d] = date.split('-').map(Number);
  const day = Math.floor(Date.UTC(y, m - 1, d) / 86400000);
  return DAILY_SEEDS[day % DAILY_SEEDS.length];
}

/** Which stage backdrop the Workshop preview shows: the previewed stage item, else the equipped one. */
const it0Stage = (preview: string | null, equipped: string | null) => (preview && CATALOG.find((x) => x.id === preview)?.slot === 'stage' ? preview : equipped);
/** Telegraph icon per attack (v17 boss icons + v19 mini-boss icons). */
const ATTACK_ICON: Record<BossAttack, string> = { clamp: 'btg_clamp', frost: 'btg_frost', suction: 'btg_suction', hot: 'btg_heat', rest: 'btg_rest', split: 'btg_split', bomb: 'btg_bomb', conveyor: 'btg_conveyor', mirror: 'btg_mirror', blocks: 'btg_blocks', pull: 'btg_pull', bounce: 'btg_bounce' };
const warnColor = (atk: string) => ({ clamp: 0x8e58c9, frost: 0x6fd3ff, suction: 0xf05c45, hot: 0xff8a3c, rest: 0x9a8a9a, split: 0xffcf33 })[atk] ?? 0xff684a;
const MACHINE_NAMES = ['CLANKZILLA', 'BOLT BUCKET', 'SIR SPARKS', 'THE CONTRAPTION', 'BIG BERTHA', 'JUNK JUNIOR', 'RUSTY 3000', 'MEGA MERGE'];
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
  hpTicks?: Phaser.GameObjects.Graphics;
  capsuleBtn?: Phaser.GameObjects.Container;
  gaugeImgs: Phaser.GameObjects.Image[] = [];
  hpText!: Phaser.GameObjects.Text;
  shownHp = 0;
  headerText!: Phaser.GameObjects.Text;
  timerText!: Phaser.GameObjects.Text;
  starChase: Phaser.GameObjects.Text | null = null;
  shieldChip: Phaser.GameObjects.Text | null = null;
  shieldG!: Phaser.GameObjects.Graphics;
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
    const qp0 = new URLSearchParams(location.search); // read before ?reset strips the URL
    if (qp0.has('reset')) {
      store(SAVE_KEY, null);
      store(META_KEY, null);
      history.replaceState(null, '', location.pathname);
    }
    this.meta = loadMeta();
    // r21 external-playtest configuration: ?playtest=1 hides Challenge/Remix, helpers and the cosmetics catalog
    if (qp0.has('playtest')) this.meta.playtestMode = qp0.get('playtest') !== '0';
    store(META_KEY, JSON.stringify(this.meta));
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
      this.tutorialShort = !this.meta.tutorialDone;
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
      this.slotImgs.push(this.add.image(x, y, 'slot').setDisplaySize(CELL - 6, CELL - 6));
    }
    this.odGlow = this.add.graphics();
    if (this.hasArt('vfx_flame')) {
      const bw = CELL * COLS + 30;
      const bh = CELL * ROWS + 30;
      const mk = (x: number, y: number, len: number, ang: number) => this.add.image(x, y, 'vfx_flame').setAngle(ang).setDisplaySize(len, 60).setDepth(4).setVisible(false);
      this.flames = [
        mk(W / 2, BY - 22, bw, 180),
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
    this.add.rectangle(W / 2, STAGE_TOP + STAGE_H / 2, W - 140, STAGE_H, 0xfbe7c6, 0.12);
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

  streak = 0;
  lastMergeAt = -1e9;
  /** Best rank created this run per family (merges + Kickback fuses) — the machine shown on the result screen. */
  runBest: Partial<Record<Family, number>> = {};
  noteRank(fam: Family, rank: number) {
    this.runBest[fam] = Math.max(this.runBest[fam] ?? 0, rank);
  }

  startState(s: GameState) {
    this.runBest = {};
    if (this.homeC?.active) this.homeC.destroy();
    this.homeC = null;
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
    if (s.phase === 'playing' && s.elapsed === 0 && s.stats.merges === 0) this.playRunIntro();
  }

  // ---------- inspect card (ChatGPT r14: tap a gadget = what it does, its reach, its damage) ----------
  inspectC: Phaser.GameObjects.Container | null = null;

  openInspect(idx: number) {
    const g = this.s.grid[idx];
    if (!g) return;
    this.closeInspect();
    const info = FAMILY_INFO[g.family as keyof typeof FAMILY_INFO];
    if (!info) return;
    sfx.click();
    tlog.log('inspect', { fam: g.family, rank: g.rank });
    this.paused = true;
    const cw = W - 60, ch = 330;
    const cy = Math.max(STAGE_TOP + ch / 2 + 6, HP_Y - ch / 2 - 10);
    const c = this.add.container(W / 2, cy).setDepth(96);
    const bg = this.add.graphics().fillStyle(0x2b1d2e, 1).fillRoundedRect(-cw / 2, -ch / 2, cw, ch, 26).fillStyle(0xfbe7c6, 1).fillRoundedRect(-cw / 2 + 5, -ch / 2 + 5, cw - 10, ch - 10, 22);
    c.add(bg);
    const L = -cw / 2 + 30;
    const role = info.role.toLowerCase();
    if (this.hasArt(`role_${role}`)) {
      const ic = this.add.image(L + 30, -ch / 2 + 50, `role_${role}`);
      ic.setScale(56 / Math.max(ic.width, ic.height));
      c.add(ic);
    }
    c.add(this.add.text(L + 72, -ch / 2 + 50, `${info.name.toUpperCase()}  ·  ${info.role}`, { fontFamily: 'Lilita One, Arial Black', fontSize: '34px', color: '#3b2533' }).setOrigin(0, 0.5));
    c.add(this.add.text(cw / 2 - 30, -ch / 2 + 50, `Rank ${g.rank}`, { fontFamily: 'Lilita One, Arial Black', fontSize: '30px', color: '#b06a1a' }).setOrigin(1, 0.5));
    const textW = cw - 250;
    c.add(this.add.text(L, -ch / 2 + 92, info.text, { fontFamily: 'Arial', fontStyle: 'bold', fontSize: '23px', color: '#3b2533', wordWrap: { width: textW }, lineSpacing: 4 }));
    const raw = rawDamage(g.family, g.rank);
    const dmg = g.family === 'cannon' ? `Auto shot ${Math.round(raw * TUNING.passiveMult)}  ·  Chain shot ${Math.round(raw)}` : raw > 0 ? `Hits for ${Math.round(raw)} in a chain` : 'No damage: it helps the others';
    c.add(this.add.text(L, ch / 2 - 96, dmg, { fontFamily: 'Lilita One, Arial Black', fontSize: '25px', color: '#e8452c' }));
    c.add(this.add.text(L, ch / 2 - 56, `Try: ${info.tryThis}`, { fontFamily: 'Arial', fontStyle: 'italic bold', fontSize: '21px', color: '#7a5a4a', wordWrap: { width: cw - 70 } }));
    // reach diagram: 5x5 mini board centred on this gadget
    const mc = 30, ox = cw / 2 - 30 - mc * 5, oy = -ch / 2 + 86;
    const dg = this.add.graphics();
    const reach = new Set(g.family === 'coil' || g.family === 'bell' ? routeCells(idx, g.family, g.rank, this.s.perks) : []);
    const r0 = Math.floor(idx / COLS), c0 = idx % COLS;
    for (let dr = -2; dr <= 2; dr++)
      for (let dc = -2; dc <= 2; dc++) {
        const rr = r0 + dr, cc = c0 + dc;
        const x = ox + (dc + 2) * mc, y = oy + (dr + 2) * mc;
        const insideB = rr >= 0 && rr < ROWS && cc >= 0 && cc < COLS;
        const cell = rr * COLS + cc;
        const col = !insideB ? 0xe8d8b8 : dr === 0 && dc === 0 ? info.color : reach.has(cell) || (g.family === 'bell' && dr === 0) ? 0xffcf33 : 0xffffff;
        dg.fillStyle(col, insideB ? 1 : 0.4).fillRoundedRect(x + 2, y + 2, mc - 4, mc - 4, 5);
      }
    c.add(dg);
    if (g.family === 'cannon') c.add(this.add.text(ox + mc * 2.5, oy - 4, '\u2191 monster', { fontFamily: 'Lilita One, Arial Black', fontSize: '18px', color: '#e8452c' }).setOrigin(0.5, 1));
    const x = this.add.text(cw / 2 - 26, ch / 2 - 30, 'CLOSE', { fontFamily: 'Lilita One, Arial Black', fontSize: '24px', color: '#ffffff', backgroundColor: '#27a4c0', padding: { x: 14, y: 8 } }).setOrigin(1, 0.5);
    c.add(x);
    c.setAlpha(0).setScale(0.92);
    this.tweens.add({ targets: c, alpha: 1, scale: 1, duration: 160, ease: 'Back.Out' });
    // ring the inspected gadget so the card is clearly about IT
    const { x: gx, y: gy } = cellXY(idx);
    const ring = this.add.graphics().setDepth(95).lineStyle(6, 0xffcf33, 1).strokeCircle(gx, gy, 62);
    c.setData('ring', ring);
    this.inspectC = c;
  }

  closeInspect() {
    const c = this.inspectC;
    if (!c) return;
    this.inspectC = null;
    (c.getData('ring') as Phaser.GameObjects.Graphics | undefined)?.destroy();
    this.tweens.add({ targets: c, alpha: 0, duration: 120, onComplete: () => c.destroy() });
    if (!this.explaining && !this.introActive) this.paused = false;
  }

  // ---------- level entry (playtest: "it just pops into a level") ----------
  slotImgs: Phaser.GameObjects.Image[] = [];
  introActive = false;
  introTimers: Phaser.Time.TimerEvent[] = [];
  introObjs: Phaser.GameObjects.GameObject[] = [];

  /** ~1.7s, clock frozen, tap to skip: slots flip in diagonally, the starting parts drop in, the monster
   *  steps onto its stage with its name, then MERGE! and the clock starts. */
  playRunIntro() {
    if (REDUCED_MOTION) return;
    this.introActive = true;
    this.paused = true;
    const at = (ms: number, fn: () => void) => this.introTimers.push(this.time.delayedCall(ms, fn));
    for (let i = 0; i < this.slotImgs.length; i++) {
      const sl = this.slotImgs[i];
      const sx = sl.scaleX, sy = sl.scaleY;
      sl.setScale(0);
      this.tweens.add({ targets: sl, scaleX: sx, scaleY: sy, duration: 180, delay: ((i % COLS) + Math.floor(i / COLS)) * 35, ease: 'Back.Out' });
    }
    let k = 0;
    this.s.grid.forEach((g, i) => {
      const v = g ? this.views.get(g.id) : undefined;
      if (!v) return;
      const c = cellXY(i);
      v.setPosition(c.x, c.y - 300).setAlpha(0);
      this.tweens.add({ targets: v, y: c.y, alpha: 1, duration: 300, delay: 260 + k++ * 55, ease: 'Back.Out', onComplete: () => this.squash(v) });
    });
    const t = this.target;
    t.setX(W + 260);
    this.tweens.add({ targets: t, x: W / 2, duration: 450, delay: 300, ease: 'Back.Out' });
    at(760, () => {
      sfx.panelBreak(0);
      if (this.realBoss) {
        const bd = BOSSES[this.realBoss.def];
        const card = this.add.container(W / 2, STAGE_TOP + STAGE_H - 60).setDepth(85);
        if (this.hasArt('boss_card')) {
          const pl = this.add.image(0, 0, 'boss_card');
          pl.setScale(560 / pl.width);
          card.add(pl);
        }
        card.add(this.add.text(0, -6, bd.name, { fontFamily: 'Lilita One, Arial Black', fontSize: '44px', color: '#ffcf33', stroke: '#2b1d2e', strokeThickness: 8 }).setOrigin(0.5));
        card.setScale(0.6).setAlpha(0);
        this.introObjs.push(card);
        this.tweens.chain({ targets: card, tweens: [{ scale: 1, alpha: 1, duration: 260, ease: 'Back.Out' }, { alpha: 0, duration: 250, delay: 900 }], onComplete: () => card.destroy() });
        this.time.delayedCall(1300, () => this.showEvent('BUILD YOUR MACHINE!', '#ffd24a', 1400));
        return;
      }
      const label = this.s.level !== undefined ? `LEVEL ${this.s.level}  ·  ${TARGET_NAMES[Math.max(0, this.s.target)]}` : this.s.daily ? `DAILY BENCH  ·  ${TARGET_NAMES[Math.max(0, this.s.target)]}` : this.s.remix ? TARGET_NAMES[this.s.target] : `ROUND 1  ·  ${TARGET_NAMES[Math.max(0, this.s.target)]}`;
      this.floatText(W / 2, STAGE_TOP + 60, label, '#ffffff', 40, 500, 'banner_chain');
    });
    at(1250, () => {
      const go = this.add.text(W / 2, BY + (CELL * ROWS) / 2, 'MERGE!', { fontFamily: 'Lilita One, Arial Black', fontSize: '110px', color: '#ffcf33', stroke: '#2b1d2e', strokeThickness: 16 }).setOrigin(0.5).setDepth(80).setScale(0.4);
      this.introObjs.push(go);
      sfx.rankUp(5);
      this.tweens.chain({ targets: go, tweens: [{ scale: 1.12, duration: 160, ease: 'Back.Out' }, { scale: 1, duration: 120 }, { alpha: 0, scale: 1.25, duration: 260, delay: 180, ease: 'Quad.In' }], onComplete: () => go.destroy() });
    });
    at(1500, () => this.finishIntro(false));
  }

  finishIntro(skipped: boolean) {
    if (!this.introActive) return;
    this.introActive = false;
    for (const tm of this.introTimers) tm.remove();
    this.introTimers = [];
    if (skipped) {
      for (const o of this.introObjs) if (o.active) o.destroy();
      for (const sl of this.slotImgs) {
        this.tweens.killTweensOf(sl);
        sl.setDisplaySize(CELL - 6, CELL - 6);
      }
      this.tweens.killTweensOf(this.target);
      this.target.setX(W / 2);
      this.s.grid.forEach((g, i) => {
        const v = g ? this.views.get(g.id) : undefined;
        if (!v) return;
        this.tweens.killTweensOf(v);
        const c = cellXY(i);
        v.setPosition(c.x, c.y).setAlpha(1).setScale(1);
      });
    }
    this.introObjs = [];
    this.paused = false;
    const tdef = this.s.level !== undefined ? LEVELS[this.s.level - 1] : undefined;
    if (tdef?.teach && !this.s.showcase) this.explain(`teach_${tdef.level}`, [{ text: tdef.teach.lesson, spots: [] }]);
    else if (tdef && !this.s.showcase) {
      // r24: the first level with a new machine opens its guide page (game paused by the modal)
      const fam = tdef.level === 6 ? 'rocket' : (tdef.start_extra ?? []).map(([f]) => f).find((f) => f === 'magnet' || f === 'battery' || f === 'fan');
      const pageIdx = fam ? GameScene.GUIDE.findIndex((p) => p.key === fam) : -1;
      if (fam && !this.meta.tips[`new_${fam}`]) {
        this.meta.tips[`new_${fam}`] = true;
        store(META_KEY, JSON.stringify(this.meta));
        this.openHowTo(pageIdx, undefined, true);
      } else if (tdef.level >= 4 && !this.realBoss) this.explain('tap_hint', [{ text: 'Tip: TAP any machine to see what it does.\nAll machines: Pause > Machine guide.', spots: [] }]);
    }
    tlog.log('intro_end', { skipped });
  }

  targetY = 0;
  setTargetTexture() {
    let key = this.s.target < 0 ? 'demo_can' : `target_${this.s.target}${this.s.thresholds >= 2 && this.hasArt(`target_${this.s.target}_dmg`) ? '_dmg' : ''}`;
    const b = this.realBoss;
    if (b) {
      const bk = `boss_${BOSSES[b.def].id}_${['intact', 'cracked', 'critical'][bossPhase(this.s.hp, this.s.maxHp)]}`;
      if (this.hasArt(bk)) key = bk;
    }
    this.target.setTexture(key);
    // remix opponents reuse the three backdrops (alley / kitchen / junkyard)
    const sk = `stage_${Math.max(0, this.s.target) % 3}`;
    if (this.hasArt(sk)) {
      this.stage.setTexture(sk).setVisible(true);
      this.stage.setScale(Math.max((W - 140) / this.stage.width, STAGE_H / this.stage.height));
      this.stageFrame.clear().lineStyle(8, 0x2b1d2e, 1).strokeRoundedRect(70, STAGE_TOP, W - 140, STAGE_H, 26);
    }
    const tex = this.target.frame;
    // r22: bosses share one feet baseline (88% of the stage) and a max footprint (78% wide, 80% tall)
    this.targetBaseScale = b ? Math.min((W - 140) * 0.78 / tex.width, (STAGE_H * 0.8) / tex.height) : Math.min(280 / tex.width, (STAGE_H - 24) / tex.height);
    this.targetY = b ? STAGE_TOP + STAGE_H * 0.88 - (tex.height * this.targetBaseScale) / 2 : TARGET_Y;
    this.target.setScale(this.targetBaseScale).setAngle(0).setAlpha(1).setPosition(W / 2, this.targetY);
  }

  /** 5x2 mini board: dashed coral = the attack's shape; clamp/suction show the escape move. */
  bossDiagram(atk: string) {
    const g = this.add.graphics();
    const cs = 38, gap = 6, x0 = -(5 * cs + 4 * gap) / 2, y0 = -(2 * cs + gap) / 2;
    const at = (cx: number, ry: number) => ({ x: x0 + cx * (cs + gap), y: y0 + ry * (cs + gap) });
    const coral = 0xff684a;
    const hit = (cx: number, ry: number) =>
      atk === 'frost' || atk === 'rest' || atk === 'conveyor' ? ry === 0 : atk === 'hot' ? cx === 2 : atk === 'clamp' || atk === 'suction' ? cx === 1 && ry === 0
      : atk === 'bomb' ? cx === 2 && ry === 1 : atk === 'mirror' ? (cx === 0 && ry === 0) || (cx === 4 && ry === 1) : atk === 'blocks' ? (cx === 2 || cx === 4) && ry === 1
      : atk === 'pull' ? cx === 3 && ry <= 1 : atk === 'bounce' ? (cx === 1 && ry === 1) || (cx === 4 && ry === 0) : false;
    const dots: [number, number][] = [[0, 0], [1, 0], [3, 0], [2, 1], [4, 1], [0, 1]];
    for (let ry = 0; ry < 2; ry++)
      for (let cx = 0; cx < 5; cx++) {
        const p = at(cx, ry);
        g.fillStyle(hit(cx, ry) ? 0x6a3a8a : 0xb98a5e, hit(cx, ry) ? 0.45 : 0.35).fillRoundedRect(p.x, p.y, cs, cs, 8);
        if (hit(cx, ry)) {
          g.lineStyle(3, coral, 1);
          for (let d = 0; d < cs; d += 12) {
            g.lineBetween(p.x + d, p.y, Math.min(p.x + d + 7, p.x + cs), p.y).lineBetween(p.x + d, p.y + cs, Math.min(p.x + d + 7, p.x + cs), p.y + cs);
            g.lineBetween(p.x, p.y + d, p.x, Math.min(p.y + d + 7, p.y + cs)).lineBetween(p.x + cs, p.y + d, p.x + cs, Math.min(p.y + d + 7, p.y + cs));
          }
        }
      }
    for (const [cx, ry] of dots) {
      const p = at(cx, ry);
      g.fillStyle(0x2b1d2e, 1).fillCircle(p.x + cs / 2, p.y + cs / 2, 10).fillStyle(0xfff0cf, 1).fillCircle(p.x + cs / 2, p.y + cs / 2, 7);
    }
    if (atk === 'split') {
      const x = x0 + 3 * (cs + gap) - gap / 2;
      g.lineStyle(4, coral, 1);
      for (let yy = y0 - 6; yy < -y0 + 6; yy += 14) g.lineBetween(x, yy, x, Math.min(yy + 8, -y0 + 6));
    }
    if (atk === 'clamp' || atk === 'suction') {
      // escape arrow: marked machine -> empty neighbour below-right
      const a = at(1, 0), b = at(1, 1);
      const ax = a.x + cs / 2, ay = a.y + cs / 2 + 12, bx = b.x + cs / 2, by = b.y + cs / 2 - 12;
      g.lineStyle(4, 0x2a8a3a, 1).lineBetween(ax, ay, bx, by);
      g.fillStyle(0x2a8a3a, 1).fillTriangle(bx - 7, by - 6, bx + 7, by - 6, bx, by + 4);
    }
    return g;
  }

  hasArt(key: string) {
    return this.textures.exists(key) && this.textures.get(key).source[0]?.width > 1;
  }

  // ---------- gadget views ----------

  makeView(g: Gadget): GadgetView {
    const c = this.add.container(0, 0) as GadgetView;
    c.gid = g.id;
    const img = this.add.image(0, 0, `${g.family}_${g.rank}`);
    this.fitSprite(img);
    const badge = this.add.graphics();
    const col = FAMILY_INFO[g.family].color;
    // big rank badge (playtest: ranks were hard to tell apart)
    const BXY = 36;
    const badgeArt = this.hasArt(`badge_${g.family}`) ? this.add.image(BXY, BXY, `badge_${g.family}`).setDisplaySize(58, 58) : null;
    if (!badgeArt) badge.fillStyle(0x2b1d2e, 1).fillCircle(BXY, BXY, 26).fillStyle(col, 1).fillCircle(BXY, BXY, 21);
    const label = String(g.rank); // r17: the numeral always shows; the crown alone marks the cap
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
    if (g.rank >= capOf(this.s, g.family) && this.hasArt('crown')) {
      const cr = this.add.image(-30, -42, 'crown');
      cr.setScale(Math.min(48 / cr.width, 48 / cr.height)).setAngle(-15);
      parts.push(cr);
    }
    c.add(parts);
    c.setSize(CELL, CELL).setDepth(10);
    return c;
  }

  /** Visible (alpha) bounds of a texture, in source pixels; cached. Packs v1-v9 have different padding. */
  visCache = new Map<string, { x: number; y: number; w: number; h: number }>();
  visBounds(key: string) {
    let b = this.visCache.get(key);
    if (b) return b;
    const src = this.textures.get(key).getSourceImage() as HTMLImageElement | HTMLCanvasElement;
    const W0 = src.width, H0 = src.height;
    b = { x: 0, y: 0, w: W0, h: H0 };
    try {
      const k = Math.min(1, 160 / Math.max(W0, H0));
      const cw = Math.max(1, Math.round(W0 * k)), ch = Math.max(1, Math.round(H0 * k));
      const cv = document.createElement('canvas');
      cv.width = cw;
      cv.height = ch;
      const cx = cv.getContext('2d', { willReadFrequently: true })!;
      cx.drawImage(src, 0, 0, cw, ch);
      const d = cx.getImageData(0, 0, cw, ch).data;
      let x0 = cw, y0 = ch, x1 = -1, y1 = -1;
      for (let y = 0; y < ch; y++)
        for (let x = 0; x < cw; x++)
          if (d[(y * cw + x) * 4 + 3] > 24) {
            if (x < x0) x0 = x;
            if (x > x1) x1 = x;
            if (y < y0) y0 = y;
            if (y > y1) y1 = y;
          }
      if (x1 >= x0) b = { x: x0 / k, y: y0 / k, w: (x1 - x0 + 1) / k, h: (y1 - y0 + 1) / k };
    } catch {
      /* odd source: fall back to the full canvas */
    }
    this.visCache.set(key, b);
    return b;
  }

  /** ChatGPT r10: occupied height 76% of the slot, width capped at 84%, every gadget standing on one baseline. */
  fitSprite(img: Phaser.GameObjects.Image) {
    const b = this.visBounds(img.texture.key);
    img.setScale(Math.min((CELL * 0.76) / b.h, (CELL * 0.84) / b.w));
    img.setOrigin((b.x + b.w / 2) / img.width, (b.y + b.h) / img.height);
    img.setPosition(0, CELL * 0.38);
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
  /** Centre of a board cell in world px (also used by tools/touch-test.mjs). */
  cellCenter(i: number) {
    return cellXY(i);
  }

  /** Cell nearest to (x, y) within reach, else -1. Hysteresis: the current target is kept until another cell is clearly closer. */
  targetCell(x: number, y: number) {
    let best = -1;
    let bd = CELL * 0.8;
    for (let i = 0; i < ROWS * COLS; i++) {
      const c = cellXY(i);
      const d = Math.hypot(x - c.x, y - c.y);
      if (d < bd) [bd, best] = [d, i];
    }
    if (this.hoverIdx >= 0 && best !== this.hoverIdx) {
      const c = cellXY(this.hoverIdx);
      const dh = Math.hypot(x - c.x, y - c.y);
      if (dh < CELL * 0.8 && dh - bd < CELL * 0.18) return this.hoverIdx;
    }
    return best;
  }

  overScrap(x: number, y: number) {
    return Math.abs(x - SCRAP_X) < 70 && Math.abs(y - TRAY_Y) < 50;
  }
  /** The chapter boss (not an ordinary monster's light hazard, r23). */
  get realBoss() {
    return this.s.boss && !this.s.boss.light ? this.s.boss : null;
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
    if (this.introActive) {
      this.finishIntro(true);
      return;
    }
    if (this.inspectC) {
      this.closeInspect();
      return;
    }
    if (this.explaining || this.tutorialWaiting) return; // explainers advance only from their NEXT button
    if (this.coach.waitingTap && !this.modal) {
      sfx.click();
      this.coach.hide();
      return;
    }
    if (!this.canAct()) return;
    if (this.s.itemTray && Phaser.Math.Distance.Between(p.worldX, p.worldY, ITEM_X, TRAY_Y) < 52) {
      this.itemDrag = { x: p.worldX, y: p.worldY, moved: false };
      sfx.pickup();
      return;
    }
    if (this.itemSelected) {
      this.itemSelected = false;
      this.tryApplyItem(this.cellAt(p.worldX, p.worldY));
      return;
    }
    if (this.itemLesson) return; // only the item may be used until it is applied
    const idx = this.cellAt(p.worldX, p.worldY);
    if (idx < 0 || !this.s.grid[idx]) {
      if (this.selectedIdx >= 0 && idx >= 0) return; // handled on up (move to empty)
      if (this.selectedIdx >= 0 && this.overScrap(p.worldX, p.worldY)) return;
      return;
    }
    if (bossBlocked(this.s.boss).noDrag.has(idx)) {
      // r23: a clamped machine explains itself when touched
      const v = this.views.get(this.s.grid[idx]!.id);
      if (v) this.tweens.add({ targets: v, x: v.x + 8, duration: 50, yoyo: true, repeat: 3 });
      sfx.invalid();
      const left = Math.max(0, (this.s.boss!.active!.until ?? 0) - this.s.elapsed);
      const cp = cellXY(idx);
      this.floatText(cp.x, cp.y - 40, `STUCK ${left.toFixed(1)}s`, '#ffd2c8', 34, 200);
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
    if (this.itemDrag && p.isDown) {
      if (Phaser.Math.Distance.Between(p.worldX, p.worldY, this.itemDrag.x, this.itemDrag.y) > 12) this.itemDrag.moved = true;
      this.itemDrag.x = p.worldX;
      this.itemDrag.y = p.worldY;
      return;
    }
    if (this.dragIdx < 0 || !this.dragView || !p.isDown) return;
    if (!this.moved && Phaser.Math.Distance.Between(p.worldX, p.worldY, this.downAt.x, this.downAt.y) < 12) return;
    if (!this.moved) {
      this.moved = true;
      this.selectedIdx = -1;
      sfx.pickup();
      this.dragView.setDepth(55);
      this.tweens.killTweensOf(this.dragView);
      this.tweens.add({ targets: this.dragView, scale: 1.08, duration: 75, ease: 'Cubic.Out' });
      // the piece starts where it was grabbed and glides up above the finger (no 40px jump)
      this.grabOff = { x: p.worldX - this.dragView.x, y: p.worldY - this.dragView.y };
      this.liftAt = this.time.now;
    }
    const dx = p.worldX - this.dragView.x;
    this.placeDrag(p);
    // weighty drag: piece leans into the motion
    this.dragView.setAngle(Phaser.Math.Linear(this.dragView.angle, Phaser.Math.Clamp(dx * 0.9, -14, 14), 0.35));
    const h = this.targetCell(this.dragView.x, this.dragView.y);
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
  grabOff = { x: 0, y: 0 };
  liftAt = 0;
  /** Held piece position: eases from the grab point to DRAG_LIFT above the finger over 90ms (cubic-out). */
  placeDrag(p: Phaser.Input.Pointer) {
    if (!this.dragView) return;
    const t = Math.min(1, (this.time.now - this.liftAt) / 90);
    const k = 1 - Math.pow(1 - t, 3);
    this.dragView.setPosition(p.worldX - this.grabOff.x * (1 - k), p.worldY - this.grabOff.y * (1 - k) - DRAG_LIFT * k);
    if (!this.dragShadow) this.dragShadow = this.add.ellipse(0, 0, 92, 30, 0x000000, 0.28).setDepth(54);
    this.dragShadow.setPosition(this.dragView.x, this.dragView.y + 62).setVisible(true);
  }

  onUp(p: Phaser.Input.Pointer) {
    if (this.itemDrag) {
      const d = this.itemDrag;
      this.itemDrag = null;
      if (!d.moved) this.itemSelected = true; // tap the item, then tap a machine
      else this.tryApplyItem(this.cellAt(p.worldX, p.worldY - 30));
      return;
    }
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
      this.selectedIdx = -1;
      this.drawHeld();
      if (this.s.phase === 'playing') this.openInspect(tapped);
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
    // the piece is drawn above the finger: target where the PIECE is, same rule as the live highlight
    const dest = this.hoverIdx >= 0 ? this.hoverIdx : view ? this.targetCell(view.x, view.y) : this.targetCell(p.worldX, p.worldY - DRAG_LIFT);
    const ga = this.s.grid[from], gb = dest >= 0 ? this.s.grid[dest] : null;
    tlog.log('drag_end', { from, to: dest, highlighted: this.hoverIdx, legal: !!(ga && gb && canMerge(ga, gb, this.s)), kind: !gb ? 'move' : ga && canMerge(ga, gb, this.s) ? 'merge' : 'mismatch', ms: Math.round(this.time.now - this.liftAt) });
    this.dragShadow?.setVisible(false);
    view?.setAngle(0);
    this.dragIdx = -1;
    this.hoverIdx = -1;
    this.dragView = null; // must be cleared BEFORE commitDrop so reconcile() animates this piece into its new cell
    if (view) view.setDepth(10);
    if (this.overScrap(p.worldX, p.worldY) && this.s.phase === 'playing') {
      const g = this.s.grid[from];
      const needsHold = g && g.rank >= 3;
      if (!needsHold || this.scrapHold >= 0.25) this.doScrap(from, id);
      else this.snapBack(view, from);
    } else if (dest >= 0 && dest !== from) {
      if (!this.commitDrop(from, dest, id)) this.snapBack(view, from);
    } else this.snapBack(view, from);
    this.reconcile(); // belt and braces: every sprite returns to its model cell
    this.scrapHold = 0;
    this.overScrapFlag = false;
    this.drawHeld();
  }

  snapBack(view: GadgetView | null, idx: number) {
    this.dragShadow?.setVisible(false);
    if (!view) return;
    view.setAngle(0).setDepth(10);
    // return to wherever the model has it NOW (a chain may have moved it while it was held)
    const real = this.s.grid.findIndex((g) => g?.id === view.gid);
    const { x, y } = cellXY(real >= 0 ? real : idx);
    this.tweens.killTweensOf(view);
    this.tweens.add({ targets: view, x, y, scale: 1, duration: 140, ease: 'Cubic.Out' });
  }

  cancelDrag() {
    if (this.dragIdx >= 0) this.snapBack(this.dragView, this.dragIdx);
    this.dragShadow?.setVisible(false);
    if (this.dragView) this.dragView.setDepth(10);
    this.dragIdx = -1;
    this.dragView = null;
    this.hoverIdx = -1;
    this.drawHeld();
  }

  commitDrop(from: number, to: number, id: number): boolean {
    if (this.guided) {
      if (from !== this.guided.from || to !== this.guided.to) {
        sfx.invalid();
        return false;
      }
      this.endGuidedDodge();
    }
    const a = this.s.grid[from];
    const b = this.s.grid[to];
    if (this.s.phase === 'tutorial' && this.onTutorialMismatch(from, to)) return false;
    const merging = canMerge(a, b, this.s);
    // ChatGPT r13: an occupied mismatch BOUNCES (silent swaps punished the exact mistake Ido reported). Swapping is opt-in.
    if (a && b && !merging && !this.meta.swapMismatch) {
      sfx.invalid();
      tlog.log('mismatch_bounce', { a: `${a.family}${a.rank}`, b: `${b.family}${b.rank}` });
      const msg = a.family === b.family ? `Rank ${a.rank} ≠ Rank ${b.rank}: merge the SAME number` : 'Merge the SAME gadget with the SAME number';
      this.showEvent(msg, '#ffd2c8', 1600);
      for (const g of a.family === b.family ? [a, b] : []) {
        const rv = this.views.get(g.id)?.getByName('rank') as Phaser.GameObjects.Text | undefined;
        if (rv) this.tweens.add({ targets: rv, scale: 1.5, duration: 140, yoyo: true, repeat: 1 });
      }
      const bv = this.views.get(b.id);
      if (bv && !REDUCED_MOTION) {
        const c = cellXY(to);
        this.tweens.chain({ targets: bv, tweens: [{ x: c.x + 4, duration: 45 }, { x: c.x - 4, duration: 45 }, { x: c.x, duration: 45 }] });
      }
      return false;
    }
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
        this.tweens.killTweensOf(nv); // the spawn pop from reconcile() would fight the merge punch
        const c = cellXY(to);
        nv.setPosition(c.x, c.y).setScale(0.9);
        this.tweens.chain({
          targets: nv,
          tweens: [
            { scale: 1.16, duration: 90, ease: 'Back.Out' },
            { scale: 1, duration: 120, ease: 'Sine.Out' },
          ],
        });
      }
      const ng = this.s.grid[to]!;
      this.noteRank(ng.family, ng.rank);
      const ce = res.events.find((e) => e.type === 'cascade');
      tlog.log('merge', { fam: ng.family, rank: ng.rank, chain: ce && ce.type === 'cascade' ? ce.result.count : 1, at: +this.s.elapsed.toFixed(1), occ: this.s.grid.filter(Boolean).length });
      sfx.merge(ng.rank);
      // merge fest feedback (cosmetic): quick consecutive merges build a streak with a rising note
      const now = this.time.now;
      this.streak = now - this.lastMergeAt < 2500 ? this.streak + 1 : 1;
      this.lastMergeAt = now;
      if (this.streak >= 2) {
        const { x, y } = cellXY(to);
        sfx.cascadeStep(Math.min(this.streak - 2, 3), 0.05);
        void x;
        void y;
        this.showEvent(this.streak >= 10 ? `MERGE FEST!!  x${this.streak}` : this.streak >= 5 ? `MERGE STREAK  x${this.streak}` : `MERGE x${this.streak}`, this.streak >= 5 ? '#ffd24a' : '#fff0cf', 900);
      }
      if (ng.rank > prevBest && ng.rank >= 2) {
        const { x, y } = cellXY(to);
        this.time.delayedCall(120, () => {
          sfx.rankUp(ng.rank);
          if (ng.rank >= capOf(this.s, ng.family)) this.floatText(x, y - 64, 'MAX!', '#ffcf33', 30, 200);
          const rv = this.views.get(ng.id)?.getByName('rank') as Phaser.GameObjects.Text | undefined;
          if (rv) this.tweens.add({ targets: rv, scale: 1.5, duration: 90, yoyo: true, ease: 'Quad.Out' });
          this.ring(x, y, FAMILY_INFO[ng.family].color, 110, 16, 420);
        });
      }
      haptic(15);
      if (this.s.phase === 'tutorial') this.onTutorialMerge();
      if (this.s.showcase) {
        this.coach.stopHand();
        const r = ng.rank;
        this.time.delayedCall(1700, () => {
          this.coach.say(`RANK ${r}! It hits ${r === 7 ? '2.25x' : '5x'} harder than rank 6.
Now beat the real level.`, this.coachY());
          this.time.delayedCall(2600, () => {
            this.coach.clear();
            tlog.log('showcase_done', { rank: r });
            this.openTitle('road');
            this.openLevelSheet(this.showcaseThen);
          });
        });
      }
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
      const bright = !held || i === src || canMerge(held, b, this.s);
      v.setAlpha(bright ? 1 : 0.45);
    });
    if (src >= 0 && this.s.grid[src]) {
      const a = this.s.grid[src]!;
      const { x: sx, y: sy } = cellXY(src);
      if (this.moved && (a.family === 'coil' || a.family === 'bell')) {
        const at = this.hoverIdx >= 0 ? this.hoverIdx : src;
        const col = FAMILY_INFO[a.family].color;
        for (const cell of routeCells(at, a.family, a.rank, this.s.perks)) {
          const { x, y } = cellXY(cell);
          g.fillStyle(col, 0.2).fillRoundedRect(x - CELL / 2 + 6, y - CELL / 2 + 6, CELL - 12, CELL - 12, 16);
          const t = this.s.grid[cell];
          if (t && cell !== src && t.family !== a.family) g.lineStyle(4, col, 0.65).strokeRoundedRect(x - CELL / 2 + 6, y - CELL / 2 + 6, CELL - 12, CELL - 12, 16);
        }
      }
      g.lineStyle(6, 0xffffff, 0.9).strokeRoundedRect(sx - CELL / 2 + 6, sy - CELL / 2 + 6, CELL - 12, CELL - 12, 20);
      this.s.grid.forEach((b, i) => {
        if (i === src || !canMerge(a, b, this.s)) return;
        const { x, y } = cellXY(i);
        g.lineStyle(5, 0xffffff, 1).strokeCircle(x, y, 54).lineStyle(3, FAMILY_INFO[a.family].color, 1).strokeCircle(x, y, 46);
      });
      const hov = this.dragIdx >= 0 ? this.hoverIdx : -1;
      if (hov >= 0 && hov !== src && canMerge(a, this.s.grid[hov], this.s)) {
        const p = previewMerge(this.s, src, hov)!;
        for (const act of p.activations) {
          if (act.idx === hov) continue;
          const { x, y } = cellXY(act.idx);
          g.fillStyle(0xfff3a0, 0.22).fillRoundedRect(x - CELL / 2 + 8, y - CELL / 2 + 8, CELL - 16, CELL - 16, 18);
        }
        this.drawPreview(p, hov, a);
        const { x, y } = cellXY(hov);
        this.previewText.setText(`${p.count} FIRE`).setPosition(x, y - 78).setVisible(true);
      } else this.drawPreview(null, -1, a);
    } else this.drawPreview(null, -1, null);
    if (this.hintPair && src < 0) {
      for (const i of this.hintPair) {
        const { x, y } = cellXY(i);
        const t = (this.time.now % 1000) / 1000;
        g.lineStyle(5, 0xffffff, 0.5 + 0.5 * Math.sin(t * Math.PI * 2)).strokeCircle(x, y, 56);
      }
    }
  }

  /** ChatGPT r10 #1: show WHY a merge is good. The first three real links at 35%, MAX endpoints emphasised,
   *  and a 35% ghost of the resulting rank. Stationary; fades in over 80ms whenever the destination changes. */
  previewG?: Phaser.GameObjects.Graphics;
  ghost?: Phaser.GameObjects.Image;
  previewKey = '';
  drawPreview(p: CascadeResult | null, hov: number, a: Gadget | null) {
    if (!this.previewG) this.previewG = this.add.graphics().setDepth(31);
    if (!this.ghost) this.ghost = this.add.image(0, 0, 'dot').setDepth(9).setVisible(false);
    const key = p ? `${hov}:${p.count}` : '';
    if (key === this.previewKey) return;
    this.previewKey = key;
    const g = this.previewG.clear();
    this.ghost.setVisible(false);
    if (!p || !a) return;
    const MAXK = new Set(['backfire', 'bridge', 'chime']);
    const links = p.edges.filter((e) => e.from !== e.to);
    links.slice(0, 3).forEach((e) => {
      const f = cellXY(e.from), t = cellXY(e.to);
      g.lineStyle(9, 0xffffff, 0.35).lineBetween(f.x, f.y, t.x, t.y).fillStyle(0xffffff, 0.35).fillCircle(t.x, t.y, 12);
    });
    for (const e of links) {
      if (!MAXK.has(e.kind)) continue;
      const f = cellXY(e.from), t = cellXY(e.to);
      g.lineStyle(10, 0xffcf33, 0.55).lineBetween(f.x, f.y, t.x, t.y).lineStyle(6, 0xffcf33, 0.8).strokeCircle(t.x, t.y, 50);
    }
    const nk = `${a.family}_${Math.min(a.rank + 1, capOf(this.s, a.family))}`;
    if (this.textures.exists(nk)) {
      const c = cellXY(hov);
      this.ghost.setTexture(nk).setVisible(true);
      this.fitSprite(this.ghost);
      this.ghost.setPosition(c.x, c.y + CELL * 0.38);
    }
    g.setAlpha(0);
    this.ghost.setAlpha(0);
    this.tweens.add({ targets: g, alpha: 1, duration: 80, ease: 'Quad.Out' });
    this.tweens.add({ targets: this.ghost, alpha: 0.35, duration: 80, ease: 'Quad.Out' });
  }

  // ---------- simulation loop ----------

  update(_t: number, dms: number) {
    if (!this.paused && !this.modal && !this.guided && !this.itemLesson) {
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
    if (this.dragIdx >= 0 && !this.input.activePointer.isDown) this.onUp(this.input.activePointer);
    else if (this.dragIdx >= 0 && this.moved && this.time.now - this.liftAt < 120) this.placeDrag(this.input.activePointer);
    this.updateHints();
    this.drawHud(dms);
    this.animateIdle();
    this.updateFace();
    this.coach.update(this.time.now);
    this.checkTips();
    this.drawRemix();
    this.drawItems();
    if (this.time.now - this.lastSave > 2000) this.save();
  }

  /** Cannons about to auto-fire puff up a little; everything breathes slightly. */
  primeG!: Phaser.GameObjects.Graphics;
  lastTickSec = -1;
  resultCall: Phaser.Time.TimerEvent | null = null;
  resultAt = 0;
  idleNext = 0;
  idleBeat = 0;
  idleActs = new Map<number, number>();
  animateIdle() {
    const t = this.time.now / 1000;
    if (this.target && !this.tweens.isTweening(this.target) && this.s.phase === 'playing') this.target.setAngle(Math.sin((t * Math.PI * 2) / 2.4) * 0.5);
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
    // idle life (ChatGPT r10 #8): only two gadgets act at once, each for ~420ms, on a 1800-2600ms cosmetic beat
    const now = this.time.now;
    const holding = this.dragIdx >= 0 && this.moved;
    if (now >= this.idleNext && !holding) {
      const ids = this.s.grid.filter((g): g is Gadget => !!g).map((g) => g.id);
      this.idleBeat++;
      for (let k = 0; k < 2 && ids.length; k++) this.idleActs.set(ids[(this.idleBeat * 7 + k * 13) % ids.length], now);
      this.idleNext = now + 1800 + ((this.idleBeat * 389) % 800);
    }
    this.s.grid.forEach((g) => {
      if (!g) return;
      const v = this.views.get(g.id);
      if (!v || v === this.dragView || this.tweens.isTweening(v)) return;
      const img = v.list[0] as Phaser.GameObjects.Image;
      const base = (img.getData('base') as number) ?? img.scaleX;
      img.setData('base', base);
      const t0 = this.idleActs.get(g.id);
      const k = t0 !== undefined && !holding && now - t0 < 420 ? Math.sin((Math.PI * (now - t0)) / 420) : 0;
      if (t0 !== undefined && now - t0 >= 420) this.idleActs.delete(g.id);
      let sx = 1 + (g.family === 'cannon' ? 0.015 * k : 0);
      let sy = 1 + (g.family === 'cannon' ? -0.015 * k : 0.015 * k);
      img.setAngle(g.family === 'bell' ? Math.sin((now - (t0 ?? 0)) / 40) * 2 * k : 0);
      img.y = CELL * 0.38 - (g.family === 'coil' ? k : 0);
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
    { kind: 'merge', pair: [21, 22], fam: 'cannon', text: 'Same machine. Same number.\nDrag onto its match.', after: 'It got stronger and FIRED!\nNow smash the can!', focus: 'target' },
    { kind: 'merge', pair: [6, 16], fam: 'coil', text: 'Merge to fire. Coils zap nearby\nmachines into a CHAIN.', after: 'That was a CHAIN: one merge\nset off its neighbours!', focus: 'chain' },
    { kind: 'merge', pair: [8, 17], fam: 'bell', text: 'Bells wake machines across\ntheir whole row. Watch the cannon!', after: 'The bell rang its row\nand woke that cannon!', focus: 'row' },
    { kind: 'mismatch', pair: [5, 22], fam: 'cannon', text: 'Different numbers can NOT merge.\nTry dragging this 1 onto the 2.' },
    { kind: 'merge', pair: [5, 19], fam: 'cannon', text: 'Cannons fire alone, slowly.\nIn a chain they hit much harder!' },
    { kind: 'merge', pair: [19, 22], fam: 'cannon', text: 'Two 2s make a 3! Bigger number,\nbigger blast.', after: 'Now clear levels on the road:\none monster, one clock. LET\'S PLAY!' },
  ];

  /** r24: bubble centre just above the given points (or below them when there is no room above). */
  nearY(pts: { x: number; y: number }[]) {
    if (!pts.length) return this.coachY();
    const top = Math.min(...pts.map((p) => p.y)), bot = Math.max(...pts.map((p) => p.y));
    const above = top - CELL / 2 - 128;
    return above - 120 >= 90 ? above : Math.min(H - 130, bot + CELL / 2 + 128);
  }

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
    if (canMerge(ga, gb, this.s)) return [a, b];
    const pairs = legalPairs(this.s);
    return pairs.find(([p]) => this.s.grid[p]!.family === step.fam) ?? pairs[0] ?? null;
  }

  /** First launch (r18): a 10-20s warm-up of ONE merge, then straight into level 1. Replay = the full 6 steps. */
  tutorialShort = false;
  runTutorial() {
    if (this.s.phase !== 'tutorial') return;
    const steps = this.tutorialShort ? GameScene.TUTORIAL.slice(0, 1) : GameScene.TUTORIAL;
    const step = steps[this.tutorialStep];
    this.coach.clear();
    if (!step) {
      // script done: the real run starts on the board they just built
      const ev = finishTutorial(this.s);
      this.meta.tutorialDone = true;
      store(META_KEY, JSON.stringify(this.meta));
      tlog.log('tutorial_done');
      void ev;
      // the saga starts: level 1 on the road (ChatGPT r15)
      this.time.delayedCall(400, () => this.startLevel(1));
      return;
    }
    const pair = this.tutorialPair(step);
    this.coach.say(step.text, pair ? this.nearY([cellXY(pair[0]), cellXY(pair[1])]) : this.coachY());
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

  tutorialWaiting = false;
  /** After a tutorial merge: the explanation waits for GOT IT (r24: players never looked up), then the next step. */
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
      let pts: { x: number; y: number; r?: number }[] = [];
      if (step.focus === 'target') pts = [{ x: this.target.x, y: this.target.y, r: 120 }];
      if (step.focus === 'chain' && this.lastCascade) pts = this.lastCascade.activations.map((a) => cellXY(a.idx));
      if (step.focus === 'row' && this.lastCascade) {
        const row = Math.floor(this.lastCascade.rootIdx / COLS);
        pts = this.s.grid.flatMap((g, i) => (g && Math.floor(i / COLS) === row ? [cellXY(i)] : []));
      }
      this.tutorialWaiting = true;
      this.coach.say(step.after!, step.focus === 'target' ? this.coachY() + 120 : this.nearY(pts), {
        next: {
          page: '',
          label: 'GOT IT',
          onNext: () => {
            sfx.click();
            this.tutorialWaiting = false;
            this.coach.clear();
            next();
          },
        },
      });
      if (pts.length) this.coach.focus(pts);
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
      this.coach.say('Right! Only the SAME number merges.', this.nearY([cellXY(from), cellXY(to)]), { ms: 1800 });
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
    this.meta.tips[id] = false; // explain() owns the seen-flag
    this.explain(id, [{ text, spots: pointAt ? [{ ...pointAt, r: 70 }] : [], y: pointAt ? this.nearY([pointAt]) : undefined }]);
  }

  explainQueue: { text: string; spots: { x: number; y: number; r?: number }[]; draw?: () => Phaser.GameObjects.GameObject[]; y?: number }[] = [];
  explainTotal = 0;
  explainOverlay: Phaser.GameObjects.GameObject[] = [];
  explaining = false;
  /** First-time explanation that STOPS the clock until read (auto-hiding tips were missed mid-fight). */
  explain(id: string, cards: { text: string; spots: { x: number; y: number; r?: number }[]; draw?: () => Phaser.GameObjects.GameObject[]; y?: number }[]) {
    if (this.meta.tips[id] || this.s.phase !== 'playing' || this.modal) return;
    // r22 (ChatGPT): boss fights show only the boss-warning lesson; other lessons stay unseen until a normal level
    if (this.realBoss && id !== 'x_boss' && !id.startsWith('xb_')) return;
    this.meta.tips[id] = true;
    store(META_KEY, JSON.stringify(this.meta));
    tlog.log('explain', { id });
    this.explainQueue.push(...cards);
    this.explainTotal = this.explainQueue.length;
    if (!this.explaining) this.nextExplain();
  }

  nextExplain() {
    for (const o of this.explainOverlay) o.destroy();
    this.explainOverlay = [];
    const c = this.explainQueue.shift();
    if (!c || this.s.phase !== 'playing') {
      this.explainQueue = [];
      this.explaining = false;
      this.paused = false;
      this.coach.clear();
      return;
    }
    this.explaining = true;
    this.paused = true;
    this.cancelDrag();
    this.coach.focus(c.spots);
    const left = this.explainQueue.length;
    const page = this.explainTotal > 1 ? `${this.explainTotal - left}/${this.explainTotal}` : '';
    this.coach.say(c.text, c.y ?? this.coachY(), { next: { page, label: left ? 'NEXT \u203a' : 'GOT IT', onNext: () => (sfx.click(), this.nextExplain()) } });
    if (c.draw) this.explainOverlay = c.draw();
  }

  /** Numbered cause->effect arrows along a recorded chain (first `steps` waves), optionally played 250ms apart. */
  chainArrows(r: CascadeResult, steps: number, animate: boolean): Phaser.GameObjects.GameObject[] {
    const depthOf = new Map(r.activations.map((a) => [a.idx, a.depth]));
    const edges = r.edges.filter((e) => e.from !== e.to && (depthOf.get(e.to) ?? 99) <= steps);
    const seen = new Set<number>();
    const uniq = edges.filter((e) => (seen.has(e.to) ? false : (seen.add(e.to), true))).sort((a, b) => (depthOf.get(a.to) ?? 0) - (depthOf.get(b.to) ?? 0));
    const out: Phaser.GameObjects.GameObject[] = [];
    uniq.forEach((e) => {
      const d = depthOf.get(e.to) ?? 1;
      const f = cellXY(e.from), t = cellXY(e.to);
      const ang = Math.atan2(t.y - f.y, t.x - f.x);
      const ex = t.x - Math.cos(ang) * 46, ey = t.y - Math.sin(ang) * 46;
      const g = this.add.graphics().setDepth(88);
      g.lineStyle(10, 0x2b1d2e, 0.9).lineBetween(f.x, f.y, ex, ey).lineStyle(6, 0xffcf33, 1).lineBetween(f.x, f.y, ex, ey);
      g.fillStyle(0xffcf33, 1).fillTriangle(ex + Math.cos(ang) * 16, ey + Math.sin(ang) * 16, ex + Math.cos(ang + 2.3) * 16, ey + Math.sin(ang + 2.3) * 16, ex + Math.cos(ang - 2.3) * 16, ey + Math.sin(ang - 2.3) * 16);
      const n = this.add.text((f.x + t.x) / 2, (f.y + t.y) / 2, String(d), { fontFamily: 'Lilita One, Arial Black', fontSize: '28px', color: '#2b1d2e', backgroundColor: '#ffcf33', padding: { x: 9, y: 2 } }).setOrigin(0.5).setDepth(89);
      out.push(g, n);
      if (animate) {
        g.setAlpha(0);
        n.setAlpha(0).setScale(0.5);
        this.tweens.add({ targets: g, alpha: 1, duration: 120, delay: (d - 1) * 250 });
        this.tweens.add({ targets: n, alpha: 1, scale: 1, duration: 160, delay: (d - 1) * 250 + 60, ease: 'Back.Out', onStart: () => sfx.cascadeStep(d - 1, 0) });
      }
    });
    return out;
  }

  checkTips() {
    const s = this.s;
    if (s.phase !== 'playing' || this.coach.waitingTap || s.showcase || this.realBoss) return; // r22: boss levels keep the stage clear (own explainers only)
    const occ = s.grid.filter(Boolean).length;
    if (s.elapsed > 5 && s.elapsed < 12) this.tip('delivery', 'NEXT brings another gadget.\nMatch its machine and number.', { x: BX + 150, y: TRAY_Y - 30 });
    if (s.odCharge === odNeeded(s) - 1 && s.odLeft <= 0) this.tip('overdrive', 'One more merge fills the bolt meter:\nOVERDRIVE, cannons fire super fast!');
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
      if (!canMerge(this.s.grid[a], this.s.grid[b], this.s)) this.hintPair = null;
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
    this.headerText.setText(demo ? 'WARM-UP' : s.level !== undefined ? `L${s.level} \u00b7 ${this.realBoss ? (BOSSES[this.realBoss.def].mini ? 'MINI-BOSS' : 'BOSS') : SHORT_NAMES[s.target]}` : s.remix ? TARGET_NAMES[s.target] : `${Math.min(s.target + 1, 3)}/3 ${TARGET_NAMES[Math.min(s.target, 2)]}`);
    // Time Capsule (dynamic resource, levels 4+): +15s once per attempt while the clock runs
    const capOk = s.level !== undefined && s.level >= BOOSTER_UNLOCK.time_capsule && (this.meta.capsules ?? 0) > 0 && !s.capsuleUsed && s.phase === 'playing';
    if (capOk && !this.capsuleBtn) {
      // bottom action lane (ChatGPT r16), between NEXT and SCRAP; a 350ms hold with a progress rim prevents accidents
      const b = this.add.container(W / 2 + 30, TRAY_Y).setDepth(60);
      const bgp = this.add.graphics().fillStyle(0x2b1d2e, 1).fillRoundedRect(-84, -40, 168, 80, 24).fillStyle(0x27a4c0, 1).fillRoundedRect(-80, -36, 160, 72, 20);
      b.add(bgp);
      if (this.hasArt('booster_time_capsule')) {
        const ic = this.add.image(-46, 0, 'booster_time_capsule');
        ic.setScale(56 / Math.max(ic.width, ic.height));
        b.add(ic);
      }
      b.add(this.add.text(18, -10, '+15s', { fontFamily: 'Lilita One, Arial Black', fontSize: '28px', color: '#ffffff' }).setOrigin(0.5));
      const stock = this.add.text(18, 20, '', { fontFamily: 'Lilita One, Arial Black', fontSize: '18px', color: '#e8f8ff' }).setOrigin(0.5);
      stock.setName('stock');
      b.add(stock);
      const rim = this.add.graphics();
      b.add(rim);
      let holdT: Phaser.Time.TimerEvent | null = null;
      let prog: Phaser.Tweens.Tween | null = null;
      const cancel = () => {
        holdT?.remove();
        holdT = null;
        prog?.stop();
        rim.clear();
      };
      b.setSize(168, 80).setInteractive({ useHandCursor: true });
      b.on('pointerdown', () => {
        cancel();
        const o = { t: 0 };
        prog = this.tweens.add({ targets: o, t: 1, duration: 350, onUpdate: () => rim.clear().lineStyle(6, 0xffcf33, 1).beginPath().arc(0, 0, 46, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * o.t).strokePath() });
        holdT = this.time.delayedCall(350, () => {
          cancel();
          if (!useTimeCapsule(this.s)) return;
          this.meta.capsules = Math.max(0, (this.meta.capsules ?? 0) - 1);
          store(META_KEY, JSON.stringify(this.meta));
          tlog.log('booster', { kind: 'time_capsule', level: this.s.level, at: +this.s.elapsed.toFixed(1), left: this.meta.capsules });
          sfx.capsule();
          this.floatText(this.timerText.x - 60, this.timerText.y + 60, '+15s', '#7fe0ff', 40, 300);
        });
      });
      b.on('pointerup', cancel);
      b.on('pointerout', cancel);
      this.capsuleBtn = b;
    }
    this.capsuleBtn?.setVisible(capOk);
    (this.capsuleBtn?.getByName('stock') as Phaser.GameObjects.Text | undefined)?.setText(`hold  ·  ${this.meta.capsules ?? 0} left`);
    const t = Math.ceil(s.timeLeft);
    this.timerText.setText(demo || s.showcase ? '' : `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`);
    this.timerText.setColor(s.timeLeft < 15 && !demo ? '#d8261a' : '#3b2533');
    this.practiceText.setVisible(s.practice && !demo);
    // r22 live star chase: the best star still reachable and its seconds left (saga levels only)
    const ldef = s.level !== undefined && !s.showcase ? LEVELS[s.level - 1] : undefined;
    if (!this.starChase) this.starChase = this.add.text(92, STAGE_TOP + 28, '', { fontFamily: 'Lilita One, Arial Black', fontSize: '26px', color: '#ffcf33', stroke: '#2b1d2e', strokeThickness: 6 }).setOrigin(0, 0.5).setDepth(22);
    if (ldef && s.phase === 'playing' && !demo) {
      const [g2, g3] = starGoals(ldef);
      const goal = s.elapsed <= g3 ? 3 : s.elapsed <= g2 ? 2 : 0;
      const left = Math.ceil((goal === 3 ? g3 : g2) - s.elapsed);
      const txt = goal ? `${'★'.repeat(goal)} ${left}s` : '';
      if (txt !== this.starChase.text) this.starChase.setText(txt).setColor(left <= 5 ? '#ff8a5c' : '#ffcf33');
      this.starChase.setVisible(!!goal);
    } else this.starChase.setVisible(false);

    // smooth HP (goal levels: the bar fills with goal progress instead, r23)
    this.shownHp += (s.hp - this.shownHp) * Math.min(1, dms / 120);
    const frac = s.goal ? 1 - Math.min(1, s.goal.best / s.goal.n) : Math.max(0, this.shownHp / s.maxHp);
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
    this.hpText.setText(s.showcase ? 'PRACTICE' : s.goal ? (s.goal.kind === 'rank' ? `MAKE RANK ${s.goal.n}  \u00b7  best ${Math.max(1, s.goal.best)}` : `CHAIN x${s.goal.n}  \u00b7  best x${s.goal.best}`) : fmt(Math.max(0, Math.round(this.shownHp))));
    if (s.goal && this.hpFill) this.hpFill.setCrop(0, 0, this.hpFill.width * (1 - frac), this.hpFill.height).setTint(0x8ef08a);
    // r23 chain shield chip + bubble on the monster
    if (!this.shieldChip) {
      this.shieldChip = this.add.text(W - 92, STAGE_TOP + 28, '', { fontFamily: 'Lilita One, Arial Black', fontSize: '24px', color: '#9fe8ff', stroke: '#2b1d2e', strokeThickness: 6 }).setOrigin(1, 0.5).setDepth(22);
      this.shieldG = this.add.graphics().setDepth(4);
    }
    const sh = s.shieldUntil !== undefined && s.phase === 'playing';
    const open = sh && s.elapsed < s.shieldUntil!;
    this.shieldChip.setVisible(sh).setText(open ? `SHIELD OPEN  ${(s.shieldUntil! - s.elapsed).toFixed(1)}s` : 'SHIELD  \u00b7  chain of 4 opens it');
    this.shieldG.clear();
    if (sh && !open) {
      const rr = Math.min(STAGE_H * 0.46, 170);
      this.shieldG.fillStyle(0x6fd3ff, 0.16).fillCircle(this.target.x, this.target.y, rr).lineStyle(5, 0x9fe8ff, 0.8 + 0.2 * Math.sin(this.time.now / 200)).strokeCircle(this.target.x, this.target.y, rr);
    }
    if (!this.hpTicks) this.hpTicks = this.add.graphics().setDepth(3);
    const ht = this.hpTicks.clear();
    if (s.target >= 0 && TUNING.kickback && !s.goal)
      for (const q of [0.75, 0.5, 0.25]) {
        const x = W / 2 - bw / 2 + bw * q;
        ht.fillStyle(0x2b1d2e, frac > q ? 0.85 : 0.3).fillRect(x - 2, HP_Y - 15, 4, 30);
      }

    // r18 progressive reveal: overdrive from level 3, scrap from level 4
    const early = s.level !== undefined && s.level < 3;
    this.scrapZone?.setVisible(!(s.level !== undefined && s.level < 4));
    // overdrive gauge
    const og = this.odGauge.clear();
    const need = odNeeded(s);
    const gx = 384;
    this.boltIcon?.setPosition(gx - 26, 46).setVisible(!demo && !early).setAngle(s.odLeft > 0 ? Math.sin(this.time.now / 60) * 12 : 0);
    const active = s.odLeft > 0;
    const gaugeArt = this.hasArt('gauge_off') && this.hasArt('gauge_on');
    if (gaugeArt && !this.gaugeImgs.length) for (let i = 0; i < 6; i++) this.gaugeImgs.push(this.add.image(0, 46, 'gauge_off').setDisplaySize(24, 34));
    this.gaugeImgs.forEach((g, i) => {
      const on = i < need && !demo && !early;
      g.setVisible(on).setPosition(gx + i * 26 + 11, 46);
      if (on) g.setTexture(active ? (this.hasArt('gauge_lit') ? 'gauge_lit' : 'gauge_on') : i < s.odCharge ? 'gauge_on' : 'gauge_off').setDisplaySize(24, 34);
    });
    for (let i = 0; i < (demo || gaugeArt || early ? 0 : need); i++) {
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
    this.scrapZone.setVisible(!tut && !(s.level !== undefined && s.level < 4));
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
          const landedAt = e.into >= 0 ? e.into : e.idx;
          if (e.into >= 0) this.noteRank(e.gadget.family, e.gadget.rank);
          const fused = e.into >= 0;
          const tgtSpot = { x: this.target.x, y: this.target.y, r: 150 };
          const kc = events.find((x) => x.type === 'cascade' && x.kickback) as { result: CascadeResult } | undefined;
          const kChain = kc?.result.count ?? 1;
          this.time.delayedCall(520, () => {
            if (fused)
              this.explain('x_kick_fuse', [
                { text: 'You broke a monster panel!\nEvery 25% of its HP one breaks\n(the marks on the HP bar).', spots: [tgtSpot] },
                { text: kChain > 1 ? 'It matched this gadget and merged.\nThat free merge fired another chain!' : 'It matched this gadget and merged.\nThat free merge fired the new gadget!', spots: [cellXY(landedAt)] },
              ]);
            else {
              const lg = this.s.grid[landedAt];
              const partner = lg ? this.s.grid.findIndex((b, i) => i !== landedAt && !!b && b.family === lg.family && b.rank === lg.rank) : -1;
              this.explain('x_kick_plain', [
                { text: 'Your big chain shook a part loose.\nIt landed in this cell.', spots: [cellXY(landedAt)] },
                { text: 'This one waits for you.\nMerge it with the same gadget\nand the same number!', spots: partner >= 0 ? [cellXY(landedAt), cellXY(partner)] : [cellXY(landedAt)] },
              ]);
            }
          });
          this.time.delayedCall(420, () => {
            const lg = this.s.grid[landedAt];
            const m = lg ? this.s.grid.findIndex((b, i) => i !== landedAt && canMerge(lg, b, this.s)) : -1;
            if (m >= 0) {
              const c = cellXY(m);
              this.ring(c.x, c.y, 0xffffff, 60, 8, 180);
            }
          });
          needReconcile = true;
          break;
        }        case 'threshold':
          sfx.panelBreak(e.target);
          this.chunks.explode(18, this.target.x, this.target.y - 40);
          this.hitTarget(true, 1);
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
          } else if ((e.kind === 'jam' || e.kind === 'gaps') && e.outcome === 'hit') {
            sfx.invalid();
            this.showEvent(e.kind === 'jam' ? 'CELL JAMMED  ·  5s' : 'ROW GAPS BLOCKED  ·  4s', '#d9c2ff', 1200);
          } else if (e.kind === 'piano' && e.outcome === 'hit') {
            sfx.panelBreak(2);
            this.showEvent('ROW LOCKED  ·  4s', '#d9c2ff', 1200);
          } else this.showEvent(e.outcome === 'jam' ? 'JAMMED!  Nowhere to shove it' : 'MISSED!  You saved it', '#b8f07a', 1600);
          void c0;
          needReconcile = true;
          break;
        }
        case 'remixUnlock':
          sfx.click();
          break;
        case 'bossWarn': {
          sfx.invalid();
          this.hitTarget(false);
          tlog.log('boss_warn', { attack: e.attack });
          // first-ever boss warning: stop the clock and show what to do (r20)
          const bd = this.s.boss ? BOSSES[this.s.boss.def] : null;
          if (bd && this.s.boss!.light) {
            const what = { suction: 'It slurps marked machines.\nMove the marked one away!', frost: 'It freezes a row.\nNothing can land there for a moment.', hot: 'Shooters in this column hit half as hard.\nMove them out.', rest: 'Bells and Coils in this row cannot\nwake neighbours. Move them out.' }[e.attack as 'suction' | 'frost' | 'hot' | 'rest'] ?? bd.copy;
            this.explain(`x_${e.attack}`, [{ text: `WATCH OUT!\n${what}`, spots: (e.target.cells ?? []).map((c) => cellXY(c)), y: TRAY_Y }]);
          } else if (bd && e.attack !== bd.attack && !this.meta.tips[`xb_${e.attack}`]) {
            // r27: a chapter boss's new final-phase attack, explained once
            const mini = BOSSES.find((x) => x.mini && x.attack === e.attack);
            this.explain(`xb_${e.attack}`, [{ text: `FINAL PHASE: NEW ATTACK!\n${mini?.copy ?? ATTACK_COPY[e.attack].why}`, spots: (e.target.cells ?? []).map((c) => cellXY(c)), y: TRAY_Y }]);
          } else if (bd?.mini && !this.meta.tips[`xb_${e.attack}`]) {
            this.explain(`xb_${e.attack}`, [{ text: `${bd.name}!\n${bd.copy}`, spots: (e.target.cells ?? []).map((c) => cellXY(c)), y: TRAY_Y }]);
          } else if (bd && e.attack === 'clamp' && !this.meta.tips.x_boss_guided && this.startGuidedDodge(e.target.cells?.[0] ?? -1)) {
            // r23 (ChatGPT): the first clamp is learned by DOING the dodge, not by reading a card
          } else if (bd) this.explain('x_boss', [{ text: `BOSS ATTACK!\n${bd.copy}`, spots: (e.target.cells ?? []).map((c) => cellXY(c)), y: TRAY_Y }]); // r22: bubble in the bottom lane, clear of stage and board
          break;
        }
        case 'bossDefuse': {
          const cp = cellXY(e.cells[0]);
          sfx.merge?.(3);
          this.floatText(cp.x, cp.y - 30, e.attack === 'bomb' ? 'DEFUSED!' : 'CLEARED!', '#8ef08a', 42, 400);
          for (const c of e.cells) {
            const q = cellXY(c);
            this.chunks.explode(8, q.x, q.y);
          }
          tlog.log('boss_defuse', { attack: e.attack });
          break;
        }
        case 'bossFinal': {
          this.showEvent('FINAL PHASE  \u00b7  NEW ATTACK', '#ffd24a', 1400);
          this.shake(120, 0.004);
          tlog.log('boss_final', { second: e.second });
          break;
        }
        case 'bossHit': {
          tlog.log('boss_hit', { attack: e.attack, removed: e.removedIds?.length ?? 0 });
          if (e.moves?.length) {
            // r27 movement attacks: the engine already moved the pieces; reconcile slides the sprites
            if (this.dragIdx >= 0 && e.moves.some((m) => m.from === this.dragIdx)) this.cancelDrag();
            const word = { conveyor: 'SLIDE!', mirror: 'SWAP!', pull: 'YANK!', bounce: 'BOING!' }[e.attack as 'conveyor'] ?? 'MOVED!';
            const cp = cellXY(e.moves[0].to);
            this.floatText(cp.x, cp.y - 30, word, '#d9c2ff', 38, 300);
            needReconcile = true;
            break;
          }
          if (e.attack === 'bomb' || e.attack === 'blocks') {
            const c0 = e.target.cells?.[0];
            if (c0 !== undefined) {
              const cp = cellXY(c0);
              if (e.attack === 'bomb') {
                this.shake(140, 0.005);
                this.ring(cp.x, cp.y, 0xff684a, 120, 16, 360);
                this.chunks.explode(16, cp.x, cp.y);
              }
              this.floatText(cp.x, cp.y - 30, e.attack === 'bomb' ? (e.removedIds?.length ? 'BOOM!' : 'FIZZLE') : 'JUNK!', '#ffd2c8', 40, 300);
            }
            for (const rid of e.removedIds ?? []) {
              const v = this.views.get(rid);
              if (v) {
                this.views.delete(rid);
                this.tweens.add({ targets: v, scale: 0, angle: 200, duration: 260, onComplete: () => v.destroy() });
              }
            }
            needReconcile = true;
            break;
          }
          if (e.attack === 'suction' && e.removedIds?.length) {
            for (const rid of e.removedIds) {
              const v = this.views.get(rid);
              if (v) {
                this.views.delete(rid);
                this.tweens.add({ targets: v, x: this.target.x, y: this.target.y, scale: 0.1, angle: 540, duration: 420, ease: 'Quad.In', onComplete: () => v.destroy() });
              }
            }
            this.showEvent('SLURPED!', '#ffd2c8', 1100);
          } else {
            sfx.panelBreak(1);
            // r23: moving the machine away in time is the counter-play, so say it out loud
            const dodged = e.attack === 'clamp' && (e.target.cells ?? []).every((c) => !this.s.grid[c]);
            if (dodged) {
              sfx.merge?.(2);
              const cp = cellXY((e.target.cells ?? [0])[0]);
              this.floatText(cp.x, cp.y - 30, 'DODGED!', '#8ef08a', 44, 500);
              tlog.log('boss_dodge', { attack: e.attack });
            } else {
              const nm = ({ clamp: 'CLAMPED!', frost: 'FROZEN!', hot: 'HOT!', rest: 'RESTING!', split: 'SPLIT!', suction: 'MISSED!' } as Record<string, string>)[e.attack] ?? 'WHIFF';
              // the lane is busy with the attack line, so the hit word pops on the board where it happened
              const tc = e.target.cells?.[0] ?? (e.target.row !== undefined ? e.target.row * COLS + 2 : e.target.col !== undefined ? 2 * COLS + e.target.col : 2 * COLS + 2);
              const cp = cellXY(tc);
              this.floatText(cp.x, cp.y - 30, nm, '#ffd2c8', 40, 400);
            }
          }
          needReconcile = true;
          break;
        }
        case 'bossEnd':
          sfx.click();
          break;
        case 'bossPhase': {
          // armor phase (r20): crack + shards on the stage only, sprite swaps under dust, ARMOR BROKEN in the lane
          sfx.panelBreak(2);
          const t = this.target;
          this.fx('bfx_crack', t.x, t.y - 20, 260, { dur: 320, grow: 1.2, depth: 58 });
          this.time.delayedCall(80, () => {
            this.fx('bfx_armor', t.x, t.y, 300, { dur: 360, grow: 1.4, depth: 59 });
            this.chunks.explode(8, t.x, t.y - 30);
            this.setTargetTexture();
          });
          this.time.delayedCall(240, () => this.showEvent('ARMOR BROKEN!', '#ffd24a', 1200));
          tlog.log('boss_phase', { phase: e.phase });
          break;
        }
        case 'scrap':
          needReconcile = true;
          break;
        case 'goal': {
          const cp = cellXY(e.idx);
          sfx.win();
          this.floatText(cp.x, cp.y - 40, e.kind === 'rank' ? `RANK ${e.n} BUILT!` : `CHAIN x${e.n}!`, '#ffcf33', 56, 900, 'banner_destroyed');
          this.showEvent(e.kind === 'rank' ? `RANK ${e.n} BUILT!  GOAL DONE` : `CHAIN x${e.n}!  GOAL DONE`, '#ffd24a', 3000);
          tlog.log('goal_done', { kind: e.kind, n: e.n, at: +this.s.elapsed.toFixed(1) });
          break;
        }
        case 'itemGrant': {
          tlog.log('item_grant', { kind: e.kind, teach: e.teach, at: +this.s.elapsed.toFixed(1) });
          const cap = this.add.image(this.target.x, this.target.y, 'item_capsule').setDepth(70);
          cap.setScale(70 / Math.max(cap.width, cap.height));
          this.tweens.add({ targets: cap, x: ITEM_X, y: TRAY_Y, duration: 420, ease: 'Quad.InOut', onComplete: () => {
            cap.destroy();
            sfx.capsule();
            this.showEvent(`POWER-UP!  ${GameScene.ITEM_COPY[e.kind].name}`, '#ffd24a', 1600);
          } });
          const first = !this.meta.tips[`item_${e.kind}`];
          if (first && this.s.phase === 'playing') {
            this.time.delayedCall(480, () => {
              if (this.s.phase !== 'playing' || !this.s.itemTray) return;
              this.cancelDrag();
              this.itemLesson = true;
              this.coach.focus([{ x: ITEM_X, y: TRAY_Y, r: 52 }]);
              this.coach.say(`NEW POWER-UP: ${GameScene.ITEM_COPY[e.kind].name}!\n${GameScene.ITEM_COPY[e.kind].how}`, this.nearY([{ x: ITEM_X, y: TRAY_Y }]));
              this.coach.drag({ x: ITEM_X, y: TRAY_Y }, (() => { const i = this.s.grid.findIndex((x) => !!x && itemFits(e.kind, x.family) && !x.item); return i >= 0 ? cellXY(i) : { x: W / 2, y: BY + CELL }; })());
            });
          }
          break;
        }
        case 'itemApply': {
          sfx.merge?.(3);
          const { x, y } = cellXY(e.idx);
          this.floatText(x, y - 50, GameScene.ITEM_COPY[e.kind].name, '#ffcf33', 30, 300);
          tlog.log('item_apply', { kind: e.kind });
          if (this.itemLesson) {
            this.itemLesson = false;
            this.coach.clear();
            this.meta.tips[`item_${e.kind}`] = true;
            store(META_KEY, JSON.stringify(this.meta));
          }
          break;
        }
        case 'shield':
          sfx.panelBreak(1);
          this.showEvent('SHIELD OPEN!  full damage', '#9fe8ff', 1400);
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

  guided: { from: number; to: number; objs: Phaser.GameObjects.GameObject[] } | null = null;
  /** r23 guided dodge: freeze the fight, point from the marked machine to a safe cell, accept only that real move. */
  startGuidedDodge(from: number): boolean {
    const s = this.s;
    const a = from >= 0 ? s.grid[from] : null;
    if (!a) return false;
    const masked = new Set(s.masked ?? []);
    const r = Math.floor(from / COLS), c = from % COLS;
    const nb = [[r + 1, c], [r - 1, c], [r, c + 1], [r, c - 1]].filter(([y, x]) => y >= 0 && y < ROWS && x >= 0 && x < COLS).map(([y, x]) => y * COLS + x);
    let to = nb.find((i) => !s.grid[i] && !masked.has(i)) ?? -1;
    if (to < 0) to = s.grid.findIndex((g, i) => i !== from && !!g && canMerge(a, g, s));
    if (to < 0) to = s.grid.findIndex((g, i) => !g && !masked.has(i));
    if (to < 0) return false;
    this.cancelDrag();
    const f = cellXY(from), t = cellXY(to);
    const g = this.add.graphics().setDepth(88);
    const ang = Math.atan2(t.y - f.y, t.x - f.x);
    const ex = t.x - Math.cos(ang) * 30, ey = t.y - Math.sin(ang) * 30;
    g.lineStyle(12, 0x2b1d2e, 0.9).lineBetween(f.x, f.y, ex, ey).lineStyle(7, 0x8ef08a, 1).lineBetween(f.x, f.y, ex, ey);
    g.fillStyle(0x8ef08a, 1).fillTriangle(ex + Math.cos(ang) * 20, ey + Math.sin(ang) * 20, ex + Math.cos(ang + 2.3) * 20, ey + Math.sin(ang + 2.3) * 20, ex + Math.cos(ang - 2.3) * 20, ey + Math.sin(ang - 2.3) * 20);
    this.tweens.add({ targets: g, alpha: { from: 1, to: 0.35 }, duration: 500, yoyo: true, repeat: -1 });
    this.coach.focus([f, t]);
    this.coach.say('The clamp is coming!\nDrag this machine out of the marked cell.', TRAY_Y);
    this.guided = { from, to, objs: [g] };
    tlog.log('guided_dodge_start', { from, to });
    return true;
  }

  endGuidedDodge() {
    if (!this.guided) return;
    for (const o of this.guided.objs) o.destroy();
    this.guided = null;
    this.coach.clear();
    this.meta.tips.x_boss_guided = true;
    this.meta.tips.x_boss = true;
    store(META_KEY, JSON.stringify(this.meta));
    tlog.log('guided_dodge_done', {});
  }

  itemDrag: { x: number; y: number; moved: boolean } | null = null;
  itemSelected = false;
  itemLesson = false;
  itemSlot: Phaser.GameObjects.Container | null = null;
  itemG!: Phaser.GameObjects.Graphics;
  itemBadges = new Map<number, Phaser.GameObjects.Container>();

  static ITEM_COPY: Record<ItemKind, { name: string; how: string; wrong: string }> = {
    overcharge: { name: 'OVERCHARGE', how: 'Put this on a shooter.\nIts next two chain shots hit harder.', wrong: 'Use it on a Cannon or Rocket' },
    spark: { name: 'SPARK', how: 'Put this on a shooter.\nNext time it fires in a chain,\nit wakes the machines next to it.', wrong: 'Use it on a Cannon or Rocket' },
    corner: { name: 'CORNER KIT', how: 'Put this on a Bell.\nNext time it rings, it also wakes\nits diagonal neighbours.', wrong: 'Use it on a Bell' },
  };

  /** r25: attach the tray item to the machine in `idx` (if it fits), else explain why and keep the item. */
  tryApplyItem(idx: number) {
    const kind = this.s.itemTray;
    const g = idx >= 0 ? this.s.grid[idx] : null;
    if (!kind) return;
    if (!g || !itemFits(kind, g.family) || g.item) {
      sfx.invalid();
      if (g) this.showEvent(g.item ? 'This machine already has a power-up' : GameScene.ITEM_COPY[kind].wrong, '#ffd2c8', 1400);
      return;
    }
    const r = applyItem(this.s, idx, g.id);
    if (!r.ok) return;
    this.handleEvents(r.events);
  }

  /** r25: tray slot (between NEXT and SCRAP), drag ghost, valid-target rims, and owner badges with charge pips. */
  drawItems() {
    const s = this.s;
    if (!this.itemG) this.itemG = this.add.graphics().setDepth(57);
    const g = this.itemG.clear();
    const kind = s.itemTray ?? null;
    if (kind && !this.itemSlot) {
      const c = this.add.container(ITEM_X, TRAY_Y).setDepth(58);
      c.add(this.add.graphics().fillStyle(0x2b1d2e, 1).fillCircle(0, 0, 38).fillStyle(0xfff0cf, 1).fillCircle(0, 0, 33));
      const ic = this.add.image(0, 0, `item_${kind}`);
      ic.setScale(60 / Math.max(ic.width, ic.height)).setName('icon');
      c.add(ic);
      this.itemSlot = c;
    }
    if (!kind && this.itemSlot) {
      this.itemSlot.destroy();
      this.itemSlot = null;
    }
    if (this.itemSlot && kind) {
      const ic = this.itemSlot.getByName('icon') as Phaser.GameObjects.Image;
      if (ic.texture.key !== `item_${kind}`) ic.setTexture(`item_${kind}`);
      const lift = this.itemDrag?.moved;
      ic.setPosition(lift ? this.itemDrag!.x - ITEM_X : 0, lift ? this.itemDrag!.y - TRAY_Y - 30 : 0).setScale((lift ? 84 : 60 + 4 * Math.sin(this.time.now / 180)) / Math.max(ic.width, ic.height));
      // while selecting: rim every machine that can take it
      if (this.itemDrag || this.itemSelected || this.itemLesson)
        s.grid.forEach((x, i) => {
          if (!x || !itemFits(kind, x.family) || x.item) return;
          const { x: cx, y: cy } = cellXY(i);
          const ic = { overcharge: 0xff7a2a, spark: 0x5fe8ff, corner: 0x9be05a }[kind];
          g.lineStyle(6, ic, 0.6 + 0.4 * Math.sin(this.time.now / 150)).strokeRoundedRect(cx - CELL / 2 + 5, cy - CELL / 2 + 5, CELL - 10, CELL - 10, 16);
        });
    }
    // owner badges (upper-left, clear of the rank plate) + pips for OVERCHARGE
    const seen = new Set<number>();
    for (const x of s.grid) {
      if (!x?.item) continue;
      seen.add(x.id);
      const v = this.views.get(x.id);
      if (!v) continue;
      let b = this.itemBadges.get(x.id);
      if (!b || b.getData('kind') !== x.item.kind) {
        b?.destroy();
        b = this.add.container(0, 0).setDepth(56).setData('kind', x.item.kind);
        const im = this.add.image(0, 0, `item_badge_${x.item.kind}`);
        im.setScale(40 / Math.max(im.width, im.height));
        b.add(im);
        const pips = this.add.graphics().setName('pips');
        b.add(pips);
        this.itemBadges.set(x.id, b);
        b.setScale(0.2);
        this.tweens.add({ targets: b, scale: 1, duration: 180, ease: 'Back.Out' });
      }
      b.setPosition(v.x - CELL / 2 + 22, v.y - CELL / 2 + 20).setVisible(v.visible);
      const pg = b.getByName('pips') as Phaser.GameObjects.Graphics;
      pg.clear();
      if (x.item.kind === 'overcharge') for (let k = 0; k < x.item.charges; k++) pg.fillStyle(0x2b1d2e, 1).fillCircle(-8 + k * 16, 26, 7).fillStyle(0xffcf33, 1).fillCircle(-8 + k * 16, 26, 5);
    }
    for (const [id, b] of this.itemBadges)
      if (!seen.has(id)) {
        this.itemBadges.delete(id);
        this.tweens.add({ targets: b, scale: 1.6, alpha: 0, duration: 160, onComplete: () => b.destroy() });
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
    if (msg && msg !== this.laneText.text) {
      this.laneText.setFontSize(28).setText(msg);
      if (this.laneText.width > 610) this.laneText.setFontSize(Math.max(26, Math.floor((28 * 610) / this.laneText.width)));
    }
    if (msg) this.laneText.setColor(col);
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

  /** MAX signature visuals: reveal the resolver's chosen target (Backfire puff, Arc Bridge bolt, Corner Chime ring). */
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
    const label = { backfire: 'BACKFIRE!', bridge: 'ARC BRIDGE!', chime: 'CORNER CHIME!', magnet: 'TWIN PULL!', battery: 'SPLIT CHARGE!', fan: 'LONG GUST!' }[kind];
    this.showEvent(`MAX  ·  ${label}`, '#ffd24a', 450);
    this.ring(b.x, b.y, 0xffcf33, 64, 8, 80);
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
    const key = ti >= 0 && mood && !this.realBoss ? `face_${ti}_${mood}` : '';
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

  hitTarget(big: boolean, tier: 0 | 1 = 0) {
    if (big) this.showFace('hit', 380);
    const t = this.target;
    this.tweens.killTweensOf(t);
    const s = this.targetBaseScale;
    const k = tier === 1 ? { sq: 0.07, kb: 9, inn: 45, out: 170, ease: 'Cubic.Out', tint: 0.3, tout: 110 } : { sq: big ? 0.025 : 0.015, kb: big ? 4 : 2, inn: 35, out: 100, ease: 'Sine.Out', tint: big ? 0.18 : 0, tout: 75 };
    if (REDUCED_MOTION) k.sq = k.kb = 0;
    // squash + knockback away from the board (up), then recover
    t.setAngle(0).setY(this.targetY);
    this.tweens.chain({
      targets: t,
      tweens: [
        { scaleX: s * (1 + k.sq), scaleY: s * (1 - k.sq), y: this.targetY - k.kb, duration: k.inn, ease: 'Quad.Out' },
        { scaleX: s, scaleY: s, y: this.targetY, duration: k.out, ease: k.ease },
      ],
    });
    if (k.tint > 0) this.silhouetteFlash(0xffe2a8, k.tint, k.tout);
    sfx.hit(big);
  }

  /** Warm partial tint over the monster only (stage-local flash; no full-screen white). */
  silhouetteFlash(color: number, alpha: number, outMs: number) {
    const t = this.target;
    const f = this.add.image(t.x, t.y, t.texture.key).setOrigin(t.originX, t.originY).setScale(t.scaleX, t.scaleY).setAngle(t.angle).setTintFill(color).setAlpha(0).setDepth(t.depth + 0.5);
    if (t.mask) f.setMask(t.mask);
    const follow = () => f.setPosition(t.x, t.y).setScale(t.scaleX, t.scaleY);
    this.tweens.add({ targets: f, alpha, duration: 25, onUpdate: follow });
    this.tweens.add({ targets: f, alpha: 0, delay: 25, duration: outMs, ease: 'Quad.Out', onUpdate: follow, onComplete: () => f.destroy() });
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
      // r19: passive hits = particles only; numbers are reserved for chain payloads
      this.sparks.setParticleTint(0xffc0a0);
      this.sparks.explode(4, this.target.x + Phaser.Math.Between(-60, 60), this.target.y + Phaser.Math.Between(-40, 30));
      this.passiveAcc = 0;
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
      this.softFlash(0xff8c00, 0.22, 160);
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
      const col = e.kind === 'item' ? 0xff9a3c : e.kind === 'coil' ? 0x5fe8ff : e.kind === 'bell' ? 0xffd34a : e.kind === 'magnet' ? 0xe07af0 : e.kind === 'battery' ? 0x9be05a : e.kind === 'fan' ? 0xbfe8ff : e.kind === 'backfire' ? 0xff5a3c : e.kind === 'bridge' ? 0x6ff3ff : e.kind === 'chime' ? 0xffe066 : 0xffffff;
      const d = windup + (depthOf.get(e.from) ?? 0) * step;
      this.time.delayedCall(d, () => {
        if (e.kind === 'backfire' || e.kind === 'bridge' || e.kind === 'chime') this.signatureFx(e.kind, a, b);
        else if ((e.kind === 'magnet' || e.kind === 'battery' || e.kind === 'fan') && maxToys.has(e.kind)) this.signatureFx(e.kind, a, b);
        if ((e.kind === 'coil' || e.kind === 'bridge') && this.hasArt('vfx_arc')) {
          const arc = this.add.image((a.x + b.x) / 2, (a.y + b.y) / 2, 'vfx_arc').setDepth(30);
          const len = Phaser.Math.Distance.Between(a.x, a.y, b.x, b.y);
          arc.setRotation(Math.atan2(b.y - a.y, b.x - a.x)).setDisplaySize(len, Math.min(60, (arc.height / arc.width) * len * 1.4));
          this.tweens.add({ targets: arc, alpha: 0, delay: 220, duration: 220, onComplete: () => arc.destroy() });
        } else lg.lineStyle(e.kind === 'spark' ? 5 : e.kind === 'item' ? 11 : 8, col, 0.85).lineBetween(a.x, a.y, b.x, b.y);
        const p = this.add.image(a.x, a.y, 'spark').setTint(col).setDepth(31).setScale(1.1).setBlendMode(Phaser.BlendModes.ADD);
        this.tweens.add({ targets: p, x: b.x, y: b.y, angle: 180, duration: Math.max(60, step), onComplete: () => p.destroy() });
      });
    }
    this.tweens.add({ targets: lg, alpha: 0, delay: windup + maxDepth * step + 200, duration: 250, onComplete: () => lg.destroy() });
    // r25: a power-up that fires pops its icon over its machine (OVERCHARGE also shows x1.5)
    for (const id of r.itemUsed ?? []) {
      const kind = this.itemBadges.get(id)?.getData('kind') as string | undefined;
      const act = r.activations.find((x) => x.id === id);
      if (!kind || !act) continue;
      const { x, y } = cellXY(act.idx);
      this.time.delayedCall(windup + act.depth * step, () => {
        const im = this.add.image(x, y - 20, `item_${kind}`).setDepth(62);
        im.setScale(40 / Math.max(im.width, im.height));
        this.tweens.add({ targets: im, y: y - 90, scale: im.scale * 1.8, alpha: 0, duration: 650, ease: 'Quad.Out', onComplete: () => im.destroy() });
        this.ring(x, y, 0xff9a3c, 70, 10, 320);
        if (kind === 'overcharge') this.floatText(x + 40, y - 40, 'x1.5', '#ff9a3c', 34, 200);
        sfx.merge?.(4);
      });
      tlog.log('item_used', { kind });
    }

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
      this.hitTarget(true, r.count >= 10 ? 1 : 0);
      if (r.count >= 3) {
        sfx.chord(Math.min(r.count, 20));
        duckMusic();
      }
      // camera stays still (playtest 2 + ChatGPT r11); only a MAX machine gives a tiny kick, and Shake can switch it off
      const hasMax = r.activations.some((a) => a.rank >= MAX_RANK);
      if (hasMax) this.shake(80, 0.002);
      if (r.count >= 10) haptic(10);
      const huge = r.count >= 10;
      if (r.count > 1) this.showEvent(`x${r.count} CHAIN  ·  ${fmt(r.total)}`, huge ? '#ffd24a' : '#fff0cf', 1500);
      if (!kickback && r.count >= 3)
        this.time.delayedCall(500, () =>
          this.explain('x_chain', [
            { text: 'Your merge fired this gadget.\nIt hit the monster.', spots: [cellXY(r.rootIdx)] },
            { text: 'It woke these other gadgets.\nCoils zap; Bells ring their lines.\nThey wake OTHER families.', spots: [], draw: () => this.chainArrows(r, 3, true) },
            { text: `Those fired too: a CHAIN of ${r.count}!\nMove gadgets next to each other\nto connect their reach.`, spots: [], draw: () => this.chainArrows(r, 3, false) },
          ]),
        );
      // damage number beside the opponent, never on its face
      const capped = this.s.level !== undefined && !this.s.goal && r.total > this.s.maxHp * TUNING.cascadeCap;
      if (capped) this.showEvent(`x${r.count} CHAIN  \u00b7  MAX HIT!`, '#ffd24a', 1500);
      if (!this.s.goal) this.floatText(this.target.x + 150, this.target.y - 40, capped ? 'MAX' : fmt(r.total), huge ? '#ffcf33' : '#ffffff', huge ? 44 : 34, huge ? 200 : 0);
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
      this.softFlash(0xffffff, 0.35, 200);
      this.tweens.add({ targets: tgt, scale: this.targetBaseScale * 1.12, duration: 260, ease: 'Quad.Out' });
      haptic(18);
      this.tweens.killTweensOf(tgt);
      this.silhouetteFlash(0xffe2a8, 0.35, 140);
      if (this.hasArt(`target_${this.s.target}_dmg`)) tgt.setTexture(`target_${this.s.target}_dmg`);
      this.showFace('dizzy', 3000);
      this.tweens.add({ targets: tgt, x: { from: tgt.x - 5, to: tgt.x + 5 }, angle: { from: -2, to: 2 }, duration: 60, yoyo: true, repeat: 8 });
      this.boardGoldWave();
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
      // r21: keep the whole stage visible (Ido: "I want to see me winning the boss"); the words go in the lane
      this.explainQueue = [];
      this.coach.clear(); // defeat cancels any pending coach display
      this.showEvent(`${name} DOWN!`, '#ffd24a', 2400);
      this.laneText.setScale(1.4);
      this.tweens.add({ targets: this.laneText, scale: 1, duration: 260, ease: 'Back.Out' });
      this.tweens.add({ targets: [this.scrapZone, this.trayPlate, this.trayLabel].filter(Boolean), alpha: 0.25, duration: 120 });
      sfx.win();
    });
  }

  /** ChatGPT r11: on the killing hit the board says "my contraption did this": the winning merge gets a gold rim,
   *  then the gadgets that fired pulse once in activation order (1.035, 60/100ms, 20ms stagger, max 8 groups). */
  boardGoldWave() {
    const r = this.lastCascade;
    if (!r) return;
    const root = cellXY(r.rootIdx);
    const g = this.add.graphics().setDepth(30);
    g.lineStyle(8, 0xffcf33, 1).strokeRoundedRect(root.x - CELL / 2 + 6, root.y - CELL / 2 + 6, CELL - 12, CELL - 12, 20);
    this.tweens.add({ targets: g, alpha: 0, delay: 120, duration: 260, onComplete: () => g.destroy() });
    if (REDUCED_MOTION) return;
    const depths = [...new Set(r.activations.map((a) => a.depth))].sort((a, b) => a - b).slice(0, 8);
    this.time.delayedCall(120, () =>
      depths.forEach((d, gi) =>
        r.activations
          .filter((a) => a.depth === d)
          .forEach((a) => {
            const cur = this.s.grid[a.idx];
            const v = cur && cur.id === a.id ? this.views.get(a.id) : undefined;
            if (!v || v === this.dragView) return;
            this.tweens.chain({
              targets: v,
              tweens: [
                { scale: 1.035, duration: 60, delay: gi * 20, ease: 'Quad.Out' },
                { scale: 1, duration: 100, ease: 'Quad.In' },
              ],
            });
          }),
      ),
    );
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
        haptic(18);
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
      this.tweens.add({ targets: this.target, y: this.targetY, duration: 420, ease: 'Bounce.Out' });
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

  /** Partial-opacity full-screen flash (a full-white camera flash read as a crash on the phone). */
  softFlash(color: number, alpha: number, ms: number) {
    const r = this.add.rectangle(W / 2, H / 2, W, H, color, alpha).setDepth(95);
    this.tweens.add({ targets: r, alpha: 0, duration: ms, ease: 'Quad.Out', onComplete: () => r.destroy() });
  }

  /** Camera shake, skipped entirely under prefers-reduced-motion. */
  shake(ms: number, intensity: number) {
    if (!REDUCED_MOTION && this.meta.shake !== false) this.cameras.main.shake(ms, intensity);
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

  button(c: Phaser.GameObjects.Container, x: number, y: number, w: number, label: string, color: number, cb: () => void, size = 1) {
    const b = this.add.container(x, y).setScale(size);
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
      b.setScale(0.95 * size);
      if (g instanceof Phaser.GameObjects.Image && this.hasArt(artKey + '_pressed')) g.setTexture(artKey + '_pressed');
    });
    b.on('pointerup', () => {
      b.setScale(size);
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
    if (this.s.level !== undefined) return this.openLevelResult(won);
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
    const mastery = (m.mastery ??= {});
    const newBests: string[] = [];
    for (const [fam, r] of Object.entries(this.runBest) as [Family, number][]) {
      if (r > (mastery[fam] ?? 0)) {
        if ((mastery[fam] ?? 0) > 0 || r >= 2) newBests.push(`${FAMILY_INFO[fam].name} ${r}`);
        mastery[fam] = r;
      }
    }
    const pay = this.settleBolts(won);
    const daily = s.daily ? this.recordDaily(won) : null;
    if (daily) newBest = false;
    store(META_KEY, JSON.stringify(m));
    store(SAVE_KEY, null);
    won ? sfx.win() : sfx.lose();
    // ChatGPT r13 layout: headline first, the machine in a fixed region, few big numbers, "new this run", details, CTA stack
    const PH = 1000;
    const c = this.panel(PH);
    const top = H / 2 - PH / 2;
    const txt = (y: number, t: string, size: number, color: string, font = 'Lilita One, Arial Black') =>
      c.add(this.add.text(W / 2, y, t, { fontFamily: font, fontStyle: font === 'Arial' ? 'bold' : '', fontSize: `${size}px`, color, align: 'center', wordWrap: { width: W - 150 } }).setOrigin(0.5));
    const head = this.add.text(W / 2, top + 70, won ? `${TARGET_NAMES[Math.max(0, s.target)]} DEFEATED!` : "TIME'S UP!", { fontFamily: 'Lilita One, Arial Black', fontSize: '58px', color: won ? '#e8452c' : '#3b2533' }).setOrigin(0.5);
    while (head.width > W - 140 && Number.parseInt(String(head.style.fontSize)) > 30) head.setFontSize(Number.parseInt(String(head.style.fontSize)) - 4);
    c.add(head);
    const sub = won
      ? `${s.elapsed.toFixed(1)}s${newBest ? '  ·  NEW BEST!' : ''}${s.practice ? '  (practice)' : ''}`
      : s.remix
        ? `${TARGET_NAMES[s.target]} at ${Math.round((1 - s.hp / s.maxHp) * 100)}%`
        : `Beat ${s.target} of 3  ·  ${TARGET_NAMES[s.target]} at ${Math.round((1 - s.hp / s.maxHp) * 100)}%`;
    txt(top + 128, sub, 30, newBest ? '#2f8a3a' : '#5a4a5a');
    if (hasMachineArt(this)) {
      const pic = buildMachine(this, W / 2, top + 390, 430, this.runBest, s.toys[0] ?? null, s.shooter ?? 'cannon')!;
      c.add(pic);
      const sc0 = pic.scale;
      this.tweens.add({ targets: pic, scale: { from: sc0 * 0.7, to: sc0 }, duration: 380, ease: 'Back.Out' });
      txt(top + 420, won ? 'Your machine this run, built from your best merges' : 'Your machine this run. Merge higher to grow it!', 21, '#7a5a4a', 'Arial');
    }
    const big = [`Biggest chain x${s.stats.biggestChain}`, pay && pay.total > 0 ? `+${pay.total} BOLTS` : ''].filter(Boolean).join('    ');
    txt(top + 490, big, 36, '#3b2533');
    const fresh: string[] = [];
    if (daily) {
      const [b, improved] = daily;
      fresh.push(`Daily best ${b.targets === 3 ? `${b.time}s` : `${b.targets}/3 + ${fmt(b.dmg)}`}${improved ? '  NEW!' : ''}  ·  new bench tomorrow`);
    }
    if (newBests.length) fresh.push(`New best: ${newBests.slice(0, 3).join(' · ')}`);
    if (pay?.onboarding) fresh.push('Includes a welcome gift of 12 Bolts');
    if (unlockedNow) fresh.push('★ Daily, Challenge + Remix unlocked ★');
    if (fresh.length) {
      c.add(this.add.graphics().fillStyle(0xfff3c8, 1).fillRoundedRect(70, top + 535, W - 140, 40 + fresh.length * 38, 18));
      txt(top + 557 + (fresh.length * 38) / 2, fresh.join('\n'), 24, '#b06a1a');
    }
    const rec = s.daily ? null : s.remix ? (m.remixBest[`${s.target}:${this.activeToys()[0] ?? 'none'}`] ?? null) : s.hard ? m.bestTimeHard : m.bestTime;
    const details = [`Biggest hit ${fmt(s.stats.biggestHit)}`, rec !== null ? `Record ${rec.toFixed(1)}s` : '', s.perks.length ? `Perks: ${s.perks.map((p) => PERKS[p].name).join(', ')}` : ''].filter(Boolean).join('  ·  ');
    txt(top + 720, details, 20, '#8a7a6a', 'Arial');
    this.button(c, W / 2, top + 820, 520, 'ONE MORE!', 0xe8452c, () => this.retry(), 1.15);
    this.button(c, W / 2, top + 932, 260, 'HOME', 0x27a4c0, () => this.openTitle(), 0.78);
  }

  /** SAGA level result: stars, Bolts (first clear / replay / new stars / eligible fail), free boosters, next step. */
  openLevelResult(won: boolean) {
    this.coach.clear();
    this.closeInspect();
    this.capsuleBtn?.setVisible(false);
    const s = this.s;
    const m = this.meta;
    const n = s.level!;
    const def = LEVELS[n - 1];
    m.runs++;
    const key = String(n);
    const stars = (m.levelStars ??= {});
    const grants = (m.grants ??= {});
    const id = `L${n}:${s.seed}:${s.stats.merges}:${s.elapsed.toFixed(2)}`;
    const fresh = m.lastSettle !== id;
    m.lastSettle = id;
    const lines: string[] = [];
    let bolts = 0;
    const parts: string[] = [];
    let got = 0;
    let firstClear = false;
    let chapterDone = 0;
    if (won) {
      m.wins++;
      got = starsFor(def, s.elapsed);
      const prev = stars[key] ?? 0;
      firstClear = prev === 0;
      const rw = levelReward(def);
      if (fresh) {
        const lvB = firstClear ? rw.win_bolts + rw.first_clear_bolts : Math.min(rw.win_bolts, Math.floor(0.15 * s.elapsed));
        const stB = Math.max(0, got - prev) * rw.new_star_bolts;
        bolts += lvB + stB;
        parts.push(`${firstClear ? 'First clear' : 'Level'} +${lvB}`);
        if (stB) parts.push(`Stars +${stB}`);
        if (firstClear && rw.free_jumpstart && !grants[`kit${n}`]) {
          grants[`kit${n}`] = true;
          m.kits = (m.kits ?? 0) + rw.free_jumpstart;
          lines.push(`+${rw.free_jumpstart} Jumpstart Kit`);
        }
        if (firstClear && rw.free_time_capsule && !grants[`cap${n}`]) {
          grants[`cap${n}`] = true;
          m.capsules = (m.capsules ?? 0) + rw.free_time_capsule;
          lines.push(`+${rw.free_time_capsule} Time Capsule`);
        }
      }
      stars[key] = Math.max(prev, got);
      const total = Object.values(stars).reduce((a, b) => a + b, 0);
      if (total >= 25 && !grants.stars25) {
        grants.stars25 = true;
        m.kits = (m.kits ?? 0) + 1;
        lines.push('25 stars: +1 Jumpstart Kit');
      }
      if (total >= 50 && !grants.stars50) {
        grants.stars50 = true;
        m.capsules = (m.capsules ?? 0) + 1;
        lines.push('50 stars: +1 Time Capsule');
      }
      if (firstClear && n % 10 === 0 && !(m.medals ??= {})[String(n / 10)]) {
        m.medals![String(n / 10)] = true;
        chapterDone = n / 10;
        tlog.log('chapter_reward_granted', { chapter: chapterDone });
      }
      if (n >= 5 && !m.hardUnlocked) {
        m.hardUnlocked = true;
        lines.push('\u2605 Rocket + all events unlocked \u2605');
      }
    } else if (fresh && s.elapsed >= 30 && s.stats.merges >= 3) {
      const day = localDate();
      const fp = (m.failPaid ??= {});
      if (fp[key] !== day) {
        fp[key] = day;
        bolts += 4;
        parts.push('Good try +4');
      }
    }
    if (fresh && !m.onboarded && (won || (s.elapsed >= 30 && s.stats.merges >= 3))) {
      m.onboarded = true;
      bolts += ONBOARDING_BOLTS;
      parts.push(`Welcome +${ONBOARDING_BOLTS}`);
    }
    m.bolts = (m.bolts ?? 0) + bolts;
    // mastery (the home machine) grows from this attempt's merges either way
    const mastery = (m.mastery ??= {});
    for (const [fam, r] of Object.entries(this.runBest) as [Family, number][]) if (r > (mastery[fam] ?? 0)) mastery[fam] = r;
    m.bestChain = Math.max(m.bestChain, s.stats.biggestChain);
    tlog.log('level_end', { level: n, won, stars: got, elapsed: +s.elapsed.toFixed(1), bolts, jumpstart: !!s.jumpstart, capsule: !!s.capsuleUsed, firstClear });
    store(META_KEY, JSON.stringify(m));
    store(SAVE_KEY, null);
    won ? sfx.win() : sfx.lose();
    const PH = 860;
    const c = this.panel(PH);
    const top = H / 2 - PH / 2;
    const head = won ? `LEVEL ${n} CLEAR!` : 'OUT OF TIME!';
    c.add(this.add.text(W / 2, top + 80, head, { fontFamily: 'Lilita One, Arial Black', fontSize: '62px', color: won ? '#e8452c' : '#3b2533' }).setOrigin(0.5));
    c.add(this.add.text(W / 2, top + 140, s.goal ? (won ? `${s.goal.kind === 'rank' ? `Rank ${s.goal.n} built` : `Chain x${s.goal.n} fired`} in ${s.elapsed.toFixed(1)}s` : `Best ${s.goal.kind === 'rank' ? 'rank' : 'chain x'}${s.goal.best} of ${s.goal.n}  ·  so close!`) : won ? `${TARGET_NAMES[s.target]} down in ${s.elapsed.toFixed(1)}s` : `${TARGET_NAMES[s.target]} at ${Math.round((1 - s.hp / s.maxHp) * 100)}%  ·  so close!`, { fontFamily: 'Lilita One, Arial Black', fontSize: '28px', color: '#5a4a5a' }).setOrigin(0.5));
    for (let k = 0; k < 3; k++) {
      const st = this.add.image(W / 2 + (k - 1) * 130, top + 270 + (k === 1 ? -14 : 0), 'star');
      const sc = (k === 1 ? 120 : 100) / Math.max(st.width, st.height);
      st.setScale(0).setAlpha(k < got ? 1 : 0.22);
      c.add(st);
      this.tweens.add({ targets: st, scale: sc, duration: 260, delay: 200 + k * 220, ease: 'Back.Out', onStart: () => k < got && sfx.star(k) });
    }
    if (won && got < 3) c.add(this.add.text(W / 2, top + 360, `Next star: clear in ${starGoals(def)[got === 1 ? 0 : 1]}s`, { fontFamily: 'Arial', fontStyle: 'bold', fontSize: '20px', color: '#7a5a4a' }).setOrigin(0.5));
    c.add(this.add.text(W / 2, top + 410, [s.stats.biggestChain >= 2 && n >= 2 ? `Biggest chain x${s.stats.biggestChain}` : '', bolts > 0 ? `+${bolts} BOLTS` : ''].filter(Boolean).join('    '), { fontFamily: 'Lilita One, Arial Black', fontSize: '36px', color: '#3b2533' }).setOrigin(0.5));
    if (bolts > 0) this.time.delayedCall(250 + got * 220, () => sfx.boltRoll(Math.ceil(bolts / 6)));
    if (parts.length) c.add(this.add.text(W / 2, top + 448, parts.join('  \u00b7  '), { fontFamily: 'Arial', fontStyle: 'bold', fontSize: '20px', color: '#7a5a4a' }).setOrigin(0.5));
    if (lines.length) {
      c.add(this.add.graphics().fillStyle(0xfff3c8, 1).fillRoundedRect(70, top + 485, W - 140, 30 + lines.length * 36, 18));
      c.add(this.add.text(W / 2, top + 500 + (lines.length * 36) / 2, lines.join('\n'), { fontFamily: 'Lilita One, Arial Black', fontSize: '24px', color: '#b06a1a', align: 'center' }).setOrigin(0.5));
    }
    if (chapterDone) this.time.delayedCall(700, () => this.playChapterChest(chapterDone));
    else if (won && n % 10 !== 0 && n > 1) {
      const left = 10 - (n % 10);
      c.add(this.add.text(W / 2, top + 600, `${left} level${left > 1 ? 's' : ''} until your Chapter ${Math.ceil(n / 10)} chest`, { fontFamily: 'Lilita One, Arial Black', fontSize: '24px', color: '#7a5a4a' }).setOrigin(0.5));
    }
    const nextN = Math.min(LEVELS.length, n + 1);
    if (won) this.button(c, W / 2, top + 690, 520, n < LEVELS.length ? `NEXT  LEVEL ${nextN}` : 'ROAD', 0x5fbf4a, () => (n < LEVELS.length ? this.openLevelSheet(nextN) : this.openTitle('road')), 1.1);
    else this.button(c, W / 2, top + 690, 520, 'TRY AGAIN', 0xe8452c, () => this.openLevelSheet(n), 1.1);
    this.button(c, W / 2, top + 800, 260, 'ROAD', 0x27a4c0, () => this.openTitle('road'), 0.78);
  }

  /** Chapter chest (r17): closed chest -> crossfade open -> the chapter medal rises; tap to dismiss. */
  playChapterChest(chapter: number) {
    const o = this.add.container(0, 0).setDepth(140);
    o.add(this.add.rectangle(W / 2, H / 2, W, H, 0x1a0f18, 0.82).setInteractive());
    o.add(this.add.text(W / 2, H / 2 - 360, `CHAPTER ${chapter} COMPLETE!`, { fontFamily: 'Lilita One, Arial Black', fontSize: '56px', color: '#ffcf33', stroke: '#2b1d2e', strokeThickness: 10 }).setOrigin(0.5));
    const closed = this.hasArt('chest_closed') ? this.add.image(W / 2, H / 2, 'chest_closed') : null;
    const open = this.hasArt('chest_open') ? this.add.image(W / 2, H / 2, 'chest_open').setAlpha(0) : null;
    for (const im of [closed, open]) if (im) im.setScale(300 / Math.max(im.width, im.height));
    if (closed) o.add(closed);
    if (open) o.add(open);
    const medal = this.medalIcon(W / 2, H / 2 - 40, 220, chapter, true).setAlpha(0).setScale(0.4);
    o.add(medal);
    const cap = this.add.text(W / 2, H / 2 + 260, `Chapter ${chapter} medal added to your MACHINE\n(tap to continue)`, { fontFamily: 'Lilita One, Arial Black', fontSize: '26px', color: '#fff0cf', align: 'center' }).setOrigin(0.5).setAlpha(0);
    o.add(cap);
    sfx.chestShake();
    if (closed) this.tweens.add({ targets: closed, angle: { from: -4, to: 4 }, duration: 90, yoyo: true, repeat: 4 });
    this.time.delayedCall(700, () => {
      sfx.chestOpen();
      this.time.delayedCall(250, () => sfx.medal());
      if (closed) this.tweens.add({ targets: closed, alpha: 0, duration: 200 });
      if (open) this.tweens.add({ targets: open, alpha: 1, duration: 200 });
      this.tweens.add({ targets: medal, alpha: 1, scale: 1, y: H / 2 - 170, duration: 520, ease: 'Back.Out' });
      this.tweens.add({ targets: cap, alpha: 1, delay: 400, duration: 300 });
    });
    o.list[0].on('pointerup', () => {
      tlog.log('chapter_reward_presented', { chapter });
      o.destroy();
    });
  }

  /** Leave a run for the home page: an abandoned run keeps what it earned (no Daily bonus), then the save is dropped. */
  quitHome() {
    const s = this.s;
    if ((s.phase === 'playing' || s.phase === 'choice') && !s.showcase) {
      const pay = this.settleBolts(false, false);
      tlog.log('quit', { at: +s.elapsed.toFixed(1), bolts: pay?.total ?? 0 });
      s.phase = 'lost';
      store(META_KEY, JSON.stringify(this.meta));
      store(SAVE_KEY, null);
      if (pay?.total) this.time.delayedCall(250, () => this.showToast(`+${pay.total} BOLTS`));
    }
    this.paused = false;
    this.openTitle();
  }

  /** Pays Bolts once per finished run (guarded by a settlement id so a reload cannot pay twice). */
  settleBolts(won: boolean, completed = true): Payout | null {
    const s = this.s;
    const m = this.meta;
    if (s.phase === 'tutorial') return null;
    const id = `${s.seed}:${s.stats.merges}:${s.elapsed.toFixed(2)}`;
    if (m.lastSettle === id) return null;
    m.lastSettle = id;
    const bosses = s.remix ? (won ? 1 : 0) : won ? 3 : Math.max(0, s.target);
    const date = s.daily;
    const pay = runPayout(
      { activeSec: s.elapsed, merges: s.stats.merges, bossesDefeated: bosses, fullClear: won, bestChain: s.stats.biggestChain, completed },
      { dailyUnclaimed: !!date && !m.dailyPaid?.[date], onboardingUnclaimed: !m.onboarded },
    );
    if (pay.daily && date) {
      (m.dailyPaid ??= {})[date] = true;
      m.kits = (m.kits ?? 0) + 1; // r15: the Daily bonus also grants one Jumpstart Kit
    }
    if (pay.onboarding) m.onboarded = true;
    m.bolts = (m.bolts ?? 0) + pay.total;
    tlog.log('bolts_earned', { ...pay, balance: m.bolts });
    return pay;
  }

  activeToys(): Family[] {
    if (this.meta.playtestMode) return [];
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
  retry(hardArg?: boolean, remixArg?: number) {
    // "again" (ONE MORE / RESTART, no args) repeats the same mode; a Daily repeats today's bench
    if (hardArg === undefined && this.s.daily) return this.startDaily();
    if (hardArg === undefined && this.s.level !== undefined) return this.startLevel(this.s.level);
    const hard = hardArg ?? this.s.hard;
    const remixTarget = remixArg ?? (this.s.remix ? this.s.target : -1);
    tlog.log('retry', { hard });
    this.closeModal();
    this.meta.tutorialDone = true;
    store(META_KEY, JSON.stringify(this.meta));
    this.startState(newGame(Date.now() >>> 0, false, hard, this.activeToys(), remixTarget, this.teamShooter()));
  }

  /** Daily Bench (ChatGPT r11): today's validated seed, normal rules, no helper toy, unlimited retries. */
  startDaily() {
    this.closeModal();
    const date = localDate();
    const seed = dailySeed(date);
    const s = newGame(seed, false, false, [], -1);
    s.daily = date;
    const prev = this.meta.daily?.[date];
    tlog.log('daily_start', { rules: DAILY_VERSION, seed, date, attempt: (prev?.attempts ?? 0) + 1 });
    this.startState(s);
    this.showEvent('DAILY BENCH  ·  same board for everyone today', '#ffd24a', 2200);
  }

  /** Records a finished Daily attempt on its ORIGINAL date (even past midnight). Returns [best, improved]. */
  recordDaily(won: boolean): [DailyBest, boolean] {
    const s = this.s;
    const date = s.daily!;
    const all = (this.meta.daily ??= {});
    const prev = all[date];
    const hpMax = s.target >= 0 && s.target < 3 ? s.maxHp : 1;
    const cur: DailyBest = { v: DAILY_VERSION, targets: won ? 3 : Math.max(0, s.target), time: won ? +s.elapsed.toFixed(1) : null, dmg: won ? 0 : Math.round(hpMax - s.hp), attempts: (prev?.attempts ?? 0) + 1 };
    const improved = dailyBetter(cur, prev);
    all[date] = improved ? cur : { ...prev!, attempts: cur.attempts };
    for (const k of Object.keys(all).sort().slice(0, -14)) delete all[k];
    tlog.log('daily_end', { rules: DAILY_VERSION, seed: s.seed, date, attempt: cur.attempts, targets: cur.targets, time: cur.time, dmg: cur.dmg });
    if (improved) tlog.log('daily_best_improved', { date, targets: cur.targets, time: cur.time, dmg: cur.dmg });
    return [all[date], improved];
  }

  homeTab: 'road' | 'machine' | 'events' = 'road';
  /** HOME (ChatGPT r15): ROAD (the level saga) / MACHINE (team, workshop, mastery) / EVENTS (daily, challenge, remix). */
  openTitle(tab: 'road' | 'machine' | 'events' = this.homeTab) {
    this.homeTab = tab;
    if (!hasMachineArt(this) || !this.hasArt('hero_bg')) return this.openLegacyTitle();
    if (tab === 'road' && this.hasArt('node_normal')) return this.openRoadTab();
    if (tab === 'events') return this.openEventsTab();
    return this.openMachineTab();
  }

  /** MACHINE tab: YOUR MACHINE as the hero, team, PLAY (current level), workshop, utilities. */
  openMachineTab() {
    this.closeModal();
    const m = this.meta;
    const c = this.add.container(0, 0).setDepth(100);
    if (this.homeC?.active) this.homeC.destroy();
    this.homeC = c;
    this.modal = c;
    const u = W / 390; // design spec is in CSS px at 390 wide
    const bottom = H;
    // layout: top-anchored header, bottom-anchored controls, the machine fills what is left
    const helperY = bottom - 547;
    const feetY = Math.min(helperY - 70, bottom - 600);
    const headY = 150;
    const room = feetY - (headY + 70);
    const mWidth = Math.min(W * 1.02, Math.max(380, room / 0.56));
    // background, pedestal aligned under the machine's feet
    const stageKey = m.stage && this.hasArt(`stagebg_${m.stage}`) ? `stagebg_${m.stage}` : 'hero_bg';
    const bg = this.add.image(W / 2, 0, stageKey).setOrigin(0.5, 0);
    const k = Math.max(W / bg.width, (feetY - 20) / (0.538 * bg.height), (H - feetY + 20) / (0.462 * bg.height));
    bg.setScale(k).setY(feetY - 20 - 0.538 * bg.height * k);
    c.add([bg, this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.001).setInteractive()]);

    this.drawWallet(c);

    // identity
    const name = m.owned?.includes('nameplate') ? MACHINE_NAMES[(m.nameIdx ?? 0) % MACHINE_NAMES.length] : 'YOUR MACHINE';
    // ChatGPT r13: quieter identity on the quiet wall (no heavy sticker outline)
    const darkStage = m.stage === 'night_shift';
    c.add(this.add.text(W / 2, headY, name, { fontFamily: 'Lilita One, Arial Black', fontSize: '50px', color: darkStage ? '#fff0cf' : '#3b2533', stroke: darkStage ? '#2b1d2e' : '#fff0cf', strokeThickness: darkStage ? 8 : 4 }).setOrigin(0.5));
    const empty = !Object.values(m.mastery ?? {}).some((r) => (r ?? 0) > 0);
    const status = empty ? 'Starter kit  ·  upgrade it in runs' : m.bestChain ? `Best chain: x${m.bestChain}` : "Built from the gadgets you've merged";
    c.add(this.add.text(W / 2, headY + 48, status, { fontFamily: 'Lilita One, Arial Black', fontSize: '26px', color: darkStage ? '#e8dcc8' : '#5a3a3a' }).setOrigin(0.5));

    // trophy shelf (r17): earned chapter medals, collection only
    const medals = Object.keys(m.medals ?? {}).map(Number).sort((a, b) => a - b);
    medals.slice(0, 6).forEach((ch, i) => c.add(this.medalIcon(W / 2 + (i - (Math.min(medals.length, 6) - 1) / 2) * 76, headY + 110, 70, ch, true)));
    // r28 MONSTER BOOK: every monster / mini-boss / boss you have met
    if (this.currentLevel() > 1) {
      const bk = this.add.container(W - 86, headY + 110);
      bk.add(this.add.graphics().fillStyle(0x2b1d2e, 1).fillRoundedRect(-60, -34, 120, 68, 18).fillStyle(0x8e58c9, 1).fillRoundedRect(-56, -30, 112, 60, 15));
      bk.add(this.add.text(0, 0, 'BOOK', { fontFamily: 'Lilita One, Arial Black', fontSize: '28px', color: '#ffffff' }).setOrigin(0.5));
      bk.setSize(120, 68).setInteractive({ useHandCursor: true });
      bk.on('pointerup', () => (sfx.click(), this.openMonsterBook(0, 0)));
      c.add(bk);
    }
    // the machine
    const helper = this.activeToys()[0] ?? null;
    // day 0: three rank-1 starter modules instead of an empty chassis (display baseline, not earned mastery)
    const shown = empty ? { cannon: 1, coil: 1, bell: 1 } : (m.mastery ?? {});
    const mach = buildMachine(this, W / 2, feetY, mWidth, empty ? { ...shown, [this.teamShooter()]: 1 } : shown, helper, this.teamShooter())!;
    this.applyFinish(mach);
    c.add(mach);
    const hit = this.add.zone(W / 2, feetY - mWidth * 0.25, mWidth * 0.95, mWidth * 0.5).setInteractive({ useHandCursor: true });
    hit.on('pointerup', () => this.openWorkshop());
    c.add(hit);
    // idle: 1% breath over 2400ms; newly improved modules get one 180ms highlight
    if (!REDUCED_MOTION) this.tweens.add({ targets: mach, scaleY: mach.scaleY * 1.01, duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    const seen = m.homeSeen ?? {};
    for (const f of ['cannon', 'coil', 'bell'] as Family[]) {
      if ((m.mastery?.[f] ?? 0) > (seen[f] ?? 0)) {
        const part = mach.getByName(f) as Phaser.GameObjects.Image | null;
        if (part) {
          const s0 = part.scale;
          this.tweens.chain({ targets: part, tweens: [{ scale: s0 * 1.12, duration: 180, delay: 350, ease: 'Quad.Out' }, { scale: s0, duration: 220, ease: 'Sine.Out' }] });
        }
      }
    }
    m.homeSeen = { ...(m.mastery ?? {}) };
    store(META_KEY, JSON.stringify(m));

    // helper row
    const unlocked = Object.keys(m.toys) as Family[];
    const hy = helperY;
    const hg = this.add.graphics().fillStyle(0x2b1d2e, 0.82).fillRoundedRect(44, hy - 46, W - 88, 92, 26);
    c.add(hg);
    const nc = this.nextChallenge();
    const teamOn = unlocked.length > 0 || m.hardUnlocked;
    const shooterName = FAMILY_INFO[this.teamShooter() as keyof typeof FAMILY_INFO].name;
    const hl = teamOn ? `Team:  ${shooterName} + ${helper ? FAMILY_INFO[helper].name : 'no helper'}` : empty || !m.bestChain ? 'Merge your first gadgets: tap PLAY!' : nc ? `Next helper: ${nc.text}` : 'Helpers: none yet';
    const ht = this.add.text(80, hy, hl, { fontFamily: 'Lilita One, Arial Black', fontSize: teamOn ? '28px' : '22px', color: '#fff0cf', wordWrap: { width: teamOn ? 400 : W - 170 } }).setOrigin(0, 0.5);
    c.add(ht);
    if (teamOn && !(m.playtestMode && !m.hardUnlocked)) this.button(c, W - 150, hy, 220, 'TEAM', 0x27a4c0, () => this.openTeamSheet(), 0.62);

    // PLAY = the current saga level
    const play = this.button(c, W / 2, bottom - 410, 600, `PLAY  LEVEL ${this.currentLevel()}`, 0x5fbf4a, () => this.openLevelSheet(this.currentLevel()), 1.1);
    if (!REDUCED_MOTION) this.tweens.add({ targets: play, scale: 1.13, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.InOut' });

    // modes: three equal buttons; locked ones explain themselves
    const today = m.daily?.[localDate()];
    if (m.hardUnlocked) tlog.log('daily_offer_view', { date: localDate(), done: !!today });
    const locked = () => this.showToast('Win one normal run to unlock'.toUpperCase());
    const modes: [string, number, () => void][] = [
      [today ? 'DAILY \u2713' : 'DAILY', 0x5fbf4a, () => (m.hardUnlocked ? this.startDaily() : locked())],
      ['CHALLENGE', 0xe8452c, () => (m.hardUnlocked ? this.retry(true, -1) : locked())],
      ['REMIX', 0x27a4c0, () => (m.hardUnlocked ? this.openRemixPicker() : locked())],
    ];
    void modes;
    void locked;

    // workshop
    const wsOpen = !m.playtestMode && (this.currentLevel() > 5 || !!m.hardUnlocked || (m.owned?.length ?? 0) > 0);
    const ws = this.button(c, W / 2, bottom - 280, 600, wsOpen ? 'WORKSHOP' : m.playtestMode ? 'WORKSHOP  \u00b7  soon' : 'WORKSHOP  \u00b7  level 5', 0x8a6a4a, () => (wsOpen ? this.openWorkshop() : this.showToast('THE WORKSHOP OPENS AFTER LEVEL 5')), 0.85);
    if (!wsOpen) ws.setAlpha(0.6);
    // dot only for genuinely new options: something became affordable since the last Workshop visit
    const affordable = wsOpen && CATALOG.some((it) => !m.owned?.includes(it.id) && it.price <= (m.bolts ?? 0) && it.price > (m.workshopSeenBolts ?? -1));
    if (affordable) c.add(this.add.circle(W / 2 + 230, bottom - 312, 12, 0xe8452c).setStrokeStyle(4, 0xffffff));

    // utilities
    const util = this.add.text(W / 2, bottom - 175, 'Records   ·   How to play', { fontFamily: 'Lilita One, Arial Black', fontSize: '28px', color: '#fff0cf', stroke: '#2b1d2e', strokeThickness: 6 }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    util.on('pointerup', (p: Phaser.Input.Pointer) => {
      sfx.click();
      if (p.worldX < W / 2) this.openRecords();
      else this.openHowTo(0, () => this.openTitle());
    });
    c.add(util);
    this.drawNav(c, 'machine');
    void u;
    c.setAlpha(0);
    this.tweens.add({ targets: c, alpha: 1, duration: 180, ease: 'Cubic.Out' });
  }

  /** Header: Bolts (core) + Jumpstart Kits + Time Capsules (dynamic) + settings. */
  drawWallet(c: Phaser.GameObjects.Container) {
    const m = this.meta;
    const barY = 62;
    c.add(this.add.image(W / 2, barY, 'res_bar').setDisplaySize(W - 50, 104));
    const item = (key: string, x: number, val: number) => {
      if (this.hasArt(key)) {
        const ic = this.add.image(x, barY, key);
        ic.setScale(54 / Math.max(ic.width, ic.height));
        c.add(ic);
      }
      c.add(this.add.text(x + 34, barY, String(val), { fontFamily: 'Lilita One, Arial Black', fontSize: '38px', color: '#3b2533' }).setOrigin(0, 0.5));
    };
    item('bolt', 84, m.bolts ?? 0);
    // r18: the header grows with the player: Kits after the first one arrives, Capsules once unlocked
    const showKits = (m.kits ?? 0) > 0 || Object.keys(m.grants ?? {}).some((k) => k.startsWith('kit')) || m.hardUnlocked;
    const showCaps = (m.capsules ?? 0) > 0 || this.currentLevel() > BOOSTER_UNLOCK.time_capsule || m.hardUnlocked;
    if (showKits) item('booster_jumpstart', 290, m.kits ?? 0);
    if (showCaps) item('booster_time_capsule', 440, m.capsules ?? 0);
    const wallet = this.add.zone(W / 2 - 40, barY, W - 220, 96).setInteractive({ useHandCursor: true });
    wallet.on('pointerup', () => this.openWalletInfo());
    const gear = this.add.text(W - 84, barY, '\u2699', { fontFamily: 'Arial', fontSize: '54px', color: '#3b2533' }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    gear.on('pointerup', () => this.openSettings());
    c.add([wallet, gear]);
  }

  /** Bottom navigation: ROAD / MACHINE / EVENTS. */
  drawNav(c: Phaser.GameObjects.Container, active: 'road' | 'machine' | 'events') {
    const y = H - 62;
    c.add(this.add.graphics().fillStyle(0x2b1d2e, 0.92).fillRoundedRect(20, y - 50, W - 40, 100, 30));
    (['road', 'machine', 'events'] as const).forEach((t, i) => {
      const x = W / 2 + (i - 1) * 226;
      const on = t === active;
      if (on) c.add(this.add.graphics().fillStyle(0xffcf33, 1).fillRoundedRect(x - 100, y - 40, 200, 80, 22));
      const lb = this.add.text(x, y, t.toUpperCase(), { fontFamily: 'Lilita One, Arial Black', fontSize: '30px', color: on ? '#2b1d2e' : '#fff0cf' }).setOrigin(0.5);
      if (t === 'events' && !this.meta.hardUnlocked && this.currentLevel() < 3) lb.setAlpha(0.5);
      const z = this.add.zone(x, y, 210, 96).setInteractive({ useHandCursor: true });
      z.on('pointerup', () => {
        if (t !== active) {
          sfx.click();
          this.openTitle(t);
        }
      });
      c.add([lb, z]);
    });
  }

  /** Chapter collection identity (r17): the medal portrait for chapters 1-6. */
  static CHAPTER_MONSTER = [0, 1, 3, 4, 5, 2];

  /** A chapter medal: the empty medal plate with the chapter's monster portrait and numeral composited in code. */
  medalIcon(x: number, y: number, size: number, chapter: number, earned: boolean): Phaser.GameObjects.Container {
    const c = this.add.container(x, y);
    if (this.hasArt('medal')) {
      const m = this.add.image(0, 0, 'medal');
      m.setScale(size / Math.max(m.width, m.height));
      if (!earned) m.setTint(0x777777).setAlpha(0.5);
      c.add(m);
    }
    const tk = `target_${GameScene.CHAPTER_MONSTER[(chapter - 1) % 6]}`;
    if (this.textures.exists(tk)) {
      const p = this.add.image(0, -size * 0.06, tk);
      p.setScale((size * 0.42) / Math.max(p.width, p.height));
      if (!earned) p.setTint(0x333333).setAlpha(0.4);
      c.add(p);
    }
    c.add(this.add.text(0, size * 0.3, String(chapter), { fontFamily: 'Lilita One, Arial Black', fontSize: `${Math.round(size * 0.18)}px`, color: '#3b2533' }).setOrigin(0.5));
    return c;
  }

  /** One-time lesson bubble over a home screen (r17): text, a pulsing ring on the target, GOT IT. */
  roadLessonDone: (() => void) | null = null;
  lesson(id: string, c: Phaser.GameObjects.Container, text: string, at: { x: number; y: number; r: number }, bubbleY: number, noButton = false) {
    const m = this.meta;
    if ((m.lessons ??= {})[id]) return;
    sfx.lessonPop();
    const ring = this.add.circle(at.x, at.y, at.r).setStrokeStyle(8, 0xffcf33, 1).setDepth(130);
    if (!REDUCED_MOTION) this.tweens.add({ targets: ring, scale: 1.12, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    const b = this.add.container(W / 2, bubbleY).setDepth(131);
    const lines = text.split('\n').length;
    const h = 70 + lines * 38;
    b.add(this.add.graphics().fillStyle(0x2b1d2e, 1).fillRoundedRect(-(W - 60) / 2, -h / 2, W - 60, h, 24).fillStyle(0xfbe7c6, 1).fillRoundedRect(-(W - 60) / 2 + 4, -h / 2 + 4, W - 68, h - 8, 21));
    b.add(this.add.text(-(W - 60) / 2 + 30, -h / 2 + 22, text, { fontFamily: 'Lilita One, Arial Black', fontSize: '28px', color: '#3b2533', lineSpacing: 6, wordWrap: { width: W - 280 } }));
    const ok = this.add.text((W - 60) / 2 - 30, h / 2 - 30, noButton ? '' : 'GOT IT', { fontFamily: 'Lilita One, Arial Black', fontSize: '26px', color: '#ffffff', backgroundColor: '#5fbf4a', padding: { x: 16, y: 8 } }).setOrigin(1, 1).setInteractive({ useHandCursor: true });
    b.add(ok);
    const done = () => {
      m.lessons![id] = true;
      store(META_KEY, JSON.stringify(m));
      tlog.log('lesson', { id });
      ring.destroy();
      b.destroy();
    };
    ok.on('pointerup', done);
    c.add([ring, b]);
    return done;
  }

  /** Highest unlocked level (levels are sequential; stars never gate). */
  currentLevel() {
    const st = this.meta.levelStars ?? {};
    let n = 1;
    while (st[String(n)] && n < LEVELS.length) n++;
    return n;
  }

  /** ROAD tab (ChatGPT r15): a scrolling path of numbered levels, HARD / MEGA HARD tags, little machines at work. */
  openRoadTab() {
    this.closeModal();
    const m = this.meta;
    const c = this.add.container(0, 0).setDepth(100);
    if (this.homeC?.active) this.homeC.destroy();
    this.homeC = c;
    this.modal = c;
    const bg = this.add.image(W / 2, 0, this.hasArt('road_bg') ? 'road_bg' : 'hero_bg').setOrigin(0.5, 0);
    bg.setScale(Math.max(W / bg.width, H / bg.height));
    c.add([bg, this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.001).setInteractive()]);
    const top = 128, bottom = H - 250; // road viewport (sticky PLAY + nav below)
    const cur = this.currentLevel();
    const SPACING = 170;
    const xs = [W / 2 - 190, W / 2, W / 2 + 190, W / 2];
    const nodeY = (n: number) => -(n - 1) * SPACING; // in road space, level 1 at 0, going up
    const road = this.add.container(0, 0);
    const g = this.add.graphics();
    road.add(g);
    for (let n = 1; n < LEVELS.length; n++) {
      const a = { x: xs[(n - 1) % 4], y: nodeY(n) }, b = { x: xs[n % 4], y: nodeY(n + 1) };
      // r16: a 12px cream connector with a thin plum outline; travelled stretches get a gold centre (curved, joins centres)
      const curve = new Phaser.Curves.QuadraticBezier(new Phaser.Math.Vector2(a.x, a.y), new Phaser.Math.Vector2((a.x + b.x) / 2 + (n % 2 ? 40 : -40), (a.y + b.y) / 2), new Phaser.Math.Vector2(b.x, b.y));
      const pts = curve.getPoints(16);
      g.lineStyle(30, 0x2b1d2e, 0.85).strokePoints(pts);
      g.lineStyle(22, 0xf3e3c8, 1).strokePoints(pts);
      if (n < cur) g.lineStyle(9, 0xffcf33, 1).strokePoints(pts);
    }
    const stars = m.levelStars ?? {};
    for (const def of LEVELS) {
      const n = def.level;
      const x = xs[(n - 1) % 4], y = nodeY(n);
      const done = !!stars[String(n)];
      const key = done ? 'node_completed' : n > cur ? 'node_locked' : def.boss_node ? 'node_boss' : def.difficulty === 'MEGA_HARD' ? 'node_mega_hard' : def.difficulty === 'HARD' ? 'node_hard' : 'node_normal';
      const size = def.boss_node ? 150 : def.difficulty === 'MEGA_HARD' ? 134 : def.difficulty === 'HARD' ? 126 : 116;
      const node = this.add.image(x, y, key);
      node.setScale(size / Math.max(node.width, node.height));
      road.add(node);
      const ny = y - node.displayHeight * (done ? 0.095 : 0.07);
      road.add(this.add.text(x, ny, String(n), { fontFamily: 'Lilita One, Arial Black', fontSize: n >= 10 ? '40px' : '46px', color: n > cur ? '#8a7a8a' : '#3b2533' }).setOrigin(0.5));
      if (done)
        for (let k = 0; k < 3; k++) {
          const st = this.add.image(x + (k - 1) * 30, y + node.displayHeight * 0.25 + (k === 1 ? 4 : 0), 'star');
          st.setScale(30 / Math.max(st.width, st.height)).setAlpha(k < stars[String(n)] ? 1 : 0.25);
          road.add(st);
        }
      if ((def.difficulty !== 'NORMAL' || n % 10 === 0 || def.mini_boss) && n >= cur) {
        const side = x > W / 2 ? -1 : 1;
        const isB = n % 10 === 0 || !!def.mini_boss;
        const tag = this.add.text(x + side * (size / 2 + 12), y, def.mini_boss ? 'MINI-BOSS' : isB ? 'BOSS' : def.difficulty === 'HARD' ? 'HARD' : 'MEGA HARD', { fontFamily: 'Lilita One, Arial Black', fontSize: '22px', color: '#ffffff', backgroundColor: isB ? '#2b1d2e' : def.difficulty === 'HARD' ? '#e8452c' : '#8e58c9', padding: { x: 10, y: 4 } }).setOrigin(side > 0 ? 0 : 1, 0.5);
        road.add(tag);
      }
      if (n === cur) {
        const ring = this.add.circle(x, y, size * 0.6, 0xffcf33, 0.2).setStrokeStyle(5, 0xffcf33, 0.9);
        road.add(ring);
        if (!REDUCED_MOTION) this.tweens.add({ targets: ring, scale: 1.12, alpha: 0.4, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
      }
      const hit = this.add.zone(x, y, size + 20, size + 20).setInteractive({ useHandCursor: true });
      hit.on('pointerup', () => {
        if (Math.abs(dragDist) > 12) return;
        if (n > cur) return this.showToast(`FINISH LEVEL ${cur} FIRST`);
        this.roadLessonDone?.();
        this.roadLessonDone = null;
        sfx.nodeTap();
        this.openLevelSheet(n);
      });
      road.add(hit);
    }
    // two little machines at work beside the road (one restrained fidget every 3-5 s)
    const workers: string[] = []; // r21: no floating decorations on the road for the playtest
    workers.slice(0, 3).forEach((k, i) => {
      const n = Math.max(1, cur - 1 + i * 2);
      const wx = xs[(n - 1) % 4] > W / 2 ? 80 : W - 80;
      const w = this.add.image(wx, nodeY(n) - 60, k);
      w.setScale(84 / Math.max(w.width, w.height));
      road.add(w);
      if (!REDUCED_MOTION) this.tweens.add({ targets: w, angle: { from: -4, to: 4 }, y: w.y - 6, duration: 420, yoyo: true, repeat: -1, repeatDelay: 2600 + i * 900, ease: 'Sine.InOut' });
    });
    // scrolling: road space -> screen; centre the current level
    const minScroll = bottom - 90, maxScroll = top + 90 + (LEVELS.length - 1) * SPACING;
    let scrollY = Phaser.Math.Clamp((top + bottom) / 2 + (cur - 1) * SPACING, minScroll, maxScroll);
    road.setY(scrollY);
    const mask = this.add.graphics().setVisible(false).fillRect(0, top, W, bottom - top);
    road.setMask(mask.createGeometryMask());
    c.add(road);
    let dragStart = 0, startScroll = 0, dragDist = 0;
    const area = this.add.zone(W / 2, (top + bottom) / 2, W, bottom - top).setInteractive();
    c.addAt(area, 2);
    area.on('pointerdown', (p: Phaser.Input.Pointer) => {
      dragStart = p.worldY;
      startScroll = scrollY;
      dragDist = 0;
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!p.isDown || this.homeC !== c || !c.active) return;
      if (p.worldY < top - 40 || p.worldY > bottom + 40) return;
      dragDist = p.worldY - dragStart;
      scrollY = Phaser.Math.Clamp(startScroll + dragDist, minScroll, maxScroll);
      road.setY(scrollY);
    });
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (this.homeC !== c || !c.active) return;
      dragStart = p.worldY;
      startScroll = scrollY;
      dragDist = 0;
    });
    this.drawWallet(c);
    // chapter strip (r17): progress toward the chapter chest; tap previews the reward
    const chapter = Math.ceil(cur / 10);
    const doneInCh = Math.min(10, LEVELS.slice((chapter - 1) * 10, chapter * 10).filter((d) => stars[String(d.level)]).length);
    const strip = this.add.container(W / 2, 140).setVisible(cur > 3);
    strip.add(this.add.graphics().fillStyle(0x2b1d2e, 0.85).fillRoundedRect(-(W - 60) / 2, -30, W - 60, 60, 20));
    strip.add(this.add.text(-(W - 60) / 2 + 24, 0, `CHAPTER ${chapter}  \u00b7  ${doneInCh} of 10 cleared`, { fontFamily: 'Lilita One, Arial Black', fontSize: '26px', color: '#fff0cf' }).setOrigin(0, 0.5));
    if (this.hasArt('chest_closed')) {
      const ch = this.add.image((W - 60) / 2 - 40, -4, 'chest_closed');
      ch.setScale(64 / Math.max(ch.width, ch.height));
      strip.add(ch);
    }
    strip.setSize(W - 60, 60).setInteractive({ useHandCursor: true });
    strip.on('pointerup', () => this.showToast(`CLEAR LEVEL ${chapter * 10} FOR THE CHAPTER ${chapter} MEDAL`));
    c.add(strip);
    const def = LEVELS[cur - 1];
    const tag = cur % 10 === 0 ? '  ·  BOSS' : def.difficulty === 'NORMAL' ? '' : def.difficulty === 'HARD' ? '  ·  HARD' : '  ·  MEGA HARD';
    const play = this.button(c, W / 2, H - 182, 620, `PLAY  LEVEL ${cur}${tag}`, 0x5fbf4a, () => this.openLevelSheet(cur), 1.0);
    if (!REDUCED_MOTION) this.tweens.add({ targets: play, scale: 1.04, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    this.drawNav(c, 'road');
    // r17 lesson 1: first road visit
    const curY = scrollY + nodeY(cur);
    if (!(m.lessons ?? {}).road && cur <= 3) {
      const done = this.lesson('road', c, `Tap Level ${cur} to play.`, { x: xs[(cur - 1) % 4], y: curY, r: 80 }, Math.max(top + 70, curY - 150), true);
      this.roadLessonDone = done ?? null;
    }
    c.setAlpha(0);
    this.tweens.add({ targets: c, alpha: 1, duration: 180, ease: 'Cubic.Out' });
  }

  /** EVENTS tab: Daily (level 3), Challenge (level 5), Remix (level 10), plus the classic 3-monster run. */
  openEventsTab() {
    this.closeModal();
    const m = this.meta;
    const c = this.add.container(0, 0).setDepth(100);
    if (this.homeC?.active) this.homeC.destroy();
    this.homeC = c;
    this.modal = c;
    const bg = this.add.image(W / 2, 0, this.hasArt('road_bg') ? 'road_bg' : 'hero_bg').setOrigin(0.5, 0);
    bg.setScale(Math.max(W / bg.width, H / bg.height));
    c.add([bg, this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.001).setInteractive()]);
    this.drawWallet(c);
    c.add(this.add.text(W / 2, 170, 'EVENTS', { fontFamily: 'Lilita One, Arial Black', fontSize: '56px', color: '#3b2533', stroke: '#fff0cf', strokeThickness: 4 }).setOrigin(0.5));
    const lv = this.currentLevel() - 1; // levels cleared
    const today = m.daily?.[localDate()];
    const paid = !!m.dailyPaid?.[localDate()];
    const card = (y: number, h: number, title: string, lines: string[], col: number, open: boolean, need: number, cb: () => void, extra?: [string, () => void]) => {
      const cc = this.add.container(W / 2, y);
      if (this.hasArt('ui_card')) cc.add(this.add.image(0, 0, 'ui_card').setDisplaySize(W - 50, h));
      else cc.add(this.add.graphics().fillStyle(0xfbe7c6, 1).fillRoundedRect(-(W - 50) / 2, -h / 2, W - 50, h, 26));
      cc.add(this.add.text(-(W - 50) / 2 + 44, -h / 2 + 40, title, { fontFamily: 'Lilita One, Arial Black', fontSize: '38px', color: '#3b2533' }).setOrigin(0, 0.5));
      cc.add(this.add.text(-(W - 50) / 2 + 44, -h / 2 + 72, open ? lines.join('\n') : `Unlocks after level ${need}`, { fontFamily: 'Arial', fontStyle: 'bold', fontSize: '22px', color: '#5a4a5a', lineSpacing: 6, wordWrap: { width: W - 330 } }));
      const b = this.button(cc, (W - 50) / 2 - 130, h / 2 - 56, 200, open ? 'PLAY' : 'LOCKED', col, open ? cb : () => this.showToast(`UNLOCKS AT LEVEL ${need}`), 0.72);
      if (!open) b.setAlpha(0.5);
      if (extra && open) {
        const t = this.add.text(-(W - 50) / 2 + 44, h / 2 - 50, extra[0], { fontFamily: 'Lilita One, Arial Black', fontSize: '24px', color: '#b06a1a' }).setOrigin(0, 0.5).setInteractive({ useHandCursor: true });
        t.on('pointerup', extra[1]);
        cc.add(t);
      }
      c.add(cc);
    };
    const now = new Date();
    const hrs = 23 - now.getHours();
    const mins = 59 - now.getMinutes();
    const dailyOpen = m.playtestMode ? lv >= 10 : lv >= 3 || m.hardUnlocked;
    card(370, 262, today ? 'DAILY BENCH ✓' : 'DAILY BENCH', [paid ? 'Bonus collected for today' : "Today's bonus: +8 Bolts +1 Kit", `New bench in ${hrs}h ${mins}m${today ? `  ·  best ${today.targets === 3 ? `${today.time}s` : `${today.targets}/3`}` : ''}`], 0x5fbf4a, dailyOpen, m.playtestMode ? 10 : 3, () => this.startDaily());
    if (m.playtestMode) {
      this.drawNav(c, 'events');
      return;
    }
    card(640, 240, 'CHALLENGE', ['3 monsters, one 135s clock, tougher.', 'No boosters. Pure skill.'], 0xe8452c, lv >= 5 || m.hardUnlocked, 5, () => this.retry(true, -1), ['Classic run ›', () => this.retry(false, -1)]);
    card(900, 240, 'REMIX', ['One big junk monster with a', 'board-attacking trick.'], 0x27a4c0, lv >= 10 || m.hardUnlocked, 10, () => this.openRemixPicker());
    this.drawNav(c, 'events');
  }

  /** Five-point star outline / fill (unearned stars are outlines, never washed-out gold). */
  starShape(g: Phaser.GameObjects.Graphics, x: number, y: number, r: number, filled: boolean) {
    const pts: Phaser.Math.Vector2[] = [];
    for (let k = 0; k < 10; k++) {
      const a = -Math.PI / 2 + (k * Math.PI) / 5;
      const rr = k % 2 ? r * 0.45 : r;
      pts.push(new Phaser.Math.Vector2(x + Math.cos(a) * rr, y + Math.sin(a) * rr));
    }
    if (filled) g.fillStyle(0xffcf33, 1).fillPoints(pts, true);
    g.lineStyle(5, 0x2b1d2e, 1).strokePoints(pts, true);
  }

  /** Level card (ChatGPT r15/r16): monster, ONE modifier sentence, star goals, Jumpstart switch, PLAY. */
  openLevelSheet(n: number) {
    sfx.cardOpen();
    const def = LEVELS[n - 1];
    if (!def) return;
    const m = this.meta;
    const hasJump = n >= BOOSTER_UNLOCK.jumpstart_kit && ((m.kits ?? 0) > 0 || Object.keys(m.grants ?? {}).some((k) => k.startsWith('kit')) || !!m.hardUnlocked);
    const miniDef = def.mini_boss ? BOSSES.find((x) => x.id === def.mini_boss) : undefined;
    const isBoss = (n % 10 === 0 && n > 0) || !!miniDef;
    const PH = (hasJump ? 860 : 760) + (isBoss ? 110 : 0); // boss cards carry the attack diagram
    const c = this.sheet(PH);
    const top = H / 2 - PH / 2;
    const diff = miniDef ? 'MINI-BOSS' : isBoss ? 'BOSS' : def.difficulty === 'NORMAL' ? '' : def.difficulty === 'HARD' ? 'HARD' : 'MEGA HARD';
    c.add(this.add.text(W / 2, top + 64, `LEVEL ${n}`, { fontFamily: 'Lilita One, Arial Black', fontSize: '52px', color: '#3b2533' }).setOrigin(0.5));
    if (diff) c.add(this.add.text(W / 2, top + 112, diff, { fontFamily: 'Lilita One, Arial Black', fontSize: '24px', color: '#ffffff', backgroundColor: isBoss ? '#2b1d2e' : def.difficulty === 'HARD' ? '#e8452c' : '#8e58c9', padding: { x: 12, y: 4 } }).setOrigin(0.5));
    const ti = MONSTER_INDEX[def.monster] ?? 0;
    const bossDef = miniDef ?? (isBoss ? BOSSES[(n / 10 - 1) % BOSSES.length] : null);
    const tk = bossDef && this.hasArt(`boss_${bossDef.id}_intact`) ? `boss_${bossDef.id}_intact` : `target_${ti}`;
    if (this.textures.exists(tk)) {
      const im = this.add.image(W / 2, top + 250, tk);
      im.setScale(180 / Math.max(im.width, im.height));
      c.add(im);
    }
    c.add(this.add.text(W / 2, top + 362, `${bossDef ? bossDef.name : TARGET_NAMES[ti]}  ·  ${bossDef && !miniDef ? 90 : def.time_seconds}s`, { fontFamily: 'Lilita One, Arial Black', fontSize: '32px', color: '#3b2533' }).setOrigin(0.5));
    let y = top + 400;
    const firstOf: Record<string, number> = { rocket: 6, magnet: 12, battery: 17, fan: 23 };
    const newFam = n === 6 ? 'rocket' : (def.start_extra ?? []).map(([f]) => f).find((f) => firstOf[f] === n);
    const parts = bossDef
      ? [bossDef.copy, bossDef.second ? `Final phase: also ${ATTACK_COPY[bossDef.second].what.toLowerCase()}!` : '']
      : [def.goal ? `GOAL: ${goalText(def.goal)}` : '', def.behaviour ? BEHAVIOUR_TEXT[def.behaviour] : MODIFIER_TEXT[def.modifier], newFam ? `NEW: ${FAMILY_INFO[newFam as 'rocket'].name.toUpperCase()}. ${FAMILY_INFO[newFam as 'rocket'].text}` : ''];
    const mt = parts.filter(Boolean).join('\n');
    if (mt) {
      const t = this.add.text(W / 2, y, mt, { fontFamily: 'Arial', fontStyle: 'bold', fontSize: bossDef ? '26px' : '22px', color: bossDef ? '#4a2a5a' : '#8e58c9', align: 'center', wordWrap: { width: W - 180 } }).setOrigin(0.5, 0);
      c.add(t);
      y += t.height + 10;
    }
    if (bossDef) {
      // r22: tiny board diagram of the attack's shape, drawn in the same warning language as the fight
      const dg = this.bossDiagram(bossDef.attack);
      dg.setPosition(W / 2 + 30, y + 44);
      c.add(dg);
      const ik = ATTACK_ICON[bossDef.attack];
      if (this.hasArt(ik)) {
        const ic = this.add.image(W / 2 - 150, y + 44, ik);
        ic.setScale(64 / Math.max(ic.width, ic.height));
        c.add(ic);
      }
      y += 96;
    }
    // star goals: outlines until earned, with the goal under each
    const have = (m.levelStars ?? {})[String(n)] ?? 0;
    const sg = this.add.graphics();
    const [g2, g3] = starGoals(def);
    const goals = ['Clear', `≤${g2}s`, `≤${g3}s`];
    for (let k = 0; k < 3; k++) {
      const sx = W / 2 + (k - 1) * 110;
      this.starShape(sg, sx, y + 40, 30, k < have);
      c.add(this.add.text(sx, y + 92, goals[k], { fontFamily: 'Lilita One, Arial Black', fontSize: '22px', color: '#7a5a4a' }).setOrigin(0.5));
    }
    c.add(sg);
    y += 130;
    // Jumpstart Kit: explicit switch, OFF by default every attempt
    let jump = false;
    if (hasJump) {
      const kits = m.kits ?? 0;
      const row = this.add.container(W / 2, y + 40);
      row.add(this.add.graphics().fillStyle(0xffffff, 1).fillRoundedRect(-300, -50, 600, 100, 22).lineStyle(4, 0x2b1d2e, 1).strokeRoundedRect(-300, -50, 600, 100, 22));
      if (this.hasArt('booster_jumpstart')) {
        const ic = this.add.image(-250, -4, 'booster_jumpstart');
        ic.setScale(66 / Math.max(ic.width, ic.height));
        row.add(ic);
      }
      row.add(this.add.text(-250, 34, `x${kits}`, { fontFamily: 'Lilita One, Arial Black', fontSize: '20px', color: '#3b2533' }).setOrigin(0.5));
      row.add(this.add.text(-200, -18, 'Jumpstart Kit', { fontFamily: 'Lilita One, Arial Black', fontSize: '28px', color: '#3b2533' }).setOrigin(0, 0.5));
      row.add(this.add.text(-200, 18, `Starting shooters: rank ${def.starting_rank} → ${Math.min(MAX_RANK, def.starting_rank + 1)}`, { fontFamily: 'Arial', fontStyle: 'bold', fontSize: '20px', color: '#5a4a5a' }).setOrigin(0, 0.5));
      const sw = this.add.graphics();
      const drawSw = () => sw.clear().fillStyle(jump ? 0x5fbf4a : 0xb8a898, 1).fillRoundedRect(170, -28, 100, 56, 28).fillStyle(0xffffff, 1).fillCircle(jump ? 242 : 198, 0, 22);
      drawSw();
      row.add(sw);
      const z = this.add.zone(220, 0, 120, 96).setInteractive({ useHandCursor: true });
      z.on('pointerup', () => {
        if (kits <= 0) return this.showToast('GET KITS FROM LEVELS OR THE SHOP (TAP THE TOP BAR)');
        jump = !jump;
        sfx.click();
        drawSw();
      });
      row.add(z);
      c.add(row);
      y += 110;
    }
    this.button(c, W / 2, top + PH - 90, 460, 'PLAY', 0x5fbf4a, () => this.startLevel(n, jump), 1.05);
    // r17: optional high-rank introduction before L21 (rank 7) and L41 (rank 8, if never made)
    const madeTop = Math.max(0, ...Object.values(m.mastery ?? {}).map((x) => x ?? 0));
    const sc = n === 21 && !(m.lessons ?? {}).showcase7 ? 7 : n === 41 && madeTop < 8 && !(m.lessons ?? {}).showcase8 ? 8 : 0;
    if (sc) {
      const t = this.add.text(W / 2, top + PH - 170, `NEW: RANK ${sc}  ·  try it first ›`, { fontFamily: 'Lilita One, Arial Black', fontSize: '26px', color: '#ffffff', backgroundColor: '#8e58c9', padding: { x: 16, y: 8 } }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      t.on('pointerup', () => this.startShowcase(sc as 7 | 8, n));
      c.add(t);
    }
    // r17 lessons 2 + 3 (one at a time, never over a live clock)
    if (n % 10 !== 0 && !(m.lessons ?? {}).card) this.lesson('card', c, 'Clear to earn a star.\nFaster wins earn two more.', { x: W / 2, y: top + 470, r: 130 }, top + PH - 250);
    else if (!isBoss && n >= BOOSTER_UNLOCK.time_capsule && hasJump) this.lesson('boosters', c, 'Kits improve your starting pair.\nHold a Capsule for +15s.\nBoth are optional.', { x: W / 2 + 220, y: top + PH - 250, r: 70 }, top + 200);
    const close = this.add.text(W - 70, top + 44, '✕', { fontFamily: 'Arial', fontSize: '40px', color: '#3b2533' }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    close.on('pointerup', () => this.openTitle());
    c.add(close);
  }

  /** Optional high-rank showcase (r17): untimed, no supply / passive shots / boosters / rewards; one coached merge
   *  of two rank (R-1) shooters into rank R using the real resolver, then back to the real level card. */
  startShowcase(rank: 7 | 8, then: number) {
    const def = LEVELS[then - 1];
    const s = newLevel(def, { shooter: this.teamShooter() });
    s.showcase = true;
    s.grid.fill(null);
    const mk = (f: Family, r: number) => ({ id: s.nextId++, family: f, rank: r, cd: 1e9 });
    const sh = this.teamShooter();
    s.grid[21] = mk(sh, rank - 1);
    s.grid[22] = mk(sh, rank - 1);
    s.grid[17] = mk('coil', 3);
    s.grid[16] = mk('bell', 3);
    s.grid[23] = mk(sh, 3);
    s.supplyTimer = 1e9;
    s.timeLeft = 999;
    s.hp = s.maxHp = 999999;
    s.remix = null;
    s.masked = [];
    (this.meta.lessons ??= {})[`showcase${rank}`] = true;
    store(META_KEY, JSON.stringify(this.meta));
    tlog.log('showcase_start', { rank });
    this.startState(s);
    this.finishIntro(true);
    this.time.delayedCall(300, () => {
      this.coach.say(`Two rank ${rank - 1} ${FAMILY_INFO[sh as keyof typeof FAMILY_INFO].name}s.
Merge them into a RANK ${rank}!`, this.coachY());
      this.coach.drag(cellXY(21), cellXY(22));
    });
    this.showcaseThen = then;
  }
  showcaseThen = 0;

  startLevel(n: number, jumpstart = false) {
    const def = LEVELS[n - 1];
    if (!def) return;
    const m = this.meta;
    if (jumpstart && (m.kits ?? 0) > 0) {
      m.kits = (m.kits ?? 0) - 1;
      tlog.log('booster', { kind: 'jumpstart', level: n, left: m.kits });
      sfx.kit();
    } else jumpstart = false;
    m.tutorialDone = true;
    store(META_KEY, JSON.stringify(m));
    tlog.log('level_start', { level: n, jumpstart });
    this.startState(newLevel(def, { toys: this.activeToys(), shooter: this.teamShooter(), jumpstart }));
  }

  homeC: Phaser.GameObjects.Container | null = null;
  /** A sheet over the home: replaces any other sheet, keeps the home underneath. */
  sheet(h: number) {
    if (this.modal && this.modal !== this.homeC) {
      const old = this.modal;
      this.modal = null;
      old.destroy();
    }
    return this.panel(h);
  }

  /** Chassis finish: tints the chassis only, never the family modules. */
  applyFinish(mach: Phaser.GameObjects.Container) {
    const it = CATALOG.find((x) => x.id === this.meta.finish);
    setFinish(mach, it?.id ?? null, it?.tint);
    setOrnament(this, mach, this.meta.ornament ?? null);
  }

  showToast(text: string) {
    const t = this.add.text(W / 2, H / 2, text, { fontFamily: 'Lilita One, Arial Black', fontSize: '30px', color: '#fff0cf', backgroundColor: '#2b1d2e', padding: { x: 24, y: 14 }, align: 'center' }).setOrigin(0.5).setDepth(130);
    this.tweens.add({ targets: t, alpha: 0, y: H / 2 - 40, delay: 1100, duration: 300, onComplete: () => t.destroy() });
  }

  sheetTitle(c: Phaser.GameObjects.Container, top: number, title: string, sub?: string) {
    c.add(this.add.text(W / 2, top + 64, title, { fontFamily: 'Lilita One, Arial Black', fontSize: '50px', color: '#3b2533' }).setOrigin(0.5));
    if (sub) c.add(this.add.text(W / 2, top + 112, sub, { fontFamily: 'Arial', fontStyle: 'bold', fontSize: '22px', color: '#7a5a4a', align: 'center', wordWrap: { width: W - 160 } }).setOrigin(0.5, 0));
  }

  /** Resources sheet = shop: Bolts (core) explained; Jumpstart Kits + Time Capsules (dynamic) bought with Bolts.
   *  Guard: stock capped at 5 each, buying is one item per tap, and boosters never enter Daily/Challenge/Remix. */
  openWalletInfo() {
    sfx.click();
    const m = this.meta;
    const PH = 900;
    const c = this.sheet(PH);
    const top = H / 2 - PH / 2;
    this.sheetTitle(c, top, `${m.bolts ?? 0} BOLTS`, 'Earned from levels, new stars and the Daily');
    const lv = this.currentLevel();
    const items: [string, string, string, number, number, 'kits' | 'capsules', string][] = [
      ['booster_jumpstart', 'JUMPSTART KIT', 'Start a level with your 2 bottom\nshooters one rank higher.', PRICES.jumpstart_kit, BOOSTER_UNLOCK.jumpstart_kit, 'kits', 'Pick it on the level card'],
      ['booster_time_capsule', 'TIME CAPSULE', '+15 seconds, once per level,\nwhile the clock is running.', PRICES.time_capsule, BOOSTER_UNLOCK.time_capsule, 'capsules', 'Tap +15s under the clock'],
    ];
    const CAPS = { kits: 3, capsules: 2 } as const;
    items.forEach(([icon, name, desc, price, unlock, field, how], i) => {
      const y = top + 320 + i * 230;
      c.add(this.add.graphics().fillStyle(0xffffff, 1).fillRoundedRect(50, y - 95, W - 100, 190, 24).lineStyle(4, 0x2b1d2e, 1).strokeRoundedRect(50, y - 95, W - 100, 190, 24));
      if (this.hasArt(icon)) {
        const ic = this.add.image(120, y - 10, icon);
        ic.setScale(100 / Math.max(ic.width, ic.height));
        c.add(ic);
      }
      const have = m[field] ?? 0;
      c.add(this.add.text(190, y - 62, `${name}   x${have}`, { fontFamily: 'Lilita One, Arial Black', fontSize: '30px', color: '#3b2533' }));
      c.add(this.add.text(190, y - 20, desc, { fontFamily: 'Arial', fontStyle: 'bold', fontSize: '20px', color: '#5a4a5a' }));
      c.add(this.add.text(190, y + 40, how, { fontFamily: 'Arial', fontStyle: 'italic', fontSize: '18px', color: '#9a7a5a' }));
      const locked = lv < unlock;
      const CAP = CAPS[field];
      const full = have >= CAP;
      const label = locked ? `LEVEL ${unlock}` : full ? 'FULL' : `${price}`;
      const b = this.button(c, W - 150, y + 52, 170, label, 0x5fbf4a, () => {
        if (locked) return this.showToast(`UNLOCKS AT LEVEL ${unlock}`);
        if (full) return this.showToast(`YOU CAN HOLD ${CAP}`);
        if ((m.bolts ?? 0) < price) return this.showToast(`NEED ${price - (m.bolts ?? 0)} MORE BOLTS`);
        m.bolts = (m.bolts ?? 0) - price;
        m[field] = have + 1;
        store(META_KEY, JSON.stringify(m));
        tlog.log('booster_buy', { item: field, price, balance: m.bolts, stock: m[field] });
        sfx.rankUp(4);
        this.openWalletInfo();
      }, 0.62);
      if (locked || full || (m.bolts ?? 0) < price) b.setAlpha(0.55);
    });
    this.button(c, W / 2, top + 820, 300, 'CLOSE', 0x27a4c0, () => this.openTitle(), 0.8);
  }


  openSettings() {
    sfx.click();
    const c = this.sheet(800);
    const top = H / 2 - 400;
    this.sheetTitle(c, top, 'SETTINGS');
    const m = this.meta;
    const toggles: [string, () => boolean, () => void][] = [
      ['SOUND', () => m.sound, () => ((m.sound = !m.sound), (audioSettings.on = m.sound))],
      ['MUSIC', () => m.music, () => ((m.music = !m.music), (audioSettings.music = m.music))],
      ['SHAKE', () => m.shake !== false, () => (m.shake = m.shake === false)],
      ['SWAP ON DROP', () => !!m.swapMismatch, () => (m.swapMismatch = !m.swapMismatch)],
    ];
    toggles.forEach(([label, get, flip], i) => {
      const b = this.button(c, W / 2, top + 180 + i * 110, 420, `${label}: ${get() ? 'ON' : 'OFF'}`, 0x27a4c0, () => {
        flip();
        store(META_KEY, JSON.stringify(m));
        (b.list[1] as Phaser.GameObjects.Text).setText(`${label}: ${get() ? 'ON' : 'OFF'}`);
      });
    });
    const pd = this.add.text(W / 2, top + 580, 'Playtest stats', { fontFamily: 'Lilita One, Arial Black', fontSize: '28px', color: '#b06a1a' }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    pd.on('pointerup', () => this.openPlaytestStats());
    c.add(pd);
    const rt = this.add.text(W / 2, top + 640, 'Replay tutorial', { fontFamily: 'Lilita One, Arial Black', fontSize: '28px', color: '#b06a1a' }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    rt.on('pointerup', () => this.startTutorial());
    c.add(rt);
    // r24 QA: wipe everything and start as a brand-new player (second tap within 3 s confirms)
    let armed = 0;
    const wipe = this.add.text(W / 2, top + 690, 'Start over (wipe progress)', { fontFamily: 'Lilita One, Arial Black', fontSize: '26px', color: '#d8261a' }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    wipe.on('pointerup', () => {
      if (this.time.now - armed > 3000) {
        armed = this.time.now;
        sfx.invalid();
        wipe.setText('Tap again to wipe EVERYTHING');
        this.time.delayedCall(3000, () => wipe.active && this.time.now - armed >= 2900 && wipe.setText('Start over (wipe progress)'));
        return;
      }
      tlog.log('start_over');
      store(SAVE_KEY, null);
      store(META_KEY, null);
      location.reload();
    });
    c.add(wipe);
    this.button(c, W / 2, top + 760, 300, 'BACK', 0x8a6a4a, () => this.openTitle(), 0.85);
  }

  /** r28: every monster, mini-boss and boss with the first level you meet it (built from levels.json). */
  bookEntries(): { id: string; tab: number; key: string; name: string; level: number; beaten: boolean }[] {
    const stars = this.meta.levelStars ?? {};
    const cleared = (n: number) => (stars[String(n)] ?? 0) > 0;
    const out: { id: string; tab: number; key: string; name: string; level: number; beaten: boolean }[] = [];
    const seen = new Set<string>();
    for (const d of LEVELS) {
      const n = d.level;
      const mini = d.mini_boss ? BOSSES.find((x) => x.id === d.mini_boss) : undefined;
      const boss = !mini && n % 10 === 0 ? BOSSES[n / 10 - 1] : undefined;
      const b = mini ?? boss;
      const key = b ? `boss_${b.id}` : `mon_${d.monster}`;
      const beatenHere = cleared(n);
      if (seen.has(key)) {
        const prev = out.find((e) => e.id === key);
        if (beatenHere && prev) prev.beaten = true;
        continue;
      }
      seen.add(key);
      const ti = MONSTER_INDEX[d.monster] ?? 0;
      out.push({ id: key, tab: mini ? 1 : boss ? 2 : 0, key: b ? `boss_${b.id}_intact` : `target_${ti}`, name: b ? b.name : TARGET_NAMES[ti], level: n, beaten: beatenHere });
    }
    return out;
  }

  openMonsterBook(tab: number, page: number) {
    this.closeModal();
    const c = this.panel(1060);
    const top = H / 2 - 530;
    c.add(this.add.text(W / 2, top + 58, 'MONSTER BOOK', { fontFamily: 'Lilita One, Arial Black', fontSize: '50px', color: '#3b2533' }).setOrigin(0.5));
    const all = this.bookEntries();
    const tabs = ['MONSTERS', 'MINI-BOSSES', 'BOSSES'];
    tabs.forEach((t, i) => {
      const n = all.filter((e) => e.tab === i);
      const got = n.filter((e) => e.beaten).length;
      const x = W / 2 + (i - 1) * 205;
      const on = i === tab;
      const b = this.add.text(x, top + 130, `${t}\n${got}/${n.length}`, { fontFamily: 'Lilita One, Arial Black', fontSize: '22px', color: on ? '#ffffff' : '#5a3a3a', backgroundColor: on ? '#8e58c9' : '#ead2b0', align: 'center', padding: { x: 14, y: 6 }, fixedWidth: 190 }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      b.on('pointerup', () => (sfx.click(), this.openMonsterBook(i, 0)));
      c.add(b);
    });
    const list = all.filter((e) => e.tab === tab);
    const pages = Math.max(1, Math.ceil(list.length / 6));
    page = Math.min(page, pages - 1);
    list.slice(page * 6, page * 6 + 6).forEach((e, k) => {
      const x = W / 2 + ((k % 3) - 1) * 200, y = top + 330 + Math.floor(k / 3) * 300;
      const met = e.level <= this.currentLevel();
      c.add(this.add.graphics().fillStyle(0xead2b0, 1).fillRoundedRect(x - 92, y - 120, 184, 270, 22));
      if (this.hasArt(e.key)) {
        const im = this.add.image(x, y - 10, e.key);
        im.setScale(Math.min(160 / im.width, 170 / im.height));
        if (!e.beaten) im.setTint(0x2b1d2e).setAlpha(met ? 0.85 : 0.55);
        c.add(im);
      }
      if (!e.beaten) c.add(this.add.text(x, y - 10, '?', { fontFamily: 'Lilita One, Arial Black', fontSize: '64px', color: '#fff0cf' }).setOrigin(0.5));
      c.add(this.add.text(x, y + 116, e.beaten || met ? e.name : '???', { fontFamily: 'Lilita One, Arial Black', fontSize: '21px', color: '#3b2533', align: 'center', wordWrap: { width: 176 }, lineSpacing: -4 }).setOrigin(0.5, 1));
      c.add(this.add.text(x, y + 130, e.beaten ? `beaten  \u00b7  L${e.level}` : `level ${e.level}`, { fontFamily: 'Arial', fontStyle: 'bold', fontSize: '18px', color: e.beaten ? '#2a8a3a' : '#7a5a4a' }).setOrigin(0.5));
    });
    if (pages > 1) {
      c.add(this.add.text(W / 2, top + 935, `${page + 1} / ${pages}`, { fontFamily: 'Lilita One, Arial Black', fontSize: '26px', color: '#7a5a4a' }).setOrigin(0.5));
      if (page > 0) this.button(c, W / 2 - 210, top + 935, 150, '\u2039', 0x8a6a4a, () => this.openMonsterBook(tab, page - 1), 0.7);
      if (page < pages - 1) this.button(c, W / 2 + 210, top + 935, 150, '\u203a', 0x5fbf4a, () => this.openMonsterBook(tab, page + 1), 0.7);
    }
    this.button(c, W / 2, top + 1010, 300, 'CLOSE', 0x8a6a4a, () => this.openTitle('machine'), 0.8);
    tlog.log('book', { tab });
  }

  teamShooter(): Family {
    return this.meta.shooter === 'rocket' && this.meta.hardUnlocked ? 'rocket' : 'cannon';
  }

  /** BUILD YOUR TEAM (ChatGPT r14): Shooter (Cannon/Rocket) + Coil + Bell (fixed relays) + optional Helper. */
  openTeamSheet() {
    sfx.click();
    const m = this.meta;
    const PH = 900;
    const c = this.sheet(PH);
    const top = H / 2 - PH / 2;
    this.sheetTitle(c, top, 'BUILD YOUR TEAM', 'Changes apply to your next run');
    const helper = this.activeToys()[0] ?? null;
    const slots: { label: string; fam: Family | null; role: string; note: string; tap: () => void }[] = [
      { label: 'SHOOTER', fam: this.teamShooter(), role: 'shooter', note: m.hardUnlocked ? 'tap to switch' : 'Rocket: win a run', tap: () => {
        if (!m.hardUnlocked) return this.showToast('ROCKET UNLOCKS AFTER YOUR FIRST WIN');
        m.shooter = this.teamShooter() === 'rocket' ? 'cannon' : 'rocket';
        store(META_KEY, JSON.stringify(m));
        tlog.log('team', { shooter: m.shooter });
        this.openTeamSheet();
      } },
      { label: 'RELAY', fam: 'coil', role: 'relay', note: 'always in', tap: () => this.showToast('COIL: WAKES OTHERS IN A 2-CELL CROSS') },
      { label: 'RELAY', fam: 'bell', role: 'relay', note: 'always in', tap: () => this.showToast('BELL: WAKES OTHERS IN ITS ROW') },
      ...(m.playtestMode ? [] : []),
      { label: 'HELPER', fam: m.playtestMode ? null : helper, role: helper ? FAMILY_INFO[helper].role.toLowerCase() : 'support', note: Object.keys(m.toys).length ? 'tap to change' : 'unlock by playing', tap: () => (m.playtestMode ? this.showToast('HELPERS ARE OFF IN THIS PLAYTEST') : Object.keys(m.toys).length ? this.openHelperSheet() : this.showToast('HELPERS UNLOCK THROUGH CHALLENGES')) },
    ];
    slots.forEach((sl, i) => {
      const x = W / 2 + (i % 2 ? 150 : -150);
      const y = top + 270 + Math.floor(i / 2) * 230;
      const card = this.add.container(x, y);
      const plate = this.hasArt('ui_team_slot') ? this.add.image(0, 0, 'ui_team_slot').setDisplaySize(280, 210) : this.add.graphics().fillStyle(0xffffff, 1).fillRoundedRect(-140, -105, 280, 210, 22);
      card.add(plate);
      card.add(this.add.text(0, -78, sl.label, { fontFamily: 'Lilita One, Arial Black', fontSize: '22px', color: '#7a5a4a' }).setOrigin(0.5));
      if (sl.fam && this.textures.exists(`${sl.fam}_1`)) {
        const im = this.add.image(0, -8, `${sl.fam}_1`);
        im.setScale(96 / Math.max(im.width, im.height));
        card.add(im);
      } else card.add(this.add.text(0, -8, 'none', { fontFamily: 'Lilita One, Arial Black', fontSize: '28px', color: '#9a8a7a' }).setOrigin(0.5));
      if (this.hasArt(`role_${sl.role}`)) {
        const ri = this.add.image(-100, -78, `role_${sl.role}`);
        ri.setScale(34 / Math.max(ri.width, ri.height));
        card.add(ri);
      }
      card.add(this.add.text(0, 52, sl.fam ? FAMILY_INFO[sl.fam as keyof typeof FAMILY_INFO].name : 'No helper', { fontFamily: 'Lilita One, Arial Black', fontSize: '28px', color: '#3b2533' }).setOrigin(0.5));
      card.add(this.add.text(0, 86, sl.note, { fontFamily: 'Lilita One, Arial Black', fontSize: '19px', color: '#fff0cf' }).setOrigin(0.5));
      card.setSize(280, 210).setInteractive({ useHandCursor: true });
      card.on('pointerup', sl.tap);
      c.add(card);
    });
    const sh = FAMILY_INFO[this.teamShooter() as keyof typeof FAMILY_INFO];
    c.add(this.add.text(W / 2, top + 650, `${sh.name}: ${sh.text}`, { fontFamily: 'Arial', fontStyle: 'bold', fontSize: '21px', color: '#3b2533', align: 'center', wordWrap: { width: W - 160 } }).setOrigin(0.5));
    this.button(c, W / 2, top + 790, 380, 'USE TEAM', 0x5fbf4a, () => this.openTitle(), 0.9);
  }

  /** Local playtest dashboard (ChatGPT r17 D): the numbers that decide rhythm, booster use and rank payoff. */
  openPlaytestStats() {
    sfx.click();
    const ev = tlog.events();
    const ends = ev.filter((e) => e.e === 'level_end');
    const by: Record<string, { n: number; w: number }> = { NORMAL: { n: 0, w: 0 }, HARD: { n: 0, w: 0 }, MEGA_HARD: { n: 0, w: 0 } };
    for (const e of ends) {
      const d = LEVELS[Number(e.level) - 1]?.difficulty ?? 'NORMAL';
      by[d].n++;
      if (e.won) by[d].w++;
    }
    const pct = (x: { n: number; w: number }) => (x.n ? `${Math.round((100 * x.w) / x.n)}% (${x.w}/${x.n})` : '-');
    const cleared = new Set(ends.filter((e) => e.won).map((e) => e.level)).size;
    const attemptsPerClear = cleared ? (ends.length / cleared).toFixed(1) : '-';
    const bought = (k: string) => ev.filter((e) => e.e === 'booster_buy' && e.item === k).length;
    const used = (k: string) => ev.filter((e) => e.e === 'booster' && e.kind === k).length;
    const merges = ev.filter((e) => e.e === 'merge');
    const topRank = Math.max(0, ...merges.map((e) => Number(e.rank) || 0));
    const r78 = merges.filter((e) => Number(e.rank) >= 7).length;
    const starts = ev.filter((e) => e.e === 'level_start').length;
    const lines = [
      `Level win rate  Normal ${pct(by.NORMAL)}`,
      `Hard ${pct(by.HARD)}   Mega ${pct(by.MEGA_HARD)}`,
      `Attempts per clear  ${attemptsPerClear}   (levels started ${starts})`,
      `Kits  bought ${bought('kits')} / used ${used('jumpstart')} / held ${this.meta.kits ?? 0}`,
      `Capsules  bought ${bought('capsules')} / used ${used('time_capsule')} / held ${this.meta.capsules ?? 0}`,
      `Highest rank made  ${topRank}   (rank 7-8 merges: ${r78})`,
      `Merges logged  ${merges.length}   Bolts now ${this.meta.bolts ?? 0}`,
    ];
    const c = this.sheet(760);
    const top = H / 2 - 380;
    this.sheetTitle(c, top, 'PLAYTEST STATS', 'Local only. Nothing leaves this phone.');
    c.add(this.add.text(W / 2, top + 170, lines.join('\n'), { fontFamily: 'Arial', fontStyle: 'bold', fontSize: '24px', color: '#3b2533', align: 'center', lineSpacing: 18 }).setOrigin(0.5, 0));
    this.button(c, W / 2, top + 680, 300, 'BACK', 0x8a6a4a, () => this.openSettings(), 0.8);
  }

  openHelperSheet() {
    sfx.click();
    const m = this.meta;
    const all: Family[] = ['magnet', 'battery', 'fan'];
    const c = this.sheet(760);
    const top = H / 2 - 380;
    this.sheetTitle(c, top, 'HELPER', 'One helper joins your next run.\nIt mixes its own parts into the deliveries.');
    const pick = (f: Family | null) => {
      for (const k of Object.keys(m.toys) as Family[]) m.toys[k] = false;
      if (f) m.toys[f] = true;
      store(META_KEY, JSON.stringify(m));
      this.openTeamSheet();
    };
    this.button(c, W / 2, top + 230, 440, 'NONE', 0x8a6a4a, () => pick(null), 0.85);
    all.forEach((f, i) => {
      const y = top + 340 + i * 110;
      if (f in m.toys) this.button(c, W / 2, y, 440, `${FAMILY_INFO[f].name.toUpperCase()}${m.toys[f] ? '  \u2713' : ''}`, 0x27a4c0, () => pick(f), 0.85);
      else c.add(this.add.text(W / 2, y, `${FAMILY_INFO[f].name}: locked`, { fontFamily: 'Lilita One, Arial Black', fontSize: '28px', color: '#9a8a7a' }).setOrigin(0.5));
    });
    const nc = this.nextChallenge();
    if (nc) c.add(this.add.text(W / 2, top + 670, `Next unlock: ${nc.text}`, { fontFamily: 'Arial', fontStyle: 'bold', fontSize: '22px', color: '#7a5a4a', align: 'center', wordWrap: { width: W - 160 } }).setOrigin(0.5));
  }

  openRecords() {
    const m = this.meta;
    const c = this.sheet(720);
    const top = H / 2 - 360;
    this.sheetTitle(c, top, 'RECORDS');
    const d = m.daily?.[localDate()];
    const rb = Object.entries(m.remixBest);
    const fam = (['cannon', 'coil', 'bell', 'magnet', 'battery', 'fan'] as Family[]).filter((f) => (m.mastery?.[f] ?? 0) > 0);
    const lines = [
      `Fastest win   ${m.bestTime !== null ? m.bestTime.toFixed(1) + 's' : '-'}`,
      `Challenge   ${m.bestTimeHard !== null ? m.bestTimeHard.toFixed(1) + 's' : '-'}`,
      `Biggest chain   x${m.bestChain}`,
      `Today's Daily   ${d ? (d.targets === 3 ? d.time + 's' : `${d.targets}/3`) : '-'}`,
      `Remix wins   ${rb.length}`,
      `Wins / runs   ${m.wins} / ${m.runs}`,
      fam.length ? `Best ranks   ${fam.map((f) => `${FAMILY_INFO[f].name} ${m.mastery![f]}`).join(' · ')}` : '',
    ].filter(Boolean);
    c.add(this.add.text(W / 2, top + 140, lines.join('\n'), { fontFamily: 'Arial', fontStyle: 'bold', fontSize: '27px', color: '#3b2533', align: 'center', lineSpacing: 16, wordWrap: { width: W - 140 } }).setOrigin(0.5, 0));
    this.button(c, W / 2, top + 640, 300, 'BACK', 0x8a6a4a, () => this.openTitle(), 0.85);
  }

  /** WORKSHOP: mastery is free (it IS the machine); Bolts buy chassis finishes. Cards only PREVIEW; an explicit
   *  BUY / EQUIP button acts (ChatGPT r13: "tap again to buy" invited accidental spending). */
  openWorkshop(preview: string | null = null) {
    sfx.click();
    const m = this.meta;
    m.workshopSeenBolts = m.bolts ?? 0;
    store(META_KEY, JSON.stringify(m));
    const wallet: Wallet = { bolts: m.bolts ?? 0, owned: m.owned ?? [], finish: m.finish ?? null };
    const PH = Math.min(H - 60, 1200);
    const c = this.sheet(PH);
    const top = H / 2 - PH / 2;
    this.sheetTitle(c, top, 'WORKSHOP');
    c.add(this.add.text(W / 2, top + 108, `${wallet.bolts} Bolts   ·   better parts come free from merging`, { fontFamily: 'Arial', fontStyle: 'bold', fontSize: '21px', color: '#7a5a4a' }).setOrigin(0.5));
    const sel = preview ?? wallet.finish;
    // stage preview: the backdrop crop behind the machine (equipped or previewed)
    const stageId = it0Stage(preview, m.stage ?? null);
    if (stageId && this.hasArt(`stagebg_${stageId}`)) {
      // the backdrop's pedestal (at ~54% of its height) sits under the preview machine's feet, masked to a window
      const sb = this.add.image(W / 2, 0, `stagebg_${stageId}`).setOrigin(0.5, 0);
      sb.setScale((W - 100) / sb.width);
      sb.setY(top + 400 - sb.displayHeight * 0.54);
      const win = this.add.graphics().setVisible(false).fillRoundedRect(50, top + 140, W - 100, 290, 20);
      sb.setMask(win.createGeometryMask());
      c.add(sb);
    }
    const mach = buildMachine(this, W / 2, top + 390, 470, Object.values(m.mastery ?? {}).some(Boolean) ? (m.mastery ?? {}) : { cannon: 1, coil: 1, bell: 1, [this.teamShooter()]: 1 }, this.activeToys()[0] ?? null, this.teamShooter())!;
    const it0 = CATALOG.find((x) => x.id === sel);
    setFinish(mach, it0?.slot === 'finish' ? it0.id : wallet.finish, CATALOG.find((x) => x.id === (it0?.slot === 'finish' ? it0.id : wallet.finish))?.tint);
    setOrnament(this, mach, it0?.slot === 'ornament' ? it0.id : (m.ornament ?? null));
    c.add(mach);
    CATALOG.forEach((it, i) => {
      // 3 columns (r18: finishes + ornaments + stages no longer fit 2)
      const x = W / 2 + ((i % 3) - 1) * 212;
      const y = top + 456 + Math.floor(i / 3) * 96;
      const owned = wallet.owned.includes(it.id);
      const equipped = it.slot === 'finish' ? wallet.finish === it.id : it.slot === 'ornament' ? m.ornament === it.id : it.slot === 'stage' ? m.stage === it.id : owned;
      const card = this.add.container(x, y);
      const g = this.add.graphics().fillStyle(preview === it.id ? 0xe8a33a : 0x2b1d2e, 1).fillRoundedRect(-102, -42, 204, 84, 16).fillStyle(preview === it.id ? 0xfff3c8 : 0xffffff, 1).fillRoundedRect(-98, -38, 196, 76, 13);
      const sw = this.add.circle(-74, 0, 15, it.tint ?? 0xd8c8b0).setStrokeStyle(3, 0x2b1d2e);
      const nm = this.add.text(-52, -14, it.name, { fontFamily: 'Lilita One, Arial Black', fontSize: '19px', color: '#3b2533' }).setOrigin(0, 0.5);
      const st = this.add.text(-52, 16, equipped ? 'EQUIPPED' : owned ? 'owned' : `${it.price}`, { fontFamily: 'Arial', fontStyle: 'bold', fontSize: '17px', color: equipped || owned ? '#2f8a3a' : '#b06a1a' }).setOrigin(0, 0.5);
      card.add([g, sw, nm, st]).setSize(204, 84).setInteractive({ useHandCursor: true });
      card.on('pointerup', () => {
        tlog.log('preview', { id: it.id });
        this.openWorkshop(it.id);
      });
      c.add(card);
    });
    const by = top + 456 + Math.ceil(CATALOG.length / 3) * 96 + 20;
    const pv = preview ? CATALOG.find((x) => x.id === preview) : undefined;
    if (pv) {
      const owned = wallet.owned.includes(pv.id);
      const equipped = pv.slot === 'finish' ? wallet.finish === pv.id : pv.slot === 'ornament' ? m.ornament === pv.id : pv.slot === 'stage' ? m.stage === pv.id : false;
      const label = !owned ? `BUY  ·  ${pv.price}` : pv.slot === 'nameplate' ? 'NEW NAME' : equipped ? 'UNEQUIP' : 'EQUIP';
      const canAfford = owned || wallet.bolts >= pv.price;
      const b = this.button(c, W / 2, by, 420, label, 0x5fbf4a, () => {
        if (!owned) {
          if (!buy(wallet, pv.id)) return this.showToast(`Need ${pv.price - wallet.bolts} more Bolts`);
          m.bolts = wallet.bolts;
          m.owned = wallet.owned;
          if (pv.slot === 'finish') m.finish = pv.id;
          if (pv.slot === 'ornament') m.ornament = pv.id;
          if (pv.slot === 'stage') m.stage = pv.id;
          m.workshopSeenBolts = m.bolts;
          tlog.log('purchase', { id: pv.id, price: pv.price, balance: m.bolts });
          sfx.rankUp(4);
        } else if (pv.slot === 'stage') {
          m.stage = equipped ? null : pv.id;
          tlog.log('equip', { id: pv.id, on: !equipped });
        } else if (pv.slot === 'ornament') {
          m.ornament = equipped ? null : pv.id;
          tlog.log('equip', { id: pv.id, on: !equipped });
        } else if (pv.slot === 'finish') {
          m.finish = equipped ? null : pv.id;
          tlog.log('equip', { id: pv.id, on: !equipped });
        } else m.nameIdx = (m.nameIdx ?? 0) + 1;
        store(META_KEY, JSON.stringify(m));
        this.openWorkshop(pv.id);
      }, 0.85);
      if (!canAfford) b.setAlpha(0.6);
    } else c.add(this.add.text(W / 2, by, 'Tap a finish to preview it on your machine', { fontFamily: 'Arial', fontStyle: 'bold', fontSize: '22px', color: '#7a5a4a' }).setOrigin(0.5));
    const close = this.add.text(W - 70, top + 44, '✕', { fontFamily: 'Arial', fontSize: '40px', color: '#3b2533' }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    close.on('pointerup', () => this.openTitle());
    c.add(close);
  }


  /** Pre-v10 title console (fallback when the home art is missing). */
  openLegacyTitle() {
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
      const today = m.daily?.[localDate()];
      tlog.log('daily_offer_view', { date: localDate(), done: !!today });
      this.button(c, W / 2 - 222, consoleTop + 450, 250, 'CHALLENGE', 0xe8452c, () => this.retry(true, -1), 0.82);
      this.button(c, W / 2, consoleTop + 450, 250, today ? 'DAILY ✓' : 'DAILY', 0x5fbf4a, () => this.startDaily(), 0.82);
      this.button(c, W / 2 + 222, consoleTop + 450, 250, 'REMIX', 0x27a4c0, () => this.openRemixPicker(), 0.82);
    } else c.add(this.add.text(W / 2, consoleTop + 450, 'Win once to unlock Challenge + Remix', { ...cream, fontSize: '24px', color: '#cdbfa8' }).setOrigin(0.5));
    this.tweens.add({ targets: play, scale: 1.04, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
  }
  /** Illustrated rules, reachable from title + pause (playtest: wanted everything explained). */
  /** r24 MACHINE GUIDE (Ido: "a better explanation of the different units"): one page per machine with a looping
   *  mini-board that shows exactly what it does, plus how chains work. Locked machines say where you meet them. */
  static GUIDE: { key: string; title: string; role: string; text: string; tryThis: string; unlock: number }[] = [
    { key: 'chain', title: 'HOW CHAINS WORK', role: 'THE RULE', text: 'Merge two SAME machines with the SAME number. The new machine fires and wakes OTHER machines in its reach. Every machine that fires hits the monster.', tryThis: 'Bigger chain = bigger hit. Build machines next to each other.', unlock: 0 },
    { key: 'cannon', title: 'CANNON', role: 'SHOOTER', text: 'Shoots by itself, weakly. When a merge or a chain wakes it, it fires a FULL shot. It wakes nobody.', tryThis: 'Park Cannons where Coils and Bells can reach them.', unlock: 0 },
    { key: 'coil', title: 'COIL', role: 'RELAY', text: 'Zaps up to 2 cells away: up, down, left, right. Wakes every OTHER kind of machine it reaches.', tryThis: 'Put Cannons inside its cross.', unlock: 0 },
    { key: 'bell', title: 'BELL', role: 'RELAY', text: 'Rings its whole row. Wakes every OTHER kind of machine in that row.', tryThis: 'Fill its row with Cannons and Coils.', unlock: 0 },
    { key: 'rocket', title: 'ROCKET', role: 'SHOOTER', text: 'Never shoots by itself. When a chain wakes it, it fires a BIG shot: 1.3x a Cannon.', tryThis: 'Pack Rockets into your longest chains.', unlock: 6 },
    { key: 'magnet', title: 'MAGNET', role: 'MOVER', text: 'When it fires, it pulls one machine along its line into the empty cell next to it.', tryThis: 'Use it to bring a pair together.', unlock: 12 },
    { key: 'fan', title: 'FAN', role: 'MOVER', text: 'When it fires, it blows the first machine next to it one cell further away (if that cell is empty).', tryThis: 'Use it to push a machine into a relay\'s reach.', unlock: 23 },
    { key: 'items', title: 'POWER-UPS', role: 'SPECIAL', text: 'Break the monster to half HP and a power-up capsule drops into your tray. Drag it onto a machine: OVERCHARGE (shooter: next 2 chain shots x1.5), SPARK (shooter: wakes its neighbours once), CORNER KIT (Bell: wakes its diagonals once).', tryThis: 'A machine keeps its power-up when you merge it.', unlock: 13 },
    { key: 'battery', title: 'BATTERY', role: 'SUPPORT', text: 'Charges the Cannon next to it: that Cannon\'s next chain shot hits x1.5.', tryThis: 'Park it beside your biggest Cannon.', unlock: 17 },
  ];

  guideUnlocked(unlock: number) {
    return unlock <= 1 || this.currentLevel() >= unlock || !!this.meta.hardUnlocked;
  }

  openHowTo(page = 0, back?: () => void, single = false) {
    this.closeModal();
    const pages = GameScene.GUIDE;
    page = Math.max(0, Math.min(pages.length - 1, page));
    const pg = pages[page];
    const c = this.panel(940);
    const top = H / 2 - 470;
    const open = single || this.guideUnlocked(pg.unlock);
    c.add(this.add.text(W / 2, top + 56, single ? 'NEW MACHINE!' : 'MACHINE GUIDE', { fontFamily: 'Lilita One, Arial Black', fontSize: '30px', color: '#b06a1a' }).setOrigin(0.5));
    c.add(this.add.text(W / 2, top + 108, open ? pg.title : '???', { fontFamily: 'Lilita One, Arial Black', fontSize: '54px', color: '#2a2233' }).setOrigin(0.5));
    const roleCol = { SHOOTER: '#e8452c', RELAY: '#27a4c0', MOVER: '#c23fd1', SUPPORT: '#5fbf4a', 'THE RULE': '#8a6a4a', SPECIAL: '#e0a020' }[pg.role] ?? '#8a6a4a';
    c.add(this.add.text(W / 2, top + 160, pg.role, { fontFamily: 'Lilita One, Arial Black', fontSize: '24px', color: '#ffffff', backgroundColor: roleCol, padding: { x: 14, y: 4 } }).setOrigin(0.5));
    if (open && pg.key === 'items') {
      (['overcharge', 'spark', 'corner'] as const).forEach((k, i) => {
        const im = this.add.image(W / 2 + (i - 1) * 150, top + 330, `item_${k}`);
        im.setScale(110 / Math.max(im.width, im.height));
        c.add(im);
        this.tweens.add({ targets: im, y: top + 318, duration: 600 + i * 90, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
      });
      c.add(this.add.text(W / 2, top + 440, pg.text, { fontFamily: 'Arial', fontStyle: 'bold', fontSize: '25px', color: '#3b2533', align: 'center', wordWrap: { width: W - 160 }, lineSpacing: 4 }).setOrigin(0.5, 0));
      c.add(this.add.text(W / 2, top + 748, `Try: ${pg.tryThis}`, { fontFamily: 'Arial', fontStyle: 'italic bold', fontSize: '23px', color: '#7a5a4a', align: 'center', wordWrap: { width: W - 160 } }).setOrigin(0.5, 0));
    } else if (open) {
      this.machineDemo(c, W / 2, top + 392, pg.key);
      c.add(this.add.text(W / 2, top + 586, pg.text, { fontFamily: 'Arial', fontStyle: 'bold', fontSize: '26px', color: '#3b2533', align: 'center', wordWrap: { width: W - 160 }, lineSpacing: 4 }).setOrigin(0.5, 0));
      c.add(this.add.text(W / 2, top + 748, `Try: ${pg.tryThis}`, { fontFamily: 'Arial', fontStyle: 'italic bold', fontSize: '23px', color: '#7a5a4a', align: 'center', wordWrap: { width: W - 160 } }).setOrigin(0.5, 0));
    } else {
      c.add(this.add.text(W / 2, top + 400, `You meet this machine\nat level ${pg.unlock}.`, { fontFamily: 'Lilita One, Arial Black', fontSize: '36px', color: '#7a5a4a', align: 'center' }).setOrigin(0.5));
    }
    const done = () => {
      this.closeModal();
      if (back) back();
    };
    if (single) {
      this.button(c, W / 2, top + 880, 320, 'GOT IT', 0x5fbf4a, done);
    } else {
      const dots = pages.map((_, i) => (i === page ? '●' : '○')).join(' ');
      c.add(this.add.text(W / 2, top + 828, dots, { fontFamily: 'Arial', fontSize: '24px', color: '#7a5a4a' }).setOrigin(0.5));
      if (page > 0) this.button(c, W / 2 - 165, top + 880, 260, 'BACK', 0x8a6a4a, () => this.openHowTo(page - 1, back));
      if (page < pages.length - 1) this.button(c, W / 2 + (page > 0 ? 165 : 0), top + 880, 260, 'NEXT', 0x5fbf4a, () => this.openHowTo(page + 1, back));
      else this.button(c, W / 2 + 165, top + 880, 260, 'DONE', 0x5fbf4a, done);
      const x = this.add.text(W - 78, top + 50, '✕', { fontFamily: 'Arial', fontSize: '40px', color: '#3b2533' }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      x.on('pointerup', done);
      c.add(x);
    }
    tlog.log('guide', { page: pg.key, single });
  }

  /** Looping 5x3 mini-board: the source pulses, yellow zaps reach the machines it wakes (in chain order), shooters send a bolt to the monster. */
  machineDemo(c: Phaser.GameObjects.Container, cx: number, cy: number, key: string) {
    const cs = 84, COLS_D = 5, ROWS_D = 3;
    const ox = cx - (COLS_D * cs) / 2 + cs / 2, oy = cy - (ROWS_D * cs) / 2 + cs / 2 + 40;
    const at = (r: number, k: number) => ({ x: ox + k * cs, y: oy + r * cs });
    // [family, row, col]; links: [fromPiece, toPiece, depth]; merge: piece slides onto piece at depth 0; slide: piece moves to [r,c]
    type Demo = { pieces: [string, number, number][]; links: [number, number, number][]; merge?: [number, number]; slide?: [number, number, number, number]; big?: number[]; charged?: number };
    const D: Record<string, Demo> = {
      chain: { pieces: [['coil', 1, 0], ['coil', 1, 1], ['cannon', 1, 3], ['bell', 0, 1], ['cannon', 0, 4], ['cannon', 2, 4]], merge: [0, 1], links: [[1, 2, 1], [1, 3, 1], [3, 4, 2]] },
      cannon: { pieces: [['cannon', 1, 1], ['cannon', 1, 2], ['cannon', 0, 4]], merge: [0, 1], links: [] },
      coil: { pieces: [['coil', 1, 2], ['cannon', 1, 0], ['cannon', 0, 2], ['bell', 1, 3], ['cannon', 0, 0], ['cannon', 2, 4]], links: [[0, 1, 1], [0, 2, 1], [0, 3, 1]] },
      bell: { pieces: [['bell', 1, 2], ['cannon', 1, 0], ['coil', 1, 4], ['cannon', 1, 3], ['cannon', 0, 2], ['cannon', 2, 1]], links: [[0, 1, 1], [0, 2, 1], [0, 3, 1]] },
      rocket: { pieces: [['coil', 1, 1], ['rocket', 1, 3], ['rocket', 0, 4]], links: [[0, 1, 1]], big: [1] },
      magnet: { pieces: [['magnet', 1, 1], ['cannon', 1, 4], ['cannon', 0, 0]], links: [], slide: [1, 1, 2, 1] },
      battery: { pieces: [['coil', 0, 2], ['cannon', 1, 2], ['battery', 1, 1], ['cannon', 2, 4]], links: [[0, 1, 1]], charged: 1, big: [1] },
      fan: { pieces: [['fan', 1, 1], ['cannon', 1, 2], ['coil', 0, 4]], links: [], slide: [1, 1, 3, 1] },
    };
    const d = D[key] ?? D.chain;
    const g = this.add.graphics();
    c.add(g);
    for (let r = 0; r < ROWS_D; r++) for (let k = 0; k < COLS_D; k++) g.fillStyle(0xb98a5e, 0.35).fillRoundedRect(at(r, k).x - cs / 2 + 4, at(r, k).y - cs / 2 + 4, cs - 8, cs - 8, 14);
    // reach hint for relays (the cells the source can wake)
    const src = d.pieces[0];
    if (key === 'coil' || key === 'bell') {
      for (let r = 0; r < ROWS_D; r++)
        for (let k = 0; k < COLS_D; k++) {
          const inReach = key === 'bell' ? r === src[1] && k !== src[2] : (r === src[1] && Math.abs(k - src[2]) <= 2 && k !== src[2]) || (k === src[2] && Math.abs(r - src[1]) <= 2 && r !== src[1]);
          if (inReach) g.lineStyle(4, 0xffcf33, 0.9).strokeRoundedRect(at(r, k).x - cs / 2 + 6, at(r, k).y - cs / 2 + 6, cs - 12, cs - 12, 12);
        }
    }
    const mon = this.add.image(cx, cy - (ROWS_D * cs) / 2 - 30, 'target_0');
    mon.setScale(64 / Math.max(mon.width, mon.height));
    c.add(mon);
    const imgs = d.pieces.map(([f, r, k]) => {
      const im = this.add.image(at(r, k).x, at(r, k).y, `${f}_1`);
      im.setScale((cs - 14) / Math.max(im.width, im.height));
      c.add(im);
      return im;
    });
    const fx = this.add.graphics();
    c.add(fx);
    if (d.charged !== undefined) {
      const p = imgs[d.charged];
      fx.lineStyle(5, 0x7ccf2e, 1).strokeCircle(p.x, p.y, cs / 2 - 4);
    }
    const isShooter = (f: string) => f === 'cannon' || f === 'rocket';
    const base = d.pieces.map(([, r, k]) => at(r, k));
    const timers: Phaser.Time.TimerEvent[] = [];
    const STEP = 420;
    const play = () => {
      if (!c.active) return;
      // reset
      imgs.forEach((im, i) => im.setPosition(base[i].x, base[i].y).setAlpha(1).setTint(0xffffff));
      const zap = this.add.graphics();
      c.add(zap);
      const fire = (i: number, depth: number) => {
        timers.push(
          this.time.delayedCall(depth * STEP + 120, () => {
            if (!c.active) return;
            const im = imgs[i];
            this.tweens.add({ targets: im, scale: im.scale * 1.22, duration: 110, yoyo: true });
            if (isShooter(d.pieces[i][0])) {
              const big = d.big?.includes(i);
              const b = this.add.circle(im.x, im.y, big ? 16 : 10, big ? 0xff8a3c : 0xffcf33);
              c.add(b);
              this.tweens.add({ targets: b, x: mon.x, y: mon.y, duration: 300, ease: 'Quad.In', onComplete: () => {
                b.destroy();
                if (c.active) this.tweens.add({ targets: mon, angle: { from: -8, to: 0 }, duration: 160 });
              } });
            }
          }),
        );
      };
      let rootIdx = 0;
      if (d.merge) {
        const [a, b] = d.merge;
        rootIdx = b;
        this.tweens.add({ targets: imgs[a], x: base[b].x, y: base[b].y, duration: 260, ease: 'Quad.In', onComplete: () => imgs[a].setAlpha(0) });
        timers.push(this.time.delayedCall(280, () => c.active && this.tweens.add({ targets: imgs[b], scale: imgs[b].scale * 1.3, duration: 140, yoyo: true })));
        fire(b, 1);
      } else fire(0, 0);
      for (const [f, t, depth] of d.links) {
        const dd = d.merge ? depth + 1 : depth;
        timers.push(
          this.time.delayedCall(dd * STEP - 120, () => {
            if (!c.active) return;
            zap.lineStyle(7, 0x2b1d2e, 0.8).lineBetween(base[f].x, base[f].y, base[t].x, base[t].y).lineStyle(4, 0xffcf33, 1).lineBetween(base[f].x, base[f].y, base[t].x, base[t].y);
          }),
        );
        fire(t, dd);
      }
      if (d.slide) {
        const [i, r, k] = d.slide;
        const to = at(r, k);
        timers.push(this.time.delayedCall(STEP, () => c.active && this.tweens.add({ targets: imgs[i], x: to.x, y: to.y, duration: 380, ease: 'Back.Out' })));
      }
      void rootIdx;
      timers.push(this.time.delayedCall(2300, () => zap.destroy()));
    };
    play();
    const loop = this.time.addEvent({ delay: 2900, loop: true, callback: play });
    c.once('destroy', () => {
      loop.remove();
      for (const t of timers) t.remove();
    });
  }

  startTutorial() {
    this.closeModal();
    tlog.log('tutorial_replay');
    this.tutorialShort = false;
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
      jam: 'Jams an empty cell',
      gaps: 'Blocks the gaps of a row',
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
  blockImgs: Phaser.GameObjects.Image[] = [];
  remixUnder!: Phaser.GameObjects.Graphics;
  remixIcons: Phaser.GameObjects.Image[] = [];
  remixText!: Phaser.GameObjects.Text;

  drawRemix() {
    const r = this.s.remix;
    if (!this.remixG) {
      this.remixG = this.add.graphics().setDepth(46);
      this.remixUnder = this.add.graphics().setDepth(5); // r22: tints sit UNDER the machines so rank badges stay readable
      this.remixText = this.add.text(0, 0, '', { fontFamily: 'Lilita One, Arial Black', fontSize: '30px', color: '#2a2233' }).setOrigin(0.5).setDepth(49);
    }
    const g = this.remixG.clear();
    const gu = this.remixUnder.clear();
    for (const im of this.remixIcons) im.setVisible(false);
    this.remixText.setVisible(false);
    // BOSS telegraph + active effect (r20): one icon + the exact shape; countdown bubble; no full-board wash
    const bs = this.s.boss;
    // r27 junk blocks: inert crates on the board with a shrinking 8 s ring
    for (const im of this.blockImgs) im.setVisible(false);
    (bs?.blocks ?? []).forEach((b, k) => {
      const { x, y } = cellXY(b.cell);
      let im = this.blockImgs[k];
      if (!im) this.blockImgs.push((im = this.add.image(0, 0, this.hasArt('prop_junk_block') ? 'prop_junk_block' : 'dot').setDepth(12)));
      im.setVisible(true).setPosition(x, y);
      im.setScale((CELL - 18) / Math.max(im.width, im.height));
      if (!this.hasArt('prop_junk_block')) g.fillStyle(0x7a6a5a, 1).fillRoundedRect(x - CELL / 2 + 10, y - CELL / 2 + 10, CELL - 20, CELL - 20, 10);
      const frac = Math.max(0, (b.until - this.s.elapsed) / 8);
      g.lineStyle(5, 0xffcf33, 0.9).beginPath().arc(x, y, CELL / 2 - 6, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2).strokePath();
    });
    if (bs && (bs.pending || bs.active)) {
      const atk = castAttack(bs, bs.active ?? bs.pending);
      const icon = ATTACK_ICON[atk];
      const col = warnColor(atk);
      const tgt = bs.active ?? bs.pending!;
      const warn = !bs.active;
      const pulse = warn ? 0.55 + 0.45 * Math.abs(Math.sin(this.time.now / 250)) : 0.9;
      const cellsOf = (): number[] => (tgt.cells ? tgt.cells : tgt.row !== undefined ? [0, 1, 2, 3, 4].map((c) => tgt.row! * COLS + c) : tgt.col !== undefined ? [0, 1, 2, 3, 4, 5].map((r) => r * COLS + tgt.col!) : []);
      const coral = 0xff684a, plum = 0x6a3a8a;
      for (const c of cellsOf()) {
        const { x, y } = cellXY(c);
        const x0 = x - CELL / 2 + 6, y0 = y - CELL / 2 + 6, sz = CELL - 12;
        if (warn) {
          // dashed coral boundary, pulsing 2 Hz
          gu.lineStyle(5, coral, pulse);
          for (let d = 0; d < sz; d += 22) {
            gu.lineBetween(x0 + d, y0, Math.min(x0 + d + 12, x0 + sz), y0).lineBetween(x0 + d, y0 + sz, Math.min(x0 + d + 12, x0 + sz), y0 + sz);
            gu.lineBetween(x0, y0 + d, x0, Math.min(y0 + d + 12, y0 + sz)).lineBetween(x0 + sz, y0 + d, x0 + sz, Math.min(y0 + d + 12, y0 + sz));
          }
        } else {
          gu.fillStyle(plum, 0.55).fillRoundedRect(x0, y0, sz, sz, 16);
          gu.lineStyle(6, coral, 1).strokeRoundedRect(x0, y0, sz, sz, 16).lineStyle(2, 0xfff0cf, 1).strokeRoundedRect(x0 + 4, y0 + 4, sz - 8, sz - 8, 13);
        }
        void col;
      }
      // r27 movement previews: where things will go
      const arrow = (a: number, b: number, color = 0xffd2c8) => {
        const f = cellXY(a), t = cellXY(b);
        const ang = Math.atan2(t.y - f.y, t.x - f.x);
        const ex = t.x - Math.cos(ang) * 26, ey = t.y - Math.sin(ang) * 26;
        g.lineStyle(9, 0x2b1d2e, 0.8 * pulse).lineBetween(f.x, f.y, ex, ey).lineStyle(5, color, pulse).lineBetween(f.x, f.y, ex, ey);
        g.fillStyle(color, pulse).fillTriangle(ex + Math.cos(ang) * 16, ey + Math.sin(ang) * 16, ex + Math.cos(ang + 2.4) * 14, ey + Math.sin(ang + 2.4) * 14, ex + Math.cos(ang - 2.4) * 14, ey + Math.sin(ang - 2.4) * 14);
      };
      if (warn && (atk === 'pull' || atk === 'bounce') && tgt.cells) {
        arrow(tgt.cells[0], tgt.cells[1]);
        const d = cellXY(tgt.cells[1]);
        g.lineStyle(5, 0xffd2c8, pulse).strokeCircle(d.x, d.y, CELL / 2 - 14);
      }
      if (warn && atk === 'mirror' && tgt.cells) {
        arrow(tgt.cells[0], tgt.cells[1], 0xd9c2ff);
        arrow(tgt.cells[1], tgt.cells[0], 0xd9c2ff);
      }
      if (warn && atk === 'conveyor' && tgt.row !== undefined) for (let c = 0; c < COLS - 1; c++) arrow(tgt.row * COLS + c, tgt.row * COLS + c + 1);
      if (warn && atk === 'bomb' && tgt.cells) {
        const { x, y } = cellXY(tgt.cells[0]);
        let bomb = this.remixIcons.find((x2) => x2.texture.key === 'prop_bomb');
        if (!bomb && this.hasArt('prop_bomb')) this.remixIcons.push((bomb = this.add.image(0, 0, 'prop_bomb').setDepth(47)));
        if (bomb) {
          bomb.setVisible(true).setPosition(x, y + Math.sin(this.time.now / 90) * 3);
          bomb.setScale(((CELL - 22) * (1 + 0.06 * Math.sin(this.time.now / 120))) / Math.max(bomb.width, bomb.height));
        } else g.fillStyle(0x2b1d2e, 1).fillCircle(x, y, 30).fillStyle(0xff684a, 1).fillCircle(x, y - 30, 8);
      }
      if (tgt.boundary !== undefined) {
        const x = BX + (tgt.boundary + 1) * CELL;
        if (warn) {
          g.lineStyle(5, coral, pulse);
          for (let yy = BY - 8; yy < BY + CELL * ROWS + 8; yy += 26) g.lineBetween(x, yy, x, Math.min(yy + 14, BY + CELL * ROWS + 8));
        } else g.lineStyle(14, plum, 1).lineBetween(x, BY - 8, x, BY + CELL * ROWS + 8).lineStyle(4, coral, 1).lineBetween(x - 7, BY - 8, x - 7, BY + CELL * ROWS + 8).lineBetween(x + 7, BY - 8, x + 7, BY + CELL * ROWS + 8);
      }
      const anchor = cellsOf()[0] ?? (tgt.boundary !== undefined ? tgt.boundary : 0);
      const ac = tgt.boundary !== undefined ? { x: BX + (tgt.boundary + 1) * CELL + CELL / 2 - 18, y: BY + CELL / 2 - 10 } : cellXY(anchor);
      if (this.hasArt(icon)) {
        let im = this.remixIcons.find((x) => x.texture.key === icon);
        if (!im) {
          im = this.add.image(0, 0, icon).setDepth(48);
          this.remixIcons.push(im);
        }
        // r23: an active clamp physically sits ON the machine (big, centred); otherwise a corner badge
        const onIt = !warn && atk === 'clamp';
        im.setVisible(true).setPosition(onIt ? ac.x + 10 : ac.x - CELL / 2 + 18, onIt ? ac.y - 14 : ac.y - CELL / 2 + 18);
        im.setScale((onIt ? CELL * 0.6 : 44) / Math.max(im.width, im.height));
      }
      const left = warn ? Math.max(0, (bs.pending!.deadline - this.s.elapsed)) : Math.max(0, bs.active!.until - this.s.elapsed);
      this.remixText.setText(warn ? String(Math.ceil(left)) : left.toFixed(1)).setPosition(ac.x + CELL / 2 - 24, ac.y - CELL / 2 + 20).setFontSize(26).setVisible(true);
      const what = ATTACK_COPY[atk].what;
      const missed = !warn && atk === 'clamp' && cellsOf().every((c) => !this.s.grid[c]);
      const why = missed ? 'it missed! that cell is blocked' : ATTACK_COPY[atk].why;
      this.updateLane(warn ? `${what} IN ${left.toFixed(1)}s  \u00b7  ${why}` : `${what}  \u00b7  ${why}  \u00b7  ${left.toFixed(1)}s`, '#ffd2c8');
      void BOSS_WARN;
      return;
    }
    // CORNERS modifiers: permanently blocked cells
    for (const c of this.s.masked ?? []) {
      const { x, y } = cellXY(c);
      g.fillStyle(0x2b1d2e, 0.72).fillRoundedRect(x - CELL / 2 + 6, y - CELL / 2 + 6, CELL - 12, CELL - 12, 18);
      g.lineStyle(6, 0x8a6a4a, 1).lineBetween(x - 24, y - 24, x + 24, y + 24).lineBetween(x + 24, y - 24, x - 24, y + 24);
    }
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
      if (r.kind === 'jam' || r.kind === 'gaps') {
        for (const c of r.pending.cells) cellBox(c, purple, pulse);
        bubble(r.pending.cells[r.pending.cells.length - 1], secs, 'tg_piano');
        lane = r.kind === 'jam' ? `JAM in ${secs}  ·  this cell gets blocked` : `ROW GAPS in ${secs}  ·  these empty cells get blocked`;
      } else if (r.kind === 'piano') {
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
    if (r.lock && (r.kind === 'jam' || r.kind === 'gaps')) {
      for (const c of r.lock.cells) {
        const { x, y } = cellXY(c);
        gu.fillStyle(purple, 0.5).fillRoundedRect(x - HALF, y - HALF, HALF * 2, HALF * 2, 18);
        g.lineStyle(6, purple, 0.9).lineBetween(x - 26, y - 26, x + 26, y + 26).lineBetween(x + 26, y - 26, x - 26, y + 26);
      }
      lane = `BLOCKED  ·  ${Math.max(0, r.lock.until - this.s.elapsed).toFixed(1)}s`;
    } else if (r.lock) {
      const ys = cellXY(r.lock.cells[0]).y;
      gu.fillStyle(purple, 0.3).fillRoundedRect(BX + 6, ys - HALF, CELL * COLS - 12, HALF * 2, 18);
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
    this.button(c, W / 2 + 108, top + 520, 200, 'RESTART', 0xe8452c, () => this.retry());
    this.button(c, W / 2 - 108, top + 520, 200, 'HOME', 0x27a4c0, () => this.quitHome());
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
    const linkY = top + (this.s.phase === 'tutorial' ? 700 : 596);
    const shk = this.add
      .text(W / 2 + 140, linkY, `Shake: ${this.meta.shake === false ? 'OFF' : 'ON'}`, { fontFamily: 'Lilita One, Arial Black', fontSize: '28px', color: '#b06a1a' })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    shk.on('pointerup', () => {
      sfx.click();
      this.meta.shake = this.meta.shake === false;
      store(META_KEY, JSON.stringify(this.meta));
      shk.setText(`Shake: ${this.meta.shake === false ? 'OFF' : 'ON'}`);
      if (this.meta.shake) this.shake(90, 0.003);
    });
    c.add(shk);
    const how = this.add.text(W / 2 - 120, linkY, 'Machine guide', { fontFamily: 'Lilita One, Arial Black', fontSize: '28px', color: '#b06a1a' }).setOrigin(0.5).setInteractive({ useHandCursor: true });
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
