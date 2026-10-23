#!/usr/bin/env python3
"""Fill days missing from mdj-archive.json when the next ordo PDF is not out.

Order, best source first. Only verse references are kept.
eglise.catholique.fr is the one that prints the date and the refs in HTML.
The other three are kept next; a page without that pair is skipped.

    python3 scripts/fetch-messe-fallback.py
    python3 scripts/fetch-messe-fallback.py --days 14
"""

from __future__ import annotations

import argparse
import json
import re
import urllib.request
from datetime import date, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "data" / "lectures" / "mdj-archive.json"

SOURCES = [
    "https://eglise.catholique.fr/textes-du-jour/",
    "https://www.prionseneglise.fr/textes-du-jour",
    "https://www.paxcoeur.com/messe-du-jour/",
    "https://missel.online",
]

REF_RE = re.compile(
    r"\((?:Ps\s*)?\d|^(?:Ps\s+)?(?:[1-3]\s*)?[A-ZÉÈa-zà-ÿ]{1,6}\.?\s+\d",
)
HEAD_RE = re.compile(
    r"(Première lecture|Deuxième lecture|Psaume|Évangile|Evangile)\s*(?:[:\u00a0]|(\())",
    re.I,
)


def fetch(url: str) -> str:
    req = urllib.request.Request(url, headers={"User-Agent": "laSainteBible", "Accept": "text/html"})
    with urllib.request.urlopen(req, timeout=40) as res:
        return res.read().decode("utf-8", "replace")


def last_ref(chunk: str) -> str:
    parts = re.findall(r"\(([^()]*(?:\([^()]*\)[^()]*)*)\)", chunk)
    for part in reversed(parts):
        ref = re.sub(r"\s+", " ", part).replace("\u00a0", " ").strip()
        if REF_RE.search(ref):
            if re.match(r"^\d+\s*\(", ref) or ref.lower().startswith("ps"):
                if not ref.lower().startswith("ps"):
                    ref = f"Ps {ref}"
            return ref
    return ""


def kind_of(label: str) -> str:
    low = label.lower()
    if "évangile" in low or "evangile" in low:
        return "evangile"
    if "psaume" in low:
        return "psaume"
    if "deuxième" in low or "deuxieme" in low:
        return "lecture_2"
    return "lecture_1"


def parse_page(html: str) -> dict | None:
    stamp = re.search(r'datetime="(\d{4}-\d{2}-\d{2})"', html)
    if not stamp:
        return None
    text = re.sub(r"<script[\s\S]*?</script>", " ", html, flags=re.I)
    text = re.sub(r"<[^>]+>", "\n", text)
    text = text.replace("&#039;", "'").replace("&nbsp;", " ").replace("\u00a0", " ")
    refs = []
    lines = [ln.strip() for ln in text.splitlines() if ln.strip()]
    for i, line in enumerate(lines):
        head = HEAD_RE.search(line)
        if not head:
            continue
        chunk = line
        if i + 1 < len(lines) and not HEAD_RE.search(lines[i + 1]):
            chunk = f"{line} {lines[i + 1]}"
        ref = last_ref(chunk)
        if not ref:
            continue
        kind = kind_of(head.group(1))
        if kind == "psaume" and not ref.lower().startswith("ps"):
            ref = f"Ps {ref}"
        refs.append([kind, ref])
    if not any(item[0] == "evangile" for item in refs):
        return None
    # One row per kind: the page repeats headings.
    kept = []
    seen = set()
    for item in refs:
        if item[0] in seen:
            continue
        seen.add(item[0])
        kept.append(item)
    return {"d": stamp.group(1), "t": "", "r": kept}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--days", type=int, default=21)
    args = parser.parse_args()
    previous = json.loads(OUT.read_text(encoding="utf-8")) if OUT.is_file() else {"days": []}
    have = {row["d"]: row for row in previous.get("days") or [] if isinstance(row, dict) and row.get("d")}
    start = date.today()
    missing = {
        (start + timedelta(days=i)).isoformat()
        for i in range(max(1, args.days))
    } - set(have)
    if not missing:
        print("aucun jour manquant dans la fenêtre")
        return 0
    added = 0
    for url in SOURCES:
        if not missing:
            break
        try:
            page = parse_page(fetch(url))
        except Exception as err:
            print(f"{url}  fail  {err}")
            continue
        if not page:
            print(f"{url}  pas de date et de références")
            continue
        if page["d"] not in missing:
            print(f"{url}  {page['d']} déjà en stock")
            continue
        have[page["d"]] = page
        missing.discard(page["d"])
        added += 1
        print(f"{page['d']}  {len(page['r'])} refs  ← {url}")
    days = [have[k] for k in sorted(have)]
    OUT.write_text(
        json.dumps({"zone": "romain", "days": days}, ensure_ascii=False, indent=1) + "\n",
        encoding="utf-8",
    )
    if missing:
        print("encore sans source : " + ", ".join(sorted(missing)[:8]) + ("…" if len(missing) > 8 else ""))
    print(f"{added} ajoutés, {len(days)} jours")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
