// LEVEL ROAD V2 (TUNING.levelRoadV2): the pure path generator. Positions come from the level number and the fixed level table only,
// never from progress, so the same road is laid every time (docs/art/LEVEL_ROAD_V2.md). Road space: level 1 at y = 0, the road runs UP (y < 0).
// No Phaser here: tests/roadV2.test.ts checks determinism and node spacing.

/** Design-px geometry (the game canvas is W = 720 wide; 1 phone pt = 1.85 design px). */
export const ROAD = {
  width: 720,
  /** vertical distance between two levels of one chapter */
  spacing: 250,
  /** extra climb from a chapter's boss to the next chapter's level 1 (gate + banner + fog live here) */
  chapterGap: 760,
  levelsPerChapter: 10,
  chapters: 8,
  /** nodes stay inside [xMin, xMax] so the side rails (x < 110) never touch a medallion */
  xMin: 190,
  xMax: 530,
  centerX: 360,
  /** swing of the S-curve (half width) */
  amp: 150,
  /** hard floor for any two node centres, nodes and chests included */
  minGap: 88,
  /** extra climb after each chest level, so the milestone chest sits ON the path between two medallions */
  chestGap: 200,
  /** chests are placed after these levels of every chapter */
  chestAfter: [3, 6] as const,
  /** gate arch sits this far above its boss node; the next chapter's banner this far below its level 1 */
  gateAbove: 290,
  bannerBelow: 205,
} as const;

export type NodeKind = 'normal' | 'mini' | 'boss';
export type Ribbon = 'none' | 'hard' | 'mega';

export interface LevelInfo {
  level: number;
  difficulty: string;
  mini_boss?: string;
  boss_node?: boolean;
}

export interface RoadNode {
  level: number;
  chapter: number; // 1-based
  /** 0..9 position inside the chapter */
  idx: number;
  x: number;
  y: number;
  kind: NodeKind;
  ribbon: Ribbon;
}
export interface RoadChest {
  id: string;
  chapter: number;
  /** the chest is reached once the player is past this level */
  afterLevel: number;
  x: number;
  y: number;
}
export interface RoadSegment {
  from: number; // level
  to: number;
  /** sampled centre line, bottom to top, includes both end points */
  pts: { x: number; y: number }[];
}
export interface RoadChapter {
  chapter: number;
  firstLevel: number;
  bossLevel: number;
  /** y of the entrance banner (below level 1) */
  bannerY: number;
  /** y of the gate arch (above the boss) */
  gateY: number;
  /** world span of this chapter, for backdrops and fog */
  topY: number;
  bottomY: number;
}
export interface RoadLayout {
  nodes: RoadNode[];
  chests: RoadChest[];
  segments: RoadSegment[];
  chapters: RoadChapter[];
  /** whole world, y from topY (most negative) to bottomY */
  topY: number;
  bottomY: number;
}

