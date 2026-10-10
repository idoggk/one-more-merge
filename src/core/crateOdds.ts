// Crate odds panel data (owner: "we need to have % on new cards ... by their rarity"). Pure: every number here is read
// from the same tables and the same slot rule rollCrate uses (tests/crateOdds.test.ts rolls real crates to prove it).
import { TUNING } from '../content/tuning';
import { CRATES, CRATES_B, EPIC_PITY, LATCH_B, NEW_UNIT_PITY, PITY_B, RARITY_ODDS, RARITY_ORDER, UNITS, type CrateKind, type Rarity } from '../content/units';

/** Today's three rarities (the flag-off panel). The B panel uses RARITY_ORDER. */
export const RARITIES: Rarity[] = ['common', 'rare', 'epic'];

/** One crate slot's rarity from a uniform roll `x`; a guaranteed slot turns Common into Rare. rollCrate uses this. */
export function slotRarity(x: number, guaranteed: boolean): Rarity {
  const r: Rarity = x < RARITY_ODDS.epic ? 'epic' : x < RARITY_ODDS.epic + RARITY_ODDS.rare ? 'rare' : 'common';
  return guaranteed && r === 'common' ? 'rare' : r;
}

/** Exact odds of one slot (the inverse of slotRarity). */
export function slotOdds(guaranteed: boolean): Record<Rarity, number> {
  return guaranteed ? { common: 0, rare: RARITY_ODDS.common + RARITY_ODDS.rare, epic: RARITY_ODDS.epic, legendary: 0 } : { ...RARITY_ODDS };
}

export interface CrateOdds {
  kind: CrateKind;
  cards: number;
  /** The first `guaranteed` cards are Rare or better. */
  guaranteed: number;
  card: Record<Rarity, number>;
  guaranteedCard: Record<Rarity, number>;
  /** Chance of at least one Epic before any pity. */
  epicChance: number;
  /** Average cards of each rarity per crate. */
  average: Record<Rarity, number>;
}

export function crateOdds(kind: CrateKind): CrateOdds {
  const { cards, rareMin } = CRATES[kind];
  const card = slotOdds(false), guaranteedCard = slotOdds(true);
  const average = Object.fromEntries(RARITIES.map((r) => [r, rareMin * guaranteedCard[r] + (cards - rareMin) * card[r]])) as Record<Rarity, number>;
  const noEpic = Math.pow(1 - guaranteedCard.epic, rareMin) * Math.pow(1 - card.epic, cards - rareMin);
  return { kind, cards, guaranteed: rareMin, card, guaranteedCard, epicChance: 1 - noEpic, average };
}

/**
 * Epic pity countdown: how many crates of `kind` (in a row, with no Epic) until one is forced. null = this crate kind
 * never forces an Epic (Wood). GameScene also forces an Epic in a Gold crate while the player owns no Epic.
 */
export function epicPityIn(kind: CrateKind, epicPoints: number, ownsEpic: boolean): number | null {
  const step = EPIC_PITY[kind];
  if (!step) return null;
  if (kind === 'gold' && !ownsEpic) return 1;
  return epicPoints >= EPIC_PITY.at ? 1 : 1 + Math.ceil((EPIC_PITY.at - epicPoints) / step);
}

/** New-unit pity countdown: crates (any kind) until one must bring a unit you don't own. null = you own them all. */
export function newUnitPityIn(dry: number, missing: number): number | null {
  return missing > 0 ? Math.max(1, NEW_UNIT_PITY - dry) : null;
}

/** Percent as the panel prints it: whole numbers stay whole, otherwise one decimal (27.9%). */
export const pct = (p: number) => `${+(p * 100).toFixed(1)}%`;
const RARITY_NAME: Record<Rarity, string> = { common: 'Common', rare: 'Rare', epic: 'Epic', legendary: 'Legendary' };
const oddsText = (o: Record<Rarity, number>) => RARITIES.filter((r) => o[r] > 0).map((r) => `${RARITY_NAME[r]} ${pct(o[r])}`).join(' · ');

