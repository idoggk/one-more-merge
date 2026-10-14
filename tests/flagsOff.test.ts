// FLAGS-OFF GOLDEN GUARD (t-e443025b). One test that proves every default-OFF TUNING flag leaves play byte-identical.
//  1. FLAG_REGISTRY lists every default-false boolean / off-valued mode in src/content/tuning.ts. A new default-false flag that
//     is not listed here fails the registry check, so a future flag must be added (one line) before it can land.
//  2. A fixed script (teach, goal, boss, mini-boss and a puzzle levels, driven by a deterministic bot) is hashed with stateHash
//     and compared with tests/golden/flagsOff.json.
//  3. Flipping a few flags ON changes the hash, so the guard can fail.
// Regenerate the golden after an INTENDED change to default play:
//     OMM_UPDATE_GOLDEN=1 npx vitest run tests/flagsOff.test.ts      (PowerShell: $env:OMM_UPDATE_GOLDEN=1; npx vitest run tests/flagsOff.test.ts)
import { readFileSync, writeFileSync } from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';
import puzzleRaw from '../src/content/puzzles.json';
import { LEVELS } from '../src/content/levels';
import { TUNING } from '../src/content/tuning';
import { BUDGET_LEVELS, newBudgetState } from '../src/core/budget';
import { choosePerk, drop, legalPairs, newLevel, newPuzzle, tick, type GameState, type PuzzleDef } from '../src/core/game';
import { useTool } from '../src/core/tools';
import { stateHash } from '../src/core/roster4';

type Off = boolean | string;
/** key -> [value that means OFF, one-line note]. Add a line here when a new default-off flag appears in TUNING. */
const FLAG_REGISTRY: Record<string, [Off, string]> = {
  optionA: [false, 'mid-level chaos option A: chain-sized Overdrive / earned parts'],
  optionA2: [false, 'option A2: anti-spam damage (chain + fatigue multipliers)'],
  optionA3: [false, 'option A3: full-board supply gate, near-neutral damage'],
  unitsB0: [false, 'units option B0: helpers in bag/matchmaker, Mortar order bonus'],
  unitsB1: [false, 'units option B1: helper jobs, helper pass, longer relays'],
  rosterB: [false, 'roster direction B: one job per unit + Support cards'],
  roster1: [false, 'roster batch 1: Nail Gun / Jackhammer / Gear / Saw Blade'],
  roster2: [false, 'roster batch 2: Wrench / Piston / Spring / Belt Drive'],
  roster3: [false, 'roster batch 3: Blowtorch / Pipe / Blast Plate / Tesla Tower'],
  roster4: [false, 'roster batch 4: Capacitor / Blueprint / Ladder / Rewind Crank'],
  roster5: [false, 'roster batch 5: Crane / Dynamo / Wrecking Ball'],
  roster6: [false, 'roster batch 6: Robot Arm / Tilt Lever'],
  roster7: [false, 'roster batch 7: Rivet Gun / Vice / Router / Hydraulic Press / Lathe'],
  rosterUnlocks: [false, 'chapter unlock plan: gifts and crate tiers by chapter'],
  thinkBank: [false, 'Think Bank: idle board slows / freezes the level clock'],
  mergeAssist: ['off', 'merge assist (presentation only; the core never reads it)'],
  mergeRule: ['today', 'sandwich merge rule: today | sandwich2 | sandwichBonus'],
  sameFamilyRelay: [false, 'false = bells never ring bells, coils never zap coils (TODAY rule; true would be a change)'],
  quietPassive: [false, 'pace block param: quiet auto-shot effect (copied from the CALM pace)'],
  'optA3.fatigue': [false, 'option A3: merge-gap fatigue multiplier'],
  'r5.dynMates': [false, 'Dynamo wakes the block\'s own parts too'],
  tools: [false, 'power tools: Row Surge (chain 5+) and Gear Bomb (sandwich) made on the board'],
  yardPressure: [false, 'Screw Yard countdown + tap budget with stars'],
  yardBook: [false, 'Screw Yard Book: tap-budget stars, unit crate + cards counter, Collection Book'],
  mergeBudget: [false, 'Budget Levels (LAST MERGES): levels with merge_budget play as capped-merge levels'],
  variedOpenings: [false, 'varied openings: 4 seeded start layouts on ordinary levels'],
  paceCaps: [false, 'pace caps: plain kickback twins and matchmaker copies stop above rank 4 (kickbackTwinMaxRank / matchCopyMax stay 8 = no change)'],
  crateOpenV2: [false, 'crate opening V2: anticipation, shake, flash, hero reveal, 3-column summary (presentation only)'],
  effortModel: [false, 'Effort Model S1: boss / mini-boss HP and boss-stage hit cap from effortOverlay.json'],
  uiKitV3: [false, 'UI kit v3 level intro popup (presentation only; the core never reads it)'],
};
// Flags that do not default to false (string / number / nested) cannot be auto-detected: the TUNING digest in the golden
// (see the 'TUNING defaults digest' test) fails on ANY change to a default, so such a flag forces a conscious golden update.
// Merge-train flags (budget levels, tools, yardPressure) are registered above. The sandwich preview has no TUNING flag of its own
// (it is part of mergeRule / mergeAssist).

