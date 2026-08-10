#!/usr/bin/env python3
"""One-shot converter: ls1910 getbible JSON → data/evangiles/*.json

Source files expected in ./ls1910/ (40=Matthieu … 43=Jean),
originally from https://api.getbible.net/v2/ls1910

Not used at runtime.
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "ls1910"
OUT = ROOT / "data" / "evangiles"

META = {
    40: {"id": "matthieu", "title": "Évangile selon saint Matthieu", "short": "Mt"},
    41: {"id": "marc", "title": "Évangile selon saint Marc", "short": "Mc"},
    42: {"id": "luc", "title": "Évangile selon saint Luc", "short": "Lc"},
    43: {"id": "jean", "title": "Évangile selon saint Jean", "short": "Jn"},
}


def clean(t: str) -> str:
    t = t.replace("\u2009", "").replace("\u00a0", " ")
    return re.sub(r"[ \t]+", " ", t).strip()


def main() -> int:
    if not SRC.is_dir():
        print(f"Missing source dir: {SRC}", file=sys.stderr)
        return 1
    OUT.mkdir(parents=True, exist_ok=True)

    for nr, meta in META.items():
        raw_path = SRC / f"{nr}.json"
        raw = json.loads(raw_path.read_text(encoding="utf-8"))
        chapters = []
        for ch in raw["chapters"]:
            verses = [
                {"n": int(v["verse"]), "t": clean(v["text"])}
                for v in ch["verses"]
            ]
            chapters.append({"n": int(ch["chapter"]), "verses": verses})
        out = {
            "id": meta["id"],
            "title": meta["title"],
            "short": meta["short"],
            "version": {
                "id": "segond-1910",
                "label": "Louis Segond 1910",
                "license": "public-domain",
                "source": "https://api.getbible.net/v2/ls1910",
                "abbreviation": raw.get("abbreviation", "ls1910"),
            },
            "chapters": chapters,
        }
        path = OUT / f"{meta['id']}.json"
        path.write_text(
            json.dumps(out, ensure_ascii=False, separators=(",", ":")),
            encoding="utf-8",
        )
        n_v = sum(len(c["verses"]) for c in chapters)
        print(f"{meta['id']}: {len(chapters)} chapters, {n_v} verses → {path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
