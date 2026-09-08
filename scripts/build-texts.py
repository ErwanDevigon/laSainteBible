#!/usr/bin/env python3
"""
texts/*.json → data/livres/{version}/ + js/books.js
Name-first mapping (source nr is Protestant 1–66, not canon nr).
"""
from __future__ import annotations

import json
import re
import sys
import unicodedata
from collections import defaultdict
from pathlib import Path
from typing import Any

from canon import BOOKS, BY_ID, BY_NR, books_for_canon
from titles import DIDACTIC, didactic_title

ROOT = Path(__file__).resolve().parents[1]
TEXTS = ROOT / "texts"
OUT_BASE = ROOT / "data" / "livres"
NESTLE_DIR = ROOT / "data" / "evangiles" / "septante"
JS_BOOKS = ROOT / "js" / "books.js"

VERSIONS = {
    "segond-1910": {
        "id": "segond-1910",
        "label": "Louis Segond 1910",
        "name": "Louis Segond",
        "blurb": "Traduction de Louis Segond · 1910",
        "year": 1910,
        "lang": "fr",
        "license": "public-domain",
        "source": "Louis Segond 1910",
        "abbreviation": "ls1910",
        "canon": "protestant",
        "file": "ls1910.json",
        "at": "Ancien Testament",
        "nt": "Nouveau Testament",
    },
    "martin": {
        "id": "martin",
        "label": "David Martin 1744",
        "name": "David Martin",
        "blurb": "Traduction de David Martin · 1744",
        "year": 1744,
        "lang": "fr",
        "license": "public-domain",
        "source": "David Martin (rév. Pierre Roques)",
        "abbreviation": "martin",
        "canon": "protestant",
        "file": "martin.json",
        "at": "Ancien Testament",
        "nt": "Nouveau Testament",
    },
    "darby": {
        "id": "darby",
        "label": "John Nelson Darby",
        "name": "J. N. Darby",
        "blurb": "Traduction de J. N. Darby · 1885",
        "year": 1885,
        "lang": "fr",
        "license": "public-domain",
        "source": "J.N. Darby (Bible complète)",
        "abbreviation": "darby",
        "canon": "protestant",
        "file": "darby.json",
        "at": "Ancien Testament",
        "nt": "Nouveau Testament",
    },
    "ostervald": {
        "id": "ostervald",
        "label": "Ostervald",
        "name": "Ostervald",
        "blurb": "Traduction d'Ostervald · 1744",
        "year": 1744,
        "lang": "fr",
        "license": "public-domain",
        "source": "Jean-Frédéric Ostervald",
        "abbreviation": "ostervald",
        "canon": "protestant",
        "file": "ostervald.json",
        "at": "Ancien Testament",
        "nt": "Nouveau Testament",
    },
    "crampon": {
        "id": "crampon",
        "label": "Crampon 1923",
        "name": "Augustin Crampon",
        "blurb": "Traduction d'Augustin Crampon · 1923",
        "year": 1923,
        "lang": "fr",
        "license": "public-domain",
        "source": "Augustin Crampon",
        "abbreviation": "crampon",
        "canon": "catholic",
        "file": "crampon.json",
        "at": "Ancien Testament",
        "nt": "Nouveau Testament",
    },
    "vulgate": {
        "id": "vulgate",
        "label": "Vulgate (Clementine)",
        "name": "Vulgata Clementina",
        "blurb": "Vulgata Clementina · 1592",
        "year": 1592,
        "lang": "la",
        "license": "public-domain",
        "source": "Vulgata Clementina",
        "abbreviation": "vulgate",
        "canon": "catholic",
        "file": "vulgate.json",
        "at": "Vetus Testamentum",
        "nt": "Novum Testamentum",
    },
    "septante": {
        "id": "septante",
        "label": "Septante (LXX)",
        "name": "Septante (LXX)",
        "blurb": "Οἱ Ἑβδομήκοντα",
        "year": -250,
        "year_label": "-250 av. J.C",
        "lang": "el",
        "license": "public-domain",
        "source": "Septante",
        "abbreviation": "lxx",
        "canon": "orthodox",
        "file": "lxx.json",
        "at": "Παλαιὰ Διαθήκη",
        "nt": "Καινὴ Διαθήκη",
    },
    "textusreceptus": {
        "id": "textusreceptus",
        "label": "Textus Receptus",
        "name": "Textus Receptus",
        "blurb": "Textus Receptus · 1550",
        "year": 1550,
        "lang": "el",
        "license": "public-domain",
        "source": "Textus Receptus (Stephanus)",
        "abbreviation": "textusreceptus",
        "canon": "protestant",
        "file": "textusreceptus.json",
        "at": "Παλαιὰ Διαθήκη",
        "nt": "Καινὴ Διαθήκη",
    },
    "tischendorf": {
        "id": "tischendorf",
        "label": "Tischendorf",
        "name": "Tischendorf",
        "blurb": "Tischendorf · 1872",
        "year": 1872,
        "lang": "el",
        "license": "public-domain",
        "source": "Constantin von Tischendorf (8e éd.)",
        "abbreviation": "tischendorf",
        "canon": "protestant",
        "file": "tischendorf.json",
        "at": "Παλαιὰ Διαθήκη",
        "nt": "Καινὴ Διαθήκη",
    },
    "westcotthort": {
        "id": "westcotthort",
        "label": "Westcott-Hort",
        "name": "Westcott & Hort",
        "blurb": "Westcott & Hort · 1881",
        "year": 1881,
        "lang": "el",
        "license": "public-domain",
        "source": "Westcott & Hort",
        "abbreviation": "westcotthort",
        "canon": "protestant",
        "file": "westcotthort.json",
        "at": "Παλαιὰ Διαθήκη",
        "nt": "Καινὴ Διαθήκη",
    },
    "moderngreek": {
        "id": "moderngreek",
        "label": "Grec moderne",
        "name": "Grec moderne",
        "blurb": "Ἡ Ἁγία Γραφή · 1850",
        "year": 1850,
        "lang": "el",
        "license": "public-domain",
        "source": "Neophytos Vamvas (1850)",
        "abbreviation": "moderngreek",
        "canon": "protestant",
        "file": "moderngreek.json",
        "at": "Παλαιὰ Διαθήκη",
        "nt": "Καινὴ Διαθήκη",
    },
}

