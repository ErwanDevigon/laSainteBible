#!/usr/bin/env python3
"""Import biblical Dead Sea Scroll fragments from ETCBC/dss Text-Fabric.

Reads tf/2.0.1 features (not stored in the repo) and writes fragment JSON
under data/livres/qumran/. A verse is kept only when the book code maps to a
site book and both chapter and verse are integers (Masoretic numbers).
Empty cells are the reader's job: missing verses are simply absent.

Credit, wherever this text is shipped: Martin Abegg, ETCBC, licence CC BY-NC 4.0.
"""

from __future__ import annotations

import json
import re
import sys
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TF = Path("/tmp/dss-tf")
OUT = ROOT / "data" / "livres" / "qumran"

CREDIT = "Martin Abegg, ETCBC, licence CC BY-NC 4.0"
LICENSE_URL = "https://creativecommons.org/licenses/by-nc/4.0/"
SOURCE_URL = "https://github.com/ETCBC/dss"

LINE_LO, LINE_HI = 1552973, 1605867
WORD_LO, WORD_HI = 1606869, 2107863

# Short English codes used by book.tf. Site ids follow data/coverage.json.
BOOKS = {
    "Gen": "genese",
    "Ex": "exode",
    "Lev": "levitique",
    "Num": "nombres",
    "Deut": "deuteronome",
    "Josh": "josue",
    "Judg": "juges",
    "Ruth": "ruth",
    "1Sam": "1-samuel",
    "2Sam": "2-samuel",
    "1Kgs": "1-rois",
    "2Kgs": "2-rois",
    "1Chr": "1-chroniques",
    "2Chr": "2-chroniques",
    "Ezra": "esdras",
    "Neh": "nehemie",
    "Esth": "esther",
    "Job": "job",
    "Ps": "psaumes",
    "Prov": "proverbes",
    "Eccl": "ecclesiaste",
    "Song": "cantique",
    "Is": "esaie",
    "Jer": "jeremie",
    "Lam": "lamentations",
    "Ezek": "ezechiel",
    "Dan": "daniel",
    "Hos": "osee",
    "Joel": "joel",
    "Amos": "amos",
    "Obad": "abdias",
    "Jonah": "jonas",
    "Mic": "michee",
    "Nah": "nahum",
    "Hab": "habacuc",
    "Zeph": "sophonie",
    "Hag": "aggee",
    "Zech": "zacharie",
    "Mal": "malachie",
}

# Cluster wrappers in word-level `full` (ETCBC notation around Unicode letters).
_UNWRAP = (
    (re.compile(r"\(\^\s*"), ""),
    (re.compile(r"\s*\^\)"), ""),
    (re.compile(r"\(<<\s*"), ""),
    (re.compile(r"\s*>>\)"), ""),
    (re.compile(r"\(<\s*"), ""),
    (re.compile(r"\s*>\)"), ""),
    (re.compile(r"\(\{\{\s*"), ""),
    (re.compile(r"\s*\}\}\)"), ""),
    (re.compile(r"\(\{\s*"), ""),
    (re.compile(r"\s*\}\)"), ""),
    (re.compile(r"\(#\s*"), ""),
    (re.compile(r"\s*#\)"), ""),
    (re.compile(r"\(-\s*"), ""),
    (re.compile(r"\s*-\)"), ""),
    (re.compile(r"\(\s*"), ""),
    (re.compile(r"\s*\)"), ""),
)


def parse_tf(path: Path, lo: int | None = None, hi: int | None = None):
    node = None
    with path.open(encoding="utf-8") as fh:
        for line in fh:
            if not line or line[0] in "@\n":
                continue
            line = line.rstrip("\n")
            if "\t" in line:
                n, v = line.split("\t", 1)
                node = int(n)
            else:
                if node is None:
                    continue
                node += 1
                v = line
            if lo is not None and node < lo:
                continue
            if hi is not None and node > hi:
                return
            yield node, v


