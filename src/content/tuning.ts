// All balance numbers live here. Change these first when tuning.
export const ROWS = 6;
export const COLS = 5;
export const MAX_RANK = 6;
export const TICK = 0.05;

export type Pace = 'today' | 'calm' | 'mania';

/** PACE prototype (t-1bef1042, owner: "too much happening, I can't think" + special craze/MANIA levels). A pace block is
 *  copied onto TUNING by applyPace() (src/content/experiments.ts); TODAY = the live game and the TUNING defaults below.
 *  react*: a merge earns 2 parts below reactTwo parts on the board, 1 below reactCap; the first lands reactDelay s after
 *  the merge, the rest reactGap s apart. Boss: hazards every bossEvery s (first at 8 s) with bossWarn s of warning; an
 *  ordinary monster's light behaviour first at 10 s, then every lightEvery s; bossAttacks false = none at all.
 *  breather: s of quiet after a machine breaks (no supply, no boss warning) while the next walks in. quietPassive: small
 *  auto-shot effect, no damage number. antiSpam false forces the A2/A3 experiments off. odChain = Overdrive fill under A2/A3. */
const TODAY_PACE = {
  reactTwo: 12,
  reactCap: 18,
  reactDelay: 0.6,
  reactGap: 0.35,
  matchShare: 0.6,
  bigCascade: 8,
  bigCascadeCooldown: 8,
  kickbackFuse: true,
  bossEvery: 12,
  bossWarn: 2.5,
  lightEvery: 15,
  bossAttacks: true,
  overdriveMerges: 6,
  odChain: 12,
  breather: 0,
  quietPassive: false,
  antiSpam: true,
};
export type PaceBlock = typeof TODAY_PACE;

