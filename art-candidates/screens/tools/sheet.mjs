// Review helper: contact sheet of PNGs from a folder so they can be looked at in one picture.
// usage: node art-candidates/screens/tools/sheet.mjs <png-folder> <out.png> <cell> <cols> name1 name2 ...
import sharp from 'sharp';

const [, , dir, out, cellS, colsS, ...names] = process.argv;
const cell = Number(cellS);
const cols = Number(colsS);
const rows = Math.ceil(names.length / cols);
const comps = [];
for (let i = 0; i < names.length; i++) {
  const buf = await sharp(`${dir}/${names[i]}.png`)
    .resize(cell - 8, cell - 8, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  comps.push({ input: buf, left: (i % cols) * cell + 4, top: Math.floor(i / cols) * cell + 4 });
}
await sharp({ create: { width: cols * cell, height: rows * cell, channels: 4, background: '#8a7a9a' } })
  .composite(comps)
  .png()
  .toFile(out);
console.log('wrote', out);
