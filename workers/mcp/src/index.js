// Cloudflare Worker: a remote MCP server over the public tools.json feed, so AI assistants
// (Claude, ChatGPT, Cursor, ...) can search the directory and read tool details.
// Streamable HTTP transport, stateless: every POST is one JSON-RPC message answered with JSON.
// `search` and `fetch` follow the shape ChatGPT connectors and deep research expect.
//
// Configuration (wrangler.toml):
//   SITE_URL    var       where tools.json lives, default https://tools.kausalflow.com
//   AI          binding   optional Workers AI; when present, search also ranks by meaning (embeddings)
//   QUERIES     binding   optional Analytics Engine dataset; records each search (text, filters, result
//                         count, no client data) so maintainers can see what people look for and miss

import { UI_MIME, UI_URI, uiHtml } from './ui.js';

const PROTOCOLS = ['2025-06-18', '2025-03-26', '2024-11-05'];
const SERVER = { name: 'kausalflow-tools', title: 'Tools for Academic Research', version: '1.1.0' };
const TTL = 10 * 60 * 1000;
const FACETS = { categories: 'category', tags: 'tag', fields: 'field', platforms: 'platform' };
const PRICING = ['free', 'freemium', 'paid'];
const EMBED_MODEL = '@cf/baai/bge-small-en-v1.5';

const INSTRUCTIONS =
  'Tools for Academic Research (tools.kausalflow.com) is a curated, community-reviewed directory of tools for researchers: ' +
  'literature search and reading, writing, reference management, data analysis, visualization, collaboration, publishing and careers. ' +
  'Each tool records its price (free, freemium = free plan with paid upgrades, paid), whether it is open source, its platforms, ' +
  'the well-known tools it replaces, and whether its website still responds (checked weekly). ' +
  'Use `search` to find tools for a task (plain-language descriptions work), narrowed by price, open source, platform, field or category; ' +
  '`alternatives` to find replacements for a named product such as EndNote or Grammarly; `fetch` for one tool\'s full details. ' +
  'Prefer tools whose status is not "unreachable". Always give people the tool page link (url). Content is CC BY-SA 4.0.';

const READ_ONLY = { readOnlyHint: true, openWorldHint: false };
// hosts with MCP Apps support (and ChatGPT) render results as tool cards from this resource
const CARDS = { ui: { resourceUri: UI_URI }, 'openai/outputTemplate': UI_URI };
const FILTERS = {
  ...Object.fromEntries(Object.values(FACETS).map((one) => [one, { type: 'string', description: `Only tools with this ${one} (see list_filters for values)` }])),
  pricing: { type: 'string', enum: PRICING, description: 'Only tools with this price model. "free" is entirely free; "freemium" has a free plan with paid upgrades.' },
  open_source: { type: 'boolean', description: 'true for open-source tools only' },
};
const RESULT_SHAPE = '{results: [{id, title, url, summary, pricing, open_source, platforms, status}]}';
const TOOLS = [
  {
    name: 'search',
    title: 'Search research tools',
    description:
      'Find research tools for a task, by keywords or a plain-language description, e.g. "reference manager", ' +
      '"turn handwritten notes into LaTeX", "screen abstracts for a systematic review". ' +
      `Returns ${RESULT_SHAPE}; pass an id to fetch for details.`,
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'What the person wants to do, or the tool they are looking for. Can be empty when a filter is given.' },
        ...FILTERS,
        limit: { type: 'integer', minimum: 1, maximum: 50, description: 'Maximum number of results, default 10' },
      },
      required: ['query'],
    },
    annotations: { title: 'Search research tools', ...READ_ONLY },
    _meta: CARDS,
  },
  {
    name: 'fetch',
    title: 'Get a research tool',
    description: 'Get the full details of one tool by the id returned from search (or its tools.kausalflow.com URL): summary, features, links, price, open source, alternatives, categories, fields, platforms and link status.',
    inputSchema: { type: 'object', properties: { id: { type: 'string', description: 'Tool id from search, e.g. "zotero"' } }, required: ['id'] },
    annotations: { title: 'Get a research tool', ...READ_ONLY },
  },
  {
    name: 'alternatives',
    title: 'Find alternatives to a tool',
    description:
      'Find tools researchers use instead of a named product, e.g. "EndNote", "Grammarly", "Covidence", "Overleaf". ' +
      `Open-source and free tools come first. Returns {to, page, ${RESULT_SHAPE.slice(1)}; page is the directory's "alternatives to" page when there is one.`,
    inputSchema: {
      type: 'object',
      properties: {
        to: { type: 'string', description: 'The product to replace' },
        pricing: FILTERS.pricing,
        open_source: FILTERS.open_source,
        platform: FILTERS.platform,
        limit: { type: 'integer', minimum: 1, maximum: 50, description: 'Maximum number of results, default 10' },
      },
      required: ['to'],
    },
    annotations: { title: 'Find alternatives', ...READ_ONLY },
    _meta: CARDS,
  },
  {
    name: 'list_filters',
    title: 'List categories, fields, platforms and tags',
    description: 'List the categories, research fields, platforms, tags, price models and the products with listed alternatives, with how many tools have each. Use the values as filters.',
    inputSchema: { type: 'object', properties: {} },
    annotations: { title: 'List filters', ...READ_ONLY },
  },
];

