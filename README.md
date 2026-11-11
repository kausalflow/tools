# KausalFlow Tools: tools for academic research

Source of [tools.kausalflow.com](https://tools.kausalflow.com/), a community-curated directory of tools for research: literature, writing, data analysis, code, project management and more.
It grew out of [Awesome Research Tools](https://github.com/emptymalei/awesome-research).

Every tool has its own page with a summary, features, categories, research fields, platforms, pricing and open-source alternatives.

## Open data

- [tools.json](https://tools.kausalflow.com/tools.json): the whole directory as JSON
- [RSS](https://tools.kausalflow.com/index.xml)
- [llms.txt](https://tools.kausalflow.com/llms.txt) and [llms-full.txt](https://tools.kausalflow.com/llms-full.txt)
- A Markdown version of every tool page at `/tools/<slug>/index.md`
- [AI access](https://tools.kausalflow.com/ai/): how assistants can use the directory, including the MCP server in [`workers/mcp`](workers/mcp)

## Add a tool

Use the [submission form](https://tools.kausalflow.com/submit/) (no GitHub account needed) or the [GitHub issue form](https://github.com/kausalflow/tools/issues/new?template=new-tool.yml).
See [CONTRIBUTING.md](CONTRIBUTING.md) for what happens next and how to change the site itself.

## Repository layout

| Path | What it is |
| --- | --- |
| `content/tools/` | One Markdown file per tool (the data) |
| `layouts/`, `themes/`, `assets/`, `static/` | Hugo site |
| `scripts/triage/` | Checks that turn submissions into pull requests |
| `workers/submit/`, `workers/mcp/` | Cloudflare Workers for the form and the MCP server |
| `docs/` | How submissions, previews, hosting and AI integration work |

Build locally with [Hugo](https://gohugo.io/) (extended): `hugo server`.

## Licence

Code is [MIT](LICENSE). Directory content is [CC BY-SA 4.0](LICENSE-CONTENT): use the source and keep the source open. Themes under `themes/` keep their own licences.
