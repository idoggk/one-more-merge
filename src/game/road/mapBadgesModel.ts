// MAP BADGES (flag MAP_BADGES): pure rules for the feature badges around the road map. No Phaser, no saves, no game Rng.
// Source of the numbers: docs/art/ROADMAP_LAYOUT.md (branch orch/t-6b2bcbeb...). Timers marked `demo` are fixed demo values (no real data yet).

export type BadgeId = 'daily' | 'quests' | 'season' | 'events' | 'offers' | 'album' | 'mail' | 'settings';
export type BadgeState = 'idle' | 'ready' | 'timer' | 'locked';
/** Where a badge lives: the left rail, the right rail, or the small floating chips (mail, settings). */
export type BadgeSide = 'L' | 'R' | 'F';
/** What a tap does: open an existing screen, or show the 'coming soon' toast (stub, never changes state). */
export type BadgeTarget = 'toast' | 'season' | 'events' | 'settings';

export interface BadgeDef {
  id: BadgeId;
  side: BadgeSide;
  label: string;
  glyph: string;
  /** current level (cleared + 1) at which the badge appears */
  unlock: number;
  target: BadgeTarget;
  /** a fixed demo timer in seconds (flagged demo: no real clock behind it yet) */
  demoTimer?: number;
  /** demo count ribbon text */
  demoCount?: string;
  /** copy for a demo ready dot */
  demoReady?: boolean;
}

export const BADGES: readonly BadgeDef[] = [
  { id: 'daily', side: 'L', label: 'DAILY', glyph: 'GIFT', unlock: 2, target: 'toast', demoTimer: 6 * 3600 },
  { id: 'quests', side: 'L', label: 'QUESTS', glyph: '!', unlock: 4, target: 'toast', demoCount: '1/3' },
  { id: 'season', side: 'L', label: 'SEASON', glyph: '*', unlock: 4, target: 'season' },
  { id: 'events', side: 'R', label: 'EVENTS', glyph: 'FLAG', unlock: 5, target: 'events', demoTimer: 22 * 3600 },
  { id: 'offers', side: 'R', label: 'OFFERS', glyph: '%', unlock: 3, target: 'toast', demoTimer: 3 * 3600 },
  { id: 'album', side: 'R', label: 'ALBUM', glyph: 'BOOK', unlock: 6, target: 'toast', demoCount: '12/40' },
  { id: 'mail', side: 'F', label: 'MAIL', glyph: 'MAIL', unlock: 8, target: 'toast' },
  { id: 'settings', side: 'F', label: 'SETTINGS', glyph: 'GEAR', unlock: 1, target: 'settings' },
];

export const RAIL_CAP = 3; // per rail; a 4th goes to the overflow count
export const TEASER_AHEAD = 2; // a locked badge shows only when its unlock level is within this many levels
export const FLOAT_COOLDOWN_MS = 10 * 60 * 1000; // the floating chip shows at most once per 10 min per type

export interface BadgeCtx {
  /** the level the player is on (cleared + 1) */
  level: number;
  /** season tiers waiting to be claimed (real data) */
  seasonClaimable: number;
}

export const isUnlocked = (d: BadgeDef, ctx: BadgeCtx) => ctx.level >= d.unlock;

/** Real state from game data. Demo timers make daily / events / offers show a timer pill (flagged demo, see badgeIsDemo). */
export function badgeState(d: BadgeDef, ctx: BadgeCtx): BadgeState {
  if (!isUnlocked(d, ctx)) return 'locked';
  if (d.id === 'season' && ctx.seasonClaimable > 0) return 'ready';
  if (d.demoTimer) return 'timer';
  return 'idle';
}

/** NEW tag: on the level a badge unlocks (no save needed; leaves on the next level). */
export const isFresh = (p: { def: BadgeDef; state: BadgeState }, ctx: BadgeCtx) => p.state !== 'locked' && ctx.level === p.def.unlock && p.def.unlock > 1;

/** True when the shown timer / count is a fixed demo value rather than live data. */
export const badgeIsDemo = (d: BadgeDef, state: BadgeState) => (state === 'timer' && !!d.demoTimer) || (state === 'idle' && !!d.demoCount);

