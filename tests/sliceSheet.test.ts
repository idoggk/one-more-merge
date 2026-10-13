import { describe, expect, it } from 'vitest';
import sharp from 'sharp';

// plain-JS tool without type declarations: variable specifier keeps tsc from demanding them
const toolPath = '../tools/slice-sheet.mjs';
const { sliceSheet, fillGate } = (await import(/* @vite-ignore */ toolPath)) as {
  sliceSheet: (sheet: Buffer, o: Record<string, unknown>) => Promise<{ pass: boolean; cells: { name: string; pass: boolean; failed: string[] }[] }>;
  fillGate: (ob: { x: number; y: number; w: number; h: number }, w: number, h: number, kind: string) => { status: string };
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

  describe('graded gates, kinds, despeckle', () => {
    type Out = {
      pass: boolean;
      status: string;
      cells: { name: string; status: string; failed: string[]; warned: string[]; flags: string[]; gates: Record<string, { status: string; value: unknown; threshold: unknown }> }[];
    };
    const one = async (s: Sheet, extra: Record<string, unknown> = {}) =>
      (await sliceSheet(await s.png(), { grid: [1, 1], key: 'magenta', names: ['a'], ...extra })) as unknown as Out;
    const BRASS: RGB = [150, 100, 30];
    const CREAM: RGB = [250, 240, 215];
    /** Outlined plate of the given size, brass frame and a cream centre, centred in cell (0,0). */
    const plate = (s: Sheet, w: number, h: number, frame = 8) => {
      const x = (C - w) / 2, y = (C - h) / 2;
      s.rect(x, y, w, h, BRASS);
      s.rect(x + frame, y + frame, w - 2 * frame, h - 2 * frame, CREAM);
    };

    it('a stray near-magenta pixel at the cell corner no longer trips cellBorder', async () => {
      const s = new Sheet(1, 1);
      plate(s, 110, 110);
      s.rect(0, C - 1, 1, 1, [200, 40, 200]); // like the raw (0,1253) pixel
      s.rect(C - 1, 0, 2, 1, [30, 30, 30]);
      const r = await one(s, { kind: 'panel' });
      expect(r.cells[0].failed).toEqual([]);
      expect(r.cells[0].gates.cellBorder.status).toBe('pass');
    });

    it('a stray pixel is only forgiven below the despeckle threshold: a larger sliver still fails', async () => {
      const s = new Sheet(1, 1);
      plate(s, 110, 110);
      s.rect(60, 0, 30, 6, [40, 90, 200]);
      const r = await one(s, { kind: 'panel' });
      expect(r.cells[0].failed).toContain('cellBorder');
      expect(r.pass).toBe(false);
    });

    it('a strip touching both short ends passes with kind strip and fails as a panel', async () => {
      const mk = () => {
        const s = new Sheet(1, 1);
        s.rect(0, 62, C, 36, BRASS);
        s.rect(0, 70, C, 20, CREAM);
        return s;
      };
      const strip = await one(mk(), { kind: 'strip', aspects: [4] });
      expect(strip.cells[0].gates.cellBorder.status).toBe('pass');
      expect(strip.cells[0].failed).toEqual([]);
      const panel = await one(mk(), { kind: 'panel', aspects: [4] });
      expect(panel.cells[0].failed).toContain('cellBorder');
    });

    it('a strip must still keep its long sides clear of the cell border', async () => {
      const s = new Sheet(1, 1);
      s.rect(0, 0, C, 40, BRASS); // touches the top edge: a real defect even for a strip
      const r = await one(s, { kind: 'strip' });
      expect(r.cells[0].failed).toContain('cellBorder');
    });

    it('a big cream panel centre is content, not a white hole', async () => {
      const s = new Sheet(1, 1);
      s.rect(30, 30, 100, 100, BRASS);
      s.rect(38, 38, 84, 84, [255, 255, 250]); // near-white centre, ~70% of the plate
      const r = await one(s, { kind: 'panel' });
      expect(r.cells[0].gates.whiteInHoles.status).toBe('pass');
      expect(r.cells[0].failed).toEqual([]);
    });

    it('a real white blob inside a hole still fails whiteInHoles', async () => {
      const s = new Sheet(1, 1);
      s.disc(C / 2, C / 2, 56, [60, 30, 20]);
      s.disc(C / 2, C / 2, 50, [230, 130, 40]);
      s.disc(C / 2, C / 2, 12, [255, 255, 255]);
      const r = await one(s, { kind: 'icon' });
      expect(r.cells[0].failed).toContain('whiteInHoles');
    });

    it('a halo still fails in every kind', async () => {
      for (const kind of ['panel', 'icon', 'strip']) {
        const s = new Sheet(1, 1);
        s.disc(C / 2, C / 2, 56, [250, 235, 235]);
        s.disc(C / 2, C / 2, 50, [50, 40, 90]);
        const r = await one(s, { kind });
        expect(r.cells[0].failed, kind).toContain('halo');
      }
    });

    it('aspect is graded: within 10% pass, 10-25% warn (flagged, still sliced), over 25% fail', async () => {
      const bar = (w: number) => {
        const s = new Sheet(1, 1);
        s.rect((C - w) / 2, 60, w, 40, BRASS);
        return s;
      };
      const pass = await one(bar(80), { aspects: [2] }); // 2.0
      expect(pass.cells[0].gates.aspect.status).toBe('pass');
      const warn = await one(bar(96), { aspects: [2] }); // 2.4, 20% off
      expect(warn.cells[0].gates.aspect.status).toBe('warn');
      expect(warn.cells[0].flags).toContain('aspect-warn');
      expect(warn.cells[0].gates.aspect.value as number).toBeGreaterThan(2.2); // measured ratio (alpha eroded 1 px)
      expect(warn.cells[0].gates.aspect.value as number).toBeLessThan(2.5);
      expect(warn.pass).toBe(true);
      expect(warn.status).toBe('warn');
      const fail = await one(bar(120), { aspects: [2] }); // 3:1 vs 2:1, 50% off
      expect(fail.cells[0].gates.aspect.status).toBe('fail');
      expect(fail.pass).toBe(false);
    });

    it('coverage has a warn band between pass and fail', async () => {
      const mk = (r: number) => {
        const s = new Sheet(1, 1);
        s.disc(C / 2, C / 2, r, [20, 20, 120]);
        return s;
      };
      expect((await one(mk(40))).cells[0].gates.coverage.status).toBe('pass'); // ~0.2
      expect((await one(mk(11))).cells[0].gates.coverage.status).toBe('warn'); // ~0.015
      expect((await one(mk(5))).cells[0].gates.coverage.status).toBe('fail'); // ~0.003
    });

    it('every gate reports status, value and threshold; unknown kind throws', async () => {
      const s = new Sheet(1, 1);
      s.disc(C / 2, C / 2, 45, [230, 130, 40]);
      const r = await one(s);
      for (const g of Object.values(r.cells[0].gates)) {
        expect(['pass', 'warn', 'fail']).toContain(g.status);
        expect(g).toHaveProperty('value');
        expect(g).toHaveProperty('threshold');
      }
      await expect(one(s, { kind: 'banana' })).rejects.toThrow(/unknown kind/);
    });
  });

  describe('trim to the object box and the fill gates', () => {
    const BRASS: RGB = [150, 100, 30];
    type Raw = { cellsRaw: { png: Buffer; width: number; height: number }[]; cells: { failed: string[]; gates: Record<string, { status: string }> }[] };
    const slice = async (s: Sheet, extra: Record<string, unknown>) =>
      (await sliceSheet(await s.png(), { grid: [1, 1], key: 'magenta', names: ['a'], ...extra })) as unknown as Raw;
    /** alpha bbox of the written PNG */
    const alphaBox = async (png: Buffer) => {
      const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      let x0 = info.width, x1 = -1, y0 = info.height, y1 = -1;
      for (let y = 0; y < info.height; y++)
        for (let x = 0; x < info.width; x++)
          if (data[(y * info.width + x) * 4 + 3] > 8) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
      return { w: x1 - x0 + 1, h: y1 - y0 + 1, W: info.width, H: info.height };
    };

    it('regression: a 9.4:1 bar asked for 11:1 is trimmed to the object (was 34% of the canvas width)', async () => {
      const s = new Sheet(1, 1);
      s.rect(4, 70, 152, 16, BRASS); // 9.5:1
      const r = await slice(s, { kind: 'strip', aspects: [11] });
      const b = await alphaBox(r.cellsRaw[0].png);
      expect(b.w / b.W).toBeGreaterThanOrEqual(0.9);
      expect(r.cells[0].gates.fill.status).toBe('pass');
      expect(r.cells[0].failed).toEqual([]);
      expect(b.W).toBeGreaterThanOrEqual(1000); // strips are written at 1024 wide, not 256
    });

    it('a small object in a big cell is cropped to its box for every kind', async () => {
      for (const kind of ['panel', 'strip', 'icon']) {
        const s = new Sheet(1, 1);
        s.rect(60, 70, 40, 18, BRASS);
        const r = await slice(s, { kind });
        const b = await alphaBox(r.cellsRaw[0].png);
        expect(Math.max(b.w / b.W, b.h / b.H), kind).toBeGreaterThanOrEqual(kind === 'strip' ? 0.9 : 0.7);
      }
    });

    it('fillGate fails a tiny object in a big canvas: strips under 90% of the width, other kinds under 70%', () => {
      const small = { x: 0, y: 0, w: 88, h: 11 }; // the old shipped bars: 88 px in a 256 canvas
      expect(fillGate(small, 256, 23, 'strip').status).toBe('fail');
      expect(fillGate({ ...small, w: 231 }, 256, 23, 'strip').status).toBe('pass'); // 90.2%
      expect(fillGate({ ...small, w: 230 }, 256, 23, 'strip').status).toBe('fail'); // 89.8%
      expect(fillGate({ x: 0, y: 0, w: 70, h: 70 }, 256, 256, 'panel').status).toBe('fail');
      expect(fillGate({ x: 0, y: 0, w: 190, h: 60 }, 256, 256, 'panel').status).toBe('pass');
      expect(fillGate({ x: 0, y: 0, w: 60, h: 200 }, 256, 256, 'unit').status).toBe('pass'); // tall unit: larger side counts
      expect(fillGate({ x: 0, y: 0, w: 60, h: 100 }, 256, 256, 'icon').status).toBe('fail');
    });

    it('a violet / pink subject on the green key slices clean; on the magenta key the key gate trips', async () => {
      const PINKISH: RGB = [200, 60, 225]; // within the magenta key's tolerance + feather band
      const mk = (bg: RGB) => {
        const s = new Sheet(1, 1, bg);
        s.disc(C / 2, C / 2, 45, PINKISH);
        return s;
      };
      const green = await slice(mk([0, 255, 0]), { kind: 'icon', key: 'green' });
      expect(green.cells[0].failed).toEqual([]);
      const magenta = await slice(mk(MAGENTA), { kind: 'icon', key: 'magenta' });
      expect(magenta.cells[0].failed.length).toBeGreaterThan(0);
    });

    it('a hairline strip fails minHeight (object under 24 px tall at 1x)', async () => {
      const s = new Sheet(1, 1);
      s.rect(4, 78, 152, 3, BRASS); // 50:1
      const r = await slice(s, { kind: 'strip' });
      expect(r.cells[0].failed).toContain('minHeight');
    });
  });

  it('works with a white key', async () => {
    const s = new Sheet(2, 1, [255, 255, 255]);
    s.gadget(0, 0);
    s.gadget(1, 0);
    const r = await sliceSheet(await s.png(), { grid: [2, 1], key: 'white', names: ['a', 'b'] });
    expect(r.pass).toBe(true);
  });
});
