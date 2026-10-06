import { COLS, MAX_RANK, ROWS, TICK, TUNING } from '../content/tuning';
import { rawDamage, resolveCascade } from './cascade';
import { Rng } from './rng';
import { lockedCells, REMIX_OPPONENTS, remixTick, type RemixEvent, type RemixState } from './remix';
import type { CascadeResult, Family, Gadget, Grid, PerkId } from './types';

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
  | RemixEvent;

export interface Stats {
  merges: number;
  scraps: number;
  biggestChain: number;
  biggestHit: number;
  bestRank: number;
  totalDamage: number;
  dmgBy: Partial<Record<DmgSource, number>>;
  kickFuses: number;
}

export interface GameState {
  version: 1;
  seed: number;
  phase: Phase;
  practice: boolean;
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
  /** REMIX encounter (post-win mode), null in normal runs. */
  remix: RemixState | null;
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
export const locked = (s: GameState) => lockedCells(s.remix);

export function newGame(seed: number, tutorial = false, hard = false, toys: Family[] = [], remixTarget = -1): GameState {
  const s: GameState = {
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
  for (const [r, c, f] of START) s.grid[idxOf(r, c)] = makeGadget(s, f, 1);
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
    if (!g || g.rank >= MAX_RANK) continue;
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
  // bias toward low ranks so the board keeps flowing, but sometimes feed a high piece toward MAX
  const pool = lonely.slice(0, Math.min(lonely.length, 3));
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
  for (const f of Object.keys(TUNING.bag) as Family[]) for (let i = 0; i < TUNING.bag[f]; i++) bag.push(f);
  for (const f of s.toys ?? []) for (let i = 0; i < (TUNING.toyBag[f] ?? 0); i++) bag.push(f);
  rng.shuffle(bag);
  s.bag = bag;
  s.supplyRng = rng.state;
}

const nextShipmentRank = (s: GameState, ordinal: number) => (s.perks.includes('quality') && ordinal % 4 === 0 ? 2 : 1);

function generateShipment(s: GameState): Gadget {
  const mm = matchmakerPick(s, s.shipments + 1);
  if (mm) {
    s.shipments++;
    return makeGadget(s, mm.family, mm.rank);
  }
  if (!s.bag.length) refillBag(s);
  const fam = s.bag.shift()!;
  s.shipments++;
  return makeGadget(s, fam, nextShipmentRank(s, s.shipments));
}

export function supplyPeriod(s: GameState): number {
  for (const [until, p] of TUNING.supplyCurve) if (s.elapsed < until) return p;
  return TUNING.supplyPeriod;
}

export const isActive = (s: GameState) => s.phase === 'playing';

// ---------- player commands ----------

export type CommandResult = { ok: boolean; events: GameEvent[] };

export function canMerge(a: Gadget | null, b: Gadget | null): boolean {
  return !!a && !!b && a.family === b.family && a.rank === b.rank && a.rank < MAX_RANK;
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
  const b = s.grid[to];
  if (canMerge(a, b)) {
    if (s.mergeCd > 0) return { ok: false, events: ev };
    return merge(s, from, to);
  }
  // move / swap never fire anything
  s.grid[to] = a;
  s.grid[from] = b;
  ev.push({ type: 'move', from, to, swap: !!b });
  return { ok: true, events: ev };
}

function merge(s: GameState, from: number, to: number): CommandResult {
  const ev: GameEvent[] = [];
  const a = s.grid[from]!;
  const b = s.grid[to]!;
  const g = makeGadget(s, a.family, a.rank + 1);
  if (a.primed || b.primed) g.primed = true; // primer transfers (OR), never stacks
  s.grid[from] = null;
  s.grid[to] = g;
  s.stats.merges++;
  s.stats.bestRank = Math.max(s.stats.bestRank, g.rank);
  s.mergeCd = TUNING.mergeCooldown;

  let odStart = false;
  if (s.phase === 'playing') {
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

  const result = resolveCascade(s.grid, to, { perks: s.perks, overdrive: s.odLeft > 0, reserved: new Set(dropReserved(s)), locked: locked(s) });
  applyMoves(s, result);
  s.stats.biggestChain = Math.max(s.stats.biggestChain, result.count);
  s.stats.biggestHit = Math.max(s.stats.biggestHit, result.total);
  ev.push({ type: 'cascade', result, damage: result.total, overdriveStart: odStart, kickback: false });
  if (s.phase === 'playing' && TUNING.kickback && result.count >= TUNING.bigCascade && s.bigCd <= 0) {
    s.bigCd = TUNING.bigCascadeCooldown;
    queueDrop(s, ev, false);
  }
  applyDamage(s, result.total, ev, 'player');
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
  s.stats.totalDamage += dmg;
  s.stats.dmgBy[src] = (s.stats.dmgBy[src] ?? 0) + dmg;
  const before = s.hp;
  s.hp -= dmg;
  if (s.target >= 0) {
    const frac = Math.max(0, s.hp) / s.maxHp;
    const lvl = frac <= 0.25 ? 3 : frac <= 0.5 ? 2 : frac <= 0.75 ? 1 : 0;
    if (lvl > s.thresholds && s.hp > 0) {
      for (let l = s.thresholds + 1; l <= lvl; l++) queueDrop(s, ev, true);
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
  const final = !!s.remix || s.target === TUNING.targetHp.length - 1;
  s.thresholds = 3;
  ev.push({ type: 'kill', target: s.target, final, demo: false });
  if (final) {
    s.phase = 'won';
    if (s.remix) s.remix.pending = s.remix.lock = null;
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
      const dmg = rawDamage('cannon', g.rank) * TUNING.passiveMult;
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

  // Supply
  admitPending(s, reserved, ev);
  if (s.pending.length < TUNING.maxPending) {
    s.supplyTimer -= dt;
    if (s.supplyTimer <= 0) {
      s.supplyTimer += supplyPeriod(s);
      s.pending.push(generateShipment(s));
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
  const promised = new Set([...dropReserved(s), ...locked(s)]);
  const slot = s.grid.findIndex((g, i) => !g && !reserved.has(i) && !promised.has(i));
  if (slot < 0) return;
  const g = s.pending.shift()!;
  s.grid[slot] = g;
  ev.push({ type: 'delivery', idx: slot, gadget: g });
}

export function legalPairs(s: GameState): [number, number][] {
  const out: [number, number][] = [];
  for (let i = 0; i < s.grid.length; i++)
    for (let j = i + 1; j < s.grid.length; j++) if (canMerge(s.grid[i], s.grid[j])) out.push([i, j]);
  return out;
}

/** Dry-run preview: how many gadgets would fire if `from` merged into `to`. Never mutates. */
export function previewMerge(s: GameState, from: number, to: number): CascadeResult | null {
  const a = s.grid[from];
  const b = s.grid[to];
  if (!canMerge(a, b)) return null;
  const grid = s.grid.slice();
  grid[from] = null;
  grid[to] = { id: -1, family: a!.family, rank: a!.rank + 1, cd: 0 };
  return resolveCascade(grid, to, { perks: s.perks, overdrive: s.odLeft > 0, reserved: new Set(dropReserved(s)), locked: locked(s) });
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
  const taken = new Set<number>([...reserved, ...locked(s)]);
  for (const d of s.drops) if (d.plan) taken.add(d.plan.idx).add(d.plan.land);
  const counts = new Map<string, number>();
  for (const g of s.grid) if (g) counts.set(g.family + g.rank, (counts.get(g.family + g.rank) ?? 0) + 1);
  const options: DropPlan[] = [];
  s.grid.forEach((g, idx) => {
    if (!g || g.rank >= MAX_RANK || taken.has(idx) || (counts.get(g.family + g.rank)! % 2) === 0) return;
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
  if (!TUNING.kickback || s.target < 0) return;
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
  const valid = (p: DropPlan | null) => !!p && s.grid[p.idx]?.id === p.id && !s.grid[p.land] && !reserved.has(p.land);
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
    if (g.family === 'cannon') g.cd = cannonPeriod(s);
    s.grid[pick.idx] = g;
    s.stats.bestRank = Math.max(s.stats.bestRank, g.rank);
    ev.push({ type: 'kickback', idx: pick.land, into: pick.idx, gadget: g });
    const result = resolveCascade(s.grid, pick.idx, { perks: s.perks, overdrive: s.odLeft > 0, reserved: new Set(dropReserved(s)), locked: locked(s) });
    applyMoves(s, result);
    s.stats.biggestChain = Math.max(s.stats.biggestChain, result.count);
    ev.push({ type: 'cascade', result, damage: result.total, overdriveStart: false, kickback: true });
    applyDamage(s, result.total, ev, 'kick');
    return;
  }
  const rng = new Rng(s.kickRng);  // nothing lonely with room: drop a plain part
  const fam = (['cannon', 'coil', 'bell'] as Family[])[rng.int(3)];
  s.kickRng = rng.state;
  const g = makeGadget(s, fam, 1);
  const slot = s.grid.findIndex((x, i) => !x && !reserved.has(i));
  if (slot >= 0) {
    s.grid[slot] = g;
    ev.push({ type: 'kickback', idx: slot, into: -1, gadget: g });
  } else if (s.pending.length < TUNING.maxPending) s.pending.unshift(g);
}