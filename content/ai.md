---
title: "Use the Directory with AI Assistants"
description: "Connect Claude, ChatGPT, Cursor, VS Code and other AI assistants to the Tools for Academic Research directory through MCP, llms.txt and open JSON data."
date: 2026-10-24
draft: false
---

Ask your AI assistant "which free tools can annotate PDFs on Linux?" and let it answer from this directory,
with links to each tool's page. The directory runs a public [MCP](https://modelcontextprotocol.io) server
that any MCP-capable assistant can connect to. No account or key is needed.

```text
{{< mcp-url >}}
```

The server has four read-only tools:

- **search** finds tools for a task described in plain words, filtered by price, open source, platform, field or category.
- **alternatives** finds replacements for a product you name, such as EndNote or Grammarly, with open-source and free ones first.
- **fetch** returns one tool's details: features, links, price, licence, platforms and whether its site still responds.
- **list_filters** lists the categories, fields, platforms, tags and price models in use.

Every tool records whether it is free, has a free plan, or is paid, and whether it is open source.
Its link is checked every week, so assistants can skip tools that have shut down.

## Claude

In [claude.ai](https://claude.ai) or the Claude apps, open **Settings → Connectors**, choose
**Add custom connector**, give it a name such as *Research Tools*, and paste the URL above.
Then turn it on for a chat from the tools menu.

In [Claude Code](https://docs.claude.com/en/docs/claude-code):

```sh
claude mcp add --transport http kausalflow-tools {{< mcp-url >}}
```

## ChatGPT

With developer mode on (**Settings → Apps & Connectors → Advanced**), create a connector, paste the URL above
and choose no authentication. The `search` and `fetch` tools follow the format ChatGPT uses for
connectors and deep research. Availability depends on your ChatGPT plan.

## Cursor and VS Code

{{< mcp-install >}}

Or add it by hand. Cursor, in `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "kausalflow-tools": { "url": "{{< mcp-url >}}" }
  }
}
```

VS Code, in `.vscode/mcp.json`:

```json
{
  "servers": {
    "kausalflow-tools": { "type": "http", "url": "{{< mcp-url >}}" }
  }
}
```

## Other assistants and your own code

Any client that speaks MCP over Streamable HTTP can use the URL above. Without MCP, these files work too:

- [llms.txt](/llms.txt) is a short index of every tool, grouped by category.
- [llms-full.txt](/llms-full.txt) has every tool in full, in one Markdown file, to paste into a chat or a project.
- Every tool page has a Markdown copy: add `index.md` to its address, for example [/tools/zotero/index.md](/tools/zotero/index.md).
- [tools.json](/tools.json) is the whole directory as JSON.

All content is licensed [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). Please link back to the tool pages when you reuse it.
Missing a tool? [Submit it](/submit/).
