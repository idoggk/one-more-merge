// ROSTER B batch 2 placeholder art (t-ee4e93d7): procedural machines baked into `<family>_<rank>` textures (drawn by
// textures.ts until real PNGs land in src/assets/art) and one job shape icon per unit (`job_<family>`).
import Phaser from 'phaser';
import type { Roster2Family } from '../core/types';

const OUT = 0x2b1d2e;
const V = (x: number, y: number) => new Phaser.Math.Vector2(x, y);

export const ROSTER_2_COLORS: Record<Roster2Family, [number, number, number]> = {
  wrench: [0xc8a050, 0xf0d890, 0x7a5a20],
  piston: [0xd05a3a, 0xff9a7a, 0x7a2a18],
  spring: [0x7ac060, 0xc0f0a0, 0x3a7030],
  belt_drive: [0x6a7a90, 0xa8b8d0, 0x3a4658],
};

/** A zigzag coil (Spring): `turns` bends between (x, y0) and (x, y1). */
function zig(g: Phaser.GameObjects.Graphics, x: number, y0: number, y1: number, w: number, turns: number, color: number) {
  const pts: Phaser.Math.Vector2[] = [V(x, y0)];
  for (let i = 0; i < turns; i++) pts.push(V(x + (i % 2 ? -w : w), y0 + ((i + 0.5) * (y1 - y0)) / turns));
  pts.push(V(x, y1));
  g.lineStyle(14, OUT, 1).strokePoints(pts, false);
  g.lineStyle(7, color, 1).strokePoints(pts, false);
}

/** Draw one roster 2 machine into a 128x128 texture (rank grows the shape, like the other placeholders). */
export function drawRoster2(g: Phaser.GameObjects.Graphics, fam: Roster2Family, rank: number) {
  const [main, light, dark] = ROSTER_2_COLORS[fam];
  g.lineStyle(6, OUT, 1);
  const r = Math.min(rank, 6);
  if (fam === 'wrench') {
    // an open-jaw spanner leaning up-right; one jaw notch dot per rank band
    const hd = [V(40, 108), V(58, 112), V(92, 54), V(74, 46)];
    g.fillStyle(main).fillPoints(hd, true).strokePoints(hd, true);
    g.fillStyle(main).fillCircle(86, 36, 26 + r).strokeCircle(86, 36, 26 + r);
    g.fillStyle(dark).fillTriangle(86, 36, 112, 14, 112, 44).strokeTriangle(86, 36, 112, 14, 112, 44);
    g.fillStyle(light).fillRect(54, 84, 8, 8);
    for (let i = 0; i < Math.min(rank, 5); i++) g.fillStyle(light).fillCircle(24 + i * 10, 22, 4).strokeCircle(24 + i * 10, 22, 4);
  } else if (fam === 'piston') {
    // a cylinder with a rod and a wide head pushing out of it; the rod grows with rank
    const out = 22 + r * 3;
    g.fillStyle(dark).fillRoundedRect(30, 66, 68, 54, 10).strokeRoundedRect(30, 66, 68, 54, 10);
    g.fillStyle(0xdfe6ea).fillRect(56, 66 - out, 16, out + 4).strokeRect(56, 66 - out, 16, out + 4);
    g.fillStyle(main).fillRoundedRect(36, 66 - out - 16, 56, 22, 6).strokeRoundedRect(36, 66 - out - 16, 56, 22, 6);
    g.fillStyle(light).fillRect(42, 74, 8, 36);
    for (let i = 0; i < Math.min(rank, 4); i++) g.lineStyle(4, OUT, 1).lineBetween(34, 84 + i * 8, 94, 84 + i * 8);
  } else if (fam === 'spring') {
    // a bouncy coil between two plates; more bends with rank
    g.fillStyle(dark).fillRoundedRect(30, 100, 68, 14, 6).strokeRoundedRect(30, 100, 68, 14, 6);
    zig(g, 64, 98, 30, 24, 4 + Math.min(rank, 4), main);
    g.fillStyle(main).fillRoundedRect(30, 14, 68, 14, 6).strokeRoundedRect(30, 14, 68, 14, 6);
    g.fillStyle(light).fillRect(36, 18, 22, 4);
  } else {
    // two pulleys joined by a belt; the belt has a tooth mark per rank
    g.fillStyle(dark).fillRoundedRect(10, 30, 108, 68, 34).strokeRoundedRect(10, 30, 108, 68, 34);
    g.fillStyle(main).fillRoundedRect(20, 40, 88, 48, 24).strokeRoundedRect(20, 40, 88, 48, 24);
    for (const x of [38, 90]) {
      g.fillStyle(light).fillCircle(x, 64, 16).strokeCircle(x, 64, 16);
      g.fillStyle(OUT).fillCircle(x, 64, 5);
    }
    for (let i = 0; i < Math.min(rank, 5); i++) g.fillStyle(OUT).fillRect(46 + i * 7, 30, 3, 8);
  }
}

/** Job shape icons (64x64): UPGRADE = an arrow up through a rank pip, OPEN SPACE = a square with empty corners around a dot,
 *  HOP = a dot, a gap and a dot joined by an arc, BRIDGE = two posts joined by a long span. Drawn on the unit page next to the job word. */
export function drawJobIcon2(g: Phaser.GameObjects.Graphics, fam: Roster2Family) {
  const [main, light] = ROSTER_2_COLORS[fam];
  g.lineStyle(4, OUT, 1);
  if (fam === 'wrench') {
    g.fillStyle(main).fillTriangle(32, 6, 50, 30, 14, 30).strokeTriangle(32, 6, 50, 30, 14, 30);
    g.fillStyle(light).fillRect(24, 30, 16, 26).strokeRect(24, 30, 16, 26);
  } else if (fam === 'piston') {
    for (const [x, y] of [[6, 6], [42, 6], [6, 42], [42, 42]]) g.fillStyle(light).fillRect(x, y, 16, 16).strokeRect(x, y, 16, 16);
    g.fillStyle(main).fillCircle(32, 32, 10).strokeCircle(32, 32, 10);
  } else if (fam === 'spring') {
    g.fillStyle(main).fillCircle(10, 44, 7).strokeCircle(10, 44, 7);
    g.fillStyle(main).fillCircle(54, 44, 7).strokeCircle(54, 44, 7);
    g.lineStyle(5, light, 1).beginPath().arc(32, 44, 22, Math.PI, 0, false).strokePath();
    g.lineStyle(3, OUT, 1).strokeCircle(32, 44, 4);
  } else {
    g.fillStyle(main).fillRect(4, 22, 12, 28).strokeRect(4, 22, 12, 28);
    g.fillStyle(main).fillRect(48, 22, 12, 28).strokeRect(48, 22, 12, 28);
    g.fillStyle(light).fillRect(16, 26, 32, 8).strokeRect(16, 26, 32, 8);
  }
}
