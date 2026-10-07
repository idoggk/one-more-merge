// SAGA MASTERY (r40, ChatGPT's #2 next feature): every cleared saga level offers two optional contracts, checked when
// the level is won. ChatGPT also proposed "clear 15% faster" - declined, the star times already reward speed.
// Contracts are deterministic per level (hash of the level number) and only use stats the engine already tracks.
import type { LevelDef } from '../content/levels';
import type { GameState } from './game';

export type ContractKind = 'chain' | 'noscrap' | 'rankcap' | 'tidy';
export interface Contract {
  kind: ContractKind;
  n: number;
}

/** Medal rewards: 10 Bolts each; every 10th medal a Wood crate, every 30th an Iron crate; all medals = Gold crate. */
export const MASTERY_BOLTS = 10;

export function contractsFor(d: LevelDef): Contract[] {
  const ch = Math.ceil(d.level / 10);
  const options: Contract[] = [{ kind: 'chain', n: Math.min(11, 5 + ch) }];
  if (d.level >= 4) options.push({ kind: 'noscrap', n: 0 });
  // a rank cap must leave room for a rank goal
  const cap = ch <= 3 ? 5 : 6;
  if (!(d.goal?.kind === 'rank' && d.goal.n > cap)) options.push({ kind: 'rankcap', n: cap });
  options.push({ kind: 'tidy', n: 8 });
  let h = (d.level * 2654435761) >>> 0;
  const a = h % options.length;
  h = (Math.imul(h ^ (h >>> 15), 0x2c1b3c6d) >>> 0) % (options.length - 1);
  const b = h >= a ? h + 1 : h;
  return [options[a], options[b]];
}

export function contractText(c: Contract): string {
  switch (c.kind) {
    case 'chain':
      return `Fire a chain of ${c.n}+`;
    case 'noscrap':
      return 'Win without SCRAP';
    case 'rankcap':
      return `Win with no machine above rank ${c.n}`;
    case 'tidy':
      return `Finish with ${c.n}+ empty cells`;
  }
}

/** Whether a WON state met the contract. */
export function contractMet(c: Contract, s: GameState): boolean {
  switch (c.kind) {
    case 'chain':
      return s.stats.biggestChain >= c.n;
    case 'noscrap':
      return s.stats.scraps === 0;
    case 'rankcap':
      return s.stats.bestRank <= c.n;
    case 'tidy':
      return s.grid.filter((g) => !g).length - (s.masked?.length ?? 0) >= c.n;
  }
}
