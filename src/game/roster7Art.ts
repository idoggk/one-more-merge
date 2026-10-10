// ROSTER B batch 7 placeholder art (t-67cd7c5b): procedural machines baked into `<family>_<rank>` textures (drawn by
// textures.ts until real PNGs land in src/assets/art) and one job shape icon per unit (`job_<family>`).
import Phaser from 'phaser';
import type { Roster7Family } from '../core/types';

const OUT = 0x2b1d2e;

export const ROSTER_7_COLORS: Record<Roster7Family, [number, number, number]> = {
  rivet_gun: [0xd89030, 0xffd890, 0x8a5410],
  vice: [0x8a8a96, 0xd8d8e4, 0x4a4a58],
  router: [0x4aa08a, 0xa0f0d8, 0x1a5a4a],
  hydraulic_press: [0x3a7ac0, 0x9ac8ff, 0x1a3e78],
  lathe: [0xc0a040, 0xfff0a0, 0x7a6410],
};

/** Draw one roster 7 machine into a 128x128 texture (rank grows the shape, like the other placeholders). */
export function drawRoster7(g: Phaser.GameObjects.Graphics, fam: Roster7Family, rank: number) {
  const [main, light, dark] = ROSTER_7_COLORS[fam];
  g.lineStyle(6, OUT, 1);
  const r = Math.min(rank, 6);
  if (fam === 'rivet_gun') {
    // a squat rivet gun: a barrel pointing right with a round rivet head, a grip below and a row of rivets; one more rivet per rank
    g.fillStyle(dark).fillRoundedRect(18, 40, 72, 34, 10).strokeRoundedRect(18, 40, 72, 34, 10);
    g.fillStyle(main).fillRoundedRect(22, 44, 64, 24, 8);
    g.fillStyle(0xdfe6ea).fillRoundedRect(88, 48, 28, 16, 5).strokeRoundedRect(88, 48, 28, 16, 5);
    g.fillStyle(dark).fillRoundedRect(34, 72, 22, 36, 6).strokeRoundedRect(34, 72, 22, 36, 6);
    g.fillStyle(light).fillRect(28, 48, 34, 6);
    for (let i = 0; i < r; i++) g.fillStyle(0xdfe6ea).fillCircle(24 + i * 14, 94 + (i % 2) * 8, 5).strokeCircle(24 + i * 14, 94 + (i % 2) * 8, 5);
  } else if (fam === 'vice') {
    // a bench vice: a heavy base, a fixed jaw on the left, a moving jaw on the right, a screw bar with a handle; the jaws close with rank
    const gap = 30 - r * 3;
    g.fillStyle(dark).fillRoundedRect(14, 92, 100, 22, 6).strokeRoundedRect(14, 92, 100, 22, 6);
    g.fillStyle(main).fillRoundedRect(20, 30, 34, 66, 6).strokeRoundedRect(20, 30, 34, 66, 6);
    g.fillStyle(main).fillRoundedRect(54 + gap, 30, 34, 66, 6).strokeRoundedRect(54 + gap, 30, 34, 66, 6);
    g.fillStyle(light).fillRect(26, 36, 6, 52).fillRect(60 + gap, 36, 6, 52);
    g.lineStyle(8, OUT, 1).lineBetween(88 + gap, 62, 118, 62);
    g.lineStyle(14, OUT, 1).lineBetween(118, 44, 118, 80);
    g.lineStyle(8, light, 1).lineBetween(118, 46, 118, 78);
  } else if (fam === 'router') {
    // a block with an L-shaped path routed into it and a round bit; a longer path with rank
    g.fillStyle(dark).fillRoundedRect(16, 22, 96, 92, 12).strokeRoundedRect(16, 22, 96, 92, 12);
    g.fillStyle(main).fillRoundedRect(22, 28, 84, 80, 9);
    g.lineStyle(16, OUT, 1).lineBetween(36, 40, 36, 88).lineBetween(36, 88, 36 + 24 + r * 6, 88);
    g.lineStyle(9, light, 1).lineBetween(36, 40, 36, 88).lineBetween(36, 88, 36 + 24 + r * 6, 88);
    g.fillStyle(0xdfe6ea).fillCircle(36, 40, 11).strokeCircle(36, 40, 11);
    g.fillStyle(OUT).fillCircle(36, 40, 4);
  } else if (fam === 'hydraulic_press') {
    // a press: a frame, a thick plate coming down on a bed, a piston rod; the plate sits lower with rank
    const drop = 6 + r * 3;
    g.fillStyle(dark).fillRoundedRect(14, 100, 100, 18, 6).strokeRoundedRect(14, 100, 100, 18, 6);
    g.fillStyle(dark).fillRect(22, 12, 14, 90).strokeRect(22, 12, 14, 90).fillRect(92, 12, 14, 90).strokeRect(92, 12, 14, 90);
    g.fillStyle(main).fillRoundedRect(22, 8, 84, 22, 6).strokeRoundedRect(22, 8, 84, 22, 6);
    g.fillStyle(0xdfe6ea).fillRect(56, 30, 16, 20 + drop).strokeRect(56, 30, 16, 20 + drop);
    g.fillStyle(light).fillRoundedRect(36, 50 + drop, 56, 20, 5).strokeRoundedRect(36, 50 + drop, 56, 20, 5);
    g.fillStyle(main).fillRoundedRect(36, 86, 56, 14, 4).strokeRoundedRect(36, 86, 56, 14, 4);
  } else {
    // a lathe: a long bed, a headstock with a chuck on the left, a spinning bar and a tool post; more rings on the bar with rank
    g.fillStyle(dark).fillRoundedRect(10, 88, 108, 26, 6).strokeRoundedRect(10, 88, 108, 26, 6);
    g.fillStyle(main).fillRoundedRect(12, 42, 32, 50, 6).strokeRoundedRect(12, 42, 32, 50, 6);
    g.fillStyle(light).fillRect(18, 50, 20, 6);
    g.fillStyle(0xdfe6ea).fillRect(44, 54, 66, 24).strokeRect(44, 54, 66, 24);
    for (let i = 0; i < r; i++) g.fillStyle(light).fillRect(50 + i * 10, 54, 4, 24);
    g.fillStyle(main).fillTriangle(96, 30, 112, 30, 104, 54).strokeTriangle(96, 30, 112, 30, 104, 54);
    g.fillStyle(dark).fillRoundedRect(92, 22, 24, 12, 4).strokeRoundedRect(92, 22, 24, 12, 4);
  }
}

