import { describe, expect, it } from 'vitest';
import { LEVELS } from '../src/content/levels';
import { drop, legalPairs, newLevel, previewMerge, tick, type GameEvent, type GameState } from '../src/core/game';
import { markTip } from '../src/core/marks';
import { Rng } from '../src/core/rng';
import { admitTip, newTipLedger, TIP_BUDGET, type TipLedger } from '../src/game/tips';
import { grantToy, refreshUnlocks, migrateUnlocks, toyEarned, TOY_LEVEL, type UnlockMeta } from '../src/game/unlocks';

/**
 * t-0a294f99 (new-player walkthrough F2/F3). A scripted fresh run: a bot merges every 2.5 s (60% a random pair, 40% the
 * biggest-chain pair) and every tip trigger GameScene has (same ids, same card counts) asks for its pause card.
 */
type Ask = (id: string, cards: number, atStart: boolean) => void;
interface LevelLog { level: number; cards: number; start: number; shown: string[]; won: boolean }

function playLevel(level: number, ask: Ask, onEvent: (s: GameState, e: GameEvent) => void = () => {}): { won: boolean } {
  const def = LEVELS[level - 1];
  const s = newLevel(def);
  // GameScene.finishIntro: the level's lesson, else the tap hint (L4+); the stage HUD card on stage levels
  if (def.teach) ask(`teach_${level}`, 1, true);
  else if (level >= 4) ask('tap_hint', 1, true);
  if (s.stage) ask('stage_hud', 1, true);
  const rng = new Rng(level * 7919);
  let next = 2.5;
  const handle = (evs: GameEvent[]) => {
    for (const e of evs) {
      onEvent(s, e);
      if (e.type === 'cascade' && !e.kickback && e.result.count >= 3) ask('x_chain', 2, false);
      if (e.type === 'kickback') ask('x_kick', 1, false);
    }
  };
  while (s.phase === 'playing' && s.elapsed < 400) {
    if (s.elapsed >= next) {
      next += 2.5;
      const pairs = legalPairs(s);
      if (pairs.length) {
        let [a, b] = pairs[Math.floor(rng.next() * pairs.length)];
        if (rng.next() < 0.4) {
          let best = -1;
          for (const [f, t] of pairs) {
            const c = previewMerge(s, f, t)?.count ?? 0;
            if (c > best) [best, a, b] = [c, f, t];
          }
        }
        handle(drop(s, a, b, s.grid[a]!.id).events);
      }
    }
    handle(tick(s));
    // GameScene.checkTips
    const occ = s.grid.filter(Boolean).length;
    if (s.odCharge > 0 && level >= 3) ask('overdrive', 1, false);
    if (s.elapsed > 5 && s.elapsed < 12) ask('delivery', 1, false);
    if (s.elapsed > 3 && level >= 2) ask('star_ticks', 1, false);
    if (occ >= 23) ask('full', 1, false);
    if (s.timeLeft < 30) ask('clock', 1, false);
    const mt = markTip(s.grid, {}, s);
    if (mt) ask(mt.id, 1, false);
    if (s.stage?.i === 1) ask('next_machine', 1, false);
  }
  return { won: s.phase === 'won' };
}

/** Plays L1..`to` from a fresh save; `budget` false = the old behaviour (every first-time tip shows). */
function freshRun(to: number, budget = true) {
  const seen: Record<string, boolean> = {};
  const queue: string[] = [];
  const logs: LevelLog[] = [];
  for (let level = 1; level <= to; level++) {
    const ledger: TipLedger = newTipLedger(budget ? level : undefined);
    const log: LevelLog = { level, cards: 0, start: 0, shown: [], won: false };
    log.won = playLevel(level, (id, cards, atStart) => {
      if (seen[id] || !admitTip(ledger, queue, id, cards, atStart)) return;
      seen[id] = true;
      log.cards += cards;
      if (atStart) log.start += cards;
      log.shown.push(id);
    }).won;
    logs.push(log);
  }
  return { logs, queue, seen };
}

