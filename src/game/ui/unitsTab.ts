import Phaser from 'phaser';
import { FAMILY_INFO } from '../../content/perks';
import type { Family } from '../../core/types';
import { sfx } from '../audio';
import * as tlog from '../../platform/telemetry';
import { META_KEY } from '../../platform/backup';
import { boltsFor, cardsFor, COLLECTION_GOALS, CRATES, FEATURED_CRATE, UNIT_PERKS, levelPerkText, MAX_UNIT_LEVEL, SHOP, UNITS, type CrateKind, type UnitDef, RARITY_COLOR, LATCH_B, CRATES_B } from '../../content/units';
import { Rng } from '../../core/rng';
import { featuredGemUnit, featuredUnit, rollCrate, rollFeatured, rollPack, type CrateCard, openCrateB } from '../../core/crates';
import { localDate, store } from '../meta';
import { GUIDE, unitsTitle, relayLockNote } from '../../content/sceneCopy';
import type { GameScene } from '../GameScene';
import { W, H, PUZZLES } from '../sceneKit';
import { addUnitJob, addMergedLine, showUnitJobPopup } from './unitJobUi';
import { addCards, cardsAvailable, spareOf, spendCards, sweepSpare } from '../../core/spareParts';
import { unitJob } from '../../content/unitJobs';
import { ROSTER_1_GUIDE, ROSTER_1_INFO } from '../../content/roster1';
import { ROSTER_2_GUIDE, ROSTER_2_INFO } from '../../content/roster2';
import { ROSTER_3_GUIDE, ROSTER_3_INFO } from '../../content/roster3';
import { TUNING } from '../../content/tuning';
import { crateName, latchRollUp, popToolboxLatch, toolboxCrateKey, toolboxOn } from '../fx/toolboxCrates';
import { pctB, pityView, guaranteeText } from '../../core/crateOdds';
import { addOddsButton, showOddsPanel } from './oddsPanel';

export function openUnitsTab(scene: GameScene) {
  scene.closeModal();
  const c = scene.add.container(0, 0).setDepth(100);
  if (scene.homeC?.active) scene.homeC.destroy();
  scene.homeC = c;
  scene.modal = c;
  const bg = scene.add.image(W / 2, 0, scene.hasArt('road_bg') ? 'road_bg' : 'hero_bg').setOrigin(0.5, 0);
  bg.setScale(Math.max(W / bg.width, H / bg.height));
  c.add([bg, scene.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.001).setInteractive()]);
  scene.drawWallet(c);
  c.add(scene.add.text(W / 2, 160, unitsTitle(scene.meta.units, UNITS), { fontFamily: 'Lilita One, Arial Black', fontSize: '52px', color: '#3b2533', stroke: '#fff0cf', strokeThickness: 4 }).setOrigin(0.5));
  // crates + shop row
  const crates = scene.totalCrates();
  scene.button(c, W / 2 - 150, 232, 260, crates ? `OPEN CRATE (${crates})` : 'NO CRATES', crates ? 0x5fbf4a : 0x81736c, () => (crates ? scene.openNextCrate() : scene.showToast('WIN BOSSES, BOUNTIES AND CHESTS FOR CRATES')), 0.7);
  scene.button(c, W / 2 + 150, 232, 260, 'SHOP', 0x8e58c9, () => scene.openUnitShop(), 0.7);
  scene.collectionStrip(c, 304);
  // owned units: 4 columns of slightly smaller cards
  // t-2fd7bb86: units you don't own yet are a row of small locked silhouettes, not 13 full cards on day 1
  const owned = UNITS.filter((u) => scene.ownsUnit(u.id));
  const locked = UNITS.filter((u) => !scene.ownsUnit(u.id));
  // UI audit (375x667): the last row hid under the bottom nav, so the
  // rows fit between the collection strip and the nav (cards shrink a little on short phones)
  const rows = Math.ceil(owned.length / 4), gridTop = 342;
  const pitch = Math.min(232, (H - 122 - gridTop) / rows), k0 = Math.min(0.8, (pitch - 12) / 274);
  owned.forEach((u, k) => {
    const x = W / 2 + ((k % 4) - 1.5) * 172, y = gridTop + (Math.floor(k / 4) + 0.5) * pitch;
    c.add(scene.unitCard(u, x, y).setScale(k0));
  });
  if (locked.length) {
    // F8: the label sits under the last card row (card art is 274 tall at scale k0), not across its bottom edge
    const ly = gridTop + (rows - 0.5) * pitch + 137 * k0 + 24;
    c.add(scene.add.text(W / 2, ly, `LOCKED (${locked.length})  ·  find them in crates`, { fontFamily: 'Lilita One, Arial Black', fontSize: '24px', color: '#3b2533', stroke: '#fff0cf', strokeThickness: 4 }).setOrigin(0.5));
    const per = 7, step = 92;
    locked.forEach((u, k) => {
      const row = Math.floor(k / per), inRow = Math.min(per, locked.length - row * per);
      const x = W / 2 + ((k % per) - (inRow - 1) / 2) * step, y = ly + 66 + row * 96;
      const t = scene.add.container(x, y);
      t.add(scene.add.graphics().fillStyle(0x2b1d2e, 0.85).fillRoundedRect(-42, -42, 84, 84, 16));
      const art = scene.unitPortrait(u.id);
      if (scene.textures.exists(art)) t.add(scene.fitVisible(scene.add.image(0, 0, art), 66).setTintFill(0x8a7a8a).setAlpha(0.5));
      t.add(scene.add.text(0, 0, '\u{1F512}', { fontSize: '28px' }).setOrigin(0.5));
      t.setSize(84, 84).setInteractive({ useHandCursor: true });
      t.on('pointerup', () => (sfx.click(), scene.openUnitDetail(u)));
      c.add(t);
    });
  }
  scene.drawNav(c, 'units');
}

