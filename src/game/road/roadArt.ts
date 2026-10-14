// LEVEL ROAD V2: art slots (read from the asset registry, src/content/assetRegistry.ts) and the code-drawn fallbacks that stand in until
// the ChatGPT art lands. Dropping src/assets/art/<slot>.png|webp is enough: textures.ts loads every file in that folder by name and
// the road checks scene.hasArt(slot) at build time, so the picture replaces its fallback with no code change.
import type Phaser from 'phaser';
import type { NodeKind } from './pathGen';

export const SCENERY_KEYS = Array.from({ length: 8 }, (_, i) => `chapterScenery_${i + 1}`);
export const NODE_STATES = ['locked', 'open', 'done'] as const;
export const NODE_FRAME_KINDS = ['normal', 'hard', 'mega', 'mini', 'boss'] as const;
export const NODE_FRAME_KEYS = NODE_FRAME_KINDS.flatMap((k) => NODE_STATES.map((s) => `nodeFrame_${k}_${s}`));
/** Every slot the road reads. Each must have a registry entry (tests/roadV2.test.ts). */
export const ROAD_SLOTS = [...SCENERY_KEYS, 'pathTile', ...NODE_FRAME_KEYS, 'avatarMarker', 'fog'];

export type FrameKind = (typeof NODE_FRAME_KINDS)[number];
export const frameKind = (kind: NodeKind, ribbon: 'none' | 'hard' | 'mega'): FrameKind => (kind === 'boss' ? 'boss' : kind === 'mini' ? 'mini' : ribbon === 'mega' ? 'mega' : ribbon === 'hard' ? 'hard' : 'normal');

/** Chapter palettes (docs/art/ART_BIBLE.md section 2: chapter rooms; accent colours as the old chapter strip). `top` is the far end of the chapter, `bottom` the entrance. */
export interface ChapterLook {
  name: string;
  top: number;
  bottom: number;
  accent: number;
  prop: 'pots' | 'bubbles' | 'gears' | 'pixels' | 'notes' | 'crates' | 'boxes' | 'stars';
  /** the existing prop-free room picture, used by the fallback scenery band when present */
  room: string;
}
export const CHAPTER_LOOKS: ChapterLook[] = [
  { name: 'KITCHEN', top: 0xf8e6c4, bottom: 0xe9b676, accent: 0xae7040, prop: 'pots', room: 'stage_ch1' },
  { name: 'LAUNDRY', top: 0xd5ece6, bottom: 0x8cc3bd, accent: 0x458f87, prop: 'bubbles', room: 'stage_ch2' },
  { name: 'GARAGE', top: 0xe8cfa8, bottom: 0xb98a55, accent: 0xa8753e, prop: 'gears', room: 'stage_ch3' },
  { name: 'ARCADE', top: 0x8e6cc4, bottom: 0x3e2a70, accent: 0x795aa8, prop: 'pixels', room: 'stage_ch4' },
  { name: 'MUSIC ATTIC', top: 0xf3d8a8, bottom: 0xb98846, accent: 0xb08042, prop: 'notes', room: 'stage_ch5' },
  { name: 'SCRAPYARD', top: 0xd4dce2, bottom: 0x6c8794, accent: 0x66818e, prop: 'crates', room: 'stage_ch6' },
  { name: 'PACKING DEPOT', top: 0xe3cf9f, bottom: 0xa8844e, accent: 0x9a7240, prop: 'boxes', room: 'stage_ch7' },
  { name: 'OBSERVATORY', top: 0x5d6cb0, bottom: 0x1d2352, accent: 0x52608f, prop: 'stars', room: 'stage_ch8' },
];
export const lookOf = (chapter: number) => CHAPTER_LOOKS[(chapter - 1) % CHAPTER_LOOKS.length];

export const lerpColor = (a: number, b: number, t: number) => {
  const k = Math.min(1, Math.max(0, t));
  const ch = (sh: number) => Math.round(((a >> sh) & 255) + (((b >> sh) & 255) - ((a >> sh) & 255)) * k);
  return (ch(16) << 16) | (ch(8) << 8) | ch(0);
};

/** Backdrop colour at road-space y: a smooth ramp entrance -> far end inside a chapter, easing into the next chapter's entrance colour near the gate. */
export function skyColorAt(chapters: readonly { chapter: number; topY: number; bottomY: number }[], chapter: number, worldY: number): number {
  const c = chapters.find((x) => x.chapter === chapter) ?? chapters[0];
  const t = Math.min(1, Math.max(0, (c.bottomY - worldY) / Math.max(1, c.bottomY - c.topY)));
  const look = lookOf(chapter);
  const base = lerpColor(look.bottom, look.top, t);
  const next = chapters.find((x) => x.chapter === chapter + 1);
  return next && t > 0.88 ? lerpColor(base, lookOf(next.chapter).bottom, (t - 0.88) / 0.12) : base;
}

