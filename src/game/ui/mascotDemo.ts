/** QA row MASCOT DEMO: a test panel with Bolt in the middle and one button per state (needs the MASCOT MOTION switch). Visual only. */
import Phaser from 'phaser';
import { MASCOT_MOTION } from '../../content/experiments';
import { BoltAnimator } from '../fx/boltAnimator';
import { BOLT_STATES, MASCOT_CAP, type BoltState } from '../fx/boltMachine';
import { H, W } from '../sceneKit';

const FONT = 'Lilita One, Arial Black';
const INK = 0x2b1d2e;
const OWNER = 'mascotDemo';

/** Returns false (nothing opened) when the switch is off or another mascot owns the screen. */
export function openMascotDemo(scene: Phaser.Scene): boolean {
  if (!MASCOT_MOTION.on || MASCOT_CAP.current) return false;
  const o = scene.add.container(0, 0).setDepth(160);
  o.add(scene.add.rectangle(W / 2, H / 2, W, H, 0x1a0f18, 0.8).setInteractive());
  const g = scene.add.graphics();
  g.fillStyle(INK, 1).fillRoundedRect(40, 150, W - 80, 920, 36).fillStyle(0xfbe7c6, 1).fillRoundedRect(46, 156, W - 92, 908, 32);
  o.add(g);
  o.add(scene.add.text(W / 2, 205, 'MASCOT DEMO', { fontFamily: FONT, fontSize: '46px', color: '#3b2533' }).setOrigin(0.5));
  const cx = W / 2;
  const cy = 480;
  const bolt = BoltAnimator.create(scene, cx, cy, { owner: OWNER, size: 240 });
  if (!bolt) {
    o.destroy();
    return false;
  }
  o.add(bolt.root);
  const tgt = { x: cx + 260, y: cy - 40 };
  const btn = (s: BoltState, i: number) => {
    const bx = 130 + (i % 3) * 230;
    const by = 760 + Math.floor(i / 3) * 110;
    const b = scene.add.container(bx, by);
    b.add(scene.add.rectangle(0, 0, 200, 86, INK).setStrokeStyle(4, 0xffffff));
    b.add(scene.add.text(0, 0, s.toUpperCase(), { fontFamily: FONT, fontSize: '30px', color: '#ffffff' }).setOrigin(0.5));
    b.setSize(200, 86).setInteractive({ useHandCursor: true });
    // from a held or timed state go through idle first so every button works
    b.on('pointerup', () => {
      if (bolt.state !== 'idle') bolt.rest();
      bolt.play(s, s === 'point' ? tgt : undefined);
    });
    o.add(b);
  };
  BOLT_STATES.filter((s) => s !== 'idle').forEach(btn);
  btn('idle', 6);
  const close = scene.add.container(W / 2, 1010);
  close.add(scene.add.rectangle(0, 0, 260, 76, 0xe8452c).setStrokeStyle(4, INK));
  close.add(scene.add.text(0, 0, 'CLOSE', { fontFamily: FONT, fontSize: '36px', color: '#ffffff' }).setOrigin(0.5));
  close.setSize(260, 76).setInteractive({ useHandCursor: true });
  close.on('pointerup', () => o.destroy());
  o.add(close);
  return true;
}