export function collectionStrip(scene: GameScene, c: Phaser.GameObjects.Container, y: number) {
  const m = scene.meta;
  const i = m.collClaimed ?? 0;
  const goal = COLLECTION_GOALS[i];
  const g = scene.add.graphics().fillStyle(0x2b1d2e, 0.88).fillRoundedRect(40, y - 30, W - 80, 60, 20);
  c.add(g);
  if (!goal) {
    c.add(scene.add.text(W / 2, y, 'COLLECTION COMPLETE  \u2605', { fontFamily: 'Lilita One, Arial Black', fontSize: '26px', color: '#ffcf33' }).setOrigin(0.5));
    return;
  }
  const p = scene.collectionProgress();
  const have = goal.kind === 'own' ? p.own : p.levels;
  const done = have >= goal.n;
  const r = goal.reward;
  const prize = r.crate ? `${r.crate.toUpperCase()} CRATE` : r.gems ? `${r.gems} GEMS` : `${r.bolts} BOLTS`;
  const what = goal.kind === 'own' ? 'UNITS OWNED' : 'TOTAL UNIT LEVELS';
  // progress fill under the text
  g.fillStyle(0x5fbf4a, 0.45).fillRoundedRect(44, y - 26, (W - 88) * Math.min(1, have / goal.n), 52, 17);
  c.add(scene.add.text(64, y, `${Math.min(have, goal.n)}/${goal.n} ${what}  \u00b7  ${prize}`, { fontFamily: 'Lilita One, Arial Black', fontSize: '22px', color: '#fff0cf' }).setOrigin(0, 0.5));
  if (done)
    scene.button(c, W - 120, y, 150, 'CLAIM', 0x5fbf4a, () => {
      m.collClaimed = i + 1;
      if (r.bolts) m.bolts = (m.bolts ?? 0) + r.bolts;
      if (r.gems) m.gems = (m.gems ?? 0) + r.gems;
      if (r.crate) scene.giveCrate(r.crate);
      store(META_KEY, JSON.stringify(m));
      tlog.log('collection_claim', { i, prize });
      sfx.star?.(3);
      scene.showToast(`COLLECTION: +${prize}`);
      scene.openUnitsTab();
    }, 0.55);
}

/** r39 (ChatGPT art review): ONE canonical portrait per unit everywhere (collection, crate reveal): the rank tier
 *  that matches its level (unowned = rank 3 silhouette). */
export function unitPortrait(scene: GameScene, id: string) {
  const st = scene.meta.units?.[id];
  return `${id}_${st && st.level >= 1 ? Math.min(6, 1 + Math.floor((st.level - 1) / 2)) : 3}`;
}

export function unitCard(scene: GameScene, u: UnitDef, x: number, y: number) {
  const st = scene.meta.units?.[u.id];
  const owned = !!st && st.level >= 1;
  const cc = scene.add.container(x, y);
  const rc = RARITY_COLOR[u.rarity];
  cc.add(scene.add.graphics().fillStyle(0x2b1d2e, 1).fillRoundedRect(-102, -132, 204, 268, 22).fillStyle(rc, 1).fillRoundedRect(-98, -128, 196, 260, 19).fillStyle(0xfbe7c6, 1).fillRoundedRect(-90, -100, 180, 170, 14));
  cc.add(scene.add.text(0, -114, u.rarity.toUpperCase(), { fontFamily: 'Lilita One, Arial Black', fontSize: '16px', color: '#ffffff' }).setOrigin(0.5));
  const art = scene.unitPortrait(u.id);
  if (scene.textures.exists(art)) {
    const im = scene.fitVisible(scene.add.image(0, -16, art), 140);
    if (!owned) im.setTint(0x2b1d2e).setAlpha(0.6);
    cc.add(im);
  }
  addUnitJob(scene, cc, u.id, 0, 58);
  // r38 rarity frame art (ChatGPT v22, transparent centre) over the card edge
  if (scene.hasArt(`card_${u.rarity}`)) cc.add(scene.add.image(0, 2, `card_${u.rarity}`).setDisplaySize(214, 274));
  cc.add(scene.add.text(0, 88, owned ? FAMILY_INFO[u.id as 'cannon'].name.toUpperCase().replace('SIGNAL ', '') : '???', { fontFamily: 'Lilita One, Arial Black', fontSize: '24px', color: '#ffffff', stroke: '#2b1d2e', strokeThickness: 5 }).setOrigin(0.5));
  if (owned) {
    cc.add(scene.add.text(-78, -72, `LV ${st!.level}`, { fontFamily: 'Lilita One, Arial Black', fontSize: '22px', color: '#ffffff', backgroundColor: '#2b1d2e', padding: { x: 6, y: 2 } }).setOrigin(0, 0.5));
    const need = st!.level >= MAX_UNIT_LEVEL ? 0 : cardsFor(u, st!.level);
    const have = cardsAvailable(scene.meta, u.id);
    const frac = need ? Math.min(1, have / need) : 1;
    const bar = scene.add.graphics().fillStyle(0x2b1d2e, 1).fillRoundedRect(-84, 108, 168, 20, 10).fillStyle(scene.canUpgrade(u) ? 0x5fbf4a : 0x3a8adf, 1).fillRoundedRect(-82, 110, Math.max(14, 164 * frac), 16, 8);
    cc.add(bar);
    cc.add(scene.add.text(0, 118, need ? `${have}/${need}` : 'MAX', { fontFamily: 'Lilita One, Arial Black', fontSize: '16px', color: '#ffffff', stroke: '#2b1d2e', strokeThickness: 4 }).setOrigin(0.5));
    if (scene.canUpgrade(u)) {
      const up = scene.add.text(70, -112, '\u2191', { fontFamily: 'Arial Black', fontSize: '30px', color: '#ffffff', backgroundColor: '#5fbf4a', padding: { x: 8, y: 0 } }).setOrigin(0.5);
      cc.add(up);
      scene.tweens.add({ targets: up, y: -118, duration: 500, yoyo: true, repeat: -1 });
    }
  } else {
    // UI audit: the loose Arial caption spilled past the frame onto '???'; it now sits in the same pill as the owned card's bar
    cc.add(scene.add.graphics().fillStyle(0x2b1d2e, 1).fillRoundedRect(-84, 108, 168, 20, 10));
    cc.add(scene.add.text(0, 118, 'IN CRATES', { fontFamily: 'Lilita One, Arial Black', fontSize: '16px', color: '#ffffff' }).setOrigin(0.5));
  }
  cc.setSize(204, 268).setInteractive({ useHandCursor: true });
  cc.on('pointerup', () => (sfx.click(), scene.openUnitDetail(u)));
  return cc;
}

