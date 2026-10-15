import type Phaser from 'phaser';
import { sfx, startMusic, unlockAudio } from '../audio';
import type { GameScene } from '../GameScene';
import type { GuideAnswer, GuideTest } from './qaGuide';
import { QA_ACTION_W, QA_CTRL_H, QA_INLINE_SEGMENTS, type Part, type QaRowSpec, type Rect, type RowLayout, type SectionLayout } from './qaLayout';

/** QA panel widgets and row builders (no game rules in here). The geometry is qaLayout.ts; the rows live in qaPanel.ts.
 *  A new flag is one qaFlag({...}) line, a new multi-choice setting one qaChoice({...}) line. */

export const QA_FONT = 'Lilita One, Arial Black';
/** The game's own UI colours (panel cream, ink, brown, green, amber). */
export const QA_INK = 0x2b1d2e;
export const GREEN = 0x5fbf4a;
export const AMBER = 0xd9a441;
export const BROWN = 0x8a6a4a;
export const OFF_GREY = 0xb5a48c;

/** What a QA row draws into: the scrolling list, plus the level picked in JUMP TO LEVEL (kept when the panel reopens). */
export interface QaCtx {
  scene: GameScene;
  c: Phaser.GameObjects.Container;
  /** Sheet top: layout y values are relative to it. */
  oy: number;
  jump: number;
  /** QA PANEL V2 only: the short label a row draws instead of its own title / description (set around one row's draw). */
  label?: { title: string; desc?: string };
  save: () => void;
  /** Redraw the panel (after a switch changes), keeping the picked level, the scroll and the open sections. */
  reopen: () => void;
}
export type QaText = string | (() => string);
export const qaText = (t: QaText | undefined) => (typeof t === 'function' ? t() : t ?? '');

/** One panel row: `spec` is what the layout needs, `draw` paints it into the rects `layout` gives. */
export interface QaRow {
  spec: QaRowSpec;
  title: string;
  desc?: QaText;
  draw: (q: QaCtx, layout: RowLayout) => void;
  /** Put the setting back to its default (flags: off; multi-choice: its `def`). Absent = the row is not a resettable setting. */
  reset?: (q: QaCtx) => void;
  /** Set the setting to `v` (true / false for a flag, an option id for a multi-choice), as a tap would, without the toast. */
  apply?: (v: boolean | string, q: QaCtx) => void;
  /** The setting's current value as a string (flags: 'true' / 'false' / 'mixed'; multi-choice: the option id). Only on resettable settings. */
  read?: (q: QaCtx) => string;
  /** The default `read` returns after RESET ALL. */
  def?: string;
}
export interface QaSection {
  id: string;
  title: string;
  rows: QaRow[];
}

// ---------- drawing helpers ----------

const cx = (r: Rect) => r.x + r.w / 2;
const cy = (q: QaCtx, r: Rect) => r.y + q.oy + r.h / 2;
export const part = (l: RowLayout, role: Part['role'], i?: number) => l.parts.find((p) => p.role === role && (i === undefined || p.i === i))?.rect as Rect;
const parts = (l: RowLayout, role: Part['role']) => l.parts.filter((p) => p.role === role);

/** Shrink a text to fit `maxW` (long labels shrink, they never overflow). */
export function fitText(t: Phaser.GameObjects.Text, maxW: number) {
  t.setScale(t.width > maxW ? maxW / t.width : 1);
  return t;
}
export const setFitText = (t: Phaser.GameObjects.Text, str: string, maxW: number) => fitText(t.setText(str), maxW);

/** Left-aligned text centred vertically in `r`, shrunk to fit its width. */
export function textIn(q: QaCtx, r: Rect, str: string, font: string, size: number, color: string, extra: Phaser.Types.GameObjects.Text.TextStyle = {}) {
  const t = q.scene.add.text(r.x, r.y + q.oy + r.h / 2, str, { fontFamily: font, fontSize: `${size}px`, color, ...extra }).setOrigin(0, 0.5);
  q.c.add(fitText(t, r.w));
  return t;
}

