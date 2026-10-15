#!/usr/bin/env python3
"""Validate tool entries against the schema and taxonomy.

Usage:
  validate_entries.py FILE [FILE ...]      validate those files
  validate_entries.py --changed BASE_REF   validate entries added or modified since BASE_REF

Exit status is 1 when any checked file has problems. Existing entries are only
checked when changed, so legacy values do not block unrelated PRs.
"""
import subprocess
import sys
from pathlib import Path

import kftools as kf


def git_names(base, filt):
    out = subprocess.run(
        ["git", "diff", "--name-only", f"--diff-filter={filt}", f"{base}...HEAD", "--", "content/tools"],
        cwd=kf.ROOT, capture_output=True, text=True, check=True,
    ).stdout.split()
    return [kf.ROOT / p for p in out if p.endswith(".md") and not Path(p).name.startswith("_")]


def main(argv):
    # Added files get the full rules; edited legacy files only the vocabulary and required fields.
    legacy = set()
    if len(argv) == 2 and argv[0] == "--changed":
        added = git_names(argv[1], "A")
        legacy = set(git_names(argv[1], "M"))
        files = added + sorted(legacy)
    else:
        files = [Path(a) for a in argv]
    failed = 0
    for f in files:
        try:
            fm = kf.read_front_matter(f)
            problems = kf.validate_entry(fm, strict=f not in legacy)
        except Exception as e:  # malformed YAML etc.
            problems = [f"cannot parse: {e}"]
        rel = f.relative_to(kf.ROOT) if f.is_absolute() and kf.ROOT in f.parents else f
        if problems:
            failed += 1
            for p in problems:
                print(f"::error file={rel}::{p}")
        else:
            print(f"ok  {rel}")
    print(f"{len(files)} checked, {failed} with problems")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
