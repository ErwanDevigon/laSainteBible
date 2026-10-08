/**
 * AELF daily readings adapter.
 * Same calendar as https://www.aelf.org/AAAA-MM-JJ/romain/messe
 * JSON feed: https://api.aelf.org/v1/messes/{date}/romain
 * Fallback: data/lectures/sample.json
 * A year of refs, no prose: data/lectures/aelf-year.json
 */

import { loadChapter } from "./data-loader.js";
import { excerptText } from "./render-evangile.js";
import { parseRefString, canExpand } from "./refs.js";
import { getActiveEdition } from "./editions.js";
import { intlLocale } from "./i18n.js";

const ZONE = "romain";
/** Visited days only: title + verse refs. One day is about 100 encoded bytes. */
const MESSE_COOKIE = "lsb-messes";
const MESSE_COOKIE_BUDGET = 3500;
const TYPE_OUT = { premiere: "p", psaume: "s", evangile: "e", lecture: "l" };
const TYPE_IN = { p: "premiere", s: "psaume", e: "evangile", l: "lecture" };

export { parseRefString } from "./refs.js";

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

/** @param {string} iso YYYY-MM-DD @param {number} days */
export function shiftIsoDate(iso, days) {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days, 12));
  return dt.toISOString().slice(0, 10);
}

