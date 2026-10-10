// ROSTER B batch 5 placeholder art (t-af818b65): procedural machines baked into `<family>_<rank>` textures (drawn by
// textures.ts until real PNGs land in src/assets/art) and one job shape icon per unit (`job_<family>`).
import Phaser from 'phaser';
import type { Roster5Family } from '../core/types';

const OUT = 0x2b1d2e;

export const ROSTER_5_COLORS: Record<Roster5Family, [number, number, number]> = {
  crane: [0xe0a020, 0xffe08a, 0x8a5c10],
  dynamo: [0xd04a8a, 0xff9ac8, 0x7a1a4a],
  wrecking_ball: [0x6a7a8a, 0xc8d4e0, 0x2e3a48],
};

/** Draw one roster 5 machine into a 128x128 texture (rank grows the shape, like the other placeholders). */
export function drawRoster5(g: Phaser.GameObjects.Graphics, fam: Roster5Family, rank: number) {
  const [main, light, dark] = ROSTER_5_COLORS[fam];
  g.lineStyle(6, OUT, 1);
  const r = Math.min(rank, 6);
  if (fam === 'crane') {
    // a crane: a base, a tall mast, a jib arm and a hook on a cable; a taller mast with rank
    const top = 52 - r * 6;
    g.fillStyle(dark).fillRoundedRect(22, 104, 84, 16, 6).strokeRoundedRect(22, 104, 84, 16, 6);
    g.fillStyle(main).fillRect(40, top, 16, 108 - top).strokeRect(40, top, 16, 108 - top);
    g.fillStyle(main).fillRect(20, top - 6, 90, 14).strokeRect(20, top - 6, 90, 14);
    g.fillStyle(light).fillRect(46, top + 8, 4, 100 - top - 8);
    g.lineStyle(4, OUT, 1).lineBetween(98, top + 8, 98, 78);
    g.fillStyle(0xdfe6ea).fillRoundedRect(88, 78, 20, 14, 5).strokeRoundedRect(88, 78, 20, 14, 5);
  } else if (fam === 'dynamo') {
    // a round generator body with a 2x2 square on its face and sparks; a bigger ring of bolts with rank
    g.fillStyle(dark).fillCircle(64, 68, 50).strokeCircle(64, 68, 50);
    g.fillStyle(main).fillCircle(64, 68, 40).strokeCircle(64, 68, 40);
    for (let i = 0; i < 2; i++)
      for (let j = 0; j < 2; j++) g.fillStyle(i === j ? 0xffe04a : light).fillRect(46 + i * 18, 50 + j * 18, 16, 16).strokeRect(46 + i * 18, 50 + j * 18, 16, 16);
    const bolts = 8 + r;
    for (let i = 0; i < bolts; i++) {
      const a = (i / bolts) * Math.PI * 2;
      g.fillStyle(0xdfe6ea).fillCircle(64 + Math.cos(a) * 46, 68 + Math.sin(a) * 46, 4);
    }
    g.lineStyle(5, 0xffe04a, 1).lineBetween(64, 6, 54, 20).lineBetween(54, 20, 68, 20).lineBetween(68, 20, 58, 34);
  } else {
    // a wrecking ball: a chain from the top, a big spiked iron ball; more spikes with rank
    g.lineStyle(5, OUT, 1);
    for (let i = 0; i < 4; i++) g.fillStyle(light).fillCircle(64 + (i % 2 ? 6 : -6), 10 + i * 14, 8).strokeCircle(64 + (i % 2 ? 6 : -6), 10 + i * 14, 8);
    g.fillStyle(dark).fillCircle(64, 84, 38).strokeCircle(64, 84, 38);
    const spikes = 6 + r;
    for (let i = 0; i < spikes; i++) {
      const a = (i / spikes) * Math.PI * 2;
      g.fillStyle(light).fillTriangle(64 + Math.cos(a - 0.2) * 38, 84 + Math.sin(a - 0.2) * 38, 64 + Math.cos(a + 0.2) * 38, 84 + Math.sin(a + 0.2) * 38, 64 + Math.cos(a) * 50, 84 + Math.sin(a) * 50);
    }
    g.fillStyle(main).fillCircle(64, 84, 30).strokeCircle(64, 84, 30);
    g.fillStyle(light).fillCircle(54, 74, 8);
  }
}

/** Job shape icons (64x64): LIFT = a hook over two squares, SQUARE = a 2x2 block with a ring of dots, DISTANCE = two dots with a long arrow. */
export function drawJobIcon5(g: Phaser.GameObjects.Graphics, fam: Roster5Family) {
  const [main, light] = ROSTER_5_COLORS[fam];
  g.lineStyle(4, OUT, 1);
  if (fam === 'crane') {
    g.fillStyle(main).fillRoundedRect(6, 40, 20, 18, 4).strokeRoundedRect(6, 40, 20, 18, 4);
    g.fillStyle(light).fillRoundedRect(36, 40, 20, 18, 4).strokeRoundedRect(36, 40, 20, 18, 4);
    g.lineBetween(46, 6, 46, 26);
    g.fillStyle(0xdfe6ea).fillRoundedRect(38, 26, 16, 10, 4).strokeRoundedRect(38, 26, 16, 10, 4);
  } else if (fam === 'dynamo') {
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) g.fillStyle(i === j ? 0xffe04a : main).fillRect(20 + i * 12, 20 + j * 12, 12, 12).strokeRect(20 + i * 12, 20 + j * 12, 12, 12);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      g.fillStyle(light).fillCircle(32 + Math.cos(a) * 26, 32 + Math.sin(a) * 26, 3);
    }
  } else {
    g.fillStyle(main).fillCircle(10, 32, 7).strokeCircle(10, 32, 7);
    g.fillStyle(light).fillCircle(52, 32, 9).strokeCircle(52, 32, 9);
    g.lineStyle(5, OUT, 1).lineBetween(18, 32, 40, 32);
    g.fillStyle(OUT).fillTriangle(44, 32, 34, 25, 34, 39);
  }
}
