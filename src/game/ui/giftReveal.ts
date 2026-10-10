// NEW UNIT reveal for a plan gift (TUNING.rosterUnlocks, docs/ROSTER.md section 6). Built from the crate reveal's own pieces: the
// rarity card with its portrait, the job word pill (addUnitJob) and the WHEN MERGED line (addMergedLine), plus one GOOD HERE line.
// Queued on the level result's endQueue, so it shows when the player leaves the result screen, one gift at a time.
import { FAMILY_INFO } from '../../content/perks';
import type { UnitGift } from '../../content/unlockPlan';
import { RARITY_COLOR, unitDef } from '../../content/units';
import { firstGoodHere } from '../../core/unlockPlan';
import { sfx } from '../audio';
import type { GameScene } from '../GameScene';
import { W, H } from '../sceneKit';
import { addMergedLine, addUnitJob } from './unitJobUi';

const FONT = 'Lilita One, Arial Black';

/** The GOOD HERE line of a gift: the first level that names the unit, else the gift's own tip. */
export function giftTipText(g: UnitGift): string {
  const f = firstGoodHere(g);
  return f ? `GOOD HERE: LEVEL ${f.level}  ·  ${f.text}` : `GOOD HERE: ${g.tip}`;
}

export function showGiftReveal(scene: GameScene, g: UnitGift, done: () => void) {
  const def = unitDef(g.unit);
  if (!def) return done();
  const o = scene.add.container(0, 0).setDepth(140);
  const dim = scene.add.rectangle(W / 2, H / 2, W, H, 0x1a0f18, 0.7).setInteractive();
  const PH = 900, top = H / 2 - PH / 2;
  o.add([dim, scene.add.graphics().fillStyle(0x2b1d2e, 1).fillRoundedRect(40, top - 6, W - 80, PH + 12, 36).fillStyle(0xfbe7c6, 1).fillRoundedRect(46, top, W - 92, PH, 32)]);
  o.add(scene.add.text(W / 2, top + 70, 'NEW UNIT!', { fontFamily: FONT, fontSize: '56px', color: '#e8452c' }).setOrigin(0.5));
  const card = scene.add.container(W / 2, top + 290).setScale(0);
  card.add(scene.add.graphics().fillStyle(0x2b1d2e, 1).fillRoundedRect(-88, -110, 176, 220, 18).fillStyle(RARITY_COLOR[def.rarity], 1).fillRoundedRect(-84, -106, 168, 212, 15).fillStyle(0xfbe7c6, 1).fillRoundedRect(-76, -80, 152, 130, 12));
  const pk = scene.unitPortrait(g.unit);
  if (scene.textures.exists(pk)) card.add(scene.fitVisible(scene.add.image(0, -16, pk), 112));
  addUnitJob(scene, card, g.unit, 0, 38);
  const name = FAMILY_INFO[g.unit as 'cannon'].name.toUpperCase();
  card.add(scene.add.text(0, 72, name.replace('SIGNAL ', ''), { fontFamily: FONT, fontSize: '22px', color: '#ffffff', stroke: '#2b1d2e', strokeThickness: 5 }).setOrigin(0.5));
  card.add(scene.add.text(56, -104, 'NEW!', { fontFamily: FONT, fontSize: '22px', color: '#2b1d2e', backgroundColor: '#ffcf33', padding: { x: 8, y: 1 } }).setOrigin(0.5).setAngle(8));
  o.add(card);
  scene.tweens.add({ targets: card, scale: 1.3, duration: 320, ease: 'Back.Out' });
  sfx.star?.(2);
  o.add(scene.add.text(W / 2, top + 480, `${name}  ·  ${FAMILY_INFO[g.unit as 'cannon'].role}`, { fontFamily: FONT, fontSize: '36px', color: '#3b2533', align: 'center', wordWrap: { width: W - 160 } }).setOrigin(0.5, 0));
  addMergedLine(scene, o, g.unit, 1, W / 2, top + 540, W - 160);
  o.add(scene.add.text(W / 2, top + 720, giftTipText(g), { fontFamily: FONT, fontSize: '26px', color: '#b06a1a', align: 'center', wordWrap: { width: W - 160 } }).setOrigin(0.5, 0));
  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    o.destroy();
    done();
  };
  scene.button(o, W / 2, top + PH - 70, 320, 'GOT IT', 0x5fbf4a, close, 0.85);
}