export const TUNING = {
  pace: 'today' as Pace,
  paces: {
    today: { ...TODAY_PACE },
    /** Think between merges: a smaller board, a quick burst per merge, no auto-fuse, rarer hazards, a breather per kill. */
    // tools/pace-probe.ts: the design odChain 28 left A3 at Overdrive 26% @3.5 s (target <= 25%) -> 32. Arrivals sit
    // at the 22/min edge; big drop chain 10 or reactTwo 9 trimmed them but cost the smart bot wins (L22 0%), so no.
    calm: { ...TODAY_PACE, reactTwo: 10, reactCap: 15, reactDelay: 0.5, reactGap: 0.15, matchShare: 0.45, bigCascade: 8, bigCascadeCooldown: 12, kickbackFuse: false, bossEvery: 16, bossWarn: 3.5, lightEvery: 18, overdriveMerges: 9, odChain: 32, breather: 2.5, quietPassive: true },
    /** Labelled craze level: a big, fast board, lots of matches and kickback, frequent Overdrive, no hazards. */
    // probe: design reactTwo 14 / Overdrive 4 merges settled the 1 s board at 15.6 and Overdrive @2 s at 56% (targets
    // 18-22, >= 60%) -> 19 / 3
    mania: { ...TODAY_PACE, reactTwo: 19, reactCap: 24, reactDelay: 0.3, reactGap: 0.15, matchShare: 0.85, bigCascade: 5, bigCascadeCooldown: 3, kickbackFuse: true, bossAttacks: false, overdriveMerges: 3, antiSpam: false },
  } as Record<Pace, PaceBlock>,
  ...TODAY_PACE,
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
  // matchShare (pace block): merge fest share of deliveries that copy a lonely gadget (always when no pair exists)
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
  // kickbackFuse (pace block): threshold drops auto-fuse; big-cascade drops (bigCascade+ chain, cooldown s) land beside a match
  /** Auto-fuse only into rank <= this, so Kickback never skips the player's expensive upgrades. */
  kickbackMaxRank: 2,
  kickbackFall: 0.6,
  /** EXPERIMENT (t-ce493a56, mid-level chaos Option A), default OFF: Overdrive charges by chain size (links past the
   *  merged part, odChain to fill), reactive parts are earned by chain size (1 per partsPerChain activations, at most
   *  maxEarn; a board under floorBelow parts still earns 1) and land at most one per `beat` s; matchmaker share drops. */
  optionA: false,
  optA: { odChain: 12, partsPerChain: 3, maxEarn: 3, floorBelow: 8, beat: 1.2, matchShare: 0.35 },
  /** EXPERIMENT (t-0c31a7ab, Option A2), default OFF: Overdrive charges by chain size (TUNING.odChain), supply as today
   *  (beat > 0 = earned parts land at most one per `beat` s), and anti-spam sits on DAMAGE per merge, never on input:
   *  (a) `chain`: a player cascade of n activations deals chainMult[n-1] (last entry repeats) of its damage;
   *  (b) `fatigue`: a merge `gap` s after the previous one deals clamp(gap / window, minMult, 1) of its damage, so
   *      merge damage per second can never beat one full merge per `window` s, however fast (or bursty) the taps.
   *  The merge itself always happens and always cascades; only the damage number changes. */
  optionA2: false,
  optA2: { chain: true, fatigue: true, chainMult: [0.6, 0.8, 1, 1.15, 1.3, 1.4], window: 1.5, minMult: 0.2, beat: 0 },
  /** EXPERIMENT (t-2c7cbae7, Option A3), default OFF; wins over optionA2 when both are on. Spam pays through board
   *  growth (every merge earns parts), so A3 gates the SUPPLY on a full board and keeps damage near-neutral:
   *  Overdrive charges by chain size (TUNING.odChain); a player cascade of n activations deals chainMult[n-1];
   *  a board holding more than gateAbove parts (grid + waiting + owed) pays a merge's reactive part(s) only when its
   *  cascade activates at least gateChain gadgets (thinner boards always earn: no starving). Probe knob `beat`: earned
   *  parts drip in at most one per beat s (0 = today's 0.35 s); a 2 s beat cut spam further but thinned the smart
   *  player's board (trivial decisions 6% -> 44-49%), so it stays 0 in the presets. Optional `fatigue`
   *  (A2 rule with window / minMult) shows a STEADY meter and dims the damage number. Merges are never blocked. */
  optionA3: false,
  optA3: { chainMult: [0.9, 1, 1, 1.05, 1.1, 1.15], gateChain: 2, gateAbove: 10, beat: 0, fatigue: false, window: 3, minMult: 0.2 },
  /** EXPERIMENT (t-a8c886ad, units option B stage B0), default OFF: the matchmaker copies helpers too and a helper puts
   *  b0.toyBag tokens in the bag (shooter 6, relay A 4, relay B 2, helper 2); Mortar hits x(orderBase + orderStep x machines
   *  already fired earlier in this chain), capped at orderCap (+capPerk with L3 Bigger Shell) instead of the depth bonus;
   *  Arc Welder arcs skip other Arc Welders. */
  unitsB0: false,
  b0: { toyBag: 2, orderBase: 0.8, orderStep: 0.1, orderCap: 2.0, capPerk: 0.15 },
  /** EXPERIMENT (t-4a966cee, units option B stage B1), default OFF; implies the B0 rules except where b1 overrides them.
   *  Each helper gets one direct job when it fires (merged or woken): one shared BOOSTED xN mark on a shooter (the
   *  closer the helper, the bigger: Battery x battery on a touching shooter, Amplifier x amp within 2 cells, Beacon
   *  x beacon anywhere; the strongest shooter it would raise, never stacking); Fan clears one touching junk / frost / lock
   *  or an attack aimed at one (else pushes as today when fanPush); Magnet fetches a matching part that lands next to a
   *  lonely twin (a ready pair). helperPass: a helper passes the chain on to its U/R/D/L neighbours (B0: helpers were
   *  dead ends that cost chains). Relays: Fuse Box reaches fuseReach cells along its diagonals; Horn also wakes its left /
   *  right neighbours (hornSides). Mortar order multiplier orderBase + orderStep per machine. Sims: DESIGN.md (units B1). */
  unitsB1: false,
  b1: { toyBag: 1, helperPass: true, battery: 2, amp: 1.6, beacon: 1.3, fanPush: true, fuseReach: 2, hornSides: true, orderBase: 0.85, orderStep: 0.12 },
  /** PROTOTYPE (t-1effe0bf, src/core/sandwich.ts), default 'today': a player merge whose landing cell touches 2+ more
   *  same-rank parts of its family absorbs two of them. 'sandwich2' = rank +2 (capped); 'sandwichBonus' = +1 as today
   *  plus sandwichOdShare of the Overdrive meter. Puzzles and kickback fuses never sandwich. */
  mergeRule: 'today' as 'today' | 'sandwich2' | 'sandwichBonus',
  sandwichOdShare: 1 / 3,
};

/** Units B0 rules are on (B0 itself, or B1, which builds on them). */
export const unitsB0On = () => TUNING.unitsB0 || TUNING.unitsB1;

export type Tuning = typeof TUNING;
