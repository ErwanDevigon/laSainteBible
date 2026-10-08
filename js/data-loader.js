/** In-memory book / version-index loader. */

import {
  GOSPEL_IDS as CANON_GOSPELS,
  isGospel as canonIsGospel,
  VERSIONS,
  versionIdsByYear,
} from "./books.js";
/** Runtime books: data/livres/{edition}/{id}.json only. */

const cache = new Map();
const chapterCache = new Map();
const indexCache = new Map();
let coveragePromise = null;
let qumranCatalogPromise = null;
const QUMRAN_MS_KEY = "lsb-qumran-ms";
/** Prefix that already returned JSON. Skips the second URL after the first hit. */
let urlBase = null;

export const DEFAULT_EDITION = "ostervald";

export function resolveUrls(file) {
  const rootUrl = `/${file}`;
  const depth = window.location.pathname.split("/").filter(Boolean).length;
  const path = window.location.pathname;
  const isFile = /\.html?$/i.test(path);
  const dirDepth = Math.max(0, depth - (isFile ? 1 : 0));
  const rel = `${"../".repeat(dirDepth)}${file}`;
  // Relative first: works at the domain root and under a path prefix.
  return rootUrl === rel ? [rel] : [rel, rootUrl];
}

export async function fetchJson(file) {
  if (urlBase != null) {
    try {
      const res = await fetch(urlBase + file);
      if (res.ok) return { ok: true, data: await res.json() };
    } catch {
      /* prefix stale — rediscover */
    }
    urlBase = null;
  }
  let lastStatus = 0;
  for (const url of resolveUrls(file)) {
    let res;
    try {
      res = await fetch(url);
    } catch {
      continue;
    }
    lastStatus = res.status;
    if (!res.ok) continue;
    urlBase = url.endsWith(file) ? url.slice(0, url.length - file.length) : "";
    return { ok: true, data: await res.json() };
  }
  return { ok: false, status: lastStatus };
}

function bookFiles(id, edition) {
  return [`data/livres/${edition}/${id}.json`];
}

function cacheKey(id, edition) {
  return `${edition || DEFAULT_EDITION}:${id}`;
}

export function readQumranChoice(bookId) {
  try {
    const all = JSON.parse(localStorage.getItem(QUMRAN_MS_KEY) || "{}");
    const id = all?.[bookId];
    return typeof id === "string" ? id : "";
  } catch {
    return "";
  }
}

export function writeQumranChoice(bookId, scrollId) {
  let all = {};
  try {
    all = JSON.parse(localStorage.getItem(QUMRAN_MS_KEY) || "{}") || {};
  } catch {
    all = {};
  }
  if (scrollId) all[bookId] = scrollId;
  else delete all[bookId];
  localStorage.setItem(QUMRAN_MS_KEY, JSON.stringify(all));
  for (const key of [...cache.keys()]) {
    if (key.startsWith("qumran:") && key.endsWith(`:${bookId}`)) cache.delete(key);
  }
  for (const key of [...chapterCache.keys()]) {
    if (key.startsWith("qumran:") && key.includes(`:${bookId}:`)) chapterCache.delete(key);
  }
}

export function loadQumranCatalog() {
  if (!qumranCatalogPromise) {
    qumranCatalogPromise = (async () => {
      const hit = await fetchJson("data/livres/qumran/catalog.json");
      return hit.ok ? hit.data : null;
    })();
  }
  return qumranCatalogPromise;
}

export function qumranScrollsFor(bookId, catalog) {
  const list = catalog?.byBook?.[bookId];
  return Array.isArray(list) ? list.filter(Boolean) : [];
}

export function qumranSiglum(catalog, scrollId) {
  return catalog?.manuscripts?.[scrollId]?.siglum || scrollId;
}

