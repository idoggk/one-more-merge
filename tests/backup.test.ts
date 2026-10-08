import { describe, expect, it } from 'vitest';
import { applyBundle, BACKUP_VERSION, crc32, exportCode, importCode, lockSaves, META_KEY, readBundle, readPreimport, restorePreimport, SAVE_KEY, storeTo, type SaveBundle } from '../src/platform/backup';
import { newGame, serialize } from '../src/core/game';

class MemStore {
  map = new Map<string, string>();
  getItem(k: string) {
    return this.map.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.map.set(k, v);
  }
  removeItem(k: string) {
    this.map.delete(k);
  }
}

const meta = {
  tutorialDone: true,
  bestTime: 41.2,
  bestChain: 7,
  sound: true,
  levelStars: Object.fromEntries(Array.from({ length: 34 }, (_, i) => [String(i + 1), 1 + (i % 3)])),
  units: { cannon: { level: 4, cards: 3 }, coil: { level: 2, cards: 0 } },
  bolts: 1234,
  gems: 17,
  medals: { '1': true, '2': true, '3': true },
  season: { id: 3, xp: 220, claimed: [1, 2] },
  note: 'unicode é★',
};
const bundle = (): SaveBundle => ({ meta: structuredClone(meta), run: serialize(newGame(1234, false)), at: 1_700_000_000_000 });

/** Re-seals a tampered body with a valid checksum, to test checks past the CRC. */
const reseal = (head: string) => `${head}.${crc32(head).toString(16).padStart(8, '0')}`;

describe('save backup code', () => {
  it('round-trips the full save (compressed and plain)', async () => {
    for (const compress of [true, false]) {
      const b = bundle();
      const code = await exportCode(b, compress);
      expect(code.startsWith(`OMM${BACKUP_VERSION}${compress ? 'z' : 'j'}.`)).toBe(true);
      const r = await importCode(code);
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.bundle).toEqual(b);
    }
  });

  it('round-trips through storage and tolerates pasted whitespace', async () => {
    const src = new MemStore();
    applyBundle(src, bundle());
    const code = await exportCode(readBundle(src));
    const wrapped = `  ${code.slice(0, 20)}\n${code.slice(20, 50)} \r\n${code.slice(50)}\n`;
    const r = await importCode(wrapped);
    expect(r.ok).toBe(true);
    const dst = new MemStore();
    dst.setItem(SAVE_KEY, 'stale run');
    if (r.ok) applyBundle(dst, { ...r.bundle, run: null });
    expect(dst.getItem(SAVE_KEY)).toBeNull();
    if (r.ok) applyBundle(dst, r.bundle);
    expect(dst.getItem(META_KEY)).toBe(src.getItem(META_KEY));
    expect(dst.getItem(SAVE_KEY)).toBe(src.getItem(SAVE_KEY));
  });

  it('compresses: the code is shorter than the raw save', async () => {
    const b = bundle();
    const code = await exportCode(b, true);
    expect(code.length).toBeLessThan(JSON.stringify(b).length);
  });

  it('rejects corrupted, truncated, foreign and wrong-version codes without touching the save', async () => {
    const store = new MemStore();
    applyBundle(store, bundle());
    const before = new Map(store.map);
    const code = await exportCode(bundle());
    const [head, body] = code.split('.');
    const flip = (s: string, i: number) => s.slice(0, i) + (s[i] === 'A' ? 'B' : 'A') + s.slice(i + 1);
    const bad: [string, string][] = [
      ['', 'empty'],
      ['   \n', 'empty'],
      ['hello there', 'foreign'],
      ['{"meta":{}}', 'foreign'],
      [flip(code, head.length + 1 + 10), 'damaged'], // one character changed in the body
      [code.slice(0, code.length - 1), 'damaged'], // last checksum digit missing
      [code.slice(0, Math.floor(code.length / 2)), 'damaged'], // cut in half
      [code.slice(0, head.length + 1 + body.length), 'damaged'], // checksum dropped
      [code.replace(/^OMM\d+/, `OMM${BACKUP_VERSION + 1}`), 'newer'],
      [code.replace(/^OMM\d+/, 'OMM0'), 'older'],
      [reseal(`OMM${BACKUP_VERSION}z.${btoa('not deflate at all')}`), 'damaged'], // valid checksum, garbage inside
      [reseal(`OMM${BACKUP_VERSION}j.${btoa(JSON.stringify({ v: BACKUP_VERSION, meta: [], run: null }))}`), 'damaged'],
      [reseal(`OMM${BACKUP_VERSION}j.${btoa(JSON.stringify({ v: BACKUP_VERSION + 1, meta: {}, run: null }))}`), 'damaged'],
      [reseal(`OMM${BACKUP_VERSION}j.${btoa(JSON.stringify({ v: BACKUP_VERSION, meta: {}, run: 5 }))}`), 'damaged'],
    ];
    for (const [c, reason] of bad) {
      const r = await importCode(c);
      expect(r.ok, c.slice(0, 40)).toBe(false);
      if (!r.ok) {
        expect(r.reason, c.slice(0, 40)).toBe(reason);
        expect(r.message.length).toBeGreaterThan(10);
      }
    }
    expect(store.map).toEqual(before);
  });

  it('REPLACE flow: once saves are locked, the reload-time save() cannot write the old game back', async () => {
    const phone = new MemStore();
    phone.setItem(META_KEY, JSON.stringify({ tutorialDone: false, bolts: 5 }));
    phone.setItem(SAVE_KEY, 'old run');
    const r = await importCode(await exportCode({ ...bundle(), run: null }));
    if (!r.ok) throw new Error(r.message);
    lockSaves();
    try {
      applyBundle(phone, r.bundle);
      // what visibilitychange -> save() does during unload
      storeTo(phone, META_KEY, JSON.stringify({ tutorialDone: true, bolts: 5 }));
      storeTo(phone, SAVE_KEY, 'old run');
    } finally {
      lockSaves(false);
    }
    expect(readBundle(phone)).toEqual({ meta: r.bundle.meta, run: null });
  });

  it('keeps the previous save and can undo the load once', () => {
    const phone = new MemStore();
    phone.setItem(META_KEY, '{"bolts":5}');
    phone.setItem(SAVE_KEY, 'old run');
    applyBundle(phone, bundle());
    expect(readPreimport(phone)).toEqual({ meta: { bolts: 5 }, run: 'old run' });
    expect(restorePreimport(phone)).toBe(true);
    expect(readBundle(phone)).toEqual({ meta: { bolts: 5 }, run: 'old run' });
    expect(readPreimport(phone)).toBeNull();
    expect(restorePreimport(phone)).toBe(false);
    // a fresh phone (no meta yet) restores to an empty meta and no run
    const fresh = new MemStore();
    applyBundle(fresh, bundle());
    restorePreimport(fresh);
    expect(readBundle(fresh)).toEqual({ meta: {}, run: null });
  });

  it('is all or nothing: a failed write (quota) leaves the old save in place', () => {
    const phone = new MemStore();
    phone.setItem(META_KEY, '{"bolts":5}');
    phone.setItem(SAVE_KEY, 'old run');
    const before = new Map(phone.map);
    const set = phone.setItem.bind(phone);
    phone.setItem = (k: string, v: string) => {
      if (k === SAVE_KEY && v !== 'old run') throw new Error('QuotaExceededError');
      set(k, v);
    };
    expect(() => applyBundle(phone, bundle())).toThrow();
    expect(phone.map).toEqual(before);
  });
});
