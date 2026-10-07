import { COLS, MAX_RANK, ROWS, TICK, TUNING } from '../content/tuning';
import { rawDamage, resolveCascade } from './cascade';
import { Rng } from './rng';
import { levelModifierState, lockedCells, REMIX_OPPONENTS, remixTick, type RemixEvent, type RemixState } from './remix';
import { bossAfterPlayer, bossBlockCells, bossBlocked, bossPendingCells, bossRansomCheck, bossRelabel, castAttack, chapterBossIdx, RANSOM_COST, bossCascadeMods, bossTick, BOSS_CLOCK, BOSSES, type BossEvent, type BossState } from './boss';
import { MONSTER_INDEX, STARTING_CELLS, SUPPLY_FRACTIONS, SUPPLY_SECONDS, type LevelDef } from '../content/levels';
import { isRelay, isShooter, ITEM_INTRO, itemFits, type CascadeResult, type Family, type Gadget, type Grid, type ItemKind, type PerkId } from './types';

export const ALL_PERKS: PerkId[] = ['twin', 'leads', 'encore', 'juice', 'quality'];

export type Phase = 'tutorial' | 'playing' | 'choice' | 'won' | 'lost';

export type GameEvent =
  | { type: 'cascade'; result: CascadeResult; damage: number; overdriveStart: boolean; kickback: boolean }
  | { type: 'kickbackIncoming'; land: number; into: number }
  | { type: 'kickback'; idx: number; into: number; gadget: Gadget }
  | { type: 'shot'; idx: number; id: number; damage: number }
  | { type: 'delivery'; idx: number; gadget: Gadget }
  | { type: 'move'; from: number; to: number; swap: boolean }
  | { type: 'scrap'; idx: number; gadget: Gadget }
  | { type: 'threshold'; target: number; level: number }
  | { type: 'kill'; target: number; final: boolean; demo: boolean }
  | { type: 'newTarget'; target: number }
  | { type: 'overdriveEnd' }
  | { type: 'end'; won: boolean }
  | { type: 'goal'; kind: 'rank' | 'chain'; n: number; idx: number }
  | { type: 'shield'; open: boolean; until: number }
  | { type: 'itemGrant'; kind: ItemKind; teach: boolean }
  | { type: 'itemApply'; kind: ItemKind; idx: number; id: number }
  | RemixEvent
  | BossEvent;

export interface Stats {
  merges: number;
  scraps: number;
  biggestChain: number;
  biggestHit: number;
  bestRank: number;
  totalDamage: number;
  dmgBy: Partial<Record<DmgSource, number>>;
  kickFuses: number;
  /** Extra parts delivered by the low-board packet controller (r19). */
  packetExtras?: number;
  /** Two-piece rescue deliveries (no legal pair and nothing lonely to copy). */
  rescues?: number;
}

export interface GameState {
  version: 1;
  seed: number;
  phase: Phase;
  practice: boolean;
  /** Team shooter slot (ChatGPT r14): every Cannon token is this family. */
  shooter?: Family;
  /** Daily Bench: the local calendar date (YYYY-MM-DD) this run belongs to. Presentation-only; rules are the normal run. */
  daily?: string;
  /** Challenge mode: tougher targets. */
  hard: boolean;
  /** Unlocked extra families mixed into the supply bag (e.g. magnet). */
  toys: Family[];
  grid: Grid;
  nextId: number;
  supplyRng: number;
  perkRng: number;
  bag: Family[];
  pending: Gadget[];
  supplyTimer: number;
  shipments: number;
  target: number; // 0..2 ; -1 demo
  hp: number;
  maxHp: number;
  thresholds: number; // panels broken on current target (0..3)
  pendingDamage: number;
  timeLeft: number;
  elapsed: number;
  odCharge: number;
  odLeft: number;
  perks: PerkId[];
  offer: PerkId[];
  mergeCd: number;
  tutorialMerges: number;
  kickRng: number;
  drops: { t: number; fuse: boolean; plan?: DropPlan | null }[];
  /** Occupancy guard: deliveries wait in the tray while true. */
  trayHold: boolean;
  bigCd: number;
  /** REMIX encounter (post-win mode), null in normal runs. Also carries a SAGA level's timed modifier. */
  remix: RemixState | null;
  /** SAGA level number (one monster, one clock); undefined for the classic 3-monster run. */
  level?: number;
  /** Base time of the level (supply phases + stars are fractions of it). */
  levelTime?: number;
  /** Saga L21+: damaging core families may reach rank 8. */
  rankCap?: number;
  /** Matchmaker: highest rank an ordinary copy may have on this level. */
  copyCap?: number;
  /** Permanently blocked cells (CORNERS modifiers). */
  masked?: number[];
  /** Time Capsule used this attempt. */
  capsuleUsed?: boolean;
  /** Teaching levels (r18): delivery bag override and features held back. */
  bagOverride?: Record<string, number>;
  noKickback?: boolean;
  noOverdrive?: boolean;
  /** Chapter boss fight (r20): levels 10/20/30/40/50/60. */
  boss?: BossState | null;
  /** r32 unit levels as damage multipliers per family (set by the scene from the collection). */
  unitMult?: Partial<Record<Family, number>>;
  unitLevel?: Partial<Record<Family, number>>;
  /** r32 squad relays: Relay A takes the Coil cells / bag share, Relay B the Bell ones. */
  relays?: [Family, Family];
  /** r30 Monster Bounty fight (daily; results go to the bounty flow). */
  bounty?: { id: string; twist: string; date: string; slot: number };
  /** r29 Boss Rush fight (event rules; results go to the Rush flow, not the saga). */
  rush?: { id: string; slot: number; week: number };
  /** r23 goal level: progress toward MAKE RANK N / CHAIN xN (replaces defeating the monster). */
  goal?: { kind: 'rank' | 'chain'; n: number; best: number } | null;
  /** r23 chain shield: undefined = no shield; otherwise elapsed time until which it is open. */
  shieldUntil?: number;
  /** r25 power-up item waiting in the tray (one slot), whether this level already granted one, and the prescribed teaching kind. */
  itemTray?: ItemKind | null;
  itemGranted?: boolean;
  itemTeach?: ItemKind;
  itemGrantAt?: number;
  itemRng?: number;
  /** Untimed, unrewarded high-rank introduction (r17). */
  showcase?: boolean;
  /** Jumpstart applied this attempt. */
  jumpstart?: boolean;
  stats: Stats;
}

