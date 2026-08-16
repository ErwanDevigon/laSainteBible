#!/usr/bin/env python3
"""
texts/*.json → data/livres/{version}/ + js/books.js
Gère toutes les versions disponibles + multi-canon + mapping des Psaumes.
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path
from typing import Any

from canon import BOOKS, BY_NR, books_for_canon, Canon

ROOT = Path(__file__).resolve().parents[1]
TEXTS = ROOT / "texts"
OUT_BASE = ROOT / "data" / "livres"
JS_BOOKS = ROOT / "js" / "books.js"

# ============================================================
# Déclaration de toutes les versions
# ============================================================
VERSIONS = {
    "segond-1910": {
        "id": "segond-1910",
        "label": "Louis Segond 1910",
        "year": 1910,
        "license": "public-domain",
        "source": "Louis Segond 1910",
        "abbreviation": "ls1910",
        "canon": "protestant",
        "file": "ls1910.json",
    },
    "martin": {
        "id": "martin",
        "label": "David Martin 1744",
        "year": 1744,
        "license": "public-domain",
        "source": "David Martin (rév. Pierre Roques)",
        "abbreviation": "martin",
        "canon": "protestant",
        "file": "martin.json",
    },
    "darby": {
        "id": "darby",
        "label": "John Nelson Darby",
        "year": 1885,
        "license": "public-domain",
        "source": "J.N. Darby (Bible complète)",
        "abbreviation": "darby",
        "canon": "protestant",
        "file": "darby.json",
    },
    "ostervald": {
        "id": "ostervald",
        "label": "Ostervald",
        "year": 1744,
        "license": "public-domain",
        "source": "Jean-Frédéric Ostervald",
        "abbreviation": "ostervald",
        "canon": "protestant",
        "file": "ostervald.json",
    },
    "crampon": {
        "id": "crampon",
        "label": "Crampon 1923",
        "year": 1923,
        "license": "public-domain",
        "source": "Augustin Crampon",
        "abbreviation": "crampon",
        "canon": "catholic",
        "file": "crampon.json",
    },
    "vulgate": {
        "id": "vulgate",
        "label": "Vulgate (Clementine)",
        "year": 1592,
        "license": "public-domain",
        "source": "Vulgata Clementina",
        "abbreviation": "vulgate",
        "canon": "catholic",
        "file": "vulgate.json",
    },
    "septante": {
        "id": "septante",
        "label": "Septante (LXX)",
        "year": -250,          # approximatif (IIIe s. av. J.-C.)
        "license": "public-domain",
        "source": "Septante",
        "abbreviation": "lxx",
        "canon": "orthodox",
        "file": "lxx.json",
    },
    "textusreceptus": {
        "id": "textusreceptus",
        "label": "Textus Receptus",
        "year": 1550,
        "license": "public-domain",
        "source": "Textus Receptus (Stephanus)",
        "abbreviation": "textusreceptus",
        "canon": "protestant",
        "file": "textusreceptus.json",
    },
    "tischendorf": {
        "id": "tischendorf",
        "label": "Tischendorf",
        "year": 1872,
        "license": "public-domain",
        "source": "Constantin von Tischendorf (8e éd.)",
        "abbreviation": "tischendorf",
        "canon": "protestant",
        "file": "tischendorf.json",
    },
    "westcotthort": {
        "id": "westcotthort",
        "label": "Westcott-Hort",
        "year": 1881,
        "license": "public-domain",
        "source": "Westcott & Hort",
        "abbreviation": "westcotthort",
        "canon": "protestant",
        "file": "westcotthort.json",
    },
    "moderngreek": {
        "id": "moderngreek",
        "label": "Grec moderne",
        "year": 1850,            # approximation
        "license": "public-domain",
        "source": "Neophytos Vamvas's translation of the Holy Bible into modern Greek (1850)",
        "abbreviation": "moderngreek",
        "canon": "protestant",
        "file": "moderngreek.json",
    },
}


# ============================================================
# Mapping des noms de livres
# ============================================================
NAME_TO_NR = {
    # ... (le même dictionnaire complet que précédemment)
    # Je te le remets en version condensée pour la lisibilité
    "genesis": 1, "exodus": 2, "leviticus": 3, "numbers": 4, "deuteronomy": 5,
    "joshua": 6, "judges": 7,
    "1 samuel": 8, "i samuel": 8, "2 samuel": 9, "ii samuel": 9,
    "1 kings": 10, "i kings": 10, "2 kings": 11, "ii kings": 11,
    "isaiah": 12, "jeremiah": 13, "ezekiel": 14,
    "hosea": 15, "joel": 16, "amos": 17, "obadiah": 18, "jonah": 19,
    "micah": 20, "nahum": 21, "habakkuk": 22, "zephaniah": 23,
    "haggai": 24, "zechariah": 25, "malachi": 26,
    "psalms": 27, "proverbs": 28, "job": 29,
    "song of solomon": 30, "song of songs": 30, "canticle of canticles": 30,
    "ruth": 31, "lamentations": 32, "ecclesiastes": 33, "esther": 34,
    "daniel": 35, "ezra": 36, "nehemiah": 37,
    "1 chronicles": 38, "i chronicles": 38, "2 chronicles": 39, "ii chronicles": 39,
    "tobit": 40, "judith": 41, "wisdom": 42, "wisdom of solomon": 42,
    "sirach": 43, "ecclesiasticus": 43, "baruch": 44,
    "1 maccabees": 45, "i maccabees": 45, "2 maccabees": 46, "ii maccabees": 46,
    "3 maccabees": 47, "4 maccabees": 48, "psalm 151": 49,
    "matthew": 50, "mark": 51, "luke": 52, "john": 53, "acts": 54, "romans": 55,
    "1 corinthians": 56, "i corinthians": 56, "2 corinthians": 57, "ii corinthians": 57,
    "galatians": 58, "ephesians": 59, "philippians": 60, "colossiens": 61,
    "1 thessalonians": 62, "i thessalonians": 62, "2 thessalonians": 63, "ii thessalonians": 63,
    "1 timothy": 64, "i timothy": 64, "2 timothy": 65, "ii timothy": 65,
    "titus": 66, "philemon": 67, "hebrews": 68, "james": 69,
    "1 peter": 70, "i peter": 70, "2 peter": 71, "ii peter": 71,
    "1 john": 72, "i john": 72, "2 john": 73, "ii john": 73, "3 john": 74, "iii john": 74,
    "jude": 75, "revelation": 76, "revelation of john": 76, "apocalypse": 76,
}


def clean(t: str) -> str:
    t = (t or "").replace("\u2009", " ").replace("\u00a0", " ")
    t = re.sub(r"<[^>]+>", "", t)
    return re.sub(r"[ \t]+", " ", t).strip()


def greek_to_hebrew(ps: int) -> int | tuple[int, ...]:
    if 1 <= ps <= 8: return ps
    if ps == 9: return (9, 10)
    if 10 <= ps <= 112: return ps + 1
    if ps == 113: return (114, 115)
    if ps in (114, 115): return 116
    if 116 <= ps <= 145: return ps + 1
    if ps in (146, 147): return 147
    if 148 <= ps <= 150: return ps
    return ps


def normalize_source(raw: dict, src_name: str) -> dict:
    if "abbreviation" in raw or "lang" in raw:
        return raw

    print(f"→ Format simple détecté pour {src_name}")
    books = []
    for book in raw.get("books", []):
        name = book.get("name", "").lower().strip()
        nr = NAME_TO_NR.get(name)
        if nr is None:
            print(f"  Livre non mappé : {book.get('name')}", file=sys.stderr)
            continue

        chapters = []
        for ch in book.get("chapters", []):
            verses = [{"chapter": int(ch["chapter"]), "verse": int(v["verse"]), "text": v.get("text", "")}
                      for v in ch.get("verses", [])]
            chapters.append({"chapter": int(ch["chapter"]), "verses": verses})

        books.append({"nr": nr, "name": book.get("name"), "chapters": chapters})
    return {"books": books}


def extract(version_key: str) -> int:
    meta = VERSIONS[version_key]
    src = TEXTS / meta["file"]
    dest_dir = OUT_BASE / version_key

    if not src.is_file():
        print(f"Missing {src}", file=sys.stderr)
        return 0

    raw = json.loads(src.read_text(encoding="utf-8"))
    raw = normalize_source(raw, src.name)
    by_nr = {b["nr"]: b for b in raw.get("books", []) if b.get("nr") is not None}

    dest_dir.mkdir(parents=True, exist_ok=True)
    allowed = books_for_canon(meta["canon"])
    is_greek = version_key in ("vulgate", "septante")
    n = 0

    for book_meta in allowed:
        book_raw = by_nr.get(book_meta["nr"])
        if not book_raw:
            continue

        chapters = []
        for ch in book_raw.get("chapters", []):
            ch_num = int(ch["chapter"])

            if book_meta["id"] == "psaumes" and is_greek:
                hebrew = greek_to_hebrew(ch_num)
                if isinstance(hebrew, tuple):
                    for h in hebrew:
                        chapters.append({
                            "n": h,
                            "n_greek": ch_num,
                            "verses": [{"n": int(v["verse"]), "t": clean(v["text"])} for v in ch["verses"]]
                        })
                else:
                    chapters.append({
                        "n": hebrew,
                        "n_greek": ch_num,
                        "verses": [{"n": int(v["verse"]), "t": clean(v["text"])} for v in ch["verses"]]
                    })
            else:
                chapters.append({
                    "n": ch_num,
                    "verses": [{"n": int(v["verse"]), "t": clean(v["text"])} for v in ch["verses"]]
                })

        book = {
            "id": book_meta["id"],
            "title": book_meta["title"],
            "original_title": book_raw.get("name") or book_meta["title"],
            "short": book_meta["short"],
            "version": meta,
            "chapters": chapters,
        }

        (dest_dir / f"{book_meta['id']}.json").write_text(
            json.dumps(book, ensure_ascii=False, separators=(",", ":")), encoding="utf-8"
        )
        n_v = sum(len(c["verses"]) for c in chapters)
        print(f"{version_key:15} {book_meta['id']:22} {len(chapters):3} ch {n_v:5} v")
        n += 1

    return n


def write_books_js() -> None:
    content = (
        "/** Generated by scripts/build-texts.py — do not edit. */\n"
        f"export const BOOKS = {json.dumps(BOOKS, ensure_ascii=False, indent=2)};\n\n"
        "export const BOOK_BY_ID = Object.fromEntries(BOOKS.map(b => [b.id, b]));\n"
        "export const BOOK_BY_NR = Object.fromEntries(BOOKS.map(b => [b.nr, b]));\n\n"
        "export function booksForCanon(canon) {\n"
        "  return BOOKS.filter(b => b.canons.includes(canon));\n"
        "}\n"
    )
    JS_BOOKS.parent.mkdir(parents=True, exist_ok=True)
    JS_BOOKS.write_text(content, encoding="utf-8")
    print(f"js/books.js → {len(BOOKS)} livres")


def main() -> int:
    write_books_js()
    print("\n=== Extraction des versions ===")
    total = 0
    for key in VERSIONS:
        total += extract(key)
    print(f"\nTerminé. {total} livres extraits au total.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())