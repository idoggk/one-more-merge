// t-9d5b7cd0: ROSTER B crates (TUNING.rosterB): 4 rarities, 4 tiers, latch roll-up, per-rarity pity, Spare Parts.
// The odds panel text is parsed back and compared with what thousands of REAL opens do (latch and pity included).
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { TUNING } from '../src/content/tuning';
import { cardsFor, CRATES_B, LATCH_B, LEVEL_CARDS, MAX_UNIT_LEVEL, PITY_B, RARITY_ORDER, STARTER_UNITS, UNITS, unitDef, type CrateKind, type Rarity } from '../src/content/units';
import { crateOddsLines, guaranteeGroups, KINDS_B, latchKind, latchOdds, parseOddsB, pityLines, pityView, slotOddsB } from '../src/core/crateOdds';
import { openCrateB, rollCrate, type PityState } from '../src/core/crates';
import { rollPicksB } from '../src/core/crateB';
import { cardsAvailable, spareOf, spendCards, sweepSpare, type CollectionSave } from '../src/core/spareParts';
import { Rng } from '../src/core/rng';
import type { Family } from '../src/core/types';

beforeEach(() => {
  TUNING.rosterB = true;
});
afterEach(() => {
  TUNING.rosterB = false;
});

const ALL = new Set<Family>(UNITS.map((u) => u.id));
const rarityOf = (f: string) => UNITS.find((u) => u.id === f)!.rarity;
const seedOf = (i: number) => (i * 2654435761) >>> 0;
const fresh = (): PityState => ({ epic: 0, dry: 0, leg: 0 });
/** 6 standard errors of a binomial frequency, plus a hair for rounding. */
const tol = (p: number, n: number) => 6 * Math.sqrt((p * (1 - p)) / n) + 1e-4;

describe('ROSTER B tables', () => {
  it('four tiers, the spec numbers, every odds row sums to 1', () => {
    expect(RARITY_ORDER).toEqual(['common', 'rare', 'epic', 'legendary']);
    expect(CRATES_B.wood).toMatchObject({ cards: 3, mins: [], odds: { common: 0.82, rare: 0.16, epic: 0.02, legendary: 0 } });
    expect(CRATES_B.iron).toMatchObject({ cards: 8, mins: ['rare'], odds: { common: 0.7, rare: 0.24, epic: 0.055, legendary: 0.005 } });
    expect(CRATES_B.gold).toMatchObject({ cards: 20, odds: { common: 0.58, rare: 0.3, epic: 0.1, legendary: 0.02 } });
    expect(CRATES_B.gold.mins.filter((m) => m === 'epic')).toHaveLength(1);
    expect(CRATES_B.gold.mins.filter((m) => m === 'rare')).toHaveLength(4);
    expect(CRATES_B.bench).toMatchObject({ cards: 10, mins: ['legendary'], odds: { common: 0.5, rare: 0.32, epic: 0.14, legendary: 0.04 } });
    for (const k of KINDS_B) {
      expect(RARITY_ORDER.reduce((s, r) => s + CRATES_B[k].odds[r], 0)).toBeCloseTo(1, 12);
      for (const g of guaranteeGroups(k)) expect(RARITY_ORDER.reduce((s, r) => s + g.odds[r], 0)).toBeCloseTo(1, 12);
    }
    expect(LATCH_B).toEqual({ iron: 0.25, gold: 0.03, bench: 0.0015 });
    expect(Object.values(latchOdds()).reduce((a, b) => a + b, 0)).toBeCloseTo(1, 12);
  });

  it('Signal Beacon is Legendary only under the flag; the Legendary level table is the spec table', () => {
    expect(unitDef('signal_beacon')!.rarity).toBe('legendary');
    expect(LEVEL_CARDS.legendary).toEqual([1, 1, 1, 2, 2, 3, 4, 6, 8]);
    expect(cardsFor(unitDef('signal_beacon')!, 4)).toBe(2);
    TUNING.rosterB = false;
    expect(unitDef('signal_beacon')!.rarity).toBe('epic');
    expect(cardsFor(unitDef('signal_beacon')!, 4)).toBe(3);
    expect(UNITS.every((u) => u.rarity !== 'legendary')).toBe(true);
  });
});

