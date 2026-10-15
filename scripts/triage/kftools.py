"""Shared helpers: taxonomy, entry parsing, validation and duplicate detection."""
import re
import unicodedata
from pathlib import Path
from urllib.parse import urlparse

import yaml

ROOT = Path(__file__).resolve().parents[2]
TOOLS_DIR = ROOT / "content" / "tools"
TAXONOMY = yaml.safe_load((Path(__file__).parent / "taxonomy.yaml").read_text())

REQUIRED = ["title", "summary", "links", "categories", "fields", "platforms", "date"]


def slugify(text):
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode()
    text = re.sub(r"[^a-zA-Z0-9]+", "-", text).strip("-").lower()
    return text or "tool"


def canonical(kind, value):
    """Return the canonical term for value, or None when it is unknown."""
    v = " ".join(str(value).split())
    if not v:
        return None
    allowed = TAXONOMY[kind]
    by_lower = {a.lower(): a for a in allowed}
    if v.lower() in by_lower:
        return by_lower[v.lower()]
    return TAXONOMY["synonyms"].get(kind, {}).get(v.lower())


def normalize_url(url):
    """host + path without scheme, www, query, fragment or trailing slash."""
    try:
        p = urlparse(url.strip())
    except ValueError:
        return ""
    host = (p.hostname or "").lower()
    host = host[4:] if host.startswith("www.") else host
    path = p.path.rstrip("/")
    return host + path


def host_of(url):
    n = normalize_url(url)
    return n.split("/")[0]


def read_front_matter(path):
    text = Path(path).read_text(encoding="utf-8")
    m = re.match(r"^---\s*\n(.*?)\n---\s*(\n|$)", text, re.S)
    if not m:
        raise ValueError("no front matter")
    data = yaml.safe_load(m.group(1)) or {}
    if not isinstance(data, dict):
        raise ValueError("front matter is not a mapping")
    return data


def existing_entries(exclude=None):
    """Map normalized url -> file name, and the set of slugs, for the current directory."""
    urls, slugs = {}, set()
    for f in TOOLS_DIR.glob("*.md"):
        if f.name.startswith("_") or (exclude and f.name == exclude):
            continue
        slugs.add(f.stem.lower())
        try:
            fm = read_front_matter(f)
        except Exception:
            continue
        for link in fm.get("links") or []:
            if isinstance(link, dict) and link.get("link"):
                urls.setdefault(normalize_url(str(link["link"])), f.name)
    return urls, slugs


def validate_entry(fm):
    """Return a list of problem strings for a new entry's front matter."""
    problems = []
    for key in REQUIRED:
        if not fm.get(key):
            problems.append(f"missing required field: {key}")
    summary = str(fm.get("summary") or "")
    lim = TAXONOMY["limits"]
    if summary and len(summary) < lim["summary_min"]:
        problems.append(f"summary is too short (min {lim['summary_min']} characters)")
    if len(summary) > lim["summary_max"]:
        problems.append(f"summary is too long (max {lim['summary_max']} characters)")
    for kind in ("categories", "fields", "platforms"):
        for v in fm.get(kind) or []:
            if canonical(kind, v) != v:
                problems.append(f"{kind[:-1] if kind != 'fields' else 'field'} not in the allowed list: {v}")
    for link in fm.get("links") or []:
        url = link.get("link") if isinstance(link, dict) else None
        if not url or urlparse(str(url)).scheme not in ("http", "https"):
            problems.append(f"link is not an http(s) URL: {url}")
    if len(fm.get("features") or []) > lim["features_max"]:
        problems.append("too many features")
    for img in fm.get("images") or []:
        if not isinstance(img, dict) or not img.get("path"):
            problems.append("images must be a list of {path: file name}")
    return problems
