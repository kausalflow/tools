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
- Without more setup, submitters need a free GitHub account. For anonymous submissions deploy the small
  worker in `workers/submit` (see [anonymous-submissions.md](anonymous-submissions.md)) and set `params.submit_url`.

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

## Netlify

Not used any more. If an old Netlify site still exists, unpublish or delete it so it is not indexed as a duplicate, and delete its access token.

## Limits to know

- Pull request previews come from Cloudflare Pages, see [previews.md](previews.md).
- No server-side redirects or headers. Redirects use `aliases` (HTML meta refresh).
