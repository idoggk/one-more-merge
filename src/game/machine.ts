import Phaser from 'phaser';
import type { Family } from '../core/types';

/**
 * "YOUR MACHINE": ChatGPT's layered home machine (art pack v10, ASSEMBLY.json).
 * Assembly space is 1000x800; the chassis' visible bounds sit at left 40 / top 400 / width 920.
 * Core mounts always show Cannon, Coil, Bell (an empty socket until earned); the helper mount shows the one selected toy.
 * Visual tier: rank 1-2 Starter, 3-4 Built, 5-6 Master. Modules stand bottom-centre on their mount, 22 units forward.
 */
const MOUNTS: Record<'shooter' | 'coil' | 'bell' | 'helper', { x: number; y: number; fit: [number, number] }> = {
  shooter: { x: 250.61, y: 516.8, fit: [260, 250] },
  coil: { x: 386.56, y: 434.94, fit: [220, 270] },
  bell: { x: 775.71, y: 497.17, fit: [230, 260] },
  helper: { x: 629.72, y: 571.84, fit: [210, 210] },
};
const TIER_FIT = [0, 0.68, 0.84, 1];
const CHASSIS = { left: 40, top: 400, width: 920 };
/** Point of the assembly placed at the caller's (x, feetY): bottom-centre of the chassis. */
const FEET = { x: 500, y: 772 };

export const tierOf = (rank: number) => (rank >= 5 ? 3 : rank >= 3 ? 2 : rank >= 1 ? 1 : 0);

export function hasMachineArt(scene: Phaser.Scene) {
  return scene.textures.exists('hero_chassis') && scene.textures.exists('hm_cannon_1');
}

/** Build the machine; `width` is the on-screen width of the full 1000-unit assembly. Returns null without the art. */
export function buildMachine(
  scene: Phaser.Scene,
  x: number,
  feetY: number,
  width: number,
  ranks: Partial<Record<Family, number>>,
  helper: Family | null,
  shooter: Family = 'cannon',
): Phaser.GameObjects.Container | null {
  if (!hasMachineArt(scene)) return null;
  const c = scene.add.container(x, feetY);
  const add = (o: Phaser.GameObjects.Image) => {
    o.x -= FEET.x;
    o.y -= FEET.y;
    c.add(o);
    return o;
  };
  const ch = scene.add.image(CHASSIS.left, CHASSIS.top, 'hero_chassis').setOrigin(0, 0);
  ch.setScale(CHASSIS.width / ch.width);
  add(ch);
  const slots: [keyof typeof MOUNTS, Family | null, number][] = [
    ['coil', 'coil', ranks.coil ?? 0],
    ['bell', 'bell', ranks.bell ?? 0],
    ['shooter', shooter, ranks[shooter] ?? 0],
    ['helper', helper, helper ? Math.max(1, ranks[helper] ?? 0) : 0],
  ];
  // empty socket caps first (render order: chassis, caps, coil, bell, cannon, helper)
  for (const [mount, , rank] of slots) {
    if (rank > 0 || !scene.textures.exists('hero_socket')) continue;
    const m = MOUNTS[mount];
    const s = add(scene.add.image(m.x, m.y, 'hero_socket'));
    s.setScale(Math.min(110 / s.width, 52 / s.height));
  }
  for (const [mount, fam, rank] of slots) {
    const t = tierOf(rank);
    if (!fam || !t) continue;
    // families without dedicated home modules (Rocket) use their board art at a matching rank
    let key = `hm_${fam}_${t}`;
    if (!scene.textures.exists(key)) key = `${fam}_${[0, 1, 3, 6][t]}`;
    if (!scene.textures.exists(key)) continue;
    const m = MOUNTS[mount];
    const im = add(scene.add.image(m.x, m.y + 22, key).setOrigin(0.5, 1));
    im.setScale(Math.min((m.fit[0] * TIER_FIT[t]) / im.width, (m.fit[1] * TIER_FIT[t]) / im.height));
    im.setName(fam);
  }
  c.setScale(width / 1000);
  return c;
}

/** Hero-only ornament on its own mount (back-left corner of the chassis), separate from gameplay mounts (r17). */
export function setOrnament(scene: Phaser.Scene, mach: Phaser.GameObjects.Container, ornamentId: string | null) {
  (mach.getByName('ornament') as Phaser.GameObjects.Image | null)?.destroy();
  const key = ornamentId ? `orn_${ornamentId}` : '';
  if (!key || !scene.textures.exists(key)) return;
  const o = scene.add.image(132 - FEET.x, 548 - FEET.y, key).setOrigin(0.5, 1).setName('ornament');
  o.setScale(Math.min(120 / o.width, 160 / o.height));
  mach.addAt(o, 1);
}

/** Workshop finish: swap the chassis for its pre-rendered material variant (tools/make-finishes.py); tint fallback. */
export function setFinish(mach: Phaser.GameObjects.Container, finishId: string | null, tint?: number) {
  const ch = mach.list[0] as Phaser.GameObjects.Image;
  const key = finishId ? `hero_chassis_${finishId}` : 'hero_chassis';
  if (ch.scene.textures.exists(key)) ch.setTexture(key).clearTint();
  else if (tint) ch.setTint(tint);
  else ch.setTexture('hero_chassis').clearTint();
}
