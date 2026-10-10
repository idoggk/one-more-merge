// ROSTER B batch 2 copy (t-ee4e93d7; docs/ROSTER.md): one job word, one WHEN MERGED line, the L3 / L6 / L9 job upgrades and
// the per-level GOOD HERE tip for Wrench, Piston, Spring and Belt Drive. Rules: src/core/roster2.ts. Everything here is
// reachable only while TUNING.roster2 is on (units.ts applyRoster2).
import type { LevelDef } from './levels';
import { goodHereText as goodHere1 } from './roster1';
import { TUNING } from './tuning';

/** Inspect-card rows (merged into perks.ts FAMILY_INFO). `job` = the one job word; `whenMerged` = what a merge does. */
export const ROSTER_2_INFO = {
  wrench: { name: 'Wrench', color: 0xc8a050, role: 'SUPPORT', job: 'UPGRADE', whenMerged: 'WHEN MERGED: it has no board part. After you build a rank 3+, your next merge counts +1 rank for its perks, reach and hit.', text: 'UPGRADE: it never sits on the board and needs no tap. After you make a rank 3+ part, the NEXT part you merge counts one rank higher: its rank perks and reach switch on early and its hit grows a little. The part\'s real rank never changes.', tryThis: 'Build a rank 3, then merge your biggest chain starter.' },
  piston: { name: 'Piston', color: 0xd05a3a, role: 'SHOOTER', job: 'OPEN SPACE', whenMerged: 'WHEN MERGED: fires +25% for every EMPTY cell touching it (max x2).', text: 'OPEN SPACE: never shoots by itself. Woken by a chain it fires +25% for every EMPTY cell touching it (up, down, left, right), up to x2. The board edge is not empty.', tryThis: 'Keep room around it.' },
  spring: { name: 'Spring', color: 0x7ac060, role: 'RELAY', job: 'HOP', whenMerged: 'WHEN MERGED: wakes the 4 touching, and hops the chain over the next part to wake the one after it (within 3 cells).', text: 'HOP: the chain enters one side; it skips exactly the next part in line and wakes the one after it, both within 3 cells. The skipped part does not wake. With only one part in reach there is nothing to skip: it wakes that one. A Spring you merge hops every way.', tryThis: 'Line up part, gap part, target.' },
  belt_drive: { name: 'Belt Drive', color: 0x6a7a90, role: 'RELAY', job: 'BRIDGE', whenMerged: 'WHEN MERGED: wakes the 4 touching, and its row\'s far ends. Woken by a chain: it jumps to the far end of its line.', text: 'BRIDGE: the chain enters one side and exits at the FAR end of the line (the last part). Every part in between stays asleep. A Belt Drive you merge bridges both ends of its row.', tryThis: 'Put your biggest shooter at the end of the row.' },
} as const;

/** L3 / L6 / L9 job upgrades (merged into units.ts UNIT_PERKS). */
export const ROSTER_2_PERKS: Record<string, [string, string][]> = {
  wrench: [['Quick Grip', 'A rank 2+ merge arms it too'], ['Toolbelt', 'A rank 3+ merge arms your next 2 merges (holds 2)'], ['Big Torque', 'After a rank 6+ merge, the next merge counts +2 ranks']],
  piston: [['Side Room', 'Empty diagonal cells count too: +10% each (still max x2)'], ['Recoil', 'When it fires, it shoves the nearest touching part 1 cell away (no damage)'], ['Light Load', 'Max x2.2 while the board holds 8 or fewer parts']],
  spring: [['Both Ways', 'Also hops back along the line the chain came in on'], ['Spring Chain', 'A Spring can wake a Spring (each fires once)'], ['Wall Bounce', 'If the hop would leave the board, it hops along the wall instead']],
  belt_drive: [['Deep Exit', 'The part before the far end wakes too'], ['Belt Line', 'A Belt Drive can wake a Belt Drive, and wakes any Belt Drive it passes over (each fires once)'], ['Overdrive Exit', 'The exit part hits x1.25']],
};

/** Unit-page text for the new units (they have no guide page of their own). */
export const ROSTER_2_GUIDE: Record<string, { text: string }> = Object.fromEntries(Object.entries(ROSTER_2_INFO).map(([k, v]) => [k, { text: `${v.text}\n${v.whenMerged}` }]));
/** [family, row, col] pieces on the 3x5 demo board; links [from, to, depth]; big = the hit that shows the job. */
export const ROSTER_2_DEMOS: Record<string, { pieces: [string, number, number][]; links: [number, number, number][]; big?: number[] }> = {
  wrench: { pieces: [['cannon', 1, 1], ['cannon', 1, 2], ['coil', 0, 3], ['rocket', 1, 4]], links: [[0, 2, 1], [0, 3, 1]], big: [0] },
  piston: { pieces: [['coil', 1, 1], ['piston', 1, 3], ['cannon', 0, 0], ['cannon', 2, 0]], links: [[0, 1, 1]], big: [1] },
  spring: { pieces: [['coil', 1, 0], ['spring', 1, 1], ['cannon', 1, 2], ['cannon', 1, 3], ['cannon', 0, 4]], links: [[0, 1, 1], [1, 3, 2]] },
  belt_drive: { pieces: [['coil', 1, 0], ['belt_drive', 1, 1], ['cannon', 1, 2], ['bell', 1, 3], ['cannon', 1, 4]], links: [[0, 1, 1], [1, 4, 2]] },
};

/** Why each unit fits a level (GOOD HERE). */
const GOOD_WHY: Record<string, (d: LevelDef) => string | null> = {
  wrench: (d) => (d.boss_node || d.mini_boss ? 'one big merge hits a rank higher' : null),
  piston: (d) => (d.modifier === 'GAPS' || d.modifier === 'CORNERS_2' || d.modifier === 'CORNERS_4' ? 'the empty cells stay empty' : null),
  spring: (d) => (d.behaviour === 'frost' ? 'it hops over a frozen part' : null),
  belt_drive: (d) => (d.goal?.kind === 'chain' ? 'it reaches the far end of a full row' : null),
};

/** Level card GOOD HERE tip: the owned batch 2 units that suit this level, or '' (flag OFF: always ''). */
export function goodHereText2(def: LevelDef, owns: (unit: string) => boolean): string {
  if (!TUNING.roster2) return '';
  const hits = Object.keys(GOOD_WHY).filter((u) => owns(u) && GOOD_WHY[u](def)).map((u) => `${ROSTER_2_INFO[u as keyof typeof ROSTER_2_INFO].name.toUpperCase()} (${GOOD_WHY[u](def)})`);
  return hits.length ? `GOOD HERE: ${hits.slice(0, 2).join(', ')}` : '';
}

/** GOOD HERE for both roster batches on one line (the level card shows a single tip line). */
export function goodHereAll(def: LevelDef, owns: (unit: string) => boolean): string {
  const a = goodHere1(def, owns), b = goodHereText2(def, owns);
  return a && b ? `${a}, ${b.replace('GOOD HERE: ', '')}` : a || b;
}