export interface PityView {
  epic: number;
  /** Legendary pity points (TUNING.rosterB only). */
  leg?: number;
  dry: number;
  ownsEpic: boolean;
  /** Units the player does not own yet. */
  missing: number;
  /** The first Wood crate always brings a Horn (GameScene.openCrate) while the player has none. */
  hornFirst?: boolean;
}

/** The panel's pity view from a save (meta.pity + meta.units); unit level >= 1 = owned. */
export function pityView(m: { pity?: { epic: number; dry: number; leg?: number }; units?: Record<string, { level: number }> }): PityView {
  const owns = (id: string) => (m.units?.[id]?.level ?? 0) >= 1;
  return {
    epic: m.pity?.epic ?? 0,
    dry: m.pity?.dry ?? 0,
    ownsEpic: UNITS.some((u) => u.rarity === 'epic' && owns(u.id)),
    // under ROSTER B the NEW-unit swap never brings a Legendary (those come from their own odds), so they are not counted
    missing: UNITS.filter((u) => !owns(u.id) && !(TUNING.rosterB && u.rarity === 'legendary')).length,
    hornFirst: !owns('horn'),
    ...(TUNING.rosterB ? { leg: m.pity?.leg ?? 0 } : {}),
  };
}

/** The odds panel's lines for one crate tier: the title, then plain rows. */
export function crateOddsLines(kind: CrateKind, pity?: PityView): { title: string; rows: string[] } {
  if (TUNING.rosterB) return crateOddsLinesB(kind, pity);
  const o = crateOdds(kind);
  const rows = [`Each card: ${oddsText(o.card)}`];
  if (o.guaranteed) rows.push(`At least ${o.guaranteed} Rare or better: ${o.guaranteed === 1 ? 'card 1 is' : `cards 1-${o.guaranteed} are`} ${oddsText(o.guaranteedCard)}`);
  rows.push(`Chance of an Epic: ${pct(o.epicChance)}`);
  if (pity) {
    const e = epicPityIn(kind, pity.epic, pity.ownsEpic);
    if (e !== null) rows.push(e === 1 ? 'Epic GUARANTEED in this crate' : `Epic guaranteed within ${e} ${kind === 'gold' ? 'Gold' : 'Iron'} crates`);
    if (kind === 'wood' && pity.hornFirst) rows.push('This Wood crate brings a Horn');
  }
  return { title: `${CRATES[kind].name}  ·  ${o.cards} cards`, rows };
}

/** Shared lines under the tiers: the new-unit pity and how the Epic pity counts. */
export function pityLines(pity: PityView): string[] {
  if (TUNING.rosterB) return pityLinesB(pity);
  const n = newUnitPityIn(pity.dry, pity.missing);
  return [
    n === null ? 'You own every unit.' : n === 1 ? 'Your next crate brings a NEW unit.' : `A NEW unit guaranteed within ${n} crates.`,
    ...(n === null ? [] : ["When the NEW-unit guarantee fires, one card is swapped for a unit you don't have (any rarity)."]),
    `Epic pity: no Epic in an Iron crate +${EPIC_PITY.iron}, in a Gold crate +${EPIC_PITY.gold}; at ${EPIC_PITY.at} the next Iron or Gold brings one. Now ${Math.min(pity.epic, EPIC_PITY.at)}/${EPIC_PITY.at}.`,
  ];
}

// ---------------------------------------------------------------------------------------------------------------------
// t-9d5b7cd0 ROSTER B crates (TUNING.rosterB): 4 rarities, 4 tiers, latch roll-up, per-rarity pity. Same rule as above:
// every number printed here is read from the tables rollCrate / openCrate roll with (tests/crateB.test.ts proves it).
// ---------------------------------------------------------------------------------------------------------------------
export const KINDS_B: CrateKind[] = ['wood', 'iron', 'gold', 'bench'];
const rank = (r: Rarity) => RARITY_ORDER.indexOf(r);
const zero = (): Record<Rarity, number> => ({ common: 0, rare: 0, epic: 0, legendary: 0 });

