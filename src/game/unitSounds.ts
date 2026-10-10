// t-e91097cd: every unit has a sound when it fires in a chain (owner: units should feel different). One sound per family
// per beat; the original five keep their sounds exactly. Reuses / re-pitches the synth tones in audio.ts.
import type { Family } from '../core/types';
import { sfx } from './audio';

export const UNIT_SOUND: Record<Family, (at: number, rank: number) => void> = {
  cannon: (at) => sfx.cannon(at + 0.02, true),
  coil: (at) => sfx.zap(at),
  bell: (at, rank) => sfx.bell(rank, at),
  magnet: (at) => sfx.magnet(at),
  battery: (at) => sfx.battery(at),
  fan: (at) => sfx.fan(at),
  rocket: (at) => sfx.rocket(at),
  mortar: (at) => sfx.mortar(at),
  arc_welder: (at) => sfx.arc(at),
  horn: (at) => sfx.horn(at),
  fuse_box: (at) => sfx.fuse(at),
  amplifier: (at) => sfx.amp(at),
  signal_beacon: (at) => sfx.beacon(at),
  nail_gun: (at) => sfx.roster1('nail_gun', at),
  jackhammer: (at) => sfx.roster1('jackhammer', at),
  gear: (at) => sfx.roster1('gear', at),
  saw_blade: (at) => sfx.roster1('saw_blade', at),
  wrench: (at) => sfx.roster2('wrench', at),
  piston: (at) => sfx.roster2('piston', at),
  spring: (at) => sfx.roster2('spring', at),
  belt_drive: (at) => sfx.roster2('belt_drive', at),
  blowtorch: (at) => sfx.roster3('blowtorch', at),
  pipe: (at) => sfx.roster3('pipe', at),
  blast_plate: (at) => sfx.roster3('blast_plate', at),
  tesla_tower: (at) => sfx.roster3('tesla_tower', at),
};

/** Sounds for one presentation beat: each family that fires in it plays once (the first one's rank). */
export function playBeatSounds(acts: { family: Family; rank: number }[], at: number) {
  const seen = new Set<Family>();
  for (const a of acts) {
    if (seen.has(a.family)) continue;
    seen.add(a.family);
    UNIT_SOUND[a.family](at, a.rank);
  }
}
