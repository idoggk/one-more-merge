// Browser side of tools/render-code-assets.mjs. Boots a minimal Phaser game, imports the game's REAL drawing modules and
// calls them with no painted art loaded (the node tool patches the art glob out of textures.ts in memory), then exposes
// window.__codeAssets for the node side to pull PNGs from. Nothing here re-implements a drawing: textures are read back
// from the texture manager, live Graphics are built by the real classes/functions and snapshotted, and the Screw Yard
// scenes are the real scenes booted in a second Phaser game. Sheet layout (labels, backdrops) is the only code of our own.
import { clock } from './render-code-assets.shim';
import '@fontsource/lilita-one';
import Phaser from 'phaser';
import { MAX_RANK, TUNING } from '../src/content/tuning';
import { applyRoster1, applyRoster2, applyRoster3, applyRoster4, applyRoster5, applyRoster6, applyRoster7, rebuildUnits, ROSTER_1_UNITS, ROSTER_2_UNITS, ROSTER_3_UNITS, ROSTER_4_UNITS, ROSTER_5_UNITS, ROSTER_6_UNITS, ROSTER_7_UNITS, UNITS, type CrateKind, type UnitDef } from '../src/content/units';
import { FAMILY_INFO } from '../src/content/perks';
import { YARD_OBJECTS } from '../src/content/yardObjects';
import { makeGadget, newGame, type GameState } from '../src/core/game';
import { BOSSES } from '../src/core/boss';
import { ATTACK_TINT } from '../src/core/marks';
import { supportNeed } from '../src/core/support';
import { FAMILIES, ROSTER_1, ROSTER_2, ROSTER_3, ROSTER_4, ROSTER_5, ROSTER_6, ROSTER_7, type Family } from '../src/core/types';
import { weekYard } from '../src/core/yardWeek';
import { CELL, SLOT, cellXY, computeLayout, drawAmpMark, drawBossCell, drawPrimeMark, setRenderScale, W as DESIGN_W } from '../src/game/sceneKit';
import { ensureTextures } from '../src/game/textures';
import { toolboxCrateKey } from '../src/game/fx/toolboxCrates';
import { ensureBoxFxTextures } from '../src/game/fx/boxMomentFx';
import { SupportCard } from '../src/game/supportCard';
import { WrenchBadge } from '../src/game/ui/wrenchBadge';
import { CapBadge } from '../src/game/ui/capBadge';
import { CopyBadges } from '../src/game/ui/copyBadge';
import { META_KEY } from '../src/platform/backup';
import { PICTURE_UNITS, rankDecor } from '../src/game/unitArt';
import * as unitsTab from '../src/game/ui/unitsTab';
import { GameScene } from '../src/game/GameScene';
import { ScrewScene, SCREW_COLORS, type YardData } from '../src/game/ScrewScene';
import { ObjectYardScene, type ObjectYardData } from '../src/game/ObjectYardScene';

// ---------------------------------------------------------------------------------------------------------------------
// registry of rendered things
// ---------------------------------------------------------------------------------------------------------------------
const ZOOM = 2;
type Theme = 'board' | 'dark';

interface Item {
  id: string;
  category: string;
  /** The 2x PNG (design size x 2). */
  canvas: HTMLCanvasElement;
  /** Design size (1x). */
  w: number;
  h: number;
  family?: string;
  rank?: number;
  /** Which game module/function drew it. */
  source: string;
  /** True = drawn live on Graphics in a scene and snapshotted; false = the game bakes it to a texture. */
  live: boolean;
  /** True = the game's texture is 1x and the PNG is a 2x smooth upscale of it. */
  upscaled: boolean;
  /** Sheet label (defaults to id). */
  label?: string;
}

interface Group {
  title?: string;
  note?: string;
  items: Item[];
  /** Columns in this group (default: as many 256 px boxes as fit). */
  cols?: number;
  /** Largest enlargement of the 2x image inside its box (default 1: never enlarge). */
  zoomMax?: number;
  backdrop?: 'slot' | 'plain';
  /** Tile height / width (default 1). */
  aspect?: number;
}
interface SheetSpec {
  name: string;
  title: string;
  subtitle?: string;
  theme: Theme;
  groups: Group[];
}

const items: Item[] = [];
const sheetSpecs: SheetSpec[] = [];
const sheetCanvases: HTMLCanvasElement[] = [];
const sheetMeta: { name: string; title: string; tiles: number }[] = [];
const skipped: string[] = [];
/** How many textures textures.ts ensureTextures() baked (the AUDIT said 72). */
let ensureCount = 0;

const byId = new Map<string, Item>();
function register(it: Item): Item {
  const k = `${it.category}/${it.id}`;
  if (byId.has(k)) throw new Error(`duplicate item ${k}`);
  byId.set(k, it);
  items.push(it);
  return it;
}

const canvasOf = (w: number, h: number) => {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
};

/** Smooth 2x of a 1x source (what a 2x phone screen does with a 1x texture). */
function up2(src: CanvasImageSource & { width: number; height: number }): HTMLCanvasElement {
  const c = canvasOf(src.width * ZOOM, src.height * ZOOM);
  const x = c.getContext('2d')!;
  x.imageSmoothingEnabled = true;
  x.imageSmoothingQuality = 'high';
  x.drawImage(src, 0, 0, c.width, c.height);
  return c;
}

const log = (...a: unknown[]) => console.log('[harness]', ...a);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Run one render step; a failure is reported (in the console and the manifest) but does not stop the other steps. */
const ONLY = new Set((new URLSearchParams(location.search).get('only') ?? '').split(',').filter(Boolean));
async function step(name: string, fn: () => Promise<void>) {
  if (ONLY.size && !ONLY.has(name)) return;
  try {
    await fn();
  } catch (e) {
    const msg = `${name}: ${e instanceof Error ? `${e.message}\n${e.stack ?? ''}` : String(e)}`;
    skipped.push(msg);
    console.error('[harness] STEP FAILED', msg);
  }
}

// ---------------------------------------------------------------------------------------------------------------------
// Phaser plumbing
// ---------------------------------------------------------------------------------------------------------------------
class Probe extends Phaser.Scene {
  constructor() {
    super('probe');
  }
}

let scene: Probe;

/** Baked texture -> registry item. generateTexture textures are 1x canvases (upscaled 2x); DynamicTextures (bakeTexture) are already RS=2. */
async function addTexture(key: string, category: string, extra: Partial<Item> & { source: string }): Promise<Item> {
  const tex = scene.textures.get(key);
  if (!tex || tex.key === '__MISSING') throw new Error(`texture ${key} was not generated`);
  let canvas: HTMLCanvasElement;
  let w: number, h: number, upscaled: boolean;
  if (tex instanceof Phaser.Textures.DynamicTexture) {
    canvas = await snapshotDynamic(tex);
    w = canvas.width / ZOOM;
    h = canvas.height / ZOOM;
    upscaled = false;
  } else {
    const src = tex.getSourceImage() as HTMLCanvasElement | HTMLImageElement;
    w = src.width;
    h = src.height;
    canvas = up2(src);
    upscaled = true;
  }
  return register({ id: key, category, canvas, w, h, live: false, upscaled, ...extra });
}

