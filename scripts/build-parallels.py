#!/usr/bin/env python3
"""Vault synopse + AT citations → data/parallels-nt.json + data/citations-at.json."""
from __future__ import annotations

import json
import re
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
VAULT = ROOT / "obsidian-vault"
OUT = ROOT / "data"

GOSPEL = {"matthieu": "Mt", "marc": "Mc", "luc": "Lc", "jean": "Jn"}
GOSPEL_COL = ["matthieu", "marc", "luc", "jean"]

# Longest-first aliases (folded).
ALIASES = [
    ("1 thessaloniciens", "1-thessaloniciens"),
    ("2 thessaloniciens", "2-thessaloniciens"),
    ("1 corinthiens", "1-corinthiens"),
    ("2 corinthiens", "2-corinthiens"),
    ("1 chroniques", "1-chroniques"),
    ("2 chroniques", "2-chroniques"),
    ("cantique des cantiques", "cantique"),
    ("1 timothee", "1-timothee"),
    ("2 timothee", "2-timothee"),
    ("1 samuel", "1-samuel"),
    ("2 samuel", "2-samuel"),
    ("1 maccabees", "1-maccabees"),
    ("2 maccabees", "2-maccabees"),
    ("3 maccabees", "3-maccabees"),
    ("4 maccabees", "4-maccabees"),
    ("1 pierre", "1-pierre"),
    ("2 pierre", "2-pierre"),
    ("1 jean", "1-jean"),
    ("2 jean", "2-jean"),
    ("3 jean", "3-jean"),
    ("1 rois", "1-rois"),
    ("2 rois", "2-rois"),
    ("1 ch", "1-chroniques"),
    ("2 ch", "2-chroniques"),
    ("1 s", "1-samuel"),
    ("2 s", "2-samuel"),
    ("1 r", "1-rois"),
    ("2 r", "2-rois"),
    ("1 m", "1-maccabees"),
    ("2 m", "2-maccabees"),
    ("apocalypse", "apocalypse"),
    ("deuteronomie", "deuteronome"),
    ("deuteronome", "deuteronome"),
    ("ecclesiastique", "siracide"),
    ("lamentations", "lamentations"),
    ("ecclesiaste", "ecclesiaste"),
    ("philippiens", "philippiens"),
    ("colossiens", "colossiens"),
    ("levitique", "levitique"),
    ("matthieu", "matthieu"),
    ("ephesiens", "ephesiens"),
    ("sophonie", "sophonie"),
    ("zacharie", "zacharie"),
    ("malachie", "malachie"),
    ("siracide", "siracide"),
    ("philemon", "philemon"),
    ("habacuc", "habacuc"),
    ("ezechiel", "ezechiel"),
    ("nehemie", "nehemie"),
    ("proverbes", "proverbes"),
    ("psaumes", "psaumes"),
    ("psaume", "psaumes"),
    ("sagesse", "sagesse"),
    ("romains", "romains"),
    ("galates", "galates"),
    ("hebreux", "hebreux"),
    ("jacques", "jacques"),
    ("nombres", "nombres"),
    ("genese", "genese"),
    ("jeremie", "jeremie"),
    ("esdras", "esdras"),
    ("esther", "esther"),
    ("daniel", "daniel"),
    ("judith", "judith"),
    ("baruch", "baruch"),
    ("abdias", "abdias"),
    ("michee", "michee"),
    ("actes", "actes"),
    ("aggee", "aggee"),
    ("nahum", "nahum"),
    ("jonas", "jonas"),
    ("josue", "josue"),
    ("juges", "juges"),
    ("tobie", "tobie"),
    ("exode", "exode"),
    ("esaie", "esaie"),
    ("isaie", "esaie"),
    ("cantique", "cantique"),
    ("qoh", "ecclesiaste"),
    ("mt", "matthieu"),
    ("mc", "marc"),
    ("lc", "luc"),
    ("jn", "jean"),
    ("ac", "actes"),
    ("rm", "romains"),
    ("sg", "sagesse"),
    ("si", "siracide"),
    ("tb", "tobie"),
    ("ba", "baruch"),
    ("gn", "genese"),
    ("ex", "exode"),
    ("lv", "levitique"),
    ("nb", "nombres"),
    ("dt", "deuteronome"),
    ("jg", "juges"),
    ("rt", "ruth"),
    ("ne", "nehemie"),
    ("jb", "job"),
    ("ps", "psaumes"),
    ("pr", "proverbes"),
    ("qo", "ecclesiaste"),
    ("ec", "ecclesiaste"),
    ("ct", "cantique"),
    ("is", "esaie"),
    ("jr", "jeremie"),
    ("lm", "lamentations"),
    ("ez", "ezechiel"),
    ("dn", "daniel"),
    ("os", "osee"),
    ("jl", "joel"),
    ("am", "amos"),
    ("ab", "abdias"),
    ("mi", "michee"),
    ("na", "nahum"),
    ("ha", "habacuc"),
    ("so", "sophonie"),
    ("ag", "aggee"),
    ("za", "zacharie"),
    ("ml", "malachie"),
    ("jdt", "judith"),
    ("marc", "marc"),
    ("luc", "luc"),
    ("jean", "jean"),
    ("ruth", "ruth"),
    ("job", "job"),
]


