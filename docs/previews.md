# Pull request previews

Every pull request that changes the site (including the ones the triage bot opens for submissions) is built and
published to Cloudflare Pages, so a maintainer can see exactly what a submission will look like:

```
https://pr-<number>.kausalflow-tools-preview.pages.dev/
```

- Previews send `X-Robots-Tag: noindex, nofollow` and serve `Disallow: /` in `robots.txt`: no SEO or GEO impact.
- Unlimited and free on Cloudflare Pages (no credits). Forks never get a preview, because they never get secrets.
- The link is posted (and updated) as a comment on the pull request.
- Triage PRs do not trigger workflows themselves, so `scripts/triage/publish.sh` starts `preview.yml` with `workflow_dispatch`.

## One-time setup

The Pages project already exists on the leima137 account (`kausalflow-tools-preview`). The workflow needs two secrets:

1. Cloudflare dashboard > My Profile > API Tokens > Create Token > custom:
   *Account / Cloudflare Pages / Edit*, scoped to the leima137 account.
2. Store them (the account ID is `39338f3bb87cbf5b7f50b6e62e0e130f`):
   ```bash
   gh secret set CLOUDFLARE_API_TOKEN       # paste the token
   gh secret set CLOUDFLARE_ACCOUNT_ID --body 39338f3bb87cbf5b7f50b6e62e0e130f
   ```

Until the secrets exist the workflow exits early with a message and does nothing.

## Manual preview

```bash
hugo --baseURL https://pr-123.kausalflow-tools-preview.pages.dev/ -d /tmp/pv
printf '/*\n  X-Robots-Tag: noindex, nofollow\n' > /tmp/pv/_headers
CLOUDFLARE_ACCOUNT_ID=39338f3bb87cbf5b7f50b6e62e0e130f npx wrangler pages deploy /tmp/pv --project-name kausalflow-tools-preview --branch pr-123
```
