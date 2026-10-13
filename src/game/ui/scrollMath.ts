// Pure phone-style scrolling (no Phaser): drag, inertia, rubber-band, tap-versus-drag, sections with sticky headers and jump targets.
// `pos` is the scroll offset in design px: 0 = top, `max` = bottom. It may sit outside [0, max] while the rubber band is stretched.

/** A gesture that moved less than this (design px) is a tap; more is a drag. */
export const TAP_SLOP = 8;
/** Inertia: velocity decays as e^(-FRICTION t) per second, so a fling travels vel / FRICTION in total. */
export const FRICTION = 3.2;
/** Below this speed (px/s) the fling stops. */
export const STOP_SPEED = 8;
/** The rubber band never stretches farther than this. */
export const OVERSCROLL = 140;
/** Spring-back rate (1/s) once the finger is up outside the range. */
const SPRING = 14;
/** Only touch samples younger than this (ms) count towards the release velocity. */
const VEL_WINDOW = 90;
/** Jump-to-section glide rate (1/s). */
const GLIDE = 10;

export interface Scroller {
  pos: number;
  vel: number;
  max: number;
  dragging: boolean;
  /** True once the current gesture moved TAP_SLOP or more (stays true until the next press). */
  moved: boolean;
  startY: number;
  startPos: number;
  samples: { y: number; t: number }[];
  glideTo: number | null;
}

export const makeScroller = (max: number): Scroller => ({ pos: 0, vel: 0, max: Math.max(0, max), dragging: false, moved: false, startY: 0, startPos: 0, samples: [], glideTo: null });

/** How far `pos` is outside [0, max] (0 inside). */
export const overscroll = (pos: number, max: number) => (pos < 0 ? -pos : pos > max ? pos - max : 0);

/** Finger distance -> content distance once stretched: resistance grows linearly to nothing at OVERSCROLL. */
export const rubber = (over: number) => Math.max(0, 1 - over / OVERSCROLL) * 0.55;

export function dragStart(s: Scroller, y: number, t: number) {
  s.dragging = true;
  s.moved = false;
  s.startY = y;
  s.startPos = s.pos;
  s.vel = 0;
  s.glideTo = null;
  s.samples = [{ y, t }];
}

/** Content follows the finger (pull down = offset falls); outside the range it follows with resistance. */
export function dragMove(s: Scroller, y: number, t: number) {
  if (!s.dragging) return;
  const prev = s.samples[s.samples.length - 1];
  if (Math.abs(y - s.startY) >= TAP_SLOP) s.moved = true;
  if (!s.moved) {
    s.samples.push({ y, t });
    return;
  }
  const dy = prev.y - y; // content delta if unresisted
  const over = overscroll(s.pos, s.max);
  const pullingOut = (s.pos <= 0 && dy < 0) || (s.pos >= s.max && dy > 0);
  s.pos += pullingOut || over > 0 ? dy * rubber(over) : dy;
  s.pos = Math.min(s.max + OVERSCROLL, Math.max(-OVERSCROLL, s.pos));
  s.samples.push({ y, t });
  while (s.samples.length > 2 && t - s.samples[0].t > VEL_WINDOW) s.samples.shift();
}

/** Lift the finger: returns true if this was a TAP (moved less than TAP_SLOP), false if it was a drag. Starts the fling. */
export function dragEnd(s: Scroller, t: number): boolean {
  if (!s.dragging) return false;
  s.dragging = false;
  if (!s.moved) {
    s.vel = 0;
    return true;
  }
  const a = s.samples[0], b = s.samples[s.samples.length - 1];
  const dt = (b.t - a.t) / 1000;
  const fresh = t - b.t <= VEL_WINDOW * 2;
  s.vel = dt > 0 && fresh ? (a.y - b.y) / dt : 0;
  return false;
}

/** Where a fling released at `pos` with `vel` comes to rest (before any rubber-band spring back). */
export const inertiaEnd = (pos: number, vel: number) => pos + vel / FRICTION;

