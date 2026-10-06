// Builds dist/artifact.html (body-only page for the claude.ai Artifact host) from the Vite build,
// and writes dist/artifact-files.json: { "assets/x": "dist/assets/x", ... } for the publish `files` map.
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';

const html = readFileSync('dist/index.html', 'utf8');
const js = html.match(/src="\.\/(assets\/index-[^"]+\.js)"/)[1];
const css = html.match(/href="\.\/(assets\/index-[^"]+\.css)"/)[1];

const page = `<title>One More Merge</title>
<style>
  html, body { margin: 0; height: 100%; background: #f3cf9b; color: #3b2533; overflow: hidden; touch-action: none; overscroll-behavior: none; -webkit-user-select: none; user-select: none; }
  #game { position: fixed; inset: env(safe-area-inset-top, 0px) env(safe-area-inset-right, 0px) env(safe-area-inset-bottom, 0px) env(safe-area-inset-left, 0px); }
</style>
<link rel="stylesheet" href="${css}">
<div id="game"></div>
<pre id="err" style="position:fixed;left:0;right:0;bottom:0;margin:0;max-height:40%;overflow:auto;background:#300;color:#fdd;font:12px monospace;white-space:pre-wrap;z-index:9" hidden></pre>
<script>
  (function () {
    var box = document.getElementById("err");
    function show(m) { box.hidden = false; box.textContent += m + "\\n"; }
    window.addEventListener("error", function (e) { show("error: " + e.message + " @ " + (e.filename || "") + ":" + (e.lineno || "") + (e.target && e.target.src ? " src=" + e.target.src : "") + (e.target && e.target.href ? " href=" + e.target.href : "")); }, true);
    window.addEventListener("unhandledrejection", function (e) { show("rejection: " + (e.reason && (e.reason.stack || e.reason.message) || e.reason)); });
    
  })();
</script>
${process.env.OMM_TIMER ? "<script>window.__OMM_TIMER = true;</script>\n" : ""}<script type="module" src="${js}"></script>
`;
writeFileSync('dist/artifact.html', page);

const files = {};
for (const f of readdirSync('dist/assets')) files[`assets/${f}`] = `dist/assets/${f}`;
writeFileSync('dist/artifact-files.json', JSON.stringify(files, null, 1));
console.log(`artifact.html -> ${js}, ${css}; ${Object.keys(files).length} files`);