export function openUnitDetail(scene: GameScene, u: UnitDef) {
  const st = scene.meta.units?.[u.id];
  const owned = !!st && st.level >= 1;
  scene.closeModal();
  const c = scene.panel(1180);
  const top = H / 2 - 590;
  const info = FAMILY_INFO[u.id as 'cannon'];
  c.add(scene.add.text(W / 2, top + 60, owned ? info.name.toUpperCase() : '???', { fontFamily: 'Lilita One, Arial Black', fontSize: '52px', color: '#2a2233' }).setOrigin(0.5));
  c.add(scene.add.text(W / 2, top + 112, `${u.rarity.toUpperCase()}  \u00b7  ${u.role}  \u00b7  JOB: ${unitJob(u.id)?.job ?? '?'}${owned ? `  \u00b7  LEVEL ${st!.level}` : ''}`, { fontFamily: 'Lilita One, Arial Black', fontSize: '24px', color: '#7a5a4a' }).setOrigin(0.5));
  addMergedLine(scene, c, u.id, st?.level ?? 1, W / 2, top + 140, W - 120);
  // the animated mini-board explains it
  const gi = GUIDE.find((g) => g.key === u.id) ?? ROSTER_1_GUIDE[u.id] ?? ROSTER_2_GUIDE[u.id] ?? ROSTER_3_GUIDE[u.id];
  // roster B: the job shape icon + job word beside the name
  const rb = ROSTER_1_INFO[u.id as keyof typeof ROSTER_1_INFO] ?? ROSTER_2_INFO[u.id as keyof typeof ROSTER_2_INFO] ?? ROSTER_3_INFO[u.id as keyof typeof ROSTER_3_INFO];
  if (owned && rb && scene.textures.exists(`job_${u.id}`)) c.add([scene.add.image(W / 2 + 290, top + 60, `job_${u.id}`).setScale(0.9), scene.add.text(W / 2 + 290, top + 102, rb.job, { fontFamily: 'Lilita One, Arial Black', fontSize: '20px', color: '#7a5a4a' }).setOrigin(0.5)]);
  if (owned && gi) {
    scene.machineDemo(c, W / 2, top + 392, u.id); // +62: room for the WHEN MERGED line above the demo monster
    c.add(scene.add.text(W / 2, top + 574, gi.text, { fontFamily: 'Arial', fontStyle: 'bold', fontSize: '24px', color: '#3b2533', align: 'center', wordWrap: { width: W - 160 }, lineSpacing: 4 }).setOrigin(0.5, 0));
  } else {
    // UI audit: the locked page was an empty cream sheet; show the same dark silhouette as the collection card
    const art = scene.unitPortrait(u.id);
    if (scene.textures.exists(art)) c.add(scene.fitVisible(scene.add.image(W / 2, top + 340, art), 220).setTint(0x2b1d2e).setAlpha(0.6));
    c.add(scene.add.text(W / 2, top + 540, 'Find this unit in a crate\nto unlock it.', { fontFamily: 'Lilita One, Arial Black', fontSize: '34px', color: '#7a5a4a', align: 'center' }).setOrigin(0.5));
  }
  // r32 milestone perks: L3 / L6 / L9, lit when reached (unreached lines darker brown: light grey on cream was unreadable)
  (UNIT_PERKS[u.id] ?? []).forEach(([name, txt], i) => {
    const need = [3, 6, 9][i];
    const got = owned && st!.level >= need;
    c.add(scene.add.text(W / 2, top + 704 + i * 42, `LV${need}  ${name}: ${txt}`, { fontFamily: 'Lilita One, Arial Black', fontSize: '22px', color: got ? '#2a8a3a' : '#6e5646', wordWrap: { width: W - 140 }, align: 'center' }).setOrigin(0.5));
  });
  if (owned) {
    const lv = st!.level;
    c.add(scene.add.text(W / 2, top + 832, lv >= MAX_UNIT_LEVEL ? `${levelPerkText(u, lv)}  \u00b7  MAX LEVEL` : `${levelPerkText(u, lv)}  \u2192  ${levelPerkText(u, lv + 1)} at LV ${lv + 1}`, { fontFamily: 'Lilita One, Arial Black', fontSize: '28px', color: '#2a8a3a' }).setOrigin(0.5));
    if (lv < MAX_UNIT_LEVEL) {
      const needC = cardsFor(u, lv), needB = boltsFor(u, lv);
      const ok = scene.canUpgrade(u);
      const spare = TUNING.rosterB ? spareOf(scene.meta, u.rarity) : 0;
      c.add(scene.add.text(W / 2, top + 886, `${st!.cards}/${needC} cards${spare ? ` + ${spare} spare ${u.rarity} parts` : ''}  \u00b7  ${needB} Bolts`, { fontFamily: 'Lilita One, Arial Black', fontSize: '26px', color: ok ? '#3b2533' : '#9a7a6a' }).setOrigin(0.5));
      scene.button(c, W / 2, top + 974, 420, ok ? `UPGRADE TO LV ${lv + 1}` : cardsAvailable(scene.meta, u.id) < needC ? 'NEED MORE CARDS' : 'NEED MORE BOLTS', ok ? 0x5fbf4a : 0x8a6a4a, () => (ok ? scene.upgradeUnit(u) : scene.showToast(cardsAvailable(scene.meta, u.id) < needC ? 'OPEN CRATES FOR CARDS' : 'WIN LEVELS FOR BOLTS')), 0.9);
    }
  }
  // r42 Unit Drills (Ido: "challenges connected to a unit when we unlock it")
  const drills = PUZZLES.drills[u.id] ?? [];
  if (scene.ownsUnit(u.id) && drills.length) {
    const done = drills.filter((p) => scene.puzzleRec().drills.includes(p.id)).length;
    scene.button(c, W / 2 - 150, top + 1100, 260, `DRILLS ${done}/${drills.length}`, 0x8e58c9, () => scene.openDrills(u), 0.8);
    scene.button(c, W / 2 + 150, top + 1100, 240, 'BACK', 0x8a6a4a, () => scene.openTitle('units'), 0.8);
  } else scene.button(c, W / 2, top + 1100, 280, 'BACK', 0x8a6a4a, () => scene.openTitle('units'), 0.8);
  tlog.log('unit_detail', { unit: u.id, owned });
}

export function upgradeUnit(scene: GameScene, u: UnitDef) {
  const m = scene.meta;
  const st = m.units![u.id];
  const needC = cardsFor(u, st.level), needB = boltsFor(u, st.level);
  if (cardsAvailable(m, u.id) < needC || (m.bolts ?? 0) < needB) return;
  spendCards(m, u.id, needC); // own cards first, then (ROSTER B) Spare Parts of its rarity
  m.bolts = (m.bolts ?? 0) - needB;
  st.level++;
  sweepSpare(m, u.id); // reaching level 10: the cards left over become Spare Parts
  scene.seasonEv('unitUp');
  store(META_KEY, JSON.stringify(m));
  tlog.log('unit_upgrade', { unit: u.id, level: st.level, bolts: needB, cards: needC });
  sfx.win();
  scene.openUnitDetail(u);
  scene.floatText(W / 2, H / 2 - 300, `LEVEL ${st.level}!`, '#ffcf33', 64, 600, 'banner_destroyed');
}

