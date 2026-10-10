// Roster B presentation (TUNING.rosterB, t-e91097cd): the job number over a machine as it fires (Mortar DEPTH "x1.48",
// Rocket BURST "x2", Horn KICK, Arc SPREAD, PRIME, GO) and the Support card's effect on the board. Presentation only.
import Phaser from 'phaser';
import type { GameEvent } from '../core/game';
import { JOB_TERMS, fmtFactor } from '../core/hitFormula';
import { hex } from '../core/marks';
import type { Activation, JobKey } from '../core/types';

const CELL = 124;
const FONT = 'Lilita One, Arial Black';

/** "MORTAR x1.48" (the strongest job of this activation), or null. */
export function jobTag(a: Activation): { text: string; hue: number } | null {
  const e = Object.entries(a.jobs ?? {}) as [JobKey, number][];
  if (!e.length) return null;
  const [k, m] = e.reduce((b, x) => (Math.abs(x[1] - 1) > Math.abs(b[1] - 1) ? x : b));
  return { text: `${k === 'mortar' ? 'DEPTH' : JOB_TERMS[k].label} x${fmtFactor(m)}`, hue: JOB_TERMS[k].hue };
}

/** Float the job tag above the machine when it fires (`delay` ms from now). */
export function playJobTag(scene: Phaser.Scene, a: Activation, xy: { x: number; y: number }, delay: number) {
  const tag = jobTag(a);
  if (!tag) return;
  scene.time.delayedCall(delay, () => {
    const t = scene.add.text(xy.x, xy.y - CELL * 0.45, tag.text, { fontFamily: FONT, fontSize: '26px', color: hex(tag.hue), stroke: '#2b1d2e', strokeThickness: 6 }).setOrigin(0.5).setDepth(63).setScale(0.5);
    t.x = Phaser.Math.Clamp(t.x, t.width / 2 + 6, scene.scale.width - t.width / 2 - 6);
    scene.tweens.add({ targets: t, scale: 1, duration: 160, ease: 'Back.Out' });
    scene.tweens.add({ targets: t, y: t.y - 46, alpha: 0, delay: 700, duration: 380, onComplete: () => t.destroy() });
  });
}

type SupportEvent = Extract<GameEvent, { type: 'support' }>;
const WORD: Record<string, string> = { fan: 'CLEAR!', magnet: 'PAIR!', battery: 'PRIME', amplifier: 'MARK', signal_beacon: 'GO!' };

/** Flash the cells the card acted on + its word (PRIME: centred on the board). */
export function playSupportFx(scene: Phaser.Scene, e: SupportEvent, cellXY: (idx: number) => { x: number; y: number }, color: number, boardCentre: { x: number; y: number }) {
  const g = scene.add.graphics().setDepth(58);
  for (const c of e.cells) {
    const p = cellXY(c);
    g.fillStyle(color, 0.45).fillRoundedRect(p.x - CELL / 2 + 6, p.y - CELL / 2 + 6, CELL - 12, CELL - 12, 18);
    g.lineStyle(6, 0xffffff, 0.9).strokeRoundedRect(p.x - CELL / 2 + 6, p.y - CELL / 2 + 6, CELL - 12, CELL - 12, 18);
  }
  scene.tweens.add({ targets: g, alpha: 0, delay: 200, duration: 380, onComplete: () => g.destroy() });
  const at = e.cells.length ? cellXY(e.cells[0]) : boardCentre;
  const word = WORD[e.family] + (e.mult ? ` x${fmtFactor(e.mult)}` : '');
  const t = scene.add.text(at.x, at.y - CELL * 0.6, word, { fontFamily: FONT, fontSize: '40px', color: hex(color), stroke: '#2b1d2e', strokeThickness: 8 }).setOrigin(0.5).setDepth(64).setScale(0.4);
  t.x = Phaser.Math.Clamp(t.x, t.width / 2 + 8, scene.scale.width - t.width / 2 - 8);
  scene.tweens.add({ targets: t, scale: 1, duration: 180, ease: 'Back.Out' });
  scene.tweens.add({ targets: t, y: t.y - 60, alpha: 0, delay: 650, duration: 420, onComplete: () => t.destroy() });
}
