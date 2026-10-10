// UNLOCK PLAN rules (t-c78bf16f, TUNING.rosterUnlocks; docs/ROSTER.md section 6). Pure functions over the save shape, so
// GameScene and the results screen only call them. Nothing here runs while the flag is off (callers check it).
import { LEVELS } from '../content/levels';
import { goodHereAll7 } from '../content/roster7';
import { TIER_OPEN_LEVEL, TIER_ORDER, UNIT_GIFTS, type UnitGift } from '../content/unlockPlan';
import { CRATES_B, RARITY_ODDS, RARITY_ORDER, unitDef, type CrateKind, type Rarity } from '../content/units';
import { TUNING } from '../content/tuning';

export interface PlanSave {
  levelStars?: Record<string, number>;
  units?: Record<string, { level: number; cards: number }>;
  toys?: Record<string, boolean>;
  gifts?: Record<string, boolean>;
}

/** Highest saga level with at least one star (0 = none). */
export function clearedLevel(levelStars: Record<string, number> | undefined): number {
  let hi = 0;
  for (const [k, v] of Object.entries(levelStars ?? {})) if ((v ?? 0) > 0) hi = Math.max(hi, Number(k) || 0);
  return hi;
}

export const tierOpen = (kind: CrateKind, cleared: number) => cleared >= TIER_OPEN_LEVEL[kind];

/** The crate a reward of `kind` becomes: the highest OPEN tier at or below it, or null while none is open (nothing is given). */
export function clampCrate(kind: CrateKind, cleared: number): CrateKind | null {
  for (let i = TIER_ORDER.indexOf(kind); i >= 0; i--) if (tierOpen(TIER_ORDER[i], cleared)) return TIER_ORDER[i];
  return null;
}

/** Can a crate of this tier drop this rarity? (the tables the roll itself uses) */
const tierDrops = (kind: CrateKind, r: Rarity) => (TUNING.rosterB ? CRATES_B[kind].odds[r] : RARITY_ODDS[r]) > 0;

/** Rarities a crate may drop right now: every rarity some OPEN crate tier can drop. Before any tier opens only Common is open. */
export function openRarities(cleared: number): Set<Rarity> {
  const out = new Set<Rarity>(['common']);
  for (const k of TIER_ORDER) if (tierOpen(k, cleared)) for (const r of RARITY_ORDER) if (tierDrops(k, r)) out.add(r);
  return out;
}

/** The highest open rarity at or below `r` (a closed slot rolls down to it). */
export function liftToOpen(r: Rarity, open: ReadonlySet<Rarity>): Rarity {
  for (let i = RARITY_ORDER.indexOf(r); i >= 0; i--) if (open.has(RARITY_ORDER[i])) return RARITY_ORDER[i];
  return 'common';
}

export interface GiftResult {
  gift: UnitGift;
  /** false = the player already owned it (an old save or a crate got there first): marked given, no reveal. */
  isNew: boolean;
}

/**
 * Gifts due now: every gift whose level is cleared, not yet tracked in `m.gifts`, and whose unit is in the collection list
 * (its batch is on). Owned units stay owned (marked given, no reveal); the rest join at level 1. Mutates `m`.
 */
export function grantGifts(m: PlanSave): GiftResult[] {
  const cleared = clearedLevel(m.levelStars);
  const out: GiftResult[] = [];
  for (const g of UNIT_GIFTS) {
    if (g.level > cleared || m.gifts?.[g.unit] || !unitDef(g.unit)) continue;
    (m.gifts ??= {})[g.unit] = true;
    m.units ??= {};
    const owned = (m.units[g.unit]?.level ?? 0) >= 1;
    if (!owned) {
      m.units[g.unit] = { level: 1, cards: m.units[g.unit]?.cards ?? 0 };
      if (unitDef(g.unit)?.slot === 'helper' && m.toys) m.toys[g.unit] = m.toys[g.unit] ?? false;
    }
    out.push({ gift: g, isNew: !owned });
  }
  return out;
}

/** First level at or after the gift level whose GOOD HERE line names the unit, or null (then the gift's own tip is shown). */
export function firstGoodHere(g: UnitGift): { level: number; text: string } | null {
  for (const d of LEVELS) {
    if (d.level < g.level) continue;
    const t = goodHereAll7(d, (u) => u === g.unit);
    if (t) return { level: d.level, text: t.replace('GOOD HERE: ', '') };
  }
  return null;
}