function snapshotDynamic(dt: Phaser.Textures.DynamicTexture): Promise<HTMLCanvasElement> {
  return new Promise((res) =>
    dt.snapshot((img) => {
      const im = img as HTMLImageElement;
      const c = canvasOf(im.width, im.height);
      c.getContext('2d')!.drawImage(im, 0, 0);
      res(c);
    }),
  );
}

let snapN = 0;
/**
 * Build something live in the scene (a container at 2x), draw it into a DynamicTexture and read it back. `bg` (0xRRGGBB) fills first,
 * so the snapshot has no half-transparent edges (the WebGL read-back is premultiplied); `bg = undefined` keeps alpha.
 */
async function live(w: number, h: number, build: (root: Phaser.GameObjects.Container) => void, bg?: number): Promise<HTMLCanvasElement> {
  const root = scene.add.container(0, 0).setScale(ZOOM);
  build(root);
  const dt = scene.textures.addDynamicTexture(`__snap_${snapN++}`, w * ZOOM, h * ZOOM);
  if (!dt) throw new Error('no dynamic texture');
  if (bg !== undefined) dt.fill(bg, 1);
  dt.draw(root);
  const c = await snapshotDynamic(dt);
  root.destroy();
  dt.destroy();
  return c;
}

async function addLive(id: string, category: string, w: number, h: number, build: (root: Phaser.GameObjects.Container) => void, extra: Partial<Item> & { source: string }, bg?: number): Promise<Item> {
  const canvas = await live(w, h, build, bg);
  return register({ id, category, canvas, w, h, live: true, upscaled: false, ...extra });
}

/** Move everything the callback adds to the scene's top level into `root` (for classes that add their own objects). */
function adopt(root: Phaser.GameObjects.Container, make: () => void) {
  const before = new Set(scene.children.list);
  make();
  for (const o of [...scene.children.list]) if (!before.has(o)) root.add(o);
}

// ---------------------------------------------------------------------------------------------------------------------
// contact sheets
// ---------------------------------------------------------------------------------------------------------------------
const SHEET_W = 1160;
const MARGIN = 20;
const MAX_H = 3700;
const THEMES: Record<Theme, { bg: string; tile: string; edge: string; label: string; title: string; sub: string }> = {
  board: { bg: '#f6dcb0', tile: '#d99d63', edge: 'rgba(122,59,18,0.45)', label: '#2b1d2e', title: '#7a3b12', sub: '#6b5240' },
  dark: { bg: '#1c1f26', tile: '#2c313b', edge: 'rgba(255,255,255,0.18)', label: '#e9edf4', title: '#ffd36a', sub: '#a9b2c3' },
};
const FONT = '"Lilita One", "Arial Black", sans-serif';
const LABEL_H = 50;

function fit(x: CanvasRenderingContext2D, text: string, maxW: number, size: number, min = 18): string {
  for (let s = size; s >= min; s--) {
    x.font = `${s}px ${FONT}`;
    if (x.measureText(text).width <= maxW) return text;
  }
  x.font = `${min}px ${FONT}`;
  let t = text;
  while (t.length > 6 && x.measureText(t).width > maxW) t = `${t.slice(0, Math.ceil(t.length / 2) - 1)}..${t.slice(Math.ceil(t.length / 2) + 2)}`;
  return t;
}

interface Placed {
  it: Item;
  x: number;
  y: number;
  bw: number;
  bh: number;
  g: Group;
}
interface Hdr {
  g: Group;
  y: number;
}

/** Lay one sheet out (positions only) and report its height. */
function layout(spec: SheetSpec) {
  const placed: Placed[] = [];
  const hdrs: Hdr[] = [];
  let y = 128;
  const inner = SHEET_W - MARGIN * 2;
  for (const g of spec.groups) {
    const cols = g.cols ?? Math.max(1, Math.floor(inner / 272));
    const cellW = inner / cols;
    const bw = Math.floor(cellW - 16);
    const bh = Math.round(bw * (g.aspect ?? 1));
    if (g.title) {
      hdrs.push({ g, y });
      y += g.note ? 84 : 62;
    }
    g.items.forEach((it, i) => {
      const r = Math.floor(i / cols), c = i % cols;
      placed.push({ it, g, bw, bh, x: MARGIN + c * cellW + 8, y: y + r * (bh + LABEL_H + 8) });
    });
    y += Math.ceil(g.items.length / cols) * (bh + LABEL_H + 8) + 14;
  }
  return { placed, hdrs, height: y + 12 };
}

const slotImg = () => (scene.textures.exists('slot') ? (scene.textures.get('slot').getSourceImage() as HTMLCanvasElement) : null);

function drawSheet(spec: SheetSpec): HTMLCanvasElement {
  const th = THEMES[spec.theme];
  const { placed, hdrs, height } = layout(spec);
  const c = canvasOf(SHEET_W, height);
  const x = c.getContext('2d')!;
  x.fillStyle = th.bg;
  x.fillRect(0, 0, c.width, c.height);
  x.textBaseline = 'alphabetic';
  x.fillStyle = th.title;
  x.font = `52px ${FONT}`;
  x.fillText(fit(x, spec.title, SHEET_W - MARGIN * 2, 52, 30), MARGIN, 62);
  x.fillStyle = th.sub;
  x.font = `26px ${FONT}`;
  x.fillText(fit(x, spec.subtitle ?? '', SHEET_W - MARGIN * 2, 26, 16), MARGIN, 100);
  for (const h of hdrs) {
    x.fillStyle = th.title;
    x.font = `38px ${FONT}`;
    x.fillText(fit(x, h.g.title!, SHEET_W - MARGIN * 2, 38, 22), MARGIN, h.y + 38);
    if (h.g.note) {
      x.fillStyle = th.sub;
      x.font = `24px ${FONT}`;
      x.fillText(fit(x, h.g.note, SHEET_W - MARGIN * 2, 24, 15), MARGIN, h.y + 70);
    }
  }
  const slot = slotImg();
  for (const p of placed) {
    // tile backdrop: the board colour with the game's own `slot` texture over it, or a plain panel
    x.fillStyle = th.tile;
    x.beginPath();
    x.roundRect(p.x, p.y, p.bw, p.bh, 22);
    x.fill();
    if ((p.g.backdrop ?? 'plain') === 'slot' && slot) x.drawImage(slot, p.x, p.y, p.bw, p.bh);
    else {
      x.strokeStyle = th.edge;
      x.lineWidth = 2;
      x.beginPath();
      x.roundRect(p.x + 1, p.y + 1, p.bw - 2, p.bh - 2, 22);
      x.stroke();
    }
    const cw = p.it.canvas.width, ch = p.it.canvas.height;
    const inset = 4;
    const s = Math.min((p.bw - inset * 2) / cw, (p.bh - inset * 2) / ch, p.g.zoomMax ?? 1);
    x.imageSmoothingEnabled = true;
    x.imageSmoothingQuality = 'high';
    x.drawImage(p.it.canvas, p.x + (p.bw - cw * s) / 2, p.y + (p.bh - ch * s) / 2, cw * s, ch * s);
    const suffix = s < 0.75 ? ` ${Math.round(s * 100)}%` : s > 1.25 ? ` x${s.toFixed(1)}` : '';
    x.fillStyle = th.label;
    x.textAlign = 'center';
    x.font = `28px ${FONT}`;
    x.fillText(fit(x, (p.it.label ?? p.it.id) + suffix, p.bw + 8, 28), p.x + p.bw / 2, p.y + p.bh + 34);
    x.textAlign = 'left';
  }
  return c;
}

