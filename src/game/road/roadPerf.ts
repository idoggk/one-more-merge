// ROAD PERF (flag ROAD_PERF): hides road pieces that are off screen so the phone does not tessellate and draw the whole world every frame, and
// a small readout (flag ROAD_PERF_HUD). Presentation only; never touches game state. The visibility maths is pure (tested in roadPerf.test.ts).
import type Phaser from 'phaser';

/** Is the world span [minY, maxY] visible when the road is scrolled by `scroll` and the view is [0, viewH]? `margin` keeps pieces alive a bit early. */
export const spanVisible = (minY: number, maxY: number, scroll: number, viewH: number, margin: number): boolean =>
  maxY + scroll >= -margin && minY + scroll <= viewH + margin;

interface Piece {
  objs: { setVisible(v: boolean): unknown }[];
  minY: number;
  maxY: number;
  shown: boolean;
  /** ROAD PERF 2: called on the first update and whenever the group flips (pause / resume its tweens) */
  onChange?: (visible: boolean) => void;
  told?: boolean;
}

/** Register groups of objects with the world-y span they cover; `update(scroll)` hides the groups outside the view (only touching changed ones). */
export function createCuller(viewH: number, margin: number) {
  const pieces: Piece[] = [];
  return {
    add(objs: { setVisible(v: boolean): unknown }[], minY: number, maxY: number, onChange?: (visible: boolean) => void) {
      pieces.push({ objs, minY, maxY, shown: true, onChange });
    },
    update(scroll: number) {
      for (const p of pieces) {
        const v = spanVisible(p.minY, p.maxY, scroll, viewH, margin);
        const first = !!p.onChange && !p.told;
        p.told = true;
        if (v !== p.shown) {
          p.shown = v;
          for (const o of p.objs) o.setVisible(v);
        } else if (!first) continue;
        p.onChange?.(v);
      }
    },
    /** pieces currently hidden (for the readout and tests) */
    hidden: () => pieces.filter((p) => !p.shown).length,
    size: () => pieces.length,
  };
}

/** Count display objects below `root` and how many of them are visible. */
export function countObjects(root: Phaser.GameObjects.Container): { total: number; shown: number } {
  let total = 0, shown = 0;
  const walk = (list: Phaser.GameObjects.GameObject[], parentShown: boolean) => {
    for (const o of list) {
      total++;
      const vis = parentShown && (o as { visible?: boolean }).visible !== false;
      if (vis) shown++;
      const kids = (o as { list?: Phaser.GameObjects.GameObject[] }).list;
      if (Array.isArray(kids)) walk(kids, vis);
    }
  };
  walk(root.list, root.visible);
  return { total, shown };
}

/** Readout text for the corner of the ROAD tab: objects (visible/total), active tweens, FPS. Refreshes twice a second, stops with the container. */
export function addRoadPerfHud(scene: Phaser.Scene, c: Phaser.GameObjects.Container, y: number) {
  const t = scene.add.text(10, y, '', { fontFamily: 'Arial Black', fontSize: '18px', color: '#ffffff', backgroundColor: '#000000aa', padding: { x: 6, y: 3 } }).setDepth(900);
  c.add(t);
  const refresh = () => {
    if (!t.active) return;
    const o = countObjects(c);
    const tw = scene.tweens.getTweens().length;
    t.setText(`ROAD PERF  obj ${o.shown}/${o.total}  tweens ${tw}  fps ${Math.round(scene.game.loop.actualFps)}`);
  };
  refresh();
  const ev = scene.time.addEvent({ delay: 500, loop: true, callback: refresh });
  c.once('destroy', () => ev.remove());
}
