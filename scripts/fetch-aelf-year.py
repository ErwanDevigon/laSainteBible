#!/usr/bin/env python3
"""Fetch about a year of Roman-rite mass refs from AELF.

Independent of the site. Writes data/lectures/aelf-year.json:
one entry per day, liturgical title plus the verse references.
Does not store AELF prose. Resume-safe: days already in the file are skipped.

    python3 scripts/fetch-aelf-year.py
    python3 scripts/fetch-aelf-year.py --days 365 --sleep 0.3
"""

from __future__ import annotations

import argparse
import json
import time
import urllib.error
import urllib.request
from datetime import date, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "data" / "lectures" / "aelf-year.json"
API = "https://api.aelf.org/v1/messes/{day}/romain"


def pack(day: str, payload: dict) -> dict | None:
    messes = payload.get("messes") or payload
    messe = messes[0] if isinstance(messes, list) else messes
    if not isinstance(messe, dict):
        return None
    info = payload.get("informations") or {}
    title = (
        messe.get("nom")
        or info.get("jour_liturgique_nom")
        or info.get("fete")
        or ""
    )
    title = str(title).strip()
    if title.lower() in {"messe du jour", "lectures"}:
        title = ""
    refs = []
    for lec in messe.get("lectures") or []:
        if not isinstance(lec, dict):
            continue
        ref = str(lec.get("ref") or lec.get("reference") or "").replace("\u00a0", " ").strip()
        if not ref:
            continue
        refs.append([str(lec.get("type") or ""), ref])
    if not refs:
        return None
    return {"d": day, "t": title, "r": refs}


def fetch(day: str) -> dict | None:
    req = urllib.request.Request(
        API.format(day=day),
        headers={"Accept": "application/json", "User-Agent": "laSainteBible"},
    )
    with urllib.request.urlopen(req, timeout=40) as res:
        return pack(day, json.load(res))


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--days", type=int, default=365)
    parser.add_argument("--sleep", type=float, default=0.35)
    args = parser.parse_args()
    end = date.today()
    start = end - timedelta(days=max(1, args.days) - 1)
    have: dict[str, dict] = {}
    if OUT.is_file():
        previous = json.loads(OUT.read_text(encoding="utf-8"))
        for row in previous.get("days") or []:
            if isinstance(row, dict) and row.get("d"):
                have[row["d"]] = row
    day = start
    while day <= end:
        iso = day.isoformat()
        if iso not in have:
            try:
                row = fetch(iso)
            except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as err:
                print(f"{iso}  fail  {err}")
                time.sleep(args.sleep)
                day += timedelta(days=1)
                continue
            if row:
                have[iso] = row
                print(f"{iso}  {len(row['r'])} refs")
            else:
                print(f"{iso}  empty")
            time.sleep(args.sleep)
        day += timedelta(days=1)
    days = [have[k] for k in sorted(have)]
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(
        json.dumps({"zone": "romain", "days": days}, ensure_ascii=False, indent=1) + "\n",
        encoding="utf-8",
    )
    print(f"{len(days)} jours → {OUT}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
