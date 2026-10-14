// ChatGPT pictures for the 22 roster B units (art-candidates/units-part1/2 -> src/assets/art/unit_<id>.webp, one picture per
// unit). The picture is the same at every rank; the rank is drawn in code (rankDecor): ranks 1-2 plain, 3-4 a soft family-colour
// glow ring under the base plate, 5-6 gold ring + star pips, 7-8 gold ring + shimmer + a crown pip. Nothing here touches the model.
import Phaser from 'phaser';
import { UNITS } from '../content/units';
import { rankArtKey } from './rankArt';
import { bakeTexture, REDUCED_MOTION, RS } from './sceneKit';
import { hasShippedArt } from './textures';

/** Units whose picture is unit_<id> (the batch 1 units keep their own per-rank art but get the same rank treatment). */
export const PICTURE_UNITS = new Set([
  'wrench', 'piston', 'spring', 'belt_drive', 'blowtorch', 'pipe', 'blast_plate', 'tesla_tower', 'capacitor', 'blueprint', 'ladder', 'rewind_crank',
  'crane', 'dynamo', 'wrecking_ball', 'robot_arm', 'tilt_lever', 'rivet_gun', 'vice', 'router', 'hydraulic_press', 'lathe',
]);
const DECOR_UNITS = new Set([...PICTURE_UNITS, 'nail_gun', 'jackhammer', 'gear', 'saw_blade']);
const GOLD = 0xffc83a;

/** Swap a `<family>_<rank>` texture key for the unit's picture once it has loaded; the code-drawn stand-in stays the fallback. */
export function unitTex(scene: Phaser.Scene, key: string): string {
  key = rankArtKey(key, hasShippedArt);
  const m = /^(.+)_\d+$/.exec(key);
  if (!m || !PICTURE_UNITS.has(m[1])) return key;
  const pic = `unit_${m[1]}`;
  return scene.textures.exists(pic) && scene.textures.get(pic).source[0]?.width > 1 ? pic : key;
}

/** Scale that fits a texture of any size into `box` px (the stand-ins are 128 px, the pictures 256). */
export const fitScale = (img: Phaser.GameObjects.Image, box: number) => box / Math.max(img.width, img.height, 1);

const pictureKeys = () => [...PICTURE_UNITS].map((id) => `unit_${id}`);
const pending = new Set<string>();

/** Fetch the pictures of every unit whose flag is on (it is in UNITS) or that the save owns; idempotent, so it is safe to call whenever a screen could show a new unit. `done` runs when new pictures landed. */
export function ensureUnitArt(scene: Phaser.Scene, urls: Record<string, string>, owned: string[], done?: () => void) {
  const want = new Set([...UNITS.map((u) => u.id as string), ...owned]);
  const todo = pictureKeys().filter((k) => want.has(k.slice(5)) && urls[k] && !scene.textures.exists(k) && !pending.has(k));
  if (!todo.length) return;
  for (const k of todo) {
    pending.add(k);
    scene.load.image(k, urls[k]);
  }
  const fin = () => {
    for (const k of todo) pending.delete(k);
    done?.();
  };
  scene.load.once('complete', fin);
  scene.load.start();
}

/** Rank tier of the glow treatment: 0 plain, 1 family glow (3-4), 2 gold + pips (5-6), 3 shimmer + crown (7+). */
export const rankTier = (rank: number) => (rank >= 7 ? 3 : rank >= 5 ? 2 : rank >= 3 ? 1 : 0);

/** One baked glow ring per tier / colour (shared by every piece). */
function ringTex(scene: Phaser.Scene, tier: number, col: number): string {
  const key = `rk_${tier}_${col.toString(16)}`;
  const W = 112, H = 52;
  return bakeTexture(scene, key, W, H, (g) => {
    const cx = W / 2, cy = H / 2;
    for (let i = 0; i < 6; i++) g.fillStyle(col, (tier === 1 ? 0.12 : 0.15) + i * 0.06).fillEllipse(cx, cy, 108 - i * 9, 48 - i * 4);
    g.lineStyle(3, tier === 1 ? 0xffffff : 0xfff2b0, 0.85).strokeEllipse(cx, cy, 80, 30);
  });
}

