import { readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { FAMILIES, isRelay, isShooter } from '../src/core/types';
import { rankArtKey } from '../src/game/rankArt';

const KEYS = new Set(readdirSync(new URL('../src/assets/art/', import.meta.url)).map((f) => f.replace(/\.(png|webp)$/, '')));
const shipped = (k: string) => KEYS.has(k);

describe('rank 7-8 art fallback (unit display audit)', () => {
  it('uses the rank 6 picture when rank 7 or 8 art does not ship', () => {
    expect(rankArtKey('mortar_7', shipped)).toBe('mortar_6');
    expect(rankArtKey('horn_8', shipped)).toBe('horn_6');
  });
  it('keeps shipped keys and low ranks as they are', () => {
    expect(rankArtKey('cannon_8', shipped)).toBe('cannon_8');
    expect(rankArtKey('mortar_3', shipped)).toBe('mortar_3');
    expect(rankArtKey('nothing_7', shipped)).toBe('nothing_7');
  });
  it('every shooter and relay family resolves to shipped art at every rank it can reach (rank cap 8)', () => {
    for (const f of FAMILIES.filter((x) => isShooter(x) || isRelay(x)))
      for (let r = 1; r <= 8; r++) if (KEYS.has(`${f}_6`)) expect(shipped(rankArtKey(`${f}_${r}`, shipped)), `${f}_${r}`).toBe(true);
  });
});