export function openNextCrate(scene: GameScene) {
  const m = scene.meta;
  const kind = (['bench', 'gold', 'iron', 'wood'] as CrateKind[]).find((k) => (m.crates?.[k] ?? 0) > 0);
  if (!kind) return;
  m.crates![kind] = (m.crates![kind] ?? 1) - 1;
  scene.openCrate(kind);
}

/** Roll, apply and present a crate: shake, burst, then each card flips in; NEW units unlock on the spot. */
export function openCrate(scene: GameScene, kind: CrateKind) {
  const m = scene.meta;
  if (kind === 'iron' && !m.unitChoiceDone && UNITS.some((u) => u.rarity === 'rare' && !scene.ownsUnit(u.id))) {
    m.unitChoiceDone = true;
    return scene.openUnitChoice(() => scene.openCrate(kind));
  }
  m.crateSeq = (m.crateSeq ?? 0) + 1;
  const owned = new Set(Object.entries(m.units ?? {}).filter(([, v]) => v.level >= 1).map(([k]) => k as Family));
  m.pity = m.pity ?? { epic: 0, dry: 0 };
  // r32 early guarantees (ChatGPT): a Gold crate brings an Epic while the player owns none (ROSTER B: the Tool Chest always does)
  if (!TUNING.rosterB && kind === 'gold' && !UNITS.some((u) => u.rarity === 'epic' && owned.has(u.id))) m.pity.epic = Math.max(m.pity.epic, 6);
  const seed = (Date.now() ^ (m.crateSeq * 2654435761)) >>> 0;
  // ROSTER B: a Tool Bag makes its ONE latch roll first; the crate that opens is `opened` and its own odds / pity apply
  let opened = kind, latchedFrom: CrateKind | undefined;
  let cards: CrateCard[];
  if (TUNING.rosterB) {
    const r = openCrateB(kind, owned, seed, m.pity);
    opened = r.opened;
    cards = r.cards;
    if (r.latched) latchedFrom = kind;
  } else cards = rollCrate(kind, owned, seed, m.pity);
  // ...and the first Wood crate always shows that crates unlock playable units: Horn
  if (opened === 'wood' && !owned.has('horn')) {
    const first = cards[cards.length - 1];
    if (first.count > 1) first.count--;
    else cards = cards.slice(0, -1);
    cards = [{ unit: 'horn', count: 1, isNew: true }, ...cards];
  }
  scene.applyCards(cards);
  tlog.log('crate_open', { kind, opened, cards: cards.map((x) => `${x.unit}x${x.count}${x.isNew ? '*' : ''}`), pity: { ...m.pity } });
  scene.presentCrate(opened, cards, undefined, latchedFrom);
}

export function applyCards(scene: GameScene, cards: CrateCard[]) {
  const m = scene.meta;
  m.units = m.units ?? {};
  // r42: a newly unlocked unit opens its drills
  const fresh = cards.filter((cd) => cd.isNew && (PUZZLES.drills[cd.unit] ?? []).length && !scene.ownsUnit(cd.unit));
  if (fresh.length) scene.time.delayedCall(2600, () => scene.showToast(`NEW DRILLS: ${fresh.map((cd) => FAMILY_INFO[cd.unit as 'cannon'].name.toUpperCase()).join(', ')} (UNIT PAGE)`));
  const spare = addCards(m, cards); // ROSTER B: duplicates past level 10 become Spare Parts
  if (spare) scene.time.delayedCall(1200, () => scene.showToast(`+${spare} SPARE PARTS  ·  WILD CARDS FOR THEIR RARITY`));
  store(META_KEY, JSON.stringify(m));
  scene.checkUnlocks(); // the first new unit opens TEAM
}

export function openPack(scene: GameScene, packId: string, role?: UnitDef['slot']) {
  const m = scene.meta;
  const spec = SHOP.boltPacks.find((p) => p.id === packId)!;
  if ((m.bolts ?? 0) < spec.bolts) return scene.showToast('NOT ENOUGH BOLTS');
  m.bolts = (m.bolts ?? 0) - spec.bolts;
  m.crateSeq = (m.crateSeq ?? 0) + 1;
  const owned = new Set(Object.entries(m.units ?? {}).filter(([, v]) => v.level >= 1).map(([k]) => k as Family));
  const cards = rollPack(packId, owned, (Date.now() ^ (m.crateSeq * 2654435761)) >>> 0, { role, featured: featuredUnit(localDate(), owned) });
  scene.applyCards(cards);
  tlog.log('pack_open', { packId, role, cards: cards.map((x) => `${x.unit}x${x.count}`) });
  scene.presentCrate('wood', cards, spec.name);
}