/** Keys may be dotted (`optA3.fatigue`) for a flag one level inside a TUNING block. */
const getAt = (path: string): unknown => path.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown> | undefined)?.[k], TUNING);
const setAt = (path: string, v: unknown) => {
  const ks = path.split('.');
  const last = ks.pop()!;
  const o = ks.reduce<Record<string, unknown>>((a, k) => a[k] as Record<string, unknown>, TUNING as unknown as Record<string, unknown>);
  o[last] = v;
};

/** Default-off keys found in TUNING: false booleans at the top level and one level inside plain blocks. */
const offKeys = () => {
  const out: string[] = [];
  for (const [k, v] of Object.entries(TUNING)) {
    if (v === false) out.push(k);
    else if (v && typeof v === 'object' && !Array.isArray(v)) for (const [k2, v2] of Object.entries(v)) if (v2 === false) out.push(`${k}.${k2}`);
  }
  return out;
};

/** Stable text of the whole TUNING defaults (every key, nested, any type): any edit to a default, even a new non-boolean flag, changes it. */
const stable = (v: unknown): unknown =>
  Array.isArray(v) ? v.map(stable) : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, stable((v as Record<string, unknown>)[k])])) : v;
const tuningDigest = (): string => {
  const text = JSON.stringify(stable(TUNING));
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 0x01000193) >>> 0;
  return `${h.toString(16).padStart(8, '0')}:${text.length}`;
};

const OFF_STATE = () => Object.entries(FLAG_REGISTRY).map(([k, [v]]) => [k, v] as const);
const resetFlags = () => {
  for (const [k, v] of OFF_STATE()) setAt(k, v);
};
afterEach(resetFlags);

// ---- the fixed script ----------------------------------------------------------------------------------------------
const lvl = (n: number) => LEVELS.find((d) => d.level === n)!;
const firstWhere = (f: (d: (typeof LEVELS)[number]) => boolean) => LEVELS.find(f)!.level;
const SCRIPT_LEVELS: [string, number][] = [
  ['teach-L1', 1],
  ['teach-L2', 2],
  ['teach-L3', 3],
  ['goal-rank', firstWhere((d) => d.goal?.kind === 'rank')],
  ['goal-chain', firstWhere((d) => d.goal?.kind === 'chain')],
  ['mini-boss', firstWhere((d) => !!d.mini_boss)],
  ['L10-boss', 10],
  ['L15', 15],
  ['L20-boss', 20],
  ['L25', 25],
  ['L30-boss', 30],
];
const MAX_STEPS = 400; // a level normally ends (won / lost) well before this
const AFTER_END = 8; // keep ticking this many steps after the end so the result state is hashed too
const CHECK_EVERY = 5;
const TICKS_PER_STEP = 45; // 2.25 s: long enough that Think Bank's 2 s grace shows

