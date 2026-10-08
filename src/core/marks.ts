// Clarity pass 1 (owner: "I see a purple thing on a unit and idk what happens after I merge on it"): plain-language
// copy for every state a part on the board can carry. Pure: the scene draws it (NEW tips, inspect card, guide legend).
import { COLS, TUNING } from '../content/tuning';
import { ATTACK_COPY, castAttack, type BossAttack, type BossTarget } from './boss';
import { canMerge, capOf, drop, odNeeded, type GameEvent, type GameState } from './game';
import { PIANO_LOCK_S, type RemixKind } from './remix';
import type { Gadget, Grid, ItemKind } from './types';

// Clarity pass 2: ONE COLOUR PER MEANING. The single source for every on-board mark's hue, icon and one-line text;
// the board, the inspect card, the guide legend and the merge-preview chips all read it. No two meanings share a hue
// (tests/marks.test.ts checks the spacing). Machine family colours are identity, not marks, and live in perks.ts.
export type Meaning = 'merge' | 'boost' | 'charge' | 'powerup' | 'max' | 'attack' | 'locked' | 'overdrive' | 'parts' | 'kickback';
export type MarkIcon = 'ring' | 'arrow' | 'bolt' | 'badge' | 'crown' | 'attack' | 'lock' | 'glow' | 'part' | 'drop';
export const PALETTE: Record<Meaning, { label: string; hue: number; icon: MarkIcon; text: string; now?: string }> = {
  merge: { label: 'YOUR MERGE', hue: 0xffffff, icon: 'ring', text: 'White = your move: the part you hold, the parts it can merge with, and what that merge will fire.' },
  boost: { label: 'BOOSTED', hue: 0xd2b4ff, icon: 'arrow', text: 'Amplifier (x1.3) or Beacon (x1.15): its next hit is stronger. Used when it fires or merges.' },
  charge: { label: 'CHARGED', hue: 0x9be05a, icon: 'bolt', text: "From a Battery: this shooter's next chain shot is x1.5. Used when it fires or merges." },
  powerup: { label: 'POWER-UP', hue: 0xff4fd8, icon: 'badge', text: 'From your tray. The dots are uses left. It moves to the new machine when you merge.' },
  max: { label: 'MAX', hue: 0xffcf33, icon: 'crown', text: "Top rank: it can't merge any higher. In levels, two MAX parts squash into one." },
  attack: { label: 'ATTACK', hue: 0xff684a, icon: 'attack', text: 'Dashed: a boss attack lands here when the countdown ends. Move or merge the machine first.', now: 'Filled: an attack is on now. Each one has its own tint and icon: tap the machine to read it.' },
  locked: { label: 'LOCKED', hue: 0x4f6d8f, icon: 'lock', text: 'Locked or clamped: it cannot move or merge until the timer runs out.' },
  overdrive: { label: 'OVERDRIVE', hue: 0xff7200, icon: 'glow', text: 'Merges fill the Overdrive meter; full = Cannons fire fast and chains hit x1.5 for a few seconds.' },
  parts: { label: 'PARTS', hue: 0x3fd9a0, icon: 'part', text: 'New parts this merge earns; they drop in after the chain.' },
  kickback: { label: 'KICKBACK', hue: 0x6f6cff, icon: 'drop', text: 'A big chain or a broken panel shakes a loose part out: it lands in the ring. Double ring: it lands on its match and merges.' },
};
/** Board cells and HUD meters (guide page 2): plain copy for things that are not a mark on a part. */
export const CELL_COPY = {
  junk: { label: 'JUNK BLOCK', text: 'Boss junk: no part can go here. Fire a machine next to it to clear it, or wait it out.' },
  blocked: { label: 'BLOCKED', text: 'Closed for the whole level: no part can go here.' },
  divider: { label: 'DIVIDER', text: 'A boss wall: relays cannot wake machines on the other side of it.' },
  hpTicks: { label: 'HP BAR MARKS', text: 'Each 25% a panel breaks off: a loose part (KICKBACK) or a power-up. Boss: 2 armor marks; attacks get stronger past each.' },
  starTicks: { label: 'CLOCK TICKS', text: 'Gold ticks = star times. Win before a tick passes to keep that star; faded = missed.' },
} as const;
/** Boss attack tints (identity of each attack under the shared ATTACK frame + its icon). Kept off every other meaning's hue. */
export const ATTACK_TINT: Record<BossAttack, number> = {
  clamp: PALETTE.locked.hue, frost: 0x3b8fd9, suction: 0x2e9e4a, hot: 0xe84a2c, rest: 0x34477a, split: 0x6e5a48, bomb: 0xc0392b, conveyor: 0x8a9a2f,
  mirror: 0x1fa5a0, blocks: 0x7a6a5a, pull: 0x2f7fa8, bounce: 0x38a03a, slick: 0x1f8fa8, portals: 0x2ecbe6, tow: 0x8a7656, ransom: 0xe0507a,
};
/** Hue in degrees and HSL saturation / lightness (0..1) of a 0xRRGGBB colour. */
export function hsl(c: number): { h: number; s: number; l: number } {
  const r = ((c >> 16) & 255) / 255, g = ((c >> 8) & 255) / 255, b = (c & 255) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn, l = (mx + mn) / 2;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  const h = d === 0 ? 0 : mx === r ? 60 * (((g - b) / d + 6) % 6) : mx === g ? 60 * ((b - r) / d + 2) : 60 * ((r - g) / d + 4);
  return { h, s, l };
}
export const hex = (c: number) => `#${c.toString(16).padStart(6, '0')}`;

