/** In-memory book / version-index loader. */

import {
  GOSPEL_IDS as CANON_GOSPELS,
  isGospel as canonIsGospel,
  VERSIONS,
  versionIdsByYear,
} from "./books.js";
/** Runtime books: data/livres/{edition}/{id}.json only. */

const cache = new Map();
const indexCache = new Map();
let coveragePromise = null;
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

export async function loadBook(id, edition = DEFAULT_EDITION) {
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
export async function tryLoadBookFallback(id, edition = DEFAULT_EDITION) {
  const direct = await tryLoadBook(id, edition);
  if (direct) return { book: direct, edition, fallback: false };
  const ids = await versionsForBook(id);
  if (!ids.length) return { book: null, edition, fallback: false };
  const lang = VERSIONS[edition]?.lang;
  const stack = versionIdsByYear(false);
  ids.sort((a, b) => {
    const la = VERSIONS[a]?.lang === lang ? 0 : 1;
    const lb = VERSIONS[b]?.lang === lang ? 0 : 1;
    if (la !== lb) return la - lb;
    const ia = stack.indexOf(a);
    const ib = stack.indexOf(b);
    return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib);
  });
  for (const ed of ids) {
    if (ed === edition) continue;
    const book = await tryLoadBook(id, ed);
    if (book) return { book, edition: ed, fallback: true };
  }
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
  indexCache.clear();
  coveragePromise = null;
  urlBase = null;
}

export const GOSPEL_IDS = CANON_GOSPELS;

export function isGospel(id) {
  return canonIsGospel(id);
}