/** Full hash: stateHash (which leaves out `support`) plus the Support card's own meter, which a flag could touch. */
const fullHash = (s: GameState): string => `${stateHash(s)}/${JSON.stringify(s.support ?? null)}`;

/** Deterministic bot: let time pass, take the first perk offered, merge the first legal pair; plays on until the end of the level (won / lost). */
let toolsUsed = 0; // counted by play() for the flags-ON checks below
function play(s: GameState, maxSteps: number, ticks: number): string {
  const trail: string[] = [];
  let endedAt = -1;
  for (let i = 0; i < maxSteps; i++) {
    for (let k = 0; k < ticks; k++) tick(s, new Set());
    if (s.phase === 'choice') choosePerk(s, s.offer[0]);
    const t = s.grid.findIndex((g) => !!g?.tool); // a power tool exists only with TUNING.tools ON: tap the first one that would wake something
    if (t >= 0 && useTool(s, t, s.grid[t]!.id).ok) toolsUsed++;
    const p = legalPairs(s)[0];
    if (p) drop(s, p[0], p[1], s.grid[p[0]]!.id);
    if (i % CHECK_EVERY === CHECK_EVERY - 1) trail.push(fullHash(s));
    if (endedAt < 0 && (s.phase === 'won' || s.phase === 'lost')) endedAt = i;
    if (endedAt >= 0 && i - endedAt >= AFTER_END) break;
  }
  // The end-of-level result: phase, step it ended on, stats, perks and the final hash (what the reward is computed from).
  trail.push(`end:${s.phase}@${endedAt}:${JSON.stringify(stable({ stats: s.stats, perks: s.perks, target: s.target }))}`, fullHash(s));
  return trail.join(',');
}
const daily = (puzzleRaw as unknown as { daily: PuzzleDef[] }).daily;
export function runScript(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [label, n] of SCRIPT_LEVELS) out[label] = play(newLevel(lvl(n)), MAX_STEPS, TICKS_PER_STEP);
  out['puzzle'] = play(newPuzzle(daily[0]), 40, 1);
  return out;
}
const GOLDEN = new URL('./golden/flagsOff.json', import.meta.url);

