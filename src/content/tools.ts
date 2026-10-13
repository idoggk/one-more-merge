// POWER TOOLS copy (t-e2a48327, TUNING.tools; rules in src/core/tools.ts). Plain words for the inspect card, the Machine Guide pages,
// the long-press chip and the HUD recipe strip. Everything here is reachable only while TUNING.tools is on.
import { TUNING } from './tuning';

/** Inspect-card rows (merged into perks.ts FAMILY_INFO). */
export const TOOL_INFO = {
  row_surge: { name: 'Row Surge', color: 0x27c4e0, role: 'TOOL', text: 'A one-use TOOL. Tap it: every machine in its row wakes and fires once. It deals no damage by itself.', tryThis: 'Line up a full row, then tap.' },
  gear_bomb: { name: 'Gear Bomb', color: 0xc8892a, role: 'TOOL', text: 'A one-use TOOL. Tap it: the 4 parts touching it wake, and each hits as if one rank higher.', tryThis: 'Park it between your best machines.' },
} as const;

export const TOOL_KEYS = ['row_surge', 'gear_bomb'] as const;
export const isToolKey = (k: string) => (TOOL_KEYS as readonly string[]).includes(k);

/** Machine Guide pages (merged into sceneCopy GUIDE; shown only while the flag is on). */
export const TOOL_GUIDE = [
  { key: 'row_surge', title: 'ROW SURGE', role: 'SPECIAL', text: `EARN IT: a merge that fires ${TUNING.tl.chain} or more machines also makes a Row Surge (an extra part, next to the merge).\nUSE IT: tap it and every machine in its row wakes and fires once. No damage of its own.\nTouch another tool to COMBINE.`, tryThis: 'Fill a row first, then tap.', unlock: 10 },
  { key: 'gear_bomb', title: 'GEAR BOMB', role: 'SPECIAL', text: 'EARN IT: a sandwich merge (3 same parts in a line) also makes a Gear Bomb.\nUSE IT: tap it and the 4 parts touching it wake, each hitting as if one rank higher.\nTouch another tool to COMBINE.', tryThis: 'Park it between your best machines.', unlock: 10 },
] as const;

/** The three combos, in plain words (Machine Guide / recipe strip). */
export const COMBO_TEXT = {
  surge2: 'SURGE + SURGE: 3 rows wake',
  bombSurge: 'BOMB + SURGE: the row wakes, each hits one rank higher',
  bomb2: 'BOMB + BOMB: the 3x3 block wakes, each hits one rank higher',
} as const;
