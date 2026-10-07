// BOSS RUSH (ChatGPT round 29, BOSS_RUSH_RULES.md): three fights a week — a beaten mini-boss, then two different
// beaten chapter bosses — each on a fresh board with event rules (rank cap 6, copy cap 4, no helpers / Rocket /
// boosters). The weekly course is seeded from the week number and the sorted eligible pools, so it never touches
// board RNG and stays fixed for the week.
import { LEVELS, type LevelDef } from '../content/levels';
import rushHp from '../content/rush.json';
import { BOSSES, CHAPTER_BOSS } from './boss';
import { newLevel, type GameState } from './game';
import { Rng } from './rng';

/** Week index that rolls over at Monday 00:00 UTC (epoch day 0 was a Thursday). */
export const weekId = (now = Date.now()) => Math.floor((Math.floor(now / 86400000) + 3) / 7);
export const RUSH_REWARDS = [8, 18, 40]; // cumulative weekly Bolts for clearing 1 / 2 / 3 fights
export const RUSH_CLOCK = { mini: 60, boss: 75 };
export const RUSH_TARGETS = [0.85, 0.8, 0.75];

/** The saga level where a boss / mini-boss lives. */
export function bossLevel(id: string): number {
  const mini = LEVELS.find((d) => d.mini_boss === id);
  if (mini) return mini.level;
  const k = CHAPTER_BOSS.indexOf(id);
  return k >= 0 ? (k + 1) * 10 : -1;
}

export function rushCourse(week: number, minis: string[], bosses: string[]): string[] | null {
  const m = [...minis].sort(), b = [...bosses].sort();
  if (!m.length || b.length < 2) return null;
  const rng = new Rng((week * 0x9e3779b1) >>> 0 || 1);
  const first = m[rng.int(m.length)];
  const pick = rng.shuffle(b).slice(0, 2);
  return [first, ...pick];
}

/** Fitted Rush HP for (boss, fight slot); falls back to 60% of the saga HP. */
export function rushHpFor(id: string, slot: number): number {
  const t = (rushHp as Record<string, number[]>)[id];
  if (t?.[slot]) return t[slot];
  const lv = bossLevel(id);
  return Math.round((LEVELS[lv - 1]?.hp ?? 20000) * 0.6);
}

export function rushDef(id: string, slot: number, hp?: number): LevelDef {
  const lv = bossLevel(id);
  const base = LEVELS[lv - 1];
  const mini = !!BOSSES.find((b) => b.id === id)?.mini;
  return { ...base, hp: hp ?? rushHpFor(id, slot), time_seconds: mini ? RUSH_CLOCK.mini : RUSH_CLOCK.boss, starting_rank: 2, ordinary_copy_rank_cap: 4, star_times: undefined, item_teach: undefined, seed: (base.seed * 31 + slot * 7919) >>> 0 };
}

/** A fresh Rush fight: the boss's own attacks, event board rules, its own clock. */
export function newRushFight(id: string, slot: number, week: number, hp?: number): GameState {
  const def = rushDef(id, slot, hp);
  const s = newLevel({ ...def, seed: (def.seed ^ (week * 2654435761)) >>> 0 }, { shooter: 'cannon' });
  s.rankCap = 6;
  s.timeLeft = s.levelTime = def.time_seconds;
  s.rush = { id, slot, week };
  return s;
}
