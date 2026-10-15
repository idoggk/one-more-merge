// ROAD MAP MOCK 1 (flag ROAD_MAP_MOCK1): the hero's glow, pulsing ring-light, twinkling sparkles and Bolt, drawn behind / around the current node.
// Numbers: roadMapMock1Model.ts (SPEC.md). Visual only: no state, no taps. Every loop goes through the road's own `loop` (paused off screen, capped).
import Phaser from 'phaser';
import { ROAD_MAP_MOCK1 } from '../../content/experiments';
import { BoltAnimator } from '../fx/boltAnimator';
import type { GameScene } from '../GameScene';
import { REDUCED_MOTION, W } from '../sceneKit';
import { boltSpot, HERO_FX, mockScale, sparkleSpots } from './roadMapMock1Model';

type Loop = (owner: Phaser.GameObjects.GameObject, cfg: Phaser.Types.Tweens.TweenBuilderConfig, minY: number, maxY: number) => unknown;

export interface HeroFxOpts {
  /** hero platform centre, road space */
  x: number;
  y: number;
  boss: boolean;
  /** road centre x, to pick Bolt's side */
  centerX: number;
  loop: Loop;
}

/** Adds the glow, sparkles and Bolt for the current node into `layer`. Returns the number of objects added (0 when the flag is off). */
export function addMockHeroFx(scene: GameScene, layer: Phaser.GameObjects.Container, o: HeroFxOpts): number {
  if (!ROAD_MAP_MOCK1.on) return 0;
  const k = mockScale(W);
  const fx = o.boss ? HERO_FX.boss : HERO_FX.normal;
  const lo = o.y - 400, hi = o.y + 400;
  let n = 0;
  const glow = scene.add.container(o.x, o.y - 40 * k);
  const gr = (fx.glow * k) / 2;
  glow.add(scene.add.circle(0, 0, gr, 0xffcf33, 0.14));
  glow.add(scene.add.circle(0, 0, gr * 0.7, 0xffe27a, 0.16));
  glow.add(scene.add.circle(0, 0, gr * 0.4, 0xfff0b8, 0.2));
  layer.addAt(glow, 0);
  n++;
  if (!REDUCED_MOTION) {
    o.loop(glow, { targets: glow, scale: 1.08, alpha: 0.55, duration: HERO_FX.glowMs / 2, yoyo: true, repeat: -1, ease: 'Sine.InOut' }, lo, hi);
    const spots = sparkleSpots(HERO_FX.sparkles, (fx.ring[0] * k) / 2, (fx.ring[1] * k) * 0.9, -90 * k, HERO_FX.sparkleMs);
    for (const s of spots) {
      const st = scene.hasArt('star') ? scene.add.image(o.x + s.x, o.y + s.y, 'star').setDisplaySize(22 * k, 22 * k) : scene.add.circle(o.x + s.x, o.y + s.y, 6 * k, 0xfff0b8);
      st.setAlpha(0).setScale(0.2);
      layer.add(st);
      scene.time.delayedCall(s.delay, () => st.active && o.loop(st, { targets: st, scale: 1, alpha: 1, angle: 45, duration: HERO_FX.sparkleMs / 2, yoyo: true, repeat: -1, ease: 'Sine.InOut' }, lo, hi));
      n++;
    }
  }
  // Bolt: only with MASCOT MOTION (BoltAnimator.create returns null otherwise or when another mascot holds the screen)
  const bs = boltSpot(o.x, o.centerX, W);
  const bolt = BoltAnimator.create(scene, bs.x, o.y - 20 * k, { owner: 'roadMap', size: 110 * k });
  if (bolt) {
    layer.add(bolt.root);
    n++;
    bolt.play('happy');
  }
  return n;
}
