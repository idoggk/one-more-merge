// All balance numbers live here. Change these first when tuning.
export const ROWS = 6;
export const COLS = 5;
export const MAX_RANK = 6;
export const TICK = 0.05;

export const TUNING = {
  /** Clarity ruleset (playtest: "I don't understand what each machine does"; ChatGPT r14): Coil = fixed 2-cell cross,
   *  Bell = its row, no coil charge bonus, rank only changes damage, MAX signatures off (visual only). false = legacy. */
  clarity: true,
  rankMult: 2.25,
  // rocket = chain-only shooter, 1.3x a cannon full shot (r14 said 1.5; sim: 1.5 beat Cannon teams by ~12% clear time)
  base: { cannon: 10, coil: 4, bell: 3, magnet: 0, battery: 0, fan: 0, rocket: 13, mortar: 11, arc_welder: 10, horn: 3, fuse_box: 4, amplifier: 0, signal_beacon: 0 } as Record<string, number>,
  cannonPeriod: 3.0,
  cannonPeriodOverdrive: 0.8,
  coilChargePerRank: 0.35,
  comboSlope: 0.08,
  comboCap: 3.0,
  overdriveFactor: 1.5,
  overdriveMerges: 6,
  overdriveDuration: 6,
  /** Fallback / last delivery interval. */
  supplyPeriod: 2.4,
  /** Slowing delivery: [until active second, interval]. Late pressure = clock, not sorting. */
  supplyCurve: [[15, 1.7], [45, 1.9], [90, 2.1]] as [number, number][],
  /** Occupancy guard: hold deliveries in the tray at holdAt filled cells, resume at releaseAt. */
  holdAt: 25,
  releaseAt: 22,
  maxPending: 3,
  /** Round 19: low-board delivery packets (2-3 parts per deadline) so fast players keep a board to build on. */
  packets: true,
  /** Merge fest: share of deliveries that copy a lonely gadget on the board (always when no pair exists). */
  matchShare: 0.6,
  bag: { cannon: 6, coil: 4, bell: 2 } as Record<string, number>,
  /** Unlocked toys add these tokens to the 12-token bag. */
  toyBag: { magnet: 1, battery: 1, fan: 1, amplifier: 1, signal_beacon: 1 } as Record<string, number>,
  runTime: 135,
  // tuned for hybrid kickback + payload cannons + family filter + slowing supply (see DESIGN.md sim table)
  // merge fest (playtest 3): faster supply + matchmaker, HP x1.2 keeps the novice bot ~85% (DESIGN.md)
  // clarity ruleset (fixed shapes, no hidden coil bonus) deals less: HP x0.55 restores novice ~86% (DESIGN.md)
  targetHp: [800, 7400, 11900],
  hardHpMult: 1.4,
  /** Battery-primed cannon: next chain shot x this. */
  batteryBonus: 1.5,
  demoHp: 20,
  /** Passive (auto) cannon shots deal this fraction of a cascade shot. 1 = rev3 rules. */
  passiveMult: 0.15,
  /** r24: one cascade deals at most this share of a saga monster's max HP (Ido: 'a big merge just wins my level'). */
  cascadeCap: 0.35,
  /** Kickback: target panels / big cascades drop a part that fuses with a lonely match. */
  kickback: true,
  /** false = bells never ring bells, coils never zap coils (limits whole-board chains). */
  sameFamilyRelay: false,
  /** Threshold drops auto-fuse; big-cascade drops just land beside a match. */
  kickbackFuse: true,
  /** Auto-fuse only into rank <= this, so Kickback never skips the player's expensive upgrades. */
  kickbackMaxRank: 2,
  kickbackFall: 0.6,
  bigCascade: 8,
  bigCascadeCooldown: 8,
  /** EXPERIMENT (t-ce493a56, mid-level chaos Option A), default OFF: Overdrive charges by chain size (links past the
   *  merged part, odChain to fill), reactive parts are earned by chain size (1 per partsPerChain activations, at most
   *  maxEarn; a board under floorBelow parts still earns 1) and land at most one per `beat` s; matchmaker share drops. */
  optionA: false,
  optA: { odChain: 12, partsPerChain: 3, maxEarn: 3, floorBelow: 8, beat: 1.2, matchShare: 0.35 },
  /** EXPERIMENT (t-0c31a7ab, Option A2), default OFF: Overdrive charges by chain size (optA.odChain), supply as today
   *  (beat > 0 = earned parts land at most one per `beat` s), and anti-spam sits on DAMAGE per merge, never on input:
   *  (a) `chain`: a player cascade of n activations deals chainMult[n-1] (last entry repeats) of its damage;
   *  (b) `fatigue`: a merge `gap` s after the previous one deals clamp(gap / window, minMult, 1) of its damage, so
   *      merge damage per second can never beat one full merge per `window` s, however fast (or bursty) the taps.
   *  The merge itself always happens and always cascades; only the damage number changes. */
  optionA2: false,
  optA2: { chain: true, fatigue: true, chainMult: [0.6, 0.8, 1, 1.15, 1.3, 1.4], window: 1.5, minMult: 0.2, beat: 0 },
  /** EXPERIMENT (t-2c7cbae7, Option A3), default OFF; wins over optionA2 when both are on. Spam pays through board
   *  growth (every merge earns parts), so A3 gates the SUPPLY on a full board and keeps damage near-neutral:
   *  Overdrive charges by chain size (optA.odChain); a player cascade of n activations deals chainMult[n-1];
   *  a board holding more than gateAbove parts (grid + waiting + owed) pays a merge's reactive part(s) only when its
   *  cascade activates at least gateChain gadgets (thinner boards always earn: no starving). Probe knob `beat`: earned
   *  parts drip in at most one per beat s (0 = today's 0.35 s); a 2 s beat cut spam further but thinned the smart
   *  player's board (trivial decisions 6% -> 44-49%), so it stays 0 in the presets. Optional `fatigue`
   *  (A2 rule with window / minMult) shows a STEADY meter and dims the damage number. Merges are never blocked. */
  optionA3: false,
  optA3: { chainMult: [0.9, 1, 1, 1.05, 1.1, 1.15], gateChain: 2, gateAbove: 10, beat: 0, fatigue: false, window: 3, minMult: 0.2 },
};

export type Tuning = typeof TUNING;
