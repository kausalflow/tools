# Hosting on Cloudflare Pages (optional)

The default is GitHub Pages ([hosting-github-pages.md](hosting-github-pages.md)). Use Cloudflare only if you want
anonymous submissions through `/api/submit` or per-PR preview URLs. Set `params.submit_mode: function` in `config.yaml`.

The site is static Hugo output. Cloudflare Pages builds it, serves it, and runs the one
function that receives submissions (`functions/api/submit.js`). Netlify is not required.

## Pages project

| Setting | Value |
| --- | --- |
| Repository | `kausalflow/tools`, production branch `master` |
| Build command | `hugo --gc --minify` |
| Build output directory | `public` |
| Environment variable `HUGO_VERSION` | `0.135.0` |
| Functions | `functions/` is detected automatically |
| Preview deployments | all branches, or only pull requests (Settings > Builds) |

`static/_redirects` carries the redirects for renamed categories and tags. `wrangler.toml` pins the output directory.

## Submission form

```
/submit/  --POST-->  /api/submit (Pages Function)
                      validates, checks Turnstile, opens a GitHub issue labelled `submission`
                      --> .github/workflows/triage-issue.yml --> PR or closed issue
```

Variables and secrets (Pages project > Settings > Variables and secrets, production and preview):

| Name | Type | Notes |
| --- | --- | --- |
| `GITHUB_TOKEN` | secret | Fine-grained personal access token: this repository only, permission *Issues: read and write*. Nothing else. |
| `GITHUB_REPO` | variable | Optional, default `kausalflow/tools`. |
| `TURNSTILE_SECRET` | secret | Turnstile widget secret. Without it the captcha check is skipped (the honeypot still applies). |

Turnstile: Cloudflare dashboard > Turnstile > add a widget for the site domain. Put the **site key**
(public) in `params.turnstile_sitekey` in `config.yaml`. The secret goes in `TURNSTILE_SECRET`.

GitHub repository: Settings > Actions > General must allow Actions to create pull requests
(already needed by the triage workflows). `ANTHROPIC_API_KEY` stays optional.

## Cutover checklist

1. Create the Pages project and add the variables above. Check the preview URL: browse, search, submit a test tool (a test issue and PR appear; close them).
2. In Cloudflare, add the custom domain `tools.kausalflow.com`. If DNS is already on Cloudflare this is one click; otherwise change the CNAME at your DNS provider.
3. After it works, delete the Netlify site and these files: `netlify.toml`, `.github/workflows/triage.yml`, and the `--netlify` source in `scripts/triage/triage.py` (and the `NETLIFY_*` secrets).
4. Turn off the Netlify form notification and delete the Netlify token.

## Local development

```bash
hugo server                      # site
npx wrangler pages dev public    # after `hugo`, serves the function on /api/submit
```

Put `GITHUB_TOKEN=...` in `.dev.vars` (gitignored) to test issue creation against a throwaway repository.