const START: [number, number, Family][] = [
  [4, 1, 'cannon'],
  [4, 2, 'cannon'],
  [3, 1, 'coil'],
  [3, 2, 'bell'],
  [1, 0, 'cannon'],
  [3, 4, 'cannon'],
  [1, 1, 'coil'],
  [1, 3, 'bell'],
];

export const idxOf = (r: number, c: number) => r * COLS + c;

export const remixHp = () => Math.round(TUNING.targetHp.reduce((a, b) => a + b, 0));
export const targetHp = (s: GameState, i: number) => (s.remix ? remixHp() : Math.round(TUNING.targetHp[i] * (s.hard ? TUNING.hardHpMult : 1)));
export const locked = (s: GameState): ReadonlySet<number> =>
  s.masked?.length || s.boss?.blocks?.length ? new Set([...lockedCells(s.remix), ...(s.masked ?? []), ...bossBlockCells(s.boss)]) : lockedCells(s.remix);

export function newGame(seed: number, tutorial = false, hard = false, toys: Family[] = [], remixTarget = -1, shooter: Family = 'cannon'): GameState {
  const s: GameState = {
    shooter: tutorial ? 'cannon' : shooter,
    version: 1,
    seed: seed >>> 0,
    phase: tutorial ? 'tutorial' : 'playing',
    practice: tutorial,
    hard,
    toys: tutorial ? [] : toys,
    grid: new Array(ROWS * COLS).fill(null),
    nextId: 1,
    supplyRng: seed >>> 0,
    perkRng: (seed ^ 0x9e3779b9) >>> 0,
    bag: [],
    pending: [],
    supplyTimer: TUNING.supplyPeriod,
    shipments: 0,
    target: tutorial ? -1 : 0,
    hp: tutorial ? TUNING.demoHp : Math.round(TUNING.targetHp[0] * (hard ? TUNING.hardHpMult : 1)),
    maxHp: tutorial ? TUNING.demoHp : Math.round(TUNING.targetHp[0] * (hard ? TUNING.hardHpMult : 1)),
    thresholds: 0,
    pendingDamage: 0,
    timeLeft: TUNING.runTime,
    elapsed: 0,
    odCharge: 0,
    odLeft: 0,
    perks: [],
    offer: [],
    mergeCd: 0,
    tutorialMerges: 0,
    kickRng: (seed ^ 0x51ed270b) >>> 0,
    drops: [],
    trayHold: false,
    bigCd: 0,
    remix: null,
    stats: { merges: 0, scraps: 0, biggestChain: 0, biggestHit: 0, bestRank: 1, totalDamage: 0, dmgBy: {}, kickFuses: 0 },
  };
  for (const [r, c, f] of START) s.grid[idxOf(r, c)] = makeGadget(s, f === 'cannon' ? shooterOf(s) : f, 1);
  s.supplyTimer = supplyPeriod(s);
  const opp = REMIX_OPPONENTS.find((o) => o.target === remixTarget);
  if (opp && !tutorial) {
    s.remix = { kind: opp.kind, next: 0, pending: null, lock: null };
    s.target = opp.target;
    s.hard = false;
    s.hp = s.maxHp = remixHp();
  }
  return s;
}

/** The run's shooter family (Cannon unless the team picked Rocket). */
export const shooterOf = (s: GameState): Family => s.shooter ?? 'cannon';
/** r32: the squad's relay in slot 0 (Coil's place) or 1 (Bell's place). */
export const relayOf = (s: GameState, k: 0 | 1): Family => s.relays?.[k] ?? (k === 0 ? 'coil' : 'bell');
/** Map a template family (cannon / coil / bell) onto the squad. */
const squadFam = (s: GameState, f: string): Family => (f === 'shooter' || f === 'cannon' ? shooterOf(s) : f === 'coil' ? relayOf(s, 0) : f === 'bell' ? relayOf(s, 1) : (f as Family));