export type MarkKey = 'amp' | 'prime' | 'item' | 'cap' | 'boss' | 'remix' | 'lock' | 'junk' | 'blocked' | 'kick';
/** Which meaning (colour) each inspect-card mark kind shows. Remix warnings are opponent attacks too. */
export const MARK_MEANING: Record<MarkKey, Meaning> = { amp: 'boost', prime: 'charge', item: 'powerup', cap: 'max', boss: 'attack', remix: 'attack', lock: 'locked', junk: 'attack', blocked: 'locked', kick: 'kickback' };
/** Remix warnings by kind (opponents + level modifiers): inspect label and what happens to the marked cell. */
export const REMIX_COPY: Record<RemixKind, { label: string; text: (left: string, lockS: number, full: boolean) => string }> = {
  vacuum: { label: 'SUCTION', text: (l) => `In ${l}s this part gets sucked up. Move or merge it away to save it.` },
  twins: { label: 'SHOVE', text: (l) => `In ${l}s this part gets shoved aside.` },
  piano: { label: 'ROW LOCK', text: (l, n, full) => `In ${l}s this row locks for ${n}s: ${full ? 'this part cannot move or merge' : 'no part can land here'}.` },
  jam: { label: 'JAM', text: (l, n) => `In ${l}s, if this cell is still empty, it jams for ${n}s: no part can land here.` },
  gaps: { label: 'ROW GAPS', text: (l, n) => `In ${l}s, if this cell is still empty, it is blocked for ${n}s: no part can land here.` },
};
export interface MarkLine {
  key: MarkKey;
  /** Short caps label, e.g. BOOSTED. */
  label: string;
  /** One plain sentence. */
  text: string;
  /** Boss / remix attack (icon + tint) when key is 'boss' / 'remix'. */
  attack?: BossAttack | string;
  item?: ItemKind;
}

export const fmtMult = (m: number) => `x${+m.toFixed(2)}`;
/** Battery charge on a shooter: same formula as cascade.ts (level +0.03, L3 High Voltage +0.20). */
export const primeMult = (s: Pick<GameState, 'unitLevel'>) => {
  const lvl = s.unitLevel?.battery ?? 1;
  return TUNING.batteryBonus + 0.03 * (lvl - 1) + (lvl >= 3 ? 0.2 : 0);
};

