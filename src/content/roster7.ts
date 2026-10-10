// ROSTER B batch 7 copy (t-67cd7c5b; docs/ROSTER.md section 14): one job word, one WHEN MERGED line, the L3 / L6 / L9 job upgrades and the
// per-level GOOD HERE tip for Rivet Gun, Vice, Router, Hydraulic Press and Lathe. Rules: src/core/roster7.ts. Everything here is reachable only
// while TUNING.roster7 is on (units.ts applyRoster7); none of the five is Legendary, so crates B is not needed.
import type { LevelDef } from './levels';
import { goodHereAll6 as goodHere123456 } from './roster6';
import { TUNING } from './tuning';

/** Inspect-card rows (merged into perks.ts FAMILY_INFO). `job` = the one job word; `whenMerged` = what a merge does. */
export const ROSTER_7_INFO = {
  rivet_gun: { name: 'Rivet Gun', color: 0xd89030, role: 'SHOOTER', job: 'THIRD', whenMerged: 'WHEN MERGED: you merge it, so it is the 1st part to fire: it hits x1. It hits x2 when it is the 3rd part to fire in a chain.', text: 'THIRD: a Rivet Gun counts the parts that fire before it in the chain. The part you merge is the 1st. When it is the 3rd to fire it hits x2, any other place it hits x1. Put one two links from the merge.', tryThis: 'Merge a Coil next to a Bell, with the Rivet Gun a step beyond.' },
  vice: { name: 'Vice', color: 0x8a8a96, role: 'RELAY', job: 'GRIP', whenMerged: 'WHEN MERGED: ON THE EDGE it wakes the next 3 cells inward in a straight line, and shooters it wakes hit x1.4. OFF THE EDGE it does nothing special: no reach, no grip, it only wakes the 4 parts touching it.', text: 'GRIP: ON THE EDGE of the board a Vice wakes the next 3 cells going inward in a straight line (a corner: 2 cells along each of its two lines), and every shooter it wakes hits x1.4. OFF THE EDGE it does nothing special: it only wakes the 4 parts touching it, with no grip. Unlike a Bell or Horn it reaches only 3 cells, only from the edge, only straight inward, but it makes the shooters hit harder.', tryThis: 'Park it on the edge, with shooters in the next 3 cells.' },
  router: { name: 'Router', color: 0x4aa08a, role: 'RELAY', job: 'TURN', whenMerged: 'WHEN MERGED: it wakes an L of cells: 2 cells straight, then 2 cells turning clockwise. Of its 4 Ls it picks the one with the most parts, and wakes up to 2 of them.', text: 'TURN: a Router wakes an L-shaped path: 2 cells straight out, then 2 cells turning across. Of its 4 clockwise Ls it picks the one with the most parts and wakes up to 2 of them. It reaches cells a Coil, Bell or Horn cannot reach in one go.', tryThis: 'Leave a corner of parts two cells out and one across.' },
  hydraulic_press: { name: 'Hydraulic Press', color: 0x3a7ac0, role: 'SHOOTER', job: 'SQUEEZE', whenMerged: 'WHEN MERGED: it hits x3 when all 4 cells touching it hold parts, and only x0.7 otherwise. On the edge of the board it can never be full.', text: 'SQUEEZE: a Hydraulic Press hits x3 when all 4 cells touching it (up, down, left, right) hold a part. Otherwise it hits x0.7. The board edge does not count as filled, so on an edge or in a corner it is always the small hit. The opposite of a Piston: it wants a crowd.', tryThis: 'Surround it on all 4 sides, away from the edge.' },
  lathe: { name: 'Lathe', color: 0xc0a040, role: 'SHOOTER', job: 'SPAN', whenMerged: 'WHEN MERGED: ON THE EDGE it hits x0.7 + 0.25 for every step to the opposite edge (a side edge is 4 steps, a top or bottom edge 5), at most x2. OFF THE EDGE it hits x0.5.', text: 'SPAN: a Lathe must sit on the edge of the board. The farther the opposite edge, the harder it hits: x0.7 + 0.25 per step, so about x1.7 on a side edge and x1.95 on the top or bottom, never more than x2. Off the edge it only hits x0.5. Saw Blade likes the whole ring; the Lathe likes the long way across.', tryThis: 'Put it on the top or bottom edge.' },
} as const;