# Protestant / KJV 1–66 → canon nr (used only if the name is unknown).
PROTESTANT_NR = {
    1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7, 8: 31,
    9: 8, 10: 9, 11: 10, 12: 11, 13: 38, 14: 39,
    15: 36, 16: 37, 17: 34, 18: 29, 19: 27, 20: 28,
    21: 33, 22: 30, 23: 12, 24: 13, 25: 32, 26: 14, 27: 35,
    28: 15, 29: 16, 30: 17, 31: 18, 32: 19, 33: 20, 34: 21,
    35: 22, 36: 23, 37: 24, 38: 25, 39: 26,
    40: 50, 41: 51, 42: 52, 43: 53, 44: 54, 45: 55,
    46: 56, 47: 57, 48: 58, 49: 59, 50: 60, 51: 61,
    52: 62, 53: 63, 54: 64, 55: 65, 56: 66, 57: 67,
    58: 68, 59: 69, 60: 70, 61: 71, 62: 72, 63: 73,
    64: 74, 65: 75, 66: 76,
}

# Extra nrs used by some LXX dumps.
LXX_EXTRA_NR = {
    69: 40, 70: 41, 73: 42, 74: 43, 75: 44,
    80: 45, 81: 46, 82: 47, 83: 48,
}

GOSPEL_IDS = ("matthieu", "marc", "luc", "jean")

SECTIONS = [
    {"id": "torah", "testament": "at", "label": "Pentateuque"},
    {"id": "neviim", "testament": "at", "label": "Prophètes"},
    {"id": "ketuvim", "testament": "at", "label": "Écrits"},
    {"id": "deuterocanoniques", "testament": "at", "label": "Deutérocanoniques"},
    {"id": "evangiles", "testament": "nt", "label": "Évangiles"},
    {"id": "actes", "testament": "nt", "label": "Actes"},
    {"id": "epitres", "testament": "nt", "label": "Épîtres"},
    {"id": "apocalypse", "testament": "nt", "label": "Apocalypse"},
]

# Didactic Christian TOC (protestant skeleton; extra ids appear only if present).
TOC_SECTIONS = [
    {
        "id": "pentateuque",
        "testament": "at",
        "label": "Pentateuque",
        "ids": ["genese", "exode", "levitique", "nombres", "deuteronome"],
    },
    {
        "id": "historiques",
        "testament": "at",
        "label": "Livres historiques",
        "ids": [
            "josue", "juges", "ruth", "1-samuel", "2-samuel", "1-rois", "2-rois",
            "1-chroniques", "2-chroniques", "esdras", "nehemie",
            "tobie", "judith", "esther",
            "1-maccabees", "2-maccabees", "3-maccabees", "4-maccabees",
        ],
    },
    {
        "id": "poetiques",
        "testament": "at",
        "label": "Livres poétiques",
        "ids": [
            "job", "psaumes", "psaume-151", "proverbes", "ecclesiaste", "cantique",
            "sagesse", "siracide",
        ],
    },
    {
        "id": "prophetes",
        "testament": "at",
        "label": "Prophètes",
        "ids": [
            "esaie", "jeremie", "lamentations", "baruch", "ezechiel", "daniel",
            "osee", "joel", "amos", "abdias", "jonas", "michee",
            "nahum", "habacuc", "sophonie", "aggee", "zacharie", "malachie",
        ],
    },
    {
        "id": "evangiles",
        "testament": "nt",
        "label": "Évangiles",
        "ids": ["matthieu", "marc", "luc", "jean"],
    },
    {"id": "actes", "testament": "nt", "label": "Actes", "ids": ["actes"]},
    {
        "id": "epitres",
        "testament": "nt",
        "label": "Épîtres",
        "ids": [
            "romains", "1-corinthiens", "2-corinthiens", "galates", "ephesiens",
            "philippiens", "colossiens", "1-thessaloniciens", "2-thessaloniciens",
            "1-timothee", "2-timothee", "tite", "philemon", "hebreux",
            "jacques", "1-pierre", "2-pierre", "1-jean", "2-jean", "3-jean", "jude",
        ],
    },
    {"id": "apocalypse", "testament": "nt", "label": "Apocalypse", "ids": ["apocalypse"]},
]