/** n tiny gold stars on dark discs, sitting on the front of the base plate. */
function pipsTex(scene: Phaser.Scene, n: number): string {
  const W = n * 11 + 4, H = 16;
  return bakeTexture(scene, `rk_pips_${n}`, W, H, (g) => {
    for (let i = 0; i < n; i++) {
      const px = 2 + 5.5 + i * 11, py = H / 2;
      g.fillStyle(0x2b1d2e, 1).fillCircle(px, py, 6.5);
      const pts: Phaser.Math.Vector2[] = [];
      for (let k = 0; k < 10; k++) {
        const an = (k / 10) * Math.PI * 2 - Math.PI / 2, rr = k % 2 ? 2.2 : 5.5;
        pts.push(new Phaser.Math.Vector2(px + Math.cos(an) * rr, py + Math.sin(an) * rr));
      }
      g.fillStyle(GOLD, 1).fillPoints(pts, true);
    }
  });
}

function crownTex(scene: Phaser.Scene): string {
  return bakeTexture(scene, 'rk_crown', 26, 20, (g) => {
    g.fillStyle(0x2b1d2e, 1).fillPoints([new Phaser.Math.Vector2(1, 17), new Phaser.Math.Vector2(1, 5), new Phaser.Math.Vector2(8, 11), new Phaser.Math.Vector2(13, 1), new Phaser.Math.Vector2(18, 11), new Phaser.Math.Vector2(25, 5), new Phaser.Math.Vector2(25, 17)], true);
    g.fillStyle(GOLD, 1).fillPoints([new Phaser.Math.Vector2(4, 14), new Phaser.Math.Vector2(4, 9), new Phaser.Math.Vector2(9, 13), new Phaser.Math.Vector2(13, 5), new Phaser.Math.Vector2(17, 13), new Phaser.Math.Vector2(22, 9), new Phaser.Math.Vector2(22, 14)], true);
  });
}

/**
 * Rank treatment for a board piece, in cell-container coordinates (baseline y = base). `under` goes behind the picture,
 * `mid` between the picture and the rank badges, `over` in front of everything. Ranks 1-2 return nothing.
 */
export function rankDecor(scene: Phaser.Scene, family: string, rank: number, color: number, base: number): { under: Phaser.GameObjects.GameObject[]; mid: Phaser.GameObjects.GameObject[]; over: Phaser.GameObjects.GameObject[] } {
  const out = { under: [] as Phaser.GameObjects.GameObject[], mid: [] as Phaser.GameObjects.GameObject[], over: [] as Phaser.GameObjects.GameObject[] };
  const tier = DECOR_UNITS.has(family) ? rankTier(rank) : 0;
  if (!tier) return out;
  const pips = tier === 1 ? 0 : tier === 2 ? rank - 4 : 3;
  const ring = scene.add.image(0, base - 12, ringTex(scene, tier, tier === 1 ? color : GOLD)).setScale(1 / RS);
  out.under.push(ring);
  if (pips) out.mid.push(scene.add.image(0, base - 20, pipsTex(scene, pips)).setScale(1 / RS));
  if (tier === 3) {
    out.over.push(scene.add.image(0, base - 100, crownTex(scene)).setScale(1 / RS));
    if (!REDUCED_MOTION) {
      ring.setAlpha(0.8);
      const tw1 = scene.tweens.add({ targets: ring, alpha: 1, scaleX: ring.scaleX * 1.06, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
      // a glint sweeping across the picture
      const glint = scene.add.image(-30, base - 70, 'spark').setTint(0xffffff).setAlpha(0).setScale(0.9).setBlendMode(Phaser.BlendModes.ADD);
      out.over.push(glint);
      const tw2 = scene.tweens.add({ targets: glint, x: 30, y: base - 40, alpha: { from: 0, to: 1 }, scale: 1.3, angle: 90, duration: 700, yoyo: true, hold: 50, repeat: -1, repeatDelay: 900 + Math.random() * 800, delay: Math.random() * 1200, ease: 'Sine.InOut' });
      ring.once('destroy', () => { tw1.remove(); tw2.remove(); });
    }
  }
  return out;
}

/** After pictures landed: swap the stand-in on every live board piece for its picture (the model is untouched). */
export function swapUnitPictures(scene: Phaser.Scene, views: Iterable<Phaser.GameObjects.Container>, refit: (img: Phaser.GameObjects.Image) => void) {
  for (const v of views) {
    if (!v.active) continue;
    for (const o of v.list) {
      if (!(o instanceof Phaser.GameObjects.Image)) continue;
      const k = unitTex(scene, o.texture.key);
      if (k !== o.texture.key) {
        o.setTexture(k);
        refit(o);
      }
    }
  }
}