/** One slot's rarity from a uniform roll `x`: walk down from Legendary; a slot below its guaranteed minimum is lifted to it. */
export function slotRarityB(x: number, min: Rarity | undefined, odds: Record<Rarity, number>): Rarity {
  let acc = 0, r: Rarity = 'common';
  for (let i = RARITY_ORDER.length - 1; i >= 0; i--) {
    acc += odds[RARITY_ORDER[i]];
    if (x < acc) {
      r = RARITY_ORDER[i];
      break;
    }
  }
  return min && rank(r) < rank(min) ? min : r;
}
/** Exact odds of one slot (the inverse of slotRarityB). */
export function slotOddsB(min: Rarity | undefined, odds: Record<Rarity, number>): Record<Rarity, number> {
  const out = zero();
  for (const q of RARITY_ORDER) out[min && rank(q) < rank(min) ? min : q] += odds[q];
  return out;
}

/** The Tool Bag's latch: ONE roll per open, decided BEFORE the contents. Cumulative "or better" chances (LATCH_B). */
export function latchKind(x: number): CrateKind {
  return x < LATCH_B.bench ? 'bench' : x < LATCH_B.gold ? 'gold' : x < LATCH_B.iron ? 'iron' : 'wood';
}
/** Exact chance of each opened kind for a Tool Bag. */
export function latchOdds(): Record<CrateKind, number> {
  return { wood: 1 - LATCH_B.iron, iron: LATCH_B.iron - LATCH_B.gold, gold: LATCH_B.gold - LATCH_B.bench, bench: LATCH_B.bench };
}

/** Groups of consecutive guaranteed cards with the same minimum rarity (1-based card numbers). */
export function guaranteeGroups(kind: CrateKind): { from: number; to: number; min: Rarity; odds: Record<Rarity, number> }[] {
  const { mins, odds } = CRATES_B[kind];
  const out: { from: number; to: number; min: Rarity; odds: Record<Rarity, number> }[] = [];
  mins.forEach((m, k) => {
    const last = out[out.length - 1];
    if (last && last.min === m) last.to = k + 1;
    else out.push({ from: k + 1, to: k + 1, min: m, odds: slotOddsB(m, odds) });
  });
  return out;
}
/** Does every crate of this kind carry a guaranteed card of exactly this minimum rarity (Chest: Epic, Workbench: Legendary)? */
export const alwaysHas = (kind: CrateKind, r: Rarity) => CRATES_B[kind].mins.includes(r);

/** Crates of `kind` (all the same kind, no hit) until the pity forces `r`: 1 = this very crate (it would fill the bar). null = this kind never moves
 *  the counter (it cannot drop `r`, or always does). */
export function pityCountdown(r: 'epic' | 'legendary', kind: CrateKind, points: number): number | null {
  const step = PITY_B[r].step[kind];
  if (!step) return null;
  return Math.max(1, Math.ceil((PITY_B[r].at - points) / step));
}

/** B percent: two decimals so 0.15% (the Workbench latch) is not shown as 0.1%. */
export const pctB = (p: number) => `${+(p * 100).toFixed(2)}%`;
const NAME_B: Record<CrateKind, string> = { wood: 'Tool Bag', iron: 'Toolbox', gold: 'Tool Chest', bench: 'Golden Workbench' };
const PLURAL_B: Record<CrateKind, string> = { wood: 'Tool Bags', iron: 'Toolboxes', gold: 'Tool Chests', bench: 'Golden Workbenches' };
const RARITY_NAME_B: Record<Rarity, string> = { common: 'Common', rare: 'Rare', epic: 'Epic', legendary: 'Legendary' };
const oddsTextB = (o: Record<Rarity, number>, all = true) => RARITY_ORDER.filter((r) => all || o[r] > 0).map((r) => `${RARITY_NAME_B[r]} ${pctB(o[r])}`).join(' · ');
/** Parse one odds line back into numbers (the test reads what the player reads). */
export const parseOddsB = (s: string) => Object.fromEntries(RARITY_ORDER.map((r) => [r, Number(new RegExp(`${r}\\s+([\\d.]+)%`, 'i').exec(s)?.[1] ?? 0) / 100])) as Record<Rarity, number>;

