// Client for the owner review pages. PAGE (set inline by the build) = {mode:'index'|'group', groups, group, ALL}.
// Votes live in localStorage under "artReview": { "<piece id>": { v: "like" | "not", r: "<one-line reason>" } }.
(function () {
  var KEY = 'artReview';
  var $ = function (i) { return document.getElementById(i); };
  var mem = {};
  function load() { try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { return mem; } }
  function save(d) { mem = d; try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) { /* private mode: keep in memory */ } }
  // One free-text comment per group page: { "<group key>": "text" } under its own key, exported as "comments".
  var NKEY = 'artReviewNotes';
  function loadNotes() { try { return JSON.parse(localStorage.getItem(NKEY) || '{}') || {}; } catch (e) { return {}; } }
  function saveNote(k, t) { var n = loadNotes(); n[k] = t; try { localStorage.setItem(NKEY, JSON.stringify(n)); } catch (e) { /* private mode */ } }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function toast(t) { var d = document.createElement('div'); d.className = 'toast'; d.textContent = t; document.body.appendChild(d); setTimeout(function () { d.remove(); }, 1800); }

  function tally(ids) {
    var d = load(), l = 0, n = 0;
    ids.forEach(function (id) { var x = d[id]; if (x && x.v === 'like') l++; else if (x && x.v === 'not') n++; });
    return { like: l, not: n, left: ids.length - l - n, total: ids.length };
  }
  function countsHtml(t) {
    return '<span class="l">Liked <b>' + t.like + '</b></span><span class="n">NOT <b>' + t.not + '</b></span><span>Left <b>' + t.left + '</b> of ' + t.total + '</span>' +
      '<div class="bar" style="width:100%"><i class="l" style="width:' + t.like / (t.total || 1) * 100 + '%"></i><i class="n" style="width:' + t.not / (t.total || 1) * 100 + '%"></i></div>';
  }

  function setVote(id, v) {
    var d = load(), cur = d[id];
    if (cur && cur.v === v) delete d[id]; else d[id] = { v: v, r: (cur && cur.r) || '' };
    save(d); refresh();
  }
  function setReason(id, r) { var d = load(); if (d[id]) { d[id].r = r; save(d); } }

  // JSON: { app, exported, likes, nots, votes: { "<piece id>": "LIKE" | "NOT" }, reasons: { "<piece id>": "why not" } }
  function exportText() {
    var d = load(), votes = {}, reasons = {}, l = 0, n = 0;
    Object.keys(d).sort().forEach(function (id) {
      if (d[id].v === 'like') { votes[id] = 'LIKE'; l++; } else { votes[id] = 'NOT'; n++; }
      if (d[id].r) reasons[id] = d[id].r;
    });
    var notes = loadNotes(), comments = {};
    Object.keys(notes).sort().forEach(function (k) { if (notes[k]) comments[k] = notes[k]; });
    return JSON.stringify({ app: 'one-more-merge art review', exported: new Date().toISOString(), likes: l, nots: n, votes: votes, reasons: reasons, comments: comments }, null, 1);
  }
  function doExport() {
    var t = exportText();
    var show = function (msg) { var dlg = $('exp'); dlg.innerHTML = '<h3 style="margin:0 0 8px">Export</h3><div class="sub">' + msg + '</div><textarea id="expta" readonly></textarea><div class="row3"><button class="btn" id="expcopy">Copy</button><button class="btn" id="expsel">Select all</button><button class="btn" id="expclose">Close</button></div>'; $('expta').value = t; dlg.showModal(); $('expclose').onclick = function () { dlg.close(); }; $('expsel').onclick = function () { var ta = $('expta'); ta.focus(); ta.select(); ta.setSelectionRange(0, ta.value.length); }; $('expcopy').onclick = function () { var ta = $('expta'); ta.focus(); ta.select(); ta.setSelectionRange(0, ta.value.length); var ok = false; try { ok = document.execCommand('copy'); } catch (e) { } toast(ok ? 'Copied' : 'Text is selected: use Copy in the phone menu'); }; };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(function () { show('Copied to the clipboard. Paste it into a message.'); }, function () { show('Could not copy by itself. Tap the text, select all and copy.'); });
    else show('Tap the text, select all and copy.');
  }

  // Sprite of one piece from the group's atlas layout (PAGE.group.atlas): tier 'g' = grid atlases, 'z' = zoom atlases.
  function sp(p, tier) {
    var at = PAGE.group.atlas[tier], pos = tier === 'g' ? p.s : p.z, A = at[pos[0]];
    var px = A.cols > 1 ? pos[1] / (A.cols - 1) * 100 : 0, py = A.rows > 1 ? pos[2] / (A.rows - 1) * 100 : 0;
    return '<i class="sp" style="background-image:url(' + A.f + ');background-size:' + A.cols * 100 + '% ' + A.rows * 100 + '%;background-position:' + px + '% ' + py + '%"></i>';
  }
  function metaLine(p) {
    var s = [];
    if (p.maker != null) s.push('maker ' + p.maker);
    if (p.mine != null) s.push('critic ' + p.mine);
    return s.join(' · ') + ' <span class="tag ' + p.critic + '">' + (p.critic === 'NEW' ? 'new' : p.critic) + '</span>';
  }
  function cellHtml(c, d, dual, vote) {
    if (c.empty) return '<div class="cell empty"><div class="pv"></div><div class="cl">' + esc(c.label) + '</div></div>';
    var p = PAGE.group.byId[c.id], x = d[p.id] || {};
    var pv = dual
      ? '<button class="pv dk" data-open="' + p.id + '" aria-label="open ' + esc(p.name) + '">' + sp(p, 'g') + '</button><button class="pv lt" data-open="' + p.id + '" aria-label="open ' + esc(p.name) + '">' + sp(p, 'g') + '</button>'
      : '<button class="pv" data-open="' + p.id + '" aria-label="open ' + esc(p.name) + '">' + sp(p, 'g') + '</button>';
    return '<div class="cell' + (x.v ? ' ' + x.v : '') + '">' + pv + '<div class="cl">' + esc(c.label) + (p.noVote ? ' <span class="tag ' + p.critic + '">' + p.critic + '</span>' : '') + '</div>' +
      (p.noVote && p.fix ? '<div class="fixnote">' + esc(p.fix) + '</div>' : '') +
      (vote && !p.noVote ?'<div class="vote sm"><button class="btn like' + (x.v === 'like' ? ' on' : '') + '" data-v="like" data-id="' + p.id + '">Like</button><button class="btn not' + (x.v === 'not' ? ' on' : '') + '" data-v="not" data-id="' + p.id + '">Not</button></div>' : '') + '</div>';
  }
  function voteHtml(p, d) {
    var x = d[p.id] || {};
    return '<div class="vote"><button class="btn like' + (x.v === 'like' ? ' on' : '') + '" data-v="like" data-id="' + p.id + '">LIKE</button><button class="btn not' + (x.v === 'not' ? ' on' : '') + '" data-v="not" data-id="' + p.id + '">NOT</button></div>' +
      (x.v === 'not' ? '<input class="why" data-why="' + p.id + '" maxlength="140" placeholder="Why not? (optional, one line)" value="' + esc(x.r) + '">' : '');
  }
  function tileHtml(p, d, canVote) {
    var x = d[p.id] || {};
    var cls = 'tile' + (p.ref ? ' ref' : '') + (x.v ? ' ' + x.v : '');
    var meta = p.ref ? (p.refText || 'in the game now') + ' <span class="tag ref">ref</span>' : metaLine(p);
    return '<div class="' + cls + '" data-tile="' + p.id + '"><button class="pv" data-open="' + p.id + '" aria-label="open ' + esc(p.name) + '">' + sp(p, 'g') + '</button>' +
      '<div class="nm">' + esc(p.name) + '</div><div class="id">' + p.id + '</div><div class="meta">' + meta + '</div>' +
      (p.fix ? '<div class="fixnote">' + esc(p.fix) + '</div>' : '') + (canVote && !p.ref && !p.noVote ? voteHtml(p, d) : '') + '</div>';
  }

  // Full-width painted mock: the picture, its critic chip and one-line verdict, then LIKE / NOT.
  function mockHtml(p, d) {
    var x = d[p.id] || {};
    return '<div class="mock' + (x.v ? ' ' + x.v : '') + '"><img src="' + p.img + '" alt="' + esc(p.name) + '" loading="lazy"><div class="mockhd"><b>' + esc(p.name) + '</b> <span class="tag ' + p.critic + '">' + p.critic + '</span></div>' +
      '<div class="fixnote">' + esc(p.fix || '') + '</div>' + voteHtml(p, d) + '</div>';
  }

  var openId = null;
  function detail(id) {
    var p = PAGE.group.byId[id]; if (!p) return; openId = id;
    var d = load(), dlg = $('dlg'), canVote = PAGE.group && PAGE.group.vote;
    dlg.innerHTML = '<div class="two"><div class="pane dark">' + sp(p, 'z') + '</div><div class="pane light">' + sp(p, 'z') + '</div></div>' +
      '<h3 style="margin:10px 0 0">' + esc(p.name) + '</h3><dl><dt>id</dt><dd>' + p.id + '</dd><dt>group</dt><dd>' + esc(PAGE.group.title) + '</dd><dt>maker score</dt><dd>' + (p.maker == null ? '-' : p.maker + ' / 20') + '</dd><dt>critic</dt><dd>' + (p.ref ? (p.refText || 'in the game now') : (p.mine != null ? p.mine + ' / 20 · ' : '') + (p.critic === 'NEW' ? 'new, not yet critic-checked' : p.critic)) + '</dd><dt>size</dt><dd>' + p.w + ' x ' + p.h + ' px original</dd><dt>notes</dt><dd>' + esc(p.note || '-') + '</dd></dl>' +
      (canVote && !p.ref && !p.noVote ? '<div id="dvote">' + voteHtml(p, d) + '</div>' : '') + '<div class="row2" style="grid-template-columns:1fr"><button class="btn" id="dclose">Close</button></div>';
    $('dclose').onclick = function () { dlg.close(); };
    if (!dlg.open) dlg.showModal();
  }

  function renderGroup() {
    var d = load(), g = PAGE.group, h = '';
    g.sections.forEach(function (s) {
      h += '<div class="sheet"><span>' + esc(s.title) + '</span></div>';
      if (s.strip) h += '<div class="stripnote">' + esc(s.stripNote) + '</div><img class="rankstrip" src="' + s.strip + '" alt="">';
      if (s.kind === 'mocks') h += s.items.map(function (id) { return mockHtml(g.byId[id], d); }).join('');
      else if (s.kind === 'cells') h += '<div class="cells c' + s.cols + '">' + s.cells.map(function (c) { return cellHtml(c, d, s.dual, g.vote); }).join('') + '</div>';
      else h += '<div class="grid">' + s.items.map(function (id) { return tileHtml(g.byId[id], d, g.vote); }).join('') + '</div>';
    });
    if (g.redoText && g.redoText.length) {
      h += '<div class="sheet"><span>Also sent back (no picture on this page)</span></div><ul class="redolist">' + g.redoText.map(function (r) {
        return '<li><b>' + esc(r.name) + '</b> <span class="tag ' + r.critic + '">' + r.critic + '</span> <span class="id">' + r.id + ' · pass ' + r.pass + '</span><div class="fixnote">' + esc(r.note || '') + '</div></li>';
      }).join('') + '</ul>';
    }
    h += '<div class="sheet"><span>Your comment on this group</span></div><textarea class="gnote" id="gnote" maxlength="800" placeholder="Free text about this whole group (optional)">' + esc(loadNotes()[g.key] || '') + '</textarea>';
    $('main').innerHTML = h;
    if (g.vote) { $('counts').innerHTML = countsHtml(tally(g.ids)); }
    else if (g.compare) $('counts').innerHTML = '<span><b>' + g.ids.length + '</b> pictures, old next to new. Not for voting: vote on the Unit ranks pages.</span>';
    else $('counts').innerHTML = '<span><b>' + g.ids.length + '</b> pictures and <b>' + (g.redoText || []).length + '</b> text lines, being redone. Not for voting.</span>';
  }
  function renderIndex() {
    var all = [], h = '';
    PAGE.groups.forEach(function (g) { if (g.vote) all = all.concat(g.ids); });
    $('counts').innerHTML = countsHtml(tally(all));
    PAGE.groups.forEach(function (g) {
      var t = g.vote ? tally(g.ids) : null;
      h += '<a class="gcard' + (g.vote ? '' : ' redo') + '" href="' + g.page + '"><h2><span>' + (g.fresh ? '<span class="tag NEW">v9</span> ' : '') + esc(g.title) + '</span><span>' + (t ? (t.like + t.not) + '/' + t.total : g.ids.length) + '</span></h2><div class="sub" style="margin:0">' + esc(g.blurb) + (t ? '' : ' (not for voting)') + '</div><div class="strip">' + g.cover.map(function (u) { return '<i class="sp" style="' + u + '"></i>'; }).join('') + '</div></a>';
    });
    $('main').innerHTML = '<div class="cards">' + h + '</div>';
  }
  function refresh() {
    if (PAGE.mode === 'group') { var y = window.scrollY; renderGroup(); window.scrollTo(0, y); if (openId && $('dlg').open) { var v = $('dvote'); if (v) v.innerHTML = voteHtml(PAGE.group.byId[openId], load()); } }
    else renderIndex();
  }

  document.addEventListener('click', function (e) {
    var v = e.target.closest('[data-v]'); if (v) { setVote(v.getAttribute('data-id'), v.getAttribute('data-v')); return; }
    var o = e.target.closest('[data-open]'); if (o) { detail(o.getAttribute('data-open')); return; }
    if (e.target.id === 'export') doExport();
  });
  document.addEventListener('input', function (e) { if (e.target.id === 'gnote') saveNote(PAGE.group.key, e.target.value); });
  document.addEventListener('input', function (e) { var w = e.target.getAttribute && e.target.getAttribute('data-why'); if (w) setReason(w, e.target.value); });
  window.addEventListener('pageshow', function () { refresh(); });

  refresh();
})();
