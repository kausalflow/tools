# Hosting on GitHub Pages (default)

No third-party accounts, tokens or secrets: GitHub Actions builds the Hugo site and GitHub Pages serves it.

## How it fits together

```
push to master --> .github/workflows/pages.yml --> GitHub Pages --> tools.kausalflow.com
/submit/ form  --> GitHub "new issue" page, prefilled (.github/ISSUE_TEMPLATE/new-tool.yml)
               --> triage-issue.yml --> PR for review, or the issue is closed with a reason
```

- Renamed categories and tags redirect through Hugo `aliases` on the term pages (`content/categories`, `content/tags`).
- `static/CNAME` holds the custom domain.
- Submitters need a free GitHub account. To accept anonymous submissions, switch `params.submit_mode`
  to `function` and follow [hosting-cloudflare.md](hosting-cloudflare.md).

## One-time setup

```bash
# enable Pages with the Actions source (after the PR is merged)
gh api -X POST repos/kausalflow/tools/pages -f build_type=workflow
# run the first deploy
gh workflow run pages.yml
```

Then point DNS for `tools.kausalflow.com` at GitHub: a `CNAME` record to `kausalflow.github.io`.
Once the domain verifies, tick "Enforce HTTPS" under Settings > Pages (or
`gh api -X PUT repos/kausalflow/tools/pages -F https_enforced=true`).

## Cutover checklist

1. Merge, enable Pages, run the deploy, and check `https://kausalflow.github.io/tools/`-style preview or the custom domain once DNS moves.
2. Change the DNS record. Leave Netlify running until the domain serves from GitHub.
3. Then delete: the Netlify site, `netlify.toml`, `.github/workflows/triage.yml`, the `--netlify` source in `scripts/triage/triage.py`, and the `NETLIFY_*` secrets.

## Limits to know

- No per-PR preview URLs. Check changes locally with `hugo server`, or add a preview action later.
- No server-side redirects or headers. Redirects use `aliases` (HTML meta refresh).
