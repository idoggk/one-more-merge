// Endless (repeat: -1) tweens must not outlive the thing they animate: Phaser keeps updating a tween whose target was destroyed, so every
// screen that was opened and closed would leave its pulses running for good. loopTween ties the tween to its owner's 'destroy'.
import type Phaser from 'phaser';

/** Stop a tween (no-op when missing); Phaser flags it for removal by the TweenManager. */
export const stopLoop = (tw: { stop?: () => unknown } | null | undefined) => void tw?.stop?.();

/** Add an endless tween and stop it as soon as `owner` is destroyed. */
export function loopTween(scene: Phaser.Scene, config: Phaser.Types.Tweens.TweenBuilderConfig, owner: Phaser.GameObjects.GameObject): Phaser.Tweens.Tween {
  const tw = scene.tweens.add(config);
  owner.once('destroy', () => stopLoop(tw));
  return tw;
}
