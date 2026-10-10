// ROSTER B batch 4 copy (t-1e3c8bb6; docs/ROSTER.md): one job word, one WHEN MERGED line, the L3 / L6 / L9 job upgrades and the
// per-level GOOD HERE tip for Capacitor, Blueprint, Ladder and Rewind Crank. Rules: src/core/roster4.ts. Everything here is
// reachable only while TUNING.roster4 is on (units.ts applyRoster4).
import type { LevelDef } from './levels';
import { goodHereAll3 as goodHere123 } from './roster3';
import { TUNING } from './tuning';

/** Inspect-card rows (merged into perks.ts FAMILY_INFO). `job` = the one job word; `whenMerged` = what a merge does. */
export const ROSTER_4_INFO = {
  capacitor: { name: 'Capacitor', color: 0x3aa6c8, role: 'RELAY', job: 'HOLD', whenMerged: 'WHEN MERGED: it does not pass the chain on. It banks it, and lets it go at the start of your NEXT merge: it wakes 1 touching part.', text: 'HOLD: a Capacitor never passes a chain on. Woken in your merge, it banks the chain. At the start of your NEXT merge it lets the bank go, once: it wakes 1 touching part. It holds one chain at a time; a release never stores another release.', tryThis: 'Park it next to a shooter, merge once, then merge again.' },
  blueprint: { name: 'Blueprint', color: 0x4a78c8, role: 'SUPPORT', job: 'PLAN', whenMerged: 'WHEN MERGED: it has no board part. The card shows your next 3 deliveries; tap a part and the next delivery that is not that kind becomes a copy of it (number 1).', text: 'PLAN: a Support card. It shows the next 3 deliveries, so you can plan. Charge it with your chains, tap it, then tap a part: the next delivery that is not that kind is swapped for a copy of that part. Copies always arrive at number 1.', tryThis: 'Tap a lonely number 1 to get its twin.' },
  ladder: { name: 'Ladder', color: 0xc89a3a, role: 'RELAY', job: 'STAIRCASE', whenMerged: 'WHEN MERGED: wakes the touching part exactly 1 number higher than it, then the part touching that one 1 higher again, and so on up.', text: 'STAIRCASE: wakes the touching part that is exactly 1 number above the Ladder, then from that part the touching part 1 number above it, and so on. Every step has to touch the one before. It needs a 2-3-4 line to climb.', tryThis: 'Build a number line next to it: 2, 3, 4.' },
  rewind_crank: { name: 'Rewind Crank', color: 0x8a6ac8, role: 'SUPPORT', job: 'UNDO', whenMerged: 'WHEN MERGED: it has no board part. Every 10 merges it charges once; tap it to undo your last merge (board, deliveries, monster HP and dice all go back).', text: 'UNDO: a Support card. It charges by 1 for every merge you make, and every 10 merges you get a charge. Tap it and your last merge never happened: board, delivery queue, monster HP and the dice go back exactly. It is OFF in puzzles, the daily and bounties.', tryThis: 'Keep a charge for a merge you regret.' },
} as const;

/** L3 / L6 / L9 job upgrades (merged into units.ts UNIT_PERKS). */
export const ROSTER_4_PERKS: Record<string, [string, string][]> = {
  capacitor: [['Gauge', 'Shows what it holds'], ['Deep Release', 'The release adds 1 link of depth'], ['Twin Release', 'The release wakes 2 touching parts (still one chain, released once)']],
  blueprint: [['Wide Plan', 'Shows the next 4 deliveries'], ['Double Swap', 'Swaps 2 deliveries at once'], ['Fine Print', 'The first copy arrives at number 2']],
  ladder: [['Two-Way Steps', 'The staircase may step down a number'], ['Skip a Rung', 'May skip one number, once'], ['Top Rung', 'The top step hits x1.5']],
  rewind_crank: [['Quick Crank', 'Charges every 8 merges'], ['Spare Charge', 'Holds 2 charges'], ['Replay Peek', 'Shows the delivery you rewound']],
};

/** Unit-page text for the new units (they have no guide page of their own). */
export const ROSTER_4_GUIDE: Record<string, { text: string }> = Object.fromEntries(Object.entries(ROSTER_4_INFO).map(([k, v]) => [k, { text: `${v.text}\n${v.whenMerged}` }]));
/** [family, row, col] pieces on the 3x5 demo board; links [from, to, depth]; big = the hit that shows the job. */
export const ROSTER_4_DEMOS: Record<string, { pieces: [string, number, number][]; links: [number, number, number][]; big?: number[] }> = {
  capacitor: { pieces: [['coil', 1, 0], ['capacitor', 1, 1], ['cannon', 1, 2], ['cannon', 0, 4]], links: [[0, 1, 1]] },
  blueprint: { pieces: [['cannon', 1, 1], ['coil', 1, 2], ['bell', 1, 3]], links: [[0, 1, 1], [1, 2, 2]] },
  ladder: { pieces: [['coil', 1, 0], ['ladder', 1, 1], ['cannon', 1, 2], ['cannon', 0, 2], ['rocket', 0, 3]], links: [[0, 1, 1], [1, 2, 2], [2, 4, 3]], big: [4] },
  rewind_crank: { pieces: [['cannon', 1, 1], ['coil', 1, 2], ['bell', 1, 3]], links: [[0, 1, 1], [1, 2, 2]] },
};

/** Why each unit fits a level (GOOD HERE). */
const GOOD_WHY: Record<string, (d: LevelDef) => string | null> = {
  capacitor: (d) => (d.goal?.kind === 'chain' ? 'bank a chain, then merge again to add it on' : null),
  ladder: (d) => (d.goal?.kind === 'rank' ? 'a number line wakes in a staircase' : null),
  blueprint: (d) => (d.modifier !== 'NONE' && !d.boss_node && !d.mini_boss ? 'plan the deliveries on a tight board' : null),
  rewind_crank: (d) => (d.boss_node || d.mini_boss ? 'undo a merge the boss punished' : null),
};

/** Level card GOOD HERE tip: the owned batch 4 units that suit this level, or '' (flag OFF: always ''). */
export function goodHereText4(def: LevelDef, owns: (unit: string) => boolean): string {
  if (!TUNING.roster4) return '';
  const hits = Object.keys(GOOD_WHY).filter((u) => owns(u) && GOOD_WHY[u](def)).map((u) => `${ROSTER_4_INFO[u as keyof typeof ROSTER_4_INFO].name.toUpperCase()} (${GOOD_WHY[u](def)})`);
  return hits.length ? `GOOD HERE: ${hits.slice(0, 2).join(', ')}` : '';
}

/** GOOD HERE for all four roster batches on one line (the level card shows a single tip line). */
export function goodHereAll4(def: LevelDef, owns: (unit: string) => boolean): string {
  const a = goodHere123(def, owns), b = goodHereText4(def, owns);
  return a && b ? `${a}, ${b.replace('GOOD HERE: ', '')}` : a || b;
}
