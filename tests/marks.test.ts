import { describe, expect, it } from 'vitest';
import { COLS } from '../src/content/tuning';
import { BOSSES, type BossTarget } from '../src/core/boss';
import { drop, idxOf, legalPairs, newGame, newLevel, odNeeded, serialize, tick, type GameState } from '../src/core/game';
import { ATTACK_TINT, hsl, inspectMarks, MARK_MEANING, markTip, mergePreview, PALETTE, type Meaning } from '../src/core/marks';
import { LEVELS } from '../src/content/levels';
import type { Family, Gadget } from '../src/core/types';

let id = 5000;
const g = (family: Family, rank = 1, extra: Partial<Gadget> = {}): Gadget => ({ id: id++, family, rank, cd: 3, ...extra });
const board = (): GameState => {
  const s = newGame(7);
  s.grid.fill(null);
  return s;
};
const bossOf = (attack: string) => BOSSES.findIndex((b) => b.attack === attack);

describe('board marks: first-time NEW tips', () => {
  it('fires once per mark kind, pointing at the marked cell', () => {
    const s = board();
    const at = idxOf(3, 2);
    s.grid[at] = g('cannon', 2, { amp: 1.3 });
    const seen: Record<string, boolean> = {};
    const t = markTip(s.grid, seen);
    expect(t?.id).toBe('mark_amp');
    expect(t?.idx).toBe(at);
    expect(t?.text).toContain('BOOSTED');
    expect(t?.text).toContain('x1.3');
    seen[t!.id] = true;
    expect(markTip(s.grid, seen)).toBeNull(); // never again
  });

  it('prime and item get their own tips', () => {
    const s = board();
    s.grid[idxOf(1, 1)] = g('cannon', 1, { primed: true });
    s.grid[idxOf(2, 1)] = g('rocket', 1, { item: { kind: 'overcharge', charges: 2 } });
    const seen: Record<string, boolean> = {};
    const a = markTip(s.grid, seen)!;
    expect(a.id).toBe('mark_prime');
    expect(a.text).toContain('CHARGED');
    expect(a.text).toContain('x1.5');
    seen[a.id] = true;
    const b = markTip(s.grid, seen)!;
    expect(b.id).toBe('mark_item');
    expect(b.idx).toBe(idxOf(2, 1));
    expect(b.text).toContain('OVERCHARGE');
    seen[b.id] = true;
    expect(markTip(s.grid, seen)).toBeNull();
  });

  it('a board without marks shows no tip', () => {
    const s = board();
    s.grid[0] = g('cannon');
    expect(markTip(s.grid, {})).toBeNull();
  });
});