GREEK_TITLES = {
    "genese": "Γένεσις",
    "exode": "Ἔξοδος",
    "levitique": "Λευϊτικόν",
    "nombres": "Ἀριθμοί",
    "deuteronome": "Δευτερονόμιον",
    "josue": "Ἰησοῦς Ναυῆ",
    "juges": "Κριταί",
    "ruth": "Ῥούθ",
    "1-samuel": "Βασιλειῶν Αʹ",
    "2-samuel": "Βασιλειῶν Βʹ",
    "1-rois": "Βασιλειῶν Γʹ",
    "2-rois": "Βασιλειῶν Δʹ",
    "1-chroniques": "Παραλειπομένων Αʹ",
    "2-chroniques": "Παραλειπομένων Βʹ",
    "esdras": "Ἔσδρας",
    "nehemie": "Νεεμίας",
    "esther": "Ἐσθήρ",
    "job": "Ἰώβ",
    "psaumes": "Ψαλμοί",
    "psaume-151": "Ψαλμὸς ΡΝΑʹ",
    "proverbes": "Παροιμίαι",
    "ecclesiaste": "Ἐκκλησιαστής",
    "cantique": "Ἆσμα Ἀσμάτων",
    "esaie": "Ἠσαΐας",
    "jeremie": "Ἰερεμίας",
    "lamentations": "Θρῆνοι",
    "ezechiel": "Ἰεζεκιήλ",
    "daniel": "Δανιήλ",
    "osee": "Ὡσηέ",
    "joel": "Ἰωήλ",
    "amos": "Ἀμώς",
    "abdias": "Ἀβδιού",
    "jonas": "Ἰωνᾶς",
    "michee": "Μιχαίας",
    "nahum": "Ναούμ",
    "habacuc": "Ἀμβακούμ",
    "sophonie": "Σοφονίας",
    "aggee": "Ἀγγαῖος",
    "zacharie": "Ζαχαρίας",
    "malachie": "Μαλαχίας",
    "tobie": "Τωβίτ",
    "judith": "Ἰουδίθ",
    "sagesse": "Σοφία Σολομῶντος",
    "siracide": "Σοφία Σειράχ",
    "baruch": "Βαρούχ",
    "1-maccabees": "Μακκαβαίων Αʹ",
    "2-maccabees": "Μακκαβαίων Βʹ",
    "3-maccabees": "Μακκαβαίων Γʹ",
    "4-maccabees": "Μακκαβαίων Δʹ",
    "matthieu": "Κατὰ Ματθαῖον",
    "marc": "Κατὰ Μᾶρκον",
    "luc": "Κατὰ Λουκᾶν",
    "jean": "Κατὰ Ἰωάννην",
    "actes": "Πράξεις Ἀποστόλων",
    "romains": "Πρὸς Ῥωμαίους",
    "1-corinthiens": "Πρὸς Κορινθίους Αʹ",
    "2-corinthiens": "Πρὸς Κορινθίους Βʹ",
    "galates": "Πρὸς Γαλάτας",
    "ephesiens": "Πρὸς Ἐφεσίους",
    "philippiens": "Πρὸς Φιλιππησίους",
    "colossiens": "Πρὸς Κολοσσαεῖς",
    "1-thessaloniciens": "Πρὸς Θεσσαλονικεῖς Αʹ",
    "2-thessaloniciens": "Πρὸς Θεσσαλονικεῖς Βʹ",
    "1-timothee": "Πρὸς Τιμόθεον Αʹ",
    "2-timothee": "Πρὸς Τιμόθεον Βʹ",
    "tite": "Πρὸς Τίτον",
    "philemon": "Πρὸς Φιλήμονα",
    "hebreux": "Πρὸς Ἑβραίους",
    "jacques": "Ἰακώβου",
    "1-pierre": "Πέτρου Αʹ",
    "2-pierre": "Πέτρου Βʹ",
    "1-jean": "Ἰωάννου Αʹ",
    "2-jean": "Ἰωάννου Βʹ",
    "3-jean": "Ἰωάννου Γʹ",
    "jude": "Ἰούδα",
    "apocalypse": "Ἀποκάλυψις Ἰωάννου",
}


def original_title_for(version_key: str, book_id: str, book_meta: dict, raw_name: str | None) -> str:
    if version_key == "crampon":
        return book_meta["title"]
    if version_key == "septante":
        return GREEK_TITLES.get(book_id) or book_meta["title"]
    return (raw_name or "").strip() or book_meta["title"]


def didactic_title_for(version_key: str, book_id: str, fallback: str) -> str:
    lang = VERSIONS.get(version_key, {}).get("lang") or "fr"
    return didactic_title(lang, book_id, fallback)


def fold_name(s: str) -> str:
    t = unicodedata.normalize("NFD", s or "")
    t = "".join(ch for ch in t if unicodedata.category(ch) != "Mn")
    t = t.replace("᾿", "").replace("᾽", "").replace("ʻ", "")
    t = t.lower()
    t = t.replace("ё", "е")
    t = re.sub(r"[ʻ’'`´]", "", t)
    t = re.sub(r"[^0-9a-zα-ω\s]+", " ", t)
    t = re.sub(r"\s+", " ", t).strip()
    t = re.sub(r"^iii\s+", "3 ", t)
    t = re.sub(r"^ii\s+", "2 ", t)
    t = re.sub(r"^i\s+", "1 ", t)
    t = re.sub(r"\biii\b", "3", t)
    t = re.sub(r"\bii\b", "2", t)
    t = re.sub(r"\bi\b", "1", t)
    return t


