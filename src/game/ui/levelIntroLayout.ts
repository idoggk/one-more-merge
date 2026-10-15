/** Level intro popup (UI kit v3) geometry and copy rules: pure, so a test can check that nothing overlaps on any phone.
 *  Design px, stage 720 wide, x/y absolute (y from the top of the stage). One phone pt = 720 / phone width px (1.85 on a 390 phone, 2 on a 360 phone).
 *  Every size lives in INTRO_CFG: change the look there, not in the drawing code. */
import { W } from '../sceneKit';
import type { Rect } from './qaLayout';

export const INTRO_CFG = {
  /** Gap between the stack and the screen edge (top and bottom). */
  margin: 36,
  /** Panel side inset. */
  side: 28,
  /** Inside the panel: side padding, padding under the ribbon, padding under PLAY, gap between rows. */
  pad: 30,
  padTop: 76,
  padBottom: 24,
  gap: 12,
  /** Title ribbon: width, height, and how far it hangs into the panel. */
  ribbonW: 440,
  ribbonH: 140,
  ribbonOverlap: 80,
  /** The hero picture takes at least this share of the panel height (the readable headings and 30 px text cost room on a 360x640 phone). */
  heroFrac: 0.25,
  /** Smallest text anywhere in the popup: 16 pt on a 390 pt phone = 16 * 720 / 390 design px. */
  minFont: 30,
  /** Row headings and the one-line hint under the tool row (height of each line). */
  headH: 38,
  hintH: 36,
  heroMax: 520,
  /** Name + clock row. */
  nameH: 54,
  clockW: 150,
  /** Minion chips (square) and the most shown. */
  minionChip: 100,
  minionGap: 14,
  maxMinions: 4,
  /** Two lines of explanation (font px, line height px, chars that fit one line). */
  textFont: 30,
  textLine: 38,
  textChars: 36,
  textLines: 2,
  /** Tool chips: a picture on top and the name on its own plate below (width is shared out over the row, at most toolChip). */
  toolChip: 96,
  toolH: 132,
  toolPlateH: 40,
  toolGap: 8,
  maxTools: 5,
  /** Longest tool name on a plate, in characters, at minFont. */
  toolLabelChars: 7,
  /** Star goals strip and the optional pill, both inside the hero picture. */
  tagW: 200,
  tagH: 46,
  closeSize: 88,
  starsH: 64,
  extraH: 58,
  /** PLAY (the kit's green). 112 design px = 56 pt on a 360 pt phone. */
  playH: 112,
  playW: 520,
  /** Jumpstart card under the panel; the toggle is the hit target. */
  jumpH: 124,
  jumpGap: 18,
  toggleW: 150,
  toggleH: 96,
} as const;

export type IntroKind = 'normal' | 'mini' | 'boss';

export interface IntroInput {
  /** Phone-shaped stage height (sceneKit H). */
  H: number;
  minions: number;
  tools: number;
  hasText: boolean;
  hasJump: boolean;
  hasExtra: boolean;
  /** MINI-BOSS / BOSS / HARD / NEW! pill at the top right of the hero. */
  hasTag: boolean;
}
export interface IntroLayout {
  ribbon: Rect;
  panel: Rect;
  hero: Rect;
  stars: Rect;
  extra: Rect | null;
  tag: Rect | null;
  close: Rect;
  name: Rect;
  clock: Rect;
  minions: Rect[];
  text: Rect | null;
  minionHead: Rect | null;
  toolHead: Rect | null;
  toolHint: Rect | null;
  tools: Rect[];
  play: Rect;
  jump: Rect | null;
  toggle: Rect | null;
  heroFrac: number;
}

const C = INTRO_CFG;

/** A row of `n` equal squares centred in the panel inner width. */
function row(n: number, size: number, gap: number, y: number): Rect[] {
  const total = n * size + (n - 1) * gap;
  const x0 = W / 2 - total / 2;
  return Array.from({ length: n }, (_, i) => ({ x: x0 + i * (size + gap), y, w: size, h: size }));
}

