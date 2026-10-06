// SAGA levels (ChatGPT round 15, LEVELS_001_060.json): one monster, one board, one clock per level.
// HP is absolute (UNVALIDATED_PROTOTYPE upstream; calibrated in tools/sim.ts level mode before trusting).
import raw from './levels.json';
import econ from './levelEconomy.json';

export type Difficulty = 'NORMAL' | 'HARD' | 'MEGA_HARD';
export type LevelModifier = 'NONE' | 'SUCTION' | 'JAM' | 'ROW_GAPS' | 'CORNERS_2' | 'CORNERS_4';
export interface LevelDef {
  level: number;
  monster: string;
  hp: number;
  time_seconds: number;
  modifier: LevelModifier;
  difficulty: Difficulty;
  boss_node: boolean;
  starting_rank: number;
  seed: number;
  ordinary_copy_rank_cap: number;
}

export const LEVELS: LevelDef[] = (raw as unknown as { levels: LevelDef[] }).levels;
export const STARTING_CELLS = (raw as unknown as { starting_cells: Record<'shooter' | 'coil' | 'bell', [number, number][]> }).starting_cells;
export const SUPPLY_SECONDS: number[] = (raw as { supply_seconds: number[] }).supply_seconds;
export const SUPPLY_FRACTIONS: number[] = (raw as { supply_phase_base_time_fractions: number[] }).supply_phase_base_time_fractions;

/** Monster name -> target index (art + names in TARGET_NAMES). */
export const MONSTER_INDEX: Record<string, number> = { tin_can: 0, mad_fridge: 1, junkzilla: 2, vacuum_viper: 3, toaster_twins: 4, grand_piano_saurus: 5 };

export const levelDef = (n: number): LevelDef | undefined => LEVELS[n - 1];

export const MODIFIER_TEXT: Record<LevelModifier, string> = {
  NONE: '',
  SUCTION: 'Suction: every 18s it slurps your weakest UNPAIRED part. Merge or move it away!',
  JAM: 'Jam: every 16s it jams an empty cell for 5s.',
  ROW_GAPS: 'Row gaps: every 20s it blocks the empty cells of a row for 4s.',
  CORNERS_2: 'Two corners of the board are blocked.',
  CORNERS_4: 'All four corners of the board are blocked.',
};

/** Stars: 1 clear, 2 if elapsed <= 80% of the level time, 3 if <= 60%. */
export function starsFor(def: LevelDef, elapsed: number): number {
  if (elapsed <= def.time_seconds * 0.6) return 3;
  if (elapsed <= def.time_seconds * 0.8) return 2;
  return 1;
}

export interface LevelReward {
  win_bolts: number;
  first_clear_bolts: number;
  new_star_bolts: number;
  free_jumpstart: number;
  free_time_capsule: number;
}
const TABLE = (econ as { levels: (LevelReward & { level: number })[] }).levels;
export const PRICES = (econ as { prices: { jumpstart_kit: number; time_capsule: number } }).prices;
export const BOOSTER_UNLOCK = (econ as { unlock_levels: { jumpstart_kit: number; time_capsule: number } }).unlock_levels;

/** Rewards for a level (table for 1-20, the r15 rule beyond: Normal 8+12, Hard 10+18, Mega 12+28, 3 per new star). */
export function levelReward(def: LevelDef): LevelReward {
  const t = TABLE.find((x) => x.level === def.level);
  if (t) return t;
  const [w, f] = def.difficulty === 'MEGA_HARD' ? [12, 28] : def.difficulty === 'HARD' ? [10, 18] : [8, 12];
  return { win_bolts: w, first_clear_bolts: f, new_star_bolts: 3, free_jumpstart: 0, free_time_capsule: 0 };
}
