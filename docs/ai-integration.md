# AI integration

How AI assistants read and use the directory. Everything is generated from the tool pages in `content/tools/`.

| What | Where | Made by |
| --- | --- | --- |
| Setup guide for people | `/ai/` | `content/ai.md` |
| Short index | `/llms.txt` | `layouts/index.llms.txt` |
| Every tool in full, Markdown | `/llms-full.txt` | `layouts/index.llmsfull.txt` |
| One tool, Markdown | `/tools/<slug>/index.md` | `layouts/tools/single.md` (both use `layouts/partials/tool.md`) |
| All tools, JSON | `/tools.json` | `layouts/index.tools.json` |
| MCP server | `params.mcp_url` in `config.yaml` | `workers/mcp` |

## MCP server

`workers/mcp` is a Cloudflare Worker that serves MCP over Streamable HTTP, statelessly, with no
dependencies. It reads `/tools.json` from the live site (cached for ten minutes), so a new tool shows up
there once the site has deployed. Tools:

- `search(query, category?, field?, platform?, tag?, pricing?, open_source?, limit?)` returns
  `{results: [{id, title, url, summary, pricing, open_source, platforms, status}]}`. With the Workers AI
  binding (`[ai]` in `wrangler.toml`) it also ranks by meaning: tool vectors (`@cf/baai/bge-small-en-v1.5`)
  are computed on first use and kept while the isolate lives; only the query is embedded per call. If
  Workers AI fails, search falls back to keywords.
- `alternatives(to, pricing?, open_source?, platform?, limit?)` returns tools whose `alternatives_to`
  names the product, open source and free first, plus the `/alternatives/<name>/` page.
- `fetch(id)` returns `{id, title, url, text, metadata}`. `id` is the page slug; a page URL works too.
- `list_filters()` returns the categories, fields, platforms, tags, price models and replaced products with counts.

`search` and `alternatives` also return `structuredContent` and point (`_meta.ui.resourceUri`, plus
`openai/outputTemplate` for ChatGPT) at `ui://kausalflow-tools/results.html`, an [MCP Apps](https://modelcontextprotocol.io/docs/extensions/apps)
view in `workers/mcp/src/ui.js` that renders the results as tool cards. Screenshots load from the site, which the
resource's CSP allows; links open through `ui/open-link`. Hosts without MCP Apps use the text result.

Unreachable tools (see below) are kept but ranked last and marked `status: "unreachable"`.

## Data fields for AI answers

Tool front matter has three optional fields, validated by `scripts/triage/kftools.py`:

- `pricing`: `free`, `freemium` (free plan with paid upgrades) or `paid`.
- `open_source`: `true` or `false`.
- `alternatives_to`: well-known products the tool replaces. This is a Hugo taxonomy: every value gets an
  "Alternatives to X" page at `/alternatives/<x>/`, indexed by search engines once it lists two tools or more.

They appear on tool pages and cards, in `tools.json`, the Markdown copies, `llms-full.txt` and the JSON-LD
(`isAccessibleForFree`, a zero-price `offers` for free tools). The October 2026 backfill was a first pass
from the listings and general knowledge; correct any value with "Suggest an edit".

## Link status

`scripts/linkcheck/linkcheck.py` checks each tool's first link. The site workflow runs it every Monday
(and on manual runs); pushes reuse the last published result from `/linkcheck.json`. A tool becomes
`unreachable` after two failed checks in a row (401, 403 and 429 count as reachable, since many sites block
bots). Its page then shows a notice, and `tools.json` and the MCP server carry the status.

`search` and `fetch` use the result shape ChatGPT connectors and deep research require, and Claude,
Cursor, VS Code and Claude Code accept the same server. Opening the URL in a browser redirects to `/ai/`.

Test locally with `node workers/mcp/test.mjs`. `.github/workflows/deploy-workers.yml` tests both workers on
pull requests and deploys them from `master` when `CLOUDFLARE_API_TOKEN` is set. The worker needs no secrets.

If the worker moves (for example to a custom domain such as `mcp.tools.kausalflow.com`), change
`params.mcp_url` in `config.yaml`; the `/ai/` page and `llms.txt` pick it up.

## What people search for

With the `QUERIES` Analytics Engine binding, each `search` and `alternatives` call writes one data point:
the tool name, the query (or product) text, the filters and the result count, with no client data. The
`/ai/` page says so. Searches that find nothing are the list of tools to add. Query them with the
[SQL API](https://developers.cloudflare.com/analytics/analytics-engine/sql-api/):

```sql
SELECT blob2 AS query, blob3 AS filters, count() AS times
FROM kausalflow_tools_mcp_queries
WHERE timestamp > NOW() - INTERVAL '30' DAY AND double1 = 0
GROUP BY query, filters ORDER BY times DESC LIMIT 50
```

## Being found

Assistants find servers through registries and directories, not through this site. After the worker is live:

1. **Official MCP Registry**: run the "Publish MCP server to the registry" workflow. It checks that the
   server answers and then publishes `workers/mcp/server.json` as `io.github.kausalflow/tools`. Bump `version`
   in `server.json` for each later publish.
2. **Anthropic's connector directory** and **OpenAI's app directory**: these need submission forms filled in
   by the owner. They ask for the server URL, a description, a privacy note (above) and screenshots.
3. **Community directories**: Smithery, Glama, PulseMCP and mcp.so pick up servers from the registry or from
   a short form.

A custom domain such as `mcp.kausalflow.com` looks more trustworthy than `*.workers.dev`. If you add one, change
`params.mcp_url` and the `server.json` URL, then publish again.
