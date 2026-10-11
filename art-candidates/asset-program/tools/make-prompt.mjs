// Builds a paste-ready GPT sheet prompt from a unit spec, using the shared style block (prompts/00_style_block.md) so every unit gets the same rules.
// Usage: node art-candidates/asset-program/tools/make-prompt.mjs [units/<id>.json ...]   (no args: every units/*.json)
// Output: prompts/units/<id>.md
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url)), ROOT = join(HERE, '..');
const styleMd = readFileSync(join(ROOT, 'prompts/00_style_block.md'), 'utf8');
const block = styleMd.split('```')[1].trim();
const files = process.argv.slice(2).length ? process.argv.slice(2) : readdirSync(join(ROOT, 'units')).filter((f) => f.endsWith('.json')).map((f) => join(ROOT, 'units', f));
for (const f of files) {
  const u = JSON.parse(readFileSync(f, 'utf8'));
  if (u.ranks.length !== 8) throw new Error(`${u.id}: need exactly 8 rank lines`);
  let style = block.replace('([HEX])', `(${u.colorName}, ${u.color})`);
  if (u.colourLine) style = style.replace(/COLOUR:[^\n]*/, `COLOUR: ${u.colourLine}`);
  const ladder = u.ranks.map((r, i) => `${i + 1}. ${r}`).join('\n');
  const prompt = `Create image. Use my 3 attached anchor sheets as the exact reference for BOTH the art style and the sheet format.

Make one sheet: 4 columns x 2 rows = 8 equal cells, reading order left to right, top to bottom, landscape 3:2. It shows ONE machine, ${u.noun}, at 8 upgrade ranks. Rank 1 top-left, rank 4 top-right, rank 5 bottom-left, rank 8 bottom-right.${u.identity ? '\n\nIDENTITY: ' + u.identity : ''}

${style}

LAYOUT: pure flat white #ffffff background and nothing else. Each machine centred in its own cell with a wide white margin; machines never touch each other, the cell borders or the sheet edge. Roughly the same size on the sheet.

FORBIDDEN: any text, numbers, labels, watermarks, rank badges, crowns, frames, grid lines, ANY shadow under or around the machine (the plate edge meets the white directly), glow halos or aura around the machine, floating sparkles, smoke or particles.${u.attached ? ' ' + u.attached : ''}

RANK LADDER (the SAME machine growing):
${ladder}

Before you answer, check: if every machine were filled solid black, neighbouring ranks would look clearly different; the family colour is the main colour in every cell; the machine fills its cell and the plate is small; no text; no shadow; white background.`;
  const md = `# ${u.name}: ranks 1-8, first pass (generated from \`units/${u.id}.json\` and \`prompts/00_style_block.md\`)

Attach \`anchors/anchor_cannon_ranks1-8.png\`, \`anchor_coil_ranks1-8.png\`, \`anchor_bell_ranks1-8.png\` (or use the chat that already has the gadget art). Save the result as \`inbox/${u.id}_sheet_v1.png\`.

Unit: ${u.role}, ${u.rarity}, ${u.colorName} \`${u.color}\`. ${u.axis}

\`\`\`
${prompt}
\`\`\`
`;
  writeFileSync(join(ROOT, 'prompts/units', `${u.id}.md`), md);
  console.log('wrote prompts/units/' + u.id + '.md');
}