export const clampPos = (pos: number, max: number) => Math.min(max, Math.max(0, pos));

/** Glide to `target` (clamped) after a jump-chip tap. */
export function glide(s: Scroller, target: number) {
  s.glideTo = clampPos(target, s.max);
  s.vel = 0;
}

/** Advance `dt` seconds with exact exponential integration (frame-rate independent). Returns true while anything is still moving. */
export function step(s: Scroller, dt: number): boolean {
  if (s.dragging || dt <= 0) return s.dragging;
  if (s.glideTo !== null) {
    const k = 1 - Math.exp(-GLIDE * dt);
    s.pos += (s.glideTo - s.pos) * k;
    if (Math.abs(s.glideTo - s.pos) < 0.5) {
      s.pos = s.glideTo;
      s.glideTo = null;
    }
    return s.glideTo !== null;
  }
  const over = overscroll(s.pos, s.max);
  if (over > 0) {
    const bound = s.pos < 0 ? 0 : s.max;
    s.vel *= Math.exp(-SPRING * dt);
    s.pos += (bound - s.pos) * (1 - Math.exp(-SPRING * dt)) + s.vel * dt * 0.2;
    if (Math.abs(bound - s.pos) < 0.5) {
      s.pos = bound;
      s.vel = 0;
    }
    return s.vel !== 0 || s.pos !== bound;
  }
  if (Math.abs(s.vel) < STOP_SPEED) {
    s.vel = 0;
    return false;
  }
  const e = Math.exp(-FRICTION * dt);
  s.pos += (s.vel * (1 - e)) / FRICTION;
  s.vel *= e;
  return true;
}

/** Wheel / desktop scroll: moves directly, clamped (no band). */
export function wheel(s: Scroller, dy: number) {
  s.glideTo = null;
  s.vel = 0;
  s.pos = clampPos(s.pos + dy, s.max);
}

// ---- sections ---------------------------------------------------------------------------------------------------

export interface SectionSpec {
  /** Number of cells in the section. */
  count: number;
  cols: number;
  /** Row pitch (cell height + gap). */
  rowH: number;
}

export interface Layout {
  /** Top of each section's header in content coordinates. */
  tops: number[];
  /** Top of each section's first row. */
  bodyTops: number[];
  contentH: number;
  max: number;
}

/** Stack sections: header, rows, gap. `viewH` is the visible window height. */
export function buildLayout(specs: SectionSpec[], headerH: number, gap: number, viewH: number): Layout {
  const tops: number[] = [], bodyTops: number[] = [];
  let y = 0;
  for (const sp of specs) {
    tops.push(y);
    bodyTops.push(y + headerH);
    y += headerH + Math.ceil(sp.count / sp.cols) * sp.rowH + gap;
  }
  const contentH = y;
  return { tops, bodyTops, contentH, max: Math.max(0, contentH - viewH) };
}

/** Scroll offset a jump chip scrolls to: the section's header at the top of the window, clamped. */
export const jumpTarget = (l: Layout, i: number) => clampPos(l.tops[i] ?? 0, l.max);

/** Section currently under the sticky header slot. */
export function activeSection(l: Layout, pos: number): number {
  let a = 0;
  l.tops.forEach((t, i) => {
    if (pos + 1 >= t) a = i;
  });
  return l.max > 0 && pos >= l.max - 1 ? l.tops.length - 1 : a;
}

/**
 * Window-space y of section `i`'s header: it scrolls with the content, sticks at 0 once its top passes, and is pushed up
 * by the next header. (Only the active section's header is ever pinned.)
 */
export function headerY(l: Layout, i: number, pos: number, headerH: number): number {
  const natural = l.tops[i] - pos;
  let y = Math.max(0, natural);
  const next = l.tops[i + 1];
  if (next !== undefined) y = Math.min(y, next - pos - headerH);
  return y;
}

/** The back-to-top button shows once the user is more than 3 window heights down. */
export const showBackToTop = (pos: number, viewH: number) => pos > 3 * viewH;
