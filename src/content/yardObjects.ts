// SCREW YARD "TAKEN APART" objects (t-e24928d8): our own units built from chunky blocks on the screwObject model.
// A Cannon, a Coil and a Bell, hand-built, ramping Cannon < Coil < Bell. Screws wear their unit family's colour
// (0 Cannon red, 1 Coil blue, 2 Bell gold, 3 Support green) and the box queue is derived from the screw counts, so every
// object is a whole number of boxes. Clearing one pays cards of THAT unit. All of it sits behind the QA switch SCREW
// YARD = OBJECT; nothing here is saved (no new save field).
import type { Face, ObjectDef, OBlock, OScrew } from '../core/screwObject';

/** Unit cards a clear pays (one tuning constant); 3 stars pay double. */
export const TAKEN_APART_CARDS: Record<YardUnit, number> = { cannon: 3, coil: 4, bell: 5 };
export const THREE_STAR_MULT = 2;
/** Stars from the most screws that ever waited in the holding row. */
export const STAR_PEAK = { three: 2, two: 4 };

export type YardUnit = 'cannon' | 'coil' | 'bell';
export const YARD_UNITS: YardUnit[] = ['cannon', 'coil', 'bell'];
export const UNIT_NAMES: Record<YardUnit, string> = { cannon: 'CANNON', coil: 'COIL', bell: 'BELL' };

export const yardStars = (peak: number): 1 | 2 | 3 => (peak <= STAR_PEAK.three ? 3 : peak <= STAR_PEAK.two ? 2 : 1);
export const yardReward = (unit: YardUnit, stars: number) => TAKEN_APART_CARDS[unit] * (stars >= 3 ? THREE_STAR_MULT : 1);

const FACE: Record<string, Face> = { f: 'front', b: 'back', l: 'left', r: 'right', t: 'top' };
const COLOR: Record<string, number> = { R: 0, U: 1, Y: 2, G: 3 };

/** A block: [x, y, z, tint, 'fR bU ...'] (face letter f/b/l/r/t + colour letter R cannon / U coil / Y bell / G support). */
type Spec = [number, number, number, number, string];
function make(id: string, name: string, palette: number[], specs: Spec[]): ObjectDef {
  const blocks: OBlock[] = [], screws: OScrew[] = [];
  specs.forEach(([x, y, z, tint, s], bid) => {
    const b: OBlock = { id: bid, x, y, z, tint, screws: [] };
    for (const tok of s.split(' ').filter(Boolean)) {
      const sc: OScrew = { id: screws.length, block: bid, face: FACE[tok[0]], color: COLOR[tok[1]] };
      b.screws.push(sc.id);
      screws.push(sc);
    }
    blocks.push(b);
  });
  // queue: the colours with the most boxes lead, interleaved so no colour waits long
  const left = [0, 0, 0, 0];
  for (const s of screws) left[s.color]++;
  const queue: number[] = [];
  for (let n = left.reduce((a, c) => a + Math.floor(c / 3), 0); n > 0; ) {
    for (let c = 0; c < 4; c++) if (left[c] >= 3) (left[c] -= 3, queue.push(c), n--);
  }
  return { id, name, blocks, screws, queue, palette };
}

// palettes: tint index -> block colour
/** CANNON: barrel along x with a fused breech, a carriage and one wheel each side (the far wheel shows when you turn it).
 *  9 blocks, 3 colours, almost everything in plain sight: the easy one. */
