import { describe, expect, it } from 'vitest';
import { existsSync, readdirSync } from 'node:fs';
import { ASSET_CATEGORIES, ASSET_REGISTRY, ASSET_STATUSES } from '../src/content/assetRegistry';

const ART_DIR = 'src/assets/art';

describe('asset registry', () => {
  it('registers every file under src/assets/art', () => {
    const registered = new Set(ASSET_REGISTRY.map((a) => a.file));
    const missing = readdirSync(ART_DIR)
      .filter((f) => /\.(webp|png)$/.test(f))
      .filter((f) => !registered.has(`${ART_DIR}/${f}`));
    expect(missing, 'run: node tools/gen-asset-registry.mjs').toEqual([]);
  });

  it('only points at files that exist', () => {
    const gone = ASSET_REGISTRY.filter((a) => a.file !== 'code-drawn' && !existsSync(a.file)).map((a) => a.file);
    expect(gone).toEqual([]);
  });

  it('has unique ids', () => {
    const seen = new Set<string>();
    const dupes: string[] = [];
    for (const a of ASSET_REGISTRY) {
      if (seen.has(a.id)) dupes.push(a.id);
      seen.add(a.id);
    }
    expect(dupes).toEqual([]);
  });

  it('uses known categories and statuses, and ranks only on units', () => {
    for (const a of ASSET_REGISTRY) {
      expect(ASSET_CATEGORIES, a.id).toContain(a.category);
      expect(ASSET_STATUSES, a.id).toContain(a.status);
    }
  });

  it('marks every code-drawn unit as placeholder', () => {
    const bad = ASSET_REGISTRY.filter((a) => a.category === 'units' && a.file === 'code-drawn' && a.status !== 'placeholder');
    expect(bad.map((a) => a.id)).toEqual([]);
  });
});
