// t-33f4fe2e QA-only: toolbox-themed crates ("the crate feels not connected to the game. maybe a tool box.").
// Wood -> TOOL BAG (canvas bag), Iron -> TOOLBOX (red steel, latch), Gold -> TOOL CHEST (rolling cabinet).
// Procedural: each look is drawn with Graphics ONCE and baked to a texture (`tbx_<kind>`, `tbx_<kind>_open`,
// `tbx_latch_<kind>`); after that the crate is a plain Image, nothing is redrawn per frame. Default OFF.
import type Phaser from 'phaser';
import { CRATES, CRATES_B, type CrateKind } from '../../content/units';

export const TOOLBOX_KEY = 'omm_qa_crates';
/** Baked canvas size (displayed at ~220 px on the 720-wide screen). */
const TW = 240, TH = 224;
const INK = 0x2b1d2e;
const NAMES: Record<CrateKind, string> = { wood: 'TOOL BAG', iron: 'TOOLBOX', gold: 'TOOL CHEST', bench: 'GOLDEN WORKBENCH' };
/** Where the latch sits on each baked closed texture (texture pixels), and its colour. */
const LATCH: Record<CrateKind, { x: number; y: number; col: number }> = {
  wood: { x: 120, y: 78, col: 0xe0b040 },
  iron: { x: 120, y: 112, col: 0xc8d2da },
  gold: { x: 120, y: 64, col: 0xfff2b0 },
  bench: { x: 120, y: 92, col: 0xfff2b0 },
};

export const toolboxOn = () => {
  try {
    return localStorage.getItem(TOOLBOX_KEY) === 'toolbox';
  } catch {
    return false;
  }
};

/** The crate's display name: the toolbox names only while the QA switch is on. */
/** The Golden Workbench only exists under ROSTER B, so it always carries its B name (crateName(kind) still falls back for it). */
export const crateName = (kind: CrateKind) => (toolboxOn() ? NAMES[kind] : kind === 'bench' ? CRATES_B.bench.name : CRATES[kind].name);

type G = Phaser.GameObjects.Graphics;
/** Dark outline + fill, the house style (same as the plain crate box in GameScene.presentCrate). */
const box = (g: G, x: number, y: number, w: number, h: number, r: number | Phaser.Types.GameObjects.Graphics.RoundedRectRadius, col: number, pad = 5) => {
  g.fillStyle(INK, 1).fillRoundedRect(x - pad, y - pad, w + pad * 2, h + pad * 2, r);
  g.fillStyle(col, 1).fillRoundedRect(x, y, w, h, r);
};
const arc = (g: G, x: number, y: number, r: number, w: number, col: number) => {
  g.lineStyle(w + 8, INK, 1).beginPath().arc(x, y, r, Math.PI, Math.PI * 2).strokePath();
  g.lineStyle(w, col, 1).beginPath().arc(x, y, r, Math.PI, Math.PI * 2).strokePath();
};
const shadow = (g: G) => g.fillStyle(0x000000, 0.18).fillEllipse(TW / 2, TH - 14, 200, 18);
const glow = (g: G, x: number, y: number, w: number, h: number) => {
  g.fillStyle(0xffcf33, 0.35).fillEllipse(x, y, w + 30, h + 20);
  g.fillStyle(0xfff2b0, 0.9).fillEllipse(x, y, w, h);
};
/** A wrench poking up (for the open looks). */
const wrench = (g: G, x: number, y: number) => {
  g.fillStyle(INK, 1).fillRoundedRect(x - 8, y, 16, 46, 6).fillCircle(x, y, 14);
  g.fillStyle(0xb8c4cc, 1).fillRoundedRect(x - 4, y, 8, 42, 4).fillCircle(x, y, 10);
  g.fillStyle(INK, 1).fillRect(x - 4, y - 14, 8, 10);
};
const screwdriver = (g: G, x: number, y: number) => {
  g.fillStyle(INK, 1).fillRect(x - 4, y - 22, 8, 26);
  g.fillStyle(0xd8dee4, 1).fillRect(x - 2, y - 20, 4, 22);
  box(g, x - 8, y, 16, 30, 6, 0xe8452c, 3);
};

