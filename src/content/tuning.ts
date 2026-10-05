// All balance numbers live here. Change these first when tuning.
export const ROWS = 6;
export const COLS = 5;
export const MAX_RANK = 6;
export const TICK = 0.05;

export const TUNING = {
  rankMult: 2.25,
  base: { cannon: 10, coil: 4, bell: 3 } as Record<string, number>,
  cannonPeriod: 3.0,
  cannonPeriodOverdrive: 0.8,
  coilChargePerRank: 0.35,
  comboSlope: 0.08,
  comboCap: 3.0,
  overdriveFactor: 1.5,
  overdriveMerges: 6,
  overdriveDuration: 6,
  /** Fallback / last delivery interval. */
  supplyPeriod: 3.4,
  /** Slowing delivery: [until active second, interval]. Late pressure = clock, not sorting. */
  supplyCurve: [[15, 2.1], [45, 2.4], [90, 2.85]] as [number, number][],
  /** Occupancy guard: hold deliveries in the tray at holdAt filled cells, resume at releaseAt. */
  holdAt: 25,
  releaseAt: 22,
  maxPending: 3,
  bag: { cannon: 6, coil: 4, bell: 2 } as Record<string, number>,
  runTime: 135,
  // tuned for hybrid kickback + payload cannons + family filter + slowing supply (see DESIGN.md sim table)
  targetHp: [1200, 11250, 18000],
  hardHpMult: 1.4,
  mergeCooldown: 0.1,
  demoHp: 20,
  /** Passive (auto) cannon shots deal this fraction of a cascade shot. 1 = rev3 rules. */
  passiveMult: 0.33,
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
};

export type Tuning = typeof TUNING;
