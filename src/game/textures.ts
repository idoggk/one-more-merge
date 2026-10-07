import Phaser from 'phaser';
import { MAX_RANK } from '../content/tuning';
import { FAMILIES, type Family } from '../core/types';

/** Generated art (from ChatGPT) lives in src/assets/art/<key>.png. Missing keys fall back to procedural drawings. */
const ART = import.meta.glob('../assets/art/*.{png,webp}', { eager: true, import: 'default', query: '?url' }) as Record<string, string>;

/** r29: boss / cast / chapter-stage art (~half the bytes) loads in the background after the first frame. */
const LAZY = /^(boss_|mon_|stage_ch|sy_)/;
const artEntries = () => Object.entries(ART).map(([path, url]) => [path.split('/').pop()!.replace(/\.(png|webp)$/, ''), url] as const);

export function preloadArt(scene: Phaser.Scene) {
  for (const [key, url] of artEntries()) if (!LAZY.test(key)) scene.load.image(key, url);
}

/** Start the background load of the deferred art; `done` runs once it is all in. */
export function loadLazyArt(scene: Phaser.Scene, done: () => void) {
  let n = 0;
  for (const [key, url] of artEntries())
    if (LAZY.test(key) && !scene.textures.exists(key)) {
      scene.load.image(key, url);
      n++;
    }
  if (!n) return done();
  scene.load.once('complete', done);
  scene.load.start();
}

const OUT = 0x2b1d2e;

function star(x: number, y: number, n: number, r1: number, r2: number) {
  const pts: Phaser.Math.Vector2[] = [];
  for (let i = 0; i < n * 2; i++) {
    const a = (i / (n * 2)) * Math.PI * 2 - Math.PI / 2;
    const r = i % 2 ? r1 : r2;
    pts.push(new Phaser.Math.Vector2(x + Math.cos(a) * r, y + Math.sin(a) * r));
  }
  return pts;
}
const COLORS: Record<Family, [number, number, number]> = {
  cannon: [0xe8452c, 0xff7a52, 0x9e2416],
  coil: [0x27c4e0, 0x8af0ff, 0x137a92],
  bell: [0xf2b521, 0xffe07a, 0xa8700e],
  magnet: [0xc23fd1, 0xef8cf7, 0x7a1f86],
  battery: [0x7ccf2e, 0xc6f58a, 0x3f7a12],
  fan: [0x7fc8f0, 0xe4f6ff, 0x3d7fa8],
  rocket: [0xff8a3c, 0xffc08a, 0xa8481a],
  mortar: [0x6a7a3a, 0xb0c070, 0x3a4a1a],
  arc_welder: [0x3a6aff, 0x9ab8ff, 0x1a3a9a],
  horn: [0xd09030, 0xffd080, 0x7a4a10],
  fuse_box: [0xe04a8a, 0xff9ac0, 0x8a1a4a],
  amplifier: [0x30b0a0, 0x90f0e0, 0x10605a],
  signal_beacon: [0xf05030, 0xffb090, 0x902010],
};

