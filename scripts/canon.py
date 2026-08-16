"""
Canon multi-tradition — compatible judaïque, protestant, catholique, orthodoxe.
"""
from __future__ import annotations

from typing import TypedDict, Literal

Canon = Literal["jewish", "protestant", "catholic", "orthodox"]

class Book(TypedDict):
    nr: int                    # numéro interne unique (stable)
    id: str                    # identifiant URL-friendly
    title: str                 # titre français principal
    short: str                 # abréviation
    testament: Literal["at", "nt"]
    section: str
    canons: list[Canon]        # dans quels canons ce livre est inclus


BOOKS: list[Book] = [
    # ========== Ancien Testament / Tanakh ==========
    # Torah / Pentateuque
    {"nr": 1,  "id": "genese",        "title": "Genèse",                     "short": "Gn",  "testament": "at", "section": "torah",        "canons": ["jewish", "protestant", "catholic", "orthodox"]},
    {"nr": 2,  "id": "exode",         "title": "Exode",                      "short": "Ex",  "testament": "at", "section": "torah",        "canons": ["jewish", "protestant", "catholic", "orthodox"]},
    {"nr": 3,  "id": "levitique",     "title": "Lévitique",                  "short": "Lv",  "testament": "at", "section": "torah",        "canons": ["jewish", "protestant", "catholic", "orthodox"]},
    {"nr": 4,  "id": "nombres",       "title": "Nombres",                    "short": "Nb",  "testament": "at", "section": "torah",        "canons": ["jewish", "protestant", "catholic", "orthodox"]},
    {"nr": 5,  "id": "deuteronome",   "title": "Deutéronome",                "short": "Dt",  "testament": "at", "section": "torah",        "canons": ["jewish", "protestant", "catholic", "orthodox"]},

    # Nevi'im / Historiques
    {"nr": 6,  "id": "josue",         "title": "Josué",                      "short": "Jos", "testament": "at", "section": "neviim",       "canons": ["jewish", "protestant", "catholic", "orthodox"]},
    {"nr": 7,  "id": "juges",         "title": "Juges",                      "short": "Jg",  "testament": "at", "section": "neviim",       "canons": ["jewish", "protestant", "catholic", "orthodox"]},
    {"nr": 8,  "id": "1-samuel",      "title": "1 Samuel",                   "short": "1 S", "testament": "at", "section": "neviim",       "canons": ["jewish", "protestant", "catholic", "orthodox"]},
    {"nr": 9,  "id": "2-samuel",      "title": "2 Samuel",                   "short": "2 S", "testament": "at", "section": "neviim",       "canons": ["jewish", "protestant", "catholic", "orthodox"]},
    {"nr": 10, "id": "1-rois",        "title": "1 Rois",                     "short": "1 R", "testament": "at", "section": "neviim",       "canons": ["jewish", "protestant", "catholic", "orthodox"]},
    {"nr": 11, "id": "2-rois",        "title": "2 Rois",                     "short": "2 R", "testament": "at", "section": "neviim",       "canons": ["jewish", "protestant", "catholic", "orthodox"]},
    {"nr": 12, "id": "esaie",         "title": "Ésaïe",                      "short": "Es",  "testament": "at", "section": "neviim",       "canons": ["jewish", "protestant", "catholic", "orthodox"]},
    {"nr": 13, "id": "jeremie",       "title": "Jérémie",                    "short": "Jr",  "testament": "at", "section": "neviim",       "canons": ["jewish", "protestant", "catholic", "orthodox"]},
    {"nr": 14, "id": "ezechiel",      "title": "Ézéchiel",                   "short": "Ez",  "testament": "at", "section": "neviim",       "canons": ["jewish", "protestant", "catholic", "orthodox"]},
    {"nr": 15, "id": "osee",          "title": "Osée",                       "short": "Os",  "testament": "at", "section": "neviim",       "canons": ["jewish", "protestant", "catholic", "orthodox"]},
    {"nr": 16, "id": "joel",          "title": "Joël",                       "short": "Jl",  "testament": "at", "section": "neviim",       "canons": ["jewish", "protestant", "catholic", "orthodox"]},
    {"nr": 17, "id": "amos",          "title": "Amos",                       "short": "Am",  "testament": "at", "section": "neviim",       "canons": ["jewish", "protestant", "catholic", "orthodox"]},
    {"nr": 18, "id": "abdias",        "title": "Abdias",                     "short": "Ab",  "testament": "at", "section": "neviim",       "canons": ["jewish", "protestant", "catholic", "orthodox"]},
    {"nr": 19, "id": "jonas",         "title": "Jonas",                      "short": "Jon", "testament": "at", "section": "neviim",       "canons": ["jewish", "protestant", "catholic", "orthodox"]},
    {"nr": 20, "id": "michee",        "title": "Michée",                     "short": "Mi",  "testament": "at", "section": "neviim",       "canons": ["jewish", "protestant", "catholic", "orthodox"]},
    {"nr": 21, "id": "nahum",         "title": "Nahum",                      "short": "Na",  "testament": "at", "section": "neviim",       "canons": ["jewish", "protestant", "catholic", "orthodox"]},
    {"nr": 22, "id": "habacuc",       "title": "Habacuc",                    "short": "Ha",  "testament": "at", "section": "neviim",       "canons": ["jewish", "protestant", "catholic", "orthodox"]},
    {"nr": 23, "id": "sophonie",      "title": "Sophonie",                   "short": "So",  "testament": "at", "section": "neviim",       "canons": ["jewish", "protestant", "catholic", "orthodox"]},
    {"nr": 24, "id": "aggee",         "title": "Aggée",                      "short": "Ag",  "testament": "at", "section": "neviim",       "canons": ["jewish", "protestant", "catholic", "orthodox"]},
    {"nr": 25, "id": "zacharie",      "title": "Zacharie",                   "short": "Za",  "testament": "at", "section": "neviim",       "canons": ["jewish", "protestant", "catholic", "orthodox"]},
    {"nr": 26, "id": "malachie",      "title": "Malachie",                   "short": "Ml",  "testament": "at", "section": "neviim",       "canons": ["jewish", "protestant", "catholic", "orthodox"]},

    # Ketuvim / Écrits
    {"nr": 27, "id": "psaumes",       "title": "Psaumes",                    "short": "Ps",  "testament": "at", "section": "ketuvim",      "canons": ["jewish", "protestant", "catholic", "orthodox"]},
    {"nr": 28, "id": "proverbes",     "title": "Proverbes",                  "short": "Pr",  "testament": "at", "section": "ketuvim",      "canons": ["jewish", "protestant", "catholic", "orthodox"]},
    {"nr": 29, "id": "job",           "title": "Job",                        "short": "Jb",  "testament": "at", "section": "ketuvim",      "canons": ["jewish", "protestant", "catholic", "orthodox"]},
    {"nr": 30, "id": "cantique",      "title": "Cantique des Cantiques",     "short": "Ct",  "testament": "at", "section": "ketuvim",      "canons": ["jewish", "protestant", "catholic", "orthodox"]},
    {"nr": 31, "id": "ruth",          "title": "Ruth",                       "short": "Rt",  "testament": "at", "section": "ketuvim",      "canons": ["jewish", "protestant", "catholic", "orthodox"]},
    {"nr": 32, "id": "lamentations",  "title": "Lamentations",               "short": "Lm",  "testament": "at", "section": "ketuvim",      "canons": ["jewish", "protestant", "catholic", "orthodox"]},
    {"nr": 33, "id": "ecclesiaste",   "title": "Ecclésiaste",                "short": "Ec",  "testament": "at", "section": "ketuvim",      "canons": ["jewish", "protestant", "catholic", "orthodox"]},
    {"nr": 34, "id": "esther",        "title": "Esther",                     "short": "Est", "testament": "at", "section": "ketuvim",      "canons": ["jewish", "protestant", "catholic", "orthodox"]},
    {"nr": 35, "id": "daniel",        "title": "Daniel",                     "short": "Dn",  "testament": "at", "section": "ketuvim",      "canons": ["jewish", "protestant", "catholic", "orthodox"]},
    {"nr": 36, "id": "esdras",        "title": "Esdras",                     "short": "Esd", "testament": "at", "section": "ketuvim",      "canons": ["jewish", "protestant", "catholic", "orthodox"]},
    {"nr": 37, "id": "nehemie",       "title": "Néhémie",                    "short": "Né",  "testament": "at", "section": "ketuvim",      "canons": ["jewish", "protestant", "catholic", "orthodox"]},
    {"nr": 38, "id": "1-chroniques",  "title": "1 Chroniques",               "short": "1 Ch","testament": "at", "section": "ketuvim",      "canons": ["jewish", "protestant", "catholic", "orthodox"]},
    {"nr": 39, "id": "2-chroniques",  "title": "2 Chroniques",               "short": "2 Ch","testament": "at", "section": "ketuvim",      "canons": ["jewish", "protestant", "catholic", "orthodox"]},

    # ===== Deutérocanoniques (catholiques + orthodoxes) =====
    {"nr": 40, "id": "tobie",         "title": "Tobie",                      "short": "Tb",  "testament": "at", "section": "deuterocanoniques", "canons": ["catholic", "orthodox"]},
    {"nr": 41, "id": "judith",        "title": "Judith",                     "short": "Jdt", "testament": "at", "section": "deuterocanoniques", "canons": ["catholic", "orthodox"]},
    {"nr": 42, "id": "sagesse",       "title": "Sagesse",                    "short": "Sg",  "testament": "at", "section": "deuterocanoniques", "canons": ["catholic", "orthodox"]},
    {"nr": 43, "id": "siracide",      "title": "Siracide (Ecclésiastique)",  "short": "Si",  "testament": "at", "section": "deuterocanoniques", "canons": ["catholic", "orthodox"]},
    {"nr": 44, "id": "baruch",        "title": "Baruch",                     "short": "Ba",  "testament": "at", "section": "deuterocanoniques", "canons": ["catholic", "orthodox"]},
    {"nr": 45, "id": "1-maccabees",   "title": "1 Maccabées",                "short": "1 M", "testament": "at", "section": "deuterocanoniques", "canons": ["catholic", "orthodox"]},
    {"nr": 46, "id": "2-maccabees",   "title": "2 Maccabées",                "short": "2 M", "testament": "at", "section": "deuterocanoniques", "canons": ["catholic", "orthodox"]},

    # Livres supplémentaires orthodoxes (exemples)
    {"nr": 47, "id": "3-maccabees",   "title": "3 Maccabées",                "short": "3 M", "testament": "at", "section": "deuterocanoniques", "canons": ["orthodox"]},
    {"nr": 48, "id": "4-maccabees",   "title": "4 Maccabées",                "short": "4 M", "testament": "at", "section": "deuterocanoniques", "canons": ["orthodox"]},
    {"nr": 49, "id": "psaume-151",    "title": "Psaume 151",                 "short": "Ps151","testament": "at", "section": "deuterocanoniques", "canons": ["orthodox"]},
    # Tu pourras en ajouter d’autres plus tard (1 Esdras, 3 Esdras, etc.)

    # ========== Nouveau Testament ==========
    {"nr": 50, "id": "matthieu",      "title": "Évangile selon saint Matthieu", "short": "Mt",  "testament": "nt", "section": "evangiles", "canons": ["protestant", "catholic", "orthodox"]},
    {"nr": 51, "id": "marc",          "title": "Évangile selon saint Marc",     "short": "Mc",  "testament": "nt", "section": "evangiles", "canons": ["protestant", "catholic", "orthodox"]},
    {"nr": 52, "id": "luc",           "title": "Évangile selon saint Luc",      "short": "Lc",  "testament": "nt", "section": "evangiles", "canons": ["protestant", "catholic", "orthodox"]},
    {"nr": 53, "id": "jean",          "title": "Évangile selon saint Jean",     "short": "Jn",  "testament": "nt", "section": "evangiles", "canons": ["protestant", "catholic", "orthodox"]},
    {"nr": 54, "id": "actes",         "title": "Actes des Apôtres",             "short": "Ac",  "testament": "nt", "section": "actes",     "canons": ["protestant", "catholic", "orthodox"]},
    {"nr": 55, "id": "romains",       "title": "Romains",                       "short": "Rm",  "testament": "nt", "section": "epitres",   "canons": ["protestant", "catholic", "orthodox"]},
    {"nr": 56, "id": "1-corinthiens", "title": "1 Corinthiens",                 "short": "1 Co","testament": "nt", "section": "epitres",   "canons": ["protestant", "catholic", "orthodox"]},
    {"nr": 57, "id": "2-corinthiens", "title": "2 Corinthiens",                 "short": "2 Co","testament": "nt", "section": "epitres",   "canons": ["protestant", "catholic", "orthodox"]},
    {"nr": 58, "id": "galates",       "title": "Galates",                       "short": "Ga",  "testament": "nt", "section": "epitres",   "canons": ["protestant", "catholic", "orthodox"]},
    {"nr": 59, "id": "ephesiens",     "title": "Éphésiens",                     "short": "Ép",  "testament": "nt", "section": "epitres",   "canons": ["protestant", "catholic", "orthodox"]},
    {"nr": 60, "id": "philippiens",   "title": "Philippiens",                   "short": "Ph",  "testament": "nt", "section": "epitres",   "canons": ["protestant", "catholic", "orthodox"]},
    {"nr": 61, "id": "colossiens",    "title": "Colossiens",                    "short": "Col", "testament": "nt", "section": "epitres",   "canons": ["protestant", "catholic", "orthodox"]},
    {"nr": 62, "id": "1-thessaloniciens", "title": "1 Thessaloniciens",         "short": "1 Th","testament": "nt", "section": "epitres",   "canons": ["protestant", "catholic", "orthodox"]},
    {"nr": 63, "id": "2-thessaloniciens", "title": "2 Thessaloniciens",         "short": "2 Th","testament": "nt", "section": "epitres",   "canons": ["protestant", "catholic", "orthodox"]},
    {"nr": 64, "id": "1-timothee",    "title": "1 Timothée",                    "short": "1 Tm","testament": "nt", "section": "epitres",   "canons": ["protestant", "catholic", "orthodox"]},
    {"nr": 65, "id": "2-timothee",    "title": "2 Timothée",                    "short": "2 Tm","testament": "nt", "section": "epitres",   "canons": ["protestant", "catholic", "orthodox"]},
    {"nr": 66, "id": "tite",          "title": "Tite",                          "short": "Tt",  "testament": "nt", "section": "epitres",   "canons": ["protestant", "catholic", "orthodox"]},
    {"nr": 67, "id": "philemon",      "title": "Philémon",                      "short": "Phm", "testament": "nt", "section": "epitres",   "canons": ["protestant", "catholic", "orthodox"]},
    {"nr": 68, "id": "hebreux",       "title": "Hébreux",                       "short": "Hé",  "testament": "nt", "section": "epitres",   "canons": ["protestant", "catholic", "orthodox"]},
    {"nr": 69, "id": "jacques",       "title": "Jacques",                       "short": "Jc",  "testament": "nt", "section": "epitres",   "canons": ["protestant", "catholic", "orthodox"]},
    {"nr": 70, "id": "1-pierre",      "title": "1 Pierre",                      "short": "1 P", "testament": "nt", "section": "epitres",   "canons": ["protestant", "catholic", "orthodox"]},
    {"nr": 71, "id": "2-pierre",      "title": "2 Pierre",                      "short": "2 P", "testament": "nt", "section": "epitres",   "canons": ["protestant", "catholic", "orthodox"]},
    {"nr": 72, "id": "1-jean",        "title": "1 Jean",                        "short": "1 Jn","testament": "nt", "section": "epitres",   "canons": ["protestant", "catholic", "orthodox"]},
    {"nr": 73, "id": "2-jean",        "title": "2 Jean",                        "short": "2 Jn","testament": "nt", "section": "epitres",   "canons": ["protestant", "catholic", "orthodox"]},
    {"nr": 74, "id": "3-jean",        "title": "3 Jean",                        "short": "3 Jn","testament": "nt", "section": "epitres",   "canons": ["protestant", "catholic", "orthodox"]},
    {"nr": 75, "id": "jude",          "title": "Jude",                          "short": "Jude","testament": "nt", "section": "epitres",   "canons": ["protestant", "catholic", "orthodox"]},
    {"nr": 76, "id": "apocalypse",    "title": "Apocalypse",                    "short": "Ap",  "testament": "nt", "section": "apocalypse","canons": ["protestant", "catholic", "orthodox"]},
]

# Index utiles
BY_NR = {b["nr"]: b for b in BOOKS}
BY_ID = {b["id"]: b for b in BOOKS}

def books_for_canon(canon: Canon) -> list[Book]:
    """Retourne la liste des livres appartenant à un canon donné."""
    return [b for b in BOOKS if canon in b["canons"]]