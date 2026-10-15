import { AMBER, BROWN, GREEN, QA_FONT, QA_INK, card, control, part, pill, qaAction, textIn, type QaCtx, type QaRow, type QaSection } from './qaKit';
import type { Rect } from './qaLayout';
import { QA_GROUPS, QA_GROUP_TITLE, QA_META, matchesQuery, qaLabel, sortOldLast, type QaGroup, type QaMeta } from './qaMeta';
import { QA_PRESETS, activePreset, statusLines, type QaPreset, type Snapshot } from './qaPresets';
import { resetAll } from './qaGuide';

/** QA PANEL V2: the section list (PRESETS, FIND A SWITCH, then the switches by group) built from the same registry rows as the old panel.
 *  No game rules here: every switch still sets itself through its own row. */

const SEARCH_MAX = 60;

// ---------- small row builders ----------

/** A wrapped text block of `lines` lines (the "?" help, the status block). `text` is read at draw time. */
export function qaNote(o: { id: string; lines: number; text: (q: QaCtx) => string; bold?: boolean }): QaRow {
  return {
    spec: { id: o.id, kind: 'note', hasDesc: false, count: o.lines },
    title: o.id,
    draw: (q, l) => {
      card(q, l.rect, 0xf3e6c8);
      const r = part(l, 'desc');
      const t = q.scene.add.text(r.x, r.y + q.oy, o.text(q), { fontFamily: o.bold ? QA_FONT : 'Arial', fontStyle: o.bold ? 'normal' : 'bold', fontSize: o.bold ? '24px' : '22px', color: '#3b2533', wordWrap: { width: r.w }, lineSpacing: 2 }).setOrigin(0, 0);
      if (t.height > r.h) t.setScale(r.h / t.height);
      q.c.add(t);
    },
  };
}

/** A preset card: title, one big SET button (ACTIVE and green while the switches match it), what it sets and what to look at. */
export function qaPreset(o: { preset: QaPreset; active: (q: QaCtx) => boolean; tap: (q: QaCtx) => void }): QaRow {
  const p = o.preset;
  return {
    spec: { id: `preset_${p.id}`, kind: 'preset', hasDesc: true },
    title: p.title,
    draw: (q, l) => {
      const on = !p.button && o.active(q);
      card(q, l.rect, on ? 0xeaf6dd : 0xfff6e6);
      textIn(q, part(l, 'title'), p.title, QA_FONT, 32, '#3b2533');
      const r = part(l, 'control');
      const ctl = control(q, r, () => o.tap(q));
      pill(q, ctl, r.w, p.button ? 'RESET' : on ? 'ACTIVE' : 'SET', p.button ? BROWN : on ? GREEN : AMBER, 30);
      const d = part(l, 'desc');
      const t = q.scene.add.text(d.x, d.y + q.oy, `${p.what}\nLook at: ${p.look}`, { fontFamily: 'Arial', fontStyle: 'bold', fontSize: '21px', color: '#5a3d2e', wordWrap: { width: d.w }, lineSpacing: 2 }).setOrigin(0, 0);
      if (t.height > d.h) t.setScale(d.h / t.height);
      q.c.add(t);
    },
  };
}

/** Draw a round "?" button inside a row's help rect. */
function drawHelpButton(q: QaCtx, r: Rect, open: boolean, toggle: () => void) {
  const ctl = control(q, r, toggle);
  const g = q.scene.add.graphics().fillStyle(QA_INK, 1).fillCircle(0, 0, 28).fillStyle(open ? GREEN : 0xe4cfa8, 1).fillCircle(0, 0, 24);
  const t = q.scene.add.text(0, -1, '?', { fontFamily: QA_FONT, fontSize: '34px', color: open ? '#fff' : '#3b2533' }).setOrigin(0.5);
  ctl.add([g, t]);
}

// ---------- the switch rows ----------

export interface V2State {
  /** Row ids whose "?" help is open. */
  helpOpen: Set<string>;
  search: string;
}

/** One QA row as the V2 list shows it: the short label (and an "old" tag), a "?" button, and the help sentence under it while open. */
export function v2Rows(row: QaRow, meta: QaMeta, st: V2State): QaRow[] {
  const id = row.spec.id;
  const helpable = row.spec.kind === 'action' || row.spec.kind === 'switch' || row.spec.kind === 'segment' || row.spec.kind === 'stepper';
  if (!helpable) return [row];
  const open = st.helpOpen.has(id);
  const wrapped: QaRow = {
    ...row,
    spec: { ...row.spec, help: true, hasDesc: false },
    title: qaLabel(meta),
    draw: (q, l) => {
      q.label = { title: qaLabel(meta) };
      try {
        row.draw(q, l);
      } finally {
        q.label = undefined;
      }
      drawHelpButton(q, part(l, 'help'), open, () => {
        if (open) st.helpOpen.delete(id);
        else st.helpOpen.add(id);
        q.reopen();
      });
    },
  };
  if (!open) return [wrapped];
  // about 46 characters fit a line of the note at 22 px
  const help = meta.help;
  return [wrapped, qaNote({ id: `${id}_help`, lines: Math.max(1, Math.ceil(help.length / 44)), text: () => help })];
}

