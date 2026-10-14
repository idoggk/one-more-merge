import { MAX_RANK } from '../content/tuning';

/** Ranks 7-8 (rankCap 8 from L21) have shipped art for some families only; the rest show the rank 6 picture, not the code-drawn placeholder. */
export function rankArtKey(key: string, shipped: (k: string) => boolean): string {
  const m = /^(.+)_(\d+)$/.exec(key);
  return m && +m[2] > MAX_RANK && !shipped(key) && shipped(`${m[1]}_${MAX_RANK}`) ? `${m[1]}_${MAX_RANK}` : key;
}