/** `from` = the Tool Bag whose latch rolled up into `kind` (ROSTER B): it shows as the bag first, then pops into `kind`. */
export function presentCrate(scene: GameScene, kind: CrateKind, cards: CrateCard[], title?: string, from?: CrateKind) {
  scene.closeModal();
  const c = scene.panel(1000);
  const top = H / 2 - 500;
  const shown = from ?? kind; // the crate on screen until the latch pops
  const titleTxt = scene.add.text(W / 2, top + 60, title ?? crateName(shown), { fontFamily: 'Lilita One, Arial Black', fontSize: '50px', color: '#3b2533' }).setOrigin(0.5);
  c.add(titleTxt);
  // ROSTER B: the latch chances are on screen before the bag opens (the roll itself was made before this screen)
  if (TUNING.rosterB && !title && shown === 'wood') c.add(scene.add.text(W / 2, top + 112, `LATCH ROLL  \u00b7  Toolbox+ ${pctB(LATCH_B.iron)}  \u00b7  Chest+ ${pctB(LATCH_B.gold)}  \u00b7  Workbench ${pctB(LATCH_B.bench)}`, { fontFamily: 'Lilita One, Arial Black', fontSize: '21px', color: '#7a5a4a' }).setOrigin(0.5));
  if (!title) addOddsButton(scene, c, W - 100, top + 60, () => showOddsPanel(scene, W, H, pityView(scene.meta), kind));
  const col = { wood: 0xa0703a, iron: 0x7a8a9a, gold: 0xe0b040, bench: 0xf0b020 }[shown];
  const box = scene.add.container(W / 2, top + 260);
  // r38 crate art (ChatGPT v22): closed crate shakes, swaps to its open art, then the cards fly out.
  // No closed gold crate yet: the iron crate tinted gold stands in.
  scene.seasonEv('crateOpen');
  const tbx = toolboxOn(); // t-33f4fe2e QA: baked procedural toolbox crates
  const ck = tbx ? toolboxCrateKey(scene, shown) : scene.hasArt(`crate_${shown}`) ? `crate_${shown}` : shown === 'gold' && scene.hasArt('crate_iron') ? 'crate_iron' : '';
  let crateIm: Phaser.GameObjects.Image | null = null;
  if (ck) {
    const im = scene.add.image(0, 0, ck);
    im.setScale(220 / Math.max(im.width, im.height));
    if (ck === 'crate_iron' && shown === 'gold') im.setTint(0xffd36a);
    box.add(im);
    crateIm = im;
  } else box.add(scene.add.graphics().fillStyle(0x2b1d2e, 1).fillRoundedRect(-110, -90, 220, 180, 20).fillStyle(col, 1).fillRoundedRect(-102, -82, 204, 164, 16).lineStyle(8, 0x2b1d2e, 1).lineBetween(-102, -20, 102, -20));
  c.add(box);
  const extra = from ? (crateIm && tbx ? 900 : 700) : 0; // the latch roll-up plays before the cards
  sfx.chestShake?.();
  scene.tweens.add({ targets: box, angle: { from: -6, to: 6 }, duration: 90, yoyo: true, repeat: 5, onComplete: () => {
    sfx.chestOpen?.();
    const openKey = `crate_${shown}_open`;
    if (from) {
      // the latch pops, the bag becomes the bigger crate (decided before this screen), then it opens
      if (crateIm && tbx) latchRollUp(scene, box, crateIm, from, kind);
      scene.time.delayedCall(420, () => {
        titleTxt.setText(crateName(kind));
        sfx.star?.(2);
        scene.ring(W / 2, top + 260, col, 220, 24, 520);
        scene.floatText(W / 2, top + 150, `LATCH POPPED!  ${crateName(kind)}`, '#ffcf33', 38, 900);
      });
    } else if (crateIm && tbx) popToolboxLatch(scene, box, crateIm, kind);
    else if (crateIm && scene.hasArt(openKey)) {
      crateIm.clearTint().setTexture(openKey);
      crateIm.setScale(240 / Math.max(crateIm.width, crateIm.height));
    }
    scene.tweens.add({ targets: box, scale: 0, alpha: 0, duration: 220, delay: (crateIm ? 260 : 0) + extra });
    scene.ring(W / 2, top + 260, 0xffcf33, 160, 18, 420);
    cards.forEach((cd, k) => {
      // up to 6 kinds in 3 columns; more (big crates/packs) in 4 smaller columns so nothing hides under the buttons
      const cols = cards.length > 6 ? 4 : 3, sc = cards.length > 6 ? 0.78 : 1;
      // r39: a short last row is centred under the full rows
      const rowN = Math.floor(k / cols), inRow = Math.min(cols, cards.length - rowN * cols);
      const x = W / 2 + ((k % cols) - (inRow - 1) / 2) * (cols === 4 ? 152 : 200), y = top + (cols === 4 ? 220 : 250) + rowN * (cols === 4 ? 190 : 250);
      const card = scene.add.container(x, y).setScale(0, sc);
      const u = UNITS.find((v) => v.id === cd.unit)!;
      const rc = RARITY_COLOR[u.rarity];
      card.add(scene.add.graphics().fillStyle(0x2b1d2e, 1).fillRoundedRect(-88, -110, 176, 220, 18).fillStyle(rc, 1).fillRoundedRect(-84, -106, 168, 212, 15).fillStyle(0xfbe7c6, 1).fillRoundedRect(-76, -80, 152, 130, 12));
      const pk = scene.unitPortrait(cd.unit);
      if (scene.textures.exists(pk)) card.add(scene.fitVisible(scene.add.image(0, -16, pk), 112));
      addUnitJob(scene, card, cd.unit, 0, 38);
      card.setSize(176, 220).setInteractive({ useHandCursor: true }).on('pointerup', () => showUnitJobPopup(scene, W, H, cd.unit, FAMILY_INFO[cd.unit as 'cannon'].name.toUpperCase(), scene.meta.units?.[cd.unit]?.level ?? 1));
      card.add(scene.add.text(0, 72, `${FAMILY_INFO[cd.unit as 'cannon'].name.toUpperCase()} x${cd.count}`.replace('SIGNAL ', ''), { fontFamily: 'Lilita One, Arial Black', fontSize: '22px', color: '#ffffff', stroke: '#2b1d2e', strokeThickness: 5 }).setOrigin(0.5));
      if (cd.isNew) card.add(scene.add.text(56, -104, 'NEW!', { fontFamily: 'Lilita One, Arial Black', fontSize: '22px', color: '#2b1d2e', backgroundColor: '#ffcf33', padding: { x: 8, y: 1 } }).setOrigin(0.5).setAngle(8));
      c.add(card);
      scene.tweens.add({ targets: card, scaleX: sc, duration: 220, delay: 300 + extra + k * 260, ease: 'Back.Out', onStart: () => sfx.star?.(Math.min(2, k)) });
    });
  } });
  const more = scene.totalCrates();
  scene.time.delayedCall(900 + cards.length * 260 + extra, () => {
    if (!c.active) return;
    // r39: buttons follow the last row instead of a fixed y (no dead space)
    const cols = cards.length > 6 ? 4 : 3, rows = Math.ceil(cards.length / cols);
    const by = Math.min(top + 920, top + (cols === 4 ? 220 : 250) + (rows - 1) * (cols === 4 ? 190 : 250) + (cols === 4 ? 175 : 200));
    if (more) scene.button(c, W / 2 - 150, by, 260, `NEXT (${more})`, 0x5fbf4a, () => scene.openNextCrate(), 0.8);
    const back = scene.crateReturn;
    if (back) scene.button(c, more ? W / 2 + 150 : W / 2, by, 260, 'CONTINUE', 0x27a4c0, () => ((scene.crateReturn = null), back()), 0.8);
    else scene.button(c, more ? W / 2 + 150 : W / 2, by, 260, 'UNITS', 0x27a4c0, () => scene.openTitle('units'), 0.8);
  });
}