/** The pressable control: an interactive container as tall as the hit rect, with the visuals drawn around its centre. */
export function control(q: QaCtx, r: Rect, onTap: () => void) {
  const { scene } = q;
  const ctl = scene.add.container(cx(r), cy(q, r)).setSize(r.w, r.h).setInteractive({ useHandCursor: true });
  ctl.on('pointerdown', () => {
    unlockAudio();
    startMusic();
    sfx.click();
    ctl.setScale(0.96);
  });
  ctl.on('pointerout', () => ctl.setScale(1));
  ctl.on('pointerup', () => {
    ctl.setScale(1);
    onTap();
  });
  q.c.add(ctl);
  return ctl;
}

export const card = (q: QaCtx, r: Rect, fill = 0xfff6e6) => {
  const g = q.scene.add.graphics().fillStyle(fill, 1).fillRoundedRect(r.x, r.y + q.oy, r.w, r.h, 22).lineStyle(2, 0xd9bf94, 1).strokeRoundedRect(r.x, r.y + q.oy, r.w, r.h, 22);
  q.c.add(g);
};

const checkMark = (g: Phaser.GameObjects.Graphics, x: number, y: number, color = 0xffffff) => {
  g.lineStyle(5, color, 1).beginPath().moveTo(x - 9, y).lineTo(x - 3, y + 7).lineTo(x + 9, y - 7).strokePath();
};

/** A pill button inside a control's centre (`w` wide, QA_CTRL_H tall): the label shrinks to fit. */
export function pill(q: QaCtx, ctl: Phaser.GameObjects.Container, w: number, label: string, color: number, fontSize = 28) {
  const g = q.scene.add.graphics().fillStyle(QA_INK, 1).fillRoundedRect(-w / 2, -QA_CTRL_H / 2, w, QA_CTRL_H, 24).fillStyle(color, 1).fillRoundedRect(-w / 2 + 4, -QA_CTRL_H / 2 + 3, w - 8, QA_CTRL_H - 10, 20);
  const t = q.scene.add.text(0, -2, label, { fontFamily: QA_FONT, fontSize: `${fontSize}px`, color: '#fff', stroke: '#2b1d2e', strokeThickness: 5 }).setOrigin(0.5);
  fitText(t, w - 28);
  ctl.add([g, t]);
  return t;
}

export type SwitchState = 'on' | 'off' | 'mixed';
/** The pill toggle: a track with the knob on the ON side, a clear ON / OFF word and colour (amber MIXED for a partly-on group). */
function drawSwitch(q: QaCtx, ctl: Phaser.GameObjects.Container, w: number, state: SwitchState, h = 56) {
  const colour = state === 'on' ? GREEN : state === 'mixed' ? AMBER : OFF_GREY;
  const word = state === 'on' ? 'ON' : state === 'mixed' ? 'MIXED' : 'OFF';
  const knobX = state === 'on' ? w / 2 - h / 2 : state === 'mixed' ? 0 : -w / 2 + h / 2;
  const g = q.scene.add.graphics().fillStyle(QA_INK, 1).fillRoundedRect(-w / 2, -h / 2, w, h, h / 2).fillStyle(colour, 1).fillRoundedRect(-w / 2 + 4, -h / 2 + 4, w - 8, h - 8, h / 2 - 4);
  g.fillStyle(0xffffff, 1).fillCircle(knobX, 0, h / 2 - 7).lineStyle(3, QA_INK, 1).strokeCircle(knobX, 0, h / 2 - 7);
  const textX = state === 'on' ? -h / 2 + 4 : state === 'off' ? h / 2 - 4 : 0;
  const t = q.scene.add.text(state === 'mixed' ? 0 : textX, state === 'mixed' ? -h / 2 + 11 : 0, word, { fontFamily: QA_FONT, fontSize: `${Math.round(h * (state === 'mixed' ? 0.32 : 0.43))}px`, color: '#fff', stroke: '#2b1d2e', strokeThickness: 4 }).setOrigin(0.5);
  fitText(t, state === 'mixed' ? w - 24 : w - h - 6);
  ctl.add([g, t]);
}