/** Split a spec into parts of at most MAX_H px (between groups, or inside a group between rows). */
function splitSpec(spec: SheetSpec): SheetSpec[] {
  if (layout(spec).height <= MAX_H) return [spec];
  const parts: SheetSpec[] = [];
  let cur: Group[] = [];
  const flush = () => {
    if (cur.length) parts.push({ ...spec, groups: cur });
    cur = [];
  };
  const fits = (gs: Group[]) => layout({ ...spec, groups: gs }).height <= MAX_H;
  for (const g of spec.groups) {
    if (fits([...cur, g])) {
      cur.push(g);
      continue;
    }
    flush();
    if (fits([g])) {
      cur.push(g);
      continue;
    }
    // one group alone is too tall: chunk its items by rows
    const cols = g.cols ?? Math.max(1, Math.floor((SHEET_W - MARGIN * 2) / 272));
    let n = cols;
    while (n + cols <= g.items.length && fits([{ ...g, items: g.items.slice(0, n + cols) }])) n += cols;
    for (let i = 0; i < g.items.length; i += n) parts.push({ ...spec, groups: [{ ...g, items: g.items.slice(i, i + n), title: i ? `${g.title ?? ''} (cont.)` : g.title }] });
  }
  flush();
  return parts;
}

function addSheet(spec: SheetSpec) {
  if (!spec.groups.some((g) => g.items.length)) {
    skipped.push(`sheet ${spec.name}: no items`);
    return;
  }
  const parts = splitSpec(spec);
  parts.forEach((p, i) => {
    sheetSpecs.push(parts.length > 1 ? { ...p, name: `${spec.name}-${i + 1}`, title: `${spec.title} (${i + 1}/${parts.length})` } : p);
  });
}

// ---------------------------------------------------------------------------------------------------------------------
// content
// ---------------------------------------------------------------------------------------------------------------------
const UNIT_LISTS: UnitDef[][] = [ROSTER_1_UNITS, ROSTER_2_UNITS, ROSTER_3_UNITS, ROSTER_4_UNITS, ROSTER_5_UNITS, ROSTER_6_UNITS, ROSTER_7_UNITS];
const ROSTERS: [number, Family[]][] = [[1, ROSTER_1], [2, ROSTER_2], [3, ROSTER_3], [4, ROSTER_4], [5, ROSTER_5], [6, ROSTER_6], [7, ROSTER_7]];
const ALL_DEFS: UnitDef[] = [...UNITS, ...UNIT_LISTS.flat()];
const unitMeta = (id: string): UnitDef | undefined => ALL_DEFS.find((u) => u.id === id);
const rosterOf = (fam: Family): number => ROSTERS.find(([, l]) => l.includes(fam))?.[0] ?? 0;
const pretty = (id: string) => id.replace(/_/g, ' ').toUpperCase();
const RANKS = Array.from({ length: MAX_RANK + 2 }, (_, i) => i + 1);
const BOARDS = 0xf6dcb0;
const SLOT_COL = 0xd99d63;
const ROSTER_B_IDS: Family[] = ROSTERS.filter(([n]) => n >= 2).flatMap(([, l]) => l);

async function renderTextures() {
  const before = new Set(scene.textures.getTextureKeys());
  ensureTextures(scene);
  ensureCount = scene.textures.getTextureKeys().filter((k) => !before.has(k)).length;
  log(`ensureTextures() baked ${ensureCount} textures`);
  // 1. gadgets: every family x rank
  for (const fam of FAMILIES) {
    const r = rosterOf(fam);
    const category = r >= 2 ? `units-roster${r}` : 'fallback-painted-units';
    for (const rank of RANKS) await addTexture(`${fam}_${rank}`, category, { family: fam, rank, source: `textures.ts drawGadget${r ? ` -> roster${r}Art.ts drawRoster${r}` : ''}` });
  }
  // 2. job glyphs (only the roster B units have one)
  for (const fam of FAMILIES.filter((f) => rosterOf(f) > 0)) await addTexture(`job_${fam}`, 'jobs-glyphs', { family: fam, source: `roster${rosterOf(fam)}Art.ts drawJobIcon${rosterOf(fam) > 1 ? rosterOf(fam) : ''}` });
  // 3. power tools
  for (const t of ['row_surge', 'gear_bomb']) await addTexture(`${t}_1`, 'misc', { family: t, rank: 1, source: 'toolArt.ts drawTool' });
  // 4. small fx textures, board, targets
  for (const k of ['dot', 'spark', 'chunk']) await addTexture(k, 'fx-textures', { source: 'textures.ts ensureTextures' });
  for (const k of ['slot', 'bg']) await addTexture(k, 'backgrounds-ui', { source: 'textures.ts ensureTextures' });
  await addTexture('hand', 'misc', { source: 'textures.ts ensureTextures (tutorial hand)' });
  for (let i = 0; i < 6; i++) await addTexture(`target_${i}`, 'targets', { source: 'textures.ts ensureTextures (classic machine stand-in)' });
  await addTexture('demo_can', 'targets', { source: 'textures.ts ensureTextures' });
  computeRankSpread();
}

/** How much a code stand-in changes with rank: share of its painted pixels that differ between rank 1 and rank N (0-100). */
const rankSpread: { family: string; r3: number; r6: number; r8: number }[] = [];
function computeRankSpread() {
  const px = (key: string) => {
    const c = scene.textures.get(key).getSourceImage() as HTMLCanvasElement;
    return c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data;
  };
  const diff = (a: Uint8ClampedArray, b: Uint8ClampedArray) => {
    let union = 0, changed = 0;
    for (let i = 0; i < a.length; i += 4) {
      if (Math.max(a[i + 3], b[i + 3]) <= 40) continue;
      union++;
      if (Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]) + Math.abs(a[i + 3] - b[i + 3]) > 60) changed++;
    }
    return Math.round((1000 * changed) / Math.max(1, union)) / 10;
  };
  for (const fam of FAMILIES) {
    const base = px(`${fam}_1`);
    rankSpread.push({ family: fam, r3: diff(base, px(`${fam}_3`)), r6: diff(base, px(`${fam}_6`)), r8: diff(base, px(`${fam}_8`)) });
  }
}

async function renderCrates() {
  const kinds: CrateKind[] = ['wood', 'iron', 'gold', 'bench'];
  for (const k of kinds) {
    toolboxCrateKey(scene, k);
    await addTexture(`tbx_${k}`, 'crates', { source: 'fx/toolboxCrates.ts drawBag/drawToolbox/drawChest/drawBench (closed)' });
    await addTexture(`tbx_${k}_open`, 'crates', { source: 'fx/toolboxCrates.ts (open)' });
    await addTexture(`tbx_latch_${k}`, 'crates', { source: 'fx/toolboxCrates.ts latch' });
  }
}

/** A board cell as in GameScene: the `slot` texture on the board colour, then a part. */
function cellMock(root: Phaser.GameObjects.Container, cx: number, cy: number, unitKey: string | null) {
  root.add(scene.add.rectangle(cx, cy, CELL, CELL, SLOT_COL));
  root.add(scene.add.image(cx, cy, 'slot').setDisplaySize(CELL - 6, CELL - 6));
  if (unitKey) root.add(scene.add.image(cx, cy, unitKey).setDisplaySize(104, 104));
}

