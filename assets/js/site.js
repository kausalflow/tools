/* KausalFlow Tools: theme toggle, mobile nav and the directory filters. */
(function () {
  'use strict';
  var root = document.documentElement;

  /* theme */
  function setTheme(t) {
    root.setAttribute('data-theme', t);
    try { localStorage.setItem('kf-theme', t); } catch (e) { /* storage unavailable */ }
  }
  document.addEventListener('click', function (e) {
    var tgl = e.target.closest('[data-theme-toggle]');
    if (tgl) {
      var cur = root.getAttribute('data-theme') ||
        (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
      setTheme(cur === 'dark' ? 'light' : 'dark');
      return;
    }
    var nav = e.target.closest('[data-nav-toggle]');
    if (nav) {
      var menu = document.getElementById('site-nav');
      var open = menu.classList.toggle('open');
      nav.setAttribute('aria-expanded', open ? 'true' : 'false');
    }
  });

  /* directory */
  var list = document.getElementById('tool-grid');
  if (!list) return;
  var cards = Array.prototype.slice.call(list.querySelectorAll('[data-card]'));
  var facetBox = document.getElementById('facets');
  var qInput = document.getElementById('dir-q');
  var sortSel = document.getElementById('dir-sort');
  var count = document.getElementById('dir-count');
  var empty = document.getElementById('dir-empty');
  var GROUPS = [['field', 'Field'], ['platform', 'Platform'], ['category', 'Category']];
  var state = { q: '', sort: 'new', field: [], platform: [], category: [] };

  cards.forEach(function (c) {
    c._f = {};
    GROUPS.forEach(function (g) {
      c._f[g[0]] = (c.getAttribute('data-' + g[0]) || '').split('|').filter(Boolean);
    });
    c._q = (c.getAttribute('data-q') || '').toLowerCase();
    c._name = (c.getAttribute('data-name') || '').toLowerCase();
    c._date = parseInt(c.getAttribute('data-date') || '0', 10);
  });

  function tally(key) {
    var m = {};
    cards.forEach(function (c) { c._f[key].forEach(function (v) { m[v] = (m[v] || 0) + 1; }); });
    return Object.keys(m).sort(function (a, b) { return m[b] - m[a] || a.localeCompare(b); })
      .map(function (k) { return [k, m[k]]; });
  }

  function readUrl() {
    var p = new URLSearchParams(location.search);
    state.q = p.get('q') || '';
    state.sort = p.get('sort') || 'new';
    GROUPS.forEach(function (g) { state[g[0]] = p.getAll(g[0]); });
  }
  function writeUrl() {
    var p = new URLSearchParams();
    if (state.q) p.set('q', state.q);
    if (state.sort !== 'new') p.set('sort', state.sort);
    GROUPS.forEach(function (g) { state[g[0]].forEach(function (v) { p.append(g[0], v); }); });
    var s = p.toString();
    history.replaceState(null, '', location.pathname + (s ? '?' + s : ''));
  }

  function buildFacets() {
    facetBox.textContent = '';
    GROUPS.forEach(function (g) {
      var wrap = document.createElement('div');
      wrap.className = 'facet';
      var h = document.createElement('h3');
      h.textContent = g[1];
      wrap.appendChild(h);
      tally(g[0]).forEach(function (kv) {
        var label = document.createElement('label');
        var input = document.createElement('input');
        input.type = 'checkbox';
        input.value = kv[0];
        input.name = g[0];
        input.checked = state[g[0]].indexOf(kv[0]) !== -1;
        var text = document.createElement('span');
        text.textContent = kv[0];
        var n = document.createElement('span');
        n.className = 'n';
        n.textContent = kv[1];
        label.appendChild(input);
        label.appendChild(text);
        label.appendChild(n);
        wrap.appendChild(label);
      });
      facetBox.appendChild(wrap);
    });
  }

  function apply() {
    var terms = state.q.toLowerCase().split(/\s+/).filter(Boolean);
    var shown = 0;
    cards.forEach(function (c) {
      var ok = terms.every(function (t) { return c._q.indexOf(t) !== -1; });
      GROUPS.forEach(function (g) {
        var sel = state[g[0]];
        if (ok && sel.length) ok = sel.some(function (v) { return c._f[g[0]].indexOf(v) !== -1; });
      });
      c.hidden = !ok;
      if (ok) shown++;
    });
    var sorted = cards.slice().sort(function (a, b) {
      if (state.sort === 'name') return a._name.localeCompare(b._name);
      return b._date - a._date || a._name.localeCompare(b._name);
    });
    sorted.forEach(function (c) { list.appendChild(c); });
    count.textContent = shown + (shown === 1 ? ' tool' : ' tools');
    empty.hidden = shown !== 0;
    writeUrl();
  }

  facetBox.addEventListener('change', function (e) {
    var t = e.target;
    if (t.type !== 'checkbox') return;
    var arr = state[t.name];
    var i = arr.indexOf(t.value);
    if (t.checked && i === -1) arr.push(t.value);
    if (!t.checked && i !== -1) arr.splice(i, 1);
    apply();
  });
  qInput.addEventListener('input', function () { state.q = qInput.value.trim(); apply(); });
  sortSel.addEventListener('change', function () { state.sort = sortSel.value; apply(); });
  var clear = document.getElementById('dir-clear');
  if (clear) clear.addEventListener('click', function () {
    state = { q: '', sort: 'new', field: [], platform: [], category: [] };
    qInput.value = '';
    sortSel.value = 'new';
    buildFacets();
    apply();
  });
  var toggle = document.getElementById('filters-toggle');
  if (toggle) toggle.addEventListener('click', function () {
    var open = facetBox.classList.toggle('open');
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  });

  readUrl();
  qInput.value = state.q;
  sortSel.value = state.sort;
  buildFacets();
  apply();
})();
