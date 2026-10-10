/** QA panel geometry (pure, so a test can check every row is reachable). All y values are px from the sheet top. */
/** The pinned header (QA TOOLS title, subtitle, BACK) takes this much; the rows scroll under it. */
export const QA_HEADER = 150;
/** First row anchor, measured from the sheet top (rows start 35 px under the header). */
export const QA_FIRST_Y = 185;
/** Room under the last row anchor for its buttons and the sheet's bottom edge. */
export const QA_END_PAD = 110;
/** Rows may extend this far above their anchor (title text) and below it (buttons) beyond the anchor itself. */
export const QA_ROW_UP = 30;
/** Gap between the sheet and the screen edge. */
export const QA_SCREEN_MARGIN = 30;

export interface QaGeometry {
  /** Sheet height. */
  panelH: number;
  /** Visible rows window, from the sheet top. */
  bodyTop: number;
  bodyBottom: number;
  /** Total rows height, from the sheet top. */
  contentBottom: number;
  /** Most negative scroll offset (0 = top). */
  minScroll: number;
  /** Anchor y of each row at scroll 0. */
  anchors: number[];
}

export function qaGeometry(rowHeights: readonly number[], screenH: number): QaGeometry {
  const anchors: number[] = [];
  let y = QA_FIRST_Y;
  for (const h of rowHeights) {
    anchors.push(y);
    y += h;
  }
  const contentBottom = y + QA_END_PAD;
  const panelH = Math.min(screenH - 2 * QA_SCREEN_MARGIN, contentBottom);
  const bodyTop = QA_HEADER;
  const bodyBottom = panelH - 14;
  return { panelH, bodyTop, bodyBottom, contentBottom, minScroll: -Math.max(0, contentBottom - 14 - bodyBottom), anchors };
}

/** Is row `i` (anchor + its reach) fully inside the window at some scroll offset in [minScroll, 0]? */
export function qaRowReachable(g: QaGeometry, i: number, rowH: number, reach = 55): boolean {
  const top = g.anchors[i] - QA_ROW_UP;
  const bottom = g.anchors[i] + Math.max(rowH, reach) + 43;
  const lo = Math.max(g.minScroll, g.bodyTop - top);
  const hi = Math.min(0, g.bodyBottom - bottom);
  return lo <= hi;
}