async function renderMarks() {
  const S = CELL + 20;
  const mk = async (id: string, label: string, unit: string | null, draw: (g: Phaser.GameObjects.Graphics, x: number, y: number) => void, src: string) => {
    await addLive(id, 'cell-marks', S, S, (root) => {
      cellMock(root, S / 2, S / 2, unit);
      const g = scene.add.graphics();
      draw(g, S / 2, S / 2);
      root.add(g);
    }, { label, source: `sceneKit.ts ${src} on a mock cell (slot + ${unit ?? 'empty'})` }, BOARDS);
  };
  await mk('mark_charged', 'CHARGED (Battery)', 'cannon_2', (g, x, y) => drawPrimeMark(g, x, y, 1), 'drawPrimeMark');
  await mk('mark_boosted', 'BOOSTED (Amp)', 'cannon_2', (g, x, y) => drawAmpMark(g, x, y, 1), 'drawAmpMark');
  await mk('mark_charged_boosted', 'CHARGED + BOOSTED', 'cannon_2', (g, x, y) => (drawAmpMark(g, x, y, 1), drawPrimeMark(g, x, y, 1, 1, SLOT.helper2)), 'drawAmpMark + drawPrimeMark');
  await mk('mark_charged_dim', 'CHARGED (pulse low)', 'cannon_2', (g, x, y) => drawPrimeMark(g, x, y, 0.6), 'drawPrimeMark');
  await mk('boss_cell_warn', 'ATTACK SOON', 'coil_2', (g, x, y) => drawBossCell(g, x - CELL / 2 + 6, y - CELL / 2 + 6, CELL - 12, true, 1, 0), 'drawBossCell warn');
  await mk('boss_cell_warn_dim', 'ATTACK SOON (low)', 'coil_2', (g, x, y) => drawBossCell(g, x - CELL / 2 + 6, y - CELL / 2 + 6, CELL - 12, true, 0.5, 0), 'drawBossCell warn');
  for (const [atk, tint] of Object.entries(ATTACK_TINT)) await mk(`boss_cell_${atk}`, `ATTACK ${atk}`, atk === 'clamp' || atk === 'frost' ? 'coil_2' : null, (g, x, y) => drawBossCell(g, x - CELL / 2 + 6, y - CELL / 2 + 6, CELL - 12, false, 1, tint), 'drawBossCell active');
}

const SUPPORT_FAMS: Family[] = ['fan', 'magnet', 'battery', 'amplifier', 'signal_beacon', 'blast_plate', 'blueprint', 'rewind_crank', 'tilt_lever'];

/** The real off-board card widgets (SupportCard, WrenchBadge, CapBadge, CopyBadges) fed a real GameState. */
async function renderSupport() {
  for (const fam of SUPPORT_FAMS) {
    for (const mode of ['charging', 'ready'] as const) {
      const s = newGame(1, false);
      s.support = { family: fam, charge: 0, uses: 0 };
      const need = supportNeed(s);
      s.support.charge = mode === 'ready' ? need : Math.floor(need * 0.4);
      await addLive(`supportcard_${fam}_${mode}`, 'support-cards', 172, 232, (root) => adopt(root, () => {
        const card = new SupportCard(scene, 86, () => 150, () => -1, () => false, () => {});
        card.sync(s);
      }), { family: fam, label: `${fam} ${mode}`, source: 'supportCard.ts SupportCard.sync' }, BOARDS);
    }
  }
  const badgeState = (f: (s: GameState) => void) => {
    const s = newGame(1, false);
    f(s);
    return s;
  };
  const wrench: [string, string, number, number[]][] = [['wrench_badge_idle', 'wrench idle L1', 1, []], ['wrench_badge_armed', 'wrench armed L1', 1, [1]], ['wrench_badge_L6', 'wrench 1/2 armed L6', 6, [1]]];
  for (const [id, label, level, armed] of wrench) {
    const s = badgeState((st) => ((st.wrench = { armed, uses: 0 }), (st.unitLevel = { ...(st.unitLevel ?? {}), wrench: level })));
    await addLive(id, 'support-cards', 172, 130, (root) => adopt(root, () => new WrenchBadge(scene, 86, () => 66).sync(s)), { label, source: 'ui/wrenchBadge.ts WrenchBadge.sync', family: 'wrench' }, BOARDS);
  }
  const cap: [string, string, number, number | null][] = [['cap_badge_empty', 'capacitor empty', 1, null], ['cap_badge_holding', 'capacitor holding L1', 1, 3], ['cap_badge_holds4', 'capacitor holds 4 L3', 3, 4]];
  for (const [id, label, level, held] of cap) {
    const s = badgeState((st) => {
      st.grid[0] = makeGadget(st, 'capacitor', 2);
      st.cap = held === null ? undefined : { id: st.grid[0]!.id, held };
      st.unitLevel = { ...(st.unitLevel ?? {}), capacitor: level };
    });
    await addLive(id, 'support-cards', 172, 118, (root) => adopt(root, () => new CapBadge(scene, 86, () => 59).sync(s)), { label, source: 'ui/capBadge.ts CapBadge.sync', family: 'capacitor' }, BOARDS);
  }
  // Robot Arm COPY badges sit on the part's cell
  computeLayout(390, 844);
  const idx = 13;
  const { x: cx, y: cy } = cellXY(idx);
  const S = CELL + 40;
  for (const [id, label, copy] of [['copy_badge_one', 'robot arm copies coil', ['coil']], ['copy_badge_two', 'robot arm copies bell + coil', ['coil', 'bell']]] as [string, string, Family[]][]) {
    const s = newGame(1, false);
    const g = makeGadget(s, 'robot_arm', 3);
    g.copy = copy;
    s.grid[idx] = g;
    await addLive(id, 'support-cards', S, S, (root) => {
      const inner = scene.add.container(S / 2 - cx, S / 2 - cy);
      root.add(inner);
      cellMock(inner, cx, cy, 'robot_arm_3');
      const before = new Set(scene.children.list);
      new CopyBadges(scene).sync(s.grid);
      for (const o of [...scene.children.list]) if (!before.has(o)) inner.add(o);
    }, { family: 'robot_arm', label, source: 'ui/copyBadge.ts CopyBadges.sync on a mock cell' }, BOARDS);
  }
}

/** The host methods the crate / units UI expects from GameScene: the real prototype methods, bound to the probe scene. */
function installHostShim() {
  const host = scene as unknown as Record<string, unknown>;
  host.visCache = new Map();
  host.visBounds = GameScene.prototype.visBounds;
  host.fitVisible = GameScene.prototype.fitVisible;
  host.fitSprite = GameScene.prototype.fitSprite;
  host.meta = { units: {} };
  host.unitPortrait = (id: string) => unitsTab.unitPortrait(scene as unknown as GameScene, id);
}

async function renderCards() {
  const cs = (await import('../src/game/ui/crateScreen')) as unknown as {
    __bakeFx: (s: Phaser.Scene) => void;
    __buildCard: (s: GameScene, c: { unit: Family; count: number; isNew: boolean }) => { card: Phaser.GameObjects.Container };
  };
  cs.__bakeFx(scene);
  for (const fam of ROSTER_B_IDS) {
    await addLive(`crate_card_${fam}`, 'portraits-cards', 184, 232, (root) => {
      const { card } = cs.__buildCard(scene as unknown as GameScene, { unit: fam, count: 1, isNew: true });
      card.setPosition(92, 116);
      root.add(card);
    }, { family: fam, label: `card ${fam}`, source: 'ui/crateScreen.ts buildCard + addPortrait (glyph tile, no painted art)' }, BOARDS);
  }
}