# Folded aliases → canon nr. Longest match not needed: exact after fold.
NAME_TO_NR: dict[str, int] = {
    # Torah
    "genesis": 1, "genese": 1, "gen": 1, "γενεση": 1, "γενεσις": 1,
    "exodus": 2, "exode": 2, "εξοδος": 2,
    "leviticus": 3, "levitique": 3, "λευιτικο": 3, "λευιτικον": 3,
    "numbers": 4, "nombres": 4, "numeri": 4, "αριθμοι": 4,
    "deuteronomy": 5, "deuteronome": 5, "deuteronomium": 5, "δευτερονομιον": 5, "δευτερονομιο": 5,
    # History
    "joshua": 6, "josue": 6, "iosue": 6, "ιησους ναυη": 6, "ιησους του ναυη": 6,
    "judges": 7, "juges": 7, "iudicum": 7, "κριτες": 7, "κριται": 7,
    "1 samuel": 8, "1 samuelis": 8, "i samuelis": 8, "1 kings": 8,
    "βασιλειων α": 8, "1 basileion": 8,
    "2 samuel": 9, "2 samuelis": 9, "ii samuelis": 9, "βασιλειων β": 9,
    "1 rois": 10, "1 kings": 10, "1 regum": 10, "i regum": 10, "βασιλειων γ": 10,
    "2 rois": 11, "2 kings": 11, "2 regum": 11, "ii regum": 11, "βασιλειων δ": 11,
    "isaiah": 12, "esaie": 12, "isaie": 12, "isaias": 12, "ησαιας": 12,
    "jeremiah": 13, "jeremie": 13, "ieremias": 13, "ιερεμιας": 13,
    "ezekiel": 14, "ezechiel": 14, "ιεζεκιηλ": 14,
    "hosea": 15, "osee": 15, "osee": 15, "ωσηε": 15,
    "joel": 16, "ioel": 16, "ιωηλ": 16,
    "amos": 17, "αμως": 17,
    "obadiah": 18, "abdias": 18, "οβδιας": 18,
    "jonah": 19, "jonas": 19, "ionas": 19, "ιωνας": 19,
    "micah": 20, "michee": 20, "michaeas": 20, "μιχαιας": 20,
    "nahum": 21, "ναουμ": 21,
    "habakkuk": 22, "habacuc": 22, "αμβακουμ": 22,
    "zephaniah": 23, "sophonie": 23, "sophonias": 23, "σοφονιας": 23,
    "haggai": 24, "aggee": 24, "aggaeus": 24, "αγγαιος": 24,
    "zechariah": 25, "zacharie": 25, "zacharias": 25, "ζαχαριας": 25,
    "malachi": 26, "malachie": 26, "malachias": 26, "μαλαχιας": 26,
    # Writings
    "psalms": 27, "psaumes": 27, "psalmi": 27, "psalm": 27, "ψαλμοι": 27,
    "proverbs": 28, "proverbes": 28, "proverbia": 28, "παροιμιες": 28, "παροιμιαι": 28,
    "job": 29, "iob": 29, "ιωβ": 29,
    "song of solomon": 30, "song of songs": 30, "canticle of canticles": 30,
    "cantique des cantiques": 30, "cantique": 30, "canticum canticorum": 30,
    "ασμα των ασματων": 30, "ασμα ασματων": 30,
    "ruth": 31, "ρουθ": 31,
    "lamentations": 32, "lamentationes": 32, "θρηνοι": 32,
    "ecclesiastes": 33, "ecclesiaste": 33, "εκκλησιαστης": 33,
    "esther": 34, "εσθηρ": 34,
    "daniel": 35, "δανιηλ": 35,
    "ezra": 36, "esdras": 36, "εσδρας": 36, "εσδρας α": 36,
    "nehemiah": 37, "nehemie": 37, "nehemias": 37, "νεεμιας": 37,
    "1 chronicles": 38, "1 chroniques": 38, "1 paralipomenon": 38,
    "i paralipomenon": 38, "παραλειπομενων α": 38,
    "2 chronicles": 39, "2 chroniques": 39, "2 paralipomenon": 39,
    "ii paralipomenon": 39, "παραλειπομενων β": 39,
    # Deuterocanon
    "tobit": 40, "tobie": 40, "tobias": 40, "τωβιτ": 40,
    "judith": 41, "iudith": 41, "ιουδιθ": 41,
    "wisdom": 42, "wisdom of solomon": 42, "sagesse": 42, "sapientia": 42,
    "σοφια": 42, "σοφια σαλωμωνος": 42,
    "sirach": 43, "ecclesiasticus": 43, "siracide": 43, "siracide ecclesiastique": 43,
    "σιραχ": 43, "σοφια σειραχ": 43,
    "baruch": 44, "βαρουχ": 44,
    "1 maccabees": 45, "1 maccabees": 45, "1 maccabees": 45,
    "1 maccabees": 45, "i maccabees": 45, "1 maccabees": 45,
    "1 maccabees": 45,
    "1 maccabees": 45, "i maccabaeorum": 45, "1 maccabees": 45,
    "2 maccabees": 46, "ii maccabees": 46, "2 maccabees": 46,
    "ii maccabaeorum": 46,
    "3 maccabees": 47, "iii maccabees": 47,
    "4 maccabees": 48, "iv maccabees": 48,
    "psalm 151": 49, "psaume 151": 49,
    # NT
    "matthew": 50, "matthieu": 50, "matthaeus": 50, "κατα ματθαιον": 50,
    "saint matthieu": 50, "evangile selon saint matthieu": 50,
    "mark": 51, "marc": 51, "marcus": 51, "κατα μαρκον": 51,
    "saint marc": 51, "evangile selon saint marc": 51,
    "luke": 52, "luc": 52, "lucas": 52, "κατα λουκαν": 52,
    "saint luc": 52, "evangile selon saint luc": 52,
    "john": 53, "jean": 53, "ioannes": 53, "κατα ιωαννην": 53,
    "saint jean": 53, "evangile selon saint jean": 53,
    "acts": 54, "actes": 54, "actes des apotres": 54, "actus apostolorum": 54,
    "πραξεις": 54, "πραξεις αποστολων": 54,
    "romans": 55, "romains": 55, "ad romanos": 55, "προς ρωμαιους": 55,
    "1 corinthians": 56, "1 corinthiens": 56, "1 ad corinthios": 56,
    "i ad corinthios": 56, "προς κορινθιους α": 56,
    "2 corinthians": 57, "2 corinthiens": 57, "2 ad corinthios": 57,
    "ii ad corinthios": 57, "προς κορινθιους β": 57,
    "galatians": 58, "galates": 58, "ad galatas": 58, "προς γαλατας": 58,
    "ephesians": 59, "ephesiens": 59, "ad ephesios": 59, "προς εφεσιους": 59,
    "philippians": 60, "philippiens": 60, "ad philippenses": 60, "προς φιλιππησιους": 60,
    "colossians": 61, "colossiens": 61, "ad colossenses": 61, "προς κολοσσαεις": 61,
    "1 thessalonians": 62, "1 thessaloniciens": 62, "1 ad thessalonicenses": 62,
    "i ad thessalonicenses": 62, "προς θεσσαλονικεις α": 62,
    "2 thessalonians": 63, "2 thessaloniciens": 63, "2 ad thessalonicenses": 63,
    "ii ad thessalonicenses": 63, "προς θεσσαλονικεις β": 63,
    "1 timothy": 64, "1 timothee": 64, "1 ad timotheum": 64,
    "i ad timotheum": 64, "προς τιμοθεον α": 64,
    "2 timothy": 65, "2 timothee": 65, "2 ad timotheum": 65,
    "ii ad timotheum": 65, "προς τιμοθεον β": 65,
    "titus": 66, "tite": 66, "ad titum": 66, "προς τιτον": 66,
    "philemon": 67, "philemon": 67, "ad philemonem": 67, "προς φιλημονα": 67,
    "hebrews": 68, "hebreux": 68, "ad hebraeos": 68, "προς εβραιους": 68,
    "james": 69, "jacques": 69, "iacobus": 69, "ιακωβος": 69,
    "1 peter": 70, "1 pierre": 70, "1 petri": 70, "i petri": 70, "πετρου α": 70,
    "2 peter": 71, "2 pierre": 71, "2 petri": 71, "ii petri": 71, "πετρου β": 71,
    "1 john": 72, "1 jean": 72, "1 ioannes": 72, "i ioannes": 72, "ιωαννου α": 72,
    "2 john": 73, "2 jean": 73, "2 ioannes": 73, "ii ioannes": 73, "ιωαννου β": 73,
    "3 john": 74, "3 jean": 74, "3 ioannes": 74, "iii ioannes": 74, "ιωαννου γ": 74,
    "jude": 75, "iudas": 75, "ιουδας": 75,
    "revelation": 76, "revelation of john": 76, "apocalypse": 76,
    "apocalypsis": 76, "αποκαλυψη": 76, "αποκαλυψις": 76,
}