describe('t-0a294f99 tip budget', () => {
  it('without the budget the early levels flood the player (the walkthrough problem)', () => {
    const { logs } = freshRun(5, false);
    expect(Math.max(...logs.map((l) => l.cards))).toBeGreaterThan(TIP_BUDGET.perLevel);
  });

  it('a scripted fresh run L1-L5 shows at most 2 pause cards per level and at most 1 at level start', () => {
    const { logs } = freshRun(5);
    for (const l of logs) {
      expect(l.cards, `L${l.level}: ${l.shown.join(', ')}`).toBeLessThanOrEqual(2);
      expect(l.start, `L${l.level} start`).toBeLessThanOrEqual(1);
    }
    // each level's own lesson still shows
    for (const l of logs.slice(0, 3)) expect(l.shown[0]).toBe(`teach_${l.level}`);
  });

  it('kickback is one card, never before L5', () => {
    const { logs } = freshRun(7);
    for (const l of logs.filter((x) => x.level < 5)) expect(l.shown).not.toContain('x_kick');
  });

  it('extra tips are queued for later levels, not dropped', () => {
    const early = freshRun(5);
    expect(early.queue.length).toBeGreaterThan(0);
    const all = freshRun(5, false).seen;
    // every lesson the old run showed is either shown by now or waiting in the queue
    for (const id of Object.keys(all)) expect(early.seen[id] || early.queue.includes(id), id).toBeTruthy();
    // and the queue drains as later levels have room
    const later = freshRun(7);
    expect(early.queue.some((id) => later.seen[id])).toBe(true);
    for (const id of early.queue.filter((id) => later.seen[id])) expect(later.queue).not.toContain(id);
  });

  it('the ledger: start slot, level total, min level, queue', () => {
    const q: string[] = [];
    const l = newTipLedger(3);
    expect(admitTip(l, q, 'teach_3', 1, true)).toBe(true);
    expect(admitTip(l, q, 'stage_hud', 1, true)).toBe(false); // start slot used
    expect(admitTip(l, q, 'x_kick', 1, false)).toBe(false); // waits for L5
    expect(admitTip(l, q, 'x_chain', 2, false)).toBe(false); // 1 + 2 > 2
    expect(admitTip(l, q, 'delivery', 1, false)).toBe(true);
    expect(admitTip(l, q, 'clock', 1, false)).toBe(false);
    expect(admitTip(l, q, 'clock', 1, false)).toBe(false);
    expect(q).toEqual(['stage_hud', 'x_kick', 'x_chain', 'clock']); // queued once each
    const l5 = newTipLedger(5);
    expect(admitTip(l5, q, 'x_kick', 1, false)).toBe(true);
    expect(q).not.toContain('x_kick');
    // not a saga level (puzzle, boss fight): unbudgeted
    const free = newTipLedger();
    for (let i = 0; i < 5; i++) expect(admitTip(free, q, `p${i}`, 3, true)).toBe(true);
  });
});

describe('t-0a294f99 toys wait for L8', () => {
  const freshMeta = (): UnlockMeta => ({ toys: {}, hardUnlocked: false, units: { cannon: { level: 1, cards: 0 }, coil: { level: 1, cards: 0 }, bell: { level: 1, cards: 0 }, fan: { level: 1, cards: 0 } } });
  const threeCannons = { activations: [{ family: 'cannon' }, { family: 'cannon' }, { family: 'cannon' }], discharged: [] };

  it('on a fresh save, L1-L7 never unlock a toy or TEAM', () => {
    const m = freshMeta();
    migrateUnlocks(m, 0);
    let bigCannonChains = 0;
    for (let level = 1; level < TOY_LEVEL; level++) {
      const { won } = playLevel(level, () => {}, (_s, e) => {
        if (e.type !== 'cascade') return;
        if (e.result.activations.filter((a) => a.family === 'cannon').length >= 3) bigCannonChains++;
        const toy = toyEarned(level, m.toys, e.result, e.kickback, false);
        if (toy) grantToy(m.toys, toy, (t) => t);
      });
      if (won) refreshUnlocks(m, level);
      expect(m.toys).toEqual({});
      expect(m.unlocks?.team).toBeUndefined();
    }
    // the bot did chain 3+ cannons (the L1 accident from the walkthrough), and it still unlocked nothing
    expect(bigCannonChains).toBeGreaterThan(0);
  });

  it('the same 3-cannon chain earns the Magnet from L8, and that opens TEAM', () => {
    expect(toyEarned(1, {}, threeCannons, false, false)).toBeNull();
    expect(toyEarned(TOY_LEVEL - 1, {}, threeCannons, false, false)).toBeNull();
    expect(toyEarned(TOY_LEVEL, {}, threeCannons, false, false)).toBe('magnet');
    const m = freshMeta();
    migrateUnlocks(m, 0);
    grantToy(m.toys, 'magnet', (t) => t);
    expect(refreshUnlocks(m, TOY_LEVEL - 2)).not.toContain('team');
    expect(refreshUnlocks(m, TOY_LEVEL - 1)).toContain('team');
  });

  it('a new toy never switches the player’s toy off silently, and the toast says what happened', () => {
    const name = (t: string) => ({ magnet: 'Magnet', battery: 'Battery' })[t] ?? t;
    const toys: Partial<Record<string, boolean>> = {};
    const first = grantToy(toys, 'magnet', name)!;
    expect(first.on).toBe(true);
    expect(toys).toEqual({ magnet: true });
    expect(first.text).toContain('ON');
    expect(first.text).not.toMatch(/turn it on/i);
    const second = grantToy(toys, 'battery', name)!;
    expect(second.on).toBe(false);
    expect(toys).toEqual({ magnet: true, battery: false }); // Magnet stays selected
    expect(second.text).toContain('MAGNET stays');
    expect(second.text).not.toMatch(/turn it on/i);
    expect(grantToy(toys, 'battery', name)).toBeNull(); // already owned: nothing changes
    // the player switched every toy off: the new one comes on (and the toast says so)
    const off: Partial<Record<string, boolean>> = { magnet: false };
    expect(grantToy(off, 'battery', name)!.on).toBe(true);
    expect(off).toEqual({ magnet: false, battery: true });
  });

  it('existing saves keep their toys and TEAM', () => {
    const old: UnlockMeta = { ...freshMeta(), toys: { magnet: true }, levelStars: { 1: 3, 2: 3 } };
    migrateUnlocks(old, 2);
    refreshUnlocks(old, 2);
    expect(old.unlocks?.team).toBe(true);
    expect(old.toys).toEqual({ magnet: true });
  });
});
