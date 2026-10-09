// Live "why it hits" formula (rival-games study #3, owner: "I don't understand what things do"). While a held part
// hovers a match the lane shows e.g. "6 MACHINES 450 × COMBO 1.4 × BOOST 1.3 = 840"; after the drop the same
// formula counts up link by link. Pure: plays the real `drop` on a throwaway copy (like mergePreview), so every
// number is exactly what the merge deals. Never mutates the state passed in.
import { TUNING } from '../content/tuning';
import { a2Scale, canMerge, drop, odByChain, sandwichFor, shieldMult, type GameEvent, type GameState } from './game';
import { ITEM_MARK, PALETTE, primeMult, type Meaning } from './marks';
import { isShooter, type CascadeResult, type Family, type Gadget, type JobKey } from './types';

export type TermKey = 'boost' | 'charge' | 'overcharge' | 'combo' | 'overdrive' | 'chainsize' | 'rushed' | 'shield' | JobKey;

/** TUNING.rosterB job multipliers as formula words (Mortar DEPTH shows its own x, e.g. MORTAR 1.48). */
export const JOB_TERMS: Record<JobKey, { label: string; hue: number }> = {
  mortar: { label: 'MORTAR', hue: 0xb8c46a },
  burst: { label: 'BURST', hue: 0xff8a3c },
  kick: { label: 'HORN KICK', hue: 0xe8b060 },
  spread: { label: 'SPREAD', hue: 0x7a9aff },
  prime: { label: 'PRIME', hue: 0x7ccf2e },
  go: { label: 'GO', hue: 0xf05030 },
};

/** One factor of the hit, in the order it applies. `usedUp`: a mark this merge spends (named in its PALETTE colour). */
export interface FormulaTerm {
  key: TermKey;
  label: string;
  /** Effective multiplier on the whole hit (a boost on one machine of six lifts the total by less than its x1.3). */
  mult: number;
  hue: number;
  meaning?: Meaning;
  usedUp?: boolean;
  /** How many marks of this kind the merge spends (BOOST ×2). */
  n?: number;
}

export interface HitFormula {
  /** Machines that fire (the chain size). */
  machines: number;
  /** Sum of their plain hits, before any multiplier below. */
  base: number;
  /** Plain hit of each activation, in the cascade's activation order (the post-drop ribbon counts these up). */
  links: number[];
  /** Family of each link and its own hit after its job multiplier (roster B: the ribbon names each machine's number). */
  linkFam?: Family[];
  linkHit?: number[];
  terms: FormulaTerm[];
  /** base × every term, before the MAX HIT cap. */
  raw: number;
  /** MAX HIT cap for this level when this merge reaches it, else null. */
  cap: number | null;
  /** The damage the merge really deals (equals the model's player damage for this drop). */
  damage: number;
  /** The cascade the formula explains (same as the real drop's). */
  result: CascadeResult;
}

/** Neutral grey for factors that are not a board mark (experimental spam rules). */
export const NEUTRAL_HUE = 0xb8a8b0;
const SHIELD_HUE = 0x8fb4e0;

/** "1.4", "1.25", "0.75": a multiplier without its x. */
export const fmtFactor = (m: number) => `${+m.toFixed(2)}`;

