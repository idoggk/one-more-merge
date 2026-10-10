// ROSTER B batch 1 copy (t-9b28a794; Direction B, t-3d56deb5 / t-e2128dd7): one job word, one WHEN MERGED line, the
// L3 / L6 / L9 job upgrades and the per-level GOOD HERE tip for Nail Gun, Drill, Gear and Saw Blade. Rules:
// src/core/roster1.ts. Everything here is reachable only while TUNING.roster1 is on (units.ts applyRoster1).
import type { LevelDef } from './levels';
import { TUNING } from './tuning';

/** Inspect-card rows (merged into perks.ts FAMILY_INFO). `job` = the one job word; `whenMerged` = what a merge does. */
export const ROSTER_1_INFO = {
  nail_gun: { name: 'Nail Gun', color: 0x8a96a8, role: 'SHOOTER', job: 'ROW', whenMerged: 'WHEN MERGED: fires +20% for every machine in its row.', text: 'ROW: never shoots by itself. Woken by a chain it fires +20% for every other machine in its row (a full row = x1.8).', tryThis: 'Keep its row full.' },
  drill: { name: 'Drill', color: 0xd8a020, role: 'SHOOTER', job: 'ARMOR', whenMerged: 'WHEN MERGED: drills through shields; x2 on bosses.', text: 'ARMOR: never shoots by itself. Its hit ignores shields, and it hits x2 against bosses and mini-bosses.', tryThis: 'Bring it to shield and boss levels.' },
  gear: { name: 'Gear', color: 0x9a7a5a, role: 'RELAY', job: 'LINK', whenMerged: 'WHEN MERGED: the chain jumps to the 2 farthest Gears.', text: 'LINK: hits the monster and wakes the machines touching it. MERGE a Gear and the chain jumps to the 2 farthest other Gears, anywhere on the board.', tryThis: 'Keep spare Gears inside your far groups of machines.' },
  saw_blade: { name: 'Saw Blade', color: 0xc8d0d8, role: 'SHOOTER', job: 'EDGE', whenMerged: 'WHEN MERGED: x1.5 on the outer ring, x0.7 inside.', text: 'EDGE: never shoots by itself. On the outer ring of the board it hits x1.5; inside the ring only x0.7.', tryThis: 'Merge it on the edge, never in the middle.' },
} as const;

/** L3 / L6 / L9 job upgrades (merged into units.ts UNIT_PERKS). */
export const ROSTER_1_PERKS: Record<string, [string, string][]> = {
  nail_gun: [['Long Magazine', 'Rank 4+: +25% per machine in its row'], ['Side Feed', 'The machines right above + below count too'], ['Nail Storm', 'Rank 7-8: a full row is x2.5']],
  drill: [['Hardened Bit', 'Rank 4+ hits x1.15'], ['Pilot Hole', 'Monsters with a special move count as armored'], ['Diamond Bit', 'Rank 7-8: x2.5 vs armored']],
  gear: [['Big Teeth', 'Rank 4+ also wakes its diagonals'], ['Spin Up', 'Every 6th spin reaches 2 cells in a cross'], ['Master Gear', 'Rank 7-8: diagonals + 2-cell cross, always']],
  saw_blade: [['Serrated', 'Rank 4+: x1.7 on the ring'], ['True Arbor', 'Inside the ring x0.9 instead of x0.7'], ['Buzzsaw', 'Rank 7-8 in a corner hits x2.2']],
};

/** Unit-page text + animated mini-board for the new units (they have no guide page of their own). */
export const ROSTER_1_GUIDE: Record<string, { text: string }> = Object.fromEntries(Object.entries(ROSTER_1_INFO).map(([k, v]) => [k, { text: `${v.text}\n${v.whenMerged}` }]));
/** [family, row, col] pieces on the 3x5 demo board; links [from, to, depth]; big = the hit that shows the job. */
export const ROSTER_1_DEMOS: Record<string, { pieces: [string, number, number][]; links: [number, number, number][]; big?: number[] }> = {
  nail_gun: { pieces: [['coil', 1, 0], ['nail_gun', 1, 2], ['cannon', 1, 1], ['bell', 1, 3], ['cannon', 1, 4]], links: [[0, 1, 1]], big: [1] },
  drill: { pieces: [['coil', 1, 1], ['drill', 1, 3], ['cannon', 0, 4]], links: [[0, 1, 1]], big: [1] },
  gear: { pieces: [['gear', 1, 0], ['gear', 1, 4], ['cannon', 0, 0], ['cannon', 2, 0], ['cannon', 0, 4], ['cannon', 2, 4]], links: [[0, 2, 1], [0, 3, 1], [0, 1, 1], [1, 4, 2], [1, 5, 2]] },
  saw_blade: { pieces: [['coil', 1, 2], ['saw_blade', 0, 2], ['saw_blade', 1, 4]], links: [[0, 1, 1]], big: [1] },
};

/** Why each unit fits a level (GOOD HERE). */
const GOOD_WHY: Record<string, (d: LevelDef) => string | null> = {
  drill: (d) => (d.behaviour === 'shield' ? 'it ignores the shield' : (d.level % 10 === 0 && !d.teach) || d.mini_boss ? 'x2 on the boss' : null),
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
