#!/usr/bin/env python3
"""data/livres/*/index.json → data/coverage.json.

One small file so the reader does not fetch every version index
to learn which edition contains a book. malachiCh4 mirrors the
runtime test: chapter 4 verse 1 exists and chapter 3 verse 19 does not.
"""

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BOOKS_JS = ROOT / "js" / "books.js"
OUT = ROOT / "data" / "coverage.json"
LIVRES = ROOT / "data" / "livres"


def version_ids():
    text = BOOKS_JS.read_text(encoding="utf-8")
    ver = text.split("export const VERSIONS", 1)[1]
    return re.findall(r'\n  "([a-z0-9-]+)": \{', ver)


def malachi_ch4(path: Path) -> bool:
    book = json.loads(path.read_text(encoding="utf-8"))
    chapters = {}
    for ch in book.get("chapters") or []:
        chapters[ch.get("n")] = {v.get("n") for v in ch.get("verses") or []}
    return 4 in chapters and 1 in chapters[4] and 19 not in chapters.get(3, set())


def main() -> int:
    versions = []
    books = {}
    ch4 = []
    for vid in version_ids():
        folder = LIVRES / vid
        index_path = folder / "index.json"
        if not index_path.is_file():
            continue
        versions.append(vid)
        index = json.loads(index_path.read_text(encoding="utf-8"))
        for book in index.get("books") or []:
            bid = book.get("id")
            if bid:
                books.setdefault(bid, []).append(vid)
        malachi = folder / "malachie.json"
        if malachi.is_file() and malachi_ch4(malachi):
            ch4.append(vid)
    payload = {"versions": versions, "malachiCh4": ch4, "books": books}
    OUT.write_text(
        json.dumps(payload, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )
    print(f"data/coverage.json → {len(versions)} versions, {len(books)} livres, malachi ch.4: {', '.join(ch4) or '—'}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