/** A SAGA level (ChatGPT r15): one monster, one clock, PAIR8 starting board at the level's starting rank. */
export function newLevel(def: LevelDef, opts: { toys?: Family[]; shooter?: Family; jumpstart?: boolean; relays?: [Family, Family] } = {}): GameState {
  const s = newGame(def.seed, false, false, opts.toys ?? [], -1, (def.shooter as Family | undefined) ?? opts.shooter ?? 'cannon');
  if (opts.relays && !def.teach) s.relays = opts.relays;
  s.level = def.level;
  s.levelTime = def.time_seconds;
  s.timeLeft = def.time_seconds;
  s.target = MONSTER_INDEX[def.monster] ?? 0;
  s.hp = s.maxHp = def.hp;
  s.copyCap = def.ordinary_copy_rank_cap;
  s.rankCap = def.level >= 21 ? 8 : MAX_RANK;
  s.grid.fill(null);
  s.nextId = 1;
  if (def.teach) {
    for (const [fam, rank, r, c] of def.teach.start) s.grid[idxOf(r, c)] = makeGadget(s, fam === 'cannon' ? shooterOf(s) : (fam as Family), rank);
    if (def.teach.bag) s.bagOverride = def.teach.bag;
    s.noKickback = !!def.teach.no_kickback;
    s.noOverdrive = !!def.teach.no_overdrive;
    s.bag = [];
  } else
    for (const [fam, cells] of Object.entries(STARTING_CELLS) as [string, [number, number][]][])
      for (const [r, c] of cells) s.grid[idxOf(r, c)] = makeGadget(s, squadFam(s, fam), def.starting_rank);
  // (r17: the L21/L41 high-rank showcase moved to an optional practice intro; ordinary levels use chapter starters)
  // Jumpstart Kit: the designated starter shooter pair (4,1),(4,2) arrives one rank higher. No shot, no merge.
  if (opts.jumpstart) {
    for (const [r, c] of [[4, 1], [4, 2]]) {
      const g = s.grid[idxOf(r, c)];
      if (g) g.rank = Math.min(capOf(s, g.family), g.rank + 1);
    }
    s.jumpstart = true;
  }
  for (const [fam, rank, r, c] of def.start_extra ?? []) s.grid[idxOf(r, c)] = makeGadget(s, fam === 'cannon' ? shooterOf(s) : (fam as Family), rank);
  const mod = def.modifier;
  if (mod === 'GAPS') {
    s.masked = [idxOf(2, 1), idxOf(2, 3)];
    for (const c of s.masked) s.grid[c] = null;
  }
  if (mod === 'SUCTION') s.remix = levelModifierState('vacuum');
  else if (mod === 'JAM') s.remix = levelModifierState('jam');
  else if (mod === 'ROW_GAPS') s.remix = levelModifierState('gaps');
  else if (mod === 'CORNERS_2' || mod === 'CORNERS_4') {
    const corners = mod === 'CORNERS_2' ? [idxOf(0, 0), idxOf(5, 4)] : [idxOf(0, 0), idxOf(0, 4), idxOf(5, 0), idxOf(5, 4)];
    s.masked = corners;
    for (const c of corners) s.grid[c] = null;
  }
  const miniIdx = def.mini_boss ? BOSSES.findIndex((x) => x.id === def.mini_boss) : -1;
  if ((def.level % 10 === 0 && !def.teach) || miniIdx >= 0) {
    const bi = miniIdx >= 0 ? miniIdx : chapterBossIdx(def.level);
    s.boss = { def: bi, next: 0, pending: null, active: null, phaseShown: 0, ...(miniIdx >= 0 ? { mini: true } : {}) };
    s.remix = null;
    s.masked = [];
    s.timeLeft = s.levelTime = miniIdx >= 0 ? def.time_seconds : BOSS_CLOCK;
    // second PAIR8 set at seeded empty cells (same families and rank)
    const extra: Family[] = [];
    for (const [fam, cells] of Object.entries(STARTING_CELLS) as [string, [number, number][]][]) for (let k = 0; k < cells.length; k++) extra.push(squadFam(s, fam));
    const rng = new Rng(def.seed ^ 0xb055);
    const empties = s.grid.map((g, i) => (g ? -1 : i)).filter((i) => i >= 0);
    rng.shuffle(empties);
    extra.forEach((f, k) => {
      if (k < empties.length) s.grid[empties[k]] = makeGadget(s, f, def.starting_rank);
    });
  }
  // r25 items (from L13): one per level; teaching levels prescribe the kind
  s.itemTeach = def.item_teach as ItemKind | undefined;
  s.itemGrantAt = def.item_grant_at;
  s.itemRng = (def.seed ^ 0x17e3a5) >>> 0;
  // r23 behaviours + goals
  if (def.behaviour === 'shield') s.shieldUntil = -1;
  if (def.behaviour === 'suction' || def.behaviour === 'frost' || def.behaviour === 'hot' || def.behaviour === 'rest') {
    const bi = BOSSES.findIndex((b) => b.attack === def.behaviour);
    s.boss = { def: bi, next: 0, pending: null, active: null, phaseShown: 0, light: true };
  }
  if (def.goal) {
    s.goal = { ...def.goal, best: 0 };
    s.hp = s.maxHp = 1e9; // no finite defeat HP: the goal is the win
  }
  s.supplyTimer = supplyPeriod(s);
  return s;
}

/** r25: grant the level's single item into the tray (prescribed teaching kind, else uniform among unlocked kinds with an eligible machine). */
function grantItem(s: GameState, ev: GameEvent[]): boolean {
  if (s.level === undefined || s.level < ITEM_INTRO.overcharge || s.itemGranted || s.phase !== 'playing') return false;
  const fits = (k: ItemKind) => s.grid.some((g) => !!g && !g.item && itemFits(k, g.family));
  let kind: ItemKind | undefined = s.itemTeach && fits(s.itemTeach) ? s.itemTeach : undefined;
  if (!kind) {
    const pool = (Object.keys(ITEM_INTRO) as ItemKind[]).filter((k) => ITEM_INTRO[k] <= s.level! && k !== s.itemTeach && fits(k));
    if (s.itemTeach && !fits(s.itemTeach)) return false;
    if (!pool.length) return false;
    const rng = new Rng(s.itemRng ?? 1);
    kind = pool[rng.int(pool.length)];
    s.itemRng = rng.state;
  }
  s.itemTray = kind;
  s.itemGranted = true;
  ev.push({ type: 'itemGrant', kind, teach: s.itemTeach === kind });
  return true;
}

/** r25: put the tray item on a compatible machine without an attachment. */
export function applyItem(s: GameState, idx: number, id: number): CommandResult {
  const ev: GameEvent[] = [];
  const g = s.grid[idx];
  const kind = s.itemTray;
  if (s.phase !== 'playing' || !kind || !g || g.id !== id || g.item || !itemFits(kind, g.family)) return { ok: false, events: ev };
  g.item = { kind, charges: 2 };
  s.itemTray = null;
  ev.push({ type: 'itemApply', kind, idx, id });
  return { ok: true, events: ev };
}

/** r25: spend one charge on each attachment the cascade used. */
function spendItems(s: GameState, r: CascadeResult) {
  for (const id of r.itemUsed ?? []) {
    const g = s.grid.find((x) => x?.id === id);
    if (!g?.item) continue;
    g.item.charges--;
    if (g.item.charges <= 0) delete g.item;
  }
}

/** Shield multiplier on all damage while closed (r23). */
const shieldMult = (s: GameState) => (s.shieldUntil !== undefined && s.elapsed >= s.shieldUntil ? 0.75 : 1);

/** r23 goal check after a PLAYER merge (starters, deliveries and kickback fuses never count). */
function checkGoal(s: GameState, ev: GameEvent[], rank: number, chain: number, idx: number) {
  const gl = s.goal;
  if (!gl || s.phase !== 'playing') return;
  const v = gl.kind === 'rank' ? rank : chain;
  gl.best = Math.max(gl.best, v);
  if (v < gl.n) return;
  s.phase = 'won';
  if (s.remix) s.remix.pending = s.remix.lock = null;
  if (s.boss) s.boss.pending = s.boss.active = null;
  ev.push({ type: 'goal', kind: gl.kind, n: gl.n, idx });
  ev.push({ type: 'end', won: true });
}

