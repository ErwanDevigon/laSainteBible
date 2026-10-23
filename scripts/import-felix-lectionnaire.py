#!/usr/bin/env python3
"""Parse Felix Just's lectionary tables and fill empty ordo days.

Reads the HTML tables already saved under --html (default /tmp/felix).
Writes citation tables (JSON + SQLite). Crosses them with the romcal
calendar and fills mdj-ordo.json only where a day has no usable refs.

Citations are converted to the French forms js/refs.js accepts.
Psalm numbers stay Hebrew, as in the USA tables and in the local edition.
Felix's commentary is not copied. Scripture-index rows keep the citation,
the lectionary number and the day label; the description column is dropped.

Memorials keep the weekday readings. A feast or solemnity uses the printed
proper. A memorial marked PROPER (Mary, Mother of the Church) uses that
proper. All Souls stays empty: the table only says the readings are chosen.
"""

from __future__ import annotations

import argparse
import json
import re
import sqlite3
from collections import Counter, defaultdict
from datetime import date, datetime, timedelta
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CAL = ROOT / "data" / "ordo" / "Ordo_Lectionum_Missae_periscopes.json"
STOCK = ROOT / "data" / "lectures" / "mdj-archive.json"
ORDO = ROOT / "data" / "lectures" / "mdj-ordo.json"
OUT_JSON = ROOT / "data" / "lectionnaire" / "felix-lectionnaire.json"
OUT_DB = ROOT / "data" / "lectionnaire" / "lectionnaire.sqlite"

BOOKS = sorted(
    [
        ("1 thessalonians", "1 Th"), ("2 thessalonians", "2 Th"),
        ("1 thess", "1 Th"), ("2 thess", "2 Th"),
        ("1 corinthians", "1 Co"), ("2 corinthians", "2 Co"),
        ("1 cor", "1 Co"), ("2 cor", "2 Co"),
        ("1 chronicles", "1 Ch"), ("2 chronicles", "2 Ch"),
        ("1 chr", "1 Ch"), ("2 chr", "2 Ch"),
        ("1 timothy", "1 Tm"), ("2 timothy", "2 Tm"),
        ("1 tim", "1 Tm"), ("2 tim", "2 Tm"),
        ("1 samuel", "1 S"), ("2 samuel", "2 S"),
        ("1 sam", "1 S"), ("2 sam", "2 S"),
        ("1 kings", "1 R"), ("2 kings", "2 R"),
        ("1 kgs", "1 R"), ("2 kgs", "2 R"),
        ("1 peter", "1 P"), ("2 peter", "2 P"),
        ("1 pet", "1 P"), ("2 pet", "2 P"),
        ("1 maccabees", "1 M"), ("2 maccabees", "2 M"),
        ("1 macc", "1 M"), ("2 macc", "2 M"),
        ("1 john", "1 Jn"), ("2 john", "2 Jn"), ("3 john", "3 Jn"),
        ("song of songs", "Ct"), ("revelation", "Ap"), ("apocalypse", "Ap"),
        ("philippians", "Ph"), ("colossians", "Col"), ("lamentations", "Lm"),
        ("deuteronomy", "Dt"), ("ecclesiastes", "Qo"), ("leviticus", "Lv"),
        ("ephesians", "Ep"), ("zephaniah", "So"), ("zechariah", "Za"),
        ("malachi", "Ml"), ("philemon", "Phm"), ("habakkuk", "Ha"),
        ("ezekiel", "Ez"), ("nehemiah", "Ne"), ("proverbs", "Pr"),
        ("hebrews", "He"), ("genesis", "Gn"), ("jeremiah", "Jr"),
        ("esther", "Est"), ("daniel", "Dn"), ("obadiah", "Ab"),
        ("matthew", "Mt"), ("numbers", "Nb"), ("micah", "Mi"),
        ("james", "Jc"), ("jonah", "Jon"), ("joshua", "Jos"),
        ("judges", "Jg"), ("exodus", "Ex"), ("isaiah", "Is"),
        ("wisdom", "Sg"), ("sirach", "Si"), ("judith", "Jdt"),
        ("tobit", "Tb"), ("baruch", "Ba"), ("titus", "Tt"),
        ("acts", "Ac"), ("romans", "Rm"), ("galatians", "Ga"),
        ("hosea", "Os"), ("joel", "Jl"), ("amos", "Am"),
        ("nahum", "Na"), ("haggai", "Ag"), ("ezra", "Esd"),
        ("ruth", "Rt"), ("jude", "Jude"), ("job", "Jb"),
        ("psalm", "Ps"), ("psalms", "Ps"), ("mark", "Mc"),
        ("luke", "Lc"), ("john", "Jn"), ("rev", "Ap"),
        ("exod", "Ex"), ("deut", "Dt"), ("gen", "Gn"), ("lev", "Lv"),
        ("num", "Nb"), ("josh", "Jos"), ("judg", "Jg"), ("neh", "Ne"),
        ("tob", "Tb"), ("jdt", "Jdt"), ("esth", "Est"), ("est", "Est"),
        ("prov", "Pr"), ("eccl", "Qo"), ("song", "Ct"), ("wis", "Sg"),
        ("sir", "Si"), ("isa", "Is"), ("jer", "Jr"), ("lam", "Lm"),
        ("bar", "Ba"), ("ezek", "Ez"), ("dan", "Dn"), ("hos", "Os"),
        ("obad", "Ab"), ("mic", "Mi"), ("nah", "Na"), ("hab", "Ha"),
        ("zeph", "So"), ("hag", "Ag"), ("zech", "Za"), ("mal", "Ml"),
        ("matt", "Mt"), ("jas", "Jc"), ("phlm", "Phm"), ("heb", "He"),
        ("phil", "Ph"), ("col", "Col"), ("eph", "Ep"), ("gal", "Ga"),
        ("rom", "Rm"), ("jon", "Jon"), ("ps", "Ps"),
    ],
    key=lambda item: -len(item[0]),
)

CANON = {
    "mt": "mt", "mc": "mc", "lc": "lc", "jn": "jn", "jean": "jn", "luc": "lc",
    "marc": "mc", "matthieu": "mt", "is": "is", "esa": "is", "ac": "ac",
    "rm": "rm", "1 co": "1co", "2 co": "2co", "ep": "ep", "ph": "ph",
    "col": "col", "he": "he", "jc": "jc", "1 p": "1p", "2 p": "2p",
    "1 jn": "1jn", "2 jn": "2jn", "3 jn": "3jn", "ap": "ap", "gn": "gn",
    "ex": "ex", "lv": "lv", "nb": "nb", "dt": "dt", "jos": "jos", "jg": "jg",
    "rt": "rt", "1 s": "1s", "2 s": "2s", "1 r": "1r", "2 r": "2r",
    "1 ch": "1ch", "2 ch": "2ch", "esd": "esd", "ne": "ne", "tb": "tb",
    "jdt": "jdt", "est": "est", "1 m": "1m", "2 m": "2m", "jb": "jb",
    "ps": "ps", "pr": "pr", "qo": "qo", "ct": "ct", "sg": "sg", "si": "si",
    "jr": "jr", "lm": "lm", "ba": "ba", "ez": "ez", "dn": "dn", "os": "os",
    "jl": "jl", "am": "am", "ab": "ab", "jon": "jon", "mi": "mi", "na": "na",
    "ha": "ha", "so": "so", "ag": "ag", "za": "za", "ml": "ml", "ga": "ga",
    "1 th": "1th", "2 th": "2th", "1 tm": "1tm", "2 tm": "2tm", "tt": "tt",
    "phm": "phm", "jude": "jude",
}