describe('board marks: inspect card lines', () => {
  it('a plain part has no MARKS row', () => {
    const s = board();
    s.grid[0] = g('coil');
    expect(inspectMarks(s, 0)).toEqual({ marks: [], mergeNow: null });
  });

  it('amp: boost line + used on merge', () => {
    const s = board();
    s.grid[0] = g('cannon', 2, { amp: 1.3 });
    const r = inspectMarks(s, 0);
    expect(r.marks.map((m) => m.label)).toEqual(['BOOSTED']);
    expect(r.mergeNow).toBe('If you merge now: x1.3 boost used on this merge.');
  });

  it('prime: charge line + used on merge', () => {
    const s = board();
    s.grid[0] = g('cannon', 2, { primed: true });
    const r = inspectMarks(s, 0);
    expect(r.marks[0].key).toBe('prime');
    expect(r.marks[0].text).toContain('x1.5');
    expect(r.mergeNow).toContain('x1.5 charge used on this merge');
  });

  it('item: power-up with uses left + one use on merge', () => {
    const s = board();
    s.grid[0] = g('bell', 2, { item: { kind: 'corner', charges: 2 } });
    const r = inspectMarks(s, 0);
    expect(r.marks[0]).toMatchObject({ key: 'item', label: 'CORNER KIT', item: 'corner' });
    expect(r.marks[0].text).toContain('next 2 times');
    expect(r.mergeNow).toContain('uses 1 of 2');
  });

  it('several marks list in order and the merge line names each', () => {
    const s = board();
    s.grid[0] = g('cannon', 2, { amp: 1.15, primed: true });
    const r = inspectMarks(s, 0);
    expect(r.marks.map((m) => m.key)).toEqual(['amp', 'prime']);
    expect(r.mergeNow).toBe('If you merge now: x1.15 boost used on this merge; x1.5 charge used on this merge.');
  });

  it('cap crown: top rank line', () => {
    const s = board();
    s.level = undefined;
    s.grid[0] = g('cannon', 6);
    const r = inspectMarks(s, 0);
    expect(r.marks.map((m) => m.key)).toEqual(['cap']);
    expect(r.marks[0].text).toContain('top');
    expect(r.mergeNow).toContain("can't merge");
  });

  it.each([
    ['clamp', { cells: [idxOf(2, 2)] }, false],
    ['frost', { row: 2 }, false],
    ['hot', { col: 2 }, false],
    ['rest', { row: 2 }, false],
    ['suction', { cells: [idxOf(2, 2)] }, true],
  ] as [string, BossTarget, boolean][])('boss %s marks the part with its attack', (atk, tgt, warn) => {
    const s = board();
    const at = idxOf(2, 2);
    s.grid[at] = g('cannon', 2);
    s.grid[idxOf(0, 0)] = g('coil', 1);
    s.boss = { def: bossOf(atk), next: 0, phaseShown: 0, pending: warn ? { ...tgt, deadline: s.elapsed + 2, phase: 0 } : null, active: warn ? null : { ...tgt, until: s.elapsed + 3 } };
    const r = inspectMarks(s, at);
    expect(r.marks).toHaveLength(1);
    expect(r.marks[0]).toMatchObject({ key: 'boss', attack: atk });
    expect(r.marks[0].text).toMatch(warn ? /^In 2\.0s/ : /3\.0s left/);
    expect(inspectMarks(s, idxOf(0, 0)).marks).toHaveLength(0); // outside the target: nothing
  });

  it('remix lock reads as LOCKED in the locked colour', () => {
    const s = board();
    s.grid[0] = g('cannon', 2);
    s.remix = { kind: 'jam', next: 0, pending: null, lock: { cells: [0], until: s.elapsed + 3 } };
    expect(inspectMarks(s, 0).marks[0]).toMatchObject({ key: 'lock', label: 'LOCKED' });
    expect(MARK_MEANING.lock).toBe('locked');
  });

  it('boss ransom follows the marked ids and explains the merge', () => {
    const s = board();
    const a = g('cannon', 2), b = g('coil', 1);
    s.grid[idxOf(4, 0)] = a;
    s.grid[idxOf(4, COLS - 1)] = b;
    s.boss = { def: bossOf('ransom'), next: 0, phaseShown: 0, active: null, pending: { ids: [a.id, b.id], deadline: s.elapsed + 4, phase: 0 } };
    const r = inspectMarks(s, idxOf(4, 0));
    expect(r.marks[0]).toMatchObject({ key: 'boss', attack: 'ransom', label: 'TIME RANSOM' });
    expect(r.mergeNow).toContain('ransom mark moves');
  });
});

const chipsOf = (s: GameState, from: number, to: number) => mergePreview(s, from, to)!.chips.map((c) => (c.struck ? '~' : '') + [c.text, c.sub].filter(Boolean).join(' '));

