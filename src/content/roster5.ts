// ROSTER B batch 5 copy (t-af818b65; docs/ROSTER.md): one job word, one WHEN MERGED line, the L3 / L6 / L9 job upgrades and the
// per-level GOOD HERE tip for Crane, Dynamo and Wrecking Ball. Rules: src/core/roster5.ts. Everything here is reachable only while
// TUNING.roster5 is on (units.ts applyRoster5); Crane and Dynamo are Legendary and also need crates B (TUNING.rosterB) to drop.
import type { LevelDef } from './levels';
import { goodHereAll4 as goodHere1234 } from './roster4';
import { TUNING } from './tuning';

/** Inspect-card rows (merged into perks.ts FAMILY_INFO). `job` = the one job word; `whenMerged` = what a merge does. */
export const ROSTER_5_INFO = {
  crane: { name: 'Crane', color: 0xe0a020, role: 'RELAY', job: 'LIFT', whenMerged: 'WHEN MERGED: it lifts a part touching it onto that part\'s twin (same machine, same number). They merge right now, in the middle of your chain, once per level.', text: 'LIFT: when the chain wakes a Crane, it lifts a touching part onto its twin and they merge on the spot, in the middle of your chain. That part counts as already fired, so it does not fire again. It can do this once per level, then it only passes the chain on to its touching parts.', tryThis: 'Park it between a lonely pair and the chain.' },
  dynamo: { name: 'Dynamo', color: 0xd04a8a, role: 'RELAY', job: 'SQUARE', whenMerged: 'WHEN MERGED: if it sits in a full 2x2 block of parts it wakes the whole ring of up to 12 cells around the block. Alone it wakes only its 4 touching cells.', text: 'SQUARE: a Dynamo in a full 2x2 block of parts wakes the ring of up to 12 cells around that block (the block itself stays asleep unless something else wakes it). Not in a block, it wakes only the 4 cells touching it. Fill a square around it.', tryThis: 'Pack four parts into a square with the Dynamo in it.' },
  wrecking_ball: { name: 'Wrecking Ball', color: 0x6a7a8a, role: 'SHOOTER', job: 'DISTANCE', whenMerged: 'WHEN MERGED: it hits x1. When a chain wakes it, the hit grows with the board steps from the part that woke it: x0.6 next door, +0.3 per extra step, max x2.', text: 'DISTANCE: a Wrecking Ball hits harder the farther away the part that woke it is. Next door it hits x0.6, then +0.3 for every extra step along the board, up to x2. Count steps (up, down, left, right), not cells in a line.', tryThis: 'Wake it from the far side of the board.' },
} as const;

/** L3 / L6 / L9 job upgrades (merged into units.ts UNIT_PERKS). */
export const ROSTER_5_PERKS: Record<string, [string, string][]> = {
  crane: [['Long Arm', 'Lifts a part up to 2 steps away'], ['Phase Lift', 'One more lift for every boss armor phase'], ['Chain Lift', 'The lifted part wakes its neighbours']],
  dynamo: [['Corner Block', '3 parts plus the Dynamo (an L) count as a block'], ['Twin Dynamos', 'Two Dynamos in one block: the ring is 2 cells wide'], ['Block Party', 'The block\'s parts hit x1.25 (held to x1.5 with other relay bonuses)']],
  wrecking_ball: [['Heavy Iron', 'The hit can reach x2.3'], ['Knock Over', 'Knocks the part it swings over 1 cell (no damage)'], ['Long Swing', 'Woken from 4+ steps away, it also wakes the cell behind it']],
};

/** Unit-page text for the new units (they have no guide page of their own). */
export const ROSTER_5_GUIDE: Record<string, { text: string }> = Object.fromEntries(Object.entries(ROSTER_5_INFO).map(([k, v]) => [k, { text: `${v.text}\n${v.whenMerged}` }]));
/** [family, row, col] pieces on the 3x5 demo board; links [from, to, depth]; big = the hit that shows the job. */
export const ROSTER_5_DEMOS: Record<string, { pieces: [string, number, number][]; links: [number, number, number][]; big?: number[] }> = {
  crane: { pieces: [['coil', 1, 0], ['crane', 1, 1], ['bell', 0, 1], ['bell', 0, 2], ['cannon', 1, 3]], links: [[0, 1, 1], [1, 4, 2]] },
  dynamo: { pieces: [['dynamo', 1, 1], ['coil', 1, 2], ['bell', 0, 1], ['bell', 0, 2], ['cannon', 0, 0], ['cannon', 2, 3], ['rocket', 1, 3]], links: [[0, 4, 1], [0, 5, 1], [0, 6, 1]], big: [6] },
  wrecking_ball: { pieces: [['coil', 1, 0], ['bell', 1, 1], ['wrecking_ball', 1, 4], ['cannon', 0, 1]], links: [[0, 1, 1], [1, 2, 2]], big: [2] },
};

/** Why each unit fits a level (GOOD HERE). */
const GOOD_WHY: Record<string, (d: LevelDef) => string | null> = {
  crane: (d) => (d.goal?.kind === 'rank' ? 'a free merge in the middle of the chain' : null),
  dynamo: (d) => (d.goal?.kind === 'chain' ? 'a packed square wakes a ring of 12' : null),
  wrecking_ball: (d) => (d.boss_node || d.mini_boss ? 'wake it from the far side for a big hit' : null),
};

/** Level card GOOD HERE tip: the owned batch 5 units that suit this level, or '' (flag OFF: always ''). */
export function goodHereText5(def: LevelDef, owns: (unit: string) => boolean): string {
  if (!TUNING.roster5) return '';
  const hits = Object.keys(GOOD_WHY).filter((u) => owns(u) && GOOD_WHY[u](def)).map((u) => `${ROSTER_5_INFO[u as keyof typeof ROSTER_5_INFO].name.toUpperCase()} (${GOOD_WHY[u](def)})`);
  return hits.length ? `GOOD HERE: ${hits.slice(0, 2).join(', ')}` : '';
}

/** GOOD HERE for all five roster batches on one line (the level card shows a single tip line). */
export function goodHereAll5(def: LevelDef, owns: (unit: string) => boolean): string {
  const a = goodHere1234(def, owns), b = goodHereText5(def, owns);
  return a && b ? `${a}, ${b.replace('GOOD HERE: ', '')}` : a || b;
}
