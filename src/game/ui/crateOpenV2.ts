// CRATE OPENING V2 (TUNING.crateOpenV2, QA row CRATE OPENING V2; docs/art/CRATE_OPENING_V2.md). Same inputs as presentCrateToolbox (the crate kind, the cards
// and the latch roll were decided and saved before this screen), a different sequence: anticipation, rising shake, white flash + burst, ONE hero reveal of
// the best card big and centred with rarity rays, the rest flying into a 3-column grid, one COLLECT button. Every duration is in OPEN_V2
// (src/content/crateOpenV2.ts). The sequence is a beat state machine whose animation is a pure function of (beat, progress), so a tap can speed a beat
// without touching scene-wide tween clocks, and the hero beat can never be skipped. Only existing art (crate pictures, unit pictures) + code-drawn effects.
import Phaser from 'phaser';
import { FAMILY_INFO } from '../../content/perks';
import { BEATS, OPEN_V2, beatDuration, gridLayout3, pickHero, summaryOrder, type BeatId } from '../../content/crateOpenV2';
import { RARITY_COLOR, UNITS, type CrateKind, type Rarity } from '../../content/units';
import { TUNING } from '../../content/tuning';
import type { CrateCard } from '../../core/crates';
import { guaranteeText, pityView } from '../../core/crateOdds';
import { sfx } from '../audio';
import type { GameScene } from '../GameScene';
import { W, H, REDUCED_MOTION } from '../sceneKit';
import { crateName } from '../fx/toolboxCrates';
import { CRATE, bakeFx, buildCard } from './crateScreen';
import { showOddsPanel } from './oddsPanel';
import { showUnitJobPopup } from './unitJobUi';

const FONT = 'Lilita One, Arial Black';
const INK = 0x2b1d2e;
const TIER: Record<Rarity, number> = { common: 0, rare: 1, epic: 2, legendary: 3 };
const HERO_SCALE = 2.3;
const CRATE_SIZE = 520;
const lerp = Phaser.Math.Linear;
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const outBack = (t: number) => 1 + 2.70158 * Math.pow(t - 1, 3) + 1.70158 * Math.pow(t - 1, 2);
const outQuad = (t: number) => 1 - (1 - t) * (1 - t);

interface Spark {
  img: Phaser.GameObjects.Image;
  vx: number;
  vy: number;
  age: number;
  life: number;
}

