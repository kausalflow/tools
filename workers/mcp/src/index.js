// Cloudflare Worker: a remote MCP server over the public tools.json feed, so AI assistants
// (Claude, ChatGPT, Cursor, ...) can search the directory and read tool details.
// Streamable HTTP transport, stateless: every POST is one JSON-RPC message answered with JSON.
// `search` and `fetch` follow the shape ChatGPT connectors and deep research expect.
//
// Configuration (wrangler.toml [vars]):
//   SITE_URL    var   where tools.json lives, default https://tools.kausalflow.com

const PROTOCOLS = ['2025-06-18', '2025-03-26', '2024-11-05'];
const SERVER = { name: 'kausalflow-tools', title: 'Tools for Academic Research', version: '1.0.0' };
const TTL = 10 * 60 * 1000;
const FACETS = { categories: 'category', tags: 'tag', fields: 'field', platforms: 'platform' };

const INSTRUCTIONS =
  'Tools for Academic Research (tools.kausalflow.com) is a curated, community-reviewed directory of tools for researchers: ' +
  'literature search and reading, writing, reference management, data analysis, visualization, collaboration, publishing and careers. ' +
  'Use `search` to find tools for a task, optionally narrowed by category, field, platform or tag (see `list_filters` for the values), ' +
  'then `fetch` for a tool\'s full details. Always give people the tool page link (url). Content is CC BY-SA 4.0.';

const READ_ONLY = { readOnlyHint: true, openWorldHint: false };
const filterProps = Object.fromEntries(
  Object.values(FACETS).map((one) => [one, { type: 'string', description: `Only tools with this ${one} (see list_filters for values)` }]),
);
const TOOLS = [
  {
    name: 'search',
    title: 'Search research tools',
    description:
      'Search the directory of research tools by keywords, e.g. "reference manager", "pdf annotation", "survey", "LaTeX". ' +
      'Returns matching tools as {results: [{id, title, url, summary}]}; pass an id to fetch for details.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Keywords describing the task or the tool. Can be empty when a filter is given.' },
        ...filterProps,
        limit: { type: 'integer', minimum: 1, maximum: 50, description: 'Maximum number of results, default 10' },
      },
      required: ['query'],
    },
    annotations: { title: 'Search research tools', ...READ_ONLY },
  },
  {
    name: 'fetch',
    title: 'Get a research tool',
    description: 'Get the full details of one tool by the id returned from search (or its tools.kausalflow.com URL): summary, features, links, categories, fields, platforms.',
    inputSchema: { type: 'object', properties: { id: { type: 'string', description: 'Tool id from search, e.g. "zotero"' } }, required: ['id'] },
    annotations: { title: 'Get a research tool', ...READ_ONLY },
  },
  {
    name: 'list_filters',
    title: 'List categories, fields, platforms and tags',
    description: 'List the categories, research fields, platforms and tags used in the directory, with how many tools have each. Use the values as search filters.',
    inputSchema: { type: 'object', properties: {} },
    annotations: { title: 'List filters', ...READ_ONLY },
  },
];

let cache = { at: 0, site: '', tools: null };
async function loadTools(site) {
  if (cache.tools && cache.site === site && Date.now() - cache.at < TTL) return cache.tools;
  const res = await fetch(`${site}/tools.json`, { cf: { cacheTtl: 600, cacheEverything: true } });
  if (!res.ok) throw new Error(`tools.json returned ${res.status}`);
  const tools = (await res.json()).map((t) => ({ ...t, id: idOf(t.url) }));
  cache = { at: Date.now(), site, tools };
  return tools;
}

