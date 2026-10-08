import { describe, expect, it } from 'vitest';
import { levelDef } from '../src/content/levels';
import { legalPairs, newLevel, type GameState } from '../src/core/game';
import { buildCurve, decodeCurve, ghostProgress, levelProgress, PACE_SAMPLES, paceDelta, paceFromLog, paceLabel, updatePace, type PaceCurve } from '../src/core/pace';
import { newRunLog, recordCommand, recordTick, type RunLog } from '../src/core/replay';
import { Rng } from '../src/core/rng';

/** A merge-happy bot that plays a level to the end through the run log (as the live game does). */
function play(s: GameState, seed: number, mergeRate: number, maxTicks = 12000): RunLog {
  const log = newRunLog();
  const rng = new Rng(seed);
  for (let n = 0; n < maxTicks && (s.phase === 'playing' || s.phase === 'choice'); n++) {
    if (s.phase === 'choice') recordCommand(log, s, { k: 'perk', perk: s.offer[0] });
    if (rng.next() < mergeRate) {
      const pairs = legalPairs(s);
      if (pairs.length) {
        const [a, b] = pairs[rng.int(pairs.length)];
        recordCommand(log, s, { k: 'drop', from: a, to: b, id: s.grid[a]!.id });
      }
    }
    recordTick(log, s, new Set());
  }
  return log;
}

/** A straight-line ghost sampled every 10 ms like a real (50 ms tick) run: progress = elapsed / t. */
const linear = (t: number): PaceCurve => buildCurve(Array.from({ length: 4001 }, (_, i) => [(t * i) / 4000, i / 4000] as [number, number]), t)!;

describe('ghost pace (r46)', () => {
  it('a won level becomes a compact curve: PACE_SAMPLES values, 0 at the start, 1 at the win time', () => {
    const s = newLevel(levelDef(3)!);
    const log = play(s, 11, 0.3);
    expect(s.phase).toBe('won');
    const c = paceFromLog(log)!;
    expect(c).not.toBeNull();
    expect(c.t).toBeCloseTo(s.elapsed, 1);
    expect(c.p.length).toBe(PACE_SAMPLES * 2);
    expect(JSON.stringify(c).length).toBeLessThan(100);
    const v = decodeCurve(c)!;
    expect(v[0]).toBe(0);
    expect(v[v.length - 1]).toBe(1);
    for (let i = 1; i < v.length; i++) expect(v[i]).toBeGreaterThanOrEqual(v[i - 1]);
    // the JSON round trip (the save) keeps it
    expect(decodeCurve(JSON.parse(JSON.stringify(c)))).toEqual(v);
  });

  it('stage levels count progress over all machines', () => {
    const s = newLevel(levelDef(10)!);
    expect(levelProgress(s)).toBe(0);
    s.hp = s.maxHp / 2;
    expect(levelProgress(s)).toBeCloseTo(s.maxHp / 2 / s.stage!.total, 6);
    s.stage!.done = s.stage!.total - s.maxHp;
    s.hp = 0;
    expect(levelProgress(s)).toBe(1);
  });

  it('a lost run gives no curve', () => {
    const s = newLevel(levelDef(30)!);
    const log = play(s, 3, 0.002);
    expect(s.phase).toBe('lost');
    expect(paceFromLog(log)).toBeNull();
  });

  it('only a faster win replaces the stored ghost', () => {
    const store: Record<string, PaceCurve> = {};
    expect(updatePace(store, '3', linear(40))).toBe(true);
    expect(updatePace(store, '3', linear(45))).toBe(false);
    expect(store['3'].t).toBe(40);
    expect(updatePace(store, '3', linear(40))).toBe(false);
    expect(updatePace(store, '3', linear(32.5))).toBe(true);
    expect(store['3'].t).toBe(32.5);
    expect(updatePace(store, '3', null)).toBe(false);
    // a broken saved curve is replaced by any real one
    store['4'] = { t: 10, p: 'junk' };
    expect(updatePace(store, '4', linear(60))).toBe(true);
  });

  it('a faster real win replaces the slower one from the same level', () => {
    const slow = play(newLevel(levelDef(3)!), 11, 0.05);
    const fast = play(newLevel(levelDef(3)!), 11, 0.4);
    const cs = paceFromLog(slow)!;
    const cf = paceFromLog(fast)!;
    expect(cf.t).toBeLessThan(cs.t);
    const store: Record<string, PaceCurve> = {};
    updatePace(store, '3', cs);
    expect(updatePace(store, '3', cf)).toBe(true);
    expect(updatePace(store, '3', cs)).toBe(false);
    expect(store['3']).toEqual(cf);
  });

  it('ahead / behind: seconds earlier or later than the ghost reached the same progress', () => {
    const c = linear(40); // ghost deals 2.5% per second
    expect(ghostProgress(c, 20)).toBeCloseTo(0.5, 2);
    // at 20 s with 60% done: the ghost got to 60% at 24 s -> 4 s ahead
    expect(paceDelta(c, 20, 0.6)).toBeCloseTo(4, 1);
    // at 20 s with 40% done: the ghost had 40% at 16 s -> 4 s behind
    expect(paceDelta(c, 20, 0.4)).toBeCloseTo(-4, 1);
    // level with the ghost
    expect(paceDelta(c, 20, ghostProgress(c, 20))).toBe(0);
    // no damage yet at 0 s vs a ghost that also has none = on pace
    expect(paceDelta(c, 0, 0)).toBe(0);
    // finishing faster than the ghost's win
    expect(paceDelta(c, 30, 1)).toBeCloseTo(10, 1);
  });

  it('a ghost that starts slow: an idle player is level until the ghost hits, then falls behind', () => {
    // nothing for 10 s, then linear to 1 at 30 s
    const pts: [number, number][] = Array.from({ length: 301 }, (_, i) => [i / 10, Math.max(0, (i / 10 - 10) / 20)]);
    const c = buildCurve(pts, 30)!;
    expect(paceDelta(c, 5, 0)).toBe(0);
    expect(paceDelta(c, 20, 0)).toBeLessThan(-8);
    expect(paceDelta(c, 20, 0.75)).toBeGreaterThan(4);
  });

  it('labels', () => {
    expect(paceLabel(2.14)).toBe('2.1 s ahead');
    expect(paceLabel(-1.4)).toBe('1.4 s behind');
    expect(paceLabel(0.01)).toBe('on pace');
  });
});
