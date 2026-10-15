/** QA panel geometry (pure, so a test can check no two things overlap and every row is reachable).
 *  All values are design px (the stage is 720 wide: 1 phone pt = 1.85 px on a 390 phone, 2 px on a 360 phone).
 *  x is absolute; y is measured from the sheet top. */
import { W } from '../sceneKit';

/** The pinned header (QA TOOLS title, subtitle, BACK) takes this much; the sections scroll under it. */
export const QA_HEADER = 150;
/** Sections start this far under the header. */
export const QA_BODY_PAD = 14;
/** Gap between the sheet and the screen edge. */
export const QA_SCREEN_MARGIN = 30;
/** Content column: left edge and width (inside the sheet, which spans x 46..674). */
export const QA_X0 = 70;
export const QA_W = W - 2 * QA_X0;
/** One-line row height (48 pt on a 390 phone), the gap between rows, a section header's height, the gap between sections. */
export const QA_ROW_H = 90;
export const QA_ROW_GAP = 8;
export const QA_SEC_H = 88;
export const QA_SEC_GAP = 14;
/** Hit height of every control (44 pt on a 360 pt-wide phone); the drawn control is QA_CTRL_H tall inside it. */
export const QA_TAP = 88;
export const QA_CTRL_H = 66;
/** Inner padding of a row card. */
export const QA_PAD = 16;
/** Grid cells (unit batches): two columns. */
export const QA_CELL_H = 124;
export const QA_CELL_GAP = 12;
/** Room under the last section. */
export const QA_END_PAD = 30;

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}
/** What a part of a row is. 'hit' parts (a whole grid cell) contain the others; every other part must stay clear of every other part. */
export type PartRole = 'title' | 'desc' | 'names' | 'pill' | 'control' | 'label' | 'hit' | 'help';
export interface Part {
  role: PartRole;
  rect: Rect;
  /** Which control of the row it is (option index, cell index, ...). */
  i?: number;
}
export type QaRowKind = 'action' | 'switch' | 'segment' | 'grid' | 'stepper' | 'chips' | 'guideTop' | 'guide' | 'note' | 'preset';
/** What the layout needs to know about a row (the draw code lives in qaPanel / qaKit). */
export interface QaRowSpec {
  id: string;
  kind: QaRowKind;
  hasDesc: boolean;
  /** segment: number of options; grid: number of cells; chips: number of buttons. */
  count?: number;
  /** action: button width. */
  ctrlW?: number;
  /** QA PANEL V2: a "?" tap target at the left of the title line (action / switch / segment / stepper rows). */
  help?: boolean;
}
export interface RowLayout {
  id: string;
  kind: QaRowKind;
  rect: Rect;
  parts: Part[];
}
export interface SectionLayout {
  id: string;
  header: Rect;
  /** Chevron and title inside the header. */
  parts: Part[];
  /** Empty while collapsed. */
  rows: RowLayout[];
  rect: Rect;
}

/** Segmented controls with at most this many options sit beside the title; more go on their own line under it. */
export const QA_INLINE_SEGMENTS = 2;
export const QA_SWITCH_W = 150;
export const QA_ACTION_W = 200;
export const QA_SEGMENT_INLINE_W = 300;
/** START HERE cards: the RESET ALL button, and the width of the WHAT TO DO / LOOK FOR tags. */
export const QA_GUIDE_RESET_W = 230;
export const QA_GUIDE_TAG_W = 112;

const R = (x: number, y: number, w: number, h: number): Rect => ({ x, y, w, h });
const innerX = QA_X0 + QA_PAD;
const innerW = QA_W - 2 * QA_PAD;

/** QA PANEL V2: the "?" button column at the left of a row (88 design px = 44 pt on a 360 pt phone). */
export const QA_HELP_W = 88;
/** QA PANEL V2: a note row's line height, a preset row's height and button width. */
export const QA_NOTE_LINE = 28;
export const QA_PRESET_H = 210;
export const QA_PRESET_BTN_W = 190;

/** Title (and the optional description under it) in a column `w` wide, in a block `h` tall starting at `y`, from x `x0`. */
function textParts(y: number, h: number, w: number, hasDesc: boolean, x0 = innerX): Part[] {
  const title = hasDesc ? R(x0, y + 8, w, 34) : R(x0, y + (h - 34) / 2, w, 34);
  const parts: Part[] = [{ role: 'title', rect: title }];
  if (hasDesc) parts.push({ role: 'desc', rect: R(x0, y + 46, w, 28) });
  return parts;
}

