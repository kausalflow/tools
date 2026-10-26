// MCP Apps view for search and alternatives results: tool cards rendered inline by hosts that support
// the MCP Apps extension (io.modelcontextprotocol/ui). Hosts without it show the text result instead.
// The page talks to the host over postMessage (JSON-RPC): ui/initialize, then it receives
// ui/notifications/tool-result and asks the host to open links with ui/open-link.

export const UI_URI = 'ui://kausalflow-tools/results.html';
export const UI_MIME = 'text/html;profile=mcp-app';

export const uiHtml = (site) => `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>
:root{--bg:transparent;--card:#fff;--ink:#16181d;--muted:#5b6170;--line:#e3e6ea;--accent:#0b6e69;--tint:#e3f3f1;--amber:#b45309;--amber-tint:#fef3e2;
  font-family:var(--font-sans,system-ui,-apple-system,"Segoe UI",sans-serif);color-scheme:light dark}
:root[data-theme=dark]{--card:#1b1f26;--ink:#e8eaee;--muted:#9aa1ad;--line:#2c323c;--accent:#5cc8bf;--tint:#12302e;--amber:#f0b46a;--amber-tint:#3a2a10}
body{margin:0;background:var(--bg);color:var(--ink);font-size:14px}
.head{display:flex;justify-content:space-between;align-items:baseline;gap:8px;margin:2px 2px 10px;color:var(--muted);font-size:13px}
.head a{color:var(--accent);text-decoration:none;cursor:pointer}
.list{display:grid;gap:10px;grid-template-columns:repeat(auto-fill,minmax(250px,1fr))}
.card{display:flex;flex-direction:column;background:var(--card);border:1px solid var(--line);border-radius:12px;overflow:hidden;cursor:pointer;text-align:left;font:inherit;color:inherit;padding:0}
.card:hover,.card:focus-visible{border-color:var(--accent);outline:none}
.shot{height:110px;background:var(--tint) center top/cover no-repeat}
.body{padding:10px 12px 12px;display:flex;flex-direction:column;gap:6px;flex:1}
.title{font-weight:600;font-size:15px}
.sum{color:var(--muted);line-height:1.4;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
.chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:auto;padding-top:4px}
.chip{border:1px solid var(--line);border-radius:999px;padding:2px 8px;font-size:12px}
.free,.oss{background:var(--tint);border-color:transparent;color:var(--accent)}
.paid,.dead{background:var(--amber-tint);border-color:transparent;color:var(--amber)}
.empty{color:var(--muted);padding:8px 2px}
</style></head>
<body><div class="head"><span id="label">Loading…</span><a id="more" hidden></a></div><div class="list" id="list"></div>
<script>
const SITE = ${JSON.stringify(site)};
const PRICE = { free: ['Free', 'free'], freemium: ['Free plan', ''], paid: ['Paid', 'paid'] };
let nextId = 1;
const pending = new Map();
const send = (msg) => window.parent.postMessage({ jsonrpc: '2.0', ...msg }, '*');
const request = (method, params) => new Promise((resolve) => { const id = nextId++; pending.set(id, resolve); send({ id, method, params }); });
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

function open(url) {
  if (window.openai?.openExternal) return window.openai.openExternal({ href: url });
  request('ui/open-link', { url }).catch(() => window.open(url, '_blank', 'noopener'));
}

function render(data) {
  const results = data?.results || [];
  const list = document.getElementById('list');
  document.getElementById('label').textContent = data?.to
    ? (results.length ? 'Alternatives to ' + data.to : 'No listed alternatives to ' + data.to)
    : results.length + (results.length === 1 ? ' tool' : ' tools') + ' from Tools for Academic Research';
  const more = document.getElementById('more');
  more.hidden = !(data?.page || !data?.to);
  more.textContent = data?.page ? 'Open the full list ↗' : 'Browse the directory ↗';
  more.onclick = () => open(data?.page || SITE + '/tools/');
  list.innerHTML = results.length ? results.map((t, i) => {
    const p = PRICE[t.pricing];
    const chips = [
      t.status === 'unreachable' ? '<span class="chip dead">Site not responding</span>' : '',
      p ? '<span class="chip ' + p[1] + '">' + p[0] + '</span>' : '',
      t.open_source ? '<span class="chip oss">Open source</span>' : '',
      ...(t.platforms || []).slice(0, 2).map((x) => '<span class="chip">' + esc(x) + '</span>'),
    ].join('');
    const shot = t.image && t.image.startsWith(SITE) ? '<div class="shot" style="background-image:url(\\'' + encodeURI(t.image) + '\\')"></div>' : '';
    return '<button class="card" data-i="' + i + '">' + shot + '<div class="body"><div class="title">' + esc(t.title) + '</div><div class="sum">' + esc(t.summary) + '</div><div class="chips">' + chips + '</div></div></button>';
  }).join('') : '<div class="empty">Nothing matched. Try other words, or fewer filters.</div>';
  list.querySelectorAll('.card').forEach((el) => (el.onclick = () => open(results[+el.dataset.i].url)));
}

function applyContext(ctx) {
  if (ctx?.theme) document.documentElement.dataset.theme = ctx.theme;
  for (const [k, v] of Object.entries(ctx?.styles?.variables || {})) if (v) document.documentElement.style.setProperty(k, v);
}

const fromResult = (r) => r?.structuredContent || (() => { try { return JSON.parse(r?.content?.[0]?.text); } catch { return null; } })();
window.addEventListener('message', (e) => {
  const m = e.data;
  if (!m || m.jsonrpc !== '2.0') return;
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id); return; }
  if (m.method === 'ui/notifications/tool-result') render(fromResult(m.params));
  if (m.method === 'ui/notifications/host-context-changed') applyContext(m.params);
});
new ResizeObserver(() => send({ method: 'ui/notifications/size-changed', params: { width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight } })).observe(document.body);

if (window.openai?.toolOutput) {
  // ChatGPT Apps SDK hosts hand the result over directly
  applyContext({ theme: window.openai.theme });
  render(window.openai.toolOutput);
} else {
  request('ui/initialize', { protocolVersion: '2026-01-26', appInfo: { name: 'kausalflow-tools', version: '1.1.0' }, appCapabilities: {} })
    .then((r) => { applyContext(r?.hostContext); send({ method: 'ui/notifications/initialized' }); });
}
</script></body></html>`;
