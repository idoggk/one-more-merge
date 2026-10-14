// Mid-level chaos experiments (t-2c7cbae7): named presets of the TUNING.optionA2 / optionA3 flags, shared by the QA
// panel toggle and the sim tools. 'off' is the live game; nothing here is on by default.
// PACE prototype (t-1bef1042): TODAY / CALM / MANIA blocks of TUNING.paces, same pattern (QA toggle + pace-probe).
import { TUNING, type Pace } from './tuning';
import { rebuildUnits } from './units';

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

/** QA panel YARD PRESSURE row (TUNING.yardPressure; this device only, not in the save); missing = OFF. */
export const YARD_PRESSURE_KEY = 'omm_qa_yard_pressure';
export function storedYardPressure(read: () => string | null): boolean {
  try {
    return read() === 'on';
  } catch {
    return false;
  }
}
export function applyYardPressure(on: boolean) {
  TUNING.yardPressure = on;
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
  rebuildUnits(); // Tesla Tower (Legendary, roster 3) is in the collection only while crates B is on
}

/** QA panel UNLOCK PLAN switch (t-c78bf16f, TUNING.rosterUnlocks; this device only, not in the save): 'on' = the chapter unlock plan,
 *  anything else / missing / unreadable = OFF. */
export const ROSTER_UNLOCKS_KEY = 'omm_qa_roster_unlocks';
export function storedRosterUnlocks(read: () => string | null): boolean {
  try {
    return read() === 'on';
  } catch {
    return false;
  }
}
export function applyRosterUnlocks(on: boolean) {
  TUNING.rosterUnlocks = on;
}

/** QA panel BUDGET LEVELS switch (t-4c676288, TUNING.mergeBudget; this device only, not in the save): 'on' = the LAST MERGES bench levels can be
 *  launched, anything else / missing / unreadable = OFF. */
export const MERGE_BUDGET_KEY = 'omm_qa_merge_budget';
export function storedMergeBudget(read: () => string | null): boolean {
  try {
    return read() === 'on';
  } catch {
    return false;
  }
}
export function applyMergeBudget(on: boolean) {
  TUNING.mergeBudget = on;
}

/** QA panel POWER TOOLS switch (t-e2a48327, TUNING.tools; this device only, not in the save): 'on' = Row Surge / Gear Bomb tools, anything else / missing / unreadable = OFF. */
export const TOOLS_KEY = 'omm_qa_tools';
export function storedTools(read: () => string | null): boolean {
  try {
    return read() === 'on';
  } catch {
    return false;
  }
}
export function applyTools(on: boolean) {
  TUNING.tools = on;
}

/** QA panel VARIED OPENINGS switch (TUNING.variedOpenings; this device only, not in the save): 'on' = 4 seeded start layouts on ordinary levels, anything else = OFF. */
export const VARIED_OPENINGS_KEY = 'omm_qa_varied_openings';
export function storedVariedOpenings(read: () => string | null): boolean {
  try {
    return read() === 'on';
  } catch {
    return false;
  }
}
export function applyVariedOpenings(on: boolean) {
  TUNING.variedOpenings = on;
}

/** QA panel CRATE OPENING V2 switch (TUNING.crateOpenV2; this device only, not in the save): 'on' = the new opening sequence, anything else = OFF. */
export const CRATE_OPEN_V2_KEY = 'omm_qa_crate_open_v2';
export function storedCrateOpenV2(read: () => string | null): boolean {
  try {
    return read() === 'on';
  } catch {
    return false;
  }
}
export function applyCrateOpenV2(on: boolean) {
  TUNING.crateOpenV2 = on;
}

/** QA panel PACE CAPS switch (t-157b3f78; this device only, not in the save): 'on' = TUNING.paceCaps (twins / matchmaker copies capped at rank 4). */
export const PACE_CAPS_KEY = 'omm_qa_pace_caps';
export function storedPaceCaps(read: () => string | null): boolean {
  try {
    return read() === 'on';
  } catch {
    return false;
  }
}
export function applyPaceCaps(on: boolean) {
  TUNING.paceCaps = on;
}

/** QA panel ROSTER 7 switch (t-67cd7c5b, roster B batch 7; this device only, not in the save): 'on' = TUNING.roster7,
 *  anything else / missing / unreadable = OFF. Applied with units.ts applyRoster7. */
export const ROSTER7_KEY = 'omm_qa_roster_7';
export function storedRoster7(read: () => string | null): boolean {
  try {
    return read() === 'on';
  } catch {
    return false;
  }
}

/** QA panel ROSTER 6 switch (t-f2cd50e4, roster B batch 6; this device only, not in the save): 'on' = TUNING.roster6,
 *  anything else / missing / unreadable = OFF. Applied with units.ts applyRoster6. */
export const ROSTER6_KEY = 'omm_qa_roster_6';
export function storedRoster6(read: () => string | null): boolean {
  try {
    return read() === 'on';
  } catch {
    return false;
  }
}

/** QA panel ROSTER 5 switch (t-af818b65, roster B batch 5; this device only, not in the save): 'on' = TUNING.roster5,
 *  anything else / missing / unreadable = OFF. Applied with units.ts applyRoster5. */
export const ROSTER5_KEY = 'omm_qa_roster_5';
export function storedRoster5(read: () => string | null): boolean {
  try {
    return read() === 'on';
  } catch {
    return false;
  }
}

/** QA panel ROSTER 4 switch (t-1e3c8bb6, roster B batch 4; this device only, not in the save): 'on' = TUNING.roster4,
 *  anything else / missing / unreadable = OFF. Applied with units.ts applyRoster4. */
export const ROSTER4_KEY = 'omm_qa_roster_4';
export function storedRoster4(read: () => string | null): boolean {
  try {
    return read() === 'on';
  } catch {
    return false;
  }
}

/** QA panel ROSTER 3 switch (t-e728a5a6, roster B batch 3; this device only, not in the save): 'on' = TUNING.roster3,
 *  anything else / missing / unreadable = OFF. Applied with units.ts applyRoster3. */
export const ROSTER3_KEY = 'omm_qa_roster_3';
export function storedRoster3(read: () => string | null): boolean {
  try {
    return read() === 'on';
  } catch {
    return false;
  }
}

/** QA panel NEW 4 B button (t-ee4e93d7, roster B batch 2; this device only, not in the save): 'on' = TUNING.roster2,
 *  anything else / missing / unreadable = OFF. Applied with units.ts applyRoster2. */
export const ROSTER2_KEY = 'omm_qa_roster_2';
export function storedRoster2(read: () => string | null): boolean {
  try {
    return read() === 'on';
  } catch {
    return false;
  }
}

/** QA panel ALL NEW UNITS row: crates B (UNITS 'rb') + roster batches 1..7 = 8 flags. ON when all 8 are on, OFF when all are off, else MIXED. */
export type AllNewState = 'off' | 'on' | 'mixed';
export function allNewState(rosterB: boolean, batches: readonly boolean[]): AllNewState {
  const all = [rosterB, ...batches];
  return all.every(Boolean) ? 'on' : all.some(Boolean) ? 'mixed' : 'off';
}