export function openUnitShop(scene: GameScene) {
  scene.closeModal();
  const m = scene.meta;
  // r40: taller panel; the Featured Crate row leads (Gems can target one unit)
  const c = scene.panel(1214);
  const top = H / 2 - 607;
  const D = 152;
  c.add(scene.add.text(W / 2, top + 60, 'CRATE SHOP', { fontFamily: 'Lilita One, Arial Black', fontSize: '52px', color: '#3b2533' }).setOrigin(0.5));
  addOddsButton(scene, c, W - 100, top + 60, () => showOddsPanel(scene, W, H, pityView(m)));
  c.add(scene.add.text(W / 2, top + 112, `${m.bolts ?? 0} Bolts  \u00b7  ${m.gems ?? 0} Gems`, { fontFamily: 'Lilita One, Arial Black', fontSize: '28px', color: '#7a5a4a' }).setOrigin(0.5));
  const B = TUNING.rosterB, RH = B ? 100 : 128, rowH = B ? 92 : 120; // ROSTER B adds the Golden Workbench row, so the rows are tighter
  const row = (y: number, title: string, sub: string, label: string, col: number, cb: () => void) => {
    c.add(scene.add.graphics().fillStyle(0xead2b0, 1).fillRoundedRect(70, y - rowH / 2, W - 140, rowH, 20));
    c.add(scene.add.text(100, y - 22, title, { fontFamily: 'Lilita One, Arial Black', fontSize: '30px', color: '#3b2533' }).setOrigin(0, 0.5));
    c.add(scene.add.text(100, y + 20, sub, { fontFamily: 'Arial', fontStyle: 'bold', fontSize: '20px', color: '#7a5a4a' }).setOrigin(0, 0.5));
    scene.button(c, W - 170, y, 200, label, col, cb, 0.7);
  };
  const buyCrate = (kind: CrateKind, cur: 'bolts' | 'gems', price: number) => {
    if ((m[cur] ?? 0) < price) return scene.showToast(cur === 'gems' ? 'NOT ENOUGH GEMS' : 'NOT ENOUGH BOLTS');
    m[cur] = (m[cur] ?? 0) - price;
    tlog.log('crate_buy', { kind, cur, price });
    scene.openCrate(kind);
  };
  const day = Math.floor(Date.now() / 86400000);
  const fu = featuredGemUnit(day);
  const fname = FAMILY_INFO[fu as 'cannon'].name.toUpperCase();
  const pf = (m.pity ??= { epic: 0, dry: 0 }).featured ?? 0;
  c.add(scene.add.graphics().fillStyle(0x8e58c9, 0.25).fillRoundedRect(70, top + 156, W - 140, 148, 20).lineStyle(4, 0x8e58c9, 1).strokeRoundedRect(70, top + 156, W - 140, 148, 20));
  const pk = scene.unitPortrait(fu);
  if (scene.textures.exists(pk)) c.add(scene.fitVisible(scene.add.image(136, top + 230, pk), 104));
  c.add(scene.add.text(200, top + 188, `FEATURED: ${fname}`, { fontFamily: 'Lilita One, Arial Black', fontSize: '28px', color: '#3b2533' }).setOrigin(0, 0.5));
  c.add(scene.add.text(200, top + 222, `60% of its rarity · guaranteed in ${FEATURED_CRATE.pity - pf} crate${FEATURED_CRATE.pity - pf > 1 ? 's' : ''}`, { fontFamily: 'Arial', fontStyle: 'bold', fontSize: '18px', color: '#5a3a5a' }).setOrigin(0, 0.5));
  const buyFeatured = (n: number, price: number) => {
    if ((m.gems ?? 0) < price) return scene.showToast('NOT ENOUGH GEMS');
    m.gems = (m.gems ?? 0) - price;
    const owned = new Set(Object.entries(m.units ?? {}).filter(([, v]) => v.level >= 1).map(([k]) => k as Family));
    const all = new Map<string, CrateCard>();
    for (let k = 0; k < n; k++) {
      m.crateSeq = (m.crateSeq ?? 0) + 1;
      for (const cd of rollFeatured(owned, (Date.now() ^ (m.crateSeq * 2654435761)) >>> 0, fu, m.pity!)) {
        const e = all.get(cd.unit);
        if (e) e.count += cd.count;
        else all.set(cd.unit, { ...cd });
      }
    }
    const cards = [...all.values()];
    scene.applyCards(cards);
    tlog.log('featured_buy', { unit: fu, n, price, cards: cards.map((x) => `${x.unit}x${x.count}`) });
    scene.presentCrate('iron', cards, n > 1 ? `${n} FEATURED CRATES` : 'FEATURED CRATE');
  };
  scene.button(c, 330, top + 266, 220, `x1  ${FEATURED_CRATE.gems1} GEMS`, 0x8e58c9, () => buyFeatured(1, FEATURED_CRATE.gems1), 0.6);
  scene.button(c, 520, top + 266, 220, `x5  ${FEATURED_CRATE.gems5} GEMS`, 0x8e58c9, () => buyFeatured(5, FEATURED_CRATE.gems5), 0.6);
  (B ? [...SHOP.gemCrates, ...SHOP.gemCratesB] : SHOP.gemCrates).forEach((g, i) => row(top + 220 + D + i * RH, crateName(g.kind), B ? `${CRATES_B[g.kind].cards} cards  \u00b7  ${guaranteeText(g.kind)}` : `${CRATES[g.kind].cards} cards  \u00b7  ${CRATES[g.kind].rareMin}+ rare`, `${g.gems} GEMS`, 0x8e58c9, () => buyCrate(g.kind, 'gems', g.gems)));
  const ownedNow = new Set(Object.entries(m.units ?? {}).filter(([, v]) => v.level >= 1).map(([k]) => k as Family));
  const feat = featuredUnit(localDate(), ownedNow);
  SHOP.boltPacks.forEach((p, i) =>
    row(top + (B ? 520 : 476) + D + i * RH, p.name, p.id === 'role' ? `${p.cards} cards of a role you pick` : `${p.cards} cards  \u00b7  ${p.featuredMin}+ ${FAMILY_INFO[feat as 'cannon'].name}`, `${p.bolts} BOLTS`, 0xe0a020, () => (p.id === 'role' ? scene.openRolePick() : scene.openPack(p.id))),
  );
  c.add(scene.add.text(W / 2, top + 850 + D, 'GEMS  (test store, no real payment)', { fontFamily: 'Lilita One, Arial Black', fontSize: '24px', color: '#3b2533' }).setOrigin(0.5));
  SHOP.gemPacks.forEach((p, i) => {
    const x = W / 2 + (i - 1) * 200;
    scene.button(c, x, top + 905 + D, 180, `${p.gems}`, 0x27a4c0, () => {
      m.gems = (m.gems ?? 0) + p.gems;
      store(META_KEY, JSON.stringify(m));
      tlog.log('gems_mock_buy', { gems: p.gems, price: p.price });
      scene.showToast(`+${p.gems} GEMS (TEST)`);
      scene.openUnitShop();
    }, 0.65);
    c.add(scene.add.text(x, top + 950 + D, p.price, { fontFamily: 'Arial', fontStyle: 'bold', fontSize: '20px', color: '#7a5a4a' }).setOrigin(0.5));
  });
  // ChatGPT r32: Gems can also buy Bolts (60 -> 300, 200 -> 1,100)
  ([[60, 300], [200, 1100]] as const).forEach(([gem, bolt], i) =>
    scene.button(c, i ? W - 160 : 160, top + 1010 + D, 200, `${bolt}B / ${gem}G`, 0xe0a020, () => {
      if ((m.gems ?? 0) < gem) return scene.showToast('NOT ENOUGH GEMS');
      m.gems = (m.gems ?? 0) - gem;
      m.bolts = (m.bolts ?? 0) + bolt;
      store(META_KEY, JSON.stringify(m));
      tlog.log('gems_for_bolts', { gem, bolt });
      scene.showToast(`+${bolt} BOLTS`);
      scene.openUnitShop();
    }, 0.6),
  );
  scene.button(c, W / 2, top + 1010 + D, 200, 'BACK', 0x8a6a4a, () => scene.openTitle('units'), 0.7);
}

