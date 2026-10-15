// LEVEL TIMELINE HUD (docs/design/LEVEL_TIMELINE.md): a thin bar under the HP bar. The gold fill is the armor clock, the notches
// are where each machine breaks, the label says how long until the armor is fully open and how many blows are waiting.
import Phaser from 'phaser';
import type { GameScene } from '../GameScene';
import { HP_Y, W, fmt, textColor } from '../sceneKit';

const BAR_W = 440;
const parts = new WeakMap<GameScene, { g: Phaser.GameObjects.Graphics; label: Phaser.GameObjects.Text }>();

export function drawTimeline(scene: GameScene, alpha = 1) {
  const s = scene.s;
  let p = parts.get(scene);
  if (!s.tl || s.phase !== 'playing') {
    if (p) {
      p.g.clear();
      p.label.setVisible(false);
    }
    return;
  }
  if (!p) {
    p = {
      g: scene.add.graphics().setDepth(3),
      label: scene.add.text(W / 2, HP_Y + 40, '', { fontFamily: 'Lilita One, Arial Black', fontSize: '18px', color: '#ffe9a8', stroke: '#2b1d2e', strokeThickness: 5 }).setOrigin(0.5).setDepth(4),
    };
    parts.set(scene, p);
  }
  const { tl } = s;
  const f = Math.min(1, s.elapsed / tl.span);
  const x0 = W / 2 - BAR_W / 2;
  const y = HP_Y + 24;
  p.g.clear().setAlpha(alpha);
  p.g.fillStyle(0x2b1d2e, 0.9).fillRoundedRect(x0 - 3, y - 3, BAR_W + 6, 14, 7);
  p.g.fillStyle(0x5a4a5a, 1).fillRoundedRect(x0, y, BAR_W, 8, 4);
  if (f > 0) p.g.fillStyle(tl.bank > 0 ? 0xffcf33 : 0xa98b3a, 1).fillRoundedRect(x0, y, Math.max(8, BAR_W * f), 8, 4);
  for (const m of (tl.marks ?? []).slice(0, -1)) p.g.fillStyle(0x2b1d2e, 1).fillRect(x0 + BAR_W * m - 1.5, y - 3, 3, 14);
  const left = Math.max(0, Math.ceil(tl.span - s.elapsed));
  const txt = tl.bank > 0 ? `ARMOR OPENING · ${fmt(Math.round(tl.bank))} QUEUED` : left > 0 ? `ARMOR OPENS IN ${left}s` : 'ARMOR OPEN';
  if (p.label.text !== txt) textColor(p.label.setText(txt), tl.bank > 0 ? '#ffcf33' : '#ffe9a8');
  p.label.setVisible(true).setAlpha(alpha);
}
