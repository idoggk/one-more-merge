// ENDLESS ROAD (r40, ChatGPT's #1 next feature for Ido's "players will run out of levels"): after Level 80, an endless
// remix of the saga. Floors are built from existing calibrated levels (chapters 4-8), so every floor is a real,
// tested level with the same rules; only HP grows. Blocks of 10: floor 5 = a mini-boss level, floor 10 = a boss level.
// Pure + deterministic: floor n always builds the same level.
import { LEVELS, type LevelDef } from '../content/levels';

/** The saga level that must be cleared to open the Endless Road. */
export const ENDLESS_UNLOCK = 80;
/** HP: +5% per floor inside a block of 10, and every new block multiplies the base by this. */
export const ENDLESS_FLOOR_STEP = 0.05;
export const ENDLESS_BLOCK_GROWTH = 1.12;

const hash = (n: number) => {
  let h = (n * 2654435761) >>> 0;
  h ^= h >>> 15;
  h = Math.imul(h, 0x2c1b3c6d) >>> 0;
  return (h ^ (h >>> 12)) >>> 0;
};

export const endlessPos = (floor: number) => ((floor - 1) % 10) + 1;
export const endlessBlock = (floor: number) => Math.floor((floor - 1) / 10);

export function endlessDef(floor: number): LevelDef {
  const pos = endlessPos(floor);
  const pool =
    pos === 10
      ? LEVELS.filter((l) => l.level % 10 === 0 && l.level >= 30)
      : pos === 5
        ? LEVELS.filter((l) => !!l.mini_boss && l.level >= 28)
        : LEVELS.filter((l) => l.level >= 31 && l.level % 10 !== 0 && !l.mini_boss && !l.teach);
  const t = pool[hash(floor) % pool.length];
  const k = (1 + ENDLESS_FLOOR_STEP * (pos - 1)) * Math.pow(ENDLESS_BLOCK_GROWTH, endlessBlock(floor));
  const r50 = (x: number) => Math.round(x / 50) * 50;
  return {
    ...t,
    hp: r50(t.hp * k),
    ...(t.minion_hp ? { minion_hp: r50(t.minion_hp * k) } : {}),
    seed: (t.seed ^ hash(floor + 7919)) >>> 0,
    star_times: undefined,
    item_teach: undefined,
  };
}

/** Rewards for a first clear of floor n (replays pay a quarter of the Bolts, no crates). */
export function endlessReward(floor: number, first: boolean): { bolts: number; crate?: 'wood' | 'iron' | 'gold' } {
  if (!first) return { bolts: 2 };
  const pos = endlessPos(floor);
  return { bolts: 8, crate: floor % 30 === 0 ? 'gold' : pos === 10 ? 'iron' : pos === 5 ? 'wood' : undefined };
}