export function layoutIntro(inp: IntroInput): IntroLayout {
  const minions = Math.min(inp.minions, C.maxMinions);
  const tools = Math.min(inp.tools, C.maxTools);
  const above = C.ribbonH - C.ribbonOverlap;
  const jumpSpace = inp.hasJump ? C.jumpH + C.jumpGap : 0;
  const avail = inp.H - 2 * C.margin - above - jumpSpace;
  // everything in the panel except the hero
  const fixed =
    C.padTop + C.nameH + C.gap + (minions ? C.headH + C.minionChip + C.gap : 0) + (inp.hasText ? C.textLine * C.textLines + C.gap : 0) + (tools ? C.headH + C.toolH + C.hintH + C.gap : 0) + C.playH + C.padBottom;
  const panelH = Math.min(avail, fixed + C.heroMax);
  const heroH = panelH - fixed;
  // tall phones: centre the whole stack
  const lead = Math.max(0, avail - panelH) / 2;
  const ribbonY = C.margin + lead;
  const panelY = ribbonY + above;
  const panel: Rect = { x: C.side, y: panelY, w: W - 2 * C.side, h: panelH };
  const innerX = panel.x + C.pad;
  const innerW = panel.w - 2 * C.pad;
  let y = panelY + C.padTop;
  const hero: Rect = { x: innerX, y, w: innerW, h: heroH };
  y += heroH + C.gap;
  const name: Rect = { x: innerX, y, w: innerW - C.clockW - C.gap, h: C.nameH };
  const clock: Rect = { x: innerX + innerW - C.clockW, y, w: C.clockW, h: C.nameH };
  y += C.nameH + C.gap;
  const minionHead: Rect | null = minions ? { x: innerX, y, w: innerW, h: C.headH } : null;
  if (minions) y += C.headH;
  const minionRects = minions ? row(minions, C.minionChip, C.minionGap, y) : [];
  if (minions) y += C.minionChip + C.gap;
  const text: Rect | null = inp.hasText ? { x: innerX, y, w: innerW, h: C.textLine * C.textLines } : null;
  if (inp.hasText) y += C.textLine * C.textLines + C.gap;
  const toolHead: Rect | null = tools ? { x: innerX, y, w: innerW, h: C.headH } : null;
  if (tools) y += C.headH;
  const toolW = tools ? Math.min(C.toolChip + 20, Math.floor((innerW - (tools - 1) * C.toolGap) / tools)) : 0;
  const toolRects = tools ? Array.from({ length: tools }, (_, i) => ({ x: W / 2 - (tools * toolW + (tools - 1) * C.toolGap) / 2 + i * (toolW + C.toolGap), y, w: toolW, h: C.toolH })) : [];
  if (tools) y += C.toolH;
  const toolHint: Rect | null = tools ? { x: innerX, y, w: innerW, h: C.hintH } : null;
  if (tools) y += C.hintH + C.gap;
  const play: Rect = { x: W / 2 - C.playW / 2, y, w: C.playW, h: C.playH };
  const jumpY = panelY + panelH + C.jumpGap;
  const jump: Rect | null = inp.hasJump ? { x: C.side, y: jumpY, w: W - 2 * C.side, h: C.jumpH } : null;
  return {
    ribbon: { x: W / 2 - C.ribbonW / 2, y: ribbonY, w: C.ribbonW, h: C.ribbonH },
    panel,
    hero,
    stars: { x: hero.x + 12, y: hero.y + hero.h - C.starsH - 10, w: hero.w - 24, h: C.starsH },
    extra: inp.hasExtra ? { x: hero.x + 12, y: hero.y + 10, w: hero.w - 24 - (inp.hasTag ? C.tagW + 12 : 0), h: C.extraH } : null,
    tag: inp.hasTag ? { x: hero.x + hero.w - 12 - C.tagW, y: hero.y + 10, w: C.tagW, h: C.tagH } : null,
    close: { x: panel.x + panel.w - C.closeSize, y: panelY - C.closeSize / 2, w: C.closeSize, h: C.closeSize },
    name,
    clock,
    minions: minionRects,
    text,
    minionHead,
    toolHead,
    toolHint,
    tools: toolRects,
    play,
    jump,
    toggle: jump ? { x: jump.x + jump.w - C.toggleW - 18, y: jump.y + (jump.h - C.toggleH) / 2, w: C.toggleW, h: C.toggleH } : null,
    heroFrac: heroH / panelH,
  };
}

