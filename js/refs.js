/** AELF / liturgical reference parser → canon book ids. */

import { BOOK_BY_ID } from "./books.js";

function fold(s) {
  return String(s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\u00a0/g, " ")
    .replace(/(?<=[a-z])\./g, "")
    .replace(/^(\d)\.\s*/, "$1 ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Longest-first aliases. Deuterocanon omitted (no LS1910 book). */
const ALIASES = [
  ["1 thessaloniciens", "1-thessaloniciens"],
  ["2 thessaloniciens", "2-thessaloniciens"],
  ["1 corinthiens", "1-corinthiens"],
  ["2 corinthiens", "2-corinthiens"],
  ["1 chroniques", "1-chroniques"],
  ["2 chroniques", "2-chroniques"],
  ["cantique des cantiques", "cantique"],
  ["1 timothee", "1-timothee"],
  ["2 timothee", "2-timothee"],
  ["1 samuel", "1-samuel"],
  ["2 samuel", "2-samuel"],
  ["apocalypse", "apocalypse"],
  ["philippiens", "philippiens"],
  ["colossiens", "colossiens"],
  ["lamentations", "lamentations"],
  ["deuteronome", "deuteronome"],
  ["ecclesiaste", "ecclesiaste"],
  ["levitique", "levitique"],
  ["1 pierre", "1-pierre"],
  ["2 pierre", "2-pierre"],
  ["matthieu", "matthieu"],
  ["ephesiens", "ephesiens"],
  ["sophonie", "sophonie"],
  ["zacharie", "zacharie"],
  ["malachie", "malachie"],
  ["philemon", "philemon"],
  ["habacuc", "habacuc"],
  ["ezechiel", "ezechiel"],
  ["nehemie", "nehemie"],
  ["proverbes", "proverbes"],
  ["1 jean", "1-jean"],
  ["2 jean", "2-jean"],
  ["3 jean", "3-jean"],
  ["1 rois", "1-rois"],
  ["2 rois", "2-rois"],
  ["psaumes", "psaumes"],
  ["psaume", "psaumes"],
  ["romains", "romains"],
  ["galates", "galates"],
  ["hebreux", "hebreux"],
  ["jacques", "jacques"],
  ["nombres", "nombres"],
  ["genese", "genese"],
  ["jeremie", "jeremie"],
  ["esdras", "esdras"],
  ["esther", "esther"],
  ["daniel", "daniel"],
  ["abdias", "abdias"],
  ["michee", "michee"],
  ["actes", "actes"],
  ["aggee", "aggee"],
  ["nahum", "nahum"],
  ["jonas", "jonas"],
  ["josue", "josue"],
  ["juges", "juges"],
  ["exode", "exode"],
  ["esaie", "esaie"],
  ["isaie", "esaie"],
  ["cantique", "cantique"],
  ["saint matthieu", "matthieu"],
  ["saint marc", "marc"],
  ["saint luc", "luc"],
  ["saint jean", "jean"],
  ["1 thes", "1-thessaloniciens"],
  ["2 thes", "2-thessaloniciens"],
  ["1 th", "1-thessaloniciens"],
  ["2 th", "2-thessaloniciens"],
  ["1 cor", "1-corinthiens"],
  ["2 cor", "2-corinthiens"],
  ["1 co", "1-corinthiens"],
  ["2 co", "2-corinthiens"],
  ["1 chr", "1-chroniques"],
  ["2 chr", "2-chroniques"],
  ["1 ch", "1-chroniques"],
  ["2 ch", "2-chroniques"],
  ["1 tim", "1-timothee"],
  ["2 tim", "2-timothee"],
  ["1 tm", "1-timothee"],
  ["2 tm", "2-timothee"],
  ["1 sam", "1-samuel"],
  ["2 sam", "2-samuel"],
  ["1 s", "1-samuel"],
  ["2 s", "2-samuel"],
  ["1 pi", "1-pierre"],
  ["2 pi", "2-pierre"],
  ["1 p", "1-pierre"],
  ["2 p", "2-pierre"],
  ["1 jn", "1-jean"],
  ["2 jn", "2-jean"],
  ["3 jn", "3-jean"],
  ["1 rg", "1-rois"],
  ["2 rg", "2-rois"],
  ["1 r", "1-rois"],
  ["2 r", "2-rois"],
  ["apoc", "apocalypse"],
  ["phil", "philippiens"],
  ["col", "colossiens"],
  ["lam", "lamentations"],
  ["deu", "deuteronome"],
  ["ecc", "ecclesiaste"],
  ["lev", "levitique"],
  ["eph", "ephesiens"],
  ["soph", "sophonie"],
  ["zac", "zacharie"],
  ["mal", "malachie"],
  ["phm", "philemon"],
  ["hab", "habacuc"],
  ["eze", "ezechiel"],
  ["neh", "nehemie"],
  ["prov", "proverbes"],
  ["heb", "hebreux"],
  ["jac", "jacques"],
  ["nom", "nombres"],
  ["gen", "genese"],
  ["jer", "jeremie"],
  ["esd", "esdras"],
  ["est", "esther"],
  ["dan", "daniel"],
  ["abd", "abdias"],
  ["mic", "michee"],
  ["act", "actes"],
  ["agg", "aggee"],
  ["nah", "nahum"],
  ["jon", "jonas"],
  ["jos", "josue"],
  ["jug", "juges"],
  ["exo", "exode"],
  ["esa", "esaie"],
  ["cant", "cantique"],
  ["qoh", "ecclesiaste"],
  ["mt", "matthieu"],
  ["mc", "marc"],
  ["lc", "luc"],
  ["jn", "jean"],
  ["ac", "actes"],
  ["rm", "romains"],
  ["ga", "galates"],
  ["ep", "ephesiens"],
  ["ph", "philippiens"],
  ["tt", "tite"],
  ["he", "hebreux"],
  ["jc", "jacques"],
  ["ap", "apocalypse"],
  ["gn", "genese"],
  ["ex", "exode"],
  ["lv", "levitique"],
  ["nb", "nombres"],
  ["nm", "nombres"],
  ["dt", "deuteronome"],
  ["jg", "juges"],
  ["rt", "ruth"],
  ["ne", "nehemie"],
  ["jb", "job"],
  ["ps", "psaumes"],
  ["pr", "proverbes"],
  ["qo", "ecclesiaste"],
  ["ec", "ecclesiaste"],
  ["ct", "cantique"],
  ["is", "esaie"],
  ["jr", "jeremie"],
  ["lm", "lamentations"],
  ["ez", "ezechiel"],
  ["dn", "daniel"],
  ["os", "osee"],
  ["jl", "joel"],
  ["am", "amos"],
  ["ab", "abdias"],
  ["mi", "michee"],
  ["na", "nahum"],
  ["ha", "habacuc"],
  ["so", "sophonie"],
  ["ag", "aggee"],
  ["za", "zacharie"],
  ["ml", "malachie"],
  ["marc", "marc"],
  ["luc", "luc"],
  ["jean", "jean"],
  ["tite", "tite"],
  ["jude", "jude"],
  ["ruth", "ruth"],
  ["job", "job"],
  ["amos", "amos"],
  ["osee", "osee"],
  ["joel", "joel"],
  ["1 maccabees", "1-maccabees"],
  ["2 maccabees", "2-maccabees"],
  ["3 maccabees", "3-maccabees"],
  ["4 maccabees", "4-maccabees"],
  ["1 maccabees", "1-maccabees"],
  ["2 maccabees", "2-maccabees"],
  ["1 m", "1-maccabees"],
  ["2 m", "2-maccabees"],
  ["1 mac", "1-maccabees"],
  ["2 mac", "2-maccabees"],
  ["siracide", "siracide"],
  ["ecclesiastique", "siracide"],
  ["sagesse", "sagesse"],
  ["judith", "judith"],
  ["tobie", "tobie"],
  ["baruch", "baruch"],
  ["jdt", "judith"],
  ["sir", "siracide"],
  ["sag", "sagesse"],
  ["sg", "sagesse"],
  ["si", "siracide"],
  ["tb", "tobie"],
  ["ba", "baruch"],
].sort((a, b) => b[0].length - a[0].length);

function matchBook(folded) {
  for (const [alias, id] of ALIASES) {
    if (folded === alias) return { id, rest: "" };
    if (!folded.startsWith(alias)) continue;
    const next = folded[alias.length];
    if (next && !/[\s,:(\d]/.test(next)) continue;
    return { id, rest: folded.slice(alias.length).trim() };
  }
  return null;
}

function mergeRanges(ranges) {
  if (!ranges.length) return [];
  const sorted = [...ranges].sort((a, b) => a.start - b.start);
  const out = [{ ...sorted[0] }];
  for (const r of sorted.slice(1)) {
    const last = out[out.length - 1];
    if (r.start <= last.end + 1) last.end = Math.max(last.end, r.end);
    else out.push({ ...r });
  }
  return out;
}

/** "2-3, 5, 7-8" / "13-15.29-32" / "1.6-7" → disjoint ranges. */
export function verseRanges(rest) {
  if (!rest) return [];
  const cut = rest.search(/[–—]\s*\d+\s*[,:]\s*\d+/);
  const chunk = cut >= 0 ? rest.slice(0, cut) : rest;
  const parts = chunk.split(/[,.]/).map((s) => s.trim()).filter(Boolean);
  const ranges = [];
  for (const p of parts) {
    const m = /(\d+)[a-z]?(?:\s*[-–—]\s*(\d+)[a-z]?)?/.exec(p);
    if (!m) continue;
    const start = parseInt(m[1], 10);
    const end = m[2] ? parseInt(m[2], 10) : start;
    ranges.push({ start, end: Math.max(start, end) });
  }
  return mergeRanges(ranges);
}

/**
 * Parse refs like "Mt 5, 1-12" / "Ps 33 (34), 2-3, 4-5" / "1 R 19, 4-8"
 * / "Ep 4, 30 – 5, 2" (first chapter only).
 * @returns {{ bookId: string, chapter: number, verseStart: number|null, verseEnd: number|null }|null}
 */
export function parseRefString(refStr) {
  if (!refStr) return null;
  const folded = fold(refStr);
  if (!folded) return null;

  const hit = matchBook(folded);
  if (!hit || !BOOK_BY_ID[hit.id]) return null;

  const rest = hit.rest;
  const ch = /^(\d+)\s*(?:\(\s*(\d+)\s*\))?\s*[,:]?\s*(.*)$/.exec(rest);
  if (!ch) {
    return { bookId: hit.id, chapter: 1, verseStart: null, verseEnd: null };
  }

  const chapter = ch[2] ? parseInt(ch[2], 10) : parseInt(ch[1], 10);
  const altChapter = ch[2] ? parseInt(ch[1], 10) : null;
  const ranges = verseRanges(ch[3] || "");
  return {
    bookId: hit.id,
    chapter,
    altChapter,
    ranges,
    verseStart: ranges[0]?.start ?? null,
    verseEnd: ranges[ranges.length - 1]?.end ?? null,
  };
}

export function canExpand(ref) {
  return !!(ref && BOOK_BY_ID[ref.bookId]);
}