/** "22h", "3h 05m", "04:12", "0:09"; never negative. Under an hour shows mm:ss, under a minute 0:ss. */
export function formatTimer(sec: number): string {
  const s = Math.max(0, Math.floor(Number.isFinite(sec) ? sec : 0));
  if (s >= 3600) {
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
    return h >= 10 || m === 0 ? `${h}h` : `${h}h ${String(m).padStart(2, '0')}m`;
  }
  const m = Math.floor(s / 60);
  return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

/** Timer pill colour: copper normally, red under one hour. */
export const timerUrgent = (sec: number) => sec < 3600;

/** Sort rank, lower first: ready, then timers (soonest first), then idle, then locked teaser. */
function rank(d: BadgeDef, st: BadgeState): number {
  return st === 'ready' ? 0 : st === 'timer' ? 1 : st === 'idle' ? 2 : 3;
}

export interface PlacedBadge {
  def: BadgeDef;
  state: BadgeState;
  /** slot index inside its group (0 = top) */
  slot: number;
}

export interface BadgeLayout {
  left: PlacedBadge[];
  right: PlacedBadge[];
  floats: PlacedBadge[];
  /** badges that did not fit the rail cap, per side */
  overflow: { L: number; R: number };
}

/** The forced-state QA mode: 'auto' = real rules; the others show EVERY badge in that one state, ignoring unlock levels and the cap. */
export type BadgeForce = 'auto' | BadgeState;
export const BADGE_FORCE_OPTIONS: readonly BadgeForce[] = ['auto', 'idle', 'ready', 'timer', 'locked'];
export const isBadgeForce = (v: unknown): v is BadgeForce => BADGE_FORCE_OPTIONS.includes(v as BadgeForce);

/** Which badges show, on which side, in which order. Rules: rails cap at 3, one locked teaser at most and only when 1-2 levels away,
 *  ready first then soonest timer then idle; the teaser is the lowest priority and never pushes a live badge out. */
export function layoutBadges(ctx: BadgeCtx, force: BadgeForce = 'auto', sideOf: (d: BadgeDef) => BadgeSide = (d) => d.side): BadgeLayout {
  const out: BadgeLayout = { left: [], right: [], floats: [], overflow: { L: 0, R: 0 } };
  if (force !== 'auto') {
    for (const d of BADGES) {
      const list = sideOf(d) === 'L' ? out.left : sideOf(d) === 'R' ? out.right : out.floats;
      list.push({ def: d, state: force, slot: list.length });
    }
    return out;
  }
  const live: PlacedBadge[] = [];
  let teaser: BadgeDef | null = null;
  for (const d of BADGES) {
    if (sideOf(d) === 'F') {
      if (isUnlocked(d, ctx)) out.floats.push({ def: d, state: badgeState(d, ctx), slot: out.floats.length });
      continue;
    }
    if (isUnlocked(d, ctx)) live.push({ def: d, state: badgeState(d, ctx), slot: 0 });
    else if (d.unlock - ctx.level <= TEASER_AHEAD && (!teaser || d.unlock < teaser.unlock)) teaser = d;
  }
  if (teaser) live.push({ def: teaser, state: 'locked', slot: 0 });
  const place = (side: 'L' | 'R', list: PlacedBadge[]) => {
    const mine = live
      .filter((p) => sideOf(p.def) === side)
      .sort((a, b) => rank(a.def, a.state) - rank(b.def, b.state) || (a.def.demoTimer ?? 1e9) - (b.def.demoTimer ?? 1e9) || BADGES.indexOf(a.def) - BADGES.indexOf(b.def));
    mine.slice(0, RAIL_CAP).forEach((p, i) => list.push({ ...p, slot: i }));
    out.overflow[side] = Math.max(0, mine.length - RAIL_CAP);
  };
  place('L', out.left);
  place('R', out.right);
  return out;
}

/** The badge a floating "claim" chip points at: the first ready badge, else null. */
export function floatChipTarget(l: BadgeLayout): PlacedBadge | null {
  return [...l.left, ...l.right].find((p) => p.state === 'ready') ?? null;
}

/** Cooldown gate (session memory only, nothing saved). */
export const cooldownOk = (lastMs: number | undefined, nowMs: number, gapMs: number) => lastMs === undefined || nowMs - lastMs >= gapMs;

// ---- art keys: the real texture when it exists, otherwise the code drawing --------------------------------------------------
export const KEY_DOT = 'badge_dot_red';
export const KEY_RIBBON = 'badge_timer_ribbon';
export const KEY_NEW = 'badge_new_tag';
export const KEY_LOCK = 'badge_lock';
export const baseKey = (state: BadgeState) => `badge_base_${state}`;
export const glyphKey = (id: BadgeId) => `badge_glyph_${id}`;

/** The wanted keys in order of preference: the state's own base, then the idle base. */
export const baseKeyChain = (state: BadgeState) => (state === 'idle' ? [baseKey('idle')] : [baseKey(state), baseKey('idle')]);

/** First key that exists, or null (= draw the code placeholder). */
export function resolveKey(has: (k: string) => boolean, keys: readonly string[]): string | null {
  for (const k of keys) if (has(k)) return k;
  return null;
}

/** Screen positions in design px (W = 720). pt * 1.846 from the wireframe (390 pt wide). */
export const RAIL_X = { L: 63, R: 657 };
export const RAIL_Y0 = 310, RAIL_PITCH = 126;
export const FLOAT_Y = 212, FLOAT_X0 = 44, FLOAT_PITCH = 92;
export const railPos = (side: 'L' | 'R', slot: number) => ({ x: RAIL_X[side], y: RAIL_Y0 + slot * RAIL_PITCH });