/** rankDecor() glow ring / pips / crown around a part, per rank. */
async function renderDecor() {
  const fam = 'wrench';
  for (const rank of RANKS) {
    await addLive(`rank_decor_${fam}_${rank}`, 'rank-decor', CELL + 20, CELL + 20, (root) => {
      const c = scene.add.container((CELL + 20) / 2, (CELL + 20) / 2);
      root.add(c);
      const bg = scene.add.rectangle(0, 0, CELL, CELL, SLOT_COL);
      const slot = scene.add.image(0, 0, 'slot').setDisplaySize(CELL - 6, CELL - 6);
      const img = scene.add.image(0, 0, `${fam}_${rank}`);
      (scene as unknown as { fitSprite: (i: Phaser.GameObjects.Image) => void }).fitSprite(img);
      const d = rankDecor(scene, fam, rank, FAMILY_INFO[fam].color, CELL * 0.38);
      c.add([bg, slot, ...d.under, img, ...d.mid, ...d.over]);
    }, { family: fam, rank, label: `${fam}_${rank} + decor`, source: 'unitArt.ts rankDecor on the code stand-in (rank 1-2 none, 3-4 glow, 5-6 gold + pips, 7-8 crown)' }, BOARDS);
  }
  for (const k of scene.textures.getTextureKeys().filter((k) => k.startsWith('rk_')).sort()) await addTexture(k, 'fx-textures', { source: 'unitArt.ts rankDecor baked ring / pips / crown' });
}

async function renderFx() {
  ensureBoxFxTextures(scene);
  for (const k of ['bm_spark', 'bm_flash', 'bm_ring']) await addTexture(k, 'fx-textures', { source: 'fx/boxMomentFx.ts ensureBoxFxTextures' });
  const cs = (await import('../src/game/ui/crateScreen')) as unknown as { __bakeFx: (s: Phaser.Scene) => void };
  cs.__bakeFx(scene);
  for (const k of ['omm_glow', 'omm_rays']) await addTexture(k, 'fx-textures', { source: 'ui/crateScreen.ts bakeFx (canvas gradient)' });
  const sw = (await import('../src/game/sandwichFx')) as unknown as { __bakeAll: (s: Phaser.Scene) => void };
  sw.__bakeAll(scene);
  for (const k of ['sw_outline', 'sw_arrow', 'sw_ring', 'sw_plate']) await addTexture(k, 'fx-textures', { source: 'sandwichFx.ts bakeAll' });
  // Screw Yard / Object Yard baked heads, spark and dust
  (ObjectYardScene.prototype as unknown as { bakeFx: () => void }).bakeFx.call(scene);
  for (let c = 0; c < SCREW_COLORS.length; c++) await addTexture(`oy_screw_${c}`, 'screw-yard', { source: 'ObjectYardScene.ts bakeFx (glossy screw head + family stamp)' });
  for (const k of ['oy_spark', 'oy_dust']) await addTexture(k, 'screw-yard', { source: 'ObjectYardScene.ts bakeFx' });
}

// ---------------------------------------------------------------------------------------------------------------------
// real scenes in a second Phaser game (Screw Yard, Object Yard)
// ---------------------------------------------------------------------------------------------------------------------
interface Live {
  game: Phaser.Game;
  /** Advance the game by n frames of 1/60 s (the loop is stopped: no wall clock is involved). */
  adv: (n: number) => void;
  /** Copy of the game canvas (design size x ZOOM). */
  grab: () => HTMLCanvasElement;
}
/** Boot real scenes in their own game at design size x ZOOM with the loop stopped, so frames are stepped at a fixed rate. */
async function withLive<T>(scenes: { key: string; cls: new () => Phaser.Scene; data?: unknown; auto?: boolean }[], fn: (l: Live) => Promise<T> | T): Promise<T> {
  const H = computeLayout(390, 844);
  const host = document.createElement('div');
  host.style.cssText = 'position:fixed;left:-20000px;top:0';
  document.body.appendChild(host);
  const game = new Phaser.Game({
    type: Phaser.WEBGL,
    parent: host,
    width: DESIGN_W * ZOOM,
    height: H * ZOOM,
    backgroundColor: '#f3cf9b',
    audio: { noAudio: true },
    banner: false,
    input: { activePointers: 1 },
    render: { antialias: true, preserveDrawingBuffer: true },
    scene: [],
  });
  await new Promise<void>((res) => game.events.once('ready', () => res()));
  await sleep(60);
  game.loop.stop();
  let t = 1000;
  // all frames but the last run without rendering (the software GL renderer is slow); the last one renders
  const adv = (n: number) => {
    for (let i = 0; i < n; i++) {
      clock.t += 1000 / 60;
      if (i < n - 1) game.headlessStep(t, 1000 / 60);
      else game.step(t, 1000 / 60);
      t += 1000 / 60;
    }
  };
  for (const sc of scenes) game.scene.add(sc.key, sc.cls, sc.auto ?? true, sc.data as object);
  const grab = () => {
    const c = canvasOf(game.canvas.width, game.canvas.height);
    c.getContext('2d')!.drawImage(game.canvas, 0, 0);
    return c;
  };
  try {
    return await fn({ game, adv, grab });
  } finally {
    game.destroy(true);
    host.remove();
  }
}

async function liveScene(key: string, cls: new () => Phaser.Scene, data: unknown, frames: number): Promise<HTMLCanvasElement> {
  return withLive([{ key, cls, data }], (l) => {
    l.adv(frames);
    return l.grab();
  });
}

const noop = () => {};
const ALL_TIPS = new Proxy({} as Record<string, boolean>, { get: () => true, set: () => true });

async function renderYards() {
  const mkYard = (n: number): YardData => ({ n, level: weekYard(n, 1), tips: ALL_TIPS, boosters: { drill: 1, magnet: 1, well: 1 }, spend: () => false, saveTips: noop, onEnd: noop });
  for (const n of [1, 4, 8]) {
    const canvas = await liveScene('yard', ScrewScene, mkYard(n), 20);
    register({ id: `yard_screw_${n}`, category: 'screw-yard', canvas, w: canvas.width / ZOOM, h: canvas.height / ZOOM, live: true, upscaled: false, label: `Screw Yard ${n}`, source: 'ScrewScene.ts (real scene, no painted art): plates, screws, boxes, dock, booster bar' });
  }
  for (const u of ['cannon', 'coil', 'bell'] as const) {
    const data: ObjectYardData = { lvl: YARD_OBJECTS[u], onEnd: noop, onResult: noop };
    const canvas = await liveScene('objectYard', ObjectYardScene, data, 20);
    register({ id: `yard_object_${u}`, category: 'screw-yard', canvas, w: canvas.width / ZOOM, h: canvas.height / ZOOM, live: true, upscaled: false, label: `Object Yard ${u}`, source: 'ObjectYardScene.ts (real scene, QA switch SCREW YARD: OBJECT, no painted art)' });
  }
}