/** The full formula for merging `from` onto `to`, or null when that is not a merge. */
export function hitFormula(s: GameState, from: number, to: number): HitFormula | null {
  const a = s.grid[from], b = s.grid[to];
  if (!a || !b || from === to || !canMerge(a, b, s)) return null;
  const c = JSON.parse(JSON.stringify(s)) as GameState;
  const r = drop(c, from, to, a.id);
  const ev = r.events.find((e): e is Extract<GameEvent, { type: 'cascade' }> => e.type === 'cascade' && !e.kickback);
  if (!r.ok || !ev) return null;
  const res = ev.result;
  // marks as they stood before the cascade: the merged part (next id) carries the pair's marks
  // (a TUNING.mergeRule sandwich folds the absorbed parts' marks in too, as merge() does)
  const merged = s.nextId;
  const pre = new Map(s.grid.filter((g): g is Gadget => !!g).map((g) => [g.id, g]));
  const eaten = (sandwichFor(s, from, to)?.cells ?? []).map((i) => s.grid[i]!).filter(Boolean);
  const parts = [a, b, ...eaten];
  const before = (id: number): Pick<Gadget, 'amp' | 'primed' | 'item'> | undefined =>
    id === merged
      ? { amp: Math.max(...parts.map((p) => p.amp ?? 0)) || undefined, primed: parts.some((p) => p.primed), item: b.item ?? a.item ?? eaten.find((p) => p.item)?.item }
      : pre.get(id);
  const placed = new Map<number, number>();
  for (const m of res.amps ?? []) placed.set(m.id, Math.max(placed.get(m.id) ?? 0, m.mult));
  const ampUsed = new Set(res.ampsUsed ?? []);
  const primeUsed = new Set(res.discharged);
  const itemUsed = new Set(res.itemUsed ?? []);
  const pm = primeMult(s);
  const { chain, fatigue } = a2Scale(s, res.count);
  const k = chain * fatigue;
  const od = s.odLeft > 0 || (ev.overdriveStart && !odByChain()) ? TUNING.overdriveFactor : 1;
  // per activation: undo its spent marks (and the A2 scale) to get the plain hit, then add the marks back one kind at a time
  let s0 = 0, s1 = 0, s2 = 0, s3 = 0;
  let nAmp = 0, nPrime = 0, nOc = 0;
  const links: number[] = [];
  const linkHit: number[] = [];
  // roster B jobs: each key's effective lift on the whole hit, folded in after the marks
  const jobKeys = [...new Set(res.activations.flatMap((x) => Object.keys(x.jobs ?? {}) as JobKey[]))];
  const jobSums = jobKeys.map(() => 0);
  let jobBase = 0;
  for (const act of res.activations) {
    const amp = ampUsed.has(act.id) ? Math.max(before(act.id)?.amp ?? 0, placed.get(act.id) ?? 0) || 1 : 1;
    const prime = primeUsed.has(act.id) ? pm : 1;
    const oc = itemUsed.has(act.id) && before(act.id)?.item?.kind === 'overcharge' && isShooter(act.family) ? 2 : 1;
    if (amp !== 1) nAmp++;
    if (prime !== 1) nPrime++;
    if (oc !== 1) nOc++;
    const jobs = act.jobs ?? {};
    const job = Object.values(jobs).reduce((m, x) => m * x, 1);
    const plain = act.contribution / k / (amp * prime * oc * job);
    links.push(plain);
    linkHit.push(plain * job);
    jobBase += plain * amp * prime * oc;
    let acc = plain * amp * prime * oc;
    jobKeys.forEach((key, i) => {
      acc *= jobs[key] ?? 1;
      jobSums[i] += acc;
    });
    s0 += plain;
    s1 += plain * amp;
    s2 += plain * amp * prime;
    s3 += plain * amp * prime * oc;
  }
  const terms: FormulaTerm[] = [];
  const ratio = (x: number, y: number) => (y > 0 ? x / y : 1);
  if (nAmp) terms.push({ key: 'boost', label: 'BOOST',mult: ratio(s1, s0), hue: PALETTE.boost.hue, meaning: 'boost', usedUp: true, n: nAmp });
  if (nPrime) terms.push({ key: 'charge', label: 'CHARGE', mult: ratio(s2, s1), hue: PALETTE.charge.hue, meaning: 'charge', usedUp: true, n: nPrime });
  if (nOc) terms.push({ key: 'overcharge', label: ITEM_MARK.overcharge.name, mult: ratio(s3, s2), hue: PALETTE.powerup.hue, meaning: 'powerup', usedUp: true, n: nOc });
  jobKeys.forEach((key, i) => terms.push({ key, label: JOB_TERMS[key].label, mult: ratio(jobSums[i], i ? jobSums[i - 1] : jobBase), hue: JOB_TERMS[key].hue }));
  if (res.comboMult !== 1) terms.push({ key: 'combo', label: 'COMBO', mult: res.comboMult, hue: PALETTE.merge.hue, meaning: 'merge' });
  if (od !== 1) terms.push({ key: 'overdrive', label: PALETTE.overdrive.label, mult: od, hue: PALETTE.overdrive.hue, meaning: 'overdrive' });
  if (chain !== 1) terms.push({ key: 'chainsize', label: 'CHAIN SIZE', mult: chain, hue: NEUTRAL_HUE });
  if (fatigue !== 1) terms.push({ key: 'rushed', label: 'RUSHED', mult: fatigue, hue: NEUTRAL_HUE });
  const shield = shieldMult(c); // read after the drop: a 4+ chain reopens the shield before its damage lands
  if (shield !== 1) terms.push({ key: 'shield', label: 'SHIELD', mult: shield, hue: SHIELD_HUE });
  const raw = res.total > 0 ? Math.round(res.total * shield) : 0;
  const capAt = s.level !== undefined && !s.goal ? Math.ceil(s.maxHp * TUNING.cascadeCap) : Infinity;
  const dealt = (c.stats.dmgBy?.player ?? 0) - (s.stats.dmgBy?.player ?? 0);
  return { machines: res.count, base: s0, links, ...(jobKeys.length || TUNING.rosterB ? { linkFam: res.activations.map((x) => x.family), linkHit } : {}), terms, raw, cap: raw > capAt ? capAt : null, damage: dealt, result: res };
}