def fold(s: str) -> str:
    t = unicodedata.normalize("NFD", s or "")
    t = "".join(ch for ch in t if unicodedata.category(ch) != "Mn")
    t = t.replace("\u00a0", " ").lower()
    t = re.sub(r"(?<=[a-z])\.", "", t)
    t = re.sub(r"\s+", " ", t).strip()
    return t


def match_book(folded: str):
    for alias, bid in ALIASES:
        if folded == alias:
            return bid, ""
        if not folded.startswith(alias):
            continue
        nxt = folded[len(alias) : len(alias) + 1]
        if nxt and not re.match(r"[\s,:(0-9]", nxt):
            continue
        return bid, folded[len(alias) :].strip()
    return None, folded


def parse_verse_chunk(chunk: str) -> list[dict]:
    """'1-9' / '1-3.43-46' / '16.29-32' / '1' → ranges."""
    if not chunk:
        return []
    ranges = []
    for part in re.split(r"[.,]", chunk):
        part = part.strip()
        if not part:
            continue
        m = re.match(r"(\d+)[a-z]?(?:\s*[-–—]\s*(\d+)[a-z]?)?$", part)
        if not m:
            continue
        start = int(m.group(1))
        end = int(m.group(2)) if m.group(2) else start
        ranges.append({"start": start, "end": max(start, end)})
    return ranges


def parse_loc(token: str) -> list[dict]:
    """Gospel-cell token without book: '23' | '15,1-9' | '8,34-9,1' | '4,1-3.43-46'."""
    t = (token or "").strip()
    t = t.replace("–", "-").replace("—", "-")
    t = re.sub(r"\s+", "", t)
    if not t or t in {"-", "—"}:
        return []
    m = re.match(r"^(\d+),(\d+)-(\d+),(\d+)$", t)
    if m:
        c1, v1, c2, v2 = map(int, m.groups())
        if c1 == c2:
            return [{"chapter": c1, "ranges": [{"start": v1, "end": v2}]}]
        return [
            {"chapter": c1, "ranges": [{"start": v1, "end": None}]},
            {"chapter": c2, "ranges": [{"start": 1, "end": v2}]},
        ]
    m = re.match(r"^(\d+)$", t)
    if m:
        return [{"chapter": int(m.group(1)), "ranges": None}]
    m = re.match(r"^(\d+),(.+)$", t)
    if m:
        return [{"chapter": int(m.group(1)), "ranges": parse_verse_chunk(m.group(2)) or None}]
    return []


