#!/usr/bin/env python3
"""Remet la ligature œ dans data/livres/ostervald.

coeur, oeuvre, boeuf, soeur : toujours la ligature.
cour / ouvre : seulement si le verset Segond 1910 confirme le nom
(cœur, œuvre), et jamais pour « la cour » ni le verbe ouvrir.

  python3 scripts/fix-ostervald-oe.py          # versets candidats
  python3 scripts/fix-ostervald-oe.py --write
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / "data" / "livres" / "ostervald"
SEG = ROOT / "data" / "livres" / "segond-1910"

OE = {
    "coeur": "cœur",
    "coeurs": "cœurs",
    "oeuvre": "œuvre",
    "oeuvres": "œuvres",
    "boeuf": "bœuf",
    "boeufs": "bœufs",
    "soeur": "sœur",
    "soeurs": "sœurs",
    "oeil": "œil",
    "oeils": "œils",
    "oeuf": "œuf",
    "oeufs": "œufs",
    "voeu": "vœu",
    "voeux": "vœux",
    "noeud": "nœud",
    "noeuds": "nœuds",
    "choeur": "chœur",
    "choeurs": "chœurs",
    "moeurs": "mœurs",
    "moelle": "mœlle",
    "moelles": "mœlles",
    "foetus": "fœtus",
}
OE_RE = re.compile(
    r"\b(" + "|".join(sorted(OE, key=len, reverse=True)) + r")\b",
    re.IGNORECASE,
)
COUR_RE = re.compile(r"\bcours?\b", re.IGNORECASE)
OUVRE_RE = re.compile(r"\bouvres?\b", re.IGNORECASE)
SEG_HEART = re.compile(r"cœur", re.IGNORECASE)
SEG_COURT = re.compile(r"\bcours?\b", re.IGNORECASE)
SEG_WORK = re.compile(r"œuvre", re.IGNORECASE)
SEG_OPEN = re.compile(
    r"\bouvr(?:e|es|ir|ant|ent|ez|ira|ons|ais|ait|aient|i)\b",
    re.IGNORECASE,
)
COURT_ARTICLE = re.compile(r"\b(?:la|sa|ma|une|cette)\s+$", re.IGNORECASE)
COURSE = re.compile(
    r"\b(?:le|un|au|du|ce|son|mon|ton|libre|ayant|plein|je|tu|il|elle|on|qui|nous|vous|ils|elles|et|ne)\s+$",
    re.IGNORECASE,
)
COURSE_POST = re.compile(r"\s+(?:d['’]|du\b|des\b)", re.IGNORECASE)
VERB = re.compile(
    r"\b(?:je|tu|il|elle|on|qui|nous|vous|ils|elles|quelqu['’]un|chacun|personne)\s+"
    r"(?:n['’]\s*)?(?:l['’]|les\s+|lui\s+|leur\s+|la\s+|le\s+|m['’]|t['’]|s['’])?$",
    re.IGNORECASE,
)
NOUN_SG = re.compile(
    r"(?:l['’]|d['’]|(?:une|un|son|sa|mon|ma|ton|ta|leur|cette|cet|bonne|mauvaise)\s+)$",
    re.IGNORECASE,
)
NOUN_PL = re.compile(
    r"\b(?:les|des|ses|mes|tes|nos|vos|ces|aux|en|bonnes|mauvaises|grandes|plusieurs)\s+$",
    re.IGNORECASE,
)


def like(src: str, dst: str) -> str:
    if src.isupper():
        return dst.upper()
    if src[:1].isupper():
        return dst[:1].upper() + dst[1:]
    return dst


def load_segond() -> dict[str, dict[tuple[int, int], str]]:
    out: dict[str, dict[tuple[int, int], str]] = {}
    for path in SEG.glob("*.json"):
        if path.name == "index.json":
            continue
        data = json.loads(path.read_text(encoding="utf-8"))
        book = {}
        for ch in data.get("chapters") or []:
            for v in ch.get("verses") or []:
                book[(ch["n"], v["n"])] = v.get("t") or ""
        out[path.stem] = book
    return out


def imperative(text: str, m: re.Match) -> bool:
    if not m.group(0)[:1].isupper():
        return False
    if m.start() == 0:
        return True
    return bool(re.search(r"[.!?]\s+$", text[: m.start()]))


def court_token(text: str, m: re.Match) -> bool:
    return bool(COURT_ARTICLE.search(text[: m.start()]))


def course_token(text: str, m: re.Match) -> bool:
    if COURSE_POST.match(text[m.end() :]):
        return True
    if COURSE.search(text[: m.start()]):
        return True
    return imperative(text, m)


def open_verb(text: str, m: re.Match) -> bool:
    if VERB.search(text[: m.start()]):
        return True
    return imperative(text, m)


def work_noun(text: str, m: re.Match) -> bool:
    if open_verb(text, m):
        return False
    pre = text[: m.start()]
    if m.group(0).lower() == "ouvres":
        return bool(NOUN_PL.search(pre))
    return bool(NOUN_SG.search(pre))


def apply_words(text: str, pattern: re.Pattern, repl) -> tuple[str, list[str]]:
    notes: list[str] = []
    parts = []
    last = 0
    for m in pattern.finditer(text):
        new, note = repl(text, m)
        parts.append(text[last : m.start()])
        parts.append(new)
        last = m.end()
        if note:
            notes.append(note)
    parts.append(text[last:])
    return "".join(parts), notes


def fix_verse(text: str, seg: str) -> tuple[str, list[str]]:
    notes: list[str] = []

    def oe(m: re.Match) -> str:
        src = m.group(0)
        dst = like(src, OE[src.lower()])
        notes.append(f"oe {src} → {dst}")
        return dst

    text = OE_RE.sub(oe, text)
    heart = bool(SEG_HEART.search(seg))
    court = bool(SEG_COURT.search(seg))
    work = bool(SEG_WORK.search(seg))
    opened = bool(SEG_OPEN.search(seg))

    def cour(src: str, m: re.Match) -> tuple[str, str]:
        word = m.group(0)
        plural = word.lower() == "cours"
        if plural and course_token(src, m):
            return word, ""
        if not plural and court_token(src, m):
            return word, ""
        if heart and not (court and not heart):
            dst = like(word, "cœurs" if plural else "cœur")
            why = "Segond a cœur"
            if court:
                why = "Segond a cœur et cour ; ce mot n'est pas « la cour »"
            return dst, f"{word} → {dst} ({why})"
        if heart:
            return word, ""
        if court:
            return word, ""
        return word, f"DOUTE garde {word} (Segond sans cœur)"

    def ouvre(src: str, m: re.Match) -> tuple[str, str]:
        word = m.group(0)
        if not work_noun(src, m):
            if work and open_verb(src, m):
                return word, ""
            if work and not open_verb(src, m):
                return word, f"DOUTE garde {word} (Segond a œuvre, forme non nominale)"
            return word, ""
        if work:
            dst = like(word, "œuvres" if word.lower() == "ouvres" else "œuvre")
            return dst, f"{word} → {dst} (Segond a œuvre)"
        if opened and not work:
            return word, f"DOUTE garde {word} (Segond a le verbe, pas œuvre)"
        dst = like(word, "œuvres" if word.lower() == "ouvres" else "œuvre")
        return dst, f"DOUTE {word} → {dst} (nom, Segond sans œuvre)"

    text, n1 = apply_words(text, COUR_RE, cour)
    text, n2 = apply_words(text, OUVRE_RE, ouvre)
    return text, notes + n1 + n2


def splice(raw: str, old: str, new: str, pos: int) -> tuple[str, int]:
    old_esc = json.dumps(old, ensure_ascii=False)
    new_esc = json.dumps(new, ensure_ascii=False)
    i = raw.find(old_esc, pos)
    if i < 0:
        raise SystemExit(f"verset introuvable dans le JSON : {old[:80]}")
    raw = raw[:i] + new_esc + raw[i + len(old_esc) :]
    return raw, i + len(new_esc)


def main() -> int:
    write = "--write" in sys.argv
    segond = load_segond()
    n_files = n_verses = n_oe = 0
    for path in sorted(DEST.glob("*.json")):
        if path.name == "index.json":
            continue
        raw = path.read_text(encoding="utf-8")
        data = json.loads(raw)
        ref = segond.get(path.stem, {})
        pos = 0
        changed = False
        for ch in data.get("chapters") or []:
            for v in ch.get("verses") or []:
                old = v.get("t") or ""
                seg = ref.get((ch["n"], v["n"]), "")
                new, notes = fix_verse(old, seg)
                if new == old:
                    for note in notes:
                        if note.startswith("DOUTE"):
                            print(f"{path.stem} {ch['n']}:{v['n']}  {note}")
                            print(f"  OST {old}")
                            print(f"  SEG {seg}")
                    continue
                n_verses += 1
                changed = True
                n_oe += sum(1 for n in notes if n.startswith("oe "))
                raw, pos = splice(raw, old, new, pos)
                if not write:
                    print(f"{path.stem} {ch['n']}:{v['n']}")
                    for note in notes:
                        print(f"  {note}")
                    if any(n.startswith("DOUTE") or "cour" in n or "ouvre" in n for n in notes):
                        print(f"  SEG {seg}")
        if changed:
            n_files += 1
            if write:
                path.write_text(raw, encoding="utf-8")
                json.loads(raw)
    print(f"{'écrit' if write else 'aperçu'} : {n_files} livres, {n_verses} versets, dont {n_oe} graphes oe")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
