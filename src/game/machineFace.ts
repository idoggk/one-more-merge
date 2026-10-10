import { CAST, MONSTER_INDEX } from '../content/levels';

/**
 * Face-patch index (face_<n>_<mood>) for the machine drawn right now, or -1 when it has no patch.
 * A stage's machine decides it (not the level's headline monster), and cast / boss art never gets one.
 */
export function faceIndexFor(opts: { boss: boolean; castDrawn: boolean; stageVisual?: string; target: number }): number {
  if (opts.boss || opts.castDrawn) return -1;
  const v = opts.stageVisual;
  if (v && !CAST[v] && MONSTER_INDEX[v] !== undefined) return MONSTER_INDEX[v];
  return opts.target;
}