describe('flags-off golden guard', () => {
  it('registry: every default-false TUNING flag is listed (add new flags to FLAG_REGISTRY)', () => {
    const unlisted = offKeys().filter((k) => !(k in FLAG_REGISTRY));
    expect(unlisted, `unlisted default-false TUNING flags: ${unlisted.join(', ')} - add them to FLAG_REGISTRY in tests/flagsOff.test.ts`).toEqual([]);
    for (const [k, [off]] of Object.entries(FLAG_REGISTRY)) {
      expect(getAt(k) !== undefined, `registry lists ${k}, which is not in TUNING (remove or rename it)`).toBe(true);
      expect(getAt(k), `${k} must default to its OFF value`).toBe(off);
    }
  });

  it('the registry check really fails on an unlisted flag', () => {
    (TUNING as Record<string, unknown>).brandNewFlag = false;
    try {
      expect(offKeys().filter((k) => !(k in FLAG_REGISTRY))).toEqual(['brandNewFlag']);
    } finally {
      delete (TUNING as Record<string, unknown>).brandNewFlag;
    }
  });

  it('~12 levels + a puzzle with every flag OFF hash to the checked-in golden', () => {
    resetFlags();
    const now = { ...runScript(), '_tuningDigest': tuningDigest() };
    if (process.env.OMM_UPDATE_GOLDEN) {
      writeFileSync(GOLDEN, JSON.stringify(now, null, 1) + '\n');
      return;
    }
    const golden = JSON.parse(readFileSync(GOLDEN, 'utf8')) as Record<string, string>;
    // TUNING defaults digest: any edit to a default (a new string / number / nested flag included) fails here until the golden is regenerated on purpose.
    expect(now['_tuningDigest'], 'TUNING defaults changed: if intended, add the new flag to FLAG_REGISTRY and regenerate the golden').toBe(golden['_tuningDigest']);
    expect(now).toEqual(golden);
  });

  it('probe: the bot plays each level through to its end (or the step cap), then hashes the result', () => {
    const run = runScript();
    const ends = Object.entries(run).map(([l, t]) => [l, /end:(\w+)@(-?\d+)/.exec(t)!] as const);
    for (const [l, m] of ends) expect(m, l).toBeTruthy();
    // most levels must reach won / lost; the number of checkpoints is large enough to cover late play
    expect(ends.filter(([, m]) => m[2] !== '-1').length).toBeGreaterThanOrEqual(10);
    for (const [l, t] of Object.entries(run)) expect(new Set(t.split(',')).size, `${l} hashes should keep changing`).toBeGreaterThan(3);
  });

  it('Budget Levels ON: the LAST 6 / 8 / 10 levels are played and hashed, deterministically; OFF they do not exist', () => {
    const last = BUDGET_LEVELS.filter((b) => ['last6', 'last8', 'last10'].includes(b.id));
    expect(last.map((b) => b.merge_budget)).toEqual([6, 8, 10]);
    for (const b of last) expect(newBudgetState(b), `${b.id} must be absent while mergeBudget is OFF`).toBeNull();
    setAt('mergeBudget', true);
    const run = () => Object.fromEntries(last.map((b) => [b.id, play(newBudgetState(b)!, 40, 1)]));
    const a = run();
    // the first-legal-pair bot may run out of pairs before the budget (the level then stays 'playing'): it must still play and hash every level
    for (const [id, t] of Object.entries(a)) expect(/end:\w+@-?\d+/.test(t) && new Set(t.split(',')).size > 1, `${id} should be played and hashed`).toBe(true);
    expect(Object.values(a).filter((t) => /end:(won|lost)@\d+/.test(t)).length, 'most bench levels end for the bot').toBeGreaterThanOrEqual(2);
    expect(run()).toEqual(a);
  });

  it('Power tools ON (+1 BONUS sandwich rule): tools get made and used in the bot script, deterministically, and a level cap of 1 limits making', () => {
    const levels = [10, 15, 20, 25, 30, 40, 50];
    const run = (cap?: number) => {
      setAt('tools', true);
      setAt('mergeRule', 'sandwichBonus');
      const made: number[] = [];
      toolsUsed = 0;
      const out = levels.map((n) => {
        const s = newLevel(lvl(n));
        if (cap !== undefined) s.toolCap = cap;
        const t = play(s, MAX_STEPS, TICKS_PER_STEP);
        made.push(s.stats.tools?.made ?? 0);
        return t;
      });
      resetFlags();
      return { out, made, used: toolsUsed };
    };
    const a = run();
    expect(a.made.reduce((x, y) => x + y, 0), 'the bot should make at least one tool').toBeGreaterThan(0);
    expect(a.used, 'and use at least one').toBeGreaterThan(0);
    expect(run()).toEqual(a);
    expect(Math.max(...run(1).made)).toBeLessThanOrEqual(1);
  });

  it('flipping a representative flag ON changes the hash (the guard can fail)', () => {
    const base = runScript();
    const flips: [string, Off][] = [['optionA', true], ['thinkBank', true], ['mergeRule', 'sandwichBonus'], ['unitsB1', true], ['variedOpenings', true]];
    let changed = 0;
    for (const [k, v] of flips) {
      setAt(k, v);
      const on = runScript();
      resetFlags();
      if (Object.keys(base).some((l) => on[l] !== base[l])) changed++;
    }
    expect(changed).toBeGreaterThanOrEqual(3);
    expect(runScript()).toEqual(base); // and flipping back restores it exactly
  });
});