def parse_slots(spec: str) -> list[tuple[int, int]]:
    out = []
    for part in spec.split(","):
        if not part:
            continue
        if "-" in part:
            a, b = part.split("-", 1)
            out.append((int(a), int(b)))
        else:
            n = int(part)
            out.append((n, n))
    return out


def clean_token(raw: str) -> str:
    if not raw or raw.strip() in {"ε", ""}:
        return ""
    s = raw
    for cre, repl in _UNWRAP:
        s = cre.sub(repl, s)
    s = s.replace("ε", "")
    s = re.sub(r"\s+", " ", s).strip()
    return s


def file_id(siglum: str, used: set[str]) -> str:
    base = re.sub(r"[^A-Za-z0-9._-]+", "_", siglum).strip("._") or "scroll"
    cand = base
    n = 2
    while cand in used:
        cand = f"{base}_{n}"
        n += 1
    used.add(cand)
    return cand


def display_siglum(name: str) -> str:
    m = re.match(r"^(\d+Q)([a-z]+)$", name)
    if m:
        rest = m.group(2)
        return m.group(1) + rest[0].upper() + rest[1:]
    return name


def version_block(scroll: str, sid: str) -> dict:
    block = {
        "id": "qumran",
        "label": "Qumrân",
        "name": "Qumrân",
        "blurb": CREDIT,
        "lang": "he",
        "license": "CC BY-NC 4.0",
        "licenseUrl": LICENSE_URL,
        "source": SOURCE_URL,
        "abbreviation": "qumran",
        "canon": "dss",
        "scroll": scroll,
        "scrollId": sid,
    }
    return block


def join_words(words: list[tuple[int, int, str]]) -> str:
    words.sort()
    parts: list[str] = []
    prev_end = None
    for start, end, text in words:
        if prev_end is not None and start > prev_end + 8:
            if parts and not parts[-1].endswith(" "):
                parts.append(" ")
            parts.append("[…] ")
        parts.append(text)
        prev_end = end
    s = "".join(parts)
    s = re.sub(r"[ \t]+", " ", s).strip()
    s = re.sub(r"\s+([׃،])", r"\1", s)
    return s