/** Draw a chunky procedural gadget into a 128x128 texture. */
function drawGadget(g: Phaser.GameObjects.Graphics, fam: Family, rank: number) {
  const [main, light, dark] = COLORS[fam];
  const s = 128;
  g.lineStyle(6, OUT, 1);
  if (fam === 'cannon') {
    const barrels = Math.min(rank, 4);
    const bw = 22 + rank * 2;
    // base
    g.fillStyle(dark).fillRoundedRect(22, 82, 84, 28, 8).strokeRoundedRect(22, 82, 84, 28, 8);
    g.fillStyle(0x555060).fillCircle(38, 112, 10).strokeCircle(38, 112, 10).fillCircle(90, 112, 10).strokeCircle(90, 112, 10);
    for (let i = 0; i < barrels; i++) {
      const off = (i - (barrels - 1) / 2) * (barrels > 2 ? 18 : 26);
      const h = 52 + rank * 4;
      g.fillStyle(main).fillRoundedRect(64 + off - bw / 2, 86 - h, bw, h, 8).strokeRoundedRect(64 + off - bw / 2, 86 - h, bw, h, 8);
      g.fillStyle(light).fillRect(64 + off - bw / 2 + 5, 86 - h + 8, 5, h - 18);
      g.fillStyle(OUT).fillEllipse(64 + off, 86 - h + 2, bw - 6, 10);
    }
    if (rank >= 5) g.fillStyle(0xf2b521).fillPoints(star(64, 96, 5, 7, 14), true);
  } else if (fam === 'coil') {
    const turns = 3 + rank;
    g.fillStyle(0x555060).fillRoundedRect(30, 100, 68, 18, 6).strokeRoundedRect(30, 100, 68, 18, 6);
    g.lineStyle(14, OUT, 1);
    const pts: Phaser.Math.Vector2[] = [];
    for (let i = 0; i <= turns * 2; i++) pts.push(new Phaser.Math.Vector2(i % 2 ? 88 : 40, 98 - (i * 70) / (turns * 2)));
    g.strokePoints(pts);
    g.lineStyle(8, main, 1).strokePoints(pts);
    g.lineStyle(3, light, 1).strokePoints(pts);
    g.lineStyle(6, OUT, 1);
    const r = 10 + rank * 2;
    g.fillStyle(light).fillCircle(64, 24, r).strokeCircle(64, 24, r);
    if (rank >= 3) g.fillStyle(main).fillCircle(64, 24, r * 0.5);
  } else if (fam === 'battery') {
    const h = 60 + rank * 5;
    g.fillStyle(main).fillRoundedRect(38, 112 - h, 52, h, 10).strokeRoundedRect(38, 112 - h, 52, h, 10);
    g.fillStyle(0xd9a63a).fillRect(54, 100 - h, 20, 12).strokeRect(54, 100 - h, 20, 12);
    g.fillStyle(light).fillRect(46, 120 - h, 8, h - 20);
    for (let i = 0; i < Math.min(rank, 5); i++) g.fillStyle(dark).fillRect(60, 104 - i * 12, 22, 8);
    g.lineStyle(5, OUT, 1).lineBetween(64, 70 - h / 3, 58, 84 - h / 3).lineBetween(58, 84 - h / 3, 70, 84 - h / 3).lineBetween(70, 84 - h / 3, 62, 98 - h / 3);
  } else if (fam === 'fan') {
    g.fillStyle(0xdfe6ea).fillRoundedRect(52, 84, 24, 30, 6).strokeRoundedRect(52, 84, 24, 30, 6);
    g.fillStyle(dark).fillRoundedRect(30, 108, 68, 12, 5).strokeRoundedRect(30, 108, 68, 12, 5);
    const blades = 2 + Math.min(rank, 4);
    const R = 32 + rank * 2;
    for (let i = 0; i < blades; i++) {
      const a = (i / blades) * Math.PI * 2;
      g.fillStyle(main).fillEllipse(64 + Math.cos(a) * R * 0.5, 54 + Math.sin(a) * R * 0.5, R * 0.9, R * 0.45);
    }
    g.lineStyle(5, OUT, 1).strokeCircle(64, 54, R);
    g.fillStyle(light).fillCircle(64, 54, 9).strokeCircle(64, 54, 9);
  } else if (fam === 'magnet') {
    // horseshoe magnet: thick U with silver tips; more ranks = wider + field lines
    const w = 22 + rank * 2;
    g.lineStyle(w + 12, OUT, 1).beginPath().arc(64, 58, 30, Math.PI, 0, false).strokePath();
    g.lineStyle(w, main, 1).beginPath().arc(64, 58, 30, Math.PI, 0, false).strokePath();
    g.lineStyle(6, OUT, 1);
    g.fillStyle(main).fillRect(34 - w / 2, 58, w, 30).strokeRect(34 - w / 2, 58, w, 30);
    g.fillStyle(main).fillRect(94 - w / 2, 58, w, 30).strokeRect(94 - w / 2, 58, w, 30);
    g.fillStyle(0xdfe6ea).fillRect(34 - w / 2, 88, w, 20).strokeRect(34 - w / 2, 88, w, 20);
    g.fillStyle(0xdfe6ea).fillRect(94 - w / 2, 88, w, 20).strokeRect(94 - w / 2, 88, w, 20);
    for (let i = 1; i < Math.min(rank, 4); i++) g.lineStyle(3, light, 0.9).beginPath().arc(64, 108, 14 + i * 9, Math.PI * 1.1, Math.PI * 1.9, false).strokePath();
  } else if (fam === 'horn') {
    // r37 placeholder until ChatGPT art: a brass horn, mouth up, wider with rank
    const m = 26 + rank * 3;
    g.fillStyle(dark).fillRoundedRect(36, 104, 56, 14, 5).strokeRoundedRect(36, 104, 56, 14, 5);
    g.fillStyle(main).fillRect(58, 62, 12, 42).strokeRect(58, 62, 12, 42);
    g.fillStyle(main).fillTriangle(64 - m, 18, 64 + m, 18, 64, 66).strokeTriangle(64 - m, 18, 64 + m, 18, 64, 66);
    g.fillStyle(OUT).fillEllipse(64, 20, m * 2 - 8, 14);
    g.fillStyle(light).fillRect(52, 30, 6, 22);
  } else if (fam === 'fuse_box') {
    // box with a lightning bolt; sparks at the four diagonals
    g.fillStyle(main).fillRoundedRect(30, 32, 68, 76, 10).strokeRoundedRect(30, 32, 68, 76, 10);
    g.fillStyle(light).fillRect(38, 40, 8, 58);
    g.fillStyle(0xffe07a).fillPoints([new Phaser.Math.Vector2(70, 40), new Phaser.Math.Vector2(52, 74), new Phaser.Math.Vector2(64, 74), new Phaser.Math.Vector2(58, 100), new Phaser.Math.Vector2(80, 62), new Phaser.Math.Vector2(66, 62)], true);
    for (const [x, y] of [[18, 20], [110, 20], [18, 118], [110, 118]].slice(0, Math.min(4, rank))) g.fillStyle(0xffe07a).fillPoints(star(x, y, 4, 4, 10), true);
  } else if (fam === 'amplifier') {
    // speaker cabinet: one cone per rank band
    g.fillStyle(dark).fillRoundedRect(28, 22, 72, 92, 10).strokeRoundedRect(28, 22, 72, 92, 10);
    g.fillStyle(main).fillCircle(64, 78, 24).strokeCircle(64, 78, 24);
    g.fillStyle(OUT).fillCircle(64, 78, 8);
    g.fillStyle(main).fillCircle(64, 40, 12).strokeCircle(64, 40, 12);
    for (let i = 1; i < Math.min(rank, 4); i++) g.lineStyle(3, light, 0.9).beginPath().arc(64, 78, 28 + i * 8, -0.6, 0.6, false).strokePath();
  } else if (fam === 'mortar') {
    // squat wide barrel tilted up on a heavy base
    const bw = 34 + rank * 3;
    g.fillStyle(dark).fillRoundedRect(22, 92, 84, 24, 8).strokeRoundedRect(22, 92, 84, 24, 8);
    g.fillStyle(main).fillRoundedRect(64 - bw / 2, 40, bw, 56, 12).strokeRoundedRect(64 - bw / 2, 40, bw, 56, 12);
    g.fillStyle(OUT).fillEllipse(64, 42, bw - 8, 14);
    g.fillStyle(light).fillRect(64 - bw / 2 + 6, 52, 6, 34);
  } else if (fam === 'arc_welder') {
    // navy welding box, two rigid electrodes and a cyan arc
    g.fillStyle(main).fillRoundedRect(26, 60, 76, 52, 10).strokeRoundedRect(26, 60, 76, 52, 10);
    g.fillStyle(light).fillRect(34, 70, 22, 10);
    g.fillStyle(0xdfe6ea).fillRect(40, 22, 10, 40).strokeRect(40, 22, 10, 40).fillRect(78, 22, 10, 40).strokeRect(78, 22, 10, 40);
    g.lineStyle(5 + Math.min(rank, 4), 0x7fe0ff, 1).beginPath().arc(64, 26, 19, Math.PI, 0, false).strokePath();
  } else if (fam === 'signal_beacon') {
    // lattice tower with a lamp; rings grow with rank
    g.fillStyle(dark).fillRoundedRect(34, 104, 60, 14, 5).strokeRoundedRect(34, 104, 60, 14, 5);
    g.fillStyle(main).fillTriangle(44, 104, 84, 104, 64, 40).strokeTriangle(44, 104, 84, 104, 64, 40);
    g.fillStyle(0xffe07a).fillCircle(64, 32, 12).strokeCircle(64, 32, 12);
    for (let i = 1; i <= Math.min(rank, 3); i++) g.lineStyle(4, light, 0.9).beginPath().arc(64, 32, 14 + i * 9, -2.6, -0.5, false).strokePath();
  } else {
    const w = 60 + rank * 5;
    g.fillStyle(dark).fillRoundedRect(28, 104, 72, 14, 5).strokeRoundedRect(28, 104, 72, 14, 5);
    g.fillStyle(main);
    g.beginPath();
    g.moveTo(64 - w / 2, 100);
    g.lineTo(64 + w / 2, 100);
    g.lineTo(64 + w / 2 - 10, 70);
    g.arc(64, 62, w / 2 - 12, 0, Math.PI, true);
    g.closePath();
    g.fillPath().strokePath();
    g.fillStyle(light).fillEllipse(50, 58, 12, 26);
    g.fillStyle(dark).fillCircle(64, 104, 9).strokeCircle(64, 104, 9);
    g.fillStyle(main).fillCircle(64, 22 - rank, 8).strokeCircle(64, 22 - rank, 8);
    for (let i = 1; i < rank && i < 5; i++) {
      const a = (i / 5) * Math.PI;
      g.lineStyle(5, light, 1).lineBetween(64 + Math.cos(a + Math.PI) * 58, 50 - Math.sin(a) * 40, 64 + Math.cos(a + Math.PI) * 66, 46 - Math.sin(a) * 46);
    }
  }
  void s;
}

