// Unit card copy (owner: "i dont know what happens when i merge rally or support units"): one JOB word per unit and a
// plain WHEN MERGED line that is true for today's rules (core/cascade.ts with the units B0/B1 flags OFF). Shared rule:
// a merged part fires once and wakes the up-to-4 parts touching it; helpers deal no damage. tests/unitJobs.test.ts
// plays real merges to check the lines.
import { unitsB0On } from './tuning';
import { helperMult } from './units';

export const UNIT_JOB: Record<string, { job: string; merged: (level: number) => string }> = {
  cannon: { job: 'FIRE', merged: () => 'Full shot + wakes the 4 parts touching it' },
  rocket: { job: 'HEAVY', merged: () => 'Big shot (x1.3 a Cannon) + wakes the 4 touching' },
  mortar: { job: 'DEPTH', merged: () => 'Weak shot (x0.9) + wakes the 4 touching' },
  arc_welder: { job: 'ARC', merged: () => 'Light shot (x0.75), wakes the 4 touching + 1 corner part' },
  coil: { job: 'REACH', merged: () => 'Hits, wakes the 4 touching + other kinds 2 cells out' },
  bell: { job: 'ROW', merged: () => 'Hits, wakes the 4 touching + other kinds in its row' },
  horn: { job: 'COLUMN', merged: () => 'Hits, wakes the 4 touching + other kinds in its column' },
  fuse_box: { job: 'DIAGONAL', merged: () => 'Hits, wakes the 4 touching + other kinds on its corners' },
  battery: { job: 'CHARGE', merged: (l) => `No hit. Wakes the 4 touching; a touching shooter hits x${+helperMult.battery(l).toFixed(2)}` },
  amplifier: { job: 'MARK', merged: (l) => `No hit. Wakes the 4 touching; the best touching one hits x${+helperMult.amplifier(l).toFixed(2)}` },
  signal_beacon: { job: 'SPREAD', merged: (l) => `No hit. Wakes the 4 touching; nearest shooter + relay x${+helperMult.signal_beacon(l).toFixed(2)}` },
  magnet: { job: 'PULL', merged: () => 'No hit. Wakes the 4 touching; pulls a part in beside it' },
  fan: { job: 'PUSH', merged: () => 'No hit. Wakes the 4 touching. It pushes only when woken' },
};

/** Card copy for a unit at `level`. The WHEN MERGED line is hidden while a units B0/B1 QA switch changes the rules. */
export function unitJob(id: string, level = 1): { job: string; merged: string | null } | null {
  const j = UNIT_JOB[id];
  return j ? { job: j.job, merged: unitsB0On() ? null : `WHEN MERGED: ${j.merged(Math.max(1, level))}` } : null;
}
