/** Level intro popup: Bolt peeks in from the right edge, wiggles and slides out again, now and then (flag MASCOT_MOTION; nothing otherwise). */
import Phaser from 'phaser';
import { BoltAnimator } from '../fx/boltAnimator';
import { W } from '../sceneKit';
import type { Rect } from './qaLayout';

export function addIntroBolt(scene: Phaser.Scene, parent: Phaser.GameObjects.Container, panel: Rect) {
  const bolt = BoltAnimator.create(scene, W - 46, panel.y + panel.h * 0.42, { owner: 'levelIntro', size: 130, edge: 'side', peekOnly: true });
  if (!bolt) return;
  parent.add(bolt.root);
  const peek = (ms: number) => {
    scene.time.delayedCall(ms, () => {
      if (!bolt.root.active) return;
      bolt.play('peek');
      peek(7000 + Math.random() * 5000);
    });
  };
  peek(700);
}
