// ROAD MAP MOCK 1 (flag ROAD_MAP_MOCK1): pure numbers and rules taken from docs/art/mocks/road-map/SPEC.md. No Phaser, no saves, no game Rng.
// The game draws in design px (W = 720); the mock is in CSS px (390 wide), so every mock size is multiplied by mockScale().
import type { BadgeDef, BadgeSide } from './mapBadgesModel';

export const MOCK_REF_W = 390;
export const mockScale = (designW: number) => designW / MOCK_REF_W;

/** Rails in the mock: left Daily / Quests / Collect (the game's ALBUM), right Event / Offer / Season. Mail and settings stay floating chips. */
const MOCK_SIDE: Record<string, BadgeSide> = { daily: 'L', quests: 'L', album: 'L', events: 'R', offers: 'R', season: 'R' };
export const mockSideOf = (d: BadgeDef): BadgeSide => MOCK_SIDE[d.id] ?? d.side;

/** Hero glow / ring / sparkle sizes in mock px (SPEC section 2 node boxes), current normal vs current boss. */
export const HERO_FX = {
  normal: { glow: 272, ring: [224, 88] as const },
  boss: { glow: 320, ring: [272, 104] as const },
  /** live sparkles around the hero; inside the 30-particle scene cap */
  sparkles: 6,
  glowMs: 1600,
  sparkleMs: 1400,
};

export interface Spot { x: number; y: number; delay: number }

/** `n` sparkle spots on an ellipse of radii (rx, ry) around (0, cy), evenly spaced, with a staggered start. Deterministic: same input, same output. */
export function sparkleSpots(n: number, rx: number, ry: number, cy: number, periodMs: number): Spot[] {
  const count = Math.max(0, Math.min(HERO_FX.sparkles, Math.floor(Number.isFinite(n) ? n : 0)));
  const out: Spot[] = [];
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 - Math.PI / 2 + 0.35;
    out.push({ x: Math.round(Math.cos(a) * rx), y: Math.round(cy + Math.sin(a) * ry), delay: Math.round((i / count) * periodMs) });
  }
  return out;
}

/** Bolt stands beside the hero platform, on the side with more room (away from the road centre), at the platform's height. */
export function boltSpot(nodeX: number, centerX: number, designW: number): { x: number; dx: number } {
  const dx = nodeX > centerX ? -1 : 1;
  const x = Math.max(70, Math.min(designW - 70, nodeX + dx * 240));
  return { x, dx };
}

export type MockAssetStatus = 'exists' | 'placeholder';
/** What this build uses for each part of the mock. 'placeholder' = code-drawn or reused stand-in, art still to come (ASSETS.md NEEDS-ART). */
export const MOCK_ASSETS: readonly { part: string; status: MockAssetStatus; note: string }[] = [
  { part: 'hero glow, ring, sparkles', status: 'exists', note: 'code-drawn (CODE-DRAWN in ASSETS.md) + src/assets/art/star.webp' },
  { part: 'Bolt beside the hero', status: 'exists', note: 'BoltAnimator; needs MASCOT MOTION; bolt_<state> poses unreviewed, code head fallback' },
  { part: 'rail badge frames and glyphs', status: 'placeholder', note: 'mapBadges code medallions; badge_base_* / badge_glyph_* use art when present' },
  { part: 'hero platforms', status: 'placeholder', note: 'avatar_platform_normal / _boss NEEDS-ART: current code platform kept' },
  { part: 'road surface ch4/ch5', status: 'placeholder', note: 'road_kit_ch4 NEEDS-ART: current road kept (ROAD SURFACE KIT flag)' },
  { part: 'gate arch, ch4/ch5 scenery panels, fog banks', status: 'placeholder', note: 'NEEDS-ART: current road look kept' },
];