async function loadQumranBook(id) {
  const catalog = await loadQumranCatalog();
  const list = qumranScrollsFor(id, catalog);
  if (!list.length) throw new Error(`Livre introuvable: ${id} (qumran)`);
  const wanted = readQumranChoice(id);
  const scroll = list.includes(wanted) ? wanted : list[0];
  const key = `qumran:${scroll}:${id}`;
  if (cache.has(key)) return cache.get(key);
  const hit = await fetchJson(`data/livres/qumran/mss/${scroll}/${id}.json`);
  if (!hit.ok) {
    throw new Error(`Livre introuvable: ${id} (qumran/${scroll}, ${hit.status})`);
  }
  cache.set(key, hit.data);
  return hit.data;
}

export async function loadBook(id, edition = DEFAULT_EDITION) {
  if ((edition || DEFAULT_EDITION) === "qumran") return loadQumranBook(id);
  const key = cacheKey(id, edition);
  if (cache.has(key)) return cache.get(key);

  let lastStatus = 0;
  for (const file of bookFiles(id, edition)) {
    const hit = await fetchJson(file);
    if (!hit.ok) {
      lastStatus = hit.status;
      continue;
    }
    cache.set(key, hit.data);
    return hit.data;
  }
  throw new Error(`Livre introuvable: ${id} (${edition}, ${lastStatus})`);
}

export async function tryLoadBook(id, edition = DEFAULT_EDITION) {
  try {
    return await loadBook(id, edition);
  } catch {
    return null;
  }
}

export async function loadVersionIndex(versionId) {
  if (indexCache.has(versionId)) return indexCache.get(versionId);
  const hit = await fetchJson(`data/livres/${versionId}/index.json`);
  if (!hit.ok) {
    indexCache.set(versionId, null);
    return null;
  }
  indexCache.set(versionId, hit.data);
  return hit.data;
}

async function loadCoverage() {
  if (!coveragePromise) {
    coveragePromise = (async () => {
      const hit = await fetchJson("data/coverage.json");
      return hit.ok ? hit.data : null;
    })();
  }
  return coveragePromise;
}

export async function listVersionIds() {
  const cov = await loadCoverage();
  if (cov?.versions?.length) return cov.versions.filter((id) => VERSIONS[id]);
  const ids = Object.keys(VERSIONS);
  const found = await Promise.all(
    ids.map(async (id) => ((await loadVersionIndex(id)) ? id : null))
  );
  return found.filter(Boolean);
}

export async function versionsForBook(bookId) {
  const cov = await loadCoverage();
  if (cov?.books) {
    const list = cov.books[bookId];
    return Array.isArray(list) ? list.filter((id) => VERSIONS[id]) : [];
  }
  const ids = await listVersionIds();
  const out = [];
  for (const id of ids) {
    const idx = await loadVersionIndex(id);
    if (idx?.books?.some((b) => b.id === bookId)) out.push(id);
  }
  return out;
}

/** null when coverage is missing — caller falls back to the book JSON. */
export async function malachiUsesChapter4(edition) {
  const cov = await loadCoverage();
  if (!cov?.malachiCh4) return null;
  return cov.malachiCh4.includes(edition);
}

/**
 * Load a book from `edition`, else the same language, else any edition that has it.
 * Protestant active + deuterocanon (Sg, Tb, …) → Crampon when French.
 */
export function rankFallback(ids, edition) {
  const lang = VERSIONS[edition]?.lang;
  const stack = versionIdsByYear(false);
  return ids
    .filter((id) => id !== edition)
    .sort((a, b) => {
      const la = VERSIONS[a]?.lang === lang ? 0 : 1;
      const lb = VERSIONS[b]?.lang === lang ? 0 : 1;
      if (la !== lb) return la - lb;
      const ia = stack.indexOf(a);
      const ib = stack.indexOf(b);
      return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib);
    });
}

/**
 * One chapter, for the mass and for a citation card.
 * The reader still loads the whole book.
 * Falls back to the cached or fetched book if the chapter file is absent.
 */
