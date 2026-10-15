// ROAD POLISH (flag ROAD_POLISH, needs levelRoadV2): the Phaser side. Built once per ROAD tab opening by roadV2.ts, which calls the small hooks
// below. Presentation only: it never reads or writes game state, saves or RNG; the timing uses a plain Math.random-free hash.
// Caps: at most AMBIENT_CAP ambient sprites alive (steam, sparkles, wisps, bird). Everything is off under REDUCED_MOTION except the static ground.
import Phaser from 'phaser';
import { loopTween } from '../loopTween';
import { REDUCED_MOTION, W } from '../sceneKit';
import { lerpColor, lookOf } from './roadArt';
import { hash01, ROAD, type RoadLayout, type RoadNode } from './pathGen';
import {
  AMBIENT_CAP, AMBIENT_CAP_OLD, beltOffset, dashSegments, groundStyleOf, hopCount, hopFrame, joinPaths, layerY, nodeVisual, pathLength, PARALLAX, pickAmbient, pointAt, stepProgress,
  travelSpan, UNLOCK_TIMELINE, unlockTotal, type AmbientSpot,
} from './roadPolishModel';
import type { NodeState } from './roadModel';

const INK = 0x2b1d2e;

/** The level the road showed last time (this session only, never saved): the next opening animates the climb from it. */
let lastShownCur: number | null = null;

export interface RoadPolishCtx {
  scene: Phaser.Scene;
  c: Phaser.GameObjects.Container;
  far: Phaser.GameObjects.Container;
  road: Phaser.GameObjects.Container;
  lay: RoadLayout;
  cur: number;
  top: number;
  bottom: number;
  /** ROAD PERF 2: a looping tween that pauses while the world span [minY, maxY] is off screen (default: plain loopTween) */
  loop?: (owner: Phaser.GameObjects.GameObject, config: Phaser.Types.Tweens.TweenBuilderConfig, minY: number, maxY: number) => unknown;
  /** ROAD PERF 2 on: lower ambient cap, belt redrawn every 2nd frame */
  perf2?: boolean;
}

export interface RoadPolish {
  /** scroll factor of the far scenery layer */
  farK: number;
  /** levels climbed since the road was last shown, or null */
  span: { from: number; to: number } | null;
  /** keep the extra layers in step with the scroll (call from redraw) */
  place(scroll: number): void;
  /** one medallion: remembers it for the tap shake, boss breathing and the star pop of the level just won */
  node(n: RoadNode, state: NodeState, img: Phaser.GameObjects.Image, stars: Phaser.GameObjects.Image[]): void;
  shake(level: number): void;
  /** milestone chest art: sparkles while READY */
  chest(img: Phaser.GameObjects.Image, ready: boolean): void;
  /** the current node's avatar: hops along the road from the last level; `onArrive` runs once it stands (at once when there is no climb) */
  hero(hero: Phaser.GameObjects.Container, dx: number, dy: number, plat: Phaser.GameObjects.Container, onArrive: () => void): void;
}

