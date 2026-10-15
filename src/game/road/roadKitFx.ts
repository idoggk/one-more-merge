// ROAD SURFACE KIT (Phaser side): turns KitPlans from roadKit.ts into images, and the ROAD KIT PREVIEW test road. Visual only.
import Phaser from 'phaser';
import { ROAD_SURFACE_KIT } from '../../content/experiments';
import { H, W } from '../sceneKit';
import { KIT_CELL, KIT_CELL_PX, KIT_SCALE, placeholderOutline, planSegment, stampSpan, type KitStamp } from './roadKit';

const FONT = 'Lilita One, Arial Black';
const INK = 0x2b1d2e;

/** Add one image per stamp to `parent`; returns them and their world-y span for the culler. */
export function addKitStamps(scene: Phaser.Scene, parent: Phaser.GameObjects.Container, stamps: readonly KitStamp[]) {
  const imgs = stamps.map((s) => scene.add.image(s.x, s.y, s.key).setScale(KIT_SCALE).setRotation(s.rot));
  parent.add(imgs);
  return { imgs, ...stampSpan(stamps) };
}

/** Draw a stamp as a code placeholder (flat road band, ink rim) when its texture is missing. */
function drawPlaceholder(g: Phaser.GameObjects.Graphics, s: KitStamp) {
  const c = Math.cos(s.rot), sn = Math.sin(s.rot);
  const poly = (k: number) => placeholderOutline(s.piece).map((p) => ({ x: s.x + (p.x * c - p.y * sn) * k, y: s.y + (p.x * sn + p.y * c) * k }));
  g.fillStyle(INK, 1).fillPoints(poly(KIT_SCALE), true);
  g.fillStyle(s.piece.startsWith('curve') ? 0xd9a35c : 0xe6c590, 1).fillPoints(poly(KIT_SCALE * 0.9), true);
}

/** A test road: east, a left turn north, a right turn east, a diagonal run and a final left. Its points are in screen space (preview panel). */
export const PREVIEW_PATH = [
  { x: 60, y: 900 }, { x: 300, y: 900 }, { x: 300, y: 650 }, { x: 560, y: 650 }, { x: 560, y: 450 }, { x: 460, y: 330 }, { x: 330, y: 270 }, { x: 330, y: 170 },
];

/** ROAD KIT PREVIEW: draws PREVIEW_PATH with the real textures where they exist and code placeholders where not. Needs the flag; returns false when off. */
export function openRoadKitPreview(scene: Phaser.Scene): boolean {
  if (!ROAD_SURFACE_KIT.on) return false;
  const o = scene.add.container(0, 0).setDepth(160);
  o.add(scene.add.rectangle(W / 2, H / 2, W, H, 0x1a0f18, 0.92).setInteractive());
  const g = scene.add.graphics();
  o.add(g);
  const pts = densify(PREVIEW_PATH, 15);
  // the preview treats a missing texture as present so the planner still returns pieces; a placeholder is drawn for those
  const plan = planSegment(pts, { chapter: 1, has: () => true, maxPerSegment: 40 });
  let real = 0, fake = 0;
  if (plan.covered)
    for (const s of plan.stamps) {
      if (scene.textures.exists(s.key)) {
        o.add(scene.add.image(s.x, s.y, s.key).setScale(KIT_SCALE).setRotation(s.rot));
        real++;
      } else {
        drawPlaceholder(g, s);
        fake++;
      }
    }
  const note = plan.covered ? `${real} KIT PIECES  ·  ${fake} CODE PLACEHOLDERS` : `FALLBACK: ${plan.reason}`;
  o.add(scene.add.text(W / 2, 60, 'ROAD KIT PREVIEW', { fontFamily: FONT, fontSize: '46px', color: '#fff0cf', stroke: '#2b1d2e', strokeThickness: 7 }).setOrigin(0.5));
  o.add(scene.add.text(W / 2, 112, `${note}  ·  CELL ${KIT_CELL}px = ${Math.round(KIT_CELL_PX)}px`, { fontFamily: FONT, fontSize: '24px', color: '#ffffff' }).setOrigin(0.5));
  const close = scene.add.container(W / 2, H - 90);
  close.add(scene.add.rectangle(0, 0, 260, 86, INK).setStrokeStyle(4, 0xffffff));
  close.add(scene.add.text(0, 0, 'CLOSE', { fontFamily: FONT, fontSize: '36px', color: '#ffffff' }).setOrigin(0.5));
  close.setSize(260, 86).setInteractive({ useHandCursor: true }).on('pointerup', () => o.destroy());
  o.add(close);
  return true;
}

/** Straight-line polyline resampled to `perLeg` points per leg (like the 15-point segments of the real road). */
export function densify(path: readonly { x: number; y: number }[], perLeg: number) {
  const out: { x: number; y: number }[] = [];
  for (let i = 0; i + 1 < path.length; i++)
    for (let k = 0; k < perLeg; k++) out.push({ x: path[i].x + ((path[i + 1].x - path[i].x) * k) / perLeg, y: path[i].y + ((path[i + 1].y - path[i].y) * k) / perLeg });
  out.push(path[path.length - 1]);
  return out;
}
