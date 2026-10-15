import { describe, expect, it } from 'vitest';
import { isAssetLoadFailure, isNewerBuild, mayReload, RELOAD_WINDOW_MS } from '../src/platform/versionGuard';
// @ts-expect-error plain .mjs deploy helper
import { KEEP_BUILDS, planKeep } from '../tools/deployKeep.mjs';

describe('versionGuard', () => {
  it('detects a newer live build, never in dev or on junk', () => {
    expect(isNewerBuild('a', 'b')).toBe(true);
    expect(isNewerBuild('a', 'a')).toBe(false);
    expect(isNewerBuild('dev', 'b')).toBe(false);
    expect(isNewerBuild('a', undefined)).toBe(false);
    expect(isNewerBuild('a', '')).toBe(false);
  });
  it('allows one reload per window only', () => {
    expect(mayReload(0, 1000)).toBe(true);
    expect(mayReload(1000, 1000 + RELOAD_WINDOW_MS - 1)).toBe(false);
    expect(mayReload(1000, 1000 + RELOAD_WINDOW_MS)).toBe(true);
    expect(mayReload(5000, 1000)).toBe(true); // clock went back: do not block forever
  });
  it('recognises failed hashed asset loads', () => {
    expect(isAssetLoadFailure('SCRIPT', 'https://x/one-more-merge/assets/index-abc.js')).toBe(true);
    expect(isAssetLoadFailure('IMG', 'https://x/assets/a.png')).toBe(false);
    expect(isAssetLoadFailure('SCRIPT', 'https://x/other.js')).toBe(false);
  });
});

describe('deploy planKeep', () => {
  const b = (id: string, ...f: string[]) => ({ id, files: f });
  it('first deploy keeps only itself', () => {
    expect(planKeep(undefined, b('n', 'assets/a.js'))).toEqual({ history: [b('n', 'assets/a.js')], copy: [] });
  });
  it('keeps old files not in the new build, caps history', () => {
    const hist = [b('4', 'assets/4.js'), b('3', 'assets/3.js', 'assets/p.js'), b('2', 'assets/2.js'), b('1', 'assets/1.js')];
    const r = planKeep(hist, b('5', 'assets/5.js', 'assets/p.js'));
    expect(r.history.map((x: { id: string }) => x.id)).toEqual(['5', '4', '3', '2']);
    expect(r.history.length).toBe(KEEP_BUILDS);
    expect(r.copy).toEqual(['assets/2.js', 'assets/3.js', 'assets/4.js']); // 1.js dropped, p.js already in new build
  });
  it('re-deploying the same id does not duplicate it; malformed history is ignored', () => {
    expect(planKeep([b('n', 'assets/old.js')], b('n', 'assets/a.js')).copy).toEqual([]);
    expect(planKeep([{ nope: 1 }, null], b('n')).history.length).toBe(1);
  });
});
