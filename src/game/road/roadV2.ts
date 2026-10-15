// LEVEL ROAD V2 (TUNING.levelRoadV2): the ROAD tab as a winding world. Layout: pathGen.ts (pure), states and scroll maths: roadModel.ts,
// art slots + code-drawn fallbacks: roadArt.ts, scrolling: roadScroll.ts. This file only turns them into Phaser objects.
import Phaser from 'phaser';
import { LEVELS } from '../../content/levels';
import { BOSSES, chapterBossIdx } from '../../core/boss';
import { SEASON_TIERS, seasonTier } from '../../core/season';
import { sfx } from '../audio';
import type { GameScene } from '../GameScene';
import { loopTween } from '../loopTween';
import { H, REDUCED_MOTION, W } from '../sceneKit';
import { drawBigProp, drawFarBand, FAR_STYLE, drawProp, ensureRoadTextures, frameKind, lerpColor, lookOf, skyColorAt, slotArt, type FrameKind } from './roadArt';
import { chapterAtY, chestState, farFromCurrent, gateOpen, nodeState, scrollLimits, snapScroll, starsOf, type NodeState } from './roadModel';
import { hash01, layoutRoad, ROAD, type RoadNode } from './pathGen';
import { attachRoadScroll } from './roadScroll';
import { MAP_BADGES, ROAD_PERF, ROAD_PERF_HUD, ROAD_POLISH } from '../../content/experiments';
import { addMapBadges } from './mapBadges';
import { createRoadPolish } from './roadPolishFx';
import { addRoadPerfHud, createCuller } from './roadPerf';

const FONT = 'Lilita One, Arial Black';
const INK = 0x2b1d2e;
/** medallion size by kind (design px) */
const SIZE: Record<FrameKind, number> = { normal: 150, hard: 160, mega: 168, mini: 178, boss: 224 };
/** fallback pictures from the existing kit while nodeFrame_* art is missing */
const FALLBACK_TEX: Record<FrameKind, string> = { normal: 'node_normal', hard: 'node_hard', mega: 'node_mega_hard', mini: 'node_boss', boss: 'node_boss' };
const LOCKED_TINT = 0x9fb4d6;

/** Memoised: the layout depends on the level table only. */
let LAYOUT: ReturnType<typeof layoutRoad> | null = null;
export const roadLayout = () => (LAYOUT ??= layoutRoad(LEVELS));

