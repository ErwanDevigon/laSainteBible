#!/usr/bin/env python3
"""One-shot: Nestle 1904 OSIS XML → data/evangiles/septante/*.json

Source: https://github.com/biblicalhumanities/Nestle1904 (public domain)
Expect xml/01-matthew.xml … 04-john.xml in the given --src dir.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "data" / "evangiles" / "septante"

FILES = {
    "01-matthew.xml": ("matthieu", "Évangile selon saint Matthieu", "Mt"),
    "02-mark.xml": ("marc", "Évangile selon saint Marc", "Mc"),
    "03-luke.xml": ("luc", "Évangile selon saint Luc", "Lc"),
    "04-john.xml": ("jean", "Évangile selon saint Jean", "Jn"),
}


def verse_text(parts: list[tuple[str, str]]) -> str:
    out: list[str] = []
    for kind, t in parts:
        if not t:
            continue
        if kind == "pc":
            out.append(t)
            continue
        if out and out[-1] not in "([{«“‘":
            out.append(" ")
        out.append(t)
    text = "".join(out)
    text = re.sub(r"\s+", " ", text)
    text = re.sub(r" ([.,;:!?·])", r"\1", text)
    return text.strip()


def parse_book(path: Path) -> list[dict]:
    root = ET.fromstring(path.read_text(encoding="utf-8"))
    chapters: list[dict] = []
    for ch in root.iter("chapter"):
        osis = ch.get("osisId") or ch.get("osisID") or ""
        bits = osis.split(".")
        try:
            n = int(bits[-1])
        except ValueError:
            continue
        if n < 1 or n > 28:
            continue
        verses: list[dict] = []
        current_n: int | None = None
        parts: list[tuple[str, str]] = []
        for el in ch.iter():
            if el.tag == "milestone" and el.get("unit") == "verse":
                vid = el.get("id") or ""
                m = re.search(r"\.(\d+)$", vid)
                if not m:
                    continue
                if current_n is not None:
                    verses.append({"n": current_n, "t": verse_text(parts)})
                current_n = int(m.group(1))
                parts = []
            elif current_n is None:
                continue
            elif el.tag == "w" and el.text:
                parts.append(("w", el.text))
            elif el.tag == "pc" and el.text:
                parts.append(("pc", el.text))
            if el.tag in ("w", "pc") and el.tail and el.tail.strip():
                parts.append(("w", el.tail.strip()))
        if current_n is not None:
            verses.append({"n": current_n, "t": verse_text(parts)})
        chapters.append({"n": n, "verses": verses})
    return chapters


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--src", type=Path, required=True, help="Dir of 01-matthew.xml …")
    args = ap.parse_args()
    if not args.src.is_dir():
        print(f"Missing source dir: {args.src}", file=sys.stderr)
        return 1
    OUT.mkdir(parents=True, exist_ok=True)
    for fname, (bid, title, short) in FILES.items():
        src = args.src / fname
        if not src.is_file():
            print(f"Missing {src}", file=sys.stderr)
            return 1
        chapters = parse_book(src)
        book = {
            "id": bid,
            "title": title,
            "short": short,
            "version": {
                "id": "septante",
                "label": "Septante",
                "license": "public-domain",
                "source": "https://github.com/biblicalhumanities/Nestle1904",
                "abbreviation": "n1904",
            },
            "chapters": chapters,
        }
        dest = OUT / f"{bid}.json"
        dest.write_text(
            json.dumps(book, ensure_ascii=False, separators=(",", ":")),
            encoding="utf-8",
        )
        n_v = sum(len(c["verses"]) for c in chapters)
        print(f"{bid}: {len(chapters)} chapters, {n_v} verses → {dest}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
