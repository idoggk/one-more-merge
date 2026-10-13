// Drag / wheel scrolling for a sheet whose rows live in one `list` container (same behaviour as the QA panel).
import Phaser from 'phaser';
import { W } from '../sceneKit';
import type { GameScene } from '../GameScene';

/** Drag farther than this (design px) and the gesture is a scroll, not a tap. */
const DRAG_SLOP = 12;

/** Mask `list` to the window [winTop, winBottom], swallow taps outside it (header/footer strips) and scroll it between `minScroll` and 0. */
export function attachScroll(scene: GameScene, c: Phaser.GameObjects.Container, list: Phaser.GameObjects.Container, sheetTop: number, sheetH: number, winTop: number, winBottom: number, minScroll: number) {
  const mask = scene.add.graphics().setVisible(false).fillRect(0, winTop, W, winBottom - winTop);
  list.setMask(mask.createGeometryMask());
  c.add(scene.add.zone(W / 2, (sheetTop + winTop) / 2, W, winTop - sheetTop).setInteractive());
  c.add(scene.add.zone(W / 2, (winBottom + sheetTop + sheetH) / 2, W, sheetTop + sheetH - winBottom).setInteractive());
  if (minScroll >= 0) return c.once(Phaser.GameObjects.Events.DESTROY, () => mask.destroy());
  let scroll = 0, startY = 0, startScroll = 0, dragging = false;
  const setScroll = (v: number) => {
    scroll = Phaser.Math.Clamp(v, minScroll, 0);
    list.setY(scroll);
  };
  // a scroll drag must not also press the button it ends on: switch the hit areas off until the finger lifts
  const setHits = (on: boolean) => {
    const walk = (o: Phaser.GameObjects.GameObject) => {
      if (o.input) o.input.enabled = on;
      if (o instanceof Phaser.GameObjects.Container) o.list.forEach(walk);
    };
    list.list.forEach(walk);
  };
  const inWindow = (p: Phaser.Input.Pointer) => p.worldY >= winTop && p.worldY <= winBottom;
  const live = () => scene.modal === c && c.active;
  const onDown = (p: Phaser.Input.Pointer) => {
    if (!live()) return;
    startY = p.worldY;
    startScroll = scroll;
    dragging = false;
  };
  const onMove = (p: Phaser.Input.Pointer) => {
    if (!p.isDown || !live() || (!dragging && !(startY >= winTop && startY <= winBottom))) return;
    if (!dragging && Math.abs(p.worldY - startY) < DRAG_SLOP) return;
    if (!dragging) {
      dragging = true;
      setHits(false);
    }
    setScroll(startScroll + (p.worldY - startY));
  };
  const onUp = () => {
    if (!dragging) return;
    dragging = false;
    scene.time.delayedCall(80, () => c.active && setHits(true));
  };
  const onWheel = (p: Phaser.Input.Pointer, _o: unknown, _dx: number, dy: number) => {
    if (live() && inWindow(p)) setScroll(scroll - dy);
  };
  scene.input.on('pointerdown', onDown);
  scene.input.on('pointermove', onMove);
  scene.input.on('pointerup', onUp);
  scene.input.on('pointerupoutside', onUp);
  scene.input.on('wheel', onWheel);
  c.once(Phaser.GameObjects.Events.DESTROY, () => {
    scene.input.off('pointerdown', onDown);
    scene.input.off('pointermove', onMove);
    scene.input.off('pointerup', onUp);
    scene.input.off('pointerupoutside', onUp);
    scene.input.off('wheel', onWheel);
    mask.destroy();
  });
}
