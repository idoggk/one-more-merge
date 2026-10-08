// Save backup code (r43): the whole save (meta + any run in progress) as one pasteable string.
// Format: OMM<version><mode>.<base64 payload>.<crc32 hex>   mode z = deflate-raw, j = plain JSON (no CompressionStream)
// The checksum covers everything before the last dot, so a typo, a cut-off paste or a swapped version is caught
// before anything is decoded. Nothing here touches storage until applyBundle() is called.

import { CRATES, UNITS } from '../content/units';
import { FAMILIES } from '../core/types';

export const SAVE_KEY = 'omm.save.v1';
export const META_KEY = 'omm.meta.v1';

/** Bump when the save shape changes in a way old codes can't be loaded into. */
export const BACKUP_VERSION = 1;
/** Oldest code version this build still accepts. */
export const BACKUP_MIN_VERSION = 1;

export interface SaveBundle {
  /** The Meta record (progress, wallet, units, settings). */
  meta: Record<string, unknown>;
  /** Serialized run in progress, or null. */
  run: string | null;
  /** When the code was made (ms). */
  at?: number;
}

export type ImportResult = { ok: true; bundle: SaveBundle } | { ok: false; reason: 'empty' | 'foreign' | 'newer' | 'older' | 'damaged' | 'unsupported'; message: string };

const MESSAGES: Record<Exclude<ImportResult, { ok: true }>['reason'], string> = {
  empty: 'Paste your save code first.',
  foreign: "That doesn't look like a One More Merge save code.",
  newer: 'This code is from a newer version of the game.\nUpdate the game, then try again.',
  older: "This code is from an old version of the game\nand can't be loaded here.",
  damaged: 'This code looks damaged or cut off.\nCopy the whole code and try again.',
  unsupported: "This browser can't open compressed codes.\nUpdate it, then try again.",
};
const fail = (reason: keyof typeof MESSAGES): ImportResult => ({ ok: false, reason, message: MESSAGES[reason] });

let CRC_TABLE: Uint32Array | null = null;
export function crc32(s: string): number {
  if (!CRC_TABLE) {
    CRC_TABLE = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      CRC_TABLE[n] = c >>> 0;
    }
  }
  let c = 0xffffffff;
  for (let i = 0; i < s.length; i++) c = CRC_TABLE[(c ^ s.charCodeAt(i)) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

const toB64 = (bytes: Uint8Array) => {
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
};
const fromB64 = (b64: string) => Uint8Array.from(atob(b64), (ch) => ch.charCodeAt(0));

async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const out = new Blob([bytes as BlobPart]).stream().pipeThrough(stream);
  return new Uint8Array(await new Response(out).arrayBuffer());
}

/** Builds the code. `compress: false` forces the plain mode (also used when the browser lacks CompressionStream). */
export async function exportCode(bundle: SaveBundle, compress = typeof CompressionStream === 'function'): Promise<string> {
  const json = JSON.stringify({ v: BACKUP_VERSION, at: bundle.at ?? Date.now(), meta: bundle.meta, run: bundle.run });
  const raw = new TextEncoder().encode(json);
  const body = compress ? toB64(await pipe(raw, new CompressionStream('deflate-raw'))) : toB64(raw);
  const head = `OMM${BACKUP_VERSION}${compress ? 'z' : 'j'}.${body}`;
  return `${head}.${crc32(head).toString(16).padStart(8, '0')}`;
}