/** The B odds panel lines for one tier. Per-card odds and guarantees are separate rows; pity rows only for rarities the tier can drop. */
export function crateOddsLinesB(kind: CrateKind, pity?: PityView): { title: string; rows: string[] } {
  const spec = CRATES_B[kind];
  const rows = [`Each card: ${oddsTextB(spec.odds)}`];
  for (const g of guaranteeGroups(kind)) rows.push(`Guaranteed: ${g.from === g.to ? `card ${g.from} is` : `cards ${g.from}-${g.to} are`} ${RARITY_NAME_B[g.min]} or better: ${oddsTextB(g.odds, false)}`);
  if (kind === 'wood') rows.push(`Latch (one roll per open, decided before the bag opens): Toolbox or better ${pctB(LATCH_B.iron)} · Tool Chest or better ${pctB(LATCH_B.gold)} · Golden Workbench ${pctB(LATCH_B.bench)}`);
  if (pity) {
    for (const r of ['epic', 'legendary'] as const) {
      const name = RARITY_NAME_B[r];
      if (alwaysHas(kind, r)) continue;
      const points = r === 'epic' ? pity.epic : pity.leg ?? 0;
      const n = pityCountdown(r, kind, points);
      if (n === null) rows.push(`${name} pity: ${spec.odds[r] > 0 ? 'does not move on this crate' : `cannot drop here, so it never moves ${name} pity`}`);
      else rows.push(`${name} pity ${Math.min(points, PITY_B[r].at)}/${PITY_B[r].at} (+${PITY_B[r].step[kind]} per ${NAME_B[kind]}) · ${n === 1 ? `${name} GUARANTEED in this crate` : `${name} guaranteed within ${n} ${PLURAL_B[kind]}`}`);
    }
    if (kind === 'wood' && pity.hornFirst) rows.push('This Tool Bag brings a Horn');
  }
  return { title: `${spec.name}  ·  ${spec.cards} cards`, rows };
}

/** Shared lines under the B tiers. */
export function pityLinesB(pity: PityView): string[] {
  const n = newUnitPityIn(pity.dry, pity.missing);
  const steps = (r: 'epic' | 'legendary') => KINDS_B.filter((k) => PITY_B[r].step[k] > 0).map((k) => `+${PITY_B[r].step[k]} ${NAME_B[k]}`).join(', ');
  return [
    n === null ? 'You own every unit.' : n === 1 ? 'Your next crate brings a NEW unit.' : `A NEW unit guaranteed within ${n} crates.`,
    ...(n === null ? [] : ["When the NEW-unit guarantee fires, one card is swapped for a unit you don't have (never lowering a guaranteed card)."]),
    `Epic pity ${Math.min(pity.epic, PITY_B.epic.at)}/${PITY_B.epic.at} (${steps('epic')}). Legendary pity ${Math.min(pity.leg ?? 0, PITY_B.legendary.at)}/${PITY_B.legendary.at} (${steps('legendary')}). A crate that cannot drop a rarity never moves its counter; a hit resets it.`,
    'Spare duplicates past level 10 become Spare Parts: a wild card for any unit of the same rarity.',
  ];
}

/** The guarantee as a shop sub-line, e.g. "Guaranteed: 1 Epic + 4 Rare or better" (kept apart from the per-card odds). */
export function guaranteeText(kind: CrateKind): string {
  const g = guaranteeGroups(kind);
  return g.length ? `Guaranteed: ${g.map((x) => `${x.to - x.from + 1} ${RARITY_NAME_B[x.min]}`).join(' + ')} or better` : 'No guarantee';
}
