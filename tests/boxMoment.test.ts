// Box-complete moment of both Screw Yards (t-9170d73d): the pure state machine, poses, chime streak and layer order.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { BOX_MOMENT_BLOCKS_INPUT, BoxMoment, ChimeStreak, CHIME_MAX_STEP, LAYERS, SLIDE_IN, SLIDE_OUT, SPARKS, STAMP_MS, cuesBetween, lidScale, momentTimes, phaseAt, poseAt, type MomentCue, type MomentPhase } from '../src/game/fx/boxMoment';
import { shakeSpec } from '../src/game/fx/shake';

const src = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

/** Run a moment in fixed frames; collect the phases visited and every cue with its time. */
function run(reduced: boolean, dt = 10) {
  const m = new BoxMoment(reduced);
  const phases: MomentPhase[] = [m.phase];
  const cues: { cue: MomentCue; at: number }[] = [];
  const note = (cs: MomentCue[]) => cs.forEach((cue) => cues.push({ cue, at: m.ms }));
  note(m.start());
  phases.push(m.phase);
  for (let i = 0; i < 200 && !m.done; i++) {
    note(m.advance(dt));
    if (phases[phases.length - 1] !== m.phase) phases.push(m.phase);
  }
  return { m, phases, cues };
}

describe('box moment: sequencing (filling -> closing -> latched -> sliding -> next)', () => {
  it('visits the phases in order, once each', () => {
    const { phases } = run(false);
    expect(phases).toEqual(['filling', 'closing', 'latched', 'sliding', 'next']);
  });
  it('fires the cues in order: thud, clack + sparks + stamp, counter, chime, slide, done', () => {
    const { cues } = run(false);
    expect(cues.map((c) => c.cue)).toEqual(['thud', 'clack', 'sparks', 'stamp', 'counter', 'chime', 'slide', 'done']);
    // the cue never fires early, and each fires exactly once
    const times = momentTimes(false);
    expect(cues.find((c) => c.cue === 'clack')!.at).toBeGreaterThanOrEqual(times.latch);
    expect(cues.find((c) => c.cue === 'slide')!.at).toBeGreaterThanOrEqual(times.slideStart);
  });
  it('lasts 500-700 ms (shorter and calmer with reduced motion)', () => {
    const t = momentTimes(false);
    expect(t.total).toBeGreaterThanOrEqual(500);
    expect(t.total).toBeLessThanOrEqual(700);
    expect(t.latch).toBeLessThan(t.slideStart);
    expect(t.slideStart).toBeLessThan(t.slideEnd);
    expect(momentTimes(true).total).toBeLessThan(t.total);
  });
  it('is frame-rate independent: a coarse and a fine clock fire the same cues', () => {
    expect(run(false, 4).cues.map((c) => c.cue)).toEqual(run(false, 33).cues.map((c) => c.cue));
  });
  it('phaseAt matches the timeline', () => {
    const t = momentTimes(false);
    expect(phaseAt(-1, t)).toBe('filling');
    expect(phaseAt(0, t)).toBe('closing');
    expect(phaseAt(t.latch, t)).toBe('latched');
    expect(phaseAt(t.slideStart, t)).toBe('sliding');
    expect(phaseAt(t.total, t)).toBe('next');
  });
  it('cuesBetween is half-open: nothing twice, nothing missed', () => {
    const all = cuesBetween(-1, 1000);
    expect(cuesBetween(-1, 300).concat(cuesBetween(300, 1000))).toEqual(all);
  });
  it('never blocks input and moments are independent per box', () => {
    expect(BOX_MOMENT_BLOCKS_INPUT).toBe(false);
    const a = new BoxMoment(false), b = new BoxMoment(false);
    a.start();
    a.advance(300);
    b.start();
    expect(a.phase).toBe('sliding');
    expect(b.phase).toBe('closing');
  });
});

