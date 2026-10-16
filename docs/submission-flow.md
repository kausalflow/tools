# Submission and review flow

```
visitor -> /submit/ form -> submit worker (workers/submit) -> GitHub issue labelled `submission`
        (or the GitHub issue form, prefilled)
        -> triage-issue.yml: scripts/triage/triage.py (checks, screenshot, relevance screen)
        -> PR "Add <tool>" (label ready, or draft + needs-info), with a preview link
           or: the issue is closed with the reason
        -> maintainer reviews -> merge -> pages.yml publishes
```

Setup: [anonymous-submissions.md](anonymous-submissions.md) (worker), [previews.md](previews.md) (PR previews),
[hosting-github-pages.md](hosting-github-pages.md) (site).

## What the triage step checks

| Check | Result when it fails |
| --- | --- |
| Name, summary (40+ characters) and http(s) link present | needs-info |
| Link loads (public hosts only, redirects re-checked) | needs-info |
| Same URL already listed | reject (duplicate) |
| Similar slug already exists | warning, slug gets a suffix |
| Categories, fields and platforms map to `scripts/triage/taxonomy.yaml` | unknown values dropped, defaults used, noted in the report |
| Relevance screen by Claude (optional, advisory) | reject if clearly not a fit, warning if unsure |

It also downloads the submitted image or takes a 1280x800 screenshot of the page.
Each PR body is the report, so the review is one page.

Pull requests that change `content/tools/` are validated by `validate.yml` against the same taxonomy.

## One-time setup

1. Repo **Settings > Actions > General**: allow GitHub Actions to create pull requests.
2. Optional repo secret `ANTHROPIC_API_KEY` (and variable `ANTHROPIC_WORKSPACE_ID` if the key is not workspace scoped) for the relevance screen. Without it the screen is skipped.
3. Worker and previews: see the two documents linked above.

## Running locally

```bash
pip install -r scripts/triage/requirements.txt
python scripts/triage/triage.py --csv submissions.csv --out triage-out --limit 5
python scripts/triage/validate_entries.py content/tools/some-tool.md
```

Each result is written to `triage-out/<id>/` as `verdict.json`, `report.md` and `tree/` (the files that would be committed).

## Changing the rules

- Allowed categories, fields, platforms, tags and synonyms: `scripts/triage/taxonomy.yaml`.
- Relevance criteria: `LLM_PROMPT` in `scripts/triage/triage.py`.
- Submissions are untrusted: text is only written through a YAML dumper and shown to the model as data.
