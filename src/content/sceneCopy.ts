import type { Family, ItemKind } from '../core/types';
import { liveCopy } from './perks';

// Static text tables shown by GameScene (moved out of GameScene.ts; GameScene re-exposes them as statics).

// Script from ChatGPT round 8 (6 hands-on steps on the real start board, idx = row*5+col).
export const TUTORIAL: { kind: 'merge' | 'mismatch'; pair: [number, number]; fam: Family; text: string; after?: string; focus?: 'target' | 'chain' | 'row' }[] = [
  { kind: 'merge', pair: [21, 22], fam: 'cannon', text: 'Same machine. Same number.\nDrag onto its match.', after: 'It got stronger and FIRED!\nNow smash the can!', focus: 'target' },
  { kind: 'merge', pair: [6, 16], fam: 'coil', text: 'Merge to fire. Coils zap nearby\nmachines into a CHAIN.', after: 'That was a CHAIN: one merge\nset off its neighbours!', focus: 'chain' },
  { kind: 'merge', pair: [8, 17], fam: 'bell', text: 'Bells wake machines across\ntheir whole row. Watch the cannon!', after: 'The bell rang its row\nand woke that cannon!', focus: 'row' },
  { kind: 'mismatch', pair: [5, 22], fam: 'cannon', text: 'Different numbers can NOT merge.\nTry dragging this 1 onto the 2.' },
  { kind: 'merge', pair: [5, 19], fam: 'cannon', text: 'Cannons fire alone, slowly.\nIn a chain they hit much harder!' },
  { kind: 'merge', pair: [19, 22], fam: 'cannon', text: 'Two 2s make a 3! Bigger number,\nbigger blast.', after: 'Now clear levels on the road:\none monster, one clock. LET\'S PLAY!' },
];

export const ITEM_COPY: Record<ItemKind, { name: string; how: string; wrong: string }> = {
  overcharge: { name: 'OVERCHARGE', how: 'Put this on a shooter.\nIts next two chain shots hit DOUBLE.', wrong: 'Use it on a Cannon or Rocket' },
  spark: { name: 'SPARK', how: 'Put this on a shooter.\nThe next 2 times it fires in a chain,\nit wakes the machines next to it.', wrong: 'Use it on a Cannon or Rocket' },
  corner: { name: 'CORNER KIT', how: 'Put this on a Bell.\nThe next 2 times it rings, it also wakes\nits diagonal neighbours.', wrong: 'Use it on a Bell' },
};

/** Face patches (face_<target>_<hit|angry|dizzy>) cover the sprite's own face; offsets are fractions of the sprite box. */
// calibrated against ChatGPT's sprites (fractions of the 512px target box; patch boxes are 256px with ~0.83 fill)
export const FACE = [
  { x: 0.02, y: 0.0, w: 0.58 },
  { x: -0.07, y: -0.075, w: 0.59 },
  { x: 0.235, y: -0.255, w: 0.5 },
];

/** Discovery challenges (ChatGPT's meta plan): one toy unlocks the next. */
export const CHALLENGES: { toy: Family; text: string }[] = [
  { toy: 'magnet', text: 'Wake 3 cannons in one chain' },
  { toy: 'battery', text: 'Merge a gadget your Magnet pulled' },
  { toy: 'fan', text: 'Fire a Battery-primed cannon' },
];

/** Chapter collection identity (r17): the medal portrait for chapters 1-6. */
export const CHAPTER_MONSTER = [0, 1, 3, 4, 5, 2];

