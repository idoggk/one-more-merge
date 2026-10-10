// ROSTER B batch 3 placeholder art (t-e728a5a6): procedural machines baked into `<family>_<rank>` textures (drawn by
// textures.ts until real PNGs land in src/assets/art) and one job shape icon per unit (`job_<family>`).
import Phaser from 'phaser';
import type { Roster3Family } from '../core/types';

const OUT = 0x2b1d2e;
const V = (x: number, y: number) => new Phaser.Math.Vector2(x, y);

export const ROSTER_3_COLORS: Record<Roster3Family, [number, number, number]> = {
  blowtorch: [0xff7a1a, 0xffd070, 0x9a3a08],
  pipe: [0x6a9a8a, 0xb0e0d0, 0x34584c],
  blast_plate: [0x8a8fa8, 0xd0d4e8, 0x4a4e66],
  tesla_tower: [0x6ad0ff, 0xd0f4ff, 0x2a6a9a],
};

/** Draw one roster 3 machine into a 128x128 texture (rank grows the shape, like the other placeholders). */
export function drawRoster3(g: Phaser.GameObjects.Graphics, fam: Roster3Family, rank: number) {
  const [main, light, dark] = ROSTER_3_COLORS[fam];
  g.lineStyle(6, OUT, 1);
  const r = Math.min(rank, 6);
  if (fam === 'blowtorch') {
    // a gas tank with a nozzle pointing up and a flame that grows with rank
    g.fillStyle(dark).fillRoundedRect(36, 62, 56, 56, 14).strokeRoundedRect(36, 62, 56, 56, 14);
    g.fillStyle(main).fillRoundedRect(42, 68, 44, 44, 10);
    g.fillStyle(0xdfe6ea).fillRect(56, 40, 16, 26).strokeRect(56, 40, 16, 26);
    const fl = 14 + r * 4;
    g.fillStyle(0xff4a1a).fillTriangle(48, 42, 80, 42, 64, 42 - fl - 10).strokeTriangle(48, 42, 80, 42, 64, 42 - fl - 10);
    g.fillStyle(light).fillTriangle(56, 42, 72, 42, 64, 42 - fl);
    g.fillStyle(light).fillRect(46, 76, 8, 28);
  } else if (fam === 'pipe') {
    // an elbow pipe: a horizontal run joined to a vertical one by a round bend, with flanges; a ring per rank
    g.fillStyle(main).fillRoundedRect(8, 56, 70, 28, 8).strokeRoundedRect(8, 56, 70, 28, 8);
    g.fillStyle(main).fillRoundedRect(50, 8, 28, 76, 8).strokeRoundedRect(50, 8, 28, 76, 8);
    g.fillStyle(main).fillCircle(64, 70, 22).strokeCircle(64, 70, 22);
    g.fillStyle(dark).fillRect(4, 50, 12, 40).strokeRect(4, 50, 12, 40);
    g.fillStyle(dark).fillRect(44, 4, 40, 12).strokeRect(44, 4, 40, 12);
    g.fillStyle(light).fillRect(18, 60, 26, 6);
    for (let i = 0; i < Math.min(rank, 5); i++) g.fillStyle(OUT).fillRect(88 + (i % 2) * 14, 24 + i * 16, 10, 6);
  } else if (fam === 'blast_plate') {
    // a riveted steel plate with a cross brace; more rivets with rank
    const pts = [V(24, 18), V(104, 18), V(104, 88), V(64, 116), V(24, 88)];
    g.fillStyle(dark).fillPoints(pts, true).strokePoints(pts, true);
    g.fillStyle(main).fillRoundedRect(32, 26, 64, 54, 6);
    g.lineStyle(7, OUT, 1).lineBetween(32, 26, 96, 80).lineBetween(96, 26, 32, 80);
    g.fillStyle(light).fillRect(58, 30, 12, 6);
    const rv: [number, number][] = [[38, 32], [90, 32], [38, 74], [90, 74], [64, 53], [64, 96]];
    for (let i = 0; i < Math.min(2 + r, 6); i++) g.fillStyle(light).fillCircle(rv[i][0], rv[i][1], 4);
  } else {
    // a coil tower with a glowing ball on top and a spark bolt; more coil rings with rank
    g.fillStyle(dark).fillRoundedRect(30, 100, 68, 16, 6).strokeRoundedRect(30, 100, 68, 16, 6);
    const pts = [V(46, 100), V(82, 100), V(72, 40), V(56, 40)];
    g.fillStyle(main).fillPoints(pts, true).strokePoints(pts, true);
    for (let i = 0; i < 2 + Math.min(r, 3); i++) g.lineStyle(5, OUT, 1).lineBetween(50 + i, 94 - i * 14, 78 - i, 94 - i * 14);
    g.fillStyle(light).fillCircle(64, 28, 20).strokeCircle(64, 28, 20);
    g.fillStyle(0xffffff).fillCircle(58, 22, 6);
    g.lineStyle(5, 0xffe04a, 1).strokePoints([V(88, 10), V(96, 24), V(90, 24), V(102, 44)], false);
  }
}

/** Job shape icons (64x64): HAZARDS = a flame over a blocked square, SAME FAMILY = three joined dots in a group,
 *  DEFENCE = a shield, STORM = a bolt over dots. Drawn on the unit page next to the job word. */
export function drawJobIcon3(g: Phaser.GameObjects.Graphics, fam: Roster3Family) {
  const [main, light] = ROSTER_3_COLORS[fam];
  g.lineStyle(4, OUT, 1);
  if (fam === 'blowtorch') {
    g.fillStyle(light).fillRect(8, 40, 48, 16).strokeRect(8, 40, 48, 16);
    g.fillStyle(main).fillTriangle(16, 40, 48, 40, 32, 6).strokeTriangle(16, 40, 48, 40, 32, 6);
    g.fillStyle(0xffe04a).fillTriangle(25, 40, 39, 40, 32, 20);
  } else if (fam === 'pipe') {
    g.lineStyle(7, OUT, 1).lineBetween(14, 44, 32, 20).lineBetween(32, 20, 50, 44);
    g.lineStyle(3, light, 1).lineBetween(14, 44, 32, 20).lineBetween(32, 20, 50, 44);
    for (const [x, y] of [[14, 44], [32, 20], [50, 44]]) g.fillStyle(main).fillCircle(x, y, 9).strokeCircle(x, y, 9);
  } else if (fam === 'blast_plate') {
    const pts = [V(10, 8), V(54, 8), V(54, 34), V(32, 58), V(10, 34)];
    g.fillStyle(main).fillPoints(pts, true).strokePoints(pts, true);
    g.fillStyle(light).fillRect(28, 16, 8, 24).fillRect(20, 24, 24, 8);
  } else {
    g.fillStyle(light).fillCircle(14, 52, 6).strokeCircle(14, 52, 6).fillCircle(50, 52, 6).strokeCircle(50, 52, 6);
    g.fillStyle(main).fillPoints([V(36, 4), V(18, 32), V(30, 32), V(24, 58), V(48, 24), V(34, 24)], true).strokePoints([V(36, 4), V(18, 32), V(30, 32), V(24, 58), V(48, 24), V(34, 24)], true);
  }
}
