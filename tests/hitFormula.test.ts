import { afterEach, describe, expect, it } from 'vitest';
import { applySpamVariant } from '../src/content/experiments';
import { LEVELS } from '../src/content/levels';
import { TUNING } from '../src/content/tuning';
import { drop, idxOf, legalPairs, newGame, newLevel, serialize, type GameState } from '../src/core/game';
import { fmtFactor, fmtHit, formulaTokens, hitFormula, type HitFormula } from '../src/core/hitFormula';
import { PALETTE } from '../src/core/marks';
import { Rng } from '../src/core/rng';
import { FAMILIES, type Family, type Gadget } from '../src/core/types';

let id = 7000;
const g = (family: Family, rank = 1, extra: Partial<Gadget> = {}): Gadget => ({ id: id++, family, rank, cd: 99, ...extra });
const classic = (): GameState => {
  const s = newGame(7);
  s.grid.fill(null);
  return s;
};
/** A level board (MAX HIT cap applies), emptied. */
const level = (n = 22): GameState => {
  const s = newLevel({ ...LEVELS[n - 1], waves: undefined, wave_visuals: undefined, minion_hp: undefined });
  s.grid.fill(null);
  s.pending = [];
  s.phase = 'playing';
  return s;
};
/** What the model really deals: play the drop on a copy and read the player-damage stat. */
const realDamage = (s: GameState, from: number, to: number) => {
  const c = JSON.parse(JSON.stringify(s)) as GameState;
  const before = c.stats.dmgBy.player ?? 0;
  expect(drop(c, from, to, c.grid[from]!.id).ok).toBe(true);
  return (c.stats.dmgBy.player ?? 0) - before;
};
const product = (f: HitFormula) => f.terms.reduce((n, t) => n * t.mult, f.base);
/** The formula's own numbers: base × terms = the hit before the cap; the cap (if any) = the damage dealt. */
const checkMath = (f: HitFormula, real: number) => {
  expect(f.links.reduce((a, b) => a + b, 0)).toBeCloseTo(f.base, 6);
  // A2/A3 round each machine's share, so allow one point of rounding per machine there
  expect(Math.abs(product(f) - f.raw)).toBeLessThanOrEqual(f.terms.some((t) => t.key === 'chainsize' || t.key === 'rushed') ? f.machines + 1 : 1);
  expect(Math.min(f.raw, f.cap ?? Infinity)).toBe(real);
  expect(f.damage).toBe(real);
};

afterEach(() => applySpamVariant('off'));