def parse_gospel_cell(cell: str) -> list[dict]:
    raw = (cell or "").strip()
    raw = re.sub(r"\([^)]*\)", "", raw).strip()
    if not raw or raw in {"—", "-", "–"}:
        return []
    out = []
    for part in re.split(r"\s*;\s*", raw):
        out.extend(parse_loc(part))
    return out


def cite_span(span: dict) -> str:
    ch = span["chapter"]
    ranges = span.get("ranges")
    if not ranges:
        return str(ch)
    bits = []
    for r in ranges:
        a, b = r["start"], r["end"]
        if b is None:
            bits.append(f"{a}–")
        elif a == b:
            bits.append(str(a))
        else:
            bits.append(f"{a}-{b}")
    return f"{ch},{'.'.join(bits)}"


def parse_at_list(cell: str) -> list[dict]:
    """'Is 7,14 ; 8,8.10' / '2 S 7,12-16 ; Gn 12,1-3'."""
    raw = (cell or "").strip()
    raw = re.sub(r"\([^)]*\)", " ", raw)
    if not raw or raw in {"—", "-"}:
        return []
    out = []
    last_book = None
    for part in re.split(r"\s*;\s*", raw):
        part = part.strip()
        if not part:
            continue
        # skip whole-corpus hedges: "1–2 R", "Loi, Prophètes"
        folded = fold(part)
        if re.match(r"^\d+\s*[-–—]\s*\d+\s*[a-z]", folded):
            continue
        if folded.startswith("loi") or folded.startswith("prophetes"):
            continue
        book, rest = match_book(folded)
        if not book:
            # continuation: "8,8.10" still last book
            if last_book and re.match(r"^\d+", part.replace(" ", "")):
                locs = parse_loc(part)
                for loc in locs:
                    loc["book"] = last_book
                    out.append(loc)
            continue
        last_book = book
        tail = rest.replace(" ", "")
        locs = parse_loc(tail) if tail else [{"chapter": 1, "ranges": None}]
        # whole-book / huge chapter span without verses: skip if many chapters encoded poorly
        for loc in locs:
            loc["book"] = book
            out.append(loc)
    return out


def slug(label: str) -> str:
    t = unicodedata.normalize("NFD", label)
    t = "".join(ch for ch in t if unicodedata.category(ch) != "Mn")
    t = re.sub(r"[^a-zA-Z0-9]+", "-", t.lower()).strip("-")
    return t or "item"


def split_row(line: str) -> list[str]:
    s = line.strip()
    if not s.startswith("|"):
        return []
    parts = [p.strip() for p in s.strip("|").split("|")]
    return parts


def build_synopse(path: Path) -> list[dict]:
    items = []
    seen = set()
    for line in path.read_text(encoding="utf-8").splitlines():
        if not line.startswith("|"):
            continue
        cols = split_row(line)
        if len(cols) < 5:
            continue
        label = cols[0]
        if not label or label.startswith("Épisode") or re.match(r"^-+", label.replace(" ", "")):
            continue
        if label.startswith("**"):
            continue
        passages = []
        for i, book in enumerate(GOSPEL_COL):
            spans = parse_gospel_cell(cols[i + 1] if i + 1 < len(cols) else "")
            if not spans:
                continue
            passages.append(
                {
                    "book": book,
                    "short": GOSPEL[book],
                    "spans": spans,
                    "cites": [cite_span(s) for s in spans],
                }
            )
        if len(passages) < 2:
            continue
        sid = slug(label)
        n = 2
        base = sid
        while sid in seen:
            sid = f"{base}-{n}"
            n += 1
        seen.add(sid)
        items.append({"id": sid, "label": label, "kind": "synopse", "passages": passages})
    return items


HEADING_GOSPEL = {
    "matthieu": "matthieu",
    "marc": "marc",
    "luc": "luc",
    "jean": "jean",
}


