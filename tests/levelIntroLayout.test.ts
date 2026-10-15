import { describe, expect, it } from 'vitest';
import { clampLines, firstSentence, INTRO_CFG, layoutIntro, parseTools, INTRO_COPY, shortToolLabel, starGoalLabels, type IntroInput } from '../src/game/ui/levelIntroLayout';
import { FAMILY_INFO } from '../src/content/perks';
import { LEVELS, BEHAVIOUR_TEXT, MODIFIER_TEXT, goalText } from '../src/content/levels';
import { BOSSES } from '../src/core/boss';
import { TUNING } from '../src/content/tuning';
import type { Rect } from '../src/game/ui/qaLayout';

const W = 720;
/** Phone sizes: stage height = 720 * viewH / viewW (clamped 1280..1720, as sceneKit.layoutHeight). */
const PHONES: [string, number, number][] = [['360x640', 360, 640], ['390x844', 390, 844], ['430x932', 430, 932]];
const stageH = (vw: number, vh: number) => Math.round(Math.min(1720, Math.max(1280, (W * vh) / vw)));
const inter = (a: Rect, b: Rect) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
const inside = (a: Rect, o: Rect) => a.x >= o.x - 0.01 && a.y >= o.y - 0.01 && a.x + a.w <= o.x + o.w + 0.01 && a.y + a.h <= o.y + o.h + 0.01;

const CASES: Record<string, Omit<IntroInput, 'H'>> = {
  normal: { minions: 0, tools: 0, hasText: true, hasJump: false, hasExtra: false, hasTag: false },
  normalJump: { minions: 3, tools: 2, hasText: true, hasJump: true, hasExtra: false, hasTag: true },
  mini: { minions: 4, tools: 5, hasText: true, hasJump: true, hasExtra: false, hasTag: true },
  boss: { minions: 4, tools: 5, hasText: true, hasJump: true, hasExtra: false, hasTag: true },
  showcase: { minions: 4, tools: 5, hasText: true, hasJump: true, hasExtra: true, hasTag: true },
};

describe('level intro layout (UI kit v3)', () => {
  for (const [pn, vw, vh] of PHONES) {
    const H = stageH(vw, vh);
    const ptPx = W / vw; // design px per phone pt
    for (const [cn, c] of Object.entries(CASES)) {
      it(`${pn} ${cn}: nothing overlaps, everything fits, sizes meet the brief`, () => {
        const g = layoutIntro({ H, ...c });
        // panel children stay inside the panel and apart
        const kids: [string, Rect | null][] = [['hero', g.hero], ['name', g.name], ['clock', g.clock], ['text', g.text], ['minionHead', g.minionHead], ['toolHead', g.toolHead], ['toolHint', g.toolHint], ['play', g.play], ...g.minions.map((r, i) => [`minion${i}`, r] as [string, Rect]), ...g.tools.map((r, i) => [`tool${i}`, r] as [string, Rect])];
        const real = kids.filter((k): k is [string, Rect] => !!k[1]);
        for (const [n, r] of real) expect(inside(r, g.panel), `${n} inside panel`).toBe(true);
        for (let i = 0; i < real.length; i++) for (let j = i + 1; j < real.length; j++) expect(inter(real[i][1], real[j][1]), `${real[i][0]} x ${real[j][0]}`).toBe(false);
        // the panel, the jump card, the close button and the ribbon fit the screen
        for (const r of [g.panel, g.ribbon, g.close, ...(g.jump ? [g.jump] : [])]) expect(r.x >= 0 && r.y >= 0 && r.x + r.w <= W && r.y + r.h <= H, 'on screen').toBe(true);
        // the jump card sits below the panel, never over it or over PLAY; the toggle is inside the card
        if (g.jump && g.toggle) {
          expect(g.jump.y).toBeGreaterThanOrEqual(g.panel.y + g.panel.h);
          expect(inter(g.jump, g.play)).toBe(false);
          expect(inside(g.toggle, g.jump)).toBe(true);
          expect(g.toggle.h / ptPx, 'toggle >= 44 pt').toBeGreaterThanOrEqual(44);
          expect(g.toggle.w / ptPx).toBeGreaterThanOrEqual(44);
        }
        // pills inside the hero, apart from each other and from the star strip
        const inHero = [g.stars, g.extra, g.tag].filter((r): r is Rect => !!r);
        for (const r of inHero) expect(inside(r, g.hero)).toBe(true);
        for (let i = 0; i < inHero.length; i++) for (let j = i + 1; j < inHero.length; j++) expect(inter(inHero[i], inHero[j])).toBe(false);
        // the close button does not touch the ribbon or the hero
        expect(inter(g.close, g.ribbon)).toBe(false);
        expect(inter(g.close, g.hero)).toBe(false);
        // sizes (phone pt = design px / ptPx)
        expect(g.heroFrac, 'hero >= 40% of the panel').toBeGreaterThanOrEqual(INTRO_CFG.heroFrac);
        expect(g.play.h / ptPx, 'PLAY >= 56 pt').toBeGreaterThanOrEqual(56);
        for (const r of [...g.minions, ...g.tools]) expect(r.w / ptPx, 'chip >= 48 pt').toBeGreaterThanOrEqual(48);
        // PLAY is thumb-reachable: its centre is in the lower half of the screen
        expect(g.play.y + g.play.h / 2).toBeGreaterThan(H / 2);
      });
    }
  }

  it('the stack is centred on tall phones and the panel only grows to heroMax', () => {
    const g = layoutIntro({ H: 1720, ...CASES.normal });
    expect(g.hero.h).toBeLessThanOrEqual(INTRO_CFG.heroMax);
    expect(g.ribbon.y).toBeGreaterThan(INTRO_CFG.margin);
  });
});