/** Time Capsule: +15 s once per attempt while the level is live (no revive after the clock hits 0). */
export function useTimeCapsule(s: GameState): boolean {
  if (s.level === undefined || s.capsuleUsed || s.phase !== 'playing' || s.timeLeft <= 0) return false;
  s.capsuleUsed = true;
  s.timeLeft += 15;
  return true;
}

function makeGadget(s: GameState, family: Family, rank: number): Gadget {
  return { id: s.nextId++, family, rank, cd: family === 'cannon' ? cannonPeriod(s) : 0 };
}

export const cannonPeriod = (s: GameState) => (s.odLeft > 0 ? TUNING.cannonPeriodOverdrive : TUNING.cannonPeriod);
export const odNeeded = (s: GameState) => (s.perks.includes('juice') ? 5 : TUNING.overdriveMerges);
const odDuration = (s: GameState) => (s.perks.includes('juice') ? 8 : TUNING.overdriveDuration);

/** Stateless 32-bit hash (deterministic cosmetic-free choices that peekNext can predict exactly). */
function hash2(a: number, b: number): number {
  let h = (a ^ Math.imul(b, 0x9e3779b1)) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
}

/**
 * MERGE FEST (playtest 3, Ido: "the user must always get things that help him merge"):
 * a share of deliveries copies a lonely gadget on the board (same family AND rank), and when the board has no
 * legal pair at all the delivery always does. Pure function of (state, ordinal), so the NEXT preview is exact.
 */
export function matchmakerPick(s: GameState, ordinal: number): { family: Family; rank: number } | null {
  if (!TUNING.matchShare) return null;
  const counts = new Map<string, { family: Family; rank: number; n: number }>();
  for (const g of s.grid) {
    if (!g || g.rank >= capOf(s, g.family) || !(isShooter(g.family) || isRelay(g.family))) continue;
    const k = g.family + g.rank;
    const e = counts.get(k) ?? { family: g.family, rank: g.rank, n: 0 };
    e.n++;
    counts.set(k, e);
  }
  const groups = [...counts.values()];
  const lonely = groups.filter((e) => e.n % 2 === 1).sort((a, b) => a.rank - b.rank || a.family.localeCompare(b.family));
  if (!lonely.length) return null;
  const noPair = !groups.some((e) => e.n >= 2);
  if (!noPair && (hash2(s.seed, ordinal) % 1000) / 1000 >= TUNING.matchShare) return null;
  // ordinary copies respect the level's rank cap; a rescue (no legal pair) may copy anything lonely
  const capped = noPair ? lonely : lonely.filter((e) => e.rank <= (s.copyCap ?? MAX_RANK));
  if (!capped.length) return null;
  // bias toward low ranks so the board keeps flowing, but sometimes feed a high piece toward MAX
  const pool = capped.slice(0, Math.min(capped.length, 3));
  return pool[hash2(s.seed ^ 0x5bd1e995, ordinal) % pool.length];
}

/** Peek the next shipment (family + rank) without consuming RNG. */
export function peekNext(s: GameState): { family: Family; rank: number } {
  if (s.pending.length) return { family: s.pending[0].family, rank: s.pending[0].rank };
  const mm = matchmakerPick(s, s.shipments + 1);
  if (mm) return mm;
  const fam = s.bag.length ? s.bag[0] : peekBag(s);
  return { family: fam, rank: nextShipmentRank(s, s.shipments + 1) };
}

function peekBag(s: GameState): Family {
  const tmp = { ...s, bag: [] as Family[] };
  refillBag(tmp);
  return tmp.bag[0];
}

function refillBag(s: GameState) {
  const rng = new Rng(s.supplyRng);
  const bag: Family[] = [];
  const src = s.bagOverride ?? TUNING.bag;
  for (const f of Object.keys(src) as Family[]) for (let i = 0; i < src[f]; i++) bag.push(squadFam(s, f));
  for (const f of s.toys ?? []) for (let i = 0; i < (TUNING.toyBag[f] ?? 0); i++) bag.push(f);
  rng.shuffle(bag);
  s.bag = bag;
  s.supplyRng = rng.state;
}

const nextShipmentRank = (s: GameState, ordinal: number) => (s.perks.includes('quality') && ordinal % 4 === 0 ? 2 : 1);

/** Parts per delivery deadline (ChatGPT r19): 3 below round(14*C/30) occupied, 2 below round(18*C/30), else 1.
 *  C = usable cells. L1 stays at 1; L2 starts after its first real chain; other levels after 8 active seconds. */
export function packetSize(s: GameState): number {
  if (!TUNING.packets || s.phase === 'tutorial') return 1;
  if (s.level === 1) return 1;
  if (s.level === 2 && s.stats.biggestChain < 2) return 1;
  if (s.level !== undefined && s.level > 2 && s.elapsed < 8) return 1;
  const cap = ROWS * COLS - (s.masked?.length ?? 0);
  const occ = s.grid.reduce((n, g) => n + (g ? 1 : 0), 0) + s.pending.length;
  if (occ < Math.round((14 * cap) / 30)) return 3;
  if (occ < Math.round((18 * cap) / 30)) return 2;
  return 1;
}

/** `copy` false = an ordinary bag token (packet extras never duplicate a lonely high piece). */
function generateShipment(s: GameState, copy = true): Gadget {
  const mm = copy ? matchmakerPick(s, s.shipments + 1) : null;
  if (mm) {
    s.shipments++;
    return makeGadget(s, mm.family, mm.rank);
  }
  if (!s.bag.length) refillBag(s);
  const fam = s.bag.shift()!;
  s.shipments++;
  // two-piece rescue (ChatGPT r15/r16): no legal pair and nothing lonely to copy -> a matching core PAIR arrives
  const core = isShooter(fam) || isRelay(fam);
  if (core && s.pending.length === 0 && legalPairs(s).length === 0) {
    s.pending.push(makeGadget(s, fam, 1));
    s.stats.rescues = (s.stats.rescues ?? 0) + 1;
    return makeGadget(s, fam, 1);
  }
  return makeGadget(s, fam, nextShipmentRank(s, s.shipments));
}

export function supplyPeriod(s: GameState): number {
  if (s.levelTime) {
    const f = s.elapsed / s.levelTime;
    let p = SUPPLY_SECONDS[0];
    SUPPLY_FRACTIONS.forEach((fr, i) => {
      if (f >= fr) p = SUPPLY_SECONDS[i];
    });
    return p;
  }
  for (const [until, p] of TUNING.supplyCurve) if (s.elapsed < until) return p;
  return TUNING.supplyPeriod;
}