/** The slot's key when its picture exists, else undefined (the caller draws the fallback). */
export const slotArt = (hasArt: (k: string) => boolean, key: string): string | undefined => (hasArt(key) ? key : undefined);

/** One-off fallback textures (soft cloud puff, fog puff). Idempotent. */
export function ensureRoadTextures(scene: Phaser.Scene) {
  if (!scene.textures.exists('road_cloud')) {
    const g = scene.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0xffffff, 1);
    [[60, 50, 40], [105, 38, 46], [150, 52, 40], [100, 62, 44]].forEach(([x, y, r]) => g.fillCircle(x, y, r));
    g.generateTexture('road_cloud', 200, 100);
    g.destroy();
  }
  if (!scene.textures.exists('road_fog')) {
    const g = scene.make.graphics({ x: 0, y: 0 }, false);
    for (let r = 100; r > 0; r -= 10) g.fillStyle(0xffffff, 0.05 + (100 - r) / 100 * 0.07).fillCircle(100, 100, r);
    g.generateTexture('road_fog', 200, 200);
    g.destroy();
  }
}

/** A themed prop for the road verges. Code-drawn, flat, soft: it must never compete with the nodes. */
export function drawProp(g: Phaser.GameObjects.Graphics, prop: ChapterLook['prop'], x: number, y: number, s: number, accent: number, seed: number) {
  const dark = lerpColor(accent, 0x2b1d2e, 0.45), light = lerpColor(accent, 0xffffff, 0.45);
  const a = 0.78;
  switch (prop) {
    case 'pots': {
      const v = seed % 3;
      if (v === 0) {
        g.fillStyle(dark, a).fillRoundedRect(x - 32 * s, y - 14 * s, 64 * s, 46 * s, 14 * s).fillCircle(x - 38 * s, y + 4 * s, 9 * s).fillCircle(x + 38 * s, y + 4 * s, 9 * s);
        g.fillStyle(accent, a).fillRoundedRect(x - 38 * s, y - 24 * s, 76 * s, 14 * s, 7 * s).fillCircle(x, y - 30 * s, 7 * s);
        g.fillStyle(light, a).fillRoundedRect(x - 22 * s, y - 4 * s, 10 * s, 24 * s, 5 * s);
      } else if (v === 1) {
        g.fillStyle(dark, a).fillRoundedRect(x - 22 * s, y - 40 * s, 44 * s, 76 * s, 12 * s).fillStyle(accent, a).fillRoundedRect(x - 26 * s, y - 52 * s, 52 * s, 16 * s, 6 * s);
        g.fillStyle(light, a).fillRoundedRect(x - 14 * s, y - 14 * s, 28 * s, 26 * s, 6 * s);
      } else {
        g.fillStyle(dark, a).fillRoundedRect(x - 18 * s, y - 16 * s, 36 * s, 44 * s, 8 * s).fillStyle(0x2b1d2e, 0.35).fillCircle(x + 26 * s, y + 4 * s, 12 * s);
        g.fillStyle(light, a).fillRoundedRect(x - 12 * s, y - 8 * s, 8 * s, 24 * s, 4 * s);
        g.fillStyle(accent, a).fillRect(x - 6 * s, y - 56 * s, 12 * s, 40 * s).fillCircle(x, y - 60 * s, 14 * s);
      }
      break;
    }
    case 'bubbles':
      for (let i = 0; i < 4; i++) {
        const r = (16 + ((seed * 7 + i * 13) % 20)) * s, bx = x + (i - 1.5) * 34 * s, by = y - ((i * 29 + seed * 5) % 50) * s;
        g.fillStyle(0xffffff, 0.38).fillCircle(bx, by, r).lineStyle(3, light, 0.7).strokeCircle(bx, by, r);
        g.fillStyle(0xffffff, 0.8).fillCircle(bx - r * 0.35, by - r * 0.35, r * 0.2);
      }
      break;
    case 'gears':
      for (let i = 0; i < 10; i++) {
        const ang = (i / 10) * Math.PI * 2;
        g.fillStyle(dark, a).fillCircle(x + Math.cos(ang) * 40 * s, y + Math.sin(ang) * 40 * s, 9 * s);
      }
      g.fillStyle(dark, a).fillCircle(x, y, 36 * s).fillStyle(light, a).fillCircle(x, y, 14 * s);
      break;
    case 'pixels':
      for (let i = 0; i < 6; i++) g.fillStyle(i % 2 ? 0x56e0ff : 0xff5cc8, 0.75).fillRect(x + ((i % 3) - 1) * 30 * s, y + (Math.floor(i / 3) - 1) * 30 * s, 24 * s, 24 * s);
      break;
    case 'notes':
      g.fillStyle(dark, a).fillCircle(x - 14 * s, y + 18 * s, 14 * s).fillRect(x - 3 * s, y - 36 * s, 7 * s, 54 * s);
      g.fillStyle(dark, a).fillCircle(x + 26 * s, y + 6 * s, 12 * s).fillRect(x + 35 * s, y - 40 * s, 6 * s, 46 * s).fillRect(x - 3 * s, y - 38 * s, 44 * s, 9 * s);
      break;
    case 'crates':
      g.fillStyle(dark, a).fillRect(x - 36 * s, y - 36 * s, 72 * s, 72 * s).lineStyle(6 * s, accent, 0.9).strokeRect(x - 30 * s, y - 30 * s, 60 * s, 60 * s);
      g.lineBetween(x - 30 * s, y - 30 * s, x + 30 * s, y + 30 * s);
      break;
    case 'boxes':
      g.fillStyle(dark, a).fillRect(x - 38 * s, y - 8 * s, 76 * s, 48 * s).fillStyle(accent, a).fillRect(x - 24 * s, y - 40 * s, 50 * s, 34 * s);
      g.fillStyle(light, a).fillRect(x - 5 * s, y - 40 * s, 10 * s, 80 * s);
      break;
    case 'stars':
      for (let i = 0; i < 5; i++) {
        const sx = x + ((i * 37 + seed * 11) % 90 - 45) * s, sy = y + ((i * 53 + seed * 17) % 90 - 45) * s, r = (6 + (i % 3) * 5) * s;
        g.fillStyle(0xfff2b0, 0.9).fillTriangle(sx, sy - r * 2, sx - r * 0.5, sy, sx + r * 0.5, sy).fillTriangle(sx, sy + r * 2, sx - r * 0.5, sy, sx + r * 0.5, sy);
        g.fillTriangle(sx - r * 2, sy, sx, sy - r * 0.5, sx, sy + r * 0.5).fillTriangle(sx + r * 2, sy, sx, sy - r * 0.5, sx, sy + r * 0.5);
      }
      break;
  }
}

