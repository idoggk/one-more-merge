import { describe, expect, it } from 'vitest';
import { levelDef } from '../src/content/levels';
import { legalPairs, newGame, newLevel, serialize, type GameState } from '../src/core/game';
import { decodeActions, encodeActions, newRunLog, recordCommand, recordTick, replayRun, type RunLog } from '../src/core/replay';
import { Rng } from '../src/core/rng';

/** A noisy bot: merges, moves, scraps, perk picks and a finger held on the board, all recorded. */
function play(s: GameState, seed: number, maxTicks = 4000): RunLog {
  const log = newRunLog();
  const rng = new Rng(seed);
  let hold = new Set<number>();
  for (let n = 0; n < maxTicks && (s.phase === 'playing' || s.phase === 'choice'); n++) {
    if (s.phase === 'choice') recordCommand(log, s, { k: 'perk', perk: s.offer[rng.int(s.offer.length)] });
    const roll = rng.next();
    if (roll < 0.08) {
      const pairs = legalPairs(s);
      if (pairs.length) {
        const [a, b] = pairs[rng.int(pairs.length)];
        recordCommand(log, s, { k: 'drop', from: a, to: b, id: s.grid[a]!.id });
      }
    } else if (roll < 0.1) {
      const from = s.grid.findIndex((g) => !!g);
      const to = rng.int(s.grid.length);
      if (from >= 0) recordCommand(log, s, { k: 'drop', from, to, id: s.grid[from]!.id });
    } else if (roll < 0.105) {
      const idx = s.grid.findIndex((g) => !!g);
      if (idx >= 0) recordCommand(log, s, { k: 'scrap', idx, id: s.grid[idx]!.id });
    } else if (roll < 0.13) hold = rng.next() < 0.5 ? new Set() : new Set([rng.int(s.grid.length), rng.int(s.grid.length)]);
    recordTick(log, s, hold);
  }
  return log;
}

describe('run replay (r43 best-chain replay)', () => {
  const cases: [string, () => GameState][] = [
    ['classic run with perks', () => newGame(1234)],
    ['saga L5', () => newLevel(levelDef(5)!)],
    ['boss L10', () => newLevel(levelDef(10)!)],
    ['stage L33 with unit levels', () => {
      const s = newLevel(levelDef(33)!);
      s.unitMult = { cannon: 1.2, coil: 1.1 };
      return s;
    }],
    ['light boss L57', () => newLevel(levelDef(57)!)],
  ];
  for (const [name, mk] of cases)
    it(`seed + actions rebuild the exact final state: ${name}`, () => {
      const s = mk();
      const log = play(s, name.length * 7919);
      expect(log.actions.filter((a) => a.k === 'drop').length).toBeGreaterThan(5);
      expect(serialize(replayRun(log)!)).toBe(serialize(s));
    });

  it('rebuilds the board right before the best chain, and that drop fires it again', () => {
    const s = newLevel(levelDef(12)!);
    const log = play(s, 99);
    expect(log.best).not.toBeNull();
    const before = replayRun(log, log.best!.at)!;
    const a = log.actions[log.best!.at];
    expect(a.k).toBe('drop');
    const res = recordCommand(newRunLog(), before, a as Extract<typeof a, { k: 'drop' }>);
    const c = res.events.find((e) => e.type === 'cascade');
    expect(c && c.type === 'cascade' && c.result.count).toBe(log.best!.count);
  });

  it('the text encoding round-trips', () => {
    const log = play(newGame(77), 5);
    const text = encodeActions(log.actions);
    expect(decodeActions(text)).toEqual(log.actions);
    expect(decodeActions('zz')).toBeNull();
  });
});
