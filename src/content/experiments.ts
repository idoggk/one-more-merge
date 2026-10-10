// Mid-level chaos experiments (t-2c7cbae7): named presets of the TUNING.optionA2 / optionA3 flags, shared by the QA
// panel toggle and the sim tools. 'off' is the live game; nothing here is on by default.
// PACE prototype (t-1bef1042): TODAY / CALM / MANIA blocks of TUNING.paces, same pattern (QA toggle + pace-probe).
import { TUNING, type Pace } from './tuning';

export type SpamVariant = 'off' | 'a2' | 'a3' | 'a3f';
export const SPAM_VARIANTS: { id: SpamVariant; label: string }[] = [
  { id: 'off', label: 'OFF' },
  { id: 'a2', label: 'A2' },
  { id: 'a3', label: 'A3' },
  { id: 'a3f', label: 'A3+TIRE' },
];

const A2_DEFAULT = structuredClone(TUNING.optA2);
const A3_DEFAULT = structuredClone(TUNING.optA3);
let spam: SpamVariant = 'off';

/** Set the experiment flags for a preset (the other experiments off). A2 = the t-0c31a7ab tuned run. */
export function applySpamVariant(v: SpamVariant) {
  spam = v;
  TUNING.optionA = false;
  TUNING.optionA2 = v === 'a2';
  TUNING.optionA3 = v === 'a3' || v === 'a3f';
  Object.assign(TUNING.optA2, structuredClone(A2_DEFAULT));
  Object.assign(TUNING.optA3, structuredClone(A3_DEFAULT));
  if (v === 'a2') Object.assign(TUNING.optA2, { chain: true, fatigue: true, chainMult: [0.35, 0.55, 0.75, 0.9, 1, 1.1], window: 3 });
  if (v === 'a3f') TUNING.optA3.fatigue = true;
  if (!TUNING.antiSpam) TUNING.optionA2 = TUNING.optionA3 = false;
}

export const PACES: { id: Pace; label: string }[] = [
  { id: 'today', label: 'TODAY' },
  { id: 'calm', label: 'CALM' },
  { id: 'mania', label: 'MANIA' },
];

/** t-4cd9e27b (owner, 2026-10-09): CALM ships as the game's pace; TODAY / MANIA stay on the QA switch. */
export const DEFAULT_PACE: Pace = 'calm';
/** QA panel PACE row (this device only, not in the save); missing / unknown / unreadable = DEFAULT_PACE. */
export const PACE_KEY = 'omm_qa_pace';
export function storedPace(read: () => string | null): Pace {
  try {
    const v = read();
    return PACES.some((x) => x.id === v) ? (v as Pace) : DEFAULT_PACE;
  } catch {
    return DEFAULT_PACE;
  }
}

/** Copy a pace block onto TUNING. MANIA (antiSpam false) forces A2/A3 off; leaving it restores the spam preset. */
export function applyPace(p: Pace) {
  Object.assign(TUNING, TUNING.paces[p] ?? TUNING.paces.today, { pace: TUNING.paces[p] ? p : 'today' });
  applySpamVariant(spam);
}

/** QA panel UNITS B0 row (t-a8c886ad, units option B stage B0; this device only, not in the save); missing = OFF. */
export const UNITS_B0_KEY = 'omm_qa_units_b0';
export function storedUnitsB0(read: () => string | null): boolean {
  try {
    return read() === 'on';
  } catch {
    return false;
  }
}
export function applyUnitsB0(on: boolean) {
  TUNING.unitsB0 = on;
  TUNING.unitsB1 = false;
}

/** QA panel THINK BANK button (t-4208f149, TUNING.thinkBank; this device only, not in the save); missing = OFF. */
export const THINK_BANK_KEY = 'omm_qa_think_bank';
export function storedThinkBank(read: () => string | null): boolean {
  try {
    return read() === 'on';
  } catch {
    return false;
  }
}
export function applyThinkBank(on: boolean) {
  TUNING.thinkBank = on;
}

/** QA panel UNITS row, t-4a966cee: OFF / B0 / B1 (same key: 'on' = B0, 'b1' = B1; anything else = OFF);
 *  t-e91097cd adds ROSTER B ('rb': TUNING.rosterB, the B jobs + Support card). */
export type UnitsVariant = 'off' | 'b0' | 'b1' | 'rb';
export const UNITS_VARIANTS: { id: UnitsVariant; label: string }[] = [
  { id: 'off', label: 'OFF' },
  { id: 'b0', label: 'B0' },
  { id: 'b1', label: 'B1' },
  { id: 'rb', label: 'ROSTER B' },
];
export function storedUnits(read: () => string | null): UnitsVariant {
  try {
    const v = read();
    return v === 'on' ? 'b0' : v === 'b1' ? 'b1' : v === 'rb' ? 'rb' : 'off';
  } catch {
    return 'off';
  }
}
export const unitsStoreValue = (v: UnitsVariant) => (v === 'b0' ? 'on' : v === 'b1' ? 'b1' : v === 'rb' ? 'rb' : null);
/** QA panel NEW 4 button (t-9b28a794, roster B batch 1; this device only, not in the save): 'on' = TUNING.roster1,
 *  anything else / missing / unreadable = OFF. Applied with units.ts applyRoster1. */
export const ROSTER1_KEY = 'omm_qa_roster_1';
export function storedRoster1(read: () => string | null): boolean {
  try {
    return read() === 'on';
  } catch {
    return false;
  }
}
export function applyUnits(v: UnitsVariant) {
  TUNING.unitsB0 = v === 'b0';
  TUNING.unitsB1 = v === 'b1';
  TUNING.rosterB = v === 'rb';
}
