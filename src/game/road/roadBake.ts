// ROAD PERF 4 (flag ROAD_PERF4): bakes the road's static Graphics into picture chunks. A Phaser Graphics object is re-triangulated (earcut) and
// re-batched on EVERY frame it is visible; one baked chunk is a single textured quad. Chunks are made lazily near the view and dropped far from
// it, so texture memory stays bounded. Presentation only. The chunk maths is pure (tests/roadPerf4.test.ts).
import Phaser from 'phaser';
import { W } from '../sceneKit';
import { spanVisible } from './roadPerf';

/** Chunk `i` covers world y [minY + i * chunkH, min(maxY, minY + (i + 1) * chunkH)]. */
export const chunkCount = (minY: number, maxY: number, chunkH: number): number => Math.max(1, Math.ceil((maxY - minY) / chunkH));
export const chunkSpan = (minY: number, maxY: number, chunkH: number, i: number): [number, number] => [minY + i * chunkH, Math.min(maxY, minY + (i + 1) * chunkH)];

/** What a chunk should be at this scroll: 'show' (on screen or about to be), 'keep' (baked, hidden), 'bake' (close: make it ahead of time), 'drop' (far away). */
export type ChunkWant = 'show' | 'bake' | 'keep' | 'drop';
export function wantChunk(span: [number, number], baked: boolean, scroll: number, viewH: number, showMargin: number, bakeMargin: number, dropMargin: number): ChunkWant {
  if (spanVisible(span[0], span[1], scroll, viewH, showMargin)) return 'show';
  if (spanVisible(span[0], span[1], scroll, viewH, bakeMargin)) return baked ? 'keep' : 'bake';
  return spanVisible(span[0], span[1], scroll, viewH, dropMargin) ? (baked ? 'keep' : 'drop') : 'drop';
}

interface Chunk {
  key: string;
  img: Phaser.GameObjects.Image;
}
interface Piece {
  g: Phaser.GameObjects.Graphics;
  parent: Phaser.GameObjects.Container;
  minY: number;
  maxY: number;
  /** x range of the picture (parent-local px) */
  minX: number;
  maxX: number;
  /** road-space y of the parent's origin (0 for children of the road itself) */
  offY: number;
  /** screen-fixed (HUD): baked once, always shown, never dropped */
  fixed: boolean;
  /** the scroll that places this piece on screen when its parent moves on its own (the far layer); default: the road scroll */
  scrollOf?: () => number;
  alpha: number;
  cmds: unknown[];
  chunks: Map<number, Chunk>;
}

/** `k` = texture pixels per design pixel (the render scale), `chunkH` in design px. */
export function createRoadBaker(scene: Phaser.Scene, opts: { viewH: number; k: number; chunkH?: number; showMargin?: number; bakeMargin?: number; dropMargin?: number; maxAhead?: number }) {
  const chunkH = opts.chunkH ?? 512, showM = opts.showMargin ?? 260, bakeM = opts.bakeMargin ?? 450, dropM = opts.dropMargin ?? 900, maxAhead = opts.maxAhead ?? 1;
  const k = Math.min(1.25, Math.max(1, opts.k));
  const pieces: Piece[] = [];
  const uid = `rb${scene.time.now | 0}_${Math.floor(Math.random() * 1e6)}`;
  let started = false;
  let nBaked = 0, texBytes = 0, bakeMs = 0;

  const bake = (p: Piece, pi: number, ci: number): Chunk => {
    const t0 = performance.now();
    const [y0, y1] = chunkSpan(p.minY, p.maxY, chunkH, ci);
    const w = Math.ceil((p.maxX - p.minX) * k), h = Math.ceil((y1 - y0) * k);
    const tmp = scene.make.graphics({ x: 0, y: 0 }, false);
    tmp.scaleCanvas(k, k);
    tmp.translateCanvas(-p.minX, -y0);
    tmp.commandBuffer = tmp.commandBuffer.concat(p.cmds);
    const key = `${uid}_${pi}_${ci}`;
    tmp.generateTexture(key, w, h);
    tmp.destroy();
    const img = scene.add.image(p.minX, y0, key).setOrigin(0, 0).setDisplaySize(p.maxX - p.minX, y1 - y0).setAlpha(p.alpha);
    // same place in the draw order as the Graphics it replaces
    p.parent.addAt(img, Math.max(0, p.parent.getIndex(p.g) + 1));
    nBaked++;
    texBytes += w * h * 4;
    bakeMs += performance.now() - t0;
    return { key, img };
  };
  const drop = (c: Chunk) => {
    c.img.destroy();
    if (scene.textures.exists(c.key)) scene.textures.remove(c.key);
    texBytes -= c.img.width * c.img.height * 4;
  };

  return {
    /** Register a finished Graphics (its commands are taken over on the first update, so draw everything first). Must be inside a Container. */
    add(g: Phaser.GameObjects.Graphics, minY: number, maxY: number, o: { minX?: number; maxX?: number; offY?: number; fixed?: boolean; scrollOf?: () => number } = {}) {
      const parent = g.parentContainer;
      if (!parent || maxY <= minY) return;
      pieces.push({ g, parent, minY, maxY, minX: o.minX ?? 0, maxX: o.maxX ?? W, offY: o.offY ?? 0, fixed: !!o.fixed, scrollOf: o.scrollOf, alpha: g.alpha, cmds: [], chunks: new Map() });
    },
    update(scroll: number) {
      if (!started) {
        started = true;
        for (const p of pieces) {
          p.cmds = p.g.commandBuffer;
          p.g.commandBuffer = []; // an empty Graphics costs nothing to render
        }
      }
      let ahead = 0;
      pieces.forEach((p, pi) => {
        const n = chunkCount(p.minY, p.maxY, chunkH);
        for (let ci = 0; ci < n; ci++) {
          const have = p.chunks.get(ci);
          const [s0, s1] = chunkSpan(p.minY, p.maxY, chunkH, ci);
          const want: ChunkWant = p.fixed ? 'show' : wantChunk([s0 + p.offY, s1 + p.offY], !!have, p.scrollOf ? p.scrollOf() : scroll, opts.viewH, showM, bakeM, dropM);
          if (want === 'drop') {
            if (have) (drop(have), p.chunks.delete(ci));
            continue;
          }
          if (want === 'bake' && ahead >= maxAhead) continue;
          let c = have;
          if (!c) {
            if (want === 'bake') ahead++;
            c = bake(p, pi, ci);
            p.chunks.set(ci, c);
          }
          c.img.setVisible(want === 'show');
        }
      });
    },
    /** for the readout and the measurement script */
    stats: () => ({ pieces: pieces.length, chunks: pieces.reduce((a, p) => a + p.chunks.size, 0), baked: nBaked, texMB: +(texBytes / 1048576).toFixed(1), bakeMs: +bakeMs.toFixed(0) }),
    destroy() {
      for (const p of pieces) for (const c of p.chunks.values()) drop(c);
      pieces.length = 0;
    },
  };
}
