// Live "why it hits" strip in the event lane (rival-games study #3). While a held part hovers a match it reads
// "6 MACHINES 450 × COMBO 1.4 × BOOST 1.3 = 840"; after the drop the same ribbon counts the machines up one link at
// a time, then pops each multiplier in its PALETTE colour and lands the hit. The numbers come from core/hitFormula.ts;
// this file only draws. GameScene owns one instance and calls show() / play().
import Phaser from 'phaser';
import { fmtHit, formulaTokens, type FormulaToken, type HitFormula } from '../core/hitFormula';
import { hex } from '../core/marks';

const FONT = 'Lilita One, Arial Black';
/** Lane plate size (matches the event lane), the widest a row may print, and the smallest scale before it wraps. */
const LANE_W = 640;
const ROW_H = 50;
const MAX_ROW = 612;
const MIN_SCALE = 0.8;
const GAP = 9;
/** Ribbon pacing (ms): at least this far apart per link, per multiplier pop, and how long the full line holds. */
const LINK_GAP = 45;
const POP_GAP = 150;
const HOLD = 1700;
/** The hover strip waits for the held part to rest this long on a match, so a fast slide across matches stays cheap. */
const DWELL = 90;

interface Placed {
  tok: FormulaToken;
  text: Phaser.GameObjects.Text;
  strike?: Phaser.GameObjects.Graphics;
}

export class FormulaStrip {
  private c: Phaser.GameObjects.Container | null = null;
  private timers: Phaser.Time.TimerEvent[] = [];
  /** What is on the lane: the hover strip or a playing post-drop ribbon. */
  private mode: 'hover' | 'ribbon' | null = null;

  /** `laneY`: the event lane (the last row: the result lands here); `aboveY`: centre of the row just above the HP bar,
   *  where the earlier rows of a long formula go so the HP bar stays visible. Read on every draw (layout changes). */
  constructor(private scene: Phaser.Scene, private laneX: number, private laneY: () => number, private aboveY: () => number, private reduced = false) {}

  /** Hover strip: the whole formula at once, after a short dwell (`get` runs then). null hides the hover strip but
   *  lets a playing ribbon finish (the hold ends right as the drop starts its ribbon). */
  show(get: (() => HitFormula | null) | null) {
    if (!get && this.mode !== 'hover') return;
    this.clear();
    if (!get) return;
    this.mode = 'hover';
    this.at(DWELL, () => {
      const f = get();
      if (!f || this.mode !== 'hover') return;
      this.c = this.build(formulaTokens(f)).c;
      this.c.setAlpha(0);
      this.scene.tweens.add({ targets: this.c, alpha: 1, duration: 80, ease: 'Quad.Out' });
    });
  }

  /** Post-drop ribbon. `linkAt[i]`: ms from now when activation i of the cascade fires (same order as f.links);
   *  `hitAt`: ms when the hit lands on the monster (the multipliers pop from there). */
  play(f: HitFormula, linkAt: number[], hitAt: number) {
    this.clear();
    const { c, placed, groups } = this.build(formulaTokens(f));
    this.c = c;
    this.mode = 'ribbon';
    for (const p of placed) p.text.setAlpha(0), p.strike?.setAlpha(0);
    const count = placed.find((p) => p.tok.role === 'count')!.text;
    const base = placed.find((p) => p.tok.role === 'base')!.text;
    // one link at a time: activations sharing a beat are spread LINK_GAP apart
    const order = linkAt.map((t, i) => ({ t, i })).sort((a, b) => a.t - b.t || a.i - b.i);
    let t = 0, sum = 0, n = 0;
    for (const o of order) {
      t = Math.max(o.t, t + LINK_GAP);
      sum += f.links[o.i] ?? 0;
      const k = ++n, part = sum;
      // roster B: each link names its machine and its own number ("MORTAR 56") before the count settles
      const fam = f.linkFam?.[o.i], own = f.linkHit?.[o.i] ?? 0;
      this.at(t, () => {
        count.setText(fam && own > 0 ? `${k}: ${fam.replace('_', ' ').toUpperCase()} ${fmtHit(own)}` : `${k} MACHINE${k === 1 ? '' : 'S'}`).setAlpha(1);
        base.setText(fmtHit(part)).setAlpha(1);
        this.pop([count, base], 1.18);
      });
    }
    if (f.linkFam) this.at(t + LINK_GAP * 2, () => count.setText(`${n} MACHINE${n === 1 ? '' : 'S'}`));
    // then each multiplier, in its colour, and the hit (with MAX HIT when the cap bites)
    let at = Math.max(hitAt, t + POP_GAP);
    for (let gi = 1; gi < groups.length; gi++) {
      const g = groups[gi];
      this.at(at, () => {
        for (const p of g) p.text.setAlpha(1), p.strike?.setAlpha(1);
        this.pop(g.filter((p) => p.tok.role !== 'op').map((p) => p.text), gi === groups.length - 1 ? 1.45 : 1.3);
      });
      at += POP_GAP;
    }
    this.at(at + HOLD, () => {
      if (this.c !== c) return;
      this.scene.tweens.add({ targets: c, alpha: 0, duration: 250, onComplete: () => this.c === c && this.clear() });
    });
  }

