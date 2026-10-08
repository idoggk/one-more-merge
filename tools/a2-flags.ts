// Shared CLI switch for the TUNING.optionA2 experiment (t-0c31a7ab).
// --optA2 turns it on; --a2 a = chain-weighted damage only, b = spam fatigue only, ab (default) = both;
// --a2 od = neither (Overdrive by chain only). Overrides: --a2beat S (earned parts at most one per S s, 0 = today),
// --a2window S, --a2min M (fatigue), --a2mult 0.6,0.8,1,... (chain multipliers by activations).
import { TUNING } from '../src/content/tuning';

export function applyA2(args: string[]) {
  if (!args.includes('--optA2')) return;
  const mode = args.includes('--a2') ? args[args.indexOf('--a2') + 1] : 'ab';
  TUNING.optionA2 = true;
  TUNING.optA2.chain = mode.includes('a');
  TUNING.optA2.fatigue = mode.includes('b');
  const num = (k: string) => (args.includes(k) ? Number(args[args.indexOf(k) + 1]) : undefined);
  TUNING.optA2.beat = num('--a2beat') ?? TUNING.optA2.beat;
  TUNING.optA2.window = num('--a2window') ?? TUNING.optA2.window;
  TUNING.optA2.minMult = num('--a2min') ?? TUNING.optA2.minMult;
  if (args.includes('--a2mult')) TUNING.optA2.chainMult = args[args.indexOf('--a2mult') + 1].split(',').map(Number);
}

export const a2Tag = () => {
  const A = TUNING.optA2;
  if (!TUNING.optionA2) return 'OFF';
  const a = A.chain ? `a[${A.chainMult.join(',')}]` : '';
  const b = A.fatigue ? `b(window ${A.window}s min ${A.minMult})` : '';
  return `ON(${a}${b}${a || b ? '' : 'od only'}${A.beat ? ` beat ${A.beat}s` : ''})`;
};
