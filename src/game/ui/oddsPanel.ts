// Crate odds panel (units/crates design t-3d56deb5: "odds always shown"). An 'i' button on the crate shop and on the
// crate reveal opens it. Every line comes from core/crateOdds.ts, which reads the same tables and slot rule rollCrate
// uses. This file only draws; GameScene passes the player's pity state in.
import Phaser from 'phaser';
import { crateOddsLines, pityLines, type PityView } from '../../core/crateOdds';
import { TUNING } from '../../content/tuning';
import type { CrateKind } from '../../content/units';

const FONT = 'Lilita One, Arial Black';
const INK = 0x2b1d2e;
const CREAM = 0xfbe7c6;
const TIER_COL: Record<CrateKind, number> = { wood: 0xa0703a, iron: 0x7a8a9a, gold: 0xe0b040, bench: 0xf0b020 };

/** A round 'i' button inside `parent` (a modal container) that calls `onTap`. */
export function addOddsButton(scene: Phaser.Scene, parent: Phaser.GameObjects.Container, x: number, y: number, onTap: () => void) {
  const b = scene.add.container(x, y);
  b.add(scene.add.circle(0, 0, 26, INK).setStrokeStyle(4, 0xffffff, 1));
  b.add(scene.add.text(0, 1, 'i', { fontFamily: 'Georgia, serif', fontStyle: 'bold italic', fontSize: '34px', color: '#ffffff' }).setOrigin(0.5));
  b.add(scene.add.text(0, 40, 'ODDS', { fontFamily: FONT, fontSize: '16px', color: '#3b2533' }).setOrigin(0.5));
  b.setSize(96, 96).setInteractive({ useHandCursor: true });
  b.on('pointerup', onTap);
  parent.add(b);
  return b;
}

/** Full-screen odds sheet over whatever is open; tap anywhere to close. `focus` outlines that crate tier. */
export function showOddsPanel(scene: Phaser.Scene, W: number, H: number, pity: PityView, focus?: CrateKind) {
  const o = scene.add.container(0, 0).setDepth(150);
  const dim = scene.add.rectangle(W / 2, H / 2, W, H, 0x1a0f18, 0.7).setInteractive();
  const bg = scene.add.graphics();
  o.add([dim, bg]);
  const body = scene.add.container(0, 0);
  o.add(body);
  const L = 80, wrap = W - 2 * L;
  let y = 0;
  const B = TUNING.rosterB; // ROSTER B: four tiers, a little smaller type so the sheet still fits
  const line = (text: string, size: number, color: string, font = 'Arial', gap = 8) => {
    const t = scene.add.text(L, y, text, { fontFamily: font, fontStyle: font === 'Arial' ? 'bold' : undefined, fontSize: `${size}px`, color, wordWrap: { width: wrap }, lineSpacing: 3 });
    body.add(t);
    y += t.height + gap;
    return t;
  };
  line('CRATE ODDS', 44, '#3b2533', FONT, 4);
  line(B ? 'Every card rolls these odds on its own, before guarantees. Guarantees (pity, "at least N Rare") can raise your real odds. The Tool Bag row leaves out the latch chance: latch chances are on their own row.' : 'Every card rolls these odds on its own.', B ? 17 : 20, '#7a5a4a', 'Arial', 18);
  const boxes: { kind: CrateKind; y0: number; y1: number }[] = [];
  for (const kind of (B ? ['wood', 'iron', 'gold', 'bench'] : ['wood', 'iron', 'gold']) as CrateKind[]) {
    const y0 = y;
    y += 10;
    const t = crateOddsLines(kind, pity);
    line(t.title, B ? 25 : 28, '#3b2533', FONT, 4);
    for (const r of t.rows) line(r, B ? 17 : 20, '#4a3240', 'Arial', B ? 5 : 8);
    y += 6;
    boxes.push({ kind, y0, y1: y });
    y += 12;
  }
  for (const r of pityLines(pity)) line(r, B ? 16 : 19, '#5a3a5a', 'Arial', B ? 5 : 8);
  line('Tap anywhere to close', 20, '#9a7a6a', FONT, 0);
  const top = Math.max(20, (H - y) / 2);
  body.setY(top);
  bg.fillStyle(INK, 1).fillRoundedRect(40, top - 46, W - 80, y + 82, 36).fillStyle(CREAM, 1).fillRoundedRect(46, top - 40, W - 92, y + 70, 32);
  for (const b of boxes) {
    bg.fillStyle(TIER_COL[b.kind], b.kind === focus ? 0.35 : 0.14).fillRoundedRect(L - 16, top + b.y0, wrap + 32, b.y1 - b.y0, 16);
    if (b.kind === focus) bg.lineStyle(4, TIER_COL[b.kind], 1).strokeRoundedRect(L - 16, top + b.y0, wrap + 32, b.y1 - b.y0, 16);
  }
  dim.on('pointerup', () => o.destroy());
  o.setAlpha(0);
  scene.tweens.add({ targets: o, alpha: 1, duration: 160 });
  return o;
}
