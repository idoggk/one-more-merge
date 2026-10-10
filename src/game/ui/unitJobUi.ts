// Unit card copy (job word + WHEN MERGED line from content/unitJobs.ts) for the Units page card, the crate reveal card
// and the unit detail page. Small cards show only the job word (big enough to read on a 390px phone); the WHEN MERGED
// line lives on the detail page and in the crate reveal's tap popup. Only draws; GameScene calls it with the container.
import Phaser from 'phaser';
import { unitJob } from '../../content/unitJobs';

const FONT = 'Lilita One, Arial Black';

/** Job word pill centred at (x, y) inside `parent`. `size` in design px (22 ≈ 12 px on a 390px phone at card scale 1). */
export function addUnitJob(scene: Phaser.Scene, parent: Phaser.GameObjects.Container, id: string, x: number, y: number, size = 22) {
  const j = unitJob(id);
  if (!j) return;
  parent.add(scene.add.text(x, y, j.job, { fontFamily: FONT, fontSize: `${size}px`, color: '#ffffff', backgroundColor: '#8e58c9', padding: { x: 10, y: 2 } }).setOrigin(0.5));
}

/** Detail page: the WHEN MERGED line alone (the job word sits in the role line). */
export function addMergedLine(scene: Phaser.Scene, parent: Phaser.GameObjects.Container, id: string, level: number, x: number, y: number, width: number) {
  const m = unitJob(id, level)?.merged;
  if (m) parent.add(scene.add.text(x, y, m, { fontFamily: FONT, fontSize: '22px', color: '#8e58c9', align: 'center', wordWrap: { width } }).setOrigin(0.5, 0));
}

/** Crate reveal: tap a card to read its job + WHEN MERGED line in a large popup (tap anywhere to close). */
export function showUnitJobPopup(scene: Phaser.Scene, W: number, H: number, id: string, name: string, level: number) {
  const j = unitJob(id, level);
  if (!j) return;
  const o = scene.add.container(0, 0).setDepth(150);
  const dim = scene.add.rectangle(W / 2, H / 2, W, H, 0x1a0f18, 0.6).setInteractive();
  const head = scene.add.text(W / 2, 0, `${name}  ·  ${j.job}`, { fontFamily: FONT, fontSize: '40px', color: '#3b2533', align: 'center', wordWrap: { width: W - 160 } }).setOrigin(0.5, 0);
  const body = scene.add.text(W / 2, 0, j.merged ?? '', { fontFamily: FONT, fontSize: '30px', color: '#8e58c9', align: 'center', wordWrap: { width: W - 160 } }).setOrigin(0.5, 0);
  const hint = scene.add.text(W / 2, 0, 'Tap anywhere to close', { fontFamily: FONT, fontSize: '22px', color: '#9a7a6a' }).setOrigin(0.5, 0);
  const h = head.height + 18 + body.height + 24 + hint.height;
  const top = (H - h) / 2;
  head.setY(top);
  body.setY(top + head.height + 18);
  hint.setY(top + head.height + 18 + body.height + 24);
  const bg = scene.add.graphics().fillStyle(0x2b1d2e, 1).fillRoundedRect(40, top - 46, W - 80, h + 92, 36).fillStyle(0xfbe7c6, 1).fillRoundedRect(46, top - 40, W - 92, h + 80, 32);
  o.add([dim, bg, head, body, hint]);
  dim.on('pointerup', () => o.destroy());
  return o;
}
