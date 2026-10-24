import assert from 'node:assert/strict';
import worker from './src/index.js';

const data = [
  { title: 'Zotero', url: 'https://tools.example/tools/zotero/', summary: 'Free reference manager to collect, organize, cite and share research.', features: ['Browser connector', 'Word and LibreOffice plugins'], links: [{ name: 'zotero.org', url: 'https://www.zotero.org' }], categories: ['Literature Management'], tags: ['Reference Manager', 'Open Source'], fields: ['General and Interdisciplinary'], platforms: ['Windows', 'macOS', 'Linux'], added: '2020-05-01', pricing: 'free', open_source: true, alternatives_to: ['EndNote', 'Mendeley'] },
  { title: 'Overleaf', url: 'https://tools.example/tools/overleaf/', summary: 'Collaborative LaTeX editor in the browser.', features: ['Real-time collaboration'], links: [], categories: ['Writing'], tags: ['LaTeX', 'Collaboration'], fields: ['General and Interdisciplinary'], platforms: ['Web'], added: '2021-01-01', pricing: 'freemium', open_source: true, alternatives_to: [] },
  { title: 'Paperpile', url: 'https://tools.example/tools/paperpile/', summary: 'Reference manager for Google Docs.', features: [], links: [], categories: ['Literature Management'], tags: ['Reference Manager'], fields: [], platforms: ['Web'], added: '2019-01-01', pricing: 'paid', open_source: false, alternatives_to: ['EndNote'] },
  { title: 'OldRef', url: 'https://tools.example/tools/oldref/', summary: 'Reference manager that shut down.', features: [], links: [], categories: [], tags: [], fields: [], platforms: ['Web'], added: '2018-01-01', alternatives_to: ['EndNote'], status: 'unreachable', last_checked: '2026-10-19' },
];
let fetched = 0;
globalThis.fetch = async (url) => { fetched++; assert.equal(url, 'https://tools.example/tools.json'); return { ok: true, json: async () => data }; };
const env = { SITE_URL: 'https://tools.example/' };
const post = (body) => worker.fetch(new Request('https://mcp.example/', { method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json' } }), env);
const call = async (name, args, id = 1) => (await (await post({ jsonrpc: '2.0', id, method: 'tools/call', params: { name, arguments: args } })).json()).result;
const parsed = (r) => JSON.parse(r.content[0].text);

let r = await (await post({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 't', version: '0' } } })).json();
assert.equal(r.result.protocolVersion, '2025-03-26');
assert.ok(r.result.capabilities.tools && r.result.instructions);
r = await (await post({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '1999-01-01' } })).json();
assert.equal(r.result.protocolVersion, '2025-06-18');

let res = await post({ jsonrpc: '2.0', method: 'notifications/initialized' });
assert.equal(res.status, 202);

r = await (await post({ jsonrpc: '2.0', id: 2, method: 'tools/list' })).json();
assert.deepEqual(r.result.tools.map((t) => t.name), ['search', 'fetch', 'alternatives', 'list_filters']);
assert.deepEqual(Object.keys(r.result.tools[0].inputSchema.properties), ['query', 'category', 'tag', 'field', 'platform', 'pricing', 'open_source', 'limit']);

let s = parsed(await call('search', { query: 'reference manager' }));
assert.deepEqual(s.results.map((x) => x.id), ['paperpile', 'zotero', 'oldref'], 'unreachable tools go last');
assert.equal(s.results[1].pricing, 'free');
assert.equal(s.results[2].status, 'unreachable');
s = parsed(await call('search', { query: 'reference manager', pricing: 'free' }));
assert.deepEqual(s.results.map((x) => x.id), ['zotero']);
s = parsed(await call('search', { query: '', open_source: false }));
assert.deepEqual(s.results.map((x) => x.id), ['paperpile', 'oldref']);
s = parsed(await call('search', { query: 'latex' }));
assert.equal(s.results[0].title, 'Overleaf');
s = parsed(await call('search', { query: '', platform: 'web' }));
assert.deepEqual(s.results.map((x) => x.id), ['paperpile', 'overleaf', 'oldref']);
s = parsed(await call('search', { query: 'endnote' }));
assert.ok(s.results.some((x) => x.id === 'zotero'), 'alternatives_to is searchable');
s = parsed(await call('search', { query: 'reference', category: 'Writing' }));
assert.equal(s.results.length, 0);

let f = parsed(await call('fetch', { id: 'zotero' }));
assert.equal(f.url, 'https://tools.example/tools/zotero/');
assert.match(f.text, /Browser connector/);
assert.match(f.text, /zotero\.org: https:\/\/www\.zotero\.org/);
assert.deepEqual(f.metadata.platforms, ['Windows', 'macOS', 'Linux']);
f = parsed(await call('fetch', { id: 'https://tools.example/tools/overleaf/' }));
assert.equal(f.id, 'overleaf');
const miss = await call('fetch', { id: 'nope' });
assert.equal(miss.isError, true);

