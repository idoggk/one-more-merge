// Roster 6 Robot Arm COPY (t-f2cd50e4, TUNING.roster6): the relay a Robot Arm remembers is shown as that relay's small picture on the arm
// (a second, smaller one for the other memory slot at level 6). It only draws; the rules live in core/roster6.ts and the memory is the
// part's `copy` list. GameScene owns one instance and calls sync() each frame.
import Phaser from 'phaser';
import type { Gadget } from '../../core/types';
import { cellXY, SLOT } from '../sceneKit';

export class CopyBadges {
  private icons = new Map<string, Phaser.GameObjects.Image>();

  private g: Phaser.GameObjects.Graphics;

  constructor(private scene: Phaser.Scene) {
    this.g = scene.add.graphics().setDepth(11);
  }

  /** Per frame: one picture per remembered relay on every Robot Arm (it follows the part's cell; gone arms lose theirs). */
  sync(grid: readonly (Gadget | null)[]) {
    const g = this.g.clear();
    const live = new Set<string>();
    grid.forEach((p, idx) => {
      if (p?.family !== 'robot_arm' || !p.copy?.length) return;
      const { x, y } = cellXY(idx);
      // newest memory on top-left (the one the Arm will use unless the other is better), the older one beside it
      [...p.copy].reverse().forEach((fam, k) => {
        const key = `${p.id}:${k}`;
        const tex = `${fam}_1`;
        if (!this.scene.textures.exists(tex)) return;
        let im = this.icons.get(key);
        if (!im?.active) {
          im = this.scene.add.image(0, 0, tex).setDepth(12);
          this.icons.set(key, im);
        }
        if (im.texture.key !== tex) im.setTexture(tex);
        const r = k === 0 ? 17 : 12;
        const bx = x + SLOT.helper.x + (k === 0 ? 0 : 30), by = y + SLOT.helper.y + (k === 0 ? 0 : 4);
        g.fillStyle(0x2b1d2e, 1).fillCircle(bx, by, r + 3).fillStyle(0xdfeaf5, 1).fillCircle(bx, by, r + 0.5);
        im.setPosition(bx, by).setScale((2 * r) / 128 * 1.15).setVisible(true);
        live.add(key);
      });
    });
    for (const [key, im] of this.icons)
      if (!live.has(key)) {
        im.destroy();
        this.icons.delete(key);
      }
  }

  destroy() {
    for (const im of this.icons.values()) im.destroy();
    this.icons.clear();
    this.g.destroy();
  }
}
