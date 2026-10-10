// t-00c7ecc6: players never lose progress. Saves made before the 2026-10-09 changes (tip queue, staged unlocks,
// toy timing, QA switches, Object Yard, units B0/B1, sandwich merge rule) load whole, the new fields get defaults,
// a backup code carries the new fields, damaged saves fall back safely, and QA switches never ride in a backup code.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { applyBundle, exportCode, importCode, META_KEY, readBundle, SAVE_KEY, type SaveBundle } from '../src/platform/backup';
import { loadMeta, type Meta } from '../src/game/meta';
import { FEATURES, isNew, markSeen, migrateUnlocks, refreshUnlocks } from '../src/game/unlocks';
import { deserialize, newGame, resumable, serialize, tick } from '../src/core/game';
import { PACE_KEY, UNITS_B0_KEY } from '../src/content/experiments';
import { MERGE_RULE_KEY } from '../src/core/sandwich';
import { TUNING } from '../src/content/tuning';
import { cardsFor, LEVEL_CARDS, unitDef } from '../src/content/units';
import { cardsAvailable } from '../src/core/spareParts';

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

/** loadMeta() on a phone whose storage holds `meta` (a raw string is stored as is). */
const loadFrom = (meta: unknown): Meta => {
  const phone = new MemStore();
  if (meta !== undefined) phone.setItem(META_KEY, typeof meta === 'string' ? meta : JSON.stringify(meta));
  vi.stubGlobal('localStorage', phone);
  return loadMeta();
};
afterEach(() => vi.unstubAllGlobals());

/** What GameScene.create() does to a loaded meta before the first frame (unlocks part). */
const boot = (m: Meta) => {
  const cleared = Object.keys(m.levelStars ?? {}).length;
  migrateUnlocks(m, cleared);
  refreshUnlocks(m, cleared);
  (m.tipQueue ??= []).length; // GameScene's tip ledger
  return m;
};

const stars = (n: number) => Object.fromEntries(Array.from({ length: n }, (_, i) => [String(i + 1), 1 + (i % 3)]));

// Meta shapes as they were at 1f634f0 (before today's changes): no tipQueue, unlocks or unlockSeen.
/** A long-time player: every field that existed at 1f634f0 set. */
const OLD_VETERAN = {
  tutorialDone: true,
  bestTime: 41.2,
  bestChain: 9,
  runs: 312,
  wins: 140,
  sound: false,
  hints: true,
  music: false,
  stage: 'neon',
  ornament: null,
  workshopSeenBolts: 900,
  medals: { '1': true, '2': true, '3': true },
  backupNudged: { '2': true },
  lessons: { road: true, card: true },
  levelStars: stars(41),
  levelPace: { '1': { t: 38.5, p: 'abc' }, '2': { t: 51, p: 'xyz' } },
  kits: 3,
  capsules: 2,
  grants: { firstClear: true },
  failPaid: { '12': '2026-10-01' },
  shooter: 'rocket',
  playtestMode: false,
  units: { cannon: { level: 5, cards: 2 }, coil: { level: 4, cards: 0 }, bell: { level: 3, cards: 1 }, rocket: { level: 2, cards: 0 }, magnet: { level: 1, cards: 0 } },
  gems: 23,
  crates: { iron: 1 },
  crateSeq: 14,
  pity: { epic: 3, dry: 1 },
  unitChoiceDone: true,
  relays: ['coil', 'bell'],
  bounty: { '2026-10-08': { won: [0, 1], mastered: [0] } },
  bossMastery: { forge: 2 },
  trophies: ['forge'],
  screwdrivers: 4,
  yardBoosters: { broom: 1, hammer: 2 },
  trial: { date: '2026-10-08', unit: 'mortar', left: 1, on: false, endShown: true },
  puzzles: { date: '2026-10-08', day: 20369, streak: 4, lastSolved: '2026-10-08', drills: ['d1', 'd2'], fails: { d3: 1 }, shown: ['d1'] },
  season: { id: 3, xp: 220, premium: false, claimed: { free: [1, 2], prem: [] }, day: 20369, daily: [0, 1, 0], week: 2909, weekly: [0, 0, 0, 0] },
  sagaMedals: { '3': [0, 1] },
  endless: { floor: 7, best: 6 },
  collClaimed: 2,
  yard: { week: 2909, clears: 3, paid: 1, stars: { y1: 3 } },
  masteryPaid: 4,
  rush: { week: 2909, course: ['forge', 'hydra'], granted: 50, best: { fights: 2, time: 99 }, stamps: { forge: true }, medal: false, weeks: [2908], run: { i: 1, times: [40] } },
  swapMismatch: true,
  shake: false,
  hardUnlocked: true,
  bestTimeHard: 77,
  toys: { magnet: true, battery: false },
  remixBest: { 'forge:magnet': 55 },
  tips: { x_chain: true, x_kick: true },
  bolts: 1234,
  owned: ['hat_1'],
  finish: 'chrome',
  nameIdx: 3,
  onboarded: true,
  dailyPaid: { '2026-10-08': true },
  lastSettle: '2026-10-08',
  homeSeen: { cannon: 4 },
  mastery: { cannon: 5, coil: 4 },
  daily: { '2026-10-08': { v: 1, targets: 2, time: null, dmg: 900, attempts: 3 } },
  someFutureField: { kept: true },
};
/** An early player (3 levels cleared, a toy won before toy timing moved helpers to level 8). */
const OLD_EARLY = { tutorialDone: true, bestTime: null, bestChain: 4, runs: 5, wins: 3, sound: true, hints: true, music: true, hardUnlocked: false, bestTimeHard: null, toys: { magnet: true }, remixBest: {}, tips: { x_chain: true }, levelStars: stars(3), bolts: 40 };
/** The very first saves only had the core trio of fields. */
const OLD_TINY = { tutorialDone: true, bestTime: 63.1, bestChain: 3 };

