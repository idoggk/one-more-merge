// Roster 2 Wrench (t-ee4e93d7, TUNING.roster2): the passive Support has no board part and no tap, so its charge shows as a small
// badge at the stage's left edge: one pip per armed merge ("+1 RANK NEXT" when armed, how to arm it when not). It only draws;
// the rules live in core/roster2.ts and game.ts merge(). GameScene owns one instance and calls sync() each frame.
import Phaser from 'phaser';
import type { GameState } from '../../core/game';
import { wrenchHold } from '../../core/roster2';
import { TUNING } from '../../content/tuning';
import { sfx } from '../audio';

const FONT = 'Lilita One, Arial Black';
const CW = 132, CH = 96;

export class WrenchBadge {
  private c: Phaser.GameObjects.Container;
  private plate: Phaser.GameObjects.Graphics;
  private title: Phaser.GameObjects.Text;
  private line: Phaser.GameObjects.Text;
  private uses = -1;

  constructor(private scene: Phaser.Scene, x: number, private y: () => number) {
    this.c = scene.add.container(x, y()).setDepth(40).setVisible(false);
    this.plate = scene.add.graphics();
    this.title = scene.add.text(0, -CH / 2 + 20, 'WRENCH', { fontFamily: FONT, fontSize: '21px', color: '#ffffff', stroke: '#2b1d2e', strokeThickness: 5 }).setOrigin(0.5);
    this.line = scene.add.text(0, CH / 2 - 24, '', { fontFamily: FONT, fontSize: '19px', color: '#fff0cf', align: 'center', stroke: '#2b1d2e', strokeThickness: 4 }).setOrigin(0.5);
    this.c.add([this.plate, this.title, this.line]);
  }

  /** Per frame: follow the state (no Wrench in the squad = hidden). */
  sync(s: GameState) {
    const w = s.wrench;
    this.c.setVisible(!!w);
    if (!w) return;
    this.c.setY(this.y());
    const level = s.unitLevel?.wrench ?? 1;
    const hold = wrenchHold(level);
    const armed = w.armed.length > 0;
    const next = w.armed[0] ?? 0;
    this.line.setText(armed ? `+${next} RANK NEXT` : `ARM: RANK ${level >= 3 ? TUNING.r2.wrenchMinL3 : TUNING.r2.wrenchMin}+`);
    this.plate.clear().fillStyle(0x2b1d2e, 1).fillRoundedRect(-CW / 2, -CH / 2, CW, CH, 16).fillStyle(0xc8a050, armed ? 1 : 0.55).fillRoundedRect(-CW / 2 + 4, -CH / 2 + 4, CW - 8, CH - 8, 13);
    for (let i = 0; i < hold; i++) this.plate.fillStyle(i < w.armed.length ? 0xffcf33 : 0x2b1d2e, i < w.armed.length ? 1 : 0.6).fillCircle((i - (hold - 1) / 2) * 26, -2, 9);
    if (this.uses >= 0 && w.uses > this.uses) {
      sfx.roster2('wrench');
      this.scene.tweens.killTweensOf(this.c);
      this.c.setScale(1.15);
      this.scene.tweens.add({ targets: this.c, scale: 1, duration: 240, ease: 'Back.Out' });
    }
    this.uses = w.uses;
  }

  destroy() {
    this.c.destroy();
  }
}
