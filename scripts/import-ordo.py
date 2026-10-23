#!/usr/bin/env python3
"""Merge Roman-rite mass refs from the yearly ordo PDF into mdj-archive.json.

The PDF is the liturgical calendar (feast + verse refs), not the prose.
Days already stored stay. A day with several masses keeps the Mass of the
day when that heading is present, otherwise the first set.

    python3 scripts/import-ordo.py
    python3 scripts/import-ordo.py --from 2026-10-24
"""

from __future__ import annotations

import argparse
import json
import re
import subprocess
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "data" / "lectures" / "mdj-archive.json"
PDF = ROOT / "texts" / "ordo" / "33-ORDO-2025-2026-ANNEE-A.pdf"

MONTHS = {
    "JANVIER": 1,
    "FEVRIER": 2,
    "FÉVRIER": 2,
    "MARS": 3,
    "AVRIL": 4,
    "MAI": 5,
    "JUIN": 6,
    "JUILLET": 7,
    "AOUT": 8,
    "AOÛT": 8,
    "SEPTEMBRE": 9,
    "OCTOBRE": 10,
    "NOVEMBRE": 11,
    "DECEMBRE": 12,
    "DÉCEMBRE": 12,
}
DAY_RE = re.compile(r"^\s*(\d{1,2})\s{2,}(\S.*)$")
MONTH_RE = re.compile(
    r"^\s*(JANVIER|F[ÉE]VRIER|MARS|AVRIL|MAI|JUIN|JUILLET|AO[ÛU]T|SEPTEMBRE|OCTOBRE|NOVEMBRE|D[ÉE]CEMBRE)(?:\s+(\d{4}))?\s*$"
)
LABEL_RE = re.compile(
    r"^(?:(1re|1ère|1ere)\s+lect|(2e|2ème|2eme)\s+lect|(?:Ps|Psaume)|(Ct|Cantique)|([ÉE]vangile))\s*\.?\s*:\s*(.*)$",
    re.I,
)
ALT_RE = re.compile(r"^(ou bien|ou\s*:)", re.I)


def pdftotext(path: Path) -> str:
    out = subprocess.check_output(
        ["pdftotext", "-layout", str(path), "-"],
        text=True,
    )
    return out.replace("\f", "\n")


def clean_ref(label_kind: str, raw: str) -> str:
    ref = re.sub(r"\s+", " ", raw).strip(" .;")
    ref = re.split(r"\s+ou\s+", ref, maxsplit=1)[0].strip()
    ref = re.sub(r"\s*\(lecture br[eè]ve\)\s*", "", ref, flags=re.I).strip(" .;")
    if label_kind == "psaume" and ref and not re.match(r"^(Ps|Psaume)\b", ref, re.I):
        ref = f"Ps {ref}"
    ref = re.sub(r"^Ps\s+Ps\s+", "Ps ", ref, flags=re.I)
    return ref


def kind_of(match: re.Match[str]) -> str:
    if match.group(1):
        return "lecture_1"
    if match.group(2):
        return "lecture_2"
    if match.group(3):
        return "psaume"
    if match.group(4):
        return "evangile"
    return "psaume"


def choose_set(sets: list[tuple[str, list]]) -> list:
    if not sets:
        return []
    for heading, refs in sets:
        if re.search(r"messe de(?:\s+la)?\s+jour|messe du jour", heading, re.I):
            return refs
    return sets[0][1]


def parse(text: str) -> list[dict]:
    month = 12
    year = 2025
    seen_month = False
    started = False
    cur: dict | None = None
    days: list[dict] = []

    def flush() -> None:
        nonlocal cur
        if not cur:
            return
        refs = choose_set(cur["sets"])
        if refs and cur.get("iso"):
            days.append({"d": cur["iso"], "t": "", "r": refs})
        cur = None

    for raw in text.splitlines():
        line = raw.strip()
        if not line or line.upper().startswith("CALENDRIER"):
            continue
        if not started:
            if line == "DÉCEMBRE 2025":
                started = True
                month, year, seen_month = 12, 2025, True
            continue
        month_m = MONTH_RE.match(line)
        if month_m:
            name = month_m.group(1).upper()
            new_month = MONTHS[name]
            if month_m.group(2):
                year = int(month_m.group(2))
            elif seen_month and new_month < month:
                year += 1
            month = new_month
            seen_month = True
            continue
        day_m = DAY_RE.match(raw)
        if day_m and 1 <= int(day_m.group(1)) <= 31:
            # Footnotes are a bare number plus prose, not a calendar row.
            rest = day_m.group(2).strip()
            if rest[:1].islower():
                continue
            flush()
            day = int(day_m.group(1))
            try:
                iso = date(year, month, day).isoformat()
            except ValueError:
                iso = ""
            cur = {
                "iso": iso,
                "sets": [],
                "heading": "",
                "open": False,
                "title": "",
            }
            continue
        if cur is None:
            continue
        if ALT_RE.match(line):
            cur["open"] = False
            continue
        label = LABEL_RE.match(line)
        if label:
            kind = kind_of(label)
            ref = clean_ref(kind, label.group(5) or "")
            if not ref:
                continue
            if kind == "lecture_1" and cur["sets"] and any(
                item[0] == "evangile" for item in cur["sets"][-1][1]
            ):
                cur["sets"].append((cur["heading"], []))
            if not cur["sets"]:
                cur["sets"].append((cur["heading"], []))
            cur["sets"][-1][1].append([kind, ref])
            cur["open"] = True
            continue
        if cur["open"] and cur["sets"] and cur["sets"][-1][1]:
            wrapped = ("," in line or ";" in line or "-" in line or "–" in line) and re.search(r"\d", line)
            if wrapped:
                prev = cur["sets"][-1][1][-1]
                prev[1] = clean_ref(prev[0], prev[1] + " " + line)
                continue
        if not cur["sets"]:
            if re.search(r"messe", line, re.I):
                cur["heading"] = line
    flush()
    # Keep the first row when a day number is parsed twice.
    by_date: dict[str, dict] = {}
    for row in days:
        by_date.setdefault(row["d"], row)
    return [by_date[k] for k in sorted(by_date)]


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--pdf", type=Path, default=PDF)
    parser.add_argument("--from", dest="start", default="")
    args = parser.parse_args()
    rows = parse(pdftotext(args.pdf))
    have: dict[str, dict] = {}
    if OUT.is_file():
        previous = json.loads(OUT.read_text(encoding="utf-8"))
        for row in previous.get("days") or []:
            if isinstance(row, dict) and row.get("d"):
                have[row["d"]] = row
    added = 0
    for row in rows:
        if args.start and row["d"] < args.start:
            continue
        if row["d"] in have:
            continue
        have[row["d"]] = row
        added += 1
        print(f"{row['d']}  {len(row['r'])} refs  {row['t'][:48]}")
    days = [have[k] for k in sorted(have)]
    OUT.write_text(
        json.dumps({"zone": "romain", "days": days}, ensure_ascii=False, indent=1) + "\n",
        encoding="utf-8",
    )
    print(f"{added} ajoutés, {len(days)} jours → {OUT}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
