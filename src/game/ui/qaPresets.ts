/** QA PANEL V2 presets (pure, no Phaser): a preset is "every switch at its default, then these". The panel applies one through the
 *  registry rows (apply / reset by row id), so it can never drift from the real switches. */

export interface QaPreset {
  id: string;
  title: string;
  /** What it sets, one plain sentence. */
  what: string;
  /** What to look at after tapping it. */
  look: string;
  /** Row id + value, set after everything is back to default. */
  flags: readonly (readonly [rowId: string, value: boolean | string])[];
  /** RESET ALL is a button, never the highlighted "active" preset. */
  button?: boolean;
}

export const QA_PRESETS: readonly QaPreset[] = [
  { id: 'player', title: 'PLAYER VIEW', what: 'Every switch at its shipped default: what a player sees.', look: 'Play normally. Odd things here are real bugs.', flags: [] },
  {
    id: 'features', title: 'NEW FEATURES',
    what: 'Every finished feature that is still OFF, all ON together.',
    look: 'ROAD tab, a level intro, any popup, then play a level.',
    flags: [['levelPace2', true], ['levelTimeline', true], ['roadMapMock1', true], ['mascotMotion', true], ['mapBadges', true], ['roadSurfaceKit', true], ['roadPolish', true], ['uiJuice', true], ['cratesLook', 'toolbox']],
  },
  {
    id: 'road', title: 'ROAD TEST',
    what: 'All road switches ON plus the FPS readout.',
    look: 'Open ROAD and drag it: smooth and steady? Read the FPS.',
    flags: [['roadStable', true], ['roadPolish', true], ['roadSurfaceKit', true], ['roadMapMock1', true], ['mapBadges', true], ['roadPerfHud', true]],
  },
  {
    id: 'length', title: 'LEVEL LENGTH TEST',
    what: 'Longer levels and armor clock ON. Pick a level below.',
    look: 'Time a clear: about 1 min early, 2 min later, never seconds.',
    flags: [['levelPace2', true], ['levelTimeline', true]],
  },
  { id: 'reset', title: 'RESET ALL', what: 'Every switch back to default; forgets the last preset.', look: 'Same as PLAYER VIEW. Use it when something looks odd.', flags: [], button: true },
];

export const presetById = (id: string | null | undefined) => QA_PRESETS.find((p) => p.id === id) ?? null;

/** rowId -> value as a string. */
export type Snapshot = Record<string, string>;

/** The snapshot a preset should produce: the defaults with the preset's flags laid over them. */
export function expectedSnapshot(p: QaPreset, defaults: Snapshot): Snapshot {
  const out = { ...defaults };
  for (const [id, v] of p.flags) if (id in out) out[id] = String(v);
  return out;
}

/** Row ids whose value differs between two snapshots, in the order of `a`. */
export const diffSnapshots = (a: Snapshot, b: Snapshot): string[] => Object.keys(a).filter((k) => a[k] !== b[k]);

/** The highlighted preset: the first non-button preset the current switches match exactly, or null = CUSTOM. */
export function activePreset(current: Snapshot, defaults: Snapshot): QaPreset | null {
  return QA_PRESETS.find((p) => !p.button && diffSnapshots(current, expectedSnapshot(p, defaults)).length === 0) ?? null;
}

/** "a, b, c +2 more": names of the switches that differ, cut to `max` characters. */
export function listNames(names: readonly string[], max = 56): string {
  let out = '';
  for (let i = 0; i < names.length; i++) {
    const next = out ? `${out}, ${names[i]}` : names[i];
    if (next.length > max && out) return `${out} +${names.length - i} more`;
    out = next;
  }
  return out;
}

/** The status block at the top of the panel: where the switches are now, and what changed since the last preset was set. */
export function statusLines(current: Snapshot, defaults: Snapshot, lastId: string | null, labelOf: (rowId: string) => string): string[] {
  const act = activePreset(current, defaults);
  const vsDefault = diffSnapshots(current, defaults).length;
  const now = act ? `NOW: ${act.title}` : `NOW: CUSTOM (${vsDefault} differ from PLAYER VIEW)`;
  const last = presetById(lastId);
  if (!last) return [now, 'No preset set yet on this phone.'];
  const d = diffSnapshots(current, expectedSnapshot(last, defaults));
  return [now, d.length ? `Since ${last.title}: ${listNames(d.map(labelOf))}` : `Same as the last preset you set: ${last.title}.`];
}
