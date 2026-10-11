// The single source of truth for camera shake. Every shake goes through shakeSpec(), which applies the
// SCREEN SHAKE setting (OFF / SOFT / FULL). FULL is exactly the original amplitudes; SOFT is ~35% of them,
// shorter, and skips the small kicks. The level is a phone setting kept in its own key (not in the save code).
export type ShakeLevel = 'off' | 'soft' | 'full';
export const SHAKE_LEVELS: ShakeLevel[] = ['off', 'soft', 'full'];
export const SHAKE_KEY = 'omm_shake';
/** SOFT's share of FULL's amplitude and duration. */
export const SOFT_AMP = 0.35;
export const SOFT_TIME = 0.7;

export type ShakeKind = 'chainBig' | 'chainMid' | 'maxKick' | 'bossFinal' | 'bossRansom' | 'bomb' | 'yardHit' | 'yardFail' | 'boxLatch' | 'preview';

/** FULL values: what the game did before the setting existed. chainMid (a 4-7 chain) never shook, so it only exists in SOFT. */
export const FULL_SHAKE: Record<ShakeKind, { ms: number; amp: number } | null> = {
  chainBig: { ms: 180, amp: 0.006 },
  chainMid: null,
  maxKick: { ms: 80, amp: 0.002 },
  bossFinal: { ms: 120, amp: 0.004 },
  bossRansom: { ms: 140, amp: 0.004 },
  bomb: { ms: 140, amp: 0.005 },
  yardHit: { ms: 140, amp: 0.006 },
  yardFail: { ms: 260, amp: 0.008 },
  boxLatch: { ms: 90, amp: 0.0025 },
  preview: { ms: 90, amp: 0.003 },
};
/** SOFT values, set apart from the 35% rule: a 4-7 chain gets its own gentle nudge, the small max kick gets none. */
const SOFT_ONLY: Partial<Record<ShakeKind, { ms: number; amp: number } | null>> = {
  chainMid: { ms: 90, amp: 0.0015 },
  maxKick: null,
};

/** The saved level wins; otherwise OFF when the OS asks for reduced motion (or the old Shake switch was off), else SOFT. */
export function resolveShakeLevel(stored: string | null | undefined, reducedMotion: boolean, legacyOff = false): ShakeLevel {
  if (stored === 'off' || stored === 'soft' || stored === 'full') return stored;
  return reducedMotion || legacyOff ? 'off' : 'soft';
}

/** Duration (ms) and intensity for a shake, or null for none. */
export function shakeSpec(kind: ShakeKind, level: ShakeLevel): { ms: number; amp: number } | null {
  if (level === 'off') return null;
  if (level === 'full') return FULL_SHAKE[kind];
  if (kind in SOFT_ONLY) return SOFT_ONLY[kind] ?? null;
  const f = FULL_SHAKE[kind];
  return f && { ms: Math.round(f.ms * SOFT_TIME), amp: f.amp * SOFT_AMP };
}

export const reduced = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

export function getShakeLevel(legacyOff = false): ShakeLevel {
  let stored: string | null = null;
  try {
    stored = localStorage.getItem(SHAKE_KEY);
  } catch {
    /* storage blocked: fall back to the default */
  }
  return resolveShakeLevel(stored, reduced(), legacyOff);
}

export function setShakeLevel(level: ShakeLevel) {
  try {
    localStorage.setItem(SHAKE_KEY, level);
  } catch {
    /* storage blocked: the choice lasts until the page closes only if stored elsewhere; ignore */
  }
}

export const nextShakeLevel = (l: ShakeLevel): ShakeLevel => SHAKE_LEVELS[(SHAKE_LEVELS.indexOf(l) + 1) % SHAKE_LEVELS.length];

/** Shakes `cam` for `kind` at the player's level. */
export function shakeCamera(cam: { shake(ms: number, amp: number): unknown }, kind: ShakeKind, legacyOff = false) {
  const s = shakeSpec(kind, getShakeLevel(legacyOff));
  if (s) cam.shake(s.ms, s.amp);
}