let cache = { at: 0, site: '', tools: null, vectors: null };
async function loadTools(site) {
  if (cache.tools && cache.site === site && Date.now() - cache.at < TTL) return cache.tools;
  const res = await fetch(`${site}/tools.json`, { cf: { cacheTtl: 600, cacheEverything: true } });
  if (!res.ok) throw new Error(`tools.json returned ${res.status}`);
  const tools = (await res.json()).map((t) => ({
    ...t,
    id: idOf(t.url),
    pricing: t.pricing || 'unknown',
    open_source: t.open_source ?? null,
    alternatives_to: t.alternatives_to || [],
    status: t.status || 'unknown',
  }));
  // keep vectors computed for the same tools, so a refresh with unchanged data costs nothing
  const same = cache.tools && cache.tools.length === tools.length && cache.tools.every((t, i) => embedText(t) === embedText(tools[i]));
  cache = { at: Date.now(), site, tools, vectors: same ? cache.vectors : null };
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
  const labels = norm([...t.tags, ...t.categories, ...t.fields, ...t.alternatives_to].join(' '));
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

// Embeddings: one vector per tool, computed on first use and kept for the life of the isolate.
const embedText = (t) => `${t.title}. ${t.summary} ${t.features.join('. ')} ${t.tags.join(', ')}`.slice(0, 1000);
async function embed(env, texts) {
  const out = [];
  for (let i = 0; i < texts.length; i += 100) out.push(...(await env.AI.run(EMBED_MODEL, { text: texts.slice(i, i + 100) })).data);
  return out;
}
const dot = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0); // bge vectors are normalized
async function similarity(env, tools, query) {
  if (!env?.AI || !query.trim()) return null;
  try {
    if (!cache.vectors) cache.vectors = await embed(env, tools.map(embedText));
    const [q] = await embed(env, [query]);
    return new Map(tools.map((t, i) => [t, dot(q, cache.vectors[i])]));
  } catch {
    return null; // keyword search still works without Workers AI
  }
}

const matches = (values, want) => !want || values.some((v) => norm(v) === norm(want));
const passes = (t, a) =>
  matches(t.categories, a.category) && matches(t.tags, a.tag) && matches(t.fields, a.field) && matches(t.platforms, a.platform) &&
  (!a.pricing || t.pricing === a.pricing) && (typeof a.open_source !== 'boolean' || (t.open_source === true) === a.open_source);
const limitOf = (a) => Math.min(Math.max(parseInt(a.limit, 10) || 10, 1), 50);
const brief = (t) => ({ id: t.id, title: t.title, url: t.url, summary: t.summary, pricing: t.pricing, open_source: t.open_source, platforms: t.platforms, status: t.status, image: t.image || null });
// tools whose site stopped responding go last
const dead = (t) => (t.status === 'unreachable' ? 1 : 0);

const SEMANTIC_MIN = 0.62; // below this, a tool with no keyword match is not considered related
async function search(tools, args, env) {
  const query = String(args.query ?? '');
  const terms = words(query);
  const pool = tools.filter((t) => passes(t, args));
  const sims = await similarity(env, pool, query);
  const scored = pool.map((t) => {
    const s = score(t, terms, norm(query).trim());
    const c = sims?.get(t) ?? 0;
    // keywords count up to 40 alone, up to 20 next to similarity (which adds up to ~75)
    return { t, s, rank: Math.min(s, sims ? 20 : 40) + (sims ? Math.max(0, c - SEMANTIC_MIN) * 200 : 0), keep: s > 0 || c >= SEMANTIC_MIN };
  });
  return scored
    .filter((x) => x.keep)
    .sort((a, b) => dead(a.t) - dead(b.t) || b.rank - a.rank || a.t.added.localeCompare(b.t.added))
    .slice(0, limitOf(args))
    .map(({ t }) => brief(t));
}

const ORDER = { free: 0, freemium: 1, paid: 2, unknown: 3 };
function alternatives(tools, args, site) {
  const to = norm(args.to).trim();
  const listed = tools.filter((t) => t.alternatives_to.some((a) => norm(a) === to));
  const results = listed
    .filter((t) => passes(t, args) && norm(t.title) !== to)
    .sort((a, b) => dead(a) - dead(b) || (b.open_source === true) - (a.open_source === true) || ORDER[a.pricing] - ORDER[b.pricing] || a.title.localeCompare(b.title))
    .slice(0, limitOf(args))
    .map(brief);
  const name = listed[0]?.alternatives_to.find((a) => norm(a) === to) || args.to;
  const slug = norm(name).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return { to: name, page: listed.length ? `${site}/alternatives/${slug}/` : null, results };
}