export const isActive = (s: GameState) => s.phase === 'playing';

// ---------- player commands ----------

export type CommandResult = { ok: boolean; events: GameEvent[] };

/** Highest rank a family can reach in this state. Saga L21+ lets damaging core families reach 8 (ChatGPT r16);
 *  helpers, events and the classic run stay at 6. */
export function capOf(s: GameState | undefined, family: Family): number {
  if (!s || s.level === undefined) return MAX_RANK;
  const core = isShooter(family) || isRelay(family);
  return core ? (s.rankCap ?? MAX_RANK) : MAX_RANK;
}

/** Same family + same rank. In Saga levels two pieces AT the cap compact into one cap piece (frees a cell, fires once). */
export function canMerge(a: Gadget | null, b: Gadget | null, s?: GameState): boolean {
  if (!a || !b || a.family !== b.family || a.rank !== b.rank) return false;
  const cap = capOf(s, a.family);
  return a.rank < cap || (s?.level !== undefined && a.rank === cap);
}

/** Drag gadget from `from` onto `to`: merge, move, or swap. */
export function drop(s: GameState, from: number, to: number, fromId: number): CommandResult {
  const ev: GameEvent[] = [];
  if (s.phase !== 'playing' && s.phase !== 'tutorial') return { ok: false, events: ev };
  if (from === to || from < 0 || to < 0 || from >= s.grid.length || to >= s.grid.length) return { ok: false, events: ev };
  const a = s.grid[from];
  if (!a || a.id !== fromId) return { ok: false, events: ev };
  const lk = locked(s);
  if (lk.has(from) || lk.has(to)) return { ok: false, events: ev };
  const bb = bossBlocked(s.boss);
  if (bb.noDrag.has(from) || bb.noDrop.has(to)) return { ok: false, events: ev };
  const b = s.grid[to];
  if (canMerge(a, b, s)) {
    if (s.mergeCd > 0) return { ok: false, events: ev };
    return merge(s, from, to);
  }
  // r29 terrain + links (Oil Otter / Portal Possum / Rivet Rhino): resolve where a manual move really lands
  const act = s.boss?.active;
  const atk = s.boss && act ? castAttack(s.boss, act) : null;
  if (atk === 'tow' && act?.ids?.includes(a.id)) {
    const partnerId = act.ids.find((i) => i !== a.id)!;
    const pf = s.grid.findIndex((g) => g?.id === partnerId);
    const dr = Math.floor(to / COLS) - Math.floor(from / COLS), dc = (to % COLS) - (from % COLS);
    const pr = Math.floor(pf / COLS) + dr, pc = (pf % COLS) + dc;
    const pt = pr * COLS + pc;
    const okCell = (c: number, r: number, cc: number) => r >= 0 && r < ROWS && cc >= 0 && cc < COLS && !lk.has(c) && !bb.noDrop.has(c) && (!s.grid[c] || s.grid[c]!.id === a.id || s.grid[c]!.id === partnerId);
    if (b || pf < 0 || !okCell(pt, pr, pc)) return { ok: false, events: ev }; // all-or-nothing; occupied drops bounce
    const pg = s.grid[pf]!;
    s.grid[from] = null;
    s.grid[pf] = null;
    s.grid[to] = a;
    s.grid[pt] = pg;
    ev.push({ type: 'move', from, to, swap: false }, { type: 'move', from: pf, to: pt, swap: false });
    return { ok: true, events: ev };
  }
  let land = to;
  if (!b && act?.cells && (atk === 'slick' || atk === 'portals') && act.cells[0] === to) land = act.cells[1];
  else if (!b && act?.cells && atk === 'portals' && act.cells[1] === to) land = act.cells[0];
  if (land !== to && (s.grid[land] || lk.has(land) || bb.noDrop.has(land))) land = to;
  // move / swap never fire anything
  s.grid[land] = a;
  s.grid[from] = b;
  ev.push({ type: 'move', from, to: land, swap: !!b });
  ev.push(...bossAfterPlayer(s.boss, land, [])); // r27: parking a machine on the bomb defuses it
  return { ok: true, events: ev };
}

function merge(s: GameState, from: number, to: number): CommandResult {
  const ev: GameEvent[] = [];
  const a = s.grid[from]!;
  const b = s.grid[to]!;
  const g = makeGadget(s, a.family, Math.min(a.rank + 1, capOf(s, a.family)));
  if (a.primed || b.primed) g.primed = true; // primer transfers (OR), never stacks
  if (a.amp || b.amp) g.amp = Math.max(a.amp ?? 0, b.amp ?? 0); // r32 marks transfer, the larger survives
  const inherit = b.item ?? a.item; // r25: one attachment transfers; with two, the destination's survives
  if (inherit) g.item = { ...inherit };
  // r29: merging a towed machine releases the tow bar; ransom markers move onto the result
  const ta = s.boss?.active;
  if (s.boss && ta && castAttack(s.boss, ta) === 'tow' && ta.ids?.some((i) => i === a.id || i === b.id)) s.boss.active = null;
  bossRelabel(s.boss, [a.id, b.id], g.id);
  s.grid[from] = null;
  s.grid[to] = g;
  s.stats.merges++;
  s.stats.bestRank = Math.max(s.stats.bestRank, g.rank);
  s.mergeCd = TUNING.mergeCooldown;

  let odStart = false;
  if (s.phase === 'playing' && !s.noOverdrive) {
    s.odCharge++;
    if (s.odCharge >= odNeeded(s)) {
      s.odCharge = 0;
      enterOverdrive(s, odDuration(s));
      odStart = true;
    }
  } else {
    s.tutorialMerges++;
  }
  // new cannon starts a full (current) period after its immediate activation
  if (g.family === 'cannon') g.cd = cannonPeriod(s);

  const result = resolveCascade(s.grid, to, { perks: s.perks, overdrive: s.odLeft > 0, reserved: new Set(dropReserved(s)), locked: locked(s), ...bossCascadeMods(s.boss), unitMult: s.unitMult, unitLevel: s.unitLevel, items: s.phase === 'playing' });
  applyMoves(s, result);
  spendItems(s, result);
  s.stats.biggestChain = Math.max(s.stats.biggestChain, result.count);
  s.stats.biggestHit = Math.max(s.stats.biggestHit, result.total);
  ev.push({ type: 'cascade', result, damage: result.total, overdriveStart: odStart, kickback: false });
  if (s.phase === 'playing' && TUNING.kickback && result.count >= TUNING.bigCascade && s.bigCd <= 0) {
    s.bigCd = TUNING.bigCascadeCooldown;
    queueDrop(s, ev, false);
  }
  // r23 chain shield: a player-rooted cascade of 4+ opens it for 6 s, and that whole cascade counts at full
  if (s.shieldUntil !== undefined && result.count >= 4) {
    s.shieldUntil = s.elapsed + 6;
    ev.push({ type: 'shield', open: true, until: s.shieldUntil });
  }
  applyDamage(s, result.total, ev, 'player');
  if (s.phase === 'playing') ev.push(...bossAfterPlayer(s.boss, -1, result.activations.map((x) => x.idx))); // r27 defuse / clear blocks
  if (s.phase === 'playing') ev.push(...bossRansomCheck(s.boss, result.activations.map((x) => x.id))); // r29 time ransom
  checkGoal(s, ev, g.rank, result.count, to);
  return { ok: true, events: ev };
}

