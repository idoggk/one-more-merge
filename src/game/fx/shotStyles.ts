import type { Family } from '../../core/types';

/** Per-family shot and chain look (docs/art/BRAINSTORM_MOTION_ROAD.md section 3). Presentation only: reads family and rank, never the model. */

export type ShotFlight = 'arc' | 'line' | 'lob' | 'beam' | 'swing';
export type ShotShape = 'dot' | 'spark';

export interface ShotStyle {
  /** body tint, glow/trail tint (rank 3+), hot core tint (rank 7+) */
  body: number;
  glow: number;
  core: number;
  /** existing texture the projectile is drawn with */
  shape: ShotShape;
  /** stretch along the flight direction (1 = round); nails and rivets are long */
  stretch: number;
  flight: ShotFlight;
  /** a spark/ember scatter on impact instead of the plain puff */
  sparky: boolean;
}

export const SHOOTER_FAMILIES = ['nail_gun', 'jackhammer', 'saw_blade', 'rivet_gun', 'tesla_tower', 'blowtorch', 'pipe', 'wrecking_ball', 'crane', 'dynamo', 'robot_arm', 'mortar'] as const;
export type ShooterFamily = (typeof SHOOTER_FAMILIES)[number];

/** Fallback for every family without an entry: the current plain look. */
export const PLAIN_STYLE: ShotStyle = { body: 0xff9a72, glow: 0xffffff, core: 0xffffff, shape: 'dot', stretch: 1, flight: 'arc', sparky: false };

export const SHOT_STYLES: Record<ShooterFamily, ShotStyle> = {
  nail_gun: { body: 0xd8dde6, glow: 0xffffff, core: 0xffffff, shape: 'dot', stretch: 2.4, flight: 'line', sparky: true },
  jackhammer: { body: 0x9aa0a8, glow: 0xd8c8a8, core: 0xffffff, shape: 'dot', stretch: 1.3, flight: 'beam', sparky: false },
  saw_blade: { body: 0xc4ccd6, glow: 0xff9a3c, core: 0xffffff, shape: 'spark', stretch: 1, flight: 'arc', sparky: true },
  rivet_gun: { body: 0xd9803a, glow: 0xff9a3c, core: 0xfff0c0, shape: 'dot', stretch: 1.8, flight: 'line', sparky: true },
  tesla_tower: { body: 0x5fe8ff, glow: 0xa070ff, core: 0xffffff, shape: 'spark', stretch: 1, flight: 'beam', sparky: true },
  blowtorch: { body: 0xff8a2a, glow: 0xffd060, core: 0x9ad8ff, shape: 'dot', stretch: 1.6, flight: 'beam', sparky: true },
  pipe: { body: 0x4fd0c8, glow: 0xe8ffff, core: 0xffffff, shape: 'dot', stretch: 1, flight: 'arc', sparky: false },
  wrecking_ball: { body: 0x4a4e58, glow: 0x9a5a38, core: 0xe0d0c0, shape: 'dot', stretch: 1, flight: 'swing', sparky: false },
  crane: { body: 0xf0c030, glow: 0xb0b6c0, core: 0xffffff, shape: 'dot', stretch: 1, flight: 'swing', sparky: false },
  dynamo: { body: 0xf4e040, glow: 0x70f090, core: 0xffffff, shape: 'spark', stretch: 1, flight: 'arc', sparky: true },
  robot_arm: { body: 0x7aa8e0, glow: 0xffffff, core: 0xffffff, shape: 'dot', stretch: 1.4, flight: 'line', sparky: false },
  mortar: { body: 0x8a9a50, glow: 0xff9a3c, core: 0xfff0c0, shape: 'dot', stretch: 1, flight: 'lob', sparky: false },
};

export function shotStyle(family: Family): ShotStyle {
  return (SHOT_STYLES as Partial<Record<Family, ShotStyle>>)[family] ?? PLAIN_STYLE;
}
export const hasShotStyle = (family: Family) => family in SHOT_STYLES;

/** section 3.3 rank table: 1-2 base, 3-4 x1.15, 5-6 x1.3, 7-8 x1.5 (clamped to 1..8). */
export function rankScale(rank: number): number {
  const r = Math.max(1, Math.min(8, Math.round(rank)));
  return r >= 7 ? 1.5 : r >= 5 ? 1.3 : r >= 3 ? 1.15 : 1;
}
/** 0 none, 1 glow halo + short trail, 2 gold rim + longer trail + impact ring, 3 white-hot core + double trail + flash. */
export function rankTier(rank: number): 0 | 1 | 2 | 3 {
  const r = Math.max(1, Math.min(8, Math.round(rank)));
  return r >= 7 ? 3 : r >= 5 ? 2 : r >= 3 ? 1 : 0;
}
/** Visual shot count for multi-projectile families (1,1,2,2,3,3,3,4). */
export function burstCount(family: Family, rank: number): number {
  if (family !== 'nail_gun' && family !== 'rivet_gun') return 1;
  return [1, 1, 2, 2, 3, 3, 3, 4][Math.max(1, Math.min(8, Math.round(rank))) - 1];
}
export const GOLD_RIM = 0xffd34a;

/** section 3.6 caps. */
export const SHOT_CAPS = { projectiles: 12, impacts: 24 };
const live = { projectiles: 0, impacts: 0 };
/** Take a slot; false means over the cap and the caller falls back to the plain dot. */
export function takeShotSlot(kind: keyof typeof live): boolean {
  if (live[kind] >= SHOT_CAPS[kind]) return false;
  live[kind]++;
  return true;
}
export function freeShotSlot(kind: keyof typeof live) {
  live[kind] = Math.max(0, live[kind] - 1);
}
export const liveShots = () => ({ ...live });

/** Chain link look: relay kind keeps the shape, the source unit sets colour and thickness (section 3.4). */
export interface LinkStyle {
  color: number;
  width: number;
  /** rank 7+: a thin white core line on top */
  whiteCore: boolean;
  /** rank 5+: a wider soft under-line */
  glow: boolean;
}
export function linkStyle(family: Family, rank: number, baseWidth: number, fallbackColor: number): LinkStyle {
  const st = hasShotStyle(family) ? shotStyle(family) : null;
  const t = rankTier(rank);
  const k = 1 + 0.12 * (Math.max(1, Math.min(8, Math.round(rank))) - 1);
  return { color: st ? st.body : fallbackColor, width: baseWidth * (st ? k : 1), whiteCore: !!st && t === 3, glow: !!st && t >= 2 };
}