export function ensureTextures(scene: Phaser.Scene) {
  const g = scene.make.graphics({}, false);
  const gen = (key: string, w: number, h: number, draw: () => void) => {
    if (scene.textures.exists(key)) return;
    g.clear();
    draw();
    g.generateTexture(key, w, h);
  };
  for (const f of FAMILIES) for (let r = 1; r <= MAX_RANK + 2; r++) gen(`${f}_${r}`, 128, 128, () => drawGadget(g, f, r));

  gen('dot', 16, 16, () => g.fillStyle(0xffffff).fillCircle(8, 8, 8));
  // tutorial pointing hand (white cartoon glove), fingertip near the top-left
  gen('hand', 100, 130, () => {
    g.lineStyle(7, OUT, 1).fillStyle(0xffffff, 1);
    g.fillRoundedRect(20, 4, 26, 70, 13).strokeRoundedRect(20, 4, 26, 70, 13); // index finger
    g.fillRoundedRect(14, 52, 74, 66, 24).strokeRoundedRect(14, 52, 74, 66, 24); // palm
    g.lineStyle(5, OUT, 1).lineBetween(46, 64, 46, 84).lineBetween(64, 62, 64, 84);
    g.fillStyle(0xffffff, 1).fillRoundedRect(4, 70, 22, 34, 10).lineStyle(6, OUT, 1).strokeRoundedRect(4, 70, 22, 34, 10); // thumb
    g.fillStyle(0xe8452c, 1).fillRect(20, 110, 62, 14);
  });
  gen('spark', 32, 32, () => {
    g.fillStyle(0xffffff, 1).fillPoints(star(16, 16, 4, 4, 16), true);
  });
  gen('chunk', 24, 24, () => g.fillStyle(0xffffff).fillTriangle(0, 24, 12, 0, 24, 18));
  gen('slot', 128, 128, () => {
    g.fillStyle(0x000000, 0.12).fillRoundedRect(6, 6, 116, 116, 22);
    g.lineStyle(3, 0x8a6a4a, 0.35).strokeRoundedRect(6, 6, 116, 116, 22);
  });
  gen('bg', 720, 1280, () => {
    g.fillStyle(0xf6dcb0, 1).fillRect(0, 0, 720, 1280);
    g.fillStyle(0xc68a52, 1).fillRoundedRect(28, 420, 664, 780, 34);
    g.fillStyle(0xd99d63, 1).fillRoundedRect(38, 430, 644, 760, 28);
    for (let i = 0; i < 12; i++) g.fillStyle(0xc68a52, 0.25).fillRect(38, 450 + i * 64, 644, 3);
  });
  const targetColors = [0xb9c4cc, 0xe9f3f5, 0x6fbf4a];
  for (let i = 0; i < 3; i++)
    gen(`target_${i}`, 300, 300, () => {
      g.lineStyle(8, OUT, 1);
      const c = targetColors[i];
      if (i === 0) {
        g.fillStyle(c).fillRoundedRect(80, 50, 140, 210, 20).strokeRoundedRect(80, 50, 140, 210, 20);
        g.fillStyle(0xe8452c).fillRect(80, 110, 140, 70).strokeRect(80, 110, 140, 70);
      } else if (i === 1) {
        g.fillStyle(c).fillRoundedRect(70, 20, 160, 270, 18).strokeRoundedRect(70, 20, 160, 270, 18);
        g.lineBetween(70, 110, 230, 110);
        g.fillStyle(0x999999).fillRect(200, 60, 10, 36).fillRect(200, 140, 10, 60);
      } else {
        g.fillStyle(c).fillRoundedRect(40, 60, 220, 220, 50).strokeRoundedRect(40, 60, 220, 220, 50);
        g.fillStyle(0x9e9e9e).fillTriangle(70, 70, 100, 10, 130, 70).fillTriangle(170, 70, 200, 10, 230, 70);
        g.fillStyle(0xffffff).fillRect(80, 220, 140, 26).strokeRect(80, 220, 140, 26);
      }
      // angry eyes
      g.fillStyle(0xffffff).fillCircle(125, 150, 22).fillCircle(175, 150, 22).strokeCircle(125, 150, 22).strokeCircle(175, 150, 22);
      g.fillStyle(OUT).fillCircle(130, 155, 9).fillCircle(170, 155, 9);
      g.lineStyle(10, OUT, 1).lineBetween(100, 118, 145, 132).lineBetween(200, 118, 155, 132);
    });
  gen('demo_can', 300, 300, () => {
    g.lineStyle(8, OUT, 1);
    g.fillStyle(0xd9d2c5).fillRoundedRect(100, 90, 100, 150, 16).strokeRoundedRect(100, 90, 100, 150, 16);
    g.fillStyle(0x4a90d9).fillRect(100, 130, 100, 50).strokeRect(100, 130, 100, 50);
  });
  g.destroy();
}
