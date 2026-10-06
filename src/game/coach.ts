import Phaser from 'phaser';

/** Tutorial / tips coach: a speech bubble with an optional "tap to continue", a pointing hand and focus rings. */
export class Coach {
  private box: Phaser.GameObjects.Container;
  private plate: Phaser.GameObjects.Image | Phaser.GameObjects.Graphics;
  private text: Phaser.GameObjects.Text;
  private tapText: Phaser.GameObjects.Text;
  private hand: Phaser.GameObjects.Image;
  private rings: Phaser.GameObjects.Graphics;
  private handTween: Phaser.Tweens.Tween | null = null;
  private focusCells: { x: number; y: number; r: number }[] = [];
  private hideTimer: Phaser.Time.TimerEvent | null = null;
  private nextBtn: Phaser.GameObjects.Container;
  private pageText: Phaser.GameObjects.Text;
  private onNext: (() => void) | null = null;
  waitingTap = false;

  constructor(private scene: Phaser.Scene, private width: number) {
    const hasPlate = scene.textures.exists('ui_coach') && scene.textures.get('ui_coach').source[0].width > 1;
    this.plate = hasPlate
      ? scene.add.image(0, 0, 'ui_coach').setDisplaySize(width - 70, ((width - 70) * 257) / 720)
      : scene.add.graphics().fillStyle(0x2a2233, 0.94).fillRoundedRect(-(width - 60) / 2, -80, width - 60, 160, 28).lineStyle(5, 0xffcf33, 1).strokeRoundedRect(-(width - 60) / 2, -80, width - 60, 160, 28);
    this.text = scene.add
      .text(0, -24, '', { fontFamily: 'Lilita One, Arial Black', fontSize: '31px', color: hasPlate ? '#2a2233' : '#fff0cf', align: 'center', wordWrap: { width: width - 140 }, lineSpacing: 2 })
      .setOrigin(0.5);
    this.tapText = scene.add.text(0, 42, 'tap to continue', { fontFamily: 'Arial', fontStyle: 'bold', fontSize: '19px', color: hasPlate ? '#7a5a4a' : '#cdbfa8' }).setOrigin(0.5);
    // explicit NEXT target (ChatGPT r13: never a whole-screen tap while teaching a gesture) + page indicator
    const pw = 150;
    const pill = scene.add.graphics().fillStyle(0x2b1d2e, 1).fillRoundedRect(-pw / 2, -27, pw, 54, 27).fillStyle(0x5fbf4a, 1).fillRoundedRect(-pw / 2 + 4, -23, pw - 8, 46, 23);
    const pl = scene.add.text(0, 0, 'NEXT \u203a', { fontFamily: 'Lilita One, Arial Black', fontSize: '26px', color: '#ffffff' }).setOrigin(0.5);
    this.nextBtn = scene.add.container((width - 70) / 2 - pw / 2 - 26, 62, [pill, pl]).setSize(pw, 64).setInteractive({ useHandCursor: true });
    this.nextBtn.on('pointerup', () => {
      const cb = this.onNext;
      this.onNext = null;
      cb?.();
    });
    this.pageText = scene.add.text(-(width - 70) / 2 + 96, 58, '', { fontFamily: 'Lilita One, Arial Black', fontSize: '24px', color: hasPlate ? '#5a3a3a' : '#e8dcc8' }).setOrigin(0, 0.5);
    this.box = scene.add.container(width / 2, 0, [this.plate, this.text, this.tapText, this.nextBtn, this.pageText]).setDepth(90).setVisible(false);
    this.rings = scene.add.graphics().setDepth(89);
    const art = scene.textures.exists('ui_hand');
    // fingertip is the hotspot (ChatGPT v8 notes): top-left of the art, top-centre-left of the fallback glove
    this.hand = scene.add.image(0, 0, art ? 'ui_hand' : 'hand').setDepth(91).setVisible(false).setOrigin(art ? 0.07 : 0.25, art ? 0.07 : 0.05);
    const hs = (art ? 104 : 128) / Math.max(this.hand.width, this.hand.height);
    this.hand.setScale(hs);
  }

