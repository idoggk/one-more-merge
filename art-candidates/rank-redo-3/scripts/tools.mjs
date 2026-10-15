// usage:
//  node tools.mjs fit <cellsDir> <outDir> <unit_rank,...>   : cell pngs (c1..) -> 256px webp fitted into 250 box
//  node tools.mjs score <unit> [ovrDir ...]              : overlay all piece dirs, run rank-clarity on temp out
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
const [cmd, ...a] = process.argv.slice(2);
const R = 'art-candidates';
if (cmd === 'fit') {
  const [dir, out, names] = a; fs.mkdirSync(out, { recursive: true });
  for (const n of names.split(',')) {
    const f = path.join(dir, n + '.png'); if (!fs.existsSync(f)) continue;
    const t = await sharp(f).trim({ threshold: 5 }).resize(250, 250, { fit: 'inside' }).toBuffer();
    await sharp(t).extend({ top: 3, bottom: 3, left: 3, right: 3, background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .resize(256, 256, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).webp({ quality: 92 }).toFile(path.join(out, n + '.webp'));
  }
}
if (cmd === 'ref') { // ref unit rank -> _tmp/ref_unit_rank.jpg (latest piece, flat on white)
  const [unit, rank] = a; let src;
  for (const d of ['rank-clarity', 'rank-redo-1', 'rank-redo-2', 'rank-redo-3']) { const f = path.join(R, d, 'pieces', `${unit}_${rank}.webp`); if (fs.existsSync(f)) src = f; }
  await sharp(src).flatten({ background: '#fff' }).resize(512, 512).jpeg({ quality: 90 }).toFile(path.join(R, 'rank-redo-3/_tmp', `ref_${unit}_${rank}.jpg`));
  console.log('ref from', src);
}
if (cmd === 'try') { // try <unit> <rank> <cand.webp...>: score each candidate as unit_rank, print pair lines only
  const [unit, rank, ...cands] = a;
  for (const c of cands) {
    const tmp = path.join(R, 'rank-redo-3/_tmp/rc');
    fs.mkdirSync(path.join(tmp, 'pieces'), { recursive: true });
    fs.copyFileSync(path.join(R, 'rank-clarity/manifest.json'), path.join(tmp, 'manifest.json'));
    for (const d of [path.join(R, 'rank-clarity/pieces'), path.join(R, 'rank-redo-1/pieces'), path.join(R, 'rank-redo-2/pieces'), path.join(R, 'rank-redo-3/pieces')]) if (fs.existsSync(d)) for (const f of fs.readdirSync(d)) if (f.endsWith('.webp')) fs.copyFileSync(path.join(d, f), path.join(tmp, 'pieces', f));
    fs.copyFileSync(c, path.join(tmp, 'pieces', `${unit}_${rank}.webp`));
    const out = execFileSync('node', ['tools/rank-clarity.mjs', '--units', unit, '--no-strips', '--out', tmp], { encoding: 'utf8' });
    console.log(c, '\n' + out.split('\n').filter((l) => new RegExp(`${unit}.*(${rank - 1}-${rank}|${rank}-${+rank + 1})`).test(l)).join('\n'));
  }
}
if (cmd === 'score') {
  const tmp = path.join(R, 'rank-redo-3/_tmp/rc');
  fs.mkdirSync(path.join(tmp, 'pieces'), { recursive: true });
  fs.copyFileSync(path.join(R, 'rank-clarity/manifest.json'), path.join(tmp, 'manifest.json'));
  const dirs = [path.join(R, 'rank-clarity/pieces'), path.join(R, 'rank-redo-1/pieces'), path.join(R, 'rank-redo-2/pieces'), path.join(R, 'rank-redo-3/pieces')];
  for (const d of dirs) if (fs.existsSync(d)) for (const f of fs.readdirSync(d)) if (f.endsWith('.webp')) fs.copyFileSync(path.join(d, f), path.join(tmp, 'pieces', f));
  console.log(execFileSync('node', ['tools/rank-clarity.mjs', '--units', a[0], '--no-strips', '--out', tmp], { encoding: 'utf8' }));
}