# Extra explicit Latin / Greek / French forms that fold oddly
NAME_TO_NR.update({
    "1 maccabees": 45, "1 maccabees": 45,
    "1 maccabees": 45,
    "1 maccabees": 45,
    "i maccabees": 45,
    "1 maccabees": 45,
    "1 maccabeorum": 45,
    "i maccabaeorum": 45,
    "1 maccabees": 45,
    "2 maccabees": 46,
    "ii maccabees": 46,
    "2 maccabeorum": 46,
    "1 maccabees": 45,
    "macchabees 1": 45,
    "1 maccabees": 45,
    "1 maccabees": 45,
    "1 esdras": 36,  # Ezra when labelled 1 Esdras
    "εσδρας α": 36,
})


def seed_macc() -> None:
    NAME_TO_NR["1 maccabees"] = 45
    NAME_TO_NR["2 maccabees"] = 46
    NAME_TO_NR["3 maccabees"] = 47
    NAME_TO_NR["4 maccabees"] = 48
    NAME_TO_NR["1 maccabees"] = 45
    NAME_TO_NR["i maccabees"] = 45
    NAME_TO_NR["ii maccabees"] = 46
    NAME_TO_NR["iii maccabees"] = 47
    NAME_TO_NR["iv maccabees"] = 48
    NAME_TO_NR["1 maccabaeorum"] = 45
    NAME_TO_NR["2 maccabaeorum"] = 46
    NAME_TO_NR["i maccabaeorum"] = 45
    NAME_TO_NR["ii maccabaeorum"] = 46
    NAME_TO_NR["1 maccabees"] = 45