/** The first sentence of a hint ("Empty portals let you move a machine across the board." from a long paragraph). */
export function firstSentence(t: string): string {
  const one = t.replace(/\s+/g, ' ').trim();
  const m = /^(.+?[.!?])(\s|$)/.exec(one);
  return (m ? m[1] : one).replace(/\.$/, '');
}

/** At most `lines` lines of `chars` characters, broken at spaces, with an ellipsis when cut. */
export function clampLines(t: string, chars: number, lines: number): string[] {
  const out: string[] = [];
  let cur = '';
  const words = t.replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    const next = cur ? `${cur} ${w}` : w;
    if (next.length <= chars) {
      cur = next;
      continue;
    }
    out.push(cur);
    cur = w.length > chars ? w.slice(0, chars - 1) + '…' : w;
    if (out.length === lines) break;
  }
  if (out.length < lines && cur) out.push(cur);
  const used = out.join(' ').length;
  if (out.length >= lines && used < words.join(' ').length) {
    const last = out[lines - 1].slice(0, Math.max(1, chars - 1)).replace(/[ ,;:]+$/, '');
    out[lines - 1] = `${last}…`;
  }
  return out.slice(0, lines);
}

/** Plain-words copy of the two unit rows. Row 1 = the level's own machine waves (shown in the order they come); row 2 = the "GOOD HERE" tips:
 *  owned units that suit this level. Row 2 is advice only: nothing is picked for the player and nothing has to be used. */
export const INTRO_COPY = {
  minions: "Machines you'll break, in order",
  tools: 'Good here: your units that help',
  toolsHint: 'Tips only. Use any units you like.',
} as const;

const SHORT_TOOL: Record<string, string> = { BLOWTORCH: 'TORCH', WRECKING: 'WRECK', HYDRAULIC: 'PRESS', 'ARC WELDER': 'WELDER', 'FUSE BOX': 'FUSE' };

/** A tool name that fits its plate (max chars at the minimum font): a known short form, else the last or first word that fits, else cut. */
export function shortToolLabel(name: string, max: number = C.toolLabelChars): string {
  const up = name.trim().toUpperCase();
  if (up.length <= max) return up;
  if (SHORT_TOOL[up]) return SHORT_TOOL[up];
  const words = up.split(' ');
  const first = words[0];
  if (SHORT_TOOL[first]) return SHORT_TOOL[first];
  if (first.length <= max) return first;
  return first.slice(0, max);
}

/** The three star goals as the strip shows them: 'Clear', then two clock times (the drawing puts a stopwatch glyph before them). */
export function starGoalLabels(g2: number, g3: number, fmt: (sec: number) => string): { text: string; clock: boolean }[] {
  return [{ text: 'Clear', clock: false }, { text: fmt(g2), clock: true }, { text: fmt(g3), clock: true }];
}

/** Parse a "GOOD HERE: WRENCH (why), BLAST PLATE (why)" line into tool chips: a name, a 1-word label and the full line for the tap. */
export function parseTools(good: string, max: number = C.maxTools): { name: string; label: string; full: string }[] {
  const body = good.replace(/^GOOD HERE:\s*/, '');
  const out: { name: string; label: string; full: string }[] = [];
  const re = /([A-Z][A-Z0-9' -]*?)\s*\(([^)]*)\)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body)) && out.length < max) {
    const name = m[1].trim();
    out.push({ name, label: name.split(' ')[0], full: `${name}: ${m[2]}` });
  }
  return out;
}
