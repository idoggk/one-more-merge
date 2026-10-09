import Phaser from 'phaser';
import { LEVELS } from '../../content/levels';
import { sfx } from '../audio';
import { BOSSES, chapterBossIdx } from '../../core/boss';
import { SEASON_TIERS, seasonTier } from '../../core/season';
import type { GameScene } from '../GameScene';
import { W, REDUCED_MOTION, H } from '../sceneKit';

/** ROAD tab (ChatGPT r15): a scrolling path of numbered levels, HARD / MEGA HARD tags, little machines at work. */
export function openRoadTab(scene: GameScene) {
  scene.closeModal();
  const m = scene.meta;
  const c = scene.add.container(0, 0).setDepth(100);
  if (scene.homeC?.active) scene.homeC.destroy();
  scene.homeC = c;
  scene.modal = c;
  const bg = scene.add.image(W / 2, 0, scene.hasArt('road_bg') ? 'road_bg' : 'hero_bg').setOrigin(0.5, 0);
  bg.setScale(Math.max(W / bg.width, H / bg.height));
  c.add([bg, scene.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.001).setInteractive()]);
  const top = 128, bottom = H - 250; // road viewport (sticky PLAY + nav below)
  const cur = scene.currentLevel();
  const SPACING = 170;
  const xs = [W / 2 - 190, W / 2, W / 2 + 190, W / 2];
  const nodeY = (n: number) => -(n - 1) * SPACING; // in road space, level 1 at 0, going up
  const road = scene.add.container(0, 0);
  const g = scene.add.graphics();
  road.add(g);
  for (let n = 1; n < LEVELS.length; n++) {
    const a = { x: xs[(n - 1) % 4], y: nodeY(n) }, b = { x: xs[n % 4], y: nodeY(n + 1) };
    // r16: a 12px cream connector with a thin plum outline; travelled stretches get a gold centre (curved, joins centres)
    const curve = new Phaser.Curves.QuadraticBezier(new Phaser.Math.Vector2(a.x, a.y), new Phaser.Math.Vector2((a.x + b.x) / 2 + (n % 2 ? 40 : -40), (a.y + b.y) / 2), new Phaser.Math.Vector2(b.x, b.y));
    const pts = curve.getPoints(16);
    g.lineStyle(30, 0x2b1d2e, 0.85).strokePoints(pts);
    g.lineStyle(22, 0xf3e3c8, 1).strokePoints(pts);
    if (n < cur) g.lineStyle(9, 0xffcf33, 1).strokePoints(pts);
  }
  const stars = m.levelStars ?? {};
  for (const def of LEVELS) {
    const n = def.level;
    const x = xs[(n - 1) % 4], y = nodeY(n);
    const done = !!stars[String(n)];
    const key = done ? 'node_completed' : n > cur ? 'node_locked' : def.boss_node ? 'node_boss' : def.difficulty === 'MEGA_HARD' ? 'node_mega_hard' : def.difficulty === 'HARD' ? 'node_hard' : 'node_normal';
    const size = def.boss_node ? 150 : def.difficulty === 'MEGA_HARD' ? 134 : def.difficulty === 'HARD' ? 126 : 116;
    const node = scene.add.image(x, y, key);
    node.setScale(size / Math.max(node.width, node.height));
    road.add(node);
    const ny = y - node.displayHeight * (done ? 0.095 : 0.07);
    road.add(scene.add.text(x, ny, String(n), { fontFamily: 'Lilita One, Arial Black', fontSize: n >= 10 ? '40px' : '46px', color: n > cur ? '#8a7a8a' : '#3b2533' }).setOrigin(0.5));
    if (done)
      for (let k = 0; k < 3; k++) {
        const st = scene.add.image(x + (k - 1) * 30, y + node.displayHeight * 0.25 + (k === 1 ? 4 : 0), 'star');
        st.setScale(30 / Math.max(st.width, st.height)).setAlpha(k < stars[String(n)] ? 1 : 0.25);
        road.add(st);
      }
    if ((def.difficulty !== 'NORMAL' || n % 10 === 0 || def.mini_boss) && n >= cur) {
      const side = x > W / 2 ? -1 : 1;
      const isB = n % 10 === 0 || !!def.mini_boss;
      const tag = scene.add.text(x + side * (size / 2 + 12), y, def.mini_boss ? 'MINI-BOSS' : isB ? 'BOSS' : def.difficulty === 'HARD' ? 'HARD' : 'MEGA HARD', { fontFamily: 'Lilita One, Arial Black', fontSize: '22px', color: '#ffffff', backgroundColor: isB ? '#2b1d2e' : def.difficulty === 'HARD' ? '#e8452c' : '#8e58c9', padding: { x: 10, y: 4 } }).setOrigin(side > 0 ? 0 : 1, 0.5);
      road.add(tag);
      // r28: the boss waiting there (a silhouette until it is beaten)
      const bd = def.mini_boss ? BOSSES.find((x) => x.id === def.mini_boss) : isB ? BOSSES[chapterBossIdx(n)] : undefined;
      const pk = bd ? `boss_${bd.id}_intact` : '';
      if (pk && scene.hasArt(pk)) {
        const pi = scene.add.image(tag.x + side * (tag.width + 46), y - 6, pk);
        pi.setScale(116 / Math.max(pi.width, pi.height));
        if (!(stars[String(n)] ?? 0)) pi.setTint(0x3b2d4e).setAlpha(0.5);
        road.add(pi);
      }
    }
    if (n === cur) {
      const ring = scene.add.circle(x, y, size * 0.6, 0xffcf33, 0.2).setStrokeStyle(5, 0xffcf33, 0.9);
      road.add(ring);
      if (!REDUCED_MOTION) scene.tweens.add({ targets: ring, scale: 1.12, alpha: 0.4, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    }
    const hit = scene.add.zone(x, y, size + 20, size + 20).setInteractive({ useHandCursor: true });
    hit.on('pointerup', () => {
      if (Math.abs(dragDist) > 12) return;
      if (n > cur) return scene.showToast(`FINISH LEVEL ${cur} FIRST`);
      scene.roadLessonDone?.();
      scene.roadLessonDone = null;
      sfx.nodeTap();
      scene.openLevelSheet(n);
    });
    road.add(hit);
  }
  // two little machines at work beside the road (one restrained fidget every 3-5 s)
  const workers: string[] = []; // r21: no floating decorations on the road for the playtest
  workers.slice(0, 3).forEach((k, i) => {
    const n = Math.max(1, cur - 1 + i * 2);
    const wx = xs[(n - 1) % 4] > W / 2 ? 80 : W - 80;
    const w = scene.add.image(wx, nodeY(n) - 60, k);
    w.setScale(84 / Math.max(w.width, w.height));
    road.add(w);
    if (!REDUCED_MOTION) scene.tweens.add({ targets: w, angle: { from: -4, to: 4 }, y: w.y - 6, duration: 420, yoyo: true, repeat: -1, repeatDelay: 2600 + i * 900, ease: 'Sine.InOut' });
  });
  // scrolling: road space -> screen; centre the current level
  const minScroll = bottom - 90, maxScroll = top + 90 + (LEVELS.length - 1) * SPACING;
  let scrollY = Phaser.Math.Clamp((top + bottom) / 2 + (cur - 1) * SPACING, minScroll, maxScroll);
  road.setY(scrollY);
  const mask = scene.add.graphics().setVisible(false).fillRect(0, top, W, bottom - top);
  road.setMask(mask.createGeometryMask());
  c.add(road);
  let dragStart = 0, startScroll = 0, dragDist = 0;
  const area = scene.add.zone(W / 2, (top + bottom) / 2, W, bottom - top).setInteractive();
  c.addAt(area, 2);
  area.on('pointerdown', (p: Phaser.Input.Pointer) => {
    dragStart = p.worldY;
    startScroll = scrollY;
    dragDist = 0;
  });
  const onMove = (p: Phaser.Input.Pointer) => {
    if (!p.isDown || scene.homeC !== c || !c.active) return;
    if (p.worldY < top - 40 || p.worldY > bottom + 40) return;
    dragDist = p.worldY - dragStart;
    scrollY = Phaser.Math.Clamp(startScroll + dragDist, minScroll, maxScroll);
    road.setY(scrollY);
  };
  const onDown = (p: Phaser.Input.Pointer) => {
    if (scene.homeC !== c || !c.active) return;
    dragStart = p.worldY;
    startScroll = scrollY;
    dragDist = 0;
  };
  scene.input.on('pointermove', onMove);
  scene.input.on('pointerdown', onDown);
  // leaving the tab: drop the scene listeners and the (unparented) mask, or every visit would stack another set
  c.once(Phaser.GameObjects.Events.DESTROY, () => {
    scene.input.off('pointermove', onMove);
    scene.input.off('pointerdown', onDown);
    mask.destroy();
  });
  scene.drawWallet(c);
  // chapter strip (r17): progress toward the chapter chest; tap previews the reward
  const chapter = Math.ceil(cur / 10);
  const doneInCh = Math.min(10, LEVELS.slice((chapter - 1) * 10, chapter * 10).filter((d) => stars[String(d.level)]).length);
  const strip = scene.add.container(W / 2, 140).setVisible(cur > 3);
  // r28: each chapter wears its setting's colours (ChatGPT CAST_CONFIG road strip palette)
  const CH = [
    { name: 'KITCHEN', fill: 0xe9c9a3, accent: 0xae7040 },
    { name: 'LAUNDRY', fill: 0xb8d7d1, accent: 0x458f87 },
    { name: 'GARAGE', fill: 0xd7b38a, accent: 0xa8753e },
    { name: 'ARCADE', fill: 0xb9a7d8, accent: 0x795aa8 },
    { name: 'MUSIC ATTIC', fill: 0xdec29a, accent: 0xb08042 },
    { name: 'SCRAPYARD', fill: 0xbac5cd, accent: 0x66818e },
    { name: 'PACKING DEPOT', fill: 0xd9c08f, accent: 0x9a7240 },
    { name: 'OBSERVATORY', fill: 0xaab4d8, accent: 0x52608f },
  ][(chapter - 1) % 8];
  strip.add(scene.add.graphics().fillStyle(0x2b1d2e, 1).fillRoundedRect(-(W - 60) / 2 - 3, -33, W - 54, 66, 22).fillStyle(CH.fill, 1).fillRoundedRect(-(W - 60) / 2, -30, W - 60, 60, 20).fillStyle(CH.accent, 1).fillRoundedRect(-(W - 60) / 2, -30, 14, 60, { tl: 20, bl: 20, tr: 0, br: 0 }));
  strip.add(scene.add.text(-(W - 60) / 2 + 30, 0, `CH ${chapter} \u00b7 ${CH.name}  \u00b7  ${doneInCh}/10`, { fontFamily: 'Lilita One, Arial Black', fontSize: '26px', color: '#302b35' }).setOrigin(0, 0.5));
  if (scene.hasArt('chest_closed')) {
    const ch = scene.add.image((W - 60) / 2 - 40, -4, 'chest_closed');
    ch.setScale(64 / Math.max(ch.width, ch.height));
    strip.add(ch);
  }
  strip.setSize(W - 60, 60).setInteractive({ useHandCursor: true });
  strip.on('pointerup', () => scene.showToast(`CLEAR LEVEL ${chapter * 10} FOR THE CHAPTER ${chapter} MEDAL`));
  c.add(strip);
  const def = LEVELS[cur - 1];
  const tag = cur % 10 === 0 ? '  ·  BOSS' : def.mini_boss ? '  ·  MINI-BOSS' : def.difficulty === 'NORMAL' ? '' : def.difficulty === 'HARD' ? '  ·  HARD' : '  ·  MEGA HARD';
  const endlessOpen = scene.endlessOpen();
  const play = endlessOpen
    ? scene.button(c, W / 2, H - 182, 620, `ENDLESS  \u00b7  FLOOR ${scene.endlessRec().floor}`, 0x8e58c9, () => scene.startEndless(), 1.0)
    : scene.button(c, W / 2, H - 182, 620, `PLAY  LEVEL ${cur}${tag}`, 0x5fbf4a, () => {
        scene.roadLessonDone?.();
        scene.roadLessonDone = null;
        scene.openLevelSheet(cur);
      }, 1.0);
  // r41 Workshop Season entry (left, mirrors QA)
  if (scene.currentLevel() > 3) {
    const sr = scene.seasonRec();
    const sb = scene.add.container(86, 236);
    sb.add(scene.add.graphics().fillStyle(0x2b1d2e, 1).fillRoundedRect(-62, -36, 124, 72, 20).fillStyle(0xe0a020, 1).fillRoundedRect(-58, -32, 116, 64, 17));
    sb.add(scene.add.text(0, -9, 'SEASON', { fontFamily: 'Lilita One, Arial Black', fontSize: '20px', color: '#ffffff', stroke: '#2b1d2e', strokeThickness: 4 }).setOrigin(0.5));
    sb.add(scene.add.text(0, 14, `${seasonTier(sr)}/${SEASON_TIERS}`, { fontFamily: 'Lilita One, Arial Black', fontSize: '20px', color: '#2b1d2e' }).setOrigin(0.5));
    if (scene.seasonClaimable() > 0) sb.add(scene.add.circle(54, -30, 11, 0xe8452c).setStrokeStyle(3, 0xfff0cf));
    sb.add(scene.add.zone(0, 0, 124, 72).setInteractive({ useHandCursor: true }).on('pointerup', () => (sfx.click(), scene.openSeason())));
    c.add(sb);
  }
  // r34 (Ido: "where are the reset and jump-to buttons?"): QA tools one tap from the road
  const qa = scene.add.container(W - 66, 236);
  qa.add(scene.add.circle(0, 0, 40, 0xd8261a).setStrokeStyle(5, 0x2b1d2e));
  qa.add(scene.add.text(0, 0, 'QA', { fontFamily: 'Lilita One, Arial Black', fontSize: '30px', color: '#ffffff' }).setOrigin(0.5));
  qa.add(scene.add.zone(0, 0, 90, 90).setInteractive({ useHandCursor: true }).on('pointerup', () => scene.openQaTools()));
  c.add(qa);
  if (!REDUCED_MOTION) scene.tweens.add({ targets: play, scale: 1.04, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
  scene.drawNav(c, 'road');
  // r17 lesson 1: first road visit
  if (!(m.lessons ?? {}).road && cur <= 3) {
    // the ring lives in road space so it scrolls and masks with the road; the bubble stays on screen
    const done = scene.lesson('road', c, `Tap Level ${cur} to play.`, { x: xs[(cur - 1) % 4], y: nodeY(cur), r: 80 }, Math.max(top + 70, scrollY + nodeY(cur) - 150), true, road);
    scene.roadLessonDone = done ?? null;
    // closing the tab destroys ring + bubble with it; a later visit must not run this stale callback
    c.once(Phaser.GameObjects.Events.DESTROY, () => {
      if (scene.roadLessonDone === done) scene.roadLessonDone = null;
    });
  }
  c.setAlpha(0);
  scene.tweens.add({ targets: c, alpha: 1, duration: 180, ease: 'Cubic.Out' });
}