# Fixed calendar day of a general-roman celebration → romcal id.
# Readings follow the celebration when it is transferred.
SANCTORAL_ID = {
    (1, 25): "conversion_of_saint_paul_the_apostle",
    (2, 2): "presentation_of_the_lord",
    (2, 22): "chair_of_saint_peter_the_apostle",
    (3, 19): "joseph_spouse_of_mary",
    (3, 25): "annunciation",
    (4, 25): "mark_evangelist",
    (5, 3): "philip_and_james_apostles",
    (5, 14): "matthias_apostle",
    (5, 31): "visitation_of_mary",
    (6, 24): "nativity_of_john_the_baptist",
    (6, 29): "peter_and_paul_apostles",
    (7, 3): "thomas_apostle",
    (7, 22): "mary_magdalene",
    (7, 25): "james_apostle",
    (8, 6): "transfiguration",
    (8, 10): "lawrence_of_rome_deacon",
    (8, 15): "assumption",
    (8, 24): "bartholomew_apostle",
    (9, 8): "nativity_of_mary",
    (9, 14): "exaltation_of_the_holy_cross",
    (9, 21): "matthew_apostle",
    (9, 29): "michael_gabriel_and_raphael_archangels",
    (10, 18): "luke_evangelist",
    (10, 28): "simon_and_jude_apostles",
    (11, 1): "all_saints",
    (11, 9): "dedication_of_the_lateran_basilica",
    (11, 30): "andrew_apostle",
    (12, 8): "immaculate_conception_of_mary",
    (12, 26): "stephen_the_first_martyr",
    (12, 27): "john_apostle",
    (12, 28): "holy_innocents_martyrs",
}

DOW_NAMES = {
    "monday": "monday", "tuesday": "tuesday", "wednesday": "wednesday",
    "thursday": "thursday", "friday": "friday", "saturday": "saturday",
    "sunday": "sunday", "mon": "monday", "tues": "tuesday", "tue": "tuesday",
    "wed": "wednesday", "thurs": "thursday", "thur": "thursday",
    "fri": "friday", "sat": "saturday",
}
MONTHS = {
    "jan": 1, "feb": 2, "mar": 3, "march": 3, "apr": 4, "april": 4, "may": 5,
    "jun": 6, "june": 6, "jul": 7, "july": 7, "aug": 8, "sep": 9, "sept": 9,
    "oct": 10, "nov": 11, "dec": 12,
}
WEEKDAY_FR = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]


