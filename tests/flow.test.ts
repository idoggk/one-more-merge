import { describe, expect, it } from 'vitest';
import { CAST, LEVELS } from '../src/content/levels';
import { TARGET_NAMES } from '../src/content/perks';
import { TUNING } from '../src/content/tuning';
import { BOSSES } from '../src/core/boss';
import { LESSON_FUSE, newLevel, restartBossFuse } from '../src/core/game';
import { decodeActions, encodeActions, newRunLog, recordCommand, recordTick, replayRun } from '../src/core/replay';
import { bossLesson, joinRewards, machineName, newToyText, OverlayQueue, rewardRows, trayEarnText } from '../src/game/flow';

const solo = (d: (typeof LEVELS)[number]) => ({ ...d, waves: undefined, wave_visuals: undefined, minion_hp: undefined });

describe('walkthrough part 2 fixes (t-fe74ec39)', () => {
  it('F2: the defeat banner names the machine on stage, not the level base monster', () => {
    const vis = LEVELS[8].visual!;
    expect(vis).toBe('colander_clatter');
    expect(`${machineName(vis, newLevel(LEVELS[8]).target, () => true)} DOWN!`).toBe('COLANDER CLATTER DOWN!');
    expect(machineName(vis, 0, () => true, true)).toBe(CAST[vis].short);
    // no cast art: the classic monster name, as before
    expect(machineName(vis, 2, () => false)).toBe(TARGET_NAMES[2]);
    expect(machineName(undefined, -1, () => true)).toBe(TARGET_NAMES[0]);
  });

  it('F3: the tray hides MERGE → +0', () => {
    expect(trayEarnText(0, false)).toBe('');
    expect(trayEarnText(0, true)).toBe('');
    expect(trayEarnText(2, false)).toBe('MERGE → +2');
    expect(trayEarnText(3, true)).toBe('CHAIN → +3');
  });

  it('F6: reward rows are max 3, then +N more', () => {
    expect(rewardRows(['a', 'b'])).toEqual(['a', 'b']);
    expect(rewardRows(['a', 'b', 'c'])).toEqual(['a', 'b', 'c']);
    expect(rewardRows(['a', 'b', 'c', 'd', 'e'])).toEqual(['a', 'b', 'c', '+2 more']);
  });

  it('F8: no double + in yard rewards; NEW TOY says where', () => {
    const t = joinRewards(['30 GEMS', '', '+WELL']);
    expect(t).not.toMatch(/\+\s*\+/);
    expect(t).toBe('30 GEMS  ·  +WELL');
    expect(newToyText('Magnet')).toContain('in the TEAM tab');
  });

  it('F4: one lesson per new boss attack (wake card + first warning never both)', () => {
    const bd = BOSSES.find((b) => !b.mini && b.attack !== 'clamp')!;
    const tips: Record<string, boolean> = {};
    const first = bossLesson(tips, bd.attack, bd, { light: false });
    expect(first).toMatchObject({ kind: 'card', key: `xb_${bd.attack}` });
    expect(first && first.kind === 'card' && first.text.startsWith('BOSS ATTACK!')).toBe(true);
    // the WAKES card marks the attack learned (and the boss lesson): the first warning shows nothing more
    expect(bossLesson({ [`xb_${bd.attack}`]: true, x_boss: true }, bd.attack, bd, { light: false })).toBeNull();
    // a card shown at the first warning marks the same keys, so later warnings stay quiet
    if (first?.kind === 'card') for (const k of [first.key, ...first.also]) tips[k] = true;
    expect(bossLesson(tips, bd.attack, bd, { light: false })).toBeNull();
    // a new final-phase attack still gets its own single card
    const other = bd.second ?? 'bomb';
    expect(bossLesson(tips, other, bd, { light: false, finalCopy: 'x' })).toMatchObject({ kind: 'card', key: `xb_${other}` });
    // the first clamp is a guided dodge when possible, else a card
    const clamp = BOSSES.find((b) => b.attack === 'clamp' && !b.mini)!;
    expect(bossLesson({}, 'clamp', clamp, { light: false, canGuide: true })).toEqual({ kind: 'guided' });
    expect(bossLesson({}, 'clamp', clamp, { light: false, canGuide: false })).toMatchObject({ kind: 'card', key: 'xb_clamp' });
  });

  it('F4: GOT IT restarts the warned attack fuse (>= 3.5 s), recorded so the replay matches', () => {
    const s = newLevel(solo(LEVELS[9]));
    const log = newRunLog();
    while (!s.boss!.pending && s.elapsed < 30) recordTick(log, s, new Set());
    const p = s.boss!.pending!;
    expect(p).toBeTruthy();
    // the card was up while the fuse ran down (e.g. 2 s of it): GOT IT gives it back
    for (let i = 0; i < 2 / 0.05 && s.boss!.pending; i++) recordTick(log, s, new Set());
    expect(s.boss!.pending).toBe(p);
    expect(recordCommand(log, s, { k: 'fuse' }).ok).toBe(true);
    expect(p.deadline - s.elapsed).toBeCloseTo(Math.max(TUNING.bossWarn, LESSON_FUSE), 6);
    // never shortens a longer fuse
    const before = p.deadline;
    p.deadline = s.elapsed + 10;
    expect(restartBossFuse(s)).toBe(true);
    expect(p.deadline).toBe(s.elapsed + 10);
    p.deadline = before;
    // no attack warned: nothing to restart, nothing logged
    const q = newLevel(solo(LEVELS[9]));
    expect(restartBossFuse(q)).toBe(false);
    // the fuse command round-trips the text log and the replay rebuilds the same state
    expect(decodeActions(encodeActions(log.actions))).toEqual(log.actions);
    for (let i = 0; i < 20; i++) recordTick(log, s, new Set());
    const r = replayRun(log)!;
    expect(r.boss!.pending?.deadline).toBe(s.boss!.pending?.deadline);
    expect(r.elapsed).toBeCloseTo(s.elapsed, 9);
  });

  it('F6: chapter overlays run one at a time after the result, then the button action (once)', () => {
    const q = new OverlayQueue();
    const seen: string[] = [];
    const closers: (() => void)[] = [];
    q.push((done) => (seen.push('chest'), closers.push(done)));
    q.push((done) => (seen.push('backup'), closers.push(done)));
    let next = 0;
    q.run(() => next++);
    expect(seen).toEqual(['chest']); // only the first shows
    q.run(() => next++); // a second tap while running is ignored
    closers[0]();
    closers[0](); // a double close never skips the backup card
    expect(seen).toEqual(['chest', 'backup']);
    expect(next).toBe(0); // NEXT LEVEL waits for the last card, it is not dropped
    closers[1]();
    expect(next).toBe(1);
    // empty queue: the button acts at once
    q.run(() => next++);
    expect(next).toBe(2);
  });
});
