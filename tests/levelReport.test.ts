import { describe, expect, it } from 'vitest';
import { BOT_KEYS, CSV_HEADER, bossCheck, botStat, chapterSummary, flags, parseCsv, quantile, rampFlags, starsAt, toCsvRow, type BotStat, type Row } from '../tools/level-report-lib';

const stat = (o: Partial<BotStat> = {}): BotStat => ({ win: 1, clear: 50, p3: 0.6, p2: 1, chainAvg: 2, chainP90: 4, ...o });
const row = (o: Partial<Row> = {}, bots: Partial<Record<(typeof BOT_KEYS)[number], Partial<BotStat>>> = {}): Row => ({
  level: 11,
  kind: 'normal',
  clock: 100,
  two: 80,
  three: 60,
  boss: 0,
  minions: 0,
  bots: { rand25: stat({ p3: 0.1, ...bots.rand25 }), smart3: stat(bots.smart3), smart1: stat(bots.smart1), plan3: stat(bots.plan3) },
  ...o,
});

describe('level-report helpers', () => {
  it('quantile and stars', () => {
    expect(quantile([5, 1, 3, 2, 4], 0.5)).toBe(3);
    expect(quantile([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 0.9)).toBe(10);
    expect(quantile([], 0.5)).toBeNaN();
    expect([starsAt(40, [80, 60]), starsAt(60, [80, 60]), starsAt(70, [80, 60]), starsAt(90, [80, 60])]).toEqual([3, 3, 2, 1]);
  });

  it('botStat counts losses against win and star shares', () => {
    const b = botStat([50, 70, NaN, 90], [1, 2, 3, 6], [80, 60]);
    expect(b.win).toBe(0.75);
    expect(b.clear).toBe(70);
    expect(b.p3).toBe(0.25);
    expect(b.p2).toBe(0.5);
    expect(b.chainAvg).toBe(3);
  });

  it('bossCheck flags a boss weaker than its minions (walkthrough L10: 2250 vs 4150)', () => {
    const c = bossCheck([1804, 2346, 2250]);
    expect(c.minionSum).toBe(4150);
    expect(c.weakVsSum).toBe(true);
    expect(c.weakVsLast).toBe(true);
    expect(bossCheck([1000, 1300, 3000]).weakVsSum).toBe(false);
  });

  it('flags tap-speed stars, weak bosses and trivial chain goals', () => {
    expect(flags(row({}, { smart3: { p3: 0.2 }, smart1: { p3: 0.9 } }))).toContain('TAPSPEED');
    expect(flags(row())).toEqual([]);
    expect(flags(row({ boss: 2250, minions: 4150 }))).toContain('BOSS_WEAK');
    expect(flags(row({ kind: 'chain12' }, { rand25: { win: 0.5, chainP90: 12 } }))).toContain('CHAIN_GOAL_TRIVIAL');
    expect(flags(row({ kind: 'chain12' }, { rand25: { win: 0.5, chainP90: 6 } }))).not.toContain('CHAIN_GOAL_TRIVIAL');
  });

  it('rampFlags marks a jump in the thinking bot load', () => {
    const r = rampFlags([row({ level: 1 }, { smart3: { clear: 40 } }), row({ level: 2 }, { smart3: { clear: 45 } }), row({ level: 3 }, { smart3: { win: 0.5 } })]);
    expect(r.has(2)).toBe(false);
    expect(r.get(3)).toBe('RAMP_SPIKE');
  });

  it('CSV round-trips and chapters group by ten', () => {
    const rows = [row({ level: 3 }), row({ level: 12, boss: 2250, minions: 4150 }, { smart1: { clear: NaN } })];
    const back = parseCsv([CSV_HEADER, ...rows.map((r) => toCsvRow(r))].join('\n'));
    expect(back[1].boss).toBe(2250);
    expect(back[1].bots.smart1.clear).toBeNaN();
    expect(back[0].bots.smart3).toEqual(rows[0].bots.smart3);
    const ch = chapterSummary(back, new Map([[12, ['BOSS_WEAK']]]));
    expect(ch.map((c) => c.ch)).toEqual([1, 2]);
    expect(ch[1].flags).toEqual({ BOSS_WEAK: 1 });
  });
});
