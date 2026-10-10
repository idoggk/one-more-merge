// ROSTER B batch 4 placeholder art (t-1e3c8bb6): procedural machines baked into `<family>_<rank>` textures (drawn by
// textures.ts until real PNGs land in src/assets/art) and one job shape icon per unit (`job_<family>`).
import Phaser from 'phaser';
import type { Roster4Family } from '../core/types';

const OUT = 0x2b1d2e;
const V = (x: number, y: number) => new Phaser.Math.Vector2(x, y);

export const ROSTER_4_COLORS: Record<Roster4Family, [number, number, number]> = {
  capacitor: [0x3aa6c8, 0xa8ecff, 0x1a5a74],
  blueprint: [0x4a78c8, 0xcfe0ff, 0x24407a],
  ladder: [0xc89a3a, 0xffe29a, 0x7a5410],
  rewind_crank: [0x8a6ac8, 0xdcc8ff, 0x4a3478],
};

/** Draw one roster 4 machine into a 128x128 texture (rank grows the shape, like the other placeholders). */
export function drawRoster4(g: Phaser.GameObjects.Graphics, fam: Roster4Family, rank: number) {
  const [main, light, dark] = ROSTER_4_COLORS[fam];
  g.lineStyle(6, OUT, 1);
  const r = Math.min(rank, 6);
  if (fam === 'capacitor') {
    // a fat can with two terminals on top and a charge gauge that fills with rank
    g.fillStyle(dark).fillRoundedRect(30, 34, 68, 82, 16).strokeRoundedRect(30, 34, 68, 82, 16);
    g.fillStyle(main).fillRoundedRect(36, 40, 56, 70, 12);
    g.fillStyle(0xdfe6ea).fillRect(44, 14, 12, 24).strokeRect(44, 14, 12, 24).fillRect(72, 14, 12, 24).strokeRect(72, 14, 12, 24);
    g.fillStyle(OUT).fillRoundedRect(46, 50, 36, 52, 6);
    for (let i = 0; i < 1 + Math.min(r, 5); i++) g.fillStyle(i % 2 ? light : 0xffe04a).fillRect(50, 96 - i * 9, 28, 6);
  } else if (fam === 'blueprint') {
    // a blue sheet with a white grid, a compass arc and a drawn line; more grid lines with rank
    g.fillStyle(main).fillRoundedRect(14, 20, 100, 88, 8).strokeRoundedRect(14, 20, 100, 88, 8);
    g.lineStyle(2, light, 0.9);
    for (let i = 1; i <= 2 + Math.min(r, 4); i++) {
      g.lineBetween(14 + i * 14, 24, 14 + i * 14, 104);
      if (i < 6) g.lineBetween(18, 20 + i * 14, 110, 20 + i * 14);
    }
    g.lineStyle(5, 0xffffff, 1).strokePoints([V(28, 92), V(54, 56), V(78, 74), V(100, 36)], false);
    g.fillStyle(0xffe04a).fillCircle(100, 36, 7).strokeCircle(100, 36, 7);
    g.fillStyle(dark).fillRect(14, 20, 100, 8);
  } else if (fam === 'ladder') {
    // a ladder: two rails and one more rung for each rank
    g.fillStyle(main).fillRoundedRect(30, 10, 14, 108, 5).strokeRoundedRect(30, 10, 14, 108, 5);
    g.fillStyle(main).fillRoundedRect(84, 10, 14, 108, 5).strokeRoundedRect(84, 10, 14, 108, 5);
    const rungs = 2 + Math.min(r, 5);
    for (let i = 0; i < rungs; i++) {
      const y = 112 - (i + 1) * (100 / (rungs + 1));
      g.fillStyle(light).fillRect(40, y - 5, 48, 10).strokeRect(40, y - 5, 48, 10);
    }
    g.fillStyle(dark).fillRect(24, 112, 26, 8).fillRect(78, 112, 26, 8);
  } else {
    // a wheel with a hand crank and a curved arrow going backwards; more teeth with rank
    g.fillStyle(dark).fillCircle(58, 68, 46).strokeCircle(58, 68, 46);
    const teeth = 6 + Math.min(r, 5) * 2;
    for (let i = 0; i < teeth; i++) {
      const a = (i / teeth) * Math.PI * 2;
      g.fillStyle(dark).fillCircle(58 + Math.cos(a) * 46, 68 + Math.sin(a) * 46, 5);
    }
    g.fillStyle(main).fillCircle(58, 68, 36).strokeCircle(58, 68, 36);
    g.lineStyle(9, OUT, 1).lineBetween(58, 68, 100, 30);
    g.fillStyle(light).fillCircle(102, 28, 11).strokeCircle(102, 28, 11);
    g.fillStyle(light).fillCircle(58, 68, 9).strokeCircle(58, 68, 9);
    g.lineStyle(7, light, 1).beginPath().arc(58, 68, 22, Math.PI * 0.15, Math.PI * 1.1, false).strokePath();
    g.fillStyle(light).fillTriangle(34, 84, 48, 86, 36, 98);
  }
}

/** Job shape icons (64x64): HOLD = a can with a lock bar, PLAN = three squares in a row with the first one lit, STAIRCASE = three
 *  rising steps, UNDO = a curved arrow going back. Drawn on the unit page next to the job word. */
export function drawJobIcon4(g: Phaser.GameObjects.Graphics, fam: Roster4Family) {
  const [main, light] = ROSTER_4_COLORS[fam];
  g.lineStyle(4, OUT, 1);
  if (fam === 'capacitor') {
    g.fillStyle(main).fillRoundedRect(14, 14, 36, 42, 8).strokeRoundedRect(14, 14, 36, 42, 8);
    g.fillStyle(light).fillRect(22, 22, 20, 8).fillRect(22, 34, 20, 8);
    g.fillStyle(0xdfe6ea).fillRect(22, 6, 8, 10).strokeRect(22, 6, 8, 10).fillRect(36, 6, 8, 10).strokeRect(36, 6, 8, 10);
  } else if (fam === 'blueprint') {
    for (let i = 0; i < 3; i++) g.fillStyle(i === 0 ? 0xffe04a : main).fillRoundedRect(4 + i * 20, 22, 16, 20, 4).strokeRoundedRect(4 + i * 20, 22, 16, 20, 4);
    g.fillStyle(light).fillTriangle(8, 12, 20, 12, 14, 20);
  } else if (fam === 'ladder') {
    for (let i = 0; i < 3; i++) g.fillStyle(i === 2 ? light : main).fillRect(6 + i * 16, 44 - i * 14, 16, 14 + i * 14).strokeRect(6 + i * 16, 44 - i * 14, 16, 14 + i * 14);
  } else {
    g.lineStyle(8, OUT, 1).beginPath().arc(32, 34, 18, Math.PI * 1.2, Math.PI * 2.4, false).strokePath();
    g.lineStyle(4, light, 1).beginPath().arc(32, 34, 18, Math.PI * 1.2, Math.PI * 2.4, false).strokePath();
    g.fillStyle(main).fillTriangle(8, 20, 28, 12, 22, 34).strokeTriangle(8, 20, 28, 12, 22, 34);
  }
}
