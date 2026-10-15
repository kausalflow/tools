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

  if [ "$verdict" = "reject" ]; then
    gh issue create --title "Triage: reject ${name}" \
      --body-file "$dir/report.md" --label triage --label triage-reject
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
  gh pr create --base "$base" --head "$branch" \
    --title "Add ${name}" --body-file "$dir/report.md" \
    --label triage --label "$verdict" "${flags[@]}"
  git checkout -q "$base"
done