let a = parsed(await call('alternatives', { to: 'endnote' }));
assert.equal(a.to, 'EndNote');
assert.equal(a.page, 'https://tools.example/alternatives/endnote/');
assert.deepEqual(a.results.map((x) => x.id), ['zotero', 'paperpile', 'oldref'], 'open source first, unreachable last');
a = parsed(await call('alternatives', { to: 'EndNote', pricing: 'paid' }));
assert.deepEqual(a.results.map((x) => x.id), ['paperpile']);
a = parsed(await call('alternatives', { to: 'Nothing' }));
assert.deepEqual(a, { to: 'Nothing', page: null, results: [] });

f = parsed(await call('fetch', { id: 'oldref' }));
assert.match(f.text, /has not responded/);
f = parsed(await call('fetch', { id: 'zotero' }));
assert.match(f.text, /Price: free\nOpen source: yes\nAlternative to: EndNote, Mendeley/);

const facets = parsed(await call('list_filters', {}));
assert.deepEqual(facets.fields, [{ name: 'General and Interdisciplinary', count: 2 }]);
assert.deepEqual(facets.alternatives_to[0], { name: 'EndNote', count: 3 });
assert.deepEqual(facets.pricing.map((p) => p.name).sort(), ['free', 'freemium', 'paid', 'unknown']);
assert.equal(fetched, 1, 'tools.json is cached between calls');

r = await (await post({ jsonrpc: '2.0', id: 9, method: 'tools/call', params: { name: 'nope' } })).json();
assert.equal(r.error.code, -32602);
r = await (await post({ jsonrpc: '2.0', id: 9, method: 'prompts/list' })).json();
assert.equal(r.error.code, -32601);

// MCP Apps: search and alternatives point at a ui:// resource and return structuredContent for it
r = await (await post({ jsonrpc: '2.0', id: 3, method: 'tools/list' })).json();
const uri = r.result.tools[0]._meta.ui.resourceUri;
assert.equal(uri, 'ui://kausalflow-tools/results.html');
assert.equal(r.result.tools.find((t) => t.name === 'alternatives')._meta.ui.resourceUri, uri);
assert.equal(r.result.tools.find((t) => t.name === 'fetch')._meta, undefined);
r = await (await post({ jsonrpc: '2.0', id: 4, method: 'resources/list' })).json();
assert.deepEqual(r.result.resources.map((x) => [x.uri, x.mimeType]), [[uri, 'text/html;profile=mcp-app']]);
r = await (await post({ jsonrpc: '2.0', id: 5, method: 'resources/read', params: { uri } })).json();
assert.match(r.result.contents[0].text, /ui\/initialize/);
assert.match(r.result.contents[0].text, /"https:\/\/tools.example"/);
assert.deepEqual(r.result.contents[0]._meta.ui.csp.resourceDomains, ['https://tools.example']);
r = await (await post({ jsonrpc: '2.0', id: 6, method: 'resources/read', params: { uri: 'ui://nope' } })).json();
assert.equal(r.error.code, -32002);
const sr = await call('search', { query: 'latex' });
assert.deepEqual(sr.structuredContent, JSON.parse(sr.content[0].text));
res = await worker.fetch(new Request('https://mcp.example/', { method: 'POST', body: '{' }), env);
assert.equal(res.status, 400);
res = await worker.fetch(new Request('https://mcp.example/', { headers: { accept: 'text/event-stream' } }), env);
assert.equal(res.status, 405);
res = await worker.fetch(new Request('https://mcp.example/', { headers: { accept: 'text/html' } }), env);
assert.equal(res.headers.get('location'), 'https://tools.example/ai/');
res = await worker.fetch(new Request('https://mcp.example/', { method: 'OPTIONS' }), env);
assert.equal(res.headers.get('access-control-allow-origin'), '*');
// semantic ranking with a fake Workers AI: vectors point at Overleaf for anything about "handwriting"
let aiCalls = 0;
const vec = (t) => (/overleaf|latex|handwrit/i.test(t) ? [1, 0] : [0, 1]);
const ai = { run: async (model, { text }) => { aiCalls++; assert.match(model, /bge/); return { data: text.map(vec) }; } };
const callAI = async (name, args) => JSON.parse((await (await worker.fetch(new Request('https://mcp.example/', { method: 'POST', body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name, arguments: args } }) }), { ...env, AI: ai })).json()).result.content[0].text);
s = await callAI('search', { query: 'turn my handwriting into equations' });
assert.deepEqual(s.results.map((x) => x.id), ['overleaf'], 'found by meaning, no keyword overlap');
const before = aiCalls;
await callAI('search', { query: 'handwriting' });
assert.equal(aiCalls, before + 1, 'tool vectors are reused, only the query is embedded');
const broken = { run: async () => { throw new Error('quota'); } };
r = await (await worker.fetch(new Request('https://mcp.example/', { method: 'POST', body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'search', arguments: { query: 'latex' } } }) }), { ...env, AI: broken })).json();
assert.equal(JSON.parse(r.result.content[0].text).results[0].id, 'overleaf', 'falls back to keywords when Workers AI fails');
console.log('mcp worker: all tests passed');
