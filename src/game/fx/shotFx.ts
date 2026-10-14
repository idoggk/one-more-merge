import Phaser from 'phaser';
import type { Family } from '../../core/types';
import { REDUCED_MOTION } from '../sceneKit';
import { burstCount, freeShotSlot, GOLD_RIM, rankScale, rankTier, shotStyle, takeShotSlot, type ShotFlight } from './shotStyles';

/** Control-point lift per flight style (px above the higher end); lines stay straight, lobs go high. */
const LIFT: Record<ShotFlight, number> = { arc: 40, line: 0, beam: 0, lob: 150, swing: 0 };

/**
 * UNIT SHOTS: draws one family-styled projectile from (fromX, fromY) to the monster. Visual only: it lasts exactly `duration`
 * and calls `onHit` at the same moment the plain dot would. Returns false (nothing drawn) when over the projectile cap,
 * so the caller falls back to the plain dot.
 */
export function playStyledShot(scene: Phaser.Scene & { target: Phaser.GameObjects.Image; sparks: Phaser.GameObjects.Particles.ParticleEmitter; ring: (x: number, y: number, color: number, r?: number, w?: number, dur?: number) => void }, family: Family, rank: number, fromX: number, fromY: number, duration: number, onHit?: () => void): boolean {
  const st = shotStyle(family);
  const tier = rankTier(rank);
  const scale = rankScale(rank);
  if (!takeShotSlot('projectiles')) return false;
  // the first projectile carries the hit; extra burst shots are cosmetic and only exist while slots are free
  let n = 1;
  for (const want = REDUCED_MOTION ? 1 : burstCount(family, rank); n < want && takeShotSlot('projectiles'); n++);
  const hitCol = tier >= 3 ? st.core : st.body;
  for (let i = 0; i < n; i++) {
    const tx = scene.target.x + Phaser.Math.Between(-50, 50);
    const ty = scene.target.y + Phaser.Math.Between(-60, 50);
    const lift = LIFT[st.flight];
    const midX = (fromX + tx) / 2 + (lift ? Phaser.Math.Between(-60, 60) : 0);
    const curve = new Phaser.Curves.QuadraticBezier(new Phaser.Math.Vector2(fromX, fromY), new Phaser.Math.Vector2(midX, Math.min(fromY, ty) - lift), new Phaser.Math.Vector2(tx, ty));
    const b = scene.add.image(fromX, fromY, st.shape).setTint(tier >= 3 ? st.core : st.body).setDepth(52).setScale(0.9 * scale * st.stretch, 0.9 * scale);
    const halo = !REDUCED_MOTION && tier >= 1 ? scene.add.image(fromX, fromY, 'dot').setTint(tier >= 2 ? GOLD_RIM : st.glow).setDepth(51).setScale(1.5 * scale).setAlpha(0.45).setBlendMode(Phaser.BlendModes.ADD) : null;
    const trails: Phaser.GameObjects.Image[] = [];
    if (!REDUCED_MOTION && tier >= 1) for (let k = 0; k < (tier >= 3 ? 2 : 1); k++) trails.push(scene.add.image(fromX, fromY, 'dot').setTint(st.glow).setDepth(50).setScale(0.7 * scale).setAlpha(0.5 - k * 0.15));
    const o = { t: 0 };
    const hist: Phaser.Math.Vector2[] = [];
    scene.tweens.add({
      targets: o,
      t: 1,
      duration,
      ease: st.flight === 'beam' || st.flight === 'line' ? 'Sine.In' : 'Quad.In',
      delay: i * 25, // extra burst shots trail the hit shot by a hair
      onUpdate: () => {
        const p = curve.getPoint(o.t);
        const prev = hist.length ? hist[hist.length - 1] : p;
        b.setPosition(p.x, p.y);
        if (st.stretch > 1 || st.flight === 'swing') b.setRotation(Math.atan2(p.y - prev.y, p.x - prev.x));
        else if (st.shape === 'spark') b.angle += 30;
        halo?.setPosition(p.x, p.y);
        hist.push(p.clone());
        trails.forEach((tr, k) => {
          const h = hist[Math.max(0, hist.length - 1 - (k + 1) * 3)];
          tr.setPosition(h.x, h.y);
        });
      },
      onComplete: () => {
        scene.sparks.setParticleTint(hitCol);
        scene.sparks.explode((st.sparky ? 6 : 3) + tier * 2, b.x, b.y);
        if (tier >= 2 && !REDUCED_MOTION) scene.ring(b.x, b.y, GOLD_RIM, 40 * scale, 6, 200);
        b.destroy();
        halo?.destroy();
        trails.forEach((tr) => tr.destroy());
        freeShotSlot('projectiles');
        if (i === 0) onHit?.();
      },
    });
  }
  return true;
}
