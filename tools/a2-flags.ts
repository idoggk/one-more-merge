// Shared CLI switch for the TUNING.optionA2 (t-0c31a7ab) and optionA3 (t-2c7cbae7) experiments.
// --variant off|a2|a3|a3f applies a preset from src/content/experiments.ts (a2 = the tuned A2 run) before the flags below.
// --optA2 turns A2 on; --a2 a = chain-weighted damage only, b = spam fatigue only, ab (default) = both;
// --a2 od = neither (Overdrive by chain only). Overrides: --a2beat S (earned parts at most one per S s, 0 = today),
// --a2window S, --a2min M (fatigue), --a2mult 0.6,0.8,1,... (chain multipliers by activations).
// --optA3 turns A3 on; --a3fatigue adds fatigue; overrides --a3mult, --a3gate N (chain activations to earn on a full
// board), --a3above N (parts above which the gate applies), --a3beat S (earned parts at most one per S s, 0 = today),
// --a3window S, --a3min M.
import { applySpamVariant, type SpamVariant } from '../src/content/experiments';
import { TUNING } from '../src/content/tuning';

export function applyA2(args: string[]) {
  const num = (k: string) => (args.includes(k) ? Number(args[args.indexOf(k) + 1]) : undefined);
  if (args.includes('--variant')) applySpamVariant(args[args.indexOf('--variant') + 1] as SpamVariant);
  if (args.includes('--optA2')) {
    const mode = args.includes('--a2') ? args[args.indexOf('--a2') + 1] : 'ab';
    TUNING.optionA2 = true;
    TUNING.optA2.chain = mode.includes('a');
    TUNING.optA2.fatigue = mode.includes('b');
  }
  TUNING.optA2.beat = num('--a2beat') ?? TUNING.optA2.beat;
  TUNING.optA2.window = num('--a2window') ?? TUNING.optA2.window;
  TUNING.optA2.minMult = num('--a2min') ?? TUNING.optA2.minMult;
  if (args.includes('--a2mult')) TUNING.optA2.chainMult = args[args.indexOf('--a2mult') + 1].split(',').map(Number);
  if (args.includes('--optA3')) TUNING.optionA3 = true;
  if (args.includes('--a3fatigue')) TUNING.optA3.fatigue = true;
  if (args.includes('--a3mult')) TUNING.optA3.chainMult = args[args.indexOf('--a3mult') + 1].split(',').map(Number);
  TUNING.optA3.gateChain = num('--a3gate') ?? TUNING.optA3.gateChain;
  TUNING.optA3.gateAbove = num('--a3above') ?? TUNING.optA3.gateAbove;
  TUNING.optA3.beat = num('--a3beat') ?? TUNING.optA3.beat;
  TUNING.optA3.window = num('--a3window') ?? TUNING.optA3.window;
  TUNING.optA3.minMult = num('--a3min') ?? TUNING.optA3.minMult;
}

export const a2Tag = () => {
  const A = TUNING.optA2;
  if (!TUNING.optionA2) return 'OFF';
  const a = A.chain ? `a[${A.chainMult.join(',')}]` : '';
  const b = A.fatigue ? `b(window ${A.window}s min ${A.minMult})` : '';
  return `ON(${a}${b}${a || b ? '' : 'od only'}${A.beat ? ` beat ${A.beat}s` : ''})`;
};

export const a3Tag = () => {
  const A = TUNING.optA3;
  if (!TUNING.optionA3) return 'OFF';
  return `ON(mult[${A.chainMult.join(',')}] gate chain>=${A.gateChain} above ${A.gateAbove}${A.beat ? ` beat ${A.beat}s` : ''}${A.fatigue ? ` fatigue ${A.window}s min ${A.minMult}` : ''})`;
};
