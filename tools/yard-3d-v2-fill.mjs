// Fill report for art-candidates/screw-yard-3d-v2: per asset, how much of its manifest slot the content (alpha > 8) covers,
// and the padding on each side. Writes FILL_REPORT.md next to the 1x/2x folders.
// Usage: node tools/yard-3d-v2-fill.mjs [--dir art-candidates/screw-yard-3d-v2]
import sharp from 'sharp';
import { readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const i = process.argv.indexOf('--dir');
const DIR = i > 0 ? process.argv[i + 1] : 'art-candidates/screw-yard-3d-v2';
const FRAMES = { screw_spin_frames: 12 };
const rows = [];
let bad = 0;
for (const f of readdirSync(join(DIR, '1x')).filter((x) => x.endsWith('.png')).sort()) {
  const id = f.replace('.png', '');
  const { data, info } = await sharp(join(DIR, '1x', f)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const n = id.startsWith('screw_spin_frames') ? 12 : 1;
  const cw = info.width / n, ch = info.height;
  let x0 = cw, y0 = ch, x1 = -1, y1 = -1; // union over frames, each frame measured in its own cell
  for (let y = 0; y < ch; y++) for (let x = 0; x < info.width; x++) {
    if (data[(y * info.width + x) * 4 + 3] > 8) { const cx = x % cw; if (cx < x0) x0 = cx; if (cx > x1) x1 = cx; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  }
  const bw = x1 - x0 + 1, bh = y1 - y0 + 1;
  const fw = bw / cw * 100, fh = bh / ch * 100;
  const pl = x0, pr = cw - 1 - x1, pt = y0, pb = ch - 1 - y1;
  const lim = Math.max(fw, fh);
  const centred = Math.abs(pl - pr) <= 1 && Math.abs(pt - pb) <= 1;
  const ok = lim >= 84 && lim <= 90 && centred;
  if (!ok) bad++;
  rows.push(`| ${id} | ${cw}x${ch} | ${bw}x${bh} | ${fw.toFixed(0)}% | ${fh.toFixed(0)}% | ${pl} / ${pr} / ${pt} / ${pb} | ${ok ? 'ok' : 'check'} |`);
}
const md = `# Fill report: screw-yard-3d-v2 (1x files)

Content = pixels with alpha > 8 (object, ink outline and baked shadow), measured against the manifest slot.
Rule: the limiting axis fills 84-90% (6-8% padding per side) and the content is centred (left/right and top/bottom padding within 1 px).
The renderer fits every asset to its slot (union bbox over all frames, same crop for spin frames); fill on the other axis follows the object's own aspect.

| asset | slot | content | fill W | fill H | pad L / R / T / B (px) | check |
|---|---|---|---|---|---|---|
${rows.join('\n')}

${bad} asset(s) flagged "check".
`;
writeFileSync(join(DIR, 'FILL_REPORT.md'), md);
console.log(md);