seed_macc()


def nr_from_name(name: str) -> int | None:
    folded = fold_name(name)
    if not folded:
        return None
    if folded in NAME_TO_NR:
        return NAME_TO_NR[folded]
    # strip leading "livre de / evangile selon / προς / κατα"
    stripped = re.sub(
        r"^(livre d[e ]+|evangile selon |the book of |κατα |προς )",
        "",
        folded,
    ).strip()
    if stripped in NAME_TO_NR:
        return NAME_TO_NR[stripped]
    # "1 / 2 / 3" + rest already folded
    return None


def resolve_nr(book: dict) -> int | None:
    name = book.get("name") or book.get("book_name") or ""
    nr = nr_from_name(name)
    if nr:
        return nr
    src = book.get("nr")
    if src is None:
        src = book.get("book")
    if src is None:
        return None
    try:
        src_i = int(src)
    except (TypeError, ValueError):
        return None
    if src_i in LXX_EXTRA_NR:
        return LXX_EXTRA_NR[src_i]
    return PROTESTANT_NR.get(src_i)


def clean(t: str) -> str:
    t = (t or "").replace("\u2009", " ").replace("\u00a0", " ")
    t = re.sub(r"<[^>]+>", "", t)
    return re.sub(r"[ \t]+", " ", t).strip()


def greek_to_hebrew(ps: int) -> int | tuple[int, ...]:
    if 1 <= ps <= 8:
        return ps
    if ps == 9:
        return (9, 10)
    if 10 <= ps <= 112:
        return ps + 1
    if ps == 113:
        return (114, 115)
    if ps in (114, 115):
        return 116
    if 116 <= ps <= 145:
        return ps + 1
    if ps in (146, 147):
        return 147
    if 148 <= ps <= 150:
        return ps
    if ps == 151:
        return 151
    return ps


def normalize_ostervald(raw: dict) -> dict:
    buckets: dict[int, dict] = {}
    for v in raw.get("verses") or []:
        name = v.get("book_name") or ""
        nr = nr_from_name(name) or PROTESTANT_NR.get(int(v.get("book") or 0))
        if not nr:
            print(f"  Ostervald non mappé : {name}", file=sys.stderr)
            continue
        entry = buckets.setdefault(nr, {"nr": nr, "name": name, "chapters": {}})
        ch_n = int(v["chapter"])
        ch = entry["chapters"].setdefault(ch_n, {"chapter": ch_n, "verses": []})
        ch["verses"].append({"verse": int(v["verse"]), "text": v.get("text", "")})
    books = []
    for nr in sorted(buckets):
        b = buckets[nr]
        chapters = [b["chapters"][k] for k in sorted(b["chapters"])]
        books.append({"nr": nr, "name": b["name"], "chapters": chapters})
    return {"books": books}


def normalize_source(raw: dict, src_name: str) -> dict:
    if "verses" in raw and "books" not in raw:
        print(f"→ Format versets plats pour {src_name}")
        return normalize_ostervald(raw)

    books_out = []
    skipped = []
    for book in raw.get("books") or []:
        nr = resolve_nr(book)
        if nr is None:
            skipped.append(book.get("name") or book.get("nr"))
            continue
        chapters = []
        for ch in book.get("chapters") or []:
            verses = [
                {
                    "chapter": int(ch.get("chapter") or ch.get("n") or 0),
                    "verse": int(v.get("verse") or v.get("n") or 0),
                    "text": v.get("text") or v.get("t") or "",
                }
                for v in ch.get("verses") or []
            ]
            chapters.append(
                {
                    "chapter": int(ch.get("chapter") or ch.get("n") or 0),
                    "verses": verses,
                }
            )
        books_out.append(
            {"nr": nr, "name": book.get("name") or BY_NR[nr]["title"], "chapters": chapters}
        )
    if skipped:
        print(f"  {src_name}: ignorés {skipped}", file=sys.stderr)
    return {"books": books_out}


def remap_psalm_chapters(chapters: list[dict]) -> list[dict]:
    out = []
    for ch in chapters:
        ch_num = int(ch["chapter"])
        verses = [{"n": int(v["verse"]), "t": clean(v["text"])} for v in ch["verses"]]
        hebrew = greek_to_hebrew(ch_num)
        if isinstance(hebrew, tuple):
            for h in hebrew:
                out.append({"n": h, "n_greek": ch_num, "verses": verses})
        else:
            rec = {"n": hebrew, "verses": verses}
            if hebrew != ch_num:
                rec["n_greek"] = ch_num
            else:
                rec["n_greek"] = ch_num
            out.append(rec)
    return out


def copy_nestle_gospels(dest_dir: Path, meta: dict) -> int:
    n = 0
    for gid in GOSPEL_IDS:
        src = NESTLE_DIR / f"{gid}.json"
        if not src.is_file():
            continue
        raw = json.loads(src.read_text(encoding="utf-8"))
        book_meta = next(b for b in BOOKS if b["id"] == gid)
        book = {
            "id": gid,
            "title": didactic_title_for("septante", gid, book_meta["title"]),
            "original_title": original_title_for(
                "septante", gid, book_meta, raw.get("title")
            ),
            "short": book_meta["short"],
            "version": {k: meta[k] for k in meta if k != "file"},
            "chapters": raw.get("chapters") or [],
        }
        (dest_dir / f"{gid}.json").write_text(
            json.dumps(book, ensure_ascii=False, separators=(",", ":")),
            encoding="utf-8",
        )
        n += 1
        print(f"{'septante':15} {gid:22} {len(book['chapters']):3} ch  nestle")
    return n


