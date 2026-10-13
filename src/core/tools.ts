// POWER TOOLS prototype (t-e2a48327), behind TUNING.tools (default OFF = the live game, untouched).
// A tool is a Gadget with `tool` set (family row_surge / gear_bomb) that sits on the board like a part but is never a machine:
// nothing wakes it, it never merges, magnets and fans leave it alone. It is made IN ADDITION to the normal merge result:
//   ROW SURGE : a player merge whose cascade fires TUNING.tl.chain+ machines.
//   GEAR BOMB : a sandwich merge (TUNING.mergeRule 'sandwich2' / 'sandwichBonus').
// Placement is deterministic (no randomness): the free cell nearest the merge (distance, then row-major), else the tray.
// Tap a tool to use it once: it WAKES machines (roots of a normal cascade, each machine fires at most once) and deals no
// damage of its own. Surge wakes its row; Bomb wakes the 4 touching parts and each machine it wakes hits as if +1 rank (hit calc only).
// Two touching tools COMBINE (tap one, or drop one onto / beside the other): the second is used up inside the first.
//   Surge + Surge : 3 rows   ·   Bomb + Surge : the row, +1 effect rank   ·   Bomb + Bomb : the 3x3 block, +1 effect rank
// Pure and deterministic: planTool / previewTool run on a COPY of the grid and never mutate the state.
import { COLS, ROWS, TUNING } from '../content/tuning';
import { resolveCascade, type CascadeOpts } from './cascade';
import { applyB1, applyDamage, applyMoves, dropReserved, fanHazards, locked, makeGadget, torchOpt, type CommandResult, type GameEvent, type GameState } from './game';
import { bossAfterPlayer, bossBlocked, bossCascadeMods, bossPendingCells } from './boss';
import { TOOL_FAMILY, type CascadeResult, type Gadget, type ToolKind } from './types';

export type ToolCombo = 'surge' | 'bomb' | 'surge2' | 'bombSurge' | 'bomb2';

export const TOOL_NAME: Record<ToolKind, string> = { surge: 'ROW SURGE', bomb: 'GEAR BOMB' };
export const COMBO_NAME: Record<ToolCombo, string> = { surge: 'ROW SURGE', bomb: 'GEAR BOMB', surge2: 'DOUBLE SURGE', bombSurge: 'BOMB SURGE', bomb2: 'BIG BANG' };

export interface ToolPlan {
  combo: ToolCombo;
  /** Cells of the tools used up (the tapped one first). */
  tools: number[];
  /** Machines woken at depth 0, row-major (wake[0] is the cascade root). */
  wake: number[];
  /** Ranks every directly woken machine hits as if higher (hit calc only). */
  effect: number;
  /** Rows (surge) or the 3x3 block's cells that this tool reaches (for the picture; wake is what really fires). */
  reach: number[];
}

const DIRS: [number, number][] = [[-1, 0], [0, 1], [1, 0], [0, -1]];
const rc = (i: number) => [Math.floor(i / COLS), i % COLS] as const;

/** Tools may exist in this state: flag on, a saga-style level from tl.fromLevel (or the classic run), never puzzles / drills / daily / bounties / rush / tutorial. */
export function toolsAllowed(s: GameState): boolean {
  if (!TUNING.tools || s.phase !== 'playing' || s.puzzle || s.daily || s.bounty || s.rush) return false;
  return s.level === undefined || s.level >= TUNING.tl.fromLevel;
}

/** Tools on the board plus waiting in the tray. */
export const toolCount = (s: GameState) => s.grid.filter((g) => g?.tool).length + s.pending.filter((g) => g.tool).length;

/** Cells a tool may never be placed in (same promises deliveries keep). */
function blockedCells(s: GameState): Set<number> {
  return new Set([...dropReserved(s), ...locked(s), ...bossBlocked(s.boss).noDrop, ...bossPendingCells(s.boss)]);
}

