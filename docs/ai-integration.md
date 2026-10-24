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

- `search(query, category?, field?, platform?, tag?, limit?)` returns `{results: [{id, title, url, summary}]}`.
- `fetch(id)` returns `{id, title, url, text, metadata}`. `id` is the page slug; a page URL works too.
- `list_filters()` returns the categories, fields, platforms and tags with counts.

`search` and `fetch` use the result shape ChatGPT connectors and deep research require, and Claude,
Cursor, VS Code and Claude Code accept the same server. Opening the URL in a browser redirects to `/ai/`.

Test locally with `node workers/mcp/test.mjs`. `.github/workflows/deploy-workers.yml` tests both workers on
pull requests and deploys them from `master` when `CLOUDFLARE_API_TOKEN` is set. The worker needs no secrets.

If the worker moves (for example to a custom domain such as `mcp.tools.kausalflow.com`), change
`params.mcp_url` in `config.yaml`; the `/ai/` page and `llms.txt` pick it up.