type GuideRow = { key: string; title: string; role: string; text: string; tryThis: string; unlock: number };
const GUIDE_TODAY: GuideRow[] = [
  { key: 'chain', title: 'HOW CHAINS WORK', role: 'THE RULE', text: 'Merge two SAME machines with the SAME number. The new machine fires and wakes OTHER machines in its reach. Every machine that fires hits the monster.', tryThis: 'Bigger chain = bigger hit. Build machines next to each other.', unlock: 0 },
  { key: 'cannon', title: 'CANNON', role: 'SHOOTER', text: 'Shoots by itself, weakly. When a merge or a chain wakes it, it fires a FULL shot. It wakes nobody.', tryThis: 'Park Cannons where Coils and Bells can reach them.', unlock: 0 },
  { key: 'coil', title: 'COIL', role: 'RELAY', text: 'Zaps up to 2 cells away: up, down, left, right. Wakes every OTHER kind of machine it reaches.', tryThis: 'Put Cannons inside its cross.', unlock: 0 },
  { key: 'bell', title: 'BELL', role: 'RELAY', text: 'Rings its whole row. Wakes every OTHER kind of machine in that row.', tryThis: 'Fill its row with Cannons and Coils.', unlock: 0 },
  { key: 'rocket', title: 'ROCKET', role: 'SHOOTER', text: 'Never shoots by itself. When a chain wakes it, it fires a BIG shot: 1.3x a Cannon.', tryThis: 'Pack Rockets into your longest chains.', unlock: 6 },
  { key: 'magnet', title: 'MAGNET', role: 'MOVER', text: 'When it fires, it pulls one machine along its line into the empty cell next to it.', tryThis: 'Use it to bring a pair together.', unlock: 12 },
  { key: 'fan', title: 'FAN', role: 'MOVER', text: 'When it fires, it blows the first machine next to it one cell further away (if that cell is empty).', tryThis: 'Use it to push a machine into a relay\'s reach.', unlock: 23 },
  { key: 'mortar', title: 'MORTAR', role: 'SHOOTER', text: 'Never shoots by itself. Woken DEEP in a chain it hits harder: x0.9 at the first link, up to x1.65 six links in.', tryThis: 'Put it at the far end of your longest chain.', unlock: 999 },
  { key: 'arc_welder', title: 'ARC WELDER', role: 'SHOOTER', text: 'Woken by a chain it fires a lighter shot (x0.75) and arcs into the strongest machine touching it, waking it too.', tryThis: 'Surround it with machines it can wake.', unlock: 999 },
  { key: 'horn', title: 'HORN', role: 'RELAY', text: 'Blasts its whole column: wakes every OTHER kind of machine above and below it.', tryThis: 'Stack shooters above and below it.', unlock: 999 },
  { key: 'fuse_box', title: 'FUSE BOX', role: 'RELAY', text: 'Sparks its four diagonal corners: wakes the OTHER kinds of machines there.', tryThis: 'Build a checkerboard around it.', unlock: 999 },
  { key: 'amplifier', title: 'AMPLIFIER', role: 'SUPPORT', text: 'When it fires it marks the strongest shooter or relay touching it. That machine\'s next hit is x1.3 (the mark waits until it fires).', tryThis: 'Park it beside your biggest machine.', unlock: 999 },
  { key: 'signal_beacon', title: 'SIGNAL BEACON', role: 'SUPPORT', text: 'When it fires it marks the nearest shooter AND the nearest relay anywhere on the board: their next hits are x1.15.', tryThis: 'Fire it early in a chain.', unlock: 999 },
  { key: 'items', title: 'POWER-UPS', role: 'SPECIAL', text: 'Get halfway through a level and a power-up capsule drops into your tray. Drag it onto a machine: OVERCHARGE (shooter: next 2 chain shots x2), SPARK (shooter: wakes its neighbours, 2 times), CORNER KIT (Bell: wakes its diagonals, 2 times).', tryThis: 'A machine keeps its power-up when you merge it.', unlock: 13 },
  { key: 'battery', title: 'BATTERY', role: 'SUPPORT', text: 'Charges a shooter next to it (Cannon, Rocket, Mortar, Arc Welder): that shooter\'s next chain shot hits x1.5.', tryThis: 'Park it beside your biggest shooter.', unlock: 17 },
  // clarity pass 1 legend: every mark drawn with the board's own code (see marksLegend)
  { key: 'marks', title: 'BOARD MARKS', role: 'SPECIAL', text: '', tryThis: 'Tap any machine to see its marks and what a merge does with them.', unlock: 0 },
  // clarity pass 3: what empty cells, the HP bar, the clock ring and the bolt meter show
  { key: 'marks2', title: 'CELLS & METERS', role: 'SPECIAL', text: '', tryThis: 'Tap a marked empty cell or a junk block to see what it does.', unlock: 0 },
  { key: 'overdrive', title: 'OVERDRIVE', role: 'SPECIAL', text: 'Merges fill the bolt meter at the top (in some modes, chain links do). Full: OVERDRIVE! For a few seconds your Cannons fire super fast, every chain hits x1.5 and the board glows orange. Then the meter starts again.', tryThis: 'When the meter is one short, save a big merge for it.', unlock: 0 },
];
/** Guide pages; unit pages follow the QA UNITS experiment (perks.ts unitsCopy). */
export const GUIDE: GuideRow[] = GUIDE_TODAY.map((g) => liveCopy(g.key, g));
