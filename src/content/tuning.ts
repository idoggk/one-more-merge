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
  supplyPeriod: 2.2,
  maxPending: 3,
  bag: { cannon: 6, coil: 4, bell: 2 } as Record<string, number>,
  runTime: 135,
  // x2 of rev3 after kickback + payload cannons (see tools/sim.ts)
  targetHp: [6400, 32000, 52000],
  mergeCooldown: 0.1,
  demoHp: 20,
  /** Passive (auto) cannon shots deal this fraction of a cascade shot. 1 = rev3 rules. */
  passiveMult: 0.33,
  /** Kickback: target panels / big cascades drop a part that fuses with a lonely match. */
  kickback: true,
  kickbackFall: 0.6,
  bigCascade: 8,
  bigCascadeCooldown: 8,
};

export type Tuning = typeof TUNING;
