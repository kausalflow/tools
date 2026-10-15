#!/usr/bin/env python3
"""One-off migration: normalise tool front matter to taxonomy.yaml.

Maps old terms to canonical ones, strips stray whitespace and trailing commas,
drops empty values and the legacy _id key, and fills missing fields/platforms
with neutral defaults. Idempotent. Usage:

  migrate_taxonomy.py [--write] [FILE ...]     (dry run unless --write)
"""
import re
import sys
from pathlib import Path

import yaml

import kftools as kf

KEY_ORDER = ["author", "title", "summary", "images", "features", "categories", "tags",
             "platforms", "fields", "links", "plans", "makers", "date", "draft"]
DEFAULTS = {"fields": "General and Interdisciplinary", "platforms": "Any"}
DROP_KEYS = {"_id"}


def clean_list(value):
    if value is None:
        return []
    if isinstance(value, str):
        value = value.split(",")
    out = []
    for v in value:
        s = " ".join(str(v).replace("\t", " ").split()).strip(" ,")
        if s:
            out.append(s)
    return out


def canon_list(kind, values, report):
    out = []
    for v in clean_list(values):
        c = kf.canonical(kind, v)
        if c is None:
            if kind == "tags":  # tags are open-ended: keep, with whitespace fixed
                c = v
            else:
                report.append(f"dropped {kind[:-1]} {v!r}")
                continue
        if c != v:
            report.append(f"{kind[:-1]} {v!r} -> {c!r}")
        if c not in out:
            out.append(c)
    return out


def split_file(text):
    m = re.match(r"^---[ \t]*\n(.*?)\n---[ \t]*(\n|$)(.*)$", text, re.S)
    if not m:
        raise ValueError("no front matter")
    return m.group(1), m.group(3)


def migrate(path):
    text = Path(path).read_text(encoding="utf-8")
    head, body = split_file(text)
    head = head.replace("\t", "  ")  # tabs are invalid YAML indentation
    fm = yaml.safe_load(head) or {}
    report = []
    for k in DROP_KEYS & fm.keys():
        del fm[k]
        report.append(f"removed {k}")
    for kind in ("categories", "tags", "platforms", "fields"):
        if kind in fm or kind in DEFAULTS:
            new = canon_list(kind, fm.get(kind), report)
            if not new and kind in DEFAULTS:
                new = [DEFAULTS[kind]]
                report.append(f"{kind} empty -> {new[0]!r}")
            if new:
                fm[kind] = new
            else:
                fm.pop(kind, None)
    if isinstance(fm.get("images"), list):
        imgs = [i for i in fm["images"] if isinstance(i, dict) and i.get("path")]
        if len(imgs) != len(fm["images"]):
            report.append("removed empty image entries")
        if imgs:
            fm["images"] = imgs
        else:
            fm.pop("images", None)
    if isinstance(fm.get("features"), list):
        feats = [" ".join(str(x).split()) for x in fm["features"] if x and str(x).strip()]
        if len(feats) != len(fm["features"]):
            report.append("removed empty features")
        if feats:
            fm["features"] = feats
        else:
            fm.pop("features", None)
    if isinstance(fm.get("links"), list):
        for link in fm["links"]:
            u = link.get("link") if isinstance(link, dict) else None
            if isinstance(u, str) and u and "://" not in u and "." in u.split("/")[0]:
                link["link"] = "https://" + u
                report.append(f"link {u!r} -> https")
    if "title" in fm:
        fm["title"] = " ".join(str(fm["title"]).split())
    ordered = {k: fm[k] for k in KEY_ORDER if k in fm}
    ordered.update({k: v for k, v in fm.items() if k not in ordered})
    dumped = yaml.safe_dump(ordered, sort_keys=False, allow_unicode=True, width=100000)
    return "---\n" + dumped + "---\n" + body, report


def main(argv):
    write = "--write" in argv
    files = [Path(a) for a in argv if not a.startswith("--")] or sorted(
        f for f in kf.TOOLS_DIR.glob("*.md") if not f.name.startswith("_"))
    changed = 0
    for f in files:
        try:
            new, report = migrate(f)
        except Exception as e:
            print(f"SKIP {f.name}: {e}")
            continue
        if report:
            changed += 1
            print(f"{f.name}: " + "; ".join(report))
        if write and new != f.read_text(encoding="utf-8"):
            f.write_text(new, encoding="utf-8")
    print(f"{len(files)} files, {changed} with semantic changes" + ("" if write else " (dry run)"))


if __name__ == "__main__":
    main(sys.argv[1:])