// ---------- row builders ----------

const descOf = (d: QaText | undefined) => qaText(d);
/** Title (and the description under it) of a row, in the title / desc rects. */
function drawText(q: QaCtx, l: RowLayout, title: string, desc?: QaText) {
  if (q.label) {
    title = q.label.title;
    desc = q.label.desc;
  }
  textIn(q, part(l, 'title'), title, QA_FONT, 28, '#3b2533');
  const d = descOf(desc);
  if (d) textIn(q, part(l, 'desc'), d, 'Arial', 20, '#7a5a4a', { fontStyle: 'bold' });
}

interface Base {
  id: string;
  title: string;
  desc?: QaText;
}

/** A one-tap button on the right of the row. `tap` gets the label text so it can change it (the START OVER confirm). */
export function qaAction(o: Base & { label: QaText; color: number; ctrlW?: number; tap: (q: QaCtx, label: Phaser.GameObjects.Text, ctl: Phaser.GameObjects.Container) => void }): QaRow {
  const ctrlW = o.ctrlW ?? QA_ACTION_W;
  return {
    spec: { id: o.id, kind: 'action', hasDesc: !!o.desc, ctrlW },
    title: o.title,
    desc: o.desc,
    draw: (q, l) => {
      card(q, l.rect);
      drawText(q, l, o.title, o.desc);
      const r = part(l, 'control');
      let label!: Phaser.GameObjects.Text;
      const ctl = control(q, r, () => o.tap(q, label, ctl));
      label = pill(q, ctl, r.w - 8, qaText(o.label), o.color, 26);
    },
  };
}

/** An on/off setting: a real switch. `get` is true / false, or 'mixed' for a group that is partly on (tapping it turns the group on). */
export function qaFlag(o: Base & { get: () => boolean | 'mixed'; set: (on: boolean) => void; toast: (on: boolean) => string; defOn?: boolean }): QaRow {
  const state = (): SwitchState => {
    const v = o.get();
    return v === 'mixed' ? 'mixed' : v ? 'on' : 'off';
  };
  return {
    spec: { id: o.id, kind: 'switch', hasDesc: !!o.desc },
    title: o.title,
    desc: o.desc,
    // defOn: a visual-only switch that ships ON; its default (and RESET ALL) is ON
    reset: () => state() !== (o.defOn ? 'on' : 'off') && o.set(!!o.defOn),
    apply: (v) => o.set(!!v),
    read: () => String(o.get()),
    def: String(!!o.defOn),
    draw: (q, l) => {
      card(q, l.rect);
      drawText(q, l, o.title, o.desc);
      const s = state();
      const ctl = control(q, part(l, 'control'), () => {
        const on = s !== 'on';
        o.set(on);
        q.scene.showToast(o.toast(on));
        q.reopen();
      });
      drawSwitch(q, ctl, 128, s);
    },
  };
}