function drawBag(g: G, open: boolean) {
  shadow(g);
  // two leather handles; open = splayed apart
  arc(g, open ? 92 : 106, 80, 46, 8, 0x7a4a22);
  arc(g, open ? 148 : 134, 80, 46, 8, 0x8a5a2a);
  // canvas body + darker base with stitches
  box(g, 30, 80, 180, 118, 22, 0xc9a36a, 7);
  g.fillStyle(0xa8844e, 1).fillRoundedRect(30, 164, 180, 34, { tl: 0, tr: 0, bl: 22, br: 22 });
  g.fillStyle(0xf3dfb0, 1);
  for (let x = 40; x < 204; x += 16) g.fillRect(x, 160, 9, 3);
  // side pockets with a screwdriver and a wrench
  screwdriver(g, 62, 100);
  box(g, 42, 112, 44, 44, 8, 0xb08d58, 4);
  wrench(g, 178, 98);
  box(g, 156, 112, 44, 44, 8, 0xb08d58, 4);
  if (open) {
    // mouth open: frame bars lifted to the sides, a glowing inside, tools sticking out
    g.fillStyle(INK, 1).fillEllipse(120, 82, 182, 40);
    glow(g, 120, 82, 150, 26);
    wrench(g, 100, 58);
    screwdriver(g, 140, 52);
    box(g, 22, 64, 64, 14, 6, 0x9aa8b4, 4);
    box(g, 154, 64, 64, 14, 6, 0x9aa8b4, 4);
  } else {
    // steel frame across the mouth + brass clasp
    box(g, 22, 68, 196, 16, 8, 0x9aa8b4, 5);
    g.fillStyle(0xd6dee4, 1).fillRect(30, 70, 180, 3);
    latch(g, 'wood', LATCH.wood.x, LATCH.wood.y);
  }
}

function drawToolbox(g: G, open: boolean) {
  shadow(g);
  // body
  box(g, 28, 110, 184, 90, 12, 0xd8261a, 6);
  g.fillStyle(0xa81c12, 1).fillRoundedRect(28, 178, 184, 22, { tl: 0, tr: 0, bl: 12, br: 12 });
  g.fillStyle(0xb8c4cc, 1);
  for (const [x, y] of [[40, 122], [200, 122], [40, 166], [200, 166]]) g.fillCircle(x, y, 4);
  // side grips
  box(g, 54, 140, 30, 10, 4, 0xa81c12, 3);
  box(g, 156, 140, 30, 10, 4, 0xa81c12, 3);
  const lid = (y: number) => {
    arc(g, 120, y, 34, 10, 0xb8c4cc);
    box(g, 32, y, 176, 44, { tl: 18, tr: 18, bl: 4, br: 4 }, 0xe8452c, 6);
    g.fillStyle(0xff7a5c, 1).fillRoundedRect(42, y + 7, 156, 8, 4);
  };
  if (open) {
    // lid popped up and tipped back, tray of tools glowing between
    g.fillStyle(INK, 1).fillRect(28, 92, 184, 22);
    glow(g, 120, 104, 160, 22);
    wrench(g, 92, 80);
    screwdriver(g, 150, 76);
    g.save();
    g.translateCanvas(120, 70);
    g.rotateCanvas(-0.14);
    g.translateCanvas(-120, -70);
    lid(46);
    g.restore();
  } else {
    lid(62);
    latch(g, 'iron', LATCH.iron.x, LATCH.iron.y);
  }
}

