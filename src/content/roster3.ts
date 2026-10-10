// ROSTER B batch 3 copy (t-e728a5a6; docs/ROSTER.md): one job word, one WHEN MERGED line, the L3 / L6 / L9 job upgrades and the
// per-level GOOD HERE tip for Blowtorch, Pipe, Blast Plate and Tesla Tower. Rules: src/core/roster3.ts. Everything here is
// reachable only while TUNING.roster3 is on (units.ts applyRoster3).
import type { LevelDef } from './levels';
import { goodHereAll as goodHere12 } from './roster2';
import { TUNING } from './tuning';

/** Inspect-card rows (merged into perks.ts FAMILY_INFO). `job` = the one job word; `whenMerged` = what a merge does. */
export const ROSTER_3_INFO = {
  blowtorch: { name: 'Blowtorch', color: 0xff7a1a, role: 'SHOOTER', job: 'HAZARDS', whenMerged: 'WHEN MERGED: fires; every junk block, clamp or frost row in its column burns away and the hit grows x1.5 for each (max x2.25).', text: 'HAZARDS: never shoots by itself. Woken by a chain, its shot runs along its column and burns junk blocks, clamps and a frost row there. Each hazard burned makes the hit x1.5 (two count, max x2.25). With nothing to burn it hits plain.', tryThis: 'Keep it under the boss\'s marked cell.' },
  pipe: { name: 'Pipe', color: 0x6a9a8a, role: 'RELAY', job: 'SAME FAMILY', whenMerged: 'WHEN MERGED: wakes the 4 touching, then every same-kind part joined to them (max 4).', text: 'SAME FAMILY: wakes the parts touching it, and every part of that same kind joined to them in a group (up to 4 in all). A row of Cannons next to a Pipe all fire. It counts toward the x3 chain cap like any relay.', tryThis: 'Put a Pipe beside a group of one kind.' },
  blast_plate: { name: 'Blast Plate', color: 0x8a8fa8, role: 'SUPPORT', job: 'DEFENCE', whenMerged: 'WHEN MERGED: it has no board part. Charge the card, tap a cell: the next boss attack that would hit it is blocked.', text: 'DEFENCE: a Support card. Charge it with your chains, then tap a cell. The next boss attack that would hit that cell is blocked and does nothing. It is the only unit that blocks boss attacks.', tryThis: 'Tap the cell the boss just marked.' },
  tesla_tower: { name: 'Tesla Tower', color: 0x6ad0ff, role: 'SHOOTER', job: 'STORM', whenMerged: 'WHEN MERGED: fires; every relay in the chain within 3 cells charges it +12% (max 6 charges).', text: 'STORM: never shoots by itself. Every relay that fires in the chain within 3 cells of the Tower gives it 1 charge. One big bolt at the end: +12% per charge, max 6 charges (+72%).', tryThis: 'Ring it with relays.' },
} as const;

/** L3 / L6 / L9 job upgrades (merged into units.ts UNIT_PERKS). */
export const ROSTER_3_PERKS: Record<string, [string, string][]> = {
  blowtorch: [['Hot Tip', 'Also burns a bomb mark and oil slick in its column'], ['Wide Flame', 'Also burns the column to its right'], ['Pilot Light', 'With nothing to burn, its shot still hits x1.2']],
  pipe: [['Long Run', 'Wakes up to 6 parts instead of 4'], ['Elbow Joints', 'The flow runs along diagonals too'], ['Pressure Release', 'The last part in the flow hits x1.3']],
  blast_plate: [['Wide Plate', 'Covers 1x2 cells'], ['Double Plate', 'Blocks 2 attacks before it breaks'], ['Shock Wave', 'When a block lands, the boss is stunned for 2 s']],
  tesla_tower: [['Long Arc', 'Counts relays within 4 cells'], ['Close Contact', 'A relay touching the Tower gives 2 charges (still max 6)'], ['Storm Front', 'Counts relays within 5 cells']],
};

/** Unit-page text for the new units (they have no guide page of their own). */
export const ROSTER_3_GUIDE: Record<string, { text: string }> = Object.fromEntries(Object.entries(ROSTER_3_INFO).map(([k, v]) => [k, { text: `${v.text}\n${v.whenMerged}` }]));
/** [family, row, col] pieces on the 3x5 demo board; links [from, to, depth]; big = the hit that shows the job. */
export const ROSTER_3_DEMOS: Record<string, { pieces: [string, number, number][]; links: [number, number, number][]; big?: number[] }> = {
  blowtorch: { pieces: [['coil', 1, 1], ['blowtorch', 1, 3], ['cannon', 0, 0], ['cannon', 2, 4]], links: [[0, 1, 1]], big: [1] },
  pipe: { pieces: [['coil', 1, 0], ['pipe', 1, 1], ['cannon', 1, 2], ['cannon', 0, 2], ['cannon', 0, 3]], links: [[0, 1, 1], [1, 2, 2], [1, 3, 3], [1, 4, 3]] },
  blast_plate: { pieces: [['cannon', 1, 1], ['coil', 1, 2], ['bell', 1, 3]], links: [[0, 1, 1], [1, 2, 2]] },
  tesla_tower: { pieces: [['coil', 1, 0], ['bell', 0, 1], ['tesla_tower', 1, 2], ['coil', 2, 3]], links: [[0, 1, 1], [0, 2, 1], [0, 3, 2]], big: [2] },
};

/** Why each unit fits a level (GOOD HERE). */
const GOOD_WHY: Record<string, (d: LevelDef) => string | null> = {
  blowtorch: (d) => (d.behaviour === 'frost' || d.modifier === 'JAM' ? 'it burns the frost and locks' : d.boss_node || d.mini_boss ? 'it burns what the boss throws' : null),
  pipe: (d) => (d.modifier === 'NONE' && !d.behaviour && !d.goal && !d.boss_node && !d.mini_boss && d.level % 2 === 0 ? 'a group of one kind wakes together' : null),
  blast_plate: (d) => (d.boss_node || d.mini_boss ? 'it blocks a boss attack' : null),
  tesla_tower: (d) => (d.goal?.kind === 'chain' ? 'every relay in the chain charges it' : null),
};

/** Level card GOOD HERE tip: the owned batch 3 units that suit this level, or '' (flag OFF: always ''). */
export function goodHereText3(def: LevelDef, owns: (unit: string) => boolean): string {
  if (!TUNING.roster3) return '';
  const hits = Object.keys(GOOD_WHY).filter((u) => owns(u) && GOOD_WHY[u](def)).map((u) => `${ROSTER_3_INFO[u as keyof typeof ROSTER_3_INFO].name.toUpperCase()} (${GOOD_WHY[u](def)})`);
  return hits.length ? `GOOD HERE: ${hits.slice(0, 2).join(', ')}` : '';
}

/** GOOD HERE for all three roster batches on one line (the level card shows a single tip line). */
export function goodHereAll3(def: LevelDef, owns: (unit: string) => boolean): string {
  const a = goodHere12(def, owns), b = goodHereText3(def, owns);
  return a && b ? `${a}, ${b.replace('GOOD HERE: ', '')}` : a || b;
}
