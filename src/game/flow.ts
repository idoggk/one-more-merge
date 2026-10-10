// Walkthrough part 2 fixes (t-fe74ec39): pure helpers for names, tray copy, boss lessons and the result screen.
// No Phaser here, so the rules are unit-tested (tests/flow.test.ts).
import { SHORT_NAMES, TARGET_NAMES } from '../content/perks';
import { CAST, MONSTER_INDEX } from '../content/levels';
import type { BossAttack } from '../core/boss';

/** F2: the machine on stage by name: a cast character (when its art exists), a stage's classic monster, else the
 *  level's base monster. `vis` = the stage machine's visual, or the level's visual. */
export function machineName(vis: string | undefined, target: number, castArt: (id: string) => boolean, short = false): string {
  if (vis && CAST[vis] && castArt(vis)) return short ? CAST[vis].short : CAST[vis].name;
  const ci = vis && !CAST[vis] && MONSTER_INDEX[vis] !== undefined ? MONSTER_INDEX[vis] : undefined;
  return (short ? SHORT_NAMES : TARGET_NAMES)[ci ?? Math.max(0, target)];
}

/** F3: the tray line on reactive levels; nothing when the next merge earns nothing (no 'MERGE → +0'). */
export function trayEarnText(earn: number, gated: boolean): string {
  if (earn <= 0) return '';
  return gated ? `CHAIN → +${earn}` : `MERGE → +${earn}`;
}

/** F6: result reward lines as rows: at most `max`, then '+N more'. */
export function rewardRows(lines: string[], max = 3): string[] {
  return lines.length <= max ? lines : [...lines.slice(0, max), `+${lines.length - max} more`];
}

/** F8: yard tier rewards joined without a double '+' (booster names like '+WELL' carry their own). */
export function joinRewards(parts: string[]): string {
  return parts.filter(Boolean).join('  ·  ');
}

/** F8: the NEW TOY toast says where the toy is turned on. */
export const newToyText = (name: string) => `NEW TOY: ${name.toUpperCase()}  ·  turn it on in the TEAM tab`;

const LIGHT_WHAT: Partial<Record<BossAttack, string>> = {
  suction: 'It slurps marked machines.\nMove the marked one away!',
  frost: 'It freezes a row.\nNothing can land there for a moment.',
  hot: 'Shooters in this column hit half as hard.\nMove them out.',
  rest: 'Bells and Coils in this row cannot\nwake neighbours. Move them out.',
  split: 'A divider blocks links across it.\nBuild chains on one side.',
  tow: 'These two are linked and move together.\nMerge either to free them.',
  ransom: 'Wake both marked machines\nin one chain, or lose 2 s!',
};

export type BossLesson = { kind: 'card'; key: string; text: string; also: string[] } | { kind: 'guided' } | null;

/** F4: ONE lesson per new boss attack. The boss WAKES card, the first-warning card and the named card all teach the
 *  same thing, so whichever shows first marks the attack learned (`xb_<attack>`) and the rest stay quiet. */
export function bossLesson(
  tips: Record<string, boolean | undefined>,
  attack: BossAttack,
  bd: { name: string; copy: string; attack: BossAttack; mini?: boolean },
  opts: { light: boolean; finalCopy?: string; canGuide?: boolean },
): BossLesson {
  if (opts.light) return { kind: 'card', key: `x_${attack}`, text: `WATCH OUT!\n${LIGHT_WHAT[attack] ?? bd.copy}`, also: [] };
  const key = `xb_${attack}`;
  if (tips[key]) return null;
  if (attack !== bd.attack) return { kind: 'card', key, text: `FINAL PHASE: NEW ATTACK!\n${opts.finalCopy ?? bd.copy}`, also: ['x_boss'] };
  if (bd.mini) return { kind: 'card', key, text: `${bd.name}!\n${bd.copy}`, also: ['x_boss'] };
  // r23: the first clamp is learned by DOING the dodge (the scene marks it learned when the dodge starts)
  if (attack === 'clamp' && !tips.x_boss_guided && opts.canGuide) return { kind: 'guided' };
  return { kind: 'card', key, text: tips.x_boss ? `${bd.name}!\n${bd.copy}` : `BOSS ATTACK!\n${bd.copy}`, also: ['x_boss'] };
}

/** F6: chapter-end overlays (CHAPTER COMPLETE, BACK UP) wait for the player to leave the result screen, then show
 *  one at a time, each closed by its own tap; the button's action runs after the last one. */
export class OverlayQueue {
  private q: ((done: () => void) => void)[] = [];
  private running = false;
  get size() {
    return this.q.length;
  }
  push(show: (done: () => void) => void) {
    this.q.push(show);
  }
  clear() {
    this.q = [];
    this.running = false;
  }
  /** Show every queued overlay in order, then `then` (once). A second call while running is ignored (double tap). */
  run(then: () => void) {
    if (this.running) return;
    this.running = true;
    const step = () => {
      const show = this.q.shift();
      if (!show) {
        this.running = false;
        return then();
      }
      let called = false;
      show(() => {
        if (called) return;
        called = true;
        step();
      });
    };
    step();
  }
}