function drawChest(g: G, open: boolean) {
  shadow(g);
  // casters
  for (const x of [58, 182]) {
    g.fillStyle(INK, 1).fillCircle(x, 200, 14);
    g.fillStyle(0x7a8a9a, 1).fillCircle(x, 200, 7);
  }
  // cabinet + side push handle
  box(g, 212, 92, 10, 60, 4, 0xe8eef2, 4);
  box(g, 34, 66, 172, 124, 10, 0xe0b040, 6);
  // drawers with chrome pulls; open = the top drawer slides out at you
  const drawer = (x: number, y: number, w: number, h: number) => {
    box(g, x, y, w, h, 6, 0xc8962e, 4);
    box(g, 120 - 24, y + h / 2 - 4, 48, 8, 4, 0xe8eef2, 3);
  };
  if (!open) drawer(48, 78, 144, 28);
  drawer(48, 116, 144, 28);
  drawer(48, 154, 144, 26);
  const top = (y: number) => {
    box(g, 26, y, 188, 30, { tl: 16, tr: 16, bl: 4, br: 4 }, 0xf2c95a, 6);
    g.fillStyle(0xfff2b0, 1).fillRoundedRect(36, y + 5, 168, 6, 3);
  };
  if (open) {
    g.save();
    g.translateCanvas(120, 50);
    g.rotateCanvas(-0.12);
    g.translateCanvas(-120, -50);
    top(14);
    g.restore();
    glow(g, 120, 60, 168, 20);
    // pulled-out drawer: bigger, with tools inside
    box(g, 38, 76, 164, 36, 6, 0xc8962e, 5);
    g.fillStyle(INK, 1).fillRect(44, 80, 152, 10);
    wrench(g, 84, 72);
    screwdriver(g, 156, 64);
    box(g, 120 - 24, 98, 48, 8, 4, 0xe8eef2, 3);
  } else {
    top(36);
    latch(g, 'gold', LATCH.gold.x, LATCH.gold.y);
  }
  // sparkles (it's the good one)
  g.fillStyle(0xffffff, 0.95);
  for (const [x, y, r] of [[48, 30, 5], [200, 40, 4], [218, 176, 4]]) {
    g.fillTriangle(x - r * 2, y, x, y - r, x, y + r).fillTriangle(x + r * 2, y, x, y - r, x, y + r);
  }
}

/** Golden Workbench: a gold bench with a pegboard of tools on top; open = the drawer-lid flips up and light pours out. */
function drawBench(g: G, open: boolean) {
  shadow(g);
  // legs + shelf
  for (const x of [44, 176]) box(g, x, 150, 20, 56, 4, 0xc8962e, 4);
  box(g, 40, 190, 160, 12, 4, 0xa87a22, 3);
  // pegboard back with hanging tools
  box(g, 36, 22, 168, 62, 8, 0xb8c4cc, 5);
  g.fillStyle(INK, 0.35);
  for (let x = 48; x < 196; x += 18) for (const y of [34, 52, 70]) g.fillCircle(x, y, 2);
  wrench(g, 70, 30);
  screwdriver(g, 168, 56);
  // the bench top (a thick gold slab) and a drawer with a pull
  const top = (y: number) => {
    box(g, 24, y, 192, 26, 8, 0xf2c95a, 6);
    g.fillStyle(0xfff2b0, 1).fillRoundedRect(34, y + 5, 172, 6, 3);
  };
  box(g, 36, 118, 168, 36, 6, 0xe0b040, 5);
  box(g, 120 - 24, 132, 48, 8, 4, 0xe8eef2, 3);
  if (open) {
    glow(g, 120, 104, 170, 20);
    g.save();
    g.translateCanvas(120, 98);
    g.rotateCanvas(-0.12);
    g.translateCanvas(-120, -98);
    top(78);
    g.restore();
  } else {
    top(92);
    latch(g, 'bench', LATCH.bench.x, LATCH.bench.y + 28);
  }
  g.fillStyle(0xffffff, 0.95);
  for (const [x, y, r] of [[30, 20, 5], [210, 30, 4], [214, 150, 4]]) g.fillTriangle(x - r * 2, y, x, y - r, x, y + r).fillTriangle(x + r * 2, y, x, y - r, x, y + r);
}

