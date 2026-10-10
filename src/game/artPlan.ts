import { FAMILIES } from '../core/types';

/**
 * t-0f092b4b: the eager preload is only what the first screen draws; decoding ~290 images before the first frame took
 * 9-20 s on a 4x-throttled phone CPU (the WebGL upload decodes on the main thread). Gadgets, every target_N, bg, slot and
 * demo_can stay eager for the families in play: ensureTextures() draws any of them that is missing, and buildStatic()
 * draws the board HUD on every start. target_N is used unguarded (setTargetTexture), so a resumed run on any machine needs it.
 */
const BOARD = new RegExp(`^((${FAMILIES.join('|')})_\\d+|bg|slot|demo_can|target_\\d+|star|bolt|hud_header|scrap_plate|tray_plate|stage_0|ui_(coach|ribbon)|(badge|debris|dice|gauge|hp|icon|item|vfx)_.*)$`);
/** The road tab: a returning player's first screen (hero_bg, hm_cannon_1 and node_normal pick it over the legacy title). */
const HOME = /^(hero_bg|hero_chassis|hero_socket|hm_cannon_1|res_bar|card_common|chest_closed|ui_card|btn_(green|blue|red)|(node|road|booster)_.*)$/;
/** One tap from the road (machine tab, other buttons) and the fallback stage backdrops: fetched first after the first frame; every use is guarded. */
const NEAR = /^((hm|btn)_|stage_[12]$)/;
/** Board art only drawn once play starts (piece badges / dice, items): held back while the road is first. Not vfx_ or debris_: buildStatic() bakes those once. */
const IN_PLAY = /^(badge|dice|item)_/;
/** The first-launch tutorial board (coach hand). */
const TUTORIAL = /^ui_hand$/;
/**
 * r29: boss / cast / chapter-stage art loads after the first frame, as does art only rare screens draw (legacy
 * title, cosmetics, trophies, Screw Yard). Every use of these keys is behind hasArt()/textures.exists().
 */
export const RARE = /^(boss_|mon_|stage_ch|sy_|title$|logo$|ui_console$|hero_chassis_|stagebg_|trophy_|bg_corner$|bg_practice$|slot_old$|stage_[12]$|face_2_|orn_|keepsake$|plate_remix$|btg_)/;

export type FirstScreen = { isNew: boolean; road: boolean; fams: Set<string> };

/** How preloadArt() treats an art key: loaded before the first frame, held back for the first lazy batch, or later. */
export function artPlan(key: string, { isNew, road, fams }: FirstScreen): 'eager' | 'heldBack' | 'lazy' {
  const first = BOARD.test(key) || HOME.test(key) || TUTORIAL.test(key);
  const fam = /^(?:hm_)?(.+)_\d+$/.exec(key)?.[1] ?? '';
  const inPlay = !(FAMILIES as string[]).includes(fam) || fams.has(fam);
  const screen = isNew ? !HOME.test(key) : !TUTORIAL.test(key) && !(road && IN_PLAY.test(key));
  if (first && inPlay && screen) return 'eager';
  return first || NEAR.test(key) ? 'heldBack' : 'lazy';
}
