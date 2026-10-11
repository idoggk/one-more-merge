// Shared by gen-asset-registry.mjs and build-asset-hub.mjs: the registry data lives as JSON between two marker
// lines inside src/content/assetRegistry.ts, so the .ts stays typed and the tools can read/write it without a TS loader.
import { readFileSync } from 'node:fs';

export const REGISTRY_PATH = 'src/content/assetRegistry.ts';
export const BEGIN = '// <<REGISTRY-DATA';
export const END = '// REGISTRY-DATA>>';

export function readRegistry(path = REGISTRY_PATH) {
  const text = readFileSync(path, 'utf8');
  const a = text.indexOf(BEGIN);
  const b = text.indexOf(END);
  if (a < 0 || b < 0) throw new Error(`${path}: registry markers missing`);
  const body = text.slice(text.indexOf('\n', a) + 1, b);
  const json = body.slice(body.indexOf('= [') + 2, body.lastIndexOf(']') + 1);
  return JSON.parse(json.replace(/,(\s*\])$/, '$1'));
}