  clear() {
    for (const t of this.timers) t.remove(false);
    this.timers = [];
    if (this.c) this.scene.tweens.killTweensOf(this.c);
    this.c?.destroy();
    this.c = null;
    this.mode = null;
  }

  private at(ms: number, fn: () => void) {
    this.timers.push(this.scene.time.delayedCall(ms, fn));
  }

  private pop(objs: Phaser.GameObjects.Text[], from: number) {
    if (this.reduced) return;
    // each word pops around its centre back to its row's fit scale
    for (const o of objs) {
      const k = (o.getData('k') as number) ?? 1;
      this.scene.tweens.killTweensOf(o);
      o.setScale(k * from);
      this.scene.tweens.add({ targets: o, scale: k, duration: 200, ease: 'Back.Out' });
    }
  }

  /** Lay the tokens out on lane plates: one row, shrunk to fit; too wide at MIN_SCALE = more rows. The last row sits
   *  in the lane, earlier rows stack above the HP bar (never over the board or the HP bar). Groups never split. */
  private build(tokens: FormulaToken[]) {
    const s = this.scene;
    const c = s.add.container(this.laneX, this.laneY()).setDepth(23);
    const placed: Placed[] = tokens.map((tok) => ({
      tok,
      text: s.add.text(0, 0, tok.text, { fontFamily: FONT, fontSize: tok.role === 'op' ? '26px' : tok.role === 'base' ? '26px' : '29px', color: hex(tok.hue), stroke: '#2b1d2e', strokeThickness: 4 }).setOrigin(0.5),
    }));
    const groups: Placed[][] = [];
    for (const p of placed) (groups[p.tok.group] ??= []).push(p);
    const width = (ps: Placed[]) => ps.reduce((w, p) => w + p.text.width, 0) + GAP * Math.max(0, ps.length - 1);
    // fill rows group by group up to the widest row that still prints at MIN_SCALE (a long formula takes 2-3 rows)
    const rows: Placed[][] = [[]];
    for (const g of groups) {
      const row = rows[rows.length - 1];
      if (row.length && width([...row, ...g]) * MIN_SCALE > MAX_ROW) rows.push([...g]);
      else row.push(...g);
    }
    // one scale for every row so the words stay the same size
    const k = Math.min(1, MAX_ROW / Math.max(...rows.map(width)));
    const up = this.aboveY() - this.laneY();
    rows.forEach((row, ri) => {
      const y = ri === rows.length - 1 ? 0 : up - (rows.length - 2 - ri) * (ROW_H + 4);
      c.add(s.add.graphics().fillStyle(0x2a2233, 1).fillRoundedRect(-LANE_W / 2, y - ROW_H / 2, LANE_W, ROW_H, 16).lineStyle(2, 0xffffff, 0.22).strokeRoundedRect(-LANE_W / 2, y - ROW_H / 2, LANE_W, ROW_H, 16));
      let x = (-width(row) * k) / 2;
      for (const p of row) {
        p.text.setPosition(x + (p.text.width * k) / 2, y + 1).setScale(k).setData('k', k);
        c.add(p.text);
        if (p.tok.struck) {
          p.strike = s.add.graphics().lineStyle(4, p.tok.hue, 1).lineBetween(x - 2, y + 1, x + p.text.width * k + 2, y + 1);
          c.add(p.strike);
        }
        x += (p.text.width + GAP) * k;
      }
    });
    return { c, placed, groups };
  }
}