def extract(version_key: str) -> tuple[int, list[dict]]:
    meta = VERSIONS[version_key]
    src = TEXTS / meta["file"]
    dest_dir = OUT_BASE / version_key

    if dest_dir.is_dir():
        for p in dest_dir.glob("*.json"):
            p.unlink()

    if not src.is_file():
        print(f"Missing {src}", file=sys.stderr)
        return 0, []

    raw = json.loads(src.read_text(encoding="utf-8"))
    raw = normalize_source(raw, src.name)
    by_nr = {b["nr"]: b for b in raw.get("books", [])}

    dest_dir.mkdir(parents=True, exist_ok=True)
    allowed = books_for_canon(meta["canon"])
    remap_ps = version_key in ("vulgate", "septante")
    n = 0
    index_books = []

    # Preserve source order, then any allowed leftover.
    source_order = [b["nr"] for b in raw.get("books", [])]
    allowed_ids = {b["nr"]: b for b in allowed}
    ordered_nrs = [nr for nr in source_order if nr in allowed_ids]
    for b in allowed:
        if b["nr"] not in ordered_nrs and b["nr"] in by_nr:
            ordered_nrs.append(b["nr"])

    seen_ids: set[str] = set()
    for nr in ordered_nrs:
        book_meta = allowed_ids[nr]
        book_raw = by_nr.get(nr)
        if not book_raw:
            continue
        if book_meta["id"] in seen_ids:
            continue
        seen_ids.add(book_meta["id"])

        if book_meta["id"] == "psaumes" and remap_ps:
            chapters = remap_psalm_chapters(book_raw.get("chapters") or [])
        else:
            chapters = []
            for ch in book_raw.get("chapters") or []:
                chapters.append(
                    {
                        "n": int(ch["chapter"]),
                        "verses": [
                            {"n": int(v["verse"]), "t": clean(v["text"])}
                            for v in ch["verses"]
                        ],
                    }
                )

        public_meta = {k: meta[k] for k in meta if k != "file"}
        book = {
            "id": book_meta["id"],
            "title": didactic_title_for(version_key, book_meta["id"], book_meta["title"]),
            "original_title": original_title_for(
                version_key, book_meta["id"], book_meta, book_raw.get("name")
            ),
            "short": book_meta["short"],
            "version": public_meta,
            "chapters": chapters,
        }
        (dest_dir / f"{book_meta['id']}.json").write_text(
            json.dumps(book, ensure_ascii=False, separators=(",", ":")),
            encoding="utf-8",
        )
        n_v = sum(len(c["verses"]) for c in chapters)
        print(f"{version_key:15} {book_meta['id']:22} {len(chapters):3} ch {n_v:5} v")
        n += 1
        index_books.append(
            {
                "id": book_meta["id"],
                "title": book["title"],
                "original_title": book["original_title"],
                "short": book_meta["short"],
                "testament": book_meta["testament"],
                "section": book_meta["section"],
            }
        )

    if version_key == "septante":
        have = {b["id"] for b in index_books}
        extra = copy_nestle_gospels(dest_dir, meta)
        n += extra
        for gid in GOSPEL_IDS:
            if gid in have:
                continue
            if not (dest_dir / f"{gid}.json").is_file():
                continue
            bm = next(b for b in BOOKS if b["id"] == gid)
            index_books.append(
                {
                    "id": gid,
                    "title": didactic_title_for("septante", gid, bm["title"]),
                    "original_title": original_title_for(
                        "septante", gid, bm, bm["title"]
                    ),
                    "short": bm["short"],
                    "testament": bm["testament"],
                    "section": bm["section"],
                }
            )

    public_meta = {k: meta[k] for k in meta if k != "file"}
    index = {"version": public_meta, "books": index_books}
    (dest_dir / "index.json").write_text(
        json.dumps(index, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    return n, index_books


def write_books_js() -> None:
    versions_js = {k: {kk: vv for kk, vv in v.items() if kk != "file"} for k, v in VERSIONS.items()}
    books_js = []
    fr = DIDACTIC["fr"]
    for b in BOOKS:
        row = dict(b)
        row["title"] = fr.get(b["id"], b["title"])
        books_js.append(row)
    content = (
        "/** Generated by scripts/build-texts.py — do not edit. */\n"
        f"export const BOOKS = {json.dumps(books_js, ensure_ascii=False, indent=2)};\n\n"
        f"export const SECTIONS = {json.dumps(SECTIONS, ensure_ascii=False, indent=2)};\n\n"
        f"export const TOC_SECTIONS = {json.dumps(TOC_SECTIONS, ensure_ascii=False, indent=2)};\n\n"
        f"export const VERSIONS = {json.dumps(versions_js, ensure_ascii=False, indent=2)};\n\n"
        "export const BOOK_BY_ID = Object.fromEntries(BOOKS.map(b => [b.id, b]));\n"
        "export const BOOK_BY_NR = Object.fromEntries(BOOKS.map(b => [b.nr, b]));\n"
        "export const GOSPEL_IDS = [\"matthieu\", \"marc\", \"luc\", \"jean\"];\n\n"
        "export function booksForCanon(canon) {\n"
        "  return BOOKS.filter(b => b.canons.includes(canon));\n"
        "}\n\n"
        "export function isGospel(id) {\n"
        "  return GOSPEL_IDS.includes(id);\n"
        "}\n\n"
        "export function bookHref(id, base = \"\", ref = null) {\n"
        "  const file = GOSPEL_IDS.includes(id) ? `${id}.html` : `livre.html?livre=${id}`;\n"
        "  let hash = \"\";\n"
        "  if (ref && ref.chapter) {\n"
        "    hash = `#c${ref.chapter}`;\n"
        "    if (ref.verse) hash += `v${ref.verse}`;\n"
        "  }\n"
        "  return `${base}${file}${hash}`;\n"
        "}\n\n"
        "export function bookName(book) {\n"
        "  if (!book) return \"\";\n"
        "  return book.original_title || book.title || book.name || book.id || \"\";\n"
        "}\n\n"
        "export function neighborBooks(id, list = BOOKS) {\n"
        "  const i = list.findIndex(b => b.id === id);\n"
        "  return {\n"
        "    prev: i > 0 ? list[i - 1] : null,\n"
        "    next: i >= 0 && i < list.length - 1 ? list[i + 1] : null,\n"
        "  };\n"
        "}\n\n"
        "export function versionIdsByYear(desc = false) {\n"
        "  const ids = Object.keys(VERSIONS);\n"
        "  ids.sort((a, b) => (VERSIONS[a].year - VERSIONS[b].year) || a.localeCompare(b));\n"
        "  return desc ? ids.reverse() : ids;\n"
        "}\n"
    )
    JS_BOOKS.parent.mkdir(parents=True, exist_ok=True)
    JS_BOOKS.write_text(content, encoding="utf-8")
    print(f"js/books.js → {len(BOOKS)} livres, {len(VERSIONS)} versions")


def wipe_legacy_root() -> None:
    """Old flat data/livres/*.json (pre-version folders)."""
    for p in OUT_BASE.glob("*.json"):
        p.unlink()
        print(f"rm legacy {p.name}")


def patch_original_titles(keys: list[str] | None = None) -> None:
    """Rewrite original_title (+ version meta) without re-extracting verses."""
    for key in keys or list(VERSIONS):
        dest_dir = OUT_BASE / key
        idx_path = dest_dir / "index.json"
        if not idx_path.is_file():
            continue
        idx = json.loads(idx_path.read_text(encoding="utf-8"))
        seen: set[str] = set()
        books = []
        public_meta = {k: v for k, v in VERSIONS[key].items() if k != "file"}
        for b in idx.get("books") or []:
            bid = b.get("id")
            if not bid or bid in seen:
                continue
            seen.add(bid)
            meta = BY_ID.get(bid) or {
                "id": bid,
                "title": b.get("title") or bid,
            }
            ot = original_title_for(key, bid, meta, b.get("original_title"))
            b["original_title"] = ot
            books.append(b)
            book_path = dest_dir / f"{bid}.json"
            if not book_path.is_file():
                continue
            book = json.loads(book_path.read_text(encoding="utf-8"))
            book["original_title"] = ot
            book["version"] = public_meta
            book_path.write_text(
                json.dumps(book, ensure_ascii=False, separators=(",", ":")),
                encoding="utf-8",
            )
        idx["books"] = books
        idx["version"] = public_meta
        idx_path.write_text(
            json.dumps(idx, ensure_ascii=False, indent=2), encoding="utf-8"
        )
        print(f"patch titles {key:15} {len(books)} livres")


def patch_didactic_titles(keys: list[str] | None = None) -> None:
    """Rewrite `title` only (index + first JSON key). Verses untouched."""
    title_re = re.compile(r'("title"\s*:\s*")(?:(?:\\.|[^"\\])*)(")', re.S)
    for key in keys or list(VERSIONS):
        dest_dir = OUT_BASE / key
        idx_path = dest_dir / "index.json"
        if not idx_path.is_file():
            continue
        idx = json.loads(idx_path.read_text(encoding="utf-8"))
        n = 0
        for b in idx.get("books") or []:
            bid = b.get("id")
            if not bid:
                continue
            fallback = b.get("title") or bid
            new = didactic_title_for(key, bid, fallback)
            if b.get("title") != new:
                b["title"] = new
                n += 1
            book_path = dest_dir / f"{bid}.json"
            if not book_path.is_file():
                continue
            raw = book_path.read_text(encoding="utf-8")
            escaped = json.dumps(new, ensure_ascii=False)[1:-1]
            patched, count = title_re.subn(rf"\1{escaped}\2", raw, count=1)
            if count:
                book_path.write_text(patched, encoding="utf-8")
        idx_path.write_text(
            json.dumps(idx, ensure_ascii=False, indent=2), encoding="utf-8"
        )
        print(f"patch didactic {key:15} {n} titres")


def main() -> int:
    if "--patch-titles" in sys.argv:
        write_books_js()
        patch_didactic_titles()
        return 0
    write_books_js()
    print("\n=== Extraction des versions ===")
    total = 0
    for key in VERSIONS:
        n, _ = extract(key)
        total += n
    wipe_legacy_root()
    print(f"\nTerminé. {total} livres extraits au total.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