  /** Show a line. `tap`: wait for a tap (blocks board input via `waitingTap`). `ms`: auto-hide (tips). */
  say(text: string, y: number, opts: { tap?: boolean; ms?: number; next?: { page: string; label?: string; onNext: () => void } } = {}) {
    this.hideTimer?.remove();
    this.scene.tweens.killTweensOf(this.box); // a pending hide must not hide this new line
    this.text.setText(text);
    this.tapText.setVisible(!!opts.tap && !opts.next);
    this.nextBtn.setVisible(!!opts.next);
    this.pageText.setVisible(!!opts.next).setText(opts.next?.page ?? '');
    if (opts.next) (this.nextBtn.list[1] as Phaser.GameObjects.Text).setText(opts.next.label ?? 'NEXT \u203a');
    this.onNext = opts.next?.onNext ?? null;
    this.waitingTap = !!opts.tap || !!opts.next;
    this.box.setPosition(this.width / 2, y).setVisible(true).setAlpha(0).setScale(0.85);
    this.scene.tweens.add({ targets: this.box, alpha: 1, scale: 1, duration: 120, ease: 'Back.Out' });
    if (opts.tap) this.scene.tweens.add({ targets: this.tapText, alpha: { from: 1, to: 0.35 }, duration: 600, yoyo: true, repeat: -1 });
    if (opts.ms) this.hideTimer = this.scene.time.delayedCall(opts.ms, () => this.hide());
  }

  hide() {
    this.waitingTap = false;
    this.scene.tweens.killTweensOf(this.tapText);
    if (!this.box.visible) return;
    this.scene.tweens.killTweensOf(this.box);
    this.scene.tweens.add({ targets: this.box, alpha: 0, duration: 160, onComplete: () => this.box.setVisible(false) });
  }

  /** Looping "drag from A to B" hand animation. */
  drag(from: { x: number; y: number }, to: { x: number; y: number }) {
    this.stopHand();
    this.hand.setVisible(true).setPosition(from.x, from.y).setAlpha(1);
    this.handTween = this.scene.tweens.chain({
      targets: this.hand,
      loop: -1,
      tweens: [
        { x: from.x, y: from.y, alpha: 1, scale: this.hand.scale, duration: 1 },
        { scale: this.hand.scale * 0.88, duration: 180 },
        { x: to.x, y: to.y, duration: 700, ease: 'Sine.InOut' },
        { scale: this.hand.scale, duration: 160 },
        { alpha: 0, duration: 300, delay: 250 },
      ],
    }) as unknown as Phaser.Tweens.Tween;
  }

  /** Bobbing hand pointing at a spot. */
  point(at: { x: number; y: number }) {
    this.stopHand();
    this.hand.setVisible(true).setPosition(at.x, at.y).setAlpha(1);
    this.handTween = this.scene.tweens.add({ targets: this.hand, y: at.y + 18, duration: 420, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
  }

  stopHand() {
    this.handTween?.stop();
    this.handTween = null;
    this.scene.tweens.killTweensOf(this.hand);
    this.hand.setVisible(false);
  }

  /** Pulsing rings around cells/spots to focus attention. */
  focus(spots: { x: number; y: number; r?: number }[]) {
    this.focusCells = spots.map((s) => ({ x: s.x, y: s.y, r: s.r ?? 58 }));
  }

  update(now: number) {
    const g = this.rings.clear();
    if (!this.focusCells.length) return;
    const a = 0.55 + 0.45 * Math.sin(now / 160);
    for (const c of this.focusCells) g.lineStyle(7, 0xffcf33, a).strokeCircle(c.x, c.y, c.r).lineStyle(3, 0xffffff, a).strokeCircle(c.x, c.y, c.r + 8);
  }

  clear() {
    this.hide();
    this.stopHand();
    this.focusCells = [];
    this.rings.clear();
  }
}
