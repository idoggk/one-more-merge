// Writes `floor_s` (the clear-time floor of tools/pace-lib.ts floorFor) into every entry of src/content/levelPace2.json.
// levelPace2.json is tool-written, never hand-edited. Usage: npx vite-node tools/write-floors.ts
import { readFileSync, writeFileSync } from 'node:fs';
import { floorFor } from './pace-lib';

const path = new URL('../src/content/levelPace2.json', import.meta.url);
const doc = JSON.parse(readFileSync(path, 'utf8')) as { levels: Record<string, { floor_s?: number }> };
for (const k of Object.keys(doc.levels)) doc.levels[k].floor_s = floorFor(Number(k));
writeFileSync(path, JSON.stringify(doc, null, 2) + '\n');
console.log(`floor_s written for ${Object.keys(doc.levels).length} levels`);