export const CANNON: ObjectDef = make('cannon', 'CANNON', [0x5b6575, 0x9a6234, 0x3a3340, 0xf08a2c, 0x7e8aa0], [
  [1, 0, 1, 2, 'fR tG'], // front wheel
  [1, 0, -1, 2, 'bR tG'], // far wheel
  [1, 0, 0, 1, 'lY'], // carriage
  [2, 0, 0, 1, 'fG bR rY'],
  [0, 1, 0, 0, 'fR bY lG'], // breech
  [1, 1, 0, 0, 'fR bR tY'], // barrel
  [2, 1, 0, 0, 'fG bG tR'],
  [3, 1, 0, 4, 'fY bG rR tY'], // muzzle
  [0, 2, 0, 3, 'fR lG tG'], // fuse
]);
/** COIL: a three-plate base, a two-deep spring stack (copper / dark windings) and two silver terminal arms. Four colours,
 *  screws on the sides the stack hides: the middle one. */
export const COIL: ObjectDef = make('coil', 'COIL', [0x34416b, 0xe0883a, 0x9a5424, 0xc4ccd8], [
  [0, 0, 0, 0, 'fU lG tY bU'], // base
  [1, 0, 0, 0, 'fU bG tR'],
  [2, 0, 0, 0, 'fU rG tY'],
  [1, 1, 1, 1, 'fU lY rY'], // spring windings, front / back pairs
  [1, 1, 0, 2, 'bU lG rR'],
  [1, 2, 1, 2, 'fU lG rR'],
  [1, 2, 0, 1, 'bU lG rY'],
  [1, 3, 1, 1, 'fU lY rR tG'],
  [1, 3, 0, 2, 'bU tY'],
  [0, 3, 0, 3, 'fY bR tG lU'], // terminals
  [2, 3, 0, 3, 'fY bR tG rU'],
]);
/** BELL: two feet and a clapper, two posts and a beam (the frame), and the bell hung inside: a wide skirt two blocks deep
 *  under a narrow crown. Screws sit on faces the frame and skirt cover, so they come off in order: the hard one. */
export const BELL: ObjectDef = make('bell', 'BELL', [0x8a5a33, 0xe8b42e, 0x4a4452, 0xb8832a], [
  [0, 0, 0, 0, 'fR lG'], // feet and clapper
  [2, 0, 0, 2, 'fY bR tU'],
  [4, 0, 0, 0, 'fR rG'],
  [0, 1, 0, 0, 'fG lU'], // posts
  [4, 1, 0, 0, 'fG rU'],
  [0, 2, 0, 0, 'fU lG'],
  [4, 2, 0, 0, 'fU rG'],
  [1, 1, 0, 1, 'bY tG'], // the skirt, back row
  [2, 1, 0, 1, 'bY'],
  [3, 1, 0, 1, 'bY tG'],
  [1, 1, 1, 1, 'fY lY tR'], // the skirt, front row
  [2, 1, 1, 1, 'fY tY'],
  [3, 1, 1, 1, 'fY rY tR'],
  [2, 2, 0, 1, 'fG bU lR rY'], // crown
  [0, 3, 0, 3, 'fR lU tY'], // beam
  [1, 3, 0, 3, 'fG tY'],
  [2, 3, 0, 3, 'fU tG'],
  [3, 3, 0, 3, 'fG tY bR'],
  [4, 3, 0, 3, 'fR rU tY'],
]);
export const YARD_OBJECTS: Record<YardUnit, ObjectDef> = { cannon: CANNON, coil: COIL, bell: BELL };

// ---- which object: a picker in EVENTS, else a rotation by day ----
const PICK_KEY = 'omm_qa_yard_unit';
export const dayUnit = (now = Date.now()): YardUnit => YARD_UNITS[Math.floor(now / 86400000) % YARD_UNITS.length];
export function pickedUnit(now = Date.now()): YardUnit {
  try {
    const v = localStorage.getItem(PICK_KEY);
    if (v && (YARD_UNITS as string[]).includes(v)) return v as YardUnit;
  } catch {
    /* no storage: rotation */
  }
  return dayUnit(now);
}
export function pickUnit(u: YardUnit) {
  try {
    localStorage.setItem(PICK_KEY, u);
  } catch {
    /* no storage */
  }
}
export const yardObjectOf = (u: YardUnit = pickedUnit()) => YARD_OBJECTS[u];

