#!/usr/bin/env python3
"""Copy verse refs from mdj-archive.json onto matching days of mdj-ordo.json.

A day matches when the liturgical identity is the same, not the civil date.
Feria: same romcal id and weekday cycle. Sunday and cycle-bound solemnity:
same id and Sunday cycle. Feast and other solemnity: same id, and the same
refs in every stored sample. Memorial: the feria of that weekday.

Days with no stored twin stay without refs.
"""

from __future__ import annotations

import json
import re
from collections import defaultdict
from datetime import date, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
STOCK = ROOT / "data" / "lectures" / "mdj-archive.json"
CAL = ROOT / "data" / "ordo" / "Ordo_Lectionum_Missae_periscopes.json"
OUT = ROOT / "data" / "lectures" / "mdj-ordo.json"

DOW = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
CYCLE = re.compile(
    r"ordinary_time_|advent_|lent_|easter_|christmas|palm_sunday|ash_|holy_|"
    r"good_friday|pentecost|epiphany|baptism_|trinity|corpus_|sacred_heart|"
    r"christ_the_king|holy_family|mary_mother"
)


def clean_refs(row: dict) -> list | None:
    refs = row.get("r") or []
    if not refs:
        return None
    out = []
    for typ, ref in refs:
        ref = re.sub(r"\s+", " ", str(ref)).strip()
        if not ref or "CALENDRIER" in ref or len(ref) > 80:
            return None
        out.append([typ, ref])
    return out


def weekday(iso: str) -> str:
    y, m, d = (int(part) for part in iso.split("-"))
    return DOW[date(y, m, d).weekday()]


def previous_sunday(iso: str) -> str:
    y, m, d = (int(part) for part in iso.split("-"))
    dt = date(y, m, d)
    return (dt - timedelta(days=(dt.weekday() + 1) % 7)).isoformat()


def ferial_id(iso: str, cal: dict[str, dict]) -> str:
    sunday = cal.get(previous_sunday(iso))
    if not sunday:
        return ""
    match = re.fullmatch(r"(.+)_(\d+)_sunday", sunday["id"])
    if not match:
        return ""
    return f"{match.group(1)}_{match.group(2)}_{weekday(iso)}"


def main() -> int:
    stock = {row["d"]: row for row in json.loads(STOCK.read_text())["days"]}
    cal_days = json.loads(CAL.read_text())["days"]
    cal = {row["date"]: row for row in cal_days}
    by_feria: dict[tuple[str, str], list] = {}
    by_sunday: dict[tuple[str, str], list] = {}
    by_proper: dict[str, list] = defaultdict(list)
    for iso, row in stock.items():
        refs = clean_refs(row)
        info = cal.get(iso)
        if not refs or not info:
            continue
        by_feria[(info["id"], info["weekday_cycle"])] = refs
        by_sunday[(info["id"], info["sunday_cycle"])] = refs
        by_proper[info["id"]].append((weekday(iso) == "sunday", refs))

    filled = 0
    ordo_days = []
    for info in cal_days:
        iso = info["date"]
        rank = info["rank"]
        refs = None
        if rank == "Dimanche" or (rank == "Solennité" and CYCLE.search(info["id"])):
            refs = by_sunday.get((info["id"], info["sunday_cycle"]))
        elif rank == "Férie":
            refs = by_feria.get((info["id"], info["weekday_cycle"]))
        elif rank == "Mémoire":
            fid = ferial_id(iso, cal)
            if fid:
                refs = by_feria.get((fid, info["weekday_cycle"]))
        elif rank in {"Fête", "Solennité"}:
            rows = by_proper.get(info["id"]) or []
            sunday = weekday(iso) == "sunday"
            same = [item[1] for item in rows if item[0] == sunday] or [item[1] for item in rows]
            blobs = {json.dumps(item, ensure_ascii=False) for item in same}
            if len(blobs) == 1 and same:
                refs = same[0]
        if refs:
            filled += 1
        ordo_days.append({"d": iso, "t": info["feast"], "r": refs or []})
    OUT.write_text(
        json.dumps({"zone": "romain", "source": "ordo-previsionnel", "days": ordo_days}, ensure_ascii=False)
        + "\n",
        encoding="utf-8",
    )
    print(f"{filled} jours avec lectures, {len(ordo_days) - filled} sans, → {OUT}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
