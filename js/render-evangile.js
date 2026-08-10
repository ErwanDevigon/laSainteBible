/**
 * DOM builders for gospel chapters/verses.
 * Verses injected via textContent only (XSS-safe).
 */

function verseRow(chapterN, verse, { highlight = false } = {}) {
  const row = document.createElement("p");
  row.className = "verse";
  row.id = `c${chapterN}v${verse.n}`;
  row.dataset.verse = String(verse.n);
  if (highlight) row.dataset.highlight = "true";

  const vn = document.createElement("span");
  vn.className = "verse-num";
  vn.setAttribute("aria-hidden", "true");
  vn.textContent = String(verse.n);

  const vt = document.createElement("span");
  vt.className = "verse-text";
  vt.textContent = verse.t;

  row.appendChild(vn);
  row.appendChild(vt);
  return row;
}

/**
 * @param {object} chapter - { n, verses: [{n,t}] }
 * @param {{ highlightStart?: number, highlightEnd?: number, short?: string }} [opts]
 * @returns {HTMLElement}
 */
export function renderChapter(chapter, opts = {}) {
  const section = document.createElement("section");
  section.className = "chapter";
  section.id = `c${chapter.n}`;
  section.dataset.chapter = String(chapter.n);

  const label = document.createElement("div");
  label.className = "chapter-label";
  const num = document.createElement("span");
  num.className = "chapter-num";
  const short = opts.short || "";
  num.textContent = short ? `${short} ${chapter.n}` : String(chapter.n);
  label.appendChild(num);
  section.appendChild(label);

  const hs = opts.highlightStart;
  const he = opts.highlightEnd;

  for (const verse of chapter.verses) {
    const highlight =
      hs != null && he != null && verse.n >= hs && verse.n <= he;
    section.appendChild(verseRow(chapter.n, verse, { highlight }));
  }

  return section;
}

/**
 * Full chapter split into before / excerpt / after for mask dilatation.
 * @returns {{ root: HTMLElement, before: HTMLElement, excerpt: HTMLElement, after: HTMLElement, label: HTMLElement }}
 */
export function renderChapterMask(chapter, { short = "", verseStart, verseEnd } = {}) {
  const root = document.createElement("div");
  root.className = "chapter-mask";
  root.dataset.expanded = "false";
  root.dataset.chapter = String(chapter.n);

  const label = document.createElement("div");
  label.className = "chapter-label mask-label";
  const num = document.createElement("span");
  num.className = "chapter-num";
  num.textContent = short ? `${short} ${chapter.n}` : String(chapter.n);
  label.appendChild(num);
  // label lives in before zone (only visible when expanded) — also clone feel via CSS

  const beforeWrap = document.createElement("div");
  beforeWrap.className = "mask-zone mask-before";
  const beforeInner = document.createElement("div");
  beforeInner.className = "mask-zone-inner";
  beforeInner.appendChild(label);

  const excerpt = document.createElement("div");
  excerpt.className = "mask-excerpt";

  const afterWrap = document.createElement("div");
  afterWrap.className = "mask-zone mask-after";
  const afterInner = document.createElement("div");
  afterInner.className = "mask-zone-inner";

  const v1 = verseStart ?? 1;
  const v2 = verseEnd ?? verseStart ?? chapter.verses[chapter.verses.length - 1]?.n;

  for (const verse of chapter.verses) {
    if (verse.n < v1) {
      beforeInner.appendChild(verseRow(chapter.n, verse));
    } else if (verse.n > v2) {
      afterInner.appendChild(verseRow(chapter.n, verse));
    } else {
      excerpt.appendChild(verseRow(chapter.n, verse));
    }
  }

  // If no before verses, keep empty zone (collapses to 0)
  beforeWrap.appendChild(beforeInner);
  afterWrap.appendChild(afterInner);

  root.appendChild(beforeWrap);
  root.appendChild(excerpt);
  root.appendChild(afterWrap);

  return { root, before: beforeWrap, excerpt, after: afterWrap, label };
}

/**
 * Render full book into container (all chapters at once).
 */
export function renderBook(book, container, opts = {}) {
  container.replaceChildren();
  container.classList.add("book-body");

  const frag = document.createDocumentFragment();
  for (const chapter of book.chapters) {
    frag.appendChild(renderChapter(chapter, { short: book.short }));
  }
  container.appendChild(frag);

  if (opts.chapter) {
    scrollToRef(container, opts.chapter, opts.verse, {
      behavior: opts.behavior || "auto",
    });
  }
}

export function renderSingleChapter(book, chapterN, container, range = null) {
  container.replaceChildren();
  container.classList.add("book-body");
  const ch = book.chapters.find((c) => c.n === chapterN);
  if (!ch) {
    const p = document.createElement("p");
    p.className = "status-msg";
    p.textContent = `Chapitre ${chapterN} introuvable.`;
    container.appendChild(p);
    return;
  }
  const opts = range
    ? { highlightStart: range.start, highlightEnd: range.end, short: book.short }
    : { short: book.short };
  container.appendChild(renderChapter(ch, opts));
}

export function excerptText(book, chapterN, vStart, vEnd, maxVerses = 4) {
  const ch = book.chapters.find((c) => c.n === chapterN);
  if (!ch) return "";
  const start = vStart || 1;
  const end = vEnd || start;
  const verses = ch.verses.filter((v) => v.n >= start && v.n <= end);
  const slice = verses.slice(0, maxVerses);
  let text = slice.map((v) => v.t).join(" ");
  if (verses.length > maxVerses) text += "…";
  return text;
}

export function formatRef(short, chapter, vStart, vEnd) {
  if (vStart && vEnd && vStart !== vEnd) {
    return `${short} ${chapter}, ${vStart}-${vEnd}`;
  }
  if (vStart) return `${short} ${chapter}, ${vStart}`;
  return `${short} ${chapter}`;
}

/**
 * @param {ParentNode|null} root
 * @param {number} chapter
 * @param {number|null} [verse]
 * @param {{ behavior?: ScrollBehavior }} [opts]
 */
export function scrollToRef(root, chapter, verse, opts = {}) {
  const scope = root || document;
  let el = null;
  if (verse) {
    el =
      scope.querySelector(`#c${chapter}v${verse}`) ||
      document.getElementById(`c${chapter}v${verse}`);
  }
  if (!el) {
    el =
      scope.querySelector(`#c${chapter}`) ||
      document.getElementById(`c${chapter}`);
  }
  if (!el) return false;

  const behavior = opts.behavior ?? "smooth";
  // Instant jump after full layout — avoid smooth race on first paint
  el.scrollIntoView({ block: "start", behavior });
  return true;
}

/** Parse location hash like #c12 or #c12v3 */
export function parseHash(hash = window.location.hash) {
  const m = /^#c(\d+)(?:v(\d+))?$/i.exec(hash || "");
  if (!m) return null;
  return {
    chapter: parseInt(m[1], 10),
    verse: m[2] ? parseInt(m[2], 10) : null,
  };
}