/** The orthogonal neighbours of `idx` holding a tool, in U/R/D/L order. */
export function toolNeighbours(s: GameState, idx: number): number[] {
  const [r, c] = rc(idx);
  const out: number[] = [];
  for (const [dr, dc] of DIRS) {
    const rr = r + dr, cc = c + dc;
    if (rr < 0 || rr >= ROWS || cc < 0 || cc >= COLS) continue;
    if (s.grid[rr * COLS + cc]?.tool) out.push(rr * COLS + cc);
  }
  return out;
}

const machineAt = (s: GameState, i: number, lk: ReadonlySet<number>) => !!s.grid[i] && !s.grid[i]!.tool && !lk.has(i);

/** What using the tool at `idx` does now. `other` = the partner tool of a combo (undefined = the first touching tool, null = use alone). Null = not a tool. */
export function planTool(s: GameState, idx: number, other?: number | null): ToolPlan | null {
  const a = s.grid[idx];
  if (!a?.tool) return null;
  const partner = other === null ? undefined : other !== undefined ? other : toolNeighbours(s, idx)[0];
  const b = partner !== undefined && partner !== idx && s.grid[partner]?.tool ? s.grid[partner]! : undefined;
  const lk = locked(s);
  const rowCells = (rows: number[]) => rows.flatMap((r) => Array.from({ length: COLS }, (_, c) => r * COLS + c));
  const [r0] = rc(idx);
  let combo: ToolCombo = a.tool === 'surge' ? 'surge' : 'bomb';
  let reach: number[];
  let effect = 0;
  if (!b) {
    if (a.tool === 'surge') reach = rowCells([r0]);
    else {
      reach = DIRS.flatMap(([dr, dc]) => {
        const rr = r0 + dr, cc = (idx % COLS) + dc;
        return rr >= 0 && rr < ROWS && cc >= 0 && cc < COLS ? [rr * COLS + cc] : [];
      });
      effect = TUNING.tl.effectRank;
    }
  } else if (a.tool === 'surge' && b.tool === 'surge') {
    combo = 'surge2';
    const [r1] = rc(partner!);
    const lo = Math.min(r0, r1), hi = Math.max(r0, r1);
    const n = Math.min(TUNING.tl.surgeRows, ROWS);
    // 3 consecutive rows holding both tools' rows (cap = tl.surgeRows): grow upward, then downward, alternating (same row = centred)
    let top = lo, bottom = hi, up = true;
    while (bottom - top + 1 < n) {
      if (up && top > 0) top--;
      else if (bottom < ROWS - 1) bottom++;
      else if (top > 0) top--;
      else break;
      up = !up;
    }
    reach = rowCells(Array.from({ length: bottom - top + 1 }, (_, k) => top + k));
  } else if (a.tool === 'bomb' && b.tool === 'bomb') {
    combo = 'bomb2';
    const [r, c] = rc(idx);
    reach = [];
    for (let rr = r - 1; rr <= r + 1; rr++) for (let cc = c - 1; cc <= c + 1; cc++) if (rr >= 0 && rr < ROWS && cc >= 0 && cc < COLS) reach.push(rr * COLS + cc);
    effect = TUNING.tl.effectRank;
  } else {
    combo = 'bombSurge';
    const surgeAt = a.tool === 'surge' ? idx : partner!;
    reach = rowCells([rc(surgeAt)[0]]);
    effect = TUNING.tl.effectRank;
  }
  const tools = b ? [idx, partner!] : [idx];
  const wake = reach.filter((i) => !tools.includes(i) && machineAt(s, i, lk)).sort((x, y) => x - y);
  return { combo, tools, wake, effect, reach };
}

function cascadeOpts(s: GameState, plan: ToolPlan): CascadeOpts {
  return { perks: s.perks, overdrive: s.odLeft > 0, reserved: new Set(dropReserved(s)), locked: locked(s), ...bossCascadeMods(s.boss), unitMult: s.unitMult, unitLevel: s.unitLevel, fireBase: s.fireCount, hazards: fanHazards(s), ...torchOpt(s), roots: plan.wake.slice(1), wake: true, ...(plan.effect ? { effectRank: plan.effect } : {}) };
}

