// Counts display objects the ROAD tab creates (estimate from the layout), and texture memory of the art. Run: npx vite-node tools/roadCount.ts
import { readdirSync, readFileSync } from 'node:fs';
import { LEVELS } from '../src/content/levels';
import { layoutRoad, ROAD } from '../src/game/road/pathGen';

const lay = layoutRoad(LEVELS);
const per = ROAD.levelsPerChapter;
const done = lay.nodes.length;
console.log('levels', LEVELS.length, 'chapters', lay.chapters.length, 'segments', lay.segments.length, 'pts/seg', lay.segments[0].pts.length, 'chests', lay.chests.length);
// per node (non-current): kindBack(0-1) + image + level text + 0-3 stars + kindFront(0-2) + zone ~ 5..9
const nodeObjs = lay.nodes.reduce((a, n) => a + 1 + 1 + 1 + (n.kind === 'mini' ? 1 : 0) + (n.kind !== 'normal' || n.ribbon !== 'none' ? 2 : 0), 0);
console.log('node objects (locked/open, no stars)', nodeObjs, 'chapter with most nodes:', per);
console.log('per chapter fixed objs: gate gfx+text+tease+fog+3 clouds+banner(gfx+2 text)+veil ~', 10);
const dir = 'src/assets/art';
let bytes = 0, texMem = 0, big = 0;
const rows: { f: string; w: number; h: number; kb: number }[] = [];
for (const f of readdirSync(dir)) {
  if (!f.endsWith('.webp')) continue;
  const b = readFileSync(`${dir}/${f}`);
  bytes += b.length;
  // VP8 / VP8L / VP8X dimension parsing
  let w = 0, h = 0;
  const fmt = b.toString('ascii', 12, 16);
  if (fmt === 'VP8 ') { w = b.readUInt16LE(26) & 0x3fff; h = b.readUInt16LE(28) & 0x3fff; }
  else if (fmt === 'VP8L') { const v = b.readUInt32LE(21); w = (v & 0x3fff) + 1; h = ((v >> 14) & 0x3fff) + 1; }
  else if (fmt === 'VP8X') { w = b.readUIntLE(24, 3) + 1; h = b.readUIntLE(27, 3) + 1; }
  texMem += w * h * 4;
  if (w > 2048 || h > 2048) big++;
  rows.push({ f, w, h, kb: Math.round(b.length / 1024) });
}
console.log('webp files', rows.length, 'disk MB', (bytes / 1048576).toFixed(1), 'GPU MB (w*h*4)', (texMem / 1048576).toFixed(1), 'over 2048px', big);
const road = rows.filter((r) => /^(road|node_|medal|prop_|bg|chapterScenery|nodeFrame|pathTile|avatar|fog|chest)/.test(r.f));
for (const r of road) console.log(' ', r.f, `${r.w}x${r.h}`, `${r.kb}KB`, `${((r.w * r.h * 4) / 1048576).toFixed(2)}MB`);
console.log('largest 8 by GPU memory:');
for (const r of rows.sort((a, b) => b.w * b.h - a.w * a.h).slice(0, 8)) console.log(' ', r.f, `${r.w}x${r.h}`, `${((r.w * r.h * 4) / 1048576).toFixed(2)}MB`);
console.log('nodes', done);
