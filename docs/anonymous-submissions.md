# Anonymous submissions

GitHub only accepts issues from signed-in callers, so an anonymous form needs one small server-side piece:
a Cloudflare Worker (`workers/submit`). The site itself stays on GitHub Pages. The worker is free
(Workers free plan) and holds one secret.

```
/submit/ form --POST--> worker (validates, honeypot, speed check, origin check, optional Turnstile)
                         --> GitHub issue labelled `submission`
                         --> triage-issue.yml --> PR for review, or issue closed
```

Until `params.submit_url` is set in `config.yaml`, the form falls back to opening a prefilled GitHub issue.

## One-time setup (about 5 minutes)

1. **Token.** GitHub > Settings > Developer settings > Fine-grained tokens > new token:
   resource owner `kausalflow`, repository `kausalflow/tools` only, permission *Issues: Read and write*, nothing else.
2. **Deploy the worker** (the first command opens a browser to log in to Cloudflare):
   ```bash
   cd workers/submit
   npx wrangler login
   npx wrangler secret put GITHUB_TOKEN      # paste the token
   npx wrangler deploy                       # prints https://kausalflow-tools-submit.<account>.workers.dev
   ```
3. **Point the site at it:** set `submit_url` in `config.yaml` to that URL and merge. Done.

Optional hardening: create a Turnstile widget, `npx wrangler secret put TURNSTILE_SECRET`, and set
`params.turnstile_sitekey`. Without it the honeypot, a 3 second minimum fill time and the origin check apply,
and triage rejects junk automatically.

## Auto-deploy (optional)

`.github/workflows/deploy-workers.yml` redeploys the workers when `workers/**` changes. It needs a
repository secret `CLOUDFLARE_API_TOKEN` (Cloudflare > My Profile > API Tokens > "Edit Cloudflare Workers" template)
and a repository variable `CLOUDFLARE_ACCOUNT_ID` (Workers & Pages overview, right-hand column). Without the account ID,
wrangler fails with "Failed to automatically retrieve account IDs" unless the token can also read account memberships.
The MCP worker's Workers AI binding also needs the token to include **Workers AI: Read**.

## Local test

```bash
cd workers/submit && node test.mjs   # mocked fetch: validation, honeypot, origin, speed, Turnstile
```

## Limits

- No per-IP rate limit on the free plan beyond Cloudflare's own protection. If spam shows up, add
  Turnstile first, then a Rate Limiting rule on the worker route.
- A submitted issue is public. Submitters are told so on the form.