describe('box moment: poses', () => {
  it('the lid slams down with a tiny bounce and ends shut', () => {
    const t = momentTimes(false);
    expect(poseAt(0).lid).toBe(0);
    let prev = 0;
    for (let ms = 0; ms <= t.latch * 0.7; ms += 5) {
      const l = poseAt(ms).lid;
      expect(l).toBeGreaterThanOrEqual(prev - 1e-9); // ease-out: only ever closes
      prev = l;
    }
    expect(lidScale(0.5)).toBeGreaterThan(0.5 * 0.9); // ease-out: past linear early on
    const peak = Math.max(...Array.from({ length: 40 }, (_, i) => lidScale(0.72 + (i / 40) * 0.28)));
    expect(peak).toBeGreaterThan(1);
    expect(peak).toBeLessThan(1.1);
    expect(poseAt(t.total).lid).toBeCloseTo(1, 5);
  });
  it('latch: a short white flash, a ring, 6-10 sparks, and the check stamp for 250 ms', () => {
    const t = momentTimes(false);
    expect(poseAt(t.latch - 5).flash).toBe(0);
    expect(poseAt(t.latch + 5).flash).toBeGreaterThan(0.5);
    expect(poseAt(t.latch + 120).flash).toBe(0);
    expect(poseAt(t.latch + 5).ring).not.toBeNull();
    expect(poseAt(t.latch + 5).sparks).not.toBeNull();
    expect(SPARKS).toBeGreaterThanOrEqual(6);
    expect(SPARKS).toBeLessThanOrEqual(10);
    expect(STAMP_MS).toBe(250);
    expect(poseAt(t.latch - 1).stamp).toBeNull();
    expect(poseAt(t.latch + 1).stamp).not.toBeNull();
    expect(poseAt(t.latch + STAMP_MS - 1).stamp).not.toBeNull();
    expect(poseAt(t.latch + STAMP_MS + 1).stamp).toBeNull();
    expect(t.stampEnd - t.latch).toBe(STAMP_MS);
  });
  it('the old box slides off to the side (left, not up) while the next slides in from the right with a small overshoot', () => {
    const t = momentTimes(false);
    expect(poseAt(t.slideStart - 1).oldX).toBe(0);
    expect(poseAt(t.slideEnd).oldX).toBeCloseTo(-SLIDE_OUT, 5);
    expect(poseAt(t.slideEnd).oldAlpha).toBe(0);
    expect(poseAt(t.slideStart + 1).newX).toBeGreaterThan(SLIDE_IN * 0.8);
    expect(poseAt(t.slideStart - 1).newAlpha).toBe(0);
    let min = 0;
    for (let ms = t.slideStart; ms <= t.total; ms += 4) min = Math.min(min, poseAt(ms).newX);
    expect(min).toBeLessThan(0); // overshoots past its place...
    expect(min).toBeGreaterThan(-SLIDE_IN * 0.15); // ...by a little
    expect(poseAt(t.total).newX).toBeCloseTo(0, 3);
    expect(poseAt(t.total).newAlpha).toBe(1);
  });
  it('reduced motion: no slide, no flash, ring, sparks or bounce; a fade instead', () => {
    const t = momentTimes(true);
    for (let ms = 0; ms <= t.total; ms += 10) {
      const p = poseAt(ms, true);
      expect(p.oldX).toBe(0);
      expect(p.newX).toBe(0);
      expect(p.flash).toBe(0);
      expect(p.ring).toBeNull();
      expect(p.sparks).toBeNull();
      expect(p.bump).toBe(0);
      expect(p.lid).toBeLessThanOrEqual(1);
    }
    expect(poseAt(t.slideStart + 40, true).oldAlpha).toBeLessThan(1);
    expect(poseAt(t.slideStart + 40, true).newAlpha).toBeGreaterThan(0);
    expect(poseAt(t.latch + 5, true).stamp).not.toBeNull(); // the stamp stays (it is a still)
  });
});

describe('box moment: chime streak', () => {
  it('climbs one step per consecutive box and resets on a mistake', () => {
    const s = new ChimeStreak();
    expect([s.box(), s.box(), s.box()]).toEqual([0, 1, 2]);
    s.mistake();
    expect(s.box()).toBe(0);
    expect(s.box()).toBe(1);
  });
  it('is capped so the pitch stops climbing', () => {
    const s = new ChimeStreak();
    const steps = Array.from({ length: 20 }, () => s.box());
    expect(Math.max(...steps)).toBe(CHIME_MAX_STEP);
    expect(steps[19]).toBe(CHIME_MAX_STEP);
  });
});

describe('box moment: layers and settings', () => {
  it('the animation layer is above the baked bands, and the quit button is above the animation', () => {
    expect(LAYERS.fx).toBeGreaterThan(LAYERS.bands);
    expect(LAYERS.fx).toBeGreaterThan(LAYERS.ui);
    expect(LAYERS.fx).toBeGreaterThan(LAYERS.flyer);
    expect(LAYERS.quit).toBeGreaterThan(LAYERS.fx);
  });
  it('the scenes actually use those layers', () => {
    const obj = src('src/game/ObjectYardScene.ts');
    const old = src('src/game/ScrewScene.ts');
    const fx = src('src/game/fx/boxMomentFx.ts');
    expect(obj).toMatch(/setScale\(1 \/ RS\)\.setDepth\(LAYERS\.bands\)/); // every baked band is explicitly at the bottom
    expect(obj).toMatch(/setDepth\(LAYERS\.quit\)/);
    expect(old).toMatch(/setDepth\(LAYERS\.quit\)/);
    expect(fx).toMatch(/LAYERS\.fx/);
    // the flying screw sits between the bands and the moment
    expect(obj).toMatch(/\.setDepth\(50\)/);
    expect(LAYERS.flyer).toBe(50);
  });
  it('both yards play the shared moment and the old lift-and-fade / invisible latch are gone', () => {
    const obj = src('src/game/ObjectYardScene.ts');
    const old = src('src/game/ScrewScene.ts');
    expect(obj).toMatch(/this\.moment\.play\(/);
    expect(old).toMatch(/this\.moment\.play\(/);
    expect(obj).not.toMatch(/latchBox/);
    expect(old).not.toMatch(/boxDone/);
  });
  it('the latch shake obeys SCREEN SHAKE: none when OFF, a gentler one on SOFT', () => {
    expect(shakeSpec('boxLatch', 'off')).toBeNull();
    const full = shakeSpec('boxLatch', 'full')!;
    const soft = shakeSpec('boxLatch', 'soft')!;
    expect(soft.amp).toBeLessThan(full.amp);
    expect(full.amp).toBeLessThan(0.004); // a nudge, not a hit
  });
  it('perf: the moment redraws no Graphics per frame (transforms only)', () => {
    const fx = src('src/game/fx/boxMomentFx.ts');
    const apply = fx.slice(fx.indexOf('private apply('), fx.indexOf('private finish('));
    expect(apply).not.toMatch(/\.clear\(|fillStyle|fillRounded|lineStyle|generateTexture/);
  });
});
