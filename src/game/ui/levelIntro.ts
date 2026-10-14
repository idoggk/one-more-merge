/** Level intro popup, UI kit v3 (TUNING.uiKitV3): framed panel, title ribbon, ONE hero picture, minion chips, two lines of text,
 *  tool chips, a big PLAY and the Jumpstart Kit as its own card below. Geometry: levelIntroLayout.ts (pure, tested). */
import Phaser from 'phaser';
import { ATTACK_COPY, BOSSES, chapterBossIdx } from '../../core/boss';
import { BOOSTER_UNLOCK, CAST, BEHAVIOUR_TEXT, MODIFIER_TEXT, MONSTER_INDEX, goalText, LEVELS, newConcepts, starGoals } from '../../content/levels';
import { FAMILY_INFO, TARGET_NAMES } from '../../content/perks';
import { MAX_RANK } from '../../content/tuning';
import { goodHereAll7 as goodHereAll } from '../../content/roster7';
import { sfx, unlockAudio, startMusic } from '../audio';
import { unitTex } from '../unitArt';
import { store } from '../meta';
import { META_KEY } from '../../platform/backup';
import { H, W, mmss } from '../sceneKit';
import type { GameScene } from '../GameScene';
import { clampLines, firstSentence, INTRO_CFG as C, layoutIntro, parseTools, type IntroKind } from './levelIntroLayout';
import type { Rect } from './qaLayout';

const FONT = 'Lilita One, Arial Black';
const INK = 0x2b1d2e;
const INK_CSS = '#3b2533';
const KIND_RIBBON: Record<IntroKind, string> = { normal: 'kit3_ribbon_blue', mini: 'kit3_ribbon_purple', boss: 'kit3_ribbon_red' };
const KIND_TAG: Record<IntroKind, number> = { normal: 0x8e58c9, mini: 0x8e58c9, boss: 0xe8452c };

type Cont = Phaser.GameObjects.Container;

/** A kit frame stretched to `r` (9-slice, so the corners stay crisp); a plain rounded box when the art is missing. */
function frame(scene: GameScene, c: Cont, key: string, r: Rect, inset: number, fallback: number): Phaser.GameObjects.GameObject {
  const go: Phaser.GameObjects.GameObject = scene.hasArt(key)
    ? scene.add.nineslice(r.x + r.w / 2, r.y + r.h / 2, key, undefined, r.w, r.h, inset, inset, inset, inset)
    : scene.add.graphics().fillStyle(INK, 1).fillRoundedRect(r.x, r.y, r.w, r.h, 24).fillStyle(fallback, 1).fillRoundedRect(r.x + 5, r.y + 5, r.w - 10, r.h - 10, 20);
  c.add(go);
  return go;
}

const label = (scene: GameScene, c: Cont, x: number, y: number, t: string, size: number, color = '#ffffff', fit = 0, stroke = true) => {
  const tx = scene.add.text(x, y, t, { fontFamily: FONT, fontSize: `${size}px`, color, stroke: stroke ? INK_CSS : undefined, strokeThickness: stroke ? Math.max(3, size / 7) : 0 }).setOrigin(0.5);
  if (fit && tx.width > fit) tx.setScale(fit / tx.width);
  c.add(tx);
  return tx;
};

/** A dark pill with a gold hairline (name, clock, tag chips). */
function pill(scene: GameScene, c: Cont, r: Rect, fill: number) {
  c.add(scene.add.graphics().fillStyle(INK, 1).fillRoundedRect(r.x, r.y, r.w, r.h, r.h / 2).fillStyle(fill, 1).fillRoundedRect(r.x + 3, r.y + 3, r.w - 6, r.h - 6, (r.h - 6) / 2));
}

/** Fit a texture into a box, centred on (cx, cy). */
function fitImage(scene: GameScene, c: Cont, key: string, cx: number, cy: number, w: number, h: number) {
  if (!scene.textures.exists(key)) return null;
  const im = scene.add.image(cx, cy, key);
  im.setScale(Math.min(w / im.width, h / im.height));
  c.add(im);
  return im;
}

