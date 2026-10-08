// Mid-level chaos experiments (t-2c7cbae7): named presets of the TUNING.optionA2 / optionA3 flags, shared by the QA
// panel toggle and the sim tools. 'off' is the live game; nothing here is on by default.
import { TUNING } from './tuning';

export type SpamVariant = 'off' | 'a2' | 'a3' | 'a3f';
export const SPAM_VARIANTS: { id: SpamVariant; label: string }[] = [
  { id: 'off', label: 'OFF' },
  { id: 'a2', label: 'A2' },
  { id: 'a3', label: 'A3' },
  { id: 'a3f', label: 'A3+TIRE' },
];

const A2_DEFAULT = structuredClone(TUNING.optA2);
const A3_DEFAULT = structuredClone(TUNING.optA3);

/** Set the experiment flags for a preset (the other experiments off). A2 = the t-0c31a7ab tuned run. */
export function applySpamVariant(v: SpamVariant) {
  TUNING.optionA = false;
  TUNING.optionA2 = v === 'a2';
  TUNING.optionA3 = v === 'a3' || v === 'a3f';
  Object.assign(TUNING.optA2, structuredClone(A2_DEFAULT));
  Object.assign(TUNING.optA3, structuredClone(A3_DEFAULT));
  if (v === 'a2') Object.assign(TUNING.optA2, { chain: true, fatigue: true, chainMult: [0.35, 0.55, 0.75, 0.9, 1, 1.1], window: 3 });
  if (v === 'a3f') TUNING.optA3.fatigue = true;
}
