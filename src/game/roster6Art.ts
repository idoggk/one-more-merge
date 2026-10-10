// ROSTER B batch 6 placeholder art (t-f2cd50e4): procedural machines baked into `<family>_<rank>` textures (drawn by textures.ts
// until real PNGs land in src/assets/art) and one job shape icon per unit (`job_<family>`).
import Phaser from 'phaser';
import type { Roster6Family } from '../core/types';

const OUT = 0x2b1d2e;

export const ROSTER_6_COLORS: Record<Roster6Family, [number, number, number]> = {
  robot_arm: [0x5a8ad0, 0xc8dcff, 0x2a4a80],
  tilt_lever: [0xd08a3a, 0xffd89a, 0x7a4a14],
};

/** Draw one roster 6 machine into a 128x128 texture (rank grows the shape, like the other placeholders). */
export function drawRoster6(g: Phaser.GameObjects.Graphics, fam: Roster6Family, rank: number) {
  const [main, light, dark] = ROSTER_6_COLORS[fam];
  g.lineStyle(6, OUT, 1);
  const r = Math.min(rank, 6);
  if (fam === 'robot_arm') {
    // a bolted base, two jointed arm segments and a two-finger claw; one more indicator light per rank
    g.fillStyle(dark).fillRoundedRect(20, 100, 88, 18, 6).strokeRoundedRect(20, 100, 88, 18, 6);
    g.fillStyle(main).fillCircle(44, 98, 14).strokeCircle(44, 98, 14);
    g.lineStyle(14, OUT, 1).lineBetween(44, 98, 58, 52).lineBetween(58, 52, 92, 40);
    g.lineStyle(8, main, 1).lineBetween(44, 98, 58, 52).lineBetween(58, 52, 92, 40);
    g.fillStyle(light).fillCircle(58, 52, 9).strokeCircle(58, 52, 9);
    g.lineStyle(6, OUT, 1);
    g.fillStyle(0xdfe6ea).fillRoundedRect(86, 26, 18, 28, 5).strokeRoundedRect(86, 26, 18, 28, 5);
    g.fillStyle(0xdfe6ea).fillTriangle(104, 30, 120, 22, 108, 40).fillTriangle(104, 50, 120, 58, 108, 40);
    for (let i = 0; i < r; i++) g.fillStyle(i % 2 ? 0x7cff9a : 0xffe04a).fillCircle(30 + i * 11, 109, 4);
  } else {
    // a base plate with a pivot, a board on a tilt and a big lever; the board tilts more with rank
    g.fillStyle(dark).fillRoundedRect(18, 98, 92, 20, 8).strokeRoundedRect(18, 98, 92, 20, 8);
    g.fillStyle(main).fillTriangle(50, 98, 78, 98, 64, 74).strokeTriangle(50, 98, 78, 98, 64, 74);
    const a = -0.12 - r * 0.03;
    const px = (x: number, y: number): [number, number] => [64 + (x - 64) * Math.cos(a) - (y - 74) * Math.sin(a), 74 + (x - 64) * Math.sin(a) + (y - 74) * Math.cos(a)];
    const [x1, y1] = px(14, 66), [x2, y2] = px(114, 66), [x3, y3] = px(114, 80), [x4, y4] = px(14, 80);
    g.fillStyle(light).fillPoints([new Phaser.Math.Vector2(x1, y1), new Phaser.Math.Vector2(x2, y2), new Phaser.Math.Vector2(x3, y3), new Phaser.Math.Vector2(x4, y4)], true).strokePoints([new Phaser.Math.Vector2(x1, y1), new Phaser.Math.Vector2(x2, y2), new Phaser.Math.Vector2(x3, y3), new Phaser.Math.Vector2(x4, y4)], true);
    g.fillStyle(0xe8452c).fillCircle(x1 + 14, y1 - 10, 9).strokeCircle(x1 + 14, y1 - 10, 9);
    g.fillStyle(0xf2b521).fillRect(x2 - 34, y2 - 20, 16, 16).strokeRect(x2 - 34, y2 - 20, 16, 16);
    g.lineStyle(10, OUT, 1).lineBetween(64, 74, 100, 22);
    g.lineStyle(5, 0xdfe6ea, 1).lineBetween(64, 74, 100, 22);
    g.fillStyle(0xe8452c).fillCircle(100, 22, 11).strokeCircle(100, 22, 11);
  }
}

/** Job shape icons (64x64): COPY = a part and its ghost copy, TILT = a tilted square with an arrow. */
export function drawJobIcon6(g: Phaser.GameObjects.Graphics, fam: Roster6Family) {
  const [main, light] = ROSTER_6_COLORS[fam];
  g.lineStyle(4, OUT, 1);
  if (fam === 'robot_arm') {
    g.fillStyle(light, 0.7).fillRoundedRect(26, 8, 28, 28, 6).strokeRoundedRect(26, 8, 28, 28, 6);
    g.fillStyle(main).fillRoundedRect(8, 26, 28, 28, 6).strokeRoundedRect(8, 26, 28, 28, 6);
    g.fillStyle(OUT).fillTriangle(50, 54, 38, 48, 44, 58);
  } else {
    g.fillStyle(main).fillRoundedRect(10, 34, 44, 20, 5).strokeRoundedRect(10, 34, 44, 20, 5);
    g.fillStyle(light).fillRect(18, 22, 12, 12).strokeRect(18, 22, 12, 12).fillRect(32, 22, 12, 12).strokeRect(32, 22, 12, 12);
    g.lineStyle(5, OUT, 1).lineBetween(12, 12, 52, 12);
    g.fillStyle(OUT).fillTriangle(56, 12, 46, 5, 46, 19);
  }
}