describe('the printed odds are the rolled odds', () => {
  it('per-card and guarantee rows are separate lines and parse back to the tables', () => {
    for (const k of KINDS_B) {
      const { rows } = crateOddsLines(k);
      expect(rows[0]).toMatch(/^Each card, before guarantees: Common [\d.]+% · Rare [\d.]+% · Epic [\d.]+% · Legendary [\d.]+%$/);
      expect(parseOddsB(rows[0])).toEqual(CRATES_B[k].odds);
      const guar = rows.filter((r) => r.startsWith('Guaranteed:'));
      expect(guar).toHaveLength(guaranteeGroups(k).length);
      guaranteeGroups(k).forEach((g, i) => {
        expect(parseOddsB(guar[i])).toEqual(Object.fromEntries(RARITY_ORDER.map((r) => [r, +(slotOddsB(g.min, CRATES_B[k].odds)[r]).toFixed(4)])));
      });
      expect(rows.join('\n')).not.toMatch(/average|about|per crate/i); // never blended
    }
  });

  it('20,000 real crates of each tier: every card slot matches the printed row for it', () => {
    const N = 20000;
    for (const k of KINDS_B) {
      const spec = CRATES_B[k];
      const { rows } = crateOddsLines(k);
      const each = parseOddsB(rows[0]);
      const guar = rows.filter((r) => r.startsWith('Guaranteed:')).map(parseOddsB);
      const groups = guaranteeGroups(k);
      const slotRow = (s: number) => { const gi = groups.findIndex((g) => s + 1 >= g.from && s + 1 <= g.to); return gi >= 0 ? guar[gi] : each; };
      const seen = Array.from({ length: spec.cards }, () => ({ common: 0, rare: 0, epic: 0, legendary: 0 }) as Record<Rarity, number>);
      for (let i = 1; i <= N; i++) {
        // own everything + fresh pity: no NEW-unit swap, no forced card, so slot rarity = rolled rarity
        const picks = rollPicksB(k, ALL, seedOf(i), fresh());
        picks.forEach((u, s) => seen[s][rarityOf(u)]++);
      }
      for (let s = 0; s < spec.cards; s++) for (const r of RARITY_ORDER) expect(Math.abs(seen[s][r] / N - slotRow(s)[r]), `${k} card ${s + 1} ${r}`).toBeLessThan(tol(slotRow(s)[r], N));
      expect(seen[0].legendary > 0 || spec.odds.legendary === 0 || k === 'wood').toBe(true);
    }
  });

  it('guarantees hold in EVERY crate, with and without the NEW-unit pity swap', () => {
    for (const owned of [ALL, new Set<Family>(STARTER_UNITS)]) {
      for (let i = 1; i <= 4000; i++) {
        const dry = i % 4; // dry = 2 makes the NEW-unit pity fire
        const rare = (k: CrateKind) => rollPicksB(k, owned, seedOf(i), { epic: i % 12, dry, leg: i % 40 }).map(rarityOf);
        const toolbox = rare('iron'), chest = rare('gold'), bench = rare('bench');
        expect(toolbox.filter((r) => r !== 'common').length).toBeGreaterThanOrEqual(1);
        expect(chest.filter((r) => r === 'epic' || r === 'legendary').length).toBeGreaterThanOrEqual(1);
        expect(chest.filter((r) => r !== 'common').length).toBeGreaterThanOrEqual(5); // 4 Rare + the Epic
        expect(bench.filter((r) => r === 'legendary').length).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it('the Tool Bag latch: ONE roll, decided before the contents, its printed chances are the real ones', () => {
    const bagRow = crateOddsLines('wood').rows.find((r) => r.startsWith('Latch'))!;
    const num = (name: string) => Number(new RegExp(`${name} ([\\d.]+)%`).exec(bagRow)![1]) / 100;
    const shown = { iron: num('Toolbox or better'), gold: num('Tool Chest or better'), bench: num('Golden Workbench') };
    expect(shown).toEqual(LATCH_B);
    // same seed => same opened kind whatever the player owns or whatever the pity is: the roll precedes the contents
    for (let i = 1; i <= 500; i++) {
      const a = openCrateB('wood', ALL, seedOf(i), fresh()).opened;
      const b = openCrateB('wood', new Set<Family>(STARTER_UNITS), seedOf(i), { epic: 9, dry: 5, leg: 38 }).opened;
      expect(b).toBe(a);
      expect(a).toBe(latchKind(new Rng((seedOf(i) ^ 0x1a7c4) >>> 0 || 1).next()));
    }
    const N = 150000;
    const got: Record<CrateKind, number> = { wood: 0, iron: 0, gold: 0, bench: 0 };
    for (let i = 1; i <= N; i++) {
      const r = openCrateB('wood', ALL, seedOf(i), fresh());
      got[r.opened]++;
      expect(r.latched).toBe(r.opened !== 'wood');
      if (i <= 3000) expect(r.cards.reduce((n, c) => n + c.count, 0)).toBe(CRATES_B[r.opened].cards); // contents are the UPGRADED crate's
    }
    const orBetter = { iron: (got.iron + got.gold + got.bench) / N, gold: (got.gold + got.bench) / N, bench: got.bench / N };
    for (const k of ['iron', 'gold', 'bench'] as const) expect(Math.abs(orBetter[k] - shown[k]), k).toBeLessThan(tol(shown[k], N));
    // other tiers never latch
    for (const k of ['iron', 'gold', 'bench'] as const) expect(openCrateB(k, ALL, seedOf(7), fresh()).opened).toBe(k);
  });

  it('a latched crate uses the UPGRADED crate\'s pity and guarantees', () => {
    let found = 0;
    for (let i = 1; i <= 60000 && found < 3; i++) {
      const pity = fresh();
      const r = openCrateB('wood', ALL, seedOf(i), pity);
      if (r.opened !== 'bench') continue;
      found++;
      expect(r.cards.some((c) => rarityOf(c.unit) === 'legendary')).toBe(true);
      expect(pity.leg).toBe(0); // the Workbench always holds one and resets it
    }
    expect(found).toBe(3);
  });
});

/** Read the pity counters + countdown rows the panel prints for `kind`. */
const printed = (kind: CrateKind, p: PityState) => {
  const v = pityView({ pity: p, units: Object.fromEntries([...ALL].map((u) => [u, { level: 1 }])) });
  const rows = crateOddsLines(kind, v).rows;
  const get = (name: string) => {
    const row = rows.find((r) => r.startsWith(`${name} pity`));
    if (!row || !/\d+\/\d+/.test(row)) return null;
    const m = /(\d+)\/(\d+) \(\+(\d+) per/.exec(row)!;
    return { points: +m[1], at: +m[2], step: +m[3], guaranteed: /GUARANTEED in this crate/.test(row), within: /within (\d+)/.exec(row) ? +/within (\d+)/.exec(row)![1] : null };
  };
  return { rows, epic: get('Epic'), legendary: get('Legendary') };
};

describe('per-rarity pity counters', () => {
  it('only crates that can drop a rarity show or move its counter', () => {
    expect(printed('wood', fresh()).legendary).toBeNull(); // a Tool Bag cannot drop Legendary
    expect(printed('wood', fresh()).rows.join('\n')).toContain('cannot drop here');
    expect(printed('iron', fresh()).legendary).toMatchObject({ points: 0, at: 40, step: 1, within: 40 }); // "Legendary guaranteed within 40 Toolboxes"
    expect(printed('gold', fresh()).epic).toBeNull(); // a Tool Chest always holds an Epic: no pity needed
    expect(printed('bench', fresh()).legendary).toBeNull(); // the Workbench always holds a Legendary
    for (let i = 1; i <= 3000; i++) {
      const p = { epic: 3, dry: 0, leg: 17 };
      rollPicksB('wood', ALL, seedOf(i), p);
      expect(p.leg).toBe(17);
    }
  });

  it('every printed counter and countdown equals the real state, over 4,000 mixed opens', () => {
    const kinds: CrateKind[] = ['wood', 'iron', 'iron', 'gold', 'bench'];
    let hits = { epic: 0, legendary: 0, forcedEpic: 0, forcedLeg: 0 };
    for (let run = 0; run < 40; run++) {
      const pity: PityState = { epic: run % 12, dry: 0, leg: run % 2 ? (run * 7) % 40 : 28 + (run % 10) };
      for (let i = 1; i <= 100; i++) {
        const kind = kinds[(i * 7 + run) % kinds.length];
        const before = { ...pity }, view = printed(kind, pity);
        const cards = rollCrate(kind, ALL, seedOf(run * 1000 + i), pity);
        const has = (r: Rarity) => cards.some((c) => rarityOf(c.unit) === r);
        for (const [r, key, v] of [['epic', 'epic', view.epic], ['legendary', 'leg', view.legendary]] as const) {
          const was = before[key] ?? 0;
          if (!v) {
            expect(pity[key] ?? 0, `${kind} ${r} counter must not move`).toBe(has(r) ? 0 : was + PITY_B[r].step[kind]);
            expect(PITY_B[r].step[kind] === 0 || has(r)).toBe(true);
            continue;
          }
          expect(v.points).toBe(Math.min(was, v.at)); // the printed counter is the real counter
          if (v.guaranteed) {
            expect(has(r), `${kind} said ${r} GUARANTEED`).toBe(true);
            if (r === 'epic') hits.forcedEpic++;
            else hits.forcedLeg++;
          }
          expect(v.guaranteed).toBe(was + v.step >= v.at); // "GUARANTEED" appears exactly when this crate would fill the bar
          expect(v.within).toBe(v.guaranteed ? null : Math.ceil((v.at - was) / v.step));
          expect(pity[key] ?? 0).toBe(has(r) ? 0 : was + v.step); // dry: +step, hit: reset
          if (has(r)) hits[r]++;
        }
      }
    }
    expect(hits.forcedEpic).toBeGreaterThan(5);
    expect(hits.forcedLeg).toBeGreaterThan(5);
  });

  it('"guaranteed within N" is a promise: N dry-ish crates in a row always end in a hit', () => {
    for (const kind of ['iron', 'gold'] as const) {
      for (const start of [0, 13, 25, 39]) {
        for (let t = 1; t <= 120; t++) {
          const pity: PityState = { epic: 0, dry: 0, leg: start };
          const n = printed(kind, pity).legendary?.within ?? 1;
          let tries = 0, hit = false;
          while (!hit && tries <= n + 1) {
            tries++;
            hit = rollCrate(kind, ALL, seedOf(t * 977 + tries * 31 + start), pity).some((c) => rarityOf(c.unit) === 'legendary');
          }
          expect(hit && tries <= (printed(kind, { epic: 0, dry: 0, leg: start }).legendary?.within ?? 1)).toBe(true);
        }
      }
    }
    // the exact pity line from the spec
    expect(printed('iron', fresh()).rows.join('\n')).toContain('Legendary guaranteed within 40 Toolboxes');
  });

  it('the NEW-unit pity still fires and never breaks a rarity guarantee or the Legendary odds', () => {
    const owned = new Set<Family>(STARTER_UNITS);
    const missingNonLegend = UNITS.filter((u) => !owned.has(u.id) && u.rarity !== 'legendary').length;
    const v = pityView({ pity: { epic: 0, dry: 2, leg: 0 }, units: Object.fromEntries([...owned].map((u) => [u, { level: 1 }])) });
    expect(v.missing).toBe(missingNonLegend);
    for (let i = 1; i <= 2000; i++) {
      const cards = rollCrate('iron', owned, seedOf(i), { epic: 0, dry: 2, leg: 0 });
      expect(cards.some((c) => c.isNew)).toBe(true);
      expect(cards.some((c) => rarityOf(c.unit) !== 'common')).toBe(true);
    }
    expect(pityLines(v).join('\n')).toContain('NEW unit');
  });
});

describe('Spare Parts', () => {
  const save = (): CollectionSave => ({ units: { cannon: { level: 10, cards: 0 }, rocket: { level: 4, cards: 1 }, mortar: { level: 10, cards: 0 }, arc_welder: { level: 2, cards: 0 } }, spare: {} });

  it('duplicates of a max-level unit become Spare Parts of its rarity; nothing is copied', () => {
    const m = save();
    m.units!.mortar.cards += 5; // five dupes of a level-10 Rare arrive
    expect(sweepSpare(m, 'mortar')).toBe(5);
    expect(m.units!.mortar.cards).toBe(0);
    expect(spareOf(m, 'rare')).toBe(5);
    expect(sweepSpare(m, 'mortar')).toBe(0); // a second sweep finds nothing: no duplication
    expect(spareOf(m, 'rare')).toBe(5);
    expect(sweepSpare(m, 'rocket')).toBe(0); // not max level: its cards stay its own
    expect(m.units!.rocket.cards).toBe(1);
  });

  it('spare parts are wild for their own rarity only, own cards go first, and a spend is exact', () => {
    const m = save();
    m.spare = { rare: 5, epic: 3 };
    const need = cardsFor(unitDef('rocket')!, 4); // rare level 4 -> 5 costs 5
    expect(cardsAvailable(m, 'rocket')).toBe(1 + 5);
    expect(spendCards(m, 'rocket', need)).toBe(true);
    expect(m.units!.rocket.cards).toBe(0); // its own card first
    expect(spareOf(m, 'rare')).toBe(1); // then 4 spare parts
    expect(spareOf(m, 'epic')).toBe(3); // another rarity untouched
    expect(cardsAvailable(m, 'arc_welder')).toBe(3); // epic wild cards reach an epic unit...
    expect(spendCards(m, 'arc_welder', 4)).toBe(false); // ...only up to what is there, and a failed spend takes nothing
    expect(spareOf(m, 'epic')).toBe(3);
    expect(spendCards(m, 'arc_welder', 3)).toBe(true);
    expect(spareOf(m, 'epic')).toBe(0);
    expect(spendCards(m, 'arc_welder', 1)).toBe(false);
  });

  it('conservation: cards in = cards held + spare + spent, over a long random walk', () => {
    let seed = 12345;
    const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
    const m = save();
    let given = 1, spent = 0; // the Rocket starts with one card
    for (let i = 0; i < 4000; i++) {
      const u = ['cannon', 'rocket', 'mortar', 'arc_welder'][Math.floor(rnd() * 4)];
      if (rnd() < 0.6) {
        const n = 1 + Math.floor(rnd() * 3);
        m.units![u].cards += n;
        given += n;
        sweepSpare(m, u);
      } else {
        const st = m.units![u];
        const need = st.level < MAX_UNIT_LEVEL ? cardsFor(unitDef(u)!, st.level) : 0;
        if (need && spendCards(m, u, need)) {
          spent += need;
          st.level++;
          sweepSpare(m, u);
        }
      }
      const held = Object.values(m.units!).reduce((s, x) => s + x.cards, 0) + RARITY_ORDER.reduce((s, r) => s + spareOf(m, r), 0);
      expect(held).toBe(given - spent);
      for (const r of RARITY_ORDER) expect(spareOf(m, r)).toBeGreaterThanOrEqual(0);
      for (const x of Object.values(m.units!)) expect(x.cards).toBeGreaterThanOrEqual(0);
    }
  });

  it('flag off: nothing converts and spare parts do not count', () => {
    TUNING.rosterB = false;
    const m = save();
    m.units!.mortar.cards = 4;
    m.spare = { rare: 9 };
    expect(sweepSpare(m, 'mortar')).toBe(0);
    expect(m.units!.mortar.cards).toBe(4);
    expect(cardsAvailable(m, 'rocket')).toBe(1);
  });
});

describe('flag OFF = today\'s crates', () => {
  it('the same seeds roll the same crates as before, and the panel is the 3-tier panel', () => {
    TUNING.rosterB = false;
    for (const k of ['wood', 'iron', 'gold'] as const) {
      const rows = crateOddsLines(k).rows;
      expect(rows[0]).toBe('Each card: Common 72% · Rare 24% · Epic 4%');
      const cards = rollCrate(k, ALL, 42, { epic: 0, dry: 0 });
      expect(cards.reduce((n, c) => n + c.count, 0)).toBe(k === 'wood' ? 3 : k === 'iron' ? 8 : 20);
      expect(cards.every((c) => rarityOf(c.unit) !== 'legendary')).toBe(true);
    }
    const p: PityState = { epic: 0, dry: 0 };
    rollCrate('iron', ALL, 5, p);
    expect(p.leg).toBeUndefined();
  });
});

describe('t-7ba158ff: the first-Horn promise survives a latch', () => {
  it('a Tool Bag that latches up still brings a NEW Horn first (and total cards are unchanged)', () => {
    const owned = new Set<Family>(UNITS.filter((u) => u.id !== 'horn').map((u) => u.id));
    let latched = 0;
    for (let i = 1; i < 400; i++) {
      const r = openCrateB('wood', owned, seedOf(i), fresh());
      if (!r.latched) continue;
      latched++;
      expect(r.cards[0]).toMatchObject({ unit: 'horn', isNew: true });
      expect(r.cards.filter((c) => c.unit === 'horn')).toHaveLength(1);
      expect(r.cards.reduce((n, c) => n + c.count, 0)).toBe(CRATES_B[r.opened].cards);
    }
    expect(latched).toBeGreaterThan(10);
    // once Horn is owned nothing is injected
    const own = new Set(ALL);
    for (let i = 1; i < 100; i++) {
      const r = openCrateB('wood', own, seedOf(i), fresh());
      expect(r.cards).toEqual(rollCrate(r.opened, own, seedOf(i), fresh()));
    }
  });

  it('the odds sheet says "before guarantees"', () => {
    expect(crateOddsLines('wood').rows[0]).toMatch(/^Each card, before guarantees:/);
    expect(crateOddsLines('wood').rows.find((r) => r.startsWith('Latch'))).toContain('leave it out');
  });
});
