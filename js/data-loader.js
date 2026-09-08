/** In-memory book / version-index loader. */

import { GOSPEL_IDS as CANON_GOSPELS, isGospel as canonIsGospel, VERSIONS } from "./books.js";
/** Runtime books: data/livres/{edition}/{id}.json only. */

const cache = new Map();
const indexCache = new Map();

export const DEFAULT_EDITION = "ostervald";

export function resolveUrls(file) {
  const rootUrl = `/${file}`;
  const depth = window.location.pathname.split("/").filter(Boolean).length;
  const path = window.location.pathname;
  const isFile = /\.html?$/i.test(path);
  const dirDepth = Math.max(0, depth - (isFile ? 1 : 0));
  const rel = `${"../".repeat(dirDepth)}${file}`;
  return [rootUrl, rel];
}

async function fetchJson(file) {
  let lastStatus = 0;
  for (const url of resolveUrls(file)) {
    const res = await fetch(url);
    lastStatus = res.status;
    if (!res.ok) continue;
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

export async function listVersionIds() {
  const ids = Object.keys(VERSIONS);
  const found = await Promise.all(ids.map(async (id) => ((await loadVersionIndex(id)) ? id : null)));
  return found.filter(Boolean);
}

export async function versionsForBook(bookId) {
  const ids = await listVersionIds();
  const out = [];
  for (const id of ids) {
    const idx = await loadVersionIndex(id);
    if (idx?.books?.some((b) => b.id === bookId)) out.push(id);
  }
  return out;
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
}

export const GOSPEL_IDS = CANON_GOSPELS;

export function isGospel(id) {
  return canonIsGospel(id);
}
