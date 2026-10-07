// SAGA levels (ChatGPT round 15, LEVELS_001_060.json): one monster, one board, one clock per level.
// HP is absolute (UNVALIDATED_PROTOTYPE upstream; calibrated in tools/sim.ts level mode before trusting).
import raw from './levels.json';
import econ from './levelEconomy.json';

export type Difficulty = 'NORMAL' | 'HARD' | 'MEGA_HARD';
export type LevelModifier = 'NONE' | 'SUCTION' | 'JAM' | 'ROW_GAPS' | 'CORNERS_2' | 'CORNERS_4' | 'GAPS';
/** r23 goal levels: the goal replaces defeating the monster. */
export type LevelGoal = { kind: 'rank' | 'chain'; n: number };
/** r23 ordinary-monster behaviours (one per level). */
export type Behaviour = 'shield' | 'suction' | 'frost' | 'hot' | 'rest';
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
  /** Teaching level (ChatGPT r18): scripted-but-real start board, optional delivery bag, features held back. */
  /** Seconds for 2 and 3 stars (tools/star-times.ts: ordinary human pace / skilled chain-seeker medians). */
  star_times?: [number, number];
  goal?: LevelGoal;
  behaviour?: Behaviour;
  /** Shooter family override for this level (r23: Rocket joins at L6). */
  shooter?: string;
  /** Extra starting pieces placed after the chapter starters: [family, rank, row, col]. */
  start_extra?: [string, number, number, number][];
  /** r25: the item this level teaches (prescribed for its one grant) and, on goal levels, when it is granted. */
  item_teach?: string;
  /** r28 visual cast: the character drawn for this level (mechanics stay with `monster`). Art key mon_<id>[_dmg]. */
  visual?: string;
  /** r27 mid-chapter mini-boss id (BOSSES entry with mini: true). */
  mini_boss?: string;
  item_grant_at?: number;
  teach?: { start: [string, number, number, number][]; bag?: Record<string, number>; no_kickback?: boolean; no_overdrive?: boolean; lesson: string };
}

export const LEVELS: LevelDef[] = (raw as unknown as { levels: LevelDef[] }).levels;
export const STARTING_CELLS = (raw as unknown as { starting_cells: Record<'shooter' | 'coil' | 'bell', [number, number][]> }).starting_cells;
export const SUPPLY_SECONDS: number[] = (raw as { supply_seconds: number[] }).supply_seconds;
export const SUPPLY_FRACTIONS: number[] = (raw as { supply_phase_base_time_fractions: number[] }).supply_phase_base_time_fractions;

/** r28 chapter cast (ChatGPT): display names for `visual` ids. */
export const CAST: Record<string, { name: string; short: string }> = {
  kettle_grump: { name: 'KETTLE GRUMP', short: 'KETTLE' },
  colander_clatter: { name: 'COLANDER CLATTER', short: 'COLANDER' },
  sock_cyclops: { name: 'SOCK CYCLOPS', short: 'CYCLOPS' },
  iron_duchess: { name: 'IRON DUCHESS', short: 'DUCHESS' },
  toolbox_terrier: { name: 'TOOLBOX TERRIER', short: 'TERRIER' },
  traffic_cone_goblin: { name: 'CONE GOBLIN', short: 'GOBLIN' },
  pixel_pug: { name: 'PIXEL PUG', short: 'PUG' },
  joystick_jester: { name: 'JOYSTICK JESTER', short: 'JESTER' },
  gramophone_goose: { name: 'GRAMOPHONE GOOSE', short: 'GOOSE' },
  accordion_imp: { name: 'ACCORDION IMP', short: 'IMP' },
  wheelie_warthog: { name: 'WHEELIE WARTHOG', short: 'WARTHOG' },
  satellite_scuttler: { name: 'SATELLITE SCUTTLER', short: 'SCUTTLER' },
  parcel_pup: { name: 'PARCEL PUP', short: 'PUP' },
  pallet_pal: { name: 'PALLET PAL', short: 'PALLET' },
  telescope_toad: { name: 'TELESCOPE TOAD', short: 'TOAD' },
  radar_rascal: { name: 'RADAR RASCAL', short: 'RASCAL' },
};

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
  GAPS: 'Two holes in the middle of the board.',
};

/** r23 behaviour card copy (ChatGPT). */
export const BEHAVIOUR_TEXT: Record<Behaviour, string> = {
  shield: 'Its shield blocks a quarter of your damage. Chains of 4 open it.',
  suction: 'Move marked machines before it slurps them.',
  frost: 'Frozen rows cannot receive machines. Build elsewhere.',
  hot: 'Shooters in the hot column hit half as hard. Move them out.',
  rest: 'Bells and Coils in the resting row cannot wake neighbours. Move them out.',
};

export const goalText = (g: LevelGoal) => (g.kind === 'rank' ? `MAKE A RANK ${g.n} MACHINE` : `FIRE A CHAIN OF ${g.n}`);

/** Stars: 1 clear, 2 if elapsed <= 80% of the level time, 3 if <= 60%. */
/** [2-star, 3-star] clear-time goals in seconds. */
export function starGoals(def: LevelDef): [number, number] {
  if (def.star_times) return def.star_times;
  const T = def.level % 10 === 0 ? 90 : def.time_seconds; // boss fights run a 90 s clock (r20)
  return [Math.floor(T * 0.8), Math.floor(T * 0.6)];
}

export function starsFor(def: LevelDef, elapsed: number): number {
  const [two, three] = starGoals(def);
  if (elapsed <= three) return 3;
  if (elapsed <= two) return 2;
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