// ---------------------------------------------------------------------------------------------------------------------
// the real GameScene with no painted art: what the code alone puts on screen
// ---------------------------------------------------------------------------------------------------------------------
/* eslint-disable @typescript-eslint/no-explicit-any */
const ALL_TIPS_PROXY = new Proxy({} as Record<string, boolean>, { get: () => true, set: () => true });
const RETURNING = { tutorialDone: true, onboarded: true, hardUnlocked: true, bolts: 120, gems: 40, kits: 2, capsules: 1, lessons: { road: true, card: true, boosters: true }, levelStars: Object.fromEntries(Array.from({ length: 24 }, (_, i) => [i + 1, 2])) };

/** Boot the real GameScene (no painted art) on a fresh save, optionally a returning player's, and run `fn` against it. */
async function withGameScene(meta: object | null, fn: (sc: any, l: Live, shot: (id: string, label: string, note: string) => void) => void | Promise<void>) {
  localStorage.clear();
  if (meta) localStorage.setItem(META_KEY, JSON.stringify(meta));
  await withLive([{ key: 'game', cls: GameScene }], async (l) => {
    const sc = l.game.scene.getScene('game') as any;
    l.adv(100);
    const shot = (id: string, label: string, note: string) => {
      log('screen', id);
      const canvas = l.grab();
      register({ id, category: 'screens-code-only', canvas, w: canvas.width / ZOOM, h: canvas.height / ZOOM, live: true, upscaled: false, label, source: `GameScene (real, no painted art): ${note}` });
    };
    await fn(sc, l, shot);
  });
  localStorage.clear();
}

async function renderScreens() {
  // 1. first launch + screens that do not start a level
  await withGameScene(null, (sc, l, shot) => {
    shot('screen_tutorial', 'first launch: tutorial', 'new player: tutorial board, coach bubble, code hand');
    Object.assign(sc.meta, { ...RETURNING, tips: ALL_TIPS_PROXY });
    sc.closeModal?.();
    sc.openTitle('road');
    l.adv(70);
    shot('screen_home_legacy', 'home without painted art (legacy title)', 'openTitle(road): with no hero / node art the game falls back to openLegacyTitle');
    sc.openLevelSheet(7);
    l.adv(70);
    shot('screen_level_card', 'level card (panel)', 'openLevelSheet(7)');
    sc.closeModal();
    const owned = ['cannon', 'coil', 'bell', 'fan', 'rocket', 'wrench', 'piston', 'spring', 'blowtorch', 'pipe', 'blast_plate', 'capacitor', 'blueprint', 'crane', 'robot_arm', 'rivet_gun', 'vice', 'router'];
    sc.meta.units = Object.fromEntries(owned.map((u) => [u, { level: 3, cards: 2 }]));
    sc.meta.crates = { wood: 1, iron: 1, gold: 1, bench: 1 };
    sc.openTitle('units');
    l.adv(70);
    shot('screen_units_tab', 'units tab (glyph tiles)', 'openTitle(units) with roster B on');
    sc.openUnitDetail({ id: 'blueprint', role: 'SUPPORT', rarity: 'rare', slot: 'helper' });
    l.adv(70);
    shot('screen_unit_detail', 'unit detail', 'openUnitDetail(blueprint)');
    sc.closeModal();
    sc.openNextCrate();
    l.adv(40);
    shot('screen_crate_closed', 'crate screen', 'openNextCrate');
    l.adv(240);
    shot('screen_crate_cards', 'crate reveal', 'openNextCrate + 4 s');
    sc.closeModal();
    sc.openTitle('road');
    l.adv(40);
    sc.openSettings();
    l.adv(70);
    shot('screen_settings', 'settings', 'openSettings');
  });
  // 2. a level board with a spread of parts
  await withGameScene({ ...RETURNING }, async (sc, l, shot) => {
    sc.closeModal?.();
    l.adv(30);
    sc.meta.tips = ALL_TIPS_PROXY;
    sc.startLevel(21);
    sc.finishIntro(true);
    l.adv(70);
    const s = sc.s;
    const mk = (f: string, r: number) => ({ id: s.nextId++, family: f, rank: r, cd: 99 });
    s.grid.fill(null);
    const layout: [string, number][] = [['cannon', 1], ['cannon', 3], ['coil', 2], ['bell', 4], ['rocket', 2], ['mortar', 3], ['piston', 1], ['piston', 4], ['spring', 3], ['belt_drive', 2], ['pipe', 5], ['blowtorch', 2], ['tesla_tower', 3], ['crane', 2], ['dynamo', 4], ['wrecking_ball', 1], ['robot_arm', 3], ['rivet_gun', 2], ['vice', 4], ['router', 3], ['lathe', 5], ['hydraulic_press', 2], ['fan', 3], ['magnet', 2], ['battery', 4], ['amplifier', 1], ['arc_welder', 2], ['horn', 3], ['fuse_box', 2], ['signal_beacon', 6]];
    layout.forEach(([f, r], i) => (s.grid[i] = mk(f, r)));
    s.grid[0].primed = true;
    s.grid[1].amp = 1.6;
    s.support = { family: 'fan', charge: 12, uses: 0 };
    sc.reconcile(true);
    l.adv(60);
    shot('screen_board_mixed', 'board: 30 parts as code stand-ins', 'startLevel(21) + a hand-built grid of 30 parts, a support card, charged + boosted marks');
    s.grid.fill(null);
    s.support = undefined;
    for (let i = 0; i < 6; i++) s.grid[i] = mk('wrench', i + 1);
    for (let i = 0; i < 6; i++) s.grid[6 + i] = mk('nail_gun', i + 3);
    for (let i = 0; i < 6; i++) s.grid[12 + i] = mk('cannon', i + 1);
    sc.reconcile(true);
    l.adv(60);
    shot('screen_board_ranks', 'board: rank ladder', 'real board pieces: wrench 1-6, nail gun 3-8, cannon 1-6 (rank plate + decor from unitArt.ts)');
    // textures the board baked for itself (read back from this game's texture manager)
    // (rank_plate and formula_plate are only baked when the painted dice / formula art exists, so they are not part of a no-art run)
    for (const [k, note] of [['clock_base', 'clock ring disc']] as const) {
      const tex = l.game.textures.exists(k) ? l.game.textures.get(k) : null;
      if (!(tex instanceof Phaser.Textures.DynamicTexture)) {
        skipped.push(`board texture ${k} not baked in this run`);
        continue;
      }
      const canvas = await snapshotDynamic(tex);
      register({ id: k, category: 'backgrounds-ui', canvas, w: canvas.width / ZOOM, h: canvas.height / ZOOM, live: false, upscaled: false, source: `GameScene.ts (baked on the board): ${note}` });
    }
    s.stats.merges = 9;
    s.stats.biggestChain = 5;
    s.phase = 'won';
    sc.openResult(true);
    l.adv(120);
    shot('screen_results', 'victory result', 'openResult(true)');
  });
  // 3. pause + the boss wake card on a boss level
  await withGameScene({ ...RETURNING }, (sc, l, shot) => {
    sc.closeModal?.();
    l.adv(30);
    sc.meta.tips = ALL_TIPS_PROXY;
    sc.startLevel(10);
    sc.finishIntro(true);
    l.adv(90);
    shot('screen_boss_level', 'boss level board', 'startLevel(10): boss stand-in, HP bar fallback, clock ring');
    sc.meta.tips = {};
    sc.bossWakeCard(BOSSES[0]);
    l.adv(70);
    shot('screen_boss_wake', 'boss wake card', 'bossWakeCard(first boss)');
  });
  await withGameScene({ ...RETURNING }, (sc, l, shot) => {
    sc.closeModal?.();
    l.adv(30);
    sc.meta.tips = ALL_TIPS_PROXY;
    sc.startLevel(4);
    sc.finishIntro(true);
    l.adv(60);
    sc.openPause();
    l.adv(70);
    shot('screen_pause', 'pause', 'openPause');
  });
}

