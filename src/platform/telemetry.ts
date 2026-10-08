// Local-only playtest log. Nothing leaves the device; export is a manual "copy/download" from the pause menu.
const KEY = 'omm.telemetry.v1';
const MAX = 4000;

export interface TEvent {
  t: number; // wall-clock ms
  run: number; // run counter
  e: string;
  [k: string]: unknown;
}

/** A stored log as events: anything that isn't an array of event objects (corrupt / foreign data) is dropped. */
export function parseLog(raw: string | null): TEvent[] {
  try {
    const v: unknown = JSON.parse(raw || '[]');
    if (!Array.isArray(v)) return [];
    return v.filter((x): x is TEvent => !!x && typeof x === 'object' && !Array.isArray(x) && Number.isFinite(x.run) && Number.isFinite(x.t));
  } catch {
    return [];
  }
}

let buf: TEvent[] = [];
let run = 0;
try {
  buf = parseLog(localStorage.getItem(KEY));
} catch {
  buf = [];
}
run = buf.length ? buf[buf.length - 1].run : 0;

let dirty = false;
export function log(e: string, data: Record<string, unknown> = {}) {
  buf.push({ t: Date.now(), run, e, ...data });
  if (buf.length > MAX) buf = buf.slice(-MAX);
  dirty = true;
}

export function newRun(data: Record<string, unknown> = {}) {
  run++;
  log('run_start', data);
}

/** Routine saves write the log at most this often: stringifying up to MAX events is heavy on a phone. Going to the
 *  background and the end of a level flush right away (`flush`). */
export const FLUSH_EVERY_MS = 30000;
let lastFlush = -Infinity;

/** `flush` for the routine save path: skipped if the log was written less than FLUSH_EVERY_MS ago. */
export function flushThrottled(now = Date.now()) {
  if (now - lastFlush < FLUSH_EVERY_MS) return;
  flush(now);
}

export function flush(now = Date.now()) {
  if (!dirty) return;
  dirty = false;
  lastFlush = now;
  try {
    localStorage.setItem(KEY, JSON.stringify(buf));
  } catch {
    // storage full: the playtest log gives way (keep the newer half), never the save
    buf = buf.slice(-Math.floor(buf.length / 2));
    try {
      localStorage.setItem(KEY, JSON.stringify(buf));
    } catch {
      /* still full / unavailable */
    }
  }
}

/** Per-run summary for the playtest table (PLAYTEST.md). */
export function summary() {
  const runs = new Map<number, TEvent[]>();
  for (const ev of buf) (runs.get(ev.run) ?? runs.set(ev.run, []).get(ev.run)!).push(ev);
  return [...runs.entries()].map(([id, evs]) => {
    const start = evs.find((x) => x.e === 'run_start');
    const t0 = start?.t ?? evs[0].t;
    const merges = evs.filter((x) => x.e === 'merge');
    const end = evs.find((x) => x.e === 'end');
    return {
      run: id,
      date: new Date(t0).toISOString(),
      mode: start?.mode ?? '?',
      firstMergeS: merges.length ? +((merges[0].t - t0) / 1000).toFixed(1) : null,
      merges: merges.length,
      moves: evs.filter((x) => x.e === 'move').length,
      invalid: evs.filter((x) => x.e === 'invalid').length,
      scraps: evs.filter((x) => x.e === 'scrap').length,
      biggestChain: Math.max(0, ...merges.map((m) => Number(m.chain) || 0)),
      kickbacks: evs.filter((x) => x.e === 'kickback').length,
      result: end ? (end.won ? 'win' : 'loss') : 'quit',
      targets: end?.targets ?? null,
      activeS: end?.elapsed ?? null,
      retriedAfter: evs.some((x) => x.e === 'retry'),
    };
  });
}

export function exportText(): string {
  return JSON.stringify({ summary: summary(), events: buf }, null, 1);
}

export function clearLog() {
  buf = [];
  run = 0;
  dirty = true;
  flush();
}

/** Raw events (read-only copy) for the in-game playtest dashboard. */
export function events(): readonly TEvent[] {
  return buf;
}