export function formatDateFr(isoDate) {
  const [y, m, d] = isoDate.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 12));
  return new Intl.DateTimeFormat(intlLocale(), {
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

/** One fetch of aelf-year.json, then a date → row map. Null if the file is absent. */
let yearIndexPromise = null;

function loadYearIndex() {
  if (!yearIndexPromise) yearIndexPromise = fetchYearIndex();
  return yearIndexPromise;
}

async function fetchYearIndex() {
  try {
    const { rootUrl, rel } = dataUrl("aelf-year.json");
    let res = await fetch(rootUrl);
    if (!res.ok) res = await fetch(rel);
    if (!res.ok) return null;
    const json = await res.json();
    const byDate = new Map();
    for (const row of json.days || []) {
      if (row && row.d && row.r && row.r.length) byDate.set(row.d, row);
    }
    return byDate;
  } catch (err) {
    console.warn("aelf-year.json unavailable:", err);
    return null;
  }
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

  let refStr = (item.ref || item.reference || "").replace(/\u00a0/g, " ").trim();
  // AELF often prints a psalm as "88 (89), 2-3" and leaves the book name off.
  if (type === "psaume" && refStr && !parseRefString(refStr)) {
    const withBook = `Ps ${refStr}`;
    if (parseRefString(withBook)) refStr = withBook;
  }
  const parsed = parseRefString(refStr);
  const expandable = canExpand(parsed);

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
  const edition = getActiveEdition();
  const readings = await Promise.all(
    payload.readings.map(async (r) => {
      const copy = { ...r };
      if (!(copy.expandable && copy.ref)) return copy;
      try {
        const ch = await loadChapter(copy.ref.bookId, copy.ref.chapter, edition);
        const pd = ch
          ? excerptText(
              { chapters: [ch] },
              copy.ref.chapter,
              copy.ref.verseStart,
              copy.ref.verseEnd,
              5
            )
          : "";
        // Prefer short PD excerpt for visual unity; keep AELF if PD fails
        if (pd) copy.excerpt = pd;
        if (!copy.ref_display) {
          copy.ref_display = `${copy.ref.bookId} ${copy.ref.chapter}, ${copy.ref.verseStart}-${copy.ref.verseEnd}`;
        }
      } catch {
        /* keep as-is */
      }
      return copy;
    })
  );
  return { ...payload, readings };
}

function parseMesseCookie(text) {
  if (!text || !text.trim()) return [];
  const rows = [];
  for (const line of text.split("\n")) {
    const parts = line.split("\t");
    if (parts.length < 3 || !parts[0] || !parts[2]) continue;
    const refs = [];
    for (const piece of parts[2].split("|")) {
      const cut = piece.indexOf("=");
      if (cut < 1) continue;
      const ref = piece.slice(cut + 1);
      if (!ref) continue;
      refs.push([TYPE_IN[piece.slice(0, cut)] || "lecture", ref]);
    }
    if (refs.length) rows.push({ d: parts[0], t: parts[1], r: refs });
  }
  return rows;
}

function formatMesseCookie(list) {
  return list
    .map((row) => {
      const refs = row.r
        .map(([type, ref]) => `${TYPE_OUT[type] || "l"}=${ref}`)
        .join("|");
      const title = String(row.t || "").replace(/[\t\n]/g, " ");
      return `${row.d}\t${title}\t${refs}`;
    })
    .join("\n");
}

function messeCookieList() {
  if (typeof document === "undefined") return [];
  const raw = document.cookie
    .split("; ")
    .find((part) => part.startsWith(`${MESSE_COOKIE}=`));
  if (!raw) return [];
  const value = raw.slice(MESSE_COOKIE.length + 1);
  for (const text of [value, safeDecode(value)]) {
    const rows = parseMesseCookie(text);
    if (rows.length) return rows;
  }
  return [];
}

function safeDecode(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}

function writeMesseCookie(list) {
  let body = formatMesseCookie(list);
  while (list.length > 1 && encodeURIComponent(body).length > MESSE_COOKIE_BUDGET) {
    list.shift();
    body = formatMesseCookie(list);
  }
  const secure = location.protocol === "https:" ? "; Secure" : "";
  document.cookie =
    `${MESSE_COOKIE}=${encodeURIComponent(body)}; Path=/; Max-Age=31536000; SameSite=Lax${secure}`;
}

/** Cookie rows use collapsed types; the year file uses raw AELF types. Both go through mapAelfReading. */
function messeFromRow(date, row) {
  const readings = (row.r || []).map(([type, refStr], index) =>
    mapAelfReading({ type, ref: refStr }, index)
  );
  if (!readings.length) return null;
  return {
    date,
    liturgical_title: row.t || "Messe du jour",
    source: "aelf",
    readings,
  };
}

/** @returns {object|null} payload shaped like normalizeAelf, without excerpts */
function recallMesse(date) {
  const list = messeCookieList();
  const i = list.findIndex((row) => row && row.d === date);
  if (i < 0) return null;
  const [row] = list.splice(i, 1);
  list.push(row);
  writeMesseCookie(list);
  return messeFromRow(date, row);
}

function rememberMesse(data) {
  if (typeof document === "undefined" || !data?.date) return;
  const refs = (data.readings || [])
    .filter((r) => r.ref_display)
    .map((r) => [r.type, r.ref_display]);
  if (!refs.length) return;
  const title = (data.liturgical_title || "").trim();
  const keep =
    title && !/^messe du jour$/i.test(title) && !/^lectures$/i.test(title) ? title : "";
  const list = messeCookieList().filter((row) => row && row.d !== data.date);
  list.push({ d: data.date, t: keep, r: refs });
  writeMesseCookie(list);
}

/**
 * Load lectures for a date (default: today Paris).
 * Order: cookie (days already opened), then aelf-year.json, then AELF.
 * The year file is not copied into the cookie.
 * @returns {Promise<{ data: object, source: 'aelf'|'cache'|'year'|'sample'|'empty', error?: string }>}
 */
export async function loadLectures(date = todayParis()) {
  const cached = recallMesse(date);
  if (cached) {
    return { data: await enrichWithPd(cached), source: "cache" };
  }
  const year = await loadYearIndex();
  const stored = year && year.get(date);
  if (stored) {
    const built = messeFromRow(date, stored);
    if (built) return { data: await enrichWithPd(built), source: "year" };
  }
  const url = `https://api.aelf.org/v1/messes/${date}/${ZONE}`;
  try {
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error(`AELF HTTP ${res.status}`);
    const json = await res.json();
    let data = normalizeAelf(json, date);
    rememberMesse(data);
    data = await enrichWithPd(data);
    return { data, source: "aelf" };
  } catch (err) {
    console.warn("AELF unavailable, fallback sample:", err);
    try {
      const sample = await fetchSample();
      let data = {
        ...sample,
        date: sample.date || date,
        source: "sample",
        readings: (sample.readings || []).map((r) => {
          const parsed = r.ref || parseRefString(r.ref_display);
          return {
            ...r,
            ref: parsed,
            expandable: canExpand(parsed),
          };
        }),
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
