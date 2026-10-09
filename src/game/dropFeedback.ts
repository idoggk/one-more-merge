// Invalid-drop feedback (owner OK 2026-10-09): what a released drag does, and the rate limit on its hint.
// Pure (no Phaser) so the reject cases are unit-tested; GameScene.rejectDrop() is the one place that acts on a reject.

/** Why a drop was refused. `refused`: the game said no to a real target (mismatch bounce, guided step, tutorial);
 *  that path already explains itself, so it gets no extra hint. */
export type DropReject = 'offBoard' | 'ownCell' | 'earlyScrap' | 'refused';
export type DropPlan = { k: 'scrap' } | { k: 'commit' } | { k: 'reject'; why: DropReject };

/** Seconds a rank 3+ part must be held over SCRAP before a release scraps it. */
export const SCRAP_HOLD = 0.25;

/** `dest`: target cell (-1 off the board); `scrap`: released over the shown SCRAP zone with no merge under the piece. */
export function planDrop(o: { from: number; dest: number; scrap: boolean; rank: number; scrapHold: number }): DropPlan {
  if (o.scrap) return o.rank < 3 || o.scrapHold >= SCRAP_HOLD ? { k: 'scrap' } : { k: 'reject', why: 'earlyScrap' };
  if (o.dest < 0) return { k: 'reject', why: 'offBoard' };
  if (o.dest === o.from) return { k: 'reject', why: 'ownCell' };
  return { k: 'commit' };
}

export const DROP_HINT: Record<DropReject, string | null> = {
  earlyScrap: 'HOLD TO SCRAP',
  offBoard: 'DROP ON A MATCHING PART',
  ownCell: 'DROP ON A MATCHING PART',
  refused: null,
};

/** Hints never spam: at most one per `gap` ms, and the same text at most once per `sameGap` ms. */
export class HintGate {
  private last = -Infinity;
  private byText = new Map<string, number>();
  constructor(
    readonly gap = 2500,
    readonly sameGap = 8000,
  ) {}
  allow(text: string, now: number): boolean {
    if (now - this.last < this.gap || now - (this.byText.get(text) ?? -Infinity) < this.sameGap) return false;
    this.last = now;
    this.byText.set(text, now);
    return true;
  }
}
