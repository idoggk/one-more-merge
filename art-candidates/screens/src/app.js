(function () {
  var q = new URLSearchParams(location.search);
  var solo = q.get('screen');
  var tq = q.get('t');
  var doc = document.documentElement;
  var TAB_TO_SCREEN = { machine: 'machine', units: 'units', home: 'home-a1', crates: 'crates', events: 'home-a1' };

  if (solo) {
    doc.classList.add('solo');
    var cell = document.getElementById(solo);
    if (cell) cell.classList.add('on');
  }

  function animsOf(el) {
    return el.getAnimations ? el.getAnimations({ subtree: true }) : [];
  }
  function replay(cell) {
    animsOf(cell).forEach(function (a) {
      try { a.cancel(); a.play(); } catch (e) {}
    });
  }

  // deterministic frame capture: ?t=<ms> pauses every animation at that time
  function freeze() {
    var t = parseFloat(tq);
    if (isNaN(t)) return;
    document.getAnimations().forEach(function (a) {
      try { a.pause(); a.currentTime = t; } catch (e) {}
    });
    doc.setAttribute('data-frozen', String(t));
  }
  var go = function () { requestAnimationFrame(function () { requestAnimationFrame(function () { freeze(); doc.setAttribute('data-ready', '1'); }); }); };
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(go); else window.addEventListener('load', go);

  if (!solo) {
    // review mode: replay buttons, pause what is off-screen, restart staged sequences when they scroll into view
    document.querySelectorAll('[data-replay]').forEach(function (b) {
      b.addEventListener('click', function () { replay(document.getElementById(b.getAttribute('data-replay'))); });
    });
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          var c = e.target;
          if (e.isIntersecting) {
            var wasOff = c.classList.contains('off');
            c.classList.remove('off');
            if (wasOff && c.querySelector('[data-stage="1"]')) replay(c);
          } else c.classList.add('off');
        });
      }, { threshold: 0.35 });
      document.querySelectorAll('.rv-cell').forEach(function (c) { c.classList.add('off'); io.observe(c); });
    }
    document.querySelectorAll('.tab').forEach(function (t) {
      t.addEventListener('click', function () {
        var id = TAB_TO_SCREEN[t.getAttribute('data-tab')];
        var el = id && document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  }
})();
