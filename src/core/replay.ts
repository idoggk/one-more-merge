import { applyItem, choosePerk, deserialize, drop, finishTutorial, restartBossFuse, scrap, serialize, tick, useTimeCapsule, type GameEvent, type GameState } from './game';
import type { PerkId } from './types';

/** r43 run log (best-chain replay; later a "challenge a friend" link): the state the run started from plus every
 *  player command stamped with the number of 50 ms ticks applied before it. The model is deterministic, so replaying
 *  the log rebuilds the run exactly. `hold` = cells deliveries must avoid (finger on the board) — it steers where
 *  parts land, so it is part of the input. */
export type RunAction =
  | { t: number; k: 'drop'; from: number; to: number; id: number }
  | { t: number; k: 'scrap'; idx: number; id: number }
  | { t: number; k: 'item'; idx: number; id: number }
  | { t: number; k: 'perk'; perk: PerkId }
  | { t: number; k: 'capsule' }
  | { t: number; k: 'tutorial' }
  | { t: number; k: 'fuse' }
  | { t: number; k: 'hold'; cells: number[] };

export interface RunLog {
  v: 1;
  /** serialize() of the state at the first recorded tick/command (null until then). */
  start: string | null;
  ticks: number;
  actions: RunAction[];
  /** Biggest player-merge chain: index of its drop in `actions` and the chain length. */
  best: { at: number; count: number } | null;
}

export const newRunLog = (): RunLog => ({ v: 1, start: null, ticks: 0, actions: [], best: null });

/** Distributes Omit over the union so each command keeps its own fields. */
type Cmd = RunAction extends infer A ? (A extends RunAction ? Omit<A, 't'> : never) : never;

function begin(log: RunLog, s: GameState) {
  if (log.start === null) log.start = serialize(s);
}

/** Apply one command to `s` (shared by the live game and the replay, so both run the same code). */
export function applyCommand(s: GameState, a: Cmd | RunAction): { ok: boolean; events: GameEvent[] } {
  switch (a.k) {
    case 'drop':
      return drop(s, a.from, a.to, a.id);
    case 'scrap':
      return scrap(s, a.idx, a.id);
    case 'item':
      return applyItem(s, a.idx, a.id);
    case 'perk':
      return choosePerk(s, a.perk);
    case 'capsule':
      return { ok: useTimeCapsule(s), events: [] };
    case 'tutorial':
      return { ok: true, events: finishTutorial(s) };
    case 'fuse':
      return { ok: restartBossFuse(s), events: [] };
    case 'hold':
      return { ok: true, events: [] };
  }
}

/** Record + apply a player command. Only successful commands are logged. */
export function recordCommand(log: RunLog, s: GameState, a: Cmd): { ok: boolean; events: GameEvent[] } {
  begin(log, s);
  const res = applyCommand(s, a);
  if (!res.ok) return res;
  log.actions.push({ ...a, t: log.ticks } as RunAction);
  if (a.k === 'drop')
    for (const e of res.events)
      if (e.type === 'cascade' && !e.kickback && e.result.count > (log.best?.count ?? 0)) log.best = { at: log.actions.length - 1, count: e.result.count };
  return res;
}

const lastHold = new WeakMap<RunLog, string>();

/** Record + apply one fixed tick (logs the held cells when they change). */
export function recordTick(log: RunLog, s: GameState, reserved: ReadonlySet<number>): GameEvent[] {
  begin(log, s);
  const cells = [...reserved].sort((a, b) => a - b);
  const key = cells.join(',');
  if ((lastHold.get(log) ?? '') !== key) {
    lastHold.set(log, key);
    log.actions.push({ t: log.ticks, k: 'hold', cells });
  }
  log.ticks++;
  return tick(s, new Set(cells));
}

/** Rebuild the run: the state right before action `upTo` (all actions and their ticks when omitted).
 *  `onTick` sees the state after every replayed tick (ghost pace sampling). */
export function replayRun(log: RunLog, upTo = log.actions.length, onTick?: (s: GameState) => void): GameState | null {
  const s = log.start ? deserialize(log.start) : null;
  if (!s) return null;
  let t = 0;
  let hold: ReadonlySet<number> = new Set();
  const end = Math.min(upTo, log.actions.length);
  const stepTo = (n: number) => {
    for (; t < n; t++) {
      tick(s, hold);
      onTick?.(s);
    }
  };
  for (let i = 0; i < end; i++) {
    const a = log.actions[i];
    stepTo(a.t);
    if (a.k === 'hold') hold = new Set(a.cells);
    else applyCommand(s, a);
  }
  if (upTo >= log.actions.length) stepTo(log.ticks);
  else stepTo(log.actions[upTo].t);
  return s;
}

// ---------- compact text encoding (reusable for a later share link; not sent anywhere now) ----------

const K = { drop: 'D', scrap: 'S', item: 'I', perk: 'P', capsule: 'C', tutorial: 'U', fuse: 'F', hold: 'H' } as const;
const KR = Object.fromEntries(Object.entries(K).map(([a, b]) => [b, a])) as Record<string, RunAction['k']>;

/** Actions as one short string: `<dt base36><KIND letter><args base36, comma-joined>` joined by `;` (dt = ticks since the previous action). */
export function encodeActions(actions: RunAction[]): string {
  let prev = 0;
  return actions
    .map((a) => {
      const dt = (a.t - prev).toString(36);
      prev = a.t;
      const args =
        a.k === 'drop' ? [a.from, a.to, a.id] : a.k === 'scrap' || a.k === 'item' ? [a.idx, a.id] : a.k === 'perk' ? [a.perk] : a.k === 'hold' ? a.cells : [];
      return dt + K[a.k] + args.map((x) => (typeof x === 'number' ? x.toString(36) : x)).join(',');
    })
    .join(';');
}

export function decodeActions(text: string): RunAction[] | null {
  if (!text) return [];
  const out: RunAction[] = [];
  let t = 0;
  for (const part of text.split(';')) {
    const m = /^([0-9a-z]+)([DSIPCUFH])(.*)$/.exec(part);
    if (!m) return null;
    t += parseInt(m[1], 36);
    const k = KR[m[2]];
    const args = m[3] ? m[3].split(',') : [];
    const n = args.map((x) => parseInt(x, 36));
    if (k === 'drop') out.push({ t, k, from: n[0], to: n[1], id: n[2] });
    else if (k === 'scrap' || k === 'item') out.push({ t, k, idx: n[0], id: n[1] });
    else if (k === 'perk') out.push({ t, k, perk: args[0] as PerkId });
    else if (k === 'hold') out.push({ t, k, cells: n });
    else out.push({ t, k } as RunAction);
    if (Object.values(out[out.length - 1]).some((v) => typeof v === 'number' && Number.isNaN(v))) return null;
  }
  return out;
}