export const ITEM_MARK: Record<ItemKind, { name: string; does: (n: number) => string }> = {
  overcharge: { name: 'OVERCHARGE', does: (n) => `its next ${n} chain shot${n === 1 ? '' : 's'} hit x2.` },
  spark: { name: 'SPARK', does: (n) => `the next ${n} time${n === 1 ? '' : 's'} it fires, it also wakes its neighbours.` },
  corner: { name: 'CORNER KIT', does: (n) => `the next ${n} time${n === 1 ? '' : 's'} this Bell rings, it also wakes its diagonals.` },
};

/** First-time NEW tips, one per mark kind (ids live in meta.tips). Returns the first unseen mark on the board. */
export function markTip(grid: Grid, seen: Record<string, boolean>, s: Pick<GameState, 'unitLevel'> = {}): { id: string; idx: number; text: string } | null {
  const find = (p: (g: Gadget) => boolean) => grid.findIndex((g) => !!g && p(g));
  const tips: { id: string; idx: number; text: (g: Gadget) => string }[] = [
    { id: 'mark_amp', idx: find((g) => !!g.amp), text: (g) => `${PALETTE.boost.label}: this machine's next hit is ${fmtMult(g.amp!)}.\nMerge or chain it to use the boost.` },
    { id: 'mark_prime', idx: find((g) => !!g.primed), text: () => `${PALETTE.charge.label}: this shooter's next chain shot is ${fmtMult(primeMult(s))}.\nMerge or chain it to use the charge.` },
    { id: 'mark_item', idx: find((g) => !!g.item), text: (g) => `POWER-UP ${ITEM_MARK[g.item!.kind].name}: ${ITEM_MARK[g.item!.kind].does(g.item!.charges)}\nThe dots show uses left.` },
  ];
  for (const t of tips) if (t.idx >= 0 && !seen[t.id]) return { id: t.id, idx: t.idx, text: t.text(grid[t.idx]!) };
  return null;
}

/** Board cells a boss target covers (ids are followed to wherever those machines are now). */
export function bossTargetCells(grid: Grid, t: BossTarget): number[] {
  if (t.ids) return t.ids.map((id) => grid.findIndex((g) => g?.id === id)).filter((i) => i >= 0);
  if (t.cells) return t.cells;
  if (t.row !== undefined) return [0, 1, 2, 3, 4].map((c) => t.row! * COLS + c);
  if (t.col !== undefined) return grid.map((_, i) => i).filter((i) => i % COLS === t.col);
  // split: the cells on both sides of the divider (it runs between column b and b+1)
  if (t.boundary !== undefined) return grid.map((_, i) => i).filter((i) => i % COLS === t.boundary || i % COLS === t.boundary! + 1);
  return [];
}

const secs = (x: number) => Math.max(0, x).toFixed(1);

