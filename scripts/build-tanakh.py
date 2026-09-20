#!/usr/bin/env python3
"""UXLC tanach-xml → data/livres/leningrad/. Does not touch other versions."""
from __future__ import annotations

import json
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

from canon import BOOKS, BY_ID
from titles import HEBREW_ORIGINAL, didactic_title

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "texts" / "tanach-xml" / "Books"
OUT = ROOT / "data" / "livres" / "leningrad"

FILES = {
    "Genesis.xml": "genese",
    "Exodus.xml": "exode",
    "Leviticus.xml": "levitique",
    "Numbers.xml": "nombres",
    "Deuteronomy.xml": "deuteronome",
    "Joshua.xml": "josue",
    "Judges.xml": "juges",
    "Samuel_1.xml": "1-samuel",
    "Samuel_2.xml": "2-samuel",
    "Kings_1.xml": "1-rois",
    "Kings_2.xml": "2-rois",
    "Isaiah.xml": "esaie",
    "Jeremiah.xml": "jeremie",
    "Ezekiel.xml": "ezechiel",
    "Hosea.xml": "osee",
    "Joel.xml": "joel",
    "Amos.xml": "amos",
    "Obadiah.xml": "abdias",
    "Jonah.xml": "jonas",
    "Micah.xml": "michee",
    "Nahum.xml": "nahum",
    "Habakkuk.xml": "habacuc",
    "Zephaniah.xml": "sophonie",
    "Haggai.xml": "aggee",
    "Zechariah.xml": "zacharie",
    "Malachi.xml": "malachie",
    "Psalms.xml": "psaumes",
    "Proverbs.xml": "proverbes",
    "Job.xml": "job",
    "Song_of_Songs.xml": "cantique",
    "Ruth.xml": "ruth",
    "Lamentations.xml": "lamentations",
    "Ecclesiastes.xml": "ecclesiaste",
    "Esther.xml": "esther",
    "Daniel.xml": "daniel",
    "Ezra.xml": "esdras",
    "Nehemiah.xml": "nehemie",
    "Chronicles_1.xml": "1-chroniques",
    "Chronicles_2.xml": "2-chroniques",
}

SKIP_TAGS = {"x", "note", "pe", "samekh", "k", "vs", "cs"}
MAQAF = "\u05be"

VERSION = {
    "id": "leningrad",
    "label": "Codex Leningradensis",
    "name": "הקודקס הלנינגרדי",
    "blurb": "הקודקס הלנינגרדי",
    "year": 1008,
    "lang": "he",
    "license": "public-domain",
    "source": "Unicode/XML Leningrad Codex (UXLC 2.5)",
    "abbreviation": "leningrad",
    "canon": "jewish",
    "at": "תנ״ך",
    "nt": "הברית החדשה",
}


def collect(el: ET.Element) -> str:
    chunks: list[str] = []
    if el.text:
        chunks.append(el.text)
    for child in el:
        if child.tag in SKIP_TAGS:
            if child.tail:
                chunks.append(child.tail)
            continue
        chunks.append(collect(child))
        if child.tail:
            chunks.append(child.tail)
    return "".join(chunks)


def join_he(words: list[str]) -> str:
    out: list[str] = []
    for w in words:
        w = w.strip()
        if not w:
            continue
        if out and not out[-1].endswith(MAQAF) and not w.startswith(MAQAF):
            out.append(" ")
        out.append(w)
    return "".join(out)


def verse_text(v: ET.Element) -> str:
    words: list[str] = []
    for child in v:
        if child.tag in ("w", "q"):
            words.append(collect(child))
        elif child.tag == "k":
            continue
    return join_he(words)


def parse_book(path: Path) -> list[dict]:
    root = ET.parse(path).getroot()
    chapters: list[dict] = []
    for c in root.iter("c"):
        n_raw = c.get("n") or ""
        try:
            n = int(n_raw)
        except ValueError:
            continue
        if n < 1:
            continue
        verses: list[dict] = []
        for v in c.findall("v"):
            vn_raw = v.get("n") or ""
            try:
                vn = int(vn_raw)
            except ValueError:
                continue
            if vn < 1:
                continue
            t = verse_text(v)
            if not t:
                continue
            verses.append({"n": vn, "t": t})
        if verses:
            chapters.append({"n": n, "verses": verses})
    return chapters


def main() -> int:
    if not SRC.is_dir():
        print(f"missing {SRC}", file=sys.stderr)
        return 1
    OUT.mkdir(parents=True, exist_ok=True)
    for leftover in OUT.glob("*.json"):
        leftover.unlink()

    index_books: list[dict] = []
    n_ok = 0
    for fname, bid in FILES.items():
        path = SRC / fname
        if not path.is_file():
            print(f"missing {path}", file=sys.stderr)
            continue
        bm = BY_ID.get(bid) or next((b for b in BOOKS if b["id"] == bid), None)
        if not bm:
            print(f"unknown book {bid}", file=sys.stderr)
            continue
        chapters = parse_book(path)
        title = didactic_title("he", bid, bm["title"])
        original = HEBREW_ORIGINAL.get(bid) or title
        book = {
            "id": bid,
            "title": title,
            "original_title": original,
            "short": original,
            "version": VERSION,
            "chapters": chapters,
        }
        (OUT / f"{bid}.json").write_text(
            json.dumps(book, ensure_ascii=False, separators=(",", ":")),
            encoding="utf-8",
        )
        index_books.append(
            {
                "id": bid,
                "title": title,
                "original_title": original,
                "short": original,
                "testament": bm["testament"],
                "section": bm["section"],
            }
        )
        n_ok += 1
        print(f"{'leningrad':15} {bid:22} {len(chapters):3} ch")

    order = [b["id"] for b in BOOKS if b["id"] in {x["id"] for x in index_books}]
    by_id = {b["id"]: b for b in index_books}
    index_books = [by_id[i] for i in order if i in by_id]
    index = {"version": VERSION, "books": index_books}
    (OUT / "index.json").write_text(
        json.dumps(index, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"leningrad {n_ok} livres → {OUT}")
    return 0 if n_ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