/** A multi-choice setting: a segmented control, the chosen segment filled green with a check mark. */
export function qaChoice<T>(o: Base & { options: readonly { id: T; label: string }[]; current: (q: QaCtx) => T; pick: (id: T, q: QaCtx) => void; toast: (id: T, label: string) => string; /** The default option: RESET ALL puts it back. Leave out for a plain setting that is not a test switch. */ def?: T }): QaRow {
  const n = o.options.length;
  return {
    spec: { id: o.id, kind: 'segment', hasDesc: !!o.desc, count: n },
    title: o.title,
    desc: o.desc,
    reset: o.def === undefined ? undefined : (q) => o.current(q) !== o.def && o.pick(o.def as T, q),
    read: o.def === undefined ? undefined : (q) => String(o.current(q)),
    def: o.def === undefined ? undefined : String(o.def),
    apply: (v, q) => {
      const opt = o.options.find((x) => String(x.id) === v);
      if (!opt) throw new Error(`${o.id}: no option "${String(v)}"`);
      o.pick(opt.id, q);
    },
    draw: (q, l) => {
      card(q, l.rect);
      drawText(q, l, o.title, o.desc);
      const cur = o.current(q);
      const segs = parts(l, 'control');
      const first = segs[0].rect, last = segs[n - 1].rect;
      const track = q.scene.add.graphics();
      const tx = first.x, tw = last.x + last.w - first.x, ty = first.y + q.oy + (first.h - QA_CTRL_H) / 2;
      track.fillStyle(0xe4cfa8, 1).fillRoundedRect(tx, ty, tw, QA_CTRL_H, 22).lineStyle(3, 0xb89a6a, 1).strokeRoundedRect(tx, ty, tw, QA_CTRL_H, 22);
      q.c.add(track);
      o.options.forEach(({ id, label }, i) => {
        const r = segs[i].rect;
        const on = id === cur;
        const ctl = control(q, r, () => {
          o.pick(id, q);
          q.scene.showToast(o.toast(id, label));
          q.reopen();
        });
        const inset = n > QA_INLINE_SEGMENTS ? 5 : 4;
        const g = q.scene.add.graphics();
        if (on) {
          g.fillStyle(QA_INK, 1).fillRoundedRect(-r.w / 2 + inset - 2, -QA_CTRL_H / 2 + inset - 2, r.w - 2 * inset + 4, QA_CTRL_H - 2 * inset + 4, 20);
          g.fillStyle(GREEN, 1).fillRoundedRect(-r.w / 2 + inset, -QA_CTRL_H / 2 + inset, r.w - 2 * inset, QA_CTRL_H - 2 * inset, 18);
        }
        ctl.add(g);
        const reserve = on ? 34 : 0; // room for the check mark
        const t = q.scene.add.text(reserve / 2, 0, label, on ? { fontFamily: QA_FONT, fontSize: '26px', color: '#fff', stroke: '#2b1d2e', strokeThickness: 4 } : { fontFamily: QA_FONT, fontSize: '26px', color: '#6b4a3a' }).setOrigin(0.5);
        fitText(t, r.w - 2 * inset - 12 - reserve);
        ctl.add(t);
        if (on) {
          const ck = q.scene.add.graphics();
          checkMark(ck, -(t.width * t.scaleX) / 2 + reserve / 2 - 20, 0);
          ctl.add(ck);
        }
      });
    },
  };
}

/** A two-column grid of toggle cards (the unit batches): title, the unit names inside the card, a small ON / OFF pill. */
export function qaGrid(o: { id: string; title: string; cells: { title: string; names: string; on: () => boolean; tap: (q: QaCtx) => void }[] }): QaRow {
  return {
    spec: { id: o.id, kind: 'grid', hasDesc: false, count: o.cells.length },
    title: o.title,
    draw: (q, l) => {
      o.cells.forEach((cell, i) => {
        const hit = part(l, 'hit', i), title = part(l, 'title', i), pl = part(l, 'pill', i), names = part(l, 'names', i);
        const on = cell.on();
        const g = q.scene.add.graphics();
        g.fillStyle(on ? 0xe3f4d6 : 0xfff6e6, 1).fillRoundedRect(hit.x, hit.y + q.oy, hit.w, hit.h, 22).lineStyle(on ? 4 : 2, on ? GREEN : 0xd9bf94, 1).strokeRoundedRect(hit.x, hit.y + q.oy, hit.w, hit.h, 22);
        q.c.add(g);
        const ctl = control(q, hit, () => cell.tap(q));
        // the card's own texts live inside its control (positions relative to the card centre)
        const relX = (r: Rect) => r.x - cx(hit), relY = (r: Rect) => r.y + q.oy - cy(q, hit);
        const tt = q.scene.add.text(relX(title), relY(title) + title.h / 2, cell.title, { fontFamily: QA_FONT, fontSize: '28px', color: '#3b2533' }).setOrigin(0, 0.5);
        const nt = q.scene.add.text(relX(names), relY(names), cell.names, { fontFamily: 'Arial', fontStyle: 'bold', fontSize: '19px', color: '#7a5a4a', wordWrap: { width: names.w }, lineSpacing: 2 }).setOrigin(0, 0);
        if (nt.height > names.h) nt.setScale(names.h / nt.height);
        ctl.add([fitText(tt, title.w), nt]);
        const px = cx(pl) - cx(hit), py = pl.y + q.oy + pl.h / 2 - cy(q, hit);
        const sub = q.scene.add.container(px, py);
        ctl.add(sub);
        drawSwitch(q, sub, pl.w, on ? 'on' : 'off', pl.h);
      });
    },
  };
}

