import { CHALLENGES } from '../content/sceneCopy';
import { STARTER_UNITS } from '../content/units';
import type { Family } from '../core/types';

/**
 * t-2fd7bb86 staggered unlocks (owner: "fewer unlocks in levels 2-6"). Before this, clearing level 5 set
 * `hardUnlocked` and opened Challenge, Remix, Workshop, TEAM and every guide page at once. Now each feature
 * opens on its own step and carries a NEW cue until the player first opens it. Unlocks are sticky: once
 * earned (or migrated from an older save) they never close again.
 */
export const FEATURES = ['team', 'challenge', 'workshop', 'puzzles', 'remix', 'gems'] as const;
export type Feature = (typeof FEATURES)[number];

/** Levels cleared that open a feature (TEAM opens with the first non-starter unit, Gems with the first gem). */
export const UNLOCK_LEVEL: Partial<Record<Feature, number>> = { challenge: 8, workshop: 10, puzzles: 12, remix: 14 };

export const FEATURE_INFO: Record<Feature, { name: string; where: string }> = {
  team: { name: 'TEAM', where: 'MACHINE tab' },
  challenge: { name: 'CHALLENGE', where: 'EVENTS > Other modes' },
  workshop: { name: 'WORKSHOP', where: 'MACHINE tab' },
  puzzles: { name: 'DAILY PUZZLE', where: 'EVENTS tab' },
  remix: { name: 'REMIX', where: 'EVENTS > Other modes' },
  gems: { name: 'GEMS', where: 'top bar' },
};

export interface UnlockMeta {
  levelStars?: Record<string, number>;
  units?: Record<string, { level: number; cards: number }>;
  toys: Partial<Record<string, boolean>>;
  gems?: number;
  owned?: string[];
  hardUnlocked: boolean;
  unlocks?: Partial<Record<Feature, boolean>>;
  unlockSeen?: Partial<Record<Feature, boolean>>;
}

/**
 * t-0a294f99 (walkthrough F2): helper toys (NEW TOY toasts) and TEAM wait until the player reaches this saga level.
 * Before, an accidental 3-cannon chain in L1 unlocked the Magnet and opened TEAM.
 */
export const TOY_LEVEL = 8;
/** May toy challenges unlock helpers now (`level` = highest saga level reached)? */
export const toysOpen = (level: number) => level >= TOY_LEVEL;

/**
 * The toy whose challenge this cascade beats, or null. `level` = highest saga level reached (nothing before TOY_LEVEL).
 * Challenges run in order (the first toy not yet owned): 3 cannons in one chain, merge a Magnet-pulled gadget, a Battery discharge.
 */
export function toyEarned(
  level: number,
  toys: Partial<Record<string, boolean>>,
  r: { activations: { family: string }[]; discharged: unknown[] },
  kickback: boolean,
  pulledMerge: boolean,
): Family | null {
  if (!toysOpen(level)) return null;
  const ch = CHALLENGES.find((c) => !(c.toy in toys));
  if (!ch) return null;
  if (ch.toy === 'magnet' && !kickback && r.activations.filter((a) => a.family === 'cannon').length >= 3) return 'magnet';
  if (ch.toy === 'battery' && !kickback && pulledMerge) return 'battery';
  if (ch.toy === 'fan' && r.discharged.length) return 'fan';
  return null;
}

/**
 * A toy challenge was beaten: the toy joins the collection. The player's selection never changes silently: the new toy
 * is switched on only when no toy is on, and the toast says which way it went. Returns null if already owned.
 */
export function grantToy(toys: Partial<Record<string, boolean>>, toy: string, name: (t: string) => string): { on: boolean; text: string } | null {
  if (toy in toys) return null;
  const current = Object.keys(toys).find((k) => toys[k]);
  toys[toy] = !current;
  const n = name(toy).toUpperCase();
  return { on: !current, text: current ? `NEW TOY: ${n}  ·  ${name(current).toUpperCase()} stays your helper (swap in TEAM)` : `NEW TOY: ${n}  ·  it's ON for your next run` };
}

const ownsSpecialUnit = (m: UnlockMeta) => Object.entries(m.units ?? {}).some(([id, v]) => v.level >= 1 && !(STARTER_UNITS as string[]).includes(id));

/** Has the player reached this feature's step right now (`cleared` = saga levels cleared)? */
export function earned(m: UnlockMeta, f: Feature, cleared: number): boolean {
  if (f === 'team') return toysOpen(cleared + 1) && (ownsSpecialUnit(m) || Object.keys(m.toys).length > 0);
  if (f === 'gems') return (m.gems ?? 0) > 0;
  return cleared >= UNLOCK_LEVEL[f]!;
}

export const isUnlocked = (m: UnlockMeta, f: Feature) => !!m.unlocks?.[f];
/** Unlocked but never opened: shows the NEW cue. */
export const isNew = (m: UnlockMeta, f: Feature) => isUnlocked(m, f) && !m.unlockSeen?.[f];

/** Records newly earned features (sticky) and returns them in schedule order. */
export function refreshUnlocks(m: UnlockMeta, cleared: number): Feature[] {
  const u = (m.unlocks ??= {});
  const fresh = FEATURES.filter((f) => !u[f] && earned(m, f, cleared));
  for (const f of fresh) u[f] = true;
  return fresh;
}

/** The player opened the feature: its NEW cue goes away. Returns true if that changed anything. */
export function markSeen(m: UnlockMeta, f: Feature): boolean {
  if (!isUnlocked(m, f) || m.unlockSeen?.[f]) return false;
  (m.unlockSeen ??= {})[f] = true;
  return true;
}

/** Everything open and seen (QA unlock-all). */
export function unlockAll(m: UnlockMeta) {
  for (const f of FEATURES) {
    (m.unlocks ??= {})[f] = true;
    (m.unlockSeen ??= {})[f] = true;
  }
}

/**
 * One-time migration for saves made before staggered unlocks (no `unlocks` record yet): every feature the old
 * rules already showed stays open, without a NEW cue. Old rules: `hardUnlocked` (level 5 / a classic win) opened
 * everything; otherwise Daily Puzzle at 3 cleared, Challenge at 5, Workshop after 5 (or anything bought), Remix at 10,
 * TEAM with any helper toy, and the Gems counter was always on screen once the player had played.
 */
export function migrateUnlocks(m: UnlockMeta, cleared: number) {
  if (m.unlocks) return;
  const h = !!m.hardUnlocked;
  const old: Record<Feature, boolean> = {
    team: h || Object.keys(m.toys).length > 0,
    challenge: h || cleared >= 5,
    workshop: h || cleared >= 5 || (m.owned?.length ?? 0) > 0,
    puzzles: h || cleared >= 3,
    remix: h || cleared >= 10,
    gems: h || cleared >= 1 || (m.gems ?? 0) > 0,
  };
  m.unlocks = {};
  m.unlockSeen = { ...(m.unlockSeen ?? {}) };
  for (const f of FEATURES) if (old[f]) m.unlocks[f] = m.unlockSeen[f] = true;
}