/** Far-layer style per chapter (parallax fallback): what the back wall of that room looks like. */
export type FarStyle = 'tiles' | 'shelves' | 'skyline' | 'mounds' | 'domes';
export const FAR_STYLE: FarStyle[] = ['tiles', 'tiles', 'shelves', 'skyline', 'shelves', 'mounds', 'shelves', 'domes'];

/** One band of the back wall, h tall at y: soft, low contrast, never louder than the nodes. Code-drawn until chapterScenery_N art exists. */
export function drawFarBand(g: Phaser.GameObjects.Graphics, width: number, y: number, h: number, accent: number, seed: number, style: FarStyle = 'mounds') {
  const soft = lerpColor(accent, 0xffffff, 0.3), deep = lerpColor(accent, 0x2b1d2e, 0.5);
  switch (style) {
    case 'tiles':
      g.fillStyle(soft, 0.2);
      for (let r = 0; r < h / 96; r++) for (let x = (r % 2) * 48 - 48; x < width; x += 96) g.fillRoundedRect(x + 5, y + r * 96 + 5, 86, 86, 10);
      break;
    case 'shelves':
      for (let k = 0; k < 3; k++) {
        const sy = y + 40 + k * 118;
        g.fillStyle(deep, 0.22).fillRect(0, sy, width, 22).fillStyle(deep, 0.12).fillRect(0, sy + 22, width, 8);
        for (let x = 60 + ((seed * 53 + k * 91) % 120); x < width; x += 210) g.fillStyle(deep, 0.2).fillRect(x, sy + 22, 14, 34);
      }
      break;
    case 'skyline':
      for (let x = -10, i = 0; x < width; x += 62 + (i % 3) * 14, i++) {
        const bh = h * (0.35 + ((seed * 17 + i * 37) % 55) / 100);
        g.fillStyle(deep, 0.5).fillRect(x, y + h - bh, 58, bh);
        for (let w = 0; w < bh - 30; w += 34) g.fillStyle(w % 68 ? 0x56e0ff : 0xff5cc8, 0.55).fillRect(x + 10 + ((i + w) % 2) * 26, y + h - bh + 14 + w, 12, 12);
      }
      break;
    case 'mounds':
      for (let x = -40, i = 0; x < width; x += 150, i++) {
        const mh = h * (0.4 + ((seed * 13 + i * 29) % 45) / 100);
        g.fillStyle(deep, 0.3).fillTriangle(x, y + h, x + 90, y + h - mh, x + 190, y + h);
      }
      break;
    case 'domes':
      for (let x = 70, i = 0; x < width; x += 230, i++) {
        const r = 70 + ((seed * 7 + i * 31) % 50);
        const dx = x + ((i * 61) % 40);
        g.fillStyle(deep, 0.38).fillPoints(Array.from({ length: 21 }, (_, k) => ({ x: dx + Math.cos(Math.PI * (1 - k / 20)) * r, y: y + h - Math.sin(Math.PI * (k / 20)) * r })), true);
        g.fillStyle(0xfff2b0, 0.5).fillRect(dx - 4, y + h - r - 36, 8, 40);
      }
      break;
  }
}