describe('saves from before 2026-10-09 load whole', () => {
  it('every old field survives loading, unknown fields are kept, new fields get defaults', () => {
    for (const old of [OLD_VETERAN, OLD_EARLY, OLD_TINY]) {
      const m = loadFrom(old);
      expect(m).toMatchObject(old);
      expect(m.tipQueue).toBeUndefined();
      expect(m.unlocks).toBeUndefined();
      boot(m);
      expect(m.tipQueue).toEqual([]);
      expect(m).toMatchObject(old); // migration adds, never takes away
    }
    // defaults fill the rest of a tiny save
    expect(loadFrom(OLD_TINY)).toMatchObject({ runs: 0, wins: 0, sound: true, music: true, toys: {}, tips: {}, hardUnlocked: false });
  });

  it('staged unlocks: an old veteran keeps every feature open, with no NEW cues', () => {
    const m = boot(loadFrom(OLD_VETERAN));
    for (const f of FEATURES) {
      expect(m.unlocks?.[f], f).toBe(true);
      expect(isNew(m, f), f).toBe(false);
    }
  });

  it('staged unlocks + toy timing: an early player keeps what the old rules showed (and a toy won early)', () => {
    const m = boot(loadFrom(OLD_EARLY));
    expect(m.toys).toEqual({ magnet: true });
    // old rules: TEAM with any toy, Daily Puzzle at 3 cleared, Gems once played; Challenge only at 5
    expect(m.unlocks).toMatchObject({ team: true, puzzles: true, gems: true });
    expect(m.unlocks?.challenge).toBeUndefined();
    expect(m.unlocks?.remix).toBeUndefined();
  });

  it('an old save goes through a backup code and still loads whole', async () => {
    for (const compress of [true, false]) {
      const r = await importCode(await exportCode({ meta: structuredClone(OLD_VETERAN), run: null }, compress));
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      expect(r.bundle.meta).toEqual(OLD_VETERAN);
      const phone = new MemStore();
      applyBundle(phone, r.bundle);
      expect(loadFrom(phone.getItem(META_KEY)!)).toMatchObject(OLD_VETERAN);
    }
  });

  it('a run saved before sandwich stats resumes and plays on', () => {
    const s = newGame(77, false);
    const old = JSON.parse(serialize(s));
    delete old.stats.sandwiches;
    const loaded = resumable(deserialize(JSON.stringify(old)), 80);
    expect(loaded).not.toBeNull();
    expect(() => {
      for (let i = 0; i < 100; i++) tick(loaded!);
    }).not.toThrow();
  });
});

