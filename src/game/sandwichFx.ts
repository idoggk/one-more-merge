// Sandwich merge prototype (t-1effe0bf, TUNING.mergeRule): the short flash + 'SANDWICH!' label for a 'sandwich' event.
// Presentation only: the absorbed parts' sprites already slide into the merge cell through GameScene.reconcile.
import Phaser from 'phaser';
import type { GameEvent } from '../core/game';

type SandwichEvent = Extract<GameEvent, { type: 'sandwich' }>;
const CELL = 124;
const GOLD = 0xffcf33;

export function playSandwich(scene: Phaser.Scene, e: SandwichEvent, cellXY: (idx: number) => { x: number; y: number }) {
  const to = cellXY(e.idx);
  const g = scene.add.graphics().setDepth(58);
  // gold links from each absorbed cell into the merge cell, then a white flash over all three cells
  for (const c of e.cells) {
    const p = cellXY(c);
    g.lineStyle(14, GOLD, 0.9).lineBetween(p.x, p.y, to.x, to.y);
    g.fillStyle(0xffffff, 0.7).fillRoundedRect(p.x - CELL / 2 + 6, p.y - CELL / 2 + 6, CELL - 12, CELL - 12, 18);
  }
  g.fillStyle(0xffffff, 0.9).fillRoundedRect(to.x - CELL / 2 + 4, to.y - CELL / 2 + 4, CELL - 8, CELL - 8, 20);
  g.lineStyle(8, GOLD, 1).strokeRoundedRect(to.x - CELL / 2 + 4, to.y - CELL / 2 + 4, CELL - 8, CELL - 8, 20);
  scene.tweens.add({ targets: g, alpha: 0, duration: 320, ease: 'Quad.In', onComplete: () => g.destroy() });
  // label: SANDWICH! + what it paid, popping above the cell and floating up
  const sub = e.od > 0 ? `+${e.plus}  ·  +${e.od} OVERDRIVE` : `+${e.plus} RANK`;
  const t = scene.add
    .text(to.x, to.y - CELL * 0.75, `SANDWICH!\n${sub}`, { fontFamily: 'Lilita One, Arial Black', fontSize: '40px', color: '#ffcf33', align: 'center', stroke: '#3b2533', strokeThickness: 8 })
    .setOrigin(0.5)
    .setDepth(64)
    .setScale(0.4);
  t.x = Phaser.Math.Clamp(t.x, t.width / 2 + 8, scene.scale.width - t.width / 2 - 8);
  scene.tweens.add({ targets: t, scale: 1, duration: 180, ease: 'Back.Out' });
  scene.tweens.add({ targets: t, y: t.y - 70, alpha: 0, delay: 650, duration: 450, ease: 'Quad.In', onComplete: () => t.destroy() });
}
