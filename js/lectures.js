/**
 * Daily mass readings.
 * Source 1: data/lectures/mdj-archive.json (refs only, local text).
 * Then the pages that publish the date and the refs in HTML.
 * If those fail: another day from the archive, then data/lectures/sample.json.
 */

import { loadChapter } from "./data-loader.js";
import { excerptText } from "./render-evangile.js";
import { parseRefString, canExpand } from "./refs.js";
import { getActiveEdition } from "./editions.js";
import { intlLocale } from "./i18n.js";

/** Pages that print the date and the verse refs. Order is the fallback order. */
const FALLBACK_PAGES = [
  "https://eglise.catholique.fr/textes-du-jour/",
  "https://www.prionseneglise.fr/textes-du-jour",
  "https://www.paxcoeur.com/messe-du-jour/",
  "https://missel.online",
];
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

/** One fetch of mdj-archive.json, then a date → row map. Null if the file is absent. */
let archivePromise = null;

function loadArchive() {
  if (!archivePromise) archivePromise = fetchArchive();
  return archivePromise;
}

async function fetchArchive() {
  try {
    const { rootUrl, rel } = dataUrl("mdj-archive.json");
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
    console.warn("mdj-archive.json unavailable:", err);
    return null;
  }
}

function mapReading(item, index) {
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
  // A psalm is often printed as "88 (89), 2-3" and leaves the book name off.
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
    // Excerpt for display only — never used as full book text
    excerpt: (item.contenu || item.texte || item.titre || "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim(),
  };
}

/** Fill a short excerpt from the local edition when the row has only a reference. */
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
        // Prefer the local excerpt. Keep the row text if the chapter is missing.
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

/** Cookie rows use collapsed types; the archive keeps the raw types. */
function messeFromRow(date, row) {
  const readings = (row.r || []).map(([type, refStr], index) =>
    mapReading({ type, ref: refStr }, index)
  );
  if (!readings.length) return null;
  return {
    date,
    liturgical_title: row.t || "",
    source: "archive",
    readings,
  };
}

/** @returns {object|null} cookie row for this date, without excerpts */
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

/** Same stock day for a given date, so a repaint does not shuffle the Mass. */
function pickStock(archive, date) {
  const rows = [...archive.values()];
  if (!rows.length) return null;
  let h = 0;
  for (let i = 0; i < date.length; i++) h = (Math.imul(h, 31) + date.charCodeAt(i)) >>> 0;
  return rows[h % rows.length];
}

const READINGS_FALLBACK = "readingsFallback";

/** Last day stored in mdj-archive.json, or "" when the file is missing. */
export async function archiveHorizon() {
  const archive = await loadArchive();
  if (!archive || !archive.size) return "";
  let last = "";
  for (const key of archive.keys()) if (key > last) last = key;
  return last;
}

function plainHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, "\n")
    .replace(/&#0?39;/g, "'")
    .replace(/&nbsp;|\u00a0/g, " ");
}

function refIn(chunk) {
  const parts = [...chunk.matchAll(/\(([^()]*(?:\([^()]*\)[^()]*)*)\)/g)].map((m) =>
    m[1].replace(/\s+/g, " ").trim()
  );
  for (let i = parts.length - 1; i >= 0; i--) {
    const ref = parts[i];
    if (!/\d/.test(ref) || !/[A-Za-zÉÈ]/.test(ref)) continue;
    if (/^ps\b/i.test(ref)) return ref.replace(/^ps\b/i, "Ps");
    if (/^\d/.test(ref)) return `Ps ${ref}`;
    return ref;
  }
  return "";
}

/** One of the fallback pages, only when it is the requested date. */
async function fetchFallbackPage(date) {
  for (const url of FALLBACK_PAGES) {
    try {
      const res = await fetch(url, { headers: { Accept: "text/html" } });
      if (!res.ok) continue;
      const html = await res.text();
      const stamp = html.match(/datetime="(\d{4}-\d{2}-\d{2})"/);
      if (!stamp || stamp[1] !== date) continue;
      const lines = plainHtml(html)
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);
      const refs = [];
      const seen = new Set();
      for (let i = 0; i < lines.length; i++) {
        const head = lines[i].match(
          /^(Première lecture|Deuxième lecture|Psaume|Évangile|Evangile)\b/i
        );
        if (!head) continue;
        let ref = refIn(`${lines[i]} ${lines[i + 1] || ""}`);
        if (!ref) continue;
        const label = head[1].toLowerCase();
        const type = label.startsWith("év") || label.startsWith("ev")
          ? "evangile"
          : label.startsWith("ps")
            ? "psaume"
            : label.startsWith("deux")
              ? "lecture_2"
              : "lecture_1";
        if (seen.has(type)) continue;
        seen.add(type);
        if (type === "psaume" && !/^ps\b/i.test(ref)) ref = `Ps ${ref}`;
        refs.push([type, ref]);
      }
      if (!refs.some(([type]) => type === "evangile")) continue;
      const built = messeFromRow(date, { t: "", r: refs });
      if (!built) continue;
      rememberMesse(built);
      return built;
    } catch (err) {
      console.warn("mass page skipped:", url, err);
    }
  }
  return null;
}

/**
 * Load lectures for a date (default: today Paris).
 * Order: mdj-archive.json, cookie, then the fallback pages.
 * A missing day uses another archive day, then sample.json.
 * An archive hit is not copied into the cookie.
 * @returns {Promise<{ data: object, source: 'archive'|'cache'|'page'|'stock'|'sample'|'empty', error?: string }>}
 */
export async function loadLectures(date = todayParis()) {
  const archive = await loadArchive();
  const stored = archive && archive.get(date);
  if (stored) {
    const built = messeFromRow(date, stored);
    if (built) return { data: await enrichWithPd(built), source: "archive" };
  }
  const cached = recallMesse(date);
  if (cached) {
    return { data: await enrichWithPd(cached), source: "cache" };
  }
  const page = await fetchFallbackPage(date);
  if (page) return { data: await enrichWithPd(page), source: "page" };
  const row = archive && pickStock(archive, date);
  const built = row && messeFromRow(date, row);
  if (built) {
    return {
      data: await enrichWithPd(built),
      source: "stock",
      error: READINGS_FALLBACK,
    };
  }
  try {
    const sample = await fetchSample();
    let data = {
      ...sample,
      date,
      liturgical_title: String(sample.liturgical_title || "")
        .replace(/\s*\(exemple\)\s*/i, "")
        .trim(),
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
    return { data, source: "sample", error: READINGS_FALLBACK };
  } catch (e2) {
    return {
      data: { date, liturgical_title: "", readings: [], source: "empty" },
      source: "empty",
      error: READINGS_FALLBACK,
    };
  }
}
