/* KausalFlow Tools search palette: Cmd/Ctrl+K, client side, no external service. */
(function () {
  'use strict';

  var script = document.currentScript;
  var INDEX_URL = (script && script.dataset.index) || '/search-index.json';
  var RECENT_KEY = 'kf-recent-searches';
  var MAX_RESULTS = 8;
  var isMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
  var modKey = isMac ? '⌘' : 'Ctrl';

  var items = null;
  var loading = null;
  var dialog, input, list, status, lastFocus;
  var results = [];
  var active = 0;

  function norm(s) {
    return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  }

  function loadIndex() {
    if (items) return Promise.resolve(items);
    if (loading) return loading;
    loading = fetch(INDEX_URL)
      .then(function (r) { return r.json(); })
      .then(function (data) {
        items = data.map(function (d) {
          d._title = norm(d.t);
          d._words = d._title.split(/[^a-z0-9]+/).filter(Boolean);
          d._tags = norm([].concat(d.g || [], d.c || [], d.f || [], d.p || []).join(' '));
          d._sum = norm(d.s);
          d._all = (d._tags + ' ' + d._sum).split(/[^a-z0-9]+/).filter(function (w) { return w.length > 3; });
          return d;
        });
        return items;
      });
    return loading;
  }

  function oneEdit(a, b) {
    if (Math.abs(a.length - b.length) > 1) return false;
    var i = 0, j = 0, edits = 0;
    while (i < a.length && j < b.length) {
      if (a[i] === b[j]) { i++; j++; continue; }
      if (++edits > 1) return false;
      if (a.length > b.length) i++;
      else if (a.length < b.length) j++;
      else { i++; j++; }
    }
    return edits + (a.length - i) + (b.length - j) <= 1;
  }

  function scoreToken(d, tok) {
    var s = 0;
    if (d._title === tok) s += 100;
    else if (d._title.indexOf(tok) === 0) s += 60;
    else if (d._words.some(function (w) { return w.indexOf(tok) === 0; })) s += 40;
    else if (d._title.indexOf(tok) !== -1) s += 25;
    else if (tok.length >= 4 && d._words.some(function (w) { return oneEdit(w, tok); })) s += 15;
    if (d._tags.indexOf(tok) !== -1) s += 12;
    if (d._sum.indexOf(tok) !== -1) s += 6;
    if (!s && tok.length >= 4 && d._all.some(function (w) { return oneEdit(w, tok); })) s += 4;
    return s;
  }

  function search(q) {
    var toks = norm(q).split(/\s+/).filter(Boolean);
    if (!toks.length || !items) return [];
    var out = [];
    items.forEach(function (d) {
      var total = 0;
      for (var i = 0; i < toks.length; i++) {
        var s = scoreToken(d, toks[i]);
        if (!s) return;
        total += s;
      }
      out.push({ d: d, score: total });
    });
    out.sort(function (a, b) { return b.score - a.score || a.d.t.localeCompare(b.d.t); });
    return out.slice(0, MAX_RESULTS).map(function (r) { return r.d; });
  }

  function recent() {
    try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); } catch (e) { return []; }
  }
  function remember(q) {
    q = q.trim();
    if (!q) return;
    try {
      var r = recent().filter(function (x) { return x !== q; });
      r.unshift(q);
      localStorage.setItem(RECENT_KEY, JSON.stringify(r.slice(0, 5)));
    } catch (e) { /* storage unavailable */ }
  }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function highlight(node, text, q) {
    var toks = norm(q).split(/\s+/).filter(Boolean);
    var low = norm(text);
    var marks = [];
    toks.forEach(function (t) {
      var i = low.indexOf(t);
      if (i !== -1) marks.push([i, i + t.length]);
    });
    if (!marks.length) { node.textContent = text; return; }
    marks.sort(function (a, b) { return a[0] - b[0]; });
    var pos = 0;
    marks.forEach(function (m) {
      if (m[0] < pos) return;
      node.appendChild(document.createTextNode(text.slice(pos, m[0])));
      node.appendChild(el('mark', null, text.slice(m[0], m[1])));
      pos = m[1];
    });
    node.appendChild(document.createTextNode(text.slice(pos)));
  }

  function render() {
    var q = input.value;
    list.textContent = '';
    if (!q.trim()) {
      results = [];
      var r = recent();
      if (r.length) {
        list.appendChild(el('li', 'kfs-label', 'Recent searches'));
        r.forEach(function (term) {
          var li = el('li', 'kfs-hint');
          li.setAttribute('role', 'option');
          li.textContent = term;
          li.addEventListener('click', function () { input.value = term; update(); input.focus(); });
          list.appendChild(li);
        });
      } else {
        list.appendChild(el('li', 'kfs-label', 'Try'));
        ['literature review', 'latex', 'citation', 'data analysis', 'note taking'].forEach(function (term) {
          var li = el('li', 'kfs-hint');
          li.setAttribute('role', 'option');
          li.textContent = term;
          li.addEventListener('click', function () { input.value = term; update(); input.focus(); });
          list.appendChild(li);
        });
      }
      status.textContent = '';
      input.removeAttribute('aria-activedescendant');
      return;
    }
    if (!results.length) {
      var empty = el('li', 'kfs-empty');
      empty.appendChild(document.createTextNode('No tools match “' + q + '”. '));
      var a = el('a', null, 'Suggest one');
      a.href = '/submit/';
      empty.appendChild(a);
      list.appendChild(empty);
      status.textContent = 'No results';
      input.removeAttribute('aria-activedescendant');
      return;
    }
    results.forEach(function (d, i) {
      var li = el('li', 'kfs-item' + (i === active ? ' is-active' : ''));
      li.id = 'kfs-opt-' + i;
      li.setAttribute('role', 'option');
      li.setAttribute('aria-selected', i === active ? 'true' : 'false');
      var a = el('a');
      a.href = d.u;
      var mono = el('span', 'kfs-mono', d.t.charAt(0).toUpperCase());
      var body = el('span', 'kfs-body');
      var t = el('span', 'kfs-title');
      highlight(t, d.t, q);
      var s = el('span', 'kfs-sum', d.s);
      body.appendChild(t);
      body.appendChild(s);
      var meta = el('span', 'kfs-meta', [].concat(d.p || []).slice(0, 2).join(' · '));
      a.appendChild(mono);
      a.appendChild(body);
      a.appendChild(meta);
      a.addEventListener('click', function () { remember(q); });
      li.appendChild(a);
      li.addEventListener('mousemove', function () { setActive(i); });
      list.appendChild(li);
    });
    input.setAttribute('aria-activedescendant', 'kfs-opt-' + active);
    status.textContent = results.length + (results.length === 1 ? ' result' : ' results');
  }

  function setActive(i) {
    if (i === active || !results.length) return;
    var prev = document.getElementById('kfs-opt-' + active);
    var next = document.getElementById('kfs-opt-' + i);
    if (prev) { prev.classList.remove('is-active'); prev.setAttribute('aria-selected', 'false'); }
    active = i;
    if (next) {
      next.classList.add('is-active');
      next.setAttribute('aria-selected', 'true');
      next.scrollIntoView({ block: 'nearest' });
      input.setAttribute('aria-activedescendant', next.id);
    }
  }

  function update() {
    active = 0;
    results = search(input.value);
    render();
  }

  function build() {
    dialog = el('div', 'kfs-overlay');
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('aria-label', 'Search tools');
    dialog.hidden = true;
    var panel = el('div', 'kfs-panel');
    var head = el('div', 'kfs-head');
    input = el('input', 'kfs-input');
    input.type = 'search';
    input.placeholder = 'Search tools';
    input.autocomplete = 'off';
    input.spellcheck = false;
    input.setAttribute('role', 'combobox');
    input.setAttribute('aria-expanded', 'true');
    input.setAttribute('aria-controls', 'kfs-list');
    input.setAttribute('aria-label', 'Search tools');
    var esc = el('kbd', 'kfs-kbd', 'esc');
    head.appendChild(input);
    head.appendChild(esc);
    list = el('ul', 'kfs-list');
    list.id = 'kfs-list';
    list.setAttribute('role', 'listbox');
    status = el('div', 'kfs-status');
    status.setAttribute('aria-live', 'polite');
    var foot = el('div', 'kfs-foot');
    foot.textContent = '↑↓ navigate · ↵ open · ' + modKey + '↵ new tab · esc close';
    panel.appendChild(head);
    panel.appendChild(list);
    panel.appendChild(status);
    panel.appendChild(foot);
    dialog.appendChild(panel);
    document.body.appendChild(dialog);

    dialog.addEventListener('mousedown', function (e) { if (e.target === dialog) close(); });
    input.addEventListener('input', update);
    panel.addEventListener('keydown', onPanelKey);
  }

  function onPanelKey(e) {
    if (e.key === 'Escape') { e.preventDefault(); close(); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); if (results.length) setActive((active + 1) % results.length); return; }
    if (e.key === 'ArrowUp') { e.preventDefault(); if (results.length) setActive((active - 1 + results.length) % results.length); return; }
    if (e.key === 'Enter') {
      var d = results[active];
      if (!d) return;
      e.preventDefault();
      remember(input.value);
      if (e.metaKey || e.ctrlKey) window.open(d.u, '_blank', 'noopener');
      else window.location.href = d.u;
      return;
    }
    if (e.key === 'Tab') { e.preventDefault(); input.focus(); }
  }

  function open() {
    if (!dialog) build();
    lastFocus = document.activeElement;
    dialog.hidden = false;
    document.documentElement.classList.add('kfs-open');
    input.value = '';
    update();
    input.focus();
    loadIndex().then(function () { if (!dialog.hidden) update(); });
  }

  function close() {
    if (!dialog) return;
    dialog.hidden = true;
    document.documentElement.classList.remove('kfs-open');
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  function isTyping(t) {
    return t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable);
  }

  document.addEventListener('keydown', function (e) {
    var k = e.key && e.key.toLowerCase();
    if ((e.metaKey || e.ctrlKey) && k === 'k') {
      e.preventDefault();
      if (dialog && !dialog.hidden) close(); else open();
    } else if (k === '/' && !isTyping(e.target) && !e.metaKey && !e.ctrlKey && !e.altKey) {
      e.preventDefault();
      open();
    }
  });

  function mount() {
    var host = document.getElementById('search-palette-mount');
    if (!host) return;
    var btn = el('button', 'kfs-button');
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Search tools');
    btn.setAttribute('aria-keyshortcuts', 'Control+K Meta+K');
    var icon = el('span', 'kfs-icon');
    icon.setAttribute('aria-hidden', 'true');
    icon.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg>';
    var label = el('span', 'kfs-label-text', 'Search tools');
    var kbd = el('kbd', 'kfs-kbd', modKey + ' K');
    btn.appendChild(icon);
    btn.appendChild(label);
    btn.appendChild(kbd);
    btn.addEventListener('click', open);
    btn.addEventListener('pointerenter', loadIndex, { once: true });
    btn.addEventListener('focus', loadIndex, { once: true });
    host.appendChild(btn);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();