// ---------------------------------------------------------------------------------------------------------------------
// painted vs code (sheet-only items: not written as individual PNGs)
// ---------------------------------------------------------------------------------------------------------------------
function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const im = new Image();
    im.onload = () => res(im);
    im.onerror = () => rej(new Error(`cannot load ${url}`));
    im.src = url;
  });
}
/** A painted picture (256 px file) laid out like a code texture at 2x: contained in a 256 px sheet box (the game fits both into the same cell). */
function pictureItem(id: string, im: HTMLImageElement, label: string): Item {
  const c = canvasOf(256, 256);
  const x = c.getContext('2d')!;
  x.imageSmoothingEnabled = true;
  x.imageSmoothingQuality = 'high';
  const s = Math.min(c.width / im.width, c.height / im.height);
  x.drawImage(im, (c.width - im.width * s) / 2, (c.height - im.height * s) / 2, im.width * s, im.height * s);
  return { id, category: 'painted-vs-code', canvas: c, w: 128, h: 128, live: false, upscaled: false, source: 'src/assets/art', label };
}
const sheetItem = (it: Item, label: string): Item => ({ ...it, label });
function normalise(it: Item): Item {
  // the game fits a texture into the same cell whatever its pixel size: the 128 px texture fills the same 256 px sheet box as a picture
  const c = canvasOf(256, 256);
  const x = c.getContext('2d')!;
  x.imageSmoothingEnabled = true;
  x.imageSmoothingQuality = 'high';
  x.drawImage(it.canvas, 0, 0, c.width, c.height);
  return { ...it, canvas: c };
}

async function renderPaintedVsCode() {
  const base = '/src/assets/art';
  const codeUnit = (fam: string, rank: number) => normalise(byId.get(`units-roster${rosterOf(fam as Family)}/${fam}_${rank}`) ?? byId.get(`fallback-painted-units/${fam}_${rank}`)!);
  const picGroups: Group[] = [];
  for (const fam of [...PICTURE_UNITS].sort((a, b) => ROSTER_B_IDS.indexOf(a as Family) - ROSTER_B_IDS.indexOf(b as Family))) {
    const pic = pictureItem(`unit_${fam}`, await loadImage(`${base}/unit_${fam}.webp`), `unit_${fam} (painted)`);
    const job = byId.get(`jobs-glyphs/job_${fam}`)!;
    picGroups.push({
      title: `${pretty(fam)}   ${unitMeta(fam)?.role ?? ''} · ${unitMeta(fam)?.rarity ?? ''}`,
      cols: 4,
      backdrop: 'slot',
      items: [pic, sheetItem(codeUnit(fam, 1), `${fam}_1 (code)`), sheetItem(codeUnit(fam, 6), `${fam}_6 (code)`), sheetItem(normalise(job), `job_${fam} (code)`)],
    });
  }
  addSheet({ name: 'painted-vs-code', title: 'Painted picture vs code drawing: the 22 roster B units', subtitle: 'Left: shipped unit_<id> picture (same at every rank). Then the code stand-in at rank 1 and 6, and the job glyph.', theme: 'board', groups: picGroups });
  // the 17 older units that have painted per-rank art: painted rank 1 / 6 beside the code stand-in
  const fb: Group[] = [];
  for (const fam of FAMILIES.filter((f) => rosterOf(f) < 2)) {
    const items4: Item[] = [];
    for (const rank of [1, 6]) {
      try {
        items4.push(pictureItem(`${fam}_${rank}_painted`, await loadImage(`${base}/${fam}_${rank}.webp`), `${fam}_${rank} (painted)`));
      } catch {
        skipped.push(`painted ${fam}_${rank}.webp missing`);
        continue;
      }
      items4.push(sheetItem(codeUnit(fam, rank), `${fam}_${rank} (code)`));
    }
    fb.push({ title: `${pretty(fam)}   ${unitMeta(fam)?.role ?? ''} · ${unitMeta(fam)?.rarity ?? ''}`, cols: 4, backdrop: 'slot', items: items4 });
  }
  addSheet({ name: 'painted-vs-code-older', title: 'Painted vs code: the 17 older units', subtitle: 'Painted rank 1 and 6 next to the code stand-in that textures.ts draws only when the picture is missing.', theme: 'board', groups: fb });
}

// ---------------------------------------------------------------------------------------------------------------------
// sheets
// ---------------------------------------------------------------------------------------------------------------------
const inCat = (cat: string) => items.filter((i) => i.category === cat);
const unitTitle = (f: string) => `${pretty(f)}   ${unitMeta(f)?.role ?? ''} · ${unitMeta(f)?.rarity ?? ''}`;