export function scrap(s: GameState, idx: number, id: number): CommandResult {
  const g = s.grid[idx];
  if (s.phase !== 'playing' || !g || g.id !== id || locked(s).has(idx)) return { ok: false, events: [] };
  s.grid[idx] = null;
  s.stats.scraps++;
  return { ok: true, events: [{ type: 'scrap', idx, gadget: g }] };
}

export function choosePerk(s: GameState, perk: PerkId): CommandResult {
  const ev: GameEvent[] = [];
  if (s.phase !== 'choice' || !s.offer.includes(perk)) return { ok: false, events: ev };
  s.perks.push(perk);
  s.offer = [];
  if (perk === 'juice') {
    if (s.odCharge >= 5) {
      s.odCharge = 0;
      enterOverdrive(s, 8);
    } else if (s.odLeft > 0) s.odLeft = Math.min(8, s.odLeft + 2);
  }
  s.phase = 'playing';
  s.target++;
  s.maxHp = s.hp = targetHp(s, s.target);
  s.thresholds = 0;
  ev.push({ type: 'newTarget', target: s.target });
  const carry = s.pendingDamage;
  s.pendingDamage = 0;
  if (carry > 0) applyDamage(s, carry, ev, 'carry');
  return { ok: true, events: ev };
}

// ---------- internals ----------

function applyMoves(s: GameState, r: CascadeResult) {
  for (const m of r.moves) {
    if (s.grid[m.from]?.id !== m.id || s.grid[m.to]) throw new Error('magnet/fan move desync');
    s.grid[m.to] = s.grid[m.from];
    s.grid[m.from] = null;
  }
  // new primes first, then discharges (a cannon primed earlier in this cascade may already have used it)
  for (const g of s.grid) if (g && r.primes.includes(g.id)) g.primed = true;
  for (const g of s.grid) if (g && r.discharged.includes(g.id)) g.primed = false;
  // r32 Amplifier / Beacon: spend marks that fired, then place new ones (a stronger mark wins)
  for (const g of s.grid) if (g?.amp && r.ampsUsed?.includes(g.id)) delete g.amp;
  for (const m of r.amps ?? []) {
    const g = s.grid.find((x) => x?.id === m.id);
    if (g) g.amp = Math.max(g.amp ?? 0, m.mult);
  }
}

function enterOverdrive(s: GameState, dur: number) {
  const wasActive = s.odLeft > 0;
  s.odLeft = Math.max(s.odLeft, dur);
  if (!wasActive) rescaleCannons(s, TUNING.cannonPeriod, TUNING.cannonPeriodOverdrive);
}

function rescaleCannons(s: GameState, oldP: number, newP: number) {
  for (const g of s.grid) if (g && g.family === 'cannon') g.cd = (g.cd / oldP) * newP;
}

type DmgSource = 'player' | 'passive' | 'kick' | 'carry';

function applyDamage(s: GameState, dmg: number, ev: GameEvent[], src: DmgSource) {
  if (dmg <= 0) return;
  dmg = Math.round(dmg * shieldMult(s));
  if ((src === 'player' || src === 'kick') && s.level !== undefined && !s.goal) dmg = Math.min(dmg, Math.ceil(s.maxHp * TUNING.cascadeCap));
  s.stats.totalDamage += dmg;
  s.stats.dmgBy[src] = (s.stats.dmgBy[src] ?? 0) + dmg;
  const before = s.hp;
  s.hp -= dmg;
  if (s.target >= 0 && !s.goal) {
    const frac = Math.max(0, s.hp) / s.maxHp;
    const lvl = frac <= 0.25 ? 3 : frac <= 0.5 ? 2 : frac <= 0.75 ? 1 : 0;
    if (lvl > s.thresholds && s.hp > 0) {
      for (let l = s.thresholds + 1; l <= lvl; l++) if (!(l === 2 && grantItem(s, ev))) queueDrop(s, ev, true);
      s.thresholds = lvl;
      ev.push({ type: 'threshold', target: s.target, level: lvl });
    }
  }
  if (s.hp > 0 || before <= 0) return;
  const over = -s.hp;
  s.hp = 0;
  if (s.target === -1) {
    // demo can: respawn, no carry-over
    ev.push({ type: 'kill', target: -1, final: false, demo: true });
    s.hp = s.maxHp = TUNING.demoHp;
    return;
  }
  const final = !!s.remix || s.level !== undefined || s.target === TUNING.targetHp.length - 1;
  s.thresholds = 3;
  ev.push({ type: 'kill', target: s.target, final, demo: false });
  if (final) {
    s.phase = 'won';
    if (s.remix) s.remix.pending = s.remix.lock = null;
    if (s.boss) s.boss.pending = s.boss.active = null;
    ev.push({ type: 'end', won: true });
    return;
  }
  s.pendingDamage = over;
  s.phase = 'choice';
  s.offer = makeOffer(s);
}

