/** Settings screen geometry (pure, so a test can check no two rows overlap and the last button is reachable).
 *  Design px, stage 720 wide. y is measured from the sheet top. Rects are the HIT boxes (what a finger can hit), each at
 *  least TAP_MIN tall for buttons and links. The header (title) is pinned; the rows scroll under it when the sheet is short. */
import { W, TAP_MIN } from '../sceneKit';
import { QA_HEADER, QA_END_PAD, type Rect } from './qaLayout';

/** Gap between the sheet and the screen edge (bigger than the QA panel's: leaves room for the phone's home bar). */
export const SETTINGS_MARGIN = 60;
/** Gap between neighbouring rows. */
export const SETTINGS_GAP = 12;
export const SETTINGS_TOGGLES = 5;
/** A toggle's slot: the drawn pill art is ~108 px tall (taller than its 86 px hit box), so slots keep the art apart. */
const TOGGLE_H = 104;
/** Centre distance from the build label to RELOAD LATEST. */
export const BUILD_LINK_DY = 58;

export type SettingsRowId = 'toggle0' | 'toggle1' | 'toggle2' | 'toggle3' | 'toggle4' | 'caption' | 'copy' | 'paste' | 'playtest' | 'tutorial' | 'qa' | 'back' | 'build' | 'reload';
export interface SettingsRow {
  id: SettingsRowId;
  rect: Rect;
  /** Buttons and links a finger must hit. */
  tappable: boolean;
}
export interface SettingsLayout {
  rows: SettingsRow[];
  /** Centre y of each row by id. */
  cy: Record<SettingsRowId, number>;
  contentBottom: number;
  panelH: number;
  bodyTop: number;
  bodyBottom: number;
  /** Most negative scroll offset (0 = top). */
  minScroll: number;
}

const rect = (cx: number, y: number, w: number, h: number): Rect => ({ x: cx - w / 2, y, w, h });

/** `scale` buttons are drawn at `size`; their hit box is max(86, TAP_MIN / size) * size tall (see GameScene.button). */
const btnH = (size: number) => Math.max(86, TAP_MIN / size) * size;

export function layoutSettings(screenH: number): SettingsLayout {
  const rows: SettingsRow[] = [];
  const cy = {} as Record<SettingsRowId, number>;
  let y = QA_HEADER + SETTINGS_GAP;
  const add = (id: SettingsRowId, cx: number, w: number, h: number, tappable: boolean, sameRow = false, top = y) => {
    rows.push({ id, rect: rect(cx, top, w, h), tappable });
    cy[id] = top + h / 2;
    if (!sameRow) y = top + h + SETTINGS_GAP;
  };
  for (let i = 0; i < SETTINGS_TOGGLES; i++) add(`toggle${i}` as SettingsRowId, W / 2, 460, TOGGLE_H, true);
  add('caption', W / 2, 600, 34, false);
  const top2 = y;
  add('copy', W / 2 - 150, 360 * 0.78, btnH(0.78), true, true, top2);
  add('paste', W / 2 + 150, 360 * 0.78, btnH(0.78), true, false, top2);
  const top3 = y;
  add('playtest', W / 2 - 150, 220, TAP_MIN, true, true, top3);
  add('tutorial', W / 2 + 150, 220, TAP_MIN, true, false, top3);
  add('qa', W / 2, 360 * 0.8, btnH(0.8), true);
  add('back', W / 2, 300 * 0.85, btnH(0.85), true);
  add('build', W / 2, 400, 30, false);
  // RELOAD LATEST: centre BUILD_LINK_DY under the build label's centre
  add('reload', W / 2, 300, TAP_MIN, true, false, cy.build + BUILD_LINK_DY - TAP_MIN / 2);
  const contentBottom = y - SETTINGS_GAP;
  const panelH = Math.min(contentBottom + QA_END_PAD, screenH - 2 * SETTINGS_MARGIN);
  const bodyBottom = panelH - 14;
  return { rows, cy, contentBottom, panelH, bodyTop: QA_HEADER, bodyBottom, minScroll: Math.min(0, bodyBottom - contentBottom - QA_END_PAD) };
}