/** Checks and decodes a pasted code. Never touches storage. */
export async function importCode(input: string): Promise<ImportResult> {
  const code = (input ?? '').replace(/\s+/g, '');
  if (!code) return fail('empty');
  const ver = /^OMM(\d+)/.exec(code);
  if (!ver) return fail('foreign');
  const v = Number(ver[1]);
  // other versions may use another layout, so the version is judged before the checksum
  if (v > BACKUP_VERSION) return fail('newer');
  if (v < BACKUP_MIN_VERSION) return fail('older');
  const m = /^(OMM\d+([zj])\.([A-Za-z0-9+/]+=*))\.([0-9a-f]{8})$/.exec(code);
  if (!m || crc32(m[1]) !== parseInt(m[4], 16)) return fail('damaged');
  if (m[2] === 'z' && typeof DecompressionStream !== 'function') return fail('unsupported');
  let data: unknown;
  try {
    let bytes: Uint8Array = fromB64(m[3]);
    if (m[2] === 'z') bytes = await pipe(bytes, new DecompressionStream('deflate-raw'));
    data = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  } catch {
    return fail('damaged');
  }
  const d = data as { v?: unknown; at?: unknown; meta?: unknown; run?: unknown };
  if (!d || typeof d !== 'object' || d.v !== v) return fail('damaged');
  if (!d.meta || typeof d.meta !== 'object' || Array.isArray(d.meta)) return fail('damaged');
  if (d.run !== null && typeof d.run !== 'string') return fail('damaged');
  // a code whose meta has bad nested values loads repaired (never written to the phone as is)
  return { ok: true, bundle: { meta: repairMeta(d.meta as Record<string, unknown>), run: d.run, at: typeof d.at === 'number' ? d.at : undefined } };
}

type KV = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

/** `read(localStorage)`, or `fallback()` when storage is blocked (private mode / site data off: even touching
 *  `localStorage` throws). */
export function safeStorage<T>(read: (storage: KV) => T, fallback: () => T, storage: () => KV = () => localStorage): T {
  try {
    return read(storage());
  } catch {
    return fallback();
  }
}

/** The save as it sits in storage right now. */
export function readBundle(storage: KV): SaveBundle {
  let meta: Record<string, unknown> = {};
  try {
    const v: unknown = JSON.parse(storage.getItem(META_KEY) || '{}');
    if (isRecord(v)) meta = v;
  } catch {
    /* unreadable meta: export an empty one */
  }
  return { meta, run: storage.getItem(SAVE_KEY) };
}

/** The save as it was before the last load, kept so a wrong code can be undone. */
export const PREIMPORT = '.preimport';

const put = (storage: KV, k: string, v: string | null) => (v === null ? storage.removeItem(k) : storage.setItem(k, v));

/**
 * Replaces the stored save with a decoded bundle (the caller locks saves, then reloads the game).
 * Keeps the previous save under *.preimport unless `keepPrevious` is false. All or nothing: if a write fails
 * (quota), every key goes back to what it was and the error is rethrown.
 */
export function applyBundle(storage: KV, bundle: SaveBundle, keepPrevious = true) {
  const keys = [META_KEY, SAVE_KEY, META_KEY + PREIMPORT, SAVE_KEY + PREIMPORT];
  const old = keys.map((k) => storage.getItem(k));
  try {
    if (keepPrevious) {
      put(storage, META_KEY + PREIMPORT, old[0] ?? '{}');
      put(storage, SAVE_KEY + PREIMPORT, old[1]);
    }
    put(storage, META_KEY, JSON.stringify(bundle.meta));
    put(storage, SAVE_KEY, bundle.run);
  } catch (e) {
    // free the space first, then put the old values back
    keys.forEach((k) => storage.removeItem(k));
    keys.forEach((k, i) => {
      try {
        put(storage, k, old[i]);
      } catch {
        /* nothing more to do */
      }
    });
    throw e;
  }
}

const isRecord = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);

/** The save kept by the last load, or null (none, or unreadable: an unreadable snapshot is never offered as an undo). */
export function readPreimport(storage: KV): SaveBundle | null {
  const raw = storage.getItem(META_KEY + PREIMPORT);
  if (raw === null) return null;
  try {
    const meta: unknown = JSON.parse(raw);
    return isRecord(meta) ? { meta, run: storage.getItem(SAVE_KEY + PREIMPORT) } : null;
  } catch {
    return null;
  }
}

