import { describe, expect, it } from 'vitest';
import sharp from 'sharp';

// plain-JS tool without type declarations: variable specifier keeps tsc from demanding them
const toolPath = '../tools/slice-sheet.mjs';
const { sliceSheet } = (await import(/* @vite-ignore */ toolPath)) as {
  sliceSheet: (sheet: Buffer, o: Record<string, unknown>) => Promise<{ pass: boolean; cells: { name: string; pass: boolean; failed: string[] }[] }>;
};

const C = 160; // cell size
type RGB = [number, number, number];
const MAGENTA: RGB = [255, 0, 255];

/** Raw RGB sheet painter: fills with the key, then runs draw ops. */
class Sheet {
  readonly w: number;
  readonly h: number;
  readonly px: Buffer;
  constructor(cols: number, rows: number, bg: RGB = MAGENTA) {
    this.w = cols * C;
    this.h = rows * C;
    this.px = Buffer.alloc(this.w * this.h * 3);
    this.rect(0, 0, this.w, this.h, bg);
  }
  rect(x: number, y: number, w: number, h: number, c: RGB) {
    for (let j = Math.max(0, y); j < Math.min(this.h, y + h); j++)
      for (let i = Math.max(0, x); i < Math.min(this.w, x + w); i++) this.px.set(c, (j * this.w + i) * 3);
  }
  disc(cx: number, cy: number, r: number, c: RGB) {
    for (let j = cy - r; j <= cy + r; j++)
      for (let i = cx - r; i <= cx + r; i++) if ((i - cx) ** 2 + (j - cy) ** 2 <= r * r) this.rect(i, j, 1, 1, c);
  }
  /** Gadget: dark outline ring, orange body, in cell (col,row). */
  gadget(col: number, row: number, r = 46) {
    const cx = col * C + C / 2, cy = row * C + C / 2;
    this.disc(cx, cy, r + 3, [60, 30, 20]);
    this.disc(cx, cy, r, [230, 130, 40]);
  }
  png() {
    return sharp(this.px, { raw: { width: this.w, height: this.h, channels: 3 } }).png().toBuffer();
  }
}

const run = async (s: Sheet, extra: Record<string, unknown> = {}) =>
  sliceSheet(await s.png(), { grid: [2, 1], key: 'magenta', names: ['a', 'b'], ...extra });

describe('slice-sheet gates', () => {
  it('passes a clean magenta sheet', async () => {
    const s = new Sheet(2, 1);
    s.gadget(0, 0);
    s.gadget(1, 0, 40);
    const r = await run(s);
    expect(r.cells.map((c) => c.failed)).toEqual([[], []]);
    expect(r.pass).toBe(true);
  });

  it('trims and re-pads: output is square with transparent corners', async () => {
    const s = new Sheet(2, 1);
    s.gadget(0, 0);
    s.gadget(1, 0);
    const r = (await run(s)) as unknown as { cellsRaw: { png: Buffer }[] };
    const m = await sharp(r.cellsRaw[0].png).metadata();
    expect(m.width).toBe(m.height);
    expect(m.width).toBe(256); // 2x of 128
    const raw = await sharp(r.cellsRaw[0].png).ensureAlpha().raw().toBuffer();
    expect(raw[3]).toBe(0);
  });

  it('keeps the dark outline and cleans a pink key fringe', async () => {
    const s = new Sheet(2, 1);
    s.gadget(0, 0);
    const cx = C + C / 2, cy = C / 2;
    s.disc(cx, cy, 51, [245, 70, 200]); // key blended into the edge
    s.gadget(1, 0);
    const r = (await run(s)) as unknown as { pass: boolean; cellsRaw: { png: Buffer }[] };
    expect(r.pass).toBe(true);
    const { data, info } = await sharp(r.cellsRaw[1].png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const row = (info.height >> 1) * info.width;
    let first = 0;
    while (data[(row + first) * 4 + 3] < 200) first++;
    const o = (row + first + 5) * 4;
    const [R, G, B] = [data[o], data[o + 1], data[o + 2]];
    expect(0.2126 * R + 0.7152 * G + 0.0722 * B).toBeLessThan(90); // outline, not orange or pink
  });

  it('trips cellBorder on a sliver at the cell edge', async () => {
    const s = new Sheet(2, 1);
    s.gadget(0, 0);
    s.gadget(1, 0);
    s.rect(C + 60, 0, 30, 6, [40, 90, 200]); // neighbour spill hanging into cell b
    const r = await run(s);
    expect(r.cells[1].failed).toContain('cellBorder');
    expect(r.cells[0].failed).toEqual([]);
    expect(r.pass).toBe(false);
  });

  it('trips whiteInHoles when a hole is filled with white', async () => {
    const s = new Sheet(2, 1);
    s.gadget(0, 0);
    s.gadget(1, 0);
    s.disc(C + C / 2, C / 2, 14, [255, 255, 255]); // should have been magenta/transparent
    const r = await run(s);
    expect(r.cells[1].failed).toContain('whiteInHoles');
    expect(r.cells[0].failed).toEqual([]);
  });

  it('keeps a key-coloured hole transparent (no whiteInHoles, no keyLeft)', async () => {
    const s = new Sheet(2, 1);
    s.gadget(0, 0);
    s.gadget(1, 0);
    s.disc(C + C / 2, C / 2, 14, MAGENTA);
    const r = await run(s);
    expect(r.pass).toBe(true);
  });

  it('trips halo on a pale ring around a dark shape', async () => {
    const s = new Sheet(2, 1);
    s.gadget(0, 0);
    const cx = C + C / 2, cy = C / 2;
    s.disc(cx, cy, 52, [250, 235, 235]); // 4px pale fringe
    s.disc(cx, cy, 48, [50, 40, 90]);
    const r = await run(s);
    expect(r.cells[1].failed).toContain('halo');
    expect(r.cells[0].failed).toEqual([]);
  });

  it('trips keyLeft on magenta-tinted fill that survives keying', async () => {
    const s = new Sheet(2, 1);
    s.gadget(0, 0);
    s.disc(C + C / 2, C / 2, 46, [225, 70, 225]);
    const r = await run(s);
    expect(r.cells[1].failed).toContain('keyLeft');
  });

  it('trips aspect when a 4:1 strip is requested but the art is square', async () => {
    const s = new Sheet(2, 1);
    s.gadget(0, 0);
    s.gadget(1, 0);
    const ok = await run(s, { aspects: [1] });
    expect(ok.pass).toBe(true);
    const wide = await run(s, { aspects: [4] });
    expect(wide.cells[0].failed).toContain('aspect');
    expect(wide.pass).toBe(false);
  });

  it('trips coverage on a speck and reports an empty cell', async () => {
    const s = new Sheet(2, 1);
    s.gadget(0, 0);
    s.disc(C + C / 2, C / 2, 3, [20, 20, 20]);
    const r = await run(s);
    expect(r.cells[1].failed).toContain('coverage');
    const empty = new Sheet(2, 1);
    empty.gadget(0, 0);
    const r2 = await run(empty);
    expect(r2.cells[1].failed).toContain('empty');
  });

  it('works with a white key', async () => {
    const s = new Sheet(2, 1, [255, 255, 255]);
    s.gadget(0, 0);
    s.gadget(1, 0);
    const r = await sliceSheet(await s.png(), { grid: [2, 1], key: 'white', names: ['a', 'b'] });
    expect(r.pass).toBe(true);
  });
});
