#!/usr/bin/env python3
"""Check each tool's main link and keep a running status in data/linkcheck.json.

Usage: linkcheck.py [--previous URL_OR_FILE] [--out data/linkcheck.json]

Each entry is {status, code, checked, failing_since, failures}. A tool is "unreachable" only after
two checks in a row fail, so one bad day does not flag it. 401, 403 and 429 count as reachable:
many sites block automated requests but still work in a browser. The site build reads the file
(tool pages show a notice, tools.json carries the status) and publishes it at /linkcheck.json,
which the next run passes as --previous.
"""
import argparse
import datetime as dt
import json
import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import requests

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "triage"))
import kftools as kf  # noqa: E402

UA = "Mozilla/5.0 (compatible; KausalFlowToolsLinkCheck/1.0; +https://tools.kausalflow.com/about/)"
OK_CODES = {401, 403, 429}


def check(url):
    """Return the HTTP status code, or 0 when the site cannot be reached at all."""
    for method in ("HEAD", "GET"):
        try:
            r = requests.request(method, url, headers={"User-Agent": UA}, timeout=20, allow_redirects=True, stream=True)
            r.close()
            if method == "HEAD" and r.status_code >= 400:
                continue  # some servers reject HEAD, try GET
            return r.status_code
        except requests.RequestException:
            if method == "GET":
                return 0
    return 0


def load_previous(src):
    if not src:
        return {}
    try:
        if src.startswith("http"):
            r = requests.get(src, timeout=20)
            return r.json() if r.ok else {}
        return json.loads(Path(src).read_text())
    except (OSError, ValueError, requests.RequestException):
        return {}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--previous")
    ap.add_argument("--out", default=str(kf.ROOT / "data" / "linkcheck.json"))
    args = ap.parse_args()

    prev = load_previous(args.previous)
    targets = {}
    for f in sorted(kf.TOOLS_DIR.glob("*.md")):
        if f.name.startswith("_"):
            continue
        links = [l.get("link") for l in kf.read_front_matter(f).get("links") or [] if isinstance(l, dict) and l.get("link")]
        if links:
            targets[f.stem] = links[0]

    with ThreadPoolExecutor(16) as pool:
        codes = dict(zip(targets, pool.map(check, targets.values())))

    today = dt.date.today().isoformat()
    out = {}
    for slug, code in codes.items():
        before = prev.get(slug, {})
        ok = 200 <= code < 400 or code in OK_CODES
        failures = 0 if ok else before.get("failures", 0) + 1
        out[slug] = {
            "status": "ok" if ok else ("unreachable" if failures >= 2 else "failing"),
            "code": code,
            "checked": today,
            "failing_since": None if ok else before.get("failing_since") or today,
            "failures": failures,
        }

    Path(args.out).parent.mkdir(parents=True, exist_ok=True)
    Path(args.out).write_text(json.dumps(out, indent=1, sort_keys=True) + "\n")
    bad = {s: e for s, e in out.items() if e["status"] != "ok"}
    for s, e in sorted(bad.items()):
        print(f"{e['status']:12} {e['code']:3} {s} {targets[s]}")
    print(f"{len(out)} checked, {len(bad)} failing or unreachable")


if __name__ == "__main__":
    main()
