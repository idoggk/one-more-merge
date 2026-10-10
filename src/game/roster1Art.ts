// ROSTER B batch 1 placeholder art (t-9b28a794): procedural machines baked into `<family>_<rank>` textures (drawn by
// textures.ts until real PNGs land in src/assets/art) and one job shape icon per unit (`job_<family>`).
import Phaser from 'phaser';
import type { Roster1Family } from '../core/types';

const OUT = 0x2b1d2e;
const V = (x: number, y: number) => new Phaser.Math.Vector2(x, y);

export const ROSTER_1_COLORS: Record<Roster1Family, [number, number, number]> = {
  nail_gun: [0x8a96a8, 0xd0d8e4, 0x4a5466],
  jackhammer: [0xd8a020, 0xffe08a, 0x8a5a10],
  gear: [0x9a7a5a, 0xd8b890, 0x5a4030],
  saw_blade: [0xc8d0d8, 0xffffff, 0x6a7480],
};

function cog(g: Phaser.GameObjects.Graphics, x: number, y: number, R: number, teeth: number, fill: number, hole: number) {
  const pts: Phaser.Math.Vector2[] = [];
  for (let i = 0; i < teeth * 4; i++) {
    const a = (i / (teeth * 4)) * Math.PI * 2;
    const r = i % 4 < 2 ? R : R * 0.78;
    pts.push(V(x + Math.cos(a) * r, y + Math.sin(a) * r));
  }
  g.fillStyle(fill).fillPoints(pts, true).strokePoints(pts, true);
  g.fillStyle(hole).fillCircle(x, y, R * 0.3).strokeCircle(x, y, R * 0.3);
}

function saw(g: Phaser.GameObjects.Graphics, x: number, y: number, R: number, teeth: number, fill: number, hub: number) {
  const pts: Phaser.Math.Vector2[] = [];
  for (let i = 0; i < teeth; i++) {
    const a = (i / teeth) * Math.PI * 2;
    pts.push(V(x + Math.cos(a) * R * 0.8, y + Math.sin(a) * R * 0.8), V(x + Math.cos(a + 0.12) * R, y + Math.sin(a + 0.12) * R));
  }
  g.fillStyle(fill).fillPoints(pts, true).strokePoints(pts, true);
  g.fillStyle(hub).fillCircle(x, y, R * 0.28).strokeCircle(x, y, R * 0.28);
}

/** Draw one roster B machine into a 128x128 texture (rank grows the shape, like the other placeholders). */
export function drawRoster1(g: Phaser.GameObjects.Graphics, fam: Roster1Family, rank: number) {
  const [main, light, dark] = ROSTER_1_COLORS[fam];
  g.lineStyle(6, OUT, 1);
  if (fam === 'nail_gun') {
    // pistol-grip nail gun pointing up; one nail per rank band in the magazine
    g.fillStyle(dark).fillRoundedRect(58, 74, 26, 44, 8).strokeRoundedRect(58, 74, 26, 44, 8);
    g.fillStyle(main).fillRoundedRect(30, 22, 48, 60, 10).strokeRoundedRect(30, 22, 48, 60, 10);
    g.fillStyle(light).fillRect(36, 30, 7, 42);
    g.fillStyle(OUT).fillRect(46, 10, 16, 14);
    for (let i = 0; i < Math.min(rank, 5); i++) g.fillStyle(0xdfe6ea).fillRect(84 + (i % 2) * 2, 30 + i * 10, 26, 5).strokeRect(84 + (i % 2) * 2, 30 + i * 10, 26, 5);
  } else if (fam === 'jackhammer') {
    // body + a long spiral bit pointing up; the bit grows with rank
    const len = 44 + Math.min(rank, 6) * 4;
    g.fillStyle(main).fillRoundedRect(30, 76, 68, 40, 10).strokeRoundedRect(30, 76, 68, 40, 10);
    g.fillStyle(light).fillRect(38, 84, 26, 8);
    g.fillStyle(0xdfe6ea).fillTriangle(50, 78, 78, 78, 64, 78 - len).strokeTriangle(50, 78, 78, 78, 64, 78 - len);
    for (let i = 1; i < 5; i++) g.lineStyle(3, dark, 1).lineBetween(52 + i * 2, 78 - (len * i) / 5 + 6, 76 - i * 2, 78 - (len * i) / 5 - 2);
  } else if (fam === 'gear') {
    // one big cog, a second small cog from rank 3 (LINK)
    cog(g, rank >= 3 ? 56 : 64, rank >= 3 ? 70 : 64, 34 + Math.min(rank, 6) * 2, 8, main, dark);
    g.lineStyle(6, OUT, 1);
    if (rank >= 3) cog(g, 98, 30, 20, 6, light, dark);
  } else {
    // round saw blade, more teeth with rank
    saw(g, 64, 64, 46 + Math.min(rank, 6), 10 + Math.min(rank, 6) * 2, main, dark);
    g.lineStyle(4, light, 0.9).beginPath().arc(64, 64, 26, -2.4, -1.2, false).strokePath();
  }
}

/** Job shape icons (64x64): ROW = three dots in a line, ARMOR = a drill tip through a plate, LINK = two linked cogs,
 *  EDGE = a square ring with a lit border. Drawn on the unit page next to the job word. */
export function drawJobIcon(g: Phaser.GameObjects.Graphics, fam: Roster1Family) {
  const [main, light] = ROSTER_1_COLORS[fam];
  g.lineStyle(4, OUT, 1);
  if (fam === 'nail_gun') for (const x of [14, 32, 50]) g.fillStyle(main).fillCircle(x, 32, 8).strokeCircle(x, 32, 8);
  else if (fam === 'jackhammer') {
    g.fillStyle(0x7a7a8a).fillRect(6, 38, 52, 10).strokeRect(6, 38, 52, 10);
    g.fillStyle(main).fillTriangle(22, 8, 42, 8, 32, 58).strokeTriangle(22, 8, 42, 8, 32, 58);
  } else if (fam === 'gear') {
    cog(g, 22, 34, 15, 6, main, light);
    g.lineStyle(4, OUT, 1);
    cog(g, 46, 24, 12, 6, light, main);
  } else {
    g.fillStyle(light).fillRect(6, 6, 52, 52).strokeRect(6, 6, 52, 52);
    g.fillStyle(main).fillRect(18, 18, 28, 28).strokeRect(18, 18, 28, 28);
  }
}
