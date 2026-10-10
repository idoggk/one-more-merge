// t-33f4fe2e: QA toolbox crates. Default OFF keeps the old names; the textures are baked once, never per open.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CRATES, type CrateKind } from '../src/content/units';
import { crateName, TOOLBOX_KEY, toolboxCrateKey, toolboxOn } from '../src/game/fx/toolboxCrates';

class MemStore {
  m = new Map<string, string>();
  getItem(k: string) {
    return this.m.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.m.set(k, v);
  }
}

/** A Graphics stub that accepts any chained draw call; the scene records each generateTexture. */
function fakeScene() {
  const baked: string[] = [];
  const textures = new Set<string>();
  const g: Record<string, unknown> = new Proxy({}, {
    get: (_t, p) => {
      if (p === 'generateTexture') return (key: string) => (baked.push(key), textures.add(key), g);
      return () => g;
    },
  });
  const scene = { textures: { exists: (k: string) => textures.has(k) }, make: { graphics: () => g } };
  return { scene: scene as never, baked };
}

afterEach(() => vi.unstubAllGlobals());

describe('toolbox crates (QA)', () => {
  it('default OFF: old crate names', () => {
    vi.stubGlobal('localStorage', new MemStore());
    expect(toolboxOn()).toBe(false);
    for (const k of ['wood', 'iron', 'gold'] as CrateKind[]) expect(crateName(k)).toBe(CRATES[k].name);
  });

  it('switch ON: Tool Bag / Toolbox / Tool Chest', () => {
    const ls = new MemStore();
    ls.setItem(TOOLBOX_KEY, 'toolbox');
    vi.stubGlobal('localStorage', ls);
    expect(toolboxOn()).toBe(true);
    expect(['wood', 'iron', 'gold'].map((k) => crateName(k as CrateKind))).toEqual(['TOOL BAG', 'TOOLBOX', 'TOOL CHEST']);
  });

  it('bakes each look once (closed, open, latch) and reuses it', () => {
    const { scene, baked } = fakeScene();
    for (let i = 0; i < 3; i++) for (const k of ['wood', 'iron', 'gold'] as CrateKind[]) expect(toolboxCrateKey(scene, k)).toBe(`tbx_${k}`);
    expect(baked.sort()).toEqual(['tbx_gold', 'tbx_gold_open', 'tbx_iron', 'tbx_iron_open', 'tbx_latch_gold', 'tbx_latch_iron', 'tbx_latch_wood', 'tbx_wood', 'tbx_wood_open']);
  });
});