/** The cascade a plan would run, on a COPY of the grid with the used-up tools removed. Never mutates the state. */
export function previewTool(s: GameState, plan: ToolPlan): CascadeResult | null {
  if (!plan.wake.length) return null;
  const grid = s.grid.slice();
  for (const t of plan.tools) grid[t] = null;
  return resolveCascade(grid, plan.wake[0], cascadeOpts(s, plan));
}

/** Tap a tool (or combine two). `withIdx` = the partner when one tool was dropped onto / beside the other; omitted = the first touching tool, if any. */
export function useTool(s: GameState, idx: number, id: number, withIdx?: number): CommandResult {
  const ev: GameEvent[] = [];
  const g = s.grid[idx];
  if (!TUNING.tools || s.phase !== 'playing' || !g || g.id !== id || !g.tool || locked(s).has(idx)) return { ok: false, events: ev };
  const plan = planTool(s, idx, withIdx);
  if (!plan || !plan.wake.length) return { ok: false, events: ev };
  const result = previewTool(s, plan)!;
  for (const t of plan.tools) s.grid[t] = null;
  const st = (s.stats.tools ??= { made: 0, used: 0, combos: 0 });
  st.used++;
  if (plan.tools.length > 1) st.combos++;
  ev.push({ type: 'toolUse', combo: plan.combo, idx, tools: plan.tools, wake: plan.wake, effect: plan.effect, reach: plan.reach, count: result.count });
  applyMoves(s, result);
  applyB1(s, result, ev);
  s.stats.biggestChain = Math.max(s.stats.biggestChain, result.count);
  ev.push({ type: 'cascade', result, damage: result.total, overdriveStart: false, kickback: false });
  applyDamage(s, result.total, ev, 'player');
  if (s.phase === 'playing') ev.push(...bossAfterPlayer(s.boss, -1, result.activations.map((x) => x.idx)));
  return { ok: true, events: ev };
}

/** The free cell nearest `near` (Manhattan distance, then row-major), or -1. */
export function toolCell(s: GameState, near: number): number {
  const blocked = blockedCells(s);
  const [r0, c0] = rc(near);
  let best = -1, bd = 99;
  for (let i = 0; i < s.grid.length; i++) {
    if (s.grid[i] || blocked.has(i)) continue;
    const d = Math.abs(rc(i)[0] - r0) + Math.abs(rc(i)[1] - c0);
    if (d < bd) [best, bd] = [i, d];
  }
  return best;
}

/** After a player merge at `at`: the tools it earns (Gear Bomb for a sandwich, Row Surge for a long chain), within the limits. */
export function makeTools(s: GameState, at: number, result: CascadeResult, sandwich: boolean, ev: GameEvent[]) {
  if (!toolsAllowed(s)) return;
  const kinds: ToolKind[] = [];
  if (sandwich) kinds.push('bomb');
  if (result.count >= TUNING.tl.chain) kinds.push('surge');
  for (const kind of kinds) {
    if (toolCount(s) >= TUNING.tl.maxBoard) break;
    // a capped-merge level (state.toolCap) allows at most that many tools made in the whole level
    if (s.toolCap !== undefined && (s.stats.tools?.made ?? 0) >= s.toolCap) break;
    const t: Gadget = makeGadget(s, TOOL_FAMILY[kind], 1);
    t.tool = kind;
    const mergedFam = s.grid[at]?.family;
    if (mergedFam) t.hue = mergedFam;
    const cell = toolCell(s, at);
    const st = (s.stats.tools ??= { made: 0, used: 0, combos: 0 });
    st.made++;
    if (cell >= 0) {
      s.grid[cell] = t;
      ev.push({ type: 'toolMade', kind, idx: cell, id: t.id, from: at, tray: false });
    } else {
      s.pending.push(t);
      ev.push({ type: 'toolMade', kind, idx: -1, id: t.id, from: at, tray: true });
    }
  }
}