/**
 * Puts back the save from before the last load and forgets the snapshot. Never writes an empty `{}` meta over the
 * save: an empty snapshot (the phone had no save yet) removes the meta key, an unreadable one changes nothing.
 */
export function restorePreimport(storage: KV): boolean {
  const pre = readPreimport(storage);
  if (!pre) return false;
  const keys = [META_KEY, SAVE_KEY];
  const old = keys.map((k) => storage.getItem(k));
  try {
    put(storage, META_KEY, Object.keys(pre.meta).length ? JSON.stringify(pre.meta) : null);
    put(storage, SAVE_KEY, pre.run);
  } catch (e) {
    keys.forEach((k, i) => {
      try {
        put(storage, k, old[i]);
      } catch {
        /* nothing more to do */
      }
    });
    throw e;
  }
  storage.removeItem(META_KEY + PREIMPORT);
  storage.removeItem(SAVE_KEY + PREIMPORT);
  return true;
}

/** True for a browser "storage full" error (names / legacy codes differ per engine). */
export function isQuotaError(e: unknown): boolean {
  if (!e || typeof e !== 'object') return false;
  const { name, code } = e as { name?: unknown; code?: unknown };
  return name === 'QuotaExceededError' || name === 'NS_ERROR_DOM_QUOTA_REACHED' || code === 22 || code === 1014;
}

// ---------- meta shapes: one bad nested value (units: { rocket: null }) must never brick every launch ----------
/** Returns the value (repaired) or undefined: drop it, the game treats it as never set. */
type Fix = (v: unknown) => unknown;
const num: Fix = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : undefined);
const bool: Fix = (v) => (typeof v === 'boolean' ? v : undefined);
const str: Fix = (v) => (typeof v === 'string' ? v : undefined);
const orNull = (f: Fix): Fix => (v) => (v === null ? null : f(v));
const oneOf = (allowed: readonly string[]): Fix => (v) => (allowed.includes(v as string) ? v : undefined);
/** A list: bad items are dropped. */
const list = (f: Fix): Fix => (v) => (Array.isArray(v) ? v.map(f).filter((x) => x !== undefined) : undefined);
const tuple = (f: Fix, n: number): Fix => (v) => (Array.isArray(v) && v.length === n && v.every((x) => f(x) !== undefined) ? v : undefined);
/** A keyed record: bad entries (and keys outside `keys`, when given) are dropped, the rest kept. */
const rec =
  (f: Fix, keys?: readonly string[]): Fix =>
  (v) => {
    if (!isRecord(v)) return undefined;
    const out: Record<string, unknown> = {};
    for (const [k, x] of Object.entries(v)) {
      const y = keys && !keys.includes(k) ? undefined : f(x);
      if (y !== undefined) out[k] = y;
    }
    return out;
  };
/** A fixed-shape object: `req` fields must be there; an `opt` field may be missing. Any field present with the wrong
 *  shape drops the whole object (the game rebuilds a fresh one), since the code reads these fields without checks. */
const obj =
  (req: Record<string, Fix>, opt: Record<string, Fix> = {}): Fix =>
  (v) => {
    if (!isRecord(v)) return undefined;
    const out: Record<string, unknown> = { ...v };
    for (const [k, f] of Object.entries({ ...req, ...opt })) {
      if (!(k in v) && !(k in req)) continue;
      const y = f(v[k]);
      if (y === undefined) return undefined;
      out[k] = y;
    }
    return out;
  };
const flags = rec(bool);
const nums = rec(num);

