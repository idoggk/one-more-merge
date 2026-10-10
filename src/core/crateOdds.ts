// Crate odds panel data (owner: "we need to have % on new cards ... by their rarity"). Pure: every number here is read
// from the same tables and the same slot rule rollCrate uses (tests/crateOdds.test.ts rolls real crates to prove it).
import { CRATES, EPIC_PITY, NEW_UNIT_PITY, RARITY_ODDS, UNITS, type CrateKind, type Rarity } from '../content/units';

export const RARITIES: Rarity[] = ['common', 'rare', 'epic'];

/** One crate slot's rarity from a uniform roll `x`; a guaranteed slot turns Common into Rare. rollCrate uses this. */
export function slotRarity(x: number, guaranteed: boolean): Rarity {
  const r: Rarity = x < RARITY_ODDS.epic ? 'epic' : x < RARITY_ODDS.epic + RARITY_ODDS.rare ? 'rare' : 'common';
  return guaranteed && r === 'common' ? 'rare' : r;
}

/** Exact odds of one slot (the inverse of slotRarity). */
export function slotOdds(guaranteed: boolean): Record<Rarity, number> {
  return guaranteed ? { common: 0, rare: RARITY_ODDS.common + RARITY_ODDS.rare, epic: RARITY_ODDS.epic } : { ...RARITY_ODDS };
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
const RARITY_NAME: Record<Rarity, string> = { common: 'Common', rare: 'Rare', epic: 'Epic' };
const oddsText = (o: Record<Rarity, number>) => RARITIES.filter((r) => o[r] > 0).map((r) => `${RARITY_NAME[r]} ${pct(o[r])}`).join(' · ');

export interface PityView {
  epic: number;
  dry: number;
  ownsEpic: boolean;
  /** Units the player does not own yet. */
  missing: number;
  /** The first Wood crate always brings a Horn (GameScene.openCrate) while the player has none. */
  hornFirst?: boolean;
}

/** The panel's pity view from a save (meta.pity + meta.units); unit level >= 1 = owned. */
export function pityView(m: { pity?: { epic: number; dry: number }; units?: Record<string, { level: number }> }): PityView {
  const owns = (id: string) => (m.units?.[id]?.level ?? 0) >= 1;
  return {
    epic: m.pity?.epic ?? 0,
    dry: m.pity?.dry ?? 0,
    ownsEpic: UNITS.some((u) => u.rarity === 'epic' && owns(u.id)),
    missing: UNITS.filter((u) => !owns(u.id)).length,
    hornFirst: !owns('horn'),
  };
}

/** The odds panel's lines for one crate tier: the title, then plain rows. */
export function crateOddsLines(kind: CrateKind, pity?: PityView): { title: string; rows: string[] } {
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
  const n = newUnitPityIn(pity.dry, pity.missing);
  return [
    n === null ? 'You own every unit.' : n === 1 ? 'Your next crate brings a NEW unit.' : `A NEW unit guaranteed within ${n} crates.`,
    ...(n === null ? [] : ["When the NEW-unit guarantee fires, one card is swapped for a unit you don't have (any rarity)."]),
    `Epic pity: no Epic in an Iron crate +${EPIC_PITY.iron}, in a Gold crate +${EPIC_PITY.gold}; at ${EPIC_PITY.at} the next Iron or Gold brings one. Now ${Math.min(pity.epic, EPIC_PITY.at)}/${EPIC_PITY.at}.`,
  ];
}
