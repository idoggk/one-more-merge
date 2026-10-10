// ROSTER B batch 1 copy (t-9b28a794; Direction B, t-3d56deb5 / t-e2128dd7): one job word, one WHEN MERGED line, the
// L3 / L6 / L9 job upgrades and the per-level GOOD HERE tip for Nail Gun, Jackhammer, Gear and Saw Blade. Rules:
// src/core/roster1.ts. Everything here is reachable only while TUNING.roster1 is on (units.ts applyRoster1).
import type { LevelDef } from './levels';
import { TUNING } from './tuning';

/** Inspect-card rows (merged into perks.ts FAMILY_INFO). `job` = the one job word; `whenMerged` = what a merge does. */
export const ROSTER_1_INFO = {
  nail_gun: { name: 'Nail Gun', color: 0x8a96a8, role: 'SHOOTER', job: 'ROW', whenMerged: 'WHEN MERGED: fires +20% for every machine in its row (max x1.8).', text: 'ROW: never shoots by itself. Woken by a chain it fires +20% for every other machine in its row, up to x1.8 (a full row).', tryThis: 'Keep its row full.' },
  jackhammer: { name: 'Jackhammer', color: 0xd8a020, role: 'SHOOTER', job: 'BYPASS', whenMerged: 'WHEN MERGED: its hit ignores shields.', text: 'BYPASS: never shoots by itself. Its hits ignore a closed shield, so shield levels cost it nothing.', tryThis: 'Bring it to shield levels.' },
  gear: { name: 'Gear', color: 0x9a7a5a, role: 'RELAY', job: 'LINK', whenMerged: 'WHEN MERGED: the chain jumps to the farthest other Gear. A lone Gear wakes the 2 cells two steps away in its row.', text: 'LINK: MERGE a Gear and the chain jumps to the farthest other Gear on the board, even across the divider. With only one Gear on the board it wakes the 2 cells two steps away in its row (left and right).', tryThis: 'One Gear: line machines up two cells from it. Two Gears: keep one in a far group.' },
  saw_blade: { name: 'Saw Blade', color: 0xc8d0d8, role: 'SHOOTER', job: 'EDGE', whenMerged: 'WHEN MERGED: x1.5 on the outer ring, x0.7 inside.', text: 'EDGE: never shoots by itself. On the outer ring of the board it hits x1.5; inside the ring only x0.7. The edge bonus never goes past +72%.', tryThis: 'Merge it on the edge, never in the middle.' },
} as const;

/** L3 / L6 / L9 job upgrades (merged into units.ts UNIT_PERKS). */
export const ROSTER_1_PERKS: Record<string, [string, string][]> = {
  nail_gun: [['Double Pip', 'Rank 4+ strips 2 armor pips per shot'], ['Extra Nail', 'A full row adds a nail that strips 1 more pip (no extra damage past x1.8)'], ['Column Feed', 'Filled cells in its column count too; the cap rises to x2.2']],
  jackhammer: [['Shield Breaker', 'While the target shield is up its hits x1.3'], ['Heavy Swing', 'Every 4th hit x1.5'], ['Rapid Swing', 'Rank 7-8: the x1.5 hit comes every 3rd hit']],
  gear: [['Big Teeth', 'A Gear also wakes its 4 touching cells'], ['Third Gear', 'A third Gear joins the link'], ['Master Gear', 'Shooters a Gear wakes hit x1.2']],
  saw_blade: [['Serrated', 'x1.6 on the ring'], ['Corner Teeth', 'Corners hit harder, up to the edge cap (+72%)'], ['True Arbor', 'x0.85 inside the ring']],
};

/** Unit-page text + animated mini-board for the new units (they have no guide page of their own). */
export const ROSTER_1_GUIDE: Record<string, { text: string }> = Object.fromEntries(Object.entries(ROSTER_1_INFO).map(([k, v]) => [k, { text: `${v.text}\n${v.whenMerged}` }]));
/** [family, row, col] pieces on the 3x5 demo board; links [from, to, depth]; big = the hit that shows the job. */
export const ROSTER_1_DEMOS: Record<string, { pieces: [string, number, number][]; links: [number, number, number][]; big?: number[] }> = {
  nail_gun: { pieces: [['coil', 1, 0], ['nail_gun', 1, 2], ['cannon', 1, 1], ['bell', 1, 3], ['cannon', 1, 4]], links: [[0, 1, 1]], big: [1] },
  jackhammer: { pieces: [['coil', 1, 1], ['jackhammer', 1, 3], ['cannon', 0, 4]], links: [[0, 1, 1]], big: [1] },
  gear: { pieces: [['gear', 1, 0], ['gear', 1, 4], ['cannon', 0, 0], ['cannon', 2, 0], ['cannon', 0, 4], ['cannon', 2, 4]], links: [[0, 2, 1], [0, 3, 1], [0, 1, 1], [1, 4, 2], [1, 5, 2]] },
  saw_blade: { pieces: [['coil', 1, 2], ['saw_blade', 0, 2], ['saw_blade', 1, 4]], links: [[0, 1, 1]], big: [1] },
};

/** Why each unit fits a level (GOOD HERE). */
const GOOD_WHY: Record<string, (d: LevelDef) => string | null> = {
  jackhammer: (d) => (d.behaviour === 'shield' ? 'it ignores the shield' : null),
  gear: (d) => (d.behaviour === 'split' ? 'Gears link across the divider' : d.behaviour === 'rest' ? 'a Gear outside the resting row still links' : null),
  saw_blade: (d) => (d.modifier === 'GAPS' || d.modifier === 'ROW_GAPS' ? 'the middle is broken up, the ring is not' : null),
  nail_gun: (d) => (d.modifier === 'NONE' && !d.behaviour && d.level % 10 !== 0 && !d.mini_boss && !d.goal ? 'a quiet board fills its rows' : null),
};

/** Level card GOOD HERE tip: the owned roster B units that suit this level, or '' (flag OFF: always ''). */
export function goodHereText(def: LevelDef, owns: (unit: string) => boolean): string {
  if (!TUNING.roster1) return '';
  const hits = Object.keys(GOOD_WHY).filter((u) => owns(u) && GOOD_WHY[u](def)).map((u) => `${ROSTER_1_INFO[u as keyof typeof ROSTER_1_INFO].name.toUpperCase()} (${GOOD_WHY[u](def)})`);
  return hits.length ? `GOOD HERE: ${hits.slice(0, 2).join(', ')}` : '';
}
