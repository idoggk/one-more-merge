// ROSTER B batch 6 copy (t-f2cd50e4; docs/ROSTER.md): one job word, one WHEN MERGED line, the L3 / L6 / L9 job upgrades and the
// per-level GOOD HERE tip for Robot Arm and Tilt Lever. Rules: src/core/roster6.ts. Everything here is reachable only while
// TUNING.roster6 is on (units.ts applyRoster6); both are Legendary, so they also need crates B (TUNING.rosterB) to drop.
import type { LevelDef } from './levels';
import { goodHereAll5 as goodHere12345 } from './roster5';
import { TUNING } from './tuning';

/** Inspect-card rows (merged into perks.ts FAMILY_INFO). `job` = the one job word; `whenMerged` = what a merge does. */
export const ROSTER_6_INFO = {
  robot_arm: { name: 'Robot Arm', color: 0x5a8ad0, role: 'SHOOTER', job: 'COPY', whenMerged: 'WHEN MERGED: it fires, and does the job of the last relay that woke it (that relay\'s picture sits on the arm) from where it stands. It never copies a Legendary.', text: 'COPY: a Robot Arm remembers the last relay that woke it and shows its picture. Each time it fires it shoots AND does that relay\'s job from where it stands: a Bell rings its row, a Horn blasts its column, a Coil reaches out. It never copies a Legendary relay, and each kind of relay is copied only once per chain.', tryThis: 'Let a Bell wake it, then merge it later: it rings its row too.' },
  tilt_lever: { name: 'Tilt Lever', color: 0xd08a3a, role: 'SUPPORT', job: 'TILT', whenMerged: 'WHEN MERGED: it has no board part. Every 15 merges it charges once; tap near an edge and every part slides that way. Twins that meet merge (3 at most), each merge fires its own chain.', text: 'TILT: a Support card. It charges by 1 for every merge you make, and every 15 merges you get a charge. Tap near an edge of the board: every part slides that way as far as it can. Twins that land side by side merge, and each merge fires its own chain, one after the other (3 merges at most). A tilt never starts another tilt. It is OFF in puzzles, the daily puzzle and bounties.', tryThis: 'Tilt toward the edge where twins sit in the same row or column.' },
} as const;

/** L3 / L6 / L9 job upgrades (merged into units.ts UNIT_PERKS). */
export const ROSTER_6_PERKS: Record<string, [string, string][]> = {
  robot_arm: [['Show-Off', 'Its own shot x1.2 when it copies a Rare or Epic relay'], ['Two Memories', 'Remembers 2 relays and uses the better one'], ['Master Copy', 'Copies the relay at that relay\'s level 9 upgrade']],
  tilt_lever: [['Quick Tilt', 'Charges every 12 merges'], ['Four Merges', 'Up to 4 merges in one tilt'], ['Fine Tilt', 'Slides only the row or column you tap']],
};

/** Unit-page text for the new units (they have no guide page of their own). */
export const ROSTER_6_GUIDE: Record<string, { text: string }> = Object.fromEntries(Object.entries(ROSTER_6_INFO).map(([k, v]) => [k, { text: `${v.text}\n${v.whenMerged}` }]));
/** [family, row, col] pieces on the 3x5 demo board; links [from, to, depth]; big = the hit that shows the job. */
export const ROSTER_6_DEMOS: Record<string, { pieces: [string, number, number][]; links: [number, number, number][]; big?: number[] }> = {
  robot_arm: { pieces: [['coil', 1, 0], ['robot_arm', 1, 1], ['cannon', 1, 3], ['rocket', 0, 1]], links: [[0, 1, 1], [1, 2, 2], [1, 3, 2]], big: [3] },
  tilt_lever: { pieces: [['cannon', 1, 1], ['coil', 1, 2], ['bell', 1, 3]], links: [[0, 1, 1], [1, 2, 2]] },
};

/** Why each unit fits a level (GOOD HERE). */
const GOOD_WHY: Record<string, (d: LevelDef) => string | null> = {
  robot_arm: (d) => (d.goal?.kind === 'chain' ? 'it does a relay\'s job too: longer chains' : null),
  tilt_lever: (d) => (d.modifier !== 'NONE' && !d.boss_node && !d.mini_boss ? 'one tilt slides a tight board into merges' : null),
};

/** Level card GOOD HERE tip: the owned batch 6 units that suit this level, or '' (flag OFF: always ''). */
export function goodHereText6(def: LevelDef, owns: (unit: string) => boolean): string {
  if (!TUNING.roster6) return '';
  const hits = Object.keys(GOOD_WHY).filter((u) => owns(u) && GOOD_WHY[u](def)).map((u) => `${ROSTER_6_INFO[u as keyof typeof ROSTER_6_INFO].name.toUpperCase()} (${GOOD_WHY[u](def)})`);
  return hits.length ? `GOOD HERE: ${hits.slice(0, 2).join(', ')}` : '';
}

/** GOOD HERE for all six roster batches on one line (the level card shows a single tip line). */
export function goodHereAll6(def: LevelDef, owns: (unit: string) => boolean): string {
  const a = goodHere12345(def, owns), b = goodHereText6(def, owns);
  return a && b ? `${a}, ${b.replace('GOOD HERE: ', '')}` : a || b;
}