/** Damage numbers as the scene prints them (12,345 / 45.6K / 1.2M). */
export const fmtHit = (n: number) => (n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e4 ? (n / 1e3).toFixed(1) + 'K' : Math.round(n).toLocaleString());

/** One printed word of the strip. `group`: 0 = machines, 1..terms = one multiplier each, last = the result; the
 *  post-drop ribbon reveals one group at a time. `struck`: the uncapped number crossed out under MAX HIT. */
export interface FormulaToken {
  text: string;
  hue: number;
  group: number;
  role: 'count' | 'base' | 'op' | 'label' | 'value' | 'result' | 'cap';
  struck?: boolean;
}
export const OP_HUE = 0x9a8f9e;
const CREAM = 0xfff0cf;

/** The strip as words: "6 MACHINES 450 × COMBO 1.4 × BOOST 1.3 = 840" (each multiplier in its PALETTE colour). */
export function formulaTokens(f: HitFormula, machines = f.machines, base = f.base): FormulaToken[] {
  const out: FormulaToken[] = [
    { text: `${machines} MACHINE${machines === 1 ? '' : 'S'}`, hue: PALETTE.merge.hue, group: 0, role: 'count' },
    { text: fmtHit(base), hue: CREAM, group: 0, role: 'base' },
  ];
  f.terms.forEach((t, i) => {
    const n = t.n ?? 1;
    out.push(
      { text: '×', hue: OP_HUE, group: i + 1, role: 'op' },
      { text: n > 1 ? `${n} ${t.label}S` : t.label, hue: t.hue, group: i + 1, role: 'label' },
      { text: fmtFactor(t.mult), hue: t.hue, group: i + 1, role: 'value' },
    );
  });
  const last = f.terms.length + 1;
  out.push({ text: '=', hue: OP_HUE, group: last, role: 'op' });
  if (f.cap !== null) out.push({ text: fmtHit(f.raw), hue: OP_HUE, group: last, role: 'value', struck: true }, { text: 'MAX HIT', hue: PALETTE.max.hue, group: last, role: 'cap' });
  out.push({ text: fmtHit(f.damage), hue: f.cap !== null ? PALETTE.max.hue : CREAM, group: last, role: 'result' });
  return out;
}