export function createRoadPolish(o: RoadPolishCtx): RoadPolish {
  const { scene, c, far, road, lay, cur } = o;
  const span = REDUCED_MOTION ? null : travelSpan(lastShownCur, cur);
  lastShownCur = cur;
  const nodeImgs = new Map<number, Phaser.GameObjects.Image>();
  const alive = { v: true };
  c.once(Phaser.GameObjects.Events.DESTROY, () => (alive.v = false));
  let ambientLive = 0;
  const cap = o.perf2 ? AMBIENT_CAP : AMBIENT_CAP_OLD;
  const loop = (owner: Phaser.GameObjects.GameObject, config: Phaser.Types.Tweens.TweenBuilderConfig, minY: number, maxY: number) =>
    o.loop ? o.loop(owner, config, minY, maxY) : loopTween(scene, config, owner);
  const take = () => (ambientLive < cap ? (ambientLive++, true) : false);
  const give = () => (ambientLive = Math.max(0, ambientLive - 1));

  // ---- ground ramp (option B): a faint code-drawn pattern per chapter near the player, on its own parallax layer --------------------
  const ground: { fc: Phaser.GameObjects.Container; cy: number }[] = [];
  for (const ch of lay.chapters) {
    if (Math.abs(ch.chapter - Math.ceil(cur / ROAD.levelsPerChapter)) > 1) continue;
    const look = lookOf(ch.chapter);
    const g = scene.add.graphics();
    const col = lerpColor(look.accent, 0xffffff, 0.35);
    g.lineStyle(3, col, 0.16);
    const style = groundStyleOf(ch.chapter);
    const step = style === 'planks' ? 64 : 96;
    const hh = ch.bottomY - ch.topY;
    if (style === 'diag') for (let x = -hh; x < W; x += step) g.lineBetween(x, ch.topY, x + hh, ch.bottomY);
    else {
      for (let y = ch.topY, r = 0; y < ch.bottomY; y += step, r++) {
        g.lineBetween(0, y, W, y);
        if (style === 'planks') for (let x = (r % 2) * 90 + hash01(r + ch.chapter * 50) * 60; x < W; x += 180) g.lineBetween(x, y, x, y + step);
      }
      if (style === 'grid') for (let x = 0; x < W; x += step) g.lineBetween(x, ch.topY, x, ch.bottomY);
    }
    const fc = scene.add.container(0, 0);
    fc.add(g);
    far.addAt(fc, 0);
    ground.push({ fc, cy: (ch.topY + ch.bottomY) / 2 });
  }

  // ---- belt: dashes on the travelled road that creep forward, like a conveyor ----------------------------------------------------
  const beltG = scene.add.graphics();
  // only the last 8 travelled segments (the part near the player) move: keeps the per-frame cost to a few dozen dashes
  const beltPts = joinPaths(lay.segments.filter((s) => s.to <= cur && s.from >= cur - 8).map((s) => s.pts));
  let beltT = 0, beltFrame = 0;
  const beltTick = (_t: number, dt: number) => {
    if (!alive.v) return;
    beltT += dt;
    if (o.perf2 && beltFrame++ % 2) return; // every 2nd frame is enough for a slow creep (beltT keeps the true time)
    beltG.clear().lineStyle(8, 0xb87a10, 0.55);
    for (const [a, b] of dashSegments(beltPts, beltOffset(beltT, 38, 48), 22, 26)) beltG.lineBetween(a.x, a.y, b.x, b.y);
  };
  road.add(beltG);
  if (!REDUCED_MOTION && beltPts.length > 1) {
    scene.events.on('update', beltTick);
    c.once(Phaser.GameObjects.Events.DESTROY, () => scene.events.off('update', beltTick));
  }

  // ---- ambient life ----------------------------------------------------------------------------------------------------------------
  const curNode = lay.nodes[Math.min(cur, lay.nodes.length) - 1];
  const spots: AmbientSpot[] = [];
  lay.nodes.forEach((n) => spots.push({ id: `n${String(n.level).padStart(3, '0')}`, y: n.y }));
  if (!REDUCED_MOTION) {
    for (const s of pickAmbient(spots, curNode.y, 1100, cap - 2)) {
      if (!take()) break;
      const n = lay.nodes[Number(s.id.slice(1)) - 1];
      const look = lookOf(n.chapter);
      const side = n.x > ROAD.centerX ? 1 : -1;
      const x = ROAD.centerX - side * (250 + hash01(n.level) * 50);
      const prop = look.prop;
      const glyph = prop === 'notes' ? '♪' : prop === 'stars' ? '✦' : '';
      const el: Phaser.GameObjects.GameObject & { setAlpha(a: number): unknown } = glyph
        ? scene.add.text(x, n.y, glyph, { fontFamily: 'Arial', fontSize: '34px', color: prop === 'stars' ? '#fff3b0' : '#5a3a1a' }).setOrigin(0.5)
        : scene.add.circle(x, n.y, prop === 'bubbles' ? 10 : 15, 0xffffff, 0.5).setStrokeStyle(prop === 'bubbles' ? 3 : 0, 0xffffff, 0.8);
      road.add(el);
      const rising = prop !== 'stars';
      loop(el, rising
        ? { targets: el, y: n.y - 150, alpha: 0, duration: 3000 + (n.level % 4) * 400, delay: (n.level % 5) * 450, repeat: -1, ease: 'Sine.Out' }
        : { targets: el, alpha: 0.15, scale: 0.6, duration: 900 + (n.level % 3) * 300, yoyo: true, repeat: -1, ease: 'Sine.InOut' }, n.y - 200, n.y + 100);
    }
    // foreground wisps (parallax 1.25): two soft streaks drifting across the screen, never over the nodes' centre column
    for (let i = 0; i < 2; i++) {
      if (!take()) break;
      const wisp = scene.add.ellipse(i ? W + 200 : -200, 0, 360, 46, 0xffffff, 0.14);
      c.addAt(wisp, 3);
      const baseY = 300 + i * 520;
      const upd = () => {
        if (alive.v && wisp.active) wisp.y = ((layerY(baseY, 0, 0, 1) + road.y * PARALLAX.foreground) % 1500 + 1500) % 1500 - 100;
      };
      scene.events.on('update', upd);
      c.once(Phaser.GameObjects.Events.DESTROY, () => scene.events.off('update', upd));
      loopTween(scene, { targets: wisp, x: i ? -200 : W + 200, duration: 30000 + i * 11000, repeat: -1, ease: 'Linear' }, wisp);
    }
    // a bird crossing every 20-40 s (a tiny dark V), counted against the cap while it flies
    const flyBird = () => {
      if (!alive.v || !take()) return;
      const bird = scene.add.text(-40, 260 + hash01(Math.floor(scene.time.now / 1000)) * 300, 'v', { fontFamily: 'Arial Black', fontSize: '30px', color: '#2b1d2e' }).setAlpha(0.55);
      c.addAt(bird, 3);
      scene.tweens.add({ targets: bird, x: W + 60, y: bird.y - 60, duration: 9000, onComplete: () => bird.destroy() });
      loopTween(scene, { targets: bird, scaleY: 0.5, duration: 160, yoyo: true, repeat: -1 }, bird);
      bird.once('destroy', () => give());
    };
    const birdTimer = scene.time.addEvent({ delay: 20000 + hash01(cur) * 20000, loop: true, callback: flyBird });
    c.once(Phaser.GameObjects.Events.DESTROY, () => birdTimer.remove());
  }

  // ---- unlock sequence + avatar travel ---------------------------------------------------------------------------------------------
  const travelPts = span
    ? joinPaths(lay.segments.filter((s) => s.from >= span.from && s.to <= span.to).map((s) => s.pts))
    : [];

  return {
    farK: PARALLAX.far,
    span,
    place(scroll) {
      const mid = (o.top + o.bottom) / 2;
      for (const g of ground) g.fc.y = layerY(g.cy, scroll, mid, PARALLAX.ground) - g.cy;
    },
    node(n, state, img, starImgs) {
      nodeImgs.set(n.level, img);
      const vis = nodeVisual(state, n.kind, n.ribbon);
      if (REDUCED_MOTION) return;
      const s0 = img.scale;
      if (vis.motion === 'breathe') loop(img, { targets: img, scaleX: s0 * 1.025, scaleY: s0 * 1.04, duration: 1500, yoyo: true, repeat: -1, ease: 'Sine.InOut' }, n.y - 200, n.y + 200);
      if (span && n.level === cur - 1) {
        // the level just won: its stars pop in one after the other once the climb has started
        starImgs.forEach((st, k) => {
          const s1 = st.scale, a1 = st.alpha;
          st.setScale(0).setAlpha(0);
          scene.tweens.add({ targets: st, scale: s1, alpha: a1, duration: 260, delay: 700 + k * 140, ease: 'Back.Out' });
        });
      }
    },
    shake(level) {
      const im = nodeImgs.get(level);
      if (!im || REDUCED_MOTION) return;
      const x0 = im.x;
      scene.tweens.add({ targets: im, x: x0 + 4, duration: 45, yoyo: true, repeat: 3, onComplete: () => (im.x = x0) });
    },
    chest(img, ready) {
      if (!ready || REDUCED_MOTION) return;
      for (let k = 0; k < 2; k++) {
        if (!take()) return;
        const sp = scene.add.star(img.x + (k ? 26 : -26), img.y - 20, 4, 3, 9, 0xfff3b0, 0.9);
        road.add(sp);
        sp.once('destroy', () => give());
        loop(sp, { targets: sp, y: sp.y - 36, alpha: 0, scale: 1.6, duration: 1100, delay: k * 550, repeat: -1, repeatDelay: 400, ease: 'Sine.Out' }, img.y - 120, img.y + 80);
      }
    },
    hero(hero, dx, dy, plat, onArrive) {
      if (!span || travelPts.length < 2) return onArrive();
      const end = { x: hero.x, y: hero.y };
      const start = pointAt(travelPts, 0);
      const hops = hopCount(pathLength(travelPts));
      const lock = scene.add.graphics();
      const last = travelPts[travelPts.length - 1];
      // the lock that held the new node: shakes, cracks, falls
      lock.fillStyle(INK, 1).fillRoundedRect(-24, -4, 48, 40, 9).lineStyle(9, INK, 1).strokeCircle(0, -10, 14);
      lock.fillStyle(0xffcf33, 1).fillRoundedRect(-19, 1, 38, 30, 7);
      lock.setPosition(last.x, last.y);
      road.add(lock);
      const glow = scene.add.graphics();
      road.add(glow);
      plat.setScale(0.01);
      hero.setPosition(start.x + dx, start.y + dy);
      const total = unlockTotal();
      let done = false;
      let skip = false;
      const onTap = () => {
        skip = true;
        finish();
      };
      const finish = () => {
        if (done) return;
        done = true;
        scene.input.off('pointerdown', onTap);
        if (!alive.v) return;
        hero.setPosition(end.x, end.y).setScale(1);
        plat.setScale(1);
        lock.destroy();
        glow.destroy();
        onArrive();
      };
      const [scrollS, crackS, drawS, popS] = UNLOCK_TIMELINE;
      const tw = scene.tweens.addCounter({
        from: 0,
        to: total,
        duration: total,
        onUpdate: (t) => {
          if (done || !alive.v) return;
          const ms = skip ? total : (t.getValue() ?? 0);
          // hero hops while the path is drawn, overlapping the scroll
          const p = stepProgress({ name: 'draw', at: scrollS.at + 100, dur: 800 }, ms);
          const f = hopFrame(travelPts, p, hops, 46);
          hero.setPosition(f.x + dx, f.y + dy).setScale(1, f.squash);
          // lock: shake then drop and fade
          const cp = stepProgress(crackS, ms);
          lock.setPosition(last.x + (cp < 0.4 ? Math.sin(cp * 60) * 4 : 0), last.y + (cp < 0.4 ? 0 : (cp - 0.4) * 160)).setAlpha(1 - Math.max(0, cp - 0.5) * 2).setRotation(cp > 0.4 ? (cp - 0.4) * 2 : 0);
          // bright head sweeping the gold road
          const dp = stepProgress(drawS, ms);
          glow.clear();
          if (dp > 0 && dp < 1) {
            const h = pointAt(travelPts, dp);
            glow.fillStyle(0xfff3b0, 0.9).fillCircle(h.x, h.y, 15).fillStyle(0xffffff, 1).fillCircle(h.x, h.y, 7);
          }
          // platform pops with an overshoot
          const pp = stepProgress(popS, ms);
          if (pp > 0) {
            const e = Phaser.Math.Easing.Back.Out(pp);
            plat.setScale(e);
          }
        },
        onComplete: finish,
      });
      scene.input.on('pointerdown', onTap);
      c.once(Phaser.GameObjects.Events.DESTROY, () => {
        tw.stop();
        scene.input.off('pointerdown', onTap);
      });
    },
  };
}