/** The latch plate, drawn centred on (x, y): baked into the closed crate and on its own for the pop. */
function latch(g: G, kind: CrateKind, x: number, y: number) {
  const col = LATCH[kind].col;
  box(g, x - 14, y - 16, 28, 32, 6, col, 4);
  g.fillStyle(0xffffff, 0.6).fillRect(x - 10, y - 12, 20, 4);
  g.fillStyle(INK, 1).fillCircle(x, y + 4, 5);
}

/**
 * Latch roll-up beat (ROSTER B): the Tool Bag's latch pops off, then the bag swaps to the bigger crate the roll decided (the roll
 * was made before the crate opened; this only plays it). Returns how many ms it takes, so the cards can wait for it.
 */
export function latchRollUp(scene: Phaser.Scene, box: Phaser.GameObjects.Container, im: Phaser.GameObjects.Image, from: CrateKind, to: CrateKind): number {
  const s = im.scaleX;
  popToolboxLatch(scene, box, im, from);
  const key = toolboxCrateKey(scene, to);
  scene.time.delayedCall(420, () => {
    if (!im.active) return;
    im.setTexture(key);
    scene.tweens.add({ targets: im, scale: { from: s * 0.55, to: s }, duration: 280, ease: 'Back.Out' });
    scene.time.delayedCall(360, () => im.active && im.setTexture(`${key}_open`));
  });
  return 900;
}

const DRAW: Record<CrateKind, (g: G, open: boolean) => void> = { wood: drawBag, iron: drawToolbox, gold: drawChest, bench: drawBench };

function bake(scene: Phaser.Scene, key: string, w: number, h: number, draw: (g: G) => void) {
  if (scene.textures.exists(key)) return;
  const g = scene.make.graphics({}, false);
  draw(g);
  g.generateTexture(key, w, h);
  g.destroy();
}

/** Bake (first call only) and return the closed toolbox texture key for `kind`; its `_open` twin is baked too. */
export function toolboxCrateKey(scene: Phaser.Scene, kind: CrateKind) {
  const key = `tbx_${kind}`;
  bake(scene, key, TW, TH, (g) => DRAW[kind](g, false));
  bake(scene, `${key}_open`, TW, TH, (g) => DRAW[kind](g, true));
  bake(scene, `tbx_latch_${kind}`, 44, 48, (g) => latch(g, kind, 22, 24));
  return key;
}

/**
 * The open beat: the latch pops off and spins away while the crate squashes and swaps to its open look.
 * `im` is the crate Image inside container `box` (centred, scaled to fit); the latch flies in box's parent.
 */
export function popToolboxLatch(scene: Phaser.Scene, box: Phaser.GameObjects.Container, im: Phaser.GameObjects.Image, kind: CrateKind) {
  const s = im.scaleX;
  im.setTexture(`tbx_${kind}_open`);
  scene.tweens.add({ targets: im, scaleY: { from: s * 0.82, to: s }, scaleX: { from: s * 1.1, to: s }, duration: 200, ease: 'Back.Out' });
  const host = box.parentContainer;
  const L = LATCH[kind];
  const x = box.x + (L.x - TW / 2) * s, y = box.y + (L.y - TH / 2) * s;
  const p = scene.add.image(x, y, `tbx_latch_${kind}`).setScale(s);
  host?.add(p);
  const dir = kind === 'iron' ? -1 : 1;
  scene.tweens.add({ targets: p, x: x + dir * 70, angle: dir * 300, duration: 520, ease: 'Quad.Out' });
  scene.tweens.add({ targets: p, y: { from: y, to: y - 110 }, duration: 260, ease: 'Quad.Out', yoyo: true });
  scene.tweens.add({ targets: p, alpha: 0, delay: 360, duration: 220, onComplete: () => p.destroy() });
}
