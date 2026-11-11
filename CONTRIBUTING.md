# Contributing

Thanks for helping researchers find good tools.

## Suggest a tool

You don't need to write any code.

1. Fill in the [submission form](https://tools.kausalflow.com/submit/) or the [GitHub issue form](https://github.com/kausalflow/tools/issues/new?template=new-tool.yml).
2. A check runs automatically: the link must load, the tool must not already be listed, and the categories are matched to the site's taxonomy. It also takes a screenshot.
3. A pull request named "Add <tool>" is opened with a preview link, or the issue is closed with the reason.
4. A maintainer reviews and merges it, and the site updates.

The full flow is in [docs/submission-flow.md](docs/submission-flow.md).

### What gets accepted

- Tools that help with research work: reading, writing, data, code, collaboration, publishing, organising.
- Open-source and free tools are especially welcome. Paid tools are fine if they are genuinely useful to researchers.
- Pages made only for ranking or promotion are not accepted.

## Edit a tool or fix the data

Each tool is one file in [`content/tools/`](content/tools/). Open a pull request that changes it. Pull requests that touch `content/tools/` are validated against [`scripts/triage/taxonomy.yaml`](scripts/triage/taxonomy.yaml), and you can run the same check locally:

```bash
pip install -r scripts/triage/requirements.txt
python scripts/triage/validate_entries.py content/tools/<tool>.md
```

Found a dead link or wrong price? An issue is fine too.

## Change the site

- The site is built with [Hugo](https://gohugo.io/) (extended). Run `hugo server` to preview.
- The Workers in `workers/` deploy through `.github/workflows/deploy-workers.yml`. See [docs/ai-integration.md](docs/ai-integration.md) and [docs/anonymous-submissions.md](docs/anonymous-submissions.md).
- Keep pull requests small and describe what changed and why.

## Licence

By contributing you agree that tool content is licensed under [CC BY-SA 4.0](LICENSE-CONTENT) and code under [MIT](LICENSE).
