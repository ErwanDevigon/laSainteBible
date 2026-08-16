/** In-memory book loader with Map cache. */

import { GOSPEL_IDS as CANON_GOSPELS, isGospel as canonIsGospel } from "./books.js";

const cache = new Map();

const DEFAULT_EDITION = "segond-1910";

function bookFiles(id, edition) {
  if (!edition || edition === DEFAULT_EDITION) {
    return [`data/livres/${id}.json`, `data/evangiles/${id}.json`];
  }
  return [`data/evangiles/${edition}/${id}.json`, `data/${edition}/${id}.json`];
}

function resolveUrls(file) {
  const rootUrl = `/${file}`;
  const depth = window.location.pathname.split("/").filter(Boolean).length;
  const path = window.location.pathname;
  const isFile = /\.html?$/i.test(path);
  const dirDepth = Math.max(0, depth - (isFile ? 1 : 0));
  const rel = `${"../".repeat(dirDepth)}${file}`;
  return [rootUrl, rel];
}

function cacheKey(id, edition) {
  return `${edition || DEFAULT_EDITION}:${id}`;
}

/**
 * @param {string} id
 * @param {string} [edition] - segond-1910 (default) | septante | vulgate
 * @returns {Promise<object>}
 */
export async function loadBook(id, edition = DEFAULT_EDITION) {
  const key = cacheKey(id, edition);
  if (cache.has(key)) return cache.get(key);

  let lastStatus = 0;
  for (const file of bookFiles(id, edition)) {
    for (const url of resolveUrls(file)) {
      const res = await fetch(url);
      lastStatus = res.status;
      if (!res.ok) continue;
      const book = await res.json();
      cache.set(key, book);
      return book;
    }
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

export function getChapter(book, n) {
  if (!book?.chapters) return null;
  return book.chapters.find((c) => c.n === n) || book.chapters[n - 1] || null;
}

/** Source of truth for rail / loops — never hardcode a book length. */
export function chapterCount(book) {
  return book?.chapters?.length ?? 0;
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
}

export const GOSPEL_IDS = CANON_GOSPELS;

export function isGospel(id) {
  return canonIsGospel(id);
}