/** Every meta field the game reads, by shape. Fields not listed here are kept as stored. */
export const META_SHAPES: Record<string, Fix> = {
  toys: flags,
  remixBest: nums,
  tips: flags,
  stage: orNull(str),
  ornament: orNull(str),
  workshopSeenBolts: num,
  medals: flags,
  backupNudged: flags,
  lessons: flags,
  levelStars: nums,
  levelPace: rec(obj({ t: num, p: str })),
  kits: num,
  capsules: num,
  grants: flags,
  failPaid: rec(str),
  shooter: oneOf(FAMILIES),
  playtestMode: bool,
  units: rec(obj({ level: num, cards: num }), UNITS.map((u) => u.id)),
  gems: num,
  crates: rec(num, Object.keys(CRATES)),
  crateSeq: num,
  pity: obj({ epic: num, dry: num }, { featured: num }),
  unitChoiceDone: bool,
  relays: tuple(str, 2),
  bounty: rec(obj({ won: list(num), mastered: list(num) })),
  bossMastery: nums,
  trophies: list(str),
  screwdrivers: num,
  yardBoosters: nums,
  trial: obj({ date: str, unit: str, left: num, on: bool }, { endShown: bool }),
  puzzles: obj({}, { date: str, day: num, streak: num, lastSolved: str, drills: list(str), fails: nums, shown: list(str) }),
  season: obj({ id: num, xp: num }, { premium: bool, claimed: obj({ free: list(num), prem: list(num) }), day: num, daily: list(num), week: num, weekly: list(num) }),
  sagaMedals: rec(list(num)),
  endless: obj({ floor: num, best: num }),
  collClaimed: num,
  yard: obj({ week: num }, { clears: num, paid: num, stars: nums }),
  masteryPaid: num,
  rush: obj(
    { week: num, course: list(str) },
    { granted: num, best: obj({ fights: num, time: num }), stamps: flags, medal: bool, weeks: list(num), run: obj({ i: num, times: list(num) }) },
  ),
  swapMismatch: bool,
  shake: bool,
  bolts: num,
  owned: list(str),
  finish: orNull(str),
  nameIdx: num,
  onboarded: bool,
  dailyPaid: flags,
  lastSettle: str,
  homeSeen: nums,
  mastery: nums,
  daily: rec(obj({ v: num, targets: num, dmg: num, attempts: num }, { time: orNull(num) })),
};

/** The meta with every known field checked by shape: bad entries are dropped or repaired, unknown fields kept. */
export function repairMeta(raw: Record<string, unknown>, shapes: Record<string, Fix> = META_SHAPES): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(raw)) {
    const y = Object.prototype.hasOwnProperty.call(shapes, k) ? shapes[k](v) : v;
    if (y !== undefined) out[k] = y;
  }
  return out;
}

/**
 * Loaded meta over its defaults, checked field by field: a stored value whose shape doesn't match the default
 * (e.g. `tips: null`, `toys: []`, `runs: "3"`) falls back to the default instead of crashing the game later.
 * Nested fields are checked too (META_SHAPES): a bad entry is dropped, not the whole save.
 * A field nobody describes is kept as stored. Anything that isn't an object gives the defaults.
 */
export function mergeMeta<T extends object>(defaults: T, raw: unknown): T {
  const out: Record<string, unknown> = { ...(defaults as Record<string, unknown>) };
  if (!isRecord(raw)) return out as T;
  for (const [k, v] of Object.entries(repairMeta(raw))) {
    if (!(k in defaults)) {
      out[k] = v;
      continue;
    }
    const d = (defaults as Record<string, unknown>)[k];
    const ok = d === null ? v === null || (typeof v === 'number' && Number.isFinite(v)) : isRecord(d) ? isRecord(v) : typeof d === 'number' ? typeof v === 'number' && Number.isFinite(v) : typeof v === typeof d;
    if (ok) out[k] = v;
  }
  return out as T;
}

let locked = false;
/**
 * Stops every later save write until the page reloads. Set before a load / undo / wipe: reload fires
 * visibilitychange -> save(), which would otherwise write the old in-memory game over the new save.
 */
export function lockSaves(on = true) {
  locked = on;
}

/** The game's only save writer: a no-op while saves are locked. */
export function storeTo(storage: KV, k: string, v: string | null) {
  if (locked) return;
  put(storage, k, v);
}