// ---------- the whole panel ----------

export interface V2Env {
  /** Every registry row (the old panel's QA_ROWS). */
  rows: readonly QaRow[];
  /** The last preset id this phone set (this device only). */
  lastPreset: () => string | null;
  setLastPreset: (id: string | null) => void;
  /** Ask the player for a search word (empty string = clear); null = cancelled. */
  askSearch: (current: string) => string | null;
  build: () => string;
}

export const rowSnapshot = (rows: readonly QaRow[], q: QaCtx, pick: 'read' | 'def'): Snapshot => {
  const out: Snapshot = {};
  for (const r of rows) {
    if (r.def === undefined || !r.read) continue;
    out[r.spec.id] = pick === 'read' ? r.read(q) : r.def;
  }
  return out;
};

/** Put every switch back to default, then set the preset's own. */
export function applyPreset(p: QaPreset, rows: readonly QaRow[], q: QaCtx) {
  resetAll(rows, q);
  for (const [id, v] of p.flags) {
    const row = rows.find((r) => r.spec.id === id);
    if (!row?.apply) throw new Error(`QA preset ${p.id}: no switch "${id}"`);
    row.apply(v, q);
  }
}

const metaOf = (id: string) => QA_META[id];

export function buildV2Sections(env: V2Env, st: V2State): QaSection[] {
  const byId = new Map(env.rows.map((r) => [r.spec.id, r]));
  const labelOf = (id: string) => (metaOf(id) ? metaOf(id).label : id);
  const snap = (q: QaCtx, pick: 'read' | 'def') => rowSnapshot(env.rows, q, pick);

  const presetRows: QaRow[] = [
    qaNote({
      id: 'presetStatus',
      lines: 4,
      bold: true,
      text: (q) => {
        const lines = statusLines(snap(q, 'read'), snap(q, 'def'), env.lastPreset(), labelOf);
        return [...lines, env.build()].join('\n');
      },
    }),
    ...QA_PRESETS.map((p) =>
      qaPreset({
        preset: p,
        active: (q) => activePreset(snap(q, 'read'), snap(q, 'def'))?.id === p.id,
        tap: (q) => {
          applyPreset(p, env.rows, q);
          env.setLastPreset(p.button ? null : p.id);
          q.scene.showToast(p.button ? 'ALL SWITCHES BACK TO NORMAL' : `${p.title}  ·  ${p.look}`);
          q.reopen();
        },
      }),
    ),
    byId.get('jump')!,
  ];

  const query = st.search.trim();
  const search = qaAction({
    id: 'search',
    title: query ? `Search: ${query.slice(0, 20)}` : 'Search switches',
    desc: query ? 'Tap to change. Empty clears.' : 'Tap, then type a word',
    label: query ? 'CHANGE' : 'SEARCH',
    color: AMBER,
    tap: (q) => {
      const v = env.askSearch(st.search);
      if (v === null) return;
      st.search = v.trim().slice(0, SEARCH_MAX);
      q.reopen();
    },
  });

  const metaRows = (ids: readonly string[]): QaRow[] => {
    const rows = ids.map((id) => byId.get(id)!).filter(Boolean);
    return sortOldLast(rows, (r) => !!metaOf(r.spec.id)?.old).flatMap((r) => (metaOf(r.spec.id) ? v2Rows(r, metaOf(r.spec.id), st) : [r]));
  };

  const sections: QaSection[] = [{ id: 'presets', title: 'PRESETS', rows: presetRows }];
  const find: QaRow[] = [search];
  if (query) {
    const hits = env.rows.map((r) => r.spec.id).filter((id) => metaOf(id) && matchesQuery(id, metaOf(id), query));
    find.push(...(hits.length ? metaRows(hits) : [qaNote({ id: 'noHits', lines: 1, text: () => `Nothing matches "${query}".` })]));
  }
  sections.push({ id: 'find', title: query ? `FIND: ${hitsLabel(query)}` : 'FIND A SWITCH', rows: find });
  if (!query) {
    for (const g of QA_GROUPS) {
      const ids = env.rows.map((r) => r.spec.id).filter((id) => metaOf(id)?.group === g && id !== 'jump');
      sections.push({ id: `g_${g}`, title: `${QA_GROUP_TITLE[g]} (${ids.length})`, rows: metaRows(ids) });
    }
  }
  return sections;
}

const hitsLabel = (q: string) => q.slice(0, 16).toUpperCase();


/** Section ids that start folded: every group. */
export const v2InitialCollapsed = (): Set<string> => new Set<string>(QA_GROUPS.map((g: QaGroup) => `g_${g}`));

