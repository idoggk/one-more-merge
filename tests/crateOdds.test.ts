import { describe, expect, it } from 'vitest';
import { crateOdds, crateOddsLines, epicPityIn, newUnitPityIn, pct, pityView, RARITIES, slotOdds } from '../src/core/crateOdds';
import { rollCrate, type PityState } from '../src/core/crates';
import { CRATES, RARITY_ODDS, STARTER_UNITS, UNITS, type CrateKind, type Rarity } from '../src/content/units';
import type { Family } from '../src/core/types';

const KINDS: CrateKind[] = ['wood', 'iron', 'gold'];
const ALL = new Set<Family>(UNITS.map((u) => u.id));
const rarityOf = (f: string) => UNITS.find((u) => u.id === f)!.rarity;
const seedOf = (i: number) => (i * 2654435761) >>> 0;
/** The numbers the panel PRINTS, parsed back out of its text ("Common 72% · Rare 24% · Epic 4%"). */
const parse = (s: string) => Object.fromEntries(RARITIES.map((r) => [r, Number(new RegExp(`${r}\\s+([\\d.]+)%`, 'i').exec(s)?.[1] ?? 0) / 100])) as Record<Rarity, number>;

describe('crate odds panel = the real roll', () => {
  it('slot odds come straight from RARITY_ODDS and sum to 1', () => {
    expect(slotOdds(false)).toEqual(RARITY_ODDS);
    for (const g of [false, true]) expect(RARITIES.reduce((s, r) => s + slotOdds(g)[r], 0)).toBeCloseTo(1, 12);
    expect(slotOdds(true).common).toBe(0);
  });

  it('the printed per-card and guaranteed-card odds equal the table the roll reads', () => {
    for (const kind of KINDS) {
      const { rows } = crateOddsLines(kind);
      expect(parse(rows[0])).toEqual(RARITY_ODDS);
      expect(rows[0]).toBe(`Each card: Common ${pct(RARITY_ODDS.common)} · Rare ${pct(RARITY_ODDS.rare)} · Epic ${pct(RARITY_ODDS.epic)}`);
      if (CRATES[kind].rareMin) {
        expect(rows[1]).toContain(`At least ${CRATES[kind].rareMin} Rare`);
        expect(parse(rows[1])).toEqual({ common: 0, rare: RARITY_ODDS.common + RARITY_ODDS.rare, epic: RARITY_ODDS.epic });
      }
    }
  });

  it('rolling 20,000 real crates of each tier matches the printed numbers', () => {
    const N = 20000;
    for (const kind of KINDS) {
      const { rows } = crateOddsLines(kind);
      const card = parse(rows[0]);
      const g = CRATES[kind].rareMin, n = CRATES[kind].cards;
      const guar = g ? parse(rows[1]) : card;
      const epicShown = Number(/Chance of an Epic: ([\d.]+)%/.exec(rows.join('\n'))![1]) / 100;
      const count: Record<Rarity, number> = { common: 0, rare: 0, epic: 0 };
      let withEpic = 0, minRare = Infinity;
      for (let i = 1; i <= N; i++) {
        // own everything + fresh pity: no new-unit or Epic pity can change a slot, so card rarity = slot rarity
        const cards = rollCrate(kind, ALL, seedOf(i), { epic: 0, dry: 0 });
        let rare = 0, epic = 0;
        for (const c of cards) {
          const r = rarityOf(c.unit);
          count[r] += c.count;
          if (r !== 'common') rare += c.count;
          if (r === 'epic') epic += c.count;
        }
        if (epic) withEpic++;
        minRare = Math.min(minRare, rare);
      }
      expect(minRare).toBeGreaterThanOrEqual(g);
      for (const r of RARITIES) {
        const expected = g * guar[r] + (n - g) * card[r]; // average cards of rarity r per crate, from the PRINTED odds
        expect(expected).toBeCloseTo(crateOdds(kind).average[r], 9);
        const p = expected / n; // 6 standard errors of the mean (slots are independent)
        expect(Math.abs(count[r] / N - expected)).toBeLessThan(6 * Math.sqrt((n * p * (1 - p)) / N) + 1e-3);
      }
      expect(Math.abs(epicShown - crateOdds(kind).epicChance)).toBeLessThanOrEqual(0.0005 + 1e-12);
      expect(Math.abs(withEpic / N - epicShown)).toBeLessThan(0.015);
    }
  });

  it('the Epic countdown ticks down one per dry crate and is never broken', () => {
    for (const kind of ['iron', 'gold'] as const) {
      for (let start = 0; start <= 6; start++) {
        const pity: PityState = { epic: start, dry: 0 };
        let left = epicPityIn(kind, pity.epic, true)!;
        for (let i = 1; i <= 40; i++) {
          const cards = rollCrate(kind, ALL, seedOf(i * 31 + start), pity);
          const got = cards.some((c) => rarityOf(c.unit) === 'epic');
          if (left === 1) expect(got).toBe(true);
          const next = epicPityIn(kind, pity.epic, true)!;
          expect(next).toBe(got ? epicPityIn(kind, 0, true) : left - 1);
          left = next;
        }
      }
    }
    expect(epicPityIn('wood', 99, true)).toBeNull();
    expect(epicPityIn('gold', 0, false)).toBe(1); // GameScene: a Gold crate brings an Epic while you own none
  });

  it('the new-unit countdown ticks down one per crate without a new unit and is never broken', () => {
    const owned = new Set<Family>(STARTER_UNITS);
    const missing = UNITS.length - owned.size;
    const pity: PityState = { epic: 0, dry: 0 };
    let left = newUnitPityIn(pity.dry, missing)!;
    for (let i = 1; i <= 60; i++) {
      const cards = rollCrate(i % 3 ? 'wood' : 'iron', owned, seedOf(i + 7), pity);
      const fresh = cards.some((c) => c.isNew);
      if (left === 1) expect(fresh).toBe(true);
      const next = newUnitPityIn(pity.dry, missing)!;
      expect(next).toBe(fresh ? 3 : Math.max(1, left - 1));
      left = next;
    }
    expect(newUnitPityIn(5, 0)).toBeNull();
  });

  it('"Epic GUARANTEED" holds when the NEW-unit pity fires too (player missing units)', () => {
    const epics = UNITS.filter((u) => u.rarity === 'epic').map((u) => u.id);
    // own both Epics, miss one unit of each other rarity (Magnet = Rare, Horn = Common), and a few at once
    const gaps: Family[][] = [['magnet'], ['horn'], ['magnet', 'horn', 'cannon']];
    for (const gap of gaps) {
      const owned = new Set<Family>(UNITS.map((u) => u.id).filter((u) => !gap.includes(u)));
      expect(epics.every((e) => owned.has(e))).toBe(true);
      for (const kind of ['iron', 'gold'] as const) {
        const view = pityView({ pity: { epic: 6, dry: 2 }, units: Object.fromEntries([...owned].map((u) => [u, { level: 1 }])) });
        expect(crateOddsLines(kind, view).rows).toContain('Epic GUARANTEED in this crate');
        expect(newUnitPityIn(view.dry, view.missing)).toBe(1);
        for (let i = 1; i <= 3000; i++) {
          const cards = rollCrate(kind, owned, seedOf(i), { epic: 6, dry: 2 });
          expect(cards.some((c) => rarityOf(c.unit) === 'epic')).toBe(true);
          expect(cards.some((c) => c.isNew)).toBe(true);
        }
      }
    }
  });

  it('both countdowns hold for a player who is still missing units', () => {
    for (let run = 0; run < 40; run++) {
      const owned = new Set<Family>(STARTER_UNITS);
      const pity: PityState = { epic: run % 7, dry: run % 3 };
      for (let i = 1; i <= 30; i++) {
        const kind: CrateKind = (['wood', 'iron', 'gold'] as const)[(i + run) % 3];
        const missing = UNITS.filter((u) => !owned.has(u.id)).length;
        const ownsEpic = UNITS.some((u) => u.rarity === 'epic' && owned.has(u.id));
        if (kind === 'gold' && !ownsEpic) pity.epic = Math.max(pity.epic, 6); // GameScene.openCrate does this
        const epicLeft = epicPityIn(kind, pity.epic, ownsEpic), newLeft = newUnitPityIn(pity.dry, missing);
        const cards = rollCrate(kind, owned, seedOf(run * 1000 + i), pity);
        if (epicLeft === 1) expect(cards.some((c) => rarityOf(c.unit) === 'epic')).toBe(true);
        if (newLeft === 1) expect(cards.some((c) => c.isNew)).toBe(true);
        for (const c of cards) owned.add(c.unit as Family);
      }
    }
  });

  it('the pity view reads the save', () => {
    const v = pityView({ pity: { epic: 4, dry: 1 }, units: { cannon: { level: 2 }, horn: { level: 1 }, arc_welder: { level: 0 } } });
    expect(v).toEqual({ epic: 4, dry: 1, ownsEpic: false, missing: UNITS.length - 2, hornFirst: false });
    const last = (k: CrateKind) => crateOddsLines(k, v).rows.slice(-1)[0];
    expect(last('iron')).toBe('Epic guaranteed within 3 Iron crates');
    expect(last('gold')).toBe('Epic GUARANTEED in this crate');
  });
});