export function layoutRow(spec: QaRowSpec, y: number): RowLayout {
  const parts: Part[] = [];
  let h = QA_ROW_H;
  // the "?" column: the title column starts after it and loses its width
  const hw = spec.help ? QA_HELP_W : 0;
  const x0 = innerX + hw;
  if (spec.help) parts.push({ role: 'help', rect: R(innerX, y + (QA_ROW_H - QA_TAP) / 2, QA_HELP_W - 8, QA_TAP) });
  const inline = (ctrlW: number) => {
    const textW = QA_W - 3 * QA_PAD - ctrlW - hw;
    parts.push(...textParts(y, QA_ROW_H, textW, spec.hasDesc, x0));
    parts.push({ role: 'control', rect: R(QA_X0 + QA_W - QA_PAD - ctrlW, y + (QA_ROW_H - QA_TAP) / 2, ctrlW, QA_TAP) });
  };
  switch (spec.kind) {
    case 'action':
      inline(spec.ctrlW ?? QA_ACTION_W);
      break;
    case 'switch':
      inline(QA_SWITCH_W);
      break;
    case 'segment': {
      const n = spec.count ?? 2;
      if (n <= QA_INLINE_SEGMENTS) {
        parts.push(...textParts(y, QA_ROW_H, QA_W - 3 * QA_PAD - QA_SEGMENT_INLINE_W - hw, spec.hasDesc, x0));
        const sw = QA_SEGMENT_INLINE_W / n;
        for (let i = 0; i < n; i++) parts.push({ role: 'control', i, rect: R(QA_X0 + QA_W - QA_PAD - QA_SEGMENT_INLINE_W + i * sw, y + (QA_ROW_H - QA_TAP) / 2, sw, QA_TAP) });
        break;
      }
      parts.push(...textParts(y, QA_ROW_H, innerW - hw, spec.hasDesc, x0));
      const sw = innerW / n;
      for (let i = 0; i < n; i++) parts.push({ role: 'control', i, rect: R(innerX + i * sw, y + QA_ROW_H, sw, QA_TAP) });
      h = QA_ROW_H + QA_TAP + 4;
      break;
    }
    case 'chips': {
      const n = spec.count ?? 1;
      const gap = 8;
      const cw = (innerW - gap * (n - 1)) / n;
      for (let i = 0; i < n; i++) parts.push({ role: 'control', i, rect: R(innerX + i * (cw + gap), y + (QA_ROW_H - QA_TAP) / 2, cw, QA_TAP) });
      break;
    }
    case 'stepper': {
      // title line, then -10 -1 [level] +1 +10, then GO
      parts.push(...textParts(y, QA_ROW_H, innerW - hw, spec.hasDesc, x0));
      const sy = y + QA_ROW_H;
      const bw = 96, gap = 6, numW = innerW - 4 * bw - 4 * gap;
      let x = innerX;
      [-10, -1].forEach((_, i) => {
        parts.push({ role: 'control', i, rect: R(x, sy, bw, QA_TAP) });
        x += bw + gap;
      });
      parts.push({ role: 'label', rect: R(x, sy, numW, QA_TAP) });
      x += numW + gap;
      [1, 10].forEach((_, i) => {
        parts.push({ role: 'control', i: i + 2, rect: R(x, sy, bw, QA_TAP) });
        x += bw + gap;
      });
      parts.push({ role: 'control', i: 4, rect: R(innerX, sy + QA_TAP + QA_ROW_GAP, innerW, QA_TAP) });
      h = QA_ROW_H + 2 * QA_TAP + QA_ROW_GAP + 4;
      break;
    }
    case 'guideTop': {
      // "Tested 3 of 8" + the reset button on one line, the build line under it
      const rw = QA_GUIDE_RESET_W;
      parts.push({ role: 'title', rect: R(innerX, y + 28, innerW - rw - QA_PAD, 34) });
      parts.push({ role: 'control', rect: R(innerX + innerW - rw, y + 1, rw, QA_TAP) });
      parts.push({ role: 'desc', rect: R(innerX, y + QA_ROW_H + 4, innerW, 28) });
      h = QA_ROW_H + 44;
      break;
    }
    case 'guide': {
      // number + title, WHAT TO DO, LOOK FOR (each: a tag, then up to two lines), the big START, then YES / NOT RIGHT
      const tagW = QA_GUIDE_TAG_W, lineW = innerW - tagW - 8;
      parts.push({ role: 'title', rect: R(innerX, y + 12, innerW, 40) });
      parts.push({ role: 'label', i: 0, rect: R(innerX, y + 62, tagW, 28) });
      parts.push({ role: 'desc', i: 0, rect: R(innerX + tagW + 8, y + 62, lineW, 56) });
      parts.push({ role: 'label', i: 1, rect: R(innerX, y + 128, tagW, 28) });
      parts.push({ role: 'desc', i: 1, rect: R(innerX + tagW + 8, y + 128, lineW, 56) });
      parts.push({ role: 'control', i: 0, rect: R(innerX, y + 196, innerW, QA_TAP) });
      const aw = (innerW - 12) / 2;
      parts.push({ role: 'control', i: 1, rect: R(innerX, y + 196 + QA_TAP + 12, aw, QA_TAP) });
      parts.push({ role: 'control', i: 2, rect: R(innerX + aw + 12, y + 196 + QA_TAP + 12, aw, QA_TAP) });
      h = 196 + 2 * QA_TAP + 12 + QA_PAD;
      break;
    }
    case 'note': {
      // a wrapped text block of `count` lines
      const lines = spec.count ?? 1;
      parts.push({ role: 'desc', rect: R(innerX, y + 12, innerW, lines * QA_NOTE_LINE) });
      h = lines * QA_NOTE_LINE + 24;
      break;
    }
    case 'preset': {
      // title + the big SET button on one line, then up to 3 wrapped lines (what it does, what to look at)
      parts.push({ role: 'title', rect: R(innerX, y + 14, innerW - QA_PRESET_BTN_W - 12, 34) });
      parts.push({ role: 'control', rect: R(innerX + innerW - QA_PRESET_BTN_W, y + 4, QA_PRESET_BTN_W, QA_TAP) });
      parts.push({ role: 'desc', rect: R(innerX, y + 96, innerW, QA_PRESET_H - 96 - 10) });
      h = QA_PRESET_H;
      break;
    }
    case 'grid': {
      const n = spec.count ?? 0;
      const cw = (QA_W - QA_CELL_GAP) / 2;
      for (let i = 0; i < n; i++) {
        const cx = QA_X0 + (i % 2) * (cw + QA_CELL_GAP);
        const cy = y + Math.floor(i / 2) * (QA_CELL_H + QA_CELL_GAP);
        parts.push({ role: 'hit', i, rect: R(cx, cy, cw, QA_CELL_H) });
        parts.push({ role: 'title', i, rect: R(cx + 14, cy + 10, cw - 28 - 96, 34) });
        parts.push({ role: 'pill', i, rect: R(cx + cw - 14 - 84, cy + 10, 84, 40) });
        parts.push({ role: 'names', i, rect: R(cx + 14, cy + 58, cw - 28, 52) });
      }
      h = Math.ceil(n / 2) * QA_CELL_H + Math.max(0, Math.ceil(n / 2) - 1) * QA_CELL_GAP;
      break;
    }
  }
  return { id: spec.id, kind: spec.kind, rect: R(QA_X0, y, QA_W, h), parts };
}