def build_citations(path: Path) -> list[dict]:
    items = []
    gospel = None
    seen = set()
    for line in path.read_text(encoding="utf-8").splitlines():
        hm = re.match(r"^###\s+(Matthieu|Marc|Luc|Jean)\s*$", line)
        if hm:
            gospel = HEADING_GOSPEL[fold(hm.group(1))]
            continue
        if not gospel or not line.startswith("|"):
            continue
        cols = split_row(line)
        if len(cols) < 3:
            continue
        loc, typ, at = cols[0], cols[1], cols[2]
        if loc in {"Mt", "Mc", "Lc", "Jn"} or loc.startswith("-"):
            continue
        typ = typ.strip().upper()
        if typ not in {"C", "A"}:
            continue
        spans = parse_loc(loc.replace(" ", ""))
        if not spans:
            continue
        at_spans = parse_at_list(at)
        if not at_spans:
            continue
        sid = f"{gospel}-{slug(loc)}-{typ.lower()}"
        n = 2
        base = sid
        while sid in seen:
            sid = f"{base}-{n}"
            n += 1
        seen.add(sid)
        at_passages = []
        by_book: dict[str, list] = {}
        for sp in at_spans:
            by_book.setdefault(sp["book"], []).append(sp)
        for bid, sps in by_book.items():
            short = None
            for alias, b in ALIASES:
                if b == bid and len(alias) <= 4:
                    short = alias
                    # prefer canonical short later
            short_map = {
                "genese": "Gn",
                "exode": "Ex",
                "levitique": "Lv",
                "nombres": "Nb",
                "deuteronome": "Dt",
                "josue": "Jos",
                "juges": "Jg",
                "ruth": "Rt",
                "1-samuel": "1 S",
                "2-samuel": "2 S",
                "1-rois": "1 R",
                "2-rois": "2 R",
                "1-chroniques": "1 Ch",
                "2-chroniques": "2 Ch",
                "esdras": "Esd",
                "nehemie": "Né",
                "esther": "Est",
                "job": "Jb",
                "psaumes": "Ps",
                "proverbes": "Pr",
                "ecclesiaste": "Qo",
                "cantique": "Ct",
                "esaie": "Is",
                "jeremie": "Jr",
                "lamentations": "Lm",
                "ezechiel": "Ez",
                "daniel": "Dn",
                "osee": "Os",
                "joel": "Jl",
                "amos": "Am",
                "abdias": "Ab",
                "jonas": "Jon",
                "michee": "Mi",
                "nahum": "Na",
                "habacuc": "Ha",
                "sophonie": "So",
                "aggee": "Ag",
                "zacharie": "Za",
                "malachie": "Ml",
                "tobie": "Tb",
                "judith": "Jdt",
                "sagesse": "Sg",
                "siracide": "Si",
                "baruch": "Ba",
                "1-maccabees": "1 M",
                "2-maccabees": "2 M",
            }
            at_passages.append(
                {
                    "book": bid,
                    "short": short_map.get(bid, bid),
                    "spans": [{"chapter": s["chapter"], "ranges": s.get("ranges")} for s in sps],
                    "cites": [
                        cite_span({"chapter": s["chapter"], "ranges": s.get("ranges")}) for s in sps
                    ],
                }
            )
        items.append(
            {
                "id": sid,
                "label": at.strip(),
                "kind": "citation" if typ == "C" else "allusion",
                "origin": {
                    "book": gospel,
                    "short": GOSPEL[gospel],
                    "spans": spans,
                    "cites": [cite_span(s) for s in spans],
                },
                "passages": at_passages,
            }
        )
    return items


def main() -> int:
    syn = build_synopse(VAULT / "Synopse NT.md")
    cit = build_citations(VAULT / "citations vétérotestamentaires.md")
    (OUT / "parallels-nt.json").write_text(
        json.dumps({"items": syn}, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    (OUT / "citations-at.json").write_text(
        json.dumps({"items": cit}, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"parallels-nt.json  {len(syn)} pericopes")
    print(f"citations-at.json  {len(cit)} C/A")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
