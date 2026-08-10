/** In-memory book loader with Map cache. */

const cache = new Map();

const BOOK_PATH = {
  matthieu: "../data/evangiles/matthieu.json",
  marc: "../data/evangiles/marc.json",
  luc: "../data/evangiles/luc.json",
  jean: "../data/evangiles/jean.json",
};

/** Resolve data path relative to site root (works from / and /lire/). */
function resolveBookUrl(id) {
  const file = `data/evangiles/${id}.json`;
  // Prefer absolute-from-root style when served at domain root
  const rootUrl = `/${file}`;
  // Fallback relative from current path depth
  const depth = window.location.pathname.split("/").filter(Boolean).length;
  // if path ends with .html, last segment is file not dir
  const path = window.location.pathname;
  const isFile = /\.html?$/i.test(path);
  const dirDepth = Math.max(0, depth - (isFile ? 1 : 0));
  const rel = `${"../".repeat(dirDepth)}${file}`;
  return { rootUrl, rel };
}

/**
 * @param {string} id - matthieu|marc|luc|jean
 * @returns {Promise<object>}
 */
export async function loadBook(id) {
  if (cache.has(id)) return cache.get(id);

  const { rootUrl, rel } = resolveBookUrl(id);
  let res = await fetch(rootUrl);
  if (!res.ok) {
    res = await fetch(rel);
  }
  if (!res.ok) {
    throw new Error(`Livre introuvable: ${id} (${res.status})`);
  }
  const book = await res.json();
  cache.set(id, book);
  return book;
}

export function getChapter(book, n) {
  if (!book?.chapters) return null;
  return book.chapters.find((c) => c.n === n) || book.chapters[n - 1] || null;
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

export const GOSPEL_IDS = Object.freeze(["matthieu", "marc", "luc", "jean"]);

export function isGospel(id) {
  return GOSPEL_IDS.includes(id);
}
