// Rising-pitch chain ladder (rival-games study #4; presentation only, never touches the model).
// Every link of a chain plays the next note of a scale and bumps a small 'xN' counter at the source cell.
// Chains of BIG_CHAIN+ hold for HOLD_MS before the final hit, which lands with a fat sound and a shake.
import type Phaser from 'phaser';
import { sfx } from '../audio';
import { pooledText, releaseText, textColor } from '../sceneKit';

export const BIG_CHAIN = 8;
/** The beat before a big chain's final hit (the hit-stop). */
export const HOLD_MS = 250;
/** Links that fire on the same beat are spread this far apart at most, so each one is its own note. */
const LINK_GAP = 40;

export type LadderNote = { link: number; at: number };

/** One note per activation, in depth order; links on one beat are spread inside that beat. `at` in ms. */
export function ladderPlan(acts: readonly { depth: number }[], windup: number, step: number): LadderNote[] {
  const byDepth = new Map<number, number>();
  for (const a of acts) byDepth.set(a.depth, (byDepth.get(a.depth) ?? 0) + 1);
  const out: LadderNote[] = [];
  let link = 0;
  for (const d of [...byDepth.keys()].sort((a, b) => a - b)) {
    const n = byDepth.get(d)!;
    const gap = n > 1 ? Math.min(LINK_GAP, step > 0 ? (step * 0.8) / n : LINK_GAP) : 0;
    for (let k = 0; k < n; k++) out.push({ link: ++link, at: windup + d * step + k * gap });
  }
  return out;
}

/** Extra ms before the final hit: the hold, only for big chains. */
export const chainHoldMs = (count: number) => (count >= BIG_CHAIN ? HOLD_MS : 0);

type LadderScene = Phaser.Scene & { shake(ms: number, intensity: number): void };

/** Plays the ladder for one cascade: notes + the source counter. Returns nothing; everything is self-cleaning. */
export function playChainLadder(scene: LadderScene, acts: readonly { depth: number }[], windup: number, step: number, src: { x: number; y: number }, reduced: boolean) {
  if (acts.length < 2) return;
  const plan = ladderPlan(acts, windup, step);
  const txt = pooledText(scene, src.x + 38, src.y - 52, '', { fontFamily: 'Lilita One, Arial Black', fontSize: '30px', color: '#fff0cf', stroke: '#2b1d2e', strokeThickness: 6 })
    .setOrigin(0.5)
    .setDepth(63)
    .setVisible(false);
  for (const p of plan) {
    sfx.ladder(p.link - 1, p.at / 1000);
    scene.time.delayedCall(p.at, () => {
      if (!txt.active) return;
      const big = p.link >= BIG_CHAIN;
      textColor(txt.setText(`x${p.link}`).setVisible(true), big ? '#ffd24a' : '#fff0cf');
      if (reduced) return;
      scene.tweens.killTweensOf(txt);
      txt.setScale(1.35 + Math.min(0.5, p.link * 0.03));
      scene.tweens.add({ targets: txt, scale: 1 + Math.min(0.4, p.link * 0.025), duration: 120, ease: 'Quad.Out' });
    });
  }
  const last = plan[plan.length - 1].at;
  const big = acts.length >= BIG_CHAIN;
  // big chains: the counter swells through the hold and pops on the hit; small ones just fade out
  if (big && !reduced) scene.time.delayedCall(last + 120, () => txt.active && scene.tweens.add({ targets: txt, scale: 1.8, duration: HOLD_MS + 140, ease: 'Sine.In' }));
  scene.time.delayedCall(last + 260 + chainHoldMs(acts.length) + 120, () => {
    if (!txt.active) return;
    scene.tweens.killTweensOf(txt);
    scene.tweens.add({ targets: txt, alpha: 0, scale: reduced ? txt.scale : txt.scale * 1.25, duration: 260, onComplete: () => releaseText(scene, txt) });
  });
}

/** The big chain's final hit: fat sound + shake (shake obeys the Shake setting and reduced motion). */
export function bigFinish(scene: LadderScene, count: number) {
  if (count < BIG_CHAIN) return;
  sfx.bigFinish();
  scene.shake(180, 0.006);
}