export function openRoadV2(scene: GameScene) {
  scene.closeModal();
  const m = scene.meta;
  const lay = roadLayout();
  const c = scene.add.container(0, 0).setDepth(100);
  if (scene.homeC?.active) scene.homeC.destroy();
  scene.homeC = c;
  scene.modal = c;
  ensureRoadTextures(scene);
  const top = 128, bottom = H - 250; // the band the current node is centred in (sticky PLAY + nav below)
  const cur = Math.min(scene.currentLevel(), LEVELS.length);
  const curChapter = Math.ceil(cur / ROAD.levelsPerChapter);
  const stars = m.levelStars ?? {};
  const byLevel = new Map(lay.nodes.map((n) => [n.level, n]));
  const curNode = byLevel.get(cur)!;
  const { lo, hi } = scrollLimits(lay.topY, lay.bottomY, top, bottom);
  const has = (k: string) => scene.hasArt(k);

  // ---- layers -------------------------------------------------------------------------------------------------------------
  const backdrop = scene.add.graphics();
  const far = scene.add.container(0, 0);
  const road = scene.add.container(0, 0);
  const clouds: { img: Phaser.GameObjects.Image; base: number; k: number }[] = [];
  // ROAD PERF: pieces register a world-y span and are hidden while off screen (flag off = no registration, old behaviour)
  const culler = createCuller(H, 260);
  const cull = (objs: { setVisible(v: boolean): unknown }[], minY: number, maxY: number) => {
    if (ROAD_PERF.on) culler.add(objs, minY, maxY);
  };
  c.add([backdrop, far, road]);
  c.add(scene.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.001).setInteractive()); // swallow stray taps below the road
  const mask = scene.add.graphics().setVisible(false).fillRect(0, 0, W, H - 118);
  const geo = mask.createGeometryMask();
  far.setMask(geo);
  road.setMask(geo);

  // ---- far layer: scenery art per chapter, or a soft code-drawn skyline band -----------------------------------------------
  const farLayers = lay.chapters.map((ch) => {
    const look = lookOf(ch.chapter);
    const cy = (ch.topY + ch.bottomY) / 2;
    const fc = scene.add.container(0, 0);
    const art = slotArt(has, `chapterScenery_${ch.chapter}`);
    let half = (ch.bottomY - ch.topY) / 2 + 200; // half the height the layer covers (for culling)
    if (art) {
      // 3 stacked tiles, the middle one flipped, so a single picture still reads continuous
      const tex = scene.textures.get(art).getSourceImage() as { width: number; height: number };
      const th = (tex.height / tex.width) * W;
      half = 2.5 * th;
      for (let i = -2; i <= 2; i++) {
        const im = scene.add.image(W / 2, cy + i * th, art).setDisplaySize(W, th + 2);
        if (i % 2 !== 0) im.setFlipY(true);
        fc.add(im);
      }
    } else {
      const g = scene.add.graphics();
      for (let y = ch.bottomY - 300; y > ch.topY; y -= 430) drawFarBand(g, W, y - 80, 360, look.accent, Math.round(hash01(ch.chapter * 31 + Math.round(y)) * 20), FAR_STYLE[(ch.chapter - 1) % FAR_STYLE.length]);
      fc.add(g);
    }
    far.add(fc);
    return { fc, cy, half };
  });
  const placeFar = (scroll: number) => {
    const mid = (top + bottom) / 2;
    for (const f of farLayers) {
      f.fc.y = mid + (scroll + f.cy - mid) * (polish?.farK ?? 0.8) - f.cy;
      if (ROAD_PERF.on) f.fc.setVisible(Math.abs(f.cy + f.fc.y - H / 2) < H / 2 + f.half + 260);
    }
  };

  // ---- verge props + steam ------------------------------------------------------------------------------------------------
  // one props graphics per chapter (was one for the whole world), so a chapter off screen costs nothing
  let props = scene.add.graphics();
  road.add(props);
  const nodeXAt = (y: number) => lay.nodes.reduce((best, n) => (Math.abs(n.y - y) < Math.abs(best.y - y) ? n : best)).x;
  for (const ch of lay.chapters) {
    const look = lookOf(ch.chapter);
    let i = 0;
    if (ROAD_PERF.on) {
      props = scene.add.graphics();
      road.add(props);
    }
    const chapterObjs: Phaser.GameObjects.GameObject[] = [props];
    cull(chapterObjs as never, ch.topY - 300, ch.bottomY + 300);
    for (let y = ch.bottomY - 140; y > ch.topY + 120; y -= 205, i++) {
      const left = nodeXAt(y) > ROAD.centerX;
      const x = left ? 52 + hash01(ch.chapter * 100 + i) * 56 : W - 52 - hash01(ch.chapter * 100 + i) * 56;
      const s = 0.85 + hash01(ch.chapter * 7 + i * 3) * 0.5;
      if (i % 2 === 0) drawBigProp(props, look.prop, left ? 82 : W - 82, y, 0.95, look.accent, left ? 1 : -1);
      else drawProp(props, look.prop, x, y, s, look.accent, i + ch.chapter);
      if (!REDUCED_MOTION && Math.abs(ch.chapter - curChapter) <= 1 && i % 3 === 0) {
        const puff = scene.add.circle(x, y - 40, 14, 0xffffff, 0.5);
        road.add(puff);
        chapterObjs.push(puff);
        loopTween(scene, { targets: puff, y: y - 130, scale: 2.2, alpha: 0, duration: 2600 + (i % 4) * 400, delay: (i % 5) * 500, repeat: -1, ease: 'Sine.Out' }, puff);
      }
    }
  }

  // ---- the path: thick outlined road, gold where travelled ----------------------------------------------------------------
  const pg = scene.add.graphics();
  road.add(pg);
  const pathTile = slotArt(has, 'pathTile');
  // ROAD PERF: one small Graphics per segment and layer (ground, then surface) instead of one for the whole world, so segments off screen are
  // hidden; the draw order (all ground, then all surfaces, then tile images) is unchanged
  const segPieces = new Map<unknown, { setVisible(v: boolean): unknown }[]>();
  const gfxFor = (seg: (typeof lay.segments)[number]) => {
    if (!ROAD_PERF.on) return pg;
    let list = segPieces.get(seg);
    if (!list) {
      list = [];
      segPieces.set(seg, list);
      const ys = seg.pts.map((p) => p.y);
      cull(list, Math.min(...ys) - 160, Math.max(...ys) + 160);
    }
    const g = scene.add.graphics();
    road.add(g);
    list.push(g);
    return g;
  };
  for (const seg of lay.segments) {
    // themed ground under the path and a soft shadow, so the nodes pop off the scenery
    const gc = lookOf(Math.ceil(seg.from / ROAD.levelsPerChapter));
    const pg = gfxFor(seg);
    pg.lineStyle(250, lerpColor(gc.bottom, gc.accent, 0.35), 0.4).strokePoints(seg.pts);
    pg.lineStyle(100, 0x000000, 0.22).strokePoints(seg.pts.map((p) => ({ x: p.x, y: p.y + 12 })));
  }
  const tileImgs: { seg: (typeof lay.segments)[number]; img: Phaser.GameObjects.Image }[] = [];
  for (const seg of lay.segments) {
    const ch = Math.ceil(seg.from / ROAD.levelsPerChapter);
    const surface = lerpColor(0xf3e3c8, lookOf(ch).accent, 0.12);
    const pg = gfxFor(seg);
    pg.lineStyle(78, INK, 0.9).strokePoints(seg.pts);
    if (pathTile) seg.pts.forEach((p) => tileImgs.push({ seg, img: scene.add.image(p.x, p.y, pathTile).setDisplaySize(64, 64) }));
    else pg.lineStyle(58, surface, 1).strokePoints(seg.pts);
    if (seg.to <= cur) pg.lineStyle(20, 0xffcf33, 1).strokePoints(seg.pts);
    else {
      pg.lineStyle(7, 0xffffff, 0.55);
      for (let i = 0; i + 1 < seg.pts.length; i += 2) pg.lineBetween(seg.pts[i].x, seg.pts[i].y, seg.pts[i + 1].x, seg.pts[i + 1].y);
    }
  }

  for (const t of tileImgs) {
    road.add(t.img);
    segPieces.get(t.seg)?.push(t.img);
  }

  // ROAD POLISH (flag, default OFF): parallax, ground ramp, belt stripe, ambient life, avatar hop, unlock sequence; see roadPolishFx.ts
  const polish = ROAD_POLISH.on ? createRoadPolish({ scene, c, far, road, lay, cur, top, bottom }) : null;

  // ---- fog over chapters not reached yet; banners; gates -------------------------------------------------------------------
  const fogKey = slotArt(has, 'fog') ?? 'road_fog';
  const fades: { y: number; objs: { setAlpha(a: number): unknown }[] }[] = []; // world elements that fade out under the header chip
  for (const ch of lay.chapters) {
    const look = lookOf(ch.chapter);
    const reached = ch.chapter <= curChapter;
    if (!reached) {
      const veil = scene.add.rectangle(W / 2, (ch.topY + ch.bottomY) / 2, W, ch.bottomY - ch.topY, 0xdfe8f5, 0.28);
      road.add(veil);
      cull([veil], ch.topY, ch.bottomY);
    }
    const gateObjs: { setVisible(v: boolean): unknown }[] = [];
    cull(gateObjs, ch.gateY - 700, ch.gateY + 200);
    // gate
    const open = gateOpen(ch.chapter, cur);
    const gy = ch.gateY;
    const gg = scene.add.graphics();
    road.add(gg);
    gateObjs.push(gg);
    const cx = ROAD.centerX;
    const stone = lerpColor(look.accent, 0xd8d0c0, 0.55), stoneDk = lerpColor(look.accent, INK, 0.3);
    // stone pillars with block lines
    for (const px of [cx - 190, cx + 190]) {
      gg.fillStyle(INK, 1).fillRoundedRect(px - 44, gy - 118, 88, 214, 14);
      gg.fillStyle(stone, 1).fillRoundedRect(px - 38, gy - 112, 76, 202, 10);
      for (let by2 = gy - 112; by2 < gy + 90; by2 += 50) gg.lineStyle(4, stoneDk, 0.7).lineBetween(px - 38, by2, px + 38, by2);
      gg.fillStyle(0xffffff, 0.25).fillRect(px - 32, gy - 108, 12, 194);
    }
    // the arch: a thick half ring between the pillars, outlined
    const ring = (rOut: number, rIn: number, col: number) => {
      const pts: { x: number; y: number }[] = [];
      for (let k = 0; k <= 24; k++) pts.push({ x: cx - Math.cos((k / 24) * Math.PI) * rOut, y: gy - 40 - Math.sin((k / 24) * Math.PI) * rOut * 0.62 });
      for (let k = 24; k >= 0; k--) pts.push({ x: cx - Math.cos((k / 24) * Math.PI) * rIn, y: gy - 40 - Math.sin((k / 24) * Math.PI) * rIn * 0.62 });
      gg.fillStyle(col, 1).fillPoints(pts, true);
    };
    ring(236, 134, INK);
    ring(228, 142, stone);
    for (let k = 1; k < 9; k++) {
      const a = (k / 9) * Math.PI;
      gg.lineStyle(4, stoneDk, 0.7).lineBetween(cx - Math.cos(a) * 142, gy - 40 - Math.sin(a) * 142 * 0.62, cx - Math.cos(a) * 228, gy - 40 - Math.sin(a) * 228 * 0.62);
    }
    // keystone
    const ky = gy - 40 - 0.62 * 185;
    gg.fillStyle(INK, 1).fillTriangle(cx - 44, ky - 52, cx + 44, ky - 52, cx + 30, ky + 44).fillTriangle(cx - 44, ky - 52, cx - 30, ky + 44, cx + 30, ky + 44);
    gg.fillStyle(open ? 0xffcf33 : 0xe0a020, 1).fillTriangle(cx - 36, ky - 46, cx + 36, ky - 46, cx + 24, ky + 36).fillTriangle(cx - 36, ky - 46, cx - 24, ky + 36, cx + 24, ky + 36);
    if (open) {
      gg.fillStyle(0xffe27a, 0.3).fillRect(cx - 134, gy - 118, 268, 210);
    } else {
      // lit padlock hanging in the opening
      gg.fillStyle(0xffe27a, 0.22).fillCircle(cx, gy + 6, 74);
      gg.lineStyle(14, INK, 1).strokeCircle(cx, gy - 18, 20);
      gg.lineStyle(7, 0xf3e3c8, 1).strokeCircle(cx, gy - 18, 20);
      gg.fillStyle(INK, 1).fillRoundedRect(cx - 34, gy - 8, 68, 56, 12).fillStyle(0xffcf33, 1).fillRoundedRect(cx - 28, gy - 2, 56, 44, 9);
      gg.fillStyle(INK, 1).fillCircle(cx, gy + 16, 7).fillRect(cx - 3, gy + 16, 6, 14);
    }
    const gateLabel = scene.add.text(cx, gy + 66, open ? `CHAPTER ${ch.chapter} CLEARED` : ch.chapter === lay.chapters.length ? 'FINAL GATE' : `CHAPTER ${ch.chapter} GATE`, { fontFamily: FONT, fontSize: '30px', color: '#fff0cf', stroke: '#2b1d2e', strokeThickness: 6 }).setOrigin(0.5);
    road.add(gateLabel);
    gateObjs.push(gateLabel);
    // fog + a desaturated silhouette of the next chapter above the gate: the world goes on
    if (ch.chapter < lay.chapters.length) {
      const nextLook = lookOf(ch.chapter + 1);
      const tease = scene.add.graphics();
      drawFarBand(tease, W, gy - 640, 400, 0x8a94a8, ch.chapter * 11, FAR_STYLE[ch.chapter % FAR_STYLE.length]);
      tease.setAlpha(open ? 0.6 : 0.9);
      road.add(tease);
      gateObjs.push(tease);
      const fog = scene.add.graphics();
      for (let k = 0; k < 36; k++) fog.fillStyle(lerpColor(0xffffff, nextLook.bottom, 0.15), Math.sin(((k + 0.5) / 36) * Math.PI) * (open ? 0.5 : 0.8)).fillRect(0, gy - 600 + k * 12, W, 13);
      road.add(fog);
      gateObjs.push(fog);
      for (let i = 0; i < 3; i++) {
        const cl = scene.add.image(120 + i * 250 + hash01(ch.chapter * 9 + i) * 40, gy - 250 - (i % 2) * 70, fogKey).setScale(2.4 + hash01(i + 7) * 0.6).setAlpha(open ? 0.5 : 0.85);
        road.add(cl);
        gateObjs.push(cl);
        if (!REDUCED_MOTION) loopTween(scene, { targets: cl, x: cl.x + (i % 2 ? -30 : 30), duration: 5000 + i * 900, yoyo: true, repeat: -1, ease: 'Sine.InOut' }, cl);
      }
    }
    // entrance banner: a ribbon with scroll ends BESIDE the path, with a chapter icon
    const by = ch.bannerY;
    const bx = 24, bw = 290;
    const bg = scene.add.graphics();
    bg.fillStyle(INK, 1).fillTriangle(bx - 22, by - 8, bx + 30, by - 38, bx + 30, by + 62).fillTriangle(bx + bw + 22, by - 8, bx + bw - 30, by - 38, bx + bw - 30, by + 62);
    bg.fillStyle(lerpColor(look.accent, INK, 0.35), 1).fillTriangle(bx - 14, by - 6, bx + 30, by - 30, bx + 30, by + 52).fillTriangle(bx + bw + 14, by - 6, bx + bw - 30, by - 30, bx + bw - 30, by + 52);
    bg.fillStyle(INK, 1).fillRoundedRect(bx, by - 52, bw, 104, 16).fillStyle(look.accent, 1).fillRoundedRect(bx + 6, by - 46, bw - 12, 92, 12).fillStyle(0xffffff, 0.22).fillRoundedRect(bx + 12, by - 40, bw - 24, 30, 10);
    bg.fillStyle(INK, 1).fillCircle(bx + 44, by, 34).fillStyle(0xfbe7c6, 1).fillCircle(bx + 44, by, 28);
    const bn = scene.add.text(bx + 44, by + 1, String(ch.chapter), { fontFamily: FONT, fontSize: '40px', color: '#3b2533' }).setOrigin(0.5);
    const bt = scene.add.text(bx + 94, by + 2, look.name, { fontFamily: FONT, fontSize: '40px', color: '#ffffff', stroke: '#2b1d2e', strokeThickness: 7 }).setOrigin(0, 0.5);
    if (bt.width > bw - 120) bt.setScale((bw - 120) / bt.width);
    road.add([bg, bn, bt]);
    fades.push({ y: by, objs: [bg, bn, bt] });
    cull([bg, bn, bt], by - 130, by + 130);
  }

  // ---- milestone chests on the verge ---------------------------------------------------------------------------------------
  for (const ch of lay.chests) {
    const st = chestState(ch, cur);
    const chestObjs: { setVisible(v: boolean): unknown }[] = [];
    cull(chestObjs, ch.y - 200, ch.y + 200);
    const key = st === 'open' && has('chest_open') ? 'chest_open' : 'chest_closed';
    if (has(key)) {
      const im = scene.add.image(ch.x, ch.y, key);
      im.setScale(104 / Math.max(im.width, im.height));
      if (st === 'closed' && cur === ch.afterLevel && !REDUCED_MOTION) loopTween(scene, { targets: im, angle: { from: -5, to: 5 }, duration: 160, yoyo: true, repeat: -1, repeatDelay: 1400 }, im);
      road.add(im);
      chestObjs.push(im);
      polish?.chest(im, st === 'closed' && cur === ch.afterLevel);
    }
    const plate = scene.add.graphics();
    // the plate sits ABOVE the chest: the YOU pointer of the level below it never reaches it
    // (and BELOW it when the player stands on the level just above the chest, so it never meets that node's plate and ribbon)
    const py2 = cur === ch.afterLevel + 1 ? 52 : -90;
    plate.fillStyle(INK, 1).fillRoundedRect(ch.x - 56, ch.y + py2, 112, 34, 14).fillStyle(st === 'open' ? 0x5fbf4a : 0xe0a020, 1).fillRoundedRect(ch.x - 52, ch.y + py2 + 4, 104, 26, 11);
    const plateText = scene.add.text(ch.x, ch.y + py2 + 17, st === 'open' ? 'REACHED' : `LEVEL ${ch.afterLevel + 1}`, { fontFamily: FONT, fontSize: '20px', color: '#2b1d2e' }).setOrigin(0.5);
    road.add([plate, plateText]);
    chestObjs.push(plate, plateText);
    const hit = scene.add.zone(ch.x, ch.y + 10, 130, 130).setInteractive({ useHandCursor: true });
    hit.on('pointerup', () => {
      if (scroller.moved()) return;
      sfx.click();
      scene.showToast(st === 'open' ? 'MILESTONE CHEST REACHED' : `REACH LEVEL ${ch.afterLevel + 1} FOR THE CHEST`);
    });
    road.add(hit);
  }

  // ---- nodes ----------------------------------------------------------------------------------------------------------------
  /** Node-kind parts that belong to the medallion: shield outline (mini-boss, drawn behind), horns (mega / boss), a ribbon plate wrapped round its foot (all but normal). */
  const kindBack = (n: RoadNode, x: number, y: number, size: number) => {
    if (n.kind !== 'mini') return;
    const r = size * 0.56, g = scene.add.graphics();
    const pts = [{ x: x - r, y: y - r * 0.7 }, { x: x + r, y: y - r * 0.7 }, { x: x + r, y: y + r * 0.1 }, { x, y: y + r * 1.05 }, { x: x - r, y: y + r * 0.1 }];
    g.fillStyle(INK, 1).fillPoints(pts, true);
    g.fillStyle(0x2b8f9a, 1).fillPoints(pts.map((p) => ({ x: x + (p.x - x) * 0.93, y: y + (p.y - y) * 0.93 })), true);
    nodeLayer.add(g);
  };
  const kindFront = (n: RoadNode, x: number, y: number, size: number, horns = true) => {
    if (n.kind === 'normal' && n.ribbon === 'none') return;
    const boss = n.kind === 'boss', mini = n.kind === 'mini', mega = n.ribbon === 'mega';
    const label = boss ? 'BOSS' : mini ? 'MINI' : mega ? 'MEGA HARD' : 'HARD';
    const col = boss ? 0x2b1d2e : mini ? 0x1f6f7a : mega ? 0xd8261a : 0x8e58c9;
    const g = scene.add.graphics();
    if (horns && (mega || boss)) {
      const hc = boss ? 0xffcf33 : 0xfff0cf;
      for (const sd of [-1, 1]) g.fillStyle(INK, 1).fillTriangle(x + sd * size * 0.2, y - size * 0.42, x + sd * size * 0.5, y - size * 0.42, x + sd * size * 0.48, y - size * 0.78).fillStyle(hc, 1).fillTriangle(x + sd * size * 0.25, y - size * 0.43, x + sd * size * 0.46, y - size * 0.43, x + sd * size * 0.45, y - size * 0.7);
    }
    const t = scene.add.text(x, y + size * 0.5, label, { fontFamily: FONT, fontSize: '24px', color: '#ffffff', stroke: '#2b1d2e', strokeThickness: 5 }).setOrigin(0.5);
    const w = Math.max(size * 0.72, t.width + 36), h = 38, ry = t.y;
    g.fillStyle(INK, 1).fillTriangle(x - w / 2 - 22, ry - h / 2 + 10, x - w / 2 + 10, ry - h / 2, x - w / 2 + 10, ry + h / 2 + 8).fillTriangle(x + w / 2 + 22, ry - h / 2 + 10, x + w / 2 - 10, ry - h / 2, x + w / 2 - 10, ry + h / 2 + 8);
    g.fillStyle(lerpColor(col, INK, 0.4), 1).fillTriangle(x - w / 2 - 14, ry - h / 2 + 12, x - w / 2 + 10, ry - h / 2 + 4, x - w / 2 + 10, ry + h / 2 + 2).fillTriangle(x + w / 2 + 14, ry - h / 2 + 12, x + w / 2 - 10, ry - h / 2 + 4, x + w / 2 - 10, ry + h / 2 + 2);
    g.fillStyle(INK, 1).fillRoundedRect(x - w / 2, ry - h / 2 - 3, w, h + 6, 10).fillStyle(col, 1).fillRoundedRect(x - w / 2 + 4, ry - h / 2 + 1, w - 8, h - 2, 7).fillStyle(0xffffff, 0.22).fillRoundedRect(x - w / 2 + 8, ry - h / 2 + 4, w - 16, 10, 5);
    if (boss) g.lineStyle(3, 0xffcf33, 1).strokeRoundedRect(x - w / 2 + 4, ry - h / 2 + 1, w - 8, h - 2, 7);
    nodeLayer.add([g, t]);
  };
  const nodeLayer = scene.add.container(0, 0);
  road.add(nodeLayer);
  for (const n of lay.nodes) {
    const firstObj = nodeLayer.length; // everything this node adds from here is culled together
    const info = LEVELS[n.level - 1];
    const state: NodeState = nodeState(n.level, cur, stars);
    const fk = frameKind(n.kind, n.ribbon);
    const size = SIZE[fk];
    const phase = state === 'completed' || state === 'open' ? 'done' : state === 'locked' ? 'locked' : 'open';
    const slot = slotArt(has, `nodeFrame_${fk}_${phase}`);
    const tex = slot ?? (state === 'locked' ? 'node_locked' : state === 'completed' || state === 'open' ? 'node_completed' : FALLBACK_TEX[fk]);
    const isCur = state === 'current';
    // the boss waiting beside its node (a lit silhouette until it is beaten)
    if ((n.kind === 'boss' || n.kind === 'mini') && state !== 'completed') {
      const bd = n.kind === 'mini' ? BOSSES.find((b) => b.id === info.mini_boss) : BOSSES[chapterBossIdx(n.level)];
      const pk = bd ? `boss_${bd.id}_intact` : '';
      if (pk && has(pk) && !isCur) {
        const side = n.x > ROAD.centerX ? -1 : 1;
        const pi = scene.add.image(n.x + side * (size * 0.5 + 84), n.y - 6, pk);
        pi.setScale((n.kind === 'boss' ? 170 : 130) / Math.max(pi.width, pi.height)).setTint(state === 'locked' ? 0x2a2a52 : 0x4a3a6e);
        nodeLayer.add(pi);
      }
    }
    if (isCur) {
      const platKey = slotArt(has, 'avatarMarker');
      const py = n.y + 46;
      const plat = scene.add.container(n.x, py);
      if (platKey) {
        const pi = scene.add.image(0, 0, platKey);
        pi.setScale(280 / pi.width);
        plat.add(pi);
      } else {
        const pgx = scene.add.graphics();
        pgx.fillStyle(0x000000, 0.25).fillEllipse(0, 22, 270, 96);
        pgx.fillStyle(INK, 1).fillEllipse(0, 12, 252, 94);
        pgx.fillStyle(0xc88a20, 1).fillEllipse(0, 6, 238, 82);
        pgx.fillStyle(0xffcf33, 1).fillEllipse(0, -4, 238, 76);
        pgx.fillStyle(0xfff0b8, 1).fillEllipse(0, -6, 168, 48);
        plat.add(pgx);
      }
      nodeLayer.add(plat);
      const ring = scene.add.ellipse(n.x, py, 300, 120, 0xffcf33, 0.16).setStrokeStyle(5, 0xffcf33, 0.9);
      nodeLayer.add(ring);
      if (!REDUCED_MOTION) loopTween(scene, { targets: ring, scaleX: 1.14, scaleY: 1.14, alpha: 0.4, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.InOut' }, ring);
      const hero = scene.add.container(n.x, py - 16);
      const boss = n.kind === 'boss' || n.kind === 'mini' ? BOSSES.find((b) => b.id === (n.kind === 'mini' ? info.mini_boss : BOSSES[chapterBossIdx(n.level)]?.id)) : undefined;
      const bk = boss ? `boss_${boss.id}_intact` : '';
      if (bk && has(bk)) {
        const bi = scene.add.image(10, -78, bk);
        bi.setScale((n.kind === 'boss' ? 230 : 180) / Math.max(bi.width, bi.height));
        hero.add(bi);
      }
      const withBoss = n.kind !== 'normal' && !!bk && has(bk);
      // beside a boss the avatar gets its own small platform, so the two never crowd each other
      const avX = withBoss ? (n.x > ROAD.centerX ? -205 : 205) : 0;
      if (withBoss) {
        const sp = scene.add.graphics();
        sp.fillStyle(0x000000, 0.25).fillEllipse(n.x + avX, py + 36, 150, 54).fillStyle(INK, 1).fillEllipse(n.x + avX, py + 28, 140, 50).fillStyle(0xffcf33, 1).fillEllipse(n.x + avX, py + 20, 128, 40).fillStyle(0xfff0b8, 1).fillEllipse(n.x + avX, py + 18, 86, 22);
        nodeLayer.add(sp);
      }
      if (has('cannon_4')) {
        const av = scene.add.image(avX, -62, 'cannon_4');
        av.setScale((withBoss ? 110 : 150) / Math.max(av.width, av.height));
        if (withBoss) av.y = 36 - av.displayHeight / 2;
        hero.add(av);
      }
      nodeLayer.add(hero);
      const bob = () => {
        if (!REDUCED_MOTION && hero.active) loopTween(scene, { targets: hero, y: hero.y - 10, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.InOut' }, hero);
      };
      if (polish) polish.hero(hero, 0, py - 16 - n.y, plat, bob);
      else bob();
      // number plate on the front of the platform + YOU pointer
      const np = scene.add.graphics();
      np.fillStyle(INK, 1).fillRoundedRect(n.x - 52, py + 22, 104, 62, 20).fillStyle(0xfbe7c6, 1).fillRoundedRect(n.x - 47, py + 27, 94, 52, 16);
      nodeLayer.add([np, scene.add.text(n.x, py + 54, String(n.level), { fontFamily: FONT, fontSize: n.level >= 10 ? '42px' : '48px', color: '#3b2533' }).setOrigin(0.5)]);
      const you = scene.add.container(n.x + avX, py - (withBoss ? 110 : 178));
      you.add(scene.add.graphics().fillStyle(INK, 1).fillRoundedRect(-62, -26, 124, 52, 18).fillTriangle(-14, 24, 14, 24, 0, 42).fillStyle(0xffcf33, 1).fillRoundedRect(-57, -21, 114, 42, 14));
      you.add(scene.add.text(0, 0, 'YOU', { fontFamily: FONT, fontSize: '32px', color: '#2b1d2e' }).setOrigin(0.5));
      nodeLayer.add(you);
      if (!REDUCED_MOTION) loopTween(scene, { targets: you, y: you.y - 9, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.InOut' }, you);
      kindFront(n, n.x, py + 62, 100, false); // the ribbon hangs under the number plate
    } else {
      kindBack(n, n.x, n.y, size);
      const im = scene.add.image(n.x, n.y, tex);
      im.setScale(size / Math.max(im.width, im.height));
      if (state === 'locked') im.setTint(LOCKED_TINT).setAlpha(0.92);
      else if (state === 'open') im.setTint(0xd8e8c8);
      if (fk === 'mini' && !slot) im.setTint(state === 'locked' ? LOCKED_TINT : state === 'completed' ? 0xffffff : 0x9fe0d6);
      nodeLayer.add(im);
      const done = state === 'completed' || state === 'open';
      const ny = n.y - im.displayHeight * (done ? 0.095 : 0.07);
      nodeLayer.add(scene.add.text(n.x, ny, String(n.level), { fontFamily: FONT, fontSize: n.level >= 10 ? '44px' : '50px', color: state === 'locked' ? '#6f7fa0' : '#3b2533', stroke: state === 'locked' ? '#e8eefc' : '#fff7e6', strokeThickness: 3 }).setOrigin(0.5));
      const starImgs: Phaser.GameObjects.Image[] = [];
      if (state === 'completed' || state === 'open')
        for (let k = 0; k < 3; k++) {
          const st = scene.add.image(n.x + (k - 1) * 36, n.y + im.displayHeight * 0.26 + (k === 1 ? 5 : 0), 'star');
          st.setScale(36 / Math.max(st.width, st.height)).setAlpha(k < starsOf(n.level, stars) ? 1 : 0.25);
          nodeLayer.add(st);
          starImgs.push(st);
        }
      polish?.node(n, state, im, starImgs);
      kindFront(n, n.x, n.y, im.displayHeight);
    }
    const hit = scene.add.zone(n.x, n.y + (isCur ? 30 : 0), size + 40, size + 60).setInteractive({ useHandCursor: true });
    hit.on('pointerup', () => {
      if (scroller.moved()) return;
      if (n.level > cur) {
        polish?.shake(n.level);
        return scene.showToast(`FINISH LEVEL ${cur} FIRST`);
      }
      scene.roadLessonDone?.();
      scene.roadLessonDone = null;
      sfx.nodeTap();
      scene.openLevelSheet(n.level);
    });
    nodeLayer.add(hit);
    cull(nodeLayer.list.slice(firstObj) as unknown as { setVisible(v: boolean): unknown }[], n.y - 440, n.y + 320);
  }

  // ---- ambient: drifting clouds (screen space, a little faster than the road) ------------------------------------------------
  for (let i = 0; i < 4; i++) {
    const img = scene.add.image(0, 0, 'road_cloud').setScale(1.3 + (i % 2) * 0.7).setAlpha(0.3);
    img.x = (i * 211) % W;
    c.addAt(img, 2); // behind the road, in front of the far layer
    clouds.push({ img, base: 200 + i * 330, k: 1.15 + i * 0.06 });
    if (!REDUCED_MOTION) loopTween(scene, { targets: img, x: i % 2 ? -260 : W + 260, duration: 38000 + i * 9000, repeat: -1, ease: 'Linear' }, img);
  }

  // ---- HUD: scrim, chapter chip, rails, back-to-me, PLAY, nav ------------------------------------------------------------------
  const scrim = scene.add.graphics();
  for (let i = 0; i < 12; i++) scrim.fillStyle(INK, 0.03).fillRect(0, H - 360 + i * 21, W, 360 - i * 21);
  scrim.fillStyle(INK, 0.45).fillRect(0, H - 108, W, 108);
  c.add(scrim);
  scene.drawWallet(c);
  const chip = scene.add.container(W / 2, 140);
  const chipBg = scene.add.graphics();
  const chipText = scene.add.text(-(W - 60) / 2 + 36, 0, '', { fontFamily: FONT, fontSize: '26px', color: '#302b35' }).setOrigin(0, 0.5);
  chip.add([chipBg, chipText]);
  if (has('chest_closed')) {
    const ci = scene.add.image((W - 60) / 2 - 40, -4, 'chest_closed');
    ci.setScale(64 / Math.max(ci.width, ci.height));
    chip.add(ci);
  }
  chip.setSize(W - 60, 60).setInteractive({ useHandCursor: true });
  let shownChapter = 0;
  const setChip = (ch: number) => {
    if (ch === shownChapter) return;
    shownChapter = ch;
    const look = lookOf(ch);
    const done = Math.min(10, LEVELS.slice((ch - 1) * 10, ch * 10).filter((d) => stars[String(d.level)]).length);
    chipBg.clear().fillStyle(INK, 1).fillRoundedRect(-(W - 60) / 2 - 3, -33, W - 54, 66, 22).fillStyle(lerpColor(look.top, 0xfbe7c6, 0.6), 1).fillRoundedRect(-(W - 60) / 2, -30, W - 60, 60, 20).fillStyle(look.accent, 1).fillRoundedRect(-(W - 60) / 2, -30, 14, 60, { tl: 20, bl: 20, tr: 0, br: 0 });
    chipText.setText(`CH ${ch} · ${look.name}  ·  ${done}/10`);
  };
  chip.on('pointerup', () => scene.showToast(`CLEAR LEVEL ${shownChapter * 10} TO OPEN THE NEXT GATE`));
  c.add(chip);
  const def = LEVELS[cur - 1];
  const ptag = cur % 10 === 0 ? '  ·  BOSS' : def.mini_boss ? '  ·  MINI-BOSS' : def.difficulty === 'NORMAL' ? '' : def.difficulty === 'HARD' ? '  ·  HARD' : '  ·  MEGA HARD';
  const showSeason = scene.currentLevel() > 3 && !MAP_BADGES.on; // MAP BADGES moves SEASON to the left rail
  const playW = showSeason ? 480 : 620, playX = showSeason ? 40 + playW / 2 : W / 2; // Season is a square button beside PLAY, not a floater on the road
  const play = scene.endlessOpen()
    ? scene.button(c, playX, H - 182, playW, `ENDLESS  ·  FLOOR ${scene.endlessRec().floor}`, 0x8e58c9, () => scene.startEndless(), 1.0)
    : scene.button(c, playX, H - 182, playW, `PLAY  LEVEL ${cur}${ptag}`, 0x5fbf4a, () => {
        scene.roadLessonDone?.();
        scene.roadLessonDone = null;
        scene.openLevelSheet(cur);
      }, 1.0);
  if (showSeason) {
    const sr = scene.seasonRec();
    const sb = scene.add.container(W - 40 - 50, H - 182);
    sb.add(scene.add.graphics().fillStyle(INK, 1).fillRoundedRect(-50, -46, 100, 92, 22).fillStyle(0xe0a020, 1).fillRoundedRect(-45, -41, 90, 82, 18).fillStyle(0xffffff, 0.25).fillRoundedRect(-40, -37, 80, 22, 10));
    sb.add(scene.add.text(0, -14, 'SEASON', { fontFamily: FONT, fontSize: '17px', color: '#ffffff', stroke: '#2b1d2e', strokeThickness: 4 }).setOrigin(0.5));
    sb.add(scene.add.text(0, 16, `${seasonTier(sr)}/${SEASON_TIERS}`, { fontFamily: FONT, fontSize: '26px', color: '#2b1d2e' }).setOrigin(0.5));
    if (scene.seasonClaimable() > 0) sb.add(scene.add.circle(44, -42, 12, 0xe8452c).setStrokeStyle(3, 0xfff0cf));
    sb.add(scene.add.zone(0, 0, 100, 92).setInteractive({ useHandCursor: true }).on('pointerup', () => (sfx.click(), scene.openSeason())));
    c.add(sb);
  }
  if (!REDUCED_MOTION) loopTween(scene, { targets: play, scale: 1.04, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.InOut' }, play);
  // back to me: shows when the current node is off screen; a tap glides there
  const back = scene.add.container(W - 72, H - 345);
  const backArrow = scene.add.graphics();
  back.add([scene.add.circle(0, 0, 46, 0xffcf33).setStrokeStyle(6, INK), backArrow, scene.add.text(0, 14, 'YOU', { fontFamily: FONT, fontSize: '22px', color: '#2b1d2e' }).setOrigin(0.5)]);
  back.add(scene.add.zone(0, 0, 100, 100).setInteractive({ useHandCursor: true }).on('pointerup', () => {
    sfx.click();
    scroller.to(snapScroll(curNode.y, top, bottom, lo, hi), REDUCED_MOTION ? 0 : 520);
  }));
  back.setVisible(false);
  c.add(back);
  addMapBadges(scene, c, { level: scene.currentLevel(), seasonClaimable: scene.seasonClaimable() });
  scene.drawNav(c, 'road');
  if (ROAD_PERF_HUD.on) addRoadPerfHud(scene, c, 190);

  // ---- scroll -----------------------------------------------------------------------------------------------------------------
  const home = snapScroll(curNode.y, top, bottom, lo, hi);
  const redraw = (scroll: number) => {
    road.y = scroll;
    placeFar(scroll);
    polish?.place(scroll);
    culler.update(scroll);
    backdrop.clear();
    const bandH = 28;
    for (let sy = 0; sy < H; sy += bandH) {
      const wy = sy + bandH / 2 - scroll;
      backdrop.fillStyle(skyColorAt(lay.chapters, chapterAtY(lay.chapters, wy), wy), 1).fillRect(0, sy, W, bandH + 1);
    }
    for (const cl of clouds) cl.img.y = ((cl.base + scroll * cl.k) % (H + 300) + (H + 300)) % (H + 300) - 150;
    for (const f of fades) {
      const a = Math.min(1, Math.max(0, (f.y + scroll - 170) / 110));
      for (const o of f.objs) o.setAlpha(a);
    }
    setChip(chapterAtY(lay.chapters, (top + bottom) / 2 - scroll));
    const far_ = farFromCurrent(curNode.y, scroll, top, bottom);
    if (far_ !== back.visible) back.setVisible(far_);
    if (far_) {
      const above = curNode.y + scroll < top;
      backArrow.clear().fillStyle(INK, 1);
      if (above) backArrow.fillTriangle(-14, -16, 14, -16, 0, -34);
      else backArrow.fillTriangle(-14, -22, 14, -22, 0, -4);
    }
  };
  // with a climb to show (polish), the road opens on the level the player came from and glides up to the new one
  const fromNode = polish?.span ? byLevel.get(polish.span.from) : undefined;
  const startScroll = fromNode ? snapScroll(fromNode.y, top, bottom, lo, hi) : Math.max(lo, home - 360);
  const scroller = attachRoadScroll(scene, c, {
    startY: 110, endY: bottom, lo, hi,
    start: REDUCED_MOTION ? home : startScroll,
    onScroll: redraw,
  });
  if (!REDUCED_MOTION && startScroll !== home && (fromNode || home - 360 >= lo)) scroller.to(home, fromNode ? 600 : 650);
  c.once(Phaser.GameObjects.Events.DESTROY, () => mask.destroy());

  // first road visit: lesson 1 (the ring lives in road space so it scrolls with the road)
  if (!(m.lessons ?? {}).road && cur <= 3) {
    const done = scene.lesson('road', c, `Tap Level ${cur} to play.`, { x: curNode.x, y: curNode.y + 30, r: 100 }, Math.max(top + 70, home + curNode.y - 250), true, road);
    scene.roadLessonDone = done ?? null;
    c.once(Phaser.GameObjects.Events.DESTROY, () => {
      if (scene.roadLessonDone === done) scene.roadLessonDone = null;
    });
  }
  c.setAlpha(0);
  scene.tweens.add({ targets: c, alpha: 1, duration: 180, ease: 'Cubic.Out' });
}
