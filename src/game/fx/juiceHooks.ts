/** Thin hook helpers: one call per existing creation point (GameScene.panel / button, level intro, results rewards, road). Each does nothing
 *  with UI_JUICE off or under reduced motion. Keeps GameScene.ts and the ui modules to one line each. */
import Phaser from 'phaser';
import { attentionWiggle, bounceIn, countUp, glintSweep, juiceOn, popIn, pressSquash, sparkleBurst, stagger } from './juice';

/** GameScene.panel(): the popup rises with a bounce. Returns true when it took over the open animation. */
export function juicePanelIn(scene: Phaser.Scene, c: Phaser.GameObjects.Container): boolean {
  if (!juiceOn()) return false;
  bounceIn(scene, c, 0, 50);
  return true;
}

/** GameScene.button(): press squash on every button, a glint on wide (primary) ones. */
export function juiceButton(scene: Phaser.Scene, b: Phaser.GameObjects.Container, w: number, size: number) {
  if (!juiceOn()) return;
  pressSquash(scene, b, size);
  if (w >= 400) glintSweep(scene, b, w * 0.8, 70);
}

/** Level intro popup: the PLAY button pops in and glints. */
export function juiceIntroPlay(scene: Phaser.Scene, pc: Phaser.GameObjects.Container, w: number, h: number) {
  if (!juiceOn()) return;
  popIn(scene, pc, 160);
  glintSweep(scene, pc, w * 0.8, h * 0.7);
}

/** Result screen: reward row items pop in one after another, the bolts count up and sparkle; extra reward lines rise in. */
export function juiceRewards(scene: Phaser.Scene, c: Phaser.GameObjects.Container, items: (Phaser.GameObjects.Text | Phaser.GameObjects.Image)[], boltsText: Phaser.GameObjects.Text | null, bolts: number, lines: Phaser.GameObjects.Text[], y: number) {
  if (!juiceOn()) return;
  stagger(items, (it, d) => popIn(scene, it, 500 + d));
  if (boltsText && bolts > 0) {
    countUp(scene, boltsText, 0, bolts, (n) => `+${n} BOLTS`, 700, 500);
    scene.time.delayedCall(560, () => c.active && sparkleBurst(scene, c, boltsText.x + boltsText.width / 2, y, 8, 80));
  }
  stagger(lines, (t, d) => bounceIn(scene, t, 900 + d, 24), 90);
}

/** Level road: the current node wiggles every few seconds and throws a few sparkles once. */
export function juiceRoadNode(scene: Phaser.Scene, road: Phaser.GameObjects.Container, node: Phaser.GameObjects.Image) {
  if (!juiceOn()) return;
  attentionWiggle(scene, node);
  sparkleBurst(scene, road, node.x, node.y, 8, 90);
}

/** Chapter chest in the strip: sparkles on open; a reward-ready chest (chapter done) also wiggles. */
export function juiceChest(scene: Phaser.Scene, strip: Phaser.GameObjects.Container, chest: Phaser.GameObjects.Image, ready: boolean) {
  if (!juiceOn()) return;
  if (ready) attentionWiggle(scene, chest);
  sparkleBurst(scene, strip, chest.x, chest.y, 6, 50);
}
