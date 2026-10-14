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
import { drawFarBand, FAR_STYLE, drawProp, ensureRoadTextures, frameKind, lerpColor, lookOf, skyColorAt, slotArt, type FrameKind } from './roadArt';
import { chapterAtY, chestState, farFromCurrent, gateOpen, nodeState, scrollLimits, snapScroll, starsOf, type NodeState } from './roadModel';
import { hash01, layoutRoad, ROAD, type RoadNode } from './pathGen';
import { attachRoadScroll } from './roadScroll';

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
    if (art) {
      // 3 stacked tiles, the middle one flipped, so a single picture still reads continuous
      const tex = scene.textures.get(art).getSourceImage() as { width: number; height: number };
      const th = (tex.height / tex.width) * W;
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
    return { fc, cy };
  });
  const placeFar = (scroll: number) => {
    const mid = (top + bottom) / 2;
    for (const f of farLayers) f.fc.y = mid + (scroll + f.cy - mid) * 0.8 - f.cy;
  };

  // ---- verge props + steam ------------------------------------------------------------------------------------------------
  const props = scene.add.graphics();
  road.add(props);
  const nodeXAt = (y: number) => lay.nodes.reduce((best, n) => (Math.abs(n.y - y) < Math.abs(best.y - y) ? n : best)).x;
  for (const ch of lay.chapters) {
    const look = lookOf(ch.chapter);
    let i = 0;
    for (let y = ch.bottomY - 140; y > ch.topY + 120; y -= 205, i++) {
      const left = nodeXAt(y) > ROAD.centerX;
      const x = left ? 52 + hash01(ch.chapter * 100 + i) * 56 : W - 52 - hash01(ch.chapter * 100 + i) * 56;
      const s = 0.85 + hash01(ch.chapter * 7 + i * 3) * 0.5;
      drawProp(props, look.prop, x, y, s, look.accent, i + ch.chapter);
      if (!REDUCED_MOTION && Math.abs(ch.chapter - curChapter) <= 1 && i % 3 === 0) {
        const puff = scene.add.circle(x, y - 40, 14, 0xffffff, 0.5);
        road.add(puff);
        loopTween(scene, { targets: puff, y: y - 130, scale: 2.2, alpha: 0, duration: 2600 + (i % 4) * 400, delay: (i % 5) * 500, repeat: -1, ease: 'Sine.Out' }, puff);
      }
    }
  }

  // ---- the path: thick outlined road, gold where travelled ----------------------------------------------------------------
  const pg = scene.add.graphics();
  road.add(pg);
  const pathTile = slotArt(has, 'pathTile');
  for (const seg of lay.segments) {
    const ch = Math.ceil(seg.from / ROAD.levelsPerChapter);
    const surface = lerpColor(0xf3e3c8, lookOf(ch).accent, 0.12);
    pg.lineStyle(78, INK, 0.9).strokePoints(seg.pts);
    if (pathTile) seg.pts.forEach((p) => road.add(scene.add.image(p.x, p.y, pathTile).setDisplaySize(64, 64)));
    else pg.lineStyle(58, surface, 1).strokePoints(seg.pts);
    if (seg.to <= cur) pg.lineStyle(20, 0xffcf33, 1).strokePoints(seg.pts);
    else {
      pg.lineStyle(7, 0xffffff, 0.55);
      for (let i = 0; i + 1 < seg.pts.length; i += 2) pg.lineBetween(seg.pts[i].x, seg.pts[i].y, seg.pts[i + 1].x, seg.pts[i + 1].y);
    }
  }

  // ---- fog over chapters not reached yet; banners; gates -------------------------------------------------------------------
  const fogKey = slotArt(has, 'fog') ?? 'road_fog';
  for (const ch of lay.chapters) {
    const look = lookOf(ch.chapter);
    const reached = ch.chapter <= curChapter;
    if (!reached) road.add(scene.add.rectangle(W / 2, (ch.topY + ch.bottomY) / 2, W, ch.bottomY - ch.topY, 0xdfe8f5, 0.28));
    // gate
    const open = gateOpen(ch.chapter, cur);
    const gy = ch.gateY;
    const gg = scene.add.graphics();
    road.add(gg);
    const pillar = (px: number, flip: number) => {
      gg.fillStyle(INK, 1).fillRoundedRect(px - 38, gy - 110, 76, 200, 18);
      gg.fillStyle(look.accent, 1).fillRoundedRect(px - 32, gy - 104, 64, 188, 14);
      gg.fillStyle(0xffffff, 0.22).fillRoundedRect(px - 28 + (flip > 0 ? 0 : 36), gy - 100, 20, 176, 8);
    };
    pillar(ROAD.centerX - 190, 1);
    pillar(ROAD.centerX + 190, -1);
    gg.fillStyle(INK, 1).fillRoundedRect(ROAD.centerX - 250, gy - 160, 500, 74, 26);
    gg.fillStyle(lerpColor(look.accent, 0xffffff, 0.2), 1).fillRoundedRect(ROAD.centerX - 244, gy - 154, 488, 62, 22);
    if (open) {
      gg.fillStyle(0xffe27a, 0.28).fillRect(ROAD.centerX - 150, gy - 90, 300, 160);
    } else {
      gg.fillStyle(INK, 1).fillCircle(ROAD.centerX, gy + 6, 44).fillStyle(0xe0a020, 1).fillCircle(ROAD.centerX, gy + 6, 38);
      gg.lineStyle(9, INK, 1).strokeCircle(ROAD.centerX, gy - 14, 14).fillStyle(INK, 1).fillRoundedRect(ROAD.centerX - 17, gy - 6, 34, 28, 6);
    }
    road.add(scene.add.text(ROAD.centerX, gy - 123, open ? `CHAPTER ${ch.chapter} CLEARED` : ch.chapter === lay.chapters.length ? 'FINAL GATE' : `CHAPTER ${ch.chapter} GATE`, { fontFamily: FONT, fontSize: '34px', color: '#2b1d2e' }).setOrigin(0.5));
    // fog above a closed gate: the next chapter is a tease
    if (!open && ch.chapter < lay.chapters.length) {
      for (let i = 0; i < 13; i++) {
        const fx = 40 + (i % 5) * 160 + hash01(ch.chapter * 50 + i) * 60, fy = gy - 330 - Math.floor(i / 5) * 80;
        road.add(scene.add.image(fx, fy, fogKey).setScale(2.1 + hash01(i + 7) * 0.8).setAlpha(reached ? 0.55 : 0.8));
      }
    }
    // entrance banner
    const by = ch.bannerY;
    const bg = scene.add.graphics();
    bg.fillStyle(INK, 1).fillRoundedRect(ROAD.centerX - 250, by - 52, 500, 104, 30);
    bg.fillStyle(look.accent, 1).fillRoundedRect(ROAD.centerX - 243, by - 45, 486, 90, 26);
    bg.fillStyle(0xffffff, 0.2).fillRoundedRect(ROAD.centerX - 236, by - 40, 472, 34, 18);
    road.add(bg);
    road.add(scene.add.text(ROAD.centerX, by - 20, `CHAPTER ${ch.chapter}`, { fontFamily: FONT, fontSize: '24px', color: '#fff0cf', stroke: '#2b1d2e', strokeThickness: 4 }).setOrigin(0.5));
    road.add(scene.add.text(ROAD.centerX, by + 12, look.name, { fontFamily: FONT, fontSize: '44px', color: '#ffffff', stroke: '#2b1d2e', strokeThickness: 7 }).setOrigin(0.5));
  }

  // ---- milestone chests on the verge ---------------------------------------------------------------------------------------
  for (const ch of lay.chests) {
    const st = chestState(ch, cur);
    const key = st === 'open' && has('chest_open') ? 'chest_open' : 'chest_closed';
    if (has(key)) {
      const im = scene.add.image(ch.x, ch.y, key);
      im.setScale(104 / Math.max(im.width, im.height));
      if (st === 'closed' && cur === ch.afterLevel && !REDUCED_MOTION) loopTween(scene, { targets: im, angle: { from: -5, to: 5 }, duration: 160, yoyo: true, repeat: -1, repeatDelay: 1400 }, im);
      road.add(im);
    }
    const plate = scene.add.graphics();
    plate.fillStyle(INK, 1).fillRoundedRect(ch.x - 56, ch.y + 52, 112, 34, 14).fillStyle(st === 'open' ? 0x5fbf4a : 0xe0a020, 1).fillRoundedRect(ch.x - 52, ch.y + 56, 104, 26, 11);
    road.add([plate, scene.add.text(ch.x, ch.y + 69, st === 'open' ? 'REACHED' : `LEVEL ${ch.afterLevel + 1}`, { fontFamily: FONT, fontSize: '20px', color: '#2b1d2e' }).setOrigin(0.5)]);
    const hit = scene.add.zone(ch.x, ch.y + 10, 130, 130).setInteractive({ useHandCursor: true });
    hit.on('pointerup', () => {
      if (scroller.moved()) return;
      sfx.click();
      scene.showToast(st === 'open' ? 'MILESTONE CHEST REACHED' : `REACH LEVEL ${ch.afterLevel + 1} FOR THE CHEST`);
    });
    road.add(hit);
  }

  // ---- nodes ----------------------------------------------------------------------------------------------------------------
  const tag = (n: RoadNode, x: number, y: number, size: number) => {
    if (n.kind === 'normal' && n.ribbon === 'none') return;
    const boss = n.kind === 'boss', mini = n.kind === 'mini';
    const label = boss ? 'BOSS' : mini ? 'MINI-BOSS' : n.ribbon === 'mega' ? 'MEGA HARD' : 'HARD';
    const col = boss ? 0x2b1d2e : mini ? 0x2b6f7a : n.ribbon === 'mega' ? 0xd8261a : 0x8e58c9;
    const t = scene.add.text(x, y - size * 0.46, label, { fontFamily: FONT, fontSize: '26px', color: '#ffffff', stroke: '#2b1d2e', strokeThickness: 5 }).setOrigin(0.5);
    const w = t.width + 44;
    const g = scene.add.graphics();
    g.fillStyle(INK, 1).fillRoundedRect(x - w / 2 - 4, t.y - 22, w + 8, 44, 14).fillStyle(col, 1).fillRoundedRect(x - w / 2, t.y - 18, w, 36, 11);
    if (!boss && !mini && n.ribbon === 'mega') g.fillStyle(0xfff0cf, 1).fillTriangle(x - w / 2 + 4, t.y - 14, x - w / 2 - 6, t.y - 40, x - w / 2 + 22, t.y - 16).fillTriangle(x + w / 2 - 4, t.y - 14, x + w / 2 + 6, t.y - 40, x + w / 2 - 22, t.y - 16);
    if (boss) g.lineStyle(3, 0xffcf33, 1).strokeRoundedRect(x - w / 2, t.y - 18, w, 36, 11);
    road.add([g, t]);
  };
  const nodeLayer = scene.add.container(0, 0);
  road.add(nodeLayer);
  for (const n of lay.nodes) {
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
      if (has('cannon_4')) {
        const av = scene.add.image(bk && has(bk) ? -92 : 0, bk && has(bk) ? -36 : -62, 'cannon_4');
        av.setScale((bk && has(bk) ? 96 : 150) / Math.max(av.width, av.height));
        hero.add(av);
      }
      nodeLayer.add(hero);
      if (!REDUCED_MOTION) loopTween(scene, { targets: hero, y: hero.y - 10, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.InOut' }, hero);
      // number plate on the front of the platform + YOU pointer
      const np = scene.add.graphics();
      np.fillStyle(INK, 1).fillRoundedRect(n.x - 52, py + 22, 104, 62, 20).fillStyle(0xfbe7c6, 1).fillRoundedRect(n.x - 47, py + 27, 94, 52, 16);
      nodeLayer.add([np, scene.add.text(n.x, py + 54, String(n.level), { fontFamily: FONT, fontSize: n.level >= 10 ? '42px' : '48px', color: '#3b2533' }).setOrigin(0.5)]);
      const withBoss = n.kind !== 'normal' && !!bk && has(bk);
      const you = scene.add.container(n.x + (withBoss ? -92 : 0), py - (withBoss ? 150 : 178));
      you.add(scene.add.graphics().fillStyle(INK, 1).fillRoundedRect(-62, -26, 124, 52, 18).fillTriangle(-14, 24, 14, 24, 0, 42).fillStyle(0xffcf33, 1).fillRoundedRect(-57, -21, 114, 42, 14));
      you.add(scene.add.text(0, 0, 'YOU', { fontFamily: FONT, fontSize: '32px', color: '#2b1d2e' }).setOrigin(0.5));
      nodeLayer.add(you);
      if (!REDUCED_MOTION) loopTween(scene, { targets: you, y: you.y - 9, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.InOut' }, you);
      tag(n, n.x, py + 112 + 46, 100); // the ribbon hangs under the number plate
    } else {
      const im = scene.add.image(n.x, n.y, tex);
      im.setScale(size / Math.max(im.width, im.height));
      if (state === 'locked') im.setTint(LOCKED_TINT).setAlpha(0.92);
      else if (state === 'open') im.setTint(0xd8e8c8);
      if (fk === 'mini' && !slot) im.setTint(state === 'locked' ? LOCKED_TINT : state === 'completed' ? 0xffffff : 0x9fe0d6);
      nodeLayer.add(im);
      const done = state === 'completed' || state === 'open';
      const ny = n.y - im.displayHeight * (done ? 0.095 : 0.07);
      nodeLayer.add(scene.add.text(n.x, ny, String(n.level), { fontFamily: FONT, fontSize: n.level >= 10 ? '44px' : '50px', color: state === 'locked' ? '#6f7fa0' : '#3b2533', stroke: state === 'locked' ? '#e8eefc' : '#fff7e6', strokeThickness: 3 }).setOrigin(0.5));
      if (state === 'completed' || state === 'open')
        for (let k = 0; k < 3; k++) {
          const st = scene.add.image(n.x + (k - 1) * 36, n.y + im.displayHeight * 0.26 + (k === 1 ? 5 : 0), 'star');
          st.setScale(36 / Math.max(st.width, st.height)).setAlpha(k < starsOf(n.level, stars) ? 1 : 0.25);
          nodeLayer.add(st);
        }
      if (state === 'locked' || state === 'open') tag(n, n.x, n.y, im.displayHeight);
    }
    const hit = scene.add.zone(n.x, n.y + (isCur ? 30 : 0), size + 40, size + 60).setInteractive({ useHandCursor: true });
    hit.on('pointerup', () => {
      if (scroller.moved()) return;
      if (n.level > cur) return scene.showToast(`FINISH LEVEL ${cur} FIRST`);
      scene.roadLessonDone?.();
      scene.roadLessonDone = null;
      sfx.nodeTap();
      scene.openLevelSheet(n.level);
    });
    nodeLayer.add(hit);
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
  const play = scene.endlessOpen()
    ? scene.button(c, W / 2, H - 182, 620, `ENDLESS  ·  FLOOR ${scene.endlessRec().floor}`, 0x8e58c9, () => scene.startEndless(), 1.0)
    : scene.button(c, W / 2, H - 182, 620, `PLAY  LEVEL ${cur}${ptag}`, 0x5fbf4a, () => {
        scene.roadLessonDone?.();
        scene.roadLessonDone = null;
        scene.openLevelSheet(cur);
      }, 1.0);
  if (scene.currentLevel() > 3) {
    const sr = scene.seasonRec();
    const sb = scene.add.container(76, 252);
    sb.add(scene.add.graphics().fillStyle(INK, 1).fillRoundedRect(-52, -34, 104, 68, 20).fillStyle(0xe0a020, 1).fillRoundedRect(-48, -30, 96, 60, 17));
    sb.add(scene.add.text(0, -9, 'SEASON', { fontFamily: FONT, fontSize: '18px', color: '#ffffff', stroke: '#2b1d2e', strokeThickness: 4 }).setOrigin(0.5));
    sb.add(scene.add.text(0, 14, `${seasonTier(sr)}/${SEASON_TIERS}`, { fontFamily: FONT, fontSize: '20px', color: '#2b1d2e' }).setOrigin(0.5));
    if (scene.seasonClaimable() > 0) sb.add(scene.add.circle(46, -28, 11, 0xe8452c).setStrokeStyle(3, 0xfff0cf));
    sb.add(scene.add.zone(0, 0, 104, 68).setInteractive({ useHandCursor: true }).on('pointerup', () => (sfx.click(), scene.openSeason())));
    c.add(sb);
  }
  const qa = scene.add.container(W - 66, 252);
  qa.add(scene.add.circle(0, 0, 38, 0xd8261a).setStrokeStyle(5, INK));
  qa.add(scene.add.text(0, 0, 'QA', { fontFamily: FONT, fontSize: '28px', color: '#ffffff' }).setOrigin(0.5));
  qa.add(scene.add.zone(0, 0, 90, 90).setInteractive({ useHandCursor: true }).on('pointerup', () => scene.openQaTools()));
  c.add(qa);
  if (!REDUCED_MOTION) loopTween(scene, { targets: play, scale: 1.04, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.InOut' }, play);
  // back to me: shows when the current node is off screen; a tap glides there
  const back = scene.add.container(W - 72, H - 306);
  const backArrow = scene.add.graphics();
  back.add([scene.add.circle(0, 0, 46, 0xffcf33).setStrokeStyle(6, INK), backArrow, scene.add.text(0, 14, 'YOU', { fontFamily: FONT, fontSize: '22px', color: '#2b1d2e' }).setOrigin(0.5)]);
  back.add(scene.add.zone(0, 0, 100, 100).setInteractive({ useHandCursor: true }).on('pointerup', () => {
    sfx.click();
    scroller.to(snapScroll(curNode.y, top, bottom, lo, hi), REDUCED_MOTION ? 0 : 520);
  }));
  back.setVisible(false);
  c.add(back);
  scene.drawNav(c, 'road');

  // ---- scroll -----------------------------------------------------------------------------------------------------------------
  const home = snapScroll(curNode.y, top, bottom, lo, hi);
  const redraw = (scroll: number) => {
    road.y = scroll;
    placeFar(scroll);
    backdrop.clear();
    const bandH = 28;
    for (let sy = 0; sy < H; sy += bandH) {
      const wy = sy + bandH / 2 - scroll;
      backdrop.fillStyle(skyColorAt(lay.chapters, chapterAtY(lay.chapters, wy), wy), 1).fillRect(0, sy, W, bandH + 1);
    }
    for (const cl of clouds) cl.img.y = ((cl.base + scroll * cl.k) % (H + 300) + (H + 300)) % (H + 300) - 150;
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
  const scroller = attachRoadScroll(scene, c, {
    startY: 110, endY: bottom, lo, hi,
    start: REDUCED_MOTION ? home : Math.max(lo, home - 360),
    onScroll: redraw,
  });
  if (!REDUCED_MOTION && home - 360 >= lo) scroller.to(home, 650);
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
