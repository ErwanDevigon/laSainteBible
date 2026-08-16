#!/usr/bin/env python3
"""One-shot: texts/vulgate.json → data/evangiles/vulgate/*.json"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "texts" / "vulgate.json"
OUT = ROOT / "data" / "evangiles" / "vulgate"

META = {
    40: {"id": "matthieu", "title": "Évangile selon saint Matthieu", "short": "Mt"},
    41: {"id": "marc", "title": "Évangile selon saint Marc", "short": "Mc"},
    42: {"id": "luc", "title": "Évangile selon saint Luc", "short": "Lc"},
    43: {"id": "jean", "title": "Évangile selon saint Jean", "short": "Jn"},
}


def clean(t: str) -> str:
    t = (t or "").replace("\u2009", " ").replace("\u00a0", " ")
    return re.sub(r"[ \t]+", " ", t).strip()


def main() -> int:
    if not SRC.is_file():
        print(f"Missing {SRC}", file=sys.stderr)
        return 1
    raw = json.loads(SRC.read_text(encoding="utf-8"))
    by_nr = {b["nr"]: b for b in raw["books"]}
    OUT.mkdir(parents=True, exist_ok=True)
    for nr, meta in META.items():
        book_raw = by_nr[nr]
        chapters = []
        for ch in book_raw["chapters"]:
            verses = [
                {"n": int(v["verse"]), "t": clean(v["text"])} for v in ch["verses"]
            ]
            chapters.append({"n": int(ch["chapter"]), "verses": verses})
        book = {
            "id": meta["id"],
            "title": meta["title"],
            "short": meta["short"],
            "version": {
                "id": "vulgate",
                "label": "Vulgate",
                "license": "public-domain",
                "source": "Vulgata Clementina",
                "abbreviation": "vulgate",
            },
            "chapters": chapters,
        }
        dest = OUT / f"{meta['id']}.json"
        dest.write_text(
            json.dumps(book, ensure_ascii=False, separators=(",", ":")),
            encoding="utf-8",
        )
        n_v = sum(len(c["verses"]) for c in chapters)
        print(f"{meta['id']}: {len(chapters)} chapters, {n_v} verses → {dest}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