/** A strip of equal buttons (the budget level picks). */
export function qaChips(o: { id: string; title: string; labels: () => string[]; color: () => number; dim?: () => boolean; tap: (q: QaCtx, i: number) => void }): QaRow {
  const n = o.labels().length;
  return {
    spec: { id: o.id, kind: 'chips', hasDesc: false, count: n },
    title: o.title,
    draw: (q, l) => {
      card(q, l.rect);
      const labels = o.labels();
      parts(l, 'control').forEach((p, i) => {
        const ctl = control(q, p.rect, () => o.tap(q, i));
        pill(q, ctl, p.rect.w, labels[i], o.color(), 24);
        if (o.dim?.()) ctl.setAlpha(0.55);
      });
    },
  };
}

/** JUMP TO LEVEL: -10 -1 [level] +1 +10, then GO (kept as one row, its own layout). */
export function qaStepper(o: Base & { min: number; max: number; go: (q: QaCtx, level: number) => void }): QaRow {
  const deltas = [-10, -1, 1, 10];
  return {
    spec: { id: o.id, kind: 'stepper', hasDesc: !!o.desc },
    title: o.title,
    desc: o.desc,
    draw: (q, l) => {
      card(q, l.rect);
      drawText(q, l, o.title, o.desc);
      const lab = part(l, 'label');
      const num = q.scene.add.text(cx(lab), cy(q, lab), `${q.jump}`, { fontFamily: QA_FONT, fontSize: '64px', color: '#e8452c' }).setOrigin(0.5);
      fitText(num, lab.w - 8);
      q.c.add(num);
      const set = (d: number) => {
        q.jump = Math.max(o.min, Math.min(o.max, q.jump + d));
        setFitText(num, `${q.jump}`, lab.w - 8);
      };
      deltas.forEach((d, i) => {
        const ctl = control(q, part(l, 'control', i), () => set(d));
        pill(q, ctl, part(l, 'control', i).w, d > 0 ? `+${d}` : `${d}`, BROWN, 28);
      });
      const goR = part(l, 'control', 4);
      const go = control(q, goR, () => o.go(q, q.jump));
      pill(q, go, goR.w, 'GO', GREEN, 32);
    },
  };
}

/** START HERE top row: "Tested 3 of 8", the RESET ALL SWITCHES button, and the "which build am I on" line. */
export function qaGuideTop(o: { progress: () => string; build: () => string; reset: (q: QaCtx) => void }): QaRow {
  return {
    spec: { id: 'guideTop', kind: 'guideTop', hasDesc: true },
    title: 'PROGRESS',
    desc: o.build,
    draw: (q, l) => {
      card(q, l.rect);
      textIn(q, part(l, 'title'), o.progress(), QA_FONT, 34, '#3b2533');
      textIn(q, part(l, 'desc'), o.build(), 'Arial', 20, '#7a5a4a', { fontStyle: 'bold' });
      const r = part(l, 'control');
      const ctl = control(q, r, () => {
        o.reset(q);
        q.scene.showToast('ALL SWITCHES BACK TO NORMAL');
        q.reopen();
      });
      pill(q, ctl, r.w, 'RESET ALL', BROWN, 24);
    },
  };
}

