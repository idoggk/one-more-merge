import { describe, expect, it } from 'vitest';
import { layoutSettings, SETTINGS_TOGGLES } from '../src/game/ui/settingsLayout';
import { qaReachable, rectsOverlap, type PanelLayout } from '../src/game/ui/qaLayout';
import { layoutHeight, TAP_MIN, W } from '../src/game/sceneKit';

// design stage heights of the two phones the screen must work on: 390x844 and 360x640 (plus the shortest and tallest stage)
const SCREENS: [string, number][] = [['390x844', layoutHeight(390, 844)], ['360x640', layoutHeight(360, 640)], ['min', 1280], ['max', 1720]];

describe('Settings layout', () => {
  for (const [name, H] of SCREENS) {
    const l = layoutSettings(H);
    it(`${name}: no two rows overlap`, () => {
      for (let i = 0; i < l.rows.length; i++)
        for (let j = i + 1; j < l.rows.length; j++) expect(rectsOverlap(l.rows[i].rect, l.rows[j].rect), `${l.rows[i].id} vs ${l.rows[j].id}`).toBe(false);
    });
    it(`${name}: rows stay inside the sheet width and under the pinned header`, () => {
      for (const r of l.rows) {
        expect(r.rect.x, r.id).toBeGreaterThanOrEqual(46);
        expect(r.rect.x + r.rect.w, r.id).toBeLessThanOrEqual(W - 46);
        expect(r.rect.y, r.id).toBeGreaterThanOrEqual(l.bodyTop);
      }
    });
    it(`${name}: every button is finger-sized and reachable by scrolling; the last one ends inside the window`, () => {
      expect(l.rows.filter((r) => r.id.startsWith('toggle'))).toHaveLength(SETTINGS_TOGGLES);
      for (const r of l.rows.filter((x) => x.tappable)) {
        expect(r.rect.h, r.id).toBeGreaterThanOrEqual(TAP_MIN - 0.001);
        expect(qaReachable(l as unknown as PanelLayout, r.rect), `${r.id} reachable`).toBe(true);
      }
      const last = l.rows[l.rows.length - 1];
      expect(last.id).toBe('reload');
      expect(last.rect.y + last.rect.h + l.minScroll).toBeLessThanOrEqual(l.bodyBottom);
    });
    it(`${name}: the sheet fits the screen with a margin`, () => {
      expect(l.panelH).toBeLessThanOrEqual(H - 100);
      expect(l.minScroll).toBeLessThanOrEqual(0);
    });
  }
});
