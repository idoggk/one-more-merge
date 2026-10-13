// VARIED OPENINGS (TUNING.variedOpenings, default OFF; docs/OPENING_VARIETY.md section 5): "each stage starts in the same way".
// The 8 chapter-starter parts keep their families and rank; only their CELLS change, on one of 4 hand-authored layouts per ordinary level.
// Layout A (index 0) is today's board (levels.json starting_cells). B, C and D never use the four corners (CORNERS_2/4), (2,1) and (2,3)
// (GAPS), (2,2) (magnet extra), (2,1) (fan extra) or (4,3) (battery extra), so no modifier or `start_extra` can collide with them.
// Each role's list order matters: shooter[0], shooter[1] are the starter shooter PAIR (Jumpstart Kit upgrades exactly those two).
import { LEVELS, STARTING_CELLS, type LevelDef } from './levels';
import { Rng } from '../core/rng';

export type Role = 'shooter' | 'coil' | 'bell';
export type Layout = Record<Role, [number, number][]>;
export const LAYOUT_NAMES = ['A today', 'B top-left stack', 'C split halves', 'D scattered ring'] as const;

export const LAYOUTS: Layout[] = [
  STARTING_CELLS,
  { shooter: [[0, 1], [0, 2], [2, 0], [4, 4]], coil: [[1, 2], [3, 0]], bell: [[1, 1], [4, 2]] },
  { shooter: [[1, 3], [1, 4], [4, 0], [4, 1]], coil: [[2, 4], [5, 1]], bell: [[3, 4], [5, 2]] },
  // D: the proposal's first "scattered ring" opened with a best chain of 3 (damage x0.43); this one was found by search (best chain 5, same damage as A, 8 live pairs)
  { shooter: [[5, 2], [1, 0], [1, 3], [0, 3]], coil: [[1, 2], [3, 3]], bell: [[5, 3], [0, 2]] },
];

/** Cells no layout other than A may use (corners, GAPS cells, extra helper cells). */
export const FORBIDDEN_CELLS: [number, number][] = [[0, 0], [0, 4], [5, 0], [5, 4], [2, 1], [2, 2], [2, 3], [4, 3]];

const SALT = 0x0b3a7c1;
const chapterOf = (level: number) => Math.ceil(level / 10);
/** Scripted starts keep layout A: teach levels, bosses (level % 10 === 0) and mini-bosses. */
const scripted = (d: LevelDef) => !!d.teach || d.level % 10 === 0 || !!d.mini_boss;

let dealt: Map<number, number> | undefined;
/** Per chapter: walk the levels in order with a deck shuffle([0,1,2,3,0,1,2,3]) from Rng(SALT ^ chapter); each ordinary level takes the first
 *  card differing from the previous level's layout (scripted levels count as A), so neighbours never open the same way. Pure: depends only on LEVELS. */
function deal(): Map<number, number> {
  const m = new Map<number, number>();
  const chapters = [...new Set(LEVELS.map((d) => chapterOf(d.level)))];
  const fresh = (rng: Rng) => rng.shuffle(Array.from({ length: 8 }, (_, i) => i % LAYOUTS.length));
  for (const ch of chapters) {
    const rng = new Rng((SALT ^ (ch * 2654435761)) >>> 0);
    let deck: number[] = [];
    let prev = -1;
    for (const d of LEVELS.filter((x) => chapterOf(x.level) === ch)) {
      if (scripted(d)) {
        prev = 0;
        continue;
      }
      if (!deck.length) deck = fresh(rng);
      let j = deck.findIndex((k) => k !== prev);
      if (j < 0) {
        deck = deck.concat(fresh(rng));
        j = deck.findIndex((k) => k !== prev);
      }
      const k = deck.splice(j, 1)[0];
      m.set(d.level, k);
      prev = k;
    }
  }
  return m;
}

/** Layout index 0..3 for a SAGA level. Only the real LEVELS entries are dealt (copies such as bounty / boss-rush defs return 0). */
export function layoutFor(def: LevelDef): number {
  if (LEVELS[def.level - 1] !== def || scripted(def)) return 0;
  return (dealt ??= deal()).get(def.level) ?? 0;
}