export interface PanelLayout {
  sections: SectionLayout[];
  /** Bottom of the last section, from the sheet top. */
  contentBottom: number;
  panelH: number;
  bodyTop: number;
  bodyBottom: number;
  /** Most negative scroll offset (0 = top). */
  minScroll: number;
}

/** Lay the whole panel out: collapsed sections keep only their header. The sheet always fills the screen (it must not jump when a section opens). */
export function layoutPanel(sections: readonly { id: string; rows: readonly QaRowSpec[] }[], collapsed: ReadonlySet<string>, screenH: number): PanelLayout {
  let y = QA_HEADER + QA_BODY_PAD;
  const out: SectionLayout[] = [];
  for (const s of sections) {
    const top = y;
    const header = R(QA_X0, y, QA_W, QA_SEC_H);
    const parts: Part[] = [
      { role: 'title', rect: R(QA_X0 + QA_PAD, y + (QA_SEC_H - 40) / 2, QA_W - 3 * QA_PAD - 40, 40) },
      { role: 'control', rect: R(QA_X0 + QA_W - QA_PAD - 40, y + (QA_SEC_H - 40) / 2, 40, 40) },
    ];
    y += QA_SEC_H;
    const rows: RowLayout[] = [];
    if (!collapsed.has(s.id)) {
      y += QA_ROW_GAP;
      for (const spec of s.rows) {
        const row = layoutRow(spec, y);
        rows.push(row);
        y += row.rect.h + QA_ROW_GAP;
      }
      y -= QA_ROW_GAP;
    }
    out.push({ id: s.id, header, parts, rows, rect: R(QA_X0, top, QA_W, y - top) });
    y += QA_SEC_GAP;
  }
  const contentBottom = y - QA_SEC_GAP;
  const panelH = screenH - 2 * QA_SCREEN_MARGIN;
  const bodyBottom = panelH - 14;
  return { sections: out, contentBottom, panelH, bodyTop: QA_HEADER, bodyBottom, minScroll: Math.min(0, bodyBottom - contentBottom - QA_END_PAD) };
}

/** Is `r` (sheet-top y) fully inside the window at some scroll offset in [minScroll, 0]? */
export function qaReachable(l: PanelLayout, r: Rect): boolean {
  const lo = Math.max(l.minScroll, l.bodyTop - r.y);
  const hi = Math.min(0, l.bodyBottom - (r.y + r.h));
  return lo <= hi;
}

export const rectsOverlap = (a: Rect, b: Rect) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
export const rectInside = (a: Rect, outer: Rect, eps = 0.001) => a.x >= outer.x - eps && a.y >= outer.y - eps && a.x + a.w <= outer.x + outer.w + eps && a.y + a.h <= outer.y + outer.h + eps;