function find(tools, id) {
  const key = idOf(String(id ?? '').trim()).toLowerCase();
  return tools.find((t) => t.id.toLowerCase() === key) || tools.find((t) => norm(t.title) === norm(id));
}

const PRICE = { free: 'free', freemium: 'free plan with paid upgrades', paid: 'paid' };
function asText(t) {
  const list = (name, xs) => (xs.length ? `\n${name}: ${xs.join(', ')}` : '');
  return (
    `# ${t.title}\n\n${t.summary}\n` +
    (t.features.length ? `\nFeatures:\n${t.features.map((f) => `- ${f}`).join('\n')}\n` : '') +
    (t.links.length ? `\nLinks:\n${t.links.map((l) => `- ${l.name}: ${l.url}`).join('\n')}\n` : '') +
    (PRICE[t.pricing] ? `\nPrice: ${PRICE[t.pricing]}` : '') +
    (t.open_source === true ? '\nOpen source: yes' : t.open_source === false ? '\nOpen source: no' : '') +
    list('Alternative to', t.alternatives_to) +
    list('Categories', t.categories) + list('Fields', t.fields) + list('Platforms', t.platforms) + list('Tags', t.tags) +
    (t.status === 'unreachable' ? `\nWarning: the website has not responded in recent weekly checks (last checked ${t.last_checked}).` : '') +
    `\nListed: ${t.added}\nPage: ${t.url}`
  );
}

function facets(tools) {
  const count = (values) => {
    const n = {};
    for (const v of values) n[v] = (n[v] || 0) + 1;
    return Object.entries(n).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([name, count]) => ({ name, count }));
  };
  const out = {};
  for (const f of Object.keys(FACETS)) out[f] = count(tools.flatMap((t) => t[f]));
  out.pricing = count(tools.map((t) => t.pricing));
  out.alternatives_to = count(tools.flatMap((t) => t.alternatives_to));
  return out;
}

// What was asked and how many results came back; nothing about who asked.
function record(env, tool, args, count) {
  try {
    const filters = ['category', 'tag', 'field', 'platform', 'pricing', 'open_source'].filter((k) => args[k] !== undefined).map((k) => `${k}=${args[k]}`);
    env?.QUERIES?.writeDataPoint({ indexes: [tool], blobs: [tool, String(args.query ?? args.to ?? '').slice(0, 200), filters.join(' ')], doubles: [count] });
  } catch {
    // analytics must never break a search
  }
}

const text = (value) => ({ content: [{ type: 'text', text: typeof value === 'string' ? value : JSON.stringify(value) }] });
const structured = (value) => ({ ...text(value), structuredContent: value });
async function callTool(name, args, site, env) {
  const tools = await loadTools(site);
  if (name === 'search') {
    const results = await search(tools, args, env);
    record(env, name, args, results.length);
    return structured({ results });
  }
  if (name === 'alternatives') {
    const found = alternatives(tools, args, site);
    record(env, name, args, found.results.length);
    return structured(found);
  }
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

async function rpc(msg, site, env) {
  if (!msg || msg.jsonrpc !== '2.0' || typeof msg.method !== 'string') return fail(msg?.id, -32600, 'Invalid request');
  const { id, method, params = {} } = msg;
  if (id === undefined) return null; // notifications need no answer
  switch (method) {
    case 'initialize':
      return ok(id, {
        protocolVersion: PROTOCOLS.includes(params.protocolVersion) ? params.protocolVersion : PROTOCOLS[0],
        capabilities: { tools: { listChanged: false }, resources: { listChanged: false } },
        serverInfo: SERVER,
        instructions: INSTRUCTIONS,
      });
    case 'ping':
      return ok(id, {});
    case 'tools/list':
      return ok(id, { tools: TOOLS });
    case 'resources/list':
      return ok(id, { resources: [{ uri: UI_URI, name: 'Tool cards', description: 'Inline cards for search and alternatives results', mimeType: UI_MIME }] });
    case 'resources/templates/list':
      return ok(id, { resourceTemplates: [] });
    case 'resources/read':
      if (params.uri !== UI_URI) return fail(id, -32002, `Resource not found: ${params.uri}`);
      return ok(id, {
        contents: [{ uri: UI_URI, mimeType: UI_MIME, text: uiHtml(site), _meta: { ui: { csp: { resourceDomains: [site] }, prefersBorder: false } } }],
      });
    case 'tools/call': {
      try {
        const result = await callTool(params.name, params.arguments || {}, site, env);
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
      const out = (await Promise.all(body.map((m) => rpc(m, site, env)))).filter(Boolean);
      return out.length ? json(out) : new Response(null, { status: 202, headers: CORS });
    }
    const out = await rpc(body, site, env);
    return out ? json(out) : new Response(null, { status: 202, headers: CORS });
  },
};