/** Inspect card MARKS row: every state on the part (or empty cell) in `idx`, plus what a merge right now does with them. */
export function inspectMarks(s: GameState, idx: number): { marks: MarkLine[]; mergeNow: string | null } {
  const g = s.grid[idx];
  const marks: MarkLine[] = [];
  const now: string[] = [];
  if (!g) {
    // empty cells explain themselves too: closed corners, junk blocks, falling loose parts, boss / remix targets
    if (s.masked?.includes(idx)) marks.push({ key: 'blocked', ...CELL_COPY.blocked });
    const junk = s.boss?.blocks?.find((x) => x.cell === idx);
    if (junk) marks.push({ key: 'junk', label: CELL_COPY.junk.label, attack: 'blocks', text: `${CELL_COPY.junk.text} (${secs(junk.until - s.elapsed)}s)` });
  }
  for (const d of s.drops ?? []) {
    if (!d.plan) continue;
    if (d.plan.land === idx && !g) marks.push({ key: 'kick', label: PALETTE.kickback.label, text: d.fuse ? `In ${secs(d.t)}s a loose part lands here and merges into the matching machine beside it.` : `In ${secs(d.t)}s a loose part from the monster lands here, next to its match: merge them.` });
    else if (d.fuse && d.plan.idx === idx && g) marks.push({ key: 'kick', label: PALETTE.kickback.label, text: `In ${secs(d.t)}s a matching loose part lands on this machine: a free merge and chain.` });
  }
  if (g?.amp) {
    marks.push({ key: 'amp', label: PALETTE.boost.label, text: `Its next hit is ${fmtMult(g.amp)} (from an Amplifier or Signal Beacon).` });
    now.push(`${fmtMult(g.amp)} boost used on this merge`);
  }
  if (g?.primed) {
    const m = fmtMult(primeMult(s));
    marks.push({ key: 'prime', label: PALETTE.charge.label, text: `Its next chain shot is ${m} (from a Battery).` });
    now.push(`${m} charge used on this merge`);
  }
  if (g?.item) {
    const it = ITEM_MARK[g.item.kind];
    marks.push({ key: 'item', label: it.name, text: `Power-up: ${it.does(g.item.charges)}`, item: g.item.kind });
    now.push(`${it.name} goes to the new machine and uses 1 of ${g.item.charges}`);
  }
  const cap = g ? capOf(s, g.family) : Infinity;
  if (g && g.rank >= cap) {
    const compact = canMerge(g, { ...g, id: -1 }, s);
    marks.push({ key: 'cap', label: PALETTE.max.label, text: compact ? `Rank ${cap} is the top: two of them merge into one rank ${cap}.` : `Rank ${cap} is the top: it can't merge any higher.` });
    if (!compact) now.push("it can't merge, it is already the top rank");
  }
  const b = s.boss;
  for (const [t, warn] of [[b?.active, false], [b?.pending, true]] as const) {
    if (!b || !t) continue;
    const cells = bossTargetCells(s.grid, t);
    if (!cells.includes(idx)) continue;
    const atk = castAttack(b, t);
    const c = ATTACK_COPY[atk];
    const left = secs(warn ? b.pending!.deadline - s.elapsed : b.active!.until - s.elapsed);
    // the second cell of a pull / bounce is where the machine lands; a split cell sits beside the divider
    const why = (atk === 'pull' || atk === 'bounce') && t.cells?.[1] === idx ? 'the marked machine lands in this cell' : atk === 'split' ? 'relay links cannot cross the divider beside this cell' : c.why;
    marks.push({ key: 'boss', label: c.what, attack: atk, text: warn ? `In ${left}s: ${why}.` : `Now, ${left}s left: ${why}.` });
    if (!g) continue;
    if (atk === 'tow' && !warn) now.push('the tow bar lets go');
    if (atk === 'ransom' && warn) now.push('the ransom mark moves to the new machine, and it wakes (1 of 2)');
    if (atk === 'clamp' && !warn) now.push('blocked: a clamped machine cannot move or merge');
  }
  const r = s.remix;
  if (r?.pending?.cells.includes(idx)) {
    const rc = REMIX_COPY[r.kind];
    marks.push({ key: 'remix', label: rc.label, attack: r.kind, text: rc.text(secs(r.pending.deadline - s.elapsed), r.lockS ?? PIANO_LOCK_S, !!g) });
  }
  if (r?.lock?.cells.includes(idx)) {
    const left = secs(r.lock.until - s.elapsed);
    marks.push({ key: 'lock', label: PALETTE.locked.label, attack: r.kind, text: g ? `Locked for ${left}s: it cannot move or merge.` : `Blocked for ${left}s: no part can land here.` });
  }
  const mergeNow = !g ? null : now.length ? `If you merge now: ${now.join('; ')}.` : marks.length ? 'If you merge now: nothing above is used up.' : null;
  return { marks, mergeNow };
}