describe('backup code round-trip with every new field set', () => {
  const NEW_META = {
    ...structuredClone(OLD_VETERAN),
    tipQueue: ['x_kick', 'x_shield'],
    unlocks: { team: true, challenge: true, workshop: true, puzzles: true, remix: true, gems: true },
    unlockSeen: { team: true, challenge: false, workshop: true },
    toys: { magnet: true, battery: false, fan: false },
  };

  it('export -> import -> storage -> load keeps tipQueue, unlocks, unlockSeen and toys', async () => {
    for (const compress of [true, false]) {
      const bundle: SaveBundle = { meta: structuredClone(NEW_META), run: serialize(newGame(5, false)), at: 1_760_000_000_000 };
      const r = await importCode(await exportCode(bundle, compress));
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      expect(r.bundle).toEqual(bundle);
      const phone = new MemStore();
      applyBundle(phone, r.bundle);
      const m = boot(loadFrom(phone.getItem(META_KEY)!));
      expect(m).toMatchObject(NEW_META); // boot() never re-opens or re-closes saved unlocks
      expect(isNew(m, 'challenge')).toBe(true);
      expect(phone.getItem(SAVE_KEY)).toBe(bundle.run);
    }
  });
});

describe('damaged or partial saves fall back safely', () => {
  it('unreadable / non-object meta gives a fresh profile, never a crash', () => {
    for (const raw of ['{"tutorialDone":true,"levelSt', 'null', '[]', '"text"', '42', '']) {
      const m = boot(loadFrom(raw));
      expect(m.tutorialDone, raw).toBe(false);
      expect(m.toys).toEqual({});
    }
  });

  it('bad new fields are dropped or repaired, the rest of the progress stays', () => {
    const m = loadFrom({ ...OLD_EARLY, tipQueue: ['x_kick', 5, null, 'x_shield'], levelStars: { '1': 3, '2': 'x' } });
    expect(m.tipQueue).toEqual(['x_kick', 'x_shield']);
    expect(m.levelStars).toEqual({ '1': 3 });
    expect(m.bolts).toBe(40);
    for (const tipQueue of ['x_kick', 7, { a: 1 }, null]) expect(loadFrom({ ...OLD_EARLY, tipQueue }).tipQueue).toBeUndefined();
  });

  // Bug found here: `unlocks: true` (or "yes", 5) was kept as stored, so refreshUnlocks / markSeen threw
  // "Cannot create property" during GameScene.create() and the game never started. Now dropped like any bad field.
  it('wrong-shaped unlocks / unlockSeen never brick the launch', () => {
    for (const bad of ['yes', 5, true, [], null]) {
      for (const old of [OLD_EARLY, OLD_VETERAN]) {
        const m = loadFrom({ ...old, unlocks: bad, unlockSeen: bad });
        expect(() => boot(m), JSON.stringify(bad)).not.toThrow();
        expect(() => FEATURES.forEach((f) => markSeen(m, f) || isNew(m, f))).not.toThrow();
        expect(m.bolts).toBe(old.bolts);
        expect(m.unlocks?.puzzles).toBe(true); // migration re-runs: the old-rule features stay open
      }
    }
    // a record with one bad entry keeps the good ones
    const m = boot(loadFrom({ ...OLD_EARLY, unlocks: { team: 'yes', challenge: true }, unlockSeen: { team: 1, challenge: true } }));
    expect(m.unlocks).toMatchObject({ challenge: true });
    expect(m.unlockSeen).toEqual({ challenge: true });
  });

  it('a damaged run save is dropped, the meta is untouched', () => {
    for (const run of ['{"version":1,"grid":[1,2', '{}', 'null', JSON.stringify({ version: 1, grid: [], phase: 'playing' })]) expect(resumable(deserialize(run), 80)).toBeNull();
  });
});

