# Submission and review flow

> Hosting on Cloudflare Pages replaces the Netlify form with `/api/submit`; see
> [hosting-cloudflare.md](hosting-cloudflare.md). The checks below are unchanged.

```
visitor -> /submit/ (Netlify form) -> Netlify submissions
        -> triage.yml (hourly, or run manually)
              scripts/triage/triage.py: normalise, check, screenshot, screen
        -> PR "Add <tool>" (label ready, or draft + needs-info)   or   issue (triage-reject)
        -> maintainer reviews the PR -> merge -> Netlify deploys
```

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
2. Repo secret `NETLIFY_AUTH_TOKEN`: a Netlify personal access token (User settings > Applications).
3. Optional repo variable `NETLIFY_SITE_ID` (Netlify site settings > Site ID), to scope the form lookup.
4. Optional repo secret `ANTHROPIC_API_KEY` for the relevance screen. Without it the screen is skipped.
5. In Netlify, turn off the old form notification that opens a GitHub issue for each submission
   (Forms > Form notifications), otherwise every submission also creates a lossy `todo` issue.
6. Run the workflow once with **Run workflow** to process what is waiting. `limit` caps a run at 10 by default.

## Running locally

```bash
pip install -r scripts/triage/requirements.txt
python scripts/triage/triage.py --csv ~/Downloads/kausalflow-tools-submission.csv --out triage-out --limit 5
python scripts/triage/validate_entries.py content/tools/some-tool.md
```

Each result is written to `triage-out/<id>/` as `verdict.json`, `report.md` and `tree/` (the files that would be committed).

## Changing the rules

- Allowed categories, fields, platforms, tags and synonyms: `scripts/triage/taxonomy.yaml`.
- Relevance criteria: `LLM_PROMPT` in `scripts/triage/triage.py`.
- Submissions are untrusted: text is only written through a YAML dumper and shown to the model as data.
