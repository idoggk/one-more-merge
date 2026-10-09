import { describe, expect, it } from 'vitest';
import { Rng } from '../src/core/rng';
import { fitSlot } from '../src/core/screw';
import { AUTO_JUMP, cloneObject, coveredBy, CRATE, facing, greedyPick, newObject, objectRules, projectPt, reachable, reachableAny, ROW_SIZE, screenPick, screwSpot3, shownFaces, solveObject, tapRow, tapScrew, useBroom, useDrill, useHammer, viewFor, viewOf, type ObjectDef, type ObjectState, type View } from '../src/core/screwObject';

/** A small test object: two blocks in a row front-to-back, so the back block's front screw hides behind the front one. */
const PAIR: ObjectDef = {
  id: 'pair',
  name: 'PAIR',
  blocks: [
    { id: 0, x: 0, y: 0, z: 1, tint: 0, screws: [0, 1, 2] },
    { id: 1, x: 0, y: 0, z: 0, tint: 0, screws: [3, 4, 5] },
  ],
  screws: [
    { id: 0, block: 0, face: 'front', color: 0 },
    { id: 1, block: 0, face: 'right', color: 1 },
    { id: 2, block: 0, face: 'top', color: 0 },
    { id: 3, block: 1, face: 'front', color: 0 },
    { id: 4, block: 1, face: 'back', color: 1 },
    { id: 5, block: 1, face: 'left', color: 1 },
  ],
  queue: [0, 1],
};
const play = (st: ObjectState, sid: number) => {
  const v = viewFor(st, sid);
  return tapScrew(st, sid, v === -1 ?viewOf(st.lvl.screws[sid].face, 0) : v);
};
const randomTapper = (lvl: ObjectDef, seed: number, row = ROW_SIZE) => {
  const r = new Rng(seed);
  const st = newObject(lvl, objectRules(row));
  while (!st.won && !st.lost) {
    const free = lvl.screws.filter((s) => reachableAny(st, s.id));
    play(st, free[r.int(free.length)].id);
  }
  return st;
};