def main() -> int:
    tf = Path(sys.argv[1]) if len(sys.argv) > 1 else TF
    print("tf", tf)

    words: dict[int, tuple] = {}
    book_at = {}
    for n, v in parse_tf(tf / "book.tf", WORD_LO, WORD_HI):
        book_at[n] = v
    chapter = {n: v for n, v in parse_tf(tf / "chapter.tf", WORD_LO, WORD_HI)}
    verse = {n: v for n, v in parse_tf(tf / "verse.tf", WORD_LO, WORD_HI)}
    full = {n: v for n, v in parse_tf(tf / "full.tf", WORD_LO, WORD_HI)}
    after = {n: v for n, v in parse_tf(tf / "after.tf", WORD_LO, WORD_HI)}

    unmapped: dict[str, int] = defaultdict(int)
    kept = 0
    for n, code in book_at.items():
        bid = BOOKS.get(code)
        if not bid:
            unmapped[code] += 1
            continue
        ch, vs = chapter.get(n), verse.get(n)
        if not ch or not vs or not ch.isdigit() or not vs.isdigit():
            continue
        ci, vi = int(ch), int(vs)
        if not (1 <= ci <= 200 and 1 <= vi <= 200):
            continue
        token = clean_token(full.get(n, ""))
        if not token:
            continue
        gap = after.get(n) or ""
        words[n] = (bid, ci, vi, token + gap)
        kept += 1
    print("kept words", kept, "unmapped codes", len(unmapped))
    top_un = sorted(unmapped.items(), key=lambda kv: -kv[1])[:12]
    print("unmapped", top_un)

    line_scroll = {
        n: v for n, v in parse_tf(tf / "scroll.tf", LINE_LO, LINE_HI)
    }
    intervals: list[tuple[int, int, str]] = []
    word_slots: dict[int, tuple[int, int]] = {}
    for n, spec in parse_tf(tf / "oslots.tf"):
        if LINE_LO <= n <= LINE_HI:
            name = line_scroll.get(n)
            if not name:
                continue
            for a, b in parse_slots(spec):
                intervals.append((a, b, name))
        elif n in words:
            ranges = parse_slots(spec)
            if ranges:
                word_slots[n] = (ranges[0][0], ranges[-1][1])
        elif n > WORD_HI:
            break
    intervals.sort()
    starts = [a for a, _, _ in intervals]
    print("line ranges", len(intervals), "word slots", len(word_slots))

    def find_scroll(slot: int) -> str | None:
        lo, hi = 0, len(starts)
        while lo < hi:
            mid = (lo + hi) // 2
            if starts[mid] <= slot:
                lo = mid + 1
            else:
                hi = mid
        i = lo - 1
        if i < 0:
            return None
        a, b, name = intervals[i]
        if a <= slot <= b:
            return name
        return None

    # (scroll, book, chapter, verse) -> [(start, end, text)]
    groups: dict[tuple, list] = defaultdict(list)
    misses = 0
    for n, (bid, ci, vi, text) in words.items():
        span = word_slots.get(n)
        if not span:
            misses += 1
            continue
        scroll = find_scroll(span[0])
        if not scroll:
            misses += 1
            continue
        groups[(scroll, bid, ci, vi)].append((span[0], span[1], text))
    print("groups", len(groups), "slot misses", misses)

    # scroll -> book -> chapter -> verse -> text
    tree: dict[str, dict] = defaultdict(lambda: defaultdict(lambda: defaultdict(dict)))
    for (scroll, bid, ci, vi), items in groups.items():
        text = join_words(items)
        if text:
            tree[scroll][bid][ci][vi] = text

    leningrad = json.loads(
        (ROOT / "data" / "livres" / "leningrad" / "index.json").read_text(encoding="utf-8")
    )
    meta = {b["id"]: b for b in leningrad["books"]}

    if OUT.exists():
        for p in OUT.rglob("*.json"):
            p.unlink()
    used_ids: set[str] = set()
    # stable ids: assign in siglum order
    sigla = sorted(tree)
    id_of = {sig: file_id(sig, used_ids) for sig in sigla}
    disp_of = {sig: display_siglum(sig) for sig in sigla}

    manuscripts = {}
    verse_counts: dict[str, dict[str, int]] = defaultdict(dict)
    files = 0
    for sig in sigla:
        sid = id_of[sig]
        for bid, chapters in tree[sig].items():
            info = meta.get(bid)
            if not info:
                print("no title for", bid)
                continue
            payload = {
                "id": bid,
                "title": info.get("title") or bid,
                "original_title": info.get("original_title") or info.get("title") or bid,
                "short": info.get("short") or info.get("title") or bid,
                "version": version_block(disp_of[sig], sid),
                "chapters": [
                    {
                        "n": cn,
                        "verses": [
                            {"n": vn, "t": chapters[cn][vn]}
                            for vn in sorted(chapters[cn])
                        ],
                    }
                    for cn in sorted(chapters)
                ],
            }
            dest = OUT / "mss" / sid / f"{bid}.json"
            dest.parent.mkdir(parents=True, exist_ok=True)
            dest.write_text(
                json.dumps(payload, ensure_ascii=False, separators=(",", ":")),
                encoding="utf-8",
            )
            nverses = sum(len(chs) for chs in chapters.values())
            verse_counts[sid][bid] = nverses
            files += 1
        manuscripts[sid] = {
            "siglum": disp_of[sig],
            "sourceSiglum": sig,
            "verses": verse_counts[sid],
        }

    by_book: dict[str, list[str]] = defaultdict(list)
    for sid, books in verse_counts.items():
        for bid in books:
            by_book[bid].append(sid)
    for bid, sids in by_book.items():
        sids.sort(key=lambda s: (-verse_counts[s][bid], manuscripts[s]["siglum"]))

    catalog = {
        "credit": CREDIT,
        "license": LICENSE_URL,
        "source": SOURCE_URL,
        "byBook": {bid: by_book[bid] for bid in sorted(by_book)},
        "manuscripts": manuscripts,
    }
    (OUT / "catalog.json").write_text(
        json.dumps(catalog, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )

    index_books = []
    for b in leningrad["books"]:
        if b["id"] in by_book:
            index_books.append(b)
    index = {
        "version": {
            "id": "qumran",
            "label": "Qumrân",
            "name": "Qumrân",
            "blurb": CREDIT,
            "lang": "he",
            "license": "CC BY-NC 4.0",
            "licenseUrl": LICENSE_URL,
            "source": SOURCE_URL,
            "abbreviation": "qumran",
            "canon": "dss",
        },
        "books": index_books,
    }
    (OUT / "index.json").write_text(
        json.dumps(index, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    (OUT / "NOTICE.txt").write_text(
        "\n".join(
            [
                CREDIT,
                LICENSE_URL,
                SOURCE_URL,
                "",
                "Fragments bibliques seulement (ETCBC/dss, Text-Fabric 2.0.1).",
                "Un verset est présent seulement s'il est attesté dans le manuscrit,",
                "avec un chapitre et un verset entiers (numérotation massorétique).",
                "Les rouleaux non bibliques et les cotes sans livre biblique sont exclus.",
                "",
            ]
        ),
        encoding="utf-8",
    )

    cov_path = ROOT / "data" / "coverage.json"
    cov = json.loads(cov_path.read_text(encoding="utf-8"))
    if "qumran" not in cov["versions"]:
        cov["versions"].append("qumran")
    for bid, sids in by_book.items():
        slot = cov["books"].get(bid)
        if slot is None:
            print("coverage missing", bid)
            continue
        if "qumran" not in slot:
            slot.append("qumran")
    cov_path.write_text(
        json.dumps(cov, ensure_ascii=False, separators=(",", ":")) + "\n",
        encoding="utf-8",
    )

    extra_path = ROOT / "data" / "versions-extra.json"
    extra = json.loads(extra_path.read_text(encoding="utf-8"))
    extra["qumran"] = {
        "id": "qumran",
        "label": "Qumrân",
        "name": "Qumrân",
        "blurb": CREDIT,
        "lang": "fr",
        "license": "CC BY-NC 4.0",
        "source": SOURCE_URL,
        "abbreviation": "qumran",
        "canon": "dss",
    }
    extra_path.write_text(
        json.dumps(extra, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )

    print("files", files, "scrolls", len(manuscripts), "books", sorted(by_book))
    for bid in ("esaie", "psaumes", "genese", "habacuc"):
        if bid not in by_book:
            print(bid, "ABSENT")
            continue
        top = by_book[bid][:6]
        print(bid, [(s, verse_counts[s][bid], manuscripts[s]["siglum"]) for s in top])

    # samples via tree keyed by source siglum
    def show(sig_sub: str, bid: str, ch: int, vs: int):
        hits = [s for s in tree if sig_sub.lower() in s.lower() and bid in tree[s]]
        if not hits:
            print("no", sig_sub, bid)
            return
        sig = hits[0]
        text = tree[sig][bid].get(ch, {}).get(vs, "")
        print(f"SAMPLE {disp_of[sig]} {bid} {ch}:{vs} {text[:180]!r}")

    show("1Qisaa", "esaie", 1, 1)
    show("1Qisaa", "esaie", 40, 3)
    show("11Q", "psaumes", 23, 1)
    # any ps 23
    for sig, books in tree.items():
        t = books.get("psaumes", {}).get(23, {}).get(1)
        if t:
            print(f"PS23 {disp_of[sig]} {t[:160]!r}")
            break
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
