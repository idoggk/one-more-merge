import Phaser from 'phaser';
import { FAMILY_INFO, PERKS, TARGET_NAMES } from '../content/perks';
import { COLS, MAX_RANK, ROWS, TICK, TUNING } from '../content/tuning';
import { applyPace, applySpamVariant, applyThinkBank, applyUnits, DEFAULT_PACE, PACE_KEY, PACES, ROSTER1_KEY, storedRoster1, SPAM_VARIANTS, storedPace, storedThinkBank, storedUnits, THINK_BANK_KEY, UNITS_B0_KEY, UNITS_VARIANTS, unitsStoreValue, type SpamVariant } from '../content/experiments';
import {
  canMerge,
  capOf,
  deserialize,
  resumable,
  legalPairs,
  newGame,
  newLevel,
  odByChain,
  odNeeded,
  peekNext,
  fatigueCfg,
  supplyGated,
  mergeEarns,
  previewMerge,
  serialize,
  supplyPeriod,
  type GameEvent,
  type GameState,
} from '../core/game';
import type { CascadeResult, Family, Gadget, PerkId } from '../core/types';
import { buildMachine, hasMachineArt, setFinish, setOrnament } from './machine';
import { rawDamage, routeCells } from '../core/cascade';
import { buy, CATALOG, ONBOARDING_BOLTS, runPayout, type Payout, type Wallet } from '../core/economy';
import { DAILY_VERSION } from '../content/dailySeeds';
import { BEHAVIOUR_TEXT, BOOSTER_UNLOCK, CAST, goalText, LEVELS, levelReward, MODIFIER_TEXT, MONSTER_INDEX, newConcepts, PRICES, starGoals, starsFor } from '../content/levels';
import { audioSettings, duckMusic, haptic, setMusicIntensity, setMusicMode, sfx, startMusic, stopMusic, unlockAudio } from './audio';
import { ensureTextures, loadLazyArt, preloadArt } from './textures';
import * as tlog from '../platform/telemetry';
import { applyBundle, exportCode, importCode, lockSaves, META_KEY, readBundle, readPreimport, restorePreimport, safeStorage, SAVE_KEY, type SaveBundle } from '../platform/backup';
import { closeCodeBox, copyText, openCodeBox } from './codeBox';
import { Coach } from './coach';
import { REMIX_OPPONENTS, twinsDestination, type RemixKind } from '../core/remix';
import { ATTACK_COPY, BOSSES, bossBlocked, bossPhase, castAttack, chapterBossIdx, type BossAttack } from '../core/boss';
import { isRelay, isShooter as isShooterFam, itemFits } from '../core/types';
import { goodHereText, ROSTER_1_DEMOS, ROSTER_1_GUIDE, ROSTER_1_INFO } from '../content/roster1';
import { ATTACK_TINT, CELL_COPY, fmtMult, hex, inspectMarks, MARK_MEANING, markTip, mergePreview, PALETTE, previewSig, type MarkLine, type PreviewChip } from '../core/marks';
import { newRushFight, rushCourse, RUSH_REWARDS, weekId } from '../core/rush';
import { applyRoster1, boltsFor, cardsFor, COLLECTION_GOALS, CRATES, CRATES_B, FEATURED_CRATE, GEM_REWARDS, LATCH_B, RARITY_COLOR, UNIT_PERKS, levelMult, levelPerkText, MAX_UNIT_LEVEL, SHOP, STARTER_UNITS, unitDef, UNITS, type CrateKind, type UnitDef } from '../content/units';
import { Rng } from '../core/rng';
import { featuredGemUnit, featuredUnit, openCrateB, rollCrate, rollFeatured, rollPack, type CrateCard } from '../core/crates';
import { guaranteeText, pctB, pityView } from '../core/crateOdds';
import { cardsAvailable, spareOf, spendCards, sweepSpare } from '../core/spareParts';
import { addOddsButton, showOddsPanel } from './ui/oddsPanel';
import { addMergedLine, addUnitJob, showUnitJobPopup } from './ui/unitJobUi';
import { unitJob } from '../content/unitJobs';
import { crateName, latchRollUp, popToolboxLatch, TOOLBOX_KEY, toolboxCrateKey, toolboxOn } from './fx/toolboxCrates';
import { YARD_BOOSTERS, YARD_TIERS, type YardBooster, type YardReward } from '../core/screw';
import { addBoosters, nextYard, recordYard, tierReached, weekYard, YARD_BOOSTER_START, YARD_COUNT, yardPlayable, yardStarTotal, yardWeekRec, type BoosterCounts } from '../core/yardWeek';
import { BOOSTER_COPY } from '../core/marks';
import { ENDLESS_UNLOCK, endlessDef, endlessPos, endlessReward } from '../core/endless';
import { contractMet, contractsFor, contractText, MASTERY_BOLTS } from '../core/mastery';
import puzzleData from '../content/puzzles.json';
import { drillsPending, newPuzzle, thinking, type PuzzleDef } from '../core/game';
import { applyMergeRule, MERGE_RULE_KEY, MERGE_RULES, storedMergeRule } from '../core/sandwich';
import { playSandwich } from './sandwichFx';
import { dailyIndex, HELP, missedUnitText, nextWinningMove, notePuzzleAttempt, puzzleHelp, puzzleReward, type Move, type PuzzleRec } from '../core/puzzle';
import { applyCommand, newRunLog, recordCommand, recordTick, replayRun, type RunLog } from '../core/replay';
import { decodeCurve, ghostProgress, levelProgress, paceDelta, paceFromLog, paceLabel, updatePace, type PaceCurve } from '../core/pace';
import { BONUS_XP, dailyTasks, rollSeason, SEASON_TIERS, seasonCount, seasonDayLeft, seasonTier, seasonUnit, TIER_XP, tierRewards, weeklyTasks, type SeasonEvent, type SeasonRec, type SeasonReward } from '../core/season';
import type { YardData, YardResult } from './ScrewScene';
import type { ObjectYardData, ObjectYardResult } from './ObjectYardScene';
import { CRATE } from '../core/screwObject';
import { BOUNTY_BOLTS, bountiesFor, MASTERY_CHAIN, MASTERY_MILESTONES, MASTERY_TIME_LEFT, newBountyFight, TWIST_TEXT, twistText, type BountyTwist } from '../core/bounty';
import { BOUNTY_LOCKED, chainWakeText, CHALLENGES, CHAPTER_MONSTER, chapterChestText, FACE, goalDoneText, GUIDE, ITEM_COPY, mergesText, OD_LABEL, relayLockNote, stageHudText, TUTORIAL, unitsTitle } from '../content/sceneCopy';
import { dailyBetter, dailySeed, loadMeta, localDate, store, type DailyBest, type Meta } from './meta';
import { FEATURE_INFO, grantToy, isNew, isUnlocked, markSeen, migrateUnlocks, refreshUnlocks, toyEarned, toysOpen, unlockAll, UNLOCK_LEVEL, type Feature } from './unlocks';
import { admitTip, newTipLedger } from './tips';
import { MODE_INTRO, modeIntroFor } from './modeIntro';
import { DROP_HINT, HintGate, planDrop, type DropReject } from './dropFeedback';
import { FormulaStrip } from './formulaStrip';
import { playJobTag, playSupportFx } from './rosterFx';
import { SupportCard } from './supportCard';
import { playBeatSounds, UNIT_SOUND } from './unitSounds';
import { bossLesson, joinRewards, machineName, OverlayQueue, rewardRows, trayEarnText } from './flow';
import { hitFormula, type HitFormula } from '../core/hitFormula';
import { bigFinish, chainHoldMs, playChainLadder } from './fx/chainLadder';
import { PartReact } from './fx/partReact';
import { fitLine, soCloseText } from './fx/soClose';
export { localDate };

export const W = 720;
const CELL = 124;
/** A held piece floats this far above the pointer so it stays visible; targeting uses the piece, not the finger.
 *  Touch lifts higher (merge-flow audit: at 40 px the thumb still covered the piece and its target). */
const DRAG_LIFT = 40;
const DRAG_LIFT_TOUCH = 85;
/** A merging piece flies into its partner over this long; the merged gadget pops when it arrives. */
const MERGE_ARRIVE = 110;
const REDUCED_MOTION = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
/** Snap cue (held piece reaches a mergeable cell): at most one per this many ms. */
const SNAP_CUE_GAP = 120;
const BX = (W - CELL * COLS) / 2;
const SCRAP_X = W - 92;
/** Smallest tap height in design px: 44 pt on a 390 pt-wide phone (W = 720). */
const TAP_MIN = 82;
/** r38: player-facing durations are m:ss (ChatGPT review: never raw seconds on cards). */
/** Mix a 0xRRGGBB colour toward white by t (0..1). */
const lighten = (c: number, t: number) => [16, 8, 0].reduce((n, sh) => n | (Math.round(((c >> sh) & 255) + (255 - ((c >> sh) & 255)) * t) << sh), 0);
const mmss = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.round(sec % 60)).padStart(2, '0')}`;
/** r34: clock ring centre x (left of the HP bar); the machine counter mirrors it on the right. */
const CLOCK_X = 62;
/** r35 trophy figurines (ChatGPT spec): 3 mastery stars on one boss / mini-boss win its trophy; 4 stand by the machine. */
const TROPHY_AT = 3;
const TROPHY_SHELF = 4;
/** r38 Featured Unit Trial: free battles per day with today's unit at this level; opens after this many cleared levels. */
const TRIAL_BATTLES = 3;
const TRIAL_LEVEL = 5;
const TRIAL_UNLOCK = 6;
/** r36: the Screw Yard event opens after this many cleared levels. */
const YARD_UNLOCK = 4;
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
  // UI audit (375x667): the stage shrank to a thin strip; short layouts tighten the gaps around the board to give it back
  const t = H < 1380 ? 1 : 0;
  TRAY_Y = H - 66;
  BY = TRAY_Y - 58 + t * 8 - CELL * ROWS;
  EVENT_Y = BY - 34 + t * 2;
  HP_Y = EVENT_Y - 54 + t * 6;
  const top = 96 - t * 4;
  const avail = HP_Y - 34 + t * 10 - top;
  STAGE_H = Math.min(450, avail);
  STAGE_TOP = top + (avail - STAGE_H) / 2;
  TARGET_Y = STAGE_TOP + STAGE_H / 2 + 4;
  return H;
}


/** Which stage backdrop the Workshop preview shows: the previewed stage item, else the equipped one. */
const it0Stage = (preview: string | null, equipped: string | null) => (preview && CATALOG.find((x) => x.id === preview)?.slot === 'stage' ? preview : equipped);
/** Telegraph icon per attack (v17 boss icons + v19 mini-boss icons). */
const ATTACK_ICON: Record<BossAttack, string> = { clamp: 'btg_clamp', frost: 'btg_frost', suction: 'btg_suction', hot: 'btg_heat', rest: 'btg_rest', split: 'btg_split', bomb: 'btg_bomb', conveyor: 'btg_conveyor', mirror: 'btg_mirror', blocks: 'btg_blocks', pull: 'btg_pull', bounce: 'btg_bounce', slick: 'btg_slick', portals: 'btg_portals', tow: 'btg_tow', ransom: 'btg_ransom' };
/** Clarity pass 1: fixed badge slots, offsets from a cell's centre, so marks never sit on each other.
 *  TL = helper mark (Amplifier/Beacon boost, Battery charge; a second one drops to left-middle), top-centre = power-up,
 *  TR = boss/remix countdown (its icon just below, right-middle), BL = rank, BR = max-rank crown. */
const SLOT = { helper: { x: -38, y: -38 }, helper2: { x: -38, y: -2 }, item: { x: 0, y: -42 }, boss: { x: 38, y: -38 }, bossIcon: { x: 42, y: 2 }, rank: { x: -36, y: 36 }, crown: { x: 36, y: 40 } };
// clarity pass 2: every mark colour comes from PALETTE in core/marks.ts (one hue per meaning)
const AMP_COL = PALETTE.boost.hue, PRIME_COL = PALETTE.charge.hue, ITEM_COL = PALETTE.powerup.hue, ATTACK_COL = PALETTE.attack.hue, LOCK_COL = PALETTE.locked.hue, KICK_COL = PALETTE.kickback.hue, OD_COL = PALETTE.overdrive.hue;
type Gfx = Phaser.GameObjects.Graphics;
/** Battery CHARGED mark: green ring + lightning badge. k scales it (guide demos / legend / inspect icon). */
function drawPrimeMark(g: Gfx, x: number, y: number, a: number, k = 1, slot = SLOT.helper, ring = true) {
  const h = 54 * k;
  if (ring) g.lineStyle(5 * k, PRIME_COL, a).strokeRoundedRect(x - h, y - h, 2 * h, 2 * h, 22 * k);
  const bx = x + slot.x * k, by = y + slot.y * k;
  g.fillStyle(0x2b1d2e, 1).fillCircle(bx, by, 15 * k).fillStyle(PRIME_COL, 1).fillCircle(bx, by, 12 * k);
  g.fillStyle(0x2b1d2e, 1).fillTriangle(bx + 2 * k, by - 10 * k, bx - 6 * k, by + 2 * k, bx + k, by + 2 * k).fillTriangle(bx - k, by - 2 * k, bx + 6 * k, by - 2 * k, bx - 2 * k, by + 10 * k);
}
/** Amplifier / Signal Beacon BOOSTED mark: lavender ring + up-arrow badge. */
function drawAmpMark(g: Gfx, x: number, y: number, a: number, k = 1, slot = SLOT.helper, ring = true) {
  const h = 49 * k;
  if (ring) g.lineStyle(5 * k, AMP_COL, a).strokeRoundedRect(x - h, y - h, 2 * h, 2 * h, 20 * k);
  const bx = x + slot.x * k, by = y + slot.y * k;
  g.fillStyle(0x2b1d2e, 1).fillCircle(bx, by, 15 * k).fillStyle(AMP_COL, 1).fillCircle(bx, by, 12 * k);
  g.fillStyle(0x2b1d2e, 1).fillTriangle(bx, by - 9 * k, bx - 8 * k, by + k, bx + 8 * k, by + k).fillRect(bx - 3 * k, by, 6 * k, 9 * k);
}
/** Boss telegraph on a cell: dashed coral boundary (warning) or the attack's tinted fill (active). */
function drawBossCell(g: Gfx, x0: number, y0: number, sz: number, warn: boolean, pulse: number, tint: number) {
  const coral = ATTACK_COL;
  if (warn) {
    g.lineStyle(5, coral, pulse);
    for (let d = 0; d < sz; d += 22) {
      g.lineBetween(x0 + d, y0, Math.min(x0 + d + 12, x0 + sz), y0).lineBetween(x0 + d, y0 + sz, Math.min(x0 + d + 12, x0 + sz), y0 + sz);
      g.lineBetween(x0, y0 + d, x0, Math.min(y0 + d + 12, y0 + sz)).lineBetween(x0 + sz, y0 + d, x0 + sz, Math.min(y0 + d + 12, y0 + sz));
    }
  } else {
    g.fillStyle(tint, 0.55).fillRoundedRect(x0, y0, sz, sz, 16);
    g.lineStyle(6, coral, 1).strokeRoundedRect(x0, y0, sz, sz, 16).lineStyle(2, 0xfff0cf, 1).strokeRoundedRect(x0 + 4, y0 + 4, sz - 8, sz - 8, 13);
  }
}
const MACHINE_NAMES = ['CLANKZILLA', 'BOLT BUCKET', 'SIR SPARKS', 'THE CONTRAPTION', 'BIG BERTHA', 'JUNK JUNIOR', 'RUSTY 3000', 'MEGA MERGE'];
const cellXY = (idx: number) => ({ x: BX + (idx % COLS) * CELL + CELL / 2, y: BY + Math.floor(idx / COLS) * CELL + CELL / 2 });
const fmt = (n: number) => (n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e4 ? (n / 1e3).toFixed(1) + 'K' : Math.round(n).toLocaleString());
/** Phaser's setColor / setBackgroundColor / setPadding re-render the text texture even when nothing changed:
 *  per-frame HUD code calls these instead (phone performance). */
const textColor = (t: Phaser.GameObjects.Text, c: string) => (t.style.color === c ? t : t.setColor(c));
const textBg = (t: Phaser.GameObjects.Text, bg: string, px: number, py: number) => {
  if (t.style.backgroundColor !== bg) t.setBackgroundColor(bg);
  const p = t.padding;
  if (p.left !== px || p.right !== px || p.top !== py || p.bottom !== py) t.setPadding(px, py);
  return t;
};

// t-2c7cbae7 QA-only: mid-level chaos experiment preset, kept on this device only (not in the save / backup code)
const SPAM_KEY = 'omm_qa_spam_variant';
const spamVariant = (): SpamVariant => {
  try {
    const v = localStorage.getItem(SPAM_KEY);
    return SPAM_VARIANTS.some((x) => x.id === v) ? (v as SpamVariant) : 'off';
  } catch {
    return 'off';
  }
};
applySpamVariant(spamVariant());
// t-1bef1042 QA-only: PACE prototype (TODAY / CALM / MANIA), this device only; applied when a level starts
const qaPace = () => storedPace(() => localStorage.getItem(PACE_KEY));
applyPace(qaPace());
// t-9adea8b8 QA-only: SCREW YARD OLD (today's plates) / OBJECT (the turnable Screwdom-style object), this device only
const YARD_MODE_KEY = 'omm_qa_screw_yard';
const qaYardObject = () => {
  try {
    return localStorage.getItem(YARD_MODE_KEY) === 'object';
  } catch {
    return false;
  }
};
// t-a8c886ad / t-4a966cee QA-only: units option B, OFF / B0 (helpers copy, Mortar chain order, welders skip welders) /
// B1 (B0 + one direct job per helper, shared BOOSTED mark, Fuse Box reach)
const qaUnits = () => storedUnits(() => localStorage.getItem(UNITS_B0_KEY));
applyUnits(qaUnits());
// t-9b28a794 QA-only: roster B batch 1 (Nail Gun / Jackhammer / Gear / Saw Blade in collection, crates and squads)
const qaRoster1 = () => storedRoster1(() => localStorage.getItem(ROSTER1_KEY));
applyRoster1(qaRoster1());
// t-1effe0bf QA-only: MERGE RULE prototype (TODAY / +2 / +1 BONUS sandwich), this device only; applied when a level starts
const qaMergeRule = () => storedMergeRule(() => localStorage.getItem(MERGE_RULE_KEY));
applyMergeRule(qaMergeRule());
// t-4208f149 QA-only: THINK BANK prototype (a still board pauses the level clock after a grace), applied when a level starts
const qaThinkBank = () => storedThinkBank(() => localStorage.getItem(THINK_BANK_KEY));
applyThinkBank(qaThinkBank());

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
  /** r34 onboarding: the clock lives beside the HP bar (where the eyes are), as a draining ring; machine counter on the right. */
  clockRing!: Phaser.GameObjects.Graphics;
  stagePips!: Phaser.GameObjects.Text;
  /** r45: puzzles name the number on the ring (the owner didn't know what it counted). */
  mergesLeftLabel!: Phaser.GameObjects.Text;
  lastSec = -1;
  starChase: Phaser.GameObjects.Text | null = null;
  shieldChip: Phaser.GameObjects.Text | null = null;
  /** time.now until which a banner_chain banner sits over the top HUD row (the chips fade out under it). */
  bannerUntil = 0;
  shieldG!: Phaser.GameObjects.Graphics;
  odGauge!: Phaser.GameObjects.Graphics;
  boltIcon?: Phaser.GameObjects.Image;
  odLabel?: Phaser.GameObjects.Text;
  flames: Phaser.GameObjects.Image[] = [];
  face!: Phaser.GameObjects.Image;
  faceUntil = 0;
  odGlow!: Phaser.GameObjects.Graphics;
  overlayG!: Phaser.GameObjects.Graphics;
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
  maniaBadge: Phaser.GameObjects.Text | null = null;
  thinkBadge: Phaser.GameObjects.Text | null = null;
  modal: Phaser.GameObjects.Container | null = null;
  /** r43: this attempt's command log (best-chain replay on the results screen). */
  runLog: RunLog = newRunLog();
  /** r46: the best run to race on a replay of a beaten level (null = no pace line). */
  paceGhost: PaceCurve | null = null;
  paceText: Phaser.GameObjects.Text | null = null;
  paceG: Phaser.GameObjects.Graphics | null = null;
  paceShownAt = -1;
  linkG!: Phaser.GameObjects.Graphics;
  sparks!: Phaser.GameObjects.Particles.ParticleEmitter;
  chunks!: Phaser.GameObjects.Particles.ParticleEmitter;
  passiveAcc = 0;
  passiveTimer = 0;
  idleTime = 0;
  hintPair: [number, number] | null = null;
  lastSave = 0;
  /** Home is showing: the state behind it is a leftover, not a run to save. */
  homeIdle = false;
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
    // r29: heavy boss / cast / stage art streams in after the first frame; refresh whatever is on screen when it lands
    this.time.delayedCall(50, () =>
      loadLazyArt(this, Math.ceil(this.currentLevel() / 10), () => {
        if (this.s?.level !== undefined && this.s.phase === 'playing') this.setTargetTexture();
      }),
    );
    const qp0 = new URLSearchParams(location.search); // read before ?reset strips the URL
    if (qp0.has('reset')) {
      store(SAVE_KEY, null);
      store(META_KEY, null);
      history.replaceState(null, '', location.pathname);
    }
    this.meta = loadMeta();
    // r32: the collection starts with the core trio; units the saga already introduced stay owned for old saves
    {
      const m = this.meta;
      if (!m.units) {
        m.units = {};
        const lvDone = Object.keys(m.levelStars ?? {}).length;
        const met: Record<string, number> = { rocket: 6, magnet: 12, battery: 17, fan: 23 };
        for (const u of UNITS) if (STARTER_UNITS.includes(u.id) || (met[u.id] && lvDone >= met[u.id]) || u.id in (m.toys ?? {})) m.units[u.id] = { level: 1, cards: 0 };
        if (lvDone > 1) m.crates = { ...(m.crates ?? {}), iron: (m.crates?.iron ?? 0) + 1 }; // welcome gift for existing players
        m.gems = m.gems ?? 0;
      }
      for (const f of STARTER_UNITS) if (!m.units[f]) m.units[f] = { level: 1, cards: 0 }; // r32: Fan joined the starters
      // t-2fd7bb86: saves from before staggered unlocks keep every feature they already had
      migrateUnlocks(m, this.currentLevel() - 1);
      refreshUnlocks(m, this.currentLevel() - 1);
    }
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
    // a finished run, a level or upgrade this build no longer has: never resumed (resumable() repairs or drops it)
    const loaded = saved ? resumable(deserialize(saved), LEVELS.length) : null;
    const pz = loaded?.puzzle ? this.findPuzzle(loaded.puzzle.id) : null;
    if (saved && (!loaded || (loaded.puzzle && !pz))) store(SAVE_KEY, null);
    if (loaded && (!loaded.puzzle || pz)) {
      this.tutorialShort = !this.meta.tutorialDone; // a reloaded first-launch warm-up stays the one-merge warm-up
      // a reloaded puzzle starts its board fresh: the merges played (HINT / NEXT MOVE need them) are not in the save
      if (pz) this.startPuzzle(pz.def, pz.kind);
      else this.startState(loaded);
    } else {
      this.tutorialShort = !this.meta.tutorialDone;
      this.startState(newGame(Date.now() >>> 0, !this.meta.tutorialDone));
      if (this.meta.tutorialDone) this.openTitle();
    }

    this.input.on('pointerdown', this.onDown, this);
    this.input.on('pointermove', this.onMove, this);
    this.input.on('pointerup', this.onUp, this);
    this.input.on('pointerupoutside', this.onUp, this);
    // no cancel on 'gameout': a finger that slides off the canvas (safe-area insets, a scrap overshoot) and comes back,
    // or lets go out there, still lands where its piece was last shown
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        stopMusic();
        this.save();
        tlog.flush();
        this.cancelDrag();
      }
      this.freeStalePointers(); // a touch held while the app went away never gets its touchend
      this.acc = 0;
    });
    // a touch whose touchend never came would keep Phaser's only touch slot busy and every later touch would be
    // ignored: free it before Phaser sees the next touchstart (window capture runs before the canvas listener)
    window.addEventListener('touchstart', (e) => this.freeStalePointers(new Set(Array.from(e.touches, (t) => t.identifier))), { capture: true, passive: true });
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
    this.steadyText = this.add.text(544, 72, 'STEADY', { fontFamily: 'Arial Black', fontSize: '14px', color: '#3b2533' }).setOrigin(0, 0.5).setVisible(false);
    if (this.hasArt('icon_bolt')) this.boltIcon = this.add.image(0, 46, 'icon_bolt').setDisplaySize(40, 40);
    // F8: the lightning meter is Overdrive, not the Bolts currency: it carries its own caption
    this.odLabel = this.add.text(384 + 77, 70, OD_LABEL, { fontFamily: 'Arial Black', fontSize: '12px', color: '#8a5a2a' }).setOrigin(0.5).setVisible(false);
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
    this.clockRing = this.add.graphics().setDepth(3);
    this.timerText.setPosition(CLOCK_X, HP_Y + 1).setOrigin(0.5).setFontSize(27).setDepth(4);
    this.stagePips = this.add.text(W - CLOCK_X, HP_Y, '', { fontFamily: 'Lilita One, Arial Black', fontSize: '30px', color: '#fff0cf', stroke: '#2b1d2e', strokeThickness: 6, align: 'center', lineSpacing: -6 }).setOrigin(0.5).setDepth(4);
    // 390x844 QA: 20px read as tiny; now two centred lines sitting on top of the merges-left ring
    this.mergesLeftLabel = this.add.text(CLOCK_X, HP_Y - 52, 'MERGES\nLEFT', { fontFamily: 'Lilita One, Arial Black', fontSize: '28px', color: '#fff0cf', stroke: '#2b1d2e', strokeThickness: 6, align: 'center', lineSpacing: -8 }).setOrigin(0.5, 1).setDepth(4).setVisible(false);

    // event lane (single place for chain results / warnings, never over the HP bar or gadgets)
    this.laneBg = this.hasArt('ui_ribbon') ? this.add.image(W / 2, EVENT_Y, 'ui_ribbon').setDisplaySize(640, 56) : this.add.rectangle(W / 2, EVENT_Y, 640, 50, 0x2a2233, 0.85);
    this.laneBg.setDepth(20).setAlpha(0);
    this.laneText = this.add.text(W / 2, EVENT_Y, '', { fontFamily: 'Lilita One, Arial Black', fontSize: '28px', color: '#fff0cf' }).setOrigin(0.5).setDepth(21).setAlpha(0);
    this.formula = new FormulaStrip(this, W / 2, () => EVENT_Y, () => HP_Y - 50, REDUCED_MOTION);
    // t-e91097cd roster B: the off-board Support card (hidden unless the run has one)
    this.support = new SupportCard(this, 82, () => STAGE_TOP + STAGE_H - 84, (x, y) => this.cellAt(x, y), (cell, axis) => {
      const r = recordCommand(this.runLog, this.s, { k: 'support', cell, axis: axis === 'col' ? 1 : 0 });
      if (r.ok) this.handleEvents(r.events);
      return r.ok;
    }, (msg, color) => this.showEvent(msg, color ?? '#fff0cf', 2200));

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
  steadyText!: Phaser.GameObjects.Text;
  /** Best rank created this run per family (merges + Kickback fuses) — the machine shown on the result screen. */
  runBest: Partial<Record<Family, number>> = {};
  noteRank(fam: Family, rank: number) {
    this.runBest[fam] = Math.max(this.runBest[fam] ?? 0, rank);
  }

  startState(s: GameState) {
    this.runBest = {};
    this.homeIdle = false;
    s.unitMult = Object.fromEntries(Object.entries(this.meta.units ?? {}).map(([k, v]) => [k, levelMult(unitDef(k), v.level)]));
    s.unitLevel = Object.fromEntries(Object.entries(this.meta.units ?? {}).map(([k, v]) => [k, v.level]));
    if (this.homeC?.active) this.homeC.destroy();
    this.homeC = null;
    this.closeModal();
    if (s.elapsed === 0 && s.stats.merges === 0) tlog.newRun({ mode: s.hard ? 'challenge' : s.phase === 'tutorial' ? 'tutorial' : s.practice ? 'practice' : 'normal', toys: s.toys, seed: s.seed });
    for (const v of this.views.values()) v.destroy();
    this.views.clear();
    this.s = s;
    this.runLog = newRunLog();
    const ghost = s.level !== undefined && levelProgress(s) !== null && (this.meta.levelStars?.[String(s.level)] ?? 0) > 0 ? this.meta.levelPace?.[String(s.level)] : undefined;
    this.paceGhost = ghost && decodeCurve(ghost) ? ghost : null; // a broken saved curve = no ghost (not a frozen "on pace")
    this.paceShownAt = -1;
    this.pulledIds.clear();
    this.acc = 0;
    this.heldQueue = []; // cards still waiting for a finger-up belong to the previous run
    if (!this.explaining) this.explainQueue = [];
    this.tipLedger = newTipLedger(s.level !== undefined && !s.puzzle ? s.level : undefined);
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
    if (!g) return this.openCellCard(idx);
    this.closeInspect();
    const info = FAMILY_INFO[g.family as keyof typeof FAMILY_INFO];
    if (!info) return;
    sfx.click();
    tlog.log('inspect', { fam: g.family, rank: g.rank });
    this.paused = true;
    const cw = W - 60, ch0 = 330;
    const L = -cw / 2 + 30;
    // clarity pass 1: MARKS row (every state on this part, icon + one sentence) and what a merge right now does with them
    const { marks, mergeNow } = inspectMarks(this.s, idx);
    const markRows = marks.map((m) => ({ m, t: this.add.text(0, 0, `${m.label}: ${m.text}`, { fontFamily: 'Arial', fontStyle: 'bold', fontSize: '21px', color: '#3b2533', wordWrap: { width: cw - 110 }, lineSpacing: 2 }).setOrigin(0, 0.5) }));
    const nowT = mergeNow ? this.add.text(0, 0, mergeNow, { fontFamily: 'Arial', fontStyle: 'bold', fontSize: '21px', color: '#b06a1a', wordWrap: { width: cw - 210 }, lineSpacing: 2 }).setOrigin(0, 0.5) : null;
    const rowH = (t: Phaser.GameObjects.Text) => Math.max(40, t.height + 8);
    const extra = marks.length ? 30 + markRows.reduce((n, r) => n + rowH(r.t), 0) + Math.max(56, (nowT?.height ?? 0) + 20) : 0;
    const ch = ch0 + extra;
    let cy = Math.max(STAGE_TOP + ch / 2 + 6, HP_Y - ch / 2 - 10);
    // a taller card must not hide the part it is about: drop it below that part instead
    const py = cellXY(idx).y;
    if (cy + ch / 2 > py - CELL / 2) cy = Math.min(H - ch / 2 - 10, py + CELL / 2 + 8 + ch / 2);
    const c = this.add.container(W / 2, cy).setDepth(96);
    const bg = this.add.graphics().fillStyle(0x2b1d2e, 1).fillRoundedRect(-cw / 2, -ch / 2, cw, ch, 26).fillStyle(0xfbe7c6, 1).fillRoundedRect(-cw / 2 + 5, -ch / 2 + 5, cw - 10, ch - 10, 22);
    c.add(bg);
    if (marks.length) {
      let y = -ch / 2 + ch0 - 14;
      c.add(this.add.graphics().lineStyle(2, 0xd8b88a, 1).lineBetween(L, y, cw / 2 - 30, y));
      c.add(this.add.text(L, y + 16, 'MARKS', { fontFamily: 'Lilita One, Arial Black', fontSize: '22px', color: '#8a6a4a' }).setOrigin(0, 0.5));
      y += 30;
      for (const { m, t } of markRows) {
        const h = rowH(t);
        c.add(this.markIcon(m, L + 16, y + h / 2, 34));
        c.add(t.setPosition(L + 44, y + h / 2));
        y += h;
      }
      if (nowT) c.add(nowT.setOrigin(0, 1).setPosition(L, ch / 2 - 14));
    }
    const role = info.role.toLowerCase();
    // UI audit: the SHOOTER role icon is a rocket, so Cannon's card showed a Rocket; the header shows the part itself
    if (this.textures.exists(`${g.family}_${g.rank}`)) c.add(this.fitVisible(this.add.image(L + 30, -ch / 2 + 50, `${g.family}_${g.rank}`), 60));
    else if (this.hasArt(`role_${role}`)) {
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
    c.add(this.add.text(L, -ch / 2 + ch0 - 110, dmg, { fontFamily: 'Lilita One, Arial Black', fontSize: '25px', color: '#e8452c' }));
    // wraps short of the CLOSE button (UI audit: long tips ran under it and were cut off)
    c.add(this.add.text(L, -ch / 2 + ch0 - 72, `Try: ${info.tryThis}`, { fontFamily: 'Arial', fontStyle: 'italic bold', fontSize: '21px', color: '#6e5646', wordWrap: { width: cw - 230 } }));
    // reach diagram: 5x5 mini board centred on this gadget
    const mc = 30, ox = cw / 2 - 30 - mc * 5, oy = -ch / 2 + 86;
    const dg = this.add.graphics();
    const reach = new Set(isRelay(g.family) ? routeCells(idx, g.family, g.rank, this.s.perks) : []);
    const r0 = Math.floor(idx / COLS), c0 = idx % COLS;
    for (let dr = -2; dr <= 2; dr++)
      for (let dc = -2; dc <= 2; dc++) {
        const rr = r0 + dr, cc = c0 + dc;
        const x = ox + (dc + 2) * mc, y = oy + (dr + 2) * mc;
        const insideB = rr >= 0 && rr < ROWS && cc >= 0 && cc < COLS;
        const cell = rr * COLS + cc;
        // reach in the machine's own colour (pale), not gold: gold is the MAX crown's
        const inReach = reach.has(cell) || (g.family === 'bell' && dr === 0);
        const col = !insideB ? 0xe8d8b8 : dr === 0 && dc === 0 ? info.color : 0xffffff;
        dg.fillStyle(col, insideB ? 1 : 0.4).fillRoundedRect(x + 2, y + 2, mc - 4, mc - 4, 5);
        if (insideB && inReach && (dr || dc)) dg.fillStyle(info.color, 0.5).fillRoundedRect(x + 2, y + 2, mc - 4, mc - 4, 5);
      }
    c.add(dg);
    if (g.family === 'cannon') c.add(this.add.text(ox + mc * 2.5, oy - 4, '\u2191 monster', { fontFamily: 'Lilita One, Arial Black', fontSize: '18px', color: '#e8452c' }).setOrigin(0.5, 1));
    const x = this.add.text(cw / 2 - 26, ch / 2 - 30, 'CLOSE', { fontFamily: 'Lilita One, Arial Black', fontSize: '24px', color: '#ffffff', backgroundColor: '#27a4c0', padding: { x: 14, y: 8 } }).setOrigin(1, 0.5);
    c.add(x);
    c.setAlpha(0).setScale(0.92);
    this.tweens.add({ targets: c, alpha: 1, scale: 1, duration: 160, ease: 'Back.Out' });
    // ring the inspected gadget so the card is clearly about IT
    const { x: gx, y: gy } = cellXY(idx);
    const ring = this.add.graphics().setDepth(95).lineStyle(10, 0x2b1d2e, 0.8).strokeCircle(gx, gy, 62).lineStyle(6, PALETTE.merge.hue, 1).strokeCircle(gx, gy, 62);
    c.setData('ring', ring);
    this.inspectC = c;
  }

  /** Clarity pass 3: an empty cell that carries something (junk block, closed corner, boss / remix target, a falling
   *  loose part) explains itself on tap with the same MARKS rows as the inspect card. Plain empty cells do nothing. */
  openCellCard(idx: number) {
    const { marks } = inspectMarks(this.s, idx);
    if (!marks.length) return;
    this.closeInspect();
    sfx.click();
    tlog.log('inspect_cell', { keys: marks.map((m) => m.key).join(',') });
    this.paused = true;
    const cw = W - 60, L = -cw / 2 + 30;
    const rows = marks.map((m) => ({ m, t: this.add.text(0, 0, `${m.label}: ${m.text}`, { fontFamily: 'Arial', fontStyle: 'bold', fontSize: '23px', color: '#3b2533', wordWrap: { width: cw - 110 }, lineSpacing: 2 }).setOrigin(0, 0.5) }));
    const rowH = (t: Phaser.GameObjects.Text) => Math.max(48, t.height + 12);
    const ch = 96 + rows.reduce((n, r) => n + rowH(r.t), 0) + 64;
    const py = cellXY(idx).y;
    // above the cell when it fits, else below it: never over the cell it is about
    const cy = py - CELL / 2 - 8 - ch / 2 > STAGE_TOP ? py - CELL / 2 - 8 - ch / 2 : Math.min(H - ch / 2 - 10, py + CELL / 2 + 8 + ch / 2);
    const c = this.add.container(W / 2, cy).setDepth(96);
    c.add(this.add.graphics().fillStyle(0x2b1d2e, 1).fillRoundedRect(-cw / 2, -ch / 2, cw, ch, 26).fillStyle(0xfbe7c6, 1).fillRoundedRect(-cw / 2 + 5, -ch / 2 + 5, cw - 10, ch - 10, 22));
    c.add(this.add.text(L, -ch / 2 + 48, 'THIS CELL', { fontFamily: 'Lilita One, Arial Black', fontSize: '34px', color: '#3b2533' }).setOrigin(0, 0.5));
    let y = -ch / 2 + 90;
    for (const { m, t } of rows) {
      const h = rowH(t);
      c.add(this.markIcon(m, L + 16, y + h / 2, 34));
      c.add(t.setPosition(L + 44, y + h / 2));
      y += h;
    }
    c.add(this.add.text(cw / 2 - 26, ch / 2 - 34, 'CLOSE', { fontFamily: 'Lilita One, Arial Black', fontSize: '24px', color: '#ffffff', backgroundColor: '#27a4c0', padding: { x: 14, y: 8 } }).setOrigin(1, 0.5));
    c.setAlpha(0).setScale(0.92);
    this.tweens.add({ targets: c, alpha: 1, scale: 1, duration: 160, ease: 'Back.Out' });
    const { x: gx, y: gy } = cellXY(idx);
    c.setData('ring', this.add.graphics().setDepth(95).lineStyle(10, 0x2b1d2e, 0.8).strokeCircle(gx, gy, 62).lineStyle(6, PALETTE.merge.hue, 1).strokeCircle(gx, gy, 62));
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

  /** Small icon for a board mark, drawn with the same code / art as on the board (inspect card rows). */
  markIcon(m: MarkLine, x: number, y: number, size: number): Phaser.GameObjects.GameObject {
    const img = (key: string) => {
      const im = this.add.image(x, y, key);
      return im.setScale(size / Math.max(im.width, im.height));
    };
    const k = size / 30, centre = { x: 0, y: 0 };
    if (m.key === 'amp' || m.key === 'prime') {
      const g = this.add.graphics();
      (m.key === 'amp' ? drawAmpMark : drawPrimeMark)(g, x, y, 1, k, centre, false);
      return g;
    }
    if (m.key === 'item' && m.item && this.textures.exists(`item_badge_${m.item}`)) return img(`item_badge_${m.item}`);
    if (m.key === 'cap' && this.hasArt('crown')) return img('crown');
    if (m.key === 'junk' && this.hasArt('prop_junk_block')) return img('prop_junk_block');
    if (m.key === 'blocked' || m.key === 'kick') {
      // same shapes as the board: the closed corner's X, the loose part's landing ring
      const g = this.add.graphics(), h = size / 2;
      if (m.key === 'blocked') g.fillStyle(0x2b1d2e, 0.85).fillRoundedRect(x - h, y - h, size, size, 8).lineStyle(4, 0x8a6a4a, 1).lineBetween(x - h + 7, y - h + 7, x + h - 7, y + h - 7).lineBetween(x + h - 7, y - h + 7, x - h + 7, y + h - 7);
      else g.fillStyle(KICK_COL, 0.25).fillCircle(x, y, h - 2).lineStyle(4, KICK_COL, 1).strokeCircle(x, y, h - 2);
      return g;
    }
    const remixIcon = { vacuum: 'tg_vacuum', twins: 'tg_twins' }[m.attack as string] ?? 'tg_piano';
    const key = m.key === 'boss' ? ATTACK_ICON[m.attack as BossAttack] : m.key === 'remix' || m.key === 'lock' ? remixIcon : '';
    if (key && this.hasArt(key)) return img(key);
    const col = m.key === 'boss' ? ATTACK_TINT[m.attack as BossAttack] : PALETTE[MARK_MEANING[m.key]].hue;
    return this.add.graphics().fillStyle(0x2b1d2e, 1).fillCircle(x, y, size / 2).fillStyle(col, 1).fillCircle(x, y, size / 2 - 4);
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
        this.introObjs.push(this.bossNameCard());
        this.time.delayedCall(1300, () => this.showEvent('BUILD YOUR MACHINE!', '#ffd24a', 1400));
        return;
      }
      const label = this.s.puzzle ? `WIN IN ${mergesText(this.s.puzzle.moves).toUpperCase()}` : this.s.level !== undefined ? `${this.s.endless ? `FLOOR ${this.s.endless}` : `LEVEL ${this.s.level}`}  ·  ${this.stageCount() ? `${this.stageCount()!.n} MACHINES` : this.monName()}` : this.s.daily ? `DAILY BENCH  ·  ${TARGET_NAMES[Math.max(0, this.s.target)]}` : this.s.remix ? TARGET_NAMES[this.s.target] : `ROUND 1  ·  ${TARGET_NAMES[Math.max(0, this.s.target)]}`;
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
        this.admitTip(`new_${fam}`, 1, true); // the guide page is this level's start card
        this.meta.tips[`new_${fam}`] = true;
        store(META_KEY, JSON.stringify(this.meta));
        this.openHowTo(pageIdx, undefined, true);
      } else if (this.realBoss && !BOSSES[this.realBoss.def].mini)
        // clarity pass 3: the two armor marks on a chapter boss's HP bar
        this.explain('xb_armor', [{ text: 'The 2 marks on the boss HP bar\nare its ARMOR. Break one and\nits attacks get stronger.', spots: [{ x: W / 2 - 220 + 440 * 0.66, y: HP_Y, r: 44 }, { x: W / 2 - 220 + 440 * 0.33, y: HP_Y, r: 44 }] }]);
      else if (tdef.level >= 4 && !this.realBoss) this.explain('tap_hint', [{ text: 'Tip: TAP any machine to see what it does.\nAll machines: Pause > Machine guide.', spots: [] }]);
      // r37: the first stage explains its HUD once (clock ring left, machine counter right), before anything moves
      if (this.s.stage && !this.meta.tips.stage_hud)
        this.explain('stage_hud', [
          { text: stageHudText(this.s.stage), spots: [{ x: CLOCK_X, y: HP_Y, r: 60 }, { x: W - CLOCK_X, y: HP_Y, r: 60 }], y: BY + CELL * 2 },
        ]);
    } else {
      // walkthrough 3: the first Challenge / Remix opens with one card (clock paused, once per mode, modeIntro.ts)
      const mi = modeIntroFor(this.s);
      if (mi) this.explain(mi, [{ text: MODE_INTRO[mi], spots: [{ x: SCRAP_X, y: TRAY_Y, r: 70 }] }]);
    }
    tlog.log('intro_end', { skipped });
  }

  targetY = 0;
  setTargetTexture() {
    const ti = this.stageClassic() ?? this.s.target;
    // r33 stages: damaged art follows the current machine's own HP
    const hurt = this.s.stage ? !this.s.goal && this.s.hp <= this.s.maxHp / 2 : this.s.thresholds >= 2;
    let key = this.s.target < 0 ? 'demo_can' : `target_${ti}${hurt && this.hasArt(`target_${ti}_dmg`) ? '_dmg' : ''}`;
    const cast = this.castOf(this.s.level);
    if (cast && !this.realBoss) key = hurt && this.hasArt(`mon_${cast}_dmg`) ? `mon_${cast}_dmg` : `mon_${cast}`;
    const b = this.realBoss;
    if (b) {
      const bk = `boss_${BOSSES[b.def].id}_${['intact', 'cracked', 'critical'][bossPhase(this.s.hp, this.s.maxHp)]}`;
      if (this.hasArt(bk)) key = bk;
    }
    this.target.setTexture(key);
    // remix opponents reuse the three backdrops (alley / kitchen / junkyard)
    // r28: each chapter has its own backdrop when the art exists (stage_ch1..6), else the three classic stages
    const chk = this.s.level !== undefined ? `stage_ch${Math.ceil(this.s.level / 10)}` : '';
    const sk = chk && this.hasArt(chk) ? chk : `stage_${Math.max(0, this.s.target) % 3}`;
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
    const coral = ATTACK_COL;
    const hit = (cx: number, ry: number) =>
      atk === 'frost' || atk === 'rest' || atk === 'conveyor' ? ry === 0 : atk === 'hot' ? cx === 2 : atk === 'clamp' || atk === 'suction' ? cx === 1 && ry === 0
      : atk === 'bomb' ? cx === 2 && ry === 1 : atk === 'mirror' ? (cx === 0 && ry === 0) || (cx === 4 && ry === 1) : atk === 'blocks' ? (cx === 2 || cx === 4) && ry === 1
      : atk === 'pull' ? cx === 3 && ry <= 1 : atk === 'bounce' ? (cx === 1 && ry === 1) || (cx === 4 && ry === 0)
      : atk === 'slick' ? cx === 2 && ry === 1 : atk === 'portals' ? (cx === 0 && ry === 0) || (cx === 4 && ry === 1) : atk === 'tow' ? (cx === 1 || cx === 2) && ry === 0 : atk === 'ransom' ? (cx === 0 && ry === 0) || (cx === 3 && ry === 1) : false;
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
    // big rank badge (playtest: ranks were hard to tell apart), bottom-left slot
    const BX0 = SLOT.rank.x, BY0 = SLOT.rank.y;
    const badgeArt = this.hasArt(`badge_${g.family}`) ? this.add.image(BX0, BY0, `badge_${g.family}`).setDisplaySize(58, 58) : null;
    if (!badgeArt) badge.fillStyle(0x2b1d2e, 1).fillCircle(BX0, BY0, 26).fillStyle(col, 1).fillCircle(BX0, BY0, 21);
    const label = String(g.rank); // r17: the numeral always shows; the crown alone marks the cap
    let t = this.add.text(BX0, BY0 - 1, label, { fontFamily: 'Lilita One, Arial Black', fontSize: '34px', color: '#ffffff', stroke: '#2b1d2e', strokeThickness: 7 }).setOrigin(0.5);
    let parts: Phaser.GameObjects.GameObject[] = badgeArt ? [img, badge, badgeArt, t] : [img, badge, t];
    if (this.hasArt(`dice_${g.rank}`)) {
      // ChatGPT round 8 neutral plate (same for every family), bottom-left slot. UI audit: the dice pips smeared at ranks 5-8
      // and the plate hung over the cell below, so it is now numeral-only and sits fully inside the cell.
      t.destroy();
      badgeArt?.destroy();
      badge.clear();
      const pw = 46, ph = 40, px = BX0 - pw / 2, py = BY0 - ph / 2 - 2;
      badge.fillStyle(0x3a2030, 1).fillRoundedRect(px - 3, py - 3, pw + 6, ph + 6, 12);
      badge.fillStyle(0xc99a3a, 1).fillRoundedRect(px - 1, py - 1, pw + 2, ph + 2, 10);
      badge.fillStyle(0xfdf3dc, 1).fillRoundedRect(px + 2, py + 2, pw - 4, ph - 4, 8);
      t = this.add.text(BX0, BY0 - 2, String(g.rank), { fontFamily: 'Lilita One, Arial Black', fontSize: '34px', color: '#2a2233' }).setOrigin(0.5);
      parts = [img, badge, t];
    }
    t.setName('rank');
    if (g.rank >= capOf(this.s, g.family) && this.hasArt('crown')) {
      const cr = this.add.image(SLOT.crown.x, SLOT.crown.y, 'crown');
      cr.setScale(Math.min(48 / cr.width, 48 / cr.height)).setAngle(15);
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
  /** r38: scale + centre an image by its VISIBLE pixels (v22 sprites sit on a padded 256 canvas). */
  fitVisible(img: Phaser.GameObjects.Image, size: number) {
    const b = this.visBounds(img.texture.key);
    img.setScale(size / Math.max(b.w, b.h));
    img.setOrigin((b.x + b.w / 2) / img.width, (b.y + b.h / 2) / img.height);
    return img;
  }

  fitSprite(img: Phaser.GameObjects.Image) {
    const b = this.visBounds(img.texture.key);
    img.setScale(Math.min((CELL * 0.76) / b.h, (CELL * 0.84) / b.w));
    img.setOrigin((b.x + b.w / 2) / img.width, (b.y + b.h) / img.height);
    img.setPosition(0, CELL * 0.38);
  }

  /** Landing squash: quick flatten then springy settle. */
  squash(v: Phaser.GameObjects.Container) {
    if (!v.active) return;
    if (REDUCED_MOTION) {
      v.setScale(1);
      return;
    }
    v.setScale(1.06, 0.94);
    this.tweens.add({ targets: v, scaleX: 1, scaleY: 1, duration: 135, ease: 'Sine.Out' });
  }

  /** Make sprites match the model grid. */
  reconcile(instant = false, spawnFrom?: Map<number, { x: number; y: number }>, mergeInto?: { x: number; y: number }) {
    this.boardVer++;
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
      if (v === this.dragView) this.cancelDrag();
      this.tweens.killTweensOf(v);
      if (mergeInto) this.tweens.add({ targets: v, x: mergeInto.x, y: mergeInto.y, scale: REDUCED_MOTION ? v.scale : 0.6, alpha: 0, duration: MERGE_ARRIVE, onComplete: () => v.destroy() });
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

  /** Open to the right and below: nothing lies past the zone there, so an overshoot (even off the canvas) still scraps. */
  overScrap(x: number, y: number) {
    return x - SCRAP_X > -70 && y - TRAY_Y > -50;
  }
  /** The SCRAP zone is on screen (not in levels 1-3, puzzles or the tutorial). */
  scrapShown() {
    const s = this.s;
    return s.phase !== 'tutorial' && !s.puzzle && !(s.level !== undefined && s.level < 4);
  }
  /** r28: the cast character drawn for a level (only when its art exists). */
  castOf(level?: number) {
    const sv = level !== undefined && level === this.s?.level ? this.stageVis() : undefined;
    const v = sv ?? (level !== undefined ? LEVELS[level - 1]?.visual : undefined);
    return v && CAST[v] && this.hasArt(`mon_${v}`) ? v : undefined;
  }
  /** r33: the current machine's visual id in a stage (cast id or classic monster name). */
  stageVis() {
    const st = this.s?.stage;
    return st ? st.visuals[Math.min(st.i, st.visuals.length - 1)] : undefined;
  }
  /** r33: classic-monster index for the current stage machine, when it is one. */
  stageClassic() {
    const v = this.stageVis();
    return v && !CAST[v] && MONSTER_INDEX[v] !== undefined ? MONSTER_INDEX[v] : undefined;
  }
  /** r33: machines in this stage (HP machines + the goal machine) and which one is up (1-based). */
  stageCount() {
    const st = this.s.stage;
    return st ? { n: st.hps.length + (st.goal ? 1 : 0), at: st.i + 1, goal: st.i >= st.hps.length } : undefined;
  }
  monName(short = false) {
    const lv = this.s.level;
    const vis = this.stageVis() ?? (lv !== undefined ? LEVELS[lv - 1]?.visual : undefined);
    return machineName(vis, this.s.target, (v) => this.hasArt(`mon_${v}`), short);
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
    if (this.support?.onDown(p, this.s)) return;
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
    // clarity pass 3: junk blocks, closed corners and marked empty cells explain themselves on tap
    if (idx >= 0 && !this.s.grid[idx] && this.s.phase === 'playing') this.openCellCard(idx);
    if (idx < 0 || !this.s.grid[idx]) return;
    if (bossBlocked(this.s.boss).noDrag.has(idx)) {
      // r23: a clamped machine explains itself when touched
      const v = this.views.get(this.s.grid[idx]!.id);
      if (v) {
        const c = this.restPart(v, idx);
        this.tweens.add({ targets: v, x: c.x + 8, duration: 50, yoyo: true, repeat: 3 });
      }
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
      this.lift = p.wasTouch ? DRAG_LIFT_TOUCH : DRAG_LIFT;
      sfx.pickup();
      haptic(5); // light lift tick
      this.dragView.setDepth(55).setVisible(true);
      this.tweens.killTweensOf(this.dragView);
      this.tweens.add({ targets: this.dragView, scale: 1.08, duration: 75, ease: 'Cubic.Out' });
      // the piece starts where it was grabbed and glides up above the finger (no jump)
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
      // snap cue: one soft tick + tap as the piece reaches a NEW cell it can merge with (never for empty/mismatch cells)
      if (this.mergeHighlighted() && this.time.now - this.snapAt >= SNAP_CUE_GAP) {
        this.snapAt = this.time.now;
        this.snapCues++;
        sfx.snap();
        haptic(6);
      }
      this.drawHeld();
    }
    const over = this.heldOverScrap(p);
    if (over !== (this.scrapHold > 0 || this.overScrapFlag)) {
      this.overScrapFlag = over;
      this.scrapHold = 0;
    }
  }
  /** SCRAP test for a held piece: the zone keeps its place relative to the PIECE whatever the lift, so a higher
   *  touch lift never turns a drop on the bottom-right cell into a scrap. Only where the zone is shown, and a
   *  highlighted merge always wins over it. */
  heldOverScrap(p: Phaser.Input.Pointer) {
    return this.scrapShown() && !this.mergeHighlighted() && this.overScrap(p.worldX, p.worldY - (this.lift - DRAG_LIFT));
  }
  /** The held piece is over a cell it can merge with (that cell wears the merge highlight). */
  mergeHighlighted() {
    const a = this.dragIdx >= 0 ? this.s.grid[this.dragIdx] : null;
    const b = this.hoverIdx >= 0 && this.hoverIdx !== this.dragIdx ? this.s.grid[this.hoverIdx] : null;
    return !!a && !!b && canMerge(a, b, this.s);
  }
  overScrapFlag = false;
  snapAt = -1e9;
  /** Snap cues played (read by tools/touch-test.mjs). */
  snapCues = 0;
  dragShadow?: Phaser.GameObjects.Ellipse;
  grabOff = { x: 0, y: 0 };
  liftAt = 0;
  lift = DRAG_LIFT;
  /** Held piece position: eases from the grab point to `lift` above the finger over 90ms (cubic-out). */
  placeDrag(p: Phaser.Input.Pointer) {
    if (!this.dragView) return;
    const t = Math.min(1, (this.time.now - this.liftAt) / 90);
    const k = 1 - Math.pow(1 - t, 3);
    this.dragView.setPosition(p.worldX - this.grabOff.x * (1 - k), p.worldY - this.grabOff.y * (1 - k) - this.lift * k);
    if (!this.dragShadow) this.dragShadow = this.add.ellipse(0, 0, 92, 30, 0x000000, 0.28).setDepth(54);
    this.dragShadow.setPosition(this.dragView.x, this.dragView.y + 62).setVisible(true);
  }

  onUp(p: Phaser.Input.Pointer) {
    if (p.wasCanceled) {
      // touchcancel (iOS gesture, call, notification): the hold is abandoned, never committed
      this.itemDrag = null;
      this.cancelDrag();
      return;
    }
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
    if (this.dragIdx < 0) return;
    // a tap (no drag) inspects the machine
    if (!this.moved) {
      const tapped = this.dragIdx;
      this.dragIdx = -1;
      this.dragView = null;
      this.drawHeld();
      if (this.s.phase === 'playing') this.openInspect(tapped);
      else if (this.s.phase === 'tutorial') this.showEvent('DRAG it onto its match!', '#fff0cf', 1400); // a tap is not a merge
      return;
    }
    const from = this.dragIdx;
    const id = this.dragId;
    const view = this.dragView;
    // the piece is drawn above the finger: target where the PIECE is, same rule as the live highlight
    const dest = this.hoverIdx >= 0 ? this.hoverIdx : view ? this.targetCell(view.x, view.y) : this.targetCell(p.worldX, p.worldY - this.lift);
    const ga = this.s.grid[from], gb = dest >= 0 ? this.s.grid[dest] : null;
    tlog.log('drag_end', { from, to: dest, highlighted: this.hoverIdx, legal: !!(ga && gb && canMerge(ga, gb, this.s)), kind: !gb ? 'move' : ga && canMerge(ga, gb, this.s) ? 'merge' : 'mismatch', ms: Math.round(this.time.now - this.liftAt) });
    // SCRAP as last shown (the release may come from off the canvas), never over a merge
    const merge = dest !== from && !!ga && !!gb && canMerge(ga, gb, this.s);
    const scrap = this.s.phase === 'playing' && !merge && (this.overScrapFlag || this.heldOverScrap(p));
    this.dragShadow?.setVisible(false);
    view?.setAngle(0);
    this.dragIdx = -1;
    this.hoverIdx = -1;
    this.dragView = null; // must be cleared BEFORE commitDrop so reconcile() animates this piece into its new cell
    if (view) view.setDepth(10);
    const plan = planDrop({ from, dest, scrap, rank: ga?.rank ?? 0, scrapHold: this.scrapHold });
    if (plan.k === 'scrap') this.doScrap(from, id);
    else if (plan.k === 'commit') {
      if (!this.commitDrop(from, dest, id)) this.rejectDrop(view, from, 'refused');
    } else this.rejectDrop(view, from, plan.why);
    this.reconcile(); // belt and braces: every sprite returns to its model cell
    this.scrapHold = 0;
    this.overScrapFlag = false;
    this.drawHeld();
  }

  /** The ONE path for a drop that does nothing (off the board, back on its own cell, an early SCRAP, or a target the
   *  game refused): the part snaps home with a soft 'nope', a light haptic (we are still inside the finger-up handler,
   *  where iOS allows it), and a short rate-limited hint by the part. `refused` targets explain themselves already. */
  rejectDrop(view: GadgetView | null, from: number, why: DropReject) {
    this.snapBack(view, from);
    sfx.nope();
    haptic(8);
    this.dropRejects++;
    tlog.log('drop_reject', { why });
    const text = DROP_HINT[why];
    if (!text || !this.hintGate.allow(text, this.time.now)) return;
    const real = view ? this.s.grid.findIndex((g) => g?.id === view.gid) : from;
    const { x, y } = cellXY(real >= 0 ? real : from);
    this.dropHint(x, y - 72, text);
  }
  /** Reject drops seen (read by tools/touch-test.mjs). */
  dropRejects = 0;
  hintGate = new HintGate();
  /** Small hint above a cell; reduced motion: it fades in place instead of popping and drifting. */
  dropHint(x: number, y: number, text: string) {
    const t = this.add.text(x, y, text, { fontFamily: 'Lilita One, Arial Black', fontSize: '26px', color: '#fff0cf', stroke: '#2b1d2e', strokeThickness: 6, align: 'center' }).setOrigin(0.5).setDepth(70);
    t.setX(Phaser.Math.Clamp(x, t.width / 2 + 8, W - t.width / 2 - 8));
    this.lastDropHint = text;
    if (REDUCED_MOTION) {
      t.setAlpha(0);
      this.tweens.chain({ targets: t, tweens: [{ alpha: 1, duration: 120 }, { alpha: 0, delay: 900, duration: 300 }], onComplete: () => t.destroy() });
    } else {
      t.setScale(0.6);
      this.tweens.add({ targets: t, scale: 1, duration: 140, ease: 'Back.Out' });
      this.tweens.add({ targets: t, y: y - 24, alpha: 0, delay: 900, duration: 350, ease: 'Quad.In', onComplete: () => t.destroy() });
    }
  }
  lastDropHint = '';

  snapBack(view: GadgetView | null, idx: number) {
    this.dragShadow?.setVisible(false);
    if (!view) return;
    view.setAngle(0).setDepth(10);
    // return to wherever the model has it NOW (a chain may have moved it while it was held)
    const real = this.s.grid.findIndex((g) => g?.id === view.gid);
    if (real < 0) return; // removed/replaced: its removal animation owns the sprite
    const { x, y } = cellXY(real);
    this.tweens.killTweensOf(view);
    this.tweens.add({ targets: view, x, y, scale: 1, duration: 140, ease: 'Cubic.Out' });
  }

  /** The ONE way a hold ends without a drop: modals, explainers, touchcancel, and the game removing / replacing /
   *  moving the held part (kickback, boss bomb/suction, vacuum remix, boss moves). With `ids`, only cancels when
   *  the held part is one of them. Call it BEFORE animating a removed sprite away. The finger then holds nothing,
   *  and its release is a no-op. */
  cancelDrag(ids?: readonly number[]) {
    if (!ids) this.itemDrag = null; // a held power-up is dropped too (it is never on the board, so `ids` never name it)
    if (ids && (this.dragIdx < 0 || !ids.includes(this.dragId))) return;
    if (this.dragIdx >= 0) this.snapBack(this.dragView, this.dragIdx);
    this.dragShadow?.setVisible(false);
    if (this.dragView) this.dragView.setDepth(10).setAngle(0);
    this.dragIdx = -1;
    this.dragView = null;
    this.hoverIdx = -1;
    this.overScrapFlag = false;
    this.scrapHold = 0;
    this.drawHeld();
  }

  /** Frees every touch pointer not in `live` (Phaser has one touch slot; a lost touchend would hold it forever) and
   *  drops whatever that touch was holding. */
  freeStalePointers(live: ReadonlySet<number> = new Set()) {
    let freed = false;
    for (const p of this.input.manager.pointers)
      if (p.id > 0 && p.active && !live.has(p.identifier)) {
        p.reset();
        freed = true;
      }
    if (freed) this.cancelDrag();
  }
  /** Stops a part's tweens and puts it back to rest on `idx`'s cell; a shake started from there always ends there. */
  restPart(v: GadgetView, idx: number) {
    const c = cellXY(idx);
    this.tweens.killTweensOf(v);
    v.setPosition(c.x, c.y).setScale(1).setAngle(0);
    return c;
  }
  /** Pulses a part's rank label from its rest size: a repeat restarts the pulse instead of stacking on a half-grown label. */
  pulseRank(id: number, scale: number, duration: number, repeat = 0, ease = 'Linear') {
    const rv = this.views.get(id)?.getByName('rank') as Phaser.GameObjects.Text | undefined;
    if (!rv) return;
    this.tweens.killTweensOf(rv);
    rv.setScale(1).setAlpha(1);
    // reduced motion: the label blinks in place instead of growing
    if (REDUCED_MOTION) this.tweens.add({ targets: rv, alpha: 0.45, duration, yoyo: true, repeat, ease });
    else this.tweens.add({ targets: rv, scale, duration, yoyo: true, repeat, ease });
  }

  /** Finger is on a part (held or about to drag) or on the power-up. */
  holding() {
    return this.dragIdx >= 0 || !!this.itemDrag;
  }
  heldQueue: (() => void)[] = [];
  /** Run `fn` now, or as soon as the finger lets go: cards that pause the game never eat a drag in progress. */
  afterHold(fn: () => void) {
    if (this.holding()) this.heldQueue.push(fn);
    else fn();
  }

  commitDrop(from: number, to: number, id: number): boolean {
    if (this.guided) {
      if (from !== this.guided.from || to !== this.guided.to) return false; // rejectDrop() plays the 'nope'
      this.endGuidedDodge();
    }
    const a = this.s.grid[from];
    const b = this.s.grid[to];
    if (this.s.phase === 'tutorial' && this.onTutorialMismatch(from, to)) return false;
    const merging = canMerge(a, b, this.s);
    // ChatGPT r13: an occupied mismatch BOUNCES (silent swaps punished the exact mistake Ido reported). Swapping is opt-in.
    if (a && b && !merging && !this.meta.swapMismatch) {
      tlog.log('mismatch_bounce', { a: `${a.family}${a.rank}`, b: `${b.family}${b.rank}` });
      const msg = a.family === b.family ? `Rank ${a.rank} ≠ Rank ${b.rank}: merge the SAME number` : 'Merge the SAME gadget with the SAME number';
      this.showEvent(msg, '#ffd2c8', 1600);
      for (const g of a.family === b.family ? [a, b] : []) this.pulseRank(g.id, 1.5, 140, 1);
      const bv = this.views.get(b.id);
      if (bv && !REDUCED_MOTION) {
        const c = this.restPart(bv, to);
        this.tweens.chain({ targets: bv, tweens: [{ x: c.x + 4, duration: 45 }, { x: c.x - 4, duration: 45 }, { x: c.x, duration: 45 }] });
      }
      return false;
    }
    this.pulledMerge = merging && (this.pulledIds.has(a!.id) || this.pulledIds.has(b!.id));
    const prevBest = this.s.stats.bestRank;
    // the hit formula is read before the drop changes the board; playCascade() plays it as the chain ribbon
    this.pendingFormula = merging ? hitFormula(this.s, from, to) : null;
    const res = recordCommand(this.runLog, this.s, { k: 'drop', from, to, id });
    if (!res.ok) {
      this.pendingFormula = null;
      tlog.log('invalid');
      return false;
    }
    this.idleTime = 0;
    this.hintPair = null;
    if (this.s.puzzle) this.puzzlePlayed.push([from, to]);
    if (merging) {
      this.reconcile(false, undefined, cellXY(to));
      const nv = this.views.get(this.s.grid[to]!.id);
      if (this.hasArt('starburst')) {
        const { x, y } = cellXY(to);
        const sb = this.add.image(x, y, 'starburst').setDepth(9);
        const s0 = Math.min(150 / sb.width, 150 / sb.height);
        // reduced motion: a short in-place fade, no growth or spin
        if (REDUCED_MOTION) this.tweens.add({ targets: sb.setScale(s0 * 0.7).setAlpha(0.8), alpha: 0, duration: 220, ease: 'Quad.Out', onComplete: () => sb.destroy() });
        else {
          sb.setScale(s0 * 0.4);
          this.tweens.add({ targets: sb, scale: s0, angle: 90, alpha: 0, duration: 450, ease: 'Quad.Out', onComplete: () => sb.destroy() });
        }
      }
      if (nv) {
        // ONE pop, when the two parts arrive (the chain's root beat skips this gadget so it can't cut the pop short)
        this.tweens.killTweensOf(nv); // the spawn pop from reconcile() would fight the merge punch
        const c = cellXY(to);
        nv.setPosition(c.x, c.y).setScale(REDUCED_MOTION ? 1 : 0.9).setVisible(false);
        this.time.delayedCall(MERGE_ARRIVE, () => {
          if (!nv.active) return;
          nv.setVisible(true);
          if (!REDUCED_MOTION)
            this.tweens.chain({
              targets: nv,
              tweens: [
                { scale: 1.16, duration: 90, ease: 'Back.Out' },
                { scale: 1, duration: 120, ease: 'Sine.Out' },
              ],
            });
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
        sfx.cascadeStep(Math.min(this.streak - 2, 3), 0.05);
        this.showEvent(this.streak >= 10 ? `MERGE FEST!!  x${this.streak}` : this.streak >= 5 ? `MERGE STREAK  x${this.streak}` : `MERGE x${this.streak}`, this.streak >= 5 ? '#ffd24a' : '#fff0cf', 900);
      }
      if (ng.rank > prevBest && ng.rank >= 2) {
        const { x, y } = cellXY(to);
        this.time.delayedCall(120, () => {
          sfx.rankUp(ng.rank);
          if (ng.rank >= capOf(this.s, ng.family)) this.floatText(x, y - 64, 'MAX!', '#ffcf33', 30, 200);
          this.pulseRank(ng.id, 1.5, 90, 0, 'Quad.Out');
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
        for (const id of [a.id, b.id]) this.pulseRank(id, 1.6, 160, 2);
      } else if (a && b && a.family !== b.family) this.showEvent('Swapped. Merge two of the SAME gadget', '#fff0cf', 1600);
      tlog.log('move', { swap: !!b });
      this.reconcile();
    }
    this.handleEvents(res.events);
    this.pendingFormula = null;
    this.save();
    return true;
  }

  doScrap(idx: number, id: number) {
    const res = recordCommand(this.runLog, this.s, { k: 'scrap', idx, id });
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

  /** drawHeld runs every frame while a hint is up: the hold's cascade preview is cached per (from, to) and
   *  recomputed only when the model has emitted events since (phone performance). */
  boardVer = 0;
  heldCache: { s: GameState; key: string; ver: number; p: CascadeResult | null } | null = null;
  heldPreview(from: number, to: number) {
    const key = `${from}:${this.s.grid[from]?.id}>${to}:${this.s.grid[to]?.id}`;
    const c = this.heldCache;
    if (c && c.s === this.s && c.key === key && c.ver === this.boardVer) return c.p;
    const p = previewMerge(this.s, from, to);
    this.heldCache = { s: this.s, key, ver: this.boardVer, p };
    return p;
  }

  /** Highlights for held/selected piece: matching double-rings + live cascade preview. */
  drawHeld() {
    const g = this.overlayG.clear();
    const src = this.dragIdx >= 0 && this.moved ? this.dragIdx : -1;
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
      if (this.moved && isRelay(a.family)) {
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
        const p = this.heldPreview(src, hov)!;
        for (const act of p.activations) {
          if (act.idx === hov) continue;
          const { x, y } = cellXY(act.idx);
          g.fillStyle(PALETTE.merge.hue, 0.22).fillRoundedRect(x - CELL / 2 + 8, y - CELL / 2 + 8, CELL - 16, CELL - 16, 18);
        }
        this.drawPreview(p, hov, a);
        this.drawChips(src, hov);
      } else {
        this.drawPreview(null, -1, a);
        this.drawChips(-1, -1);
      }
    } else {
      this.drawPreview(null, -1, null);
      this.drawChips(-1, -1);
    }
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
    const nk = `${a.family}_${Math.min(p.activations.find((x) => x.idx === hov)?.rank ?? a.rank + 1, capOf(this.s, a.family))}`; // root rank: a sandwich shows +2
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

  /** Clarity pass 2 merge-preview chips (owner: "idk what happens after I merge on it"): a short row of plain chips
   *  ABOVE the hovered match (never on it): chain size, multipliers used, marks used up (struck out), marks placed,
   *  parts earned, Overdrive charge. Colours from PALETTE. Gone the moment the hold ends or leaves the match. */
  chipsC: Phaser.GameObjects.Container | null = null;
  chipKey = '';
  /** Chips are keyed by the pair AND the state they read, so they never go stale while the hold stays on one match. */
  chipKeyFor(src: number, hov: number) {
    return src >= 0 && hov >= 0 ? `${src}>${hov}|${previewSig(this.s)}` : '';
  }
  drawChips(src: number, hov: number) {
    const key = this.chipKeyFor(src, hov);
    if (key === this.chipKey) return;
    this.chipKey = key;
    this.formula.show(key ? () => hitFormula(this.s, src, hov) : null);
    this.chipsC?.destroy();
    this.chipsC = null;
    const pv = key ? mergePreview(this.s, src, hov) : null;
    if (!pv) return;
    const { x: cx, y: cy } = cellXY(hov);
    const c = this.add.container(0, 0).setDepth(62);
    // sub-labels at 26px (~14px on a phone; 22px read as ~12px)
    const PAD = 10, GAP = 8, CH = 50, MAXW = W - 24;
    const built = pv.chips.map((ch: PreviewChip) => {
      const col = hex(PALETTE[ch.meaning].hue);
      const parts: Phaser.GameObjects.Text[] = [];
      if (ch.text) parts.push(this.add.text(0, 0, ch.text, { fontFamily: 'Lilita One, Arial Black', fontSize: '30px', color: col }).setOrigin(0, 0.5));
      // USED UP sub-labels are lifted toward white so the struck-out name still reads on the dark chip
      if (ch.sub) parts.push(this.add.text(0, 0, ch.sub, { fontFamily: 'Lilita One, Arial Black', fontSize: '26px', color: ch.struck ? hex(lighten(PALETTE[ch.meaning].hue, 0.55)) : col }).setOrigin(0, 0.5));
      const w = PAD * 2 + parts.reduce((n, t) => n + t.width, 0) + (parts.length - 1) * 6;
      return { ch, parts, w, hue: PALETTE[ch.meaning].hue };
    });
    // rows of chips, filled bottom-up so the first row sits just above the target cell
    const rows: (typeof built)[] = [[]];
    let rw = 0;
    for (const b of built) {
      if (rows[rows.length - 1].length && rw + GAP + b.w > MAXW) {
        rows.push([]);
        rw = 0;
      }
      rows[rows.length - 1].push(b);
      rw += (rw ? GAP : 0) + b.w;
    }
    // 390x844 QA: above a top-row target the chips covered the clock ring and machine counter. When the stack would
    // reach past the board's top edge into the HUD, it hangs BELOW the target instead (first row just under it).
    const below = cy - CELL / 2 - 40 - (rows.length - 1) * (CH + 6) - CH / 2 < BY - 4;
    rows.forEach((row, ri) => {
      const total = row.reduce((n, b) => n + b.w, 0) + GAP * (row.length - 1);
      let x = Phaser.Math.Clamp(cx - total / 2, 12, W - 12 - total);
      const y = below ? cy + CELL / 2 + 40 + ri * (CH + 6) : cy - CELL / 2 - 40 - ri * (CH + 6);
      for (const b of row) {
        const g = this.add.graphics();
        g.fillStyle(0x2b1d2e, 0.92).fillRoundedRect(x, y - CH / 2, b.w, CH, 14).lineStyle(3, b.hue, b.ch.struck ? 0.7 : 1).strokeRoundedRect(x, y - CH / 2, b.w, CH, 14);
        c.add(g);
        let tx = x + PAD;
        for (const t of b.parts) {
          t.setPosition(tx, y + 1);
          c.add(t);
          tx += t.width + 6;
        }
        const sub = b.ch.sub ? b.parts[b.parts.length - 1] : null;
        // USED UP: the mark's name struck through
        if (b.ch.struck && sub) c.add(this.add.graphics().lineStyle(4, b.hue, 1).lineBetween(sub.x - 2, y + 1, sub.x + sub.width + 2, y + 1));
        x += b.w + GAP;
      }
    });
    c.setAlpha(0);
    this.tweens.add({ targets: c, alpha: 1, duration: 80, ease: 'Quad.Out' });
    this.chipsC = c;
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
        const ev = recordTick(this.runLog, this.s, reserved);
        if (ev.length) this.handleEvents(ev);
        if (this.modal) break;
      }
      // the held match's chips follow the live state (a boost spent by passive fire, Overdrive ending, a boss move)
      if (this.chipKey && this.chipKey !== this.chipKeyFor(this.dragIdx, this.hoverIdx)) this.drawHeld();
      if (this.dragIdx >= 0 && this.moved && this.overScrapFlag) this.scrapHold += dms / 1000;
      if (this.s.phase === 'playing') this.idleTime += dms / 1000;
    }
    if ((this.dragIdx >= 0 || this.itemDrag) && !this.input.activePointer.isDown) this.onUp(this.input.activePointer); // (onUp cancels on touchcancel)
    else if (this.dragIdx >= 0 && this.moved && this.time.now - this.liftAt < 120) this.placeDrag(this.input.activePointer);
    if (this.heldQueue.length && !this.holding() && !this.modal) {
      const q = this.heldQueue;
      this.heldQueue = [];
      for (const fn of q) fn();
    }
    this.updateHints();
    this.drawHud(dms);
    this.animateIdle();
    this.partReact.update(this, dms);
    this.updateFace();
    this.coach.update(this.time.now);
    this.checkTips();
    this.drawRemix();
    this.drawItems();
    this.support?.sync(this.s);
    if (this.time.now - this.lastSave > 2000) this.save();
  }

  /** Cannons about to auto-fire puff up a little; everything breathes slightly. */
  primeG!: Phaser.GameObjects.Graphics;
  /** units B1: the shared BOOSTED mark shows its multiplier beside the badge (pooled, one per boosted machine). */
  boostTexts: Phaser.GameObjects.Text[] = [];
  lastTickSec = -1;
  resultCall: Phaser.Time.TimerEvent | null = null;
  resultAt = 0;
  idleNext = 0;
  idleBeat = 0;
  idleActs = new Map<number, number>();
  partReact = new PartReact(REDUCED_MOTION);
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
    // helper marks share the top-left slot: Amplifier / Beacon boost (lavender ring + up-arrow) first, Battery charge
    // (green ring + bolt) below it when both are on; each stays until the machine fires (the model clears it on use)
    let nBoost = 0;
    this.s.grid.forEach((g, idx) => {
      if (!g?.primed && !g?.amp) return;
      const { x, y } = cellXY(idx);
      if (g.amp) drawAmpMark(this.primeG, x, y, 0.6 + 0.4 * Math.sin(t * 6 + 1.5));
      if (g.primed) drawPrimeMark(this.primeG, x, y, 0.6 + 0.4 * Math.sin(t * 6), 1, g.amp ? SLOT.helper2 : SLOT.helper);
      if (g.amp && TUNING.unitsB1) {
        let tx = this.boostTexts[nBoost];
        if (!tx?.active) tx = this.boostTexts[nBoost] = this.add.text(0, 0, '', { fontFamily: 'Lilita One, Arial Black', fontSize: '22px', color: hex(AMP_COL), stroke: '#2b1d2e', strokeThickness: 5 }).setOrigin(0, 0.5).setDepth(11);
        tx.setText(fmtMult(g.amp)).setPosition(x + SLOT.helper.x + 15, y + SLOT.helper.y).setVisible(true);
        nBoost++;
      }
    });
    for (let i = nBoost; i < this.boostTexts.length; i++) if (this.boostTexts[i]?.active) this.boostTexts[i].setVisible(false);
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

  static TUTORIAL = TUTORIAL;

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
    this.tutorialWaiting = false; // the coach shows no GOT IT now: input must never stay gated on a hidden one
    if (!step) {
      // script done: the real run starts on the board they just built
      const ev = recordCommand(this.runLog, this.s, { k: 'tutorial' }).events;
      this.meta.tutorialDone = true;
      store(META_KEY, JSON.stringify(this.meta));
      tlog.log('tutorial_done');
      void ev;
      // the saga starts: level 1 on the road (ChatGPT r15)
      this.time.delayedCall(400, () => this.startLevel(1));
      return;
    }
    const pair = this.tutorialPair(step);
    this.demoKilled = false;
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
  /** F7: the current tutorial step's merge smashed the demo can (its `afterKill` copy replaces `after`). */
  demoKilled = false;
  /** After a tutorial merge: the explanation waits for GOT IT (r24: players never looked up), then the next step. */
  onTutorialMerge() {
    const step = GameScene.TUTORIAL[this.tutorialStep];
    if (step?.kind === 'mismatch') {
      // a merge during the mismatch step can use up its pair: re-pick one (or skip the step) so the script never stalls.
      // If the previous step's GOT IT is up (or about to be), leave it: its onNext re-runs this step anyway.
      if (this.tutorialWaiting) return;
      this.coach.clear();
      this.time.delayedCall(1200, () => GameScene.TUTORIAL[this.tutorialStep] === step && !this.tutorialWaiting && this.runTutorial());
      return;
    }
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
      this.coach.say(this.demoKilled && step.afterKill ? step.afterKill : step.after!, step.focus === 'target' ? this.coachY() + 120 : this.nearY(pts), {
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
    for (const id of [a.id, b.id]) this.pulseRank(id, 1.7, 150, 2);
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
    if (this.explain(id, [{ text, spots: pointAt ? [{ ...pointAt, r: 70 }] : [], y: pointAt ? this.nearY([pointAt]) : undefined }])) tlog.log('tip', { id });
  }

  explainQueue: { text: string; spots: { x: number; y: number; r?: number }[]; draw?: () => Phaser.GameObjects.GameObject[]; y?: number }[] = [];
  explainTotal = 0;
  explainOverlay: Phaser.GameObjects.GameObject[] = [];
  explaining = false;
  /** F4: the open lesson teaches a boss attack, so its GOT IT restarts that attack's fuse. */
  fuseAfterLesson = false;
  /** F6: overlays that wait for the player to leave the level result (chapter chest, backup nudge). */
  endQueue = new OverlayQueue();
  /** t-0a294f99 per-level tip budget (tips.ts); reset by startState. */
  tipLedger = newTipLedger();
  /** Counts pause cards against this level's tip budget; a tip that doesn't fit stays unseen and is queued (persisted). */
  admitTip(id: string, cards: number, atStart = this.s.elapsed < 0.5) {
    if (this.realBoss) return true; // boss fights already show only their own lessons
    const q = (this.meta.tipQueue ??= []), n = q.length;
    const ok = admitTip(this.tipLedger, q, id, cards, atStart);
    if (q.length !== n) store(META_KEY, JSON.stringify(this.meta));
    return ok;
  }
  /** First-time explanation that STOPS the clock until read (auto-hiding tips were missed mid-fight). True when queued. */
  explain(id: string, cards: { text: string; spots: { x: number; y: number; r?: number }[]; draw?: () => Phaser.GameObjects.GameObject[]; y?: number }[]): boolean {
    if (this.meta.tips[id] || this.s.phase !== 'playing' || this.modal) return false;
    // r22 (ChatGPT): boss fights show only the boss-warning lesson; other lessons stay unseen until a normal level
    if (this.realBoss && id !== 'x_boss' && id !== 'overdrive' && !id.startsWith('xb_')) return false;
    if (!this.admitTip(id, cards.length)) return false;
    this.meta.tips[id] = true;
    store(META_KEY, JSON.stringify(this.meta));
    tlog.log('explain', { id });
    this.explainQueue.push(...cards);
    this.explainTotal = this.explainQueue.length;
    // the card pauses the game: it waits until the finger is up so it never eats a drag in progress
    this.afterHold(() => {
      if (!this.explaining && this.explainQueue.length) this.nextExplain();
    });
    return true;
  }

  /** F4: GOT IT on a boss attack's first lesson: the attack's fuse starts again (recorded, so replays match). */
  restartFuse() {
    if (recordCommand(this.runLog, this.s, { k: 'fuse' }).ok) tlog.log('boss_fuse_restart', { at: +this.s.elapsed.toFixed(1) });
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
      if (this.fuseAfterLesson) this.restartFuse();
      this.fuseAfterLesson = false;
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
    if (s.phase !== 'playing' || this.coach.waitingTap || s.showcase) return;
    // clarity pass 3: the Overdrive lesson also runs in boss levels and when chains (not merges) fill the meter
    const odSoon = odByChain() ? s.odCharge >= odNeeded(s) * 0.7 : s.odCharge === odNeeded(s) - 1;
    if (odSoon && s.odLeft <= 0 && !(s.level !== undefined && s.level < 3) && s.target >= 0)
      this.tip('overdrive', `${odByChain() ? 'Chains fill' : 'One more merge fills'} the OVERDRIVE meter (top):\nfull = OVERDRIVE, Cannons fire super fast\nfor a few seconds. Pause > Machine guide.`, { x: 384 + 70, y: 46 });
    if (this.realBoss) return; // r22: boss levels keep the stage clear (own explainers only)
    const occ = s.grid.filter(Boolean).length;
    if (s.elapsed > 5 && s.elapsed < 12) this.tip('delivery', 'NEXT brings another gadget.\nMatch its machine and number.', { x: BX + 150, y: TRAY_Y - 30 });
    if (s.elapsed > 3 && this.starChase?.visible && s.level !== undefined && s.level >= 2) this.tip('star_ticks', 'The gold ticks on the clock ring\nare the star times: win before\na tick passes to keep that star.', { x: CLOCK_X, y: HP_Y });
    if (occ >= 23) this.tip('full', 'Board filling up! Merge pairs,\nor drag junk onto SCRAP.', { x: SCRAP_X, y: TRAY_Y - 30 });
    if (s.timeLeft < 30 && s.target >= 0) this.tip('clock', '30 seconds left!\nGo for the biggest chains you can.');
    // clarity pass 1: the first time a boost / charge / power-up sits on the board, point at it and say what it does
    const mt = markTip(s.grid, this.meta.tips, s);
    if (mt) this.tip(mt.id, mt.text, cellXY(mt.idx));
    if (s.stage?.i === 1 && !s.goal) this.tip('next_machine', 'Machine 2! Your board stays.\nBeat every machine before the clock runs out.', { x: W - CLOCK_X, y: HP_Y });
  }

  updateHints() {
    if (this.s.phase === 'tutorial') {
      this.tutorialText.setText('');
      return;
    }
    this.tutorialText.setText('');
    if (this.s.puzzle && this.s.phase === 'playing') this.puzzleNudge();
    if (this.meta.hints === false || this.s.phase !== 'playing') return;
    // r35: the board holds still now, so thinking is allowed: hint after 8 s, and point at the pair with the biggest chain
    // r44: never in puzzles - the biggest chain is usually the trap there; puzzles have their own graduated help
    if (this.idleTime > 8 && !this.hintPair && this.dragIdx < 0 && !this.s.puzzle) {
      let best: [number, number] | null = null, bc = -1;
      for (const [a, b] of legalPairs(this.s))
        for (const [f, t] of [[a, b], [b, a]] as [number, number][]) {
          const c = previewMerge(this.s, f, t)?.count ?? 0;
          if (c > bc) [bc, best] = [c, [f, t]];
        }
      this.hintPair = best;
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
    textColor(this.headerText, s.hard ? '#b3201a' : s.remix ? '#1f6f8f' : '#3b2533');
    if (this.headerText.text !== this.lastHeader) {
      // fixed header columns: the name gets x 70..350 and shrinks to fit
      this.lastHeader = this.headerText.text;
      let fs = 30;
      this.headerText.setFontSize(fs);
      while (this.headerText.width > 276 && fs > 18) this.headerText.setFontSize((fs -= 2));
    }
    this.headerText.setText(demo ? 'WARM-UP' : s.puzzle ? `${this.puzzleKind === 'drill' ? 'DRILL' : 'PUZZLE'}  \u00b7  WIN IN ${s.puzzle.moves}` : s.level !== undefined ? `${s.rush ? `RUSH ${s.rush.slot + 1}/3` : s.bounty ? 'BOUNTY' : s.endless ? `FLOOR ${s.endless}` : `L${s.level}`} \u00b7 ${this.realBoss ? (BOSSES[this.realBoss.def].mini ? 'MINI-BOSS' : 'BOSS') : this.s.goal ? 'GOAL' : this.monName(true)}` : s.remix ? TARGET_NAMES[s.target] : `${Math.min(s.target + 1, 3)}/3 ${TARGET_NAMES[Math.min(s.target, 2)]}`);
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
          if (!recordCommand(this.runLog, this.s, { k: 'capsule' }).ok) return;
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
    textColor(this.timerText, s.timeLeft < 10 && !demo ? '#d8261a' : '#3b2533');
    this.drawClock(demo || !!s.showcase);
    this.practiceText.setVisible(s.practice && !demo);
    // QA PACE MANIA: label the craze rules on the HUD (top-right of the stage window)
    if (!this.maniaBadge) this.maniaBadge = this.add.text(W - 92, STAGE_TOP + 28, 'MANIA', { fontFamily: 'Lilita One, Arial Black', fontSize: '26px', color: '#ffffff', backgroundColor: '#c0287a', padding: { x: 12, y: 4 } }).setOrigin(1, 0.5).setDepth(22);
    this.maniaBadge.setVisible(TUNING.pace === 'mania' && s.level !== undefined && !s.puzzle && !demo);
    // QA THINK BANK: PAUSED while the still board holds the clock, else the seconds left in the bank
    if (!this.thinkBadge) this.thinkBadge = this.add.text(W - 92, STAGE_TOP + 70, '', { fontFamily: 'Lilita One, Arial Black', fontSize: '22px', color: '#ffffff', padding: { x: 10, y: 3 } }).setOrigin(1, 0.5).setDepth(22);
    const bankLeft = Math.max(0, Math.ceil(TUNING.tb.bank - (s.banked ?? 0)));
    this.thinkBadge.setVisible(TUNING.thinkBank && s.level !== undefined && !s.puzzle && !demo && s.phase === 'playing');
    this.thinkBadge.setText(thinking(s) ? `PAUSED · ${bankLeft}s` : `BANK ${bankLeft}s`).setBackgroundColor(thinking(s) ? '#27a4c0' : '#8a6a4a');
    // r22 live star chase: the best star still reachable and its seconds left (saga levels only)
    const ldef = s.level !== undefined && !s.showcase && !s.rush && !s.bounty && !s.endless ? LEVELS[s.level - 1] : undefined;
    if (!this.starChase) this.starChase = this.add.text(92, STAGE_TOP + 28, '', { fontFamily: 'Lilita One, Arial Black', fontSize: '30px', color: '#ffcf33', stroke: '#2b1d2e', strokeThickness: 6 }).setOrigin(0, 0.5).setDepth(22);
    if (ldef && s.phase === 'playing' && !demo) {
      const [g2, g3] = starGoals(ldef);
      const goal = s.elapsed <= g3 ? 3 : s.elapsed <= g2 ? 2 : 0;
      const left = Math.ceil((goal === 3 ? g3 : g2) - s.elapsed);
      const txt = goal ? `${goal}★ · ${left}s left` : '';
      if (txt !== this.starChase.text) textColor(this.starChase.setText(txt), left <= 5 ? '#ff8a5c' : '#ffcf33');
      this.starChase.setVisible(!!goal);
    } else if (s.puzzle && s.phase === 'playing') {
      // r42: the puzzle's rule lives where the star chase usually is
      const rule = s.puzzle.only ? `ONLY: ${s.puzzle.only.map((f) => FAMILY_INFO[f as 'cannon'].name.toUpperCase().replace('SIGNAL ', '')).join(' + ')}` : 'ANY MERGE';
      if (this.starChase.text !== rule) textColor(this.starChase.setText(rule), '#d9c2ff');
      this.starChase.setVisible(true);
    } else this.starChase.setVisible(false);
    const hudA = this.time.now < this.bannerUntil ? Math.max(0, this.starChase.alpha - dms / 120) : Math.min(1, this.starChase.alpha + dms / 250);
    this.starChase.setAlpha(hudA);

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
    this.hpText.setText(s.showcase ? 'PRACTICE' : s.goal ? (s.goal.kind === 'rank' ? `BEST RANK ${Math.max(1, s.goal.best)} / ${s.goal.n}` : `BEST CHAIN ${s.goal.best} / ${s.goal.n}`) : fmt(Math.max(0, Math.round(this.shownHp))));
    if (s.goal && this.hpFill) this.hpFill.setCrop(0, 0, this.hpFill.width * (1 - frac), this.hpFill.height).setTint(0x8ef08a);
    this.drawPace(bw);
    // r23 chain shield chip + bubble on the monster
    if (!this.shieldChip) {
      this.shieldChip = this.add.text(W - 92, STAGE_TOP + 34, '', { fontFamily: 'Lilita One, Arial Black', fontSize: '22px', color: '#9fe8ff', stroke: '#2b1d2e', strokeThickness: 6, align: 'right', lineSpacing: -4 }).setOrigin(1, 0.5).setDepth(22);
      this.shieldG = this.add.graphics().setDepth(4);
    }
    const sh = s.shieldUntil !== undefined && s.phase === 'playing';
    const open = sh && s.elapsed < s.shieldUntil!;
    const shTxt = open ? `SHIELD OPEN  ${(s.shieldUntil! - s.elapsed).toFixed(1)}s\nfull damage` : 'SHIELD CLOSED  \u00b7  x0.75\nchain of 4 opens it';
    if (this.shieldChip.text !== shTxt) textColor(this.shieldChip.setText(shTxt), open ? '#8ef08a' : '#9fe8ff');
    this.shieldChip.setVisible(sh).setAlpha(hudA);
    this.shieldG.clear();
    if (sh && !open) {
      const rr = Math.min(STAGE_H * 0.46, 170);
      this.shieldG.fillStyle(0x6fd3ff, 0.16).fillCircle(this.target.x, this.target.y, rr).lineStyle(5, 0x9fe8ff, 0.8 + 0.2 * Math.sin(this.time.now / 200)).strokeCircle(this.target.x, this.target.y, rr);
    }
    if (!this.hpTicks) this.hpTicks = this.add.graphics().setDepth(3);
    const ht = this.hpTicks.clear();
    if (this.realBoss && !BOSSES[this.realBoss.def].mini) {
      // r30 (ChatGPT): bosses show their armor phases in the bar
      for (const q of [0.66, 0.33]) {
        const x = W / 2 - bw / 2 + bw * q;
        ht.fillStyle(0x2b1d2e, 1).fillRect(x - 5, HP_Y - 19, 10, 38).fillStyle(frac > q ? 0xe0b04a : 0x8a6a3a, 1).fillRect(x - 3, HP_Y - 17, 6, 34);
      }
    } else if (s.target >= 0 && TUNING.kickback && !s.goal)
      for (const q of [0.75, 0.5, 0.25]) {
        const x = W / 2 - bw / 2 + bw * q;
        ht.fillStyle(0x2b1d2e, frac > q ? 0.85 : 0.3).fillRect(x - 2, HP_Y - 15, 4, 30);
      }

    // r18 progressive reveal: overdrive from level 3, scrap from level 4
    const early = s.level !== undefined && s.level < 3;
    this.scrapZone?.setVisible(this.scrapShown());
    // overdrive gauge
    const og = this.odGauge.clear();
    // experiments charge Overdrive by chain links (12 to fill): the 6 pips show the fraction
    const need = Math.min(6, odNeeded(s));
    const charged = Math.floor((s.odCharge * need) / odNeeded(s));
    const gx = 384;
    this.boltIcon?.setPosition(gx - 26, 46).setVisible(!demo && !early).setAngle(s.odLeft > 0 ? Math.sin(this.time.now / 60) * 12 : 0);
    this.odLabel?.setVisible(!demo && !early);
    const active = s.odLeft > 0;
    const gaugeArt = this.hasArt('gauge_off') && this.hasArt('gauge_on');
    if (gaugeArt && !this.gaugeImgs.length) for (let i = 0; i < 6; i++) this.gaugeImgs.push(this.add.image(0, 46, 'gauge_off').setDisplaySize(24, 34));
    this.gaugeImgs.forEach((g, i) => {
      const on = i < need && !demo && !early;
      g.setVisible(on).setPosition(gx + i * 26 + 11, 46);
      if (on) g.setTexture(active ? (this.hasArt('gauge_lit') ? 'gauge_lit' : 'gauge_on') : i < charged ? 'gauge_on' : 'gauge_off').setDisplaySize(24, 34);
    });
    for (let i = 0; i < (demo || gaugeArt || early ? 0 : need); i++) {
      const filled = active || i < charged;
      og.fillStyle(0x2b1d2e, 1).fillRoundedRect(gx + i * 26, 30, 22, 30, 6);
      // charged pips in the OVERDRIVE hue (gold is MAX only); while Overdrive runs they pulse toward white
      const lit = active ? Phaser.Display.Color.Interpolate.ColorWithColor(Phaser.Display.Color.ValueToColor(OD_COL), Phaser.Display.Color.ValueToColor(0xffffff), 100, 50 + 50 * Math.sin(this.time.now / 90)) : null;
      og.fillStyle(filled ? (lit ? Phaser.Display.Color.GetColor(lit.r, lit.g, lit.b) : OD_COL) : 0x7a6a6a, 1).fillRoundedRect(gx + i * 26 + 3, 33, 16, 24, 4);
    }
    // EXPERIMENT spam fatigue (QA toggle): STEADY HAND bar under the gauge refills over the fatigue window after a merge;
    // a merge made before it is full hits for less (its damage number is dimmed)
    const fc = fatigueCfg();
    const steadyOn = !!fc && !demo && !early && s.phase === 'playing' && !s.goal && !s.puzzle;
    if (steadyOn) {
      const p = Math.min(1, (s.elapsed - (s.lastMergeAt ?? -1e9)) / fc!.window);
      og.fillStyle(0x2b1d2e, 1).fillRoundedRect(gx, 66, 152, 12, 6);
      og.fillStyle(p >= 1 ? 0x5fbf4a : 0xe0a020, 1).fillRoundedRect(gx + 2, 68, Math.max(4, 148 * p), 8, 4);
    }
    this.steadyText.setVisible(steadyOn);
    setMusicIntensity(active);
    const rb = this.realBoss;
    setMusicMode(!rb || s.phase !== 'playing' ? 'normal' : BOSSES[rb.def].mini ? 'mini' : rb.phaseShown >= 2 ? 'final' : 'boss');
    const glow = this.odGlow.clear();
    for (const fl of this.flames) fl.setVisible(active).setAlpha(0.75 + 0.25 * Math.sin(this.time.now / 70));
    if (active && !this.flames.length) {
      const a = 0.35 + 0.25 * Math.sin(this.time.now / 90);
      glow.lineStyle(14, PALETTE.overdrive.hue, a).strokeRoundedRect(BX - 14, BY - 14, CELL * COLS + 28, CELL * ROWS + 28, 30);
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
    // r38: reactive levels say what the next merge earns (the board only changes when you merge)
    const earn = mergeEarns(s);
    this.pendingText.setText(s.pending.length ? (s.trayHold ? `board full · +${s.pending.length}` : `+${s.pending.length} waiting`) : s.reactive && s.phase === 'playing' ? trayEarnText(earn, !!earn && supplyGated(s)) : '');
    textBg(textColor(this.pendingText, s.pending.length ? '#9e2416' : '#3b2533'), this.pendingText.text && !s.pending.length ? '#fbe7c6' : '', this.pendingText.text && !s.pending.length ? 10 : 0, 4);
    const tut = s.phase === 'tutorial';
    this.scrapZone.setVisible(this.scrapShown());
    this.trayPlate?.setVisible(!tut && !s.puzzle);
    for (const o of [this.trayBox, this.trayLabel, this.trayIcon, this.trayBadge, this.trayArc, this.pendingText]) o.setVisible(!tut && !s.puzzle);
    this.hintBtn?.setVisible(!!s.puzzle && s.phase === 'playing');
    const help = this.puzzleHelpNow();
    this.helpBtn?.setVisible(!!s.puzzle && s.phase === 'playing' && help.hint);
    this.helpLabel?.setText(help.showMove ? 'NEXT MOVE' : 'HINT');
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
    if (events.length) this.boardVer++;
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
        case 'sandwich':
          playSandwich(this, e, cellXY);
          break;
        case 'support':
          playSupportFx(this, e, cellXY, FAMILY_INFO[e.family as 'fan']?.color ?? 0xffffff, { x: W / 2, y: BY + (CELL * ROWS) / 2 });
          UNIT_SOUND[e.family](0, 1);
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
          // KICKBACK hue (PALETTE): one ring = lands in this cell; double ring = lands on its match and merges (fuse)
          const col = KICK_COL, fuse = e.into >= 0;
          const o = { p: 0 };
          this.tweens.add({
            targets: o,
            p: 1,
            duration: fall,
            onUpdate: () => {
              const r = 52 - 14 * Math.abs(Math.sin(o.p * Math.PI * 3));
              mk.clear().lineStyle(6, col, 0.9).strokeCircle(0, 0, r).fillStyle(col, 0.18).fillCircle(0, 0, r);
              if (fuse) mk.lineStyle(4, col, 0.9).strokeCircle(0, 0, r - 14);
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
            this.ring(into.x, into.y, KICK_COL, 90, 14, 320);
            this.showEvent('KICKBACK!  A loose part upgraded yours', '#ffd24a', 1800);
          } else spawn.set(e.gadget.id, { x: land.x, y: land.y - 80 });
          const landedAt = e.into >= 0 ? e.into : e.idx;
          if (e.into >= 0) this.noteRank(e.gadget.family, e.gadget.rank);
          const fused = e.into >= 0;
          const tgtSpot = { x: this.target.x, y: this.target.y, r: 150 };
          const hpSpot = { x: W / 2, y: HP_Y, r: 60 };
          const kc = events.find((x) => x.type === 'cascade' && x.kickback) as { result: CascadeResult } | undefined;
          const kChain = kc?.result.count ?? 1;
          this.time.delayedCall(520, () => {
            // t-0a294f99: ONE kickback card, from L5 (tips.ts); saves that saw the old two-lesson version skip it
            if (this.meta.tips.x_kick_fuse || this.meta.tips.x_kick_plain) return;
            const lg = this.s.grid[landedAt];
            const partner = lg ? this.s.grid.findIndex((b, i) => i !== landedAt && !!b && b.family === lg.family && b.rank === lg.rank) : -1;
            // plain drops come from big chains; only paces without kickbackFuse (CALM) also drop them on panel breaks
            const why = fused ? 'You broke a monster panel (the marks on the HP bar)' : TUNING.kickbackFuse ? `Your big chain (${TUNING.bigCascade}+)` : `A big chain (${TUNING.bigCascade}+) or a broken panel`;
            this.explain('x_kick', [
              fused
                ? { text: `KICKBACK! ${why}:\na loose part fell onto its match (DOUBLE ring)\nand that free merge fired ${kChain > 1 ? 'another chain' : 'the new gadget'}!`, spots: [hpSpot, cellXY(landedAt)] }
                : { text: `KICKBACK! ${why}\nshook a part loose: it landed here (the ring).\nMerge it with the same gadget and number!`, spots: partner >= 0 ? [tgtSpot, cellXY(landedAt), cellXY(partner)] : [tgtSpot, cellXY(landedAt)] },
            ]);
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
          if (e.level >= 2 || this.s.stage) this.setTargetTexture();
          break;
        case 'kill':
          if (!e.demo) tlog.log('kill', { target: e.target, at: +this.s.elapsed.toFixed(1) });
          else this.demoKilled = true;
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
            this.cancelDrag([e.removedId]);
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
            this.showEvent(e.kind === 'jam' ? 'CELL JAMMED  ·  5s' : 'ROW GAPS BLOCKED  ·  4s', '#b4c6e0', 1200);
          } else if (e.kind === 'piano' && e.outcome === 'hit') {
            sfx.panelBreak(2);
            this.showEvent('ROW LOCKED  ·  4s', '#b4c6e0', 1200);
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
          // r37 (Ido: "make sure the user can see the bosses"): a beam from the boss to every cell it is about to hit
          if (!REDUCED_MOTION)
            for (const cell of e.target.cells ?? []) {
              const p = cellXY(cell);
              const beam = this.add.graphics().setDepth(45);
              const sx = this.target.x, sy = this.target.y + 60;
              beam.lineStyle(14, 0x2b1d2e, 0.5).lineBetween(sx, sy, p.x, p.y).lineStyle(8, ATTACK_COL, 0.95).lineBetween(sx, sy, p.x, p.y);
              beam.fillStyle(ATTACK_COL, 1).fillCircle(p.x, p.y, 16);
              beam.setAlpha(0);
              this.tweens.chain({ targets: beam, tweens: [{ alpha: 1, duration: 120 }, { alpha: 0, duration: 500, delay: 650 }], onComplete: () => beam.destroy() });
            }
          // first-ever boss warning: stop the clock and show what to do (r20)
          const bd = this.s.boss ? BOSSES[this.s.boss.def] : null;
          // F4 (walkthrough 2): one lesson card per new attack (flow.bossLesson); after its GOT IT the fuse restarts
          const mini = BOSSES.find((x) => x.mini && x.attack === e.attack);
          const lessonFor = (canGuide: boolean) => (bd ? bossLesson(this.meta.tips, e.attack, bd, { light: !!this.s.boss!.light, finalCopy: mini?.copy ?? ATTACK_COPY[e.attack].why, canGuide }) : null);
          let lesson = lessonFor(!this.holding());
          // r23 (ChatGPT): the first clamp is learned by DOING the dodge, not by reading a card (never mid-drag: next clamp)
          if (lesson?.kind === 'guided' && this.startGuidedDodge(e.target.cells?.[0] ?? -1)) break;
          if (lesson?.kind === 'guided') lesson = lessonFor(false);
          if (lesson?.kind === 'card' && this.explain(lesson.key, [{ text: lesson.text, spots: (e.target.cells ?? []).map((c) => cellXY(c)), y: TRAY_Y }])) {
            // r22: bubble in the bottom lane, clear of stage and board
            for (const k of lesson.also) this.meta.tips[k] = true;
            store(META_KEY, JSON.stringify(this.meta));
            this.fuseAfterLesson = true;
          }
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
        case 'bossRansom': {
          const rb = this.s.boss;
          const tc = cellXY(rb?.pending?.cells?.[0] ?? 12);
          if (e.saved) {
            sfx.merge?.(4);
            this.floatText(tc.x, tc.y - 40, 'TIME SAVED!', '#8ef08a', 44, 500);
          } else {
            sfx.invalid();
            this.shake(140, 0.004);
            this.floatText(this.timerText.x - 60, this.timerText.y + 60, `-${e.cost}s`, '#ff684a', 48, 400);
            this.showEvent('TIME TAKEN!', '#ffd2c8', 1200);
          }
          tlog.log('boss_ransom', { saved: e.saved });
          break;
        }
        case 'bossRansomHalf': {
          const i = this.s.grid.findIndex((g) => g?.id === e.id);
          if (i >= 0) {
            const q = cellXY(i);
            this.floatText(q.x, q.y - 40, '1/2  ·  SAME CHAIN!', '#9a63ff', 30, 500);
          }
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
            this.cancelDrag(e.moves.map((m) => m.id));
            const word = { conveyor: 'SLIDE!', mirror: 'SWAP!', pull: 'YANK!', bounce: 'BOING!' }[e.attack as 'conveyor'] ?? 'MOVED!';
            const cp = cellXY(e.moves[0].to);
            this.floatText(cp.x, cp.y - 30, word, '#ffd2c8', 38, 300); // attack colour (lavender is the BOOSTED mark's)
            needReconcile = true;
            break;
          }
          if (e.attack === 'bomb' || e.attack === 'blocks') {
            const c0 = e.target.cells?.[0];
            if (c0 !== undefined) {
              const cp = cellXY(c0);
              if (e.attack === 'bomb') {
                this.shake(140, 0.005);
                this.ring(cp.x, cp.y, ATTACK_COL, 120, 16, 360);
                this.chunks.explode(16, cp.x, cp.y);
              }
              this.floatText(cp.x, cp.y - 30, e.attack === 'bomb' ? (e.removedIds?.length ? 'BOOM!' : 'FIZZLE') : 'JUNK!', '#ffd2c8', 40, 300);
            }
            this.cancelDrag(e.removedIds ?? []);
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
            this.cancelDrag(e.removedIds);
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
              const nm = ({ clamp: 'CLAMPED!', frost: 'FROZEN!', hot: 'HOT!', rest: 'RESTING!', split: 'SPLIT!', suction: 'MISSED!', slick: e.outcome === 'hit' ? 'OIL!' : 'WHIFF', portals: e.outcome === 'hit' ? 'PORTALS!' : 'WHIFF', tow: e.outcome === 'hit' ? 'TOWED' : 'WHIFF', ransom: '' } as Record<string, string>)[e.attack] ?? 'WHIFF';
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
          const got = Math.max(e.n, this.s.goal?.best ?? 0); // walkthrough 3: name the rank actually built
          this.floatText(cp.x, cp.y - 40, e.kind === 'rank' ? `RANK ${got} BUILT!` : `CHAIN x${got}!`, '#ffcf33', 56, 900, 'banner_destroyed');
          this.showEvent(e.kind === 'rank' ? `RANK ${got} BUILT!  GOAL DONE` : `CHAIN x${got}!  GOAL DONE`, '#ffd24a', 3000);
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
            this.time.delayedCall(480, () => this.afterHold(() => {
              if (this.s.phase !== 'playing' || !this.s.itemTray) return;
              this.cancelDrag();
              this.itemLesson = true;
              this.coach.focus([{ x: ITEM_X, y: TRAY_Y, r: 52 }]);
              this.coach.say(`NEW POWER-UP: ${GameScene.ITEM_COPY[e.kind].name}!\n${GameScene.ITEM_COPY[e.kind].how}`, this.nearY([{ x: ITEM_X, y: TRAY_Y }]));
              this.coach.drag({ x: ITEM_X, y: TRAY_Y }, (() => { const i = this.s.grid.findIndex((x) => !!x && itemFits(e.kind, x.family) && !x.item); return i >= 0 ? cellXY(i) : { x: W / 2, y: BY + CELL }; })());
            }));
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
          // FIX 8: the chain that broke it gets a pop on the monster and on the chip
          this.floatText(W / 2, this.stageFloatY(this.target.y - 90), 'SHIELD BROKEN!', '#9fe8ff', 44, 300);
          this.ring(this.target.x, this.target.y, 0x9fe8ff, Math.min(STAGE_H * 0.46, 170), 12, 380);
          if (this.shieldChip) {
            this.tweens.killTweensOf(this.shieldChip);
            this.shieldChip.setScale(1.35);
            this.tweens.add({ targets: this.shieldChip, scale: 1, duration: 260, ease: 'Back.Out' });
          }
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
    // belt and braces: the engine keeps held cells out of kickback/boss/remix targets, but if the held part was
    // still removed, replaced or moved, the hold ends here (never a drag of a part that is no longer there)
    if (this.dragIdx >= 0 && this.s.grid[this.dragIdx]?.id !== this.dragId) this.cancelDrag();
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
    this.meta.tips.xb_clamp = true; // F4: the dodge was the clamp's lesson
    store(META_KEY, JSON.stringify(this.meta));
    tlog.log('guided_dodge_done', {});
  }

  itemDrag: { x: number; y: number; moved: boolean } | null = null;
  itemSelected = false;
  itemLesson = false;
  itemSlot: Phaser.GameObjects.Container | null = null;
  itemG!: Phaser.GameObjects.Graphics;
  itemBadges = new Map<number, Phaser.GameObjects.Container>();

  static ITEM_COPY = ITEM_COPY;

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
    const r = recordCommand(this.runLog, this.s, { k: 'item', idx, id: g.id });
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
          g.lineStyle(6, ITEM_COL, 0.6 + 0.4 * Math.sin(this.time.now / 150)).strokeRoundedRect(cx - CELL / 2 + 5, cy - CELL / 2 + 5, CELL - 10, CELL - 10, 16);
        });
    }
    // owner badges (top-centre slot, clear of the helper marks and the rank plate) + pips for OVERCHARGE
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
      b.setPosition(v.x + SLOT.item.x, v.y + SLOT.item.y).setVisible(v.visible);
      const pg = b.getByName('pips') as Phaser.GameObjects.Graphics;
      pg.clear();
      if (x.item.kind === 'overcharge') for (let k = 0; k < x.item.charges; k++) pg.fillStyle(0x2b1d2e, 1).fillCircle(-8 + k * 16, 26, 7).fillStyle(ITEM_COL, 1).fillCircle(-8 + k * 16, 26, 5);
    }
    for (const [id, b] of this.itemBadges)
      if (!seen.has(id)) {
        this.itemBadges.delete(id);
        this.tweens.add({ targets: b, scale: 1.6, alpha: 0, duration: 160, onComplete: () => b.destroy() });
      }
  }

  /** Transient message in the event lane. Remix warnings (drawRemix) override it while active. */
  /** r34: draining clock ring + 30 s warning + last-10 countdown over the board (the board is where the player looks). */
  drawClock(hidden: boolean) {
    const s = this.s;
    const r = this.clockRing.clear();
    const sc = s.stage ? this.stageCount() : undefined;
    if (this.mergesLeftLabel.visible !== !!s.puzzle) this.mergesLeftLabel.setVisible(!!s.puzzle).setY(HP_Y - 52);
    // puzzles set the pips to merges-left below: skip this text so it isn't re-rendered twice every frame
    if (!s.puzzle) this.stagePips.setText(sc ? `${sc.goal ? 'GOAL' : `${sc.at}/${sc.n}`}` : '').setVisible(!!sc && !hidden);
    if (sc) {
      r.fillStyle(0x2b1d2e, 1).fillRoundedRect(W - CLOCK_X - 46, HP_Y - 26, 92, 52, 16);
    }
    if (s.puzzle) {
      // r42 puzzles: no time; the ring shows merges left
      this.timerText.setText('');
      const left = s.puzzle.moves - s.puzzle.used;
      r.fillStyle(0x2b1d2e, 1).fillCircle(CLOCK_X, HP_Y, 50).fillStyle(0x8e58c9, 1).fillCircle(CLOCK_X, HP_Y, 40);
      this.stagePips.setText(`${left}`).setVisible(true).setPosition(CLOCK_X, HP_Y).setFontSize(44);
      return;
    }
    this.stagePips.setPosition(W - CLOCK_X, HP_Y).setFontSize(30);
    if (hidden || s.phase === 'tutorial') return;
    const total = s.levelTime ?? TUNING.runTime;
    const frac = Phaser.Math.Clamp(s.timeLeft / Math.max(1, total), 0, 1);
    const col = s.timeLeft < 10 ? 0xe8452c : s.timeLeft < 30 ? 0xf2b521 : 0x5fd35f;
    r.fillStyle(0x2b1d2e, 1).fillCircle(CLOCK_X, HP_Y, 50);
    r.fillStyle(0xfff0cf, 1).fillCircle(CLOCK_X, HP_Y, 36);
    if (frac > 0) r.lineStyle(10, col, 1).beginPath().arc(CLOCK_X, HP_Y, 43, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * frac, false).strokePath();
    // r39: gold ticks where the 2- and 3-star times fall (still reachable ones bright, missed ones faded)
    const sdef = s.level !== undefined && !s.rush && !s.bounty && !s.endless ? LEVELS[s.level - 1] : undefined;
    if (sdef?.star_times)
      for (const st of sdef.star_times) {
        const a = -Math.PI / 2 + Math.PI * 2 * Math.max(0, (total - st) / total);
        const live = s.elapsed <= st;
        r.lineStyle(5, live ? 0xffcf33 : 0x8a7a5a, live ? 1 : 0.6).lineBetween(CLOCK_X + Math.cos(a) * 36, HP_Y + Math.sin(a) * 36, CLOCK_X + Math.cos(a) * 52, HP_Y + Math.sin(a) * 52);
      }
    const sec = Math.ceil(s.timeLeft);
    if (sec !== this.lastSec && s.phase === 'playing' && !this.paused) {
      const prev = this.lastSec;
      this.lastSec = sec;
      if (prev > 30 && sec <= 30 && total > 45) this.showEvent('30 SECONDS LEFT!', '#ffcf33', 1100);
      if (sec <= 10 && sec > 0 && prev > sec) {
        this.timerText.setScale(1.45);
        this.tweens.add({ targets: this.timerText, scale: 1, duration: 320, ease: 'Back.Out' });
        const big = this.add.text(W / 2, BY + (CELL * ROWS) / 2, String(sec), { fontFamily: 'Lilita One, Arial Black', fontSize: '260px', color: '#e8452c', stroke: '#2b1d2e', strokeThickness: 14 }).setOrigin(0.5).setDepth(70).setAlpha(0.32).setScale(1.2);
        this.tweens.add({ targets: big, alpha: 0, scale: 0.9, duration: 800, onComplete: () => big.destroy() });
        this.cameras.main.flash?.(120, 120, 20, 10, false);
      }
    }
  }

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
    if (msg) textColor(this.laneText, col);
    const a = on ? 1 : Math.max(0, this.laneText.alpha - 0.08);
    this.laneText.setAlpha(a);
    this.laneBg.setAlpha(a * 0.95);
  }

  /** Start height for a number floating over the monster: it rises 70 as it fades, so on a short stage it must start
   *  low enough to stay inside the frame (UI audit: at 375x667 damage numbers drifted out over the header). */
  stageFloatY(y: number) {
    return Math.max(STAGE_TOP + 74, y);
  }

  floatText(x: number, y: number, text: string, color = '#ffffff', size = 34, hold = 0, banner = '') {
    const label = this.add.text(0, 0, text, { fontFamily: 'Lilita One, Arial Black', fontSize: `${size}px`, color, stroke: '#2b1d2e', strokeThickness: Math.max(5, size / 6), align: 'center' }).setOrigin(0.5);
    const t = this.add.container(x, y).setDepth(70);
    // walkthrough 3: the top-row HUD chips (star chase, shield) fade while a stage banner crosses them
    if (banner === 'banner_chain') this.bannerUntil = Math.max(this.bannerUntil, this.time.now + 160 + 220 + hold + 700);
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
    // reduced motion: the ring fades out at a fixed radius instead of expanding
    const o = { r: REDUCED_MOTION ? radius * 0.65 : radius * 0.3, a: 1 };
    if (REDUCED_MOTION) radius = o.r;
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
      const col = kind === 'backfire' ? 0xff5a3c : kind === 'bridge' ? 0x6ff3ff : kind === 'magnet' ? 0xe07af0 : kind === 'battery' ? PRIME_COL : kind === 'fan' ? 0xbfe8ff : 0xffe066;
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
    img.setScale(REDUCED_MOTION ? s : s * 0.6);
    this.tweens.add({ targets: img, scale: REDUCED_MOTION ? s : s * (opts.grow ?? 1.3), alpha: 0, duration: opts.dur ?? 160, ease: 'Quad.Out', onComplete: () => img.destroy() });
    return true;
  }

  flash(x: number, y: number, size: number, color = 0xffffff) {
    const c = this.add.image(x, y, 'dot').setTint(color).setDepth(49).setScale(size / 16).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: c, scale: REDUCED_MOTION ? size / 16 : (size * 1.6) / 16, alpha: 0, duration: 140, onComplete: () => c.destroy() });
  }

  static FACE = FACE;

  showFace(mood: 'hit' | 'angry' | 'dizzy' | null, ms = 0) {
    const ti = this.s.target;
    const key = ti >= 0 && mood && !this.realBoss && !this.castOf(this.s.level) ? `face_${ti}_${mood}` : '';
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
      // smoke test r29: a face started on the previous level could outlive it onto a monster with no face anchor
      const f = GameScene.FACE[Math.max(0, s.target)];
      if (!f) {
        this.faceUntil = 0;
        this.face.setVisible(false);
        return;
      }
      this.face.setPosition(this.target.x + f.x * this.target.displayWidth, this.target.y + f.y * this.target.displayHeight).setAngle(this.target.angle).setAlpha(this.target.alpha);
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

  shoot(fromX: number, fromY: number, color: number, delay: number, big: boolean, onHit?: () => void, scale = big ? 1.7 : 0.8) {
    this.time.delayedCall(delay, () => {
      const b = this.add.image(fromX, fromY, 'dot').setTint(color).setDepth(52).setScale(scale);
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
    if (TUNING.quietPassive) {
      // PACE CALM: a small pale dot and a puff, no knock and no number, so auto-fire stays background
      this.shoot(x, y - 40, 0xffc0a0, 0, false, () => (this.passiveAcc = 0), 0.45);
      return;
    }
    this.shoot(x, y - 40, 0xff9a72, 0, false, () => {
      this.hitTarget(false);
      // r19: passive hits = particles; a small, pale number so auto-shots read as damage without competing with chain payloads
      const hx = this.target.x + Phaser.Math.Between(-60, 60), hy = this.target.y + Phaser.Math.Between(-40, 30);
      this.sparks.setParticleTint(0xffc0a0);
      this.sparks.explode(4, hx, hy);
      if (dmg >= 1) this.floatText(hx, this.stageFloatY(hy - 30),`${Math.round(dmg)}`, '#ffd0b8', 22).setAlpha(0.85);
      this.passiveAcc = 0;
    });
  }

  formula!: FormulaStrip;
  support?: SupportCard;
  pendingFormula: HitFormula | null = null;
  playCascade(r: CascadeResult, odStart: boolean, kickback: boolean) {
    this.lastCascade = r;
    // rival study #3: a player merge's chain ribbon is its hit formula, counted up link by link
    const hf = !kickback && this.pendingFormula?.machines === r.count ? this.pendingFormula : null;
    this.pendingFormula = null;
    const ribbon = !!hf && (hf.machines > 1 || hf.terms.length > 0 || hf.cap !== null);
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
      const col = e.kind === 'item' ? ITEM_COL : e.kind === 'coil' ? 0x5fe8ff : e.kind === 'bell' ? 0xffd34a : e.kind === 'magnet' ? 0xe07af0 : e.kind === 'battery' ? PRIME_COL : e.kind === 'fan' ? 0xbfe8ff : e.kind === 'backfire' ? 0xff5a3c : e.kind === 'bridge' ? 0x6ff3ff : e.kind === 'chime' ? 0xffe066 : e.kind === 'horn' ? 0xe8b060 : e.kind === 'fuse_box' ? 0xff7ab0 : e.kind === 'arc' ? 0x7a9aff : e.kind === 'amp' ? AMP_COL : 0xffffff;
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
    // r25: a power-up that fires pops its icon over its machine (OVERCHARGE also shows x2)
    for (const id of r.itemUsed ?? []) {
      const kind = this.itemBadges.get(id)?.getData('kind') as string | undefined;
      const act = r.activations.find((x) => x.id === id);
      if (!kind || !act) continue;
      const { x, y } = cellXY(act.idx);
      this.time.delayedCall(windup + act.depth * step, () => {
        const im = this.add.image(x, y - 20, `item_${kind}`).setDepth(62);
        im.setScale(40 / Math.max(im.width, im.height));
        this.tweens.add({ targets: im, y: y - 90, scale: im.scale * 1.8, alpha: 0, duration: 650, ease: 'Quad.Out', onComplete: () => im.destroy() });
        this.ring(x, y, ITEM_COL, 70, 10, 320);
        if (kind === 'overcharge') this.floatText(x + 40, y - 40, 'x2', hex(ITEM_COL), 34, 200);
        sfx.merge?.(4);
      });
      tlog.log('item_used', { kind });
    }

    // group activations into beats (one per depth): one phrase note + at most one zap / ring / payload per beat
    // live chain counter: the ladder's 'xN' at the source cell (the old lane counter is gone, so only one counter shows)
    playChainLadder(this, r.activations, windup, step, root, REDUCED_MOTION);
    for (let d = 0; d <= maxDepth; d++) {
      const at = (windup + d * step) / 1000;
      const acts = r.activations.filter((a) => a.depth === d);
      playBeatSounds(acts, at); // t-e91097cd: every unit has its own sound
    }
    r.activations.forEach((a) => {
      const delay = windup + a.depth * step;
      const { x, y } = cellXY(a.idx);
      const color = FAMILY_INFO[a.family].color;
      this.time.delayedCall(delay, () => {
        const g = this.s.grid[a.idx];
        const v = g && g.id === a.id ? this.views.get(a.id) : undefined;
        const mergePop = !kickback && a.depth === 0 && a.idx === r.rootIdx; // commitDrop already pops the merged gadget
        if (v && v !== this.dragView && !mergePop) {
          this.tweens.killTweensOf(v);
          if (REDUCED_MOTION) v.setScale(1).setAngle(0).setPosition(x, y);
          else {
            v.setScale(1.3).setPosition(x, a.family === 'cannon' ? y + 12 : y);
            this.tweens.add({ targets: v, scale: 1, x, y, duration: 240, ease: 'Back.Out' });
          }
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
      // t-e91097cd: only a machine that deals damage fires a shot at the monster
      if (a.contribution > 0) this.shoot(x, y - 30, color, delay + 30, a.family === 'cannon');
      playJobTag(this, a, { x, y }, delay); // roster B: Mortar DEPTH x1.48, Rocket BURST x2 ... over the machine
    });
    const end = windup + maxDepth * step + 260 + chainHoldMs(r.count);
    if (ribbon) this.formula.play(hf!, r.activations.map((a) => windup + a.depth * step), end);
    this.time.delayedCall(end, () => {
      this.hitTarget(true, r.count >= 10 ? 1 : 0);
      bigFinish(this, r.count);
      if (r.count >= 3) {
        sfx.chord(Math.min(r.count, 20));
        duckMusic();
      }
      // camera stays still (playtest 2 + ChatGPT r11); only a MAX machine gives a tiny kick, and Shake can switch it off
      const hasMax = r.activations.some((a) => a.rank >= MAX_RANK);
      if (hasMax) this.shake(80, 0.002);
      if (r.count >= 10) haptic(10);
      const huge = r.count >= 10;
      // EXPERIMENT spam fatigue: a hurried merge's number is dimmed and says how much of its hit landed
      const tired = r.fatigue !== undefined && r.fatigue < 1 ? `  ·  RUSHED ${Math.round(r.fatigue * 100)}%` : '';
      if (r.count > 1 && !ribbon) this.showEvent(`x${r.count} CHAIN  ·  ${fmt(r.total)}${tired}`, tired ? '#b8a8b0' : huge ? '#ffd24a' : '#fff0cf', 1500);
      if (!kickback && r.count >= 3)
        this.time.delayedCall(500, () =>
          this.explain('x_chain', [
            { text: `Your merge fired this gadget.\n${chainWakeText(this.s.grid.flatMap((g) => (g ? [g.family] : [])))}`, spots: [cellXY(r.rootIdx)], draw: () => this.chainArrows(r, 3, true) },
            { text: `Those fired too: a CHAIN of ${r.count}!\nMove gadgets next to each other\nto connect their reach.`, spots: [], draw: () => this.chainArrows(r, 3, false) },
          ]),
        );
      // damage number beside the opponent, never on its face
      const capped = this.s.level !== undefined && !this.s.goal && r.total > this.s.maxHp * TUNING.cascadeCap;
      if (capped && !ribbon) this.showEvent(`x${r.count} CHAIN  \u00b7  MAX HIT!`, '#ffd24a', 1500);
      if (!this.s.goal && r.count <= 1) this.floatText(this.target.x + 150, this.stageFloatY(this.target.y - 40), capped ? 'MAX' : fmt(r.total), tired ? '#8a7a82' : huge ? '#ffcf33' : '#ffffff', tired ? 26 : huge ? 44 : 34, huge ? 200 : 0);
    });
  }

  /** Final blow: hit-stop, rattle with dizzy face, rolling explosions, collapse, parts rain onto your board, machine celebrates. */
  playBossDefeat() {
    const tgt = this.target;
    const name = this.monName() ?? 'BOSS'; // F2: the machine on stage (L9: COLANDER CLATTER), not the level's base monster
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
  /** r38 (ChatGPT review): one focal point when a boss first wakes - dimmed board, clock stopped, a single card. */
  bossWakeCard(bd: (typeof BOSSES)[number]) {
    const key = `xb_wake_${bd.id}`;
    if (this.meta.tips[key] || this.s.phase !== 'playing' || this.modal) return;
    this.meta.tips[key] = true;
    // NEW! when the player has never been warned about this attack before
    const fresh = !this.meta.tips[`xb_${bd.attack}`] && !this.meta.tips[`x_${bd.attack}`];
    this.meta.tips[`xb_${bd.attack}`] = true; // the card is this attack's lesson
    this.meta.tips.x_boss = true; // F4: and the boss lesson (no second 'BOSS ATTACK!' card at the first warning)
    store(META_KEY, JSON.stringify(this.meta));
    tlog.log('boss_wake_card', { id: bd.id, fresh });
    this.paused = true;
    this.cancelDrag();
    const o = this.add.container(0, 0).setDepth(96);
    o.add(this.add.rectangle(W / 2, H / 2, W, H, 0x1a0f18, 0.45).setInteractive());
    const cw = 590, ch = 470, cy = BY + (CELL * ROWS) / 2;
    o.add(this.add.graphics().fillStyle(0x2b1d2e, 1).fillRoundedRect(W / 2 - cw / 2 - 6, cy - ch / 2 - 6, cw + 12, ch + 12, 30).fillStyle(0xfbe7c6, 1).fillRoundedRect(W / 2 - cw / 2, cy - ch / 2, cw, ch, 26));
    let y = cy - ch / 2 + 50;
    if (fresh) {
      o.add(this.add.text(W / 2, y - 18, 'NEW!', { fontFamily: 'Lilita One, Arial Black', fontSize: '24px', color: '#ffffff', backgroundColor: '#e8452c', padding: { x: 10, y: 1 } }).setOrigin(0.5));
      y += 22;
    }
    o.add(this.add.text(W / 2, y + 8, `${bd.name} WAKES!`, { fontFamily: 'Lilita One, Arial Black', fontSize: '40px', color: '#e8452c' }).setOrigin(0.5));
    o.add(this.add.text(W / 2, y + 62, bd.copy, { fontFamily: 'Arial', fontStyle: 'bold', fontSize: '26px', color: '#3b2533', align: 'center', wordWrap: { width: cw - 70 } }).setOrigin(0.5, 0));
    const dg = this.bossDiagram(bd.attack);
    o.add(this.add.container(W / 2, cy + 90, [dg]).setScale(1.35));
    const done = () => {
      sfx.click();
      o.destroy();
      this.paused = false;
      this.restartFuse(); // F4: an attack already warned while the card was up gets its full countdown back
    };
    this.button(o, W / 2, cy + ch / 2 - 52, 260, 'GOT IT', 0x5fbf4a, done, 0.8);
  }

  /** Boss name plate over the stage (run intro, and r33 when a stage's boss wakes after its minions). */
  bossNameCard(bd = BOSSES[this.realBoss!.def]) {
    const card = this.add.container(W / 2, STAGE_TOP + STAGE_H - 60).setDepth(85);
    if (this.hasArt('boss_card')) {
      const pl = this.add.image(0, 0, 'boss_card');
      pl.setScale(560 / pl.width);
      card.add(pl);
    }
    card.add(this.add.text(0, -6, bd.name, { fontFamily: 'Lilita One, Arial Black', fontSize: '44px', color: '#ffcf33', stroke: '#2b1d2e', strokeThickness: 8 }).setOrigin(0.5));
    card.setScale(0.6).setAlpha(0);
    this.tweens.chain({ targets: card, tweens: [{ scale: 1, alpha: 1, duration: 260, ease: 'Back.Out' }, { alpha: 0, duration: 250, delay: 900 }], onComplete: () => card.destroy() });
    return card;
  }

  introTarget() {
    // r33 stages: the next machine walks in after the kill animation (~0.9 s on the same sprite)
    this.time.delayedCall(this.s.stage ? 1000 : 80, () => {
      this.tweens.killTweensOf(this.target);
      this.setTargetTexture();
      if (this.s.stage) this.target.clearTint().setAlpha(1).setAngle(0).setX(W / 2).setScale(this.targetBaseScale);
      const sc = this.stageCount();
      if (sc && this.realBoss) {
        // r33: the boss wakes after its minions
        sfx.panelBreak(0);
        this.softFlash(0x2b1d2e, 0.35, 260);
        // r37: capture the boss now (it can already be beaten when the delayed calls fire)
        const bd = BOSSES[this.realBoss.def];
        this.time.delayedCall(380, () => this.bossNameCard(bd));
        this.time.delayedCall(1500, () => this.s.phase === 'playing' && this.showEvent(bd.mini ? 'MINI-BOSS!' : 'BOSS!', '#ffcf33', 1200));
        // r34/r38 onboarding: the first time a boss wakes, ONE paused card: name, rule, board diagram, GOT IT
        this.time.delayedCall(1700, () => this.afterHold(() => this.bossWakeCard(bd)));
        tlog.log('stage_boss', { at: +this.s.elapsed.toFixed(1) });
      } else if (sc && this.s.goal) {
        const g = this.s.goal;
        this.time.delayedCall(380, () => this.floatText(W / 2, STAGE_TOP + 60, `LAST ONE!  ${g.kind === 'rank' ? `BUILD A RANK ${g.n}` : `FIRE A CHAIN x${g.n}`}`, '#8ef08a', 40, 1100, 'banner_chain'));
        tlog.log('stage_goal', { at: +this.s.elapsed.toFixed(1) });
      } else if (sc) {
        this.time.delayedCall(700, () => this.floatText(W / 2, STAGE_TOP + 60, `${sc.at}/${sc.n}  ·  ${this.monName()}`, '#ffffff', 40, 700, 'banner_chain'));
        tlog.log('stage_next', { at: +this.s.elapsed.toFixed(1), machine: sc.at });
      } else if (this.s.target >= 0) {
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
    // modals that own timers (best-chain replay) tear them down here, not 140 ms later on destroy
    m.emit('modalclose');
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
    // UI audit: long labels ran past the pill ('SWAP ON DROP: OFF'), so they shrink to fit; small buttons keep a
    // finger-sized hit height (44 pt on a 390 pt-wide phone is ~82 design px) whatever their scale
    // (a pill-art image is height-limited, so its face can be narrower than w; its rivet caps take ~12% a side)
    const face = g instanceof Phaser.GameObjects.Image ? Math.min(w - 44, g.displayWidth * 0.76) : w - 44;
    if (t.width > face) t.setScale(face / t.width);
    b.add([g, t]).setSize(w, Math.max(86, TAP_MIN / size)).setInteractive({ useHandCursor: true });
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

  /** Makes a text link tappable with a finger-sized hit box (TAP_MIN tall, padded sideways) instead of the bare glyphs. */
  tapLink(t: Phaser.GameObjects.Text, cb: () => void) {
    const h = Math.max(t.height, TAP_MIN);
    t.setInteractive({ hitArea: new Phaser.Geom.Rectangle(-20, (t.height - h) / 2, t.width + 40, h), hitAreaCallback: Phaser.Geom.Rectangle.Contains, useHandCursor: true });
    t.on('pointerup', cb);
    return t;
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
        const res = recordCommand(this.runLog, this.s, { k: 'perk', perk: id });
        this.handleEvents(res.events);
        this.showEvent(p.name + '  ·  ' + p.text, '#ffd24a', 2400);
        this.save();
      });
      c.add(card);
    });
  }

  openResult(won: boolean) {
    if (this.modal) this.closeModal();
    // the run is over: its last 'playing' snapshot must never resume (a lost fight retried, a won one replayed)
    store(SAVE_KEY, null);
    if (this.s.rush) return this.openRushResult(won);
    if (this.s.bounty) return this.openBountyResult(won);
    if (this.s.endless) return this.openEndlessResult(won);
    if (this.s.puzzle) return this.openPuzzleResult(won);
    if (this.s.level !== undefined) return this.playBestChain(() => this.openLevelResult(won));
    const s = this.s;
    const m = this.meta;
    m.runs++;
    let newBest = false;
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
      // t-2fd7bb86: a classic win no longer opens features (they follow the road, unlocks.ts)
      m.hardUnlocked = true;
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
    const head = this.add.text(W / 2, top + 70, won ? `${this.monName()} DEFEATED!` : "TIME'S UP!", { fontFamily: 'Lilita One, Arial Black', fontSize: '58px', color: won ? '#e8452c' : '#3b2533' }).setOrigin(0.5);
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

  /** r43 pride moment: before the level result, rebuild the board right before this attempt's biggest player chain
   *  (start state + command log, see core/replay) and play that chain back in slow motion (~3 s, tap to skip).
   *  A small self-contained board on its own layer: no sprites from the live board, no physics, a few dozen images. */
  playBestChain(done: () => void) {
    const log = this.runLog;
    const best = log.best;
    if (!best || best.count < 3) return done();
    let before: GameState | null = null;
    let cascade: CascadeResult | null = null;
    const a = log.actions[best.at];
    try {
      before = replayRun(log, best.at);
      if (before && a?.k === 'drop') {
        const after = JSON.parse(JSON.stringify(before)) as GameState;
        const e = applyCommand(after, a).events.find((x) => x.type === 'cascade');
        if (e?.type === 'cascade') cascade = e.result;
      }
    } catch {
      cascade = null;
    }
    // a replay that does not reproduce the recorded chain is never shown (no faked pride moment)
    if (!before || !cascade || a?.k !== 'drop' || cascade.count !== best.count) return done();
    tlog.log('best_chain_replay', { level: this.s.level, count: best.count });

    const c = this.add.container(0, 0).setDepth(100);
    this.modal = c;
    const dim = this.add.rectangle(W / 2, H / 2, W, H, 0x1a0f18, 0.82).setInteractive();
    c.add(dim);
    const MC = 96;
    const ox = W / 2 - (COLS * MC) / 2, oy = H / 2 - (ROWS * MC) / 2 + 30;
    const at = (i: number) => ({ x: ox + (i % COLS) * MC + MC / 2, y: oy + Math.floor(i / COLS) * MC + MC / 2 });
    const bg = this.add.graphics().fillStyle(0x2b1d2e, 1).fillRoundedRect(ox - 14, oy - 14, COLS * MC + 28, ROWS * MC + 28, 24);
    for (let i = 0; i < ROWS * COLS; i++) bg.fillStyle(0xfbe7c6, 0.14).fillRoundedRect(at(i).x - MC / 2 + 4, at(i).y - MC / 2 + 4, MC - 8, MC - 8, 12);
    c.add(bg);
    const piece = (fam: Family, rank: number, i: number) => {
      const p = at(i);
      const key = `${fam}_${rank}`;
      const img = this.add.image(p.x, p.y, this.textures.exists(key) ? key : 'slot');
      img.setScale((MC - 14) / Math.max(img.width, img.height, 1));
      c.add(img);
      return img;
    };
    const views = new Map<number, Phaser.GameObjects.Image>();
    before.grid.forEach((g, i) => {
      if (g && i !== a.from && i !== a.to) views.set(i, piece(g.family, g.rank, i));
    });
    const ga = before.grid[a.from]!;
    const mover = piece(ga.family, ga.rank, a.from);
    const target = piece(ga.family, ga.rank, a.to);
    const links = this.add.graphics();
    c.add(links);
    const title = this.add.text(W / 2, oy - 70, 'YOUR BEST CHAIN', { fontFamily: 'Lilita One, Arial Black', fontSize: '44px', color: '#ffd24a' }).setOrigin(0.5);
    const counter = this.add.text(W / 2, oy + ROWS * MC + 60, '', { fontFamily: 'Lilita One, Arial Black', fontSize: '64px', color: '#ffffff' }).setOrigin(0.5);
    const skip = this.add.text(W / 2, H - 60, 'tap to skip', { fontFamily: 'Arial', fontStyle: 'bold', fontSize: '22px', color: '#c8b8a8' }).setOrigin(0.5);
    c.add([title, counter, skip]);

    let finished = false;
    const timers: Phaser.Time.TimerEvent[] = [];
    // one teardown for every close path: our own finish, closeModal() (e.g. the next level starting) or a direct
    // destroy (sheet()). Only finish() goes on to done(); an outside close means someone else moved on.
    const teardown = () => {
      if (finished) return false;
      finished = true;
      for (const t of timers) t.remove(false);
      this.tweens.killTweensOf(c.list);
      dim.off('pointerdown').off('pointerup');
      return true;
    };
    c.once('modalclose', teardown);
    c.once('destroy', teardown);
    const finish = () => {
      if (!teardown()) return;
      if (this.modal === c) this.modal = null;
      c.destroy();
      done();
    };
    // Skip only on a press that STARTS on the dim: the tap that skipped the win show opens this replay mid-press,
    // and its release must not close it instantly.
    let pressed = false;
    dim.on('pointerdown', () => (pressed = true));
    dim.on('pointerup', () => pressed && finish());
    const later = (ms: number, fn: () => void) => timers.push(this.time.delayedCall(ms, () => !finished && fn()));

    // 1) the merge slides in slowly (0.45 s), 2) each activation lights up in order (~2 s), 3) hold on the count
    const MERGE = 450;
    const p = at(a.to);
    this.tweens.add({ targets: mover, x: p.x, y: p.y, duration: MERGE, ease: 'Quad.InOut' });
    later(MERGE, () => {
      mover.destroy();
      const key = `${ga.family}_${Math.min(ga.rank + 1, capOf(before!, ga.family))}`;
      if (this.textures.exists(key)) target.setTexture(key).setScale((MC - 14) / Math.max(target.width, target.height, 1));
      views.set(a.to, target);
    });
    const acts = cascade.activations;
    const step = Math.min(300, 2000 / acts.length);
    acts.forEach((act, k) => {
      later(MERGE + 80 + k * step, () => {
        const q = at(act.idx);
        if (act.parent >= 0 && act.parent !== act.idx) {
          const f = at(act.parent);
          links.lineStyle(8, 0xffcf33, 0.85).lineBetween(f.x, f.y, q.x, q.y);
        }
        links.lineStyle(5, 0xffcf33, 1).strokeCircle(q.x, q.y, MC / 2 - 4);
        const v = views.get(act.idx);
        if (v && !REDUCED_MOTION) this.tweens.add({ targets: v, scale: v.scale * 1.3, duration: Math.max(80, step * 0.5), yoyo: true, ease: 'Quad.Out' });
        counter.setText(`CHAIN x${k + 1}`);
        sfx.click();
      });
    });
    const end = MERGE + 80 + acts.length * step;
    later(end, () => {
      counter.setColor('#ffd24a');
      if (!REDUCED_MOTION) this.tweens.add({ targets: counter, scale: 1.25, duration: 160, yoyo: true, ease: 'Back.Out' });
    });
    later(end + 650, finish);
  }

  /** r46 ghost pace on a replay of a beaten level: a thin tick on the HP bar where the best run's HP is now, and a
   *  small "2.1 s ahead" above the bar's right end (over the stage, never the board). Text refreshes 4x a second. */
  drawPace(bw: number) {
    const s = this.s;
    const p = this.paceGhost && s.phase === 'playing' && !this.modal ? levelProgress(s) : null;
    if (!this.paceText) {
      this.paceText = this.add.text(W / 2 + bw / 2, HP_Y - 30, '', { fontFamily: 'Lilita One, Arial Black', fontSize: '20px', color: '#fff0cf', stroke: '#2b1d2e', strokeThickness: 5 }).setOrigin(1, 0.5).setDepth(4).setAlpha(0.85);
      this.paceG = this.add.graphics().setDepth(3.5); // above the HP number and the kickback quarter ticks
    }
    this.paceG!.clear();
    if (p === null || !this.paceGhost || s.elapsed < 1) {
      this.paceText.setVisible(false);
      return;
    }
    // ghost marker: the ghost's damage mapped into the current machine's bar (stages: the bar is per machine)
    const st = s.stage;
    const g = ghostProgress(this.paceGhost, s.elapsed);
    const inMachine = st ? (g * st.total - st.done) / s.maxHp : g;
    const gx = W / 2 - bw / 2 + bw * (1 - Math.min(1, Math.max(0, inMachine)));
    this.paceG!.fillStyle(0x2b1d2e, 0.9).fillRect(gx - 2.5, HP_Y - 16, 5, 32); // dark outline: readable on the pale fill
    this.paceG!.fillStyle(0xfff0cf, 0.95).fillRect(gx - 1.5, HP_Y - 15, 3, 30);
    if (this.paceShownAt < 0 || s.elapsed - this.paceShownAt >= 0.25 || s.elapsed < this.paceShownAt) {
      this.paceShownAt = s.elapsed;
      const d = paceDelta(this.paceGhost, s.elapsed, p);
      textColor(this.paceText.setText(paceLabel(d)), Math.abs(d) < 0.05 ? '#fff0cf' : d > 0 ? '#8ef08a' : '#ffa58a');
    }
    this.paceText.setVisible(true);
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
    if (!def) return this.openTitle(); // a level this build no longer has: nothing to score, back home
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
    const chest = { goldCrates: 0, gems: 0 }; // walkthrough 3: listed on the CHAPTER COMPLETE chest
    if (won) {
      m.wins++;
      got = starsFor(def, s.elapsed);
      if (fresh) {
        this.seasonEv('levelWin');
        if (s.stats.biggestChain >= 8) this.seasonEv('chain8');
        if (got === 3) this.seasonEv('threeStars');
      }
      const prev = stars[key] ?? 0;
      firstClear = prev === 0;
      const rw = levelReward(def);
      if (fresh) {
        // r46 ghost pace: the fastest win becomes the ghost (rebuilt from the run log; a log that doesn't replay to this win is not stored)
        const curve = paceFromLog(this.runLog);
        if (curve && Math.abs(curve.t - s.elapsed) < 0.06) updatePace((m.levelPace ??= {}), key, curve);
        const lvB = firstClear ? rw.win_bolts + rw.first_clear_bolts : Math.min(rw.win_bolts, Math.floor(0.15 * s.elapsed));
        const stB = Math.max(0, got - prev) * rw.new_star_bolts;
        bolts += lvB + stB;
        parts.push(`${firstClear ? 'First clear' : 'Level'} +${lvB}`);
        // r40 Saga Mastery: contracts met in this win earn medals (+Bolts; every 10th a Wood crate, every 30th Iron, all = Gold)
        const medals = (m.sagaMedals ??= {});
        const doneHere = (medals[key] ??= []);
        contractsFor(def).forEach((ct, ci) => {
          if (doneHere.includes(ci) || !contractMet(ct, s)) return;
          doneHere.push(ci);
          this.seasonEv('medal');
          bolts += MASTERY_BOLTS;
          const total = Object.values(medals).reduce((t, v) => t + v.length, 0);
          lines.push(`MASTERY \u2713 ${contractText(ct)}  +${MASTERY_BOLTS}`);
          if (total % 30 === 0) {
            this.giveCrate('iron');
            lines.push(`${total} MASTERY MEDALS: +1 IRON CRATE`);
          } else if (total % 10 === 0) {
            this.giveCrate('wood');
            lines.push(`${total} MASTERY MEDALS: +1 WOOD CRATE`);
          }
          if (total === LEVELS.length * 2) {
            this.giveCrate('gold');
            lines.push('EVERY MEDAL! +1 GOLD CRATE');
          }
          tlog.log('mastery_medal', { level: n, contract: ct.kind, total });
        });
        if (firstClear && n === YARD_UNLOCK) lines.push('NEW EVENT: SCREW YARD!  (EVENTS tab)');
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
      // r32 crates from play: mini-boss -> iron, chapter boss -> gold, every 3rd ordinary first clear -> wood
      if (fresh && firstClear) {
        const kind: CrateKind | null = def.mini_boss ? 'iron' : n % 10 === 0 ? 'gold' : n % 3 === 0 ? 'wood' : null;
        if (n % 10 === 0) {
          m.gems = (m.gems ?? 0) + GEM_REWARDS.chapterBoss;
          chest.gems += GEM_REWARDS.chapterBoss;
          lines.push(`+${GEM_REWARDS.chapterBoss} GEMS`);
        }
        if (kind) {
          this.giveCrate(kind);
          if (kind === 'gold' && n % 10 === 0) chest.goldCrates++;
          lines.push(`+1 ${CRATES[kind].name}`);
        }
      }
      if (firstClear && n % 10 === 0 && !(m.medals ??= {})[String(n / 10)]) {
        m.medals![String(n / 10)] = true;
        chapterDone = n / 10;
        tlog.log('chapter_reward_granted', { chapter: chapterDone });
      }
      if (n >= 5 && !m.hardUnlocked) m.hardUnlocked = true;
      // t-2fd7bb86: features open one at a time (unlocks.ts), each announced once here and tagged NEW where it lives
      for (const f of this.checkUnlocks()) if (f !== 'gems') lines.push(`\u2605 NEW: ${FEATURE_INFO[f].name}  (${FEATURE_INFO[f].where}) \u2605`);
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
    const sub = fitLine(this.add.text(W / 2, top + 140, s.goal ? (won ? `${goalDoneText(s.goal)} in ${s.elapsed.toFixed(1)}s` : `Best ${s.goal.kind === 'rank' ? 'rank' : 'chain x'}${s.goal.best} of ${s.goal.n}  ·  so close!`) : won ? (s.stage ? `${this.stageCount()!.n} machines down in ${s.elapsed.toFixed(1)}s` : `${this.monName()} down in ${s.elapsed.toFixed(1)}s`) : soCloseText({ hp: s.hp, maxHp: s.maxHp, stage: s.stage, playerDamage: s.stats.dmgBy.player ?? 0, merges: s.stats.merges }, this.realBoss ? BOSSES[this.realBoss.def].name : this.monName()), { fontFamily: 'Lilita One, Arial Black', fontSize: '28px', color: '#5a4a5a' }).setOrigin(0.5), W - 120);
    if (sub.width > W - 120) sub.setScale((W - 120) / sub.width); // walkthrough 3: no overflow at 390 wide
    c.add(sub);
    // UI audit: a loss showed three ghost stars over a big empty gap; it now shows the sad-cannon art there instead
    if (!won && this.hasArt('defeat')) {
      const im = this.fitVisible(this.add.image(W / 2, top + 296, 'defeat'), 240);
      const sc = im.scale;
      c.add(im.setScale(0));
      this.tweens.add({ targets: im, scale: sc, duration: 300, delay: 150, ease: 'Back.Out' });
    } else for (let k = 0; k < 3; k++) {
      const st = this.add.image(W / 2 + (k - 1) * 130, top + 270 + (k === 1 ? -14 : 0), 'star');
      const sc = (k === 1 ? 120 : 100) / Math.max(st.width, st.height);
      st.setScale(0).setAlpha(k < got ? 1 : 0.22);
      c.add(st);
      this.tweens.add({ targets: st, scale: sc, duration: 260, delay: 200 + k * 220, ease: 'Back.Out', onStart: () => k < got && sfx.star(k) });
    }
    if (won && got < 3) c.add(this.add.text(W / 2, top + 360, `Next star: clear in ${starGoals(def)[got === 1 ? 0 : 1]}s`, { fontFamily: 'Arial', fontStyle: 'bold', fontSize: '20px', color: '#7a5a4a' }).setOrigin(0.5));
    // reward row: chain, then a bolt icon + the bolts (UI audit: rewards read as plain text)
    const big = { fontFamily: 'Lilita One, Arial Black', fontSize: '38px', color: '#3b2533' };
    const rowObjs: (Phaser.GameObjects.Text | Phaser.GameObjects.Image)[] = [];
    if (s.stats.biggestChain >= 2 && n >= 2) rowObjs.push(this.add.text(0, 0, `Biggest chain x${s.stats.biggestChain}`, big));
    if (bolts > 0) {
      // F8: the Bolts currency icon (the wallet's), not the Overdrive lightning
      const bk = this.hasArt('bolt') ? 'bolt' : 'icon_bolt';
      if (this.hasArt(bk)) rowObjs.push(this.fitVisible(this.add.image(0, 0, bk), 46));
      rowObjs.push(this.add.text(0, 0, `+${bolts} BOLTS`, { ...big, color: '#b06a1a' }));
    }
    // the icon hugs its number; separate items get a wide gap
    const gapAt = (i: number) => (i === 0 ? 0 : rowObjs[i - 1] instanceof Phaser.GameObjects.Image ? 8 : 40);
    // the icon is centred on its visible pixels by fitVisible, so it takes a fixed 46 px slot
    const wOf = (o: Phaser.GameObjects.Text | Phaser.GameObjects.Image) => (o instanceof Phaser.GameObjects.Text ? o.width : 46);
    const rowW = rowObjs.reduce((w, o, i) => w + gapAt(i) + wOf(o), 0);
    let rx0 = W / 2 - rowW / 2;
    rowObjs.forEach((o, i) => {
      rx0 += gapAt(i);
      if (o instanceof Phaser.GameObjects.Text) o.setOrigin(0, 0.5).setPosition(rx0, top + 410);
      else o.setPosition(rx0 + 23, top + 410);
      c.add(o);
      rx0 += wOf(o);
    });
    if (bolts > 0) this.time.delayedCall(250 + got * 220, () => sfx.boltRoll(Math.ceil(bolts / 6)));
    if (parts.length) c.add(this.add.text(W / 2, top + 452, parts.join('  \u00b7  '), { fontFamily: 'Lilita One, Arial Black', fontSize: '24px', color: '#7a5a4a' }).setOrigin(0.5));
    if (lines.length) {
      // F6 (walkthrough 2): one reward per row, at most 3, then '+N more' (never a wall of text over the buttons)
      const rows = rewardRows(lines);
      const lh = 36;
      c.add(this.add.graphics().fillStyle(0xfff3c8, 1).fillRoundedRect(70, top + 485, W - 140, 20 + rows.length * lh, 18));
      rows.forEach((r, i) => {
        const more = i === 3;
        const t = this.add.text(W / 2, top + 503 + i * lh, r, { fontFamily: 'Lilita One, Arial Black', fontSize: more ? '20px' : '24px', color: more ? '#8a6a4a' : '#b06a1a', align: 'center' }).setOrigin(0.5);
        if (t.width > W - 170) t.setScale((W - 170) / t.width);
        c.add(t);
      });
    }
    // F6: CHAPTER COMPLETE and BACK UP wait until the player leaves this screen, then show one at a time (each its
    // own tap); the button's action runs after them, so a tap on NEXT LEVEL is never eaten by a popup
    this.endQueue.clear();
    if (chapterDone) {
      this.endQueue.push((done) => this.playChapterChest(chapterDone, done, chest));
      this.endQueue.push((done) => this.backupNudge(chapterDone, done));
    }
    const leave = (fn: () => void) => () => this.endQueue.run(fn);
    if (chapterDone) {
      const ch = this.add.text(W / 2, top + 615, `CHAPTER ${chapterDone} COMPLETE!  Your chest is next`, { fontFamily: 'Lilita One, Arial Black', fontSize: '24px', color: '#7a5a4a' }).setOrigin(0.5);
      if (ch.width > W - 140) ch.setScale((W - 140) / ch.width);
      if (lines.length <= 2) c.add(ch);
      else ch.destroy();
    } else if (won && n % 10 !== 0 && n > 1 && lines.length <= 2) {
      const left = 10 - (n % 10);
      c.add(this.add.text(W / 2, top + 600, `${left} level${left > 1 ? 's' : ''} until your Chapter ${Math.ceil(n / 10)} chest`, { fontFamily: 'Lilita One, Arial Black', fontSize: '24px', color: '#7a5a4a' }).setOrigin(0.5));
    }
    const nextN = Math.min(LEVELS.length, n + 1);
    if (won) this.button(c, W / 2, top + 690, 520, n < LEVELS.length ? `NEXT  LEVEL ${nextN}` : 'ROAD', 0x5fbf4a, leave(() => (n < LEVELS.length ? this.openLevelSheet(nextN) : this.openTitle('road'))), 1.1);
    else this.button(c, W / 2, top + 690, 520, 'TRY AGAIN', 0xe8452c, leave(() => this.openLevelSheet(n)), 1.1);
    // r37: a crate to open or a unit ready to level up gets its own button here (units are the main progression)
    // r38 Upgrade Prescription (ChatGPT review): after a loss, name the squad upgrade that helps most and how close it is
    const rx = !won ? this.upgradePrescription() : null;
    if (rx) c.add(this.add.text(W / 2, top + 572, rx.text, { fontFamily: 'Lilita One, Arial Black', fontSize: '25px', color: '#5a3a5a', align: 'center', lineSpacing: 4 }).setOrigin(0.5));
    // r38 trial over: point at the unit the player just tried
    const tr = this.meta.trial;
    const trialEnd = tr && tr.date === localDate() && tr.on && tr.left === 0 && !tr.endShown ? unitDef(tr.unit) : undefined;
    if (trialEnd && tr) {
      tr.endShown = true;
      store(META_KEY, JSON.stringify(this.meta));
    }
    const unitCta = trialEnd ? 'KEEP BUILDING' : this.totalCrates() > 0 ? 'OPEN CRATE' : this.unitsReady() ? 'LEVEL UP \u2191' : rx ? 'GET CARDS' : '';
    this.button(c, unitCta ? W / 2 - 140 : W / 2, top + 800, 260, 'ROAD', 0x27a4c0, leave(() => this.openTitle('road')), 0.78);
    if (unitCta) this.button(c, W / 2 + 140, top + 800, 260, unitCta, 0x8e58c9, leave(() => (trialEnd ? this.openUnitDetail(trialEnd) : unitCta === 'GET CARDS' ? this.openUnitShop() : rx && unitCta.startsWith('LEVEL') ? this.openUnitDetail(rx.u) : this.openTitle('units'))), 0.78);
  }

  /** r38: the squad unit (shooter, relays, helper) closest to its next level, with what that level gives. */
  upgradePrescription(): { u: UnitDef; text: string } | null {
    const m = this.meta;
    const squad = [this.teamShooter(), ...this.teamRelays(), ...this.activeToys()] as string[];
    let best: { u: UnitDef; ratio: number; lv: number; cards: number; need: number } | null = null;
    for (const id of new Set(squad)) {
      const u = unitDef(id);
      const st = m.units?.[id];
      if (!u || !st || st.level >= MAX_UNIT_LEVEL) continue;
      const need = cardsFor(u, st.level);
      const ratio = Math.min(1, st.cards / need) + (u.slot === 'shooter' ? 0.05 : 0);
      if (!best || ratio > best.ratio) best = { u, ratio, lv: st.level, cards: st.cards, need };
    }
    if (!best) return null;
    const name = FAMILY_INFO[best.u.id as 'cannon'].name.toUpperCase();
    return { u: best.u, text: `${name}  LV ${best.lv} \u2192 ${best.lv + 1}:  ${levelPerkText(best.u, best.lv + 1)}\ncards ${Math.min(best.cards, best.need)}/${best.need}` };
  }

  /** Chapter chest (r17): closed chest -> crossfade open -> the chapter medal rises; tap to dismiss. */
  playChapterChest(chapter: number, done: () => void = () => this.backupNudge(chapter), chest = { goldCrates: 0, gems: 0 }) {
    const o = this.add.container(0, 0).setDepth(140);
    o.add(this.add.rectangle(W / 2, H / 2, W, H, 0x1a0f18, 0.82).setInteractive());
    const shownAt = this.time.now;
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
    // walkthrough 3: the chest lists what is in it, and OPEN NOW opens the gold crate, then carries on to the level card
    const inside = chapterChestText(chest);
    const contents = this.add.text(W / 2, H / 2 + 185, inside, { fontFamily: 'Lilita One, Arial Black', fontSize: '30px', color: '#ffcf33', stroke: '#2b1d2e', strokeThickness: 6, align: 'center' }).setOrigin(0.5).setAlpha(0);
    if (contents.width > W - 80) contents.setScale((W - 80) / contents.width);
    o.add(contents);
    let leaving = false;
    const leave = (fn: () => void) => {
      if (leaving) return;
      leaving = true;
      tlog.log('chapter_reward_presented', { chapter });
      o.destroy();
      fn();
    };
    const canOpen = () => chest.goldCrates > 0 && (this.meta.crates?.gold ?? 0) > 0;
    this.time.delayedCall(1100, () => {
      if (!o.active) return;
      this.tweens.add({ targets: contents, alpha: 1, duration: 300 });
      if (canOpen())
        this.button(o, W / 2, H / 2 + 380, 380, 'OPEN NOW', 0x5fbf4a, () => leave(() => {
          if (!canOpen()) return done();
          this.meta.crates!.gold! -= 1;
          this.crateReturn = () => (this.closeModal(), done());
          this.openCrate('gold');
        }));
    });
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
    // F6: its own tap: the press must start on the chest screen (not the tap that opened it), after the medal shows
    let pressed = false;
    o.list[0].on('pointerdown', () => (pressed = this.time.now - shownAt > 500));
    o.list[0].on('pointerup', () => pressed && leave(done));
  }

  /** Walkthrough 3: set while a crate opened from the chapter chest is on screen; its button goes back to the level flow. */
  crateReturn: (() => void) | null = null;

  /** r43: after a chapter clear, offer a save backup once per chapter (dismissible; never blocks the level-end panel). */
  backupNudge(chapter: number, done: () => void = () => undefined) {
    const m = this.meta;
    if ((m.backupNudged ??= {})[String(chapter)]) return done();
    m.backupNudged[String(chapter)] = true;
    store(META_KEY, JSON.stringify(m));
    tlog.log('backup_nudge', { chapter });
    const o = this.add.container(0, 0).setDepth(140);
    const dim = this.add.rectangle(W / 2, H / 2, W, H, 0x1a0f18, 0.6).setInteractive();
    const PH = 440;
    const top = H / 2 - PH / 2;
    o.add([dim, this.add.graphics().fillStyle(0x2b1d2e, 1).fillRoundedRect(40, top - 6, W - 80, PH + 12, 36).fillStyle(0xfbe7c6, 1).fillRoundedRect(46, top, W - 92, PH, 32)]);
    o.add(this.add.text(W / 2, top + 70, 'BACK UP YOUR PROGRESS?', { fontFamily: 'Lilita One, Arial Black', fontSize: '42px', color: '#3b2533' }).setOrigin(0.5));
    o.add(this.add.text(W / 2, top + 120, `Chapter ${chapter} done! Your progress lives only on this phone.\nKeep a save code in Notes to get it back anytime.`, { fontFamily: 'Arial', fontStyle: 'bold', fontSize: '22px', color: '#7a5a4a', align: 'center', wordWrap: { width: W - 160 } }).setOrigin(0.5, 0));
    let closed = false;
    const close = () => {
      if (closed) return;
      closed = true;
      o.destroy();
      done();
    };
    // F6: its own tap: a release from the previous screen's tap never closes it
    let pressed = false;
    dim.on('pointerdown', () => (pressed = true));
    dim.on('pointerup', () => pressed && close());
    this.button(o, W / 2, top + 280, 460, 'COPY SAVE CODE', 0x5fbf4a, () => {
      this.copySaveCode();
      close();
    }, 0.9);
    this.button(o, W / 2, top + 380, 260, 'NOT NOW', 0x8a6a4a, close, 0.75);
  }

  /** r43 save backup: the whole save as a code on the clipboard; a select-all text box when the clipboard is refused. */
  copySaveCode() {
    const live = (this.s.phase === 'playing' || this.s.phase === 'choice') && !this.s.showcase && !this.homeIdle;
    if (live) this.save();
    store(META_KEY, JSON.stringify(this.meta));
    // storage blocked (private mode, site data off): the code is made from the game in memory
    const code = exportCode(safeStorage(readBundle, () => ({ meta: this.meta as unknown as Record<string, unknown>, run: live ? serialize(this.s) : null })));
    void copyText(code).then((ok) => {
      tlog.log('backup_copy', { clipboard: ok });
      if (ok) return this.showToast('SAVE CODE COPIED!\nPaste it in Notes to keep it safe');
      return code.then(
        (value) => void openCodeBox({ title: 'YOUR SAVE CODE', hint: 'Tap and hold the code, then tap Copy.\nKeep it in Notes or send it to yourself.', value, actions: [{ label: 'DONE', color: '#27a4c0', run: () => undefined }] }),
        () => this.showToast("COULDN'T MAKE THE CODE"),
      );
    });
  }

  /** r43: paste box -> checked code -> confirm -> the save is replaced and the game reloads. Bad codes never touch the save. */
  openPasteCode() {
    openCodeBox({
      title: 'PASTE SAVE CODE',
      hint: 'Tap and hold the box, then tap Paste.',
      placeholder: 'OMM1z.…',
      actions: [
        { label: 'CANCEL', color: '#8a6a4a', run: () => undefined },
        {
          label: 'LOAD',
          color: '#5fbf4a',
          run: async (text) => {
            const r = await importCode(text);
            tlog.log('backup_paste', { ok: r.ok, reason: r.ok ? undefined : r.reason });
            if (!r.ok) return r.message;
            this.confirmImport(r.bundle);
          },
        },
      ],
    });
  }

  /** `undo`: put back the save from before the last load (Settings link). */
  confirmImport(b: SaveBundle, undo = false) {
    closeCodeBox();
    const c = this.sheet(620);
    const top = H / 2 - 310;
    this.sheetTitle(c, top, undo ? 'UNDO LAST LOAD?' : 'LOAD THIS SAVE?', undo ? 'This puts back the save you had\nbefore you loaded a code.' : 'This replaces your current progress.\nYou can undo it once in Settings.');
    const sum = (meta: Record<string, unknown>) => {
      const stars = Object.values((meta.levelStars ?? {}) as Record<string, number>);
      return `${stars.length} levels  ·  ${stars.reduce((a, x) => a + (Number(x) || 0), 0)} stars  ·  ${Number(meta.bolts) || 0} Bolts`;
    };
    const when = b.at ? new Date(b.at).toLocaleDateString() : '';
    c.add(this.add.text(W / 2, top + 210, `${undo ? 'BEFORE THE LOAD' : `SAVE CODE${when ? ` (${when})` : ''}`}\n${sum(b.meta)}\n\nNOW ON THIS PHONE\n${sum(this.meta as unknown as Record<string, unknown>)}`, { fontFamily: 'Lilita One, Arial Black', fontSize: '26px', color: '#3b2533', align: 'center', lineSpacing: 6 }).setOrigin(0.5, 0));
    this.button(c, W / 2 - 140, top + 540, 260, 'CANCEL', 0x8a6a4a, () => this.openSettings(), 0.8);
    this.button(c, W / 2 + 140, top + 540, 260, undo ? 'UNDO' : 'REPLACE', 0xe8452c, () => {
      tlog.log(undo ? 'backup_undo' : 'backup_restore');
      tlog.flush();
      // lock first: nothing may write the old in-memory game back before or during the reload
      lockSaves();
      try {
        if (undo) restorePreimport(localStorage);
        else applyBundle(localStorage, b);
      } catch {
        lockSaves(false);
        return this.showToast("COULDN'T SAVE ON THIS PHONE");
      }
      location.reload();
    }, 0.8);
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
      m.gems = (m.gems ?? 0) + GEM_REWARDS.dailyBench; // r32 free Gems
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

  static CHALLENGES = CHALLENGES;
  pulledIds = new Set<number>();
  pulledMerge = false;

  nextChallenge() {
    if (!toysOpen(this.currentLevel())) return undefined; // t-0a294f99: no helper teasers before L8
    return GameScene.CHALLENGES.find((c) => !(c.toy in this.meta.toys));
  }

  unlockToy(toy: Family) {
    // t-0a294f99: the player's helper choice never changes silently (see grantToy)
    const got = grantToy(this.meta.toys, toy, (t) => FAMILY_INFO[t as Family].name);
    if (!got) return;
    store(META_KEY, JSON.stringify(this.meta));
    tlog.log('unlock', { toy, on: got.on });
    this.checkUnlocks(); // the first helper opens TEAM
    // F8: once per toy, and it says where to turn it on
    if (this.meta.tips[`toy_${toy}`]) return;
    this.meta.tips[`toy_${toy}`] = true;
    store(META_KEY, JSON.stringify(this.meta));
    this.time.delayedCall(900, () => {
      sfx.rankUp(6);
      this.showEvent(got.text, '#f0b8ff', 3200);
    });
  }

  checkChallenges(r: CascadeResult, kickback: boolean) {
    for (const m of r.edges) if (m.kind === 'magnet') this.pulledIds.add(this.s.grid[m.to]?.id ?? -1);
    if (this.s.phase === 'tutorial') return;
    const toy = toyEarned(Math.max(this.currentLevel(), this.s.level ?? 0), this.meta.toys, r, kickback, this.pulledMerge);
    if (toy) this.unlockToy(toy);
  }
  retry(hardArg?: boolean, remixArg?: number) {
    // "again" (ONE MORE / RESTART, no args) repeats the same mode; a Daily repeats today's bench
    if (hardArg === undefined && this.s.daily) return this.startDaily();
    if (hardArg === undefined && this.s.rush) return this.startRush();
    if (hardArg === undefined && this.s.bounty) return this.startBounty(this.s.bounty.slot);
    if (hardArg === undefined && this.s.endless) return this.startEndless();
    if (hardArg === undefined && this.s.puzzle && this.puzzleDef) return this.startPuzzle(this.puzzleDef, this.puzzleKind);
    if (hardArg === undefined && this.s.level !== undefined) return this.startLevel(this.s.level);
    if (hardArg === undefined && this.s.phase === 'tutorial') return this.startState(newGame(Date.now() >>> 0, true)); // RESTART replays the tutorial
    const hard = hardArg ?? this.s.hard;
    const remixTarget = remixArg ?? (this.s.remix ? this.s.target : -1);
    tlog.log('retry', { hard });
    this.closeModal();
    this.meta.tutorialDone = true;
    store(META_KEY, JSON.stringify(this.meta));
    this.startState(newGame(Date.now() >>> 0, false, hard, this.activeToys(), remixTarget, this.teamShooter()));
  }

  /** r29 Boss Rush pools: beaten mini-bosses and chapter bosses (null until L20 + 1 mini + 2 bosses are beaten). */
  rushEligible(): { minis: string[]; bosses: string[] } | null {
    const stars = this.meta.levelStars ?? {};
    const beat = (n: number) => (stars[String(n)] ?? 0) > 0;
    if (!beat(20)) return null;
    const minis = LEVELS.filter((d) => d.mini_boss && beat(d.level)).map((d) => d.mini_boss!);
    const bosses = LEVELS.filter((d) => d.level % 10 === 0 && beat(d.level)).map((d) => BOSSES[chapterBossIdx(d.level)].id);
    return minis.length >= 1 && bosses.length >= 2 ? { minis, bosses } : null;
  }

  /** r30: every beaten boss / mini-boss id. */
  beatenBossIds(): string[] {
    const stars = this.meta.levelStars ?? {};
    return LEVELS.filter((d) => (d.mini_boss || d.level % 10 === 0) && (stars[String(d.level)] ?? 0) > 0).map((d) => d.mini_boss ?? BOSSES[chapterBossIdx(d.level)].id);
  }

  /** EVENTS card: today's three bounties as portraits with their twist; tap one to fight. */
  bountyCard(c: Phaser.GameObjects.Container, y: number) {
    const date = localDate();
    const list = bountiesFor(date, this.beatenBossIds());
    const rec = this.meta.bounty?.[date] ?? { won: [], mastered: [] };
    const cc = this.add.container(W / 2, y);
    const h = 270;
    if (this.hasArt('ui_card')) cc.add(this.add.image(0, 0, 'ui_card').setDisplaySize(W - 50, h));
    else cc.add(this.add.graphics().fillStyle(0xfbe7c6, 1).fillRoundedRect(-(W - 50) / 2, -h / 2, W - 50, h, 26));
    cc.add(this.add.text(-(W - 50) / 2 + 44, -h / 2 + 40, 'MONSTER BOUNTIES', { fontFamily: 'Lilita One, Arial Black', fontSize: '36px', color: '#3b2533' }).setOrigin(0, 0.5));
    if (!list) {
      // F8: locked like the other EVENTS cards (text under the title + a dimmed LOCKED button)
      cc.add(this.add.text(-(W - 50) / 2 + 44, -h / 2 + 72, BOUNTY_LOCKED.text(new Set(this.beatenBossIds()).size), { fontFamily: 'Arial', fontStyle: 'bold', fontSize: '22px', color: '#5a4a5a', lineSpacing: 6 }));
      this.button(cc, (W - 50) / 2 - 130, h / 2 - 56, 200, 'LOCKED', 0x8e58c9, () => this.showToast(BOUNTY_LOCKED.toast), 0.72).setAlpha(0.5);
      c.add(cc);
      return;
    }
    cc.add(this.add.text((W - 50) / 2 - 64, -h / 2 + 40, `+${BOUNTY_BOLTS} each`, { fontFamily: 'Lilita One, Arial Black', fontSize: '22px', color: '#b06a1a' }).setOrigin(1, 0.5));
    list.forEach((b, k) => {
      const x = (k - 1) * 205, yy = 20;
      const key = `boss_${b.id}_intact`;
      const done = rec.won.includes(k), mast = rec.mastered.includes(k);
      const slot = this.add.container(x, yy);
      slot.add(this.add.graphics().fillStyle(done ? 0xd8f0c8 : 0xead2b0, 1).fillRoundedRect(-95, -80, 190, 175, 18));
      if (this.hasArt(key)) {
        const im = this.add.image(0, -20, key);
        im.setScale(110 / Math.max(im.width, im.height));
        slot.add(im);
      }
      slot.add(this.add.text(0, 52, twistText(b.twist, this.ownsUnit('rocket')), { fontFamily: 'Arial', fontStyle: 'bold', fontSize: '15px', color: '#5a3a3a', align: 'center', wordWrap: { width: 176 } }).setOrigin(0.5, 0));
      if (done) slot.add(this.add.text(70, -62, mast ? '★' : '✓', { fontFamily: 'Arial Black', fontSize: '34px', color: mast ? '#e0a020' : '#2a8a3a', stroke: '#fff0cf', strokeThickness: 5 }).setOrigin(0.5));
      slot.setSize(190, 175).setInteractive({ useHandCursor: true });
      slot.on('pointerup', () => (sfx.click(), this.startBounty(k)));
      cc.add(slot);
    });
    c.add(cc);
  }

  startBounty(k: number) {
    const date = localDate();
    const list = bountiesFor(date, this.beatenBossIds());
    if (!list) return;
    this.closeModal();
    const b = list[k];
    tlog.log('bounty_start', { date, id: b.id, twist: b.twist });
    this.startState(newBountyFight(b.id, b.twist as BountyTwist, date, k));
    this.showEvent(`BOUNTY  \u00b7  ${TWIST_TEXT[b.twist].toUpperCase()}`, '#d9c2ff', 2200);
  }

  openBountyResult(won: boolean) {
    const m = this.meta;
    const bt = this.s.bounty!;
    m.bounty = m.bounty ?? {};
    const rec = (m.bounty[bt.date] = m.bounty[bt.date] ?? { won: [], mastered: [] });
    let bolts = 0;
    const masteredNow = won && (this.s.timeLeft >= MASTERY_TIME_LEFT || this.s.stats.biggestChain >= MASTERY_CHAIN);
    let crate = false;
    if (won && !rec.won.includes(bt.slot)) {
      rec.won.push(bt.slot);
      this.seasonEv('bountyWin');
      bolts += BOUNTY_BOLTS;
      this.giveCrate('wood'); // r32
      crate = true;
      if (rec.won.length === 3) m.gems = (m.gems ?? 0) + GEM_REWARDS.allBounties; // all three bounties today
    }
    let newStar = false;
    if (masteredNow && !rec.mastered.includes(bt.slot)) {
      rec.mastered.push(bt.slot);
      m.bossMastery = { ...(m.bossMastery ?? {}), [bt.id]: (m.bossMastery?.[bt.id] ?? 0) + 1 };
      newStar = true;
      // r35: the third star wins the trophy; it goes straight onto the shelf when there is room
      if (m.bossMastery[bt.id] === TROPHY_AT) {
        if ((m.trophies ?? []).length < TROPHY_SHELF) m.trophies = [...(m.trophies ?? []), bt.id];
        this.time.delayedCall(900, () => this.showToast(`TROPHY WON: ${BOSSES.find((x) => x.id === bt.id)?.name ?? ''}!`));
        tlog.log('trophy', { id: bt.id });
      }
    }
    const total = Object.values(m.bossMastery ?? {}).reduce((a, b) => a + b, 0);
    let milestone = 0;
    for (const [need, pay] of MASTERY_MILESTONES) if (total >= need && (m.masteryPaid ?? 0) < need) {
      milestone += pay;
      m.masteryPaid = need;
    }
    bolts += milestone;
    if (bolts) m.bolts = (m.bolts ?? 0) + bolts;
    store(META_KEY, JSON.stringify(m));
    tlog.log('bounty_end', { id: bt.id, won, mastered: masteredNow, bolts });
    const c = this.panel(640);
    const top = H / 2 - 320;
    const name = BOSSES.find((x) => x.id === bt.id)?.name ?? '';
    c.add(this.add.text(W / 2, top + 64, won ? 'BOUNTY CLAIMED!' : 'BOUNTY ESCAPED', { fontFamily: 'Lilita One, Arial Black', fontSize: '48px', color: won ? '#e8452c' : '#3b2533' }).setOrigin(0.5));
    const key = `boss_${bt.id}_intact`;
    if (this.hasArt(key)) {
      const im = this.add.image(W / 2, top + 210, key);
      im.setScale(170 / Math.max(im.width, im.height));
      if (!won) im.setAlpha(0.6);
      c.add(im);
    }
    const lines = [name, won ? (masteredNow ? `MASTERY ★  ${m.bossMastery?.[bt.id] ?? 1}` : `Master it: ${MASTERY_TIME_LEFT}s left or a x${MASTERY_CHAIN} chain`) : 'Try again any time today'];
    if (bolts) lines.push(`+${bolts} BOLTS${milestone ? '  (mastery milestone!)' : ''}${crate ? '  +1 WOOD CRATE' : ''}`);
    if (newStar) sfx.star?.(3);
    c.add(this.add.text(W / 2, top + 320, lines.join('\n'), { fontFamily: 'Lilita One, Arial Black', fontSize: '28px', color: '#5a3a3a', align: 'center', lineSpacing: 8 }).setOrigin(0.5, 0));
    this.button(c, W / 2 - 120, top + 540, 220, 'AGAIN', 0x5fbf4a, () => this.startBounty(bt.slot), 0.85);
    this.button(c, W / 2 + 120, top + 540, 220, 'EVENTS', 0x27a4c0, () => this.openTitle('events'), 0.85);
  }

  rushRun: { i: number; times: number[] } | null = null;
  startRush() {
    const el = this.rushEligible();
    if (!el) return this.showToast('BEAT LEVEL 20, A MINI-BOSS AND TWO BOSSES');
    const wk = weekId();
    const m = this.meta;
    if (!m.rush || m.rush.week !== wk) m.rush = { ...(m.rush ?? {}), week: wk, course: rushCourse(wk, el.minis, el.bosses)!, granted: 0, best: undefined };
    store(META_KEY, JSON.stringify(m));
    this.rushRun = { i: 0, times: [] };
    tlog.log('rush_enter', { week: wk, course: m.rush.course });
    this.startRushFight(0);
  }

  startRushFight(i: number) {
    this.closeModal();
    const r = this.meta.rush!;
    // the run so far lives in the meta too, so a reload between (or during) fights keeps the earlier times
    r.run = { i, times: [...(this.rushRun?.times ?? [])] };
    store(META_KEY, JSON.stringify(this.meta));
    const s = newRushFight(r.course[i], i, r.week);
    tlog.log('rush_fight_start', { index: i, opponent: r.course[i] });
    this.startState(s);
    this.showEvent(`BOSS RUSH  \u00b7  FIGHT ${i + 1} OF 3`, '#d9c2ff', 2000);
  }

  openRushResult(won: boolean) {
    const m = this.meta;
    const { id, slot, week } = this.s.rush!;
    const r = m.rush;
    if (!r || r.week !== week) {
      // this week's rush record is gone (a reset or a loaded save): nothing to credit the fight against
      tlog.log('rush_record_missing', { opponent: id, index: slot });
      this.rushRun = null;
      this.openTitle('events');
      this.showToast('BOSS RUSH RESET\nStart it again from EVENTS');
      return;
    }
    const run = this.rushRun?.i === slot ? this.rushRun : r.run?.i === slot ? { i: slot, times: [...r.run.times] } : { i: slot, times: [] };
    if (won) {
      run.times.push(this.s.elapsed);
      r.stamps = { ...(r.stamps ?? {}), [id]: true };
      tlog.log('rush_fight_finish', { index: run.i, opponent: id, clear_time: +this.s.elapsed.toFixed(1) });
    }
    const cleared = run.times.length;
    const done = !won || cleared >= 3;
    // weekly cumulative Bolts: only the positive difference is paid
    const due = cleared ? RUSH_REWARDS[cleared - 1] : 0;
    const delta = Math.max(0, due - (r.granted ?? 0));
    if (delta) {
      // r32: crossing fight 2 / fight 3 for the first time this week also drops a crate
      if ((r.granted ?? 0) < RUSH_REWARDS[1] && due >= RUSH_REWARDS[1]) this.giveCrate('iron');
      if ((r.granted ?? 0) < RUSH_REWARDS[2] && due >= RUSH_REWARDS[2]) {
        this.giveCrate('gold');
        m.gems = (m.gems ?? 0) + GEM_REWARDS.rushFull;
        this.seasonBonus(BONUS_XP.rushFull, 'BOSS RUSH');
      }
      m.bolts = (m.bolts ?? 0) + delta;
      r.granted = due;
    }
    const firstMedal = cleared >= 3 && !r.medal;
    if (cleared >= 3) {
      r.medal = true;
      r.weeks = [...new Set([...(r.weeks ?? []), r.week])];
    }
    const total = run.times.reduce((a, b) => a + b, 0);
    if (done && cleared && (!r.best || cleared > r.best.fights || (cleared === r.best.fights && total < r.best.time))) r.best = { fights: cleared, time: total };
    store(META_KEY, JSON.stringify(m));
    const c = this.panel(760);
    const top = H / 2 - 380;
    c.add(this.add.text(W / 2, top + 64, done ? (cleared >= 3 ? 'RUSH COMPLETE!' : 'RUSH OVER') : `FIGHT ${cleared} CLEARED!`, { fontFamily: 'Lilita One, Arial Black', fontSize: '50px', color: cleared >= 3 ? '#e8452c' : '#3b2533' }).setOrigin(0.5));
    r.course.forEach((bid, k) => {
      const x = W / 2 + (k - 1) * 190, y = top + 230;
      const key = `boss_${bid}_intact`;
      if (this.hasArt(key)) {
        const im = this.add.image(x, y, key);
        im.setScale(140 / Math.max(im.width, im.height));
        if (k >= cleared) im.setTint(k === cleared && !done ? 0xffffff : 0x2b1d2e).setAlpha(k === cleared && !done ? 1 : 0.6);
        c.add(im);
      }
      if (k < cleared) c.add(this.add.text(x + 50, y + 50, '✓', { fontFamily: 'Arial Black', fontSize: '44px', color: '#2a8a3a', stroke: '#fff0cf', strokeThickness: 6 }).setOrigin(0.5));
      c.add(this.add.text(x, y + 96, BOSSES.find((b) => b.id === bid)?.name ?? '', { fontFamily: 'Lilita One, Arial Black', fontSize: '19px', color: '#3b2533', align: 'center', wordWrap: { width: 180 } }).setOrigin(0.5, 0));
    });
    const lines = [`${cleared} of 3 fights  \u00b7  ${total.toFixed(1)}s`, delta ? `+${delta} BOLTS` : `This week: ${r.granted}/${RUSH_REWARDS[2]} Bolts`];
    if (firstMedal) lines.push('BOSS RUSH MEDAL EARNED!');
    c.add(this.add.text(W / 2, top + 400, lines.join('\n'), { fontFamily: 'Lilita One, Arial Black', fontSize: '30px', color: '#5a3a3a', align: 'center', lineSpacing: 8 }).setOrigin(0.5, 0));
    if (!done) {
      const nextId = r.course[cleared];
      this.button(c, W / 2, top + 600, 440, 'NEXT FIGHT', 0x5fbf4a, () => {
        run.i = cleared;
        this.rushRun = run;
        this.startRushFight(cleared);
      });
      c.add(this.add.text(W / 2, top + 545, `Next: ${BOSSES.find((b) => b.id === nextId)?.name ?? ''}`, { fontFamily: 'Arial', fontStyle: 'bold', fontSize: '22px', color: '#7a5a4a' }).setOrigin(0.5));
    } else {
      this.button(c, W / 2 - 120, top + 640, 220, 'AGAIN', 0x5fbf4a, () => this.startRush(), 0.85);
      this.button(c, W / 2 + 120, top + 640, 220, 'HOME', 0x27a4c0, () => this.quitHome(), 0.85);
      tlog.log('rush_attempt_end', { completed: cleared, total: +total.toFixed(1) });
      if (delta) tlog.log('rush_settle', { delta, week: r.week });
    }
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

  homeTab: 'road' | 'machine' | 'events' | 'units' = 'road';
  /** HOME (ChatGPT r15): ROAD (the level saga) / MACHINE (team, workshop, mastery) / EVENTS (daily, challenge, remix). */
  openTitle(tab: 'road' | 'machine' | 'events' | 'units' = this.homeTab) {
    this.homeTab = tab;
    // home means the run behind it is over (cold start, HOME, showcase done): never saved, never resumed
    if (!this.homeIdle) {
      this.homeIdle = true;
      store(SAVE_KEY, null);
    }
    if (tab === 'units') return this.openUnitsTab();
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
    // r35 TROPHIES: drawer button (mirror of BOOK) + the figurines on display around the machine's feet
    if (this.currentLevel() > 1) {
      const tb = this.add.container(86, headY + 110);
      tb.add(this.add.graphics().fillStyle(0x2b1d2e, 1).fillRoundedRect(-74, -34, 148, 68, 18).fillStyle(0xe0a020, 1).fillRoundedRect(-70, -30, 140, 60, 15));
      tb.add(this.add.text(0, 0, 'TROPHIES', { fontFamily: 'Lilita One, Arial Black', fontSize: '24px', color: '#ffffff', stroke: '#2b1d2e', strokeThickness: 4 }).setOrigin(0.5));
      tb.setSize(148, 68).setInteractive({ useHandCursor: true });
      tb.on('pointerup', () => (sfx.click(), this.openTrophies()));
      c.add(tb);
    }
    // the machine
    const helper = this.activeToys()[0] ?? null;
    // day 0: three rank-1 starter modules instead of an empty chassis (display baseline, not earned mastery)
    const shown = empty ? { cannon: 1, coil: 1, bell: 1 } : (m.mastery ?? {});
    const mach = buildMachine(this, W / 2, feetY, mWidth, empty ? { ...shown, [this.teamShooter()]: 1 } : shown, helper, this.teamShooter())!;
    this.applyFinish(mach);
    c.add(mach);
    const hit = this.add.zone(W / 2, feetY - mWidth * 0.25, mWidth * 0.95, mWidth * 0.5).setInteractive({ useHandCursor: true });
    hit.on('pointerup', () => (!m.playtestMode && this.featureOpen('workshop') ? this.openWorkshop() : this.showToast(`THE WORKSHOP OPENS AFTER LEVEL ${UNLOCK_LEVEL.workshop}`)));
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
    // r38 (ChatGPT review): four fixed sockets on a shelf plank, never free-placed
    const anyTrophy = Object.values(m.bossMastery ?? {}).some((v) => v >= TROPHY_AT);
    if (anyTrophy) {
      const sy = feetY - 2, xs = [82, 262, W - 262, W - 82];
      const shelf = m.trophies ?? [];
      xs.forEach((x, i) => {
        // brass plinth per socket (ChatGPT shelf_plate); an empty socket shows the bare plinth
        if (this.hasArt('shelf_plate')) {
          const pl = this.add.image(x, sy + 14, 'shelf_plate').setOrigin(0.5, 1);
          pl.setScale(118 / pl.width);
          c.add(pl);
        } else c.add(this.add.graphics().fillStyle(0x2b1d2e, 0.35).fillEllipse(x, sy + 1, 64, 12));
        const id = shelf[i];
        const im = id ? this.trophyImage(id, x, sy + 2, 122) : null;
        if (im) c.add(im);
        else c.add(this.add.text(x, sy - 22, '\u{1F512}', { fontSize: '30px' }).setOrigin(0.5).setAlpha(0.7));
      });
    }

    // helper row
    const hy = helperY;
    const hg = this.add.graphics().fillStyle(0x2b1d2e, 0.82).fillRoundedRect(44, hy - 46, W - 88, 92, 26);
    c.add(hg);
    const nc = this.nextChallenge();
    const teamOn = this.featureOpen('team');
    const shooterName = FAMILY_INFO[this.teamShooter() as keyof typeof FAMILY_INFO].name;
    const hl = teamOn ? `Team:  ${shooterName} + ${helper ? FAMILY_INFO[helper].name : 'no helper'}` : empty || !m.bestChain ? 'Merge your first gadgets: tap PLAY!' : nc ? `Next helper: ${nc.text}` : 'Helpers: none yet';
    const ht = this.add.text(80, hy, hl, { fontFamily: 'Lilita One, Arial Black', fontSize: teamOn ? '28px' : '22px', color: '#fff0cf', wordWrap: { width: teamOn ? 400 : W - 170 } }).setOrigin(0, 0.5);
    c.add(ht);
    if (teamOn && !(m.playtestMode && !m.hardUnlocked)) {
      this.button(c, W - 150, hy, 220, 'TEAM', 0x27a4c0, () => this.openTeamSheet(), 0.62);
      if (isNew(m, 'team')) this.newTag(c, W - 82, hy - 40);
    }

    // PLAY = the current saga level
    const play = this.button(c, W / 2, bottom - 410, 600, `PLAY  LEVEL ${this.currentLevel()}`, 0x5fbf4a, () => this.openLevelSheet(this.currentLevel()), 1.1);
    if (!REDUCED_MOTION) this.tweens.add({ targets: play, scale: 1.13, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.InOut' });

    const today = m.daily?.[localDate()];
    if (m.hardUnlocked) tlog.log('daily_offer_view', { date: localDate(), done: !!today });

    // workshop
    const wsOpen = !m.playtestMode && this.featureOpen('workshop');
    const wsAt = UNLOCK_LEVEL.workshop;
    const ws = this.button(c, W / 2, bottom - 280, 600, wsOpen ? 'WORKSHOP' : m.playtestMode ? 'WORKSHOP  \u00b7  soon' : `WORKSHOP  \u00b7  level ${wsAt}`, 0x8a6a4a, () => (wsOpen ? this.openWorkshop() : this.showToast(`THE WORKSHOP OPENS AFTER LEVEL ${wsAt}`)), 0.85);
    if (!wsOpen) ws.setAlpha(0.6);
    else if (isNew(m, 'workshop')) this.newTag(c, W / 2 - 230, bottom - 312);
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
    if (showKits) item('booster_jumpstart', 250, m.kits ?? 0);
    if (showCaps) item('booster_time_capsule', 380, m.capsules ?? 0);
    // r32 premium Gems (drawn gem until art lands); t-2fd7bb86: only once the player has earned some
    const gemsOn = this.featureOpen('gems');
    if (gemsOn && this.hasArt('icon_gem')) item('icon_gem', 510, m.gems ?? 0);
    else if (gemsOn) {
      c.add(this.add.graphics().fillStyle(0x2b1d2e, 1).fillPoints([new Phaser.Math.Vector2(510, barY - 26), new Phaser.Math.Vector2(536, barY - 6), new Phaser.Math.Vector2(510, barY + 26), new Phaser.Math.Vector2(484, barY - 6)], true).fillStyle(0xb06af0, 1).fillPoints([new Phaser.Math.Vector2(510, barY - 20), new Phaser.Math.Vector2(530, barY - 6), new Phaser.Math.Vector2(510, barY + 19), new Phaser.Math.Vector2(490, barY - 6)], true));
      c.add(this.add.text(544, barY, String(m.gems ?? 0), { fontFamily: 'Lilita One, Arial Black', fontSize: '38px', color: '#3b2533' }).setOrigin(0, 0.5));
    }
    if (isNew(m, 'gems')) this.newTag(c, 510, barY - 40, 0.8);
    const wallet = this.add.zone(W / 2 - 40, barY, W - 220, 96).setInteractive({ useHandCursor: true });
    wallet.on('pointerup', () => this.openWalletInfo());
    const gear = this.add.text(W - 84, barY, '\u2699', { fontFamily: 'Arial', fontSize: '54px', color: '#3b2533' }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    gear.on('pointerup', () => this.openSettings());
    c.add([wallet, gear]);
  }

  /** Bottom navigation: ROAD / MACHINE / EVENTS. */
  drawNav(c: Phaser.GameObjects.Container, active: 'road' | 'machine' | 'events' | 'units') {
    const y = H - 62;
    c.add(this.add.graphics().fillStyle(0x2b1d2e, 0.92).fillRoundedRect(20, y - 50, W - 40, 100, 30));
    (['road', 'units', 'machine', 'events'] as const).forEach((t, i) => {
      const x = W / 2 + (i - 1.5) * 168;
      const on = t === active;
      if (on) c.add(this.add.graphics().fillStyle(0xffcf33, 1).fillRoundedRect(x - 80, y - 40, 160, 80, 22));
      const lb = this.add.text(x, y, t.toUpperCase(), { fontFamily: 'Lilita One, Arial Black', fontSize: '26px', color: on ? '#2b1d2e' : '#fff0cf' }).setOrigin(0.5);
      // r36: EVENTS gets a dot while the week's Screw Yard track is not done (2.0: yards are free, the track pays stars)
      const yardReady = t === 'events' && this.currentLevel() - 1 >= YARD_UNLOCK && this.yardWeek().paid < YARD_TIERS.length;
      const collReady = t === 'units' && (() => { const gl = COLLECTION_GOALS[this.meta.collClaimed ?? 0]; if (!gl) return false; const p = this.collectionProgress(); return (gl.kind === 'own' ? p.own : p.levels) >= gl.n; })();
      // r43: UNITS also gets the dot while an owned unit has an unsolved drill
      const drillReady = t === 'units' && drillsPending((u) => !!unitDef(u) && this.ownsUnit(u), GameScene.PUZZLES.drills, this.puzzleRec().drills);
      const ready = (t === 'units' && (this.unitsReady() || this.totalCrates() > 0 || collReady || drillReady)) || yardReady;
      // t-2fd7bb86: a freshly unlocked feature tags the tab it lives on with NEW (instead of the dot)
      const lives: Partial<Record<typeof t, Feature[]>> = { machine: this.meta.playtestMode ? [] : ['team', 'workshop'], events: ['puzzles', 'challenge', 'remix'] };
      if ((lives[t] ?? []).some((f) => isNew(this.meta, f))) this.newTag(c, x + 52, y - 36, 0.8);
      else if (ready) c.add(this.add.circle(x + 62, y - 30, 11, 0xe8452c).setStrokeStyle(3, 0xfff0cf));
      const eventsOn = this.currentLevel() - 1 >= YARD_UNLOCK || (['puzzles', 'challenge', 'remix'] as Feature[]).some((f) => this.featureOpen(f));
      if (t === 'events' && !eventsOn) lb.setAlpha(0.5);
      const z = this.add.zone(x, y, 166, 96).setInteractive({ useHandCursor: true });
      z.on('pointerup', () => {
        if (t !== active) {
          sfx.click();
          this.openTitle(t);
        }
      });
      c.add([lb, z]);
    });
  }

  static CHAPTER_MONSTER = CHAPTER_MONSTER;

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

  /** One-time lesson bubble over a home screen (r17): text, a pulsing ring on the target, GOT IT.
   *  ringC: where the ring lives (e.g. a scrolling road container, so it moves and masks with it); defaults to c. */
  roadLessonDone: (() => void) | null = null;
  lesson(id: string, c: Phaser.GameObjects.Container, text: string, at: { x: number; y: number; r: number }, bubbleY: number, noButton = false, ringC: Phaser.GameObjects.Container = c) {
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
    const done = () => {
      m.lessons![id] = true;
      store(META_KEY, JSON.stringify(m));
      tlog.log('lesson', { id });
      ring.destroy();
      b.destroy();
    };
    if (!noButton) {
      const ok = this.add.text((W - 60) / 2 - 30, h / 2 - 30, 'GOT IT', { fontFamily: 'Lilita One, Arial Black', fontSize: '26px', color: '#ffffff', backgroundColor: '#5fbf4a', padding: { x: 16, y: 8 } }).setOrigin(1, 1).setInteractive({ useHandCursor: true });
      b.add(ok);
      ok.on('pointerup', done);
    }
    ringC.add(ring);
    c.add(b);
    return done;
  }

  /** Highest unlocked level (levels are sequential; stars never gate). */
  currentLevel() {
    const st = this.meta.levelStars ?? {};
    let n = 1;
    while (st[String(n)] && n < LEVELS.length) n++;
    return n;
  }

  /** t-2fd7bb86: records features earned since the last check (sticky, see unlocks.ts) and returns them. */
  checkUnlocks(): Feature[] {
    const fresh = refreshUnlocks(this.meta, this.currentLevel() - 1);
    if (fresh.length) {
      store(META_KEY, JSON.stringify(this.meta));
      tlog.log('feature_unlock', { features: fresh });
    }
    return fresh;
  }

  featureOpen(f: Feature) {
    this.checkUnlocks();
    return isUnlocked(this.meta, f);
  }

  /** The player opened a feature: its NEW cue goes away. */
  seen(f: Feature) {
    if (markSeen(this.meta, f)) store(META_KEY, JSON.stringify(this.meta));
  }

  /** The short NEW cue on a freshly unlocked feature (same yellow tag as a new crate card). */
  newTag(c: Phaser.GameObjects.Container, x: number, y: number, scale = 1) {
    const t = this.add.text(x, y, 'NEW!', { fontFamily: 'Lilita One, Arial Black', fontSize: '22px', color: '#2b1d2e', backgroundColor: '#ffcf33', padding: { x: 8, y: 1 } }).setOrigin(0.5).setAngle(8).setScale(scale);
    c.add(t);
    if (!REDUCED_MOTION) this.tweens.add({ targets: t, scale: scale * 1.15, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    return t;
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
        // r28: the boss waiting there (a silhouette until it is beaten)
        const bd = def.mini_boss ? BOSSES.find((x) => x.id === def.mini_boss) : isB ? BOSSES[chapterBossIdx(n)] : undefined;
        const pk = bd ? `boss_${bd.id}_intact` : '';
        if (pk && this.hasArt(pk)) {
          const pi = this.add.image(tag.x + side * (tag.width + 46), y - 6, pk);
          pi.setScale(116 / Math.max(pi.width, pi.height));
          if (!(stars[String(n)] ?? 0)) pi.setTint(0x3b2d4e).setAlpha(0.5);
          road.add(pi);
        }
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
    const onMove = (p: Phaser.Input.Pointer) => {
      if (!p.isDown || this.homeC !== c || !c.active) return;
      if (p.worldY < top - 40 || p.worldY > bottom + 40) return;
      dragDist = p.worldY - dragStart;
      scrollY = Phaser.Math.Clamp(startScroll + dragDist, minScroll, maxScroll);
      road.setY(scrollY);
    };
    const onDown = (p: Phaser.Input.Pointer) => {
      if (this.homeC !== c || !c.active) return;
      dragStart = p.worldY;
      startScroll = scrollY;
      dragDist = 0;
    };
    this.input.on('pointermove', onMove);
    this.input.on('pointerdown', onDown);
    // leaving the tab: drop the scene listeners and the (unparented) mask, or every visit would stack another set
    c.once(Phaser.GameObjects.Events.DESTROY, () => {
      this.input.off('pointermove', onMove);
      this.input.off('pointerdown', onDown);
      mask.destroy();
    });
    this.drawWallet(c);
    // chapter strip (r17): progress toward the chapter chest; tap previews the reward
    const chapter = Math.ceil(cur / 10);
    const doneInCh = Math.min(10, LEVELS.slice((chapter - 1) * 10, chapter * 10).filter((d) => stars[String(d.level)]).length);
    const strip = this.add.container(W / 2, 140).setVisible(cur > 3);
    // r28: each chapter wears its setting's colours (ChatGPT CAST_CONFIG road strip palette)
    const CH = [
      { name: 'KITCHEN', fill: 0xe9c9a3, accent: 0xae7040 },
      { name: 'LAUNDRY', fill: 0xb8d7d1, accent: 0x458f87 },
      { name: 'GARAGE', fill: 0xd7b38a, accent: 0xa8753e },
      { name: 'ARCADE', fill: 0xb9a7d8, accent: 0x795aa8 },
      { name: 'MUSIC ATTIC', fill: 0xdec29a, accent: 0xb08042 },
      { name: 'SCRAPYARD', fill: 0xbac5cd, accent: 0x66818e },
      { name: 'PACKING DEPOT', fill: 0xd9c08f, accent: 0x9a7240 },
      { name: 'OBSERVATORY', fill: 0xaab4d8, accent: 0x52608f },
    ][(chapter - 1) % 8];
    strip.add(this.add.graphics().fillStyle(0x2b1d2e, 1).fillRoundedRect(-(W - 60) / 2 - 3, -33, W - 54, 66, 22).fillStyle(CH.fill, 1).fillRoundedRect(-(W - 60) / 2, -30, W - 60, 60, 20).fillStyle(CH.accent, 1).fillRoundedRect(-(W - 60) / 2, -30, 14, 60, { tl: 20, bl: 20, tr: 0, br: 0 }));
    strip.add(this.add.text(-(W - 60) / 2 + 30, 0, `CH ${chapter} \u00b7 ${CH.name}  \u00b7  ${doneInCh}/10`, { fontFamily: 'Lilita One, Arial Black', fontSize: '26px', color: '#302b35' }).setOrigin(0, 0.5));
    if (this.hasArt('chest_closed')) {
      const ch = this.add.image((W - 60) / 2 - 40, -4, 'chest_closed');
      ch.setScale(64 / Math.max(ch.width, ch.height));
      strip.add(ch);
    }
    strip.setSize(W - 60, 60).setInteractive({ useHandCursor: true });
    strip.on('pointerup', () => this.showToast(`CLEAR LEVEL ${chapter * 10} FOR THE CHAPTER ${chapter} MEDAL`));
    c.add(strip);
    const def = LEVELS[cur - 1];
    const tag = cur % 10 === 0 ? '  ·  BOSS' : def.mini_boss ? '  ·  MINI-BOSS' : def.difficulty === 'NORMAL' ? '' : def.difficulty === 'HARD' ? '  ·  HARD' : '  ·  MEGA HARD';
    const endlessOpen = this.endlessOpen();
    const play = endlessOpen
      ? this.button(c, W / 2, H - 182, 620, `ENDLESS  \u00b7  FLOOR ${this.endlessRec().floor}`, 0x8e58c9, () => this.startEndless(), 1.0)
      : this.button(c, W / 2, H - 182, 620, `PLAY  LEVEL ${cur}${tag}`, 0x5fbf4a, () => {
          this.roadLessonDone?.();
          this.roadLessonDone = null;
          this.openLevelSheet(cur);
        }, 1.0);
    // r41 Workshop Season entry (left, mirrors QA)
    if (this.currentLevel() > 3) {
      const sr = this.seasonRec();
      const sb = this.add.container(86, 236);
      sb.add(this.add.graphics().fillStyle(0x2b1d2e, 1).fillRoundedRect(-62, -36, 124, 72, 20).fillStyle(0xe0a020, 1).fillRoundedRect(-58, -32, 116, 64, 17));
      sb.add(this.add.text(0, -9, 'SEASON', { fontFamily: 'Lilita One, Arial Black', fontSize: '20px', color: '#ffffff', stroke: '#2b1d2e', strokeThickness: 4 }).setOrigin(0.5));
      sb.add(this.add.text(0, 14, `${seasonTier(sr)}/${SEASON_TIERS}`, { fontFamily: 'Lilita One, Arial Black', fontSize: '20px', color: '#2b1d2e' }).setOrigin(0.5));
      if (this.seasonClaimable() > 0) sb.add(this.add.circle(54, -30, 11, 0xe8452c).setStrokeStyle(3, 0xfff0cf));
      sb.add(this.add.zone(0, 0, 124, 72).setInteractive({ useHandCursor: true }).on('pointerup', () => (sfx.click(), this.openSeason())));
      c.add(sb);
    }
    // r34 (Ido: "where are the reset and jump-to buttons?"): QA tools one tap from the road
    const qa = this.add.container(W - 66, 236);
    qa.add(this.add.circle(0, 0, 40, 0xd8261a).setStrokeStyle(5, 0x2b1d2e));
    qa.add(this.add.text(0, 0, 'QA', { fontFamily: 'Lilita One, Arial Black', fontSize: '30px', color: '#ffffff' }).setOrigin(0.5));
    qa.add(this.add.zone(0, 0, 90, 90).setInteractive({ useHandCursor: true }).on('pointerup', () => this.openQaTools()));
    c.add(qa);
    if (!REDUCED_MOTION) this.tweens.add({ targets: play, scale: 1.04, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    this.drawNav(c, 'road');
    // r17 lesson 1: first road visit
    if (!(m.lessons ?? {}).road && cur <= 3) {
      // the ring lives in road space so it scrolls and masks with the road; the bubble stays on screen
      const done = this.lesson('road', c, `Tap Level ${cur} to play.`, { x: xs[(cur - 1) % 4], y: nodeY(cur), r: 80 }, Math.max(top + 70, scrollY + nodeY(cur) - 150), true, road);
      this.roadLessonDone = done ?? null;
      // closing the tab destroys ring + bubble with it; a later visit must not run this stale callback
      c.once(Phaser.GameObjects.Events.DESTROY, () => {
        if (this.roadLessonDone === done) this.roadLessonDone = null;
      });
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
    const card =(y: number, h: number, title: string, lines: string[], col: number, open: boolean, need: number, cb: () => void, extra?: [string, () => void, boolean]) => {
      const cc = this.add.container(W / 2, y);
      if (this.hasArt('ui_card')) cc.add(this.add.image(0, 0, 'ui_card').setDisplaySize(W - 50, h));
      else cc.add(this.add.graphics().fillStyle(0xfbe7c6, 1).fillRoundedRect(-(W - 50) / 2, -h / 2, W - 50, h, 26));
      cc.add(this.add.text(-(W - 50) / 2 + 44, -h / 2 + 40, title, { fontFamily: 'Lilita One, Arial Black', fontSize: '38px', color: '#3b2533' }).setOrigin(0, 0.5));
      cc.add(this.add.text(-(W - 50) / 2 + 44, -h / 2 + 72, open ? lines.join('\n') : `Unlocks after level ${need}`, { fontFamily: 'Arial', fontStyle: 'bold', fontSize: '22px', color: '#5a4a5a', lineSpacing: 6, wordWrap: { width: W - 330 } }));
      const b = this.button(cc, (W - 50) / 2 - 130, h / 2 - 56, 200, open ? 'PLAY' : 'LOCKED', col, open ? cb : () => this.showToast(`UNLOCKS AT LEVEL ${need}`), 0.72);
      if (!open) b.setAlpha(0.5);
      // extra[2]: the link shows even while the card itself is locked
      if (extra && (open || extra[2])) {
        const t = this.add.text(-(W - 50) / 2 + 44, h / 2 - 50, extra[0], { fontFamily: 'Lilita One, Arial Black', fontSize: '24px', color: '#b06a1a' }).setOrigin(0, 0.5).setInteractive({ useHandCursor: true });
        t.on('pointerup', extra[1]);
        cc.add(t);
      }
      c.add(cc);
      return cc;
    };
    // t-2fd7bb86: Daily Puzzle, Challenge and Remix each open on their own level (unlocks.ts)
    const dailyOpen = m.playtestMode ? lv >= 10 : this.featureOpen('puzzles');
    const modesOpen = !m.playtestMode && (['puzzles', 'challenge', 'remix'] as Feature[]).some((f) => this.featureOpen(f));
    const modesNew = (['challenge', 'remix'] as Feature[]).some((f) => isNew(m, f));
    // r42 DAILY PUZZLE leads the Events tab (Daily Bench + classic modes moved behind "Other modes")
    const pz = this.puzzleRec();
    const solvedToday = pz.lastSolved === localDate();
    const dp = this.dailyPuzzle();
    const dcard = card(330, 220, solvedToday ? 'DAILY PUZZLE ✓' : 'DAILY PUZZLE', [`Win in ${mergesText(dp.moves)}${dp.only ? '  ·  special rule' : ''}  ·  streak ${pz.streak}`, solvedToday ? 'Solved! New puzzle tomorrow' : 'Reward: 40 Bolts + 3 Gems'], 0x8e58c9, dailyOpen, m.playtestMode ? 10 : UNLOCK_LEVEL.puzzles!, () => (this.seen('puzzles'), this.startPuzzle(dp, 'daily')), ['Other modes \u203a', () => this.openOtherModes(), modesOpen]);
    if (dailyOpen && isNew(m, 'puzzles')) this.newTag(dcard, 70, -70);
    if (modesOpen && modesNew) this.newTag(dcard, -(W - 50) / 2 + 220, 110 - 50 - 18, 0.8);
    if (m.playtestMode) {
      this.drawNav(c, 'events');
      return;
    }
    // r29 BOSS RUSH card (before the older modes)
    const rushOpen = this.rushEligible();
    const rw = m.rush?.week === weekId() ? m.rush.granted : 0;
    this.bountyCard(c, 585);
    card(845, 240, 'BOSS RUSH', ['3 fights in a row  \u00b7  fresh boards', `This week: ${rw}/${RUSH_REWARDS[2]} Bolts${m.rush?.medal ? '  \u00b7  medal ✓' : ''}`], 0x8e58c9, !!rushOpen, 20, () => this.startRush());
    // r36 SCREW YARD weekly event (outside-core mini-game)
    const yd = this.yardWeek();
    const tierNow = YARD_TIERS.filter((_, i) => tierReached(yd, i)).length;
    card(1100, 230, 'SCREW YARD', [`TIER ${tierNow}/${YARD_TIERS.length}  ·  ★ ${yardStarTotal(yd)}/${YARD_COUNT * 3}  ·  ends in ${this.weekLeft()}`, 'Free to play  ·  Grand prize: Gold Crate + Epic'], 0xe0a020, lv >= YARD_UNLOCK, YARD_UNLOCK, () => this.openYardEvent());
    this.drawNav(c, 'events');
  }

  /** r36: this week's Screw Yard record (a new week resets it; a classic record moves to 2.0, see yardWeekRec). */
  yardWeek() {
    const m = this.meta;
    m.yard = yardWeekRec(m.yard, weekId());
    return m.yard;
  }

  /** Screw Yard 2.0 boosters held (the starter kit is granted once). */
  yardBoosters(): BoosterCounts {
    const m = this.meta;
    const grants = (m.grants ??= {});
    if (!grants.yard2_boosters) {
      grants.yard2_boosters = true;
      m.yardBoosters = addBoosters(m.yardBoosters ?? {}, YARD_BOOSTER_START);
    }
    return (m.yardBoosters ??= {});
  }

  weekLeft() {
    const msLeft = (weekId() + 1) * 7 * 86400000 - 3 * 86400000 - Date.now();
    const d = Math.floor(msLeft / 86400000), h = Math.floor((msLeft % 86400000) / 3600000);
    return d > 0 ? `${d}d ${h}h` : `${h}h`;
  }

  rewardText(r: YardReward) {
    const bst = YARD_BOOSTERS.filter((k) => r.boosters?.[k]).map((k) => `${BOOSTER_COPY[k].name}${r.boosters![k]! > 1 ? ` x${r.boosters![k]}` : ''}`);
    return joinRewards([r.bolts ? `${r.bolts} BOLTS` : '', r.gems ? `${r.gems} GEMS` : '', r.crate ? `${r.crate.toUpperCase()} CRATE` : '', r.epic ? 'EPIC UNIT' : '', ...bst]);
  }

  /** Screw Yard event panel (2.0): the star track + grand prize, the week's 10 yards with their stars, boosters, PLAY.
   *  Free to play: the r36 screwdriver ticket is gone (the 10-yard ramp already caps the week; stars pay, not volume). */
  openYardEvent() {
    this.closeModal();
    const yd = this.yardWeek();
    const bst = this.yardBoosters();
    const PH = 1180;
    const c = this.sheet(PH);
    const top = H / 2 - PH / 2;
    const total = yardStarTotal(yd);
    this.sheetTitle(c, top, 'SCREW YARD', `Earn stars to climb the tiers.  Event ends in ${this.weekLeft()}.`);
    const rows = YARD_TIERS.length;
    YARD_TIERS.forEach((t, i) => {
      const y = top + 196 + i * 66;
      const done = tierReached(yd, i);
      const grand = i === rows - 1;
      const g = this.add.graphics();
      g.fillStyle(grand ? 0xffcf33 : done ? 0x8ef08a : 0xfbe7c6, 1).fillRoundedRect(70, y - 29, W - 140, 58, 16);
      g.lineStyle(4, 0x2b1d2e, grand ? 1 : 0.4).strokeRoundedRect(70, y - 29, W - 140, 58, 16);
      c.add(g);
      c.add(this.add.text(96, y, done ? '✓' : `★${t.need}`, { fontFamily: 'Lilita One, Arial Black', fontSize: '28px', color: '#3b2533' }).setOrigin(0, 0.5));
      c.add(this.add.text(186, y, `${grand ? 'GRAND PRIZE: ' : ''}${this.rewardText(t.reward)}`, { fontFamily: 'Lilita One, Arial Black', fontSize: grand ? '22px' : '24px', color: '#3b2533' }).setOrigin(0, 0.5));
    });
    // the week's 10 yards: number + best stars; open ones can be replayed for more stars
    const cy = top + 196 + rows * 66 + 40;
    for (let n = 1; n <= YARD_COUNT; n++) {
      const x = W / 2 + (n - (YARD_COUNT + 1) / 2) * 62;
      const open = yardPlayable(yd, n);
      const s = yd.stars?.[n] ?? 0;
      const g = this.add.graphics();
      g.fillStyle(s ? 0xffe9a8 : open ? 0xfbe7c6 : 0xcdbfa8, 1).fillRoundedRect(x - 28, cy - 34, 56, 76, 14).lineStyle(3, 0x2b1d2e, open ? 0.8 : 0.3).strokeRoundedRect(x - 28, cy - 34, 56, 76, 14);
      c.add(g);
      c.add(this.add.text(x, cy + 24, '★'.repeat(s) + '☆'.repeat(3 - s), { fontFamily: 'Arial', fontStyle: 'bold', fontSize: '17px', color: s ? '#c07a00' : '#8a7a6a' }).setOrigin(0.5));
      const t = this.add.text(x, cy - 6, open ? String(n) : '\u{1F512}', { fontFamily: 'Lilita One, Arial Black', fontSize: open ? '30px' : '22px', color: '#3b2533' }).setOrigin(0.5);
      c.add(t);
      if (open) {
        const hit = this.add.zone(x, cy + 4, 56, 76).setInteractive({ useHandCursor: true });
        hit.on('pointerup', () => this.startYard(n));
        c.add(hit);
      }
    }
    const by = cy + 78;
    c.add(this.add.text(W / 2, by, `★ ${total}/${YARD_COUNT * 3}  ·  ${YARD_BOOSTERS.map((k) => `${BOOSTER_COPY[k].name} ${bst[k] ?? 0}`).join('  ')}`, { fontFamily: 'Lilita One, Arial Black', fontSize: '25px', color: '#5a3a3a' }).setOrigin(0.5));
    c.add(this.add.text(W / 2, by + 44, 'Free to play. Stars: keep the dock nearly empty.\nBoosters are earned with 3 stars and tiers.', { fontFamily: 'Arial', fontStyle: 'bold', fontSize: '20px', color: '#7a5a4a', align: 'center' }).setOrigin(0.5));
    const nx = nextYard(yd);
    this.button(c, W / 2, top + PH - 170, 460, qaYardObject() ? `PLAY ${CRATE.name}` : `PLAY YARD ${nx}`, 0x5fbf4a, () => this.startYard(nx), 0.95);
    this.button(c, W / 2, top + PH - 70, 260, 'BACK', 0x8a6a4a, () => this.openTitle('events'), 0.75);
  }

  startYard(n = nextYard(this.yardWeek())) {
    if (qaYardObject()) return this.startObjectYard();
    const m = this.meta;
    const yd = this.yardWeek();
    if (!yardPlayable(yd, n)) n = nextYard(yd);
    const level = weekYard(n, yd.week);
    this.yardBoosters();
    store(META_KEY, JSON.stringify(m));
    tlog.log('yard_start', { week: yd.week, n });
    this.seasonEv('yardPlay');
    this.closeModal();
    const data: YardData = {
      n,
      level,
      tips: m.tips,
      boosters: { ...this.yardBoosters() },
      spend: (b: YardBooster) => {
        const have = this.yardBoosters();
        if (!have[b]) return false;
        have[b]!--;
        store(META_KEY, JSON.stringify(m));
        tlog.log('yard_booster', { n, booster: b });
        return true;
      },
      saveTips: () => store(META_KEY, JSON.stringify(m)),
      onEnd: (r) => this.endYard(n, r),
    }; // (this scene sleeps meanwhile: its own clock is stopped)
    this.scene.launch('yard', data);
    this.scene.sleep();
  }

  /** QA SCREW YARD: OBJECT - the turnable crate (first step: one hand-built object, nothing booked to the week yet). */
  startObjectYard() {
    tlog.log('yard_object_start', { obj: CRATE.id });
    this.closeModal();
    const data: ObjectYardData = { lvl: CRATE, onEnd: (r) => this.endObjectYard(r), onResult: (r) => tlog.log('yard_object_end', { won: r.won, moves: r.moves }) };
    this.scene.launch('objectYard', data);
    this.scene.sleep();
  }

  /** The result panel lives in the yard scene (over the yard); this only runs on EVENT / the quit button. */
  endObjectYard(_r: ObjectYardResult) {
    this.scene.wake();
    this.openYardEvent();
  }

  endYard(n: number, r: YardResult) {
    this.scene.wake();
    if (r.quit) return this.openYardEvent();
    const m = this.meta;
    const yd = this.yardWeek();
    const got: string[] = [];
    const out = recordYard(yd, n, r.stars);
    if (out.bolts) {
      m.bolts = (m.bolts ?? 0) + out.bolts;
      got.push(`+${out.gainedStars} NEW ★  ·  +${out.bolts} BOLTS`);
    } else if (r.won) got.push('No new stars this time');
    if (Object.keys(out.boosters).length) {
      m.yardBoosters = addBoosters(this.yardBoosters(), out.boosters);
      got.push(`3 STARS: +1 ${BOOSTER_COPY[Object.keys(out.boosters)[0] as YardBooster].name}`);
    }
    for (const i of out.tiers) {
      const t = YARD_TIERS[i].reward;
      if (t.bolts) m.bolts = (m.bolts ?? 0) + t.bolts;
      if (t.gems) m.gems = (m.gems ?? 0) + t.gems;
      if (t.crate) this.giveCrate(t.crate);
      if (t.boosters) m.yardBoosters = addBoosters(this.yardBoosters(), t.boosters);
      if (t.epic) {
        this.seasonBonus(BONUS_XP.yardGrand, 'SCREW YARD');
        // the grand prize: a card of an epic unit (a missing one first)
        const epics = UNITS.filter((u) => u.rarity === 'epic');
        const miss = epics.filter((u) => !this.ownsUnit(u.id));
        const u = (miss.length ? miss : epics)[(yd.week + n) % (miss.length || epics.length)];
        this.applyCards([{ unit: u.id, count: 1, isNew: !this.ownsUnit(u.id) }]);
        got.push(`EPIC: ${FAMILY_INFO[u.id as 'cannon'].name.toUpperCase()}`);
      }
      got.push(`TIER ${i + 1}: ${this.rewardText(t)}`);
    }
    store(META_KEY, JSON.stringify(m));
    tlog.log('yard_end', { n, won: r.won, stars: r.stars, peak: r.peak, clears: yd.clears });
    const c = this.panel(660);
    const top = H / 2 - 330;
    c.add(this.add.text(W / 2, top + 64, r.won ? `YARD ${n} CLEARED!` : 'DOCK FULL!', { fontFamily: 'Lilita One, Arial Black', fontSize: '52px', color: r.won ? '#e8452c' : '#3b2533' }).setOrigin(0.5));
    if (r.won) {
      const g = this.add.graphics();
      for (let k = 0; k < 3; k++) this.starShape(g, W / 2 + (k - 1) * 84, top + 150, 34, k < r.stars);
      c.add(g);
      c.add(this.add.text(W / 2, top + 206, `Most screws in the dock: ${r.peak}   ·   3★ at ${r.minPeak + 1} or less`, { fontFamily: 'Arial', fontStyle: 'bold', fontSize: '22px', color: '#7a5a4a' }).setOrigin(0.5));
    }
    c.add(this.add.text(W / 2, top + 250, r.won ? got.join('\n') : 'Plan ahead: free the screws whose\nbox is coming NEXT, and keep dock slots free.', { fontFamily: 'Lilita One, Arial Black', fontSize: '26px', color: '#5a3a3a', align: 'center', lineSpacing: 8 }).setOrigin(0.5, 0));
    const next = r.won && n < YARD_COUNT ? n + 1 : n;
    this.button(c, W / 2, top + 510, 420, r.won && n < YARD_COUNT ? 'NEXT YARD' : r.won ? 'PLAY AGAIN' : 'TRY AGAIN', 0x5fbf4a, () => this.startYard(next), 0.9);
    this.button(c, W / 2, top + 600, 260, 'EVENT', 0x8a6a4a, () => this.openYardEvent(), 0.75);
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
    // boss cards carry the attack diagram; r34 first-time ideas carry a NEW! tag and bigger text
    const masteryOn = ((m.levelStars ?? {})[String(n)] ?? 0) > 0;
    const PH = (hasJump ? 860 : 760) + (isBoss ? 110 : 0) + (masteryOn ? 84 : 0) + (newConcepts(n).length || n === 6 || (def.start_extra ?? []).some(([f]) => f === 'magnet' || f === 'battery' || f === 'fan') ? 100 : 0);
    const c = this.sheet(PH);
    const top = H / 2 - PH / 2;
    const diff = miniDef ? 'MINI-BOSS' : isBoss ? 'BOSS' : def.difficulty === 'NORMAL' ? '' : def.difficulty === 'HARD' ? 'HARD' : 'MEGA HARD';
    c.add(this.add.text(W / 2, top + 64, `LEVEL ${n}`, { fontFamily: 'Lilita One, Arial Black', fontSize: '52px', color: '#3b2533' }).setOrigin(0.5));
    if (diff) c.add(this.add.text(W / 2, top + 112, diff, { fontFamily: 'Lilita One, Arial Black', fontSize: '24px', color: '#ffffff', backgroundColor: isBoss ? '#2b1d2e' : def.difficulty === 'HARD' ? '#e8452c' : '#8e58c9', padding: { x: 12, y: 4 } }).setOrigin(0.5));
    const ti = MONSTER_INDEX[def.monster] ?? 0;
    const bossDef = miniDef ?? (isBoss ? BOSSES[chapterBossIdx(n)] : null);
    const castV = !bossDef ? this.castOf(n) : undefined;
    const tk = bossDef && this.hasArt(`boss_${bossDef.id}_intact`) ? `boss_${bossDef.id}_intact` : castV ? `mon_${castV}` : `target_${ti}`;
    const wv = def.waves ? [...(def.wave_visuals ?? []), ...(bossDef ? [`@boss`] : [])] : [];
    if (wv.length) {
      // r33 stage strip: every machine of the level in order, the goal machine flagged
      // r38 (ChatGPT review): the boss / goal machine is the climax - drawn ~35% bigger, an arrow before it
      const climax = !!bossDef || !!def.goal;
      const step = Math.min(140, (W - 220) / (wv.length + (climax ? 0.8 : 0)));
      const span = (wv.length - 1) * step + (climax ? step * 0.8 : 0);
      wv.forEach((v, i) => {
        const last = climax && i === wv.length - 1;
        const x = W / 2 - span / 2 + i * step + (last ? step * 0.8 : 0);
        const size = last ? (step - 14) * 1.35 : step - 14;
        const key = v === '@boss' ? tk : CAST[v] && this.hasArt(`mon_${v}`) ? `mon_${v}` : `target_${MONSTER_INDEX[v] ?? 0}`;
        if (this.textures.exists(key)) {
          const im = this.add.image(x, top + 250 - (last ? size * 0.12 : 0), key);
          im.setScale(size / Math.max(im.width, im.height));
          c.add(im);
        }
        if (last) c.add(this.add.text(x - step * 0.95, top + 250, '\u2192', { fontFamily: 'Lilita One, Arial Black', fontSize: '40px', color: '#3b2533' }).setOrigin(0.5));
        const isGoal = !!def.goal && i === wv.length - 1;
        const isBoss = v === '@boss';
        c.add(this.add.text(x, top + 250 + (step - 14) / 2 + 12, isBoss ? (miniDef ? 'MINI-BOSS' : 'BOSS') : isGoal ? 'GOAL' : `${i + 1}`, { fontFamily: 'Lilita One, Arial Black', fontSize: '22px', color: '#ffffff', backgroundColor: isBoss ? '#e8452c' : isGoal ? '#5fbf4a' : '#3b2533', padding: { x: 8, y: 1 } }).setOrigin(0.5));
      });
    } else if (this.textures.exists(tk)) {
      const im = this.add.image(W / 2, top + 250, tk);
      im.setScale(180 / Math.max(im.width, im.height));
      c.add(im);
    }
    c.add(this.add.text(W / 2, top + 362, `${bossDef ? (wv.length ? `${wv.length - 1} MINIONS \u2192 ${bossDef.name}` : bossDef.name) : wv.length ? `${wv.length} MACHINES` : castV ? CAST[castV].name : TARGET_NAMES[ti]}  ·  ${mmss(bossDef && !miniDef && !def.waves ? 90 : def.time_seconds)}`, { fontFamily: 'Lilita One, Arial Black', fontSize: '32px', color: '#3b2533' }).setOrigin(0.5));
    let y = top + 400;
    const firstOf: Record<string, number> = { rocket: 6, magnet: 12, battery: 17, fan: 23 };
    const newFam = n === 6 ? 'rocket' : (def.start_extra ?? []).map(([f]) => f).find((f) => firstOf[f] === n);
    const parts = bossDef
      ? [bossDef.copy, bossDef.second ? `Final phase: also ${ATTACK_COPY[bossDef.second].what.toLowerCase()}!` : '']
      : [def.goal ? (def.waves ? `LAST MACHINE only breaks when you ${goalText(def.goal).toLowerCase()}` : `GOAL: ${goalText(def.goal)}`) : '', def.behaviour ? BEHAVIOUR_TEXT[def.behaviour] : MODIFIER_TEXT[def.modifier], newFam ? `NEW: ${FAMILY_INFO[newFam as 'rocket'].name.toUpperCase()}. ${FAMILY_INFO[newFam as 'rocket'].text}` : ''];
    const mt = [...parts, goodHereText(def, (u) => this.ownsUnit(u))].filter(Boolean).join('\n');
    // r34 onboarding: the first level with a new idea says so, big and dark (not small purple print)
    const fresh = newConcepts(n).length > 0 || !!newFam;
    if (mt && fresh) {
      const tag = this.add.text(W / 2, y + 4, 'NEW!', { fontFamily: 'Lilita One, Arial Black', fontSize: '30px', color: '#ffffff', backgroundColor: '#e8452c', padding: { x: 14, y: 2 } }).setOrigin(0.5, 0);
      c.add(tag);
      y += tag.height + 14;
    }
    if (mt) {
      const t = this.add.text(W / 2, y, mt, { fontFamily: 'Arial', fontStyle: 'bold', fontSize: bossDef || fresh ? '27px' : '22px', color: bossDef || fresh ? '#3b2533' : '#8e58c9', align: 'center', wordWrap: { width: W - 170 } }).setOrigin(0.5, 0);
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
    const goals = ['Clear', `≤${mmss(g2)}`, `≤${mmss(g3)}`];
    for (let k = 0; k < 3; k++) {
      const sx = W / 2 + (k - 1) * 110;
      this.starShape(sg, sx, y + 40, 30, k < have);
      c.add(this.add.text(sx, y + 92, goals[k], { fontFamily: 'Lilita One, Arial Black', fontSize: '22px', color: '#7a5a4a' }).setOrigin(0.5));
    }
    c.add(sg);
    y += 130;
    // r40 Saga Mastery: two optional contracts once the level is cleared
    if (masteryOn) {
      const done = m.sagaMedals?.[String(n)] ?? [];
      contractsFor(def).forEach((ct, i) => {
        const ok = done.includes(i);
        c.add(this.add.text(W / 2, y + i * 36, `${ok ? '\u2713' : '\u25cb'}  MASTERY: ${contractText(ct)}`, { fontFamily: 'Lilita One, Arial Black', fontSize: '22px', color: ok ? '#3a8a2a' : '#8e58c9' }).setOrigin(0.5));
      });
      y += 84;
    }
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
    // r38 (ChatGPT review): the stars lesson is one compact line above PLAY on the first cards, never a box over the stars
    if (n % 10 !== 0 && !(m.lessons ?? {}).card) {
      if (!sc) c.add(this.add.text(W / 2, top + PH - 162, 'Clear = ★     Faster = ★★ / ★★★', { fontFamily: 'Lilita One, Arial Black', fontSize: '26px', color: '#b06a1a' }).setOrigin(0.5));
      if (n >= 3) {
        (m.lessons ??= {}).card = true;
        store(META_KEY, JSON.stringify(m));
      }
    } else if (!sc && !isBoss && this.trialToday() && this.meta.trial!.left > 0) {
      const t = this.meta.trial!;
      const nm = FAMILY_INFO[t.unit as 'cannon'].name.toUpperCase();
      const lbl = this.add.text(W / 2, top + PH - 162, t.on ? `\u2713 ${nm} TRIAL ON  \u00b7  ${t.left} left today` : `TRY ${nm} LV ${TRIAL_LEVEL}  \u00b7  ${t.left} free battles today`, { fontFamily: 'Lilita One, Arial Black', fontSize: '24px', color: '#ffffff', backgroundColor: t.on ? '#5fbf4a' : '#8e58c9', padding: { x: 14, y: 6 } }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      lbl.on('pointerup', () => {
        t.on = !t.on;
        store(META_KEY, JSON.stringify(this.meta));
        tlog.log('trial_toggle', { unit: t.unit, on: t.on });
        this.openLevelSheet(n);
      });
      c.add(lbl);
    } else if (!isBoss && n >= BOOSTER_UNLOCK.time_capsule && hasJump) this.lesson('boosters', c, 'Kits improve your starting pair.\nHold a Capsule for +15s.\nBoth are optional.', { x: W / 2 + 220, y: top + PH - 250, r: 70 }, top + 200);
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
    // F7: the warm-up's last lane banner (e.g. "x4 CHAIN") must not carry into the level
    this.laneMsg.until = 0;
    this.laneText?.setText('').setAlpha(0);
    // r38 trial: today's featured unit takes its slot at TRIAL_LEVEL for TRIAL_BATTLES battles
    const tu = this.trialActive();
    const td = tu ? unitDef(tu) : undefined;
    let shooter = this.teamShooter(), relays = this.teamRelays(), toys = this.activeToys();
    if (td?.slot === 'shooter') shooter = td.id;
    else if (td?.slot === 'relay') relays = [td.id, relays[1] === td.id ? relays[0] : relays[1]];
    else if (td?.slot === 'helper') toys = [td.id];
    applyPace(qaPace()); // QA PACE switch: the stored pace takes effect from this level
    applyUnits(qaUnits()); // QA UNITS switch, same
    applyMergeRule(qaMergeRule()); // QA MERGE RULE switch, same
    applyThinkBank(qaThinkBank()); // QA THINK BANK switch, same
    this.startState(newLevel(def, { toys, shooter, jumpstart, relays }));
    if (td && m.trial) {
      this.s.unitMult = { ...(this.s.unitMult ?? {}), [td.id]: levelMult(td, TRIAL_LEVEL) };
      this.s.unitLevel = { ...(this.s.unitLevel ?? {}), [td.id]: TRIAL_LEVEL };
      m.trial.left--;
      store(META_KEY, JSON.stringify(m));
      tlog.log('trial_battle', { unit: td.id, left: m.trial.left });
      this.time.delayedCall(900, () => this.showEvent(`TRIAL: ${FAMILY_INFO[td.id as 'cannon'].name.toUpperCase()} LV ${TRIAL_LEVEL}`, '#d9c2ff', 1600));
    }
  }

  /** r42 WORKSHOP PUZZLES */
  puzzleDef: PuzzleDef | null = null;
  puzzleKind: 'daily' | 'drill' = 'daily';
  hintBtn: Phaser.GameObjects.Container | null = null;
  /** r44 graduated help (owner stuck on the first puzzle): HINT after 1 fail (or 20 s idle), NEXT MOVE after 2 (r45); RESTART always. */
  helpBtn: Phaser.GameObjects.Container | null = null;
  helpLabel: Phaser.GameObjects.Text | null = null;
  /** Merges of this attempt (finds the next correct merge without a search while still on the stored line). */
  puzzlePlayed: Move[] = [];
  /** r45 idle nudge: HINT shown by idling on this puzzle (until it is left), and the nudge already ran this attempt. */
  puzzleNudged = false;
  nudgedThisTry = false;
  static PUZZLES = puzzleData as unknown as { daily: PuzzleDef[]; drills: Record<string, PuzzleDef[]> };

  puzzleRec(): PuzzleRec {
    return (this.meta.puzzles ??= { streak: 0, drills: [] });
  }

  /** r44: your own day count picks the puzzle (starts at the warm-up and climbs), not the calendar. */
  dailyPuzzle(): PuzzleDef {
    const list = GameScene.PUZZLES.daily;
    const pz = this.puzzleRec();
    const was = pz.date;
    const i = dailyIndex(pz, localDate(), list.length);
    if (pz.date !== was) store(META_KEY, JSON.stringify(this.meta));
    return list[i];
  }

  findPuzzle(id: string): { def: PuzzleDef; kind: 'daily' | 'drill' } | null {
    const daily = GameScene.PUZZLES.daily.find((p) => p.id === id);
    if (daily) return { def: daily, kind: 'daily' };
    const drill = Object.values(GameScene.PUZZLES.drills).flat().find((p) => p.id === id);
    return drill ? { def: drill, kind: 'drill' } : null;
  }

  puzzleHelpNow() {
    const help = puzzleHelp(this.puzzleDef ? (this.puzzleRec().fails?.[this.puzzleDef.id] ?? 0) : 0, this.puzzleKind);
    return { ...help, hint: help.hint || this.puzzleNudged };
  }

  /** r45: a fresh attempt left idle for HELP.idleNudge s shows the (free) HINT and pulses it once. Never mid-animation. */
  puzzleNudge() {
    if (this.modal || this.explaining) this.idleTime = 0; // reading a card isn't being stuck
    if (this.nudgedThisTry || this.puzzlePlayed.length || this.idleTime < HELP.idleNudge || this.dragIdx >= 0 || this.hintPair || !this.helpBtn) return;
    if (this.s.grid.some((g) => (g && this.views.get(g.id) ? this.tweens.isTweening(this.views.get(g.id)!) : false))) return;
    this.nudgedThisTry = this.puzzleNudged = true;
    this.helpBtn.setVisible(true).setScale(1);
    this.tweens.add({ targets: this.helpBtn, scale: 1.15, duration: 260, yoyo: true, repeat: 3, ease: 'Sine.InOut', onComplete: () => this.helpBtn?.setScale(1) });
    this.showEvent(`Stuck? Tap ${this.puzzleHelpNow().showMove ? 'NEXT MOVE' : 'HINT'}`, '#d9c2ff', 2200);
    tlog.log('puzzle_nudge', { id: this.puzzleDef?.id });
  }

  /** Fresh board; puzzles are exact, so unit levels never change them. */
  resetPuzzle(def: PuzzleDef) {
    this.startState(newPuzzle(def));
    this.s.unitMult = {};
    this.s.unitLevel = {};
    this.puzzlePlayed = [];
    this.nudgedThisTry = false;
  }

  startPuzzle(def: PuzzleDef, kind: 'daily' | 'drill') {
    this.puzzleDef = def;
    this.puzzleKind = kind;
    tlog.log('puzzle_start', { id: def.id, kind, score: def.score });
    this.puzzleNudged = false;
    this.resetPuzzle(def);
    const hudBtn = (x: number, w: number, color: number, label: string, onTap: () => void) => {
      const hb = this.add.container(x, TRAY_Y).setDepth(30);
      hb.add(this.add.graphics().fillStyle(0x2b1d2e, 1).fillRoundedRect(-w / 2, -36, w, 72, 20).fillStyle(color, 1).fillRoundedRect(-w / 2 + 4, -32, w - 8, 64, 17));
      const t = this.add.text(0, 0, label, { fontFamily: 'Lilita One, Arial Black', fontSize: '28px', color: '#ffffff' }).setOrigin(0.5);
      hb.add(t);
      hb.add(this.add.zone(0, 0, w, 72).setInteractive({ useHandCursor: true }).on('pointerup', onTap));
      return [hb, t] as const;
    };
    if (!this.hintBtn) {
      this.hintBtn = hudBtn(SCRAP_X - 10, 170, 0x8a6a4a, 'RESTART', () => this.restartPuzzle())[0];
      [this.helpBtn, this.helpLabel] = hudBtn(BX + 120, 240, 0x8e58c9, 'HINT', () => this.puzzleHelpTap());
    }
    const rule = def.only ? `Merge ONLY ${def.only.map((f) => FAMILY_INFO[f as 'cannon'].name).join(' + ')}.` : 'Any merge counts.';
    this.time.delayedCall(300, () =>
      this.explain(`puzzle_${def.id}`, [{ text: `WIN IN ${def.moves} MERGE${def.moves > 1 ? 'S' : ''}\nDeal ${fmt(def.hp)} damage. ${rule}\nNo clock - plan your chain!`, spots: [], y: TRAY_Y - 40 }]),
    );
  }

  /** RESTART (always there). Restarting after a merge counts as a try, so help unlocks for a stuck player. */
  restartPuzzle() {
    const def = this.puzzleDef;
    if (!def) return;
    sfx.click();
    const before = this.puzzleHelpNow();
    if (this.puzzlePlayed.length && this.s.phase === 'playing') {
      notePuzzleAttempt(this.puzzleRec(), def.id, false);
      store(META_KEY, JSON.stringify(this.meta));
    }
    tlog.log('puzzle_restart', { id: def.id, merges: this.puzzlePlayed.length });
    this.resetPuzzle(def);
    const now = this.puzzleHelpNow();
    if (now.showMove && !before.showMove) this.showEvent('NEXT MOVE unlocked - tap it if you get stuck', '#d9c2ff', 2200);
    else if (now.hint && !before.hint) this.showEvent('HINT unlocked - tap it if you want', '#d9c2ff', 2200);
  }

  /** HINT lights the part to move first; NEXT MOVE lights the next correct merge from the board as it is now. */
  puzzleHelpTap() {
    const def = this.puzzleDef;
    if (!def || this.s.phase !== 'playing') return;
    const help = this.puzzleHelpNow();
    if (!help.hint) return;
    sfx.click();
    const onLine = this.puzzlePlayed.every((m, i) => def.solution[i] && m[0] === def.solution[i][0] && m[1] === def.solution[i][1]);
    if (help.showMove) {
      let m = nextWinningMove(this.s, def, this.puzzlePlayed);
      if (m) this.showEvent('NEXT MOVE: merge the glowing pair', '#d9c2ff', 2200);
      else {
        this.resetPuzzle(def);
        m = def.solution[0];
        this.showEvent("That line can't win now - fresh board.\nMerge the glowing pair first", '#d9c2ff', 2600);
      }
      this.hintPair = m;
      const pz = this.puzzleRec();
      if (!(pz.shown ??= []).includes(def.id)) pz.shown.push(def.id);
      store(META_KEY, JSON.stringify(this.meta));
      tlog.log('puzzle_move_shown', { id: def.id, at: this.puzzlePlayed.length });
      return;
    }
    // gentle: one part, not the pair. Off the stored line, start over so the light means something.
    if (!onLine) this.resetPuzzle(def);
    const a = def.solution[this.puzzlePlayed.length][0];
    this.hintPair = [a, a]; // a single part: both ends on the same cell
    this.showEvent(this.puzzlePlayed.length ? 'HINT: move the glowing part next' : 'HINT: start with the glowing part', '#d9c2ff', 2200);
    tlog.log('puzzle_hint', { id: def.id, at: this.puzzlePlayed.length });
  }

  openPuzzleResult(won: boolean) {
    const m = this.meta;
    const pz = this.puzzleRec();
    const def = this.puzzleDef;
    if (!def || def.id !== this.s.puzzle?.id) return this.openTitle('events'); // never reached via startPuzzle; a guard, not a flow
    const kind = this.puzzleKind;
    const lines: string[] = [];
    let firstSolve = false;
    notePuzzleAttempt(pz, def.id, won);
    // r44: the first solve pays; the highlight hint is free, a shown merge halves it (rewards are once per puzzle/day)
    const rw = puzzleReward(kind, pz.shown?.includes(def.id) ? 'move' : 'none');
    const halved = rw.bolts < puzzleReward(kind, 'none').bolts;
    if (won && kind === 'daily' && pz.lastSolved !== localDate()) {
      firstSolve = true;
      const yesterday = new Date(Date.now() - 86400000);
      const y = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
      pz.streak = pz.lastSolved === y ? pz.streak + 1 : 1;
      pz.lastSolved = localDate();
      m.bolts = (m.bolts ?? 0) + rw.bolts;
      m.gems = (m.gems ?? 0) + rw.gems;
      lines.push(`+${rw.bolts} BOLTS  +${rw.gems} GEM${rw.gems === 1 ? '' : 'S'}`, `STREAK: ${pz.streak} day${pz.streak > 1 ? 's' : ''}`);
    } else if (won && kind === 'drill' && !pz.drills.includes(def.id)) {
      firstSolve = true;
      pz.drills.push(def.id);
      m.bolts = (m.bolts ?? 0) + rw.bolts;
      if (def.unit) this.applyCards([{ unit: def.unit as Family, count: rw.cards, isNew: false }]);
      lines.push(`+${rw.bolts} BOLTS  +${rw.cards} ${FAMILY_INFO[def.unit as 'cannon'].name.toUpperCase()} CARD${rw.cards === 1 ? '' : 'S'}`);
    } else if (won) lines.push('Solved again - nice!');
    if (firstSolve && halved) lines.push('(half reward: a move was shown)');
    if (won) pz.shown = pz.shown?.filter((id) => id !== def.id);
    store(META_KEY, JSON.stringify(m));
    // r43: first solves (the rewarded ones) feed the Season, so replays can't farm it
    if (firstSolve) this.seasonEv('puzzleSolve');
    tlog.log('puzzle_end', { id: def.id, won, fails: pz.fails?.[def.id] ?? 0 });
    const help = puzzleHelp(pz.fails?.[def.id] ?? 0, kind);
    const c = this.panel(640);
    const top = H / 2 - 320;
    const helpLine = help.showMove ? 'Stuck? NEXT MOVE shows a right merge.' : help.hint ? 'Stuck? HINT lights the part to move first.' : `A hint unlocks after ${HELP.hintAfter - (pz.fails?.[def.id] ?? 0)} more ${HELP.hintAfter - (pz.fails?.[def.id] ?? 0) === 1 ? 'try' : 'tries'}.`;
    c.add(this.add.text(W / 2, top + 70, won ? 'SOLVED!' : 'NOT QUITE', { fontFamily: 'Lilita One, Arial Black', fontSize: '58px', color: won ? '#8e58c9' : '#3b2533' }).setOrigin(0.5));
    c.add(this.add.text(W / 2, top + 150, won ? lines.join('\n') : this.s.puzzle.missedUnit ? missedUnitText(FAMILY_INFO[def.unit as 'cannon'].name, helpLine) : `The machine had ${fmt(Math.max(0, Math.round(this.s.hp)))} HP left.\nThe order of merges matters - and which\npiece you drop onto which.\n${helpLine}`, { fontFamily: 'Lilita One, Arial Black', fontSize: '26px', color: '#5a3a3a', align: 'center', lineSpacing: 8 }).setOrigin(0.5, 0));
    const nextDrill = won && kind === 'drill' && def.unit ? (GameScene.PUZZLES.drills[def.unit] ?? []).find((p) => !pz.drills.includes(p.id)) : undefined;
    if (nextDrill) this.button(c, W / 2, top + 440, 420, 'NEXT DRILL', 0x8e58c9, () => this.startPuzzle(nextDrill, 'drill'), 0.95);
    else if (!won) {
      const tryX = help.hint ? W / 2 - 130 : W / 2;
      this.button(c, tryX, top + 440, help.hint ? 240 : 320, 'TRY AGAIN', 0xe8452c, () => this.startPuzzle(def, kind), 0.85);
      if (help.hint) this.button(c, W / 2 + 130, top + 440, 240, help.showMove ? 'NEXT MOVE' : 'HINT', 0x8e58c9, () => (this.closeModal(), this.startPuzzle(def, kind), this.puzzleHelpTap()), 0.85);
    }
    const back = () => this.openTitle(kind === 'drill' ? 'units' : 'events');
    // skip: drills only (no reward, no Season credit). The daily has a streak and a reward, and the hints already get you there.
    if (!won && help.skip) {
      this.button(c, W / 2 - 130, top + 550, 240, 'SKIP DRILL', 0x8a6a4a, () => this.skipDrill(def), 0.78);
      this.button(c, W / 2 + 130, top + 550, 240, 'UNITS', 0x27a4c0, back, 0.78);
    } else this.button(c, W / 2, top + 550, 260, kind === 'drill' ? 'UNITS' : 'EVENTS', 0x27a4c0, back, 0.78);
  }

  /** r44: a drill you can't crack (6+ tries) can be marked done without its reward, so the unit's next drill opens. */
  skipDrill(def: PuzzleDef) {
    const pz = this.puzzleRec();
    if (!pz.drills.includes(def.id)) pz.drills.push(def.id);
    notePuzzleAttempt(pz, def.id, true);
    store(META_KEY, JSON.stringify(this.meta));
    tlog.log('puzzle_skip', { id: def.id });
    const next = def.unit ? (GameScene.PUZZLES.drills[def.unit] ?? []).find((p) => !pz.drills.includes(p.id)) : undefined;
    if (next) this.startPuzzle(next, 'drill');
    else this.openTitle('units');
  }
  /** r42 Unit Drills list for a unit (unlocked when owned). */
  openDrills(u: UnitDef) {
    this.closeModal();
    const pz = this.puzzleRec();
    const list = GameScene.PUZZLES.drills[u.id] ?? [];
    const PH = 300 + list.length * 130;
    const c = this.sheet(PH);
    const top = H / 2 - PH / 2;
    this.sheetTitle(c, top, `${FAMILY_INFO[u.id as 'cannon'].name.toUpperCase()} DRILLS`, 'Puzzles that train this unit. +2 of its cards each.');
    list.forEach((p, i) => {
      const done = pz.drills.includes(p.id);
      const rule = p.only ? `only ${p.only.map((f) => FAMILY_INFO[f as 'cannon'].name).join(' + ')}` : 'any merge';
      this.button(c, W / 2, top + 200 + i * 130, 520, `${done ? '\u2713 ' : ''}DRILL ${i + 1}  \u00b7  WIN IN ${p.moves}  \u00b7  ${rule}`, done ? 0x5fbf4a : 0x8e58c9, () => this.startPuzzle(p, 'drill'), 0.7);
    });
    this.button(c, W / 2, top + PH - 80, 240, 'BACK', 0x8a6a4a, () => this.openUnitDetail(u), 0.75);
  }

  openOtherModes() {
    this.closeModal();
    const m = this.meta;
    const c = this.sheet(560);
    const top = H / 2 - 280;
    this.sheetTitle(c, top, 'OTHER MODES', 'Daily Bench and the classic modes.');
    // t-2fd7bb86: each mode opens on its own level; Daily Bench comes with the Daily Puzzle
    const mode = (y: number, label: string, col: number, f: Feature, go: () => void) => {
      const open = this.featureOpen(f);
      const b = this.button(c, W / 2, y, 440, label, col, () => (open ? (this.seen(f), go()) : this.showToast(`UNLOCKS AT LEVEL ${UNLOCK_LEVEL[f]}`)), 0.85);
      if (!open) b.setAlpha(0.5);
      else if (isNew(m, f)) this.newTag(c, W / 2 + 170, y - 34);
    };
    mode(top + 210, 'DAILY BENCH', 0x5fbf4a, 'puzzles', () => this.startDaily());
    mode(top + 320, 'CHALLENGE', 0xe8452c, 'challenge', () => this.retry(true, -1));
    mode(top + 430, 'REMIX', 0x27a4c0, 'remix', () => this.openRemixPicker());
  }

  /** r41 Workshop Season: today's record (rolled to the current day / week / season). */
  seasonRec(): SeasonRec {
    const day = Math.floor(Date.now() / 86400000);
    this.meta.season = rollSeason(this.meta.season, day);
    return this.meta.season;
  }

  seasonEv(ev: SeasonEvent, n = 1) {
    const rec = this.seasonRec();
    const before = seasonTier(rec);
    const xp = seasonCount(rec, ev, n);
    if (!xp) return;
    store(META_KEY, JSON.stringify(this.meta));
    tlog.log('season_xp', { ev, xp, total: rec.xp });
    this.time.delayedCall(400, () => this.showToast(seasonTier(rec) > before ? `SEASON TIER ${seasonTier(rec)}!` : `+${xp} SEASON XP`));
  }

  seasonBonus(xp: number, why: string) {
    const rec = this.seasonRec();
    rec.xp += xp;
    tlog.log('season_bonus', { why, xp });
  }

  seasonClaimable() {
    const rec = this.seasonRec();
    const t = seasonTier(rec);
    let n = 0;
    for (let k = 1; k <= t; k++) {
      if (!rec.claimed.free.includes(k)) n++;
      if (rec.premium && !rec.claimed.prem.includes(k)) n++;
    }
    return n;
  }

  seasonRewardText(r: SeasonReward) {
    const u = FAMILY_INFO[seasonUnit(this.seasonRec().id) as 'cannon'].name.toUpperCase().replace('SIGNAL ', '');
    return [r.bolts ? `${r.bolts} BOLTS` : '', r.gems ? `${r.gems} GEMS` : '', r.crate ? `${r.crate.toUpperCase()} CRATE` : '', r.unitCards ? `${r.unitCards} ${u}` : ''].filter(Boolean).join(' + ');
  }

  grantSeasonReward(r: SeasonReward) {
    const m = this.meta;
    if (r.bolts) m.bolts = (m.bolts ?? 0) + r.bolts;
    if (r.gems) m.gems = (m.gems ?? 0) + r.gems;
    if (r.crate) this.giveCrate(r.crate);
    if (r.unitCards) {
      const u = seasonUnit(this.seasonRec().id);
      this.applyCards([{ unit: u, count: r.unitCards, isNew: !this.ownsUnit(u) }]);
    }
  }

  /** r41 SEASON panel: XP bar, today's + this week's tasks, the tier track around the current tier, claim all, premium. */
  openSeason() {
    this.closeModal();
    const m = this.meta;
    const rec = this.seasonRec();
    const day = Math.floor(Date.now() / 86400000);
    const tier = seasonTier(rec);
    const PH = 1220;
    const c = this.sheet(PH);
    const top = H / 2 - PH / 2;
    this.sheetTitle(c, top, 'WORKSHOP SEASON', `Tier ${tier}/${SEASON_TIERS}  ·  ends in ${seasonDayLeft(day)} days`);
    // XP bar
    const into = tier >= SEASON_TIERS ? TIER_XP : rec.xp - tier * TIER_XP;
    const g = this.add.graphics().fillStyle(0x2b1d2e, 1).fillRoundedRect(80, top + 168, W - 160, 30, 15).fillStyle(0xe0a020, 1).fillRoundedRect(84, top + 172, Math.max(22, (W - 168) * (into / TIER_XP)), 22, 11);
    c.add(g);
    c.add(this.add.text(W / 2, top + 183, `${into}/${TIER_XP} XP`, { fontFamily: 'Lilita One, Arial Black', fontSize: '20px', color: '#ffffff', stroke: '#2b1d2e', strokeThickness: 4 }).setOrigin(0.5));
    // tasks
    const taskLine = (y: number, text: string, have: number, need: number, xp: number) => {
      const done = have >= need;
      c.add(this.add.text(86, y, `${done ? '\u2713' : '\u25cb'} ${text}`, { fontFamily: 'Lilita One, Arial Black', fontSize: '22px', color: done ? '#3a8a2a' : '#3b2533' }).setOrigin(0, 0.5));
      c.add(this.add.text(W - 86, y, done ? 'DONE' : `${have}/${need}  \u00b7  +${xp}`, { fontFamily: 'Lilita One, Arial Black', fontSize: '20px', color: done ? '#3a8a2a' : '#8a6a5a' }).setOrigin(1, 0.5));
    };
    c.add(this.add.text(86, top + 230, 'TODAY', { fontFamily: 'Lilita One, Arial Black', fontSize: '22px', color: '#b06a1a' }).setOrigin(0, 0.5));
    dailyTasks(rec.day).forEach((t, i) => taskLine(top + 264 + i * 34, t.text, rec.daily[i], t.n, 15));
    c.add(this.add.text(86, top + 378, 'THIS WEEK', { fontFamily: 'Lilita One, Arial Black', fontSize: '22px', color: '#b06a1a' }).setOrigin(0, 0.5));
    weeklyTasks(rec.week).forEach((t, i) => taskLine(top + 412 + i * 34, t.text, rec.weekly[i], t.n, 100));
    // track: 6 tiers from the current one
    c.add(this.add.text(W / 2 - 100, top + 560, 'FREE', { fontFamily: 'Lilita One, Arial Black', fontSize: '22px', color: '#3b2533' }).setOrigin(0.5));
    c.add(this.add.text(W / 2 + 170, top + 560, rec.premium ? 'PREMIUM \u2713' : 'PREMIUM', { fontFamily: 'Lilita One, Arial Black', fontSize: '22px', color: '#8e58c9' }).setOrigin(0.5));
    const first = Math.max(1, Math.min(SEASON_TIERS - 5, tier));
    for (let k = 0; k < 6; k++) {
      const t = first + k;
      const y = top + 604 + k * 66;
      const [fr, pr] = tierRewards(t);
      const reached = t <= tier;
      c.add(this.add.graphics().fillStyle(reached ? 0x8ef08a : 0xfbe7c6, reached ? 0.45 : 1).fillRoundedRect(70, y - 28, W - 140, 56, 14));
      c.add(this.add.text(96, y, `${t}`, { fontFamily: 'Lilita One, Arial Black', fontSize: '26px', color: '#3b2533' }).setOrigin(0, 0.5));
      const fDone = rec.claimed.free.includes(t), pDone = rec.claimed.prem.includes(t);
      c.add(this.add.text(W / 2 - 100, y, `${fDone ? '\u2713 ' : ''}${this.seasonRewardText(fr)}`, { fontFamily: 'Arial', fontStyle: 'bold', fontSize: '18px', color: fDone ? '#3a8a2a' : '#5a4a5a' }).setOrigin(0.5));
      c.add(this.add.text(W / 2 + 170, y, `${pDone ? '\u2713 ' : rec.premium ? '' : '\u{1F512} '}${this.seasonRewardText(pr)}`, { fontFamily: 'Arial', fontStyle: 'bold', fontSize: '18px', color: pDone ? '#3a8a2a' : '#6a4a8a' }).setOrigin(0.5));
    }
    const claim = this.seasonClaimable();
    this.button(c, W / 2, top + 1018, 420, claim ? `CLAIM ALL (${claim})` : 'NOTHING TO CLAIM', claim ? 0x5fbf4a : 0x81736c, () => {
      if (!claim) return;
      for (let t = 1; t <= tier; t++) {
        const [fr, pr] = tierRewards(t);
        if (!rec.claimed.free.includes(t)) {
          rec.claimed.free.push(t);
          this.grantSeasonReward(fr);
        }
        if (rec.premium && !rec.claimed.prem.includes(t)) {
          rec.claimed.prem.push(t);
          this.grantSeasonReward(pr);
        }
      }
      store(META_KEY, JSON.stringify(m));
      tlog.log('season_claim', { tier });
      sfx.star?.(3);
      this.openSeason();
    }, 0.8);
    if (!rec.premium)
      this.button(c, W / 2 - 150, top + 1118, 270, 'PREMIUM $4.99', 0x8e58c9, () => {
        rec.premium = true;
        store(META_KEY, JSON.stringify(m));
        tlog.log('season_premium_mock', { id: rec.id });
        this.showToast('PREMIUM UNLOCKED (TEST)');
        this.openSeason();
      }, 0.7);
    this.button(c, rec.premium ? W / 2 : W / 2 + 150, top + 1118, 220, 'BACK', 0x8a6a4a, () => this.openTitle('road'), 0.7);
  }

  /** r40 ENDLESS ROAD: opens when Level 80 is cleared. */
  endlessOpen() {
    return (this.meta.levelStars?.[String(ENDLESS_UNLOCK)] ?? 0) > 0;
  }

  endlessRec() {
    return (this.meta.endless ??= { floor: 1, best: 0 });
  }

  startEndless() {
    const rec = this.endlessRec();
    const def = endlessDef(rec.floor);
    tlog.log('endless_start', { floor: rec.floor, template: def.level });
    this.startState(newLevel(def, { toys: this.activeToys(), shooter: this.teamShooter(), relays: this.teamRelays() }));
    this.s.endless = rec.floor;
    const pos = endlessPos(rec.floor);
    this.time.delayedCall(700, () => this.showEvent(`ENDLESS ROAD  \u00b7  FLOOR ${rec.floor}${pos === 10 ? '  \u00b7  BOSS' : pos === 5 ? '  \u00b7  MINI-BOSS' : ''}`, '#d9c2ff', 1800));
  }

  openEndlessResult(won: boolean) {
    const m = this.meta;
    const rec = this.endlessRec();
    const floor = this.s.endless!;
    const lines: string[] = [];
    if (won) {
      const first = floor > rec.best;
      const rw = endlessReward(floor, first);
      m.bolts = (m.bolts ?? 0) + rw.bolts;
      lines.push(`+${rw.bolts} BOLTS${first ? '' : '  (replay)'}`);
      if (rw.crate) {
        this.giveCrate(rw.crate);
        lines.push(`+1 ${rw.crate.toUpperCase()} CRATE`);
      }
      rec.best = Math.max(rec.best, floor);
      this.seasonEv('levelWin');
      this.seasonEv('endlessFloor');
      if (this.s.stats.biggestChain >= 8) this.seasonEv('chain8');
      rec.floor = floor + 1;
      const toBlock = 10 - endlessPos(rec.floor) + 1;
      lines.push(endlessPos(rec.floor) === 10 ? 'Next: a BOSS floor!' : endlessPos(rec.floor) === 5 ? 'Next: a MINI-BOSS floor!' : `${toBlock} floor${toBlock > 1 ? 's' : ''} to the next boss`);
    }
    store(META_KEY, JSON.stringify(m));
    tlog.log('endless_end', { floor, won, best: rec.best });
    const c = this.panel(720);
    const top = H / 2 - 360;
    c.add(this.add.text(W / 2, top + 70, won ? `FLOOR ${floor} CLEARED!` : `FLOOR ${floor}`, { fontFamily: 'Lilita One, Arial Black', fontSize: '52px', color: won ? '#8e58c9' : '#3b2533' }).setOrigin(0.5));
    c.add(this.add.text(W / 2, top + 130, `ENDLESS ROAD  \u00b7  best floor ${rec.best}`, { fontFamily: 'Lilita One, Arial Black', fontSize: '26px', color: '#7a5a4a' }).setOrigin(0.5));
    const rx = !won ? this.upgradePrescription() : null;
    const body = won ? lines.join('\n') : `Out of time. Try the floor again${rx ? `\n\n${rx.text}` : ''}`;
    c.add(this.add.text(W / 2, top + 200, body, { fontFamily: 'Lilita One, Arial Black', fontSize: '28px', color: '#5a3a3a', align: 'center', lineSpacing: 8 }).setOrigin(0.5, 0));
    this.button(c, W / 2, top + 540, 460, won ? `NEXT  \u00b7  FLOOR ${rec.floor}` : 'TRY AGAIN', won ? 0x8e58c9 : 0xe8452c, () => this.startEndless(), 1.0);
    this.button(c, W / 2, top + 640, 260, 'ROAD', 0x27a4c0, () => this.openTitle('road'), 0.78);
  }

  /** r38: today's featured trial unit (not owned, or owned below level 3; never a starter). */
  featuredTrial(): Family | null {
    if (this.currentLevel() - 1 < TRIAL_UNLOCK) return null;
    const pool = UNITS.filter((u) => !STARTER_UNITS.includes(u.id) && (this.meta.units?.[u.id]?.level ?? 0) < 3).map((u) => u.id);
    if (!pool.length) return null;
    let h = 7;
    for (const ch of localDate()) h = (Math.imul(h, 31) + ch.charCodeAt(0)) >>> 0;
    return pool[h % pool.length];
  }

  /** The trial record for today (created on first look), or null when no trial is offered. */
  trialToday() {
    const m = this.meta;
    const today = localDate();
    const f = this.featuredTrial();
    if (!f) return null;
    if (!m.trial || m.trial.date !== today) m.trial = { date: today, unit: f, left: TRIAL_BATTLES, on: false };
    return m.trial;
  }

  trialActive(): Family | null {
    const t = this.meta.trial;
    return t && t.date === localDate() && t.on && t.left > 0 ? (t.unit as Family) : null;
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
    this.seen('gems');
    const m = this.meta;
    const PH = 900;
    const c = this.sheet(PH);
    const top = H / 2 - PH / 2;
    this.sheetTitle(c, top, `${m.bolts ?? 0} BOLTS`, 'Earned from levels, new stars and the Daily');
    const lv = this.currentLevel();
    const items: [string, string, string, number, number, 'kits' | 'capsules', string][] = [
      ['booster_jumpstart', 'JUMPSTART KIT', 'Start a level with your 2 bottom\nshooters one rank higher.', PRICES.jumpstart_kit, BOOSTER_UNLOCK.jumpstart_kit, 'kits', 'Pick it on the level card'],
      ['booster_time_capsule', 'TIME CAPSULE', '+15 seconds, once per level,\nwhile the clock is running.', PRICES.time_capsule, BOOSTER_UNLOCK.time_capsule, 'capsules', 'Hold +15s in the bottom lane'],
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
    const c = this.sheet(960);
    const top = H / 2 - 480;
    this.sheetTitle(c, top, 'SETTINGS');
    const m = this.meta;
    const toggles: [string, () => boolean, () => void][] = [
      ['SOUND', () => m.sound, () => ((m.sound = !m.sound), (audioSettings.on = m.sound))],
      ['MUSIC', () => m.music, () => ((m.music = !m.music), (audioSettings.music = m.music))],
      ['SHAKE', () => m.shake !== false, () => (m.shake = m.shake === false)],
      ['SWAP ON DROP', () => !!m.swapMismatch, () => (m.swapMismatch = !m.swapMismatch)],
    ];
    toggles.forEach(([label, get, flip], i) => {
      const b = this.button(c, W / 2, top + 180 + i * 110, 460, `${label}: ${get() ? 'ON' : 'OFF'}`, 0x27a4c0, () => {
        flip();
        store(META_KEY, JSON.stringify(m));
        (b.list[1] as Phaser.GameObjects.Text).setText(`${label}: ${get() ? 'ON' : 'OFF'}`);
      });
    });
    // r43 save backup code
    const pre = safeStorage(readPreimport, () => null);
    if (pre) {
      // a code was loaded: this line becomes the one-time undo
      const un = this.add.text(W / 2, top + 580, 'Loaded the wrong code? Tap to undo', { fontFamily: 'Lilita One, Arial Black', fontSize: '26px', color: '#b06a1a' }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      un.on('pointerup', () => this.confirmImport(pre, true));
      c.add(un);
    } else c.add(this.add.text(W / 2, top + 580, 'SAVE BACKUP  ·  move or keep your progress', { fontFamily: 'Arial', fontStyle: 'bold', fontSize: '22px', color: '#7a5a4a' }).setOrigin(0.5));
    this.button(c, W / 2 - 150, top + 640, 360, 'COPY SAVE CODE', 0x5fbf4a, () => this.copySaveCode(), 0.78);
    this.button(c, W / 2 + 150, top + 640, 360, 'PASTE SAVE CODE', 0x27a4c0, () => this.openPasteCode(), 0.78);
    // the two text links share one row so each gets a finger-sized hit box (they were 52 px apart, one above the other)
    const link = { fontFamily: 'Lilita One, Arial Black', fontSize: '28px', color: '#b06a1a' };
    c.add(this.tapLink(this.add.text(W / 2 - 150, top + 722, 'Playtest stats', link).setOrigin(0.5), () => this.openPlaytestStats()));
    c.add(this.tapLink(this.add.text(W / 2 + 150, top + 722, 'Replay tutorial', link).setOrigin(0.5), () => this.startTutorial()));
    // r33 (Ido: "a reset button to check things from the start, a jump-to button for later levels")
    this.button(c, W / 2, top + 808, 360, 'QA TOOLS', 0xe8452c, () => this.openQaTools(), 0.8);
    this.button(c, W / 2, top + 900, 300, 'BACK', 0x8a6a4a, () => this.openTitle(), 0.85);
  }

  /** r33 QA panel: start over, jump to any level, give units / currency. */
  openQaTools(jump = this.currentLevel()) {
    this.closeModal();
    const c = this.sheet(1270);
    const top = H / 2 - 635;
    this.sheetTitle(c, top, 'QA TOOLS', 'For testing. Not in the real game.');
    const m = this.meta;
    const save = () => store(META_KEY, JSON.stringify(m));
    // 1) start over (second tap within 3 s confirms)
    let armed = 0;
    const wipe = this.button(c, W / 2, top + 185, 520, 'START OVER (WIPE ALL)', 0xd8261a, () => {
      if (this.time.now - armed > 3000) {
        armed = this.time.now;
        sfx.invalid();
        (wipe.list[1] as Phaser.GameObjects.Text).setText('TAP AGAIN TO WIPE');
        this.time.delayedCall(3000, () => wipe.active && this.time.now - armed >= 2900 && (wipe.list[1] as Phaser.GameObjects.Text).setText('START OVER (WIPE ALL)'));
        return;
      }
      tlog.log('start_over');
      store(SAVE_KEY, null);
      store(META_KEY, null);
      lockSaves(); // the reload's visibilitychange -> save() must not write the old game back
      location.reload();
    }, 0.85);
    // 2) jump to level: every earlier level counts as cleared (2 stars), then the level card opens
    c.add(this.add.text(W / 2, top + 280, 'JUMP TO LEVEL', { fontFamily: 'Lilita One, Arial Black', fontSize: '34px', color: '#3b2533' }).setOrigin(0.5));
    const lvT = this.add.text(W / 2, top + 350, `${jump}`, { fontFamily: 'Lilita One, Arial Black', fontSize: '64px', color: '#e8452c' }).setOrigin(0.5);
    c.add(lvT);
    const set = (d: number) => {
      jump = Math.max(1, Math.min(LEVELS.length + 1, jump + d));
      lvT.setText(`${jump}`);
    };
    ([[-10, 110], [-1, 240], [1, W - 240], [10, W - 110]] as const).forEach(([d, x]) => this.button(c, x, top + 350, 110, d > 0 ? `+${d}` : `${d}`, 0x8a6a4a, () => set(d), 0.7));
    this.button(c, W / 2, top + 430, 420, 'GO', 0x5fbf4a, () => {
      const st: Record<string, number> = {};
      for (let n = 1; n < jump; n++) st[String(n)] = Math.max(2, m.levelStars?.[String(n)] ?? 0);
      m.levelStars = st;
      m.tutorialDone = true;
      m.onboarded = true;
      save();
      tlog.log('qa_jump', { level: jump });
      this.openTitle('road');
      if (jump <= LEVELS.length) this.openLevelSheet(jump);
    }, 0.85);
    // 3) give stuff
    this.button(c, W / 2 - 150, top + 530, 360, 'ALL UNITS (LV 5)', 0x8e58c9, () => {
      m.units = m.units ?? {};
      for (const u of UNITS) {
        m.units[u.id] = { level: Math.max(5, m.units[u.id]?.level ?? 0), cards: m.units[u.id]?.cards ?? 0 };
        if (u.slot === 'helper') m.toys[u.id] = m.toys[u.id] ?? false;
      }
      save();
      this.showToast('ALL 13 UNITS AT LEVEL 5');
    }, 0.75);
    // t-2fd7bb86: every staggered feature (Team, Challenge, Workshop, Puzzles, Remix, Gems) open at once
    this.button(c, W / 2 + 150, top + 530, 360, 'UNLOCK ALL', 0x27a4c0, () => {
      unlockAll(m);
      m.hardUnlocked = true;
      save();
      tlog.log('qa_unlock_all');
      this.showToast('ALL FEATURES UNLOCKED');
    }, 0.75);
    this.button(c, W / 2 - 150, top + 620, 360, '+2000 BOLTS +500 GEMS', 0xe0a020, () => {
      m.bolts = (m.bolts ?? 0) + 2000;
      m.gems = (m.gems ?? 0) + 500;
      save();
      this.showToast('+2000 BOLTS  +500 GEMS');
    }, 0.68);
    // t-4208f149 THINK BANK prototype OFF / ON (this device only; applies when the next level starts)
    this.button(c, W / 2 + 150, top + 620, 360, qaThinkBank() ? 'THINK BANK: ON' : 'THINK BANK: OFF', qaThinkBank() ? 0x5fbf4a : 0x8a6a4a, () => {
      store(THINK_BANK_KEY, qaThinkBank() ? null : 'on');
      tlog.log('qa_think_bank', { on: qaThinkBank() });
      this.showToast(qaThinkBank() ? `THINK BANK ON  ·  ${TUNING.tb.grace} s still = clock stops  ·  START A LEVEL` : 'THINK BANK OFF (live game)  ·  NEXT LEVEL');
      this.openQaTools(jump);
    }, 0.68);
    this.button(c, W / 2 - 150, top + 710, 360, '+3 CRATES', 0xb06a1a, () => {
      for (const k of (TUNING.rosterB ? ['wood', 'iron', 'gold', 'bench'] : ['wood', 'iron', 'gold']) as CrateKind[]) this.giveCrate(k);
      save();
      this.showToast('3 CRATES ADDED  ·  UNITS TAB');
    }, 0.75);
    // t-33f4fe2e crate look: OLD crates (live) / TOOLBOX (Tool Bag, Toolbox, Tool Chest), this device only
    this.button(c, W / 2 + 150, top + 710, 360, toolboxOn() ? 'CRATES: TOOLBOX' : 'CRATES: OLD', toolboxOn() ? 0x5fbf4a : 0x8a6a4a, () => {
      store(TOOLBOX_KEY, toolboxOn() ? null : 'toolbox');
      tlog.log('qa_crates', { look: toolboxOn() ? 'toolbox' : 'old' });
      this.openQaTools(jump);
    }, 0.75);
    // 4) t-2c7cbae7 mid-level spam experiment (this device only; applies from the next level started)
    c.add(this.add.text(W / 2, top + 775, 'SPAM TEST (next level)', { fontFamily: 'Lilita One, Arial Black', fontSize: '26px', color: '#3b2533' }).setOrigin(0.5));
    const cur = spamVariant();
    SPAM_VARIANTS.forEach((v, i) => {
      const on = v.id === cur;
      this.button(c, W / 2 + (i - 1.5) * 162, top + 830, 240, on ? `[${v.label}]` : v.label, on ? 0x5fbf4a : 0x8a6a4a, () => {
        store(SPAM_KEY, v.id === 'off' ? null : v.id);
        applySpamVariant(v.id);
        tlog.log('qa_spam_variant', { variant: v.id });
        this.showToast(v.id === 'off' ? 'SPAM TEST OFF (live game)' : `SPAM TEST ${v.label}  ·  START A LEVEL`);
        this.openQaTools(jump);
      }, 0.62);
    });
    // 5) t-1bef1042 PACE prototype (this device only; the stored pace applies when the next level starts)
    c.add(this.add.text(W / 2, top + 895, 'PACE (next level)', { fontFamily: 'Lilita One, Arial Black', fontSize: '26px', color: '#3b2533' }).setOrigin(0.5));
    const curPace = qaPace();
    PACES.forEach((p, i) => {
      const on = p.id === curPace;
      this.button(c, W / 2 + (i - 1) * 210, top + 950, 300, on ? `[${p.label}]` : p.label, on ? 0x5fbf4a : 0x8a6a4a, () => {
        store(PACE_KEY, p.id === DEFAULT_PACE ? null : p.id);
        tlog.log('qa_pace', { pace: p.id });
        this.showToast(p.id === DEFAULT_PACE ? `PACE ${p.label} (live game)  ·  NEXT LEVEL` : `PACE ${p.label}  ·  START A LEVEL`);
        this.openQaTools(jump);
      }, 0.62);
    });
    // 6) t-a8c886ad / t-4a966cee units OFF / B0 / B1 (this device only; applies when the next level starts)
    c.add(this.add.text(W / 2, top + 1015, 'UNITS (next level)', { fontFamily: 'Lilita One, Arial Black', fontSize: '26px', color: '#3b2533' }).setOrigin(0.5));
    const curUnits = qaUnits();
    // t-9b28a794: 4th button NEW4 toggles roster B batch 1 (Nail Gun / Jackhammer / Gear / Saw Blade) at once
    const r1On = qaRoster1();
    this.button(c, W / 2 + 1.5 * 162, top + 1070, 240, r1On ? '[NEW4]' : 'NEW4', r1On ? 0x5fbf4a : 0x8a6a4a, () => {
      store(ROSTER1_KEY, r1On ? null : 'on');
      applyRoster1(!r1On);
      tlog.log('qa_roster_1', { on: !r1On });
      this.showToast(r1On ? 'NEW 4 UNITS OFF (live game)' : 'NEW 4 UNITS ON  ·  CRATES, TEAM, UNITS');
      this.openQaTools(jump);
    }, 0.62);
    UNITS_VARIANTS.forEach((v, i) => {
      const sel = v.id === curUnits;
      this.button(c, W / 2 + (i - 1.5) * 162, top + 1070, 240, sel ? `[${v.label}]` : v.label, sel ? 0x5fbf4a : 0x8a6a4a, () => {
        store(UNITS_B0_KEY, unitsStoreValue(v.id));
        tlog.log('qa_units', { units: v.id });
        this.showToast(v.id === 'off' ? 'UNITS OFF (live game)  ·  NEXT LEVEL' : `UNITS ${v.label}  ·  START A LEVEL`);
        this.openQaTools(jump);
      }, 0.62);
    });
    // 7) t-9adea8b8 SCREW YARD: OLD (today's yard) / OBJECT (the turnable crate), this device only
    c.add(this.add.text(W / 2, top + 1120, 'SCREW YARD', { fontFamily: 'Lilita One, Arial Black', fontSize: '26px', color: '#3b2533' }).setOrigin(0.5));
    const obj = qaYardObject();
    (['old', 'object'] as const).forEach((id, i) => {
      const on = (id === 'object') === obj;
      const label = id.toUpperCase();
      this.button(c, W / 2 + (i - 0.5) * 260, top + 1168, 340, on ? `[${label}]` : label, on ? 0x5fbf4a : 0x8a6a4a, () => {
        store(YARD_MODE_KEY, id === 'old' ? null : id);
        tlog.log('qa_screw_yard', { mode: id });
        this.showToast(id === 'old' ? 'SCREW YARD: OLD (live game)' : 'SCREW YARD: OBJECT  ·  EVENTS > SCREW YARD');
        this.openQaTools(jump);
      }, 0.62);
    });
    // 8) t-1effe0bf MERGE RULE prototype: TODAY / +2 sandwich / +1 BONUS sandwich (this device only; next level)
    // (the 1280-tall small-phone screen has no room left below: BACK moved up beside the title for this row)
    c.add(this.add.text(W / 2, top + 1211, 'MERGE RULE (next level)', { fontFamily: 'Lilita One, Arial Black', fontSize: '24px', color: '#3b2533' }).setOrigin(0.5));
    const curRule = qaMergeRule();
    MERGE_RULES.forEach((r, i) => {
      const on = r.id === curRule;
      this.button(c, W / 2 + (i - 1) * 200, top + 1244, 320, on ? `[${r.label}]` : r.label, on ? 0x5fbf4a : 0x8a6a4a, () => {
        store(MERGE_RULE_KEY, r.id === 'today' ? null : r.id);
        tlog.log('qa_merge_rule', { rule: r.id });
        this.showToast(r.id === 'today' ? 'MERGE RULE TODAY (live game)  ·  NEXT LEVEL' : `MERGE RULE ${r.label}  ·  START A LEVEL`);
        this.openQaTools(jump);
      }, 0.55);
    });
    this.button(c, W - 150, top + 64, 220, 'BACK', 0x8a6a4a, () => this.openTitle(), 0.6);
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
      const boss = !mini && n % 10 === 0 ? BOSSES[chapterBossIdx(n)] : undefined;
      const b = mini ?? boss;
      const cv = !b ? this.castOf(n) : undefined;
      const key = b ? `boss_${b.id}` : cv ? `cast_${cv}` : `mon_${d.monster}`;
      const beatenHere = cleared(n);
      if (seen.has(key)) {
        const prev = out.find((e) => e.id === key);
        if (beatenHere && prev) prev.beaten = true;
        continue;
      }
      seen.add(key);
      const ti = MONSTER_INDEX[d.monster] ?? 0;
      out.push({ id: key, tab: mini ? 1 : boss ? 2 : 0, key: b ? `boss_${b.id}_intact` : cv ? `mon_${cv}` : `target_${ti}`, name: b ? b.name : cv ? CAST[cv].name : TARGET_NAMES[ti], level: n, beaten: beatenHere });
    }
    return out;
  }

  /** r35: a trophy figurine (ChatGPT art `trophy_<id>` when present, else the boss art), feet at y. */
  trophyImage(id: string, x: number, y: number, size: number, locked = false) {
    const key = this.hasArt(`trophy_${id}`) ? `trophy_${id}` : `boss_${id}_intact`;
    if (!this.textures.exists(key)) return null;
    const im = this.add.image(x, y, key).setOrigin(0.5, 1);
    im.setScale(size / Math.max(im.width, im.height));
    if (locked) im.setTintFill(0x2b1d2e).setAlpha(0.45);
    return im;
  }

  /** r35 trophy drawer: all 16 bosses and mini-bosses; won ones toggle on / off the shelf (max 4). Collection only. */
  openTrophies() {
    this.closeModal();
    const m = this.meta;
    const PH = 1120;
    const c = this.sheet(PH);
    const top = H / 2 - PH / 2;
    this.sheetTitle(c, top, `TROPHIES  \u00b7  ON SHELF ${(m.trophies ?? []).length}/${TROPHY_SHELF}`, `Master a boss ${TROPHY_AT} times in Bounties to win it.\nTap a trophy to put it on / take it off the shelf.`);
    const shelf = m.trophies ?? [];
    const cell = 150;
    BOSSES.forEach((b, i) => {
      const x = W / 2 + ((i % 4) - 1.5) * cell, y = top + 300 + Math.floor(i / 4) * 186;
      const mst = m.bossMastery?.[b.id] ?? 0;
      const won = mst >= TROPHY_AT;
      const on = shelf.includes(b.id);
      const g = this.add.graphics().fillStyle(on ? 0x5fbf4a : 0x2b1d2e, on ? 0.35 : 0.1).fillRoundedRect(x - 68, y - 76, 136, 166, 18);
      if (on) g.lineStyle(5, 0x3a9a2a, 1).strokeRoundedRect(x - 68, y - 76, 136, 166, 18);
      c.add(g);
      const im = this.trophyImage(b.id, x, y + 50, 112, !won);
      if (im) c.add(im);
      // three-segment mastery strip (gold = earned), a check badge when on the shelf
      const strip = this.add.graphics();
      for (let k = 0; k < TROPHY_AT; k++) strip.fillStyle(k < mst ? 0xe0a020 : 0x2b1d2e, k < mst ? 1 : 0.25).fillRoundedRect(x - 54 + k * 37, y + 64, 33, 12, 5);
      c.add(strip);
      if (on) c.add(this.add.graphics().fillStyle(0x2b1d2e, 1).fillCircle(x + 50, y - 58, 17).fillStyle(0x5fbf4a, 1).fillCircle(x + 50, y - 58, 14).lineStyle(4, 0xffffff, 1).lineBetween(x + 43, y - 58, x + 48, y - 52).lineBetween(x + 48, y - 52, x + 58, y - 64));
      const z = this.add.zone(x, y, 136, 166).setInteractive({ useHandCursor: true });
      z.on('pointerup', () => {
        sfx.click();
        if (!won) return this.showToast(`${b.name}: MASTERY ${mst}/${TROPHY_AT} (BOUNTIES)`);
        if (on) m.trophies = shelf.filter((t) => t !== b.id);
        else if (shelf.length >= TROPHY_SHELF) return this.showToast('SHELF FULL: TAP ONE TO TAKE IT DOWN');
        else m.trophies = [...shelf, b.id];
        store(META_KEY, JSON.stringify(m));
        this.openTrophies();
      });
      c.add(z);
    });
    this.button(c, W / 2, top + PH - 80, 280, 'CLOSE', 0x8a6a4a, () => this.openTitle('machine'), 0.8);
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
      const mst = this.meta.bossMastery?.[e.id.replace(/^boss_/, '')] ?? 0;
      if (mst) c.add(this.add.text(x - 70, y - 100, `★${mst}`, { fontFamily: 'Lilita One, Arial Black', fontSize: '22px', color: '#e0a020', stroke: '#2b1d2e', strokeThickness: 5 }).setOrigin(0.5));
      if (this.meta.rush?.stamps?.[e.id.replace(/^boss_/, '')]) c.add(this.add.text(x + 62, y - 100, 'RUSH', { fontFamily: 'Lilita One, Arial Black', fontSize: '18px', color: '#2b1d2e', backgroundColor: '#ffcf33', padding: { x: 6, y: 2 } }).setOrigin(0.5).setAngle(12));
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

  // ================= r32 UNIT COLLECTION =================
  ownsUnit(f: string) {
    return (this.meta.units?.[f]?.level ?? 0) >= 1;
  }
  totalCrates() {
    return Object.values(this.meta.crates ?? {}).reduce((a, b) => a + (b ?? 0), 0);
  }
  canUpgrade(u: UnitDef) {
    const st = this.meta.units?.[u.id];
    return !!st && st.level < MAX_UNIT_LEVEL && cardsAvailable(this.meta, u.id) >= cardsFor(u, st.level) && (this.meta.bolts ?? 0) >= boltsFor(u, st.level);
  }
  unitsReady() {
    return UNITS.some((u) => this.canUpgrade(u));
  }
  giveCrate(kind: CrateKind, n = 1) {
    const m = this.meta;
    m.crates = { ...(m.crates ?? {}), [kind]: (m.crates?.[kind] ?? 0) + n };
    store(META_KEY, JSON.stringify(m));
    tlog.log('crate_grant', { kind, n });
  }

  openUnitsTab() {
    this.closeModal();
    const c = this.add.container(0, 0).setDepth(100);
    if (this.homeC?.active) this.homeC.destroy();
    this.homeC = c;
    this.modal = c;
    const bg = this.add.image(W / 2, 0, this.hasArt('road_bg') ? 'road_bg' : 'hero_bg').setOrigin(0.5, 0);
    bg.setScale(Math.max(W / bg.width, H / bg.height));
    c.add([bg, this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.001).setInteractive()]);
    this.drawWallet(c);
    c.add(this.add.text(W / 2, 160, unitsTitle(this.meta.units, UNITS), { fontFamily: 'Lilita One, Arial Black', fontSize: '52px', color: '#3b2533', stroke: '#fff0cf', strokeThickness: 4 }).setOrigin(0.5));
    // crates + shop row
    const crates = this.totalCrates();
    this.button(c, W / 2 - 150, 232, 260, crates ? `OPEN CRATE (${crates})` : 'NO CRATES', crates ? 0x5fbf4a : 0x81736c, () => (crates ? this.openNextCrate() : this.showToast('WIN BOSSES, BOUNTIES AND CHESTS FOR CRATES')), 0.7);
    this.button(c, W / 2 + 150, 232, 260, 'SHOP', 0x8e58c9, () => this.openUnitShop(), 0.7);
    this.collectionStrip(c, 304);
    // owned units: 4 columns of slightly smaller cards
    // t-2fd7bb86: units you don't own yet are a row of small locked silhouettes, not 13 full cards on day 1
    const owned = UNITS.filter((u) => this.ownsUnit(u.id));
    const locked = UNITS.filter((u) => !this.ownsUnit(u.id));
    // UI audit (375x667): the last row hid under the bottom nav, so the
    // rows fit between the collection strip and the nav (cards shrink a little on short phones)
    const rows = Math.ceil(owned.length / 4), gridTop = 342;
    const pitch = Math.min(232, (H - 122 - gridTop) / rows), k0 = Math.min(0.8, (pitch - 12) / 274);
    owned.forEach((u, k) => {
      const x = W / 2 + ((k % 4) - 1.5) * 172, y = gridTop + (Math.floor(k / 4) + 0.5) * pitch;
      c.add(this.unitCard(u, x, y).setScale(k0));
    });
    if (locked.length) {
      // F8: the label sits under the last card row (card art is 274 tall at scale k0), not across its bottom edge
      const ly = gridTop + (rows - 0.5) * pitch + 137 * k0 + 24;
      c.add(this.add.text(W / 2, ly, `LOCKED (${locked.length})  ·  find them in crates`, { fontFamily: 'Lilita One, Arial Black', fontSize: '24px', color: '#3b2533', stroke: '#fff0cf', strokeThickness: 4 }).setOrigin(0.5));
      const per = 7, step = 92;
      locked.forEach((u, k) => {
        const row = Math.floor(k / per), inRow = Math.min(per, locked.length - row * per);
        const x = W / 2 + ((k % per) - (inRow - 1) / 2) * step, y = ly + 66 + row * 96;
        const t = this.add.container(x, y);
        t.add(this.add.graphics().fillStyle(0x2b1d2e, 0.85).fillRoundedRect(-42, -42, 84, 84, 16));
        const art = this.unitPortrait(u.id);
        if (this.textures.exists(art)) t.add(this.fitVisible(this.add.image(0, 0, art), 66).setTintFill(0x8a7a8a).setAlpha(0.5));
        t.add(this.add.text(0, 0, '\u{1F512}', { fontSize: '28px' }).setOrigin(0.5));
        t.setSize(84, 84).setInteractive({ useHandCursor: true });
        t.on('pointerup', () => (sfx.click(), this.openUnitDetail(u)));
        c.add(t);
      });
    }
    this.drawNav(c, 'units');
  }

  /** r38 collection milestones: the next goal, progress and reward; CLAIM when reached. */
  collectionProgress() {
    const units = Object.values(this.meta.units ?? {}).filter((v) => v.level >= 1);
    return { own: units.length, levels: units.reduce((a, v) => a + v.level, 0) };
  }

  collectionStrip(c: Phaser.GameObjects.Container, y: number) {
    const m = this.meta;
    const i = m.collClaimed ?? 0;
    const goal = COLLECTION_GOALS[i];
    const g = this.add.graphics().fillStyle(0x2b1d2e, 0.88).fillRoundedRect(40, y - 30, W - 80, 60, 20);
    c.add(g);
    if (!goal) {
      c.add(this.add.text(W / 2, y, 'COLLECTION COMPLETE  \u2605', { fontFamily: 'Lilita One, Arial Black', fontSize: '26px', color: '#ffcf33' }).setOrigin(0.5));
      return;
    }
    const p = this.collectionProgress();
    const have = goal.kind === 'own' ? p.own : p.levels;
    const done = have >= goal.n;
    const r = goal.reward;
    const prize = r.crate ? `${r.crate.toUpperCase()} CRATE` : r.gems ? `${r.gems} GEMS` : `${r.bolts} BOLTS`;
    const what = goal.kind === 'own' ? 'UNITS OWNED' : 'TOTAL UNIT LEVELS';
    // progress fill under the text
    g.fillStyle(0x5fbf4a, 0.45).fillRoundedRect(44, y - 26, (W - 88) * Math.min(1, have / goal.n), 52, 17);
    c.add(this.add.text(64, y, `${Math.min(have, goal.n)}/${goal.n} ${what}  \u00b7  ${prize}`, { fontFamily: 'Lilita One, Arial Black', fontSize: '22px', color: '#fff0cf' }).setOrigin(0, 0.5));
    if (done)
      this.button(c, W - 120, y, 150, 'CLAIM', 0x5fbf4a, () => {
        m.collClaimed = i + 1;
        if (r.bolts) m.bolts = (m.bolts ?? 0) + r.bolts;
        if (r.gems) m.gems = (m.gems ?? 0) + r.gems;
        if (r.crate) this.giveCrate(r.crate);
        store(META_KEY, JSON.stringify(m));
        tlog.log('collection_claim', { i, prize });
        sfx.star?.(3);
        this.showToast(`COLLECTION: +${prize}`);
        this.openUnitsTab();
      }, 0.55);
  }

  /** r39 (ChatGPT art review): ONE canonical portrait per unit everywhere (collection, crate reveal): the rank tier
   *  that matches its level (unowned = rank 3 silhouette). */
  unitPortrait(id: string) {
    const st = this.meta.units?.[id];
    return `${id}_${st && st.level >= 1 ? Math.min(6, 1 + Math.floor((st.level - 1) / 2)) : 3}`;
  }

  unitCard(u: UnitDef, x: number, y: number) {
    const st = this.meta.units?.[u.id];
    const owned = !!st && st.level >= 1;
    const cc = this.add.container(x, y);
    const rc = RARITY_COLOR[u.rarity];
    cc.add(this.add.graphics().fillStyle(0x2b1d2e, 1).fillRoundedRect(-102, -132, 204, 268, 22).fillStyle(rc, 1).fillRoundedRect(-98, -128, 196, 260, 19).fillStyle(0xfbe7c6, 1).fillRoundedRect(-90, -100, 180, 170, 14));
    cc.add(this.add.text(0, -114, u.rarity.toUpperCase(), { fontFamily: 'Lilita One, Arial Black', fontSize: '16px', color: '#ffffff' }).setOrigin(0.5));
    const art = this.unitPortrait(u.id);
    if (this.textures.exists(art)) {
      const im = this.fitVisible(this.add.image(0, -16, art), 140);
      if (!owned) im.setTint(0x2b1d2e).setAlpha(0.6);
      cc.add(im);
    }
    addUnitJob(this, cc, u.id, 0, 58);
    // r38 rarity frame art (ChatGPT v22, transparent centre) over the card edge
    if (this.hasArt(`card_${u.rarity}`)) cc.add(this.add.image(0, 2, `card_${u.rarity}`).setDisplaySize(214, 274));
    cc.add(this.add.text(0, 88, owned ? FAMILY_INFO[u.id as 'cannon'].name.toUpperCase().replace('SIGNAL ', '') : '???', { fontFamily: 'Lilita One, Arial Black', fontSize: '24px', color: '#ffffff', stroke: '#2b1d2e', strokeThickness: 5 }).setOrigin(0.5));
    if (owned) {
      cc.add(this.add.text(-78, -72, `LV ${st!.level}`, { fontFamily: 'Lilita One, Arial Black', fontSize: '22px', color: '#ffffff', backgroundColor: '#2b1d2e', padding: { x: 6, y: 2 } }).setOrigin(0, 0.5));
      const need = st!.level >= MAX_UNIT_LEVEL ? 0 : cardsFor(u, st!.level);
      const have = cardsAvailable(this.meta, u.id);
      const frac = need ? Math.min(1, have / need) : 1;
      const bar = this.add.graphics().fillStyle(0x2b1d2e, 1).fillRoundedRect(-84, 108, 168, 20, 10).fillStyle(this.canUpgrade(u) ? 0x5fbf4a : 0x3a8adf, 1).fillRoundedRect(-82, 110, Math.max(14, 164 * frac), 16, 8);
      cc.add(bar);
      cc.add(this.add.text(0, 118, need ? `${have}/${need}` : 'MAX', { fontFamily: 'Lilita One, Arial Black', fontSize: '16px', color: '#ffffff', stroke: '#2b1d2e', strokeThickness: 4 }).setOrigin(0.5));
      if (this.canUpgrade(u)) {
        const up = this.add.text(70, -112, '\u2191', { fontFamily: 'Arial Black', fontSize: '30px', color: '#ffffff', backgroundColor: '#5fbf4a', padding: { x: 8, y: 0 } }).setOrigin(0.5);
        cc.add(up);
        this.tweens.add({ targets: up, y: -118, duration: 500, yoyo: true, repeat: -1 });
      }
    } else {
      // UI audit: the loose Arial caption spilled past the frame onto '???'; it now sits in the same pill as the owned card's bar
      cc.add(this.add.graphics().fillStyle(0x2b1d2e, 1).fillRoundedRect(-84, 108, 168, 20, 10));
      cc.add(this.add.text(0, 118, 'IN CRATES', { fontFamily: 'Lilita One, Arial Black', fontSize: '16px', color: '#ffffff' }).setOrigin(0.5));
    }
    cc.setSize(204, 268).setInteractive({ useHandCursor: true });
    cc.on('pointerup', () => (sfx.click(), this.openUnitDetail(u)));
    return cc;
  }

  openUnitDetail(u: UnitDef) {
    const st = this.meta.units?.[u.id];
    const owned = !!st && st.level >= 1;
    this.closeModal();
    const c = this.panel(1180);
    const top = H / 2 - 590;
    const info = FAMILY_INFO[u.id as 'cannon'];
    c.add(this.add.text(W / 2, top + 60, owned ? info.name.toUpperCase() : '???', { fontFamily: 'Lilita One, Arial Black', fontSize: '52px', color: '#2a2233' }).setOrigin(0.5));
    c.add(this.add.text(W / 2, top + 112, `${u.rarity.toUpperCase()}  \u00b7  ${u.role}  \u00b7  JOB: ${unitJob(u.id)?.job ?? '?'}${owned ? `  \u00b7  LEVEL ${st!.level}` : ''}`, { fontFamily: 'Lilita One, Arial Black', fontSize: '24px', color: '#7a5a4a' }).setOrigin(0.5));
    addMergedLine(this, c, u.id, st?.level ?? 1, W / 2, top + 140, W - 120);
    // the animated mini-board explains it
    const gi = GameScene.GUIDE.find((g) => g.key === u.id) ?? ROSTER_1_GUIDE[u.id];
    // roster B: the job shape icon + job word beside the name
    const rb = ROSTER_1_INFO[u.id as keyof typeof ROSTER_1_INFO];
    if (owned && rb && this.textures.exists(`job_${u.id}`)) c.add([this.add.image(W / 2 + 290, top + 60, `job_${u.id}`).setScale(0.9), this.add.text(W / 2 + 290, top + 102, rb.job, { fontFamily: 'Lilita One, Arial Black', fontSize: '20px', color: '#7a5a4a' }).setOrigin(0.5)]);
    if (owned && gi) {
      this.machineDemo(c, W / 2, top + 392, u.id); // +62: room for the WHEN MERGED line above the demo monster
      c.add(this.add.text(W / 2, top + 574, gi.text, { fontFamily: 'Arial', fontStyle: 'bold', fontSize: '24px', color: '#3b2533', align: 'center', wordWrap: { width: W - 160 }, lineSpacing: 4 }).setOrigin(0.5, 0));
    } else {
      // UI audit: the locked page was an empty cream sheet; show the same dark silhouette as the collection card
      const art = this.unitPortrait(u.id);
      if (this.textures.exists(art)) c.add(this.fitVisible(this.add.image(W / 2, top + 340, art), 220).setTint(0x2b1d2e).setAlpha(0.6));
      c.add(this.add.text(W / 2, top + 540, 'Find this unit in a crate\nto unlock it.', { fontFamily: 'Lilita One, Arial Black', fontSize: '34px', color: '#7a5a4a', align: 'center' }).setOrigin(0.5));
    }
    // r32 milestone perks: L3 / L6 / L9, lit when reached (unreached lines darker brown: light grey on cream was unreadable)
    (UNIT_PERKS[u.id] ?? []).forEach(([name, txt], i) => {
      const need = [3, 6, 9][i];
      const got = owned && st!.level >= need;
      c.add(this.add.text(W / 2, top + 704 + i * 42, `LV${need}  ${name}: ${txt}`, { fontFamily: 'Lilita One, Arial Black', fontSize: '22px', color: got ? '#2a8a3a' : '#6e5646', wordWrap: { width: W - 140 }, align: 'center' }).setOrigin(0.5));
    });
    if (owned) {
      const lv = st!.level;
      c.add(this.add.text(W / 2, top + 832, lv >= MAX_UNIT_LEVEL ? `${levelPerkText(u, lv)}  \u00b7  MAX LEVEL` : `${levelPerkText(u, lv)}  \u2192  ${levelPerkText(u, lv + 1)} at LV ${lv + 1}`, { fontFamily: 'Lilita One, Arial Black', fontSize: '28px', color: '#2a8a3a' }).setOrigin(0.5));
      if (lv < MAX_UNIT_LEVEL) {
        const needC = cardsFor(u, lv), needB = boltsFor(u, lv);
        const ok = this.canUpgrade(u);
        const spare = TUNING.rosterB ? spareOf(this.meta, u.rarity) : 0;
        c.add(this.add.text(W / 2, top + 886, `${st!.cards}/${needC} cards${spare ? ` + ${spare} spare ${u.rarity} parts` : ''}  \u00b7  ${needB} Bolts`, { fontFamily: 'Lilita One, Arial Black', fontSize: '26px', color: ok ? '#3b2533' : '#9a7a6a' }).setOrigin(0.5));
        this.button(c, W / 2, top + 974, 420, ok ? `UPGRADE TO LV ${lv + 1}` : cardsAvailable(this.meta, u.id) < needC ? 'NEED MORE CARDS' : 'NEED MORE BOLTS', ok ? 0x5fbf4a : 0x8a6a4a, () => (ok ? this.upgradeUnit(u) : this.showToast(cardsAvailable(this.meta, u.id) < needC ? 'OPEN CRATES FOR CARDS' : 'WIN LEVELS FOR BOLTS')), 0.9);
      }
    }
    // r42 Unit Drills (Ido: "challenges connected to a unit when we unlock it")
    const drills = GameScene.PUZZLES.drills[u.id] ?? [];
    if (this.ownsUnit(u.id) && drills.length) {
      const done = drills.filter((p) => this.puzzleRec().drills.includes(p.id)).length;
      this.button(c, W / 2 - 150, top + 1100, 260, `DRILLS ${done}/${drills.length}`, 0x8e58c9, () => this.openDrills(u), 0.8);
      this.button(c, W / 2 + 150, top + 1100, 240, 'BACK', 0x8a6a4a, () => this.openTitle('units'), 0.8);
    } else this.button(c, W / 2, top + 1100, 280, 'BACK', 0x8a6a4a, () => this.openTitle('units'), 0.8);
    tlog.log('unit_detail', { unit: u.id, owned });
  }

  upgradeUnit(u: UnitDef) {
    const m = this.meta;
    const st = m.units![u.id];
    const needC = cardsFor(u, st.level), needB = boltsFor(u, st.level);
    if (cardsAvailable(m, u.id) < needC || (m.bolts ?? 0) < needB) return;
    spendCards(m, u.id, needC); // own cards first, then (ROSTER B) Spare Parts of its rarity
    m.bolts = (m.bolts ?? 0) - needB;
    st.level++;
    sweepSpare(m, u.id); // reaching level 10: the cards left over become Spare Parts
    this.seasonEv('unitUp');
    store(META_KEY, JSON.stringify(m));
    tlog.log('unit_upgrade', { unit: u.id, level: st.level, bolts: needB, cards: needC });
    sfx.win();
    this.openUnitDetail(u);
    this.floatText(W / 2, H / 2 - 300, `LEVEL ${st.level}!`, '#ffcf33', 64, 600, 'banner_destroyed');
  }

  openNextCrate() {
    const m = this.meta;
    const kind = (['bench', 'gold', 'iron', 'wood'] as CrateKind[]).find((k) => (m.crates?.[k] ?? 0) > 0);
    if (!kind) return;
    m.crates![kind] = (m.crates![kind] ?? 1) - 1;
    this.openCrate(kind);
  }

  /** Roll, apply and present a crate: shake, burst, then each card flips in; NEW units unlock on the spot. */
  openCrate(kind: CrateKind) {
    const m = this.meta;
    if (kind === 'iron' && !m.unitChoiceDone && UNITS.some((u) => u.rarity === 'rare' && !this.ownsUnit(u.id))) {
      m.unitChoiceDone = true;
      return this.openUnitChoice(() => this.openCrate(kind));
    }
    m.crateSeq = (m.crateSeq ?? 0) + 1;
    const owned = new Set(Object.entries(m.units ?? {}).filter(([, v]) => v.level >= 1).map(([k]) => k as Family));
    m.pity = m.pity ?? { epic: 0, dry: 0 };
    // r32 early guarantees (ChatGPT): a Gold crate brings an Epic while the player owns none (ROSTER B: the Tool Chest always does)
    if (!TUNING.rosterB && kind === 'gold' && !UNITS.some((u) => u.rarity === 'epic' && owned.has(u.id))) m.pity.epic = Math.max(m.pity.epic, 6);
    const seed = (Date.now() ^ (m.crateSeq * 2654435761)) >>> 0;
    // ROSTER B: a Tool Bag makes its ONE latch roll first; the crate that opens is `opened` and its own odds / pity apply
    let opened = kind, latchedFrom: CrateKind | undefined;
    let cards: CrateCard[];
    if (TUNING.rosterB) {
      const r = openCrateB(kind, owned, seed, m.pity);
      opened = r.opened;
      cards = r.cards;
      if (r.latched) latchedFrom = kind;
    } else cards = rollCrate(kind, owned, seed, m.pity);
    // ...and the first Wood crate always shows that crates unlock playable units: Horn
    if (opened === 'wood' && !owned.has('horn')) {
      const first = cards[cards.length - 1];
      if (first.count > 1) first.count--;
      else cards = cards.slice(0, -1);
      cards = [{ unit: 'horn', count: 1, isNew: true }, ...cards];
    }
    this.applyCards(cards);
    tlog.log('crate_open', { kind, opened, cards: cards.map((x) => `${x.unit}x${x.count}${x.isNew ? '*' : ''}`), pity: { ...m.pity } });
    this.presentCrate(opened, cards, undefined, latchedFrom);
  }

  applyCards(cards: CrateCard[]) {
    const m = this.meta;
    m.units = m.units ?? {};
    // r42: a newly unlocked unit opens its drills
    const fresh = cards.filter((cd) => cd.isNew && (GameScene.PUZZLES.drills[cd.unit] ?? []).length && !this.ownsUnit(cd.unit));
    if (fresh.length) this.time.delayedCall(2600, () => this.showToast(`NEW DRILLS: ${fresh.map((cd) => FAMILY_INFO[cd.unit as 'cannon'].name.toUpperCase()).join(', ')} (UNIT PAGE)`));
    for (const cd of cards) {
      const st = (m.units[cd.unit] = m.units[cd.unit] ?? { level: 0, cards: 0 });
      if (st.level === 0) {
        st.level = 1;
        st.cards += cd.count - 1;
        if (unitDef(cd.unit)?.slot === 'helper') m.toys[cd.unit] = m.toys[cd.unit] ?? false;
      } else st.cards += cd.count;
    }
    const spare = cards.reduce((n, cd) => n + sweepSpare(m, cd.unit), 0); // ROSTER B: duplicates past level 10
    if (spare) this.time.delayedCall(1200, () => this.showToast(`+${spare} SPARE PARTS  \u00b7  WILD CARDS FOR THEIR RARITY`));
    store(META_KEY, JSON.stringify(m));
    this.checkUnlocks(); // the first new unit opens TEAM
  }

  openPack(packId: string, role?: UnitDef['slot']) {
    const m = this.meta;
    const spec = SHOP.boltPacks.find((p) => p.id === packId)!;
    if ((m.bolts ?? 0) < spec.bolts) return this.showToast('NOT ENOUGH BOLTS');
    m.bolts = (m.bolts ?? 0) - spec.bolts;
    m.crateSeq = (m.crateSeq ?? 0) + 1;
    const owned = new Set(Object.entries(m.units ?? {}).filter(([, v]) => v.level >= 1).map(([k]) => k as Family));
    const cards = rollPack(packId, owned, (Date.now() ^ (m.crateSeq * 2654435761)) >>> 0, { role, featured: featuredUnit(localDate(), owned) });
    this.applyCards(cards);
    tlog.log('pack_open', { packId, role, cards: cards.map((x) => `${x.unit}x${x.count}`) });
    this.presentCrate('wood', cards, spec.name);
  }

  /** `from` = the Tool Bag whose latch rolled up into `kind` (ROSTER B): it shows as the bag first, then pops into `kind`. */
  presentCrate(kind: CrateKind, cards: CrateCard[], title?: string, from?: CrateKind) {
    this.closeModal();
    const c = this.panel(1000);
    const top = H / 2 - 500;
    const shown = from ?? kind; // the crate on screen until the latch pops
    const titleTxt = this.add.text(W / 2, top + 60, title ?? crateName(shown), { fontFamily: 'Lilita One, Arial Black', fontSize: '50px', color: '#3b2533' }).setOrigin(0.5);
    c.add(titleTxt);
    // ROSTER B: the latch chances are on screen before the bag opens (the roll itself was made before this screen)
    if (TUNING.rosterB && !title && shown === 'wood') c.add(this.add.text(W / 2, top + 112, `LATCH ROLL  \u00b7  Toolbox+ ${pctB(LATCH_B.iron)}  \u00b7  Chest+ ${pctB(LATCH_B.gold)}  \u00b7  Workbench ${pctB(LATCH_B.bench)}`, { fontFamily: 'Lilita One, Arial Black', fontSize: '21px', color: '#7a5a4a' }).setOrigin(0.5));
    if (!title) addOddsButton(this, c, W - 100, top + 60, () => showOddsPanel(this, W, H, pityView(this.meta), kind));
    const col = { wood: 0xa0703a, iron: 0x7a8a9a, gold: 0xe0b040, bench: 0xf0b020 }[shown];
    const box = this.add.container(W / 2, top + 260);
    // r38 crate art (ChatGPT v22): closed crate shakes, swaps to its open art, then the cards fly out.
    // No closed gold crate yet: the iron crate tinted gold stands in.
    this.seasonEv('crateOpen');
    const tbx = toolboxOn(); // t-33f4fe2e QA: baked procedural toolbox crates
    const ck = tbx ? toolboxCrateKey(this, shown) : this.hasArt(`crate_${shown}`) ? `crate_${shown}` : shown === 'gold' && this.hasArt('crate_iron') ? 'crate_iron' : '';
    let crateIm: Phaser.GameObjects.Image | null = null;
    if (ck) {
      const im = this.add.image(0, 0, ck);
      im.setScale(220 / Math.max(im.width, im.height));
      if (ck === 'crate_iron' && shown === 'gold') im.setTint(0xffd36a);
      box.add(im);
      crateIm = im;
    } else box.add(this.add.graphics().fillStyle(0x2b1d2e, 1).fillRoundedRect(-110, -90, 220, 180, 20).fillStyle(col, 1).fillRoundedRect(-102, -82, 204, 164, 16).lineStyle(8, 0x2b1d2e, 1).lineBetween(-102, -20, 102, -20));
    c.add(box);
    const extra = from ? (crateIm && tbx ? 900 : 700) : 0; // the latch roll-up plays before the cards
    sfx.chestShake?.();
    this.tweens.add({ targets: box, angle: { from: -6, to: 6 }, duration: 90, yoyo: true, repeat: 5, onComplete: () => {
      sfx.chestOpen?.();
      const openKey = `crate_${shown}_open`;
      if (from) {
        // the latch pops, the bag becomes the bigger crate (decided before this screen), then it opens
        if (crateIm && tbx) latchRollUp(this, box, crateIm, from, kind);
        this.time.delayedCall(420, () => {
          titleTxt.setText(crateName(kind));
          sfx.star?.(2);
          this.ring(W / 2, top + 260, col, 220, 24, 520);
          this.floatText(W / 2, top + 150, `LATCH POPPED!  ${crateName(kind)}`, '#ffcf33', 38, 900);
        });
      } else if (crateIm && tbx) popToolboxLatch(this, box, crateIm, kind);
      else if (crateIm && this.hasArt(openKey)) {
        crateIm.clearTint().setTexture(openKey);
        crateIm.setScale(240 / Math.max(crateIm.width, crateIm.height));
      }
      this.tweens.add({ targets: box, scale: 0, alpha: 0, duration: 220, delay: (crateIm ? 260 : 0) + extra });
      this.ring(W / 2, top + 260, 0xffcf33, 160, 18, 420);
      cards.forEach((cd, k) => {
        // up to 6 kinds in 3 columns; more (big crates/packs) in 4 smaller columns so nothing hides under the buttons
        const cols = cards.length > 6 ? 4 : 3, sc = cards.length > 6 ? 0.78 : 1;
        // r39: a short last row is centred under the full rows
        const rowN = Math.floor(k / cols), inRow = Math.min(cols, cards.length - rowN * cols);
        const x = W / 2 + ((k % cols) - (inRow - 1) / 2) * (cols === 4 ? 152 : 200), y = top + (cols === 4 ? 220 : 250) + rowN * (cols === 4 ? 190 : 250);
        const card = this.add.container(x, y).setScale(0, sc);
        const u = UNITS.find((v) => v.id === cd.unit)!;
        const rc = RARITY_COLOR[u.rarity];
        card.add(this.add.graphics().fillStyle(0x2b1d2e, 1).fillRoundedRect(-88, -110, 176, 220, 18).fillStyle(rc, 1).fillRoundedRect(-84, -106, 168, 212, 15).fillStyle(0xfbe7c6, 1).fillRoundedRect(-76, -80, 152, 130, 12));
        const pk = this.unitPortrait(cd.unit);
        if (this.textures.exists(pk)) card.add(this.fitVisible(this.add.image(0, -16, pk), 112));
        addUnitJob(this, card, cd.unit, 0, 38);
        card.setSize(176, 220).setInteractive({ useHandCursor: true }).on('pointerup', () => showUnitJobPopup(this, W, H, cd.unit, FAMILY_INFO[cd.unit as 'cannon'].name.toUpperCase(), this.meta.units?.[cd.unit]?.level ?? 1));
        card.add(this.add.text(0, 72, `${FAMILY_INFO[cd.unit as 'cannon'].name.toUpperCase()} x${cd.count}`.replace('SIGNAL ', ''), { fontFamily: 'Lilita One, Arial Black', fontSize: '22px', color: '#ffffff', stroke: '#2b1d2e', strokeThickness: 5 }).setOrigin(0.5));
        if (cd.isNew) card.add(this.add.text(56, -104, 'NEW!', { fontFamily: 'Lilita One, Arial Black', fontSize: '22px', color: '#2b1d2e', backgroundColor: '#ffcf33', padding: { x: 8, y: 1 } }).setOrigin(0.5).setAngle(8));
        c.add(card);
        this.tweens.add({ targets: card, scaleX: sc, duration: 220, delay: 300 + extra + k * 260, ease: 'Back.Out', onStart: () => sfx.star?.(Math.min(2, k)) });
      });
    } });
    const more = this.totalCrates();
    this.time.delayedCall(900 + cards.length * 260 + extra, () => {
      if (!c.active) return;
      // r39: buttons follow the last row instead of a fixed y (no dead space)
      const cols = cards.length > 6 ? 4 : 3, rows = Math.ceil(cards.length / cols);
      const by = Math.min(top + 920, top + (cols === 4 ? 220 : 250) + (rows - 1) * (cols === 4 ? 190 : 250) + (cols === 4 ? 175 : 200));
      if (more) this.button(c, W / 2 - 150, by, 260, `NEXT (${more})`, 0x5fbf4a, () => this.openNextCrate(), 0.8);
      const back = this.crateReturn;
      if (back) this.button(c, more ? W / 2 + 150 : W / 2, by, 260, 'CONTINUE', 0x27a4c0, () => ((this.crateReturn = null), back()), 0.8);
      else this.button(c, more ? W / 2 + 150 : W / 2, by, 260, 'UNITS', 0x27a4c0, () => this.openTitle('units'), 0.8);
    });
  }

  openUnitShop() {
    this.closeModal();
    const m = this.meta;
    // r40: taller panel; the Featured Crate row leads (Gems can target one unit)
    const c = this.panel(1214);
    const top = H / 2 - 607;
    const D = 152;
    c.add(this.add.text(W / 2, top + 60, 'CRATE SHOP', { fontFamily: 'Lilita One, Arial Black', fontSize: '52px', color: '#3b2533' }).setOrigin(0.5));
    addOddsButton(this, c, W - 100, top + 60, () => showOddsPanel(this, W, H, pityView(m)));
    c.add(this.add.text(W / 2, top + 112, `${m.bolts ?? 0} Bolts  \u00b7  ${m.gems ?? 0} Gems`, { fontFamily: 'Lilita One, Arial Black', fontSize: '28px', color: '#7a5a4a' }).setOrigin(0.5));
    const B = TUNING.rosterB, RH = B ? 100 : 128, rowH = B ? 92 : 120; // ROSTER B adds the Golden Workbench row, so the rows are tighter
    const row = (y: number, title: string, sub: string, label: string, col: number, cb: () => void) => {
      c.add(this.add.graphics().fillStyle(0xead2b0, 1).fillRoundedRect(70, y - rowH / 2, W - 140, rowH, 20));
      c.add(this.add.text(100, y - 22, title, { fontFamily: 'Lilita One, Arial Black', fontSize: '30px', color: '#3b2533' }).setOrigin(0, 0.5));
      c.add(this.add.text(100, y + 20, sub, { fontFamily: 'Arial', fontStyle: 'bold', fontSize: '20px', color: '#7a5a4a' }).setOrigin(0, 0.5));
      this.button(c, W - 170, y, 200, label, col, cb, 0.7);
    };
    const buyCrate = (kind: CrateKind, cur: 'bolts' | 'gems', price: number) => {
      if ((m[cur] ?? 0) < price) return this.showToast(cur === 'gems' ? 'NOT ENOUGH GEMS' : 'NOT ENOUGH BOLTS');
      m[cur] = (m[cur] ?? 0) - price;
      tlog.log('crate_buy', { kind, cur, price });
      this.openCrate(kind);
    };
    const day = Math.floor(Date.now() / 86400000);
    const fu = featuredGemUnit(day);
    const fname = FAMILY_INFO[fu as 'cannon'].name.toUpperCase();
    const pf = (m.pity ??= { epic: 0, dry: 0 }).featured ?? 0;
    c.add(this.add.graphics().fillStyle(0x8e58c9, 0.25).fillRoundedRect(70, top + 156, W - 140, 148, 20).lineStyle(4, 0x8e58c9, 1).strokeRoundedRect(70, top + 156, W - 140, 148, 20));
    const pk = this.unitPortrait(fu);
    if (this.textures.exists(pk)) c.add(this.fitVisible(this.add.image(136, top + 230, pk), 104));
    c.add(this.add.text(200, top + 188, `FEATURED: ${fname}`, { fontFamily: 'Lilita One, Arial Black', fontSize: '28px', color: '#3b2533' }).setOrigin(0, 0.5));
    c.add(this.add.text(200, top + 222, `60% of its rarity · guaranteed in ${FEATURED_CRATE.pity - pf} crate${FEATURED_CRATE.pity - pf > 1 ? 's' : ''}`, { fontFamily: 'Arial', fontStyle: 'bold', fontSize: '18px', color: '#5a3a5a' }).setOrigin(0, 0.5));
    const buyFeatured = (n: number, price: number) => {
      if ((m.gems ?? 0) < price) return this.showToast('NOT ENOUGH GEMS');
      m.gems = (m.gems ?? 0) - price;
      const owned = new Set(Object.entries(m.units ?? {}).filter(([, v]) => v.level >= 1).map(([k]) => k as Family));
      const all = new Map<string, CrateCard>();
      for (let k = 0; k < n; k++) {
        m.crateSeq = (m.crateSeq ?? 0) + 1;
        for (const cd of rollFeatured(owned, (Date.now() ^ (m.crateSeq * 2654435761)) >>> 0, fu, m.pity!)) {
          const e = all.get(cd.unit);
          if (e) e.count += cd.count;
          else all.set(cd.unit, { ...cd });
        }
      }
      const cards = [...all.values()];
      this.applyCards(cards);
      tlog.log('featured_buy', { unit: fu, n, price, cards: cards.map((x) => `${x.unit}x${x.count}`) });
      this.presentCrate('iron', cards, n > 1 ? `${n} FEATURED CRATES` : 'FEATURED CRATE');
    };
    this.button(c, 330, top + 266, 220, `x1  ${FEATURED_CRATE.gems1} GEMS`, 0x8e58c9, () => buyFeatured(1, FEATURED_CRATE.gems1), 0.6);
    this.button(c, 520, top + 266, 220, `x5  ${FEATURED_CRATE.gems5} GEMS`, 0x8e58c9, () => buyFeatured(5, FEATURED_CRATE.gems5), 0.6);
    (B ? [...SHOP.gemCrates, ...SHOP.gemCratesB] : SHOP.gemCrates).forEach((g, i) => row(top + 220 + D + i * RH, crateName(g.kind), B ? `${CRATES_B[g.kind].cards} cards  \u00b7  ${guaranteeText(g.kind)}` : `${CRATES[g.kind].cards} cards  \u00b7  ${CRATES[g.kind].rareMin}+ rare`, `${g.gems} GEMS`, 0x8e58c9, () => buyCrate(g.kind, 'gems', g.gems)));
    const ownedNow = new Set(Object.entries(m.units ?? {}).filter(([, v]) => v.level >= 1).map(([k]) => k as Family));
    const feat = featuredUnit(localDate(), ownedNow);
    SHOP.boltPacks.forEach((p, i) =>
      row(top + (B ? 520 : 476) + D + i * RH, p.name, p.id === 'role' ? `${p.cards} cards of a role you pick` : `${p.cards} cards  \u00b7  ${p.featuredMin}+ ${FAMILY_INFO[feat as 'cannon'].name}`, `${p.bolts} BOLTS`, 0xe0a020, () => (p.id === 'role' ? this.openRolePick() : this.openPack(p.id))),
    );
    c.add(this.add.text(W / 2, top + 850 + D, 'GEMS  (test store, no real payment)', { fontFamily: 'Lilita One, Arial Black', fontSize: '24px', color: '#3b2533' }).setOrigin(0.5));
    SHOP.gemPacks.forEach((p, i) => {
      const x = W / 2 + (i - 1) * 200;
      this.button(c, x, top + 905 + D, 180, `${p.gems}`, 0x27a4c0, () => {
        m.gems = (m.gems ?? 0) + p.gems;
        store(META_KEY, JSON.stringify(m));
        tlog.log('gems_mock_buy', { gems: p.gems, price: p.price });
        this.showToast(`+${p.gems} GEMS (TEST)`);
        this.openUnitShop();
      }, 0.65);
      c.add(this.add.text(x, top + 950 + D, p.price, { fontFamily: 'Arial', fontStyle: 'bold', fontSize: '20px', color: '#7a5a4a' }).setOrigin(0.5));
    });
    // ChatGPT r32: Gems can also buy Bolts (60 -> 300, 200 -> 1,100)
    ([[60, 300], [200, 1100]] as const).forEach(([gem, bolt], i) =>
      this.button(c, i ? W - 160 : 160, top + 1010 + D, 200, `${bolt}B / ${gem}G`, 0xe0a020, () => {
        if ((m.gems ?? 0) < gem) return this.showToast('NOT ENOUGH GEMS');
        m.gems = (m.gems ?? 0) - gem;
        m.bolts = (m.bolts ?? 0) + bolt;
        store(META_KEY, JSON.stringify(m));
        tlog.log('gems_for_bolts', { gem, bolt });
        this.showToast(`+${bolt} BOLTS`);
        this.openUnitShop();
      }, 0.6),
    );
    this.button(c, W / 2, top + 1010 + D, 200, 'BACK', 0x8a6a4a, () => this.openTitle('units'), 0.7);
  }

  /** r32 (ChatGPT early guarantee): the first Iron crate lets you CHOOSE 1 of 3 units you don't own yet. */
  openUnitChoice(then: () => void) {
    const m = this.meta;
    const missing = UNITS.filter((u) => !this.ownsUnit(u.id) && u.rarity === 'rare').map((u) => u.id);
    if (!missing.length) return then();
    const rng = new Rng(((m.crateSeq ?? 1) * 2654435761) >>> 0);
    const picks = rng.shuffle([...missing]).slice(0, 3);
    this.closeModal();
    const c = this.panel(640);
    const top = H / 2 - 320;
    c.add(this.add.text(W / 2, top + 64, 'CHOOSE A NEW UNIT', { fontFamily: 'Lilita One, Arial Black', fontSize: '44px', color: '#3b2533' }).setOrigin(0.5));
    c.add(this.add.text(W / 2, top + 110, 'It joins your collection right away', { fontFamily: 'Arial', fontStyle: 'bold', fontSize: '22px', color: '#7a5a4a' }).setOrigin(0.5));
    picks.forEach((f, k) => {
      const x = W / 2 + (k - (picks.length - 1) / 2) * 200, y = top + 330;
      const card = this.add.container(x, y);
      card.add(this.add.graphics().fillStyle(0x2b1d2e, 1).fillRoundedRect(-88, -130, 176, 260, 18).fillStyle(0x3a8adf, 1).fillRoundedRect(-84, -126, 168, 252, 15).fillStyle(0xfbe7c6, 1).fillRoundedRect(-76, -100, 152, 130, 12));
      if (this.textures.exists(`${f}_3`)) {
        const im = this.add.image(0, -36, `${f}_3`);
        im.setScale(110 / Math.max(im.width, im.height));
        card.add(im);
      }
      const info = FAMILY_INFO[f as 'cannon'];
      card.add(this.add.text(0, 50, info.name.toUpperCase(), { fontFamily: 'Lilita One, Arial Black', fontSize: '22px', color: '#ffffff', stroke: '#2b1d2e', strokeThickness: 5 }).setOrigin(0.5));
      card.add(this.add.text(0, 86, info.role, { fontFamily: 'Lilita One, Arial Black', fontSize: '18px', color: '#fff0cf' }).setOrigin(0.5));
      card.setSize(176, 260).setInteractive({ useHandCursor: true });
      card.on('pointerup', () => {
        m.unitChoiceDone = true;
        this.applyCards([{ unit: f, count: 1, isNew: true }]);
        tlog.log('unit_choice', { unit: f, from: picks });
        sfx.win();
        then();
      });
      c.add(card);
    });
  }

  openRolePick() {
    this.closeModal();
    const c = this.panel(520);
    const top = H / 2 - 260;
    c.add(this.add.text(W / 2, top + 64, 'ROLE PACK', { fontFamily: 'Lilita One, Arial Black', fontSize: '48px', color: '#3b2533' }).setOrigin(0.5));
    c.add(this.add.text(W / 2, top + 116, 'Pick the role you want cards for', { fontFamily: 'Arial', fontStyle: 'bold', fontSize: '22px', color: '#7a5a4a' }).setOrigin(0.5));
    (['shooter', 'relay', 'helper'] as const).forEach((r, i) => this.button(c, W / 2, top + 210 + i * 100, 380, r.toUpperCase(), 0x5fbf4a, () => this.openPack('role', r), 0.8));
    this.button(c, W / 2, top + 480, 240, 'BACK', 0x8a6a4a, () => this.openUnitShop(), 0.7);
  }

  teamShooter(): Family {
    const sh = this.meta.shooter as Family | undefined;
    return sh && unitDef(sh)?.slot === 'shooter' && this.ownsUnit(sh) ? sh : 'cannon';
  }

  /** r32: relay A from chapter 2, relay B from chapter 3; Coil + Bell until then. */
  teamRelays(): [Family, Family] {
    const r = (this.meta.relays ?? ['coil', 'bell']) as [Family, Family];
    const lv = this.currentLevel();
    const a = lv > 10 && this.ownsUnit(r[0]) ? r[0] : 'coil';
    const b = lv > 20 && this.ownsUnit(r[1]) && r[1] !== a ? r[1] : a === 'bell' ? 'coil' : 'bell';
    return [a, b];
  }

  /** BUILD YOUR TEAM (ChatGPT r14): Shooter (Cannon/Rocket) + Coil + Bell (fixed relays) + optional Helper. */
  openTeamSheet() {
    sfx.click();
    this.seen('team');
    const m = this.meta;
    const PH = 900;
    const c = this.sheet(PH);
    const top = H / 2 - PH / 2;
    this.sheetTitle(c, top, 'BUILD YOUR TEAM', 'Changes apply to your next run');
    const helper = this.activeToys()[0] ?? null;
    const [ra, rb] = this.teamRelays();
    const lv = this.currentLevel();
    const slots: { label: string; fam: Family | null; role: string; note: string; tap: () => void }[] = [
      { label: 'SHOOTER', fam: this.teamShooter(), role: 'shooter', note: 'tap to change', tap: () => this.openSlotPicker('shooter', 0) },
      { label: 'RELAY A', fam: ra, role: 'relay', note: lv > 10 ? 'tap to change' : relayLockNote(FAMILY_INFO[ra as 'coil'].name, 2), tap: () => (lv > 10 ? this.openSlotPicker('relay', 0) : this.showToast('RELAY A OPENS IN CHAPTER 2')) },
      { label: 'RELAY B', fam: rb, role: 'relay', note: lv > 20 ? 'tap to change' : relayLockNote(FAMILY_INFO[rb as 'coil'].name, 3), tap: () => (lv > 20 ? this.openSlotPicker('relay', 1) : this.showToast('RELAY B OPENS IN CHAPTER 3')) },
      { label: 'HELPER', fam: m.playtestMode ? null : helper, role: helper ? FAMILY_INFO[helper as 'cannon'].role.toLowerCase() : 'support', note: 'tap to change', tap: () => (m.playtestMode ? this.showToast('HELPERS ARE OFF IN THIS PLAYTEST') : this.openSlotPicker('helper', 0)) },
    ];
    slots.forEach((sl, i) => {
      const x = W / 2 + (i % 2 ? 150 : -150);
      const y = top + 270 + Math.floor(i / 2) * 230;
      const card = this.add.container(x, y);
      const plate = this.hasArt('ui_team_slot') ? this.add.image(0, 0, 'ui_team_slot').setDisplaySize(280, 210) : this.add.graphics().fillStyle(0xffffff, 1).fillRoundedRect(-140, -105, 280, 210, 22);
      card.add(plate);
      card.add(this.add.text(0, -78, sl.label, { fontFamily: 'Lilita One, Arial Black', fontSize: '22px', color: '#7a5a4a' }).setOrigin(0.5));
      const long = sl.note.length > 20;
      if (sl.fam && this.textures.exists(`${sl.fam}_1`)) {
        const im = this.add.image(0, long ? -16 : -8, `${sl.fam}_1`);
        im.setScale((long ? 80 : 96) / Math.max(im.width, im.height));
        card.add(im);
      } else card.add(this.add.text(0, -8, 'none', { fontFamily: 'Lilita One, Arial Black', fontSize: '28px', color: '#9a8a7a' }).setOrigin(0.5));
      if (this.hasArt(`role_${sl.role}`)) {
        const ri = this.add.image(-100, -78, `role_${sl.role}`);
        ri.setScale(34 / Math.max(ri.width, ri.height));
        card.add(ri);
      }
      // walkthrough 3: a locked relay's note is two wrapped lines, so the unit and its name sit a little higher
      card.add(this.add.text(0, long ? 40 : 52, sl.fam ? FAMILY_INFO[sl.fam as keyof typeof FAMILY_INFO].name : 'No helper', { fontFamily: 'Lilita One, Arial Black', fontSize: long ? '25px' : '28px', color: '#3b2533' }).setOrigin(0.5));
      card.add(this.add.text(0, long ? 80 : 86, sl.note, { fontFamily: 'Lilita One, Arial Black', fontSize: long ? '16px' : '19px', color: '#fff0cf', align: 'center', wordWrap: { width: 250 } }).setOrigin(0.5));
      card.setSize(280, 210).setInteractive({ useHandCursor: true });
      card.on('pointerup', sl.tap);
      c.add(card);
    });
    const sh = FAMILY_INFO[this.teamShooter() as keyof typeof FAMILY_INFO];
    c.add(this.add.text(W / 2, top + 650, `${sh.name}: ${sh.text}`, { fontFamily: 'Arial', fontStyle: 'bold', fontSize: '21px', color: '#3b2533', align: 'center', wordWrap: { width: W - 160 } }).setOrigin(0.5));
    this.button(c, W / 2, top + 790, 380, 'USE TEAM', 0x5fbf4a, () => this.openTitle(), 0.9);
  }

  /** r32 squad picker: every OWNED unit of that role with its level; locked ones say where to find them. */
  openSlotPicker(slot: 'shooter' | 'relay' | 'helper', k: 0 | 1) {
    const m = this.meta;
    const list = UNITS.filter((u) => u.slot === slot);
    const PH = 260 + list.length * 104 + (slot === 'helper' ? 104 : 0);
    const c = this.sheet(PH);
    const top = H / 2 - PH / 2;
    this.sheetTitle(c, top, slot === 'relay' ? `RELAY ${k ? 'B' : 'A'}` : slot.toUpperCase(), 'Units you own. Find more in crates.');
    const [ra, rb] = this.teamRelays();
    const cur = slot === 'shooter' ? this.teamShooter() : slot === 'relay' ? (k ? rb : ra) : this.activeToys()[0] ?? null;
    const other = slot === 'relay' ? (k ? ra : rb) : null;
    const choose = (f: Family | null) => {
      if (slot === 'shooter') m.shooter = f!;
      else if (slot === 'relay') {
        const r = [...(m.relays ?? [ra, rb])] as [string, string];
        r[k] = f!;
        m.relays = r;
      } else {
        for (const key of Object.keys(m.toys) as Family[]) m.toys[key] = false;
        if (f) m.toys[f] = true;
      }
      store(META_KEY, JSON.stringify(m));
      tlog.log('squad', { slot, k, unit: f });
      this.openTeamSheet();
    };
    let y = top + 190;
    if (slot === 'helper') {
      this.button(c, W / 2, y, 440, cur ? 'NO HELPER' : 'NO HELPER  \u2713', 0x8a6a4a, () => choose(null), 0.8);
      y += 104;
    }
    for (const u of list) {
      const own = this.ownsUnit(u.id);
      const name = FAMILY_INFO[u.id as 'cannon'].name.toUpperCase();
      if (!own) c.add(this.add.text(W / 2, y, `${name}: find it in crates`, { fontFamily: 'Lilita One, Arial Black', fontSize: '26px', color: '#9a8a7a' }).setOrigin(0.5));
      else if (u.id === other) c.add(this.add.text(W / 2, y, `${name}: in the other relay slot`, { fontFamily: 'Lilita One, Arial Black', fontSize: '26px', color: '#9a8a7a' }).setOrigin(0.5));
      else this.button(c, W / 2, y, 440, `${name}  LV ${m.units?.[u.id]?.level ?? 1}${cur === u.id ? '  \u2713' : ''}`, cur === u.id ? 0x5fbf4a : 0x27a4c0, () => choose(u.id), 0.8);
      y += 104;
    }
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
    this.seen('workshop');
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
      sb.once(Phaser.GameObjects.Events.DESTROY, () => win.destroy()); // the mask Graphics is unparented: free it with the sheet
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
  static GUIDE = GUIDE;

  /** Board marks legend: a mini cell per mark, drawn with the same functions / art as the board, one sentence each. */
  marksLegend(c: Phaser.GameObjects.Container, top: number, page2 = false): number {
    // clarity pass 2: label, sentence and colour of every row come from PALETTE (core/marks.ts), same as the board
    const cs = 76, k = cs / CELL, x = 118;
    const P = PALETTE;
    type Row = { label: string; text: string; fam: string; under?: boolean; draw: (g: Gfx, x: number, y: number) => Phaser.GameObjects.GameObject[] | void };
    const box = (x: number, y: number) => ({ x0: x - cs / 2 + 4, y0: y - cs / 2 + 4, s: cs - 8 });
    // page 2 (clarity pass 3): empty cells and HUD meters, drawn like the board / HUD draws them
    const cells: Row[] = [
      {
        label: P.kickback.label, fam: '', text: P.kickback.text,
        draw: (g, x, y) => {
          g.lineStyle(5, KICK_COL, 0.9).strokeCircle(x - 14, y, 20).fillStyle(KICK_COL, 0.18).fillCircle(x - 14, y, 20);
          g.lineStyle(5, KICK_COL, 0.9).strokeCircle(x + 16, y, 20).fillStyle(KICK_COL, 0.18).fillCircle(x + 16, y, 20).lineStyle(3, KICK_COL, 0.9).strokeCircle(x + 16, y, 12);
        },
      },
      {
        label: CELL_COPY.junk.label, fam: '', text: CELL_COPY.junk.text,
        draw: (g, x, y) => {
          const b = box(x, y);
          g.lineStyle(4, ATTACK_COL, 0.9).beginPath().arc(x, y, b.s / 2 - 2, -Math.PI / 2, Math.PI * 0.9).strokePath();
          if (!this.hasArt('prop_junk_block')) return void g.fillStyle(0x7a6a5a, 1).fillRoundedRect(b.x0 + 8, b.y0 + 8, b.s - 16, b.s - 16, 8);
          return [this.fitVisible(this.add.image(x, y, 'prop_junk_block'), cs - 22)];
        },
      },
      {
        label: CELL_COPY.blocked.label, fam: '', text: CELL_COPY.blocked.text,
        draw: (g, x, y) => {
          const b = box(x, y);
          g.fillStyle(0x2b1d2e, 0.72).fillRoundedRect(b.x0, b.y0, b.s, b.s, 14).lineStyle(5, 0x8a6a4a, 1).lineBetween(x - 18, y - 18, x + 18, y + 18).lineBetween(x + 18, y - 18, x - 18, y + 18);
        },
      },
      {
        label: CELL_COPY.divider.label, fam: '', text: CELL_COPY.divider.text,
        draw: (g, x, y) => {
          g.lineStyle(10, ATTACK_TINT.split, 1).lineBetween(x, y - cs / 2, x, y + cs / 2).lineStyle(3, ATTACK_COL, 1).lineBetween(x - 5, y - cs / 2, x - 5, y + cs / 2).lineBetween(x + 5, y - cs / 2, x + 5, y + cs / 2);
        },
      },
      {
        label: P.overdrive.label, fam: '', text: P.overdrive.text,
        draw: (g, x, y) => {
          for (let i = 0; i < 6; i++) g.fillStyle(0x2b1d2e, 1).fillRoundedRect(x - 36 + i * 12, y - 12, 11, 24, 3).fillStyle(i < 4 ? OD_COL : 0x7a6a6a, 1).fillRoundedRect(x - 35 + i * 12, y - 10, 9, 20, 2);
        },
      },
      {
        label: CELL_COPY.hpTicks.label, fam: '', text: CELL_COPY.hpTicks.text,
        draw: (g, x, y) => {
          g.fillStyle(0x2b1d2e, 1).fillRoundedRect(x - 36, y - 10, 72, 20, 10).fillStyle(0x5fd35f, 1).fillRoundedRect(x - 33, y - 7, 50, 14, 7);
          for (const q of [0.25, 0.5, 0.75]) g.fillStyle(0x2b1d2e, 0.85).fillRect(x - 33 + 66 * q - 1.5, y - 9, 3, 18);
        },
      },
      {
        label: CELL_COPY.starTicks.label, fam: '', text: CELL_COPY.starTicks.text,
        draw: (g, x, y) => {
          g.fillStyle(0x2b1d2e, 1).fillCircle(x, y, 30).fillStyle(0xfff0cf, 1).fillCircle(x, y, 21);
          g.lineStyle(6, 0x5fd35f, 1).beginPath().arc(x, y, 25, -Math.PI / 2, Math.PI * 0.9).strokePath();
          for (const [a, live] of [[0.3, true], [-0.9, false]] as const) g.lineStyle(4, live ? 0xffcf33 : 0x8a7a5a, live ? 1 : 0.6).lineBetween(x + Math.cos(a) * 21, y + Math.sin(a) * 21, x + Math.cos(a) * 31, y + Math.sin(a) * 31);
        },
      },
    ];
    const rows: Row[] = page2 ? cells : [
      { label: P.boost.label, fam: 'cannon_2', text: P.boost.text, draw: (g, x, y) => drawAmpMark(g, x, y, 1, k) },
      // units B1: Battery boosts too, so the CHARGED row would explain a mark that never appears
      ...(TUNING.unitsB1 ? [] : [{ label: P.charge.label, fam: 'cannon_2', text: P.charge.text, draw: (g: Gfx, x: number, y: number) => drawPrimeMark(g, x, y, 1, k) }]),
      {
        label: P.powerup.label, fam: 'cannon_2', text: P.powerup.text,
        draw: (g, x, y) => {
          const bx = x + SLOT.item.x * k, by = y + SLOT.item.y * k;
          for (let n = 0; n < 2; n++) g.fillStyle(0x2b1d2e, 1).fillCircle(bx - 8 * k + n * 16 * k, by + 26 * k, 7 * k).fillStyle(ITEM_COL, 1).fillCircle(bx - 8 * k + n * 16 * k, by + 26 * k, 5 * k);
          if (!this.textures.exists('item_badge_overcharge')) return;
          const im = this.add.image(bx, by, 'item_badge_overcharge');
          return [im.setScale((40 * k) / Math.max(im.width, im.height))];
        },
      },
      {
        label: P.max.label, fam: 'cannon_6', text: P.max.text,
        draw: (_g, x, y) => {
          if (!this.hasArt('crown')) return;
          const im = this.add.image(x + SLOT.crown.x * k, y + SLOT.crown.y * k, 'crown');
          return [im.setScale(Math.min((48 * k) / im.width, (48 * k) / im.height)).setAngle(15)];
        },
      },
      { label: `${P.attack.label} SOON`, fam: 'coil_2', text: P.attack.text, under: true, draw: (g, x, y) => drawBossCell(g, x - cs / 2 + 4, y - cs / 2 + 4, cs - 8, true, 1, 0) },
      {
        label: `${P.attack.label} NOW`, fam: 'coil_2', text: P.attack.now!, under: true,
        draw: (g, x, y) => {
          drawBossCell(g, x - cs / 2 + 4, y - cs / 2 + 4, cs - 8, false, 1, ATTACK_TINT.frost);
          if (!this.hasArt(ATTACK_ICON.frost)) return;
          const im = this.add.image(x + SLOT.bossIcon.x * k, y + SLOT.bossIcon.y * k, ATTACK_ICON.frost);
          return [im.setScale((44 * k) / Math.max(im.width, im.height))];
        },
      },
      {
        label: P.locked.label, fam: 'coil_2', text: P.locked.text, under: true,
        draw: (g, x, y) => {
          g.fillStyle(LOCK_COL, 0.6).fillRoundedRect(x - cs / 2 + 4, y - cs / 2 + 4, cs - 8, cs - 8, 14);
          g.lineStyle(5 * k, LOCK_COL, 1).strokeRoundedRect(x - cs / 2 + 4, y - cs / 2 + 4, cs - 8, cs - 8, 14);
        },
      },
    ];
    // flow layout (390x844 QA: 3-line rows ran into the next one): each row is as tall as its wrapped text, min 80
    let rowTop = top + 182;
    rows.forEach((r) => {
      const body = this.add.text(x + 64, 0, r.text, { fontFamily: 'Arial', fontStyle: 'bold', fontSize: '19px', color: '#3b2533', wordWrap: { width: W - x - 64 - 70 }, lineSpacing: 1 }).setOrigin(0, 0);
      const h = Math.max(80, 28 + body.height + 4);
      const y = rowTop + 40;
      rowTop += h;
      const under = this.add.graphics().fillStyle(0xb98a5e, 0.35).fillRoundedRect(x - cs / 2 + 4, y - cs / 2 + 4, cs - 8, cs - 8, 14);
      const boss = !!r.under;
      const g = this.add.graphics();
      // boss tints sit under the machine (as on the board); helper marks sit over it
      const extra = boss ? r.draw(under, x, y) : undefined;
      c.add(under);
      if (r.fam) c.add(this.fitVisible(this.add.image(x, y, this.textures.exists(r.fam) ? r.fam : 'cannon_1'), cs - 14));
      const more = boss ? extra : r.draw(g, x, y);
      c.add(g);
      if (more) c.add(more);
      c.add(this.add.text(x + 64, y - 30, r.label, { fontFamily: 'Lilita One, Arial Black', fontSize: '24px', color: '#b06a1a' }).setOrigin(0, 0.5));
      c.add(body.setY(y - 14));
    });
    return rowTop;
  }

  guideUnlocked(unlock: number) {
    return unlock <= 1 || this.currentLevel() >= unlock;
  }

  /** t-2fd7bb86: a machine page opens once you own the machine or the road has put it on your board. */
  guideMachineOpen(key: string) {
    const pg = GameScene.GUIDE.find((p) => p.key === key);
    return this.ownsUnit(key) || (!!pg && pg.unlock !== 999 && this.guideUnlocked(pg.unlock));
  }

  /** t-2fd7bb86: the guide lists only what the player has reached; every other machine sits on one LOCKED page. */
  guidePages() {
    const isUnit = (k: string) => !!unitDef(k);
    const open = GameScene.GUIDE.filter((p) => (isUnit(p.key) ? this.guideMachineOpen(p.key) : this.guideUnlocked(p.unlock)));
    const anyLocked = GameScene.GUIDE.some((p) => isUnit(p.key) && !this.guideMachineOpen(p.key));
    return anyLocked ? [...open, { key: 'locked', title: 'LOCKED MACHINES', role: 'SPECIAL', text: '', tryThis: '', unlock: 0 }] : open;
  }

  /** The LOCKED page: a dark silhouette per machine not reached yet, with where it comes from. */
  lockedMachines(c: Phaser.GameObjects.Container, top: number) {
    const locked = GameScene.GUIDE.filter((p) => unitDef(p.key) && !this.guideMachineOpen(p.key));
    const cols = 4, cell = 150;
    locked.forEach((p, i) => {
      const x = W / 2 + ((i % cols) - (Math.min(cols, locked.length) - 1) / 2) * cell, y = top + 260 + Math.floor(i / cols) * 150;
      c.add(this.add.graphics().fillStyle(0x2b1d2e, 0.12).fillRoundedRect(x - 66, y - 62, 132, 140, 18));
      const art = this.unitPortrait(p.key);
      if (this.textures.exists(art)) c.add(this.fitVisible(this.add.image(x, y - 6, art), 96).setTintFill(0x2b1d2e).setAlpha(0.55));
      c.add(this.add.text(x, y - 6, '\u{1F512}', { fontSize: '32px' }).setOrigin(0.5));
      c.add(this.add.text(x, y + 58, p.unlock === 999 ? 'crates' : `level ${p.unlock}`, { fontFamily: 'Lilita One, Arial Black', fontSize: '20px', color: '#7a5a4a' }).setOrigin(0.5));
    });
    c.add(this.add.text(W / 2, top + 250 + Math.ceil(locked.length / cols) * 150, 'Find these in crates or on the road.\nEach one gets its own page here.', { fontFamily: 'Arial', fontStyle: 'bold', fontSize: '24px', color: '#3b2533', align: 'center' }).setOrigin(0.5, 0));
  }

  openHowTo(page = 0, back?: () => void, single = false) {
    this.closeModal();
    // single: one page by its GUIDE index (a new machine's first meeting); otherwise only the pages reached so far
    const pages = single ? GameScene.GUIDE : this.guidePages();
    page = Math.max(0, Math.min(pages.length - 1, page));
    const pg = pages[page];
    const c = this.panel(940);
    const top = H / 2 - 470;
    const open = pg.key !== 'locked';
    c.add(this.add.text(W / 2, top + 56, single ? 'NEW MACHINE!' : 'MACHINE GUIDE', { fontFamily: 'Lilita One, Arial Black', fontSize: '30px', color: '#b06a1a' }).setOrigin(0.5));
    c.add(this.add.text(W / 2, top + 108, pg.title, { fontFamily: 'Lilita One, Arial Black', fontSize: '54px', color: '#2a2233' }).setOrigin(0.5));
    const roleCol = { SHOOTER: '#e8452c', RELAY: '#27a4c0', MOVER: '#c23fd1', SUPPORT: '#5fbf4a', 'THE RULE': '#8a6a4a', SPECIAL: '#e0a020' }[pg.role] ?? '#8a6a4a';
    c.add(this.add.text(W / 2, top + 160, pg.role, { fontFamily: 'Lilita One, Arial Black', fontSize: '24px', color: '#ffffff', backgroundColor: roleCol, padding: { x: 14, y: 4 } }).setOrigin(0.5));
    if (open && pg.key === 'overdrive') {
      // the HUD bolt meter (4 of 6 charged) and the orange board glow it lights when full
      const g = this.add.graphics();
      const mx = W / 2 - 80, my = top + 250;
      for (let i = 0; i < 6; i++) g.fillStyle(0x2b1d2e, 1).fillRoundedRect(mx + i * 28, my, 24, 34, 6).fillStyle(i < 4 ? OD_COL : 0x7a6a6a, 1).fillRoundedRect(mx + i * 28 + 3, my + 3, 18, 28, 4);
      g.lineStyle(12, OD_COL, 0.6).strokeRoundedRect(W / 2 - 150, top + 320, 300, 200, 24).fillStyle(0xb98a5e, 0.35).fillRoundedRect(W / 2 - 138, top + 332, 276, 176, 18);
      c.add(g);
      if (this.hasArt('icon_bolt')) c.add(this.fitVisible(this.add.image(mx - 34, my + 17, 'icon_bolt'), 44));
      for (let i = 0; i < 3; i++) if (this.textures.exists(`cannon_${i + 2}`)) c.add(this.fitVisible(this.add.image(W / 2 + (i - 1) * 86, top + 420, `cannon_${i + 2}`), 72));
      c.add(this.add.text(W / 2, top + 560, pg.text, { fontFamily: 'Arial', fontStyle: 'bold', fontSize: '25px', color: '#3b2533', align: 'center', wordWrap: { width: W - 160 }, lineSpacing: 4 }).setOrigin(0.5, 0));
      c.add(this.add.text(W / 2, top + 748, `Try: ${pg.tryThis}`, { fontFamily: 'Arial', fontStyle: 'italic bold', fontSize: '23px', color: '#7a5a4a', align: 'center', wordWrap: { width: W - 160 } }).setOrigin(0.5, 0));
    } else if (open && (pg.key === 'marks' || pg.key === 'marks2')) {
      const end = this.marksLegend(c, top, pg.key === 'marks2');
      c.add(this.add.text(W / 2, Math.max(top + 762, end + 8), `Try: ${pg.tryThis}`, { fontFamily: 'Arial', fontStyle: 'italic bold', fontSize: '23px', color: '#7a5a4a', align: 'center', wordWrap: { width: W - 160 } }).setOrigin(0.5, 0));
    } else if (open && pg.key === 'items') {
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
    } else this.lockedMachines(c, top);
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
    // charged: piece carrying a mark (drawn with the board's own mark code: Battery 'prime' or Amplifier/Beacon 'amp'), spent when it fires
    type Demo = { pieces: [string, number, number][]; links: [number, number, number][]; merge?: [number, number]; slide?: [number, number, number, number]; big?: number[]; charged?: number; mark?: 'prime' | 'amp' };
    const D: Record<string, Demo> = {
      chain: { pieces: [['coil', 1, 0], ['coil', 1, 1], ['cannon', 1, 3], ['bell', 0, 1], ['cannon', 0, 4], ['cannon', 2, 4]], merge: [0, 1], links: [[1, 2, 1], [1, 3, 1], [3, 4, 2]] },
      cannon: { pieces: [['cannon', 1, 1], ['cannon', 1, 2], ['cannon', 0, 4]], merge: [0, 1], links: [] },
      coil: { pieces: [['coil', 1, 2], ['cannon', 1, 0], ['cannon', 0, 2], ['bell', 1, 3], ['cannon', 0, 0], ['cannon', 2, 4]], links: [[0, 1, 1], [0, 2, 1], [0, 3, 1]] },
      bell: { pieces: [['bell', 1, 2], ['cannon', 1, 0], ['coil', 1, 4], ['cannon', 1, 3], ['cannon', 0, 2], ['cannon', 2, 1]], links: [[0, 1, 1], [0, 2, 1], [0, 3, 1]] },
      rocket: { pieces: [['coil', 1, 1], ['rocket', 1, 3], ['rocket', 0, 4]], links: [[0, 1, 1]], big: [1] },
      magnet: { pieces: [['magnet', 1, 1], ['cannon', 1, 4], ['cannon', 0, 0]], links: [], slide: [1, 1, 2, 1] },
      battery: { pieces: [['coil', 0, 2], ['cannon', 1, 2], ['battery', 1, 1], ['cannon', 2, 4]], links: [[0, 1, 1]], charged: 1, mark: 'prime', big: [1] },
      fan: { pieces: [['fan', 1, 1], ['cannon', 1, 2], ['coil', 0, 4]], links: [], slide: [1, 1, 3, 1] },
      horn: { pieces: [['horn', 1, 2], ['cannon', 0, 2], ['cannon', 2, 2], ['cannon', 1, 0]], links: [[0, 1, 1], [0, 2, 1]] },
      fuse_box: { pieces: [['fuse_box', 1, 2], ['cannon', 0, 1], ['cannon', 2, 3], ['cannon', 1, 3]], links: [[0, 1, 1], [0, 2, 1]] },
      mortar: { pieces: [['coil', 1, 0], ['bell', 1, 2], ['mortar', 1, 4]], links: [[0, 1, 1], [1, 2, 2]], big: [2] },
      arc_welder: { pieces: [['coil', 1, 1], ['arc_welder', 1, 3], ['cannon', 0, 4]], links: [[0, 1, 1], [1, 2, 2]] },
      amplifier: { pieces: [['coil', 0, 2], ['cannon', 1, 2], ['amplifier', 1, 1], ['cannon', 2, 4]], links: [[0, 1, 1]], charged: 1, mark: 'amp', big: [1] },
      signal_beacon: { pieces: [['bell', 0, 0], ['cannon', 0, 3], ['signal_beacon', 2, 0], ['coil', 2, 3]], links: [[0, 1, 1]], charged: 1, mark: 'amp', big: [1] },
      ...ROSTER_1_DEMOS,
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
          if (inReach) g.lineStyle(4, FAMILY_INFO[key as 'coil' | 'bell'].color, 0.9).strokeRoundedRect(at(r, k).x - cs / 2 + 6, at(r, k).y - cs / 2 + 6, cs - 12, cs - 12, 12);
        }
    }
    const mon = this.fitVisible(this.add.image(cx, cy - (ROWS_D * cs) / 2 - 30, 'target_0'), 70);
    c.add(mon);
    // UI audit: the little can floated unexplained above every grid; it is the monster the shots fly to
    c.add(this.add.text(cx + 48, mon.y, '← MONSTER', { fontFamily: 'Lilita One, Arial Black', fontSize: '22px', color: '#8a6a4a' }).setOrigin(0, 0.5));
    const imgs = d.pieces.map(([f, r, k]) => {
      const im = this.fitVisible(this.add.image(at(r, k).x, at(r, k).y, `${f}_1`), cs - 14);
      c.add(im);
      return im;
    });
    const fx = this.add.graphics();
    c.add(fx);
    const isShooter = (f: string) => isShooterFam(f as Family);
    const base = d.pieces.map(([, r, k]) => at(r, k));
    const drawMark = () => {
      fx.clear();
      if (d.charged === undefined) return;
      const p = base[d.charged];
      (d.mark === 'amp' ? drawAmpMark : drawPrimeMark)(fx, p.x, p.y, 1, cs / CELL);
    };
    drawMark();
    const timers: Phaser.Time.TimerEvent[] = [];
    const STEP = 420;
    const play = () => {
      if (!c.active) return;
      // reset
      imgs.forEach((im, i) => im.setPosition(base[i].x, base[i].y).setAlpha(1).setTint(0xffffff));
      drawMark();
      const zap = this.add.graphics();
      c.add(zap);
      const fire = (i: number, depth: number) => {
        timers.push(
          this.time.delayedCall(depth * STEP + 120, () => {
            if (!c.active) return;
            const im = imgs[i];
            this.tweens.add({ targets: im, scale: im.scale * 1.22, duration: 110, yoyo: true });
            if (i === d.charged) fx.clear(); // the mark is spent on this shot
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
      if (d.merge) {
        const [a, b] = d.merge;
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

  /** r29 active terrain: oil puddle + arrow, two portal discs, a tow bar that follows the linked machines. */
  drawTerrain(atk: BossAttack, tgt: { cells?: number[] }, idsCells: number[], g: Phaser.GameObjects.Graphics) {
    const img = (key: string, c: number, size: number, k: number) => {
      const name = `terrain_${k}`;
      let im = this.remixIcons.find((x) => x.name === name);
      if (!im) this.remixIcons.push((im = this.add.image(0, 0, 'dot').setName(name).setDepth(9)));
      if (!this.hasArt(key)) return im.setVisible(false);
      const { x, y } = cellXY(c);
      im.setTexture(key).setVisible(true).setPosition(x, y + 8).setAlpha(0.9);
      im.setScale(size / Math.max(im.width, im.height));
      return im;
    };
    const t = this.time.now;
    if (atk === 'slick' && tgt.cells) {
      img('prop_oil', tgt.cells[0], CELL - 10, 0);
      const o = cellXY(tgt.cells[0]);
      g.lineStyle(4, 0x2ecbe6, 0.9).strokeRoundedRect(o.x - CELL / 2 + 6, o.y - CELL / 2 + 6, CELL - 12, CELL - 12, 14);
      // r30: a bold slide arrow from the oil to where a drop will end up
      const f = cellXY(tgt.cells[0]), to = cellXY(tgt.cells[1]);
      const ang = Math.atan2(to.y - f.y, to.x - f.x);
      const ex = to.x - Math.cos(ang) * 22, ey = to.y - Math.sin(ang) * 22;
      g.lineStyle(14, 0x2b1d2e, 0.85).lineBetween(f.x, f.y, ex, ey).lineStyle(8, 0x6fd3ff, 1).lineBetween(f.x, f.y, ex, ey);
      g.fillStyle(0x6fd3ff, 1).fillTriangle(ex + Math.cos(ang) * 22, ey + Math.sin(ang) * 22, ex + Math.cos(ang + 2.4) * 20, ey + Math.sin(ang + 2.4) * 20, ex + Math.cos(ang - 2.4) * 20, ey + Math.sin(ang - 2.4) * 20);
      g.lineStyle(4, 0x6fd3ff, 0.5 + 0.5 * Math.abs(Math.sin(t / 220))).strokeRoundedRect(to.x - CELL / 2 + 8, to.y - CELL / 2 + 8, CELL - 16, CELL - 16, 14);
    } else if (atk === 'portals' && tgt.cells) {
      img('prop_portal_cyan', tgt.cells[0], CELL - 8, 0).setAngle(t / 6);
      img('prop_portal_violet', tgt.cells[1], CELL - 8, 1).setAngle(-t / 6);
    } else if (atk === 'tow' && idsCells.length === 2) {
      const a = cellXY(idsCells[0]), b = cellXY(idsCells[1]);
      const pl = 0.75 + 0.25 * Math.sin(t / 143);
      g.lineStyle(16, 0x1e2a44, 1).lineBetween(a.x, a.y, b.x, b.y).lineStyle(10, ATTACK_TINT.tow, 1).lineBetween(a.x, a.y, b.x, b.y);
      for (const q of [a, b]) {
        g.fillStyle(0x1e2a44, 1).fillCircle(q.x, q.y, 14).fillStyle(0x2ecbe6, 1).fillCircle(q.x, q.y, 9);
        g.lineStyle(4, 0x2ecbe6, pl).strokeRoundedRect(q.x - CELL / 2 + 6, q.y - CELL / 2 + 6, CELL - 12, CELL - 12, 14);
      }
    }
  }

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
    // CORNERS modifiers: permanently blocked cells (drawn under boss telegraphs too: a tap on one explains it)
    for (const c of this.s.masked ?? []) {
      const { x, y } = cellXY(c);
      g.fillStyle(0x2b1d2e, 0.72).fillRoundedRect(x - CELL / 2 + 6, y - CELL / 2 + 6, CELL - 12, CELL - 12, 18);
      g.lineStyle(6, 0x8a6a4a, 1).lineBetween(x - 24, y - 24, x + 24, y + 24).lineBetween(x + 24, y - 24, x - 24, y + 24);
    }
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
      g.lineStyle(5, ATTACK_COL, 0.9).beginPath().arc(x, y, CELL / 2 - 6, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2).strokePath();
    });
    if (bs && (bs.pending || bs.active)) {
      const atk = castAttack(bs, bs.active ?? bs.pending);
      const icon = ATTACK_ICON[atk];
      const tgt = bs.active ?? bs.pending!;
      const warn = !bs.active;
      const pulse = warn ? 0.55 + 0.45 * Math.abs(Math.sin(this.time.now / 250)) : 0.9;
      const byIds = tgt.ids ? tgt.ids.map((id) => this.s.grid.findIndex((g) => g?.id === id)).filter((i) => i >= 0) : null;
      const cellsOf = (): number[] => (byIds ? byIds : tgt.cells ? tgt.cells : tgt.row !== undefined ? [0, 1, 2, 3, 4].map((c) => tgt.row! * COLS + c) : tgt.col !== undefined ? [0, 1, 2, 3, 4, 5].map((r) => r * COLS + tgt.col!) : []);
      const coral = ATTACK_COL, tint = ATTACK_TINT[atk];
      const terrain = !warn && (atk === 'slick' || atk === 'portals' || atk === 'tow');
      if (terrain) this.drawTerrain(atk, tgt, byIds ?? [], g);
      for (const c of terrain ? [] : cellsOf()) {
        const { x, y } = cellXY(c);
        // warning: dashed coral boundary, pulsing 2 Hz; active: the attack's own tint (clarity pass 1)
        drawBossCell(gu, x - CELL / 2 + 6, y - CELL / 2 + 6, CELL - 12, warn, pulse, tint);
      }
      // r27 movement previews: where things will go
      const arrow = (a: number, b: number, color = 0xffd2c8) => {
        const f = cellXY(a), t = cellXY(b);
        const ang = Math.atan2(t.y - f.y, t.x - f.x);
        const ex = t.x - Math.cos(ang) * 26, ey = t.y - Math.sin(ang) * 26;
        g.lineStyle(9, 0x2b1d2e, 0.8 * pulse).lineBetween(f.x, f.y, ex, ey).lineStyle(5, color, pulse).lineBetween(f.x, f.y, ex, ey);
        g.fillStyle(color, pulse).fillTriangle(ex + Math.cos(ang) * 16, ey + Math.sin(ang) * 16, ex + Math.cos(ang + 2.4) * 14, ey + Math.sin(ang + 2.4) * 14, ex + Math.cos(ang - 2.4) * 14, ey + Math.sin(ang - 2.4) * 14);
      };
      if (warn && (atk === 'slick' || atk === 'portals') && tgt.cells) {
        if (atk === 'slick') arrow(tgt.cells[0], tgt.cells[1], 0x6fd3ff);
        else for (const c of tgt.cells) { const q = cellXY(c); g.lineStyle(5, 0x6fd3ff, pulse).strokeCircle(q.x, q.y, CELL / 2 - 14); }
      }
      if (warn && (atk === 'tow' || atk === 'ransom') && byIds && byIds.length === 2) {
        const a1 = cellXY(byIds[0]), a2 = cellXY(byIds[1]);
        if (atk === 'tow') g.lineStyle(10, 0x2b1d2e, 0.7 * pulse).lineBetween(a1.x, a1.y, a2.x, a2.y).lineStyle(6, 0xffd2c8, pulse).lineBetween(a1.x, a1.y, a2.x, a2.y);
        else {
          // r30: ransom clocks on both machines + a dashed tether: "wake these two together"
          const late = (bs.pending?.deadline ?? 0) - this.s.elapsed < 0.75;
          const rc = late ? 0xff4b3e : ATTACK_TINT.ransom; // its own rose, clear of every mark hue (PALETTE)
          const rp = late ? 0.5 + 0.5 * Math.abs(Math.sin(this.time.now / 40)) : 1;
          for (const q of [a1, a2]) g.lineStyle(5, rc, rp).strokeRoundedRect(q.x - CELL / 2 + 5, q.y - CELL / 2 + 5, CELL - 10, CELL - 10, 14);
          const steps = 10;
          for (let k = 0; k < steps; k += 2) {
            const p0 = k / steps, p1 = (k + 1) / steps;
            g.lineStyle(6, rc, rp).lineBetween(a1.x + (a2.x - a1.x) * p0, a1.y + (a2.y - a1.y) * p0, a1.x + (a2.x - a1.x) * p1, a1.y + (a2.y - a1.y) * p1);
          }
          [a1, a2].forEach((q, k) => {
            const name = `ransom_${k}`;
            let im = this.remixIcons.find((x) => x.name === name);
            if (!im && this.hasArt('btg_ransom')) this.remixIcons.push((im = this.add.image(0, 0, 'btg_ransom').setName(name).setDepth(48)));
            if (im) {
              im.setVisible(true).setPosition(q.x + CELL / 2 - 22, q.y - CELL / 2 + 22);
              im.setScale((46 + 6 * Math.sin(this.time.now / 150)) / Math.max(im.width, im.height));
            } else g.fillStyle(rc, pulse).fillCircle(q.x + CELL / 2 - 20, q.y - CELL / 2 + 20, 16);
          });
        }
      }
      if (warn && (atk === 'pull' || atk === 'bounce') && tgt.cells) {
        arrow(tgt.cells[0], tgt.cells[1]);
        const d = cellXY(tgt.cells[1]);
        g.lineStyle(5, 0xffd2c8, pulse).strokeCircle(d.x, d.y, CELL / 2 - 14);
      }
      if (warn && atk === 'mirror' && tgt.cells) {
        arrow(tgt.cells[0], tgt.cells[1], 0x7ff0e0); // mint (was lavender, too close to the Amplifier mark)
        arrow(tgt.cells[1], tgt.cells[0], 0x7ff0e0);
      }
      if (warn && atk === 'conveyor' && tgt.row !== undefined) for (let c = 0; c < COLS - 1; c++) arrow(tgt.row * COLS + c, tgt.row * COLS + c + 1);
      if (warn && atk === 'bomb' && tgt.cells) {
        const { x, y } = cellXY(tgt.cells[0]);
        let bomb = this.remixIcons.find((x2) => x2.texture.key === 'prop_bomb');
        if (!bomb && this.hasArt('prop_bomb')) this.remixIcons.push((bomb = this.add.image(0, 0, 'prop_bomb').setDepth(47)));
        if (bomb) {
          bomb.setVisible(true).setPosition(x, y + Math.sin(this.time.now / 90) * 3);
          bomb.setScale(((CELL - 22) * (1 + 0.06 * Math.sin(this.time.now / 120))) / Math.max(bomb.width, bomb.height));
        } else g.fillStyle(0x2b1d2e, 1).fillCircle(x, y, 30).fillStyle(ATTACK_COL, 1).fillCircle(x, y - 30, 8);
      }
      if (tgt.boundary !== undefined) {
        const x = BX + (tgt.boundary + 1) * CELL;
        if (warn) {
          g.lineStyle(5, coral, pulse);
          for (let yy = BY - 8; yy < BY + CELL * ROWS + 8; yy += 26) g.lineBetween(x, yy, x, Math.min(yy + 14, BY + CELL * ROWS + 8));
        } else g.lineStyle(14, tint, 1).lineBetween(x, BY - 8, x, BY + CELL * ROWS + 8).lineStyle(4, coral, 1).lineBetween(x - 7, BY - 8, x - 7, BY + CELL * ROWS + 8).lineBetween(x + 7, BY - 8, x + 7, BY + CELL * ROWS + 8);
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
        // clarity pass 1: corner badge in the boss column (right-middle), under the TR countdown, clear of the helper marks
        im.setVisible(true).setPosition(onIt ? ac.x + 10 : tgt.boundary !== undefined ? ac.x - CELL / 2 + 18 : ac.x + SLOT.bossIcon.x, onIt ? ac.y - 14 : tgt.boundary !== undefined ? ac.y - CELL / 2 + 18 : ac.y + SLOT.bossIcon.y);
        im.setScale((onIt ? CELL * 0.6 : 44) / Math.max(im.width, im.height));
      }
      const left = warn ? Math.max(0, (bs.pending!.deadline - this.s.elapsed)) : Math.max(0, bs.active!.until - this.s.elapsed);
      // TR slot; kept clear of the top-centre power-up badge
      this.remixText.setText(warn ? String(Math.ceil(left)) : left.toFixed(1)).setPosition(ac.x + SLOT.boss.x + 6, ac.y - CELL / 2 + 20).setFontSize(warn ? 26 : 22).setVisible(true);
      const what = ATTACK_COPY[atk].what;
      const missed = !warn && atk === 'clamp' && cellsOf().every((c) => !this.s.grid[c]);
      const why = missed ? 'it missed! that cell is blocked' : ATTACK_COPY[atk].why;
      this.updateLane(warn ? `${what} IN ${left.toFixed(1)}s  \u00b7  ${why}` : `${what}  \u00b7  ${why}  \u00b7  ${left.toFixed(1)}s`, '#ffd2c8');
      return;
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
      if (sideIcon) icon(sideIcon, x + SLOT.bossIcon.x, y + SLOT.bossIcon.y + 6, 38, 0, 0.95, 48);
    };
    const coral = ATTACK_COL; // remix warnings are opponent attacks: the same colour as boss warnings
    const purple = LOCK_COL; // remix locks: the LOCKED colour (slate), as a clamp
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
    this.updateLane(lane, r.lock || r.kind === 'piano' ? '#b4c6e0' : '#ffd2c8');
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
    // UI audit: at +-108 the two pills overlapped; +-125 leaves a clear gap between them
    this.button(c, W / 2 + 125, top + 520, 200, 'RESTART', 0xe8452c, () => this.retry());
    this.button(c, W / 2 - 125, top + 520, 200, 'HOME', 0x27a4c0, () => this.quitHome());
    const ex = this.add.text(W / 2, top + (this.s.phase === 'tutorial' ? 796 : 684), 'export playtest log', { fontFamily: 'Arial', fontStyle: 'bold', fontSize: '22px', color: '#8a6a4a' }).setOrigin(0.5).setInteractive({ useHandCursor: true });
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
    const linkY = top + (this.s.phase === 'tutorial' ? 720 : 612);
    const shk = this.add.text(W / 2 + 140, linkY, `Shake: ${this.meta.shake === false ? 'OFF' : 'ON'}`, { fontFamily: 'Lilita One, Arial Black', fontSize: '28px', color: '#b06a1a' }).setOrigin(0.5);
    this.tapLink(shk, () => {
      sfx.click();
      this.meta.shake = this.meta.shake === false;
      store(META_KEY, JSON.stringify(this.meta));
      shk.setText(`Shake: ${this.meta.shake === false ? 'OFF' : 'ON'}`);
      if (this.meta.shake) this.shake(90, 0.003);
    });
    c.add(shk);
    const how = this.add.text(W / 2 - 120, linkY, 'Machine guide', { fontFamily: 'Lilita One, Arial Black', fontSize: '28px', color: '#b06a1a' }).setOrigin(0.5);
    this.tapLink(how, () => {
      sfx.click();
      this.openHowTo(0, () => this.openPause());
    });
    c.add(how);
    if (this.s.phase === 'tutorial') this.button(c, W / 2, top + 630, 420, 'SKIP TUTORIAL', 0x8a6a4a, () => this.skipTutorial());
  }

  /** SKIP TUTORIAL lands where finishing it does: Level 1 on the road (never a classic run). */
  skipTutorial() {
    tlog.log('tutorial_skip');
    this.startLevel(1);
  }

  save() {
    this.lastSave = this.time.now;
    tlog.flushThrottled(); // every 2 s and every drop: the log itself is written at most every 30 s (and when hidden / at level end)
    if (this.homeIdle || this.s.phase === 'won' || this.s.phase === 'lost') return;
    if (this.s.phase !== 'tutorial' && !this.meta.tutorialDone) {
      this.meta.tutorialDone = true;
      store(META_KEY, JSON.stringify(this.meta));
    }
    store(SAVE_KEY, serialize(this.s));
  }
}