/** Stable per-level hash in [0, 1). */
export function hash01(n: number): number {
  let h = Math.imul(n + 0x9e3779b9, 0x85ebca6b) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

const chapterBase = (c: number) => -(c - 1) * ((ROAD.levelsPerChapter - 1) * ROAD.spacing + ROAD.chestAfter.length * ROAD.chestGap + ROAD.chapterGap);
/** Height of node `idx` (0..9) above its chapter base: even spacing plus a chest gap after each chest level. */
const climb = (idx: number) => idx * ROAD.spacing + ROAD.chestGap * ROAD.chestAfter.filter((a) => idx >= a).length;

export const chapterOf = (level: number) => Math.ceil(level / ROAD.levelsPerChapter);

/** One S-curve per chapter: 1.5 swings, centred at both ends so a boss and the next level 1 line up through the gate. */
function nodeX(level: number): number {
  const i = (level - 1) % ROAD.levelsPerChapter;
  const swing = Math.sin((Math.PI * 3 * i) / (ROAD.levelsPerChapter - 1));
  const ends = i === 0 || i === ROAD.levelsPerChapter - 1;
  const jitter = ends ? 0 : (hash01(level) - 0.5) * 36;
  const x = ROAD.centerX + swing * ROAD.amp * (chapterOf(level) % 2 ? 1 : -1) + jitter;
  return Math.round(Math.min(ROAD.xMax, Math.max(ROAD.xMin, x)));
}

function bezier(a: { x: number; y: number }, b: { x: number; y: number }, steps: number) {
  const dy = (b.y - a.y) * 0.5;
  const c1 = { x: a.x, y: a.y + dy }, c2 = { x: b.x, y: b.y - dy };
  const pts: { x: number; y: number }[] = [];
  for (let k = 0; k <= steps; k++) {
    const t = k / steps, u = 1 - t;
    pts.push({
      x: Math.round((u * u * u * a.x + 3 * u * u * t * c1.x + 3 * u * t * t * c2.x + t * t * t * b.x) * 10) / 10,
      y: Math.round((u * u * u * a.y + 3 * u * u * t * c1.y + 3 * u * t * t * c2.y + t * t * t * b.y) * 10) / 10,
    });
  }
  return pts;
}

export function kindOf(info: LevelInfo): NodeKind {
  return info.level % ROAD.levelsPerChapter === 0 || info.boss_node ? 'boss' : info.mini_boss ? 'mini' : 'normal';
}
export const ribbonOf = (info: LevelInfo): Ribbon => (info.difficulty === 'MEGA_HARD' ? 'mega' : info.difficulty === 'HARD' ? 'hard' : 'none');

/** The whole road for a level table (levels 1..N in order). */
export function layoutRoad(levels: readonly LevelInfo[]): RoadLayout {
  const nodes: RoadNode[] = levels.map((info) => {
    const level = info.level;
    const chapter = chapterOf(level);
    const idx = (level - 1) % ROAD.levelsPerChapter;
    return { level, chapter, idx, x: nodeX(level), y: chapterBase(chapter) - climb(idx) + 0, kind: kindOf(info), ribbon: ribbonOf(info) };
  });
  const chests: RoadChest[] = [];
  for (const n of nodes) {
    if (!(ROAD.chestAfter as readonly number[]).includes(n.idx + 1)) continue;
    const up = nodes.find((m) => m.level === n.level + 1);
    if (!up) continue;
    chests.push({ id: `chest_${n.chapter}_${n.idx + 1}`, chapter: n.chapter, afterLevel: n.level, x: Math.round((n.x + up.x) / 2), y: Math.round((n.y + up.y) / 2) });
  }
  const segments: RoadSegment[] = [];
  for (let i = 0; i + 1 < nodes.length; i++) segments.push({ from: nodes[i].level, to: nodes[i + 1].level, pts: bezier(nodes[i], nodes[i + 1], 14) });
  const chapters: RoadChapter[] = [];
  const nCh = chapterOf(levels.length);
  for (let c = 1; c <= nCh; c++) {
    const first = nodes[(c - 1) * ROAD.levelsPerChapter];
    const boss = nodes[Math.min(nodes.length, c * ROAD.levelsPerChapter) - 1];
    chapters.push({
      chapter: c,
      firstLevel: first.level,
      bossLevel: boss.level,
      bannerY: first.y + ROAD.bannerBelow,
      gateY: boss.y - ROAD.gateAbove,
      topY: boss.y - ROAD.chapterGap + ROAD.bannerBelow,
      bottomY: first.y + ROAD.bannerBelow + 80,
    });
  }
  const topY = Math.min(...nodes.map((n) => n.y)) - ROAD.gateAbove - 320; // gate + fog above the last boss
  const bottomY = Math.max(...nodes.map((n) => n.y)) + ROAD.bannerBelow + 120;
  return { nodes, chests, segments, chapters, topY, bottomY };
}