describe('merge preview chips (clarity pass 2)', () => {
  it('no match, no chips; preview never mutates the state', () => {
    const s = board();
    s.grid[0] = g('cannon', 1);
    s.grid[1] = g('cannon', 2);
    s.grid[2] = g('cannon', 2, { amp: 1.3 });
    expect(mergePreview(s, 0, 1)).toBeNull();
    const before = serialize(s);
    expect(mergePreview(s, 1, 2)).not.toBeNull();
    expect(serialize(s)).toBe(before);
  });

  it('a plain merge shows its chain size and the Overdrive charge it adds', () => {
    const s = board();
    s.grid[idxOf(0, 0)] = g('cannon', 1);
    s.grid[idxOf(5, 4)] = g('cannon', 1);
    const chips = chipsOf(s, idxOf(0, 0), idxOf(5, 4));
    expect(chips[0]).toBe('CHAIN 1');
    expect(chips).toContain(`+1 OVERDRIVE 1/${odNeeded(s)}`);
  });

  it('a boost on the merging pair: its multiplier, struck out (used up)', () => {
    const s = board();
    s.grid[idxOf(0, 0)] = g('cannon', 2, { amp: 1.3 });
    s.grid[idxOf(5, 4)] = g('cannon', 2);
    const p = mergePreview(s, idxOf(5, 4), idxOf(0, 0))!;
    expect(p.chips).toContainEqual({ meaning: 'boost', text: 'x1.3', sub: 'BOOST', struck: true });
  });

  it('a charge on the target: x1.5 struck; both parts charged: the extra one is lost', () => {
    const s = board();
    s.grid[idxOf(0, 0)] = g('cannon', 2, { primed: true });
    s.grid[idxOf(5, 4)] = g('cannon', 2, { primed: true });
    expect(chipsOf(s, idxOf(5, 4), idxOf(0, 0))).toEqual(expect.arrayContaining(['~x1.5 CHARGE', '~CHARGE']));
  });

  it('two boosts on the pair: the larger is used, the smaller is lost', () => {
    const s = board();
    s.grid[idxOf(0, 0)] = g('cannon', 2, { amp: 1.15 });
    s.grid[idxOf(5, 4)] = g('cannon', 2, { amp: 1.3 });
    expect(chipsOf(s, idxOf(5, 4), idxOf(0, 0))).toEqual(expect.arrayContaining(['~x1.3 BOOST', '~BOOST']));
  });

  it('power-up: uses left, or struck when this merge spends the last use', () => {
    const s = board();
    s.grid[idxOf(0, 0)] = g('cannon', 2, { item: { kind: 'overcharge', charges: 2 } });
    s.grid[idxOf(5, 4)] = g('cannon', 2);
    expect(chipsOf(s, idxOf(5, 4), idxOf(0, 0))).toContain('x2 OVERCHARGE 1 LEFT');
    s.grid[idxOf(0, 0)]!.item!.charges = 1;
    expect(chipsOf(s, idxOf(5, 4), idxOf(0, 0))).toContain('~x2 OVERCHARGE');
  });

  it('an Amplifier in the chain: its new mark shows (used now, or placed for later)', () => {
    const s = board();
    s.grid[idxOf(2, 2)] = g('amplifier', 1);
    s.grid[idxOf(5, 4)] = g('amplifier', 1);
    s.grid[idxOf(2, 3)] = g('bell', 3); // touching the merged Amplifier: gets the mark
    const p = mergePreview(s, idxOf(5, 4), idxOf(2, 2))!;
    expect(p.chips.some((c) => c.meaning === 'boost' && !c.struck)).toBe(true);
  });

  it('matches what the real merge does: chain size, parts earned, Overdrive charge (levels 5..40)', () => {
    let checked = 0;
    for (let L = 5; L <= 40; L += 5) {
      const s = newLevel({ ...LEVELS[L - 1], waves: undefined, wave_visuals: undefined, minion_hp: undefined });
      for (let k = 0; k < 40; k++) tick(s);
      for (const [a, b] of legalPairs(s).slice(0, 4)) {
        const p = mergePreview(s, a, b)!;
        const real = JSON.parse(serialize(s)) as GameState;
        const r = drop(real, a, b, s.grid[a]!.id);
        const ev = r.events.find((e) => e.type === 'cascade');
        expect(ev && ev.type === 'cascade' && p.count).toBe(ev && ev.type === 'cascade' && ev.result.count);
        const parts = (real.owed ?? 0) - (s.owed ?? 0);
        const chip = p.chips.find((c) => c.meaning === 'parts');
        expect(chip ? Number(chip.text.slice(1)) : 0).toBe(parts);
        const od = p.chips.find((c) => c.meaning === 'overdrive');
        expect(!!od).toBe(real.odCharge !== s.odCharge || real.odLeft > s.odLeft);
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(10);
  });
});

describe('one colour per meaning (clarity pass 2)', () => {
  const dist = (a: number, b: number) => Math.min(Math.abs(a - b), 360 - Math.abs(a - b));
  const chromatic = (c: number) => hsl(c).s >= 0.35;
  const entries = Object.entries(PALETTE) as [Meaning, (typeof PALETTE)[Meaning]][];

  it('every meaning has a label, a sentence and an icon', () => {
    for (const [, p] of entries) expect(p.label && p.text && p.icon).toBeTruthy();
  });

  it('no two meanings share a hue (chromatic hues 15+ degrees apart, neutrals far apart in lightness)', () => {
    for (let i = 0; i < entries.length; i++)
      for (let j = i + 1; j < entries.length; j++) {
        const [ka, a] = entries[i], [kb, b] = entries[j];
        const ca = chromatic(a.hue), cb = chromatic(b.hue);
        if (ca && cb) expect(dist(hsl(a.hue).h, hsl(b.hue).h), `${ka} vs ${kb}`).toBeGreaterThanOrEqual(15);
        else if (!ca && !cb) expect(Math.abs(hsl(a.hue).l - hsl(b.hue).l), `${ka} vs ${kb}`).toBeGreaterThan(0.3);
      }
  });

  it('boss attack tints stay off every other meaning\'s hue; a clamp is LOCKED', () => {
    expect(ATTACK_TINT.clamp).toBe(PALETTE.locked.hue);
    for (const [atk, tint] of Object.entries(ATTACK_TINT)) {
      if (!chromatic(tint)) continue;
      for (const [k, p] of entries) {
        if (k === 'attack' || !chromatic(p.hue)) continue;
        expect(dist(hsl(tint).h, hsl(p.hue).h), `${atk} vs ${k}`).toBeGreaterThanOrEqual(15);
      }
    }
  });

  it('every inspect mark kind maps to a meaning', () => {
    for (const k of ['amp', 'prime', 'item', 'cap', 'boss', 'remix', 'lock'] as const) expect(PALETTE[MARK_MEANING[k]]).toBeDefined();
  });
});