// Builds art-candidates/screens/index.html: ONE offline page (no external requests).
//   node art-candidates/screens/tools/build.mjs
// Inputs : art-candidates/screens/src/{kit,shell,shared,home,meta,level}.css, app.js, screens.mjs, src/assets/art/*.webp, Lilita One (woff2 from node_modules)
// Output : art-candidates/screens/index.html  (art + font embedded as base64 data URIs)
// Every picture is embedded ONCE as a CSS class `.a-<key>` (background-image) and reused by markup, so the file stays small.
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const REPO = path.resolve(ROOT, '..', '..');
const SRC = path.join(ROOT, 'src');
const ART = path.join(REPO, 'src', 'assets', 'art');

// max pixel size (long edge) per asset family; everything else gets DEFAULT_MAX. Authored for ~2x of the on-screen size.
const DEFAULT_MAX = 300;
const MAX_BY_PREFIX = [
  [/^(hero_bg|bg|road_bg)$/, 720],
  [/^stage_/, 560],
  [/^crate_/, 420],
  [/^hero_chassis/, 640],
  [/^(victory|defeat)$/, 380],
  [/^(boss_|trophy_)/, 320],
  [/^(target_|mon_)/, 300],
  [/^(cannon|coil|bell|battery|fan|rocket|mortar|arc_welder|horn|fuse_box|amplifier|signal_beacon|magnet|nail_gun|jackhammer|gear|saw_blade|unit_)/, 256],
  [/^(hm_)/, 300],
  [/^(star|icon_|crown|medal)/, 160],
  [/^(node_)/, 200],
  [/^card_/, 256],
];
const QUALITY_BY_PREFIX = [
  [/^(hero_bg|bg|road_bg|stage_)/, 74],
];

const read = (f) => fs.readFileSync(path.join(SRC, f), 'utf8');
const { screens, groups, defs } = await import(path.join(SRC, 'screens.mjs'));

const CSS_FILES = ['kit.css', 'shell.css', 'shared.css', 'home.css', 'meta.css', 'level.css', 'system.css'];
const css = CSS_FILES.map(read).join('\n');
const js = read('app.js');
const bodyHtml = screens.map((s) => s.html).join('\n');
const haystack = css + js + bodyHtml + defs;

// ---- which pictures are used ----------------------------------------------------------------
const used = new Set();
for (const m of haystack.matchAll(/\ba-([a-z0-9_]+)\b/g)) {
  if (fs.existsSync(path.join(ART, `${m[1]}.webp`))) used.add(m[1]);
}
const names = [...used].sort();

async function encode(name) {
  const max = (MAX_BY_PREFIX.find(([re]) => re.test(name)) ?? [null, DEFAULT_MAX])[1];
  const q = (QUALITY_BY_PREFIX.find(([re]) => re.test(name)) ?? [null, 82])[1];
  const buf = await sharp(path.join(ART, `${name}.webp`))
    .resize({ width: max, height: max, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: q, effort: 5, alphaQuality: 90 })
    .toBuffer();
  const meta = await sharp(buf).metadata();
  return { name, b64: buf.toString('base64'), w: meta.width, h: meta.height, bytes: buf.length };
}
const encoded = [];
for (const n of names) encoded.push(await encode(n));
const artCss = encoded
  .map((e) => `.a-${e.name}{background-image:url(data:image/webp;base64,${e.b64});--w:${e.w};--h:${e.h};--ar:${(e.w / e.h).toFixed(4)}}`)
  .join('\n');

// ---- font ------------------------------------------------------------------------------------
const fontPath = path.join(REPO, 'node_modules', '@fontsource', 'lilita-one', 'files', 'lilita-one-latin-400-normal.woff2');
const fontB64 = fs.readFileSync(fontPath).toString('base64');
const fontCss = `@font-face{font-family:'Lilita One';font-style:normal;font-weight:400;font-display:block;src:url(data:font/woff2;base64,${fontB64}) format('woff2')}`;

// ---- review shell ------------------------------------------------------------------------------
const groupHtml = groups
  .map((g) => {
    const items = screens.filter((s) => s.group === g.id);
    return `<section class="rv-group" id="g-${g.id}"><h2 class="rv-h2">${g.title}<small>${g.note}</small></h2><div class="rv-grid">${items
      .map(
        (s) => `<figure class="rv-cell" data-id="${s.id}" id="${s.id}">
  <figcaption><b>${s.title}</b><span>${s.note}</span></figcaption>
  <div class="phone"><div class="screen s-${s.id}" data-screen="${s.id}" data-stage="${s.stage ? 1 : 0}">${s.html}</div></div>
  <div class="rv-tools"><a href="?screen=${s.id}">solo</a>${s.stage ? `<button type="button" data-replay="${s.id}">replay</button>` : ''}</div>
</figure>`,
      )
      .join('\n')}</div></section>`;
  })
  .join('\n');

const nav = groups
  .map((g) => `<div class="rv-navg"><em>${g.title}</em>${screens.filter((s) => s.group === g.id).map((s) => `<a href="#${s.id}">${s.title}</a>`).join('')}</div>`)
  .join('');

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="color-scheme" content="dark">
<title>One More Merge Screens</title>
<style>
${fontCss}
${css}
${artCss}
</style>
</head>
<body>
<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>${defs}</defs></svg>
<header class="rv-head">
  <div class="rv-title"><b>One More Merge</b><span>Screen mockups, style A (toy enamel). Candidates only, nothing is wired into the game. Add <code>?screen=&lt;id&gt;</code> for one screen at 390x844, <code>&amp;t=1200</code> to freeze animations at 1.2 s.</span></div>
  <nav class="rv-nav">${nav}</nav>
</header>
<main class="rv-main">
${groupHtml}
</main>
<script>
${js}
</script>
</body>
</html>`;

fs.writeFileSync(path.join(ROOT, 'index.html'), html);
const total = encoded.reduce((a, e) => a + e.bytes, 0);
console.log(`pictures: ${encoded.length}, art ${(total / 1024).toFixed(0)} KB (raw), font ${(fontB64.length * 0.75 / 1024).toFixed(0)} KB`);
console.log(`index.html ${(Buffer.byteLength(html) / 1024 / 1024).toFixed(2)} MB, screens: ${screens.length}`);