export function presentCrateV2(scene: GameScene, kind: CrateKind, cards: CrateCard[], title?: string, from?: CrateKind) {
  scene.closeModal();
  bakeFx(scene);
  const HERO_Y = Math.round(H * 0.44); // H is the live layout height (it is set after this module loads), so never a module constant
  scene.seasonEv('crateOpen');
  const calm = REDUCED_MOTION;
  const n = cards.length;
  const total = cards.reduce((s, cd) => s + cd.count, 0);
  const units = cards.map((cd) => UNITS.find((u) => u.id === cd.unit)!);
  const hero = pickHero(cards.map((cd, i) => ({ rarity: units[i].rarity, isNew: cd.isNew, count: cd.count })));
  const order = summaryOrder(units.map((u) => ({ rarity: u.rarity })), hero); // slot k holds card order[k]
  const grid = gridLayout3(n, W, 250, H - 270);
  const heroRc = RARITY_COLOR[units[hero].rarity], heroTier = TIER[units[hero].rarity];
  let shown: CrateKind = from ?? kind;

  // ---- the full-screen stage ----
  const c = scene.add.container(0, 0).setDepth(100);
  scene.modal = c;
  const dim = scene.add.rectangle(W / 2, H / 2, W, H, 0x120a16, 0.985).setInteractive();
  c.add(dim);
  c.setAlpha(0);
  scene.tweens.add({ targets: c, alpha: 1, duration: 200, ease: 'Quad.Out' });

  const titleTxt = scene.add.text(W / 2, 120, title ?? crateName(shown), { fontFamily: FONT, fontSize: '64px', color: '#ffffff', stroke: '#2b1d2e', strokeThickness: 10 }).setOrigin(0.5);
  const sub = scene.add.text(W / 2, 190, `${total} CARD${total > 1 ? 'S' : ''} INSIDE`, { fontFamily: FONT, fontSize: '30px', color: '#ffe3a0', stroke: '#2b1d2e', strokeThickness: 6 }).setOrigin(0.5);
  const hdr = scene.add.container(0, 0, [titleTxt, sub]);
  if (!title) {
    sub.setText(`${total} CARD${total > 1 ? 'S' : ''}  ·  ${TUNING.rosterB ? guaranteeText(shown) : `${units.length} kinds`}`);
    const odds = scene.add.container(W / 2, 248);
    odds.add(scene.add.graphics().fillStyle(INK, 1).fillRoundedRect(-84, -22, 168, 44, 22).lineStyle(3, 0xffe3a0, 0.8).strokeRoundedRect(-84, -22, 168, 44, 22));
    odds.add(scene.add.text(0, 0, 'i  ODDS', { fontFamily: FONT, fontSize: '24px', color: '#ffffff' }).setOrigin(0.5));
    odds.setSize(240, 80).setInteractive({ useHandCursor: true });
    odds.on('pointerup', () => showOddsPanel(scene, W, H, pityView(scene.meta), kind));
    hdr.add(odds);
  }

  const stage = scene.add.container(W / 2, HERO_Y);
  const tintOf = (k: CrateKind) => CRATE[k].glow;
  const rays = scene.add.image(0, 0, 'omm_rays').setBlendMode(Phaser.BlendModes.ADD).setDisplaySize(1000, 1000).setAlpha(0.18).setTint(tintOf(shown));
  const glow = scene.add.image(0, 0, 'omm_glow').setBlendMode(Phaser.BlendModes.ADD).setDisplaySize(700, 700).setAlpha(0.35).setTint(tintOf(shown));
  const box = scene.add.container(0, 0);
  const whole = scene.fitVisible(scene.add.image(0, 0, CRATE[shown].key), CRATE_SIZE);
  const geoOf = (k: CrateKind) => {
    const b = scene.visBounds(CRATE[k].key), s = CRATE_SIZE / Math.max(b.w, b.h);
    return { lx: (CRATE[k].latch[0] - 0.5) * b.w * s, ly: (CRATE[k].latch[1] - 0.5) * b.h * s };
  };
  const latchGlow = scene.add.image(geoOf(shown).lx, geoOf(shown).ly, 'omm_glow').setTint(0xfff2b0).setBlendMode(Phaser.BlendModes.ADD).setDisplaySize(140, 140).setAlpha(0);
  box.add([whole, latchGlow]);
  stage.add([rays, glow, box]);
  const tapTxt = scene.add.text(W / 2, H - 190, 'TAP TO OPEN', { fontFamily: FONT, fontSize: '54px', color: '#ffffff', stroke: '#2b1d2e', strokeThickness: 9 }).setOrigin(0.5);
  const tapLoop = scene.tweens.add({ targets: tapTxt, scale: { from: 0.94, to: 1.06 }, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
  const idle = calm ? null : scene.tweens.add({ targets: box, y: { from: 0, to: -12 }, duration: 1000, yoyo: true, repeat: -1, ease: 'Sine.InOut' });

  // hero staging (rarity rays + glow behind the hero card)
  const heroRays = scene.add.image(W / 2, HERO_Y, 'omm_rays').setBlendMode(Phaser.BlendModes.ADD).setTint(heroRc).setDisplaySize(1300, 1300).setAlpha(0);
  const heroGlow = scene.add.image(W / 2, HERO_Y, 'omm_glow').setBlendMode(Phaser.BlendModes.ADD).setTint(heroRc).setDisplaySize(900, 900).setAlpha(0);
  const ribbon = scene.add.text(W / 2, HERO_Y - 330, units[hero].rarity.toUpperCase(), { fontFamily: FONT, fontSize: '60px', color: `#${heroRc.toString(16).padStart(6, '0')}`, stroke: '#2b1d2e', strokeThickness: 12 }).setOrigin(0.5).setAlpha(0);
  const heroNew = cards[hero].isNew ? scene.add.text(W / 2 + 190, HERO_Y - 270, 'NEW!', { fontFamily: FONT, fontSize: '54px', color: '#2b1d2e', backgroundColor: '#ffcf33', padding: { x: 14, y: 4 } }).setOrigin(0.5).setAngle(10).setAlpha(0) : null;
  c.add([heroRays, heroGlow, stage, hdr, tapTxt, ribbon]);
  if (heroNew) c.add(heroNew);

  // cards: built once, parked at scale 0; the hero card is laid above the burst
  const built = cards.map((cd) => buildCard(scene, cd));
  built.forEach((b) => c.add(b.card.setScale(0).setAlpha(0).setPosition(W / 2, HERO_Y)));
  c.bringToTop(built[hero].card);
  const flashRect = scene.add.rectangle(W / 2, H / 2, W, H, 0xffffff, 0).setBlendMode(Phaser.BlendModes.NORMAL);
  c.add(flashRect);

  // collect button (one, last)
  const more = scene.totalCrates();
  const bc = scene.add.container(0, 0).setAlpha(0).setVisible(false);
  c.add(bc);
  const collect = () => {
    if (state !== 'done') return;
    const back = scene.crateReturn;
    if (back) {
      scene.crateReturn = null;
      back();
    } else if (more) scene.openNextCrate();
    else scene.openTitle('units');
  };
  scene.button(bc, W / 2, H - 140, 440, 'COLLECT', 0x5fbf4a, collect, 1.15);
  if (more) bc.add(scene.add.text(W / 2, H - 52, `${more} MORE CRATE${more > 1 ? 'S' : ''} WAITING`, { fontFamily: FONT, fontSize: '28px', color: '#ffe3a0', stroke: '#2b1d2e', strokeThickness: 6 }).setOrigin(0.5));

  // ---- code-drawn effects: sparks + ring ----
  const sparks: Spark[] = [];
  const burst = () => {
    const k = calm ? 10 : OPEN_V2.burstSparks;
    const cols = [0xffffff, 0xfff2b0, CRATE[shown].glow, heroRc];
    for (let i = 0; i < k; i++) {
      const a = (i / k) * Math.PI * 2 + Phaser.Math.FloatBetween(-0.2, 0.2), v = Phaser.Math.FloatBetween(380, 1100), sz = Phaser.Math.Between(34, 80);
      const img = scene.add.image(W / 2, HERO_Y, 'omm_glow').setBlendMode(Phaser.BlendModes.ADD).setTint(Phaser.Math.RND.pick(cols)).setDisplaySize(sz, sz);
      c.add(img);
      sparks.push({ img, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 120, age: 0, life: Phaser.Math.Between(520, 900) });
    }
    for (const [r, col, w] of [[420, 0xffffff, 18], [620, CRATE[shown].glow, 28]] as const) {
      const g = scene.add.graphics().setPosition(W / 2, HERO_Y).setBlendMode(Phaser.BlendModes.ADD);
      c.add(g);
      const o = { r: r * 0.25, a: 1 };
      scene.tweens.add({ targets: o, r, a: 0, duration: 520, ease: 'Quad.Out', onUpdate: () => g.clear().lineStyle(w * o.a + 1, col, o.a).strokeCircle(0, 0, o.r), onComplete: () => g.destroy() });
    }
  };
  const stepSparks = (dt: number) => {
    for (let i = sparks.length - 1; i >= 0; i--) {
      const s = sparks[i];
      s.age += dt;
      const t = s.age / s.life, d = Math.pow(0.002, dt / 1000);
      s.vx *= d;
      s.vy = s.vy * d + 260 * (dt / 1000);
      s.img.x += s.vx * (dt / 1000);
      s.img.y += s.vy * (dt / 1000);
      s.img.setAlpha(clamp01(1 - t * t));
      if (t >= 1) (s.img.destroy(), sparks.splice(i, 1));
    }
  };
  const pingAt = (x: number, y: number, col: number, size: number) => {
    const g = scene.add.image(x, y, 'omm_glow').setTint(col).setBlendMode(Phaser.BlendModes.ADD).setDisplaySize(size, size).setAlpha(0.95);
    c.add(g);
    scene.tweens.add({ targets: g, alpha: 0, displayWidth: size * 1.7, displayHeight: size * 1.7, duration: 520, ease: 'Quad.Out', onComplete: () => g.destroy() });
  };

  // ---- the beat machine ----
  type State = 'closed' | 'running' | 'done';
  let state: State = 'closed';
  let bi = -1;
  let el = 0;
  const sped: Partial<Record<BeatId, boolean>> = {};
  const fired = new Set<string>();
  const once = (key: string, fn: () => void) => {
    if (fired.has(key)) return;
    fired.add(key);
    fn();
  };
  const landed = new Set<number>();
  const swapToKind = () => {
    shown = kind;
    whole.setTexture(CRATE[kind].key);
    scene.fitVisible(whole, CRATE_SIZE);
    rays.setTint(tintOf(kind));
    glow.setTint(tintOf(kind));
    latchGlow.setPosition(geoOf(kind).lx, geoOf(kind).ly);
    titleTxt.setText(crateName(kind));
    pingAt(W / 2, HERO_Y, 0xffffff, 520);
    sfx.star?.(2);
  };

  function enter(id: BeatId) {
    if (id === 'anticipation') {
      idle?.stop();
      stopTw(tapLoop);
      scene.tweens.add({ targets: [hdr, tapTxt], alpha: 0, duration: 200 });
      box.setPosition(0, 0);
    } else if (id === 'flash') {
      once('flash', () => {
        box.setVisible(false);
        stage.setAlpha(0);
        burst();
        sfx.chestOpen?.();
        scene.shake('bomb');
      });
    } else if (id === 'hero') {
      once('hero', () => sfx.rarityHit(heroTier));
    } else if (id === 'gather') {
      scene.tweens.add({ targets: [ribbon, ...(heroNew ? [heroNew] : [])], alpha: 0, duration: 160 });
      hdr.each((o: Phaser.GameObjects.GameObject) => o !== titleTxt && o !== sub && (o as Phaser.GameObjects.Container).setVisible(false)); // the ODDS pill is a closed-crate thing
      titleTxt.setText(`${total} CARD${total > 1 ? 'S' : ''}`);
      sub.setText('');
      hdr.setAlpha(0);
      scene.tweens.add({ targets: hdr, alpha: 1, duration: 300 });
    } else if (id === 'settle') {
      bc.setVisible(true);
    }
  }

  const stopTw = (tw: Phaser.Tweens.Tween) => {
    tw.stop();
  };

  function applyBeat(id: BeatId, p: number, ms: number) {
    if (id === 'anticipation') {
      const e = outQuad(p);
      box.setScale(1 + 0.05 * e, 1 - 0.09 * e).setY(14 * e);
      glow.setAlpha(lerp(0.35, 0.5, e));
      latchGlow.setAlpha(0.5 * e);
    } else if (id === 'shake') {
      const amp = lerp(OPEN_V2.shakeDeg[0], OPEN_V2.shakeDeg[1], p * p);
      const ph = Math.PI * 2 * (2 * p + 5 * p * p);
      box.setAngle(calm ? 0 : amp * Math.sin(ph)).setScale(lerp(1.05, 1.1, p), lerp(0.91, 1.08, p)).setPosition(calm ? 0 : amp * 1.4 * Math.sin(ph * 1.3), lerp(14, -6, p));
      glow.setAlpha(lerp(0.5, 1, p)).setDisplaySize(lerp(700, 900, p), lerp(700, 900, p));
      rays.setAlpha(lerp(0.18, 0.75, p));
      latchGlow.setAlpha(lerp(0.5, 1, p)).setDisplaySize(lerp(140, 300, p), lerp(140, 300, p));
      for (let i = 0; i < OPEN_V2.shakeTicks; i++) {
        if (p >= i / OPEN_V2.shakeTicks) {
          once(`tick${i}`, () => {
            sfx.chestShake?.(1 + i * 0.2);
            if (!calm && i >= 3) scene.shake('preview');
          });
        }
      }
      if (from && shown !== kind && p >= 0.55) once('swap', swapToKind);
    } else if (id === 'flash') {
      flashRect.setAlpha(p < 0.4 ? 1 : 1 - (p - 0.4) / 0.6);
      heroGlow.setAlpha(0.6 * p);
    } else if (id === 'hero') {
      const card = built[hero].card, e = outBack(p);
      card.setPosition(W / 2, HERO_Y).setAlpha(clamp01(p * 6)).setScale(Math.max(0, e) * HERO_SCALE).setAngle((1 - p) * -8);
      heroRays.setAlpha(clamp01(p * 1.5) * (0.55 + 0.15 * heroTier)).setDisplaySize(lerp(500, 1300, outQuad(p)), lerp(500, 1300, outQuad(p)));
      heroGlow.setAlpha(lerp(0.6, 0.9, p));
      const pp = clamp01((p - 0.45) / 0.55);
      ribbon.setAlpha(pp).setScale(lerp(1.6, 1, outQuad(pp)));
      if (heroNew) heroNew.setAlpha(pp).setScale(lerp(3, 1, outQuad(pp)));
      if (p >= 0.75) once('heroShake', () => !calm && scene.shake('preview'));
    } else if (id === 'heroHold') {
      const b = 1 + 0.02 * Math.sin(ms / 140);
      built[hero].card.setScale(HERO_SCALE * b).setAngle(0);
    } else if (id === 'gather') {
      const fly = OPEN_V2.gatherFly, st = OPEN_V2.gatherStagger;
      heroRays.setAlpha(lerp(0.55 + 0.15 * heroTier, 0.1, clamp01(p))).setDisplaySize(1300, 1300);
      heroGlow.setAlpha(lerp(0.9, 0.2, clamp01(p)));
      order.forEach((ci, k) => {
        const q = clamp01((ms - k * st) / fly);
        if (q <= 0 && ci !== hero) return;
        const b = built[ci], slot = grid.slots[k], e = outQuad(q);
        const isHero = ci === hero;
        const sx = W / 2, sy = HERO_Y, s0 = isHero ? HERO_SCALE : 0.3;
        b.card.setPosition(lerp(sx, slot.x, e), lerp(sy, slot.y, e) - Math.sin(q * Math.PI) * (isHero ? 30 : 90)).setScale(lerp(s0, grid.scale, e)).setAngle(isHero ? 0 : (1 - e) * (k % 2 ? 14 : -14)).setAlpha(isHero ? 1 : clamp01(q * 5));
        if (q >= 1) land(k, ci);
      });
    } else if (id === 'settle') {
      bc.setAlpha(p);
    }
  }

  function land(k: number, ci: number) {
    if (landed.has(ci)) return;
    landed.add(ci);
    const b = built[ci], slot = grid.slots[k], cd = cards[ci];
    b.card.setPosition(slot.x, slot.y).setScale(grid.scale).setAngle(0).setAlpha(1);
    const hot = cd.isNew || b.tier >= 1;
    if (hot) pingAt(slot.x, slot.y, b.rc, grid.cw * 1.9);
    if (b.tier >= 1) sfx.rarityHit(b.tier);
    else sfx.star?.(Math.min(2, k));
    if (!calm) scene.tweens.add({ targets: b.card, scale: { from: grid.scale * 1.1, to: grid.scale }, duration: 160, ease: 'Back.Out' });
    if (cd.isNew) {
      const st = scene.add.text(slot.x + grid.cw * 0.33, slot.y - grid.ch * 0.47, 'NEW!', { fontFamily: FONT, fontSize: `${Math.round(30 * grid.scale)}px`, color: '#2b1d2e', backgroundColor: '#ffcf33', padding: { x: 9, y: 2 } }).setOrigin(0.5).setAngle(10);
      c.add(st);
      if (!calm) scene.tweens.add({ targets: st, scale: { from: 2.4, to: 1 }, duration: 170, ease: 'Quad.In' });
    }
  }

  function finishLanding() {
    order.forEach((ci, k) => land(k, ci));
  }

  function next() {
    bi++;
    if (bi >= BEATS.length) {
      finishLanding();
      state = 'done';
      bc.setVisible(true).setAlpha(1);
      built.forEach((b, k) => {
        b.card.setSize(176, 220).setInteractive({ useHandCursor: true });
        b.card.on('pointerup', () => showUnitJobPopup(scene, W, H, cards[k].unit, FAMILY_INFO[cards[k].unit as 'cannon'].name.toUpperCase(), scene.meta.units?.[cards[k].unit]?.level ?? 1));
      });
      return;
    }
    el = 0;
    enter(BEATS[bi]);
    applyBeat(BEATS[bi], 0, 0);
  }

  const update = (_t: number, _d: number) => {
    if (!c.active) return;
    const dt = Math.min(100, scene.game.loop.delta) * scene.time.timeScale;
    if (rays.alpha > 0 && !calm && state !== 'done') rays.angle += dt * 0.008;
    if (!calm) heroRays.angle += dt * 0.012;
    stepSparks(dt);
    if (state !== 'running') return;
    const id = BEATS[bi];
    el += dt * (sped[id] && OPEN_V2.speedable[id] ? OPEN_V2.tapSpeed : 1);
    const dur = beatDuration(id, n);
    applyBeat(id, clamp01(el / dur), el);
    if (el >= dur) {
      applyBeat(id, 1, dur);
      next();
    }
  };
  scene.events.on(Phaser.Scenes.Events.UPDATE, update);
  const cleanup = () => {
    scene.events.off(Phaser.Scenes.Events.UPDATE, update);
    scene.tweens.killTweensOf([tapTxt, box]);
  };
  c.once('modalclose', cleanup);
  c.once('destroy', cleanup);

  // ---- input: tap anywhere. Closed: open. Running: speed the current beat (never the hero pop). Done: nothing (COLLECT is the exit). ----
  const onTap = () => {
    if (state === 'closed') {
      state = 'running';
      next();
    } else if (state === 'running') {
      const id = BEATS[bi];
      if (!OPEN_V2.speedable[id]) return;
      sped[id] = true;
      if (id === 'anticipation') sped.shake = true; // a hurried wind-up hurries the shake too
    }
  };
  dim.on('pointerup', onTap);
  whole.setInteractive().on('pointerup', onTap);
}
