// Roster 4 Capacitor (t-1e3c8bb6, TUNING.roster4): the bank has no sprite of its own, so a small badge above the stage's left-edge
// card slot says whether it holds a chain ("HOLDING", and from level 3 the chain length it holds) and that it lets go at your next merge.
// It only draws; the rules live in core/roster4.ts and game.ts merge(). GameScene owns one instance and calls sync() each frame.
import Phaser from 'phaser';
import type { GameState } from '../../core/game';
import { sfx } from '../audio';

const FONT = 'Lilita One, Arial Black';
const CW = 132, CH = 84;

export class CapBadge {
  private c: Phaser.GameObjects.Container;
  private plate: Phaser.GameObjects.Graphics;
  private title: Phaser.GameObjects.Text;
  private line: Phaser.GameObjects.Text;
  private held = -1;

  constructor(private scene: Phaser.Scene, x: number, private y: () => number) {
    this.c = scene.add.container(x, y()).setDepth(40).setVisible(false);
    this.plate = scene.add.graphics();
    this.title = scene.add.text(0, -CH / 2 + 18, 'CAPACITOR', { fontFamily: FONT, fontSize: '19px', color: '#ffffff', stroke: '#2b1d2e', strokeThickness: 5 }).setOrigin(0.5);
    this.line = scene.add.text(0, CH / 2 - 22, '', { fontFamily: FONT, fontSize: '18px', color: '#fff0cf', align: 'center', stroke: '#2b1d2e', strokeThickness: 4 }).setOrigin(0.5);
    this.c.add([this.plate, this.title, this.line]);
  }

  /** Per frame: follow the state (no Capacitor on the board = hidden). */
  sync(s: GameState) {
    const has = s.phase === 'playing' && s.grid.some((g) => g?.family === 'capacitor');
    this.c.setVisible(has);
    if (!has) {
      this.held = -1;
      return;
    }
    this.c.setY(this.y());
    const bank = s.cap;
    const level = s.unitLevel?.capacitor ?? 1;
    this.line.setText(bank ? (level >= 3 ? `HOLDS ${bank.held}\nreleases next merge` : 'HOLDING\nreleases next merge') : 'EMPTY\nmerge to charge');
    this.plate.clear().fillStyle(0x2b1d2e, 1).fillRoundedRect(-CW / 2, -CH / 2, CW, CH, 16).fillStyle(0x3aa6c8, bank ? 1 : 0.5).fillRoundedRect(-CW / 2 + 4, -CH / 2 + 4, CW - 8, CH - 8, 13);
    const now = bank ? bank.held : 0;
    if (this.held >= 0 && now !== this.held) {
      sfx.roster4('capacitor');
      this.scene.tweens.killTweensOf(this.c);
      this.c.setScale(1.15);
      this.scene.tweens.add({ targets: this.c, scale: 1, duration: 240, ease: 'Back.Out' });
    }
    this.held = now;
  }

  destroy() {
    this.c.destroy();
  }
}
