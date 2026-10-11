// Builds dist-hub/index.html: a self-contained, phone-first, offline Asset Hub from src/content/assetRegistry.ts.
// Thumbnails (max 320 px webp) go to dist-hub/thumbs/ and are referenced relatively; no external resources.
// Usage: node tools/build-asset-hub.mjs   (npm run hub)
import { mkdirSync, rmSync, writeFileSync, copyFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { readRegistry } from './asset-registry-io.mjs';

const OUT = 'dist-hub';
const reg = readRegistry();
rmSync(OUT, { recursive: true, force: true });
mkdirSync(`${OUT}/thumbs`, { recursive: true });

let sharp = null;
try {
  sharp = (await import('sharp')).default;
} catch {
  console.warn('sharp not available: copying full-size images');
}
let thumbs = 0;
for (const a of reg) {
  if (a.file === 'code-drawn' || !existsSync(a.file)) continue;
  const dest = `${OUT}/thumbs/${a.id}.webp`;
  if (sharp) await sharp(a.file).resize({ width: 320, height: 320, fit: 'inside', withoutEnlargement: true }).webp({ quality: 80 }).toFile(dest);
  else copyFileSync(a.file, dest);
  thumbs++;
}

const data = reg.map((a) => ({ ...a, img: a.file === 'code-drawn' ? null : `thumbs/${a.id}.webp` }));
const json = JSON.stringify(data).replace(/</g, '\\u003c');

const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>One More Merge - Asset Hub</title>
<style>
:root{--bg:#1d1822;--card:#2a2331;--ink:#f4ead8;--dim:#a79bb0;--line:#3d3447;--ph:#e0533c;--dr:#e9a93a;--fi:#58b85c;--acc:#7cc4ff}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.35 system-ui,sans-serif;padding-bottom:40px}
header{position:sticky;top:0;z-index:5;background:var(--bg);padding:10px 12px 6px;border-bottom:1px solid var(--line)}
h1{font-size:17px;margin:0 0 6px;display:flex;justify-content:space-between;align-items:baseline}
.meter{height:10px;border-radius:6px;background:var(--line);overflow:hidden;display:flex}.meter i{display:block;height:100%}
.meter .f{background:var(--fi)}.meter .d{background:var(--dr)}.meter .p{background:var(--ph)}
.sub{color:var(--dim);font-size:12px;margin:4px 0}
input{width:100%;padding:10px 12px;border-radius:10px;border:1px solid var(--line);background:var(--card);color:var(--ink);font-size:16px;margin:6px 0}
.chips{display:flex;gap:6px;overflow-x:auto;padding:4px 0 6px;-webkit-overflow-scrolling:touch}
.chip{flex:none;padding:7px 11px;border-radius:16px;background:var(--card);border:1px solid var(--line);color:var(--ink);font-size:13px;cursor:pointer;white-space:nowrap}
.chip.on{background:var(--acc);color:#10202e;border-color:var(--acc)}.chip small{opacity:.75;margin-left:4px}
main{padding:10px 12px}
.grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}
@media(min-width:700px){.grid{grid-template-columns:repeat(4,1fr)}}
.tile{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:8px;cursor:pointer;position:relative;min-width:0}
.pv{aspect-ratio:1;border-radius:8px;background:repeating-conic-gradient(#352d3d 0 25%,#2c2535 0 50%) 0 0/16px 16px;display:flex;align-items:center;justify-content:center;overflow:hidden}
.pv img{max-width:100%;max-height:100%;object-fit:contain}
.code{font-size:12px;color:var(--dim);text-align:center;padding:8px;border:2px dashed var(--line);border-radius:8px;width:88%;height:88%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px}
.code b{color:var(--ink);font-size:13px}
.nm{margin-top:6px;font-size:13px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.id{color:var(--dim);font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.badge{position:absolute;top:12px;left:12px;font-size:10px;font-weight:700;text-transform:uppercase;padding:2px 7px;border-radius:9px;color:#1b1420}
.b-placeholder{background:var(--ph)}.b-draft{background:var(--dr)}.b-final{background:var(--fi)}
.sec{margin:16px 0 8px;font-size:13px;color:var(--dim);text-transform:uppercase;letter-spacing:.06em;display:flex;justify-content:space-between}
.row{display:flex;gap:10px;overflow-x:auto;padding-bottom:6px}.row .tile{flex:none;width:150px}
.list .it{display:flex;justify-content:space-between;gap:8px;padding:9px 10px;border-bottom:1px solid var(--line);cursor:pointer}
.list .it span:first-child{overflow:hidden;text-overflow:ellipsis}.pill{font-size:11px;padding:1px 7px;border-radius:9px;color:#1b1420;flex:none}
.back{display:inline-block;margin:0 0 8px;color:var(--acc);cursor:pointer}
dialog{border:1px solid var(--line);border-radius:14px;background:var(--card);color:var(--ink);width:min(92vw,420px);padding:14px}
dialog::backdrop{background:#000a}dialog .pv{margin-bottom:10px}dialog dl{margin:0;display:grid;grid-template-columns:90px 1fr;gap:4px 8px;font-size:13px}dialog dt{color:var(--dim)}dialog dd{margin:0;word-break:break-all}
button{background:var(--acc);border:0;border-radius:10px;padding:9px 14px;font-size:14px;margin-top:12px}
.empty{color:var(--dim);padding:24px;text-align:center}
</style></head><body>
<header>
  <h1><span>Asset Hub</span><span id="tot" class="sub"></span></h1>
  <div class="meter" id="totm"></div>
  <input id="q" type="search" placeholder="Search id, name, notes..." autocomplete="off">
  <div class="chips" id="chips"></div>
</header>
<main id="main"></main>
<dialog id="dlg"></dialog>
<script>
var DATA=${json};
var CATS=${JSON.stringify([...new Set(reg.map((a) => a.category))])};
var LABEL={'units':'Units','monsters-bosses':'Monsters & bosses','board-cells':'Board & cells','projectiles-impacts':'Projectiles & impacts','merge-cascade-fx':'Merge & cascade effects','ui-buttons':'UI buttons','ui-panels':'UI panels','ui-bars-stars':'UI bars & stars','popups-menus':'Popups & menus','tabs-icons':'Tabs & icons','currency-rewards':'Currency & rewards','crates':'Crates','backgrounds':'Backgrounds','screw-yard':'Screw yard','power-tools':'Power tools','fonts':'Fonts','sounds':'Sounds'};
var $=function(i){return document.getElementById(i)};
function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
function count(list){var r={placeholder:0,draft:0,final:0,n:list.length};list.forEach(function(a){r[a.status]++});return r}
function meter(c){var n=c.n||1;return '<i class="f" style="width:'+c.final/n*100+'%"></i><i class="d" style="width:'+c.draft/n*100+'%"></i><i class="p" style="width:'+c.placeholder/n*100+'%"></i>'}
function kindLabel(a){return a.source==='synth'?'synth sound':a.category==='fonts'?'font':'code-drawn'}
function tile(a){
  var pv=a.img?'<img loading="lazy" src="'+esc(a.img)+'" alt="">':'<div class="code"><b>'+esc(kindLabel(a))+'</b>'+esc(a.subcategory)+'</div>';
  return '<div class="tile" data-id="'+esc(a.id)+'"><span class="badge b-'+a.status+'">'+a.status+'</span><div class="pv">'+pv+'</div><div class="nm">'+esc(a.name)+'</div><div class="id">'+esc(a.id)+'</div></div>';
}
function grid(list){return list.length?'<div class="grid">'+list.map(tile).join('')+'</div>':'<div class="empty">Nothing here.</div>'}
function matches(a,q){return !q||(a.id+' '+a.name+' '+a.notes+' '+a.subcategory+' '+a.category+' '+a.status).toLowerCase().indexOf(q)>=0}
function route(){var h=location.hash.replace(/^#/,'');var p=h.split('=');return{k:p[0]||'all',v:decodeURIComponent(p.slice(1).join('='))}}
function renderChips(r){
  var all=count(DATA),h='<span class="chip'+(r.k==='all'?' on':'')+'" data-go="all">All<small>'+all.final+'/'+all.n+'</small></span>';
  h+='<span class="chip'+(r.k==='needs'?' on':'')+'" data-go="needs">Needs art<small>'+(all.placeholder)+'</small></span>';
  CATS.forEach(function(c){var k=count(DATA.filter(function(a){return a.category===c}));h+='<span class="chip'+(r.k==='cat'&&r.v===c?' on':'')+'" data-go="cat='+c+'">'+esc(LABEL[c]||c)+'<small>'+k.final+'/'+k.n+'</small></span>'});
  $('chips').innerHTML=h;
}
function unitFamilies(){var m={};DATA.filter(function(a){return a.category==='units'&&a.rank&&!/^hero-machine/.test(a.subcategory)}).forEach(function(a){(m[a.subcategory]=m[a.subcategory]||[]).push(a)});return m}
function render(){
  var r=route(),q=$('q').value.trim().toLowerCase(),all=count(DATA),h='';
  $('tot').textContent=all.final+' of '+all.n+' final';$('totm').innerHTML=meter(all);renderChips(r);
  if(r.k==='unit'){
    var list=(unitFamilies()[r.v]||[]).sort(function(a,b){return a.rank-b.rank});
    h+='<span class="back" data-go="cat=units">&larr; Units</span><h2>'+esc(r.v.replace(/_/g,' '))+'</h2><div class="sub">'+count(list).final+' of '+list.length+' ranks final. Every rank:</div>'+grid(list);
    var hm=DATA.filter(function(a){return a.subcategory==='hero-machine-'+r.v});if(hm.length)h+='<div class="sec">Hero machine</div>'+grid(hm);
    var jb=DATA.filter(function(a){return a.id==='job_'+r.v});if(jb.length)h+='<div class="sec">Job icon</div>'+grid(jb);
  }else if(r.k==='needs'){
    var need=DATA.filter(function(a){return a.status==='placeholder'&&matches(a,q)});
    h+='<div class="sub">'+need.length+' assets are still placeholders (tap to open). Drafts: '+all.draft+'.</div><div class="list">';
    CATS.forEach(function(c){var l=need.filter(function(a){return a.category===c});if(!l.length)return;h+='<div class="sec"><span>'+esc(LABEL[c]||c)+'</span><span>'+l.length+'</span></div>'+l.map(function(a){return '<div class="it" data-id="'+esc(a.id)+'"><span>'+esc(a.name)+' <small class="id">'+esc(a.id)+'</small></span><span class="pill b-placeholder">'+esc(a.source)+'</span></div>'}).join('')});
    h+='</div>';
  }else if(r.k==='cat'){
    var cl=DATA.filter(function(a){return a.category===r.v&&matches(a,q)}),c=count(DATA.filter(function(a){return a.category===r.v}));
    h+='<div class="sub">'+c.final+' of '+c.n+' final &middot; '+c.draft+' draft &middot; '+c.placeholder+' placeholder</div><div class="meter">'+meter(c)+'</div>';
    if(r.v==='units'&&!q){var f=unitFamilies();h+='<div class="sec">Per-unit pages (every rank)</div><div class="grid">'+Object.keys(f).map(function(k){var l=f[k].slice().sort(function(a,b){return a.rank-b.rank}),cc=count(l),top=l[l.length-1];var pv=top.img?'<img loading="lazy" src="'+esc(top.img)+'" alt="">':'<div class="code"><b>code-drawn</b>'+esc(k)+'</div>';return '<div class="tile" data-go="unit='+k+'"><div class="pv">'+pv+'</div><div class="nm">'+esc(k.replace(/_/g,' '))+'</div><div class="id">'+cc.final+'/'+cc.n+' final</div></div>'}).join('')+'</div><div class="sec">All unit assets</div>'}
    h+=grid(cl);
  }else{
    var al=DATA.filter(function(a){return matches(a,q)});
    h+='';CATS.forEach(function(c){var k=count(DATA.filter(function(a){return a.category===c}));h+='<div class="sec" data-go="cat='+c+'" style="cursor:pointer"><span>'+esc(LABEL[c]||c)+'</span><span>'+k.final+' of '+k.n+' final</span></div><div class="meter">'+meter(k)+'</div>'});
    if(q)h='<div class="sub">'+al.length+' results</div>'+grid(al.slice(0,200));
  }
  $('main').innerHTML=h;
}
function detail(id){
  var a=DATA.filter(function(x){return x.id===id})[0];if(!a)return;
  var pv=a.img?'<img src="'+esc(a.img)+'" alt="">':'<div class="code"><b>'+esc(kindLabel(a))+'</b>no picture file: made in code ('+esc(a.notes)+')</div>';
  $('dlg').innerHTML='<div class="pv">'+pv+'</div><h3 style="margin:0 0 8px">'+esc(a.name)+'</h3><dl><dt>id</dt><dd>'+esc(a.id)+'</dd><dt>category</dt><dd>'+esc(LABEL[a.category])+' / '+esc(a.subcategory)+'</dd><dt>status</dt><dd>'+a.status+'</dd><dt>source</dt><dd>'+esc(a.source)+'</dd><dt>file</dt><dd>'+esc(a.file)+'</dd>'+(a.rank?'<dt>rank</dt><dd>'+a.rank+'</dd>':'')+'<dt>notes</dt><dd>'+esc(a.notes||'-')+'</dd></dl><button onclick="document.getElementById(&quot;dlg&quot;).close()">Close</button>';
  $('dlg').showModal();
}
document.addEventListener('click',function(e){
  var g=e.target.closest('[data-go]');if(g){location.hash=g.getAttribute('data-go')==='all'?'':g.getAttribute('data-go');window.scrollTo(0,0);return}
  var t=e.target.closest('[data-id]');if(t)detail(t.getAttribute('data-id'));
});
$('q').addEventListener('input',render);window.addEventListener('hashchange',render);render();
</script></body></html>
`;
writeFileSync(`${OUT}/index.html`, html);

const size = (d) => readdirSync(d, { withFileTypes: true }).reduce((n, e) => n + (e.isDirectory() ? size(`${d}/${e.name}`) : statSync(`${d}/${e.name}`).size), 0);
const mb = size(OUT) / 1048576;
console.log(`dist-hub/index.html: ${reg.length} assets, ${thumbs} thumbnails, ${mb.toFixed(1)} MB`);
if (mb > 20) throw new Error('hub output exceeds 20 MB');
