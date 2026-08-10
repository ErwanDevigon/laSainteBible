/**
 * AELF daily readings adapter.
 * Live: https://api.aelf.org/v1/messes/{date}/{zone}
 * Fallback: data/lectures/sample.json
 */

import { loadBook, isGospel } from "./data-loader.js";
import { excerptText } from "./render-evangile.js";

const ZONE = "france";

const BOOK_MAP = {
  mt: "matthieu",
  matthieu: "matthieu",
  "saint matthieu": "matthieu",
  mc: "marc",
  marc: "marc",
  "saint marc": "marc",
  lc: "luc",
  luc: "luc",
  "saint luc": "luc",
  jn: "jean",
  jean: "jean",
  "saint jean": "jean",
};

/**
 * @returns {string} YYYY-MM-DD in Europe/Paris
 */
export function todayParis() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function formatDateFr(isoDate) {
  const [y, m, d] = isoDate.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 12));
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(dt);
}

function dataUrl(file) {
  const rootUrl = `/data/lectures/${file}`;
  const path = window.location.pathname;
  const isFile = /\.html?$/i.test(path);
  const depth = path.split("/").filter(Boolean).length;
  const dirDepth = Math.max(0, depth - (isFile ? 1 : 0));
  const rel = `${"../".repeat(dirDepth)}data/lectures/${file}`;
  return { rootUrl, rel };
}

async function fetchSample() {
  const { rootUrl, rel } = dataUrl("sample.json");
  let res = await fetch(rootUrl);
  if (!res.ok) res = await fetch(rel);
  if (!res.ok) throw new Error("sample.json missing");
  return res.json();
}

/**
 * Parse refs like "Mt 5, 1-12" / "Jean 1, 1-18" / "Jn 20, 1-9"
 */
export function parseRefString(refStr) {
  if (!refStr) return null;
  const cleaned = refStr
    .normalize("NFC")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // Patterns: "Mt 5, 1-12a" | "Jean 3, 16" | "Lc 1, 1-4. 4, 14-21" (take first span)
  const m = /^((?:saint\s+)?(?:matthieu|marc|luc|jean|mt|mc|lc|jn))\s+(\d+)\s*[,:]\s*(\d+)[a-z]?(?:\s*[-–—]\s*(\d+)[a-z]?)?/i.exec(
    cleaned
  );
  if (!m) return null;

  const key = m[1].toLowerCase().replace(/^saint\s+/, "");
  const bookId = BOOK_MAP[key];
  if (!bookId) return null;

  return {
    bookId,
    chapter: parseInt(m[2], 10),
    verseStart: parseInt(m[3], 10),
    verseEnd: m[4] ? parseInt(m[4], 10) : parseInt(m[3], 10),
  };
}

function mapAelfReading(item, index) {
  const typeRaw = (item.type || item.intro_lue || "").toLowerCase();
  let type = "lecture";
  if (
    typeRaw === "evangile" ||
    typeRaw.includes("évangile") ||
    typeRaw.includes("evangile")
  ) {
    type = "evangile";
  } else if (typeRaw === "psaume" || typeRaw.includes("psaume")) {
    type = "psaume";
  } else if (typeRaw === "lecture_1" || typeRaw.includes("première") || index === 0) {
    type = "premiere";
  } else if (typeRaw === "lecture_2" || typeRaw.includes("deuxième")) {
    type = "lecture";
  }

  const refStr = item.ref || item.reference || "";
  const parsed = parseRefString(refStr);
  const expandable = !!(parsed && isGospel(parsed.bookId));

  const defaultLabel =
    type === "evangile"
      ? "Évangile"
      : type === "psaume"
        ? "Psaume"
        : type === "premiere"
          ? "Première lecture"
          : typeRaw === "lecture_2"
            ? "Deuxième lecture"
            : "Lecture";

  return {
    type,
    label: defaultLabel,
    ref_display: refStr.replace(/\u00a0/g, " ").trim(),
    ref: parsed,
    expandable,
    // AELF excerpt for display only — never used as full book text
    excerpt: (item.contenu || item.texte || item.titre || "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim(),
  };
}

function normalizeAelf(data, date) {
  const messes = data.messes || data;
  const messe = Array.isArray(messes) ? messes[0] : messes;
  const lectures = messe?.lectures || data.lectures || [];
  const title =
    messe?.nom ||
    data.informations?.jour_liturgique_nom ||
    data.informations?.fete ||
    "Messe du jour";

  return {
    date,
    liturgical_title: title,
    source: "aelf",
    readings: lectures.map(mapAelfReading),
  };
}

/**
 * Enrich expandable readings with PD excerpt when AELF text empty/unwanted.
 */
async function enrichWithPd(payload) {
  const readings = [];
  for (const r of payload.readings) {
    const copy = { ...r };
    if (copy.expandable && copy.ref) {
      try {
        const book = await loadBook(copy.ref.bookId);
        const pd = excerptText(
          book,
          copy.ref.chapter,
          copy.ref.verseStart,
          copy.ref.verseEnd,
          5
        );
        // Prefer short PD excerpt for visual unity; keep AELF if PD fails
        if (pd) copy.excerpt = pd;
        if (!copy.ref_display) {
          copy.ref_display = `${book.short} ${copy.ref.chapter}, ${copy.ref.verseStart}-${copy.ref.verseEnd}`;
        }
      } catch {
        /* keep as-is */
      }
    }
    readings.push(copy);
  }
  return { ...payload, readings };
}

/**
 * Load lectures for a date (default: today Paris).
 * @returns {Promise<{ data: object, source: 'aelf'|'sample', error?: string }>}
 */
export async function loadLectures(date = todayParis()) {
  const url = `https://api.aelf.org/v1/messes/${date}/${ZONE}`;
  try {
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error(`AELF HTTP ${res.status}`);
    const json = await res.json();
    let data = normalizeAelf(json, date);
    // If no gospel parsed, still return AELF payload
    data = await enrichWithPd(data);
    return { data, source: "aelf" };
  } catch (err) {
    console.warn("AELF unavailable, fallback sample:", err);
    try {
      const sample = await fetchSample();
      // rewrite sample date display to today for honesty? keep sample date + flag
      let data = {
        ...sample,
        date: sample.date || date,
        source: "sample",
      };
      data = await enrichWithPd(data);
      return {
        data,
        source: "sample",
        error: "Lectures AELF indisponibles — exemple affiché.",
      };
    } catch (e2) {
      return {
        data: {
          date,
          liturgical_title: "Messe du jour",
          readings: [],
          source: "empty",
        },
        source: "empty",
        error: "Aucune lecture disponible.",
      };
    }
  }
}