/** r32 (ChatGPT early guarantee): the first Iron crate lets you CHOOSE 1 of 3 units you don't own yet. */
export function openUnitChoice(scene: GameScene, then: () => void) {
  const m = scene.meta;
  const missing = UNITS.filter((u) => !scene.ownsUnit(u.id) && u.rarity === 'rare').map((u) => u.id);
  if (!missing.length) return then();
  const rng = new Rng(((m.crateSeq ?? 1) * 2654435761) >>> 0);
  const picks = rng.shuffle([...missing]).slice(0, 3);
  scene.closeModal();
  const c = scene.panel(640);
  const top = H / 2 - 320;
  c.add(scene.add.text(W / 2, top + 64, 'CHOOSE A NEW UNIT', { fontFamily: 'Lilita One, Arial Black', fontSize: '44px', color: '#3b2533' }).setOrigin(0.5));
  c.add(scene.add.text(W / 2, top + 110, 'It joins your collection right away', { fontFamily: 'Arial', fontStyle: 'bold', fontSize: '22px', color: '#7a5a4a' }).setOrigin(0.5));
  picks.forEach((f, k) => {
    const x = W / 2 + (k - (picks.length - 1) / 2) * 200, y = top + 330;
    const card = scene.add.container(x, y);
    card.add(scene.add.graphics().fillStyle(0x2b1d2e, 1).fillRoundedRect(-88, -130, 176, 260, 18).fillStyle(0x3a8adf, 1).fillRoundedRect(-84, -126, 168, 252, 15).fillStyle(0xfbe7c6, 1).fillRoundedRect(-76, -100, 152, 130, 12));
    if (scene.textures.exists(`${f}_3`)) {
      const im = scene.add.image(0, -36, `${f}_3`);
      im.setScale(110 / Math.max(im.width, im.height));
      card.add(im);
    }
    const info = FAMILY_INFO[f as 'cannon'];
    card.add(scene.add.text(0, 50, info.name.toUpperCase(), { fontFamily: 'Lilita One, Arial Black', fontSize: '22px', color: '#ffffff', stroke: '#2b1d2e', strokeThickness: 5 }).setOrigin(0.5));
    card.add(scene.add.text(0, 86, info.role, { fontFamily: 'Lilita One, Arial Black', fontSize: '18px', color: '#fff0cf' }).setOrigin(0.5));
    card.setSize(176, 260).setInteractive({ useHandCursor: true });
    card.on('pointerup', () => {
      m.unitChoiceDone = true;
      scene.applyCards([{ unit: f, count: 1, isNew: true }]);
      tlog.log('unit_choice', { unit: f, from: picks });
      sfx.win();
      then();
    });
    c.add(card);
  });
}

export function openRolePick(scene: GameScene) {
  scene.closeModal();
  const c = scene.panel(520);
  const top = H / 2 - 260;
  c.add(scene.add.text(W / 2, top + 64, 'ROLE PACK', { fontFamily: 'Lilita One, Arial Black', fontSize: '48px', color: '#3b2533' }).setOrigin(0.5));
  c.add(scene.add.text(W / 2, top + 116, 'Pick the role you want cards for', { fontFamily: 'Arial', fontStyle: 'bold', fontSize: '22px', color: '#7a5a4a' }).setOrigin(0.5));
  (['shooter', 'relay', 'helper'] as const).forEach((r, i) => scene.button(c, W / 2, top + 210 + i * 100, 380, r.toUpperCase(), 0x5fbf4a, () => scene.openPack('role', r), 0.8));
  scene.button(c, W / 2, top + 480, 240, 'BACK', 0x8a6a4a, () => scene.openUnitShop(), 0.7);
}