export async function loadChapter(id, chapterN, edition = DEFAULT_EDITION) {
  const n = +chapterN;
  if (!Number.isFinite(n)) return null;
  if ((edition || DEFAULT_EDITION) === "qumran") return loadQumranChapter(id, n);
  const key = `${cacheKey(id, edition)}:${n}`;
  if (chapterCache.has(key)) return chapterCache.get(key);
  const bookKey = cacheKey(id, edition);
  if (cache.has(bookKey)) {
    const ch = getChapter(cache.get(bookKey), n);
    if (ch) {
      chapterCache.set(key, ch);
      return ch;
    }
  }
  const hit = await fetchJson(`data/chapitres/${edition || DEFAULT_EDITION}/${id}/${n}.json`);
  if (hit.ok) {
    chapterCache.set(key, hit.data);
    return hit.data;
  }
  const book = await tryLoadBook(id, edition);
  const ch = book ? getChapter(book, n) : null;
  if (ch) chapterCache.set(key, ch);
  return ch;
}

async function loadQumranChapter(id, n) {
  const catalog = await loadQumranCatalog();
  const list = qumranScrollsFor(id, catalog);
  if (!list.length) return null;
  const wanted = readQumranChoice(id);
  const scroll = list.includes(wanted) ? wanted : list[0];
  const key = `qumran:${scroll}:${id}:${n}`;
  if (chapterCache.has(key)) return chapterCache.get(key);
  const bookKey = `qumran:${scroll}:${id}`;
  if (cache.has(bookKey)) {
    const ch = getChapter(cache.get(bookKey), n);
    if (ch) {
      chapterCache.set(key, ch);
      return ch;
    }
  }
  const hit = await fetchJson(`data/chapitres/qumran/${scroll}/${id}/${n}.json`);
  if (hit.ok) {
    chapterCache.set(key, hit.data);
    return hit.data;
  }
  try {
    const book = await loadQumranBook(id);
    const ch = getChapter(book, n);
    if (ch) chapterCache.set(key, ch);
    return ch;
  } catch {
    return null;
  }
}

export async function tryLoadChapterFallback(id, chapterN, edition = DEFAULT_EDITION) {
  const direct = await loadChapter(id, chapterN, edition);
  if (direct) return { chapter: direct, edition, fallback: false };
  const ids = await versionsForBook(id);
  const ranked = rankFallback(ids, edition);
  for (const pick of ranked.slice(0, 2)) {
    const chapter = await loadChapter(id, chapterN, pick);
    if (chapter) return { chapter, edition: pick, fallback: true };
  }
  return { chapter: null, edition, fallback: false };
}

export async function tryLoadBookFallback(id, edition = DEFAULT_EDITION) {
  const direct = await tryLoadBook(id, edition);
  if (direct) return { book: direct, edition, fallback: false };
  const ids = await versionsForBook(id);
  const ranked = rankFallback(ids, edition);
  const pick = ranked[0];
  if (!pick) return { book: null, edition, fallback: false };
  const book = await tryLoadBook(id, pick);
  if (book) return { book, edition: pick, fallback: true };
  const spare = ranked[1];
  if (!spare) return { book: null, edition, fallback: false };
  const second = await tryLoadBook(id, spare);
  if (second) return { book: second, edition: spare, fallback: true };
  return { book: null, edition, fallback: false };
}

export function getChapter(book, n) {
  if (!book?.chapters) return null;
  return book.chapters.find((c) => c.n === n) || book.chapters[n - 1] || null;
}

export function chapterCount(book) {
  return book?.chapters?.length ?? 0;
}

export function chapterNums(book) {
  const seen = new Set();
  const out = [];
  for (const ch of book?.chapters || []) {
    if (seen.has(ch.n)) continue;
    seen.add(ch.n);
    out.push(ch.n);
  }
  return out;
}

export function getVerseRange(book, chapterN, vStart, vEnd) {
  const ch = getChapter(book, chapterN);
  if (!ch) return [];
  const start = vStart ?? 1;
  const end = vEnd ?? Infinity;
  return ch.verses.filter((v) => v.n >= start && v.n <= end);
}

export function clearCache() {
  cache.clear();
  chapterCache.clear();
  indexCache.clear();
  coveragePromise = null;
  urlBase = null;
}

export const GOSPEL_IDS = CANON_GOSPELS;

export function isGospel(id) {
  return canonIsGospel(id);
}