describe('hit formula strip (rival study #3)', () => {
  it('no match, no formula; the formula never mutates the state', () => {
    const s = classic();
    s.grid[0] = g('cannon', 1);
    s.grid[1] = g('cannon', 2);
    s.grid[2] = g('cannon', 2, { amp: 1.3 });
    expect(hitFormula(s, 0, 1)).toBeNull();
    const before = serialize(s);
    expect(hitFormula(s, 1, 2)).not.toBeNull();
    expect(serialize(s)).toBe(before);
  });

  it('a lone merge: 1 machine, no multipliers, base = damage', () => {
    const s = classic();
    s.grid[idxOf(0, 0)] = g('cannon', 1);
    s.grid[idxOf(5, 4)] = g('cannon', 1);
    const f = hitFormula(s, idxOf(5, 4), idxOf(0, 0))!;
    expect(f.machines).toBe(1);
    expect(f.terms).toEqual([]);
    expect(Math.round(f.base)).toBe(f.raw);
    checkMath(f, realDamage(s, idxOf(5, 4), idxOf(0, 0)));
  });

  it('a chain names its COMBO and the numbers match the real hit', () => {
    const s = classic();
    // cannon pair merges at (2,2); neighbours: coil above, bell left, cannons further along the bell row
    s.grid[idxOf(2, 2)] = g('cannon', 2);
    s.grid[idxOf(5, 4)] = g('cannon', 2);
    s.grid[idxOf(1, 2)] = g('coil', 2);
    s.grid[idxOf(2, 1)] = g('bell', 2);
    s.grid[idxOf(2, 4)] = g('cannon', 1);
    s.grid[idxOf(0, 2)] = g('rocket', 1);
    const f = hitFormula(s, idxOf(5, 4), idxOf(2, 2))!;
    expect(f.machines).toBeGreaterThanOrEqual(4);
    const combo = f.terms.find((t) => t.key === 'combo')!;
    expect(combo.mult).toBeCloseTo(1 + TUNING.comboSlope * (f.machines - 1), 6);
    expect(combo.hue).toBe(PALETTE.merge.hue);
    expect(f.links).toHaveLength(f.machines);
    checkMath(f, realDamage(s, idxOf(5, 4), idxOf(2, 2)));
  });

  it('a boost on the merging pair is named, used up, in the BOOSTED colour, x1.3 on a lone hit', () => {
    const s = classic();
    s.grid[idxOf(0, 0)] = g('cannon', 2, { amp: 1.3 });
    s.grid[idxOf(5, 4)] = g('cannon', 2);
    const f = hitFormula(s, idxOf(5, 4), idxOf(0, 0))!;
    expect(f.terms).toEqual([{ key: 'boost', label: 'BOOST', mult: expect.closeTo(1.3, 6), hue: PALETTE.boost.hue, meaning: 'boost', usedUp: true, n: 1 }]);
    checkMath(f, realDamage(s, idxOf(5, 4), idxOf(0, 0)));
  });

  it('a boost on one machine of a chain lifts the whole hit by less than its x1.3', () => {
    const s = classic();
    s.grid[idxOf(2, 2)] = g('cannon', 2);
    s.grid[idxOf(5, 4)] = g('cannon', 2);
    s.grid[idxOf(1, 2)] = g('coil', 2);
    s.grid[idxOf(0, 2)] = g('cannon', 3, { amp: 1.3 });
    const f = hitFormula(s, idxOf(5, 4), idxOf(2, 2))!;
    const boost = f.terms.find((t) => t.key === 'boost')!;
    expect(boost.mult).toBeGreaterThan(1);
    expect(boost.mult).toBeLessThan(1.3);
    checkMath(f, realDamage(s, idxOf(5, 4), idxOf(2, 2)));
  });

  it('charge and overcharge are named in their colours, in order, and match the real hit', () => {
    const s = classic();
    s.phase = 'playing';
    s.grid[idxOf(0, 0)] = g('cannon', 2, { primed: true, item: { kind: 'overcharge', charges: 2 } });
    s.grid[idxOf(5, 4)] = g('cannon', 2);
    const f = hitFormula(s, idxOf(5, 4), idxOf(0, 0))!;
    expect(f.terms.map((t) => t.key)).toEqual(['charge', 'overcharge']);
    expect(f.terms[0].hue).toBe(PALETTE.charge.hue);
    expect(f.terms[1]).toMatchObject({ label: 'OVERCHARGE', mult: 2, hue: PALETTE.powerup.hue, usedUp: true });
    checkMath(f, realDamage(s, idxOf(5, 4), idxOf(0, 0)));
  });

  it('Overdrive on: OVERDRIVE x1.5 in its colour', () => {
    const s = classic();
    s.odLeft = 3;
    s.grid[idxOf(0, 0)] = g('cannon', 2);
    s.grid[idxOf(5, 4)] = g('cannon', 2);
    const f = hitFormula(s, idxOf(5, 4), idxOf(0, 0))!;
    expect(f.terms).toEqual([expect.objectContaining({ key: 'overdrive', mult: TUNING.overdriveFactor, hue: PALETTE.overdrive.hue })]);
    checkMath(f, realDamage(s, idxOf(5, 4), idxOf(0, 0)));
  });

  it('a hit over the level cap shows MAX HIT and deals exactly the cap', () => {
    const s = level();
    s.maxHp = s.hp = 100;
    s.grid[idxOf(0, 0)] = g('cannon', 5);
    s.grid[idxOf(5, 4)] = g('cannon', 5);
    const f = hitFormula(s, idxOf(5, 4), idxOf(0, 0))!;
    expect(f.cap).toBe(Math.ceil(100 * TUNING.cascadeCap));
    expect(f.raw).toBeGreaterThan(f.cap!);
    checkMath(f, realDamage(s, idxOf(5, 4), idxOf(0, 0)));
    // under the cap: no MAX HIT
    s.maxHp = s.hp = 1e7;
    expect(hitFormula(s, idxOf(5, 4), idxOf(0, 0))!.cap).toBeNull();
  });

  it('spam experiments (A2 / A3) show their factors and still match the real hit', () => {
    for (const v of ['a2', 'a3f'] as const) {
      applySpamVariant(v);
      // the QA switch only arms these while TUNING.antiSpam is on: force them for the test
      if (v === 'a2') TUNING.optionA2 = true;
      else TUNING.optionA3 = true;
      const s = level();
      s.lastMergeAt = s.elapsed - 0.2; // a rushed merge
      s.grid[idxOf(2, 2)] = g('cannon', 2);
      s.grid[idxOf(5, 4)] = g('cannon', 2);
      s.grid[idxOf(1, 2)] = g('coil', 2);
      s.grid[idxOf(0, 2)] = g('cannon', 3);
      const f = hitFormula(s, idxOf(5, 4), idxOf(2, 2))!;
      expect(f.terms.some((t) => t.key === 'rushed' || t.key === 'chainsize')).toBe(true);
      checkMath(f, realDamage(s, idxOf(5, 4), idxOf(2, 2)));
    }
  });

  it('every legal merge on random marked boards: formula numbers = the real damage', () => {
    const rng = new Rng(1234);
    const fams = FAMILIES;
    let checked = 0;
    for (let trial = 0; trial < 120; trial++) {
      const s = trial % 2 ? level(22 + (trial % 50)) : classic();
      s.phase = 'playing';
      if (trial % 5 === 0) s.odLeft = 2;
      if (trial % 7 === 0) s.unitLevel = { battery: 3, amplifier: 4, mortar: 6, cannon: 6, rocket: 9 };
      if (trial % 3 === 0) s.maxHp = s.hp = 40 + rng.int(400);
      for (let i = 0; i < s.grid.length; i++) {
        if (rng.next() < 0.35) continue;
        const f = fams[rng.int(fams.length)];
        const extra: Partial<Gadget> = {};
        if (rng.next() < 0.15) extra.amp = rng.next() < 0.5 ? 1.3 : 1.15;
        if (rng.next() < 0.12) extra.primed = true;
        if (rng.next() < 0.08) extra.item = { kind: 'overcharge', charges: 1 + rng.int(2) };
        s.grid[i] = g(f, 1 + rng.int(4), extra);
      }
      for (const [x, y] of legalPairs(s).slice(0, 4)) {
        const f = hitFormula(s, x, y);
        if (!f) continue;
        checkMath(f, realDamage(s, x, y));
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(100);
  });

  it('the strip reads "N MACHINES base × NAME factor ... = damage", each used-up mark in its registry colour', () => {
    const s = classic();
    s.phase = 'playing';
    s.odLeft = 2;
    s.grid[idxOf(2, 2)] = g('cannon', 2, { amp: 1.3, primed: true });
    s.grid[idxOf(5, 4)] = g('cannon', 2);
    s.grid[idxOf(1, 2)] = g('coil', 2);
    s.grid[idxOf(0, 2)] = g('cannon', 3);
    const f = hitFormula(s, idxOf(5, 4), idxOf(2, 2))!;
    const toks = formulaTokens(f);
    const line = toks.map((t) => t.text).join(' ');
    // e.g. "3 MACHINES 110 × BOOST 1.14 × CHARGE 1.26 × COMBO 1.16 × OVERDRIVE 1.5 = 276"
    expect(line.startsWith(`${f.machines} MACHINES `)).toBe(true);
    expect(line.endsWith(` = ${fmtHit(f.damage)}`)).toBe(true);
    expect(toks.filter((t) => t.role === 'label').map((t) => t.text)).toEqual(['BOOST', 'CHARGE', 'COMBO', 'OVERDRIVE']);
    expect(toks.filter((t) => t.role === 'value').map((t) => t.text)).toEqual(f.terms.map((t) => fmtFactor(t.mult)));
    const hueOf = (text: string) => toks.find((t) => t.text === text)!.hue;
    expect(hueOf('BOOST')).toBe(PALETTE.boost.hue);
    expect(hueOf('CHARGE')).toBe(PALETTE.charge.hue);
    expect(hueOf('OVERDRIVE')).toBe(PALETTE.overdrive.hue);
    // the ribbon reveals one multiplier per group, after the machine count
    expect(new Set(toks.map((t) => t.group)).size).toBe(f.terms.length + 2);
  });

  it('MAX HIT: the uncapped number struck out, then MAX HIT and the capped damage in the MAX colour', () => {
    const s = level();
    s.maxHp = s.hp = 100;
    s.grid[idxOf(0, 0)] = g('cannon', 5);
    s.grid[idxOf(5, 4)] = g('cannon', 5);
    const toks = formulaTokens(hitFormula(s, idxOf(5, 4), idxOf(0, 0))!);
    const tail = toks.slice(-3);
    expect(tail[0]).toMatchObject({ struck: true });
    expect(tail[1]).toMatchObject({ text: 'MAX HIT', hue: PALETTE.max.hue });
    expect(tail[2]).toMatchObject({ text: '35', hue: PALETTE.max.hue, role: 'result' });
  });

  it('factors print without the x and at most two decimals', () => {
    expect(fmtFactor(1.4)).toBe('1.4');
    expect(fmtFactor(1.1234)).toBe('1.12');
    expect(fmtFactor(2)).toBe('2');
  });
});