describe('Screw Yard A: the turnable object', () => {
  it('defaults: a 5-slot row (4 allowed) and auto-jump on', () => {
    expect(ROW_SIZE).toBe(5);
    expect(AUTO_JUMP).toBe(true);
    expect(newObject(CRATE).rules.dock).toBe(5);
    expect(newObject(CRATE, objectRules(4)).rules.dock).toBe(4);
  });

  it('a screw is reachable only when its face looks at the camera (top: always) and nothing covers it', () => {
    const st = newObject(PAIR);
    const views: View[] = [0, 1, 2, 3];
    expect(views.filter((v) => reachable(st, 0, v))).toEqual([0]); // front
    expect(views.filter((v) => reachable(st, 1, v))).toEqual([1]); // right
    expect(views.filter((v) => reachable(st, 2, v))).toEqual([0, 1, 2, 3]); // top
    expect(views.filter((v) => reachable(st, 4, v))).toEqual([2]); // back
    expect(views.filter((v) => reachable(st, 5, v))).toEqual([3]); // left
    // the back block's front screw is behind the front block in every view
    expect(coveredBy(st, 3)).toBe(0);
    expect(views.some((v) => reachable(st, 3, v))).toBe(false);
    expect(tapScrew(st, 0, 1).reason).toBe('away');
    expect(tapScrew(st, 3, 0).reason).toBe('blocked');
    expect(st.removed.some(Boolean)).toBe(false);
  });

  it('a block falls when its last screw is out and reveals the screw behind it', () => {
    const st = newObject(PAIR);
    expect(tapScrew(st, 0, 0).fell).toEqual([]);
    expect(tapScrew(st, 2, 3).fell).toEqual([]);
    const r = tapScrew(st, 1, 1);
    expect(r.fell).toEqual([0]);
    expect(st.fallen[0]).toBe(true);
    expect(coveredBy(st, 3)).toBe(-1);
    expect(reachable(st, 3, 0)).toBe(true);
  });

  it('boxes: 2 open, next 2 shown, a full box leaves and the next colour slides in', () => {
    const st = newObject(CRATE);
    expect(st.boxes.map((b) => b!.color)).toEqual(CRATE.queue.slice(0, 2));
    expect(st.qi).toBe(2);
    const c0 = st.boxes[0]!.color;
    const mine = CRATE.screws.filter((s) => s.color === c0 && reachableAny(st, s.id)).slice(0, 3);
    expect(mine.length).toBe(3);
    let left: { slot: number; color: number }[] = [];
    for (const s of mine) left = play(st, s.id).left;
    expect(left).toEqual([{ slot: 0, color: c0 }]);
    expect(st.boxes[0]).toEqual({ color: CRATE.queue[2], n: 0 });
    expect(st.qi).toBe(3);
  });

  it('a screw with no open box waits in the row; a full row loses', () => {
    const st = newObject(CRATE, objectRules(4));
    const open = () => st.boxes.map((b) => b?.color);
    for (let guard = 0; guard < 30 && !st.lost; guard++) {
      const s = CRATE.screws.find((q) => reachableAny(st, q.id) && !open().includes(q.color));
      if (!s) break;
      expect(play(st, s.id).to).toBe('row');
    }
    expect(st.lost).toBe(true);
    expect(st.tray.length).toBe(4);
    expect(play(st, CRATE.screws.find((q) => !st.removed[q.id])!.id).reason).toBe('over');
  });

  it('auto-jump: when a box of their colour opens, waiting row screws fly into it', () => {
    const st = newObject(PAIR);
    st.boxes = [{ color: 0, n: 0 }, null];
    st.qi = 1; // the colour-1 box comes next
    play(st, 1); // colour 1 -> row
    play(st, 4); // colour 1 -> row
    expect(st.tray).toEqual([1, 1]);
    play(st, 0);
    play(st, 2); // box 0 holds 2
    const r = play(st, 3); // third red: box 0 fills, the blue box opens, both row screws jump in
    expect(r.left).toEqual([{ slot: 0, color: 0 }]);
    expect(r.pulls).toEqual([{ color: 1, slot: 0 }, { color: 1, slot: 0 }]);
    expect(st.tray).toEqual([]);
    expect(st.boxes[0]).toEqual({ color: 1, n: 2 });
  });

  it('auto-jump off: row screws wait until tapped', () => {
    const st = newObject(PAIR, objectRules(5, false));
    st.boxes = [{ color: 0, n: 0 }, null];
    st.qi = 1;
    for (const s of [1, 4, 0, 2, 3]) play(st, s);
    expect(st.tray).toEqual([1, 1]);
    expect(st.boxes[0]).toEqual({ color: 1, n: 0 });
    expect(tapRow(st, 0).ok).toBe(true);
    expect(st.tray).toEqual([1]);
    expect(st.boxes[0]!.n).toBe(1);
  });

  it('Broom sends the row to the side tray, which refills boxes as they open', () => {
    const st = newObject(PAIR);
    st.boxes = [{ color: 0, n: 0 }, null];
    st.qi = 1;
    play(st, 1);
    expect(useBroom(st).ok).toBe(true);
    expect(st.tray).toEqual([]);
    expect(st.stash).toEqual([1]);
    expect(st.helpers.broom).toBe(0);
    expect(useBroom(st).reason).toBe('none');
    for (const s of [0, 2, 3]) play(st, s);
    expect(st.stash).toEqual([]);
    expect(st.boxes[0]).toEqual({ color: 1, n: 1 });
    play(st, 4);
    play(st, 5);
    expect(st.won).toBe(true);
  });

  it('Hammer breaks one block: its screws drop into boxes / the row and what it hid is revealed', () => {
    const st = newObject(PAIR);
    const r = useHammer(st, 0);
    expect(r.ok).toBe(true);
    expect(r.fell).toEqual([0]);
    expect(r.taken!.map((t) => t.id)).toEqual([0, 1, 2]);
    expect(st.removed.slice(0, 3)).toEqual([true, true, true]);
    expect(st.boxes[0]!.n).toBe(2); // the two reds in box 0
    expect(st.boxes[1]!.n).toBe(1); // the blue in box 1
    expect(reachable(st, 3, 0)).toBe(true);
    expect(useHammer(st, 1).reason).toBe('none'); // only one hammer
  });

  it('Hammer is refused when its screws would fill the row', () => {
    const st = newObject(PAIR, objectRules(2));
    st.boxes = [{ color: 2, n: 0 }, null];
    st.qi = 2; // nothing fits: all three screws would need the row
    expect(useHammer(st, 0).reason).toBe('full');
    expect(st.removed.some(Boolean)).toBe(false);
    expect(st.helpers.hammer).toBe(1);
  });

  it('Drill adds one row slot', () => {
    const st = newObject(CRATE);
    expect(useDrill(st).ok).toBe(true);
    expect(st.rules.dock).toBe(ROW_SIZE + 1);
    expect(useDrill(st).reason).toBe('none');
    expect(newObject(CRATE).rules.dock).toBe(ROW_SIZE); // the def's rules are untouched
  });
});

