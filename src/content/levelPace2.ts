// LEVEL PACE 2 (t-a177b529, docs/design/LEVEL_PACE_REFIT.md): the 80 saga levels refitted to a minimum clear time (about 1 min early,
// about 2 min later). The numbers live in levelPace2.json, WRITTEN BY TOOLS (tools/sim-levels.ts --pace2, tools/star-times.ts --pace2,
// tools/fit-goals.ts --pace2); never edit them by hand. levels.json is untouched, so the flags-off golden does not move.
// The flag lives outside TUNING (like RESOURCE_FLY) so the golden's TUNING digest stays unchanged. ON overwrites hp / minion_hp /
// time_seconds / star_times / goal.n of the listed levels in LEVELS IN PLACE (every reader sees them); OFF restores the originals.
// It takes effect for the next level that starts.
import raw from './levelPace2.json';
import { LEVELS, type LevelDef } from './levels';

export interface PaceEntry {
  hp: number;
  minion_hp?: number;
  time_seconds: number;
  star_times?: [number, number];
  /** goal.n of a rank / chain goal level (only when the refit changed it) */
  goal_n?: number;
  /** labelled MANIA level: shorter and intense on purpose */
  mania?: boolean;
  /** the clear-time floor in seconds (tools/write-floors.ts); LEVEL TIMELINE sizes its armor clock from it */
  floor_s?: number;
}
export const PACE2_DATA = (raw as unknown as { levels: Record<string, PaceEntry> }).levels;
export const LEVEL_PACE2_KEY = 'omm_qa_level_pace2';
export const LEVEL_PACE2 = { on: false };

type Saved = Pick<LevelDef, 'hp' | 'minion_hp' | 'time_seconds' | 'star_times' | 'goal'>;
const ORIGINAL = new Map<number, Saved>();

/** Apply (on) or restore (off) the refitted numbers in LEVELS. `data` is injectable for tests and for the tools (which fit from the base levels). */
export function applyLevelPace2(on: boolean, data: Record<string, PaceEntry> = PACE2_DATA) {
  LEVEL_PACE2.on = on;
  for (const def of LEVELS) {
    if (!ORIGINAL.has(def.level)) ORIGINAL.set(def.level, { hp: def.hp, minion_hp: def.minion_hp, time_seconds: def.time_seconds, star_times: def.star_times, goal: def.goal && { ...def.goal } });
    const o = ORIGINAL.get(def.level)!;
    const e = on ? data[String(def.level)] : undefined;
    def.hp = e?.hp ?? o.hp;
    def.minion_hp = e ? e.minion_hp ?? o.minion_hp : o.minion_hp;
    def.time_seconds = e?.time_seconds ?? o.time_seconds;
    def.star_times = e?.star_times ?? o.star_times;
    def.goal = o.goal && { ...o.goal, ...(e?.goal_n !== undefined ? { n: e.goal_n } : {}) };
    if (def.minion_hp === undefined) delete def.minion_hp;
    if (def.star_times === undefined) delete def.star_times;
    if (def.goal === undefined) delete def.goal;
  }
}
export function storedLevelPace2(read: () => string | null): boolean {
  try {
    return read() === 'on';
  } catch {
    return false;
  }
}