describe('QA switches stay on the device', () => {
  /** Every QA localStorage key the source mentions, so a new switch is covered without editing this test. */
  const qaKeys = (() => {
    const keys = new Set<string>([PACE_KEY, UNITS_B0_KEY, MERGE_RULE_KEY]);
    const walk = (dir: string): void => {
      for (const f of readdirSync(dir)) {
        const p = join(dir, f);
        if (statSync(p).isDirectory()) walk(p);
        else if (/\.ts$/.test(f)) for (const m of readFileSync(p, 'utf8').matchAll(/['"](omm_qa_[a-z0-9_]+)['"]/g)) keys.add(m[1]);
      }
    };
    walk(join(__dirname, '..', 'src'));
    return [...keys];
  })();

  it('finds the known QA keys', () => {
    expect(qaKeys).toEqual(expect.arrayContaining(['omm_qa_pace', 'omm_qa_units_b0', 'omm_qa_merge_rule', 'omm_qa_spam_variant', 'omm_qa_screw_yard']));
    for (const k of qaKeys) expect([META_KEY, SAVE_KEY]).not.toContain(k);
  });

  it('never in the backup code, and a load keeps this device\'s QA switches', async () => {
    const phone = new MemStore();
    for (const k of qaKeys) phone.setItem(k, k.endsWith('units_b0') ? 'b1' : k.endsWith('screw_yard') ? 'object' : 'calm');
    phone.setItem(META_KEY, JSON.stringify(OLD_VETERAN));
    phone.setItem(SAVE_KEY, serialize(newGame(9, false)));
    const code = await exportCode(readBundle(phone), false);
    const json = atob(code.split('.')[1]);
    expect(json).not.toContain('omm_qa');
    for (const v of ['"b1"', '"object"', '"calm"']) expect(json).not.toContain(v);

    const other = new MemStore();
    other.setItem(PACE_KEY, 'mania');
    const r = await importCode(code);
    if (!r.ok) throw new Error(r.message);
    applyBundle(other, r.bundle);
    expect(other.getItem(PACE_KEY)).toBe('mania');
    for (const k of qaKeys.filter((k) => k !== PACE_KEY)) expect(other.getItem(k)).toBeNull();
  });
});

// t-9d5b7cd0 ROSTER B crates: a 4th rarity, a Golden Workbench crate, a Legendary pity counter and Spare Parts all arrive as
// new optional fields, so every old collection save loads and plays the same with the flag off AND on.
describe('saves from before the Legendary rarity (ROSTER B crates)', () => {
  const OLD_COLLECTION = {
    tutorialDone: true, bestTime: null, bestChain: 4, runs: 9, wins: 6, sound: true, hints: true, music: true, hardUnlocked: true, bestTimeHard: null, toys: { magnet: true }, remixBest: {}, tips: {},
    units: { cannon: { level: 7, cards: 3 }, rocket: { level: 3, cards: 2 }, arc_welder: { level: 2, cards: 1 }, signal_beacon: { level: 5, cards: 2 } },
    crates: { wood: 2, iron: 1, gold: 1 }, crateSeq: 14, pity: { epic: 4, dry: 1, featured: 2 }, gems: 40, bolts: 500,
  };
  afterEach(() => {
    TUNING.rosterB = false;
  });

  it('loads whole, flag off and on; nothing is added until a B crate is opened', () => {
    for (const on of [false, true]) {
      TUNING.rosterB = on;
      const m = loadFrom(OLD_COLLECTION);
      expect(m).toMatchObject(OLD_COLLECTION);
      expect(m.spare).toBeUndefined();
      expect(m.pity?.leg).toBeUndefined();
      expect(m.crates?.bench).toBeUndefined();
    }
  });

  it('a Signal Beacon owned before keeps its level and cards; only its card table changes under the flag', () => {
    const m = loadFrom(OLD_COLLECTION);
    const st = m.units!.signal_beacon;
    TUNING.rosterB = false;
    expect([unitDef('signal_beacon')!.rarity, cardsFor(unitDef('signal_beacon')!, st.level)]).toEqual(['epic', LEVEL_CARDS.epic[4]]);
    TUNING.rosterB = true;
    expect([unitDef('signal_beacon')!.rarity, cardsFor(unitDef('signal_beacon')!, st.level), st.level, st.cards]).toEqual(['legendary', LEVEL_CARDS.legendary[4], 5, 2]);
    expect(cardsAvailable(m, 'signal_beacon')).toBe(2); // no spare parts yet: nothing invented
  });

  it('a Workbench crate, Legendary pity and Spare Parts survive save -> backup code -> load', async () => {
    const meta = { ...OLD_COLLECTION, crates: { wood: 1, bench: 2 }, pity: { epic: 3, dry: 0, leg: 17 }, spare: { rare: 4, legendary: 1 } };
    expect(loadFrom(meta)).toMatchObject(meta);
    for (const compress of [true, false]) {
      const r = await importCode(await exportCode({ meta: structuredClone(meta) as never, run: null }, compress));
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      const phone = new MemStore();
      applyBundle(phone, r.bundle);
      expect(loadFrom(phone.getItem(META_KEY)!)).toMatchObject(meta);
    }
  });

  it('damaged B fields are repaired without touching the rest of the progress', () => {
    const m = loadFrom({ ...OLD_COLLECTION, spare: { rare: 'lots', mythic: 5, epic: 2 }, pity: { epic: 1, dry: 0, leg: 'x' }, crates: { wood: 1, bench: null, chest: 3 } });
    expect(m.spare).toEqual({ epic: 2 }); // bad value and unknown rarity dropped
    expect(m.pity).toBeUndefined(); // a damaged pity object is dropped and the game rebuilds it
    expect(m.crates).toEqual({ wood: 1 });
    expect(m.units).toEqual(OLD_COLLECTION.units);
  });
});
