// POWER TOOLS placeholder art (t-e2a48327): two distinct silhouettes baked into 128x128 textures `row_surge_1` / `gear_bomb_1`.
// ROW SURGE = a fat battery cell with a horizontal bar glyph (body is light so the view can tint it in the merged family's colour).
// GEAR BOMB = a round brass gear with a ring glyph and a lit fuse.
import Phaser from 'phaser';

const OUT = 0x2b1d2e;

export function drawTool(g: Phaser.GameObjects.Graphics, key: 'row_surge' | 'gear_bomb') {
  g.lineStyle(6, OUT, 1);
  if (key === 'row_surge') {
    g.fillStyle(0xf4f0e8).fillRoundedRect(22, 30, 84, 82, 18).strokeRoundedRect(22, 30, 84, 82, 18);
    g.fillStyle(0xd9a63a).fillRoundedRect(48, 14, 32, 20, 6).strokeRoundedRect(48, 14, 32, 20, 6);
    g.fillStyle(0xffffff).fillRoundedRect(30, 40, 10, 62, 5);
    // horizontal bar glyph with an arrowhead at each end
    g.fillStyle(OUT).fillRoundedRect(44, 64, 40, 14, 4);
    g.fillTriangle(30, 71, 46, 56, 46, 86).fillTriangle(98, 71, 82, 56, 82, 86);
  } else {
    const cx = 64, cy = 74, teeth = 8;
    const pts: Phaser.Math.Vector2[] = [];
    for (let i = 0; i < teeth; i++) {
      const a = (i / teeth) * Math.PI * 2;
      for (const [da, r] of [[-0.2, 34], [-0.13, 46], [0.13, 46], [0.2, 34]] as const) pts.push(new Phaser.Math.Vector2(cx + Math.cos(a + da) * r, cy + Math.sin(a + da) * r));
    }
    g.fillStyle(0xc8892a).fillPoints(pts, true).strokePoints(pts, true);
    g.fillStyle(0xf0c060).fillCircle(cx, cy, 28).strokeCircle(cx, cy, 28);
    // ring glyph
    g.lineStyle(7, OUT, 1).strokeCircle(cx, cy, 15);
    g.fillStyle(OUT).fillCircle(cx, cy, 5);
    // lit fuse
    g.lineStyle(5, OUT, 1).beginPath().moveTo(cx + 6, cy - 44).lineTo(cx + 16, cy - 56).lineTo(cx + 30, cy - 52).strokePath();
    g.fillStyle(0xff8a2a).fillCircle(cx + 32, cy - 52, 8).fillStyle(0xfff07a).fillCircle(cx + 32, cy - 52, 4);
  }
}