function buildSheets() {
  // 22 code-drawn units, one sheet per roster batch; ranks 1-4 then 5-8 per family
  for (let r = 2; r <= 7; r++) {
    const fams = ROSTERS.find(([n]) => n === r)![1];
    addSheet({
      name: `units-roster${r}`,
      title: `Code-drawn units: roster ${r}`,
      subtitle: `${fams.map(pretty).join(', ')}. 128 px textures shown 2x on a board slot. Ranks 1-${MAX_RANK + 2} (cap ${MAX_RANK}, 8 on saga L21+ for shooters / relays).`,
      theme: 'board',
      groups: fams.map((f) => ({ title: unitTitle(f), items: inCat(`units-roster${r}`).filter((i) => i.family === f), cols: 4, backdrop: 'slot' as const })),
    });
  }
  // 17 painted families whose code drawings are only fallbacks
  const fb = inCat('fallback-painted-units');
  addSheet({
    name: 'fallback-painted-units',
    title: 'Fallback stand-ins for the 17 painted units',
    subtitle: 'Only drawn when the painted <family>_<rank> picture is missing (textures.ts). Shown 2x on a board slot.',
    theme: 'board',
    groups: FAMILIES.filter((f) => rosterOf(f) < 2).map((f) => ({ title: unitTitle(f), items: fb.filter((i) => i.family === f), cols: 4, backdrop: 'slot' as const })),
  });
  addSheet({
    name: 'jobs-glyphs',
    title: 'job_<unit> glyphs (64 px), 26 roster B units',
    subtitle: 'Shown on crate cards and unit pages while a unit has no picture. Enlarged 2x of the 2x PNG (portrait size).',
    theme: 'board',
    groups: [{ items: inCat('jobs-glyphs'), cols: 4, zoomMax: 2 }],
  });
  addSheet({ name: 'crates', title: 'Procedural toolbox crates (QA switch)', subtitle: 'fx/toolboxCrates.ts: Tool Bag, Toolbox, Tool Chest, Golden Workbench; closed, open and the latch.', theme: 'dark', groups: [{ items: inCat('crates'), cols: 3 }] });
  addSheet({ name: 'cell-marks', title: 'Cell marks and boss telegraphs', subtitle: 'Live Graphics from sceneKit.ts on a mock cell (slot + stand-in part).', theme: 'board', groups: [{ items: inCat('cell-marks'), cols: 4 }] });
  addSheet({
    name: 'support-cards',
    title: 'Support cards and badges (roster B, QA)',
    subtitle: 'The real SupportCard / WrenchBadge / CapBadge / CopyBadges classes, fed a real GameState.',
    theme: 'board',
    groups: [{ items: inCat('support-cards'), cols: 3 }],
  });
  addSheet({ name: 'portraits-cards', title: 'Crate-reveal cards with glyph tiles (no painted art)', subtitle: 'ui/crateScreen.ts buildCard: rarity frame, glyph tile (addPortrait), name, job pill.', theme: 'board', groups: [{ items: inCat('portraits-cards'), cols: 4 }] });
  addSheet({ name: 'rank-decor', title: 'Rank decor on a code part (wrench 1-8)', subtitle: 'unitArt.ts rankDecor: ranks 1-2 plain, 3-4 family glow, 5-6 gold + pips, 7-8 crown + shimmer.', theme: 'board', groups: [{ items: inCat('rank-decor'), cols: 4 }] });
  addSheet({ name: 'fx-textures', title: 'FX textures', subtitle: 'White / soft textures that the game tints, enlarged up to 4x.', theme: 'dark', groups: [{ items: inCat('fx-textures'), cols: 4, zoomMax: 4 }] });
  const bgs = inCat('backgrounds-ui');
  addSheet({
    name: 'backgrounds-ui',
    title: 'Backgrounds and UI fallbacks',
    subtitle: 'slot is the board cell, then the bits the board bakes for itself (enlarged); bg is 720x1280 (shown reduced).',
    theme: 'board',
    groups: [{ items: bgs.filter((i) => i.id !== 'bg'), cols: 4, zoomMax: 2 }, { items: bgs.filter((i) => i.id === 'bg'), cols: 2, aspect: 1.6 }],
  });
  // all 39 families at rank 3 side by side (code stand-ins): the quickest "do these belong together" view
  const rank3 = (cat: string) => items.filter((i) => i.category === cat && i.rank === 3);
  addSheet({
    name: 'units-overview',
    title: 'All 39 code stand-ins at rank 3',
    subtitle: 'Top: the 22 roster B units (code-drawn only until their picture loads). Then the 4 batch-1 and the 13 original units (painted in the shipped game).',
    theme: 'board',
    groups: [
      { title: 'Roster B 22 (roster 2-7)', items: [2, 3, 4, 5, 6, 7].flatMap((r) => rank3(`units-roster${r}`)), cols: 5, backdrop: 'slot' },
      { title: 'Batch 1 (4) and the 13 originals', items: rank3('fallback-painted-units'), cols: 5, backdrop: 'slot' },
    ],
  });
  addSheet({ name: 'targets', title: 'Classic machine stand-ins (target_N)', subtitle: 'Used only when the painted target_N / monster art is missing.', theme: 'board', groups: [{ items: inCat('targets'), cols: 3 }] });
  const shots = inCat('screens-code-only');
  const sr = shots[0] ? shots[0].canvas.height / shots[0].canvas.width : 2;
  addSheet({ name: 'screens-code-only', title: 'Real game screens with NO painted art', subtitle: 'GameScene booted headless (390x844 layout, fixed clock, seeded random); every painted key is missing so the code fallbacks show.', theme: 'dark', groups: [{ items: shots, cols: 2, aspect: sr }] });
  addSheet({ name: 'misc', title: 'Misc: power tools, tutorial hand', theme: 'board', groups: [{ items: inCat('misc'), cols: 3 }] });
  const yard = inCat('screw-yard');
  addSheet({ name: 'screw-yard-baked', title: 'Screw Yard baked textures', subtitle: 'oy_screw_N glossy heads (Object Yard), oy_spark, oy_dust.', theme: 'board', groups: [{ items: yard.filter((i) => !i.live), cols: 4, zoomMax: 2 }] });
  const shot = yard.find((i) => i.live);
  const ratio = shot ? shot.canvas.height / shot.canvas.width : 2;
  addSheet({ name: 'screw-yard-screens', title: 'Screw Yard scenes, code only (no painted art)', subtitle: 'The real ScrewScene / ObjectYardScene booted headless, 390x844 phone layout, no painted plates / screw / toolbox.', theme: 'dark', groups: [{ items: yard.filter((i) => i.live), cols: 2, aspect: ratio }] });
}

async function run() {
  await document.fonts.load('28px "Lilita One"');
  await document.fonts.ready;
  setRenderScale(ZOOM);
  // roster B units / Tesla etc. are QA switches (default off): switch them on here so UNITS lists all 39 for the card builders
  TUNING.rosterB = true;
  for (const f of [applyRoster1, applyRoster2, applyRoster3, applyRoster4, applyRoster5, applyRoster6, applyRoster7]) f(true);
  rebuildUnits();
  const game = new Phaser.Game({
    type: Phaser.WEBGL,
    parent: 'game',
    width: 64,
    height: 64,
    backgroundColor: '#23262d',
    audio: { noAudio: true },
    banner: false,
    fps: { forceSetTimeOut: true, target: 60 },
    render: { antialias: true, preserveDrawingBuffer: true },
    scene: Probe,
  });
  await new Promise<void>((res) => game.events.once('ready', () => res()));
  scene = game.scene.getScene('probe') as Probe;
  while (!scene.sys.isActive()) await sleep(20);
  // stop the wall-clock loop: the widgets read scene.time.now (pulses), which must not depend on when we happen to snapshot
  game.loop.stop();
  game.headlessStep(5000, 1000 / 60);
  const addText = scene.add.text.bind(scene.add);
  (scene.add as unknown as { text: typeof addText }).text = (x, y, txt, style = {}) => addText(x, y, txt, { resolution: ZOOM, ...style });
  installHostShim();

  await step('textures', renderTextures);
  await step('crates', renderCrates);
  await step('marks', renderMarks);
  await step('support', renderSupport);
  await step('cards', renderCards);
  await step('decor', renderDecor);
  await step('fx', renderFx);
  await step('yards', renderYards);
  await step('screens', renderScreens);
  await step('painted-vs-code', renderPaintedVsCode);
  buildSheets();
  for (const spec of sheetSpecs) {
    sheetCanvases.push(drawSheet(spec));
    sheetMeta.push({ name: spec.name, title: spec.title, tiles: spec.groups.reduce((n, g) => n + g.items.length, 0) });
  }
  log(`${items.length} items, ${sheetCanvases.length} sheets, ${skipped.length} problems`);
}

const api = {
  ready: false,
  error: null as string | null,
  manifest: () => ({
    items: items.map((i) => ({ id: i.id, category: i.category, family: i.family, rank: i.rank, source: i.source, live: i.live, upscaled: i.upscaled, w: i.w, h: i.h })),
    sheets: sheetMeta,
    skipped,
    rankSpread,
    ensureCount,
  }),
  itemPng: (i: number) => items[i].canvas.toDataURL('image/png'),
  sheetPng: (i: number) => sheetCanvases[i].toDataURL('image/png'),
};
(window as unknown as { __codeAssets: typeof api }).__codeAssets = api;

run()
  .then(() => (api.ready = true))
  .catch((e: unknown) => {
    api.error = e instanceof Error ? `${e.message}\n${e.stack}` : String(e);
    console.error('[harness] failed', api.error);
  });