/** BUILD YOUR TEAM (ChatGPT r14): Shooter (Cannon/Rocket) + Coil + Bell (fixed relays) + optional Helper. */
export function openTeamSheet(scene: GameScene) {
  sfx.click();
  scene.seen('team');
  const m = scene.meta;
  const PH = 900;
  const c = scene.sheet(PH);
  const top = H / 2 - PH / 2;
  scene.sheetTitle(c, top, 'BUILD YOUR TEAM', 'Changes apply to your next run');
  const helper = scene.activeToys()[0] ?? null;
  const [ra, rb] = scene.teamRelays();
  const lv = scene.currentLevel();
  const slots: { label: string; fam: Family | null; role: string; note: string; tap: () => void }[] = [
    { label: 'SHOOTER', fam: scene.teamShooter(), role: 'shooter', note: 'tap to change', tap: () => scene.openSlotPicker('shooter', 0) },
    { label: 'RELAY A', fam: ra, role: 'relay', note: lv > 10 ? 'tap to change' : relayLockNote(FAMILY_INFO[ra as 'coil'].name, 2), tap: () => (lv > 10 ? scene.openSlotPicker('relay', 0) : scene.showToast('RELAY A OPENS IN CHAPTER 2')) },
    { label: 'RELAY B', fam: rb, role: 'relay', note: lv > 20 ? 'tap to change' : relayLockNote(FAMILY_INFO[rb as 'coil'].name, 3), tap: () => (lv > 20 ? scene.openSlotPicker('relay', 1) : scene.showToast('RELAY B OPENS IN CHAPTER 3')) },
    { label: 'HELPER', fam: m.playtestMode ? null : helper, role: helper ? FAMILY_INFO[helper as 'cannon'].role.toLowerCase() : 'support', note: 'tap to change', tap: () => (m.playtestMode ? scene.showToast('HELPERS ARE OFF IN THIS PLAYTEST') : scene.openSlotPicker('helper', 0)) },
  ];
  slots.forEach((sl, i) => {
    const x = W / 2 + (i % 2 ? 150 : -150);
    const y = top + 270 + Math.floor(i / 2) * 230;
    const card = scene.add.container(x, y);
    const plate = scene.hasArt('ui_team_slot') ? scene.add.image(0, 0, 'ui_team_slot').setDisplaySize(280, 210) : scene.add.graphics().fillStyle(0xffffff, 1).fillRoundedRect(-140, -105, 280, 210, 22);
    card.add(plate);
    card.add(scene.add.text(0, -78, sl.label, { fontFamily: 'Lilita One, Arial Black', fontSize: '22px', color: '#7a5a4a' }).setOrigin(0.5));
    const long = sl.note.length > 20;
    if (sl.fam && scene.textures.exists(`${sl.fam}_1`)) {
      const im = scene.add.image(0, long ? -16 : -8, `${sl.fam}_1`);
      im.setScale((long ? 80 : 96) / Math.max(im.width, im.height));
      card.add(im);
    } else card.add(scene.add.text(0, -8, 'none', { fontFamily: 'Lilita One, Arial Black', fontSize: '28px', color: '#9a8a7a' }).setOrigin(0.5));
    if (scene.hasArt(`role_${sl.role}`)) {
      const ri = scene.add.image(-100, -78, `role_${sl.role}`);
      ri.setScale(34 / Math.max(ri.width, ri.height));
      card.add(ri);
    }
    // walkthrough 3: a locked relay's note is two wrapped lines, so the unit and its name sit a little higher
    card.add(scene.add.text(0, long ? 40 : 52, sl.fam ? FAMILY_INFO[sl.fam as keyof typeof FAMILY_INFO].name : 'No helper', { fontFamily: 'Lilita One, Arial Black', fontSize: long ? '25px' : '28px', color: '#3b2533' }).setOrigin(0.5));
    card.add(scene.add.text(0, long ? 80 : 86, sl.note, { fontFamily: 'Lilita One, Arial Black', fontSize: long ? '16px' : '19px', color: '#fff0cf', align: 'center', wordWrap: { width: 250 } }).setOrigin(0.5));
    card.setSize(280, 210).setInteractive({ useHandCursor: true });
    card.on('pointerup', sl.tap);
    c.add(card);
  });
  const sh = FAMILY_INFO[scene.teamShooter() as keyof typeof FAMILY_INFO];
  c.add(scene.add.text(W / 2, top + 650, `${sh.name}: ${sh.text}`, { fontFamily: 'Arial', fontStyle: 'bold', fontSize: '21px', color: '#3b2533', align: 'center', wordWrap: { width: W - 160 } }).setOrigin(0.5));
  scene.button(c, W / 2, top + 790, 380, 'USE TEAM', 0x5fbf4a, () => scene.openTitle(), 0.9);
}

/** r32 squad picker: every OWNED unit of that role with its level; locked ones say where to find them. */
export function openSlotPicker(scene: GameScene, slot: 'shooter' | 'relay' | 'helper', k: 0 | 1) {
  const m = scene.meta;
  const list = UNITS.filter((u) => u.slot === slot);
  const PH = 260 + list.length * 104 + (slot === 'helper' ? 104 : 0);
  const c = scene.sheet(PH);
  const top = H / 2 - PH / 2;
  scene.sheetTitle(c, top, slot === 'relay' ? `RELAY ${k ? 'B' : 'A'}` : slot.toUpperCase(), 'Units you own. Find more in crates.');
  const [ra, rb] = scene.teamRelays();
  const cur = slot === 'shooter' ? scene.teamShooter() : slot === 'relay' ? (k ? rb : ra) : scene.activeToys()[0] ?? null;
  const other = slot === 'relay' ? (k ? ra : rb) : null;
  const choose = (f: Family | null) => {
    if (slot === 'shooter') m.shooter = f!;
    else if (slot === 'relay') {
      const r = [...(m.relays ?? [ra, rb])] as [string, string];
      r[k] = f!;
      m.relays = r;
    } else {
      for (const key of Object.keys(m.toys) as Family[]) m.toys[key] = false;
      if (f) m.toys[f] = true;
    }
    store(META_KEY, JSON.stringify(m));
    tlog.log('squad', { slot, k, unit: f });
    scene.openTeamSheet();
  };
  let y = top + 190;
  if (slot === 'helper') {
    scene.button(c, W / 2, y, 440, cur ? 'NO HELPER' : 'NO HELPER  \u2713', 0x8a6a4a, () => choose(null), 0.8);
    y += 104;
  }
  for (const u of list) {
    const own = scene.ownsUnit(u.id);
    const name = FAMILY_INFO[u.id as 'cannon'].name.toUpperCase();
    if (!own) c.add(scene.add.text(W / 2, y, `${name}: find it in crates`, { fontFamily: 'Lilita One, Arial Black', fontSize: '26px', color: '#9a8a7a' }).setOrigin(0.5));
    else if (u.id === other) c.add(scene.add.text(W / 2, y, `${name}: in the other relay slot`, { fontFamily: 'Lilita One, Arial Black', fontSize: '26px', color: '#9a8a7a' }).setOrigin(0.5));
    else scene.button(c, W / 2, y, 440, `${name}  LV ${m.units?.[u.id]?.level ?? 1}${cur === u.id ? '  \u2713' : ''}`, cur === u.id ? 0x5fbf4a : 0x27a4c0, () => choose(u.id), 0.8);
    y += 104;
  }
}