/** One guided test: number + title, WHAT TO DO, LOOK FOR, a big START, then the YES / NOT RIGHT pair (the stored answer is filled). */
export function qaGuideCard(o: { test: GuideTest; answer: () => GuideAnswer | undefined; start: (q: QaCtx) => void; save: (n: number, v: GuideAnswer) => void }): QaRow {
  const t = o.test;
  return {
    spec: { id: `guide${t.n}`, kind: 'guide', hasDesc: true },
    title: t.title,
    desc: t.what,
    draw: (q, l) => {
      const mine = o.answer();
      card(q, l.rect, mine === 'yes' ? 0xeaf6dd : mine === 'no' ? 0xfbe4de : 0xfff6e6);
      textIn(q, part(l, 'title'), `${t.n}  ${t.title.toUpperCase()}`, QA_FONT, 34, '#3b2533');
      for (const [i, tag, text] of [[0, 'WHAT TO DO', t.what], [1, 'LOOK FOR', t.look]] as const) {
        textIn(q, part(l, 'label', i), tag, QA_FONT, 20, i ? '#2b8a3e' : '#b06a1a');
        const r = part(l, 'desc', i);
        const tx = q.scene.add.text(r.x, r.y + q.oy, text, { fontFamily: 'Arial', fontStyle: 'bold', fontSize: '22px', color: '#3b2533', wordWrap: { width: r.w }, lineSpacing: 2 }).setOrigin(0, 0);
        if (tx.height > r.h) tx.setScale(r.h / tx.height);
        q.c.add(tx);
      }
      const sr = part(l, 'control', 0);
      const go = control(q, sr, () => o.start(q));
      pill(q, go, sr.w, 'START', GREEN, 40);
      for (const [i, label, v, color] of [[1, 'YES', 'yes', GREEN], [2, 'NOT RIGHT', 'no', 0xd8261a]] as const) {
        const r = part(l, 'control', i);
        const ctl = control(q, r, () => {
          o.save(t.n, v);
          q.reopen();
        });
        pill(q, ctl, r.w, label, mine === v ? color : OFF_GREY, 28);
      }
    },
  };
}

/** A section header: a full-width bar (the whole bar is the tap target) with the title and a chevron that points down while open. */
export function qaSectionHeader(q: QaCtx, sec: SectionLayout, title: string, open: boolean, toggle: () => void) {
  const h = sec.header;
  const ctl = control(q, h, toggle);
  const g = q.scene.add.graphics().fillStyle(QA_INK, 1).fillRoundedRect(-h.w / 2, -h.h / 2, h.w, h.h, 24).fillStyle(open ? 0x3b2533 : 0x7a5440, 1).fillRoundedRect(-h.w / 2 + 4, -h.h / 2 + 4, h.w - 8, h.h - 12, 20);
  const chev = sec.parts.find((p) => p.role === 'control')!.rect;
  const kx = cx(chev) - cx(h);
  g.fillStyle(0xfff0cf, 1);
  if (open) g.fillTriangle(kx - 14, -8, kx + 14, -8, kx, 10);
  else g.fillTriangle(kx - 8, -14, kx - 8, 14, kx + 10, 0);
  const tr = sec.parts.find((p) => p.role === 'title')!.rect;
  const t = q.scene.add.text(tr.x - cx(h), 0, title, { fontFamily: QA_FONT, fontSize: '32px', color: '#fff0cf' }).setOrigin(0, 0.5);
  ctl.add([g, fitText(t, tr.w)]);
}