describe('level intro copy', () => {
  it('firstSentence keeps only the first sentence', () => {
    expect(firstSentence('Empty portals let you move a machine across the board. Final phase: also mirror!')).toBe('Empty portals let you move a machine across the board');
    expect(firstSentence('no full stop here')).toBe('no full stop here');
  });
  it('clampLines never exceeds the lines and chars it is given, even on the longest hints of the game', () => {
    const all = [...BOSSES.map((b) => b.copy), ...Object.values(BEHAVIOUR_TEXT), ...Object.values(MODIFIER_TEXT), ...Object.values(FAMILY_INFO).map((f) => f.text), ...LEVELS.map((l) => (l.goal ? goalText(l.goal) : ''))].filter(Boolean) as string[];
    expect(all.length).toBeGreaterThan(20);
    for (const t of [...all, 'x'.repeat(200), `${'WORD '.repeat(60)}`]) {
      const one = clampLines(firstSentence(t), INTRO_CFG.textChars, INTRO_CFG.textLines);
      expect(one.length).toBeLessThanOrEqual(INTRO_CFG.textLines);
      for (const l of one) expect(l.length, l).toBeLessThanOrEqual(INTRO_CFG.textChars);
    }
  });
  it('parseTools makes at most 5 chips with 1-word labels and the full line', () => {
    const t = parseTools('GOOD HERE: WRENCH (one big merge hits a rank higher), BLOWTORCH (it burns what the boss throws), BLAST PLATE (it blocks a boss attack), REWIND CRANK (undo a merge), WRECKING BALL (wake it), PISTON (x), LATHE (y)');
    expect(t.map((x) => x.label)).toEqual(['WRENCH', 'BLOWTORCH', 'BLAST', 'REWIND', 'WRECKING']);
    expect(t[2].full).toBe('BLAST PLATE: it blocks a boss attack');
    expect(parseTools('')).toEqual([]);
  });
  it('every text size is at least 16 pt on a 390 pt phone, and the rows have headings', () => {
    expect(INTRO_CFG.minFont).toBeGreaterThanOrEqual((16 * 720) / 390 - 0.5);
    expect(INTRO_CFG.textFont).toBeGreaterThanOrEqual(INTRO_CFG.minFont);
    const g = layoutIntro({ H: 1558, ...CASES.boss });
    expect(g.minionHead && g.toolHead && g.toolHint).toBeTruthy();
    expect(layoutIntro({ H: 1558, ...CASES.normal }).toolHead).toBeNull();
    expect(INTRO_COPY.toolsHint.length).toBeLessThanOrEqual(40);
  });
  it('shortToolLabel fits a plate and keeps short names', () => {
    expect(['WRENCH', 'BLOWTORCH', 'BLAST PLATE', 'REWIND CRANK', 'WRECKING BALL', 'HYDRAULIC PRESS', 'ARC WELDER'].map((n) => shortToolLabel(n))).toEqual(['WRENCH', 'TORCH', 'BLAST', 'REWIND', 'WRECK', 'PRESS', 'WELDER']);
    for (const n of ['SUPERCALIFRAGILISTIC', 'A B C']) expect(shortToolLabel(n).length).toBeLessThanOrEqual(INTRO_CFG.toolLabelChars);
  });
  it('starGoalLabels: Clear then two clock times', () => {
    expect(starGoalLabels(132, 128, (s) => `${Math.floor(s / 60)}:${s % 60}`)).toEqual([{ text: 'Clear', clock: false }, { text: '2:12', clock: true }, { text: '2:8', clock: true }]);
  });
  it('the flag defaults to OFF', () => expect(TUNING.uiKitV3).toBe(false));
});
