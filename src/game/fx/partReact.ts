// Parts react to your finger (rival-games study #10; presentation only, never touches the model).
// While a part is held, every part it can merge with leans toward it a little and a marked one wiggles its badge.
// After IDLE_BLINK s without input, parts that have a pair blink gently. Called once per frame after animateIdle().
import type Phaser from 'phaser';
import { canMerge, legalPairs, type GameState } from '../../core/game';

/** Seconds without input before paired parts blink (the 8 s pair hint in updateHints comes after this and ends it). */
export const IDLE_BLINK = 6;
/** One blink cycle: a soft dip and back, then a rest. */
const BLINK_MS = 1600;
const BLINK_ON = 520;
const LEAN_DEG = 7;
const LEAN_PX = 5;

/** Blink brightness 0..1 at `ms` since blinking started (0 while resting). */
export function blinkLevel(ms: number) {
  const t = ((ms % BLINK_MS) + BLINK_MS) % BLINK_MS;
  return t < BLINK_ON ? Math.sin((Math.PI * t) / BLINK_ON) : 0;
}

/** Idle blink: only on a quiet, normal board (never in puzzles: they have their own graduated help, and never with
 *  hints off). It stops once the 8 s hint pair shows, so the hint is then the one thing that moves. */
export function idleBlinkOn(o: { playing: boolean; dragIdx: number; hints?: boolean; puzzle: boolean; hintPair: unknown; idleTime: number }) {
  return o.playing && o.dragIdx < 0 && o.hints !== false && !o.puzzle && !o.hintPair && o.idleTime >= IDLE_BLINK;
}

/** Cells that are in at least one legal pair. */
export function pairedCells(s: GameState): Set<number> {
  const out = new Set<number>();
  for (const [a, b] of legalPairs(s)) out.add(a).add(b);
  return out;
}

/** The bits of GameScene this reads (structural, so GameScene passes itself). */
export type ReactScene = Phaser.Scene & {
  s: GameState;
  views: Map<number, Phaser.GameObjects.Container>;
  itemBadges: Map<number, Phaser.GameObjects.Container>;
  dragIdx: number;
  dragView: Phaser.GameObjects.Container | null;
  moved: boolean;
  idleTime: number;
  boardVer: number;
  hintPair: [number, number] | null;
  meta: { hints?: boolean };
};

export class PartReact {
  private lean = new Map<number, number>(); // gadget id -> current lean 0..1 (signed by direction)
  private touched = new Set<number>(); // gadget ids whose sprite we moved off rest
  private wiggled = new Set<number>(); // ... whose badges we rotated
  private blinked = new Set<number>(); // ... whose sprite we faded
  private pairVer = -1;
  private paired = new Set<number>();
  private blinkFrom = -1;

  constructor(private reduced: boolean) {}

  update(sc: ReactScene, dms: number) {
    const s = sc.s;
    const now = sc.time.now;
    const playing = s.phase === 'playing';
    const held = playing && sc.dragIdx >= 0 && sc.moved && sc.dragView ? s.grid[sc.dragIdx] : null;
    const blink = !held && idleBlinkOn({ playing, dragIdx: sc.dragIdx, hints: sc.meta.hints, puzzle: !!s.puzzle, hintPair: sc.hintPair, idleTime: sc.idleTime });
    if (blink && this.blinkFrom < 0) this.blinkFrom = now;
    if (!blink) {
      this.blinkFrom = -1;
      // a touch ends the blink at once, on every part (including the one just picked up)
      for (const id of this.blinked) (sc.views.get(id)?.list[0] as Phaser.GameObjects.Image | undefined)?.setAlpha(1);
      this.blinked.clear();
    }
    if (blink && this.pairVer !== sc.boardVer) {
      this.pairVer = sc.boardVer;
      this.paired = pairedCells(s);
    }
    const lvl = blink ? blinkLevel(now - this.blinkFrom) : 0;
    const k = Math.min(1, dms / 90);
    const seen = new Set<number>();
    s.grid.forEach((g, idx) => {
      if (!g) return;
      const v = sc.views.get(g.id);
      if (!v || v === sc.dragView) return;
      seen.add(g.id);
      const img = v.list[0] as Phaser.GameObjects.Image;
      const match = !!held && idx !== sc.dragIdx && canMerge(held, g, s);
      // lean: ease toward the held part's side, back to rest otherwise
      let target = 0;
      if (match && !this.reduced) {
        const dx = sc.dragView!.x - v.x, dy = sc.dragView!.y - v.y;
        const near = Math.max(0.35, 1 - Math.hypot(dx, dy) / 700);
        target = Math.max(-1, Math.min(1, dx / 120)) * near;
      }
      const cur = this.lean.get(g.id) ?? 0;
      const next = Math.abs(target - cur) < 0.01 ? target : cur + (target - cur) * k;
      if (next === 0) this.lean.delete(g.id);
      else this.lean.set(g.id, next);
      const busy = sc.tweens.isTweening(v);
      if (!busy && (next !== 0 || this.touched.has(g.id))) {
        img.x = next * LEAN_PX;
        if (next !== 0) img.setAngle(img.angle + next * LEAN_DEG);
      }
      // badge wiggle: a matching part with a mark (charge, boost, power-up) shakes its rank plate / power-up badge
      const marked = !!(g.primed || g.amp || g.item);
      const wig = match && marked && !this.reduced ? Math.sin(now / 55) * 7 : 0;
      if (wig !== 0 || this.wiggled.has(g.id)) {
        (v.getByName('rank') as Phaser.GameObjects.Text | null)?.setAngle(wig);
        sc.itemBadges.get(g.id)?.setAngle(wig);
        if (wig !== 0) this.wiggled.add(g.id);
        else this.wiggled.delete(g.id);
      }
      // idle blink: a soft fade on every part that has a pair (alpha only, so it is calm under reduced motion too)
      const a = blink && this.paired.has(idx) ? 1 - 0.35 * lvl : 1;
      if (a !== 1 || this.blinked.has(g.id)) {
        img.setAlpha(a);
        if (a !== 1) this.blinked.add(g.id);
        else this.blinked.delete(g.id);
      }
      if (next !== 0) this.touched.add(g.id);
      else if (this.touched.has(g.id) && !busy) {
        img.x = 0;
        this.touched.delete(g.id);
      }
    });
    for (const set of [this.touched, this.wiggled, this.blinked]) for (const id of set) if (!seen.has(id)) set.delete(id);
  }
}
