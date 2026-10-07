// Save backup code (r43): the whole save (meta + any run in progress) as one pasteable string.
// Format: OMM<version><mode>.<base64 payload>.<crc32 hex>   mode z = deflate-raw, j = plain JSON (no CompressionStream)
// The checksum covers everything before the last dot, so a typo, a cut-off paste or a swapped version is caught
// before anything is decoded. Nothing here touches storage until applyBundle() is called.

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
  return { ok: true, bundle: { meta: d.meta as Record<string, unknown>, run: d.run, at: typeof d.at === 'number' ? d.at : undefined } };
}

type KV = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

/** The save as it sits in storage right now. */
export function readBundle(storage: KV): SaveBundle {
  let meta: Record<string, unknown> = {};
  try {
    meta = JSON.parse(storage.getItem(META_KEY) || '{}');
  } catch {
    /* unreadable meta: export an empty one */
  }
  return { meta, run: storage.getItem(SAVE_KEY) };
}

/** Replaces the stored save with a decoded bundle (the caller reloads the game afterwards). */
export function applyBundle(storage: KV, bundle: SaveBundle) {
  storage.setItem(META_KEY, JSON.stringify(bundle.meta));
  if (bundle.run === null) storage.removeItem(SAVE_KEY);
  else storage.setItem(SAVE_KEY, bundle.run);
}