/** A 5-point star: gold when earned, a lit grey when not (the strip behind it is dark). */
function starIcon(g: Phaser.GameObjects.Graphics, x: number, y: number, r: number, filled: boolean) {
  const pts: Phaser.Math.Vector2[] = [];
  for (let k = 0; k < 10; k++) {
    const a = -Math.PI / 2 + (k * Math.PI) / 5;
    const rr = k % 2 ? r * 0.45 : r;
    pts.push(new Phaser.Math.Vector2(x + Math.cos(a) * rr, y + Math.sin(a) * rr));
  }
  g.fillStyle(filled ? 0xffcf33 : 0x8a7d8c, 1).fillPoints(pts, true);
  g.lineStyle(4, filled ? 0x2b1d2e : 0xd9ccdb, 1).strokePoints(pts, true);
}

export function openLevelIntroV3(scene: GameScene, n: number) {
  sfx.cardOpen();
  const def = LEVELS[n - 1];
  if (!def) return;
  const m = scene.meta;
  const hasJump = n >= BOOSTER_UNLOCK.jumpstart_kit && ((m.kits ?? 0) > 0 || Object.keys(m.grants ?? {}).some((k) => k.startsWith('kit')) || !!m.hardUnlocked);
  const miniDef = def.mini_boss ? BOSSES.find((x) => x.id === def.mini_boss) : undefined;
  const isBoss = (n % 10 === 0 && n > 0) || !!miniDef;
  const kind: IntroKind = miniDef ? 'mini' : isBoss ? 'boss' : 'normal';
  const bossDef = miniDef ?? (isBoss ? BOSSES[chapterBossIdx(n)] : null);
  const wv = def.waves ? [...(def.wave_visuals ?? [])] : [];
  const nameOf = (v: string) => (CAST[v] ? CAST[v].name : TARGET_NAMES[MONSTER_INDEX[v] ?? 0]);
  const keyOf = (v: string) => (CAST[v] && scene.hasArt(`mon_${v}`) ? `mon_${v}` : `target_${MONSTER_INDEX[v] ?? 0}`);

  // ---- hero picture and name
  const castV = !bossDef ? scene.castOf(n) : undefined;
  const lastV = wv.length ? wv[wv.length - 1] : undefined;
  const ti = MONSTER_INDEX[def.monster] ?? 0;
  const heroKey = bossDef && scene.hasArt(`boss_${bossDef.id}_intact`) ? `boss_${bossDef.id}_intact` : bossDef ? `target_${ti}` : lastV ? keyOf(lastV) : castV ? `mon_${castV}` : `target_${ti}`;
  const heroName = bossDef ? bossDef.name : lastV ? nameOf(lastV) : castV ? CAST[castV].name : TARGET_NAMES[ti];
  // the machines before the hero, as chips (a boss level's wave list ends at the boss itself)
  const minionVis = (bossDef ? wv : wv.slice(0, -1)).slice(0, C.maxMinions);

  // ---- two lines of text: first sentences of the level's own hint data
  const firstOf: Record<string, number> = { rocket: 6, magnet: 12, battery: 17, fan: 23 };
  const newFam = n === 6 ? 'rocket' : (def.start_extra ?? []).map(([f]) => f).find((f) => firstOf[f] === n);
  const srcLines = bossDef
    ? [bossDef.copy, bossDef.second ? `Final phase: also ${ATTACK_COPY[bossDef.second].what.toLowerCase()}!` : '']
    : [def.goal ? (def.waves ? `Last machine only breaks when you ${goalText(def.goal).toLowerCase()}` : `Goal: ${goalText(def.goal)}`) : '', def.behaviour ? BEHAVIOUR_TEXT[def.behaviour] : MODIFIER_TEXT[def.modifier], newFam ? `New: ${FAMILY_INFO[newFam as 'rocket'].name}. ${FAMILY_INFO[newFam as 'rocket'].text}` : ''];
  const picked = srcLines.filter(Boolean).slice(0, 2).map(firstSentence);
  // two short sentences fill the two lines; one long first sentence wraps onto both and the rest is left out
  const textLines = picked.length >= 2 && picked[0].length <= C.textChars && picked[1].length <= C.textChars ? picked : picked.length ? clampLines(picked[0], C.textChars, C.textLines) : [];
  const tools = parseTools(goodHereAll(def, (u) => scene.ownsUnit(u)));

  // ---- tag, extras
  const fresh = newConcepts(n).length > 0 || !!newFam;
  const tagText = miniDef ? 'MINI-BOSS' : isBoss ? 'BOSS' : fresh ? 'NEW!' : def.difficulty === 'NORMAL' ? '' : def.difficulty === 'HARD' ? 'HARD' : 'MEGA HARD';
  const madeTop = Math.max(0, ...Object.values(m.mastery ?? {}).map((x) => x ?? 0));
  const sc = n === 21 && !(m.lessons ?? {}).showcase7 ? 7 : n === 41 && madeTop < 8 && !(m.lessons ?? {}).showcase8 ? 8 : 0;
  const trial = !sc && !isBoss && n % 10 !== 0 && scene.trialToday() && m.trial!.left > 0 ? m.trial! : null;

  const g = layoutIntro({ H, minions: minionVis.length, tools: tools.length, hasText: textLines.length > 0, hasJump, hasExtra: !!sc || !!trial, hasTag: !!tagText });

  // ---- modal shell: the old sheet's parchment is dropped; the whole stage is dimmed so no HUD shows through
  const c = scene.sheet(10);
  c.removeAll(true);
  c.add(scene.add.rectangle(W / 2, H / 2, W, H, 0x120a10, 0.97).setInteractive());
  frame(scene, c, 'kit3_panel_popup', g.panel, 44, 0xfbe7c6);
  frame(scene, c, 'kit3_panel_well', g.hero, 40, 0x3a2f3c);

  // hero picture (stars strip sits at its bottom edge)
  const hx = g.hero.x + g.hero.w / 2;
  const imgH = g.hero.h - C.starsH - 24;
  fitImage(scene, c, heroKey, hx, g.hero.y + 14 + imgH / 2, g.hero.w - 60, imgH);

  // tag + extra pill (inside the hero's top edge)
  if (g.tag) {
    pill(scene, c, g.tag, KIND_TAG[kind]);
    label(scene, c, g.tag.x + g.tag.w / 2, g.tag.y + g.tag.h / 2, tagText, 28, '#ffffff', g.tag.w - 24, false);
  }
  if (g.extra) {
    const ex = g.extra;
    const nm = trial ? FAMILY_INFO[trial.unit as 'cannon'].name.toUpperCase() : '';
    const txt = sc ? `NEW: RANK ${sc}  ·  try it first ›` : trial!.on ? `✓ ${nm} TRIAL ON  ·  ${trial!.left} left` : `TRY ${nm} LV 5  ·  ${trial!.left} free today`;
    pill(scene, c, ex, sc || trial!.on ? 0x5fbf4a : 0x8e58c9);
    label(scene, c, ex.x + ex.w / 2, ex.y + ex.h / 2, txt, 24, '#ffffff', ex.w - 30, false);
    const z = scene.add.zone(ex.x + ex.w / 2, ex.y + ex.h / 2, ex.w, Math.max(ex.h, 88)).setInteractive({ useHandCursor: true });
    z.on('pointerup', () => {
      if (sc) return scene.startShowcase(sc as 7 | 8, n);
      trial!.on = !trial!.on;
      store(META_KEY, JSON.stringify(scene.meta));
      openLevelIntroV3(scene, n);
    });
    c.add(z);
  }

  // star goals strip
  const have = (m.levelStars ?? {})[String(n)] ?? 0;
  const [g2, g3] = starGoals(def);
  const goals = ['Clear', `≤${mmss(g2)}`, `≤${mmss(g3)}`];
  const sg = scene.add.graphics();
  sg.fillStyle(0x000000, 0.45).fillRoundedRect(g.stars.x, g.stars.y, g.stars.w, g.stars.h, g.stars.h / 2);
  c.add(sg);
  const sw = g.stars.w / 3;
  goals.forEach((t, k) => {
    const cx = g.stars.x + sw * k + sw / 2;
    starIcon(sg, cx - 52, g.stars.y + g.stars.h / 2, 18, k < have);
    label(scene, c, cx + 14, g.stars.y + g.stars.h / 2, t, 26, k < have ? '#ffcf33' : '#ffffff', sw - 90, false);
  });

  // name and clock chips
  pill(scene, c, g.name, INK);
  label(scene, c, g.name.x + g.name.w / 2, g.name.y + g.name.h / 2, heroName, 34, '#ffffff', g.name.w - 36, false);
  pill(scene, c, g.clock, INK);
  const clockT = label(scene, c, g.clock.x + g.clock.w / 2 + 18, g.clock.y + g.clock.h / 2, mmss(bossDef && !miniDef && !def.waves ? 90 : def.time_seconds), 32, '#ffcf33', g.clock.w - 80, false);
  if (scene.hasArt('icon_timer')) fitImage(scene, c, 'icon_timer', g.clock.x + 38, g.clock.y + g.clock.h / 2, 36, 36);
  else label(scene, c, g.clock.x + 38, g.clock.y + g.clock.h / 2, '⏱', 30, '#ffffff', 0, false);
  clockT.setOrigin(0.5);

  // minion chips with their rank numbers
  g.minions.forEach((r, i) => {
    frame(scene, c, 'kit3_panel_well', r, 30, 0x3a2f3c);
    fitImage(scene, c, keyOf(minionVis[i]), r.x + r.w / 2, r.y + r.h / 2 - 4, r.w - 22, r.h - 22);
    const b: Rect = { x: r.x + r.w - 34, y: r.y + r.h - 34, w: 40, h: 40 };
    c.add(scene.add.graphics().fillStyle(INK, 1).fillCircle(b.x + b.w / 2, b.y + b.h / 2, 22).fillStyle(0xffcf33, 1).fillCircle(b.x + b.w / 2, b.y + b.h / 2, 18));
    label(scene, c, b.x + b.w / 2, b.y + b.h / 2 + 1, `${i + 1}`, 26, INK_CSS, 0, false);
  });

  // the two lines
  let textObj: Phaser.GameObjects.Text | null = null;
  const showText = (lines: string[], color = INK_CSS) => {
    if (!g.text) return;
    textObj?.destroy();
    textObj = scene.add.text(g.text.x + g.text.w / 2, g.text.y + g.text.h / 2, lines.join('\n'), { fontFamily: 'Arial', fontStyle: 'bold', fontSize: `${C.textFont}px`, color, align: 'center', lineSpacing: C.textLine - C.textFont - 6 }).setOrigin(0.5);
    if (textObj.width > g.text.w) textObj.setScale(g.text.w / textObj.width);
    c.add(textObj);
  };
  showText(textLines);

  // tool chips: icon + 1 word; a tap swaps the two lines for the full line, then back
  let back: Phaser.Time.TimerEvent | null = null;
  g.tools.forEach((r, i) => {
    const t = tools[i];
    frame(scene, c, 'kit3_panel_well', r, 30, 0x3a2f3c);
    const id = t.name.toLowerCase().replace(/ /g, '_');
    const key = unitTex(scene, `${id}_1`);
    fitImage(scene, c, key, r.x + r.w / 2, r.y + 36, r.w - 44, 50);
    label(scene, c, r.x + r.w / 2, r.y + r.h - 27, t.label, 19, '#ffffff', r.w - 34, false);
    const z = scene.add.zone(r.x + r.w / 2, r.y + r.h / 2, r.w, Math.max(r.h, 88)).setInteractive({ useHandCursor: true });
    z.on('pointerup', () => {
      sfx.click();
      back?.remove();
      showText(clampLines(t.full, C.textChars, C.textLines), '#8e58c9');
      back = scene.time.delayedCall(4000, () => showText(textLines));
    });
    c.add(z);
  });

  // PLAY, in the kit's green
  let jump = false;
  const pc = scene.add.container(g.play.x + g.play.w / 2, g.play.y + g.play.h / 2);
  const hasBtn = scene.hasArt('btn_green');
  if (hasBtn) {
    const im = scene.add.image(0, 0, 'btn_green');
    im.setScale(Math.min(g.play.h / im.height, g.play.w / im.width));
    pc.add(im);
    pc.setData('im', im);
  } else pc.add(scene.add.graphics().fillStyle(INK, 1).fillRoundedRect(-g.play.w / 2, -g.play.h / 2, g.play.w, g.play.h, 36).fillStyle(0x5fbf4a, 1).fillRoundedRect(-g.play.w / 2 + 6, -g.play.h / 2 + 6, g.play.w - 12, g.play.h - 12, 30));
  pc.add(scene.add.text(0, -2, 'PLAY', { fontFamily: FONT, fontSize: '56px', color: '#fff', stroke: INK_CSS, strokeThickness: 8 }).setOrigin(0.5));
  pc.setSize(g.play.w, g.play.h).setInteractive({ useHandCursor: true });
  pc.on('pointerdown', () => {
    unlockAudio();
    startMusic();
    sfx.click();
    pc.setScale(0.96);
  });
  pc.on('pointerup', () => {
    pc.setScale(1);
    scene.startLevel(n, jump);
  });
  pc.on('pointerout', () => pc.setScale(1));
  c.add(pc);

  // title ribbon (over the panel's top edge) and the close button
  const rb = g.ribbon;
  if (scene.hasArt(KIND_RIBBON[kind])) c.add(scene.add.image(rb.x + rb.w / 2, rb.y + rb.h / 2, KIND_RIBBON[kind]).setDisplaySize(rb.w, rb.h));
  else c.add(scene.add.graphics().fillStyle(INK, 1).fillRoundedRect(rb.x, rb.y + 20, rb.w, rb.h - 50, 20));
  label(scene, c, rb.x + rb.w / 2, rb.y + rb.h * 0.47, `LEVEL ${n}`, 54, '#ffffff', rb.w - 150);
  const cl = g.close;
  c.add(scene.add.graphics().fillStyle(INK, 1).fillCircle(cl.x + cl.w / 2, cl.y + cl.h / 2, 34).fillStyle(0xe8452c, 1).fillCircle(cl.x + cl.w / 2, cl.y + cl.h / 2, 29));
  label(scene, c, cl.x + cl.w / 2, cl.y + cl.h / 2 - 1, '✕', 40, '#ffffff', 0, false);
  const cz = scene.add.zone(cl.x + cl.w / 2, cl.y + cl.h / 2, cl.w, cl.h).setInteractive({ useHandCursor: true });
  cz.on('pointerup', () => scene.openTitle());
  c.add(cz);

  // Jumpstart Kit: its own card below the panel, switch OFF by default every attempt
  if (g.jump && g.toggle) {
    const kits = m.kits ?? 0;
    const j = g.jump;
    frame(scene, c, 'kit3_panel_popup', j, 40, 0xfbe7c6);
    if (scene.hasArt('booster_jumpstart')) fitImage(scene, c, 'booster_jumpstart', j.x + 76, j.y + j.h / 2 - 6, 84, 84);
    label(scene, c, j.x + 108, j.y + j.h - 34, `x${kits}`, 26, INK_CSS, 0, false);
    const tx = j.x + 140;
    const t1 = scene.add.text(tx, j.y + 40, 'Jumpstart Kit', { fontFamily: FONT, fontSize: '32px', color: INK_CSS }).setOrigin(0, 0.5);
    const t2 = scene.add.text(tx, j.y + 82, `Starting shooters: rank ${def.starting_rank} → ${Math.min(MAX_RANK, def.starting_rank + 1)}`, { fontFamily: 'Arial', fontStyle: 'bold', fontSize: '22px', color: '#5a4a5a' }).setOrigin(0, 0.5);
    const room = g.toggle.x - tx - 12;
    for (const t of [t1, t2]) if (t.width > room) t.setScale(room / t.width);
    c.add([t1, t2]);
    const tg = g.toggle;
    const tgl = scene.hasArt('kit3_toggle_on') ? scene.add.image(tg.x + tg.w / 2, tg.y + tg.h / 2, 'kit3_toggle_off') : null;
    if (tgl) {
      tgl.setScale(Math.min(tg.w / tgl.width, tg.h / tgl.height));
      c.add(tgl);
    }
    const z = scene.add.zone(tg.x + tg.w / 2, tg.y + tg.h / 2, tg.w, tg.h).setInteractive({ useHandCursor: true });
    z.on('pointerup', () => {
      if (kits <= 0) return scene.showToast('GET KITS FROM LEVELS OR THE SHOP (TAP THE TOP BAR)');
      jump = !jump;
      sfx.click();
      tgl?.setTexture(jump ? 'kit3_toggle_on' : 'kit3_toggle_off');
    });
    c.add(z);
  }
}