/** One merge-preview chip: `text` big in the meaning's colour, then `sub`; `struck` = that mark is USED UP by this merge. */
export interface PreviewChip {
  meaning: Meaning;
  text: string;
  sub?: string;
  struck?: boolean;
}

/**
 * Clarity pass 2 merge preview (shown while a held part hovers a match): what THIS merge does, in short words.
 * Plays the real `drop` on a throwaway copy of the state, so every chip is exactly what the merge would do
 * (multipliers used, marks used up, marks placed, parts earned, Overdrive charge). Never mutates `s`.
 */
export function mergePreview(s: GameState, from: number, to: number): { count: number; chips: PreviewChip[] } | null {
  const a = s.grid[from], b = s.grid[to];
  if (!a || !b || from === to || !canMerge(a, b, s)) return null;
  const c = JSON.parse(JSON.stringify(s)) as GameState;
  const r = drop(c, from, to, a.id);
  const ev = r.events.find((e): e is Extract<GameEvent, { type: 'cascade' }> => e.type === 'cascade' && !e.kickback);
  if (!r.ok || !ev) return null;
  const res = ev.result;
  const merged = s.nextId; // the merged part takes the next id; marks on a and b move onto it
  const pre = new Map(s.grid.filter((g): g is Gadget => !!g).map((g) => [g.id, g]));
  const before = (id: number) => (id === merged ? { amp: Math.max(a.amp ?? 0, b.amp ?? 0) || undefined, primed: !!(a.primed || b.primed), item: b.item ?? a.item } : pre.get(id));
  const chips: PreviewChip[] = [{ meaning: 'merge', text: `CHAIN ${res.count}` }];
  const placed = new Map((res.amps ?? []).map((m) => [m.id, m.mult]));
  for (const id of res.ampsUsed ?? []) {
    const had = before(id)?.amp;
    chips.push({ meaning: 'boost', text: fmtMult(Math.max(had ?? 0, placed.get(id) ?? 0)), sub: 'BOOST', struck: !!had });
  }
  for (const id of res.discharged) chips.push({ meaning: 'charge', text: fmtMult(primeMult(s)), sub: 'CHARGE', struck: !!before(id)?.primed });
  for (const id of res.itemUsed ?? []) {
    const it = before(id)?.item;
    if (!it) continue;
    const left = it.charges - 1, name = ITEM_MARK[it.kind].name;
    chips.push({ meaning: 'powerup', text: it.kind === 'overcharge' ? 'x2' : '+WAKE', sub: left > 0 ? `${name} ${left} LEFT` : name, struck: left <= 0 });
  }
  // two marks of a kind on the merging pair: only one moves onto the new part, the other is lost
  if (a.amp && b.amp) chips.push({ meaning: 'boost', text: '', sub: 'BOOST', struck: true });
  if (a.primed && b.primed) chips.push({ meaning: 'charge', text: '', sub: 'CHARGE', struck: true });
  if (a.item && b.item) chips.push({ meaning: 'powerup', text: '', sub: ITEM_MARK[a.item.kind].name, struck: true });
  const newAmps = (res.amps ?? []).filter((m) => !m.spent).length;
  if (newAmps) chips.push({ meaning: 'boost', text: `+${newAmps}`, sub: 'BOOST' });
  const newPrimes = res.primes.filter((id) => !res.discharged.includes(id)).length;
  if (newPrimes) chips.push({ meaning: 'charge', text: `+${newPrimes}`, sub: 'CHARGE' });
  const parts = (c.owed ?? 0) - (s.owed ?? 0);
  if (parts > 0) chips.push({ meaning: 'parts', text: `+${parts}`, sub: parts === 1 ? 'PART' : 'PARTS' });
  if (ev.overdriveStart) chips.push({ meaning: 'overdrive', text: 'OVERDRIVE!' });
  else if (c.odCharge > s.odCharge) chips.push({ meaning: 'overdrive', text: `+${c.odCharge - s.odCharge}`, sub: `OVERDRIVE ${c.odCharge}/${odNeeded(c)}` });
  // identical chips fold into one ("BOOST x2") so a big chain stays a short row
  const out: (PreviewChip & { n: number })[] = [];
  for (const ch of chips) {
    const same = out.find((o) => o.meaning === ch.meaning && o.text === ch.text && o.sub === ch.sub && !!o.struck === !!ch.struck);
    if (same) same.n++;
    else out.push({ ...ch, n: 1 });
  }
  return { count: res.count, chips: out.map(({ n, ...ch }) => (n > 1 ? { ...ch, sub: `${ch.sub ?? ''} ×${n}`.trim() } : ch)) };
}