const idOf = (url) => String(url).replace(/\/+$/, '').split('/').pop();
const norm = (s) => String(s ?? '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '');
const words = (s) => norm(s).split(/[^a-z0-9+#]+/).filter((w) => w.length > 1);

// a term counts when a word starts with it, so "stat" finds "statistics" but "tex" does not find "context"
const has = (hay, w) => new RegExp(`(^|[^a-z0-9])${w.replace(/[+#]/g, '\\$&')}`).test(hay);
function score(t, terms, phrase) {
  if (!terms.length) return 1;
  const title = norm(t.title);
  const labels = norm([...t.tags, ...t.categories, ...t.fields].join(' '));
  const summary = norm(t.summary);
  const rest = norm([...t.features, ...t.links.map((l) => `${l.name} ${l.url}`)].join(' '));
  let s = 0;
  if (title === phrase) s += 50;
  else if (title.includes(phrase)) s += 20;
  if (summary.includes(phrase)) s += 6;
  for (const w of terms) {
    if (has(title, w)) s += 10;
    if (has(labels, w)) s += 5;
    if (has(summary, w)) s += 4;
    if (has(rest, w)) s += 1;
  }
  return s;
}

const matches = (values, want) => !want || values.some((v) => norm(v) === norm(want));
function search(tools, args) {
  const query = String(args.query ?? '');
  const terms = words(query);
  const limit = Math.min(Math.max(parseInt(args.limit, 10) || 10, 1), 50);
  return tools
    .filter((t) => matches(t.categories, args.category) && matches(t.tags, args.tag) && matches(t.fields, args.field) && matches(t.platforms, args.platform))
    .map((t) => ({ t, s: score(t, terms, norm(query).trim()) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s || a.t.added.localeCompare(b.t.added))
    .slice(0, limit)
    .map(({ t }) => ({ id: t.id, title: t.title, url: t.url, summary: t.summary }));
}

function find(tools, id) {
  const key = idOf(String(id ?? '').trim()).toLowerCase();
  return tools.find((t) => t.id.toLowerCase() === key) || tools.find((t) => norm(t.title) === norm(id));
}

function asText(t) {
  const list = (name, xs) => (xs.length ? `\n${name}: ${xs.join(', ')}` : '');
  return (
    `# ${t.title}\n\n${t.summary}\n` +
    (t.features.length ? `\nFeatures:\n${t.features.map((f) => `- ${f}`).join('\n')}\n` : '') +
    (t.links.length ? `\nLinks:\n${t.links.map((l) => `- ${l.name}: ${l.url}`).join('\n')}\n` : '') +
    list('Categories', t.categories) + list('Fields', t.fields) + list('Platforms', t.platforms) + list('Tags', t.tags) +
    `\nListed: ${t.added}\nPage: ${t.url}`
  );
}

function facets(tools) {
  const out = {};
  for (const f of Object.keys(FACETS)) {
    const n = {};
    for (const t of tools) for (const v of t[f]) n[v] = (n[v] || 0) + 1;
    out[f] = Object.entries(n).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([name, count]) => ({ name, count }));
  }
  return out;
}

const text = (value) => ({ content: [{ type: 'text', text: typeof value === 'string' ? value : JSON.stringify(value) }] });
async function callTool(name, args, site) {
  const tools = await loadTools(site);
  if (name === 'search') return { ...text({ results: search(tools, args) }) };
  if (name === 'fetch') {
    const t = find(tools, args.id);
    if (!t) return { ...text(`No tool with id "${args.id}". Use search to find ids.`), isError: true };
    const { id, title, url, ...rest } = t;
    return text({ id, title, url, text: asText(t), metadata: rest });
  }
  if (name === 'list_filters') return text(facets(tools));
  return null;
}

const ok = (id, result) => ({ jsonrpc: '2.0', id, result });
const fail = (id, code, message) => ({ jsonrpc: '2.0', id: id ?? null, error: { code, message } });

async function rpc(msg, site) {
  if (!msg || msg.jsonrpc !== '2.0' || typeof msg.method !== 'string') return fail(msg?.id, -32600, 'Invalid request');
  const { id, method, params = {} } = msg;
  if (id === undefined) return null; // notifications need no answer
  switch (method) {
    case 'initialize':
      return ok(id, {
        protocolVersion: PROTOCOLS.includes(params.protocolVersion) ? params.protocolVersion : PROTOCOLS[0],
        capabilities: { tools: { listChanged: false } },
        serverInfo: SERVER,
        instructions: INSTRUCTIONS,
      });
    case 'ping':
      return ok(id, {});
    case 'tools/list':
      return ok(id, { tools: TOOLS });
    case 'tools/call': {
      try {
        const result = await callTool(params.name, params.arguments || {}, site);
        return result ? ok(id, result) : fail(id, -32602, `Unknown tool: ${params.name}`);
      } catch (e) {
        return ok(id, { ...text(`The directory could not be loaded: ${e.message}`), isError: true });
      }
    }
    default:
      return fail(id, -32601, `Method not found: ${method}`);
  }
}

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, POST, OPTIONS',
  'access-control-allow-headers': 'content-type, accept, mcp-protocol-version, mcp-session-id, authorization',
  'access-control-expose-headers': 'mcp-session-id',
};
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...CORS } });

export default {
  async fetch(request, env) {
    const site = (env.SITE_URL || 'https://tools.kausalflow.com').replace(/\/$/, '');
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
    if (request.method === 'GET') {
      // no server-initiated stream; send people who open the URL in a browser to the setup guide
      if ((request.headers.get('accept') || '').includes('text/html')) return Response.redirect(`${site}/ai/`, 302);
      return new Response('Method not allowed', { status: 405, headers: { allow: 'POST, OPTIONS', ...CORS } });
    }
    if (request.method === 'DELETE') return new Response(null, { status: 405, headers: CORS });
    if (request.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: CORS });

    let body;
    try {
      body = await request.json();
    } catch {
      return json(fail(null, -32700, 'Parse error'), 400);
    }
    if (Array.isArray(body)) {
      const out = (await Promise.all(body.map((m) => rpc(m, site)))).filter(Boolean);
      return out.length ? json(out) : new Response(null, { status: 202, headers: CORS });
    }
    const out = await rpc(body, site);
    return out ? json(out) : new Response(null, { status: 202, headers: CORS });
  },
};
