import { describe, expect, it } from 'vitest';
import { applyBundle, BACKUP_VERSION, crc32, exportCode, importCode, META_KEY, readBundle, SAVE_KEY, type SaveBundle } from '../src/platform/backup';
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
});
