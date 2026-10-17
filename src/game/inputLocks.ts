/** Every scene flag that can swallow input or stop the clock. One reset so a lock never outlives its owner (MERGE_FREEZE_AUDIT D1-D3). */
export interface InputLockHost {
  explaining: boolean;
  explainQueue: unknown[];
  explainOverlay: { destroy(): void }[];
  fuseAfterLesson: boolean;
  guided: { objs: { destroy(): void }[] } | null;
  itemLesson: boolean;
  itemSelected: boolean;
  tutorialWaiting: boolean;
  introActive: boolean;
  paused: boolean;
}

export function resetInputLocks(h: InputLockHost): void {
  for (const o of h.explainOverlay) o.destroy();
  h.explainOverlay = [];
  h.explainQueue = [];
  h.explaining = false;
  h.fuseAfterLesson = false;
  for (const o of h.guided?.objs ?? []) o.destroy();
  h.guided = null;
  h.itemLesson = false;
  h.itemSelected = false;
  h.tutorialWaiting = false;
  h.introActive = false;
  h.paused = false;
}
