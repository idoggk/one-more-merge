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
import { drop, legalPairs, newLevel, newPuzzle, tick, type GameState, type PuzzleDef } from '../src/core/game';
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
};
// Merge-train flags (sandwich preview, budget levels, tools, yardPressure) are not on this branch yet: add one line each above
// when they land, e.g.  tools: [false, 'power-up tools on the board'],

/** Default-off keys found in TUNING: false booleans plus the registered off-valued modes. */
const offKeys = () => Object.keys(TUNING).filter((k) => (TUNING as Record<string, unknown>)[k] === false);

const OFF_STATE = () => Object.entries(FLAG_REGISTRY).map(([k, [v]]) => [k, v] as const);
const resetFlags = () => {
  for (const [k, v] of OFF_STATE()) (TUNING as Record<string, unknown>)[k] = v;
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
const STEPS = 60;
const TICKS_PER_STEP = 45; // 2.25 s: long enough that Think Bank's 2 s grace shows

/** Deterministic bot: let time pass, then merge the first legal pair. */
function play(s: GameState, steps: number, ticks: number): string {
  const trail: string[] = [];
  for (let i = 0; i < steps; i++) {
    for (let k = 0; k < ticks; k++) tick(s, new Set());
    const p = legalPairs(s)[0];
    if (p) drop(s, p[0], p[1], s.grid[p[0]]!.id);
    if (i % 15 === 14) trail.push(stateHash(s));
  }
  trail.push(stateHash(s));
  return trail.join(',');
}
const daily = (puzzleRaw as unknown as { daily: PuzzleDef[] }).daily;
export function runScript(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [label, n] of SCRIPT_LEVELS) out[label] = play(newLevel(lvl(n)), STEPS, TICKS_PER_STEP);
  out['puzzle'] = play(newPuzzle(daily[0]), 8, 1);
  return out;
}
const GOLDEN = new URL('./golden/flagsOff.json', import.meta.url);

describe('flags-off golden guard', () => {
  it('registry: every default-false TUNING flag is listed (add new flags to FLAG_REGISTRY)', () => {
    const unlisted = offKeys().filter((k) => !(k in FLAG_REGISTRY));
    expect(unlisted, `unlisted default-false TUNING flags: ${unlisted.join(', ')} - add them to FLAG_REGISTRY in tests/flagsOff.test.ts`).toEqual([]);
    for (const [k, [off]] of Object.entries(FLAG_REGISTRY)) {
      expect(k in TUNING, `registry lists ${k}, which is not in TUNING (remove or rename it)`).toBe(true);
      expect((TUNING as Record<string, unknown>)[k], `${k} must default to its OFF value`).toBe(off);
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
    const now = runScript();
    if (process.env.OMM_UPDATE_GOLDEN) {
      writeFileSync(GOLDEN, JSON.stringify(now, null, 1) + '\n');
      return;
    }
    expect(now).toEqual(JSON.parse(readFileSync(GOLDEN, 'utf8')));
  });

  it('flipping a representative flag ON changes the hash (the guard can fail)', () => {
    const base = runScript();
    const flips: [string, Off][] = [['optionA', true], ['thinkBank', true], ['mergeRule', 'sandwichBonus'], ['unitsB1', true]];
    let changed = 0;
    for (const [k, v] of flips) {
      (TUNING as Record<string, unknown>)[k] = v;
      const on = runScript();
      resetFlags();
      if (Object.keys(base).some((l) => on[l] !== base[l])) changed++;
    }
    expect(changed).toBeGreaterThanOrEqual(3);
    expect(runScript()).toEqual(base); // and flipping back restores it exactly
  });
});