/** Cheap fingerprint of everything mergePreview reads that can change while a held part hovers one match (passive
 *  fire using a boost, Overdrive charge / end, boss and remix moves, parts owed): the scene redraws the chips when it changes. */
export function previewSig(s: GameState): string {
  const cells = s.grid.map((g) => (g ? `${g.id}.${g.rank}.${g.amp ?? ''}.${g.primed ? 1 : ''}.${g.item ? g.item.charges : ''}` : '')).join(',');
  const b = s.boss, r = s.remix;
  return `${cells}|${s.odCharge}.${s.odLeft > 0 ? 1 : 0}.${s.owed ?? 0}.${s.perks.length}|${b?.pending?.deadline ?? ''}.${b?.active?.until ?? ''}.${b?.blocks?.length ?? 0}|${r?.lock?.until ?? ''}`;
}

// Screw Yard 2.0 (t-98293568): the same rule for the yard. Every marker the yard draws has a label, one sentence and
// one hue per meaning; the first-time lessons are plain copy too (ScrewScene shows them in the coach bubble).
export type YardMarkKey = 'fits' | 'hanging' | 'spare' | 'drill';
export const YARD_MARKS: Record<YardMarkKey, { label: string; text: string; hue: number }> = {
  fits: { label: 'TAP', text: 'This dock screw matches the open box: tap it to send it in.', hue: 0x8ef08a },
  hanging: { label: 'HANGING', text: 'Held by one screw: the plate swings down and can cover or free screws below.', hue: 0xffcf33 },
  spare: { label: '+WELL', text: 'A spare dock slot: a +Well booster opens it for this yard.', hue: 0x9aa4ad },
  drill: { label: 'DRILL', text: 'Drill ready: tap any screw, even a covered one, to take it out.', hue: 0xff8a1f },
};
export const BOOSTER_COPY: Record<'drill' | 'magnet' | 'well', { name: string; text: string }> = {
  drill: { name: 'DRILL', text: 'Take out any one screw, even a covered one.' },
  magnet: { name: 'MAGNET', text: 'Fill the open box from the dock and the pile.' },
  well: { name: '+WELL', text: 'One extra dock slot for this yard.' },
};
/** First-time yard lessons (ids live in meta.tips). Yards 1-3 teach box, dock and swing; boosters when first owned. */
export const YARD_TIPS = {
  yard_box: 'Take out a screw that nothing covers.\nIts colour matches the BOX? It goes in. 3 fill a box.',
  yard_next: 'NEXT shows the two boxes coming after this one.\nFree their screws early!',
  yard_dock: 'No box for that colour yet: it waits in the DOCK.\nNo slot left = yard lost. Fewer in the dock = more stars.',
  yard_dockfit: 'Its box is here! TAP the dock screw to send it in.\nDock screws never jump in by themselves.',
  yard_swing: 'A plate held by ONE screw swings down.\nIt can cover screws below, or uncover them.',
  yard_boosters: 'BOOSTERS (earned, never bought):\nDRILL any screw · MAGNET fills the box · +WELL one more dock slot.',
} as const;
export type YardTipId = keyof typeof YARD_TIPS;