describe('Screw Yard A: THE CRATE', () => {
  it('is about 12 blocks / 30 screws / 4 colours, every block screwed, colours fill the box queue exactly', () => {
    expect(CRATE.blocks.length).toBe(12);
    expect(CRATE.screws.length).toBe(30);
    expect(new Set(CRATE.screws.map((s) => s.color)).size).toBe(4);
    for (const b of CRATE.blocks) expect(b.screws.length).toBeGreaterThan(0);
    const want = new Map<number, number>(), have = new Map<number, number>();
    for (const c of CRATE.queue) want.set(c, (want.get(c) ?? 0) + 3);
    for (const s of CRATE.screws) have.set(s.color, (have.get(s.color) ?? 0) + 1);
    expect(have).toEqual(want);
    // some screws are hidden until a block falls, and every view has work to do
    const st = newObject(CRATE);
    expect(CRATE.screws.filter((s) => coveredBy(st, s.id) >= 0).length).toBeGreaterThanOrEqual(4);
    for (const v of [0, 1, 2, 3] as View[]) expect(CRATE.screws.some((s) => s.face !== 'top' && reachable(st, s.id, v))).toBe(true);
  });

  it('is winnable (exact solver, row 5 and row 4) and a sensible player wins it', () => {
    for (const row of [5, 4]) {
      const path = solveObject(CRATE, objectRules(row));
      expect(path).not.toBeNull();
      const st = newObject(CRATE, objectRules(row));
      for (const sid of path!) expect(play(st, sid).ok).toBe(true);
      expect(st.won).toBe(true);
      const g = newObject(CRATE, objectRules(row));
      for (let k = 0; k < 40 && !g.won && !g.lost; k++) play(g, greedyPick(g)!);
      expect(g.won).toBe(true);
    }
  });

  it('order matters: a random tapper loses often, and a careless order (off-colour screws first) fills the row', () => {
    let losses = 0;
    for (let seed = 1; seed <= 300; seed++) if (randomTapper(CRATE, seed).lost) losses++;
    expect(losses).toBeGreaterThan(60);
    expect(losses).toBeLessThan(290);
    const st = newObject(CRATE);
    for (let k = 0; k < 40 && !st.lost && !st.won; k++) {
      const free = CRATE.screws.filter((s) => reachableAny(st, s.id));
      const off = free.find((s) => fitSlot(st, s.color) < 0) ?? free[0];
      play(st, off.id);
    }
    expect(st.lost).toBe(true);
  });

  // t-18c1b8a9: screws 26/27/29 were drawn bright but a tap missed them (or took another screw) after blocks 1/4 fell,
  // and greedy looped on them forever. Bright / tappable / "the solver may pick it" are now one screen fact.
  const views: View[] = [0, 1, 2, 3];
  /** Every view: bright ⇔ a tap on its drawn spot picks exactly it ⇔ tapScrew takes exactly it. */
  const agree = (st: ObjectState) => {
    for (const v of views) {
      const faces = shownFaces(st, v);
      for (const sc of st.lvl.screws) {
        if (st.removed[sc.id]) continue;
        const s = projectPt(screwSpot3(st.lvl, sc.id), v);
        const bright = reachable(st, sc.id, v);
        const pk = screenPick(st, v, s.x, s.y, faces);
        expect(bright, `screw ${sc.id} view ${v}`).toBe(pk.sid === sc.id);
        // a tap that takes no screw always says why
        if (pk.sid === null) expect(pk.reason, `screw ${sc.id} view ${v}`).toBeDefined();
        const nx = cloneObject(st);
        const r = tapScrew(nx, sc.id, v);
        expect(r.ok).toBe(bright && !st.won && !st.lost);
        if (r.ok) expect(nx.removed.filter((x, i) => x !== st.removed[i])).toEqual([true]);
      }
    }
  };

  it('bright ⇔ a tap at its spot takes it, in all 4 views after every block falls', () => {
    let falls = 0;
    for (let seed = 1; seed <= 40; seed++) {
      const r = new Rng(seed);
      const st = newObject(CRATE, objectRules(8)); // a roomy row so runs go deep
      agree(st);
      while (!st.won && !st.lost) {
        const free = CRATE.screws.filter((s) => reachableAny(st, s.id));
        expect(free.length).toBeGreaterThan(0);
        const res = play(st, free[r.int(free.length)].id);
        expect(res.ok).toBe(true);
        if (res.fell.length) {
          falls++;
          agree(st);
        }
      }
    }
    expect(falls).toBeGreaterThan(50);
    let overhang = 0;
    // the walkthrough case: blocks 1 and 4 gone (each alone and both) - hammer them out
    for (const out of [[1], [4], [1, 4], [4, 1], [10], [1, 4, 10]]) {
      const st = newObject(CRATE, objectRules(30), { broom: 0, hammer: 9, drill: 0 });
      for (const b of out) expect(useHammer(st, b).ok).toBe(true);
      agree(st);
      // the old axis rule (facing + nothing straight out from the face) called some of these free; the screen doesn't
      for (const id of [26, 27, 28, 29]) {
        const axisFree = views.filter((v) => !st.removed[id] && coveredBy(st, id) < 0 && facing(CRATE.screws[id].face, v));
        overhang += axisFree.filter((v) => !reachable(st, id, v)).length;
      }
    }
    expect(overhang).toBeGreaterThan(0);
  }, 30000);

  it('greedy and the solver only pick screen-tappable screws and always finish', () => {
    for (const row of [5, 4, 8]) {
      for (let seed = 0; seed <= 30; seed++) {
        const r = new Rng(seed);
        const st = newObject(CRATE, objectRules(row));
        // a few random taps first, then greedy to the end
        for (let k = 0; k < seed % 7 && !st.won && !st.lost; k++) {
          const free = CRATE.screws.filter((s) => reachableAny(st, s.id));
          play(st, free[r.int(free.length)].id);
        }
        for (let k = 0; k < 40 && !st.won && !st.lost; k++) {
          const sid = greedyPick(st);
          expect(sid).not.toBeNull();
          expect(views.some((v) => reachable(st, sid!, v))).toBe(true);
          expect(play(st, sid!).ok).toBe(true);
        }
        expect(st.won || st.lost).toBe(true);
      }
      const path = solveObject(CRATE, objectRules(row));
      expect(path).not.toBeNull();
    }
  }, 30000);

  it('is deterministic: the same taps give the same state', () => {
    const a = randomTapper(CRATE, 7), b = randomTapper(CRATE, 7);
    expect(a.removed).toEqual(b.removed);
    expect(a.tray).toEqual(b.tray);
    expect(a.won).toBe(b.won);
  });
});
