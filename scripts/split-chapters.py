#!/usr/bin/env python3
"""Split each book JSON into one file per chapter.

The reader keeps data/livres/{edition}/{book}.json.
Mass and citation cards fetch data/chapitres/{edition}/{book}/{n}.json.
Qumran manuscripts: data/chapitres/qumran/{scroll}/{book}/{n}.json.
"""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "data" / "livres"
DST = ROOT / "data" / "chapitres"
SKIP = {"index.json", "catalog.json"}


def emit(book_path: Path, dest: Path) -> int:
    try:
        data = json.loads(book_path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        print(f"skip {book_path}")
        return 0
    chapters = data.get("chapters") if isinstance(data, dict) else None
    if not isinstance(chapters, list):
        return 0
    dest.mkdir(parents=True, exist_ok=True)
    seen: set[str] = set()
    written = 0
    for ch in chapters:
        if not isinstance(ch, dict) or "n" not in ch:
            continue
        name = f"{ch['n']}.json"
        seen.add(name)
        dest.joinpath(name).write_text(
            json.dumps(ch, ensure_ascii=False, separators=(",", ":")) + "\n",
            encoding="utf-8",
        )
        written += 1
    for old in dest.glob("*.json"):
        if old.name not in seen:
            old.unlink()
    return written


def main() -> int:
    if not SRC.is_dir():
        print(f"missing {SRC}")
        return 1
    books = 0
    chapters = 0
    for edition in sorted(p for p in SRC.iterdir() if p.is_dir()):
        if edition.name == "qumran":
            mss = edition / "mss"
            if not mss.is_dir():
                continue
            for scroll in sorted(p for p in mss.iterdir() if p.is_dir()):
                for book in sorted(scroll.glob("*.json")):
                    n = emit(book, DST / "qumran" / scroll.name / book.stem)
                    if n:
                        books += 1
                        chapters += n
            continue
        for book in sorted(edition.glob("*.json")):
            if book.name in SKIP:
                continue
            n = emit(book, DST / edition.name / book.stem)
            if n:
                books += 1
                chapters += n
    print(f"chapitres  {books} livres  {chapters} chapitres → {DST}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