/** Job shape icons (64x64): THIRD = three dots with the third big, GRIP = two jaws with an inward arrow, TURN = an L-shaped path,
 *  SQUEEZE = a plate over a filled plus of cells, SPAN = a bar with a long arrow from one edge to the other. */
export function drawJobIcon7(g: Phaser.GameObjects.Graphics, fam: Roster7Family) {
  const [main, light] = ROSTER_7_COLORS[fam];
  g.lineStyle(4, OUT, 1);
  if (fam === 'rivet_gun') {
    g.fillStyle(light).fillCircle(10, 32, 5).strokeCircle(10, 32, 5);
    g.fillStyle(light).fillCircle(28, 32, 5).strokeCircle(28, 32, 5);
    g.fillStyle(main).fillCircle(50, 32, 11).strokeCircle(50, 32, 11);
  } else if (fam === 'vice') {
    g.fillStyle(main).fillRoundedRect(4, 8, 14, 48, 4).strokeRoundedRect(4, 8, 14, 48, 4);
    g.fillStyle(main).fillRoundedRect(46, 8, 14, 48, 4).strokeRoundedRect(46, 8, 14, 48, 4);
    g.lineStyle(5, OUT, 1).lineBetween(22, 32, 38, 32);
    g.fillStyle(OUT).fillTriangle(42, 32, 32, 25, 32, 39);
  } else if (fam === 'router') {
    g.lineStyle(10, OUT, 1).lineBetween(14, 10, 14, 48).lineBetween(14, 48, 52, 48);
    g.lineStyle(5, light, 1).lineBetween(14, 10, 14, 48).lineBetween(14, 48, 52, 48);
    g.fillStyle(main).fillCircle(14, 10, 8).strokeCircle(14, 10, 8);
  } else if (fam === 'hydraulic_press') {
    g.fillStyle(main).fillRoundedRect(8, 6, 48, 14, 4).strokeRoundedRect(8, 6, 48, 14, 4);
    for (const [x, y] of [[24, 28], [8, 40], [40, 40], [24, 52]]) g.fillStyle(light).fillRoundedRect(x, y, 16, 10, 3).strokeRoundedRect(x, y, 16, 10, 3);
  } else {
    g.fillStyle(main).fillRoundedRect(4, 26, 12, 12, 3).strokeRoundedRect(4, 26, 12, 12, 3);
    g.fillStyle(light).fillRoundedRect(48, 26, 12, 12, 3).strokeRoundedRect(48, 26, 12, 12, 3);
    g.lineStyle(5, OUT, 1).lineBetween(18, 32, 36, 32);
    g.fillStyle(OUT).fillTriangle(44, 32, 34, 25, 34, 39);
  }
}
