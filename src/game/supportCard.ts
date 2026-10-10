// Roster B Support card (TUNING.rosterB, t-e91097cd): the squad helper as ONE off-board card at the stage's left edge.
// Shows the job (FAN · CLEAR), a charge bar that fills +1 per machine in your merge chains ("7/12", READY! when full)
// and handles its taps: tap the full card, then tap the board where it should act (Battery fires at once; Beacon: tap
// the card again to switch ROW -> COLUMN -> cancel). The rules live in core/support.ts; GameScene owns one instance.
import Phaser from 'phaser';
import type { GameState } from '../core/game';
import { canUseSupport, SUPPORT_JOBS, supportCharge, supportNeed, supportReady, type Axis } from '../core/support';
import { FAMILY_INFO } from '../content/perks';

const FONT = 'Lilita One, Arial Black';
const CW = 132, CH = 156;

export class SupportCard {
  private c: Phaser.GameObjects.Container;
  private plate: Phaser.GameObjects.Graphics;
  private bar: Phaser.GameObjects.Graphics;
  private title: Phaser.GameObjects.Text;
  private count: Phaser.GameObjects.Text;
  private icon: Phaser.GameObjects.Image | null = null;
  private family = '';
  private shown = -1;
  private ready = false;
  /** Aiming: waiting for the board tap (axis = Beacon line). */
  aiming = false;
  private axis: Axis = 'row';

  constructor(
    private scene: Phaser.Scene,
    private x: number,
    private y: () => number,
    private cellAt: (x: number, y: number) => number,
    private fire: (cell: number, axis: Axis) => boolean,
    private say: (msg: string, color?: string) => void,
  ) {
    this.c = scene.add.container(x, y()).setDepth(40).setVisible(false);
    this.plate = scene.add.graphics();
    this.bar = scene.add.graphics();
    this.title = scene.add.text(0, -CH / 2 + 22, '', { fontFamily: FONT, fontSize: '21px', color: '#ffffff', align: 'center', stroke: '#2b1d2e', strokeThickness: 5 }).setOrigin(0.5);
    this.count = scene.add.text(0, CH / 2 - 26, '', { fontFamily: FONT, fontSize: '22px', color: '#fff0cf', stroke: '#2b1d2e', strokeThickness: 5 }).setOrigin(0.5);
    this.c.add([this.plate, this.bar, this.title, this.count]);
  }

  /** Per frame: follow the state (no card = hidden). */
  sync(s: GameState) {
    const sp = s.support;
    this.c.setVisible(!!sp && !s.puzzle);
    if (!sp) {
      this.aiming = false;
      return;
    }
    this.c.setY(this.y());
    const job = SUPPORT_JOBS[sp.family];
    const col = FAMILY_INFO[sp.family as keyof typeof FAMILY_INFO]?.color ?? 0x8a6a4a;
    if (this.family !== sp.family) {
      this.family = sp.family;
      this.icon?.destroy();
      const key = `${sp.family}_1`;
      this.icon = this.scene.textures.exists(key) ? this.scene.add.image(0, -8, key) : null;
      if (this.icon) {
        this.icon.setScale(64 / Math.max(this.icon.width, this.icon.height));
        this.c.addAt(this.icon, 2);
      }
    }
    const need = supportNeed(s), have = supportCharge(s);
    const ready = supportReady(s);
    if (!ready) this.aiming = false;
    const armed = sp.prime ? `x${sp.prime.mult} NEXT` : '';
    this.title.setText(this.aiming && job.aim === 'line' ? `GO ${this.axis === 'row' ? 'ROW' : 'COLUMN'}` : `${job.verb}`);
    this.count.setText(armed || (ready ? (this.aiming ? 'TAP BOARD' : 'READY!') : `${have}/${need}`));
    const pulse = ready ? 0.6 + 0.4 * Math.sin(this.scene.time.now / 160) : 1;
    this.plate.clear().fillStyle(0x2b1d2e, 1).fillRoundedRect(-CW / 2, -CH / 2, CW, CH, 18).fillStyle(col, ready ? 1 : 0.55).fillRoundedRect(-CW / 2 + 4, -CH / 2 + 4, CW - 8, CH - 8, 15);
    if (ready) this.plate.lineStyle(this.aiming ? 8 : 5, 0xffcf33, pulse).strokeRoundedRect(-CW / 2 - 4, -CH / 2 - 4, CW + 8, CH + 8, 20);
    // charge bar: fills left to right; it pops when a chain adds charge
    const bw = CW - 24, by = CH / 2 - 52;
    this.bar.clear().fillStyle(0x2b1d2e, 0.85).fillRoundedRect(-bw / 2, by, bw, 14, 7).fillStyle(ready ? 0xffcf33 : 0xfff0cf, 1).fillRoundedRect(-bw / 2, by, Math.max(8, (bw * have) / need), 14, 7);
    if (this.shown >= 0 && have > this.shown) {
      this.scene.tweens.killTweensOf(this.c);
      this.c.setScale(1.12);
      this.scene.tweens.add({ targets: this.c, scale: 1, duration: 220, ease: 'Back.Out' });
    }
    if (ready && !this.ready) this.say(`${job.name.toUpperCase()} READY: tap the card to ${job.verb}`, '#ffcf33');
    this.ready = ready;
    this.shown = have;
  }

  /** A pointer-down from the scene; true = the card used it (the board must ignore this tap). */
  onDown(p: Phaser.Input.Pointer, s: GameState): boolean {
    const sp = s.support;
    if (!sp || !this.c.visible) return false;
    const job = SUPPORT_JOBS[sp.family];
    const onCard = Math.abs(p.worldX - this.x) <= CW / 2 + 6 && Math.abs(p.worldY - this.c.y) <= CH / 2 + 6;
    if (onCard) {
      if (!supportReady(s)) {
        this.say(sp.prime ? `PRIME armed: your next ${sp.prime.any ? '' : 'shooter '}merge hits x${sp.prime.mult}` : `${job.name.toUpperCase()} ${job.verb}: ${job.text}  (${supportCharge(s)}/${supportNeed(s)} charge: +1 per machine in your chains)`);
        return true;
      }
      if (job.aim === 'none') {
        this.fire(-1, 'row');
        return true;
      }
      if (this.aiming && job.aim === 'line' && this.axis === 'row') this.axis = 'col';
      else if (this.aiming) this.aiming = false;
      else [this.aiming, this.axis] = [true, 'row'];
      if (this.aiming) this.say(job.aim === 'line' ? `Tap a cell: GO fires its ${this.axis === 'row' ? 'ROW' : 'COLUMN'} (tap the card to switch)` : job.aim === 'cell' ? (job.aimText ?? 'Tap a cell: CLEAR the 3x3 around it') : job.aim === 'shooter' ? 'Tap a shooter to MARK it' : 'Tap a part: its twin arrives next to it');
      return true;
    }
    if (!this.aiming) return false;
    const cell = this.cellAt(p.worldX, p.worldY);
    if (cell < 0) {
      this.aiming = false;
      return true;
    }
    if (canUseSupport(s, cell, this.axis) && this.fire(cell, this.axis)) this.aiming = false;
    else this.say(job.aim === 'cell' ? (job.failText ?? 'Nothing to clear there') : job.aim === 'shooter' ? 'Tap a SHOOTER' : job.aim === 'part' ? 'No twin fits there' : 'No machines on that line', '#ffb0a0');
    return true;
  }

  destroy() {
    this.c.destroy();
  }
}
