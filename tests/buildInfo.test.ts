import { describe, expect, it } from 'vitest';
import { bustUrl, formatBuildLabel } from '../src/game/ui/buildInfo';

describe('build info', () => {
  it('formats the label', () => {
    expect(formatBuildLabel('2026-10-10 10:30 · 54b2585')).toBe('Build 2026-10-10 10:30 · 54b2585');
  });
  it('adds or replaces the cache-busting query, keeping the hash', () => {
    expect(bustUrl('https://x.io/a/', 5)).toBe('https://x.io/a/?v=5');
    expect(bustUrl('https://x.io/a/?v=1&k=2#h', 9)).toBe('https://x.io/a/?v=9&k=2#h');
  });
});