/** L3 / L6 / L9 job upgrades (merged into units.ts UNIT_PERKS). */
export const ROSTER_7_PERKS: Record<string, [string, string][]> = {
  rivet_gun: [['Double Rivet', 'The 6th part to fire counts too'], ['Near Miss', 'The 2nd and 4th parts hit x1.25'], ['Hot Rivet', 'The counted hit is x2.4']],
  vice: [['Long Jaw', 'Reaches 4 cells inward (a corner: 3 along each line)'], ['Side Clamp', 'Also wakes the 2 cells next to it along the edge'], ['Iron Grip', 'Shooters it wakes hit x1.6']],
  router: [['Both Turns', 'Counter-clockwise Ls too (8 Ls), and the best L wakes up to 3 parts'], ['Back-Up Turn', 'A second L wakes too when the best L holds under 3 parts'], ['Long Turn', 'The second arm is 3 cells and a second L always wakes (6 parts at most)']],
  hydraulic_press: [['Snug Fit', 'The small hit grows +0.1 per filled side (x1.0 at most)'], ['Near Full', '3 filled sides hit x1.5'], ['Full Stroke', '4 filled sides hit x3.5']],
  lathe: [['Long Bed', '+0.3 per step, up to x2.3'], ['Clear Shaft', 'An empty line to the opposite edge adds +0.2 (inside the cap)'], ['Steady Hand', 'Up to x2.4, and off the edge it hits x0.8']],
};

/** Unit-page text for the new units (they have no guide page of their own). */
export const ROSTER_7_GUIDE: Record<string, { text: string }> = Object.fromEntries(Object.entries(ROSTER_7_INFO).map(([k, v]) => [k, { text: `${v.text}\n${v.whenMerged}` }]));
/** [family, row, col] pieces on the 3x5 demo board; links [from, to, depth]; big = the hit that shows the job. */
export const ROSTER_7_DEMOS: Record<string, { pieces: [string, number, number][]; links: [number, number, number][]; big?: number[] }> = {
  rivet_gun: { pieces: [['coil', 1, 0], ['bell', 1, 1], ['rivet_gun', 1, 2], ['cannon', 0, 1]], links: [[0, 1, 1], [1, 2, 2]], big: [2] },
  vice: { pieces: [['vice', 1, 0], ['cannon', 1, 1], ['rocket', 1, 2], ['cannon', 1, 3]], links: [[0, 1, 1], [0, 2, 1], [0, 3, 1]], big: [2] },
  router: { pieces: [['router', 0, 1], ['cannon', 1, 1], ['cannon', 2, 1], ['rocket', 2, 2], ['cannon', 2, 3]], links: [[0, 1, 1], [0, 2, 1], [0, 3, 1], [0, 4, 1]], big: [3] },
  hydraulic_press: { pieces: [['coil', 1, 1], ['hydraulic_press', 1, 2], ['bell', 0, 2], ['cannon', 2, 2], ['cannon', 1, 3]], links: [[0, 1, 1]], big: [1] },
  lathe: { pieces: [['coil', 1, 1], ['lathe', 1, 0], ['bell', 0, 1]], links: [[0, 1, 1]], big: [1] },
};

/** Why each unit fits a level (GOOD HERE). */
const GOOD_WHY: Record<string, (d: LevelDef) => string | null> = {
  rivet_gun: (d) => (d.goal?.kind === 'chain' ? 'a long chain: the 3rd part hits x2' : null),
  vice: (d) => (d.goal?.kind === 'rank' ? 'park it on the edge: 3 cells in, and shooters hit harder' : null),
  router: (d) => (d.modifier === 'GAPS' ? 'its L bends around the holes' : null),
  hydraulic_press: (d) => (d.boss_node || d.mini_boss ? 'pack parts around it for a x3 hit' : null),
  lathe: (d) => (!d.boss_node && !d.mini_boss && !d.goal ? 'on the top or bottom edge it hits up to x2' : null),
};

/** Level card GOOD HERE tip: the owned batch 7 units that suit this level, or '' (flag OFF: always ''). */
export function goodHereText7(def: LevelDef, owns: (unit: string) => boolean): string {
  if (!TUNING.roster7) return '';
  const hits = Object.keys(GOOD_WHY).filter((u) => owns(u) && GOOD_WHY[u](def)).map((u) => `${ROSTER_7_INFO[u as keyof typeof ROSTER_7_INFO].name.toUpperCase()} (${GOOD_WHY[u](def)})`);
  return hits.length ? `GOOD HERE: ${hits.slice(0, 2).join(', ')}` : '';
}

/** GOOD HERE for all seven roster batches on one line (the level card shows a single tip line). */
export function goodHereAll7(def: LevelDef, owns: (unit: string) => boolean): string {
  const a = goodHere123456(def, owns), b = goodHereText7(def, owns);
  return a && b ? `${a}, ${b.replace('GOOD HERE: ', '')}` : a || b;
}