function makeOffer(s: GameState): PerkId[] {
  const rng = new Rng(s.perkRng);
  const pool = rng.shuffle(ALL_PERKS.filter((p) => !s.perks.includes(p)));
  s.perkRng = rng.state;
  return pool.slice(0, 3);
}

/** The guided tutorial (scene-driven) calls this when its script is done: the real run starts on the practice board. */
export function finishTutorial(s: GameState): GameEvent[] {
  const ev: GameEvent[] = [];
  if (s.phase === 'tutorial') startRunFromTutorial(s, ev);
  return ev;
}

function startRunFromTutorial(s: GameState, ev: GameEvent[]) {
  s.phase = 'playing';
  s.target = 0;
  s.hp = s.maxHp = targetHp(s, 0);
  s.thresholds = 0;
  s.timeLeft = TUNING.runTime;
  s.elapsed = 0;
  s.odCharge = 0;
  s.odLeft = 0;
  s.supplyTimer = supplyPeriod(s);
  for (const g of s.grid) if (g && g.family === 'cannon') g.cd = TUNING.cannonPeriod;
  ev.push({ type: 'newTarget', target: 0 });
}

/** Advance one fixed 50 ms step. `reserved` = cells deliveries must avoid (drag in progress). */
export function tick(s: GameState, reserved: ReadonlySet<number> = new Set()): GameEvent[] {
  const ev: GameEvent[] = [];
  s.mergeCd = Math.max(0, s.mergeCd - TICK);
  if (s.phase !== 'playing') return ev;
  if (s.itemGrantAt !== undefined && !s.itemGranted && s.elapsed >= s.itemGrantAt) grantItem(s, ev); // r25 explicit teaching grant (goal levels have no HP thresholds)
  const dt = Math.min(TICK, s.timeLeft);
  s.elapsed += dt;
  s.timeLeft -= dt;

  // Overdrive
  if (s.odLeft > 0) {
    s.odLeft -= dt;
    if (s.odLeft <= 0) {
      s.odLeft = 0;
      rescaleCannons(s, TUNING.cannonPeriodOverdrive, TUNING.cannonPeriod);
      ev.push({ type: 'overdriveEnd' });
    }
  }

  // Passive cannons in stable id order
  const cannons = s.grid
    .map((g, idx) => ({ g, idx }))
    .filter((x): x is { g: Gadget; idx: number } => !!x.g && x.g.family === 'cannon')
    .sort((a, b) => a.g.id - b.g.id);
  for (const { g, idx } of cannons) {
    g.cd -= dt;
    if (g.cd <= 1e-9) {
      g.cd += cannonPeriod(s);
      const hot = bossCascadeMods(s.boss).hotCol;
      const dmg = rawDamage('cannon', g.rank) * TUNING.passiveMult * (s.unitMult?.cannon ?? 1) * (hot !== undefined && idx % COLS === hot ? 0.5 : 1);
      ev.push({ type: 'shot', idx, id: g.id, damage: dmg });
      applyDamage(s, dmg, ev, 'passive');
      if (s.phase !== 'playing') return ev;
    }
  }

  // Kickback drops
  s.bigCd = Math.max(0, s.bigCd - dt);
  for (const d of s.drops) d.t -= dt;
  while (s.drops.length && s.drops[0].t <= 0 && s.phase === 'playing') {
    const d = s.drops.shift()!;
    landDrop(s, reserved, ev, d.fuse, d.plan ?? null);
  }
  if (s.phase !== 'playing') return ev;

  // Remix attacks (resolve before deliveries; warnings wait for falling Kickback parts)
  if (s.remix) ev.push(...remixTick(s.remix, s.grid, s.elapsed, s.drops.length === 0, new Set([...reserved, ...dropReserved(s)])));
  if (s.boss) {
    const be = bossTick(s.boss, s.grid, s.elapsed, s.hp, s.maxHp, new Set([...reserved, ...dropReserved(s), ...locked(s)]));
    // r29 TIME RANSOM: an unsaved ransom takes 2 s from the clock and counts as 2 s more for stars
    for (const e of be)
      if (e.type === 'bossRansom' && !e.saved) {
        const cost = Math.min(RANSOM_COST, s.timeLeft);
        s.timeLeft -= cost;
        s.elapsed += cost;
      }
    ev.push(...be);
  }

  // Supply
  admitPending(s, reserved, ev);
  if (s.pending.length < TUNING.maxPending) {
    s.supplyTimer -= dt;
    if (s.supplyTimer <= 0) {
      s.supplyTimer += supplyPeriod(s);
      // round 19 packet controller: a low board gets 2-3 parts per deadline (same interval), a healthy board 1
      const size = packetSize(s);
      s.pending.push(generateShipment(s));
      for (let k = 1; k < size && s.pending.length < TUNING.maxPending; k++) s.pending.push(generateShipment(s, false));
      if (size > 1) s.stats.packetExtras = (s.stats.packetExtras ?? 0) + size - 1;
      admitPending(s, reserved, ev);
    }
  } else s.supplyTimer = 0;

  if (s.timeLeft <= 1e-9) {
    s.timeLeft = 0;
    s.phase = 'lost';
    if (s.remix) s.remix.pending = s.remix.lock = null;
    ev.push({ type: 'end', won: false });
  }
  return ev;
}

function admitPending(s: GameState, reserved: ReadonlySet<number>, ev: GameEvent[]) {
  const occ = s.grid.reduce((n, g) => n + (g ? 1 : 0), 0);
  if (occ >= TUNING.holdAt) s.trayHold = true;
  else if (occ <= TUNING.releaseAt) s.trayHold = false;
  if (!s.pending.length || s.trayHold) return;
  const promised = new Set([...dropReserved(s), ...locked(s), ...bossBlocked(s.boss).noDrop, ...bossPendingCells(s.boss)]);
  const slot = s.grid.findIndex((g, i) => !g && !reserved.has(i) && !promised.has(i));
  if (slot < 0) return;
  const g = s.pending.shift()!;
  s.grid[slot] = g;
  ev.push({ type: 'delivery', idx: slot, gadget: g });
}

export function legalPairs(s: GameState): [number, number][] {
  const out: [number, number][] = [];
  const lk = locked(s);
  for (let i = 0; i < s.grid.length; i++)
    for (let j = i + 1; j < s.grid.length; j++) if (canMerge(s.grid[i], s.grid[j], s) && !lk.has(i) && !lk.has(j)) out.push([i, j]);
  return out;
}

