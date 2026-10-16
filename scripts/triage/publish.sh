#!/usr/bin/env bash
# Publish triage results: a PR per ready/needs-info entry, an issue per rejection.
# Usage: publish.sh TRIAGE_OUT_DIR   (run from the repository root, needs gh and jq)
set -euo pipefail

out="${1:?usage: publish.sh DIR}"
base="$(git rev-parse --abbrev-ref HEAD)"
git config user.name "github-actions[bot]"
git config user.email "41898282+github-actions[bot]@users.noreply.github.com"

for dir in "$out"/*/; do
  [ -f "$dir/verdict.json" ] || continue
  id="$(jq -r .id "$dir/verdict.json")"
  verdict="$(jq -r .verdict "$dir/verdict.json")"
  # the name is untrusted text: keep one line, cap the length
  name="$(jq -r '.name // "unnamed"' "$dir/verdict.json" | tr -d '\r\n' | cut -c1-80)"

  # set when the submission arrived as an issue (Cloudflare form or GitHub issue form)
  issue="${ISSUE_NUMBER:-}"

  if [ "$verdict" = "reject" ]; then
    if [ -n "$issue" ]; then
      gh issue comment "$issue" --body-file "$dir/report.md"
      gh issue edit "$issue" --add-label triage --add-label triage-reject
      gh issue close "$issue" --reason "not planned"
    else
      gh issue create --title "Triage: reject ${name}" \
        --body-file "$dir/report.md" --label triage --label triage-reject
    fi
    continue
  fi

  branch="submission/${id}"
  git checkout -q -B "$branch" "$base"
  cp -R "$dir/tree/." .
  git add content static
  git commit -q -m "Add ${name}"
  git push -q --force origin "$branch"

  flags=()
  [ "$verdict" = "needs-info" ] && flags+=(--draft)
  body="$dir/pr-body.md"
  cp "$dir/report.md" "$body"
  [ -n "$issue" ] && printf '\n\nCloses #%s\n' "$issue" >> "$body"
  url="$(gh pr create --base "$base" --head "$branch" \
    --title "Add ${name}" --body-file "$body" \
    --label triage --label "$verdict" "${flags[@]}")"
  # PRs opened with the workflow token do not start other workflows, so ask for the preview explicitly
  prnum="${url##*/}"
  gh workflow run preview.yml --ref "$base" -f pr="$prnum" || echo "preview not started"
  if [ -n "$issue" ]; then
    gh issue edit "$issue" --add-label triage
    gh issue comment "$issue" --body "Triage result: **${verdict}**. Review: ${url} (a preview link is posted there in a few minutes)"
  fi
  git checkout -q "$base"
done