class Tables(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.tables: list[list[list[str]]] = []
        self.cur: list[list[str]] | None = None
        self.row: list[str] | None = None
        self.cell: list[str] | None = None
        self.skip = 0

    def handle_starttag(self, tag, attrs):
        tag = tag.lower()
        if tag in {"script", "style"}:
            self.skip += 1
            return
        if self.skip:
            return
        if tag == "table":
            self.cur = []
        elif tag == "tr" and self.cur is not None:
            self.row = []
        elif tag in {"td", "th"} and self.row is not None:
            self.cell = []
        elif tag == "br" and self.cell is not None:
            self.cell.append(" ")

    def handle_endtag(self, tag):
        tag = tag.lower()
        if tag in {"script", "style"} and self.skip:
            self.skip -= 1
            return
        if self.skip:
            return
        if tag in {"td", "th"} and self.cell is not None:
            self.row.append(" ".join("".join(self.cell).split()))
            self.cell = None
        elif tag == "tr" and self.row is not None:
            if any(cell.strip() for cell in self.row):
                self.cur.append(self.row)
            self.row = None
        elif tag == "table" and self.cur is not None:
            if self.cur:
                self.tables.append(self.cur)
            self.cur = None

    def handle_data(self, data):
        if not self.skip and self.cell is not None:
            self.cell.append(data)


def book_fr(token: str) -> str | None:
    key = re.sub(r"\s+", " ", token.lower().replace(".", "")).strip()
    for name, abbrev in BOOKS:
        if key == name:
            return abbrev
    return None


def format_verses(text: str) -> str:
    text = text.replace("+", ", ")
    text = re.sub(r"\s*,\s*", ", ", text)
    text = re.sub(r"\s+", " ", text).strip(" .,;")
    return text


def convert_body(text: str) -> str | None:
    text = text.strip(" .;")
    match = re.match(
        r"^(?:see\s+|cf\.?\s+)?(?P<book>(?:[123]\s+)?[A-Za-z][A-Za-z]+)\.?\s+(?P<rest>.+)$",
        text,
        re.I,
    )
    if not match:
        return None
    abbrev = book_fr(match.group("book"))
    if not abbrev:
        return None
    rest = match.group("rest").replace("–", "—").replace("--", "—")
    bits = re.split(r"(\s*[—;]\s*(?=\d+\s*:))", rest)
    head = re.match(r"(\d+)\s*:\s*(.*)$", bits[0].strip())
    if not head:
        return None
    out = f"{head.group(1)}, {format_verses(head.group(2))}"
    for index in range(1, len(bits), 2):
        nxt = re.match(r"(\d+)\s*:\s*(.*)$", bits[index + 1].strip())
        if not nxt:
            return None
        joiner = " – " if "—" in bits[index] else " ; "
        out += joiner + f"{nxt.group(1)}, {format_verses(nxt.group(2))}"
    return f"{abbrev} {out}".strip()


def convert_short(short: str) -> str | None:
    short = short.strip(" .;")
    match = re.match(r"(\d+)\s*:\s*(.+)$", short)
    if match:
        return f"{match.group(1)}, {format_verses(match.group(2))}"
    if re.match(r"\d", short):
        return format_verses(short)
    return None


def clean_cell(text: str) -> str:
    text = text.replace("†", " ").replace("*", " ")
    text = re.sub(r"\s*\[[^\]]*\]", lambda m: drop_bracket(m.group(0)), text)
    text = re.sub(
        r"\s*\((?:diff|new|opt[^)]*|#\s*[\d.]+|Gr\.[^)]*|for [^)]*|text [^)]*"
        r"|see [^)]*|notes?[^)]*|non-biblical[^)]*|optional[^)]*|resurrection[^)]*)\)",
        "",
        text,
        flags=re.I,
    )
    text = re.sub(r"^(?:optional|opt\.?)\s*:\s*", "", text.strip(), flags=re.I)
    text = re.sub(
        r"\s*or the (?:reading|psalm|gospel) from Year [ABC]\b",
        "",
        text,
        flags=re.I,
    )
    return re.sub(r"\s+", " ", text).strip(" .;")


def drop_bracket(token: str) -> str:
    inner = token.strip()[1:-1]
    if re.search(r"no bibl|option|see|note", inner, re.I):
        return " "
    return " " + inner + " "


def split_alternatives(text: str) -> list[str]:
    bits = re.split(r"\s+or\s+", text, flags=re.I)
    refs: list[str] = []
    for index, bit in enumerate(bits):
        bit = bit.strip(" .;")
        if not bit:
            continue
        if index == 0 or re.match(r"(?:[123]\s+)?[A-Za-z]", bit):
            converted = convert_body(bit)
            if converted:
                refs.append(converted)
            continue
        short = convert_short(bit)
        if short and refs:
            if "(ou :" not in refs[0]:
                refs[0] = f"{refs[0]} (ou : {short})"
            else:
                refs[0] = f"{refs[0].rstrip(')')} ; {short})"
    return refs


def parse_cell(raw: str) -> dict:
    """Return refs plus cycle/year substitutes. Empty when the cell is not a citation."""
    blank = {"refs": [], "pair": [], "year": {}, "cycle": {}}
    if not raw or re.fullmatch(r"[.xX—–\-\s]+", raw):
        return blank
    low = raw.lower()
    if "no bibl" in low or "non-biblical" in low or re.search(r"\d+\s+to\s+\d+\s+option", low):
        return blank
    cycle: dict[str, list[str]] = {}
    if re.search(r"\bA\)\s", raw) and re.search(r"\bB\)\s", raw):
        parts = re.split(r"\b([ABC])\)\s*", raw)
    elif re.search(r"\bA:\s", raw) and re.search(r"\bB:\s", raw):
        parts = re.split(r"\b([ABC]):\s*", raw)
    else:
        parts = None
    if parts is not None:
        for index in range(1, len(parts), 2):
            cycle[parts[index]] = split_alternatives(clean_cell(parts[index + 1]))
        return {"refs": cycle.get("A") or next(iter(cycle.values()), []), "pair": [], "year": {}, "cycle": cycle}
    text = clean_cell(raw)
    year: dict[str, list[str]] = {}

    def take_year(match: re.Match) -> str:
        year[match.group(1).upper()] = split_alternatives(clean_cell(match.group(2)))
        return ""

    text = re.sub(r"or,?\s*in Year ([ABC]),\s*(.+)$", take_year, text, flags=re.I).strip(" .;")
    if not text:
        return {"refs": [], "pair": [], "year": year, "cycle": {}}
    # "Joel … and 2 Cor …" is two required readings, not an alternative.
    chunks = re.split(r"\s+and\s+", text, flags=re.I)
    if len(chunks) == 2 and re.match(r"(?:[123]\s+)?[A-Za-z]", chunks[1].strip()):
        return {
            "refs": split_alternatives(chunks[0]),
            "pair": split_alternatives(chunks[1]),
            "year": year,
            "cycle": {},
        }
    return {"refs": split_alternatives(text), "pair": [], "year": year, "cycle": {}}


def colmap(header: list[str]) -> list[str]:
    keys = []
    for cell in header:
        low = cell.lower()
        if "description" in low:
            keys.append("skip")
        elif "lect" in low or low.strip() in {"#", "lec.#", "lec"}:
            keys.append("lect")
        elif "first" in low or low.startswith("old testament") or low.startswith("gospel reading") or low.startswith("responsorial") and "psalm reading" in low:
            keys.append("reading" if "first" not in low and "old" in low else "first")
        elif "date" in low and "name" in low:
            keys.append("day")
        elif low.strip() == "date" or low.startswith("date"):
            keys.append("date")
        elif "sunday" in low or low.strip() == "day" or ("feast" in low and "first" not in low and "reading" not in low):
            keys.append("day")
        elif "saint" in low:
            keys.append("saint")
        elif "rank" in low or low.strip() == "s/f":
            keys.append("rank")
        elif "common" in low:
            keys.append("commons")
        elif "psalm" in low or "responsorial" in low:
            keys.append("psalm")
        elif "second" in low or "epistle" in low or "new testament" in low:
            keys.append("second")
        elif "alleluia" in low or "verse before" in low or low.strip().startswith("verse"):
            keys.append("alleluia")
        elif "gospel" in low:
            keys.append("gospel")
        elif "year" in low:
            keys.append("year")
        elif re.fullmatch(r"20\d\d", cell.strip()):
            keys.append("year")
        else:
            keys.append("skip")
    # Old-testament index column is the citation, not a "first reading" of a mass.
    if "reading" in keys and "gospel" not in keys and "first" not in keys:
        keys = ["reading" if key == "first" else key for key in keys]
    return keys


def cell(row: list[str], keys: list[str], name: str) -> str:
    for key, value in zip(keys, row):
        if key == name:
            return value
    return ""


def is_header_row(row: list[str], keys: list[str]) -> bool:
    lect = cell(row, keys, "lect")
    day = cell(row, keys, "day")
    if lect.strip().lower() in {"lect. #", "#", "lec.#", "lect #"}:
        return True
    if day.strip().lower() in {"day", "sunday", "sunday or feast", "sunday, solemnity, or feast"}:
        return True
    return False


def dow_of(text: str) -> str | None:
    match = re.search(
        r"\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tues|tue|wed|thurs|thur|fri|sat)\b",
        text,
        re.I,
    )
    if not match:
        return None
    return DOW_NAMES[match.group(1).lower()]


def week_of(text: str) -> int | None:
    match = re.search(r"\b(\d+)(?:st|nd|rd|th)\b", text, re.I)
    if match:
        return int(match.group(1))
    match = re.search(r"\bweek\s+(\d+)\b", text, re.I)
    if match:
        return int(match.group(1))
    return None


def cycle_of(text: str) -> str | None:
    if re.search(r"\bABC\b", text):
        return "ABC"
    match = re.search(r"[-–]\s*([ABC])\b", text)
    if match:
        return match.group(1)
    match = re.search(r"\bYear\s+([ABC12]|I{1,2})\b", text)
    if not match:
        return None
    token = match.group(1)
    return {"I": "1", "II": "2", "1": "1", "2": "2"}.get(token, token)


def note_free(label: str) -> str:
    """Drop year-notes and bracketed alternatives. Keep the row's own title."""
    text = re.sub(r"\[[^\]]*(?:(?:19|20)\d{2}|\bor\b)[^\]]*\]", " ", label, flags=re.I)
    text = re.sub(r"\([^)]*(?:19|20)\d{2}[^)]*\)", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def classify(label: str, default_cycle: str | None = None) -> tuple | None:
    raw = label.lower()
    if "optional mass" in raw or "extended form" in raw or "procession" in raw:
        return None
    if "chrism" in raw:
        return ("id", "chrism")
    label = note_free(label)
    low = label.lower()
    cycle = cycle_of(label) or default_cycle
    dow = dow_of(label)
    week = week_of(label)
    if re.match(r"\[?(?:dec|jan)\.?\s+\d", low):
        found = month_day(label)
        if found and found[0] == 12 and 17 <= found[1] <= 24:
            return ("date", "dec", found[1])
        if found and found[0] == 12 and found[1] in {29, 30, 31}:
            return ("date", "dec", found[1])
        if found and found[0] == 1 and 2 <= found[1] <= 7:
            return ("date", "jan", found[1])
    # Week and Sunday rows before feast words. A note such as
    # "[2026: Pentecost]" or "[or Ascension]" must not replace the feria.
    if week and dow and "week of advent" in low:
        return ("wd", "advent", week, dow)
    if week and dow and "week of lent" in low:
        return ("wd", "lent", week, dow)
    if week and dow and "week of easter" in low:
        return ("wd", "easter", week, dow)
    if week and dow and re.search(r"\bweek\s+\d+\b", low) and "sunday" not in low:
        return ("wd", "ordinary", week, dow, default_cycle or "1")
    if week and "sunday" in low and "advent" in low:
        return ("sun", "advent", week, cycle or "A")
    if week and "sunday" in low and "lent" in low:
        return ("sun", "lent", week, cycle or "A")
    if week and "sunday" in low and "easter" in low:
        return ("sun", "easter", week, cycle or "A")
    if week and "sunday" in low and ("ordinary" in low or "ord. time" in low or "ord time" in low):
        return ("sun", "ordinary", week, cycle or "A")
    if "baptism" in low:
        return ("id", "baptism", cycle or "A")
    if "after epiphany" in low and dow:
        return ("wd", "after_epiphany", dow)
    if "epiphany of the lord" in low or (low.startswith("the epiphany") or low.startswith("epiphany")):
        return ("id", "epiphany", "ABC")
    if "ash wednesday" in low:
        return ("id", "ash")
    if "after ash" in low and dow:
        return ("wd", "after_ash", dow)
    if "holy week" in low and dow:
        return ("wd", "holy", dow)
    if "holy thursday" in low or "lord’s supper" in low or "lord's supper" in low:
        return ("id", "holy_thursday")
    if "good friday" in low:
        return ("id", "good_friday")
    if "easter vigil" in low:
        return ("id", "easter_vigil")
    if "octave of easter" in low and dow:
        return ("wd", "octave", dow)
    if "mass of easter day" in low or "mass during the day" in low and "easter" in low:
        return ("id", "easter_day", "ABC")
    # Dating clauses ("Friday after Pentecost", "Sunday after Trinity") are not the feast.
    if "sacred heart" in low:
        return ("id", "sacred_heart", cycle or "A")
    if "corpus" in low or "body & blood" in low or "body and blood" in low:
        return ("id", "corpus", cycle or "A")
    if re.search(r"trinity sunday|most holy trinity", low) and "after trinity" not in low:
        return ("id", "trinity", cycle or "A")
    if "pentecost" in low and "after pentecost" not in low:
        if "vigil" in low:
            return ("id", "pentecost_vigil", "ABC")
        return ("id", "pentecost", cycle or "A")
    if "ascension" in low:
        return ("id", "ascension", cycle or "A")
    if "holy family" in low and "st. john" not in low and "apostle" not in low:
        return ("id", "holy_family", cycle or "ABC")
    if "mother of god" in low:
        return ("id", "mary_mother", "ABC")
    if "nativity of the lord" in low or ("christmas" in low and "mass" in low):
        if "vigil" in low:
            mass = "vigil"
        elif "night" in low:
            mass = "night"
        elif "dawn" in low:
            mass = "dawn"
        else:
            mass = "day"
        return ("id", "christmas", mass)
    if "second sunday after christmas" in low or "2nd sunday after christmas" in low:
        return ("id", "christmas_2", "ABC")
    if "palm" in low and "mass" in low:
        return ("id", "palm", "ABC")
    month = re.search(
        r"\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june|july|aug(?:ust)?|sept(?:ember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\.?\s+(\d{1,2})\b",
        low,
    )
    if month and "sunday" not in low:
        number = int(month.group(2))
        name = month.group(1)[:3]
        if name == "dec" and 17 <= number <= 24:
            return ("date", "dec", number)
        if name == "jan" and 1 <= number <= 7:
            return ("date", "jan", number)
        if name == "dec" and number in {29, 30, 31}:
            return ("date", "dec", number)
    return None


def month_day(text: str) -> tuple[int, int] | None:
    match = re.search(
        r"\b(jan|feb|mar|march|apr|april|may|jun|june|jul|july|aug|sep|sept|oct|nov|dec)\.?\s+(\d{1,2})\b",
        text,
        re.I,
    )
    if not match:
        return None
    return MONTHS[match.group(1).lower().rstrip(".")], int(match.group(2))


def add_slot(form: dict, typ: str, parsed: dict) -> None:
    if parsed["refs"]:
        form["r"][typ] = parsed["refs"]
    if typ == "lecture_1" and parsed.get("pair"):
        form["r"]["lecture_2"] = parsed["pair"]
    for year, refs in parsed["year"].items():
        if refs:
            form["alt"].setdefault(year, {})[typ] = refs
    for year, refs in parsed["cycle"].items():
        if refs:
            form["alt"].setdefault(year, {})[typ] = refs


def empty_form(key: tuple, lect: str, name: str) -> dict:
    return {"key": key, "lect": lect.strip(), "name": name.strip()[:160], "r": {}, "alt": {}}


def formulary_from_row(row: list[str], keys: list[str], default_cycle: str | None) -> dict | None:
    if is_header_row(row, keys):
        return None
    label = cell(row, keys, "day") or cell(row, keys, "saint")
    if not label or label.strip() in {".", "x"}:
        return None
    key = classify(label, default_cycle)
    if not key:
        return None
    form = empty_form(key, cell(row, keys, "lect"), label)
    if "easter vigil" in label.lower():
        fill_vigil(form, row, keys)
    else:
        add_slot(form, "lecture_1", parse_cell(cell(row, keys, "first")))
        add_slot(form, "psaume", parse_cell(cell(row, keys, "psalm")))
        add_slot(form, "lecture_2", parse_cell(cell(row, keys, "second")))
        add_slot(form, "evangile", parse_cell(cell(row, keys, "gospel")))
    if not any(form["r"].values()):
        return None
    return form


def numbered_readings(text: str) -> list[str]:
    chunks = re.findall(r"\d\)\s*(.+?)(?=\s+\d\)\s*|$)", re.sub(r"\s+", " ", text))
    refs = []
    for chunk in chunks:
        main = re.split(r"\s+or\s+", chunk, maxsplit=1, flags=re.I)[0]
        got = parse_cell(main)["refs"]
        if got:
            refs.append(got[0])
    return refs


def fill_vigil(form: dict, row: list[str], keys: list[str]) -> None:
    readings = numbered_readings(cell(row, keys, "first"))
    if readings:
        form["r"]["lecture_1"] = readings
    blob = " ".join(row)
    epistle = re.search(r"Rom\s+6:\s*\d[\d\s,–—-]*", blob)
    if epistle:
        got = parse_cell(epistle.group(0))["refs"]
        if got:
            form["r"]["lecture_2"] = got
    psalm = re.search(r"Psalm\s+118:\s*\d[\d\s,+–—-]*", blob)
    if psalm:
        got = parse_cell(psalm.group(0))["refs"]
        if got:
            form["r"]["psaume"] = got
    add_slot(form, "evangile", parse_cell(cell(row, keys, "gospel")))


def sanctoral_form(row: list[str], keys: list[str]) -> dict | None:
    if is_header_row(row, keys):
        return None
    label = cell(row, keys, "saint") or cell(row, keys, "day")
    when = cell(row, keys, "date") or cell(row, keys, "day")
    if not label:
        return None
    low = f"{label} {when}".lower()
    if "mother of the church" in low:
        key = ("sanctoral", "mary_mother_of_the_church", "day")
    else:
        found = month_day(when) or month_day(label)
        if not found:
            return None
        variant = "vigil" if "vigil" in low else "day"
        key = ("sanctoral", found[0], found[1], variant)
    form = empty_form(key, cell(row, keys, "lect"), label)
    form["rank"] = cell(row, keys, "rank")
    form["commons"] = cell(row, keys, "commons")
    add_slot(form, "lecture_1", parse_cell(cell(row, keys, "first")))
    add_slot(form, "psaume", parse_cell(cell(row, keys, "psalm")))
    add_slot(form, "lecture_2", parse_cell(cell(row, keys, "second")))
    add_slot(form, "evangile", parse_cell(cell(row, keys, "gospel")))
    if "evangile" not in form["r"]:
        return None
    return form


def index_rows(table: list[list[str]]) -> list[dict]:
    keys = colmap(table[0])
    if "gospel" in keys and "first" in keys:
        return []
    if not any(key in keys for key in ("lect", "reading", "first")):
        return []
    out = []
    for row in table[1:]:
        if is_header_row(row, keys):
            continue
        raw = cell(row, keys, "reading") or cell(row, keys, "first") or cell(row, keys, "psalm") or cell(row, keys, "gospel")
        parsed = parse_cell(raw)
        lect = cell(row, keys, "lect")
        when = cell(row, keys, "day") or cell(row, keys, "saint")
        year = cell(row, keys, "year")
        for ref in parsed["refs"]:
            out.append({"ref": ref, "lect": lect.strip(), "when": when.strip()[:120], "year": year.strip()})
    return out


def parse_dir(folder: Path) -> tuple[dict[tuple, dict], list[dict], list[str]]:
    forms: dict[tuple, dict] = {}
    index: list[dict] = []
    missed: list[str] = []
    for path in sorted(folder.glob("*.htm")):
        parser = Tables()
        parser.feed(path.read_text(errors="replace"))
        default = None
        if path.name.endswith("OT-I.htm"):
            default = "1"
        elif path.name.endswith("OT-II.htm"):
            default = "2"
        for table in parser.tables:
            keys = colmap(table[0])
            if "gospel" in keys and ("first" in keys or "day" in keys or "saint" in keys):
                builder = sanctoral_form if "saint" in keys or "commons" in keys else formulary_from_row
                for row in table[1:]:
                    if builder is formulary_from_row:
                        form = formulary_from_row(row, keys, default)
                    else:
                        form = sanctoral_form(row, keys)
                    if form:
                        forms[form["key"]] = form
                    elif not is_header_row(row, keys):
                        label = cell(row, keys, "day") or cell(row, keys, "saint")
                        if label and label not in {".", "x"} and "first reading" not in label.lower():
                            missed.append(f"{path.name}: {label[:80]}")
            else:
                index.extend(index_rows(table))
    return forms, index, missed


def key_text(key: tuple) -> str:
    return "|".join(str(part) for part in key)


def public_row(form: dict) -> dict:
    order = ["lecture_1", "psaume", "lecture_2", "evangile"]
    refs = []
    for typ in order:
        for ref in form["r"].get(typ, []):
            refs.append([typ, ref])
    row = {"key": key_text(form["key"]), "lect": form["lect"], "name": form["name"], "r": refs}
    if form["alt"]:
        row["alt"] = {
            cycle: {typ: refs_for[typ][0] if len(refs_for[typ]) == 1 else refs_for[typ]
                    for typ in refs_for}
            for cycle, refs_for in form["alt"].items()
        }
    if form.get("rank"):
        row["rank"] = form["rank"]
    if form.get("commons"):
        row["commons"] = form["commons"]
    return row


def materialize(form: dict, sunday_cycle: str) -> list[list[str]]:
    cycle = {"YEAR_A": "A", "YEAR_B": "B", "YEAR_C": "C"}.get(sunday_cycle, "")
    alt = form["alt"].get(cycle, {}) if cycle else {}
    out = []
    for typ in ("lecture_1", "psaume", "lecture_2", "evangile"):
        chosen = alt.get(typ) or form["r"].get(typ) or []
        for ref in chosen:
            if ref:
                out.append([typ, ref])
    if not any(typ == "evangile" for typ, _ref in out):
        return []
    return out


def lookup(forms: dict[tuple, dict], key: tuple, sunday_cycle: str) -> list[list[str]] | None:
    form = forms.get(key)
    if form is None and key and key[-1] in {"A", "B", "C"}:
        form = forms.get((*key[:-1], "ABC")) or forms.get((*key[:-1], "A"))
    if form is None:
        return None
    refs = materialize(form, sunday_cycle)
    return refs or None


def parse_iso(value: str) -> date:
    year, month, day = (int(part) for part in value.split("-"))
    return date(year, month, day)


def index_dates(days: list[dict]) -> dict[str, list[str]]:
    found: dict[str, list[str]] = defaultdict(list)
    for row in days:
        found[row["id"]].append(row["date"])
    return found


def previous(found: dict[str, list[str]], ident: str, iso: str) -> str | None:
    dates = found.get(ident) or []
    prior = [value for value in dates if value <= iso]
    return prior[-1] if prior else None


def following(found: dict[str, list[str]], ident: str, iso: str) -> str | None:
    dates = found.get(ident) or []
    later = [value for value in dates if value >= iso]
    return later[0] if later else None


def sunday_on_or_before(iso: str) -> date:
    current = parse_iso(iso)
    return current - timedelta(days=(current.weekday() + 1) % 7)


def feria_key(iso: str, found: dict[str, list[str]]) -> tuple | None:
    current = parse_iso(iso)
    dow = WEEKDAY_FR[current.weekday()]
    baptism = previous(found, "baptism_of_the_lord", iso)
    ash = following(found, "ash_wednesday", iso)
    if baptism and ash and baptism <= iso < ash and (parse_iso(ash) - parse_iso(baptism)).days < 90:
        week = 1 + (current - parse_iso(baptism)).days // 7
        if dow != "sunday":
            return ("wd", "ordinary", week, dow, None)
    pentecost = previous(found, "pentecost_sunday", iso)
    advent = following(found, "advent_1_sunday", iso)
    if (
        pentecost and advent and pentecost < iso < advent
        and (parse_iso(advent) - parse_iso(pentecost)).days < 220
    ):
        ctk = previous(found, "christ_the_king_sunday", advent)
        if ctk and dow != "sunday":
            week = 34 - (parse_iso(ctk) - sunday_on_or_before(iso)).days // 7
            if 1 <= week <= 34:
                return ("wd", "ordinary", week, dow, None)
    advent_start = previous(found, "advent_1_sunday", iso)
    if advent_start and advent_start <= iso < f"{current.year}-12-25" and current.month == 12:
        if 17 <= current.day <= 24 and dow != "sunday":
            return ("date", "dec", current.day)
        week = 1 + (current - parse_iso(advent_start)).days // 7
        if dow != "sunday" and 1 <= week <= 4:
            return ("wd", "advent", week, dow)
    easter = previous(found, "easter_sunday", iso)
    next_pentecost = following(found, "pentecost_sunday", iso)
    if (
        easter and next_pentecost and easter <= iso < next_pentecost
        and (parse_iso(next_pentecost) - parse_iso(easter)).days < 60
    ):
        easter_d = parse_iso(easter)
        if 0 < (current - easter_d).days < 7:
            return ("wd", "octave", dow)
        week = 1 + (current - easter_d).days // 7
        if dow != "sunday" and 2 <= week <= 7:
            return ("wd", "easter", week, dow)
    ash_prev = previous(found, "ash_wednesday", iso)
    easter_next = following(found, "easter_sunday", iso)
    if ash_prev and easter_next and ash_prev <= iso < easter_next and (parse_iso(easter_next) - parse_iso(ash_prev)).days < 50:
        ash_d = parse_iso(ash_prev)
        if current == ash_d:
            return ("id", "ash")
        lent1 = ash_d + timedelta(days=4)
        palm = parse_iso(easter_next) - timedelta(days=7)
        if ash_d < current < lent1:
            return ("wd", "after_ash", dow)
        if lent1 < current < palm and dow != "sunday":
            week = 1 + (current - lent1).days // 7
            return ("wd", "lent", week, dow)
        if palm < current < parse_iso(easter_next):
            return ("wd", "holy", dow)
    epiphany = previous(found, "epiphany", iso)
    if baptism and epiphany and epiphany < iso < baptism and dow != "sunday":
        return ("wd", "after_epiphany", dow)
    this_epiphany = following(found, "epiphany", iso)
    if (
        this_epiphany
        and current.month == 1
        and parse_iso(this_epiphany).year == current.year
        and current < parse_iso(this_epiphany)
        and 2 <= current.day <= 7
    ):
        return ("date", "jan", current.day)
    if current.month == 12 and current.day in {29, 30, 31}:
        return ("date", "dec", current.day)
    return None


EXPLICIT = {
    "christ_the_king_sunday": lambda info: ("sun", "ordinary", 34, info["sunday_cycle"][-1]),
    "sunday_of_the_word_of_god": lambda info: ("sun", "ordinary", 3, info["sunday_cycle"][-1]),
    "divine_mercy_sunday": lambda info: ("sun", "easter", 2, info["sunday_cycle"][-1]),
    "advent_1_sunday": lambda info: ("sun", "advent", 1, info["sunday_cycle"][-1]),
    "baptism_of_the_lord": lambda info: ("id", "baptism", info["sunday_cycle"][-1]),
    "epiphany": lambda _info: ("id", "epiphany", "ABC"),
    "holy_family": lambda info: ("id", "holy_family", info["sunday_cycle"][-1]),
    "mary_mother_of_god": lambda _info: ("id", "mary_mother", "ABC"),
    "christmas": lambda _info: ("id", "christmas", "day"),
    "palm_sunday": lambda _info: ("id", "palm", "ABC"),
    "ash_wednesday": lambda _info: ("id", "ash"),
    "holy_thursday": lambda _info: ("id", "holy_thursday"),
    "good_friday": lambda _info: ("id", "good_friday"),
    "holy_saturday": lambda _info: ("id", "easter_vigil"),
    "easter_sunday": lambda _info: ("id", "easter_day", "ABC"),
    "ascension": lambda info: ("id", "ascension", info["sunday_cycle"][-1]),
    "pentecost_sunday": lambda info: ("id", "pentecost", info["sunday_cycle"][-1]),
    "trinity_sunday": lambda info: ("id", "trinity", info["sunday_cycle"][-1]),
    "corpus_christi": lambda info: ("id", "corpus", info["sunday_cycle"][-1]),
    "most_sacred_heart_of_jesus": lambda info: ("id", "sacred_heart", info["sunday_cycle"][-1]),
    "mary_mother_of_the_church": lambda _info: ("sanctoral", "mary_mother_of_the_church", "day"),
}


def explicit_key(info: dict) -> tuple | None:
    ident = info["id"]
    if ident in EXPLICIT:
        return EXPLICIT[ident](info)
    match = re.fullmatch(r"ordinary_time_(\d+)_(monday|tuesday|wednesday|thursday|friday|saturday)", ident)
    if match:
        year = "1" if info["weekday_cycle"] == "YEAR_1" else "2"
        return ("wd", "ordinary", int(match.group(1)), match.group(2), year)
    match = re.fullmatch(r"ordinary_time_(\d+)_sunday", ident)
    if match:
        return ("sun", "ordinary", int(match.group(1)), info["sunday_cycle"][-1])
    match = re.fullmatch(r"advent_(\d+)_(monday|tuesday|wednesday|thursday|friday|saturday|sunday)", ident)
    if match:
        if match.group(2) == "sunday":
            return ("sun", "advent", int(match.group(1)), info["sunday_cycle"][-1])
        return ("wd", "advent", int(match.group(1)), match.group(2))
    match = re.fullmatch(r"advent_december_(\d+)", ident)
    if match:
        return ("date", "dec", int(match.group(1)))
    match = re.fullmatch(r"lent_(\d+)_(monday|tuesday|wednesday|thursday|friday|saturday|sunday)", ident)
    if match:
        if match.group(2) == "sunday":
            return ("sun", "lent", int(match.group(1)), info["sunday_cycle"][-1])
        return ("wd", "lent", int(match.group(1)), match.group(2))
    match = re.fullmatch(r"(monday|tuesday|wednesday|thursday|friday|saturday)_after_ash_wednesday", ident)
    if match:
        return ("wd", "after_ash", match.group(1))
    match = re.fullmatch(r"holy_(monday|tuesday|wednesday)", ident)
    if match:
        return ("wd", "holy", match.group(1))
    match = re.fullmatch(r"easter_(monday|tuesday|wednesday|thursday|friday|saturday)", ident)
    if match:
        return ("wd", "octave", match.group(1))
    match = re.fullmatch(r"easter_time_(\d+)_(monday|tuesday|wednesday|thursday|friday|saturday|sunday)", ident)
    if match:
        if match.group(2) == "sunday":
            return ("sun", "easter", int(match.group(1)), info["sunday_cycle"][-1])
        return ("wd", "easter", int(match.group(1)), match.group(2))
    match = re.fullmatch(r"(monday|tuesday|wednesday|thursday|friday|saturday)_after_epiphany", ident)
    if match:
        return ("wd", "after_epiphany", match.group(1))
    match = re.fullmatch(r"christmas_time_january_(\d+)", ident)
    if match:
        return ("date", "jan", int(match.group(1)))
    match = re.fullmatch(r"christmas_octave_day_(\d+)", ident)
    if match:
        return ("date", "dec", 24 + int(match.group(1)))
    return None


def sanctoral_key_for(info: dict, forms: dict[tuple, dict]) -> tuple | None:
    ident = info["id"]
    if ident == "mary_mother_of_the_church":
        return ("sanctoral", ident, "day")
    for (month, day), mapped in SANCTORAL_ID.items():
        if mapped == ident:
            day_key = ("sanctoral", month, day, "day")
            vigil_key = ("sanctoral", month, day, "vigil")
            if day_key in forms:
                return day_key
            if vigil_key in forms:
                return vigil_key
    return None


def proper_allowed(form: dict, rank: str) -> bool:
    if "evangile" not in form["r"]:
        return False
    commons = (form.get("commons") or "").strip().upper()
    if rank in {"Fête", "Solennité"}:
        return True
    return commons.startswith("PROPER")


def with_year(key: tuple, year: str) -> tuple:
    if key[:2] == ("wd", "ordinary") and len(key) == 5 and key[-1] is None:
        return (*key[:-1], year)
    return key


def refs_for_day(info: dict, forms: dict[tuple, dict], found: dict[str, list[str]]) -> list[list[str]] | None:
    year = "1" if info["weekday_cycle"] == "YEAR_1" else "2"
    ident_key = explicit_key(info)
    if ident_key:
        refs = lookup(forms, with_year(ident_key, year), info["sunday_cycle"])
        if refs:
            return refs
    saint = sanctoral_key_for(info, forms)
    if saint and proper_allowed(forms[saint], info["rank"]):
        refs = lookup(forms, saint, info["sunday_cycle"])
        if refs:
            return refs
    # A feast or solemnity without a proper formulary stays empty (All Souls).
    if info["rank"] in {"Fête", "Solennité"}:
        return None
    feria = feria_key(info["date"], found)
    if feria:
        return lookup(forms, with_year(feria, year), info["sunday_cycle"])
    return None


def usable(refs: list) -> bool:
    if not refs:
        return False
    for typ, ref in refs:
        if not ref or "CALENDRIER" in ref or len(ref) > 160 or not re.search(r"\d", ref):
            return False
    return True


def book_chap(ref: str) -> tuple[str, int] | None:
    ref = ref.split("(ou")[0]
    match = re.match(r"((?:[123]\s+)?[A-Za-zÉéèêàùçÎû]+)\s+(\d+)", ref)
    if not match:
        return None
    book = match.group(1).lower().replace("é", "e")
    return CANON.get(book, book), int(match.group(2))


def gospel_of(refs: list) -> tuple[str, int] | None:
    for typ, ref in refs:
        if typ == "evangile":
            return book_chap(ref)
    return None


def self_test() -> None:
    samples = {
        "Isa 2:1-5": "Is 2, 1-5",
        "Ps 122:1-2, 3-4a, 4b-5": "Ps 122, 1-2, 3-4a, 4b-5",
        "Isa 52:13—53:12": "Is 52, 13 – 53, 12",
        "Gen 2:7-9; 3:1-7": "Gn 2, 7-9 ; 3, 1-7",
        "1 Cor 3:9c-11, 16-17": "1 Co 3, 9c-11, 16-17",
        "Ps 104:1+24, 29-30, 31+34": "Ps 104, 1, 24, 29-30, 31, 34",
        "Matt 9:35—10:1, 5a, 6-8": "Mt 9, 35 – 10, 1, 5a, 6-8",
        "2 Cor 5:20—6:2": "2 Co 5, 20 – 6, 2",
        "John 20:1a+2-8": "Jn 20, 1a, 2-8",
        "Heb 4:14-16; 5:7-9": "He 4, 14-16 ; 5, 7-9",
    }
    for raw, expected in samples.items():
        got = parse_cell(raw)["refs"]
        if got != [expected]:
            raise SystemExit(f"convert {raw!r} → {got!r} attendu {expected!r}")
    short = parse_cell("Matt 1:1-25 or 1:18-25")["refs"]
    if short != ["Mt 1, 1-25 (ou : 1, 18-25)"]:
        raise SystemExit(f"forme brève: {short}")
    labels = {
        "6th Week of Easter - Thurs [or Ascension of the Lord]": ("wd", "easter", 6, "thursday"),
        "Ascension of the Lord – A (note)": ("id", "ascension", "A"),
        "8th Sunday in Ordinary Time - A [2026: Pentecost]": ("sun", "ordinary", 8, "A"),
        "10th Sunday in Ordinary Time - A [2026: Body & Blood of Christ]": ("sun", "ordinary", 10, "A"),
        "7th Sunday in Ordinary Time - B [2027: Pentecost Sunday]": ("sun", "ordinary", 7, "B"),
        "Friday after the Second Sunday after Pentecost: Solemnity of the Most Sacred Heart of Jesus - A": (
            "id", "sacred_heart", "A",
        ),
        "Sunday after Trinity Sunday: Solemnity of the Most Holy Body and Blood of Christ - A": (
            "id", "corpus", "A",
        ),
        "Sunday after Pentecost: Solemnity of the Most Holy Trinity - A": ("id", "trinity", "A"),
        "Pentecost Sunday: Mass during the Day – A": ("id", "pentecost", "A"),
        "Pentecost Sunday: At the Vigil Mass – ABC": ("id", "pentecost_vigil", "ABC"),
    }
    for label, expected in labels.items():
        got = classify(label)
        if got != expected:
            raise SystemExit(f"classe {label!r} → {got!r} attendu {expected!r}")
    stolen = classify(
        "June 24: The Nativity of St. John the Baptist: Day "
        "(exceptions for 2033 and 2044, since Friday is the Solemnity of the Sacred Heart of Jesus)"
    )
    if stolen is not None:
        raise SystemExit(f"note du Baptiste classée {stolen!r}")
    both = parse_cell("Joel 2:12-18 and 2 Cor 5:20—6:2")
    if both["refs"] != ["Jl 2, 12-18"] or both["pair"] != ["2 Co 5, 20 – 6, 2"]:
        raise SystemExit(f"and: {both}")
    year = parse_cell("Matt 14:13-21 or, in Year A, Matt 14:22-36")
    if year["refs"] != ["Mt 14, 13-21"] or year["year"].get("A") != ["Mt 14, 22-36"]:
        raise SystemExit(f"year alt: {year}")


def write_outputs(forms: dict[tuple, dict], index: list[dict]) -> None:
    OUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    rows = [public_row(form) for _key, form in sorted(forms.items(), key=lambda item: key_text(item[0]))]
    payload = {
        "source": "https://catholic-resources.org/Lectionary/",
        "edition": "Lectionary for Mass, 1998/2002 USA, tables of Felix Just, S.J.",
        "note": (
            "Citations seules, abréviations françaises, numéros de psaumes hébreux. "
            "Pas le commentaire. L'index reprend citation, numéro et jour ; "
            "la colonne descriptive des index est laissée de côté."
        ),
        "formulaires": rows,
        "index": index,
    }
    OUT_JSON.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    if OUT_DB.exists():
        OUT_DB.unlink()
    db = sqlite3.connect(OUT_DB)
    db.execute(
        "CREATE TABLE formulaires (key TEXT PRIMARY KEY, lect TEXT, name TEXT, refs TEXT)"
    )
    db.execute(
        "CREATE TABLE index_ecriture (ref TEXT, lect TEXT, jour TEXT, annee TEXT)"
    )
    db.executemany(
        "INSERT INTO formulaires VALUES (?,?,?,?)",
        [(row["key"], row["lect"], row["name"], json.dumps(row["r"], ensure_ascii=False)) for row in rows],
    )
    db.executemany(
        "INSERT INTO index_ecriture VALUES (?,?,?,?)",
        [(row["ref"], row["lect"], row["when"], row["year"]) for row in index],
    )
    db.commit()
    db.close()


def main() -> int:
    self_test()
    parser = argparse.ArgumentParser()
    parser.add_argument("--html", type=Path, default=Path("/tmp/felix"))
    args = parser.parse_args()
    forms, index, missed = parse_dir(args.html)
    write_outputs(forms, index)
    calendar = json.loads(CAL.read_text(encoding="utf-8"))
    cal_days = calendar["days"]
    found = index_dates(cal_days)
    stock_rows = {row["d"]: row for row in json.loads(STOCK.read_text(encoding="utf-8"))["days"]}
    cal_by_date = {row["date"]: row for row in cal_days}
    compared = matched = 0
    mismatches = []
    for iso, stock in stock_rows.items():
        if not usable(stock.get("r") or []):
            continue
        info = cal_by_date.get(iso)
        if not info or info["rank"] == "Mémoire":
            continue
        proposed = refs_for_day(info, forms, found)
        left = gospel_of(stock["r"])
        right = gospel_of(proposed or [])
        if not left or not right:
            continue
        compared += 1
        if left == right:
            matched += 1
        elif len(mismatches) < 12:
            mismatches.append((iso, info["id"], left, right))
    rate = matched / compared if compared else 0
    print(f"formulaires {len(forms)}, index {len(index)}, non classés {len(missed)}")
    print(f"évangile stock vs felix: {matched}/{compared} ({rate:.1%})")
    for item in mismatches:
        print("  écart", item)
    if missed[:8]:
        print("exemples non classés:")
        for line in missed[:8]:
            print(" ", line)
    if compared < 50 or rate < 0.8:
        print("seuil non atteint, mdj-ordo.json inchangé")
        return 1
    ordo = json.loads(ORDO.read_text(encoding="utf-8"))
    archive_dates = {
        row["d"]
        for row in json.loads(STOCK.read_text(encoding="utf-8"))["days"]
        if usable(row.get("r") or [])
    }
    kept = filled = replaced = empty = 0
    empty_ids: Counter = Counter()
    for row, info in zip(ordo["days"], cal_days):
        if row["d"] != info["date"]:
            raise SystemExit(f"décalage {row['d']} / {info['date']}")
        existing = row.get("r") or []
        proposal = refs_for_day(info, forms, found)
        # Archive days stay as printed. Copied stock stays when the gospel
        # chapter already matches; a year-A copy on year B/C is replaced.
        if usable(existing) and (
            row["d"] in archive_dates
            or (gospel_of(existing) and gospel_of(existing) == gospel_of(proposal or []))
            or not proposal
        ):
            kept += 1
            continue
        if proposal:
            row["r"] = proposal
            if usable(existing):
                replaced += 1
            else:
                filled += 1
        else:
            empty += 1
            empty_ids[info["id"]] += 1
    ordo["lectionnaire"] = "felix-just-1998-2002"
    ordo["note"] = (
        "Jours de l'archive française conservés. Autres jours : stock gardé si l'évangile "
        "a le même livre et chapitre, sinon tables de Felix Just (citations, psaumes hébreux). "
        "Mémoires : férie. Toussaint des morts : formulaire multiple, stock seulement s'il existe."
    )
    ORDO.write_text(json.dumps(ordo, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    print(f"ordo: {kept} conservés, {filled} complétés, {replaced} cycles corrigés, {empty} sans référence")
    print("jours vides les plus fréquents:")
    for ident, count in empty_ids.most_common(12):
        print(f"  {count:4} {ident}")
    probes = [
        "2026-11-29", "2027-01-11", "2027-01-17", "2026-02-18", "2026-04-06",
        "2026-12-25", "2027-06-06", "2026-05-25", "2026-11-02", "2029-11-09",
        "2030-02-17", "2028-11-26", "2026-05-14", "2027-05-06", "2027-05-16",
        "2026-05-31", "2026-06-07", "2026-06-12", "2026-04-29", "2026-05-02",
    ]
    by_out = {row["d"]: row for row in ordo["days"]}
    for iso in probes:
        refs = by_out[iso]["r"]
        shown = " | ".join(ref for _typ, ref in refs) if refs else "—"
        print(iso, cal_by_date[iso]["id"], shown[:180])
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
