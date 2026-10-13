// A tool tap while the MERGE ASSIST hint shows (merge-train risk): the tool must not be swallowed by the tap shortcut.
import { describe, expect, it } from 'vitest';
import { tapRoute } from '../src/game/mergeAssist';

describe('tap routing: tool release before the MERGE ASSIST tap shortcut', () => {
  const pair: [number, number] = [3, 7];
  it('a quick tap on a tool that is ALSO one of the hinted cells uses the tool, not the merge', () => {
    expect(tapRoute('use', pair, 3, true)).toBe('tool');
    expect(tapRoute('use', pair, 7, true)).toBe('tool');
  });
  it('a long-press preview release does nothing even on a hinted cell', () => {
    expect(tapRoute('held', pair, 3, true)).toBe('held');
  });
  it('a tool elsewhere is used while the hint shows', () => {
    expect(tapRoute('use', pair, 12, true)).toBe('tool');
  });
  it('a non-tool tap on a hinted cell still takes the assist shortcut; elsewhere / not playing / no hint it inspects', () => {
    expect(tapRoute('none', pair, 3, true)).toBe('assist');
    expect(tapRoute('none', pair, 12, true)).toBe('other');
    expect(tapRoute('none', pair, 3, false)).toBe('other');
    expect(tapRoute('none', null, 3, true)).toBe('other');
  });
});
