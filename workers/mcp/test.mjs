import assert from 'node:assert/strict';
import worker from './src/index.js';

const data = [
  { title: 'Zotero', url: 'https://tools.example/tools/zotero/', summary: 'Free reference manager to collect, organize, cite and share research.', features: ['Browser connector', 'Word and LibreOffice plugins'], links: [{ name: 'zotero.org', url: 'https://www.zotero.org' }], categories: ['Literature Management'], tags: ['Reference Manager', 'Open Source'], fields: ['General and Interdisciplinary'], platforms: ['Windows', 'macOS', 'Linux'], added: '2020-05-01' },
  { title: 'Overleaf', url: 'https://tools.example/tools/overleaf/', summary: 'Collaborative LaTeX editor in the browser.', features: ['Real-time collaboration'], links: [], categories: ['Writing'], tags: ['LaTeX', 'Collaboration'], fields: ['General and Interdisciplinary'], platforms: ['Web'], added: '2021-01-01' },
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
assert.deepEqual(r.result.tools.map((t) => t.name), ['search', 'fetch', 'list_filters']);
assert.deepEqual(Object.keys(r.result.tools[0].inputSchema.properties), ['query', 'category', 'tag', 'field', 'platform', 'limit']);

let s = parsed(await call('search', { query: 'reference manager' }));
assert.equal(s.results[0].id, 'zotero');
assert.equal(s.results.length, 1);
s = parsed(await call('search', { query: 'latex' }));
assert.equal(s.results[0].title, 'Overleaf');
s = parsed(await call('search', { query: '', platform: 'web' }));
assert.deepEqual(s.results.map((x) => x.id), ['overleaf']);
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

const facets = parsed(await call('list_filters', {}));
assert.deepEqual(facets.fields, [{ name: 'General and Interdisciplinary', count: 2 }]);
assert.equal(fetched, 1, 'tools.json is cached between calls');

r = await (await post({ jsonrpc: '2.0', id: 9, method: 'tools/call', params: { name: 'nope' } })).json();
assert.equal(r.error.code, -32602);
r = await (await post({ jsonrpc: '2.0', id: 9, method: 'resources/list' })).json();
assert.equal(r.error.code, -32601);
res = await worker.fetch(new Request('https://mcp.example/', { method: 'POST', body: '{' }), env);
assert.equal(res.status, 400);
res = await worker.fetch(new Request('https://mcp.example/', { headers: { accept: 'text/event-stream' } }), env);
assert.equal(res.status, 405);
res = await worker.fetch(new Request('https://mcp.example/', { headers: { accept: 'text/html' } }), env);
assert.equal(res.headers.get('location'), 'https://tools.example/ai/');
res = await worker.fetch(new Request('https://mcp.example/', { method: 'OPTIONS' }), env);
assert.equal(res.headers.get('access-control-allow-origin'), '*');
console.log('mcp worker: all tests passed');