/** Dry-run preview: how many gadgets would fire if `from` merged into `to`. Never mutates. */
export function previewMerge(s: GameState, from: number, to: number): CascadeResult | null {
  const a = s.grid[from];
  const b = s.grid[to];
  if (!canMerge(a, b, s)) return null;
  const grid = s.grid.slice();
  grid[from] = null;
  grid[to] = { id: -1, family: a!.family, rank: a!.rank + 1, cd: 0 };
  return resolveCascade(grid, to, { perks: s.perks, overdrive: s.odLeft > 0, reserved: new Set(dropReserved(s)), locked: locked(s), ...bossCascadeMods(s.boss), unitMult: s.unitMult, unitLevel: s.unitLevel });
}

export function serialize(s: GameState): string {
  return JSON.stringify(s);
}

export function deserialize(json: string): GameState | null {
  try {
    const s = JSON.parse(json) as GameState;
    if (s.version !== 1 || !Array.isArray(s.grid) || s.grid.length !== ROWS * COLS) return null;
    return s;
  } catch {
    return null;
  }
}

// ---------- kickback ----------

type DropPlan = { idx: number; land: number; id: number };

/** Choose where a loose part will land (next to a lonely match). Consumes kickRng once. */
function planDrop(s: GameState, reserved: ReadonlySet<number>, fuse: boolean): DropPlan | null {
  const taken = new Set<number>([...reserved, ...locked(s), ...bossPendingCells(s.boss)]);
  for (const d of s.drops) if (d.plan) taken.add(d.plan.idx).add(d.plan.land);
  const counts = new Map<string, number>();
  for (const g of s.grid) if (g) counts.set(g.family + g.rank, (counts.get(g.family + g.rank) ?? 0) + 1);
  const options: DropPlan[] = [];
  s.grid.forEach((g, idx) => {
    if (!g || g.rank >= capOf(s, g.family) || taken.has(idx) || (counts.get(g.family + g.rank)! % 2) === 0) return;
    if (fuse && g.rank > TUNING.kickbackMaxRank) return;
    const r = Math.floor(idx / COLS), c = idx % COLS;
    for (const [dr, dc] of [[-1, 0], [0, 1], [1, 0], [0, -1]]) {
      const rr = r + dr, cc = c + dc;
      if (rr < 0 || rr >= ROWS || cc < 0 || cc >= COLS) continue;
      const n = idxOf(rr, cc);
      if (!s.grid[n] && !taken.has(n)) options.push({ idx, land: n, id: g.id });
    }
  });
  if (!options.length) return null;
  const rng = new Rng(s.kickRng);
  const pick = options[rng.int(options.length)];
  s.kickRng = rng.state;
  return pick;
}

function queueDrop(s: GameState, ev: GameEvent[], fuse: boolean) {
  if (!TUNING.kickback || s.target < 0 || s.noKickback) return;
  const f = fuse && TUNING.kickbackFuse;
  const plan = planDrop(s, new Set(), f);
  s.drops.push({ t: TUNING.kickbackFall, fuse: f, plan });
  ev.push({ type: 'kickbackIncoming', land: plan?.land ?? -1, into: f ? (plan?.idx ?? -1) : -1 });
}

/** Cells promised to falling parts; deliveries avoid them. */
export function dropReserved(s: GameState): number[] {
  return s.drops.flatMap((d) => (d.plan ? [d.plan.land] : []));
}

/** A loose part lands next to a lonely gadget and (threshold drops) fuses with it: one bounded secondary cascade. */
function landDrop(s: GameState, reserved: ReadonlySet<number>, ev: GameEvent[], fuse: boolean, planned: DropPlan | null) {
  const valid = (p: DropPlan | null) => !!p && s.grid[p.idx]?.id === p.id && !s.grid[p.land] && !reserved.has(p.land) && !bossPendingCells(s.boss).includes(p.land);
  const pick = valid(planned) ? planned : planDrop(s, reserved, fuse);
  if (pick) {
    const old = s.grid[pick.idx]!;
    if (!fuse) {
      // plain drop: a matching part waits next to its partner for the player to merge
      const g = makeGadget(s, old.family, old.rank);
      s.grid[pick.land] = g;
      ev.push({ type: 'kickback', idx: pick.land, into: -1, gadget: g });
      return;
    }
    s.stats.kickFuses++;
    const g = makeGadget(s, old.family, old.rank + 1);
    if (old.primed) g.primed = true;
    if (old.item) g.item = { ...old.item };
    if (g.family === 'cannon') g.cd = cannonPeriod(s);
    s.grid[pick.idx] = g;
    s.stats.bestRank = Math.max(s.stats.bestRank, g.rank);
    ev.push({ type: 'kickback', idx: pick.land, into: pick.idx, gadget: g });
    const result = resolveCascade(s.grid, pick.idx, { perks: s.perks, overdrive: s.odLeft > 0, reserved: new Set(dropReserved(s)), locked: locked(s), ...bossCascadeMods(s.boss), unitMult: s.unitMult, unitLevel: s.unitLevel });
    applyMoves(s, result);
    s.stats.biggestChain = Math.max(s.stats.biggestChain, result.count);
    ev.push({ type: 'cascade', result, damage: result.total, overdriveStart: false, kickback: true });
    applyDamage(s, result.total, ev, 'kick');
    return;
  }
  const rng = new Rng(s.kickRng);  // nothing lonely with room: drop a plain part
  const fam = ([shooterOf(s), relayOf(s, 0), relayOf(s, 1)] as Family[])[rng.int(3)];
  s.kickRng = rng.state;
  const g = makeGadget(s, fam, 1);
  const lk = locked(s); // never drop a part into a blocked corner / locked row (bug found by the r19 fast-bot sweep)
  const slot = s.grid.findIndex((x, i) => !x && !reserved.has(i) && !lk.has(i) && !bossPendingCells(s.boss).includes(i));
  if (slot >= 0) {
    s.grid[slot] = g;
    ev.push({ type: 'kickback', idx: slot, into: -1, gadget: g });
  } else if (s.pending.length < TUNING.maxPending) s.pending.unshift(g);
}